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

## 11. Internal time representation: millisecond component plus nanosecond remainder

Recorded 2026-09-21 during Milestone 1. The engine keeps its controlled Temporal module (spec point 24) but does not use polyfilled `Temporal.Instant` objects in the per-event hot path.

- Audit correction, 2026-09-21: the original claim that epoch milliseconds preserve every schema timestamp was false. The schema accepts up to nine fractional digits. Parsing, sorting, comparing and slicing rolling windows now retain **epoch milliseconds plus a separate sub-millisecond nanosecond remainder**. Sort by the full instant, then event id for equal instants; input order is never the tie breaker. Whole-second rolling durations preserve the remainder at both half-open boundaries.
- The Temporal polyfill is used only where calendar semantics genuinely require it: resolving calendar bucket boundaries in an IANA timezone (including DST), and the exported time helpers.
- Calendar buckets are cached by UTC date and recomputed whenever the cached interval does not contain the event, so timezone-aware bucketing stays correct while costing a few dozen conversions instead of one per event.
- `epochMsFromIso` rejects timestamps that are not real calendar instants (for example `2026-02-30`) instead of letting `Date.parse` roll them over.
- Rationale: measured on a 100,000 event replay, polyfilled instant comparisons in the sort alone cost 3.1 seconds of a 4.8 second run. The original representation change brought the same replay under one second, but existing fixtures did not prove precision preservation. Audit regressions now cover sub-millisecond chronology and boundaries. Any future consumer (Web Worker, CLI, server) inherits this.

## 12. Engine input contract: validate, never repair

Recorded 2026-09-21 during Milestone 1.

- `replay()` validates the catalog, the execution target and every usage event before simulating. It never repairs, drops or guesses invalid input.
- Failures are typed: `ReplayEngineError` carries a stable code from `STACKREPLAY_ERROR_CODES` (`CATALOG_INVALID`, `IMPORT_SCHEMA_INVALID`, `PLAN_VERSION_NOT_FOUND`, `TARGET_NOT_IMPLEMENTED`), a safe user-facing message, and internal diagnostics that are not shown to users.
- Duplicate event ids are rejected: imports are idempotent, so a duplicate id in one replay is a data error, not something to silently deduplicate.
- The engine reads no files, environment variables or network. The catalog arrives as a loaded object; the Node-only loader lives behind the separate `@stackreplay/catalog/load` entry point, so the same engine package runs in the browser unchanged.
- Schema homes fixed in M1, resolving the clarifying reading below: `violations` and `unsupportedModels` are top-level arrays on the generalized `ExecutionReplayResultV1`, and per-constraint status lives on `constraints`.

## 13. Admission: attempted demand versus accepted consumption

Recorded 2026-09-21 from the independent M1 audit. These semantics are authoritative and supersede the earlier independent-per-constraint evaluation.

- Replay distinguishes **attempted demand** (what the historical workload offered) from **accepted consumption** (what the simulated target actually served, and therefore what advances capacity pools).
- Requests are evaluated in strict chronological order. For each event: resolve model compatibility, determine every applicable constraint, decide admission against accepted consumption accumulated so far, then either serve the event (all applicable pools advance) or reject it (no ordinary pool advances).
- **Admission is atomic across applicable constraints.** An event rejected by one hard constraint consumes nothing from any other pool.
- A rejection does not consume capacity, and a later request may still be admitted when it individually fits the remaining capacity (per-request rejection is the default). Rejections never latch unless the rule explicitly says so.
- Attempted demand is preserved as diagnostics: every constraint reports attempted units, rejected event counts and indeterminate event counts separately from accepted consumption.
- Windows follow the events a constraint applies to: a rejected event still
  counts as attempted demand in its window, while only served events advance
  accepted consumption. Rejections never latch unless the rule declares
  `latch_until_reset`.
- Model-unsupported events are not served and consume nothing.

## 14. Exceed behavior is explicit per rule

Recorded 2026-09-21. There is no hidden global assumption about what happens after capacity is exceeded. Every hard-limit rule declares its behavior explicitly; synthetic catalog data must state it (the schema has no default):

