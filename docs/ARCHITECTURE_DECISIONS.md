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
- **A sourced number is not automatically a replay limit.** A limit is recorded
  numerically only when the provider documents it as consumption capacity over a
  window a replay can simulate. A figure that belongs to funding, prepayment,
  redemption or purchasing (Anthropic's `$2000` daily usage-credit redemption
  limit and `$2000/month` discounted-bundle purchase cap) is recorded as a sourced
  qualitative fact with a label that says what it is, because simulating it as
  capacity would claim admission behaviour the provider never documented.
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

## 34. Model identity is a declared mapping, not recognition (M4A)

Real workloads carry identifiers the catalog never authored: dotted provider ids
(`gpt-5.6-sol`), vendor-qualified router names (`deepseek/deepseek-v4.1-flash`),
and harness spellings. Identity is established by declaration, never by
similarity.

- **Aliases are catalog facts with their own provenance.** A model may declare an
  `aliases` list; each alias carries the verbatim identifier, a kind
  (`provider_id` for a spelling the model's own provider issues, `harness_alias`
  for a spelling a third party emits), an optional harness scope, its own sources,
  a verification state and a last-verified date. An alias that cannot be sourced
  is not written.
- **Resolution order is fixed and deterministic:** exact canonical id, then
  canonical name (case-insensitive), then a harness-scoped alias for the event's
  harness, then a harness-agnostic alias, then unresolved with a reason
  (`empty`, `unknown`, or `ambiguous`).
- **One implementation, shared.** `createModelIdentityIndex` in
  `@stackreplay/catalog` is used by the adapters and the replay engine alike, so a
  mapping can never differ between the two. The engine resolves with the event's
  harness, which is why harness scoping works on historic exports too.
- **No fuzzy matching, no inference.** No prefix, substring, punctuation
  normalization or provider-crossing inference happens at runtime. Punctuation and
  casing differences are covered only when an alias declares that exact spelling.
- **Ambiguity is an authoring error.** Two models claiming the same alias in the
  same scope, a duplicate alias id, or an alias that shadows another model's
  canonical id or name are catalog validation errors; at runtime a contested
  spelling resolves to unresolved rather than picking a winner.
- **The observed name is never rewritten.** Every event keeps the identifier the
  source reported as `rawName`, and the mapping basis (`canonical_id`,
  `canonical_name`, `alias`) is reported wherever the mapping is explained.

## 35. API pricing is sourced per category, and unknown stays unknown (M4A)

M4A adds a sourced API list-price layer so a replay can report a list-price
equivalent and price credit-pool consumption for models a plan serves.

- **Only documented categories are recorded.** A pricing record carries the rates
  the provider's own documentation states. A category the provider does not
  document is left absent and stays unknown in results; it is never filled with
  another category's rate.
- **A documented shared rate is allowed, an assumed one is not.** If a provider
  states that one rate applies to all input token types, that documented
  semantics may back a `cacheRead` rate, and the record says so. Assuming cache
  reads or reasoning tokens cost what input or output costs, without that
  statement, is forbidden.
- **Pricing never implies subscription availability.** A price record does not add
  a model to any plan's model rules, and API availability is not subscription
  availability. A model can be priced, known, and still unsupported by the target
  plan, which is reported as such.
- **The deferred fallback-pricing question stays deferred.** This work records
  what providers document. It does not implement a less-granular fallback method
  for sources with no detailed token categories, and missing pricing remains a
  warning rather than an error (decisions 15, 16 and 33 apply unchanged).

## 36. One rule per boundary, stated where it is enforced (benchmark audit)

A multi-model audit of the repository produced a finding matrix, and the findings
that survived checking against `origin/main` were fixed with regression tests.
The fixes are not new product behaviour: they make the existing rules hold at the
places where two surfaces have to agree.

- **Plan-version selection lives in one function.** `selectPlanVersionAt` in
  `@stackreplay/catalog` is the rule: `effectiveFrom <= at`, `effectiveTo` absent
  or `>= at`, latest `effectiveFrom` wins. The engine, the public read model and
  the picker all call it. The public read model no longer falls back to the newest
  version when none is in force: a version that starts later is not the version in
  force today, and the page says nothing rather than something false.
- **Warnings travel with the artifact.** An export carries the collection
  warnings, path fields dropped and path-like text redacted, because the artifact
  is what a user hands over and it must say what was uncertain about itself.
- **A share link states its own limits.** `ShareReplaySnapshotV1` marks a
  synthetic `example-` target (`synthetic: true`) and any bounded list it had to
  cut (`truncation`); the public page labels both. Plan terms inside a link are
  the sharer's claim, presented as such, never under the catalog's verification
  language. Source links must be absolute http(s) URLs, validated at the boundary
  rather than trusted at the render.
- **Computed quantities are not input-bounded.** Values the engine computes carry
  the computed decimal envelope; only values that come from the catalog carry the
  input envelope.
- **One unit per count.** A coverage dimension's `unknownCount` is in that
  dimension's unit. A quantity that cannot be expressed in it (the tokens of an
  event that reports no total) is stated in `reason` instead of counted in the
  wrong unit.
- **A ceiling is not a memory promise.** The import ceiling is a refusal point;
  above the comfort threshold the interface says a browser needs several times the
  file size to hold it, and an import that exhausts memory reports memory rather
  than a generic failure.
- **Behavioural claims get a runtime control.** Public pages are served under a
  content security policy whose `connect-src 'self'` is the runtime half of
  "nothing leaves the browser".
- **Aggregates are not exact.** A source row that aggregates many calls reports
  `estimated` usage confidence, so a request-count replay cannot treat it as a
  count of requests. A row that reports no call count at all is an aggregate
  too: it may stand for any number of calls, so it is `estimated` as well, and
  saying so is not optional — an exact request count is a claim only a record
  that stands for one call can make.
- **Identity is a tagged, unambiguous tuple.** A source record's native identity
  is a length-prefixed encoding of a tagged tuple: `(session, record identity)`
  for a record that names a session, `(no-session, record identity)` for one that
  does not. Concatenating an empty session field instead made every session-less
  row of one adapter hash identically, so deduplication dropped all but the first
  of them as exact duplicates and the rest disappeared from the accounting with
  no warning.

## 37. Model identity is factual, model translation is an assumption (M4B)

