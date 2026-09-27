# O3B: compiled execution runtime

This implements the provider-neutral target of [the locked contract review](optimizer-catalog-contract-review.md). That decision record is unchanged. No real-provider plan or capacity claim is added. All new fixtures are synthetic.

## Compiler target and compatibility

The sole new compiler target is `CompiledExecutionPlan` plus `BoundExecutionScenario`, validated by the schemas in `packages/schema/src/compiled-execution.ts`. `optimizeExactModels` dispatches explicitly tagged `contract: "compiled-v1"` inputs to this runtime. The separately versioned catalog-v1 entry remains a compatibility path for existing imports, stored results, catalogs and replay semantics; it is not a second target for the new compiler. Legacy pricing, overage and persisted result meanings are not retroactively changed.

Token rate/category/tier types now live in the neutral schema package and are re-exported by catalog. Both paths use the existing decimal arithmetic, disjoint cache/reasoning accounting, conditional rates, billing-equivalence validation, model identity resolver, chronological demand validation, calendar boundaries and exact request-pool matcher. Compiled capacity replay extends atomic admission to named pools and multiple counter views. It does not select research observations or interpret provider names, URLs, marketing text, YAML or source formats.

An artifact pins contract/compiler/catalog/artifact versions, finite exact routes, resolved overlay IDs, half-open rule validity, fees, rates, typed debit operations and claim references. A scenario independently pins rules time, workload period, resource instances, purchase cycles, eligibility resolutions, initial observations and their local provenance. Workload scope has a content fingerprint covering canonical identities, event IDs, timestamps, usage and exclusions. The `scope-fnv64-v1` fingerprint is a deterministic comparison checksum, **not a cryptographic authenticity proof**. Compiler/catalog/scenario hashes are supplied immutable identifiers; the runtime does not authenticate evidence packages.

## Units and economics

Meters are requests, tokens, USD usage value, or provider credits with a mandatory stable `unitId`. A meter ID is scoped to its artifact/resource. Receipts retain resource, pool, debit and meter identities; they do not sum unlike credits. Opaque capacity/debit is a non-computable artifact, never a numeric meter.

Debit rules are constant amounts, explicit coefficients over disjoint token categories, or the existing per-million category-rate operation with an explicit multiplier and output meter. Token-based operations currently require complete canonical token accounting; missing telemetry remains unknown. Every rate declares USD or a specific meter denomination. Cash routes require USD rates; a cross-unit allowance conversion requires an explicit compiled conversion flag and factor. Cash uses a separate route-bound rate and cash multiplier. A subscription may debit credits while adding zero cash. Changing a debit multiplier cannot change API receipt rates or fixed fees. Debit receipts retain constant/token/rate calculation components, checked against their independently accumulated totals. Aggregate quantities are decimal strings; the existing optimizer input safe-integer envelope is unchanged. Cash receipts aggregate category tokens × rate / 1,000,000 × cash factor without per-call rounding. Missing nonzero category prices do not disappear. Conditional rate tiers retain original request size/time behavior and use the existing semantic validation.

All fixed fees are full-cycle purchase costs, including unused purchased resources. Executable scopes require one explicit monthly or 28-day cycle containing the entire workload interval, with at most 31 observed days. Monthly validation currently uses UTC calendar-month addition; non-UTC calendar-month cycles whose elapsed boundaries differ require a future binder/contract extension and are refused. Annual, other terms and multiple purchases are non-computable. Neither workload start nor rules validity creates a purchase cycle.

## Pools, counters and windows

A pool is a typed accepted-debit stream, not another balance that is charged alongside its constraints. Every applicable constraint is checked before any counter advances. Failure rejects the entire call; no other pool is debited. Shared and model-specific ceilings observe the same debit independently. Receipts count the pool debit once, while capacity witnesses report initial and newly accepted consumption per counter. Latches are separate state, persist only through their window, and may be activated by rejected offers.

Supported windows:

- `calendar`: day/week/month, explicit IANA timezone, legacy midnight/Monday reset conventions and DST behavior. Other reset schedules must be compiled into partitions.
- `first_use_anchored`: elapsed duration, finite activation-model group, first eligible offer. All constraints referencing the same window share its activation. A rejected offer can activate it. Optimizer assignment replay uses only its assigned subset, recomputing activation per allocation; it does not invent rejected offers.
- `fixed_partition`: explicit ordered contiguous half-open intervals, unique IDs, parent cycle identity and no carry. These cover account-assigned/billing/four-week/seven-day slices when their actual boundaries are supplied.

