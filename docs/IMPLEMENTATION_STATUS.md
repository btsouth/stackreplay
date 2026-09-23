# StackReplay Implementation Status

## Current milestone

**Milestone 4E: browser workload intake, implemented in the working tree and pending independent review.**
The locked starting M4D SHA is `a3f6710536f94c18d00b25975db16219a6e38e25`; `main` matched
`origin/main` and hosted CI was green before M4E edits. The browser now accepts selected files,
ZIP archives and folders for verified file-based adapters, using the existing versioned export and
Replay engine. See [workload intake](INGESTION.md) for the exact supported formats and boundaries.
No M4E work has been committed or pushed.

## Milestone 4C — Direct API execution target

The engine now replays a workload against a provider's published API list prices as well as against
a subscription plan, and the result contract says which of the two happened.

**Target kinds are a discriminated union.** `ExecutionTargetV1` is `subscription` (a plan version)
or `api` (a provider). `replaySemanticsV1Schema.targetStack` follows the same split, and the result
schema enforces agreement in both directions: an API target with a subscription stack, or the
reverse, is invalid. Those target-level checks run before the optional `semantics` block is
consulted, because the block is optional so pre-M4B documents stay readable: a plan replay must not
become a list-price replay by dropping it, and that gap is covered by tests that assert the checks
fire without the block. The schema also refuses billed overage or blocked demand on an API result.
`unsupportedModels[].reason` gained `not_offered` for the API reading, distinct from the subscription
reading `not_supported`, and an empty `providerIds` list reads the same as an absent one: offering
data that is not recorded is undecided, never a decided rejection. Identity is
decided before provider applicability, and never the other way round: an event
whose canonical model could not be established is reported as an unresolved
identity, not as a model whose provider offering the catalog failed to record, and
its consumption is judged on its own token accounting rather than on the fact that
it stayed undecided. Only events whose identity is established can be counted as
unestablished offerings.

**Nothing is simulated that the target does not do.** A Direct API replay has no plan, no included
capacity, no allowance window, no admission decision and no reset: `overage` and `blocked` are always
zero, `constraints` and `violations` are empty, and the reset-phase evidence dimension is
`not_applicable` with the reason stated, never `unknown` and never an assumed phase.

**Availability and price come from the catalog, per model.** A model is served when the selected
provider is recorded in its `providerIds`; a model whose offering is not established stays undecided
rather than being called unavailable. Prices are selected per model from the `api_list_price` records
in force at the pinned instant, and each event's own timestamp still selects conditional tiers and
schedules inside the selected record. A record that exists but is not in force, a record on another
basis, a category the record does not establish and a model with no record are four distinct named
gaps, each with its own warning, rather than a fallback to the base record or to another model's
price. The evidence dimensions only claim gaps they can see: the temporal dimension reports record
gaps for events whose price was actually sought, so a model the provider does not offer is not
reported as pricing the pinned instant failed to cover. The catalog enforces one non-overlapping list-price record per model and basis, so a list
price belongs to the model while the selected provider decides availability; the result states that
in its assumptions instead of implying a provider-scoped price.

**Money is only reported when the whole workload is priced.** `economics.targetCost` with
`costBasis: "api_list_price"` appears when every event is served and priced from a record in force.
Otherwise no cost is reported at all, with an `API_COST_INCOMPLETE` warning, because a partial sum
would be read as what the workload would have cost. An empty workload is not incomplete demand: it
reports no cost and no warning, since there is nothing unserved or unpriced to report. No plan price is ever mixed in: `basePlanCost`
and `overageCost` are absent, and the schema refuses an `api_list_price` cost that carries either.

**Every surface is honest about the target it replayed.** The engine's evidence dimensions, the CLI
summary (`--target api --provider <id>`, plus `plans --providers`), the browser-free release's replay
surface (target-kind switch, provider picker with list-price coverage, API wording for dispositions,
an explicit "no allowance constraints" card and an activity timeline rather than failure windows),
and the public methodology page all describe an API replay as a priced workload with no plan. The
share panel refuses a Direct API result rather than coercing it: `ShareReplaySnapshotV1` carries a
plan id, a plan version, a plan name and a plan price, so the link has no faithful reading for it.

**The subscription path is unchanged.** `packages/replay-engine/src/semantics.ts` now shares its
reporting primitives with the API path through `reporting.ts` (tracker, coverage builder, feasibility,
workload summary, unsupported-model collection, warnings), and the only golden-fixture difference is
`versions.methodology`, which is bumped to 1.4.0 because coverage and economics semantics changed.

**Evidence.** 685 unit tests (schema 71, catalog 65, share 37, ui 15, web 70, replay-engine 247, cli
36, adapters 144) and 186 browser tests pass; typecheck, lint and the contrast check are clean; the
100,000-event benchmark adds a Direct API case at 544.7-581.5 ms (median 550.0 ms, about 182,000
events/second, every event priced) beside subscription cases that stay in the 824.8-986.6 ms range
they showed before this milestone. Runs vary by roughly ten percent between machines and invocations;
the point is the new path is not slower than the one that was already there.

## Milestone 4B — replay semantics and model translation

Two concepts that must never be confused are now separate in the schema, the engine and every
surface that displays a result: **model identity resolution** (factual: these identifiers name the
same underlying model) and **cross-model translation** (an explicit counterfactual scenario
assumption).

**Resolution kinds are explicit.** `modelResolutionKindOf` classifies an identity as `exact-id`,
`documented-alias`, `documented-route` or `unresolved`, and the catalog may now declare a
`provider_route` alias for another provider's or router's documented route to the same model. Every
non-unresolved kind still means the same underlying model, so an alias or a route keeps a replay
`exact`; only an explicit substitution makes it `translated`.

**Translation is scenario data.** `ModelTranslationPolicyV1` travels with a replay (user scenario or
synthetic fixture), is validated against the catalog, and is never built into the catalog: M4B adds
zero real cross-family mappings, zero empirical conversion ratios and zero model equivalences. The
only transform is token-preserving, labelled as an assumption in the result's assumptions, in the
evidence block and in the result's own confidence factors.

**Replay modes and dispositions.** `semantics.mode` is `exact` or `translated`, and
`semantics.dispositions` counts included, overage, blocked, unavailable and unknown events, which
sum to the replayed event count exactly. Paid overage is its own outcome and is never counted as
blocked, and an unresolved or unavailable portion is never pushed into `translated`.

**Replayability and evidence.** `semantics.replayability.class` is `deterministic`, `bounded` or
`qualitative` in every result M4B can produce, and the schema declares no other class. Calibration
belongs to a future milestone that can add it together with observed meter or invoice evidence,
rather than a state a result could wear for free. `bounded` also covers demand the evidence leaves
undecided: an unresolved identifier is incomplete evidence about this workload, while a model the
target simply does not serve is a determined outcome and stays compatible with `deterministic`.
`semantics.evidence` carries independent dimensions with explicit
denominators: model resolution, usage categories, pricing, rules, temporal coverage, translation
method, reset phase. There is no single blended score; a target that publishes no numeric limit gets
`unknown` request coverage instead of a fabricated fit percentage.

**Target stack, scope and reset.** `semantics.targetStack` records the plan, provider, pinned rule
instant, catalog version, declared overage behaviour, reset assumption and the scenario policy when
one applies. `semantics.workloadScope` states what the replay covers in engine-authored wording, so
an imported subset is never described as whole-account coverage. A scenario may declare a reset
phase unknown, which weakens the result rather than guessing a phase; reset-phase sensitivity
analysis remains deferred.

**Sharing and backtesting.** `ShareReplaySnapshotV1` is unchanged and old links keep decoding
exactly as before; a translated replay is refused by the share projection rather than serialized
through a format that can only be read as exact. A deterministic fixture-based validation layer
compares reconstructions (list price, limit crossings, identity, mode, dispositions) with stated
expectations and leaves room for a genuine meter or invoice observation beside them.

## Milestone 4A — model identity and sourced API pricing

Two capabilities, both data-driven and both bounded by what providers actually publish.