- Resolution of a raw observed model identifier to a canonical catalog model is a
  mapping over declared catalog facts, and it is classified by how it was
  established: `exact-id` (canonical id or name), `documented-alias` (a provider
  id or harness spelling the catalog sources), `documented-route` (another
  provider's or router's documented route that invokes the same underlying
  model), `unresolved` (no declared evidence). Every non-unresolved kind means
  *the same underlying model*.
- Cross-model translation is a different concept with different provenance: "for
  this scenario, treat demand recorded against model A as demand on model B". It
  is never identity, never an alias, and never proof of equal capability,
  quality, output or token consumption.
- Translation is scenario input, not catalog data. A `ModelTranslationPolicyV1`
  travels with a replay (a user scenario or a synthetic fixture) and is validated
  against the catalog, so a rule can only name models that exist. No real
  cross-family mapping is built into the catalog by M4B.
- The only implemented transform is token-preserving: the recorded token
  quantities are replayed against the substitute model unchanged. Empirical
  tokenizer, output or cache conversion ratios are deliberately absent, and no
  result may imply that N source-model tokens equal N target-model tokens in
  reality.
- Raw identifiers stay preserved in results (`unsupportedModels`, the observed
  model mix), so a later catalog improvement cannot rewrite what was observed.

## 38. Exact Replay and Translated Replay are separate modes (M4B)

- `exact` means no cross-model substitution was applied, including replays whose
  models were reached through a documented alias or route. `translated` means at
  least one explicit substitution was applied.
- The mode classifies the scenario's routing assumption, never completeness. An
  unresolved, unavailable or unsupported portion stays its own disposition and
  reduces claim strength; it is never pushed into `translated`, and never hidden
  behind the mode label.
- A result cannot be read back as something it was not: the serialized block
  carries the applied translation and the policy beside the mode, and the schema
  refuses a translated result with no substitution, an exact result with one, a
  policy without its application, or an application without its policy.