Nanosecond boundaries and stable same-time event ordering are preserved. There are at most 64 instantiated windows per constraint, 16 pools and 32 constraints per artifact. Unknown anchors, partition gaps, invalid containment and unsupported trailing windows cannot produce a feasible capacity claim. Genuine trailing/sliding lookbacks remain unsupported.

`rolling` is accepted only by the legacy catalog-v1 contract. `migrateLegacyWindow("catalog-v1", …)` explicitly maps it to `first_use_anchored`, with each old limit's model-filtered activation group. `sliceFirstUseAnchoredWindows` is the correctly named primitive; `sliceRollingWindows` remains a deprecated compatibility alias. Old catalog/result spellings and their meaning are not silently rewritten. The new compiled schema rejects `rolling`.

## Initial state and eligibility

An initial observation targets:

`resourceInstanceId + artifactHash + poolId + constraintId + window.id/start/end`

It is as of the common scenario start, with a decimal consumed amount, explicit latch and local observation reference. It can describe a window that began earlier. Prior consumption does not produce fake calls, usage charges or new pool-debit receipts. Independent overlapping counters are seeded independently; subset consumption cannot exceed the matching shared counter. Identical observations deduplicate, conflicting observations fail validation, and observations cannot cross artifact versions. Stale readings need upstream evidenced reconciliation; they are not extrapolated.

Unlisted state defaults to unknown. An explicit fresh assumption is recorded separately. For first-use windows, callers must additionally supply `inactive` or an already-active exact interval; zero use is not an inactive anchor. Observation state expires at its own boundary. `migrateLegacyObservation` requires explicit compiled identity mappings and a local evidence reference; the caller retains the old evidence text in its local evidence package, never as a published catalog claim.

Requirements are finite fact IDs. Only an explicit true resolution passes. Known false yields unavailable; absent/unknown yields not computable. Route eligibility is independent of subscription entitlement. Region/cohort/source resolution remains outside the runtime.

## Outcomes and search envelope

Candidate outcomes are `feasible`, `infeasible`, `unavailable`, `not_computable`, and `not_evaluated`, with structured reason codes. Infeasible means known rules failed. Not computable includes opaque capacity, missing prices/measurements/chronology/initial state/reset facts, unknown eligibility and unsupported semantics. Not evaluated means an exact assignment search exceeded its budget. Cancellation/runtime errors remain run lifecycle outcomes.

Only unresolved model identities are scope exclusions. Recognized-but-unpriced calls remain required. Every candidate sees the identical canonical event population. Aggregate/unknown chronology can support flat API arithmetic but not subscription capacity or time-dependent rate claims. A known false optional API route can be excluded; an unknown potentially relevant paid route prevents certification of the pooled minimum instead of silently being treated as unavailable.

Search remains six subscription resources, eight independent paid routes, API-only, single subscriptions and pairs, optionally with independently permitted API resources: at most 43 configurations. Duplicate plan instances or cross-resource shared capacity are not combined as independent capacity. The plan's hard stop never grants fallback entitlement; fallback must be a separate eligible exact-model route in the bound scenario. There is no automatic provider continuation inference.

The proven weighted matcher is restricted to one calendar constraint, whole unit-request debit, zero incremental included cash and integer remaining capacity. Richer combinations use deterministic bounded exhaustive replay. The bound is 10,000 assignment states by default (100,000 maximum), plus two million event/debit/constraint work units including a reserved independent verification pass. Large single-choice richer replays are supported within that envelope; 100k branching multi-constraint/value assignments return not evaluated. No greedy result is labeled optimal.

Ranking is feasibility, total USD, variable USD, number of purchased subscriptions, API records, then stable candidate ID. Assignment ties follow sorted resource/route IDs and canonical event order. Known evidenced nonnegative fixed fees provide lower bounds; only a strict bound above the best total can certify it despite omitted candidates. Family completeness is separate from that certificate. Neither means global market optimality or a live routing policy: this is retrospective hindsight over a declared bounded family.

