> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# O3B.1: bound partitions and timezone-correct purchase cycles

This repairs the O3B compiler/runtime boundary; it does not expand the candidate family, capacity mechanics, continuation modes or provider catalog. The architecture-review history remains unchanged.

## Canonical shapes

The neutral schema remains `packages/schema/src/compiled-execution.ts`. New artifacts use `CompiledExecutionPlanV2` (`contractVersion: 2`), new scenarios `BoundExecutionScenarioV2` (`version: 2`), optimizer inputs `contract: "compiled-v2"`, and results `methodology: "compiled-offline-v2"`. Mixed versions in a run are rejected. Calendar and first-use definitions are unchanged.

A version-2 compiled fixed-partition definition is:

```ts
{
  id: string;
  kind: "fixed_partition";
  durationMs: number;           // positive safe integer, elapsed time
  count: number;                // 1..64
  parent: "purchase_cycle";
  coverage: "purchase_cycle" | "observation";
  carry: "none";
  anchorRequirementId: string;
  claimRefs: string[];
}
```

`coverage: "purchase_cycle"` requires exact parent coverage. `observation` allows the bounded schedule to cover the observation period inside the parent; it still cannot cross the parent boundary. Neither mode derives an anchor from observation dates. There are at most 32 window definitions per artifact. Calendar/timezone-specific irregular slices are not approximated by elapsed durations.

The version-2 resource binding retains its existing `id`, `artifactHash`, explicit `cycle: {id,start,end}`, eligibility facts and first-use state, and adds:

```ts
{
  billingTimezone?: string; // required for monthly subscriptions, explicit IANA name
  windowAnchors: Record<string, string>; // requirement ID -> canonical UTC instant
  windowInstances: Array<{
    windowDefinitionId: string;
    windowInstanceId: string;
    start: string;
    end: string;
  }>; // at most 32 * 64
}
```

Resource and artifact identity are inherited from the containing binding, not repeated in each window. Constraints retain `windowId` references to definitions. Definitions are never copied into instances. Runtime explanation summaries retain the pinned bound scenario after child teardown, alongside independently verifiable receipts. Detail pagination and child cancellation/lifecycle are unchanged.

## Binding and replay

`bindExecutionScenario(artifacts, draft)` validates version-2 shapes, validates each paid cycle, materializes partitions and hashes the resulting scenario. `materializeFixedPartitions` accepts an artifact and one local binding, **no workload/events argument**. It reads each explicit named anchor and emits `count` contiguous `[start,end)` slices of `durationMs`. Every slice must fit the explicit purchase cycle. Missing facts throw at the binder boundary; directly supplied incomplete/invalid bound state produces structured non-computable runtime reasons rather than a fabricated allowance.

Instance identity is SHA-256 of canonical JSON `[resourceInstanceId, artifactHash, cycle.id, definition.id, start, end]`. Version-2 replay checks supplied instances against that deterministic materialization once per resource readiness check, then resolves concrete bounds from the scenario. Its existing active-window cache avoids per-event materialization. Ordered half-open boundaries reset counters exactly once; unused capacity does not carry.

Initial observations retain the O3B identity:

`resourceInstanceId + artifactHash + poolId + constraintId + window.id/start/end`

For fixed partitions, `window.id` must equal the concrete `windowInstanceId`. The reading remains as of scope start, may refer to an earlier-started window and retains its separate local provenance. Old-window, other-resource and abstract-definition IDs cannot seed a new window. No implicit migration or fake historical calls/charges are introduced. Missing starting state remains unknown unless explicitly assumed fresh.

## Purchase calendar policy

Version 2 has one monthly policy, defined by the contract version: convert the explicit cycle start instant into the supplied IANA billing timezone, preserve its local wall-clock fields, add one calendar month with Temporal `overflow: "constrain"`, then resolve the target local time in that timezone. The explicit cycle end must equal the resulting instant. January 31 becomes February 28 (29 in a leap year). This is single-cycle validation, not an extrapolation of a recurring month-end anchor across several purchases.

For New York, March 1, 2027 00:00 local → April 1 00:00 local is `05:00Z → 04:00Z`; November 1 → December 1 is `04:00Z → 05:00Z`. October 15 → November 15 is a valid local month lasting 31 elapsed days plus one hour. The demand guard allows that only through containment in one explicitly validated monthly cycle, not a duration tolerance. Legacy callers retain their 31-day limit.

The shared `purchaseCycleEnd` helper uses the repository's Temporal implementation. Numeric-offset timezone strings are refused; invalid or missing IANA names are not silently UTC. A nonexistent or ambiguous target wall clock is refused (`disambiguation: "reject"`); a future alternative policy needs an explicit versioned decision. `UTC` is permitted when explicitly supplied. Internally all boundaries remain canonical instants. Calendar quota windows retain their existing timezone/reset conventions, independent of purchase cycles.

