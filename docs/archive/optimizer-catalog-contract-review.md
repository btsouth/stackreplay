> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# Optimizer / execution catalog contract review

Review date: 2026-09-27. Architecture only. Proposed contract for review, not an implemented schema or acceptance of provider facts.

## Verdict and reviewed state

**Do not connect the research representation directly to O2/O3A.** Keep the optimizer above replay. Introduce a small, versioned compilation boundary with explicit capability failures. The research has the right separation of evidence and executable rules, but it is not yet a complete execution contract. In particular, it leaves debit identity, pool accounting, activation scope, paid continuation, purchase boundaries and unknown-result classification underspecified.

O3A reviewed: `ba36f195cbec6910db56c96994e0dfbf651bb177`, the clean active `main` checkout at the start of this review. Its commit is titled “Harden optimizer Worker runtime and support initial capacity state.” `optimizer-o3a.md` still says uncommitted; that sentence is stale. O2 reviewed beneath it: `eb2233a525344d9cc277229cb8486ba36e779aef`. Foundation: `812a5a63f0982a36f34bf3eb0d166c410092344d`.

Research reviewed: `3e7bb1dfaced72925bdc1f8a18b7facdf5a5b7c7`, clean separate worktree `/home/bts/Projects/StackReplay-execution-market`, branch `research/execution-market-catalog`. All three documents were read: `docs/execution-market/catalog-architecture.md`, `market-census.md`, and `evidence-ledger.md`. Their claims remain research observations. No provider pages were fetched and no provider facts were promoted.

Implementation inspected:

- `packages/replay-engine/src/{optimizer.ts,optimizer-types.ts,exact-optimizer.ts,optimizer-assignment.ts,initial-capacity.ts,windows.ts,time.ts,units.ts,receipt.ts,api-replay.ts}`; the O2-to-O3A diff of exact optimization; `engine.ts` target validation, pricing preparation, constraint construction, atomic admission and initial-state integration.
- `packages/replay-engine/src/initial-capacity.test.ts`; exact optimizer policy, scope, budget and initial-state tests; assignment oracle test inventory.
- `apps/web/lib/optimizer-runtime.ts`, `apps/web/workers/optimizer.worker.ts`; optimizer and load-generation paths in `replay.worker.ts`, optimizer client and protocol paths; runtime/client/supersession test inventories.
- `packages/catalog/src/{schema.ts,versions.ts,load.ts}` and `docs/{optimizer-architecture.md,archive/optimizer-o2.md,archive/optimizer-o3a.md,CATALOG_INTELLIGENCE.md}`.

This is a source review with hand-worked adversarial fixtures, not a fresh test or performance run. Existing measurements and test counts are historical evidence from the O3A note, not reverified measurements.

## Findings that block real-plan integration

| Finding | Evidence in current implementation | Required decision |
| --- | --- | --- |
| Capacity units and charges are conflated | `engine.ts` maps `credit_pool` to `usd`; `overageCostOf` treats its excess as currency. `quantityOf` applies model multipliers to USD and tokens, but requests always cost one. | Separate typed capacity debits from cash charges. A provider credit is not the existing credit pool. |
| The research understates existing multi-limit support | `evaluateConstraints` evaluates all applicable hard rules before atomic admission; `limit.models` can already restrict a ceiling to a model subset. | Reuse this admission structure. Named pools clarify shared debit identity; they do not require replacing replay. |
| Provider identity is too coarse for paid routes | Exact optimizer IDs are `api:${providerId}`. API replay selects model API-list pricing and refuses `pricingVersionId`. | Versioned route IDs, exact entitlements and route-specific rate references must reach replay and receipts. Two endpoints sold by one provider cannot collapse. |
| The scalable solver does not cover most researched quotas | `fast` requires exactly one calendar request limit. Other policies enumerate assignments under 10,000 states by default, 100,000 maximum, and 2,000,000 event × leaf work. | Preserve exact matching and bounded exhaustive replay. Rich plan execution does not imply scalable optimal assignment. Budget exhaustion remains incomplete. |
| Unknowns can become false infeasibility or abort the whole request | Unsupported subscription rules throw during preparation. Missing quotes can leave `finish` with `infeasible`, even when the cause is unknown price or telemetry. | Preserve required records but distinguish unknown economics from proven impossibility; retain non-computable candidates without aborting independent API evaluation. |
| Purchase containment is only synthetic today | `prepare` bounds the interval by one UTC month from `period.start`; initial quota windows may predate it. | Bind each purchase to an explicit full cycle. Refuse an observation crossing its renewal boundary even if fewer than 31 days were imported. |
| Window activation is implicit | Windows are sliced per limit over its model-filtered offered events before admission. No shared activation group exists. | Make first-use activation scope explicit. A model ceiling sharing a plan reset cannot accidentally start on that model's first call. |
| Version intervals and historical mode disagree | Existing `versions.ts` uses inclusive date endpoints and latest-start precedence. Research proposes half-open intervals and event-time historical selection. Existing plan/API rules are pinned at `rulesAsOf`. | Versioned migration, no silent endpoint reinterpretation. Day one remains a single pinned rules scenario, not a historical invoice engine. |
| Explainability has a lifetime | Child retains one result, clears input, and serves detail pages. Termination destroys detail; aggregate summary is not the assignment witness. | Keep this design, specify run identity, detail expiry and exact-input rerun/export requirements. |

