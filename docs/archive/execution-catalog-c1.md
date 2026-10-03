> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# C1 execution catalog and compiler

C1 extends the existing `packages/catalog` plan record. It does not create a provider database or accept any of the execution-market research observations as provider facts. The only new plans in C1 are synthetic test records. The compiler target is the canonical `CompiledExecutionPlanV2` in `packages/schema/src/compiled-execution.ts`; O3B.1 owns scenario version 2, purchase-cycle arithmetic, concrete partition binding, and replay.

## Accepted source and evidence

A plan keeps its legacy `versions` array and may add `executionVersions` and `executionOverlays`. An execution version declares authoring `schemaVersion: 1`, a stable ID, product ID, half-open validity, publication/observation/review/activation times, purchase term and full-cycle fee, claims, finite requirements, model groups, pinned pricing references, typed meters, named pools, debits, windows, atomic constraints, exact routes, continuation and explicit unsupported capabilities. Routes record endpoint, protocol and harness compatibility in the accepted record. Their compiled route requirement IDs (`harness:<routeId>` and `protocol:<routeId>`) must be resolved from scenario facts. No provider name drives replay.

Claims are attached to operations by ID. Each accepted claim records its source ID and URL, source type, observed and reviewed times, optional publication time, effective-date basis, authority, certainty, locator, reviewer, normalized claim hash, evidence-package hash and optional raw-source hash. The artifact retains only claim ID, evidence-package hash, coarse runtime certainty and operation IDs. Source pages and excerpts stay out of the browser artifact. A reviewed first-party relative limit remains non-computable. Accepted numeric execution requires a claim classified as published deterministic, published hard limit or synthetic. Estimates, relative limits, dynamic amounts and inferred values cannot become numeric admission rules.

The strict accepted schema rejects `review_required`, unresolved-conflict and arbitrary-expression fields. Research observations stay outside `executionVersions`. Load-time validation checks claim references, review ordering, immutable interval overlap, activation basis, route requirements and fixed-window anchor requirements. The compiler applies further cross-record checks before emitting executable numbers.

## Selection and compatibility

New execution versions use `[validity.start, validity.end)`. A `current-market` version starts at its explicitly reviewed catalog activation instant, without claiming that the provider introduced the rule then. A provider-effective version needs a provider-stated effective-date claim. Overlaps are rejected. Legacy `versions` still use inclusive date endpoints and latest-start precedence in `versions.ts`. The existing bundled catalog hash remains unchanged; no old snapshot is rewritten or recast as provider credits or new first-use groups.

Purchase eligibility is separate from validity. Region, cohort, billing term, purchase state, organization policy, harness, protocol and opt-in requirements compile to stable IDs with claim references. Missing scenario facts stay unknown; false facts make the candidate unavailable. A plan can remain economically valid after new purchases stop, while a reviewed existing-subscriber requirement remains available to its cohort.

## Compiler operation

`compileExecutionPlan(catalog, planId, versionId, selectedOverlayIds, rulesAt)` reads one accepted version from a pinned catalog. It performs no fetch and reads no clock. It checks exact identities, units, claims, rates, pool mappings, overlaps and route access. Each referenced rate pins its basis, endpoint and revision. Selector resolution is against pinned catalog models and pricing records, and returns a separate resolution trace. Supported selectors are exact models, release family, maintained explicit group, provider-supported snapshot set and a price-at-or-below selector. The price selector requires endpoint, rate basis, currency, category, comparison, threshold, exact pricing references and rate version. Missing or unreviewed price evidence yields a non-computable reason. The runtime sees only finite exact model IDs.

Rate and evidence objects are interned at artifact level. Routes point to debit and cash-rate IDs. A debit factor changes capacity drain; an allowance factor changes a constraint amount; a cash-rate factor changes only the paid route; a fixed-fee modification changes only purchase cost. Overlay records are not mutated. Selected overlays must be valid at `rulesAt` and applicable to the version. They apply in precedence order. Equal-precedence changes to the same operation are rejected. Cohort and redemption requirements on an overlay are retained as required facts, so an unknown redemption state cannot silently qualify. Normal annual billing is a distinct unsupported purchase term, not an automatic promotion.

The compiler sorts IDs and model sets, canonicalizes object keys, normalizes derived decimals, then SHA-256 hashes the artifact content excluding `artifactHash` and `catalogHash`. `catalogHash` is the existing catalog content hash. There is no generated-at field in the content identity. Hashes establish reproducibility and integrity, not source authority. Claim authority and review live in the accepted catalog.

## Binding and replay

