# StackReplay Implementation Status

## Current milestone

**Milestone 3 — browser-local replay, implemented, self-validated and independently audited.**
Accepted after corrections: the audit log below records what was verified, what it found and what
changed. The measurement reported in an earlier revision (a completed ~100k-event import whose
follow-up replay never finished) was wrong, and the import path it described as PARTIAL passes.

Milestone 1 (schemas, catalog, deterministic subscription replay engine) and Milestone 2 (read-only
local adapters and the CLI) remain independently audited and accepted within their documented
semantics; the M2 correction log is below.

Milestone 3 adds the first real product experience on top of them:

- `/app/import`: drag/drop, file picker and deterministic demo workloads. Reading, parsing,
  validation and workload preparation run in a Web Worker; the interface stays responsive.
- `/app/replay`: workload, target plan, explicit rules instant, and a result surface that explains
  what happened and why, including separate coverage dimensions, constraint states, confidence with
  reasons, violation detail and an activity/violation timeline.
- Browser-local persistence in IndexedDB only, with real delete and clear, and no upload path of any
  kind. A browser test records every request during import and replay and fails if any body carries
  events, token history or a project/session hash.
- Deterministic demo workloads (`moderate`, `heavy`, `multistack`) that reach the interesting product
  states: served, exceeded and unknown.

The bundled catalog is still synthetic, so real workloads replay with their models reported as
unmapped. Public catalog data, the share layer, accounts and cloud sync belong to later milestones.

## M2 correction log (after independent audit)

Two defects in the accounting-declaration family were found and fixed after the M2 audit, and both
are now guarded by regression tests:

- Codex and Hermes attached `accounting` declarations unconditionally, so a record that omitted a
  category produced an event the canonical schema rejects (the export then failed rather than
  publishing an impossible accounting).
- The same defect existed in Command Code for its cache categories, which the fix found by
  checking the whole family rather than the two reported adapters.

`docs/ADAPTERS.md` records the resulting rule: a declaration is attached only to a category the
record actually reports.

## M3 correction log (after independent audit)

The M3 audit rebuilt its own measurement harness instead of trusting the milestone's own specs, and
found five things worth fixing. They are listed with the guard that now holds each one.

- The large-import measurement spec never exercised the replay it was supposed to measure. It looked for
  the plan controls on `/app/import`, where they do not exist, so the click waited out a 600 s
  locator timeout against an idle renderer. The reported "ten-minute window" was that timeout, not
  work: the same path completes in about 1.4 s. The spec now follows the product's own link into
  `/app/replay` and asserts that the replayed workload held every imported event.
- A Worker that could not start left the interface waiting forever. A missing or blocked
  `stackreplay-worker.js` produced one error event, which was consumed by whichever request was
  pending at that moment; every later request posted into a dead Worker and never settled, leaving
  the import surface on "Reading…" with no error and no hint. The client now fails every request
  waiting on a Worker that cannot be used, drops it, and reports a safe error; a Worker that never
  announces itself at all is bounded by a start timeout instead of waiting indefinitely. Guarded by
  `apps/web/lib/worker-client.test.ts` and `apps/web/e2e/worker-failure.spec.ts`.
- A superseded replay was reported as a failure. The import surface ignored a superseded
  response, but the replay surface turned it into an error card and reset its phase while the newer
  replay was still running; the import surface also released its busy state while a newer import
  owned the interface. Both surfaces now treat a superseded response as what it is. The client's
  supersession semantics are pinned by `worker-client.test.ts`; the two surfaces' handling of it is
  not covered by a test yet.
- Session identity in the demo workloads was per event, not per session. Every demo event
  carried a freshly random `nativeSessionHash`, so "Sessions" equaled "Events" (6,000 of 6,000) and
  the orchestration line counted attributed events as sessions, disagreeing with the per-source
  session counts the same fixture declared. Session hashes are now derived from the session id, so
  the heavy preset reports 100 sessions across 6,000 events and 12 orchestrated sessions, matching
  the declared counts. Event data, token values and replay results are unchanged.
- The privacy browser test only inspected request bodies. A leak could equally ride in a URL, a
  query string or a request header. The test now checks all three and additionally asserts that
  import and replay send no request body at all.

