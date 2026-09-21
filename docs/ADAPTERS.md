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

Windows roots use `%APPDATA%` / `%LOCALAPPDATA%` and the user profile directory; macOS roots use
`~/Library/Application Support`. Path resolution is a pure function of the platform and environment,
so all three layouts are covered by tests without a real machine.

## Command Code

**Source.** `~/.commandcode/projects/<project>/<session>.jsonl`, one JSON object per line, plus a
sibling `.meta.json` and a `.checkpoints.jsonl` (ignored). Records are `session`, `message` and
`model_change`; assistant `message` records carry
`usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, costUsd }` and sometimes
`cacheWriteTokens1h`.

**Fields used.** `session.id`, `session.cwd`, `message.role`, `message.model`, `message.usage.*`,
`message.id`, `message.timestamp`.

**Fields ignored.** Message content and metadata (never read), `parentId`, `traceIds`, the
checkpoint file, and `cacheWriteTokens1h` (see below).

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
tables.

**Accounting.** Established by arithmetic invariant over the local database: `tokens.total` equals
`input + output + reasoning + cache.read + cache.write` in more than 10,000 assistant records, so
every category is **additional** and none may be added twice (all three declarations `false`). A
missing `reasoning` stays unknown; a reported zero stays a known zero.

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
exceed `input_tokens` in the large majority of records, which is only possible if they are not a
subset. Extended thinking tokens are billed as output tokens and are not reported as a separate
category, so reasoning is a **known absence of a separate category** (`reasoningTokens: 0`).

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

**Accounting.** Established arithmetically: `cache_read_tokens` exceeds `input_tokens` in most local
rows, so cache is **additional** (both cache declarations `false`); `reasoning_tokens` never exceeds
`output_tokens`, so reasoning is a **subset of output** (`reasoningIncludedInOutput: true`, with the
quantity reported).

**Granularity and limitations.** Hermes records session-and-model aggregates, not per-call records.
StackReplay emits exactly **one canonical event per row**, timestamped at the end of the row's
activity window, with the window carried as `requestStartedAt` / `requestEndedAt` / `durationMs`.
Request counts are therefore approximate for this source, and the adapter says so with a warning.
Timestamps are epoch seconds (milliseconds are accepted if a future schema changes); an activity
window is placed in a scan window by its end instant.

## T3 Code (attribution only)

**Source.** `~/.t3/userdata/state.sqlite` (`projection_thread_sessions`) and
`~/.t3/userdata/usage-scan-cache.json`.

**What it produces.** No usage events. T3 is a harness: re-ingesting provider usage from it would
double count. Instead it produces:

1. an attribution index mapping `(provider_name, provider_session_id)` to the T3 `thread_id`, so
   canonical events from the provider adapters are attributed to T3 as the harness with
   `attribution: "exact"`;
2. additional provider-history roots that T3 itself manages (for example
   `~/.t3/commandcode/claude/projects`), discovered from its usage scan cache and excluded when they
   are already a provider adapter's default root, so a harness-managed copy is never scanned twice.

**Limitations.** Provider names StackReplay does not read (for example `grok`) are reported as
unsupported rather than guessed at. Thread/session mappings are read from the harness's own
bookkeeping; if that table is empty, the adapter reports that instead of inferring.

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
Two different sources describing the same underlying work are an *overlap*: the higher-precision
source wins (a native per-call scan outranks an aggregate import) and the drop is reported. Session
hashes are scoped to the session id, so two sources observing the same session dedupe correctly,
while event identity stays scoped to the adapter.

**Project identity.** Project paths are never exported. Each event carries
`projectHash = HMAC-SHA256(localSalt, normalizedPath)` with a salt generated on first scan and stored
with owner-only permissions. Windows paths are case-normalized; trailing separators are ignored.

**Windows.** `--since` is inclusive and `--until` is exclusive at the instant level; a bare date
expands to that day's midnight UTC, and `--until <date>` includes the named day. Files whose last
modification predates `--since` are skipped without being read. Sources that only expose aggregates
are windowed by the event's own timestamp (the aggregate's end instant).

**Bounds.** Scans are bounded (20,000 files per file-based adapter, 256 MiB per file, 200,000 rows
per database adapter). A bound that is reached is reported as `SOURCE_TRUNCATED`, never silently.

## Adding an adapter

1. Decide the kind: `usage`, `attribution` or `import`.
2. Establish the accounting relationship from upstream source, upstream documentation or a data
   invariant. Write down which one, and add a defensive check that degrades to unknown if it fails.
3. Emit canonical events through `buildEvent` so identity, hashing and confidence stay uniform.
4. Add synthetic fixtures that mirror the real layout, including damaged records.
5. Test: detection, event extraction, unknown-versus-zero, malformed input, partial sessions,
   windowing, idempotency, and that no raw path appears in the output.
6. Document it here, including the limitations you could not remove.
