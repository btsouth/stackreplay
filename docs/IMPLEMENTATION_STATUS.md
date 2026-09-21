# StackReplay Implementation Status

## Current milestone

**Milestone 1 — Schema + Catalog + Replay Engine: complete.**

Milestone 0 (foundation) is complete and was independently audited. Milestone 2 has not been started.

## What Milestone 1 delivers

The canonical flow from the specification is now real end to end for subscription targets:

```
usage events (JSON)  →  replay engine  →  ExecutionReplayResultV1
```

### `@stackreplay/schema` — versioned schemas

- `UsageEventV1`: the canonical normalized event. `modality` is a discriminated union that currently has one member (`text`); future image, video, audio and multimodal variants extend the union without redefining the event's identity. Technical modality and workload/use-case category are separate fields. Token usage is strongly typed (`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`), every category optional so missing data stays visible. Plan/billing attribution is deliberately absent (decision 5).
- `ExecutionTargetV1`: discriminated union of `subscription`, `api`, `local`, `hybrid` (decision 1, decision 7).
- `ExecutionReplayResultV1`: one generalized result with `target`, `workload`, `feasibility`, separate `coverage` dimensions, `constraints`, `violations`, `unsupportedModels`, optional `economics`, `assumptions`, `confidence`, `warnings`, `versions`, and subscription detail nested beneath it. No generic `savings` field (decision 4). Coverage is never blended (decision 3).
- `StackReplayExportV1`, redaction report, money/scalar shapes, and `STACKREPLAY_ERROR_CODES`.

### `@stackreplay/catalog` — plans as versioned product data

- Schemas for providers, models, plans, plan versions, limits (rolling and calendar windows), model rules (pricing reference, multiplier, exclusion), promotions, and pricing (per 1M tokens).
- Role-specific canonical IDs (`provider` | `model` | `plan` | `pricing`), so one brand can hold several role-specific identities (decision 6).
- Provenance on every claim: source URLs with checked dates, `lastVerifiedAt`, and a verification status (`verified` | `estimated` | `measured` | `unknown`).
- A pure semantic validator: duplicate ids, effective-date ordering and overlap, reference integrity, integer/decimal unit checks, window validity including IANA timezones, multiplier bounds.
- A Node-only loader (`@stackreplay/catalog/load`) that reads YAML, validates, builds the loaded catalog and derives a content-addressed `catalogVersion` from canonical JSON.
- Synthetic data only: fictional providers (`example-cloud`, `example-open`), models, pricing and plans, with `example.invalid` sources. No real provider facts, prices or limits are invented anywhere in this repository.

### `@stackreplay/replay-engine` — deterministic subscription replay

- `replay({ events, target, catalog })` returns a complete `ExecutionReplayResultV1`.
- Model compatibility: canonical-id resolution, name mapping, plan rule lookup, excluded models, and unsupported/unresolved models reported explicitly.
- Constraints: credit pools (money at model list rates), token limits, request limits; rolling windows anchored at first use; calendar windows in the window's IANA timezone; per-model constraints; hard stop, soft and overage enforcement; deterministic violations with window bounds, required vs available units and affected event counts.
- Model-specific rules and promotions (date-ranged, optionally model-scoped multipliers).
- Economics: target cost and an explicit `costBasis`, no savings semantics.
- Confidence as the worst of its factors, each factor carrying a human-readable description.
- Assumptions are stated, not implicit (no proration, independent constraint evaluation, calendar months as UTC months, token limits summing all categories, half-open window boundaries, reasoning priced as output when no reasoning rate exists).
- Money is decimal-string in and out; arithmetic goes through decimal.js configured in one module. Token counts stay exact integers.
- Typed failures instead of repair (decision 12).

## Validation

Run on this machine (Node 24.19.0, pnpm 10.18.1):

| Gate | Command | Result |
| --- | --- | --- |
| Format, lint, import order | `pnpm check` | clean (116 files) |
| Design token contrast | `pnpm check:contrast` | all pairs pass WCAG AA |
| Typecheck | `pnpm typecheck` | 11 packages, no errors |
| Unit, golden and property tests | `pnpm test` | 90 tests pass (schema 8, catalog 15, replay-engine 45, ui 14, cli 8) |
| Build | `pnpm build` | 7 tasks succeed |
| End-to-end smoke (M0 regression) | `pnpm --filter @stackreplay/web test:e2e` | 29 passed, 5 skipped |
| 100,000 event benchmark | `pnpm --filter @stackreplay/replay-engine bench` | see below |

Test composition in `@stackreplay/replay-engine`: unit tests for input handling, determinism, ordering invariance and result shape; 13 golden fixtures (rolling 5-hour window, rolling weekly window, calendar month, model promotion, model exclusion, hard credit cap, overage plan, mixed models, timezone reset, DST boundary, unsupported model, missing token counts, cache pricing); property tests with fast-check (increasing capacity cannot reduce coverage, adding unsupported workload cannot increase model coverage, identical inputs give identical results, event order does not change the result, zero-event workloads produce no violations); time tests covering calendar buckets, week start, DST day lengths and timestamp parsing.

## Benchmark: 100,000 usage events

`pnpm --filter @stackreplay/replay-engine bench` replays a deterministic 100,000 event, 30-day, three-model workload against two synthetic plans and reports measured wall-clock time (median of 5 runs):

| Target | Median | Throughput | Constraints |
| --- | --- | --- | --- |
| `example-cloud-starter@2026-09-15` (two rolling credit pools) | 744.7 ms | ~134,000 events/second | 5h pool pass, 7d pool exceeded |
| `example-cloud-pro@2026-08-01` (monthly token limit, rolling 5h request limit, per-model credit pool, promotion) | 886.4 ms | ~113,000 events/second | all three exceeded |

Both are inside the specification's performance target of replaying 100,000 events in under one second on a modern desktop, and the engine remains pure and Web Worker suitable.

The first implementation of this benchmark measured 5.3 s and 10.9 s. Profiling showed polyfilled Temporal instants dominating the per-event path (3.1 s in the sort alone). Moving the hot path to epoch milliseconds while keeping Temporal for calendar semantics (decision 11) produced the numbers above; the golden fixtures and property tests were unchanged by that refactor, which is the evidence that behaviour did not move.

## Known issues and limitations

- Token limits count all recorded token categories summed (recorded as an assumption on every affected result).
- Calendar month windows are UTC calendar months; billing anchors are not part of the data model yet.
- `overage` enforcement is reported as `UNKNOWN` with a warning rather than guessed. Overage pricing is not modelled.
- Usage coverage is token-weighted across all token categories; it is a separate dimension from request coverage and is never blended with it.
- Catalog versioning is content-hash based at load time. A published artifact with manifest and checksum is Milestone 2 work and the hosting question stays deferred.
- The engine validates its input on every call. A validated-import fast path can be added when import sizes make it worthwhile; at 100,000 events validation is under 100 ms.
- The web app still renders M0 placeholder surfaces. No replay UI exists yet (that is Milestone 3/4 work).

## Deviations from the specification

- None. API, Local and Hybrid targets exist as type and reference shells and raise `TARGET_NOT_IMPLEMENTED` when replayed, exactly as decision 7 requires.
- The two explicitly deferred questions remain open and untouched: M4A fallback pricing when detailed token categories are unavailable, and M2 catalog artifact hosting.

## Next milestone

**Milestone 2 — CLI + first adapters** (`detect`, `scan`, `export`, `replay`, `doctor`), which is not started. The M1 result is intended for independent audit first.