`apps/web/package.json` also rebuilds the Worker artifact before the browser suite runs
(`test:e2e`), so end-to-end results can no longer come from a stale Worker bundle, and
`captureRequests` records headers so the privacy assertions can see them.

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

## Milestone 3 validation

Node 24.19.0 (pinned) and pnpm 10.18.1 on Linux. Every check runs offline.

| Gate | Result |
| --- | --- |
| pnpm check | PASS: 195 files |
| pnpm check:contrast | PASS: 10 token pairs |
| pnpm typecheck | PASS: 13 tasks |
| pnpm test | PASS: 372 tests — engine 140, adapters 104, schema 31, catalog 30, CLI 26, web 26, UI 15 |
| pnpm build | PASS: 7 tasks (includes the pre-bundled Worker) |
| pnpm --filter @stackreplay/web test:e2e | PASS: 105 passed, 17 viewport-specific skips |
| pnpm --filter @stackreplay/web test:e2e (large import, opt-in) | PASS: 69.6 MB / 100,000 events imported in 1.3 s and replayed in 1.3 s |
| pnpm --filter @stackreplay/replay-engine bench | PASS: 100k events, median 923.2 ms, peak RSS 614.1 MiB |

Milestone 3 specifics verified in a real browser (Chromium, desktop and mobile viewports):

- Import: empty state, drag-over, importing, invalid file, malformed JSON, future export version,
  valid file with an unexpected filename, and a ~100k-event synthetic export.
- Replay: empty state, full coverage, exceeded constraints with violation detail, unknown coverage,
  unsupported models, plan search and keyboard operation, rules-instant display, re-running against
  another target.
- Privacy: every request during import and replay is recorded; no request body carries events,
  token history or any project/session hash, no request body is sent at all, no request URL, query
  string or header carries workload content, no request targets an upload endpoint, and all traffic
  stays on the app origin.
- Persistence: reload restores the workspace, deletion removes the IndexedDB payload (verified by
  reading the store back), clear-all works, two imports coexist, and a corrupted stored payload
  fails safely.
- Accessibility: axe (WCAG 2.2 AA tags) passes on import and replay in both themes, keyboard import
  and plan selection work, violation detail is keyboard reachable, the timeline exposes a text
  alternative, and status is never carried by colour alone.
- Visual: deterministic screenshots for import and replay in dark and light, desktop and mobile,
  plus the exceeded and unknown states.

Two real defects were found by this validation and fixed rather than worked around: a low-opacity
phase label failed contrast in dark mode, and the plan picker used listbox roles on a list of
buttons, which axe flagged as malformed ARIA. Both are now correct in the shipped UI.

Honest limits of this milestone:

- The bundled catalog is synthetic, so real workloads replay with their models reported as unmapped
  and coverage reported as unknown. That is the catalog's state, not a replay failure.
- The ~100k-event browser import is measured rather than assumed, in both directions. A
  deterministic 69.6 MB / 100,000-event synthetic export completes the whole import (reading,
  parsing, schema validation, summary, IndexedDB write) in about 1.3 s in Chromium on this machine,
  and a replay of that stored workload completes in about 1.4 s. The page heap stays around 10 MB,
  and the main thread keeps answering (median interaction latency ~1 ms; worst observed ~200 ms,
  once, while the import was being persisted). The real 101.6 MB export measured in M2 (96,819
  events) imports in 1.3 s and replays in 0.9 s with no request leaving the browser. Peak RSS across
  the headless Chromium processes is roughly 0.9-1.3 GB, so memory, not time, is the practical
  ceiling, and larger real workloads are the thing to measure next. The measurement spec is opt-in
  (`STACKREPLAY_LARGE_IMPORT=1`) because it starves Playwright's other workers, and it reports what
  it measured either way. An earlier revision of this document reported this path as PARTIAL because
  the follow-up replay "did not complete inside a ten-minute window": that window was the spec's own
  locator timeout, the renderer was idle, and the completed-import path passes.
- Confidence is reported as low for the synthetic catalog because every catalog claim is
  `estimated`; that is honest provenance, not a defect.