The research can **describe** all six families only if unknown/opaque facts are first-class and the missing semantics below are added. It cannot make them all computable. The present runtime cannot execute the entire proposal. Neither compiler nor optimizer may supply a provider-specific callback to fill these gaps.

## Contract to adopt

Use one `CompiledExecutionPlan` envelope. Compile accepted catalog data into a static artifact, then bind it locally to explicit scenario facts before optimization. Binding is a pure operation, not a network lookup. The compiler owns commercial interpretation; replay owns debit, admission and receipt evaluation; the optimizer owns purchase/assignment search.

The following is a semantic shape, not a schema patch. All IDs are stable within an immutable artifact. All numeric economics use canonical nonnegative decimal strings and the existing exact arithmetic. Runtime rejects unknown contract versions and operations.

```text
CompiledExecutionPlan
  contractVersion, artifactHash, catalogHash, compilerVersion
  planId, planVersionId, appliedOverlayIds
  rulesBinding: pinned rules instant, validity basis, supported scenario mode
  purchase: full USD fee, monthly or 28-day term, cycle-boundary requirement
  eligibility: finite named fact requirements and claim references
  computation:
    executable:
      routes[]: routeId, exact model IDs, access requirements,
                model -> debit-rule references, optional cash-rate reference
      meters[]: meterId, typed unit, bounded debit operation
      pools[]: poolId, meterId
      windows[]: windowId, calendar | first_use_anchored | fixed_partition
      constraints[]: constraintId, poolId, model subset, windowId,
                     amount, reject_request | latch_until_reset
      continuation: hard_stop | independent_api_fallback
    OR not_computable:
      reason codes, affected claim IDs, missing facts / unsupported capabilities
  provenance: field/operation -> immutable claim IDs and evidence classes

Bound scenario (separate from public catalog)
  artifact hashes, common period/scope, rules instant, user fact resolutions
  resourceInstanceId -> plan artifact, cycle [start,end), full fee
  concrete fixed partitions / shared activation groups
  initial capacity observations and explicit fresh/unknown assumptions
  permitted independent paid routes with exact entitlement and rate refs
  search limits, scenario hash, engine/methodology version
```

API-only supply uses the same route/rate vocabulary without a subscription purchase or capacity pools. A subscription can contain several disjoint model routes, but day one each model has one unambiguous included debit mapping: a bounded vector with one debit per applicable pool/meter. This preserves simultaneous request and token limits without converting their units. Multiple independently payable routes remain distinct. No provider identity drives execution.

An artifact may contain a known fee and citation summary while its computation is `not_computable`. Do not create a numeric `opaque` meter or an unlimited empty constraint list. Availability is resolved separately from computation: an executable rule can be unavailable to this user, and an available plan can be non-computable.

Day-one capability limits: six subscription resources, eight independent API routes, singleton/pair purchase enumeration, one cycle per purchased resource, observation at most 31 days, 16 pools and 32 constraints per plan, at most 64 explicit windows per constraint across the observation. These last three are proposed validation bounds, not measured performance guarantees. Excess is an explicit unsupported-capability result. Model IDs, rates and evidence are interned tables; do not duplicate them per event or candidate. No arbitrary expressions, executable predicates, route graphs or per-event compiler output.

### Units, debits and cash

Executable units are `request`, `token`, `usd_usage_value`, and `provider_credit(unitId)`. A credit unit ID names its issuer and definition/version, preventing unrelated credits from being added. USD usage value is a capacity denomination, not a cash balance or subscription price. `opaque` is descriptive catalog evidence and compiles to non-computable.

Bounded debit operations are:

1. A documented constant per request, including a model-specific decimal number of provider credits.
2. A sum of specified disjoint canonical token categories, with an explicit coefficient. Missing required categories remain unknown.
3. The existing category-rate dot product, with an explicit output unit and immutable route/rate reference, followed by a documented debit factor. Preserve supported input-size/time-of-day tier conditions and `billedAs` relationships. No fallback rate for an undocumented nonzero category.

The compiler must prove that required measurements exist in imported model calls. An opaque task charge, tool count or context-engine debit cannot be expressed as a token coefficient just because both are numbers. Actual observed charges on the original provider do not establish counterfactual charges on another route.

Four separate operations must never share an unqualified `multiplier`:

- `debitFactor = 0.5` halves units consumed by a qualifying call. A documented twofold allowance-drain boost may mean this, but the wording alone does not establish it.
- `allowanceFactor = 2` doubles a specified constraint amount, including the denominator used for starting-state validation.
- `cashRateFactor = 0.5` halves the specified paid rate; it does not change included consumption unless separately evidenced.
- Eligibility adds/removes exact model routes; it changes neither amounts nor rates.

