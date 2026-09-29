# Adapters

How StackReplay reads local agent histories, what it refuses to invent, and why.

Every adapter is read-only, offline and deterministic. An adapter never modifies a source file, never
opens a database for writing, never reaches the network, and never invents a value that a source did
not report. The collection pipeline is `detect → collect → attribute → deduplicate → order`, and the
canonical output is `UsageEventV1` from `@stackreplay/schema`.

## The accounting rule

The canonical event carries five token categories (`inputTokens`, `outputTokens`, `cacheReadTokens`,
`cacheWriteTokens`, `reasoningTokens`) plus an `accounting` declaration stating whether each
overlapping category is already included in its base quantity. Replay derives **disjoint** buckets
from that declaration, so overlapping telemetry is never double counted.

Two rules follow from Milestone 1 and are binding on every adapter:

1. **A missing category stays unknown.** It is not zero. A constraint that needs it is reported as
   unknown rather than silently passing.
2. **An explicit zero is only emitted when the source's own accounting model has no such separate
   category**, and that fact is established from one of: upstream source code, upstream
   documentation, or an arithmetic invariant in the data itself. The evidence is recorded per
   adapter below, and the local data is checked defensively: if the stated relationship does not
   hold for a record, the affected categories are dropped to unknown and a warning is emitted.

A third rule follows from those two and is enforced by the canonical schema: **a declaration is
attached only to a category the record actually reports.** `true` means "already included in the
base quantity", which cannot be stated for a quantity that is absent, and a category that degrades
to unknown must take its declaration with it. An adapter that hard-codes declarations for a record
shape it has not checked produces events the schema rejects, so the export fails instead of
publishing an impossible accounting.

## Sources

| Adapter id | Kind | Default location (Linux) |
| --- | --- | --- |
| `command-code` | usage | `~/.commandcode/projects` |
| `opencode` | usage | `~/.local/share/opencode` (macOS: `~/Library/Application Support/opencode`) |
| `codex` | usage | `~/.codex/sessions` |
| `claude-code` | usage | `~/.claude/projects` |
| `hermes` | usage | `~/.hermes` |
| `t3-code` | attribution | `~/.t3/userdata` |
| `ccusage` | import | explicit `--input <file>` only |

Each detected source also carries a `role` in the export (`usage`, `attribution` or `import`,
decision 28), so a consumer can tell a consumption source from a control surface without heuristics.
T3 Code is `attribution`: it orchestrates other agents and never emits usage of its own.

Windows roots use `%APPDATA%` / `%LOCALAPPDATA%` and the user profile directory; macOS roots use
`~/Library/Application Support`. Path resolution is a pure function of the platform and environment,
so all three layouts are covered by tests without a real machine.

Each adapter also owns a discovery entry in `src/adapters/<id>.discovery.ts` (decision 55): the
history location as path components below the home or profile folder, the platforms whose
documentation establishes it, installation markers, an inventory bound and evidence links. The
browser's Find my AI histories probes exactly these entries, and the Claude Code, Codex and Command
Code CLI roots are derived from them. OpenCode's own documentation places its data at
`~/.local/share/opencode` on macOS as well; the CLI already falls back to that path. Hermes on native
Windows defaults to `%LOCALAPPDATA%\hermes`, which the CLI adapter does not probe yet.

## Command Code

**Source.** `~/.commandcode/projects/<project>/<session>.jsonl`, one JSON object per line, plus a
sibling `.meta.json` and a `.checkpoints.jsonl` (ignored). Records are `session`, `message` and
`model_change`; assistant `message` records carry
`usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, costUsd }` and sometimes
`cacheWriteTokens1h`.

**Fields used.** `session.id`, `session.cwd`, `message.role`, and on each message record its `id`,
`model`, `usage.*` and `timestamp`. The token counts live on the record itself (`usage.*`), not
inside `message`; `message` carries the role.

**Fields ignored.** Message content and metadata (never read), `parentId`, `traceIds`, the
checkpoint file, `effort`, and `cacheWriteTokens1h` (see below).

