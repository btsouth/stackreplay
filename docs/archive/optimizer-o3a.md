> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# O3A: runtime hardening and initial capacity

O2 was reviewed with no unrelated changes, its 357 engine tests passed again,
and it was committed as `eb2233a525344d9cc277229cb8486ba36e779aef`.
O3A was committed as `ba36f195cbec6910db56c96994e0dfbf651bb177`. This note supersedes O2's fresh-only restriction.
No provider catalog, UI, account, network or model-substitution behavior is added.

## Preserved optimization contract

The optimizer is retrospective/offline: it sees the entire recorded workload and
may reserve purchased capacity for later expensive calls. It answers which modeled
purchase could have handled those calls, not how a live router should act.

The search still covers the API pool, subscription singletons and pairs, each with
optional API overflow: at most six relevant subscription resources, eight APIs,
43 configurations. It is optimal only within this stated family. Unknown identities
are excluded once; all recognized calls, including unpriced ones, remain required
identically across candidates. Exact identities, full-cycle prices, deterministic
ties, matching correctness, aggregate eligibility, evidence/receipts and incomplete
search withholding remain unchanged. There is no arbitrary N-plan search.

## Worker ownership, transfer and cancellation

The existing import pipeline already reads, normalizes and retains workload events
in `replay.worker.ts` (session memory or IndexedDB-backed load cache). Main-thread
requests carry import IDs and selected configuration, never a normalized event array.
Source selection is shared with replay. Optimization selects the explicit half-open
time period once, preserving nanosecond boundaries, before candidate preparation.

The replay Worker owns `OptimizerRuntime`. Each run launches a disposable nested
module Worker containing the same deterministic engine. It sends catalog/configuration once and the selected normalized workload in
5,000-event structured-clone batches, yielding the owner event loop between batches. This temporarily creates
an owner copy and a child copy, plus replay's existing validation/working allocations.
There is no JSON serialization, no per-candidate clone, and no repeated workload
transfer to the page. The owner copy is necessary to preserve unsaved imports when
cancelling the child. Profiling does not yet justify introducing a second compact
workload schema or transferable encoding. Candidate metadata is small and bounded.

The completed child releases its input/temporary engine structures and retains one
optimizer result for inspection. Only aggregate comparison scope, candidate summaries,
pool facts and authoritative receipts go to the owner/page. Assignments, canonical
record IDs, exclusions and per-call checks stay in the child; detail requests return
at most 1,000 records per collection. A new run cancels/releases the old child before
starting another. Cancellation/clear/disposal also removes this retained detail state.

Hard `Worker.terminate()` interrupts synchronous validation, sorting, enumeration,
matching, exhaustive evaluation and receipt production; it does not need cooperative
polling, SharedArrayBuffer, cross-origin isolation, or an async rewrite of replay.
The owner stays responsive while the child computes. Structured cloning each batch is synchronous in the owner and remains a bounded
cancellation delay; the next yield admits cancellation. It never blocks the page's main thread. A single 100k clone measured 129–361 ms, motivating this transport
change without introducing a competing workload representation.

Request IDs/generations follow the existing replay-client pattern. Both the page
client and runtime reject superseded requests and ignore late responses. Import,
clear, deletion, new optimization and replay/scope replacement invalidate optimization.
`cancelOptimizer()` handles explicit cancellation; `optimize(..., signal)` supports
an owner's navigation/unmount lifetime, and `dispose()` terminates the owning Worker.
Document teardown destroys its Worker tree. **Future SPA UI integration must wire an
AbortSignal or cancellation into its component/navigation cleanup**; no UI is added here.
Loading is also generation-checked so a cancelled IndexedDB load cannot spawn a child.
A 60-second owner watchdog terminates stalled optimization (including loading). This
is a failure safety margin, not an optimality budget or a guarantee on slow hardware.
No partial result is presented as a completed optimum after timeout or cancellation.

A crashed child produces a safe local error and the next request starts a fresh child.
Workers do not isolate renderer-level OOM: the existing owner-worker failure handling
remains necessary. No mutable capacity state survives between optimizer invocations.

## Initial consumption and window alignment

`initialAllowance` is explicitly one of:

