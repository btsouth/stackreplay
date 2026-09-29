# O2: exact-model optimization

O2 is committed as `eb2233a525344d9cc277229cb8486ba36e779aef`.
The subsequent [O3A note](optimizer-o3a.md) supersedes the fresh-only allowance
restriction and documents the browser runtime; the O2 search family is unchanged.

O0/O1 was reviewed and committed as `812a5a63f0982a36f34bf3eb0d166c410092344d`.
All 317 engine tests passed again before that commit. O2 changes start after it.

## Allocation decision (before implementation)

Plan-order greedy is incorrect even for one subscription: spending its last call
on a cheap request may force an expensive request onto API. Trying each global
plan order also fails when different windows/models require different choices.

For a subscription with one calendar request quota, each event consumes one unit
from exactly one of its window pools. Assigning calls across overlapping plans
is weighted capacitated bipartite matching. Matchable subsets form a transversal
matroid: processing mandatory calls first, then descending avoided API cost, with
augmenting-path reassignment, finds the maximum saved API spend. This is exact,
not a scarcity heuristic. Equal eligibility signatures share occupancy lists so
an augmenting search visits groups/pools, not thousands of identical occupants.
No external solver and no floating-point monetary weights are needed.

The scalable path supports calendar day/week/month request windows in their
catalog timezone. First-use anchored windows, token/credit pools and combined
hard limits use a small exhaustive assignment search, with existing subscription
replay as the feasibility oracle. Assigning a subset changes first-use anchors;
therefore these policies must NOT be reduced to static windows over all demand.
The assignment budget defaults to 10,000 states (configurable up to 100,000),
with an additional bound of 2,000,000 event × leaf evaluations. If either budget
would be exceeded, report the candidate as unevaluated. Never label a heuristic as optimal. A cheapest evaluated solution is
certified only when every unevaluated candidate has a strictly larger fixed-cost
lower bound; otherwise expose best-known and withhold a winner. Genuine sliding
lookbacks remain unsupported by the underlying catalog/replay contract.

## Scope, supply and enumeration

Resolve canonical identities once. Only unresolved identity is excluded globally.
Every recognized event remains required for EVERY candidate, even if no available
API price exists. An unpriced call must be served by a valid purchased subscription
or the candidate is infeasible; dropping it is not a discount. All candidates
reference the same ordered scope, rules instant, period and catalog version.

At most six distinct subscription versions and eight API resources are accepted.
Enumerate API-only, each subscription, and subscription pairs, each with/without
API (bounded to 43 configurations). Versions of the same plan cannot be bought
together. Duplicate resource inputs normalize by canonical resource ID. Omit
subscriptions with no supported required model, with an explicit reason. Do not
use price/capacity heuristics to prune before evaluation.

API access has no fixed price, capacity constraint or provider preference in the
existing model. Thus all permitted API resources form one pool, choosing each
call's cheapest priceable exact-model route, with stable ID ties. Enumerating API
subsets cannot improve cost or feasibility. If API access acquires fixed charges
or limits, this reduction is invalid and must be replaced explicitly.

This is an optimum over the declared singleton/pair configuration family, not
over purchasing three or more subscriptions. Results state the bound.

## Billing, initial state and chronology

One explicitly declared period, at most 31 days and no longer than one UTC
calendar month beginning at `period.start` when subscriptions are supplied. Every purchased monthly
subscription is charged its full cycle price; no daily proration. Annual/multiple
purchase cycles remain unsupported. Require an explicit initial-allowance
selection. O2 implements `fresh`; reserve a supplied-state variant carrying
per-resource/per-limit consumed units and window bounds, refused until replay can
honor it. No implicit deduction from missing history or usage percentages.

Require a demand-granularity declaration, with per-event overrides for mixed
sources. Known ccusage rows are always aggregate, regardless of the declaration.
Aggregate/unknown chronology cannot enter subscription capacity assignment.
Flat API token prices remain usable; conditional context-size/time-of-day prices
cannot be applied to fabricated aggregate timestamps or request sizes, and remain
unavailable for those records. The source event schema and import pipeline stay
unchanged; eligibility is a sidecar to the comparison scope.

## Comparison and explanations

Order feasible candidates by exact total cost, API spend, purchased subscription
count, API-assigned record count, then canonical candidate ID. Nonfeasible and
unevaluated candidates cannot win. For equal objectives use stable chronological
and event-ID order, canonical resource IDs, and deterministic augmenting searches.

Keep all candidate summaries for audit. Mark observed-scope dominance only after
complete evaluation, with identical coverage and capacity-evidence assumptions;
retain dominated summaries and identify their dominator rather than hiding them.

Reuse per-target replay results, confidence and price receipts. Retain only the
winner/best-known assignment detail; other candidates are explainable by rerunning
an explicit candidate ID. Optimal scheduling may reserve quota for later expensive
calls: say so instead of implying every API overflow was rejected at arrival.
Report full selected pools and displaced demand, not invented user interruption
sessions. Existing replay verifies each final subscription allocation and produces
API receipts from precisely the assigned calls.

## Memory and validation plan

One normalized recognized scope and one cheapest API quote per event, with shared
quote records for repeated prices. Compile pool membership once per resource.
Evaluate candidates sequentially with temporary integer placement arrays; keep
compact summaries and only one selected assignment. No events × candidates matrix,
no full receipt/assignment result retained for every candidate.