**Model identity is declared, not recognized.** Real workloads carry identifiers the catalog never
authored: dotted provider ids (`gpt-5.6-sol`), vendor-qualified router ids
(`deepseek/deepseek-v4.1-flash`), and bare forms a local harness emits (`deepseek-v4.1-flash`). A
model can now declare `aliases`, each with its own kind, optional harness scope, sources and
verification state, and one shared resolver (`createModelIdentityIndex`) is used by the adapters and
the replay engine alike. Resolution is exact id, then canonical name, then a declared alias, then
unresolved with a reason. There is no fuzzy matching, no prefix or substring matching and no provider
inference. The catalog carries 39 aliases: 33 verified (the provider's own documented id, or a slug
OpenRouter publishes in its models API) and 6 estimated (a router slug with the author prefix dropped,
which the router does not itself publish as an identifier; the estimated aliases are scoped to the
harnesses that emit them, so two slugs observed by three harnesses are six aliases).

**Sourced API list pricing.** 24 models carry sourced pricing records, each recording
only the categories the provider documents: input and output always, cache reads and cache writes
where published. OpenAI and Google document reasoning tokens as billed output; Anthropic bills
thinking inside output; DeepSeek and Z.ai do not document the category at all, so it is absent from
their records and stays unknown in results. Promotional standing is recorded in the source titles
(GPT-5.6 Sol's promotional pricing runs at least through 2026-11-21; the Z.ai and Gemini 3.8 Flash
rates are marked promotional). Pricing never adds a model to a plan: 134 of the 248 plan model rules
now carry a `pricingRef`, and every one of them was a rule the plan already recorded as served.

**Measured effect** on a real 97,031-event export (6 harnesses, 13 platform sources) replayed against
`github-copilot-pro` at `rulesAsOf 2026-09-21`:

| | before M4A | after M4A |
|---|---|---|
| requests coverage | unknown | known, 82.72% |
| feasibility | unknown | partial |
| credit-pool consumption | unknown (0 recorded) | exceeded: $18,200.73 consumed against a $15.00 allowance |
| economics | absent (`ECONOMICS_UNKNOWN`, `PRICING_MISSING`) | base $10.00, target cost $18,180.73, overage $18,170.73 |
| unresolved models | 33,442 events | 153 events |

The remaining unknowns are honest ones: usage coverage stays unknown because 16 events do not report
every canonical token category, models coverage stays unknown because 153 events use identifiers no
source justifies, and `MODEL_UNRESOLVED` remains the only warning. Confidence stays low because the
replay answers a counterfactual over a window the plan's rules only partly cover.

## Milestone 4 — public site, launch catalog, sharing

Three deliverables, one of which is data rather than code.

**Sourced launch catalog.** The catalog now carries 7 providers, 19 plans and 48 models of real
product data, alongside the synthetic `example-` development set that demo workloads, fixtures and
tests use. Every real entry carries at least one source URL with a `checkedAt` date, a
`lastVerifiedAt` date and a verification state; the public read model and the sitemap filter the
synthetic namespace out, so synthetic data is never published as a real claim.