### Independent audit, 2026-09-21

The audit rebuilt its own harness in a scratch directory instead of re-running the milestone's own
specs, drove the production build (`next start`, the artifact `pnpm build` produces), and started
from the opposite assumption: that the milestone's own measurement was wrong somewhere. What it
verified, and the measurement behind each claim:

- Worker boundary: after a 100,000-event import the page's own heap was ~10 MB, and a stream of
  main-thread probes kept answering (median ~1 ms; worst 183 ms, once, while the import was being
  persisted). Reading the payload back out of IndexedDB returned all 100,000 events with every demo
  source and the orchestrated-session attribution intact, so the event array really was handled in
  the Worker while the interface stayed responsive.
- Large workload, both directions: a deterministic 69.6 MB / 100,000-event export imported in
  1.3 s and replayed in 1.4 s. The real 101.6 MB export measured in M2 (96,819 events) imported in
  1.3 s and replayed in 0.9 s, reporting "Not served" with unknown coverage, which is what a
  synthetic catalog should say about real models.
- Privacy, adversarially: markers were planted in imported event ids, session and event hashes,
  project hash, model names and collector fields. Across import, replay, navigation and reload the
  browser made 87 requests; none carried a marker in its body, URL, query string or headers, and no
  request had a body at all. `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` and `EventSource`
  were instrumented inside the page: the only calls observed were same-origin Next.js navigation
  fetches. No cookies appeared, the only storage keys were the theme key (written by the theme
  toggle, not by import), and the planted workload was found in IndexedDB, which is the point: it is
  processed locally instead of disappearing behind an opaque path.
- Persistence and deletion: a reload restored the workload summary in ~0.2 s. Deleting the
  import removed the record and the payload (the payload store went from one entry to zero) and
  clear-all emptied both stores.
- Import attacks: empty file, binary content, malformed JSON, a future export version, a wrong
  `format`, JSON that is not an object, deeply nested JSON, a truncated large file, a valid export
  under a `.txt` name, and the same file imported twice: each one ends in a designed error that
  names no internals, none hangs, and the valid-but-oddly-named file imports normally.
- Failure paths: a Worker whose storage is unavailable reports a storage error in ~0.3 s. A
  Worker that cannot start reported nothing at all until this audit fixed it.
- Accessibility and layout: the suite's axe runs (WCAG 2.2 AA tags) pass on both surfaces, in
  both themes and in the exceeded and unknown states. Measuring the rendered DOM at 1280x720 and
  390x844 found no horizontal overflow, nothing crossing the viewport edge, and no interactive
  target under 24 px except the 20 px-tall full-width violation `<summary>` rows. Axe's WCAG 2.2
  target-size rule does not flag them, but they are the one control below the 24 px guidance.
- Gates: `pnpm check`, `pnpm check:contrast` (10 token pairs), `pnpm typecheck`, `pnpm test`,
  `pnpm build`, the full browser suite and the engine benchmark were all re-run forced rather than
  from turbo's cache.

What this audit could not judge: the rendered pixels. It had no vision path in that session, so its
visual conclusions come from measured geometry, the typography scale, rendered strings and the
contrast tokens rather than from looking at screenshots. A human pass is still worth doing; the
shots are reproducible with the visual spec (`pnpm --filter @stackreplay/web test:e2e -- visual`,
which writes `import-desktop-dark.png`, `replay-desktop-dark.png`, `replay-mobile-dark.png` and the
other states to `apps/web/test-results/screenshots`).

Non-blocking observations the author may want to decide on:

- Coverage percentages and credit amounts are rendered at full engine precision (`67.9833%`,
  `12.799959 / 100 usd`). Exactness is the point of the product, but four decimals in a headline
  metric and six in a credit row read as unfinished next to `100%` and `3 of 3`.
- The same card formats money two ways: `$50.00` for the plan price and `$50` for the target cost.
- The replay result is the one surface that had ungrouped quantities (`44205864 / 200000000 tokens`)
  next to grouped ones (`97,935,040`); that is fixed, and the remaining question is how much display
  precision each dimension should show.

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