Resolve overlays into explicit final values with derivation references. Specify factor order and rounding domain. Day one uses existing exact arithmetic without per-call rounding; plans requiring different debit rounding, minimum charges or ambiguous factor order are non-computable until that operation is supported. Weighted request credits use `provider_credit` or a documented request unit, and must never enter the unit-request matching path.

### Named pools and simultaneous constraints

A pool identifies one logical metered stream of accepted included usage. It is **not** an extra counter in addition to its constraints. A constraint is a bounded view of that stream for one model subset and one window instance. Its ceiling is tested against its own counter. There is no second unqualified `pool.amount` to decrement.

For each offered exact-model event:

1. Resolve its included debit vector, computing each distinct meter once. Resolve all applicable constraint windows and any latches.
2. Check that adding each pool's debit fits **every** applicable hard constraint, including constraints in other units.
3. On acceptance, record one debit per applicable pool and increment each applicable constraint counter once. On rejection, increment none of their accepted counters. Preserve attempted diagnostics and explicit latch transitions separately.
4. Cash receipts never sum simultaneous constraint counters. These are overlapping views of the same usage, not independent spending.

A model A ceiling of 20 against a shared monthly 70 allowance is two constraints on the same pool: all models <=70 and A <=20, using the same monthly window identity. An A debit of 3 advances both views by 3, with only one debit of 3 in the pool ledger. B advances only the shared view. A ceiling is not a dedicated allowance that can be spent in addition to 70.

Cursor-like independent pools use different pool IDs and separate meters/constraints. Their balances cannot be borrowed. If several models share Other Models, their debits enter that same pool. Unknown routing between two possible pools is not a runtime choice. Deterministically metering one call against both a request cap and a token cap is supported. Splitting a debit across interchangeable balances, allocating flexible credits, or selecting between balances needs separate allocation semantics and is outside O3B. Cross-subscription account/organization pool sharing is also outside O3B: two candidate resources must not independently spend the same entitlement. Detect that shared identity and refuse the pair rather than duplicate its capacity.

### Initial capacity state

**O3A's principle survives. Its identity and evidence types need extension.** The authoritative target of a consumed-units observation is:

```text
(resourceInstanceId, compiledArtifactHash, poolId,
 constraintId, windowInstanceId=[start,end)) at scenario.period.start
```

The resource instance distinguishes a user's account/seat entitlement from a catalog plan version. Day one still permits only one purchased instance of a stable plan in a candidate; no multi-account purchasing search. Pool identity checks units and debit basis, constraint identity identifies the measurement view, and window identity prevents reuse after reset. Plan ID or pool ID alone is insufficient.

Each observation carries consumed units, exact active boundaries, evidence reference, observation/as-of time, and optional explicit latch state. It represents accepted usage immediately before the scenario starts. A stale meter reading needs a complete, evidenced reconciliation to that instant; do not copy it forward. Latch state is independent of consumed amount. An absent latch is explicitly false only when that starting-state assumption is declared.

For a shared pool with 5-hour, weekly and monthly constraints, initial observations might be 2, 10 and 30 units. Seed those three counters independently. **Do not sum them to 42 and subtract 42 from every ceiling.** A model-specific monthly counter of 8 can coexist with the shared monthly counter of 30; do not add 8 again. Check subset consistency when unit, debit basis and intervals establish it, such as model-specific consumption <= shared consumption for the same interval. Do not invent missing model splits or relationships between independently phased windows.

Accept one canonical observation per counter/window; deduplicate identical references and reject conflicts. Reusing one evidence ID for multiple observed counters does not mean adding it multiple times. A pool balance can seed a constraint only if it has a unique, evidenced mapping to that counter and denominator. One percentage cannot seed different windows or pools.

Missing state is `unknown` by default in the new binding. An explicit fresh-all-counters assumption preserves O3A's `fresh` and `unlistedPools: fresh` scenarios and appears in the result. It must also state whether a first-use window is inactive or has a known active anchor with zero consumption. Zero usage alone does not prove inactivity. Observations do not migrate between plan versions merely because IDs look similar.

Initial consumption never creates historical calls, contributes to workload counts, or enters monetary receipts. It expires exactly at its own window end. The full subscription fee still applies once. Purchased wallet balances are a different asset/accounting domain, not negative initial consumption; their support is deferred.

### Window and purchase semantics

Rename `rolling` to **`first_use_anchored` before locking this contract**. Preserve the old spelling only in a versioned legacy adapter. A true trailing quota must never be accepted through that adapter.

Three executable window forms suffice for O3B:

| Form | Meaning and binding | Required use |
| --- | --- | --- |
| `calendar` | Day/week/month in a supplied IANA timezone; explicit reset time/week start when different from legacy midnight/Monday. Lower nonlegacy calendar boundaries to fixed partitions. Preserve DST and nanoseconds. | Existing quotas; known calendar plans. |
| `first_use_anchored` | Exact elapsed duration, activation group, and activation trigger `first_eligible_offer`. An inactive window opens on the first event offered to its included route; after expiry it waits for the next such event. | Existing first-use semantics, evidenced GOAT-like sessions. |
| `fixed_partition` | Bounded, ordered, nonoverlapping half-open intervals, with complete coverage where the constraint applies and no carry. Generated from an evidenced schedule plus supplied anchor. | Account-assigned resets, billing cycles, 28-day cycles and their seven-day slices. |