- Outcome dispositions are distinct: `included` (within the target's allowance),
  `overage` (served, but billed above included capacity), `blocked` (rejected or
  deferred by the rules), `unavailable` (the effective model the target did not
  serve, whether or not a translation produced it), `unknown` (evidence
  insufficient). Paid overage is never collapsed
  into blocked. Dispositions are aggregate counts only, so a 100k-event workload
  does not grow the result.
- Wording follows the mode and the evidence, never the other way around. An exact
  replay may state a strong claim for the portion whose identity, pricing, rules
  and temporal evidence are complete ("this recorded workload would have cost $X
  at the target's published rates"). A translated replay's claim stays
  conditional ("under this model translation, the workload is estimated to fit")
  and never implies equal intelligence, task quality, generated text,
  tokenization or tool behaviour. StackReplay replays a recorded demand pattern;
  it does not re-execute prompts, and it does not claim the counterfactual
  literally occurred.

## 39. Replayability classifies target mechanics, never model equivalence (M4B)

- `deterministic`: numeric rules and complete workload quantities and pricing
  permit direct simulation, and no recorded demand was left undecided. `bounded`:
  simulation is possible but at least one input supports a range, or part of the
  demand could not be evaluated at all (unknown consumption, unresolved
  identifiers, unknown or mixed reset behaviour, incomplete pricing).
  `qualitative`: the target states its limits qualitatively, or its numeric rules
  do not apply to this workload, so no numeric fit was simulated.
- Calibration is deliberately not a class. A state no result could legitimately
  carry would be a public claim waiting to be misread, so a future milestone adds
  calibration to the schema and the methodology together with the observed meter
  or invoice evidence that justifies it.
- A model the target simply does not serve is a determined outcome and stays
  compatible with a deterministic reading of its rules; demand the evidence leaves
  undecided is not, because it is incomplete evidence about this workload.
- A sourced or verified catalog entry never implies `deterministic`, and a
  translated replay is not less deterministic in its target mechanics. Its public
  claim stays conditional because the translation itself is an assumption.
- A target that publishes no numeric limit does not get a numeric fit
  percentage: request coverage is reported as unknown with its counts, instead of
  manufacturing precision the evidence does not contain.

## 40. Evidence is a set of dimensions, not a universal confidence score (M4B)

- The authoritative M4B evidence model is a set of independent dimensions, each
  with its own explicit denominator: model resolution, usage categories, pricing,
  rules, temporal coverage, translation method, reset phase and workload scope.
  Event-count coverage and usage-weighted coverage are separate fractions and are
  never interchangeable.
- No single blended score is synthesized. The legacy `confidence` object remains
  for backward compatibility, is not the M4B evidence model, and is not deleted
  or reinterpreted by M4B.
- A dimension that cannot cover its denominator says so with a reason and, where
  useful, the count it excluded. Material unresolved usage prevents a
  full-coverage claim in the dimension itself.
- Aggregates stay bounded: the evidence block carries counts, not one record per
  historical event.

## 41. StackReplay replays a recorded demand stream, within a stated scope (M4B)

- The replay simulates how the target would treat the **recorded historical
  demand stream**. Requests after a hypothetical rejection or substitution remain
  part of that stream. Nothing here models how a person or an agent would have
  changed behaviour, what another model would have generated, or whether it would
  have completed the task.
- Attempted, accepted, overage, blocked, unavailable and unknown demand stay
  distinct in the result.
- Every result states its workload scope. The default is `imported_workload`, and
  its statement says in the result's own words that usage outside the workload is
  not part of the result. `all_observed_local_adapters` says a provider account
  can still contain unobserved usage; `provider_account_total` is recorded as the
  caller's declaration, never as verified coverage. An imported subset is never
  serialized or displayed as whole-account coverage.
- Reset assumptions stay explicit: `rolling` and `fixed-known` are derived from
  the plan version's own documented windows, `not-applicable` when the target
  establishes no numeric allowance, and `fixed-unknown` when a scenario declares
  the account's phase is not established. A plan that mixes rolling and calendar
  windows is also `fixed-unknown`: it is not one known phase, and claiming the
  calendar part alone would silently drop the rolling behaviour. The engine never
  guesses a phase, and reset-phase sensitivity analysis remains deferred work.
- Aggregate target states never speak for rules that disagree. A target whose own
  limits mix overage with rejection reports `overageMode: unknown` rather than
  `enabled`, and the per-limit simulation is what carries the outcome: a summary
  that generalizes from the first matching rule would overstate what the target's
  rules actually do.
- Public disclosure copy states the routing assumption only. The exact-mode note
  says that no cross-model substitution was applied; it never claims that every
  recorded request was served, that the workload was fully covered, or that any
  part of it was correct. Availability is the dispositions' job (the effective
  model, which is the substitute when a translation applied) and undecided demand
  is the evidence dimensions' job. From M4D the copy is projected rather than
  hand-written: `ProjectedReplayV1.modeNote` carries the exact-mode sentence, and
  `headline.statusLabel` carries the verdict, so an interface renders both
  instead of restating them.

## 42. A target is an execution stack, and its provenance is pinned (M4B)

- A target is not just a plan SKU. The result's target stack records the plan and
  provider, the pinned rule instant, the catalog version, the target's declared
  overage behaviour, the reset assumption and the scenario translation policy
  when one applies. Surface ids, region taxonomies and execution-route catalogs
  are deliberately absent: they are not established by anything in this
  repository.
- Provenance stays additive on existing primitives: `versions` gains only a
  pinned `translationPolicy` when a policy was applied, and `rulesAsOf`,
  `catalog` and `targetReference` continue to carry the scenario instant, the
  catalog and the target reference. No second historical/current mode subsystem
  exists.
- Sharing follows the same rule. `ShareReplaySnapshotV1` is unchanged and old
  links keep decoding exactly as they did; a translated replay is refused by the
  share projection, because a V1 link can only be read as an exact replay of the
  target's own models. No successor format was created.

## 43. Backtesting compares reconstructions with stated expectations (M4B)

- The validation layer is fixture based and deterministic: a synthetic list-price
  total, a documented subscription rule's crossings, a resolved identity, a
  replay mode and a set of dispositions are stated by hand and compared with the
  engine's reconstruction through one explicit comparison shape that carries the
  coverage dimensions and the versions used.
- A provider meter or invoice total, when one is ever genuinely observed, is
  recorded beside the reconstruction with an exact decimal delta. It is never
  blended into it, and no case is labelled `calibrated` without that evidence.

## 44. A Direct API target prices the workload instead of admitting it (M4C)

- The execution target is a discriminated union, not a widened subscription
  object: a subscription target carries a plan version, an API target carries a
  provider. The result's target type and its target stack must agree in both
  directions, so a subscription result can never be relabelled as an API result
  or the reverse.
- A Direct API replay simulates no plan: no included capacity, no allowance
  window, no admission decision and no reset. `overage` and `blocked` are always
  zero, `constraints` and `violations` are empty, and the reset-phase question is
  reported as not applicable rather than as unknown or as an assumed phase.
- Provider identity decides availability, and nothing else does. A model is
  offered when the catalog records the selected provider in its `providerIds`;
  when the model's offering is not established at all the event stays undecided
  rather than being called unavailable. The unsupported-model reading is named for
  the kind: `not_supported` when a plan's own rules do not mention the model,
  `not_offered` when a provider is not recorded as offering it.
- Prices are selected per model from the `api_list_price` records in force at the
  pinned instant, and the historical event timestamp still selects conditional
  tiers and schedules inside the selected record, exactly as it does for a plan
  rule. A record that exists but is not in force, or one on another basis, is a
  named gap, never a fallback to the base record or to another model's price. The
  catalog cannot scope a list price to one provider (it enforces one
  non-overlapping record per model and basis), so the price belongs to the model
  while the selected provider decides whether the model is served at all; the
  result states this in its assumptions instead of implying a provider-specific
  price.
- A Direct API result reports a cost only when every event in the workload is both
  served and priced from a record in force. Otherwise no cost is reported at all,
  because a partial sum presented as the target cost would be read as what the
  workload would have cost. No plan price is ever mixed into it: the basis is
  `api_list_price` and the fixed-plan-cost fields are absent.
- Sharing is refused, not coerced. `ShareReplaySnapshotV1` carries a plan id, a
  plan version, a plan name and a plan price, so a Direct API result has no
  faithful reading in a V1 link. The share panel states the refusal where it would
  otherwise offer a link.
- Nothing here is a second replay engine. API semantics are reported through the
  same `semantics` block as subscription replays (mode, dispositions, evidence,
  replayability, model mix, workspace scope); the API path only supplies its own
  facts and its own reading of each evidence dimension.
- An absent `providerIds` list and an empty one are the same statement: the
  catalog does not record which providers offer the model. Both are undecided,
  because reading "nobody offers it" into missing offering data would turn a data
  gap into a decided rejection.
- Only an offered model has a price question, so the temporal dimension counts a
  model the provider does not offer as covered rather than as a record that failed
  to cover it: the dimension reports the record gaps of events whose price was
  actually sought.
- The schema refuses billed overage and blocked demand on a Direct API result,
  because the target has no capacity to exceed and no request to refuse. A later
  milestone that models provider-side capacity has to relax that guard
  deliberately.
- The API-target checks that do not need the `semantics` block run before it is
  consulted. That block is optional so pre-M4B stored documents stay readable, and
  the absence of an optional block cannot be read as an assertion of nothing: a
  plan replay must not become a list-price replay by dropping it.
- Identity, provider applicability and pricing are three separate questions asked
  in that order, and an event whose canonical model is not established never
  reaches the provider question: reporting the offering set as unestablished for
  a name the catalog never resolved would blame the catalog for an identity gap.
  An unresolved model is therefore undecided and `unresolved` in the
  unsupported-model list, with no `model_availability` factor, no
  `target_applicability_unknown` and no `API_MODEL_OFFERING_UNESTABLISHED`
  warning. Consumption knownness follows the event's own token accounting rather
  than its disposition, so an unresolved model with complete telemetry is not
  reported as an unknown-consumption event either.
- A workload with no events has no cost and nothing to warn about. Missing
  coverage is a finding about demand that exists, so an empty workload reports no
  economics and no `API_COST_INCOMPLETE`, rather than a zero total or a warning
  with a count of zero.

## 45. One projection is the display contract for every surface (M4D)

A replay result becomes displayable facts in exactly one place: `projectReplay(result, catalog)` in
`@stackreplay/replay-engine`, which returns a `ProjectedReplayV1`. The homepage instrument, the
application's replay view and any future surface read that type. Surfaces differ in copy and density;
they do not differ in figures, and no surface may compute a headline, a disposition count, an
evidence reading or a cost of its own.

- **Why.** Before M4D each surface derived its own summary from the engine result, so the same replay
  could be presented as a different percentage, a differently-worded outcome or a differently-sourced
  cost on the marketing page and inside the application. The published demonstration also ran outside
  the engine, which meant the site could show a number the engine had never produced. The projection
  removes both possibilities by construction: it is pure, it is unit-tested, and the demonstration
  artifact is generated by running the real engine and the real catalog through it.
- **A missing quantity is never a number.** Every optional field is `undefined` when the engine did
  not establish it, and every formatter returns `undefined` for `undefined`, so a component must
  decide what to say about an unknown. A zero in a ledger cell means the engine established zero.
- **The vocabulary follows the target.** A subscription target reports included, overage, blocked,
  unavailable and unknown; a Direct API target reports served, overage, blocked, priced and unpriced
  with its mechanics marked not applicable, because it has no allowance to exceed and no request it
  can refuse (decision 44).
- **A crossing keeps the target's own behaviour.** A crossing's words follow the rule's declared
  `exceed` and nothing else, so a record-only rule that measures units above capacity bills nothing
  and a quantity alone never makes a window an expense. A crossing whose rule the result does not
  carry is grouped as not established instead of inheriting a default. The kinds, the words and the
  grouping live in one tested place (`apps/web/components/instrument/constraint-behaviour.ts`),
  including their mutual exclusivity, so a timeline band cannot be described as a different behaviour
  than the constraint rows show.
- **A missing total is not a lower bound.** `targetCostEstablished` and `consumptionEstablished` are
  separate facts, and consumption completeness is read from the engine's own usage-categories
  evidence, never from anything else the projection can see. A constraint list is not evidence about
  consumption: a Direct API target has no constraints by construction, so an empty constraint list
  would otherwise read as a complete accounting of what was consumed. A subscription's plan price is
  established as soon as the engine reports it, however much demand stayed undecided; anything metered
  by consumption (a plan's overage, or a Direct API's list price across the workload) is established
  only when consumption and pricing are both established, and until then no total is shown at all:
  never `$0`, never a subtotal presented as a total, and never a lower bound, because the engine
  established no bound. The sentence an interface prints for the total comes from `costReading`, and
  the count of events whose consumption the engine could not establish comes from
  `indeterminateConsumptionEvents` with the engine's own reason beside it.
- **A service outcome carries service words.** A disposition's note says what the target did with the
  demand and nothing about money: being served does not mean being priced. A Direct API row reads that
  the provider serves the model, with priceability in its own facts, and billing appears in a
  disposition only where the engine's own disposition is billing (a subscription's overage), which is
  a statement about the rule rather than an inference from a served event.