Only facts a provider publishes were recorded. Numeric limits exist only where a provider states a
number *and* a window a replay can simulate over: 5 numeric limits across 5 plans, all GitHub Copilot
(AI credits on Pro, Pro+, Business and Enterprise, plus Copilot Free inline-suggestion completions).
Anthropic's `$2000` daily figure belongs to the usage-credit funding flow, not to simulated workload
capacity, so it is recorded qualitatively on Pro, Max 5x and Max 20x rather than as a replay limit;
the `$2000/month` discounted-bundle cap is a billing rule and is recorded the same way.
Everything else the providers state without a number ("5x more usage", "significantly more included
usage", "generous limits", "unlimited") is recorded as a qualitative limit carrying the provider's
own wording, and the interface states it as qualitative. No number was invented to fill a shape, and
the catalog validator now requires at least one limit of either kind rather than at least one numeric
limit.

**Public site.** `/`, `/plans`, `/plans/[planId]`, `/models`, `/models/[modelId]`, `/compare`,
`/methodology`, `/changelog` are server-rendered from the same bundled catalog snapshot the
application replays against, so a public page cannot describe a plan differently from the plan a
replay would use. Every plan, model and provider page shows its sources, verification state and
last-checked date. `/changelog` is derived deterministically from the catalog's own version history.
Metadata always describes the canonical production origin (`https://stackreplay.com`, overridable
through `NEXT_PUBLIC_SITE_URL`), never localhost; `robots.txt` keeps `/app` out of search results and
the sitemap lists public pages plus catalogued plans and models.

**Sharing.** A share link is `/s/<token>` where the token carries the entire result:
`<version>.<checksum>.<base64url(deflate(canonical JSON))>`. No database, no account, no server copy.
`ShareReplaySnapshotV1` is a strict aggregate-only schema, `FORBIDDEN_SHARE_KEYS` scans for fields
that must never be public independently of the schema, and the projection from a replay result
(`apps/web/lib/share-snapshot.ts`) is a whitelist that names every field it copies, so a field added
to the result later cannot leak by default. Decoding treats a token as hostile input: version,
checksum, token length, decompressed size, JSON depth, string length and list sizes are all bounded,
and a failed checksum is refused rather than rendered. The sharer chooses whether the aggregate date
range, the session count and the per-source breakdown are included; all three are off by default.

**Brand.** The approved kit is the source of truth; the application serves a runtime subset copied to
`apps/web/public/brand` (navbar and footer lockups in both themes, favicon set, Apple touch icon, PWA
icons, social card, mark) and never the masters or internal reference sheets. `apps/web/lib/site.ts`
is the single place that names those paths, and the UI package receives them as props.

Full structure, data flow and testing notes: `docs/PUBLIC_SITE.md`. Decisions 30 to 33 in
`docs/ARCHITECTURE_DECISIONS.md` record local-first-not-local-only, the brand rule, the share
architecture and the catalog policy.

### M4A pricing remediation (2026-09-22)

The M4A pricing layer was rebuilt around sourced rate sets: the numbers one provider publishes for
one model on one billing basis. 41 pricing records cover the 24 models on two bases (`api_list_price`
and GitHub's target billing for the Copilot plans), and the schema now validates the relationships
between categories rather than trusting flat numbers.

- **Billing equivalences replace fallbacks.** `reasoning` is priced through an explicit, sourced
  `billedAs` relationship where the provider documents one: Anthropic ("Tokens Claude uses while
  thinking (billed as output tokens)"), OpenAI ("billed as output tokens"), Google ("Output price
  (including thinking tokens)"), GitHub ("output tokens (what the model generates)"). DeepSeek and
  Z.ai publish no such relationship, so reasoning stays absent from their records and unknown in
  results, never guessed at an output rate.
- **Published rates changed by tiers are now recorded.** DeepSeek's peak schedule (01:00-04:00 and
  06:00-10:00 UTC, Monday-Friday, excluding Chinese public holidays) is a conditional tier over the
  documented off-peak base. The long-context tiers are recorded at their published thresholds:
  >272K input (2x input and cache rates, 1.5x output, for the full request) and >200K for
  GPT-5.6 Luna at GitHub; Google's Gemini 3.1 Pro >200k tier and the Gemini 3.8 Flash rates valid
  through 2026-12-31 with the 2027 rates behind `effectiveTo`.
- **Exact published decimals.** The ingestion's two-decimal formatter had flattened published rates
  ($0.075 became `0.07`); every rate now carries the decimal string the provider prints (`0.075`,
  `0.175`, `0.025`, `0.003`, `0.006`), and one-decimal rows stay one-decimal (Z.ai `1.4`/`4.4`,
  DeepSeek `0.3`/`0.6`/`1.2`). Money is computed at full precision and rounded only when displayed.
- **Alias provenance scope.** The estimated bare-router aliases now carry exactly the scope their
  evidence supports: `deepseek-v4.1-flash` and `glm-5.3-flash` are scoped to the observing harnesses
  (`t3-code`, `opencode`, `hermes`); `glm-5.3` and `claude-opus-4.8` were removed where no source
  supports the bare form. Verified prefix aliases cite the exact router model record.

**Corrected measurement** (the real 97,031-event export against `github-copilot-pro` at
`rulesAsOf 2026-09-21`, production engine, target billing records): credit-pool consumption
**$18,200.728869** ($18,200.73 presented), overage $18,170.728869, target cost $18,180.728869
against the $10.00 base. The corrected pricing path reproduces the M4A figures to the cent, so
$18,200.73 stands as an accepted measurement. Unresolved models remain exactly 153 events across
the same ten spellings. The credit-pool constraint reports 0 indeterminate events (feasibility
`partial` on request coverage: 82.72%), and no reasoning or cache category stays unknown for any
model the Copilot plans serve: 11,292 events consume reasoning on DeepSeek/Z.ai models where no
billing relationship is documented, those stay unknown and outside the served set, and 16 events
reporting no complete token accounting keep usage coverage unknown.

### Benchmark-audit remediation (2026-09-22)

A six-model benchmark produced a finding matrix (38 findings, one of them verified as a false
positive) against a frozen revision two commits behind `origin/main`. Each finding was re-checked
against the current tree, and the 37 that were still present were fixed in severity order, starting
with the identity collision that discarded most Hermes tokens (critical), the ccusage aggregate
double-count (high) and the export that dropped every collection warning (high). Decision 36 records
the rules these fixes establish.

- **Hermes adapter identity.** The adapter keyed events on `(session, model)` while the source table
  is keyed on `(session, model, billing provider, billing base url, billing mode, task)`, so rows that
  collided were dropped as duplicates: roughly 85 percent of Hermes tokens. Identity now covers the
  whole key, and rows that aggregate several calls report estimated usage confidence rather than an
  exact request count.
- **Aggregate imports.** A date-scoped ccusage row is a bucket of work and names no session, so it can
  never be matched against a native scan. Such rows no longer claim a session identity, the pipeline
  reports the double count it cannot resolve instead of hiding it, and each row's own categories are
  checked against the total it publishes (`ACCOUNTING_UNRECONCILED` when they disagree).
- **A session-less row still has an identity of its own.** Dropping the fabricated session left every
  bucket row of one adapter hashing an empty session identity, so all of them shared one native event
  hash and one canonical id and `dedupeEvents` discarded all but the first as exact duplicates:
  distinct rows, silently lost accounting. Native identity is now an unambiguous encoding of a tagged
  tuple, `(session, record identity)` or `(no-session, record identity)`, so distinct bucket rows stay
  distinct and none of them claims a session it does not have.
- **The export says what it is.** Collection warnings now travel in the export with path fields
  dropped and path-like text redacted, so a file handed to someone else states what was uncertain
  about it.
- **One rule per shared boundary.** Plan-version selection lives in `selectPlanVersionAt`
  (`packages/catalog/src/versions.ts`): the engine, the public read model and the picker all call it,
  and a version that starts later is never presented as the version in force.
- **The share boundary.** Source links must be absolute `http(s)` URLs; computed quantities use the
  computed decimal envelope; a cut list carries a `truncation` marker; a synthetic `example-` target is
  marked and labelled as demo data; plan terms in a link are presented as the sharer's claim (decision
  32 extended by decision 36).
- **Browser storage.** Import/delete/clear write both stores in one transaction, mutation requests are
  serialized in the Worker, and the intent to delete or clear is registered before the queue so an
  import that is already running cannot write after it. Delete and clear failures are reported instead
  of swallowed.
- **The Worker client.** Freshness is decided per request channel and before any response shape is
  dispatched, a protocol mismatch names itself instead of looking like a Worker that never started,
  and a request that stops reporting progress fails rather than hanging.
- **Coverage, timeline and copy.** A coverage dimension's `unknownCount` is in that dimension's unit,
  the timeline separates exact token totals from lower bounds and names what each shaded band did to
  the workload, the result panel describes the replay it shows, and the surfaces no longer call the
  catalogue synthetic (decision 36).
- **Runtime control for the privacy claim.** Public pages are served under a content security policy
  (`connect-src 'self'`, `worker-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`) plus
  nosniff, referrer, permissions and cross-origin headers (`apps/web/next.config.ts`).

Every fix carries a regression test: catalog version selection, adapter identity and fixtures, ccusage
accounting, the collection pipeline, the export contract and its collection warnings, the share schema
and projection, browser storage (Playwright), the Worker client and its protocol guards, coverage
units, timeline buckets and the CLI filters.

| Gate | Result |
| --- | --- |
| pnpm check | PASS for every tracked file; the untracked `brand/` mock-up HTML is flagged as before this pass (CI never sees it) |
| pnpm typecheck | PASS: 15 tasks |
| pnpm test | PASS: 532 tests — engine 158, adapters 144, catalog 61, share 37, schema 31, web 56, CLI 30, UI 15 |
| pnpm build | PASS: 8 tasks |
| pnpm --filter @stackreplay/web test:e2e | PASS: 174 passed, 32 skipped, desktop and mobile projects |

### M4D production Replay experience (2026-09-22)

M4D turns the replay from a result document into an instrument, and gives it one display contract. The
engine gained `projectReplay()` (decision 45): a pure function from a replay result plus the catalog
to `ProjectedReplayV1`, which is now the only source of every figure the site and the application
show. The homepage is rebuilt around it, and the application's replay view reads the same type,
produced in its worker from the visitor's own import.

**The demonstration is engine output, not mock data.** `packages/test-fixtures/generated/m4d-demo.json`
is generated by `pnpm --filter @stackreplay/test-fixtures demo`: a deterministic synthetic month
(10,723 events, 335 sessions, 2026-08-21 to 2026-09-20, 214,173,228 known tokens, six sources) is
replayed with the production engine against three catalogued `example-` targets, and the projections
are stored. `apps/web/lib/demo-artifact.test.ts` regenerates the file and fails when it stops matching
the engine's current output, so the marketing surface cannot show a number the engine did not produce.

**What the artifact demonstrates** (engine figures, verbatim):

- **Exact Replay** against the $50 example plan: 8,180 of 10,723 modeled requests fit (76.2846% as the
  request dimension carries it); 2,543 blocked across 3 crossing windows; the `rolling-5h-requests`
  allowance is exceeded while the monthly token allowance (101,641,637) and the large-model credit
  pool (11.6154496) pass; simulated cost $50.00 on `fixed_plan_price_plus_overage`; replayability
  **bounded**, because the account's reset phase is not established and window outcomes are therefore
  modelled rather than exact. **Exact** states one thing and one thing only: no cross-model
  substitution was applied. It is not a claim about how much of the demand the target would serve,
  which the result reports separately as 2,543 blocked requests against 8,180 served.
- **Translated Replay** against the $20 example plan: every event served after the catalog's
  large-model-to-medium substitution under an explicit, token-preserving policy; both credit pools
  pass (26.5471886 consumed against a 25-per-5h and 75-per-7d pool); simulated cost $20.00;
  replayability **deterministic**.
- **Direct API** against the same provider's list prices: no constraints and no crossings, because a
  metered target has no allowance to exceed; $48.75538175 for the month on `api_list_price`;
  replayability **deterministic**.
- **The unknown sample** (488 events, 39 with no resolved identity): the request, usage and model
  dimensions are all unknown, and 109 events are left undecided rather than counted as served. No
  category total is established, so the workload reports no token total at all rather than a total of
  zero. The plan's own $20.00 price is fixed, so it is established and reported as such; the part of
  the cost that would depend on consumption is not, and the result says that separately: consumption
  completeness is read from the engine's own usage evidence (74 events report no complete token
  accounting), not from the constraint list, which an API target does not have at all. This is the
  state the surfaces must render honestly.

**Surfaces.** `/` carries the narrative the projection drives (see `docs/PUBLIC_SITE.md`): the
instrument, the same workload across every catalogued target, workload anatomy, exact versus
translated, constraint forensics, evidence including the partial case, and the cost counterfactual.
`/app/replay` renders one result composition from its worker's projection: the primary result (the
engine's own status word, the request dimension, the three coverage dimensions kept apart), then the
target stack, the constraints with their recorded crossings, the dispositions, the cost basis and the
evidence ledger, and a final detail section (the timeline, the engine's warnings, the per-model
unserved records, the scope and reset disclaimers, and the provenance rows) before the share panel.
The projection carries the headline's `status` and `statusLabel` so the application does not write its
own summary word for the same outcome, and the retired M4 result cards and their helper module
(`apps/web/lib/replay-disclosure.ts`) are gone rather than kept alongside.

