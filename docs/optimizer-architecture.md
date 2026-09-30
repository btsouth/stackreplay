# AI stack optimizer: architecture audit and Phase 1

Audited HEAD: `13a6e4f` (clean checkout). Scope: foundations and synthetic capacity
replay only; no UI, real subscription assumptions, billing, or recommendation search.

## Reuse directly

| Concern | Existing implementation | Optimizer use |
| --- | --- | --- |
| Demand | `packages/schema/src/usage-event.ts`, `export.ts` | Keep canonical text events, timestamps, token accounting, harness, session hashes and confidence. Billing stays outside events. |
| Import | `packages/adapters/src/browser.ts`, `adapters/`, `event-builder.ts`, `models.ts`, `dedup.ts` | Retain parsing, canonical identity, overlap handling and privacy sanitization. |
| Identity | `packages/catalog/src/resolve.ts` | Recorded known canonical IDs, then declared harness-scoped aliases; never quality equivalence. |
| Supply | `packages/catalog/src/schema.ts`, `catalog.ts`, `versions.ts` | Already has versioned plans, monthly/yearly prices, model rules, numeric and qualitative limits, sources and verification dates. Do not introduce another plan catalog. |
| Prices | Catalog pricing records; engine `units.ts`, `money.ts`, `receipt.ts` | Reuse conditional rates, disjoint cache/reasoning accounting, missing-price semantics, decimal arithmetic and category receipts. |
| Admission | `packages/replay-engine/src/engine.ts`, `windows.ts`, `time.ts` | Reuse chronological, atomic multi-constraint admission, rejected-demand accounting and timezone-aware resets. |
| Results | Schema `replay-result.ts`, `replay-semantics.ts`; engine `projection.ts` | Retain per-target results, evidence, warnings, constraints, violations and pinned versions. |
| Scope | `apps/web/lib/workload-scope.ts`, `scoped-replay.ts` | Preserve source scopes and recognized-only scope disclosure; a candidate must state its modeled denominator. |
| Current stack/value | Web `lib/current-stack.ts`, `workload-value.ts`, `components/workload/value.tsx` | Stores selected targets without a four-plan cap in localStorage and calculates scoped multi-provider API-equivalent value. Discovery confirmation also writes this canonical set; do not create a second current-stack store. Workload payloads still live in IndexedDB. |
| Backtesting | Engine `backtest.ts` | Already has meter observations, reconstruction comparisons and deltas. Reuse for future calibration; it explicitly remains uncalibrated today. |
| Local boundary | Web `workers/replay.worker.ts`, `lib/worker-client.ts`, `lib/idb.ts` | Future optimizer requests run in the existing Worker; keep canonical payloads in IndexedDB and existing cancellation/write-generation protections. |

## One import traced

A Claude Code JSONL selection enters Worker `intakeBrowserCandidates`, then the
Claude Code adapter parses usage into drafts. `buildEvent` normalizes UTC times,
resolves model names with the catalog mapper, records disjoint/subset accounting,
and hashes session/project identities. Collection deduplicates normalized events.
The Worker validates and summarizes the canonical export, keeps it in memory or
IndexedDB when requested, and returns metadata rather than raw prompts. Replay
loads this export, applies `runScopedReplay`, calls `replayWithReceipt`, validates
catalog/context/events, resolves identity and the pinned plan, sorts events, and
atomically evaluates all applicable limits. The Worker returns the result,
receipt and timeline; `projectReplay` supplies existing decision-facing readings.
Direct API takes the sibling `api-replay.ts` path and shares price arithmetic.

## Extend, rather than replace

Expose optional event observations from the existing admission pass, including
blocking limit IDs. Extend receipt replay with observers so composition obtains
assignments and price receipts in the same pass. Existing default results remain
unchanged and aggregate-only. The generic hybrid target schema already exists,
but its engine behavior is unimplemented: use its ordered routes as the candidate
configuration, with a deliberately restricted executable subset for Phase 1.

## New layer and dependency flow

`packages/replay-engine/src/optimizer.ts` sits above replay, beside projection
and backtesting. It evaluates one explicitly configured candidate, not a claim
of global optimality. Phase 2 can enumerate a small bounded set of these inputs.