The first-use activation group names the finite model/route scope that opens the window. Constraints sharing a reset reference the same window group even if one measures only a model subset. Legacy limits map to separate model-filtered groups, matching current behavior. The trigger is an offer to the included route, not every event in the original workload, and not silently “first successful debit.” Admission rejection can therefore open a window in an explicitly offered replay. The current exact optimizer verifies fully admitted assigned subsets, so rejected offers are not manufactured to manipulate anchors. Providers requiring external account activity, accepted-use activation, or another trigger remain non-computable unless their already-active boundaries are supplied and cover the full scenario.

Assignment-dependent first-use windows must be recomputed by replay for each assigned subset. Never build them once from the unassigned workload. Shared first-use activation is a small replay extension, not a static matching reduction.

Calendar, account, billing and workload starts are independent. The local binder materializes fixed partitions using the versioned schedule and user facts; replay validates them. A four-week cycle is exactly 28 elapsed days only when the source says so. Four seven-day slices are consecutive intervals within that parent, each with its own allowance, no carry. Do not use four calendar weeks, a calendar month, or four independently first-use-anchored weeks. Record the parent cycle identity in slice provenance. If both parent and slice caps apply, enforce both counters on the same debit stream. No general recursive window language is needed.

For each purchased resource require the common observation period to be contained in one explicit paid cycle, charging its complete fee even if the import occupies one hour. Permit monthly and 28-day terms; keep the 31-day observation maximum. A September 12 to October 12 import crosses a September 1 to October 1 account billing cycle and is unsupported, even though O3A's synthetic period-start purchase test permits that duration. A quota reset inside one paid cycle is allowed when those clocks are documented as independent. Annual purchases, renewal simulation, mid-cycle price/rule changes and multiple purchases remain unsupported.

True trailing windows have a different state model: at time t they sum accepted debits in the documented lookback interval, for example `(t-D,t]`, with individual expiration times and deterministic same-instant event order. Their initial state needs timestamped prior debit contributions, not one consumed total and an invented reset. O3B does **not** execute them. Store the documented interval convention in catalog evidence and emit `not_computable(unsupported_trailing_window)`. An unknown account anchor is also non-computable, never inferred from the first imported call.

### Entitlements, availability and validity

Expand catalog selectors into finite exact canonical model/route sets. A family/group is a compiler convenience, not substitution. `price_at_or_below` requires a pinned endpoint, currency, category/rate basis, threshold comparison and rate version. If “below price X” does not specify which rate, do not choose input price or an average. Missing/ambiguous rate evidence creates an unresolved entitlement, not an excluded model presumed ineligible. Include explicit named models and exclusions according to reviewed precedence, retain the resolution trace, and hash the resulting set.

The runtime neither fetches current prices nor discovers newly launched models. Changing lineup, rates or eligibility means a new immutable artifact. Snapshot validity must cover the chosen pinned rules scenario; it does not prove historical availability at every workload timestamp.

Availability answers whether this user can use/buy/renew the entitlement: region, cohort, monthly/annual term, existing/new purchase state, organization restrictions, client/protocol compatibility, and opt-ins are separate finite requirements. Resolve each to true/false/unknown from evidence or explicit user facts. A documented new-purchase pause does not invalidate an existing subscriber's plan version. A known false requirement is `unavailable`; a missing fact is `not_computable(eligibility_unknown)`, with the unresolved requirement exposed. No missing fact defaults to true.

Validity answers which immutable economic rules apply and on what authority. Keep provider effective time, observation time, review time and catalog activation time distinct. A reviewed current-only activation may be used in a labeled current-market scenario; it cannot fill a historical gap. Day one executes one pinned rule version and resolved overlay set over the imported chronology, matching O2's counterfactual model. Event-time historical plan transitions remain unsupported. Existing conditional time-of-day pricing remains tied to the original event timestamps; do not shift events to a convenient month without an explicit future contract.

### Overflow and paid continuation

Keep all six commercial distinctions in catalog records, but implement only hard stop and independent API fallback in O3B:

| Commercial behavior | Compilation and execution decision |
| --- | --- |
| Hard stop | Included route rejects the entire call if any hard constraint blocks it. No usage charge is invented. |
| API fallback | Independently eligible exact-model route with its own immutable price, access facts and evidence. Optimizer may reserve quota and assign calls directly to it in hindsight. It is not proof that a provider automatically routed the call. |
| Automatic PAYG | Lower to an independent paid route only with evidence that direct paid assignment is permitted and no shared caps, fixed access fee, purchase dependency or mandatory exhaustion order affects it. Otherwise non-computable in O3B. |
| Purchased balance | Represent balance denomination, purchase price, lot/expiry and continuation conditions in catalog research/accepted descriptive data. Enabled use is non-computable in O3B. No free wallet, assumed dollar conversion or duplicate overage charge. |
| Manual upgrade | No automatic transition or purchase during replay. A separately available tier can be one of the bounded initial purchase candidates. |
| Unknown | Non-computable if required by the scenario. Optional continuation explicitly disabled can yield a computable hard-stop scenario. |