- **A missing mode is not Exact.** `modeLabel` and `modeMicroLabel` own the mode words for every
  surface, and a result carrying no mode reads as not recorded. Defaulting to "Exact replay" would
  label a result with the one thing it certainly did not establish.
- **An in-flight replay is dropped, and the drop is proven rather than timed.** One guard per surface
  tags each run, and every invalidation funnels through a single `dropResult()`, so a target changed
  while a replay is running cannot be overwritten by the answer to the previous one. The end-to-end
  proof holds that run's own request at the Worker boundary, changes the selection, delivers the
  answer and waits for the delivery, so the assertion tests the refusal rather than the machine's
  speed.
- **No display value is re-derived from data the engine already decided.** The money an interface shows
  is the engine's `economics`. The projection does not select rates from the catalog, apply them to the
  workload's aggregated token buckets, or derive a price gap of its own, and its own
  `ProjectionCatalogV1` carries names and nothing else, so no rate is reachable from it. A token
  category is a quantity with no rate and no money beside it: a second pricing pass over aggregated
  buckets is a second pricing engine, and the two could disagree about the same workload.
- **Serving and pricing are separate questions.** `ProjectedPriceabilityV1` carries the engine's own
  pricing evidence (how many events it could price, and its own reason for the rest) beside the service
  outcome, and neither is inferred from the other: a served event is not thereby a priced event, and a
  model the target does not offer stays in the service outcome where the engine put it rather than
  being recast as a pricing gap.
- **Absence stays absent.** `knownTokens` is absent when the engine established no bucket at all (an
  empty `tokenTotals` is an unknown total, not a total of zero); a disposition count is absent when the
  result carries no dispositions; `mode`, `replayability.class` and every outcome count are absent
  instead of being defaulted to `exact`, `bounded` or zero; and `evidenceEstablished` records whether
  the evidence ledger exists at all, so an empty ledger cannot read as a clean one. `workload.complete`,
  `workload.unresolvedEventCount` and `provenance.workloadScopeKind` are absent when the result carries
  no usage evidence, no model mix and no scope, and each surface says that the fact was not recorded
  rather than filling in the value the surrounding demo happens to have.
- **An observed identity is only an observed identity.** A raw spelling is reported when the engine
  recorded one, which is the unresolved case. A resolved model is reported by its catalog id, and a
  catalog alias is never presented as something a source wrote.
- **A result belongs to the selection it was computed for.** The application tags each replay with a
  run token (`apps/web/lib/run-guard.ts`) and drops any response whose selection has changed, including
  a run still in flight when the target changes, so a result is never displayed under labels it was not
  computed for.
- **Provenance is quoted, not re-derived.** The reset phase, the workload scope kind, the synthetic
  identifier check and the translation terms come from the engine's own evidence rather than being
  recomputed by the interface.
- **The displayed cost basis follows the target.** When the engine reports no basis, a metered target
  is not labelled with a plan price and a plan is not labelled as list pricing.
- **One signature verdict, projected.** The projection carries the engine's feasibility status as a
  `status` and its display word as `statusLabel`, so a surface does not write its own summary of the
  same outcome counts. Where a surface keeps detail the projection does not carry (the day-by-day
  timeline, the engine's warning strings, or the per-model records the projection reports only as the
  `unavailable` count), that detail is engine output read directly, and it is placed under the result
  as secondary detail rather than given its own summary.

See also: `docs/PUBLIC_SITE.md`, which records the narrative the projection drives and how the
demonstration artifact is generated and kept current.

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

## 46. Candidate intelligence remains outside accepted catalog truth (M4H-B)