- `reject_request`: the violating request is rejected; later requests may still be admitted if they individually fit remaining capacity.
- `latch_until_reset`: once triggered, subsequent applicable requests stay blocked until that window resets.
- `allow_overage`: requests stay served, included capacity is consumed first, and excess units are billed under an explicit overage rate.
- `record_only`: requests stay served and the exceeded window is recorded as a violation without rejection or billing (the previous `soft` enforcement).

Real provider behavior is never invented: which behavior a provider uses is a catalog claim with provenance and verification status, like every other rule.

## 15. Canonical token accounting is non-overlapping

Recorded 2026-09-21. Blindly summing token categories double counts subsets, so the canonical event declares the accounting relationship explicitly and replay derives disjoint buckets.

- The canonical buckets are: uncached input, cache-read input, cache-write input, output, reasoning. Replay consumption, coverage and pricing use **disjoint** quantities only.
- `TextUsageV1` carries the reported categories plus an explicit `accounting` declaration: whether cache-read tokens are already included in `inputTokens`, whether cache-write tokens are already included, and whether reasoning tokens are already included in `outputTokens`. The declaration is required whenever the corresponding category is present; an impossible declaration (included quantity larger than its base) is rejected.
- Adapters normalize provider telemetry into these buckets and state the overlap; replay never guesses. Reasoning tokens are not assumed to be additive to output, and cache-read tokens are not assumed to be additive to input.
- Explicit zero is known data; a missing category is unknown, not zero.
- Pricing converts the disjoint buckets: uncached input at the input rate, cache reads at the cache rate, cache writes at the cache-write rate, output at the output rate, reasoning at the reasoning rate. Fallback rates remain explicit, warned and confidence-reducing.

## 16. Unknown consumption, coverage and indeterminate results

Recorded 2026-09-21. Unknown is preferable to false precision.

- A constraint that requires a quantity the workload does not establish becomes `unknown`, with an explicit warning; it can never report `pass`. Events whose required consumption is unknown are **indeterminate**: they are not served and advance no pool.
- Coverage dimensions carry an explicit status. A dimension is `unknown` when its denominator or numerator depends on unknown quantities; `percent` is then absent rather than guessed. A known dimension reports `percent`, `covered` and `total`.
- Request coverage becomes unknown when any event's admission is indeterminate. Usage coverage becomes unknown when any event's token quantities are unknown. Model coverage becomes unknown when any event's model cannot be resolved.
- A genuine empty workload (no events) keeps the documented 100 percent convention for a zero denominator. A workload with known zero consumption is a known zero denominator and is also 100 percent. An unknown denominator is never reported as 100 percent.
- `feasibility.coveragePercent` is a named dimension (historical request coverage) and is absent when that dimension is unknown, with a stated reason.

## 17. Current-rule snapshot replay: explicit rulesAsOf

Recorded 2026-09-21, extending decision 2.

- Every replay receives an explicit caller-supplied rules context (`rulesAsOf`). The engine never reads a clock: no `Date.now()`, no host time, no implicit "today".
- Default replay applies the rule snapshot in effect at `rulesAsOf` to the historical workload: the plan version effective at that instant, its limits, its model rules, its pricing references and its promotions as of that instant.
- Promotion and rule eligibility is resolved from the snapshot, **not** from each event's original calendar date. A promotion active at `rulesAsOf` applies to the whole replayed workload, including events whose timestamps predate it.
- Historical event timestamps still drive workload chronology: window slicing, spacing and reset boundaries inside the simulation.
- A subscription target may name an explicit plan version (pinned selection) or a plan id (selected deterministically as the version effective at `rulesAsOf`). Historical/as-of replay with historically varying rules remains a later explicit mode and is not implemented now.
- Rule effective dates and workload event times are different concepts and are never conflated.

## 18. Bounded decimal envelope

Recorded 2026-09-21. Decimal-safe arithmetic requires bounded inputs, not just non-binary arithmetic.

- Accepted monetary and rate values are decimal strings within a documented envelope: at most 28 significant digits and at most 18 fractional digits. Values outside the envelope are rejected by the schema rather than silently rounded.
- Internal arithmetic uses a deliberately generous Decimal precision (100 significant digits, isolated from any other consumer of decimal.js). The envelope is chosen so that every supported operation (parse, divide by one million, multiply by token counts, multiply by multipliers, sum across the workload, compute overage) is exact within that precision.
- Token and request counts remain safe integers; aggregates that would exceed the safe-integer range are rejected.
- Every value accepted by the schema must be calculable without silent precision loss under supported M1 operations. Boundary and adversarial tests pin the envelope.