```
existing imported/scoped canonical events + pinned catalog/context
  -> validate explicit observation period and candidate routes
  -> existing subscription admission, in route priority order
  -> remaining events -> next subscription or direct API replay
  -> assignments + blocking reasons + existing per-target results/receipts
  -> scoped fixed/variable cost + coverage + evidence
  -> (Phase 2) compare feasible candidates on the SAME demand scope
```

New primitives: candidate evaluation input/result, explicit one-cycle observation
period, capacity evidence attached to scenario routes (separate from price truth),
and call assignments with per-route attempts. No new normalized event, pricing
calculator, reset implementation, model registry or persistent storage format.

Phase 1 supports monthly hard-limit subscriptions and API routes, ordered by
unique priority. Each selected subscription costs one full monthly charge,
including an unused selection. The caller specifies a period of at most 31 days;
this is a one-cycle scenario, not automatic monthly extrapolation or an invoice.
API routes have no modeled rate limits. Unsupported hybrid conditions,
translations, unknown reset phase, qualitative capacity, soft/paid overage rules,
and annual billing are refused rather than silently approximated. Overflow means
routing an entire rejected call, never splitting its token buckets.

## Conflicts and limits of current semantics

- `rolling` means **first-use anchored fixed duration**, not sliding lookback.
  Keep this contract; a genuine sliding quota needs an explicit new window kind.
- The existing workload value UI prorates selected subscriptions over recorded days.
  Candidate evaluation deliberately charges a full selected billing cycle; future
  comparisons must reconcile these cost bases rather than subtracting unlike totals.
- Subscription replay reports a single sticker price even for arbitrary workload
  duration. Do not interpret it as monthly total without an explicit horizon.
- A qualitative-only plan may report supported calls, but cannot establish
  numeric capacity. It must not become an unlimited optimizer resource.
- Existing API economics intentionally disappear on any undecidable call. Keep
  that behavior. Candidate receipts may report a clearly named modeled subtotal
  alongside exclusions; never call it the complete workload price.
- Rule snapshots are selected at `rulesAsOf`; historical timestamps drive windows
  and conditional price schedules. This is a counterfactual, not past invoices.
- API prices are currently model-scoped; provider metadata proves offering, not
  necessarily router-specific negotiated pricing. Do not infer route discounts.
- Greedy route priority is reproducible but is NOT minimum-cost assignment when
  competing subscriptions cover overlapping models or calls have unequal costs.
  Phase 2 must state which strategies it enumerates and cannot claim an optimum
  over strategies it never evaluated.

## Evidence, uncertainty and risks

Keep source/verification metadata on each replay and catalog record. Add an
explicit capacity basis (published hard rule, estimate, synthetic, or user
calibration) with notes; synthetic arithmetic never proves real provider capacity.
Price evidence and capacity evidence remain separate. Calibration can later name
local observed cycles without changing the canonical event or pricing schema.
The evidence kind is a caller-supplied basis, not an inference or calibration
performed by this evaluator; Phase 1 ships no real calibration data.

Unknown identities and unpriced API calls retain individual reasons and explicit
counts. A tiny unknown tail does not erase recognized costs. Its financial impact
is **unbounded without more evidence**, even if call-count coverage is high.
Missing histories, aggregate imports, already-throttled demand, other machines,
and incomplete token categories can change conclusions. Request-count fixtures
assume one event is one request; aggregated usage cannot justify that assumption.
Provider-specific tool/reasoning limits, concurrency and rate limits are not
inferred. No runtime fetches, telemetry, prompt uploads or clocks are introduced.

## Validation and next phase

Baseline: `pnpm test` passes all 13 tasks before changes. Browser baseline and
final test/performance results are recorded below after execution.