- `@stackreplay/catalog/intelligence` is a separate export. Accepted catalog loaders enumerate only provider, model, plan, and pricing YAML, and the bundled snapshot contains only accepted catalog data. Candidate status, including `accepted`, is review metadata and has no automatic path into those loaders, Replay, public pages, target selection, or the changelog.
- A registered source names which claim kinds and evidence classes it may support. Provider-owned published statements, empirical observations, archives, and community material are distinct. Extractor provenance never upgrades evidence authority. Missing normalized fields and effective dates stay missing, with specific deterministic findings.
- Candidate identity hashes the versioned semantic artifact: source ID and URL, publication date, snapshots, typed claim/value, previous accepted reference, proposed effective date and evidence, evidence class, short evidence, and extraction method. Review decisions and repeated observation time do not change identity. Candidate calendar windows preserve an unknown timezone rather than inheriting the accepted catalog's UTC default. Snapshot storage, watching, historical evidence review, and explicit reviewed catalog edits are later work.

## 47. The workload is understood before it is replayed (M4I product correction)

- The imported workload has standalone value. `apps/web/lib/workload-profile.ts` derives a profile from the normalized events only, never by rescanning source files: chronology, weekday × hour rhythm, peak windows, projects, canonical model mix, token composition, sessions and a few deterministic insights. There is no score. Every figure is a count, sum, median or maximum, and every insight is a direct reading of one of them.
- Token magnitude is the engine's disjoint-bucket total (`tokenAccountingOf`). An event with incomplete categories counts as an event and as unknown usage, never toward a token total.
- Peak rolling windows use the engine's own `sliceRollingWindows` (anchored at first use), exported for this purpose, so a "peak five hours" is the window a five-hour limit would have seen. Days and weeks use `sliceCalendarWindows` in the viewer's IANA timezone, which the profile names. Clock positions are read in that timezone, not in UTC.
- Project labels are local display data. The browser intake observes each salted project hash together with its raw key (`CollectOptions.onProjectKey`), keeps only a path-free basename label (parent folder appended with ` · ` on a collision), and stores it on the local import record. The label never enters the portable export, a share link, a URL or a request. A workload loaded from a portable file has numbered projects and says why.

## 48. Translated Replay is a user-built scenario, reached from the exact dead end (M4I)

- When a target does not run the recorded models, the Replay surface says so before running and offers to configure a translated replay. Rows are canonical source models (aliases grouped). Options are only the models the selected target runs: a plan's non-excluded model rules, or the models a Direct API provider is recorded as offering, with unpriced ones marked. Nothing is pre-mapped, ranked or called equivalent. "Send every unavailable model to" is a user-chosen convenience, not a default.
- The resulting `ModelTranslationPolicyV1` has provenance `user` and the `token-preserving` transform. Every surface states that target models are scenario substitutions and that recorded usage magnitude is preserved while actual target-model token use could differ. Chronology, sessions and bursts are replayed as recorded. A translated result still cannot become a V1 share link.
- Unresolved identifiers cannot be mapped, because a policy names canonical models only. They stay unknown.

## 49. An explicit resolved-only scope, never a partial subtotal (M4I)

- Decision 44's rule stands: the engine publishes no Direct API total for a workload with events it cannot price, and no coverage total with undecidable events. The person may instead choose to leave out the events whose model identity is unresolved (`splitByIdentity`, the engine's own identity rule). The engine then replays a smaller workload that is complete on its own terms. The result states the scope and the excluded count, and the share panel refuses a link because V1 cannot state that scope.

## 50. A crossing records when the allowance ran out (M4I)

- `ReplayViolationV1.exceededAt` (optional, additive) is the instant of the first event whose attempted demand took the window past its included capacity. It is evaluated with the same comparison that later records the violation. It turns "this month crossed" into the day and time the included allowance ran out, which is the timing answer a monthly total cannot give. Share snapshots continue to copy violation fields explicitly with date-only precision, so the instant does not enter a link.

## 51. The homepage replays an anonymized real workload against real targets (launch polish)