## 19. Overage semantics and economics vocabulary

Recorded 2026-09-21, extending decisions 4 and 14.

- `allow_overage` is implemented in M1: requests stay served, included capacity is consumed first, excess units are computed deterministically per window, and overage cost uses an explicit decimal-safe rate (per 1M tokens or per request; for a credit pool the excess is already currency).
- Economics expose the precise concepts: base plan cost, overage cost, total simulated target cost (`targetCost` = base + overage), and an explicit `costBasis`. There is still no generic `savings` field.
- A cost difference is signed: `costDifference = targetCost - baselineCost`, where negative means the target costs less. Differences use a signed money shape; base costs never do.
- A rule that cannot be represented faithfully is rejected rather than reported misleadingly.

## 20. Result contract corrections

Recorded 2026-09-21.

- Measurement units are an enumerated type (`tokens`, `requests`, `usd`), not arbitrary strings, so incompatible units cannot be silently mixed.
- Version metadata is generalized: engine version, result schema version, catalog version, target type, target reference, pricing references where applicable, the `rulesAsOf` instant and a replay methodology version. It does not require a subscription-specific id, so future API, local and hybrid targets fit the same shape. Subscription detail remains nested and optional.
- `StackReplayExportV1` rejects invalid ranges (`from` after `to`); `from == to` is a valid empty range.
- Constraint and violation results carry accepted consumption, attempted demand, overage units and rejection/indeterminate counts as separate fields.

## 21. Exact arithmetic composition and derived result values

Recorded 2026-09-21 during independent M1 re-audit, tightening decisions 18-20.

The external 28-significant / 18-fractional digit envelope alone cannot bound an
unlimited product of promotions. Catalog validation also bounds each plan's
simultaneously active multiplier composition. Let G be the maximum integer-digit
growth (one per factor greater than one, factors already capped at 10), S the
maximum sum of fractional scales after removing trailing zeros, and D the
decimal digit count of the number of constraints. Require **68 + G + S + D <=
100**. Maxima are conservative across all model rules and promotion snapshots,
including explicitly pinned versions.

The proof uses the validated aggregate-count bound (<10^16), rates (<10^28),
and per-million conversion (at most 24 fractional places before multipliers).
A request-overage amount has fewer than 44 integer digits; token/credit
amounts have fewer than 38+G. Using the conservative bound 44+G integer and
24+S fractional places, then reserving D digits for summing constraint costs,
fits every intermediate product, sum, subtraction and final cost within the
isolated 100-digit Decimal precision. No monetary rounding is introduced.

Computed result values therefore have a separate envelope: non-negative
decimal strings with at most 100 significant and 100 fractional digits; signed
differences use the signed equivalent. External rates and costs retain the
smaller input envelope. Serialized economic identities are checked exactly,
including target = base + overage and difference = target - baseline.

Clarifications of the existing accounting contract:

- All applicable hard rules are evaluated before rejection, so every exceeded
  latch triggers regardless of catalog rule order.
- Included cache-read and cache-write are disjoint subsets of input; their
  **combined** count cannot exceed input. Workload summary totals use normalized
  disjoint buckets, and are omitted when the workload is incomplete.
- If indeterminate admission prevents an exact overage total, the optional
  economics object is omitted with an explicit warning. Constraint diagnostics
  still describe known attempted and accepted quantities, not a complete bill.
- M1's rulesAsOf is an explicit UTC calendar **date**, matching catalog date
  granularity; intraday rule changes are not represented.
- Greedy token/credit admission does not promise monotone served-request counts
  when capacity changes. Capacity properties must state the pool, unit and
  window assumptions they actually prove.

## 22. Adapter accounting must be evidence-backed, or unknown

An adapter may emit an explicit zero for a canonical token category only when the source's own
accounting model has no such separate category, and that fact is established from one of: upstream
source code, upstream documentation, or an arithmetic invariant in the data itself. Anything else
stays unknown. Evidence is recorded per adapter in `docs/ADAPTERS.md`, and every relationship is
re-checked defensively per record: when the stated invariant fails, the affected categories degrade
to unknown with a warning instead of publishing an impossible accounting. Rationale: this is the
difference between "the source does not report reasoning" (unknown) and "the source has no separate
reasoning category" (a known absence), and only the second may be reported as zero.