All supported events are assigned atomically to one execution route. Splitting an over-limit call between allowance and a wallet is unsupported. Do not implement paid continuation with `allow_overage` on each simultaneous constraint: one call crossing three views would otherwise risk being billed three times. Existing `allow_overage` behavior remains outside exact optimization.

A complete hard-stop configuration may be evaluated when optional wallet/PAYG is disabled, with that restriction visible. This does not license a cheapest-market claim over omitted paid-continuation configurations. Keep those omissions in the family completeness record. Mandatory continuation cannot be disabled to make a plan fit the contract.

A fee-bearing or capacity-limited API route invalidates O2's pooled-cheapest-API reduction. Such routes are non-computable in O3B. Included and paid routes do not share entitlements by default, even if their provider names match.

### Promotions and provenance

Promotions are immutable overlays with eligibility, start/end, target fields, documented stacking order and claim evidence. Resolve applicable overlays once into the compiled artifact, retaining the base version and overlay derivation. Supported modifications are fixed fee, explicit constraint amount, debit factor, cash rate and finite entitlement set, only when the resulting rules fit this contract for the whole scenario. Unknown redemption, undated offers, banked resets, activation choices or a mid-scenario transition are non-computable. An expired offer must not remain in the base allowance. Normal annual pricing is a billing option, not an overlay, and annual execution remains deferred.

Runtime provenance is a small immutable reference table: field/operation IDs to claim IDs, authority/certainty class, version/hash and evidence-package reference. The explanation resolver can present claim-specific source URL/locator, verified and observed dates, effective-date basis and capture/claim hashes from the pinned evidence package. Do not ship page bodies, parser state, reviewer workflow, monitoring status machines or marketing prose into the solver. No raw captures per event.

User starting observations, fresh assumptions and calibration evidence form a **local scenario provenance domain** with separate IDs and hashes. They do not modify catalog truth or inherit its verification status. O3A's free-text evidence is preserved through legacy migration but cannot be upgraded to published evidence. Calibration may define a separately labeled modeled scenario; it does not make an opaque plan deterministic or eligible for an unqualified real-plan winner.

Verified and computable are independent axes. A verified statement “20x Pro capacity” can support a known subscription price and a non-computable capacity result. Likewise a verified 1,000-credit allowance is insufficient when each task's credit debit is unknown.

## Result, search and explanation requirements

Use explicit candidate outcomes:

- `feasible`: every required recognized event has a supported exact route, known debit/charge, valid capacity state and verified replay assignment under the declared assumptions.
- `infeasible`: supported, fully known rules prove there is no valid allocation, such as a known unsupported exact model with no fallback or known capacity exhaustion without continuation.
- `unavailable`: known account/purchase/access restriction excludes this configuration.
- `not_computable`: missing evidence/telemetry/starting state/anchor/rate/eligibility, opaque debit/capacity, unsupported mechanic or unsupported purchase scope prevents the calculation.
- `not_evaluated`: executable rules but exact assignment exceeds the state/work budget. Cancellation, timeout and runtime failure remain separate run outcomes, not feasibility findings.

Missing API prices must still never drop required records. O2 currently groups failure to serve **and price** all records into infeasible; refine the reason/status when an otherwise possible route lacks a quote. A priced subscription can still serve that record. Only unresolved model identities are global scope exclusions. Aggregate demand can retain flat chronology-independent API pricing; O3B continues refusing subscription capacity claims from aggregate/unknown chronology, even if an isolated arithmetic subtotal is available.

Preserve matching for the exact existing unit-request/calendar subset. Do not broaden it merely because a compiler calls a value allowance a “pool.” Multi-window constraints, model ceilings, fractional/variable debits and assignment-dependent anchors use bounded exhaustive replay. At 100k calls with one value subscription plus API, even two choices per call is outside that budget; return `not_evaluated`, not greedy optimality. A large single-choice assignment can still be replayed when within the work bound.

Preserve deterministic decimal comparison and current tie order: total cost, variable cost, subscription count, API record count, canonical candidate ID. Canonical route and rule IDs also break assignment ties. Known fixed fees provide lower bounds only when they are evidenced and all omitted incremental costs are nonnegative. Unknown fees have no useful positive lower bound. An omitted candidate can be ruled out only by a valid strict lower bound exceeding the best total, retaining the existing O2 certification exception. Report `familyComplete` separately from any certified winner. Never call singleton/pair optimization a global market optimum, even if every enumerated candidate completes.

Each result pins workload/scope digest, artifact/rules/scenario hashes, engine and compiler versions, initial state, fee/cycle basis, eligibility resolutions, search bounds and omitted candidates. Preserve independent replay verification of the selected assignment. The verification bundle needs fixed-charge lines, cash route receipts, typed debit receipts and per-constraint/window capacity witnesses: initial use, newly accepted use, ceiling, reset, latch and blocker IDs. Count a pool debit once and distinguish it from its multiple constraint views. Do not present included usage value as money paid.