Automatic PAYG is executable only after compilation into a truly independent fee-free, uncapped paid route with explicit entitlement. Purchased balances, flexible balance allocation, mandatory exhaustion ordering, upgrades during replay, unmeasured concurrency/services, true sliding windows and model substitution must compile to non-computable reasons. Disabled optional behavior must be visible in the pinned scenario/evidence; the compiler must not claim completeness over omitted modes.

## Worker and verification lifecycle

The existing owner/child design remains: one child per run, 5,000-event batches, generation guards, explicit termination and bounded detail pages. Normalized events are cloned once into the child, not once per candidate. The owner retains original workload data. Candidate search retains only one selected assignment set; bounded immutable choice interning avoids retaining equivalent objects for every candidate. Matching itself proves admission within its strictly checked domain; only the selected assignment needs an independent receipt replay, as in O2. Rich exhaustive branches still use capacity replay. Per-candidate receipts are not retained.

The primary summary retains fees/cycles, cash category receipts, typed debit receipts, capacity witnesses, candidate outcomes/reasons, evidence, scope fingerprint and pinned scenario/artifact identities after child teardown. Failed rich allocations retain up to 16 crossing witnesses, explicitly labeled as a rejected-allocation example rather than proof of all allocations. Assignments and exclusions remain pageable (1,000 records and a 1 MiB compiled-detail page limit). New work/cancellation invalidates detail. A summary verifies aggregate arithmetic; chronological verification after teardown requires original workload plus pinned artifacts/scenario, or exported assignment pages. Keeping a child alive indefinitely is not the audit strategy.

The compiled entry is wired into the existing child and generic owner runtime. The application's import-owner protocol still invokes the legacy catalog path until a real compiler/binder is integrated; no UI or provider adapter is introduced here.

## Validation and performance

See the measurement table and final validation below. Benchmarks use the actual production child and owner lifecycle through the existing isolated-browser harness, not a Node-only stand-in. Samples are CDP heap measurements; short allocation spikes can be missed. Forced GC is used outside timed runs to distinguish retained state from garbage. Browser RSS sums include browser/renderer/utility baselines and shared mappings and cannot be equated to Node process RSS.

The acceptance families cover opaque capacity; simultaneous session/week/month/subset counters; non-carrying 28-day slices; independent named pools; scoped credits/cohort facts; and included allowance with independent debit/cash multipliers. Explicit unsupported reason fixtures cover trailing quotas, unmeasured services, unknown debit and purchased/unknown continuation. Existing legacy optimizer, matching, import, pricing, scope and Worker tests remain required.

| Events | Family / candidates | Median / slowest ms | Peak child MiB | Retained child MiB | Retained owner MiB | Peak browser RSS MiB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 10,000 | simple / 43 | 716 / 749 | 28.3 | 3.6 | 2.6 | 431 |
| 10,000 | multi / 1 | 269 / 273 | 27.6 | 3.4 | 2.6 | 421 |
| 10,000 | pools / 1 | 172 / 177 | 26.9 | 3.3 | 2.6 | 423 |
| 50,000 | simple / 43 | 2619 / 2833 | 97.1 | 5.6 | 11.3 | 549 |
| 50,000 | multi / 1 | 1099 / 1193 | 71.8 | 5.4 | 11.3 | 517 |
| 50,000 | pools / 1 | 561 / 583 | 71.2 | 5.3 | 11.3 | 518 |
| 100,000 | simple / 43 | 5177 / 5646 | 165.3 | 8.1 | 22.2 | 677 |
| 100,000 | multi / 1 | 1936 / 2057 | 122.5 | 7.8 | 22.1 | 592 |
| 100,000 | pools / 1 | 1071 / 1531 | 120.3 | 7.8 | 22.1 | 602 |

[Machine-readable samples](benchmarks/optimizer-o3b.json) include all three runs per case and each cancellation phase. The multi fixture has simultaneous session/week/month/model constraints; the pools fixture uses two independent balances. These are single-choice rich allocations, not a claim that a 100k branching rich search completes.