- The public hero no longer uses the synthetic `example-` namespace. `apps/web/scripts/build-hero-fixture.mjs` replays a portable export of a real local history (the owner's Codex sessions, Aug 21 to Sep 23 UTC) with the production engine against real catalog targets and writes `apps/web/lib/generated/hero-workload.json`. The export itself never enters the repository.
- The fixture keeps aggregates only: counts, UTC calendar-day totals, canonical model names and the engine's own result figures. Session, project and event hashes, raw model spellings, paths and anything finer than a day are dropped; the generator refuses to write a file that still carries one, and `hero-workload.test.ts` checks the committed file the same way. It is labelled "Anonymized real workload" and never presented as the visitor's own history.
- Every target uses the explicit resolved-only scope (decision 49), so each result is complete on its own terms, and the page states how many events with unrecognized model IDs were left out. The Claude target is a translated replay with a built-in, stated scenario policy. The test checks each target's plan version, price and allowance against the catalog at the fixture's rules date, so a catalog change that makes the fixture stale fails the build.
- The hero draws; it never computes. Its choreography is finite (about 1.9 s), reruns on every target change, waits until the execution object is on screen, and renders the settled state at once under reduced motion.

## 52. Model records say what kind of record they are (launch polish)

- `modelV1Schema` gains optional `kind` (`release` or `family`; absent means release), `familyId`, `lifecycle` (`current` or `legacy`; absent means not recorded, never shown as current) and `developerId`. The developer is a separate fact from `providerIds`, which remain the routes where a model is available; the developer is never inferred from the first route.
- Family records (the Claude Code aliases `opus`, `sonnet`, `haiku`, `fable`) stay resolvable and stay referenced by plan rules exactly as before. Identity resolution and replay results are unchanged. The public model library leads with current releases; legacy releases and family names have their own views and remain searchable.

## 53. A local scan is drawn as an instrument over real running totals (launch polish)

- `BrowserIntakeProgress` adds content-free running totals: events per catalog model id, the project count, and the three busiest projects by local label. The Worker forwards them in `PROGRESS.scan`, with catalog display names. Labels are the same path-free local labels as decision 47 and never leave the browser.
- The scan instrument shows only these totals and files read over files selected, the one real fraction a scan has. There is no invented percentage. Portable-file and demo imports report stages only and show no readings.
- Every source card opens the `webkitdirectory` folder chooser, and the page says before it opens that the browser's confirmation may describe sending files although they are read locally. An earlier build used Chromium's directory-access picker for its "view files" wording and remembered handles, but Chromium treats a symlink as nonexistent even after the user selects it, so a linked `~/.claude/projects` failed with `NotFoundError` every time. The chooser follows links and works in every browser. The cost is that a folder cannot stay connected: a newer scan means choosing the folder again. Clearing local data still deletes the handle database an earlier build may have written.

## 54. Paid access outside the included usage is recorded, not inferred (RC1)

- `modelRuleV1Schema` gains optional `access: "usage_credits"`, valid only on an excluded rule. It records that the provider lets subscribers run the model by paying with usage credits even though the plan's included usage does not cover it. Claude Pro's Fable 5 and 5.1 are the case: Anthropic's plan help says they are outside Pro's usage limits and available with usage credits.
- Replay is unchanged. The model is still excluded from the replayed allowance, so its events stay unavailable and are never priced as overage. Plan facts, public Compare and the Replay reading say "usage credits only" and name the paid route instead of implying the model cannot be used.

## 55. History discovery probes registered locations in a dropped folder (history discovery)

- Browsers cannot hand a page the user's home folder through a button. Chromium's directory-access picker blocks the home or profile folder itself on every OS (`ChromeFileSystemAccessPermissionContext` lists `DIR_HOME` as blocked for sharing, and `~/.config`, `~/Library` and `%APPDATA%`/`%LOCALAPPDATA%` for all children). Firefox and Safari have no directory-handle picker. A `webkitdirectory` chooser on the home folder would list every file in it before the page sees anything, which breaks the no-crawl rule.
- Discovery therefore takes a dropped folder through the File and Directory Entries API. A dropped entry is not refused and is not listed up front: the page asks it for one named child at a time. Chromium hides symbolic links through this API (the same `LocalFileUtil` rule as the picker), so a linked history folder is reported as "additional access required" and goes to the `webkitdirectory` chooser, which follows links. The per-source chooser (decision 53) stays the manual, keyboard and touch path.
- Each adapter owns its locations in `packages/adapters/src/adapters/<id>.discovery.ts`: path components below the home or profile folder, the platforms whose documentation or code establishes them, installation markers, an inventory bound, and evidence links. `DISCOVERY_REGISTRY` lists them in order; the CLI roots for Claude Code, Codex and Command Code are derived from the same entries. The browser platform is a hint for ordering only: every registered location is tried under whatever folder is dropped, so a WSL home or a tool folder such as `.claude` works too.
- A supplied folder is identified, not assumed to be home, and only from its own name and exact child names: nothing is listed until a supported history folder has been positively identified. Adapters register root signatures: exact child names that identify a tool root or store under any name. Names another tool also writes (`projects`, `sessions`, `history.jsonl`, `config.toml`) need a name only that tool writes beside them (`shell-snapshots` for Claude Code, `session_index.jsonl` for Codex). A bare history folder named only `projects` or `sessions` is never listed to find out whose it is; its tools are reported as needing additional access and go through the folder chooser. An earlier version listed such a folder and a few of its subfolders to judge file names, which read an unidentified folder's contents and took a year-sorted archive for Codex. Folders from the folder chooser go through the same recognition over the chooser's file list.
- Discovery never lists the dropped folder or any folder on the way to a location. It lists only inside a positively identified history folder, bounded by the adapter's depth and extension, and takes file sizes from the File the browser hands over without reading it. A privacy contract test checks every probe against `registeredProbePaths()` and every listing against the found folders, in unit tests and against Chromium's real entries, including an unrelated `projects` folder that must never be listed.
- A discovered file the browser no longer hands over when the build starts is sent to the scan as an unavailable file and reported as unreadable, so the workload is marked partial and its totals are what was read.
- Discovery is not import. The user picks from the found histories and presses Build my workload; only then are the selected files handed to the Worker, each tagged with its history id so the scan instrument can show per-history files read and events. `intakeBrowserCandidates` takes an abort signal, so Cancel scan stops between files and saves nothing, without touching saved workloads.
- The browser keeps no folder access between visits. The page remembers only which tools were built (names, never paths) in `localStorage` and offers Refresh all, which asks for the folder again. Clear all local data forgets them.

## 56. Local import reads each history once where it can, and hashes natively (import performance)

- Measured before changing anything: V8 CPU profiles of the shared intake in Node and Chromium traces of the Worker, over synthetic histories and a snapshot of a real 3.5 GB Claude Code, Codex and Command Code history. The time went to a pure-JavaScript SHA-256 of every selected byte (used only to recognize the same file selected twice; up to 74% of the Worker in Chromium), a line splitter that searched and sliced the whole pending text again for every chunk (quadratic in line length; 64% of CPU on the real history, whose tool output makes multi-megabyte lines), and three reads per file (an 8 MiB detection peek, the signature pass, the parse pass).
- The splitter searches each decoded chunk once. The file signature is WebCrypto SHA-256 over fixed 8 MiB blocks; it is compared only within one scan and never stored. A streamed file is signed only when another selected streamed file has its size, because identical bytes need identical sizes; any file read as text keeps every file signed, since a decoded-text signature does not follow byte size. A file no larger than the peek is parsed from the peek instead of being read again. Session and project identities are derived once per collect call with a pre-keyed HMAC clone, byte for byte the same. Progress is posted at most every 100 ms and always at the end. The next file's detection read starts while the current file is processed (read-ahead 2, chosen against 1, 4 and 8 in Chromium; 8 was slower on the real history).
- Results are unchanged: a digest of the complete intake result (export, outcomes, warnings, duplicate and overlap counts, local project labels) is identical before and after on every benchmark case, including the real snapshot, and the new splitter is tested against the old one across chunk sizes from one byte to a whole file.
- A transaction the browser aborts (an in-memory profile such as Incognito cannot hold about 300,000 events in one value; a full disk) no longer leaves the import waiting on a request that never answers: the scan finishes unsaved, as refused storage was always meant to. A cancelled scan now stops within a chunk of a long file instead of at its end.

## 57. One definition per figure, and every dollar opens to its arithmetic (product trust pass)

A product-success audit found figures that changed meaning between surfaces. Each now has one
definition, computed in one place and presented many ways.

- **Day basis.** A user-facing day is a calendar day in the viewer's IANA timezone. The workload
  profile already read days that way; the Replay timeline bucketed by UTC day, so "busiest day"
  named different dates on the two pages. `buildTimeline` now takes the viewer's timezone
  (`RUN_REPLAY.timeZone`) and crossing bands are placed on the same local days. A plan's calendar
  window keeps its own zone ("calendar month (UTC)") where its boundary is shown.
- **Peak window.** The busiest five-hour window is ranked by calls (events). The heaviest five-hour
  window by tokens is a different window when the rankings disagree, and it is named as such. A
  sentence never takes its start time from one window and its share from another
  (`apps/web/lib/workload-facts.ts`).
- **Output.** Output is the disjoint output bucket. Reasoning is its own bucket and is shown beside
  output, never added into it under the same word.
- **Models.** "Models" are canonical catalog models. Unresolved identifiers are counted separately.
  `ProjectedWorkloadV1` gains `resolvedModelCount` and `unresolvedIdCount`; `modelCount`, which adds
  both, is labelled "model identities" wherever it is shown (a V1 share link carries only that
  sum).
- **Service outcomes.** Served within allowance, served as overage, not served, undecided. "Would
  have fit" is gone: it described calls that were billed as overage. A plan whose numeric limits
  were never reached because it runs none of the recorded models says exactly that, never that its
  constraints were satisfied.
- **Scope advice is computed, not assumed.** A Direct API replay reports how each event fared
  (`replayWithReceipt(...).priceability`, from the same pass). "Leaving out the unresolved events
  gives a complete priced scope" is shown only when unresolved identity is the one remaining gap.
- **Price receipts.** `replayWithReceipt` returns, beside the unchanged result, the model × category
  arithmetic behind its money: tokens × published rate (× a plan's model multiplier for credit
  demand), collected from the per-event conversion the engine already performs
  (`moneyUnitsForUsage` with `parts`) and only for events the engine counted. It is not a second
  pricing pass over aggregated buckets (decision 45 stands): its exact total equals the engine's
  figure digit for digit, which `receipt.test.ts` holds it to. Rows are shown to the cent by
  largest-remainder apportionment so the column adds to the headline exactly. Money is formatted
  from exact decimal strings everywhere, never through a float.
- **Catalog hygiene.** Synthetic `example-` targets are offered only for synthetic demo workloads.
  Cursor plan names carry the provider ("Cursor Pro"). The translation picker offers concrete
  releases, hides a family alias ("Opus") when a release of that family is available, and marks
  legacy releases.

## 58. A result leads with a verdict composed from the engine's facts (decision-first replay)

A replay result used to open with the engine's state word ("full coverage ruled out", "capacity
not quantified"), so the largest thing on screen was what StackReplay could not say. It now opens
with a verdict: one or two sentences carrying a date, a dollar amount, a count of the person's calls
or a bounded share, then what stays open, each in one sentence.

- **Facts, then words.** `verdictFactsOf` (`apps/web/lib/verdict-facts.ts`) reduces a projection to
  `VerdictFactsV1` (`@stackreplay/share`): outcome counts, crossings, economics, the target's
  capacity kind, the substitution and the scope. `composeVerdict` turns facts into words with fixed
  templates. Nothing is ranked or generated, a count the facts do not carry is never stated, and an
  undecided call is never assigned to an outcome.
- **One derivation.** Replay and Compare both call `verdictOfOutcome` with the worker's outcome, so
  which replay a verdict reads and which scope it states is decided in one place. The period is the
  projection's `windowDays`, which `projectReplay` now counts in the viewer's calendar days when
  given a time zone (decision 57); without one it still counts UTC days.
- **Bounds, not UNKNOWN.** When undecided calls leave a share open, the verdict states both ends
  ("53.0–53.1%") and says how many calls are undecided and why.
- **Resolved-only Direct API price.** When unrecognized model IDs are the only gap in a Direct API
  price, the worker also replays the resolved-only scope (decision 49's `splitByIdentity`) and
  returns it as `resolvedScope` beside the unchanged full result. The verdict then leads with that
  price and names its scope in its first words ("Your 3,168 calls with recognized models are worth
  …"); the figure's caption carries the same scope. The person's own scope choice is not changed,
  the full replay stays the engine reading under Inspect, and no total for the whole workload is
  implied.
- **Exact and Translated stay unmistakable.** A translated verdict opens "Under your model
  substitution", names each substitution, says recorded token amounts carry over unchanged, and
  says nothing here claims the substitute models would do the same work.
- **The engine reading is kept, one step down.** The status word, dispositions, coverage
  dimensions, replayability and evidence moved under Inspect. Nothing was removed.

## 59. Suggestions come from the workload's own coverage, and tool slices are explicit scopes (workload-aware routing)

The suggested routes were fixed: "a plan with a published allowance" was always Copilot Pro, and
the API route was the top model's provider whatever else the workload held. On a mixed history
every suggestion ended in a non-answer.

- **One coverage measure.** `targetCoverages` (`apps/web/lib/routes.ts`) counts, per target, the
  calls on models it runs, with the catalog rule the engine applies (`bundledPlanModelsAt`,
  `bundledApiProviderModels`). `routes.test.ts` holds every count, for every archetype, tool
  slice and public target, to the engine's own served count. Unresolved calls are never assigned.
- **Suggested routes.** `suggestRoutes` offers up to three, each able to answer: a Direct API
  provider that runs and prices every resolved call (of the whole workload, or of the largest
  tool slice one provider covers); the numeric-limit plan that runs the most of the workload, at
  least half of it; and a provider switch framed as a translated scenario. Plans sold per seat to
  organizations are never suggested and sort after individual plans on a tie.
- **Tool slices.** A replay can be scoped to the calls one or more recording tools made
  (`runScopedReplay`, `apps/web/lib/scoped-replay.ts`, the one place scopes are applied). The
  verdict names the slice in its first words, its figure caption and its short form; the reading
  states the scope and omits whole-workload peaks the slice did not send. A share link refuses a
  sliced result until share V2 can state the scope.
- **Current stack.** "What you use today" is a set. Each current target is replayed on the tools
  whose calls it runs at least half of (`stackCoverage`), and tools no current target carries are
  named.
- **Setup order.** Work to replay, then target (ordered by coverage, with the share each runs),
  then substitutions. The rules date and catalog version badges sit under Advanced, and the raw
  identity map under the workload details.

## 60. The workload opens with what it is worth at each maker's own rates, and comparative facts (first-scan value)

The workload page opened with counts and five shares, with no money on it; for a mixed stack the
only money route priced everything at one provider and refused.

- **Published-rate value.** `workloadValue` (`apps/web/lib/workload-value.ts`) groups resolved
  calls by the model's maker (`developerId`) and prices each group with an Exact Direct API
  replay at that maker's own published rates. A group that does not price completely falls back
  to one replay per model. Only complete replays are added, exactly (`addAmounts`); the remainder
  is named with its reason (a token category the maker's price record gives no rate for, no list
  price in force, no recorded maker) and unresolved calls are counted. It equals the sum of
  per-maker replays to the cent, and a single-maker workload equals its own Direct API replay.
  Every placement shows "at published API list prices · not what you paid" beside the figure,
  and "How $X adds up" opens one price receipt per maker.
- **Computed with the profile.** `ANALYZE_WORKLOAD` takes the rules date and the profile carries
  the value, so the workload page, Workload Ready and anything later read one figure.
- **Comparative facts.** The five share-only insights are replaced by facts that state a figure
  against a baseline from the same workload: the busiest day against the median active day, the
  heaviest hour and five-hour window against their medians, the largest session against the
  median session, caching's effect (the receipts' `cacheReadsAtInputRate` against the total),
  project concentration against an even share, and late-night share. Each links to the section
  that shows it. They are ranked by how far the figure is from its baseline; the top three come
  from different families when there are that many. Templates only, nothing generated. The cache
  share is stated once, in the token section.
- **Tool split** is shown beside the value, from the summary's per-tool call counts.
- **What you pay today** is optional and shares Compare's current-stack set. Plan prices are
  pro-rated to the recorded days (price × days × 12 ÷ 365 for a monthly price) with the
  arithmetic shown, and set beside the list-price value as context. No saving is computed
  between two different products.

## 61. Share links carry what a result says, for every kind of result (share V2)

V1 links carried one exact subscription replay as engine state, so Direct API, translated and
scoped replays could not be shared, the public page read like engine output, and every link had
the same generic image.

- **V2 snapshot.** `shareSnapshotV2Schema` (`packages/share/src/v2.ts`) is a union of a replay,
  which carries its `VerdictFactsV1` plus target provenance and versions, and a workload card,
  which carries counts, the tool split, the published-rate value and up to three comparative
  facts. Tokens are `2.<checksum>.<payload>` through the same bounded, checksummed, forbidden-field
  checked path as V1. `decodeAnyShareToken` reads both versions; V1 links render as before.
- **One set of words.** The verdict composer and `composeWorkloadFact` (moved to the share
  package) write the sentences for the application, the public page and the image, so a result
  cannot read one way in the app and another in public. `presentShare` is the one presentation
  the public page, the panel preview and the image render.
- **Privacy at the builder.** `replayShareV2` and `workloadShareV2` (`apps/web/lib/share-v2.ts`)
  are whitelists. Maker and model names are kept only when the catalog knows them; tools are an
  enum of known recording tools, so a label from a hand-edited file becomes "Other tools"; a tool
  slice's label is rebuilt from that enum. The date range, the session count and peak times are
  published only when the sharer ticks them. `share-v2.test.ts` decodes real links and checks
  that project labels, hashes, sessions and times are absent.
- **Per-link image.** `/s/<token>/image` decodes the token and draws the presentation with
  `ImageResponse` (satori), using subsets of Geist embedded in the code so it renders in a Worker.
  A token is content-addressed, so the image is cached as immutable. The page's Open Graph and
  Twitter metadata point at it.
- **Panel.** The preview comes first. Actions: create the link, copy it, download the PNG (drawn
  by the image route from the link's own aggregate data), copy a suggested post that quotes the
  result rather than rewriting it. The long URL waits behind "Show link".

## 62. Undecided demand qualifies only what it could change (independent audit fix-forward)

An independent audit replayed a workload whose one unresolved call carried a billion input tokens.
The verdict stated the recognized calls' run-out and overage as the workload's, and the published-rate
value read "3,199 of 3,200 calls (100.0%)" while leaving out 64% of known demand.

- **Chronology from the engine.** `replayWithReceipt` also reports when each undecided event occurred
  (`undecidedAt`), from the same per-event dispositions the result counts. The result is unchanged.
- **Per run-out, in the facts.** `verdictFactsOf` records, for each run-out date, the undecided calls
  that could have moved it (`undecidedBefore`): any before the first run-out, and for a later
  run-out only those in its own window before it. Replay, Compare, a share link and its image all
  read these facts.
- **Words.** A run-out with undecided calls before it is what the recognized calls alone establish
  ("Recognized calls alone would exhaust … by Aug 29"), followed at once by what the undecided calls
  could change. Undecided calls only after a run-out leave its date exact and qualify the overage.
  A numeric plan never reached says only the recognized calls fit. Nothing is guessed about the
  undecided calls and no upper bound is invented; a tiny undecided subset qualifies a sentence, it
  never turns a result into UNKNOWN.
- **Price scope.** `workloadValue` carries known processed tokens across all calls and in the
  priced ones. `composeValueScope` states the call scope with `partOfWhole`, which never rounds an
  incomplete part to 100%, and, when calls are left out, the share of known processed tokens they
  carry. The token share is a materiality measure, never a share of dollars.

## 63. Short share links store the aggregate share token, and nothing else

A self-contained link (`/s/<token>`, decision 32) carries its whole snapshot in the URL, which made
public links hundreds of characters long. Short links replace them in the product:

- **What is stored.** When the person chooses Create share link, the browser builds the same
  canonical V2 share token a self-contained link carries and sends it, and only it, to
  `POST /api/share`. The server stores `{ version, token, createdAt }` under a 128-bit random id in
  the `SHARE_LINKS` Workers KV namespace, and the link becomes `/s/<22-character id>`. No other
  field exists: raw history, prompts, responses, code, paths, project names and session or call
  records have no place in the V2 schema, and nothing is stored before the person asks.
- **The server trusts nothing it is sent.** The token is decoded with the same bounded,
  checksummed, strict-schema reader the public page uses; forbidden field names are refused; any
  string that looks like a local path or file name is refused; the stored copy is re-encoded from
  the parsed snapshot, so it is the canonical encoding whatever bytes arrived. Requests must be
  same-origin JSON of one token, and creation is rate-limited per client.
- **Reading.** `/s/<id>` and `/s/<id>/image` read the stored token and render it exactly as a
  self-contained link renders. An unknown id is a friendly "does not exist" page. Every earlier
  V1 and V2 self-contained link keeps working unchanged, and if the store cannot be reached when a
  link is created, the panel offers the self-contained link instead.
- **Runtimes.** Production and branch previews use separate KV namespaces (`stackreplay-shares`,
  `stackreplay-shares-preview`). The Node server the end-to-end suite runs keeps links in process
  memory; a Workers deployment without the binding reports short links unavailable rather than
  falling back.
