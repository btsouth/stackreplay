# StackReplay Architecture Decisions

Status: authoritative. Part of the project source of truth, alongside the two specification documents:

- `Initial plan.docx` (StackReplay Product, Architecture, Design and Implementation Specification, points 1-112)
- `adendum stackreply.docx` (StackReplay Addendum A, API, Local AI, Hybrid Execution, and Shareable Economics, points 113-179)

Both specification documents are local working documents and are intentionally not tracked in this repository.

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

## 9. Long-term AI workload scope: modalities and workload categories

Recorded 2026-09-21. StackReplay's initial launch vertical remains AI coding: coding agents, coding subscriptions and LLM/API workloads. Milestones 1 through 4 stay focused on that launch wedge. The long-term product domain is broader than coding, and the canonical long-term concept is:

> Replay your real AI workload against other ways of running it.

Future workload categories may include: coding and agent workloads; general LLM/chat/research workloads; API/application workloads; image generation; video generation; audio/speech workloads; multimodal workloads; local AI.

Consequences for the domain model (extensibility only, not behavior):

- Milestone 1 must NOT permanently define "AI workload" as LLM token counts only.
- For the current coding/LLM implementation, token usage remains strongly typed and first-class, including where available: input tokens, output tokens, cache reads, cache writes, reasoning tokens.
- Do NOT weaken the usage schema into an opaque generic key/value metric bag. `Record<string, number>` and similar shapes are not the extensibility mechanism.
- Design `UsageEvent` and `Workload` so future modality-specific, strongly typed usage structures can be added without redefining their fundamental identity or semantics.
- Preserve the distinction between technical modality (text/LLM, image, video, audio, multimodal) and workload/use-case category (coding, agent, chat, research, API application, image generation, video generation, speech, other). Do not assume these concepts are identical.
- Do NOT implement image, video, audio or general-consumer AI behavior during current milestones. This is an extensibility decision only; the launch remains coding-focused. The broader long-term promise is "Your workload. Any stack. Replay the difference."

## 10. Public repository strategy and license intent

Recorded 2026-09-21. StackReplay is intended to be developed publicly. This monorepo is prepared for public release immediately after Milestone 1 receives an independent audit. The reasons include transparency around the privacy claims, developer trust, GitHub discovery, community catalog corrections, community adapter contributions, build-in-public distribution, and GitHub stars/watchers as an acquisition channel.

- The repository license is intended to be **AGPL-3.0-or-later**, unless a concrete license incompatibility is discovered during the license audit. Do not silently substitute a different license; if an actual incompatibility exists, document it and stop before writing the license rather than guessing.
- The public repository may include: CLI, schemas, catalog, adapters, Replay engine, browser-local product, marketing/public web surfaces, design system, and documentation.
- The repository must NEVER contain: API keys, production credentials, database connection strings, Stripe secrets, provider credentials, personal StackReplay exports, raw user telemetry, private benchmark datasets derived from users, employer/client information, or production operational secrets. Synthetic deterministic fixtures are allowed.
- This decision does NOT yet determine whether Milestone 5+ hosted/cloud-only implementation remains in the public monorepo. Before Milestone 5, make an explicit architecture/business decision about whether cloud-only infrastructure remains public or is separated into a private hosted-service implementation. Do not architect or implement that split now.

## 11. Internal time representation: epoch milliseconds, Temporal for calendar semantics

Recorded 2026-09-21 during Milestone 1. The engine keeps its controlled Temporal module (spec point 24) but does not use polyfilled `Temporal.Instant` objects in the per-event hot path.

- Parsing, sorting, comparing and slicing rolling windows use **epoch milliseconds**, which is exact for every timestamp the schema accepts. An ISO-8601 UTC duration of days/hours/minutes/seconds converts to exact milliseconds, so rolling windows need no calendar arithmetic.
- The Temporal polyfill is used only where calendar semantics genuinely require it: resolving calendar bucket boundaries in an IANA timezone (including DST), and the exported time helpers.
- Calendar buckets are resolved once per distinct UTC date and verified against the instant before reuse, so timezone-aware bucketing stays correct while costing a few dozen conversions instead of one per event.
- `epochMsFromIso` rejects timestamps that are not real calendar instants (for example `2026-02-30`) instead of letting `Date.parse` roll them over.
- Rationale: measured on a 100,000 event replay, polyfilled instant comparisons in the sort alone cost 3.1 seconds of a 4.8 second run. The representation change brought the same replay under one second. Any future consumer (Web Worker, CLI, server) inherits this.

## 12. Engine input contract: validate, never repair

Recorded 2026-09-21 during Milestone 1.

- `replay()` validates the catalog, the execution target and every usage event before simulating. It never repairs, drops or guesses invalid input.
- Failures are typed: `ReplayEngineError` carries a stable code from `STACKREPLAY_ERROR_CODES` (`CATALOG_INVALID`, `IMPORT_SCHEMA_INVALID`, `PLAN_VERSION_NOT_FOUND`, `TARGET_NOT_IMPLEMENTED`), a safe user-facing message, and internal diagnostics that are not shown to users.
- Duplicate event ids are rejected: imports are idempotent, so a duplicate id in one replay is a data error, not something to silently deduplicate.
- The engine reads no files, environment variables or network. The catalog arrives as a loaded object; the Node-only loader lives behind the separate `@stackreplay/catalog/load` entry point, so the same engine package runs in the browser unchanged.
- Schema homes fixed in M1, resolving the clarifying reading below: `violations` and `unsupportedModels` are top-level arrays on the generalized `ExecutionReplayResultV1`, and per-constraint status lives on `constraints`.

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
3. Before M5: whether Milestone 5+ hosted/cloud-only implementation remains in the public monorepo or is separated into a private hosted-service implementation (decision 10).