Phase 1 tests must hold composition to existing replay outcomes, decimal receipts,
reset boundaries, simultaneous limits, unknown/partial workloads and 100k events.
Phase 2 should preprocess a common recognized/priceable demand scope, enumerate
bounded trustworthy configurations, compare cost/coverage/interruptions with
stable tie breaks, and preserve excluded-cost uncertainty. Decide genuine sliding
windows, billing cycles, aggregate-log eligibility, initial allowance occupancy,
route-specific prices and overlapping-subscription assignment before expanding
real provider catalog support. No real subscription capacity is added here.

## Phase 1 delivered and validation record

Changed files:

- This architecture note.
- `packages/replay-engine/src/optimizer.ts`: bounded ordered candidate evaluation,
  explicit observation horizon, capacity evidence, assignments and scoped costs.
- `packages/replay-engine/src/engine.ts`: optional subscription/API observations
  alongside receipts; blocking IDs are allocated only when requested. Existing
  event validation is shared internally with the candidate layer.
- `packages/replay-engine/src/index.ts`: exports for the new evaluator and types.
- `packages/replay-engine/src/optimizer.test.ts`: 36 deterministic tests.
- `packages/replay-engine/bench/optimizer-100k.mjs`: repeatable synthetic benchmark.

The 10,000-call fixture spans five bursts across 29 recorded days inside a 30-day
observation period. Plan A alone is infeasible; Plan B is $100; Plan A plus API
is $90 ($20 fixed + $70 overflow); API only is $140. Hybrid assigns 5,000 calls
to each route and retains the exact overflow receipt. These are evaluations of
four explicit strategies; automatic candidate enumeration/ranking is Phase 2.

Validation:

- Before core edits: all 1,107 unit tests passed (`pnpm test`, 13 tasks).
- Baseline production build passed. Full existing Playwright suite in omabox:
  375 passed, 48 skipped, one mobile-light screenshot timeout (disabled replay
  button). That test passed on isolated retry against the baseline build.
- Final unit suite: 1,143 tests passed, including 317 engine tests (36 new).
- `pnpm typecheck`: all 15 tasks passed. Production web/dependency build passed.
- Post-change full Playwright suite: 376 passed, 48 skipped, including accessibility,
  large imports, Worker failures/supersession, IndexedDB, pricing/replay, saved
  workloads and share flows. Existing skips were not changed. The evaluator has
  no UI integration yet; these are regression checks, not a browser optimizer test.
- Biome checks on changed code and `git diff --check` passed. No assertions were
  weakened and no UI, catalog data, storage, telemetry or import behavior changed.
- `node packages/replay-engine/bench/optimizer-100k.mjs`, Node 24.19.0:
  100,000 events, three runs **1,294 / 1,096 / 1,269 ms**, 60,000 subscription
  assignments and 40,000 API assignments. Peak process RSS **764 MiB** across
  the three runs (includes catalog, demand, assignments, replay allocations and
  retained results; not incremental optimizer memory). Browser Worker timing and
  memory still need measurement before UI integration. The initial concurrent
  benchmark exposed redundant per-event Temporal parsing; the final path reuses
  replay's nanosecond-preserving timestamp representation with boundary tests.

Remaining Phase 2 decisions: compare only equal modeled scopes; define how to
rank partial results without rewarding omissions; reconcile full-cycle versus
prorated subscription cost; bound route enumeration and explain greedy ordering;
measure Worker memory/cancellation. Sliding quotas, initial account occupancy,
aggregate-demand eligibility and empirical calibration remain explicitly outside
this implementation. No real subscription capacity is inferred.

## O3B compiled execution contract

The neutral compiler target, compatibility boundaries, supported capacity domain and Worker lifecycle are documented in [optimizer-o3b.md](optimizer-o3b.md), implementing the locked [contract review](optimizer-catalog-contract-review.md). No real-provider compiler or UI is included.

### O3B.1 compiler binding boundary

New compilation targets contract/scenario version 2. Commercial schedule definitions remain in immutable artifacts; concrete account purchase cycles, IANA billing timezones, anchors and fixed-partition instances belong to bound scenarios. The canonical shapes, exact calendar-month policy, SHA-256 scenario hashing and version-1 compatibility are specified in [optimizer-o3b1.md](optimizer-o3b1.md). The locked architecture review is not revised. No catalog authoring/compiler/provider work is part of this repair.