Audit correction, 2026-09-21 (M2): a source that publishes its own total for a record gets one
further check, because that total is the source's own statement about its categories. If the reported
categories add up to **more** than the record's own total, they cannot all be additional; if no
inclusion arrangement reproduces the total either, the overlapping categories (cache read, cache
write, reasoning) are reported as unknown with a warning, while input and output are kept. OpenCode
publishes such a total (`tokens.total`) and 16 of 10,587 local assistant records fail that check, so
this is a live case rather than a theoretical one. Related: a category the source reports as a
breakdown of another quantity must be declared included in it rather than published as a zero, which
is how Claude Code's `output_tokens_details.thinking_tokens` is now carried.

## 23. Harness attribution is a mapping, never a re-ingestion

A harness that orchestrates other agents (T3 Code today, others later) contributes attribution and
provider-history roots, not usage events of its own. Provider sessions it orchestrated are
attributed to the harness with `attribution: "exact"` while the underlying provider session remains
the single source of usage. This is what keeps "T3 ran this" from becoming "T3 ran this and Claude
Code ran this". Harness-managed history roots that duplicate a provider's default root are not
scanned twice.

Audit correction, 2026-09-21 (M2): the mapping is read from wherever the installed harness records
it, and reported honestly when it is absent. An installed T3 leaves
`projection_thread_sessions.provider_session_id` empty and records the provider session id in
`provider_session_runtime.resume_cursor_json.sessionId`, so both sources are read (the projection
first). Reading only one of them silently attributed nothing on the machine this was verified on
while `detect` still reported a healthy source, which is the failure mode this correction removes:
a harness that records no session id reports that, and never guesses a mapping.

## 24. Session identity is adapter-independent, event identity is adapter-scoped

`nativeSessionHash` is derived from the session id alone, so two sources observing the same session
(for example a native Claude Code scan and a ccusage import of that session) can be recognised as
the same work and deduplicated. `nativeEventHash` stays scoped to the adapter, so distinct sources
keep distinct event identities. Overlap resolution keeps the higher-precision source (a native
per-call scan outranks an aggregate import) and reports every dropped aggregate.

Audit correction, 2026-09-21 (M2): recognition cannot depend only on an identical instant and token
signature, because an aggregate row covering many calls can never match a single call's
fingerprint. An aggregate row whose session a native per-call scan already read is therefore
resolved by session identity alone and dropped, with the drop reported. Two sources of **equal**
precision never collapse: an identical fingerprint cannot distinguish two independent records of
the same work from two distinct calls that look alike, so each native identity is kept.

## 25. Aggregated sources emit one event per aggregate

When a source only exposes aggregates (Hermes records per session and model, ccusage rows are
daily or session level), StackReplay emits exactly one canonical event per aggregate and carries the
aggregate's window explicitly. It never fabricates a sequence of per-call events to make request
counts look exact. Request counts from such sources are approximate, and both the adapter and the CLI
say so.

## 26. Third-party imports are opt-in and never complete themselves

A third-party export (ccusage JSON) is read only when the user points at it explicitly, and it is
never auto-detected as a source of truth for the machine. Where an import cannot establish a
relationship the canonical model needs, the unknown is preserved rather than filled in: imported
rows keep reasoning unknown, so their token totals are reported as unknown. Importing alongside a
native scan is allowed and deduplicated, with the overlap reported.

## 27. T3 Code is an orchestration control surface, never a usage source

T3 Code must not be presented to users as an independent inference-usage source. In StackReplay it is
a **control surface / orchestration client** that drives underlying coding agents and provider CLIs
(Codex, Claude Code, OpenCode and other supported runtimes). Consequences, binding on data and UI:

- T3 Code emits zero canonical usage events by design.
- T3 attribution must never increase event counts or token totals; underlying usage records remain
  the single source of consumption truth.
- T3 metadata answers exactly one question: "was this underlying session orchestrated through T3
  Code?".