```ts
{ kind: "fresh" }
{ kind: "provided", unlistedPools: "fresh", entries: [{
  resourceId: "subscription:<resolved-plan-version-id>",
  limitId: "<catalog-limit-id>",
  windowStart: "2026-09-01T00:00:00Z",
  windowEnd: "2026-10-01T00:00:00Z",
  consumedUnits: "120",
  evidence: "Reference/description of the starting-usage observation",
  latched: false // optional; only meaningful for an existing latch policy
}] }
```

The snapshot applies immediately before `period.start`, not before the first call.
Each entry independently identifies an active resource/limit/window, in that limit's
units (requests, tokens or credits). Supplied evidence is retained in the result and
selected resource explanation. Missing pools are fresh only because the caller
explicitly declares that assumption. The contract does not infer prior activity,
percentages, confidence or provider rules. Source-specific ingestion/calibration and
richer evidence records can later resolve into this snapshot contract.

A 500-request limit with 120 consumed starts with 380 available slots. The matching
path subtracts supplied use and exposes maximum, initial use and available capacity.
General hard policies seed the authoritative replay admission state directly; no
historical events, model/token demand, prices or receipts are fabricated. Replay's
whole-workload consumed/attempted totals remain **new recorded demand**. Its window
crossing diagnostics include supplied starting consumption, explicitly available in
the explanation. An already-active latch is represented separately because it can
block even when accepted consumption is below the numerical maximum. Blocking limit
IDs explain such rejections without inventing a historical numeric crossing.

Validation rejects duplicate/unknown limits/resources, negative/excessive consumption,
fractional request counts, unsupported soft-policy state, invalid latch state,
and windows not containing observation start. Calendar entries must match the
catalog timezone's exact day/week/month boundaries. Existing first-use-anchored
policies accept an earlier anchor with exactly the documented duration; after that
window ends, the next assigned call opens a new first-use window. Sub-millisecond
boundaries remain lossless. Provided state ends at its window boundary and never
leaks into a later window. Independent overlapping limits can each have a snapshot.

Workload start, capacity-window start and purchase-cost scope are distinct. A
September 12 import can start in a September 1 quota window. Optimization still
charges one **full** monthly price; it is not an invoice reconstruction or a claim
that an already-started allowance is available with a new purchase. The supplied
state is a scenario constraint. The one-calendar-month purchase bound (and 31-day
ceiling) remains. Multi-cycle support would require explicit billing anchors,
renewal/purchase counts, rule-version transitions, quota reset/carryover semantics,
and accounting for starting state without charging historical demand again.

True sliding/lookback windows remain unsupported. The legacy catalog word `rolling`
currently means **first-use anchored consecutive windows**, not a sliding lookback.
O3B's versioned catalog must keep these semantics distinct rather than map one to
the other.

## Browser measurements

These are local Chromium measurements in an isolated omabox desktop, using the
production bundling tool and the actual optimizer engine/runtime class. The harness
constructs deterministic normalized workloads in the owner Worker, preserving the
real app's ownership boundary. A separate end-to-end test exercises the actual
production import/optimizer Worker assets, bundled API pricing and IndexedDB/session
path. Measurements are not mobile-device guarantees.

Three samples per size/plan set. CDP samples each Worker heap every approximately
25 ms; sampled peaks are lower bounds, not an exact allocation high-water mark.
`/proc` RSS is summed for the dedicated browser processes; it includes browser/GPU
baselines and can count shared pages more than once. It is not Node process RSS.
Forced GC is outside timed runs, distinguishing live retained state from transient
allocation. The plan/scope-change sequence also executes consecutive runs without
forced GC between them. Main-thread responsiveness uses a 16 ms timer in the harness.

| Events | Candidates | Median / slowest | Sampled child peak | Owner peak | Summed browser peak RSS |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10k | 7 | 358 / 368 ms | 38 MiB | 2.6 MiB | 420 MiB |
| 10k | 43 | 450 / 459 ms | 37 MiB | 2.6 MiB | 425 MiB |
| 50k | 7 | 1,071 / 1,124 ms | 134 MiB | 11.5 MiB | 559 MiB |
| 50k | 43 | 1,254 / 1,275 ms | 133 MiB | 11.5 MiB | 562 MiB |
| 100k | 7 | 2,376 / 4,595 ms | 215 MiB | 22.5 MiB | 675 MiB |
| 100k | 43 | 2,301 / 2,397 ms | 227 MiB | 22.5 MiB | 701 MiB |