**Verification.** 264 engine unit tests (including fourteen projection contract tests), 86 web unit
tests (choreography, formatting, constraint-behaviour wording and grouping, mode words, the run guard,
artifact freshness and product shape), and the Playwright suite across desktop and mobile (including
instrument tests for keyboard-only operation, reduced motion, target-change consistency and horizontal
overflow, and a deterministic in-flight superseded-run test). `pnpm typecheck` 15/15, `biome check`
with no errors, `check:contrast`, and the production build all pass.

**Display-contract audit (2026-09-22, before M4D is treated as audit-ready).** A read-only pass over the
projection boundary found six places where a surface could state something the engine had not
established. Each is now closed by construction and covered by a test:

1. **No derived money.** The projection no longer selects rates from the catalog and applies them to
   the workload's aggregated token buckets: that second pricing pass produced a category breakdown
   totalling roughly $131 beside the engine's own $48.75538175 total. `ProjectedPricingCategoryV1`
   carries quantities only, `ProjectionCatalogV1` carries names only, and the only money on any surface
   is the engine's `economics`.
2. **Served and priced are separate.** `ProjectedPriceabilityV1` carries the engine's own pricing
   evidence (events priced, events it could not price, its reason) beside the service outcome.
   Applicability stays in the service outcome: a model the target does not offer is never recast as a
   pricing gap, and being served never implies being priced.
3. **A missing total is not a lower bound.** `targetCostEstablished` and `consumptionEstablished` are
   separate facts, and `costReading` is the one sentence every surface prints for the total.
4. **A crossing's behaviour is the rule's.** A crossing's words follow the rule's declared `exceed`, so
   a record-only rule that measures units above capacity no longer reads as billed, and `reject_request`
   no longer reads as blocked until a reset. The behaviours, their words and their grouping live in one
   unit-tested module.
5. **An in-flight replay cannot outlive its selection.** Each run carries a token, and a response whose
   selection changed while it ran is dropped (`apps/web/lib/run-guard.ts`): the F026 defect, extended
   from a displayed result to one still in flight.
6. **Absence stays absent.** An unknown token total, a missing disposition count, an absent mode,
   replayability class, resolution count, completeness flag or workload scope, and a result that
   carries no semantics at all are reported as not established instead of as `0`, `exact` or `bounded`.
7. **A service outcome carries service words.** Dispositions describe what the target did with the
   demand; being served never implies being priced, and priceability stays in the pricing facts.

**Follow-up pass on the same audit (2026-09-22).** A second read-only pass found six more places where a
surface could state something the engine had not established, all now closed by construction and
covered by a failing-first test:

1. **Consumption completeness no longer comes from the constraint list.** `consumptionEstablished` and
   `workload.complete` are read from the engine's usage-categories evidence. A Direct API workload with
   incomplete accounting and no constraints now reports consumption and its cost as not established
   (it previously reported both as established, because nothing had contradicted them). For the
   unknown sample this changes the count as well as its source: 74 events rather than 70, since the
   constraint-derived number measured a different denominator.
2. **No total is described as a bound.** When the engine establishes no total, the surfaces print
   `not determinable` with the engine's reason. The counterfactual no longer offers a partial spend
   subtotal, its ratio rows or its burn-rate equivalent under a sentence that presents them as the
   target cost, and no surface says `lower bound`.
3. **A metered total needs a complete pricing dimension too.** An incomplete list-price pass leaves the
   Direct API total unestablished even when consumption is complete, which the pricing evidence and its
   own reason are shown for.
4. **A crossing with no matching rule keeps its own group.** The timeline groups violations by
   behaviour, and a window whose rule the result does not carry is reported as not established instead
   of being described with whichever behaviour the panel happens to check first.
5. **Served no longer reads as priced.** The Direct API "served" note states that the provider serves
   the model, and priceability is carried by `ProjectedPriceabilityV1` alone.
6. **The superseded-run test now proves the drop.** It holds the run's own request at the Worker
   boundary, changes the selection, waits for that answer to be delivered to the page and only then
   asserts the surface never moved. With the guard removed the stale result renders and the test fails;
   with the previous clock-based version it passed either way, so it proved nothing.

The same pass corrected two smaller overstatements: a Direct API target in the synthetic `example-`
namespace is now labelled synthetic exactly as a synthetic plan is, and a metered total is described by
the observed window rather than as a "month at list price".

**Known limitations at M4D.** The instrument does not yet run the engine in the browser for the
homepage: the homepage reads the generated artifact, and only `/app/replay` replays a live import.
`ProjectedCrossingV1` carries the window, the observed and included quantities, the events in the
window and the rule's own behaviour, but not the capacity that was available at the crossing instant,
so the crossing detail shows the constraint's declared limit instead; the two numbers can differ inside
a partly consumed rolling window. Pricing is reported at the workload level, because that is the
granularity the engine's pricing evidence carries: the result states how many events could be priced
and why the rest could not, but not which model each of them used, so no per-model price gap is shown.

### Known limitations at M4

- The catalog covers subscription plans and their models plus a sourced API list-price layer (M4A).
  Identifiers a workload emits that no source justifies stay unresolved and are reported with their
  event counts: on a real 97,031-event export replayed against `github-copilot-pro`, 153 events
  (0.16%) remain unresolved, all small tails: `gpt-daybreak-blue-latest` (51), `ox-alpha-free` (33),
  `cline-pass/deepseek-v4.1-flash` (22), `codex-auto-review` (22), `omen-alpha` (15),
  `gpt-5.3-codex-spark` (3), `muse-spark-1.3-contributor` (3), `muse-spark-1.2-contributor` (2),
  `union-alpha` (1), `xiaomi/mimo-v2.6-flash` (1). Left unresolved on purpose, because no official
  source establishes what they are. Another 16,610 events resolve to models the target plan does not
  serve, which the result reports as `not_supported` rather than as an identity failure.
- Credit-pool consumption needs API list prices for the models in a workload, and M4A added them for
  the 24 models real workloads run (Anthropic, OpenAI, DeepSeek, Z.ai and Google), each recorded per
  documented token category with its own source. Plan rules that already served a priced model now
  carry a `pricingRef`, so a subscription replay reports a list-price equivalent and, for credit
  pools, real consumption. The deferred M4A question (fallback pricing when detailed token categories
  are unavailable) stays deferred: undocumented categories are left absent and stay unknown.
- The bundled demo workloads are synthetic and use the `example-` model namespace, so they map onto
  the synthetic demo plans. The replay surface says so when a demo workload is selected instead of
  leaving a visitor to read an unmapped-model result as a failure.
- Model availability is recorded at provider level because providers publish it that way; each plan
  states that scope as a qualitative limit so the approximation is visible.

## Milestone 3 — browser-local replay (accepted)

**Milestone 3 — browser-local replay, implemented, independently audited and accepted.**
Accepted after corrections and two independent reviews: the audit log below records what was
verified, what it found and what changed. The measurement reported in an earlier revision (a
completed ~100k-event import whose follow-up replay never finished) was wrong, and the import path
it described as PARTIAL passes.

The GLM-5.3 Flash review and its follow-up spot-check raised four presentation-only findings, all
fixed and guarded by regression assertions, and concluded the milestone safe to build on:

- Enum values are humanized everywhere they reach the interface, including the engine warning text
  (`latch until reset`, never `latch_until_reset`); `replace` was only substituting the first
  underscore.
- Constraint detail rows humanize the same enums.
- The screenshot harness waits for the dynamically imported timeline chart before capturing, so the
  audit screenshots show a rendered chart rather than an empty box.

None of these touched the engine, the schemas, the catalog or the accounting rules.

Milestone 1 (schemas, catalog, deterministic subscription replay engine) and Milestone 2 (read-only
local adapters and the CLI) remain independently audited and accepted within their documented
semantics; the M2 correction log is below.