- The product UI must never show "T3 Code — 0 events" in a way that implies a failed integration.
  Usage-producing sources and orchestration attribution are presented as separate concepts:
  a usage-source list, and an orchestration line such as "34 sessions via T3 Code".
- A session-attribution count is derived from structured metadata only (the harness reference on
  canonical events). Human-readable `note` strings are never parsed to infer semantics. When
  structured attribution is unavailable, the UI states that attribution is available without
  inventing a number.

The larger taxonomy (control surface, coding agent / agent runtime, inference provider, subscription
plan, model) is deferred. Existing M1/M2 contracts stay valid, and this taxonomy is revisited
deliberately before the M4/M4A public catalog and economic work rather than refactored now.

## 28. Detected sources carry an optional role, and old exports stay valid

Distinguishing a usage source from an attribution or import source is a data question, not a UI
heuristic. `DetectedSourceV1` gained an optional `role` field (`usage` | `attribution` | `import`),
populated by the collection pipeline from the adapter's own kind.

Backward compatibility is explicit: the field is optional, every export written before it existed
remains schema-valid and importable, and consumers fall back to a small known-adapter map (T3 Code is
attribution, ccusage is an import) when the field is absent. Consumers must not parse `note` strings
to recover semantics. `UsageEventV1` was not changed for this purpose, and no broader source
taxonomy was introduced.

## 29. Browser-local replay: Worker boundary, IndexedDB persistence, no upload path

Milestone 3 runs the same deterministic engine in the browser under a strict boundary:

- **Execution**: reading, parsing, validating, workload preparation and replay all happen in a
  dedicated Web Worker. The main thread receives progress, an aggregate workload summary and the
  replay result; it never receives a copy of the event array, and no main-thread operation touches
  the whole workload. The engine package is imported unchanged (no DOM, no filesystem, no network).
- **Protocol**: an internal, typed, versioned message protocol with explicit success and error
  variants. Progress is a separate message class from terminal results. Every request carries a
  monotonically increasing id; the client drops responses for superseded requests, so a slow import
  can never overwrite a newer one, and a dropped response is never surfaced to the user as a
  failure. A superseded request must not clear state the newer request owns.
- **Worker failure**: a Worker that cannot be used (its asset failed to load, was blocked, or it
  never announced itself) is dropped, and every request waiting on it fails with a safe error
  instead of waiting forever behind a progress line. The next request starts a fresh Worker, so a
  transient Worker failure is recoverable without a page reload.
- **Persistence**: IndexedDB only, never localStorage, storing the canonical sanitized export plus
  listing metadata. The original raw file is not kept as a second copy. Deletion and "clear local
  data" remove records rather than hiding them, and an incompatible or corrupted stored payload
  fails safely with a typed error.
- **No upload path**: there is no import or event upload endpoint, and no dormant upload
  infrastructure "for future use". A browser test records every request during import and replay and
  fails if any request body carries events, token history or any project/session hash. The privacy
  statement "Processed locally in your browser" is therefore a tested property, not copy.
- **URLs**: navigation uses an opaque local import id only. Workload content, project hashes, session
  hashes and file names never appear in a URL, and hashed identifiers are not shown to users.

## 30. Local-first, not local-only

StackReplay is local-first. It is not local-only. The privacy-preserving local experience is a
permanent first-class product mode, not the final limit of the product.

The long-term shape is: local collection -> sanitized canonical usage metadata -> local or browser
Replay by default -> optional cloud history and intelligence when the user explicitly enables it.
The hosted capabilities (persistent account history, multi-machine sync, saved replay history,
continuous analytics, plan-change impact, alerts, optimizer, advanced API/local/hybrid analysis)
arrive in their own milestones. None of them exist yet.

Consequences that bind every milestone before M5:

- The free local path stays complete on its own: collect, import, replay, persist locally, no account.
- Nothing may present an unimplemented hosted capability as available. Marketing copy may describe
  planned cloud capabilities only where it is labelled as planned or future.
- Navigation and information architecture must leave room for account-backed surfaces (Overview,
  Replay, Stack, Plans, History, Changes or Insights, Settings) without building them early and
  without assuming IndexedDB is the permanent and only source of history.
- The browser-local architecture of decision 29 is permanent, not a stopgap.

## 31. Approved brand assets are the implementation source of truth