**Accounting.** Established from the installed client's own cost routine
(`command-code@1.58.0`, `dist/cli.mjs`): it computes the uncached input as
`inputTokens - cacheReadTokens - cacheWriteTokens`, which means both cache categories are **subsets
of `inputTokens`** (`cacheReadIncludedInInput: true`, `cacheWriteIncludedInInput: true`). The same
routine bills `outputTokens` at a single rate with no separate reasoning charge and splits
`cacheWriteTokens1h` out of `cacheWriteTokens` with `Math.min`, so the 1h figure is a subset of the
5m figure and is not added again. Reasoning is therefore a **known absence of a separate category**
(`reasoningTokens: 0`, `reasoningIncludedInOutput: false`), and the token total is exact.

**Limitations.** The 1h/5m cache-write split is not preserved: the canonical model has one
cache-write bucket, so a 1h write is billed at the single cache-write rate of the target catalog.
If a record's cache categories exceed its input (which the relationship forbids), those categories
are reported as unknown and a warning is emitted.

## OpenCode

**Source.** The OpenCode data directory, `opencode.db` (SQLite). Assistant messages live in
`message` with a JSON `data` column:
`{ providerID, modelID, cost, time: { created, completed }, tokens: { input, output, reasoning,
total, cache: { read, write } } }`. Sessions carry the working directory in `session.directory`.

**Fields used.** `message.id`, `message.session_id`, `message.time_created`,
`data.time.created`, `data.modelID`, `data.providerID`, `data.cost`, `data.tokens.*`,
`session.directory`.

**Fields ignored.** Message parts and text, titles, todos, shares, and the account/credential
tables. The database holds several content-bearing tables (`part`, `session_message`, `event`) and
none of them is queried: the adapter reads only `message` and `session`.

**Accounting.** Established by arithmetic invariant: `tokens.total` equals
`input + output + reasoning + cache.read + cache.write` in 10,571 of the 10,587 local assistant
records that publish a total, so every category is **additional** and none may be added twice
(all three declarations `false`). A missing `reasoning` category stays unknown; a reported zero
stays a known zero. Every record is re-checked against its own `tokens.total`: when the reported
categories add up to more than the record's own total (16 local records, all OpenRouter GLM),
they cannot all be additional and no inclusion arrangement reproduces that total, so the cache
and reasoning categories are reported as unknown with a warning instead of publishing an
accounting the source itself contradicts.

**Limitations.** Reads are bounded to 200,000 assistant messages per scan and ordered
deterministically. Older OpenCode versions stored a JSON tree under `storage/`; that layout is
**detected but reported as unsupported** rather than guessed at. The database is opened read-only, so
a running OpenCode instance is not disturbed.

## Codex

**Source.** `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-*.jsonl`. Records are `session_meta`,
`turn_context`, `response_item`, `event_msg` and `world_state`. Usage arrives as `event_msg`
records of payload type `token_count`, carrying both the session cumulative
(`info.total_token_usage`) and the delta for the most recent turn (`info.last_token_usage`).

**Fields used.** `session_meta.payload.id`/`session_id`, `session_meta.payload.cwd`,
`turn_context.payload.model`, `turn_context.payload.cwd`, the record `timestamp` and `ordinal`, and
`info.last_token_usage.*` / `info.total_token_usage.total_tokens`.

**Fields ignored.** `response_item` content, `world_state`, `rate_limits`, instructions, and
sandbox/permission fields.

**Accounting.** Established arithmetically on local rollout files: `cached_input_tokens` and
`cache_write_input_tokens` are **subsets of `input_tokens`**, and `reasoning_output_tokens` is a
**subset of `output_tokens`** (all three declarations `true`, with quantities reported). One
canonical event is emitted per `last_token_usage` delta, so a turn is never counted twice and the
cumulative series is not double counted.

**Limitations.** Records that violate the stated subset relationships have the affected categories
reported as unknown, with a warning. A `token_count` record that appears before any `turn_context`
has no model and is skipped and reported.

## Claude Code

**Source.** `~/.claude/projects/<project-slug>/<session>.jsonl`. Assistant records carry
`message.usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }`.

**Fields used.** `type`, `uuid`, `sessionId`, `timestamp`, `cwd`, `message.model`, `message.usage.*`.

**Fields ignored.** Message content, tool calls and results, summaries, and sidechain content
(sidechain *usage* is counted: it is real API consumption).