Milestone 3 adds the first real product experience on top of them:

- `/app/import`: drag/drop, file picker and deterministic demo workloads. Reading, parsing,
  validation and workload preparation run in a Web Worker; the interface stays responsive.
- `/app/replay`: workload, target plan, explicit rules instant, and a result surface that explains
  what happened and why, including separate coverage dimensions, constraint states, confidence with
  reasons, violation detail and an activity/violation timeline.
- Browser-local persistence in IndexedDB only, with real delete and clear, and no upload path of any
  kind. A browser test records every request during import and replay and fails if any body carries
  events, token history or a project/session hash.
- Deterministic demo workloads (`moderate`, `heavy`, `multistack`) that reach the interesting product
  states: served, exceeded and unknown.

The bundled catalog is still synthetic, so real workloads replay with their models reported as
unmapped. Public catalog data, the share layer, accounts and cloud sync belong to later milestones.

## M2 correction log (after independent audit)

Two defects in the accounting-declaration family were found and fixed after the M2 audit, and both
are now guarded by regression tests:

- Codex and Hermes attached `accounting` declarations unconditionally, so a record that omitted a
  category produced an event the canonical schema rejects (the export then failed rather than
  publishing an impossible accounting).
- The same defect existed in Command Code for its cache categories, which the fix found by
  checking the whole family rather than the two reported adapters.

`docs/ADAPTERS.md` records the resulting rule: a declaration is attached only to a category the
record actually reports.

## M3 reconciliation (after the independent audit)

The audit's five corrections were verified against the repository rather than accepted on report,
and the interface was then reviewed as rendered pixels, which the audit could not do.

What the reconciliation confirmed:

- **Large import.** The audited test now follows the product's own path from the import summary to
  `/app/replay` before reaching for replay controls. With that fix the flow completes in the
  browser: 69.6 MB and 100,000 events imported in 1.36 s, replayed in 1.33 s, 46 ms interaction,
  and the summary confirms all 100,000 events were replayed. The earlier note in this document that
  described the completed-import path as PARTIAL was wrong: it measured a test that never left the
  import page, not a slow browser.