O3B.1's pure `bindExecutionScenario` accepts compiled artifacts and explicit local facts. A monthly purchase supplies a real cycle ID, start, end and IANA billing timezone; a 28-day purchase supplies an exact 672-hour cycle. The binder validates containment, materializes fixed partitions from named anchors, fills absent required eligibility facts as `unknown`, and hashes cycle, timezone, anchors, windows, eligibility, initial observations and assumptions into a distinct scenario hash. It never derives a purchase or reset anchor from workload start or an imported event. Fixed partitions contain only deterministic schedule semantics in the catalog artifact. Concrete `[start,end)` instances live in the bound resource, with no carry between slices.

The C1 observation reconciliation step validates the full counter identity: resource instance, artifact hash, pool, constraint and concrete window ID/boundaries. It checks as-of time, local evidence, amount, latch legality and subset versus shared counters where intervals match. Identical readings deduplicate; conflicting readings fail. An explicit `fresh` assumption needs local assumption evidence. Catalog claim IDs cannot be reused as local observation evidence IDs. Observations never create historical events, cash receipts or automatic migration to a later artifact.

## Exact mapping and unsupported semantics

| Accepted field | Compiled or bound field | O3B.1 effect |
| --- | --- | --- |
| Full-cycle fee and term | `purchase` plus bound `cycle` | Full fee once, explicit cycle containment |
| Claim evidence | `claims` and operation `claimRefs` | Receipt and reason provenance |
| Named pool and meter | `meters`, `pools`, `debits` | Typed accepted-use stream |
| Atomic ceiling | `constraints` referencing pool/window | Simultaneous admission views, no duplicate balance |
| First-use activation selector | `activationModels` | Shared activation group across constraints |
| Fixed schedule and local anchor | artifact window plus bound `windowInstances` | Non-carrying concrete intervals |
| Route entitlement and compatibility | exact `routes.models`, requirement IDs | Exact-model execution with three-valued eligibility |
| Price-band selector | finite route models and separate resolution trace | No runtime price query |
| Local observed consumption | `initial.observations`, `observationEvidence` | Counter seed without fake prior calls |

True trailing windows, opaque or inferred debit amounts, flexible grants, concurrency without required measurements, arbitrary reset times/week starts, annual or multi-cycle purchase, purchased wallets, ambiguous automatic PAYG, balance allocation, and undocumented unit conversions are non-computable or rejected as malformed. Manual upgrade means the current route hard-stops; a higher tier is another candidate. Independent API fallback requires its own exact priced artifact. No model substitution or provider-specific runtime callback exists.

## Synthetic fixture coverage

The six synthetic families in `packages/catalog/test-fixtures/execution.ts` pass through catalog validation and compiler tests. The replay-engine integration tests use those artifacts with the O3B.1 binder and runtime:

- Claude-like: known fee, verified relative opaque capacity, non-computable subscription, independent API witness.
- GOAT-like: one value pool, 5-hour/weekly/monthly/model ceiling views, shared first-use activation and atomic admission.
- Token-Harbor-like: pinned price-band routes, explicit debit factor, one 28-day cycle and four non-carrying seven-day slices.
- Cursor-like: two independent named pools with no borrowing.
- Copilot-like: versioned provider credit identity, cohort requirement and unresolved flexible component.
- Ollama/Kiro-like: deterministic fixed-fee allowance replays; hidden concurrency/task measurement does not acquire a fabricated debit.

The compiler metric test records JSON artifact bytes for all six and build/compile time for 500 synthetic immutable versions. It is a size/regression diagnostic, not a browser performance claim. No production execution-market plan was added.

## Saved decision snapshot identity

`catalogHash` identifies the complete accepted catalog loaded for a computation. It remains in the decision market, results and saved evidence. `decisionSnapshotHash` separately identifies the admitted execution market: a versioned canonical SHA-256 of the fixed rules instant, review horizon, sorted scenario IDs with their plan/artifact identities, and sorted admitted plan IDs with their compiled `artifactHash` values. The normal decision-market generator creates it. Target strategy, viewer time, full catalog hash, release dates, browsing metadata and display copy are excluded. Compiler artifact identity still includes executable rates, routes, versions, overlays, validity and claim evidence, so changes to those dependencies remain conservative snapshot changes.

Metadata-only catalog maintenance can therefore retain a decision snapshot while changing full provenance. New saved results compare only with the same import, scope digest, call count and rules instant. When both record the execution snapshot, that hash must match; otherwise exact `catalogHash` equality remains mandatory. Legacy records are never migrated or assigned a reconstructed hash. Both full catalog revisions remain visible in saved result details. Compare groups require pairwise compatibility, so a legacy record cannot bridge otherwise incompatible revisions.

Recorded Suggested Replay results carry the snapshot of their compiled market calculation. A translated Standard API run carries it only when its full receipt matches directly referenced admitted routes and rates without overrides, at the pinned date and full catalog. Unadmitted routes, partial pricing, other service tiers and arbitrary custom Replay retain the catalog fallback. Baseline differences require the same snapshot compatibility rule; a hash never supplies a missing price or a different scope. Strategy and mapping differences stay in the saved result, not the common market digest.