The current summary/detail split is acceptable. Detail is valid only for its completed run generation while the child remains alive. New run, cancellation, scope/import replacement, clear, navigation cleanup or teardown invalidates it. Summary facts can remain visible as a dated result, but detail must say expired rather than silently return another run. The child currently releases input after completion and cannot itself reconstruct a nonwinner. `explainExactCandidate` is an engine helper, not an existing browser command for arbitrary candidate explanations. Such a request requires a new bounded run using the owner's workload plus the **same** artifact and scenario; do not retain 43 assignment sets.

Independent verification after child teardown requires a locally retained/exported assignment witness or reproducible original input and pinned artifacts. Summary alone proves arithmetic totals, not chronological admission. Future export can stream existing pages; no persistence or Worker redesign is authorized here. Do not keep a child alive indefinitely as the only durable audit record.

## Adversarial mechanic mapping

The numeric fixtures below are synthetic. Research amounts, missing dates and unresolved sources are not accepted provider plans. “Executable” here means proposed O3B replay support; exact optimization still depends on the bounded solver.

| Family / mechanic | Catalog representation | Compiled representation | Runtime behavior | Computability | Evidence required |
| --- | --- | --- | --- | --- | --- |
| Claude: fixed fee, relative/opaque capacity | Price claim plus relative/dynamic constraint claims | Known fee; `not_computable(opaque_capacity)` | Keep candidate visible, no numeric admission/winner | Non-computable | Relative wording and price independently; no inferred token denominator |
| Claude: account weekly reset | Account schedule with unknown/known anchor | Bound fixed partitions only when fully known | No anchor inference from import | Unknown anchor: non-computable | Account observation, schedule and reset convention |
| GOAT: 5h + week + month | One included stream, three hard constraints | One meter/pool, three windows/counters | Atomic admission; debit once | Executable, usually bounded exhaustive | Debit rates, sharing, all ceilings and independent reset anchors |
| GOAT: per-model monthly ceiling | Subset constraint against same shared stream | Same pool/window, finite model subset | Check shared and subset caps together | Executable | Whether ceiling is shared view or separate entitlement |
| GOAT: first-use + changing lineup | Activation scope and versioned finite set | Shared first-use groups; frozen model IDs | Recompute anchors per assigned subset | Executable only with resolved activation/lineup | First-use trigger/scope and exact route identities |
| GOAT: top-up outside rolling caps | Separate paid balance and route | Unsupported continuation descriptor | Do not decrement included constraints or invent free credit | Enabled balance: non-computable | Purchase denomination, prices, carry/expiry and bypass rules |
| Token Harbor: 28 days / four slices | Parent cycle, four equal non-carrying slices | Bound 28-day purchase and four fixed partitions | No slice carry; no renewal in one purchase | Executable | Actual fee/amounts, anchor, slice definition; research lacks amounts |
| Token Harbor: price band + boost | Pinned selector and explicit debit modification | Finite route set and numeric debit factor | No current-price lookup; no eligibility guesses | Executable after resolved inputs | Exact band rate basis/threshold, model list and boost table |
| Token Harbor: wallet | Optional purchased balance | Disabled hard-stop variant or unsupported balance | Never equate pass value with wallet money | Enabled wallet: non-computable | Wallet rate, opt-in and balance semantics |
| Cursor: independent/shared named pools | Pool identity and model mapping | Independent counters with disjoint mappings | Exhaustion of one cannot spend the other | Executable with known amounts | Current two-pool amounts and route rates; ledger has a gap |
| Copilot: credits + flexible portion | Typed base/flex claims and cohorts | Known credit meter; unresolved flex blocks full plan | No variable portion flattened into a guarantee | Full dynamic plan: non-computable | Credit unit, model debit metadata, actual allocation and cohort |
| Copilot: legacy request cohort | Separate immutable rule/cohort | Exact request route only for eligible cohort | Existing matching only for unit debit/calendar case | Executable if all rules fit | Cohort proof and per-model request multiplier definition |
| Ollama: value allowance + concurrency | Deterministic meter plus independent concurrency constraint | Numeric pool; unsupported concurrency requirement | Do not infer overlap from start timestamps | Full capacity: non-computable without supported overlap model | Rates, cycle, request lifetimes/overlap and concurrency semantics |
| Kiro: credits, multipliers, add-ons | Provider work units and expiring purchased lots | Unknown task-debit / unsupported balance reasons | No token-to-work-credit conversion | Non-computable on model-call-only logs | Deterministic work debit or missing service measurements; lot rules |
| Additional context/compute services | Meter requirements outside model-call telemetry | `not_computable(unmeasured_services)` | Never price only LLMs and declare full feasible execution | Non-computable | Complete service measurement and provider billing basis |
| True trailing quota, any family | Explicit lookback semantics | Unsupported trailing capability | No first-use approximation | Non-computable | Lookback boundaries and timestamped prior debit state |

## Six concrete adversarial fixtures

These are hand-worked contract acceptance vectors for subsequent tests. Outcomes are architectural predictions, not executed test results.