**Accounting.** `input_tokens` is the uncached input, so `cache_read_input_tokens` and
`cache_creation_input_tokens` are **additional** (both declarations `false`). Locally, cache reads
exceed `input_tokens` in 28,204 of 28,375 assistant records (99.4%), which is only possible if they
are not a subset. The client reports thinking tokens as `output_tokens_details.thinking_tokens`
(present in 99.9% of assistant records as sampled, non-zero in 79% of them), which is a breakdown of
`output_tokens` and never exceeds it in any local record: Anthropic bills thinking as output, so the
canonical reasoning bucket is declared **included in output** and carries the reported thinking
quantity. Where the client reports no thinking breakdown, reasoning is reported as zero: this source
has no separately billed reasoning category, and the relationship still holds. A record whose
thinking quantity exceeds its output has its reasoning category reported as unknown with a warning.

The reporting consequence is worth stating: because thinking is an included quantity, the disjoint
`outputTokens` bucket on such an event is `output_tokens - thinking_tokens`, and the reasoning bucket
is priced at the model rule's reasoning rate, falling back to the output rate (explicit, warned,
confidence-reducing, exactly as Hermes reasoning already does). The workload total and the total cost
are unchanged by reporting the quantity instead of zero.

**Limitations.** Records with no timestamp or with the `<synthetic>` model (locally generated error
messages) are skipped and reported. Project attribution uses `cwd`, falling back to the encoded
project directory name.

## Hermes

**Source.** The Hermes profile directory, `state.db` (SQLite), table `session_model_usage`, joined
with `sessions` for `cwd`/`git_repo_root`. One row per session and model.

**Fields used.** `session_id`, `model`, `api_call_count`, `input_tokens`, `output_tokens`,
`cache_read_tokens`, `cache_write_tokens`, `reasoning_tokens`, `estimated_cost_usd`,
`actual_cost_usd`, `billing_provider`, `first_seen`, `last_seen`.

**Fields ignored.** Message bodies, tool payloads, titles, prompts and everything in the message
tables.

**Accounting.** Established arithmetically: `cache_read_tokens` exceeds `input_tokens` in 257 of the
353 local rows, so cache is **additional** (both cache declarations `false`); `reasoning_tokens` never
exceeds `output_tokens` in any local row and Hermes itself normalizes usage with reasoning inside
`output_tokens` (`agent/usage_pricing.py`), so reasoning is a **subset of output**
(`reasoningIncludedInOutput: true`, with the quantity reported).

**Granularity and limitations.** Hermes records session-and-model aggregates, not per-call records.
StackReplay emits exactly **one canonical event per row**, timestamped at the end of the row's
activity window, with the window carried as `requestStartedAt` / `requestEndedAt` / `durationMs`.
Request counts are therefore approximate for this source, and the adapter says so with a warning:
on the machine this was verified on, 264 of 353 rows aggregate more than one call and the rows cover
23,937 API calls between them, so a request-coverage figure built from these events understates the
real call count. The canonical event has no request-count field (decision 5 keeps plan and billing
context off the event), so the row's own count is not carried into the export; the warning and this
note are the honest statement of the gap, and a per-event aggregate marker belongs to a later schema
revision. Timestamps are epoch seconds (milliseconds are accepted if a future schema changes); an
activity window is placed in a scan window by its end instant.

## T3 Code (attribution only)

**Source.** `~/.t3/userdata/state.sqlite` (`projection_thread_sessions` and
`provider_session_runtime`) and `~/.t3/userdata/usage-scan-cache.json`.

**What it produces.** No usage events. T3 is a harness: re-ingesting provider usage from it would
double count. Instead it produces:

1. an attribution index mapping `(provider_name, provider_session_id)` to the T3 `thread_id`, so
   canonical events from the provider adapters are attributed to T3 as the harness with
   `attribution: "exact"`;
2. additional provider-history roots that T3 itself manages (for example
   `~/.t3/commandcode/claude/projects`), discovered from its usage scan cache and excluded when they
   are already a provider adapter's default root, so a harness-managed copy is never scanned twice.

**Where the mapping lives.** An installed T3 records the mapping in two places, and both are read,
because the projection column is empty in installed builds: `projection_thread_sessions`
(`provider_session_id`), and `provider_session_runtime.resume_cursor_json.sessionId`, which carries
the provider session id the thread is driving. On the machine this was verified on, the projection
holds 83 thread rows with **no** session id and the runtime bookkeeping supplies 34 session ids (all
of the OpenCode ones it holds, none of the Codex ones), so reading only the projection would
attribute nothing at all while still reporting a healthy source. The projection wins when both carry
an id; a thread whose id T3 has not recorded stays unattributed, and the adapter says so with a
warning rather than guessing.