A `28_days` purchase is exactly `28 * 24` elapsed hours, even across DST. Four seven-day slices use exactly seven elapsed days each and may shift local clock time after DST. Annual/multi-cycle purchasing, trailing windows and arbitrary schedules remain unsupported. Workload start supplies none of the account/purchase/reset facts.

## Hashes and compatibility

Artifacts contain schedule semantics and catalog validity instants, not account-specific reset timestamps. Binding does not mutate or rehash artifacts. Same artifact plus different accounts/anchors yields the same artifact hash and different scenario hashes.

`hashBoundExecutionScenario` hashes schema-parsed version-2 facts (excluding only `scenarioHash`) using SHA-256 and the existing catalog `stableStringify` convention. Cycle IDs/endpoints, billing timezone, anchors, materialized windows, initial observations/provenance, eligibility and all other scenario fields participate. Array order remains part of the content; callers use the binder's deterministic order. Optimizer entry rejects a stale hash. If source metadata forces conservative aggregate chronology, the copied effective scenario is rehashed and returned; the caller's original scenario is not mutated. This is reproducibility, not evidence authentication.

Version-1 artifact and scenario schemas, fixed intervals, UTC month arithmetic, hashes and `compiled-offline-v1` results remain executable unchanged. Legacy fixtures remain version 1. No stored artifact is rewritten or silently upgraded. New C1 compilation must target version 2; upgrading an old fixture requires an explicitly new artifact and binding, with observations reconciled against new instance identities.

## Validation

The new engine tests cover immutable artifacts across accounts, deterministic/scenario-sensitive hashes, four-slice coverage and no carry, half-open boundaries, concrete observation identity and reset/account rejection, malformed bindings, unchanged calendar/first-use outcomes, legacy parsing, version isolation, aggregate normalization, cycle containment, New York spring/fall DST, 31-day-plus-hour months, month-end/leap rollover, invalid timezones/ends and ambiguous/nonexistent local times. A real browser child test checks version-2 bound identity and receipts after teardown on desktop/mobile.

The focused 100k-offer regression retains exactly four bound instances with the same array identity; materialization accepts no events and cannot allocate one partition per event. This is a bounded-structure check, not a new browser memory claim or a reopening of O3B profiling.

Unit validation: **1,289 passing** (schema 71, catalog 112, adapters 239, replay engine 443, CLI 36, share 67, UI 16, web 305). This adds 24 engine regression cases without modifying old correctness assertions. The O3B six adversarial families, O2 matching/exact-model invariants and O3A cancellation/lifecycle tests remain green. Repository typecheck, production web/dependency build, changed-file Biome checks and `git diff --check` pass.

The complete isolated browser suite passed **382 tests with 48 existing skips** (430 cases), including desktop/mobile version-2 teardown summaries and existing stale-generation cancellation/detail pagination. No browser profiling matrix was rerun.

An initial parallel unit invocation encountered missing Vitest temporary transform files; the complete serial invocation (`pnpm test --concurrency=1`) passed. No assertions were weakened. The focused Node check, using 100 warmups and 1,000 four-slice materializations, measured median **0.192 ms**, p95 **0.468 ms**, maximum **2.214 ms**. This timing includes schema validation and instance hashing, and is not presented as a browser memory benchmark.

## C1 obligations

Compile only immutable accepted schedule/price/entitlement semantics into version 2. Obtain actual account anchors, purchase-cycle IDs/endpoints and billing timezone locally, then call the binder; reconcile starting observations against concrete returned instance IDs. Preserve claim references separately from user observations and authenticate artifact/evidence content outside runtime. No new blocker is introduced for the supported deterministic fixed-partition and monthly/28-day terms. Unsupported irregular/ambiguous reset policies still require a future reviewed contract, not compiler guesses.

## Repair file inventory

- `apps/web/e2e/compiled-optimizer.spec.ts`
- `docs/optimizer-architecture.md`
- `docs/archive/optimizer-o3b.md`
- `docs/archive/optimizer-o3b1.md`
- `packages/replay-engine/package.json`
- `packages/replay-engine/src/compiled-capacity.ts`
- `packages/replay-engine/src/compiled-optimizer.ts`
- `packages/replay-engine/src/execution-binding.ts`
- `packages/replay-engine/src/execution-binding.test.ts`
- `packages/replay-engine/src/fixtures/bound-execution.ts`
- `packages/replay-engine/src/fixtures/compiled-execution.ts` (version-1 type annotations only)
- `packages/replay-engine/src/index.ts`
- `packages/replay-engine/src/optimizer.ts`
- `packages/schema/src/compiled-execution.ts`
- `pnpm-lock.yaml`