At 100k/43, completed live child state was 13.67 MiB and owner state 22.13 MiB.
At 100k/7, the different winner's receipts increased child retention to 14.20 MiB.
After release/cancellation the child target disappeared; owner heap across the three
100k runs was approximately 22.13–22.14 MiB, not an accumulating workload per run.
At 50k it returned to 11.26–11.27 MiB, at 10k to 2.55–2.57 MiB. The retained object
categories are the owner's original workload and the child's shared scope, one
assignment set, selected receipts and compact summaries; no per-candidate retained
assignment matrix exists. Process RSS may remain reserved after isolates are freed.

Plan-set change, scope reduction, cancellation at transfer/preparation/enumeration/
assignment/receipt phases, and subsequent rerun completed in each fixture. All 30
phase-cancel checks emitted cancellation and no final success, and removed the child.
Transfer cancellation acknowledgement was 5.5–10.2 ms; compute-phase acknowledgement
was 0–0.2 ms at the available timer precision. This measures dispatch to owner ack,
not OS physical-memory reclamation. Child disappearance was checked after a 100 ms
settling interval. Main-thread maximum tick gaps were 16.2–20.6 ms; post-GC main-thread
heap was 0.58–0.62 MiB in the harness, which never received workload arrays.

Batches typically serialized in 5.5–8.9 ms. The 100k/7 run had a 52.7 ms slow batch
and a 4.595 s slow total while host/build activity was concurrent; neither sample is
hidden. Its next two runs were 2.376 and 2.069 s. At 100k/43 the three maximum batch
times were 6.5, 5.5 and 8.1 ms, with total serialization 94–98 ms. Timer yields and
fresh child startup are included in elapsed runtime. Comparison with the unbatched
prototype (100k/43 median 2.530 s) is indicative, not a controlled speedup claim.
The demonstrated benefit is bounding the uninterrupted serialization interval.

Without forced GC between plan/scope changes, 100k child heap was approximately
103–116 MiB at the sampling points, versus 13.7–14.2 MiB after GC with a result
retained. Old child targets were terminated rather than accumulating across runs.
Transient heap remaining until GC is different from a retained workload leak;
physical RSS can stay allocated even after cancellation. Engine validation, pricing,
matching and one receipt/assignment result still create substantial temporary objects.

The single-Worker O2 browser baseline on the same fixture was 228/328 ms (10k,
7/43), 942/1,232 ms (50k), and 1,721/2,316 ms (100k). Its 100k/43 sampled peak was
174 MiB; released heap was about 26 MiB. The cancellable boundary costs one workload
clone and fresh child startup, rather than events × candidates duplication.
Historical Node O2 was 3.686 s / 709 MiB process peak with 43 candidates and 54 MiB
released heap, on a different varied-token fixture. Browser heap, summed browser RSS
and Node RSS must not be treated as interchangeable regression measurements.

One instrumented rerun crashed Chromium's DedicatedWorker with a kernel `int3` trap;
no OOM-kill record or matching core was available. It occurred after adding a live
`Runtime.evaluate(location.href)` probe to identify unnamed targets. Removing that
probe and identifying owner/child by their controlled creation order allowed the
complete measurement sequence to pass. This suggests an instrumentation interaction,
but does not prove the cause; the failed run is excluded and remains documented.

Provisional targets for this measured desktop class: 10k <0.5 s, 50k <1.5 s,
100k median <3 s and representative slow run <5 s; sampled child heap <256 MiB, owner fixture <25 MiB at 100k; no page task
stall >50 ms; phase cancellation acknowledgement <100 ms and no surviving child
between runs. These are regression investigation thresholds, not enforced event caps
or cross-device promises. The 60-second watchdog allows substantial slower-device
headroom. Larger stress workloads are optional and were not used to claim support;
this machine had substantial concurrent memory/swap pressure during testing.

Reproduce with:

```sh
node apps/web/bench/optimizer-browser.mjs
node apps/web/bench/optimizer-runtime-browser.mjs
node apps/web/bench/optimizer-runtime-browser.mjs --transfer
```