All 27 measured runs retained only the owner after release. All 45 phase-cancellation checks removed the child and emitted no success, with measured acknowledgement at most 9.1 ms; child disappearance was checked after the harness's 100 ms observation delay. Main-thread maximum timer gap was 16.6 ms. Within each three-run case, released owner heap spread was at most 13.1 KiB. Changing plans/scope, cancellation and a subsequent run completed without monotonic retained growth. Fixed-input winners and totals matched across all three repetitions.

The initial compiled implementation reached 477 MiB sampled child heap at 100k/43 candidates; bounded choice interning reduced that to 180 MiB, and reusing matching's admission proof with independent winner verification reduced the final measured maximum to 165 MiB. Retained child state is one assignment set plus compact summaries; most peak memory is temporary demand, matching and replay data, not 43 retained workloads or receipts. The owner holds one normalized workload and sends each event once in 5k structured-clone batches. Catalog/artifact metadata is cloned once per run.

O3A's 100k/43 browser reference was approximately 2.30 s median, 227 MiB peak child heap, 13.67 MiB retained child state and 701 MiB summed browser RSS; O2's Node reference was 3.7 s / 709 MiB peak process RSS. Fixtures and execution semantics differ, so these are context rather than controlled speedup claims. O3B's compiled simple case is slower than O3A; its memory is lower. Browser RSS is not comparable to a single Node process.

Initial desktop targets suggested by these measurements: 10k under 1 second, 50k under 4 seconds, 100k under 10 seconds for the measured maximum simple family; rich deterministic 100k under 3 seconds; sampled child heap under 200 MiB, completed child under 12 MiB, cancellation acknowledgement under 50 ms. These are engineering targets, not cross-device guarantees or new hard-coded limits. Keep the existing 60-second lifecycle watchdog. Mobile CPU behavior, unseen larger artifact sets and sustained memory pressure remain unmeasured.

Final unit validation: 1,265 tests (419 engine, including 46 new compiled tests; 305 web, including two new summary/lifecycle tests; schema 71, catalog 112, adapters 239, CLI 36, share 67, UI 16). Repository typechecking and production build pass. The complete browser suite passed 380 tests with 48 existing skips, including two desktop/mobile compiled Worker cases. An earlier concurrent-load run had one unchanged plan-picker keyboard-focus failure; the complete rerun passed without changing that test. After the final receipt/contract checks, all four compiled/legacy Worker browser checks passed again.


## Remaining compiler/binder obligations

Compile selectors to finite exact identities and unambiguous included routes; validate accepted evidence and hash artifacts; resolve overlay ordering/rounding; bind actual monthly/28-day cycles, partitions and active anchors; reconcile initial readings as of scope start; keep local evidence separate; resolve user facts without assuming eligibility; declare unsupported mechanics and omitted continuation scenarios. Validate authenticity externally—the runtime only checks its bounded deterministic contract. Any future richer solver, trailing-window state, non-UTC monthly purchase validator or new candidate family needs its own correctness and browser-performance review.

## Complete O3B file inventory

- `apps/web/bench/optimizer-compiled-fixture.ts`
- `apps/web/bench/optimizer-owner.worker.ts`
- `apps/web/bench/optimizer-runtime-browser.mjs`
- `apps/web/e2e/compiled-optimizer.spec.ts`
- `apps/web/lib/compiled-optimizer-runtime.test.ts`
- `apps/web/lib/optimizer-runtime.ts`
- `apps/web/workers/optimizer.worker.ts`
- `docs/benchmarks/optimizer-o3b.json`
- `docs/optimizer-architecture.md`
- `docs/optimizer-o3a.md`
- `docs/optimizer-o3b.md`
- `packages/catalog/src/index.ts`
- `packages/catalog/src/schema.ts`
- `packages/catalog/src/validate.ts`
- `packages/replay-engine/src/compiled-capacity.ts`
- `packages/replay-engine/src/compiled-execution.test.ts`
- `packages/replay-engine/src/compiled-legacy.ts`
- `packages/replay-engine/src/compiled-optimizer.ts`
- `packages/replay-engine/src/exact-optimizer.ts`
- `packages/replay-engine/src/fixtures/compiled-execution.ts`
- `packages/replay-engine/src/index.ts`
- `packages/replay-engine/src/units.ts`
- `packages/replay-engine/src/windows.ts`
- `packages/schema/src/compiled-execution.ts`
- `packages/schema/src/execution-rates.ts`
- `packages/schema/src/index.ts`
