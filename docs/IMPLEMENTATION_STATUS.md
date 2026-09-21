# StackReplay Implementation Status

## Current milestone

**Milestone 2 — local adapters and the CLI, implemented and validated locally.**

Milestone 1 remains independently re-audited and ACCEPTED after corrections
(commit b83a5e5 and the re-audit corrections that followed). Subscription replay
is trustworthy within decisions 13-21 and the explicitly supported synthetic
rule model.

Milestone 2 adds the read-only local collection path and the working CLI:
seven adapters (Command Code, OpenCode, Codex, Claude Code, Hermes, T3 Code
attribution and ccusage import), the detect/collect/attribute/deduplicate
pipeline, the versioned sanitized export, and `detect`, `scan`, `export`,
`replay`, `plans` and `doctor`. The repository is public
(https://github.com/btsouth/stackreplay) and hosted CI is green. The bundled
catalog is still synthetic, so real local workloads replay with their models
reported as unmapped rather than priced.

## Original blocker verification

| Blocker | Verified resolution |
| --- | --- |
| Rejected-event accounting | Atomic admission; rejected/unsupported events consume no pools. Re-audit fixed early exit that prevented other exceeded latches from triggering. |
| Overlapping token categories | Declared inclusions normalize to disjoint buckets. Re-audit rejects combined included cache subsets exceeding input and fixes disjoint workload summaries. |
| Unknown consumption / false certainty | Missing is distinct from zero. Relevant unknown consumption makes admission indeterminate and coverage unknown. Re-audit omits economics when unknown admission prevents an exact overage bill. |
| Current-rule replay | Explicit rulesAsOf date resolves plan version and promotion eligibility; historical timestamps control ordering and windows only. |
| Decimal precision | External 28-significant / 18-fractional envelope, isolated Decimal precision 100, plus validated multiplier-composition budget (decision 21). Re-audit fixed significant-zero counting and separates derived-result values from external inputs. |
| Overage semantics/economics | Explicit allow_overage bills accepted per-window excess; record_only does not bill. Base + overage = target. |
| Result/export contracts | Validated decimal quantities, kind/unit correspondence, economic identities, coverage consistency, target selection and metadata. Export ranges retain nanosecond ordering and permit empty ranges. |

## Re-audit corrections

- Evaluate every hard rule before an atomic rejection, including every latch.
- Reject impossible combined cache inclusions; expose disjoint summary totals
  only when the workload's normalized quantities are complete.
- Suppress false exact economics for indeterminate overage admission.
- Validate compositional precision, not just individual decimal inputs; allow
  exact computed costs outside the smaller external-input envelope.
- Enforce serialized economic identities, valid non-negative quantities,
  constraint units, coverage arithmetic and generalized target consistency.
- Reject windows extending beyond the four-digit-year serialization contract
  explicitly rather than emitting an invalid result.
- Replace an invalid capacity property: greedy token admission does not
  guarantee monotone served-request counts. Add an independent atomic-admission
  oracle, arbitrary nanosecond permutations, and declared-quality properties.
  Strengthen compatibility and unknown-data properties.
- Record engine 0.0.3 and methodology 1.2.0. Preserve earlier audit fixes.
- Add benchmark checks for full known-workload evaluation and print accepted
  versus attempted consumption, actual overage and rulesAsOf.

## Implemented scope

- Versioned UsageEventV1, StackReplayExportV1, ExecutionTargetV1 and generalized
  ExecutionReplayResultV1. Execution facts do not contain subscription ownership.
- Provider/model/plan/pricing schemas, semantic validation, browser-safe catalog
  entry and isolated Node YAML loader. Bundled data remains entirely synthetic,
  estimated and sourced to example.invalid.
- Subscription replay: compatibility, pricing, first-use rolling windows,
  timezone-aware calendar windows, independent rule quantities with atomic
  admission, explicit exceed behavior, promotions, coverage, confidence,
  violations, economics and reproducibility metadata.
- API, local and hybrid remain reference shells and fail explicitly with
  TARGET_NOT_IMPLEMENTED. No provider API replay or local-model logic.
- Web remains an M0 foundation. No real-usage import or browser replay UI yet.
- M2 adapters: read-only, offline parsers for Command Code JSONL, OpenCode
  SQLite, Codex rollouts, Claude Code JSONL, Hermes `state.db` aggregates, T3
  Code attribution plus harness-managed roots, and opt-in ccusage JSON import.
  Every accounting relationship is evidence-backed (upstream source, upstream
  documentation or a data invariant) and re-checked per record, degrading to
  unknown instead of publishing an impossible accounting.
- M2 pipeline: platform path resolution for Linux/macOS/Windows, bounded scans,
  salted project/session/event hashing, harness attribution without
  re-ingestion, deterministic deduplication (exact duplicates and cross-source
  overlaps), stable ordering, and a validated `StackReplayExportV1` with its
  redaction report.
- M2 CLI: `detect`, `scan`, `export`, `replay` (with `--as-of` and `--compare`),
  `plans` and `doctor`, all with `--json`, `NO_COLOR` support, documented exit
  codes and no network access. Local salt is created on first scan with
  owner-only permissions.

## Validation

Node 24.19.0 and pnpm 10.18.1. Generated outputs were cleaned, followed by a
frozen-lockfile install and forced full validation. Relevant checks were rerun
after the final corrections.

| Gate | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS |
| pnpm check | PASS: 119 files, no errors/warnings |
| pnpm check:contrast | PASS |
| pnpm typecheck | PASS: 11 tasks |
| pnpm test | PASS: 220 tests — schema 31, catalog 27, engine 140, UI 14, CLI 8 |
| pnpm build | PASS: 7 tasks |
| Web Playwright E2E | PASS: 29 passed, 5 explicitly viewport-specific skips |
| Browser worker | PASS: 554,160-byte unminified browser bundle, no Node polyfills; representative result identical to Node |
| Packed packages | PASS: schema/catalog/engine installed outside the workspace; bundled YAML loads and representative replay validates |
| Publication delta | PASS: b83a5e5 delta reviewed/scanned; no new secret, local-path or generated-artifact finding |

The engine has **25 golden test cases**, **11 property tests**, and **21 new
re-audit regressions**, plus the preserved time, original audit and remediation
suites. The earlier documentation's 20 golden / 6 property count was inaccurate
(the remediation actually had 25 / 8). Golden expectations were independently
checked for rejection, latching, overage, overlap, unknowns and snapshot rules.
Only version metadata changed in the stored golden snapshot during this audit.

## Milestone 2 validation

Node 24.19.0 (pinned) and pnpm 10.18.1 on Linux. Every M2 check runs offline.

| Gate | Result |
| --- | --- |
| pnpm check | PASS: 163 files, no errors (2 informational) |
| pnpm check:contrast | PASS |
| pnpm typecheck | PASS: 13 tasks |
| pnpm test | PASS: 325 tests — schema 31, catalog 27, engine 140, adapters 90, CLI 23, UI 14 |
| pnpm build | PASS: 10 tasks |
| Adapter tests | 90 tests in 11 files: per-adapter extraction, accounting declarations, unknown-versus-zero, malformed and partial records, windowing, idempotency, cross-source dedup, harness attribution, Linux/macOS/Windows paths, and a source scan proving no adapter imports an HTTP client |
| CLI tests | 23 tests: help/version/usage errors, detect/scan/export/replay/plans/doctor, JSON stability, windowing, color suppression, and built-binary equivalence with the in-process CLI |
| Real-machine read-only smoke | `detect` found all 6 local sources; `scan` read 51,736 events in 15.7 s; `export` wrote 55.1 MB at mode 600; `replay` of that export completed in 1.2 s |
| Export privacy check | PASS: zero occurrences of any home path, project directory name or session file name in a 55 MB export of real local data |
| Packed install | PASS: schema, catalog, engine, adapters and CLI packed and installed outside the workspace; detect, export and replay run from the installed tarballs with a fresh salt (mode 600) and byte-identical events across runs |

After the independent audit (re-run on the corrected code, all gates forced rather than cached):

| Gate | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS |
| pnpm check | PASS: 163 files, no errors (2 informational) |
| pnpm check:contrast | PASS |
| pnpm typecheck | PASS: 13 tasks |
| pnpm test | PASS: 339 tests — schema 31, catalog 27, engine 140, adapters 101, CLI 26, UI 14 |
| pnpm build | PASS: 10 tasks |
| Web Playwright E2E | PASS: 29 passed, 5 viewport-specific skips |
| Replay-engine benchmark | PASS (runs): Starter median 917.7 ms, Pro median 1095.5 ms at 100k events; the sub-second target is still borderline and is not enforced by the bench script, which prints evidence and exits 0 |
| Real-machine read-only smoke | `detect` found all 6 local sources; `scan` read 96,819 events; `export` wrote 101.6 MB at mode 600; `replay` of that export completed offline |
| Export privacy check | PASS: 0 of 119 raw project paths, 0 of 10,419 raw session ids and 0 of 413 session file names appear in the 101.6 MB export; no home prefix, username, key pattern or email appears |
| Offline run | PASS: a full scan inside a network-less namespace (`unshare -rn`) reads and normalizes 1,655 events, and no source file imports an HTTP, DNS or socket module or calls `fetch` |
| Determinism | PASS: two scans produce identical summaries, two exports produce byte-identical event arrays and identical byte counts |
| Packed install | PASS: five tarballs installed in an isolated project; the installed CLI sees only the synthetic fixture home, creates the salt at mode 600, and produces byte-identical exports across runs; the bundled catalog loads and a replay runs from the tarballs |

Honest limits of this milestone:

- The bundled catalog is synthetic, so a real local workload replays with its models reported as
  unmapped (`unresolved`) and coverage reported as unknown. That is the catalog's state, not a
  replay failure: no pricing is invented for models the catalog does not know.
- Request counts from aggregate-only sources (Hermes session/model rows) are approximate by
  construction, and the adapter says so with a warning. The canonical event has no request-count
  field, so the row's own call count does not travel in the export: a request-coverage figure built
  from those events understates real calls (23,937 calls behind 198 events on the audited machine).
  Carrying the count, or marking the event as an aggregate, needs a schema revision.
- Reasoning that a source reports as included in output (Claude Code thinking tokens, Hermes
  reasoning) is priced at the model rule's reasoning rate, falling back to the output rate with an
  explicit warning and a confidence reduction. The synthetic catalog prices no reasoning rate, so
  every real workload takes that fallback today; the total and the cost are unaffected.
- An aggregate import can only be deduplicated against a native scan when it names a session
  (`ccusage session` rows). Daily, block, monthly and project-grouped imports carry no session
  identity, so importing them alongside a native scan of the same period would double count, which
  is why the import is opt-in and never auto-detected.
- Warnings carry the source path they came from and are printed by `scan --json`; they are not part
  of the export. Treat that output as machine-readable local detail rather than something to paste
  into a public issue.
- Restricting `--source` to a provider without also selecting `t3-code` leaves those sessions
  unattributed, because harness attribution is collected only when its adapter is selected.
- ccusage imports keep reasoning unknown, so their token totals are unknown. This is deliberate
  (decision 26) rather than a missing feature.

## Independent M2 audit (2026-09-21)

Milestone 2 was independently re-audited against the two specification documents, the recorded
decisions and real local histories. The audit re-derived every adapter's accounting evidence from the
sources themselves, re-ran the full validation set, and verified the export's privacy claims by
searching the generated artifact for the real project paths, session ids and session file names it
was built from (0 of 119 paths, 0 of 10,419 session ids, 0 of 413 file names appear; no home prefix,
username, credential pattern or email appears).

Corrections made in this audit (all with regression tests):

- **Claude Code reasoning.** The adapter claimed a known absence of a separate reasoning category,
  but the source reports `output_tokens_details.thinking_tokens` in 99.9% of assistant records
  (non-zero in 79%). The reported quantity is now carried as reasoning declared included in output,
  so the reasoning dimension is visible and the workload total and cost are unchanged. Records whose
  thinking exceeds their output report reasoning as unknown with a warning.
- **OpenCode per-record total.** The adapter never read the source's own `tokens.total`. 16 of
  10,587 local assistant records report categories that add up to more than that total, and no
  inclusion arrangement reproduces it, so those records now report cache and reasoning as unknown
  with `ACCOUNTING_UNESTABLISHED` instead of publishing an accounting the source contradicts.
- **Aggregate overlap deduplication.** Cross-source overlap was only recognised when an import row
  matched a native event's instant and full token signature, which an aggregate row can never do, so
  a ccusage import alongside a native scan double counted. An aggregate row whose session a native
  per-call scan already read is now dropped and reported. Equal-precision sources never collapse:
  an identical fingerprint cannot distinguish two distinct calls that look alike.
- **T3 attribution was inert on real data.** `projection_thread_sessions.provider_session_id` is
  empty in the installed harness; the mapping lives in
  `provider_session_runtime.resume_cursor_json.sessionId`, which is now read as a second source.
  The real scan maps 34 sessions (all the OpenCode ones T3 holds) where it previously mapped none,
  and `detect` now separates thread rows from rows that actually carry a session id.
- **Impossible calendar dates.** `Date.parse` rolls `2026-02-30` over to 2 March; source timestamps
  and `--since`/`--until` bounds with a day that does not exist are now rejected instead of silently
  filtering or admitting a different instant.
- **Export file naming.** The default export name was `stackreplay-export-<date>.json`, which is
  neither the documented `.stackreplay.json` extension nor covered by `.gitignore`, so a personal
  export could be committed by accident. It is now `stackreplay-<date>.stackreplay.json`, with the
  old pattern also ignored.
- **Reversed windows** are a usage error (`--since` after `--until`) rather than an "internal error:
  the export did not validate" from the schema layer.

Real-machine baseline re-derived by this audit (full scan, no window): 96,819 events, 676 sessions,
121 projects, 28.76B known tokens across the disjoint buckets, 1,267 exact duplicates removed, 0
overlaps, 23,937 Hermes API calls represented by 198 Hermes events, 34 T3-attributed sessions. The
windowed smoke tests reproduce as well: `--since 2026-09-15` gives 21,475 events and `--since
2026-09-21` gives 1,655, with the inclusive/exclusive boundary behaviour asserted at the instant
level (`--since <t>` includes the event at `t`, `--since <t>+1ms` excludes exactly it, `--until <t>`
excludes it).

The export is 101.6 MB for that baseline. The earlier 55.1 MB figure in this document was not
reproducible and is corrected here.

## Benchmark evidence

Each case builds a deterministic 100,000-event, three-model workload across 30
days outside timing, warms with 2,000 events, then measures five complete replay
calls. Validation, sorting, normalization and admission execute on each call.
No result cache exists. Median calculation handles odd/even sample counts.

Corrected implementation measurements (milliseconds):

| Run / target | Samples | Median | Events/second | Peak RSS after target |
| --- | --- | --- | --- | --- |
| A / Starter | 942.1, 852.8, 839.8, 919.4, 889.0 | 889.0 | 112,491 | 604.8 MiB |
| A / Pro | 1142.8, 975.5, 1045.8, 966.6, 935.9 | 975.5 | 102,508 | 608.3 MiB |
| B / Starter | 1226.2, 898.1, 879.2, 883.0, 813.0 | 883.0 | 113,253 | 608.2 MiB |
| B / Pro | 1050.4, 1008.2, 1134.8, 944.7, 946.0 | 1008.2 | 99,189 | 610.6 MiB |
| Final / Starter | 964.2, 894.4, 949.3, 984.3, 855.7 | 949.3 | 105,340 | 609.2 MiB |
| Final / Pro | 1050.2, 974.7, 1177.9, 980.9, 942.8 | 980.9 | 101,949 | 614.0 MiB |

A/B preceded the final timestamp-range guard; final includes it. Results were
identical in all runs: Starter served 29,496 requests; Pro served 3,547 and billed
USD 10.014443 overage. The promotion snapshot and disjoint normalization are
active. The unchanged remediation baseline measured 985.2 / 1031.1 ms medians.

**The sub-second median target is borderline, not consistently reproduced.**
The final medians pass, but Pro exceeded one second in another full run.
A tested quantity-precomputation optimization was discarded: its Pro median
was 1007.7 ms and peak RSS 691.4 MiB, so it did not justify retaining extra state.
Correctness was not changed to improve benchmark numbers.

The official M1 requirement that a 100k benchmark exists passes; the broader
performance target remains PARTIAL and should be tracked as a performance
limitation, not presented as a stable sub-second guarantee.

## Supported limits and remaining work

- Every canonical token category must be established to know total consumption.
  Explicit inputTokens=0 establishes that category, not missing output/cache/
  reasoning categories. Request-only admission can still be known.
- Any indeterminate admission makes request coverage unknown for the whole
  replay; any incomplete token denominator makes usage coverage unknown.
  Empty workloads retain the documented 100 percent convention.
- Calendar months follow the declared IANA zone; billing anchors, proration,
  rollover credits and multi-period subscription base billing are not modeled.
- rulesAsOf has UTC date granularity; intraday rule changes are unsupported.
- Money is USD-only. Catalog compositions exceeding the exact-arithmetic budget
  fail validation. Baseline comparison fields are validated but not populated.
- Runtime timezone data influences historical IANA results. Windows extending
  outside years 0000-9999 fail explicitly.
- CatalogVersion is recorded as supplied; the loader hashes canonical content,
  while the engine does not independently authenticate that label.
- Peak RSS around 0.6 GiB and borderline Pro latency deserve further work.
- Hosted GitHub Actions, repository settings and vulnerability reporting remain
  pending first publication. Pre-existing untracked docs/Images/ was untouched
  and excluded from the audit commit; it is not approved publication content.
- Existing deferred product questions remain deferred. No M2 work was started.

## M1 acceptance

| Official criterion (spec point 99) | Assessment |
| --- | --- |
| No React dependency in replay-engine | PASS |
| No database dependency | PASS |
| No Node filesystem dependency | PASS; catalog loader stays outside engine/browser entry |
| All golden fixtures pass | PASS: 25 cases |
| Property tests pass | PASS: 11 properties with corrected assumptions |
| 100k-event benchmark exists | PASS; complete samples and memory evidence above |
| Feed a JSON workload into a plan and get a trustworthy result | **PASS**, within documented supported semantics |

M1 is accepted and tracked repository content is ready for public release.
M2 is the next authorized milestone only when separately requested.