- **Worker failure.** A Worker that cannot start now fails every waiting request, is discarded, and
  the next request starts a fresh one, bounded by a 15 s startup timeout. Reverting
  `worker-client.ts` to the pre-audit revision fails two of the audit's unit tests
  ("fails the request when the Worker cannot load, and fails the next one too", "fails the request
  when the Worker never announces itself"), so the guard has power; the browser test proves it end
  to end by serving a 404 for the Worker asset.
- **Supersession.** A superseded replay and a superseded import both stay silent, and a superseded
  import no longer clears the busy state that the newer request owns; the browser tests assert that
  no error card appears and that the newest summary wins. Genuine Worker failures still surface,
  which the Worker-failure test covers.
- **Demo session identity.** Demo events now carry a stable per-session hash: `moderate` is 900
  events in 36 sessions, `heavy` 6,000 in 100, `multistack` 2,000 in 81. Orchestration counts
  sessions, not events (T3 Code: 6, 12 and 14 sessions). Real event identity is untouched.
- **Privacy.** The browser tests now inspect request URLs, query strings, headers and bodies across
  import and replay. Source inspection of the app found no `sendBeacon`, no WebSocket, no
  `EventSource`, no analytics, no error-reporting payload, no server action, no form action and no
  workload data in cookies or `localStorage` (only the theme preference is stored there).

Two presentation defects were found and fixed during the reconciliation, both display-only:

- The constraint row read as a fraction (`900 / 600 requests`) that looked like a contradiction
  because a rolling limit applies per window while the accepted figure is the whole workload. It now
  reads `900 requests accepted · limit 600 requests per window`, and calendar limits are labelled
  without the per-window qualifier. Engine values are unchanged.
- The earlier revision's claim that the renderer became too heavy after a large import came from the
  same mis-navigated test as above and has been removed.

### Display conventions (presentation only)

- Coverage percentages: one decimal place, `100%` and `0%` at the bounds, exact value in the title
  attribute. Engine math untouched.
- Money: always two decimals with a currency symbol (`$50.00`, `$0.00`); a currency quantity never
  repeats the unit, so nothing reads `$2.11 USD`.
- Other quantities: thousands separators, never a bare seven-digit run.
- Units: canonical unit text, with `usd` shown as the symbol rather than the word.
- Interactive rows (plan rows, violation disclosure rows): at least 44 px tall, asserted in the
  accessibility suite on both viewports.

## M3 correction log (after independent audit)

The M3 audit rebuilt its own measurement harness instead of trusting the milestone's own specs, and
found five things worth fixing. They are listed with the guard that now holds each one.

- The large-import measurement spec never exercised the replay it was supposed to measure. It looked for
  the plan controls on `/app/import`, where they do not exist, so the click waited out a 600 s
  locator timeout against an idle renderer. The reported "ten-minute window" was that timeout, not
  work: the same path completes in about 1.4 s. The spec now follows the product's own link into
  `/app/replay` and asserts that the replayed workload held every imported event.
- A Worker that could not start left the interface waiting forever. A missing or blocked
  `stackreplay-worker.js` produced one error event, which was consumed by whichever request was
  pending at that moment; every later request posted into a dead Worker and never settled, leaving
  the import surface on "Reading…" with no error and no hint. The client now fails every request
  waiting on a Worker that cannot be used, drops it, and reports a safe error; a Worker that never
  announces itself at all is bounded by a start timeout instead of waiting indefinitely. Guarded by
  `apps/web/lib/worker-client.test.ts` and `apps/web/e2e/worker-failure.spec.ts`.
- A superseded replay was reported as a failure. The import surface ignored a superseded
  response, but the replay surface turned it into an error card and reset its phase while the newer
  replay was still running; the import surface also released its busy state while a newer import
  owned the interface. Both surfaces now treat a superseded response as what it is. The client's
  supersession semantics are pinned by `worker-client.test.ts`; the two surfaces' handling of it is
  not covered by a test yet.
- Session identity in the demo workloads was per event, not per session. Every demo event
  carried a freshly random `nativeSessionHash`, so "Sessions" equaled "Events" (6,000 of 6,000) and
  the orchestration line counted attributed events as sessions, disagreeing with the per-source
  session counts the same fixture declared. Session hashes are now derived from the session id, so
  the heavy preset reports 100 sessions across 6,000 events and 12 orchestrated sessions, matching
  the declared counts. Event data, token values and replay results are unchanged.
- The privacy browser test only inspected request bodies. A leak could equally ride in a URL, a
  query string or a request header. The test now checks all three and additionally asserts that
  import and replay send no request body at all.

`apps/web/package.json` also rebuilds the Worker artifact before the browser suite runs
(`test:e2e`), so end-to-end results can no longer come from a stale Worker bundle, and
`captureRequests` records headers so the privacy assertions can see them.

## Original blocker verification

| Blocker | Verified resolution |
| --- | --- |
| Rejected-event accounting | Atomic admission; rejected/unsupported events consume no pools. Re-audit fixed early exit that prevented other exceeded latches from triggering. |
| Overlapping token categories | Declared inclusions normalize to disjoint buckets. Re-audit rejects combined included cache subsets exceeding input and fixes disjoint workload summaries. |
| Unknown consumption / false certainty | Missing is distinct from zero. Relevant unknown consumption makes admission indeterminate and coverage unknown. Re-audit omits economics when unknown admission prevents an exact overage bill. |
| Current-rule replay | Explicit rulesAsOf date resolves plan version and promotion eligibility; historical timestamps control ordering and windows only. |
| Decimal precision | External 28-significant / 18-fractional envelope, isolated Decimal precision 100, plus validated multiplier-composition budget (decision 21). Re-audit fixed significant-zero counting and separates derived-result values from external inputs. |
| Overage semantics/economics | Explicit allow_overage bills accepted per-window excess; record_only does not bill. Base + overage = target. |
| Result/export contracts | Validated decimal quantities, kind/unit correspondence, economic identities, coverage consistency, target selection and metadata. Export ranges retain nanosecond ordering and permit empty ranges. |

## Re-audit corrections

- Evaluate every hard rule before an atomic rejection, including every latch.
- Reject impossible combined cache inclusions; expose disjoint summary totals
  only when the workload's normalized quantities are complete.
- Suppress false exact economics for indeterminate overage admission.
- Validate compositional precision, not just individual decimal inputs; allow
  exact computed costs outside the smaller external-input envelope.
- Enforce serialized economic identities, valid non-negative quantities,
  constraint units, coverage arithmetic and generalized target consistency.
- Reject windows extending beyond the four-digit-year serialization contract
  explicitly rather than emitting an invalid result.
- Replace an invalid capacity property: greedy token admission does not
  guarantee monotone served-request counts. Add an independent atomic-admission
  oracle, arbitrary nanosecond permutations, and declared-quality properties.
  Strengthen compatibility and unknown-data properties.
- Record engine 0.0.3 and methodology 1.2.0. Preserve earlier audit fixes.
- Add benchmark checks for full known-workload evaluation and print accepted
  versus attempted consumption, actual overage and rulesAsOf.

## Implemented scope

- Versioned UsageEventV1, StackReplayExportV1, ExecutionTargetV1 and generalized
  ExecutionReplayResultV1. Execution facts do not contain subscription ownership.
- Provider/model/plan/pricing schemas, semantic validation, browser-safe catalog
  entry and isolated Node YAML loader. Bundled data remains entirely synthetic,
  estimated and sourced to example.invalid.
- Subscription replay: compatibility, pricing, first-use rolling windows,
  timezone-aware calendar windows, independent rule quantities with atomic
  admission, explicit exceed behavior, promotions, coverage, confidence,
  violations, economics and reproducibility metadata.
- API, local and hybrid remain reference shells and fail explicitly with
  TARGET_NOT_IMPLEMENTED. No provider API replay or local-model logic.
- Web remains an M0 foundation. No real-usage import or browser replay UI yet.
- M2 adapters: read-only, offline parsers for Command Code JSONL, OpenCode
  SQLite, Codex rollouts, Claude Code JSONL, Hermes `state.db` aggregates, T3
  Code attribution plus harness-managed roots, and opt-in ccusage JSON import.
  Every accounting relationship is evidence-backed (upstream source, upstream
  documentation or a data invariant) and re-checked per record, degrading to
  unknown instead of publishing an impossible accounting.
- M2 pipeline: platform path resolution for Linux/macOS/Windows, bounded scans,
  salted project/session/event hashing, harness attribution without
  re-ingestion, deterministic deduplication (exact duplicates and cross-source
  overlaps), stable ordering, and a validated `StackReplayExportV1` with its
  redaction report.
- M2 CLI: `detect`, `scan`, `export`, `replay` (with `--as-of` and `--compare`),
  `plans` and `doctor`, all with `--json`, `NO_COLOR` support, documented exit
  codes and no network access. Local salt is created on first scan with
  owner-only permissions.

## Validation

Node 24.19.0 and pnpm 10.18.1. Generated outputs were cleaned, followed by a
frozen-lockfile install and forced full validation. Relevant checks were rerun
after the final corrections.

| Gate | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS |
| pnpm check | PASS: 119 files, no errors/warnings |
| pnpm check:contrast | PASS |
| pnpm typecheck | PASS: 11 tasks |
| pnpm test | PASS: 220 tests — schema 31, catalog 27, engine 140, UI 14, CLI 8 |
| pnpm build | PASS: 7 tasks |
| Web Playwright E2E | PASS: 29 passed, 5 explicitly viewport-specific skips |
| Browser worker | PASS: 554,160-byte unminified browser bundle, no Node polyfills; representative result identical to Node |
| Packed packages | PASS: schema/catalog/engine installed outside the workspace; bundled YAML loads and representative replay validates |
| Publication delta | PASS: b83a5e5 delta reviewed/scanned; no new secret, local-path or generated-artifact finding |

The engine has **25 golden test cases**, **11 property tests**, and **21 new
re-audit regressions**, plus the preserved time, original audit and remediation
suites. The earlier documentation's 20 golden / 6 property count was inaccurate
(the remediation actually had 25 / 8). Golden expectations were independently
checked for rejection, latching, overage, overlap, unknowns and snapshot rules.
Only version metadata changed in the stored golden snapshot during this audit.

## Milestone 2 validation

Node 24.19.0 (pinned) and pnpm 10.18.1 on Linux. Every M2 check runs offline.

| Gate | Result |
| --- | --- |
| pnpm check | PASS: 163 files, no errors (2 informational) |
| pnpm check:contrast | PASS |
| pnpm typecheck | PASS: 13 tasks |
| pnpm test | PASS: 325 tests — schema 31, catalog 27, engine 140, adapters 90, CLI 23, UI 14 |
| pnpm build | PASS: 10 tasks |
| Adapter tests | 90 tests in 11 files: per-adapter extraction, accounting declarations, unknown-versus-zero, malformed and partial records, windowing, idempotency, cross-source dedup, harness attribution, Linux/macOS/Windows paths, and a source scan proving no adapter imports an HTTP client |
| CLI tests | 23 tests: help/version/usage errors, detect/scan/export/replay/plans/doctor, JSON stability, windowing, color suppression, and built-binary equivalence with the in-process CLI |
| Real-machine read-only smoke | `detect` found all 6 local sources; `scan` read 51,736 events in 15.7 s; `export` wrote 55.1 MB at mode 600; `replay` of that export completed in 1.2 s |
| Export privacy check | PASS: zero occurrences of any home path, project directory name or session file name in a 55 MB export of real local data |
| Packed install | PASS: schema, catalog, engine, adapters and CLI packed and installed outside the workspace; detect, export and replay run from the installed tarballs with a fresh salt (mode 600) and byte-identical events across runs |

After the independent audit (re-run on the corrected code, all gates forced rather than cached):

| Gate | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS |
| pnpm check | PASS: 163 files, no errors (2 informational) |
| pnpm check:contrast | PASS |
| pnpm typecheck | PASS: 13 tasks |
| pnpm test | PASS: 339 tests — schema 31, catalog 27, engine 140, adapters 101, CLI 26, UI 14 |
| pnpm build | PASS: 10 tasks |
| Web Playwright E2E | PASS: 29 passed, 5 viewport-specific skips |
| Replay-engine benchmark | PASS (runs): Starter median 917.7 ms, Pro median 1095.5 ms at 100k events; the sub-second target is still borderline and is not enforced by the bench script, which prints evidence and exits 0 |
| Real-machine read-only smoke | `detect` found all 6 local sources; `scan` read 96,819 events; `export` wrote 101.6 MB at mode 600; `replay` of that export completed offline |
| Export privacy check | PASS: 0 of 119 raw project paths, 0 of 10,419 raw session ids and 0 of 413 session file names appear in the 101.6 MB export; no home prefix, username, key pattern or email appears |
| Offline run | PASS: a full scan inside a network-less namespace (`unshare -rn`) reads and normalizes 1,655 events, and no source file imports an HTTP, DNS or socket module or calls `fetch` |
| Determinism | PASS: two scans produce identical summaries, two exports produce byte-identical event arrays and identical byte counts |
| Packed install | PASS: five tarballs installed in an isolated project; the installed CLI sees only the synthetic fixture home, creates the salt at mode 600, and produces byte-identical exports across runs; the bundled catalog loads and a replay runs from the tarballs |

Honest limits of this milestone:

- The bundled catalog is synthetic, so a real local workload replays with its models reported as
  unmapped (`unresolved`) and coverage reported as unknown. That is the catalog's state, not a
  replay failure: no pricing is invented for models the catalog does not know.
- Request counts from aggregate-only sources (Hermes session/model rows) are approximate by
  construction, and the adapter says so with a warning. The canonical event has no request-count
  field, so the row's own call count does not travel in the export: a request-coverage figure built
  from those events understates real calls (23,937 calls behind 198 events on the audited machine).
  Carrying the count, or marking the event as an aggregate, needs a schema revision.
- Reasoning that a source reports as included in output (Claude Code thinking tokens, Hermes
  reasoning) is priced at the model rule's reasoning rate, falling back to the output rate with an
  explicit warning and a confidence reduction. The synthetic catalog prices no reasoning rate, so
  every real workload takes that fallback today; the total and the cost are unaffected.
- An aggregate import can only be deduplicated against a native scan when it names a session
  (`ccusage session` rows). Daily, block, monthly and project-grouped imports carry no session
  identity, so importing them alongside a native scan of the same period would double count, which
  is why the import is opt-in and never auto-detected.
- Warnings carry the source path they came from and are printed by `scan --json`; they are not part
  of the export. Treat that output as machine-readable local detail rather than something to paste
  into a public issue.
- Restricting `--source` to a provider without also selecting `t3-code` leaves those sessions
  unattributed, because harness attribution is collected only when its adapter is selected.
- ccusage imports keep reasoning unknown, so their token totals are unknown. This is deliberate
  (decision 26) rather than a missing feature.

## Independent M2 audit (2026-09-21)

Milestone 2 was independently re-audited against the two specification documents, the recorded
decisions and real local histories. The audit re-derived every adapter's accounting evidence from the
sources themselves, re-ran the full validation set, and verified the export's privacy claims by
searching the generated artifact for the real project paths, session ids and session file names it
was built from (0 of 119 paths, 0 of 10,419 session ids, 0 of 413 file names appear; no home prefix,
username, credential pattern or email appears).

Corrections made in this audit (all with regression tests):

- **Claude Code reasoning.** The adapter claimed a known absence of a separate reasoning category,
  but the source reports `output_tokens_details.thinking_tokens` in 99.9% of assistant records
  (non-zero in 79%). The reported quantity is now carried as reasoning declared included in output,
  so the reasoning dimension is visible and the workload total and cost are unchanged. Records whose
  thinking exceeds their output report reasoning as unknown with a warning.
- **OpenCode per-record total.** The adapter never read the source's own `tokens.total`. 16 of
  10,587 local assistant records report categories that add up to more than that total, and no
  inclusion arrangement reproduces it, so those records now report cache and reasoning as unknown
  with `ACCOUNTING_UNESTABLISHED` instead of publishing an accounting the source contradicts.
- **Aggregate overlap deduplication.** Cross-source overlap was only recognised when an import row
  matched a native event's instant and full token signature, which an aggregate row can never do, so
  a ccusage import alongside a native scan double counted. An aggregate row whose session a native
  per-call scan already read is now dropped and reported. Equal-precision sources never collapse:
  an identical fingerprint cannot distinguish two distinct calls that look alike.
- **T3 attribution was inert on real data.** `projection_thread_sessions.provider_session_id` is
  empty in the installed harness; the mapping lives in
  `provider_session_runtime.resume_cursor_json.sessionId`, which is now read as a second source.
  The real scan maps 34 sessions (all the OpenCode ones T3 holds) where it previously mapped none,
  and `detect` now separates thread rows from rows that actually carry a session id.
- **Impossible calendar dates.** `Date.parse` rolls `2026-02-30` over to 2 March; source timestamps
  and `--since`/`--until` bounds with a day that does not exist are now rejected instead of silently
  filtering or admitting a different instant.
- **Export file naming.** The default export name was `stackreplay-export-<date>.json`, which is
  neither the documented `.stackreplay.json` extension nor covered by `.gitignore`, so a personal
  export could be committed by accident. It is now `stackreplay-<date>.stackreplay.json`, with the
  old pattern also ignored.
- **Reversed windows** are a usage error (`--since` after `--until`) rather than an "internal error:
  the export did not validate" from the schema layer.

Real-machine baseline re-derived by this audit (full scan, no window): 96,819 events, 676 sessions,
121 projects, 28.76B known tokens across the disjoint buckets, 1,267 exact duplicates removed, 0
overlaps, 23,937 Hermes API calls represented by 198 Hermes events, 34 T3-attributed sessions. The
windowed smoke tests reproduce as well: `--since 2026-09-15` gives 21,475 events and `--since
2026-09-21` gives 1,655, with the inclusive/exclusive boundary behaviour asserted at the instant
level (`--since <t>` includes the event at `t`, `--since <t>+1ms` excludes exactly it, `--until <t>`
excludes it).

The export is 101.6 MB for that baseline. The earlier 55.1 MB figure in this document was not
reproducible and is corrected here.

## Milestone 3 validation

Node 24.19.0 (pinned) and pnpm 10.18.1 on Linux. Every check runs offline.

| Gate | Result |
| --- | --- |
| pnpm check | PASS: 195 files |
| pnpm check:contrast | PASS: 10 token pairs |
| pnpm typecheck | PASS: 13 tasks |
| pnpm test | PASS: 372 tests — engine 140, adapters 104, schema 31, catalog 30, CLI 26, web 26, UI 15 |
| pnpm build | PASS: 7 tasks (includes the pre-bundled Worker) |
| pnpm --filter @stackreplay/web test:e2e | PASS: 107 passed, 17 viewport-specific skips |
| pnpm --filter @stackreplay/web test:e2e (large import, opt-in) | PASS: 69.6 MB / 100,000 events imported in 1.3 s and replayed in 1.3 s |
| pnpm --filter @stackreplay/replay-engine bench | PASS: 100k events, median 987.2 ms (786.4–1020.1 ms across samples), peak RSS 610.0 MiB |

Milestone 3 specifics verified in a real browser (Chromium, desktop and mobile viewports):

- Import: empty state, drag-over, importing, invalid file, malformed JSON, future export version,
  valid file with an unexpected filename, and a ~100k-event synthetic export.
- Replay: empty state, full coverage, exceeded constraints with violation detail, unknown coverage,
  unsupported models, plan search and keyboard operation, rules-instant display, re-running against
  another target.
- Privacy: every request during import and replay is recorded; no request body carries events,
  token history or any project/session hash, no request body is sent at all, no request URL, query
  string or header carries workload content, no request targets an upload endpoint, and all traffic
  stays on the app origin.
- Persistence: reload restores the workspace, deletion removes the IndexedDB payload (verified by
  reading the store back), clear-all works, two imports coexist, and a corrupted stored payload
  fails safely.
- Accessibility: axe (WCAG 2.2 AA tags) passes on import and replay in both themes, keyboard import
  and plan selection work, violation detail is keyboard reachable, the timeline exposes a text
  alternative, and status is never carried by colour alone.
- Visual: deterministic screenshots for import and replay in dark and light, desktop and mobile,
  plus the exceeded and unknown states.

Two real defects were found by this validation and fixed rather than worked around: a low-opacity
phase label failed contrast in dark mode, and the plan picker used listbox roles on a list of
buttons, which axe flagged as malformed ARIA. Both are now correct in the shipped UI.

Honest limits of this milestone:

- The bundled catalog is synthetic, so real workloads replay with their models reported as unmapped
  and coverage reported as unknown. That is the catalog's state, not a replay failure.
- The ~100k-event browser import is measured rather than assumed, in both directions. A
  deterministic 69.6 MB / 100,000-event synthetic export completes the whole import (reading,
  parsing, schema validation, summary, IndexedDB write) in about 1.3 s in Chromium on this machine,
  and a replay of that stored workload completes in about 1.4 s. The page heap stays around 10 MB,
  and the main thread keeps answering (median interaction latency ~1 ms; worst observed ~200 ms,
  once, while the import was being persisted). The real 101.6 MB export measured in M2 (96,819
  events) imports in 1.3 s and replays in 0.9 s with no request leaving the browser. Peak RSS across
  the headless Chromium processes is roughly 0.9-1.3 GB, so memory, not time, is the practical
  ceiling, and larger real workloads are the thing to measure next. The measurement spec is opt-in
  (`STACKREPLAY_LARGE_IMPORT=1`) because it starves Playwright's other workers, and it reports what
  it measured either way. An earlier revision of this document reported this path as PARTIAL because
  the follow-up replay "did not complete inside a ten-minute window": that window was the spec's own
  locator timeout, the renderer was idle, and the completed-import path passes.
- Confidence is reported as low for the synthetic catalog because every catalog claim is
  `estimated`; that is honest provenance, not a defect.

### Independent audit, 2026-09-21

The audit rebuilt its own harness in a scratch directory instead of re-running the milestone's own
specs, drove the production build (`next start`, the artifact `pnpm build` produces), and started
from the opposite assumption: that the milestone's own measurement was wrong somewhere. What it
verified, and the measurement behind each claim:

- Worker boundary: after a 100,000-event import the page's own heap was ~10 MB, and a stream of
  main-thread probes kept answering (median ~1 ms; worst 183 ms, once, while the import was being
  persisted). Reading the payload back out of IndexedDB returned all 100,000 events with every demo
  source and the orchestrated-session attribution intact, so the event array really was handled in
  the Worker while the interface stayed responsive.
- Large workload, both directions: a deterministic 69.6 MB / 100,000-event export imported in
  1.3 s and replayed in 1.4 s. The real 101.6 MB export measured in M2 (96,819 events) imported in
  1.3 s and replayed in 0.9 s, reporting "Not served" with unknown coverage, which is what a
  synthetic catalog should say about real models.
- Privacy, adversarially: markers were planted in imported event ids, session and event hashes,
  project hash, model names and collector fields. Across import, replay, navigation and reload the
  browser made 87 requests; none carried a marker in its body, URL, query string or headers, and no
  request had a body at all. `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` and `EventSource`
  were instrumented inside the page: the only calls observed were same-origin Next.js navigation
  fetches. No cookies appeared, the only storage keys were the theme key (written by the theme
  toggle, not by import), and the planted workload was found in IndexedDB, which is the point: it is
  processed locally instead of disappearing behind an opaque path.
- Persistence and deletion: a reload restored the workload summary in ~0.2 s. Deleting the
  import removed the record and the payload (the payload store went from one entry to zero) and
  clear-all emptied both stores.
- Import attacks: empty file, binary content, malformed JSON, a future export version, a wrong
  `format`, JSON that is not an object, deeply nested JSON, a truncated large file, a valid export
  under a `.txt` name, and the same file imported twice: each one ends in a designed error that
  names no internals, none hangs, and the valid-but-oddly-named file imports normally.
- Failure paths: a Worker whose storage is unavailable reports a storage error in ~0.3 s. A
  Worker that cannot start reported nothing at all until this audit fixed it.
- Accessibility and layout: the suite's axe runs (WCAG 2.2 AA tags) pass on both surfaces, in
  both themes and in the exceeded and unknown states. Measuring the rendered DOM at 1280x720 and
  390x844 found no horizontal overflow, nothing crossing the viewport edge, and no interactive
  target under 24 px except the 20 px-tall full-width violation `<summary>` rows. Axe's WCAG 2.2
  target-size rule does not flag them, but they are the one control below the 24 px guidance.
- Gates: `pnpm check`, `pnpm check:contrast` (10 token pairs), `pnpm typecheck`, `pnpm test`,
  `pnpm build`, the full browser suite and the engine benchmark were all re-run forced rather than
  from turbo's cache.

What this audit could not judge: the rendered pixels. It had no vision path in that session, so its
visual conclusions come from measured geometry, the typography scale, rendered strings and the
contrast tokens rather than from looking at screenshots. A human pass is still worth doing; the
shots are reproducible with the visual spec (`pnpm --filter @stackreplay/web test:e2e -- visual`,
which writes `import-desktop-dark.png`, `replay-desktop-dark.png`, `replay-mobile-dark.png` and the
other states to `apps/web/test-results/screenshots`).

Non-blocking observations the author may want to decide on:

- Coverage percentages and credit amounts are rendered at full engine precision (`67.9833%`,
  `12.799959 / 100 usd`). Exactness is the point of the product, but four decimals in a headline
  metric and six in a credit row read as unfinished next to `100%` and `3 of 3`.
- The same card formats money two ways: `$50.00` for the plan price and `$50` for the target cost.
- The replay result is the one surface that had ungrouped quantities (`44205864 / 200000000 tokens`)
  next to grouped ones (`97,935,040`); that is fixed, and the remaining question is how much display
  precision each dimension should show.

## Benchmark evidence

Each case builds a deterministic 100,000-event, three-model workload across 30
days outside timing, warms with 2,000 events, then measures five complete replay
calls. Validation, sorting, normalization and admission execute on each call.
No result cache exists. Median calculation handles odd/even sample counts.

Corrected implementation measurements (milliseconds):

| Run / target | Samples | Median | Events/second | Peak RSS after target |
| --- | --- | --- | --- | --- |
| A / Starter | 942.1, 852.8, 839.8, 919.4, 889.0 | 889.0 | 112,491 | 604.8 MiB |
| A / Pro | 1142.8, 975.5, 1045.8, 966.6, 935.9 | 975.5 | 102,508 | 608.3 MiB |
| B / Starter | 1226.2, 898.1, 879.2, 883.0, 813.0 | 883.0 | 113,253 | 608.2 MiB |
| B / Pro | 1050.4, 1008.2, 1134.8, 944.7, 946.0 | 1008.2 | 99,189 | 610.6 MiB |
| Final / Starter | 964.2, 894.4, 949.3, 984.3, 855.7 | 949.3 | 105,340 | 609.2 MiB |
| Final / Pro | 1050.2, 974.7, 1177.9, 980.9, 942.8 | 980.9 | 101,949 | 614.0 MiB |

A/B preceded the final timestamp-range guard; final includes it. Results were
identical in all runs: Starter served 29,496 requests; Pro served 3,547 and billed
USD 10.014443 overage. The promotion snapshot and disjoint normalization are
active. The unchanged remediation baseline measured 985.2 / 1031.1 ms medians.

**The sub-second median target is borderline, not consistently reproduced.**
The final medians pass, but Pro exceeded one second in another full run.
A tested quantity-precomputation optimization was discarded: its Pro median
was 1007.7 ms and peak RSS 691.4 MiB, so it did not justify retaining extra state.
Correctness was not changed to improve benchmark numbers.

The official M1 requirement that a 100k benchmark exists passes; the broader
performance target remains PARTIAL and should be tracked as a performance
limitation, not presented as a stable sub-second guarantee.

## Supported limits and remaining work

- Every canonical token category must be established to know total consumption.
  Explicit inputTokens=0 establishes that category, not missing output/cache/
  reasoning categories. Request-only admission can still be known.
- Any indeterminate admission makes request coverage unknown for the whole
  replay; any incomplete token denominator makes usage coverage unknown.
  Empty workloads retain the documented 100 percent convention.
- Calendar months follow the declared IANA zone; billing anchors, proration,
  rollover credits and multi-period subscription base billing are not modeled.
- rulesAsOf has UTC date granularity; intraday rule changes are unsupported.
- Money is USD-only. Catalog compositions exceeding the exact-arithmetic budget
  fail validation. Baseline comparison fields are validated but not populated.
- Runtime timezone data influences historical IANA results. Windows extending
  outside years 0000-9999 fail explicitly.
- CatalogVersion is recorded as supplied; the loader hashes canonical content,
  while the engine does not independently authenticate that label.
- Peak RSS around 0.6 GiB and borderline Pro latency deserve further work.
- Hosted GitHub Actions, repository settings and vulnerability reporting remain
  pending first publication. Pre-existing untracked docs/Images/ was untouched
  and excluded from the audit commit; it is not approved publication content.
- Existing deferred product questions remain deferred. No M2 work was started.

## M1 acceptance

| Official criterion (spec point 99) | Assessment |
| --- | --- |
| No React dependency in replay-engine | PASS |
| No database dependency | PASS |
| No Node filesystem dependency | PASS; catalog loader stays outside engine/browser entry |
| All golden fixtures pass | PASS: 25 cases |
| Property tests pass | PASS: 11 properties with corrected assumptions |
| 100k-event benchmark exists | PASS; complete samples and memory evidence above |
| Feed a JSON workload into a plan and get a trustworthy result | **PASS**, within documented supported semantics |

M1 is accepted and tracked repository content is ready for public release.
M2 is the next authorized milestone only when separately requested.