StackReplay has an approved brand identity. `docs/brand/stylesheet.png` is the human visual
authority. `brand/approved-raster-kit/` is the implementation source, mechanically derived from the
single approved raster master `master/stackreplay-mark-master.png`, and `brand/README.md` documents
the asset policy.

The mark is never regenerated, redrawn, traced, approximated, reinterpreted or recoloured. Slab
geometry, endpoint-circle sizes, the blue path and proportions are fixed. Previous experimental
logo variants are not valid substitutes.

Where a placement needs an asset the kit does not already contain, it is derived from an existing
approved master by resizing or compositing, never by inventing geometry. The stylesheet is
reference, the approved kit is implementation, and runtime copies under `apps/web/public/brand/`
are deployment artifacts copied from the kit rather than new designs.

## 32. Public sharing is stateless and aggregate-only

M4 needs shareable public results without accounts, a database or cloud history, so sharing is a
self-contained artifact:

- The shareable unit is a versioned `ShareReplaySnapshotV1`, an aggregate-only projection of a
  replay result. It contains the sanitized workload aggregate, the target, coverage dimensions, a
  constraint summary, economics, confidence and the engine/catalog/methodology versions. It cannot
  contain individual usage events, event/session/project hashes, repository names, local paths,
  source file names, prompts, responses, source code or raw import contents. The schema is strict:
  unknown keys are rejected rather than ignored, and a forbidden-field scan guards the boundary.
- The public link is `/s/<token>`, where the token carries the snapshot itself: canonical JSON,
  DEFLATE-compressed, base64url-encoded, prefixed with a version and a truncated SHA-256 checksum
  of the canonical bytes. Deterministic for a given snapshot, corruption-detectable, URL-safe, and
  bounded. No database and no server-side storage are involved.
- Encoding is not encryption. Public share data is public by design, so nothing sensitive may enter
  the token in the first place. The snapshot is the only thing transmitted, ever: share creation
  never sends raw events, and an image or metadata renderer receives only the already-sanitized
  snapshot.
- Share tokens are untrusted input. Decoding validates the version, checksum, byte length,
  decompressed size, JSON shape, depth, string lengths and list sizes before anything is rendered,
  and malformed input fails with a typed error rather than a partial page. Output size is bounded
  while decompressing, so a crafted token cannot become a decompression bomb.
- Creating a share is explicit: the interface shows what will be included and what will never be
  included before the link exists, and nothing is published automatically.

## 33. Launch catalog policy (M4)

The launch catalog publishes sourced facts about real plans and nothing else.

- **Two namespaces, never mixed.** `example-*` is synthetic development data for
  demo workloads, fixtures and tests. Everything else is sourced product data.
  Public pages, the sitemap and the public read model filter the synthetic
  namespace out, so synthetic data is never presented as a real claim. The
  application may show both, labelled.
- **Every claim is sourced and dated.** A provider, model or plan version carries
  at least one source URL with a `checkedAt` date, a `lastVerifiedAt` date and a
  verification state. `verified` means the provider's own page stated it on that
  date. Where two official pages disagree, or a number is derived, the entry says
  so in its own qualitative statements rather than picking a value silently.
- **No number is invented to satisfy a shape.** A limit is recorded numerically
  only when the provider publishes a number *and* a window a replay can simulate
  over. Everything else is recorded as a qualitative limit carrying the
  provider's own wording, and the UI states it as qualitative. A plan version may
  therefore ship with zero numeric limits and only qualitative statements; the
  validator requires at least one limit of either kind.
- **Derived values state their basis.** GitHub AI credits are stored in USD only
  because GitHub documents the conversion rate; the limit label carries the
  conversion so a reader can check it.
- **Missing API pricing is a warning, not an error.** A model rule without a
  `pricingRef` means the catalog has no sourced API list price for that model. The
  replay engine prices only what it has a reference for, so the consequence is a
  result without a list-price equivalent. The validator reports this as a warning
  and the engine ignores warnings, so a subscription catalog does not need to
  invent API prices to be usable.
- **Model availability is recorded at provider level.** Providers publish which
  models a subscription can use per provider, not per plan. Each plan records the
  provider lineup and states that scope explicitly as a qualitative limit, so the
  approximation is visible instead of implied.

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