### F1: Claude-like opaque allowance

Fee $100, verified “5x” capacity, exact entitlement to model A, two recognized A calls, independently priced API total $12. Subscription capacity is non-computable, not zero/unlimited/infeasible. API-only is feasible at $12. If the $100 fee is fully evidenced and no discount/refund can reduce it, the strict fixed-cost lower bound can certify API as cheaper within this declared family without pretending the subscription was evaluated. If its fee becomes unknown, report best-known API with incomplete comparison. A calibration remains a separately labeled scenario.

### F2: GOAT-like overlapping constraints and initial state

One usage-value pool: 5h cap 14, weekly 35, monthly 70, A monthly cap 20. Initial accepted counters are respectively 10, 25, 50 and 19; the weekly/monthly clocks and A/shared monthly clock are explicit. A call debits 2: shared views would fit, but 19+2>20 rejects it atomically. No accepted counter changes. B then debits 4 and is accepted: 14,29,54,19. Unique new pool debit is 4, not 12. Historical use contributes zero cash charge.

At the 5h end, only that window resets. Its next eligible offered event opens a new 5h window; weekly/monthly use persists. Independent API fallback can serve A only if its exact model entitlement and price are known. Enabled purchased top-up remains non-computable. Small assignment is exhaustive; 100k branching assignment is not-evaluated. A variant where A first appears later must still share the plan's monthly anchor, not restart its own month.

### F3: Token-Harbor-like slices and price band

Synthetic 28-day fee $20, total allowance 40, four seven-day slices of 10 with no carry. A named model is eligible; B qualifies through a pinned band; C has no documented band price. A documented debit factor 0.5 turns A's base value 12 into debit 6. One A call in slice 1 consumes 6. Two A calls in slice 2 need 12 and cannot both fit; the unused 4 from slice 1 cannot rescue them. At the exact slice boundary the next slice starts fresh.

C remains required and its plan entitlement is unknown. No complete exact-plan conclusion for a workload requiring C unless another known route serves it and the relevant restricted configuration is explicitly evaluated. Do not silently turn C into a cheap omission. A 29-day workload exceeds this one purchased cycle. Wallet-enabled mode is non-computable; wallet-disabled small fixture is executable. The actual research plan remains non-computable until its missing fee, thresholds and allowances are evidenced.

### F4: Cursor-like independent pools

Cursor Models pool cap 10 with initial 8; Other Models pool cap 20 with initial 0. X maps only to Cursor Models, Y only to Other Models. X debit 3 is rejected despite 20 free units in Other Models. Y debit 5 succeeds, leaving counters 8 and 5. Three more X calls cannot use Other Models. Model-specific ceilings within Other Models would be additional views, not new balances. Unknown current pool amounts in the ledger block the real plan; the synthetic fully specified fixture is executable via bounded exhaustive replay.

### F5: Copilot-like credits, flex and cohorts

Synthetic base 100 provider credits, variable flex grant, model A debit 2 credits/request, initial base use 20. Forty A calls consume exactly the 80 known remaining base credits. This is a feasible base-only witness, not proof of a full-plan optimum. A forty-first call may fit unknown flex; full-plan capacity/cost stays non-computable. A $0.01-per-credit claim alone does not establish A's token-based debit. Supply an evidenced fixed flex allocation and deterministic allocation order before expanding support; O3B does not optimize base/flex balance choices.

A user of unknown cohort cannot be assigned the legacy request rules. A verified legacy unit-request/calendar cohort can use the existing matching class; fractional/model-weighted debits cannot. Unknown cohort is eligibility-unknown, not true.

### F6: Ollama/Kiro-like deterministic allowance with hidden requirements

Synthetic value allowance 60, initial 50, two calls with documented value debit 6 each. A quota-only small replay admits at most one call; independent paid API can serve the other with its own rate. Add a required concurrency ceiling of three but provide only call start times: full execution feasibility is non-computable, since durations/overlap are absent. Do not count identical timestamps as the complete concurrency model or assume sequential execution.

Replace value debit with a Kiro-like variable task-credit meter. Even a verified 1,000-credit cap and a named model multiplier cannot price either call without base task debit; non-computable. Add expiring top-up credits: still unsupported, never free initial capacity. A context/compute-service variant consuming the same allowance is likewise non-computable from model calls alone. The deterministic numeric subcase is executable; the full family must retain these failures.

## O3B implementation boundary

Implement only the runtime side of this contract:

1. Versioned executable/non-computable plan input and scenario validation; route identity and explicit rate binding; candidate outcome reasons that distinguish missing information, unavailable access, unsupported capabilities and exhausted exact search.
2. Typed debit meters and receipts, named pools with atomic simultaneous constraint views, explicit model ceilings, and initial state keyed to resource/constraint/window with local provenance. Reuse token accounting, decimal arithmetic and admission code.
3. Rename first-use terminology through a legacy adapter; add shared activation identities and bounded fixed partitions; enforce explicit one-cycle monthly/28-day purchase containment. No true trailing evaluation.
4. Preserve the current matching eligibility exactly and use bounded exhaustive replay for all richer policies. Preserve same-scope comparison, exact models, fixed-cost lower-bound certification and no global market claim. No new general solver.
5. Keep child ownership, batch transfer, generation protection, AbortSignal, cancellation, timeout and detail pagination. Add necessary artifact/run identity to explanations, not extra retained candidate assignments.
6. Turn the six vectors into compiler/runtime contract tests with independent expected arithmetic, plus legacy matching/oracle, boundary, receipt and cancellation regression checks. Test malformed units, shared anchors, duplicate initial state and unpriced required records. Performance checks should target added rule multiplicity and route/receipt size; do not reopen a general profiling phase.