**Limitations.** Provider names StackReplay does not read (for example `grok`) are reported as
unsupported rather than guessed at. `detect` distinguishes thread rows from rows that actually carry
a provider session id, so "detected, supported" no longer implies that any session can be attributed.
Attribution is part of the collection run: restricting `--source` to a provider without also
selecting `t3-code` leaves those sessions unattributed.

## ccusage import

**Source.** A ccusage JSON export supplied explicitly with `--input <file>`. It is never
auto-detected: the same underlying history is normally also present natively, and importing both
blindly would double count.

**Layouts supported.** `daily` (`{type:"daily", data:[...]}`), `session`
(`{sessions:[...]}` or `{type:"session", data:[...]}`), `blocks`, `monthly` (a bare array) and
project-grouped daily (`{projects:{name:[...]}}`).

**Fields used.** `date`, `sessionId`, `blockStart`/`blockEnd`, `month`, `firstActivity`,
`lastActivity`, `models`/`modelsUsed`, `inputTokens`, `outputTokens`, `cacheCreationTokens`,
`cacheReadTokens`, `totalTokens`, `costUSD`/`totalCost`.

**Accounting.** ccusage documents `totalTokens` as the sum of input, output, cache creation and
cache read (and its published examples satisfy that identity exactly), so the two cache categories
are **additional** to `inputTokens`.

**Reasoning is deliberately unknown.** ccusage reports no reasoning field, and it aggregates several
agents that disagree about whether reasoning tokens are a subset of output or an additional
category. StackReplay keeps its stricter accounting semantics: the reasoning category is omitted, the
token total for imported rows is therefore unknown, and the adapter says so with a warning instead of
silently understating consumption.

**Granularity.** One event per imported row. A multi-model row is labelled with its model list rather
than pretending to be one model, and is reported as an unmapped model by replay. Project-grouped rows
have their project name hashed with the local salt, never exported.

## Cross-cutting behaviour

**Deduplication.** Exact duplicates (same adapter, same native event identity) collapse to one event.
Two different sources describing the same underlying work are an *overlap*, and there are two ways an
overlap is recognised:

- per event: the same session, the same instant and the same token signature describe the same call,
  and the higher-precision source wins;
- per session: an aggregate source (an import, for example a ccusage session row) that names a session
  a native per-call scan already read is the same work. Its instant and token signature can never
  match a single call, so session identity decides it: the aggregate row is dropped and the drop is
  reported. Two sources of equal precision never collapse: equal observations cannot be distinguished
  from two distinct calls that happen to look alike, so each keeps its own identity.

Session hashes are scoped to the session id, so two sources observing the same session dedupe
correctly, while event identity stays scoped to the adapter.

**Project identity.** Project paths are never exported. Each event carries
`projectHash = HMAC-SHA256(localSalt, normalizedPath)` with a salt generated on first scan and stored
with owner-only permissions. Windows paths are case-normalized; trailing separators are ignored.

**Windows.** `--since` is inclusive and `--until` is exclusive at the instant level; a bare date
expands to that day's midnight UTC, and `--until <date>` includes the named day. Files whose last
modification predates `--since` are skipped without being read. Sources that only expose aggregates
are windowed by the event's own timestamp (the aggregate's end instant).

**Bounds.** Scans are bounded (20,000 files per file-based adapter, 256 MiB per file, 200,000 rows
per database adapter). A bound that is reached is reported as `SOURCE_TRUNCATED`, never silently.

**Warnings.** Warnings are aggregated per code with an exact count and one sample, and they carry the
source path they came from, which is useful when diagnosing a damaged history. Warnings are local
output: they are not part of the export (`StackReplayExportV1` has no warnings field), so a warning's
path never leaves the machine inside an exported artifact. `scan --json` does print them, so treat
that output as machine-readable local detail rather than something to paste into a public issue.

## Adding an adapter

1. Decide the kind: `usage`, `attribution` or `import`.
2. Establish the accounting relationship from upstream source, upstream documentation or a data
   invariant. Write down which one, and add a defensive check that degrades to unknown if it fails.
3. Emit canonical events through `buildEvent` so identity, hashing and confidence stay uniform.
4. Add synthetic fixtures that mirror the real layout, including damaged records.
5. Test: detection, event extraction, unknown-versus-zero, malformed input, partial sessions,
   windowing, idempotency, and that no raw path appears in the output.
6. Document it here, including the limitations you could not remove.