Run these browser harnesses inside omabox. `--stress` is available for an explicitly
chosen 200k test on a machine with suitable headroom. Raw output contains only
synthetic fixture metrics. No benchmark instrumentation ships in the production Worker.

## Validation and catalog integration follow-up

Initial-state tests cover zero/partial/full use, multiple limits, reset boundaries,
earlier anchors, token use, prior latch, invalid state and repeated deterministic
runs. Runtime/client tests cover pre-aborted/load-time cancellation, every compute
phase, stale success/error responses, timeout recovery, detail bounds and lifecycle
cleanup. Existing O2 matching/oracle and financial invariants remain intact.
All 1,217 unit tests pass (373 engine tests, 303 web tests), including 34 new tests.
Workspace typechecking, the production build, changed-file Biome checks and diff
checks pass. The full production-browser regression suite passed inside omabox: 378 passed,
48 skipped, no failures (2.0 minutes), including desktop/mobile optimizer lifecycle,
Worker/import/IndexedDB behavior, privacy, accessibility and visual checks.
A latch warning-count regression was caught by the existing generated-demo equality
test and fixed; the committed demo artifact remains unchanged. The first new E2E
fixture exceeded 31 days and was correctly refused; selecting its last 30 days
fixed the test without weakening the purchase-scope guard.

The catalog work needs explicit units, limit identities, window type/anchor/timezone,
hard admission vs overage/latch behavior, per-model applicability, price cycle and
evidence versioning. A percentage alone is insufficient without a denominator,
window and observation time. Unknown starting state must remain an explicit
assumption or unavailable result, not an inferred zero. Different API resources
still have no modeled rate limits/fixed access charges; such catalog facts would
invalidate O2's all-APIs pool reduction and require a reviewed engine change.

## Files and review boundary

Engine changes: `initial-capacity.ts` and its tests; `engine.ts` admission seeding;
`exact-optimizer.ts`, `optimizer-types.ts`, `optimizer-assignment.ts` and existing
optimizer tests/exports. Initial state is carried through the same final replay
verification as allocation and cost, not a separate accounting implementation.

Browser changes: `optimizer-runtime.ts` and its tests, the dedicated optimizer Worker,
existing replay Worker/client/protocol and stale-load tests, shared source selection,
Worker build script and generated-asset ignore entries. Added real-catalog API
integration and browser lifecycle tests. There is no change to visual components.

Profiling: the baseline/owner/fixture harness files and two browser benchmark runners
under `apps/web/bench/`. All fixture content is synthetic. Outstanding concerns are
lower-memory/mobile devices, renderer-wide failures, true peak versus sampled heap,
other synchronous owner-Worker work delaying dispatch, and future UI lifetime wiring.
No compact binary workload schema, arbitrary sliding-window framework or speculative
provider capacity policy is introduced. O3B should follow the catalog audit review.

Complete O3A file inventory (29 files):

- Engine: `packages/replay-engine/src/initial-capacity.ts`, `initial-capacity.test.ts`,
  `engine.ts`, `exact-optimizer.ts`, `exact-optimizer.test.ts`, `optimizer-types.ts`,
  `optimizer-assignment.ts`, `index.ts`.
- Browser library: `apps/web/lib/optimizer-runtime.ts`, `optimizer-runtime.test.ts`,
  `optimizer-integration.test.ts`, `worker-client.ts`, `worker-client.test.ts`,
  `worker-import-supersession.test.ts`, `worker-protocol.ts`, `workload-scope.ts`,
  `scoped-replay.ts`.
- Browser workers/build: `apps/web/workers/optimizer.worker.ts`, `replay.worker.ts`,
  `apps/web/scripts/build-worker.mjs`, `.gitignore`.
- Browser tests/profiling: `apps/web/e2e/optimizer-runtime.spec.ts`,
  `apps/web/bench/optimizer-fixture.ts`, `optimizer-baseline.worker.ts`,
  `optimizer-owner.worker.ts`, `optimizer-browser.mjs`, `optimizer-runtime-browser.mjs`.
- Documentation: `docs/archive/optimizer-o2.md`, `docs/archive/optimizer-o3a.md`.