This boundary intentionally does not promise a 100k-event optimum for GOAT-like or other value-quota plans. If that becomes a product requirement, it needs a separate reviewed solver phase. Do not conceal that limitation by choosing a heuristic or shrinking workload scope.

## Catalog/compiler implementation boundary

Implement the accepted source extension in the existing catalog pipeline, with claim evidence and deterministic compilation. Resolve exact route/model IDs, typed unit/debit definitions, pool sharing, constraints, known schedules, full fee/term, eligibility requirements, static overlays and entitlement selectors. Emit content hashes, capability reasons and a compact field-to-claim provenance map. Validate fixture truth tables and preserve earlier artifacts.

Do not put Provider/Product/Harness/Source/Evidence objects into the runtime merely because they are useful for authoring. Product/harness taxonomy and compatibility can be catalog metadata and resolved access requirements; they need not become new execution engines or separate file hierarchies. Keep family/group/price-band selectors, promotion stacking, review workflow and source health entirely outside optimization. Remove arbitrary recursive windows, expression evaluation, generic overflow graphs, runtime freshness decisions, public snapshot APIs/signatures, monitoring adapters and dashboards from the first stable execution contract. A content hash plus retained artifact is sufficient for this phase; those broader systems can be developed separately.

Do not populate actual plan records during contract implementation merely to exercise types. The ledger has explicit gaps: Token Harbor amounts, Cursor pool amounts, OpenCode source conflict, Kiro task debit, account anchors and effective dates. These are reasons to emit non-computable data, not invitations to infer values. In particular, a provider's published plan can be listed descriptively without entering the computable candidate set.

## Migration and residual risks

- Legacy `credit_pool` maps only to USD usage value with its original pricing basis; never relabel it as arbitrary provider credits. Legacy per-limit counters remain independent views unless evidence establishes shared pool identity.
- Legacy `rolling` maps only to first-use anchored windows with the original model-filtered offer activation. New shared activation must be explicit. Do not rewrite old snapshots or replay results.
- Legacy per-model multiplier behavior must be preserved: current request limits ignore it. A new weighted request/credit debit is a distinct contract feature, not a silent correction to old receipts.
- Existing synthetic month-from-import purchase scenarios remain reproducible under their legacy methodology. Real plans use explicit cycle containment and a new methodology version. Do not reinterpret old initial usage as evidence that a newly purchased account begins partly consumed.
- Preserve legacy inclusive date selection in the legacy reader. For new half-open intervals, convert date-inclusive ends to the next day only under documented date/timezone semantics and resolve overlap precedence explicitly. Reject ambiguous migration. Do not change prior hashes or invent intraday effective times.
- Source review may still establish a fee but fail to establish full capability. Concurrency, external account usage during the period, services missing from workload, flexible grants and rate rounding are material unknowns. Initial consumption covers only pre-period use, not future external account traffic. Results must state the no-unobserved-concurrent-usage scenario assumption.
- The existing result scope ID is a constant label, not a content identity. Add a digest over the actual recognized ordered population, exclusions, chronology and period for durable comparison/verification; never compare two results solely by that label.
- Rich constraints increase replay work roughly with events × applicable constraints per leaf. The current exhaustive search work bound counts event × leaves, not all rule operations or explanation insertion replays. O3B must include constraint/debit multiplicity and explanation work in its budget, or stop with not-evaluated. Do not wait for the 60-second watchdog as a normal search limit.
- Pools/window diagnostics and receipt lines cross the page boundary today. They are not automatically small merely because assignments are paginated. Bound fixed partitions and intern rate/evidence tables; do not expand each claim or debit into per-event summary data. Keep detail payloads bounded in bytes as well as record count when adding witnesses.
- O3A's 100k/43 median ~2.30 s, ~227 MiB sampled child peak, ~13.7 MiB retained child and ~22.1 MiB owner characterize its measured fixture. They are not measurements of simultaneous value constraints, many rate versions, concurrency or paid-balance search. The ~701 MiB summed Chromium RSS is not comparable to Node RSS. Preserve those distinctions.
- The child lifetime is acceptable for interactive inspection, but evidence export and exact nonwinner reruns need pinned inputs. Missing original unsaved workload or artifact means detail cannot be reconstructed; say so. Worker termination remains the correct cancellation mechanism.

Acceptance of this review should lock the semantic boundary, not the research's provider roster. Runtime work should implement only this executable subset and truthful failure states. Catalog work should compile only established mechanics into that subset, with no provider-specific escape hatches.