Test matching against exhaustive replay on small adversarial workloads, including
reassigning earlier flexible calls, expensive later calls, multiple models and
windows, ordering invariance, missing prices, aggregate eligibility and ties.
Keep a nontrivial 10k-call fixture and compare isolated-process 100k O1/O2 runs
with the same fixture, runtime, memory snapshots and candidate counts. Distinguish
process RSS, retained heap and transient replay allocations. Browser Worker
integration and browser-specific memory/cancellation are still O3 work.

## O2 validation and measured results

The 10,000-call fixture spans two exact models and five bursts. Seven configurations
are derived from two subscriptions and two APIs. Plan A alone is infeasible;
Plan B is $100; API-only is $140. Plan A plus API wins at $90: $20 purchased
subscription plus $70 API, with 5,000 records assigned to each. The selected
allocation is independently replayed and its API receipts must equal the quoted
variable total. Any feasible alternative can be reconstructed by candidate ID.

Added 40 engine tests (38 optimizer/quote tests and two assignment tests), including
250 seeded matching instances compared with an independent exhaustive oracle,
overlap/order adversaries, scope exclusions, unavailable prices, full-cycle billing,
calendar boundaries/timezones, first-use/token/combined limits, aggregates,
explicit initial state, confidence, cost ties, cached/reasoning accounting,
10k acceptance and 100k correctness. All 357 engine tests and all 1,183 workspace
unit tests pass. Workspace typechecking and the production web build pass.
The full Playwright browser regression suite passed inside omabox: 376 passed,
48 skipped, no failures (2.1 minutes), including accessibility and visual checks.
An initial omabox startup failed while sweeping an unrelated stale sandbox; a
task-specific cache directory allowed the suite to run without changing that sandbox.
Changed-file Biome checks and `git diff --check` also pass. O2 was subsequently reviewed and committed; no UI, provider catalog, import, persistence or privacy files changed.

Run `node packages/replay-engine/bench/optimizer-comparison-100k.mjs 100000 2`
and repeat with `6` subscriptions. Each mode runs in a fresh Node 24.19.0 process;
GC measurements happen outside the timed interval. Same deterministic 100k-event,
multiple-model/provider, varied-token-cost fixture for O1 and O2:

| Run | Candidates | Runtime | Peak process RSS | Heap with result retained | Heap after result released |
| --- | ---: | ---: | ---: | ---: | ---: |
| O1, two-plan catalog | 1 | 1.887 s | 604 MiB | 98 MiB | 53 MiB |
| O2, two-plan catalog | 7 | 2.769 s | 682 MiB | 127 MiB | 54 MiB |
| O1, six-plan catalog | 1 | 1.732 s | 583 MiB | 98 MiB | 53 MiB |
| O2, six-plan catalog | 43 | 3.686 s | 709 MiB | 70 MiB | 54 MiB |

Process baseline was 80–83 MiB RSS / 10 MiB heap; constructing the fixture reached
144–147 MiB RSS / 51 MiB heap. O2 retained exactly one assignment set in both runs.
The 43-candidate winner has fewer API receipt structures than the seven-candidate
winner, explaining its smaller retained heap. Higher RSS after GC reflects retained
process allocation, not equivalent live objects. A released-result V8 heap snapshot
contained no prepared-optimizer objects; its approximately 55 MiB of live node sizes
was predominantly the original fixture (about 600k ordinary objects, six per event).
Repeated post-turn GC returned heap to 54 MiB. No persistent events × candidates
retention was found. Transient validation/replay allocations and the one selected
receipt/assignment result remain meaningful costs; ~700 MiB process RSS still
requires browser Worker measurement before browser integration.

The earlier O1 report of ~1.1–1.3 s / ~764 MiB used a different, simpler fixture and
multiple iterations in one process. It is historical context, not a like-for-like
O2 regression measurement. These isolated comparison runs are the reproducible
baseline for this milestone; individual timing/RSS samples naturally vary.

## Implementation map and follow-up

- `exact-optimizer.ts`: shared scope, bounded configurations, evaluation, ordering,
  certification, evidence and on-demand explanations.
- `optimizer-types.ts`: input/result contracts and explicit chronology/initial state.
- `optimizer-assignment.ts`: exact capacity matching; tests include an independent oracle.
- `fixtures/exact-optimizer.ts`, `exact-optimizer.test.ts`: deterministic synthetic data
  and acceptance/regression tests; no live provider subscription assumptions.
- `api-replay.ts`, `engine.ts`, `index.ts`: optional quote observation from authoritative
  replay without discarded receipt construction; existing priceability observer preserved.
- `optimizer.ts`: shared demand validation extracted without changing O1 routing semantics.
- `bench/optimizer-comparison-100k.mjs`: isolated runtime/heap/RSS comparison.

For O3, first profile execution and peak memory inside the existing browser Worker
boundary, with cancellation and memory budgets. Then review supplied initial usage
and richer exact capacity policies. Any UI, provider-capacity catalog or substitution
work remains a separate review decision. No billing/accounts/cloud changes are made.

The matching reduction here expands each request pool into identical slots and
weights events by avoided API spend. Its theoretical basis is the partial-transversal
matroid and maximum-weight independent-set greedy theorem in
[Michel Goemans's MIT matroid notes, Exercises 4–5 and Theorem 4.2](https://math.mit.edu/~goemans/18433S11/matroid-notes.pdf).
The application to these capacity pools is our reduction, supported by the exhaustive
oracle tests; this is not ordinary greedy matching of individual edges.
