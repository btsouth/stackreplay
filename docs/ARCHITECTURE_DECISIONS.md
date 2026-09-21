# StackReplay Architecture Decisions

Status: authoritative. Part of the project source of truth, alongside the two specification documents:

- `Initial plan.docx` (StackReplay Product, Architecture, Design and Implementation Specification, points 1-112)
- `adendum stackreply.docx` (StackReplay Addendum A, API, Local AI, Hybrid Execution, and Shareable Economics, points 113-179)

Recorded 2026-09-21 from the clarification exchange that resolved ambiguities found between the two documents. These decisions govern implementation and must survive context and session resets. Change them only through an explicit new decision recorded here. Where Addendum A broadens an original abstraction, the broader abstraction applies without removing the original subscription-focused behavior.

## 1. Generalized ExecutionReplayResult from the beginning

- Use the generalized `ExecutionReplayResult` architecture from the beginning.
- `ExecutionTarget` is a discriminated union capable of representing: `subscription`, `api`, `local`, `hybrid`.
- Milestone 1 only needs working subscription execution, but its core result architecture must not assume that subscriptions are the only possible replay target.
- Target-specific details may be nested beneath the generalized result.

## 2. Default replay semantics: current target rules

The default user-facing Replay answers:

> How would my historical workload behave on this target using the target's CURRENT rules/pricing?

- historical workload + current target version = default replay.
- Historical / as-of replay will later be an explicit alternate mode.
- Every replay must record the exact plan, pricing, catalog and engine versions actually used, so results remain reproducible from the recorded versions.

## 3. Coverage: separate dimensions, no universal score

- Do not create one misleading universal coverage score.
- For subscription replay, preserve distinct dimensions: historical request coverage, usage/token coverage, model coverage.
- Historical request coverage may be the primary user-facing headline where appropriate.
- For future Local Replay, model, memory, context and throughput feasibility remain separately visible rather than collapsed into an arbitrary score.

## 4. Economic terminology: no generic savings

- Do not use a generic `savings` field in the canonical replay result. This supersedes the `savings?: string` field sketched in original point 25; the normative rules in original point 27 and Addendum A points 153, 154 and 178 already forbid the semantics it implies.
- Represent explicit economic values and differences, and label the counterfactual precisely. Examples: target cost, baseline cost, cost difference, API list-price equivalent, API/subscription ratio.
- Never assume a cost difference is money actually saved.

## 5. Plan attribution outside UsageEventV1

- Plan does NOT belong directly on `UsageEventV1` in the initial architecture.
- `UsageEventV1` represents execution facts: timestamp, harness, provider, model, usage/token categories, native cost when available, duration/source/confidence metadata.
- Subscription/plan ownership and economic context are maintained separately.
- If reliable per-event billing-plan attribution becomes useful later, it can be introduced as explicit optional billing context without redefining the fundamental event.

## 6. Role-specific entity IDs

- Do not assume a product or brand can have only one role. A brand may correspond to role-specific entities.
- Example: Command Code may have a harness entity, a provider entity, and one or more plan entities. OpenCode may similarly occupy multiple roles.
- T3 Code is treated as a harness in StackReplay.
- Use role-specific canonical IDs rather than forcing one global role per brand.

## 7. Limited Milestone 1 ExecutionTarget type scope

- During Milestone 1, define only the generalized types necessary to preserve the ExecutionTarget architecture cleanly.
- Do not prematurely implement detailed API, Local, or Hybrid domain behavior.
- Concretely: the discriminated union and its reference IDs exist from M1; behavior, catalogs and UI for API, Local and Hybrid arrive with M4A, M7A and M8A respectively.

## 8. Authoritative roadmap ordering

M0 Foundation
M1 Schema + Catalog + Replay Engine
M2 CLI + First Adapters
M3 Browser-Local Replay
M4 Public Product + Share Layer
M4A Direct API Replay
M5 Accounts + Cloud History
M6 Billing
M7 Stack Optimizer
M7A Local Replay Beta
M8 Plan Change Intelligence
M8A Hybrid Replay

- Treat the completion of M4A as the target for the first major public StackReplay launch, although build-in-public posts may happen sooner.
- Milestone contents and acceptance criteria remain as specified in original points 98-106 and Addendum A points 168-170; this ordering is authoritative.

## Clarifying readings carried with these decisions

Readings that came out of the same clarification exchange. If any of them ever appears to conflict with decisions 1-8, decisions 1-8 win.

- The canonical replay result is a single type at version 1: the generalized `ExecutionReplayResult`, with the subscription-shaped result from original point 25 nested beneath it. The generalized envelope has no explicit violations or unsupportedModels slots; M1 must give those explicit homes on the shared contract (constraints and feasibility are the natural candidates) rather than losing them.
- `feasibility.coveragePercent` (Addendum A point 116) is a named dimension, never a blended score. For subscription replay it is expected to be historical request coverage, with the other dimensions visible alongside.
- Original point 15's prose listing "plan: OpenCode Go" in the canonical event is read as the user's subscription context, not an event attribute, consistent with decision 5.
- `estimatedCost` and similar values carry the Addendum A point 153 vocabulary (simulated cost), with named counterfactuals.

## Deferred questions (do not resolve early)

Explicitly deferred. Do not implement, guess, or resolve these before their milestones:

1. M4A: the fallback pricing method when a source exposes no detailed token categories. Addendum A point 120 requires confidence degradation and a stated assumption; the method itself is undecided.
2. M2: where the published catalog artifact is hosted and fetched from. Original point 20 defines manifest, checksum, cache and bundled-snapshot behavior; the hosting location is undecided.
