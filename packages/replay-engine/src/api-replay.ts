import {
  type CatalogV1,
  createModelIdentityIndex,
  type ModelIdentityIndex,
  modelResolutionKindOf,
  type PricingV1,
  selectPlanVersionAt,
} from "@stackreplay/catalog";
import type {
  ApiTargetV1,
  EconomicsV1,
  ExecutionReplayResultV1,
  ModelResolutionKindV1,
  ReplayAssumptionV1,
  ReplayConfidenceV1,
  ReplayContextV1,
  ReplayTranslationV1,
  ResetAssumptionV1,
  TextUsageEventV1,
  WorkloadScopeKindV1,
} from "@stackreplay/schema";
import { type ConfidenceFactor, levelFromVerification, worstLevel } from "./confidence.js";
import { ReplayEngineError } from "./errors.js";
import { type Decimal, ZERO } from "./money.js";
import {
  buildWarnings,
  CoverageBuilder,
  feasibilityOf,
  money,
  Tracker,
  UnsupportedModelBuilder,
  WorkloadSummaryBuilder,
} from "./reporting.js";
import {
  type EventSemanticsFacts,
  type ReplayDispositionKindV1,
  SemanticsAccumulator,
} from "./semantics.js";
import {
  prepareTranslation,
  substituteFor,
  TranslationApplication,
  type TranslationPlan,
} from "./translation.js";
import { hasAnyReportedTokens, moneyUnitsForUsage, tokenAccountingOf } from "./units.js";
import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "./version.js";
import { sortTimedEvents, type TimedEvent, toTimedEvents } from "./windows.js";

/**
 * Direct API replay (M4C).
 *
 * A Direct API target has no plan, no allowance, no admission decision and no
 * reset: every replayed event is priced at its model's published API list price
 * on the selected provider. This module is the execution path for that target
 * kind, and it is deliberately a sibling of the subscription path rather than a
 * special case inside it: the two share identity resolution, translation,
 * decimal money, conditional tier selection, the semantics accumulator and the
 * reporting primitives, and they differ exactly where a subscription's
 * allowance system has no API equivalent.
 *
 * Semantics that matter for correctness (M4C plan sections 5-20):
 *
 * - Prices are the records in force at the pinned `rulesAsOf` instant, selected
 *   per model from that model's own API list-price history. The first record in
 *   the catalog is never a stand-in, and a gap in a model's history stays a gap:
 *   no earlier or later record is borrowed to fill it.
 * - The historical event timestamp still selects conditional rate tiers inside
 *   the selected record, because a real API request is priced by the rules in
 *   force when it happened.
 * - Only token prices are replayed. Batch discounts, provisioned capacity,
 *   taxes, FX, minimums and negotiated account terms are not modelled, and the
 *   result says so in its assumptions.
 * - A model the selected provider is not recorded as offering is `unavailable`;
 *   a model whose offering set the catalog does not establish is `unknown`.
 *   Neither is ever guessed, and both are distinct findings in the result.
 * - Target cost is published only when every event in the workload is both
 *   served and priced, so a partial subtotal can never masquerade as the
 *   workload's cost. Partial pricing is reported through coverage and evidence,
 *   never through a number.
 * - This path records no allowance constraints, no admission outcomes and no
 *   savings claim: `constraints` and `violations` stay empty, and the economics
 *   carry the API list-price basis only.
 */

export interface ApiReplayInput {
  target: ApiTargetV1;
  catalog: CatalogV1;
  context: ReplayContextV1;
  events: readonly TextUsageEventV1[];
}

/**
 * How the catalog's price history treats one effective model at the pinned
 * instant. A pricing record that is not in force then is never substituted for
 * one that is.
 */
type ApiPricingOutcome =
  | { kind: "selected"; pricing: PricingV1 }
  /** The model has no API list-price record at all. */
  | { kind: "not-recorded" }
  /** The model has pricing records, but none on the API list-price basis. */
  | { kind: "other-basis" }
  /** The model has API list-price records, but none in force at the instant. */
  | { kind: "not-in-force" };

/** Whether the selected provider serves one effective model. */
type ApiAvailability = "offered" | "not-offered" | "offering-unestablished";

export function replayApiTarget(input: ApiReplayInput): ExecutionReplayResultV1 {
  const { target, catalog, context } = input;
  const rulesAsOf = context.rulesAsOf;
  const scopeKind: WorkloadScopeKindV1 = context.workloadScope?.kind ?? "imported_workload";

  if (catalog.providers[target.providerId] === undefined)
    throw new ReplayEngineError(
      "TARGET_PROVIDER_UNKNOWN",
      "The Direct API target names a provider this catalog does not contain.",
      [`providerId=${target.providerId}`],
    );

  // The pre-M4A API shell carried a pricing reference and a cross-model mapping
  // that M4B replaced. They are rejected rather than interpreted: a replay that
  // silently reinterpreted either would report a scenario nobody asked for.
  if (target.pricingVersionId !== undefined)
    throw new ReplayEngineError(
      "API_PRICING_REFERENCE_NOT_SUPPORTED",
      "This Direct API target names a pricing version. Direct API replay selects each model's API list-price record in force at the pinned instant, so drop pricingVersionId.",
      [`providerId=${target.providerId}`, `pricingVersionId=${target.pricingVersionId}`],
    );
  if (target.modelMapping !== undefined && target.modelMapping.length > 0)
    throw new ReplayEngineError(
      "API_MODEL_MAPPING_NOT_SUPPORTED",
      "This Direct API target carries a cross-model mapping. Cross-model behaviour is a scenario assumption, so express it as the target's modelTranslation policy.",
      [`providerId=${target.providerId}`, `mappings=${target.modelMapping.length}`],
    );

  const events = sortTimedEvents(toTimedEvents(input.events));
  const translationPlan = prepareTranslation(target.modelTranslation, catalog);
  const translationApplication = new TranslationApplication();

  const tracker = new Tracker();
  const identity = createModelIdentityIndex(catalog);
  const pricingHistory = buildApiPricingHistory(catalog);
  /** Memoized per effective model: offering and price selection are per model. */
  const availabilityCache = new Map<string, ApiAvailability>();
  const pricingCache = new Map<string, ApiPricingOutcome>();

  const accumulator = new SemanticsAccumulator({
    target: {
      kind: "api",
      providerId: target.providerId,
      reset: notApplicableReset(),
    },
    catalogVersion: catalog.catalogVersion,
    rulesAsOf,
    scopeKind,
    translationPlan,
    translationApplication,
  });

  const coverage = new CoverageBuilder();
  const unsupported = new UnsupportedModelBuilder();
  const summary = new WorkloadSummaryBuilder();

  let servedEvents = 0;
  let pricedEvents = 0;
  /**
   * Counted with the same rule the subscription path uses: an event is unresolved
   * when its resolution quality is unknown *or* it declares unknown attribution,
   * so a model that failed to resolve cannot be reported as exact just because
   * the event declares confidence in a name the catalog does not know.
   */
  let unresolvedModelEvents = 0;
  let mappedModelEvents = 0;
  let notOfferedEvents = 0;
  let offeringUnestablishedEvents = 0;
  let costUnits: Decimal = ZERO;
  const usedPricingIds = new Set<string>();

  // One mutable facts record, reused for every event: the accumulator copies
  // each value into its aggregates and retains no reference, so a large workload
  // allocates nothing per event here.
  let facts: EventSemanticsFacts = {
    occurredOn: "",
    resolutionKind: "unresolved",
    ruleDeclared: false,
    numericRuleApplies: false,
    tokensKnown: false,
    needsPrice: false,
    priced: false,
    missingPricingEntry: false,
    unpricedCategories: false,
    indeterminate: false,
    disposition: "unknown",
  };

  for (const timedEvent of events) {
    const { event } = timedEvent;
    const observed = observeIdentity(
      event,
      catalog,
      identity,
      translationPlan,
      translationApplication,
    );
    const tokens = tokenAccountingOf(event.usage);
    const effectiveModelId = observed.effectiveModelId;
    const identityEstablished = effectiveModelId !== undefined;
    const sourceModelKey = observed.sourceModelId ?? `raw:${event.model.rawName}`;

    /**
     * Identity, provider applicability and pricing are three separate questions,
     * asked in that order. An event whose canonical model is not established
     * never reaches the provider question: the offering set cannot be
     * unestablished for a model the replay has not identified yet, and saying so
     * would blame the catalog for a name it was never given. An unresolved event
     * is an identity gap, and only the identity dimension reports it.
     */
    const availability: ApiAvailability | undefined = identityEstablished
      ? availabilityOf(catalog, effectiveModelId, target.providerId, availabilityCache)
      : undefined;
    let pricing: ApiPricingOutcome = { kind: "not-recorded" };
    let moneyUnits: Decimal | undefined;

    if (identityEstablished) {
      if (availability === "offered") {
        pricing = pricingAt(pricingHistory, effectiveModelId, rulesAsOf, pricingCache);
        const outcome = moneyUnitsForUsage(
          event.usage,
          pricing.kind === "selected" ? pricing.pricing : undefined,
          { atMs: timedEvent.atMs },
        );
        if (pricing.kind === "selected") usedPricingIds.add(pricing.pricing.id);
        if (pricing.kind === "not-recorded")
          tracker.warn(
            "API_PRICE_NOT_RECORDED",
            "One or more events use a model with no API list-price record in the catalog; their cost could not be established.",
          );
        if (pricing.kind === "not-in-force")
          tracker.warn(
            "API_PRICE_NOT_IN_FORCE",
            "One or more events use a model whose API list-price records do not cover the pinned instant; no other record was borrowed to price them.",
          );
        if (pricing.kind === "other-basis")
          tracker.warn(
            "API_PRICE_WRONG_BASIS",
            "One or more events use a model whose only pricing records are not on the API list-price basis; their cost could not be established.",
          );
        if (outcome.unpricedCategories.length > 0)
          tracker.warn(
            "API_PRICE_CATEGORY_UNDOCUMENTED",
            "One or more events consume nonzero tokens in a category the selected API price does not establish; their cost is unknown rather than guessed.",
          );
        if (outcome.known) moneyUnits = outcome.units;
      }
    } else {
      tracker.warn(
        "MODEL_UNRESOLVED",
        "One or more events use models that could not be mapped to the catalog.",
      );
    }

    if (availability === "not-offered") notOfferedEvents += 1;
    if (availability === "offering-unestablished") offeringUnestablishedEvents += 1;
    if (availability === "offered" && !tokens.known)
      tracker.warn(
        "EVENT_TOKEN_ACCOUNTING_UNKNOWN",
        "One or more events do not report every canonical token category, so their consumption cannot be established.",
      );
    if (!hasAnyReportedTokens(event.usage))
      tracker.warn(
        "EVENT_NO_TOKEN_DATA",
        "One or more events report no token data at all; their consumption is unknown rather than zero.",
      );
    if (availability === "offering-unestablished")
      tracker.warn(
        "API_MODEL_OFFERING_UNESTABLISHED",
        "One or more events use models whose provider offering the catalog does not establish; whether the selected provider serves that demand is unknown.",
      );

    /**
     * Dispositions: a determined outcome is never downgraded to `unknown` by a
     * gap elsewhere. Availability decides whether the provider serves the model;
     * the recorded token quantities decide whether the event can be evaluated at
     * all. There is no allowance, so no event is ever `overage` or `blocked`.
     */
    const disposition: ReplayDispositionKindV1 = !identityEstablished
      ? "unknown"
      : availability === "not-offered"
        ? "unavailable"
        : availability === "offering-unestablished" || !tokens.known
          ? "unknown"
          : "included";

    if (observed.quality === "unknown" || event.confidence.model === "unknown")
      unresolvedModelEvents += 1;
    if (observed.quality === "mapped" || event.confidence.model === "mapped")
      mappedModelEvents += 1;

    if (disposition === "included") servedEvents += 1;
    if (disposition === "included" && moneyUnits !== undefined) {
      pricedEvents += 1;
      costUnits = costUnits.plus(moneyUnits);
    }

    const needsPrice = availability === "offered";
    /**
     * A pricing *record* gap: no list-price record in force for the effective
     * model at the pinned instant (absent, on another basis, or outside its
     * effective range). Every one of those leaves the model unpriced.
     */
    const pricingRecordMissing = pricing.kind !== "selected";
    /**
     * A pricing *category* gap: the record that did apply does not establish a
     * category the event consumed. It is only claimed when the event's own
     * accounting is complete, because an unreported category is a usage gap (the
     * usage evidence dimension reports it) rather than a gap in the price.
     */
    const pricingCategoryGap =
      pricing.kind === "selected" && tokens.known && moneyUnits === undefined;
    facts = {
      occurredOn: event.occurredAt.slice(0, 10),
      resolutionKind: observed.resolutionKind,
      ...(observed.sourceModelId !== undefined ? { sourceModelId: observed.sourceModelId } : {}),
      ruleDeclared: pricing.kind === "selected",
      numericRuleApplies: false,
      tokensKnown: tokens.known,
      tokenCount: tokens.known ? tokens.total : undefined,
      needsPrice,
      priced: moneyUnits !== undefined,
      missingPricingEntry: needsPrice && pricingRecordMissing,
      unpricedCategories: pricingCategoryGap,
      /**
       * Consumption is indeterminate when the event's own token accounting is
       * incomplete, not when its disposition is unknown: an unresolved model
       * whose quantities are complete has a known consumption and an unknown
       * identity, and the two findings must not be folded together (M4C audit).
       */
      indeterminate: !tokens.known,
      disposition,
      /**
       * Only an offered model has a price question to answer. For a model the
       * provider does not offer (or whose identity is not established) no record
       * was sought, so claiming the pinned instant failed to cover it would
       * invent a pricing gap that the pricing dimension does not report.
       */
      temporalCovered: availability !== "offered" || pricing.kind === "selected",
      applicabilityUnknown: availability === "offering-unestablished",
    };
    accumulator.observe(facts);

    coverage.observe({
      served: disposition === "included",
      undecided: disposition === "unknown",
      tokenCount: tokens.known ? tokens.total : undefined,
      modelKey: observed.effectiveModelId ?? `raw:${event.model.rawName}`,
      modelSupported: availability === "offered",
      modelQuality: observed.quality,
    });

    summary.observe(timedEvent, { tokens, sourceModelKey });

    /**
     * The unsupported-model list names models this target does not run. A
     * catalog-confirmed absence and an unestablished offering set are listed
     * separately, because they are different findings.
     */
    if (!identityEstablished)
      unsupported.observe({
        modelKey: sourceModelKey,
        rawName: event.model.rawName,
        reason: "unresolved",
      });
    else if (availability === "not-offered")
      unsupported.observe({
        modelKey: sourceModelKey,
        rawName: event.model.rawName,
        // Availability is checked against the effective model, so under a
        // translation policy the entry names the substitute that was not offered.
        // The recorded model stays in `rawName` and in the model mix.
        canonicalId: effectiveModelId,
        reason: "not_offered",
      });
    else if (availability === "offering-unestablished")
      unsupported.observe({
        modelKey: sourceModelKey,
        rawName: event.model.rawName,
        canonicalId: observed.sourceModelId,
        reason: "offering_unestablished",
      });
  }

  const coverageDimensions = coverage.build({
    numericMechanics: true,
    qualitativeReason:
      "a Direct API target prices every event at a published list price, so no allowance rule exists to simulate",
    undecidedReason: (count) =>
      `${count} event(s) could not be evaluated: their model identity, the provider's offering or their token accounting is not established`,
  });

  const economics = apiEconomics({
    costUnits,
    totalEvents: events.length,
    servedEvents,
    pricedEvents,
    tracker,
  });

  const translation = translationApplication.finish(translationPlan);
  return {
    version: 1,
    workload: summary.build(),
    target,
    feasibility: feasibilityOf(coverageDimensions, []),
    coverage: coverageDimensions,
    constraints: [],
    violations: [],
    unsupportedModels: unsupported.build(),
    ...(economics !== undefined ? { economics } : {}),
    assumptions: buildApiAssumptions({ tracker, translation }),
    confidence: apiConfidence({
      timed: events,
      catalog,
      usedPricingIds,
      tracker,
      translation,
      notOfferedEvents,
      offeringUnestablishedEvents,
      unresolvedModelEvents,
      mappedModelEvents,
    }),
    warnings: buildWarnings(tracker),
    versions: {
      engine: ENGINE_VERSION,
      schema: 1,
      catalog: catalog.catalogVersion,
      methodology: REPLAY_METHODOLOGY_VERSION,
      rulesAsOf,
      targetType: target.type,
      targetReference: target.providerId,
      ...(usedPricingIds.size > 0 ? { pricingReferences: [...usedPricingIds].sort() } : {}),
      ...(translationPlan === undefined
        ? {}
        : {
            translationPolicy: {
              id: translationPlan.policy.id,
              version: translationPlan.policy.version,
            },
          }),
    },
    semantics: accumulator.finish(),
  };
}

/** A Direct API target establishes no allowance window, so no reset applies. */
function notApplicableReset(): ResetAssumptionV1 {
  return { kind: "not-applicable" };
}

/**
 * The identity of one observed event, and the model the target would actually
 * run for it.
 *
 * Exact canonical ids win, then catalog-declared aliases scoped to the event's
 * harness (M4A). Cross-model substitution is applied on top and stays separate
 * from identity: the observed canonical model is preserved as `sourceModelId`,
 * and each substitution is recorded so the result can report translation as an
 * explicit assumption.
 */
function observeIdentity(
  event: TextUsageEventV1,
  catalog: CatalogV1,
  identity: ModelIdentityIndex,
  translationPlan: TranslationPlan | undefined,
  translationApplication: TranslationApplication,
): {
  quality: "exact" | "mapped" | "unknown";
  resolutionKind: ModelResolutionKindV1;
  sourceModelId?: string;
  effectiveModelId?: string;
} {
  const canonicalId = event.model.canonicalId;
  let sourceModelId: string | undefined;
  let quality: "exact" | "mapped" | "unknown";
  let resolutionKind: ModelResolutionKindV1;

  if (canonicalId !== undefined && catalog.models[canonicalId] !== undefined) {
    sourceModelId = canonicalId;
    quality = "exact";
    resolutionKind = "exact-id";
  } else {
    const mapped = identity.resolve(
      event.model.rawName,
      event.harness === undefined ? undefined : { harness: event.harness.id },
    );
    resolutionKind = modelResolutionKindOf(mapped);
    if (mapped.canonicalId !== undefined) {
      sourceModelId = mapped.canonicalId;
      quality = "mapped";
    } else {
      return { quality: "unknown", resolutionKind: "unresolved" };
    }
  }

  const substitute = substituteFor(translationPlan, sourceModelId);
  if (substitute !== undefined) translationApplication.record(sourceModelId);
  return {
    quality,
    resolutionKind,
    sourceModelId,
    effectiveModelId: substitute ?? sourceModelId,
  };
}

/**
 * Every API list-price record in the catalog, grouped by the model it prices and
 * sorted by the date it takes effect. Selection is per model, so one model's
 * history never stands in for another's.
 *
 * Catalog validation forbids overlapping effective ranges for one model on one
 * basis, so at most one record is in force at any instant; ties on the same date
 * fall back to the id, which keeps the choice deterministic if a hand-built
 * catalog ever holds two.
 */
function buildApiPricingHistory(catalog: CatalogV1): {
  byModel: Map<string, PricingV1[]>;
  otherBasisModels: Set<string>;
} {
  const byModel = new Map<string, PricingV1[]>();
  const otherBasisModels = new Set<string>();
  for (const pricing of Object.values(catalog.pricing)) {
    if (pricing.basis !== "api_list_price") {
      otherBasisModels.add(pricing.modelId);
      continue;
    }
    const existing = byModel.get(pricing.modelId);
    if (existing === undefined) byModel.set(pricing.modelId, [pricing]);
    else existing.push(pricing);
  }
  for (const records of byModel.values()) {
    records.sort((a, b) =>
      a.effectiveFrom === b.effectiveFrom
        ? a.id < b.id
          ? -1
          : a.id > b.id
            ? 1
            : 0
        : a.effectiveFrom < b.effectiveFrom
          ? -1
          : 1,
    );
  }
  return { byModel, otherBasisModels };
}

/**
 * Whether the selected provider is recorded as offering one model.
 *
 * An absent `providerIds` list means the catalog does not establish the offering
 * set at all, which is unknown rather than unavailable: the two readings lead to
 * different findings and only one of them is a fact.
 */
function availabilityOf(
  catalog: CatalogV1,
  modelId: string,
  providerId: string,
  cache: Map<string, ApiAvailability>,
): ApiAvailability {
  const cached = cache.get(modelId);
  if (cached !== undefined) return cached;
  const providerIds = catalog.models[modelId]?.providerIds;
  /**
   * An absent list and an empty list say the same thing here: the catalog does
   * not record which providers offer this model. Reading "nobody offers it"
   * into an empty list would turn missing offering data into a decided
   * rejection, which is the direction this code must never fail in.
   */
  const outcome: ApiAvailability =
    providerIds === undefined || providerIds.length === 0
      ? "offering-unestablished"
      : providerIds.includes(providerId)
        ? "offered"
        : "not-offered";
  cache.set(modelId, outcome);
  return outcome;
}

/** The API list-price record in force for one model at the pinned instant. */
function pricingAt(
  history: { byModel: ReadonlyMap<string, PricingV1[]>; otherBasisModels: ReadonlySet<string> },
  modelId: string,
  rulesAsOf: string,
  cache: Map<string, ApiPricingOutcome>,
): ApiPricingOutcome {
  const cached = cache.get(modelId);
  if (cached !== undefined) return cached;
  const records = history.byModel.get(modelId);
  const outcome: ApiPricingOutcome =
    records === undefined
      ? history.otherBasisModels.has(modelId)
        ? { kind: "other-basis" }
        : { kind: "not-recorded" }
      : (() => {
          const selected = selectPlanVersionAt(records, rulesAsOf);
          return selected === undefined
            ? { kind: "not-in-force" as const }
            : { kind: "selected" as const, pricing: selected };
        })();
  cache.set(modelId, outcome);
  return outcome;
}

/**
 * Target cost, published only for a workload that is completely served and
 * completely priced. A partial subtotal would read as the workload's cost while
 * silently omitting events, so an incomplete workload reports its gaps through
 * coverage and evidence and carries no number at all.
 */
function apiEconomics(input: {
  costUnits: Decimal;
  totalEvents: number;
  servedEvents: number;
  pricedEvents: number;
  tracker: Tracker;
}): EconomicsV1 | undefined {
  const { costUnits, totalEvents, servedEvents, pricedEvents, tracker } = input;
  // A workload with no events has no cost to report: a total of zero would be a
  // number for something that does not exist (M4B/F033), and the CLI refuses an
  // empty workload before it gets here. Nothing was left unserved or unpriced
  // either, so there is nothing to warn about: incomplete pricing is a finding
  // about demand that exists.
  if (totalEvents === 0) return undefined;
  if (servedEvents === totalEvents && pricedEvents === totalEvents)
    return {
      targetCost: money(costUnits, "USD"),
      // Every replayed event is priced at the selected provider's published API
      // list price; there is no base plan cost and no overage.
      costBasis: "api_list_price",
    };
  tracker.warn(
    "API_COST_INCOMPLETE",
    "Part of the workload is unserved or unpriced at the selected provider, so no target cost is reported rather than a partial one.",
  );
  return undefined;
}

function buildApiAssumptions(input: {
  tracker: Tracker;
  translation: ReplayTranslationV1 | undefined;
}): ReplayAssumptionV1[] {
  const assumptions = new Map(input.tracker.assumptions);
  assumptions.set(
    "NO_ALLOWANCE_WINDOW",
    "A Direct API target has no included capacity, no allowance window, no admission decision and no reset phase: every recorded event is served and priced.",
  );
  assumptions.set(
    "RECORDED_DEMAND_STREAM",
    "The replay prices the recorded demand stream: nothing here models how a person or an agent would have changed behaviour in response to price.",
  );
  assumptions.set(
    "CURRENT_RULE_SNAPSHOT",
    "Prices are the API list-price records in force at rulesAsOf; the historical event timestamps select conditional rate tiers and schedules inside those records.",
  );
  assumptions.set(
    "DIRECT_API_LIST_PRICE",
    "Every event is priced at the selected provider's published API list price for the recorded token categories. Batch discounts, provisioned capacity, taxes, FX, minimums and negotiated account terms are not modelled, so a real invoice can differ.",
  );
  assumptions.set(
    "MODEL_SCOPED_API_PRICE",
    "An API list price belongs to the model, not to the provider: the record in force at rulesAsOf prices the model however many providers offer it. The selected provider decides availability.",
  );
  assumptions.set(
    "DISJOINT_TOKEN_ACCOUNTING",
    "Consumption uses disjoint canonical token buckets derived from each event's accounting declaration, so overlapping categories are never double counted.",
  );
  if (input.translation !== undefined && input.translation.substitutedEvents > 0) {
    assumptions.set(
      "MODEL_TRANSLATION_ASSUMPTION",
      "Cross-model translation is an explicit scenario assumption: the substitute model is not an alias of the recorded model, and nothing here claims equal capability, quality, output length or tool behaviour.",
    );
    assumptions.set(
      "TRANSLATION_TOKEN_PRESERVING",
      "The translation preserves the recorded token quantities: the substitute model is assumed to consume the same input, cache, output and reasoning amounts. No empirical conversion ratio or equivalence is applied or implied.",
    );
  }
  return [...assumptions.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, description]) => ({ id, description }));
}

function apiConfidence(input: {
  timed: readonly TimedEvent[];
  catalog: CatalogV1;
  usedPricingIds: ReadonlySet<string>;
  tracker: Tracker;
  translation: ReplayTranslationV1 | undefined;
  notOfferedEvents: number;
  offeringUnestablishedEvents: number;
  unresolvedModelEvents: number;
  mappedModelEvents: number;
}): ReplayConfidenceV1 {
  const { timed, catalog, usedPricingIds, tracker, translation } = input;
  const factors: ConfidenceFactor[] = [];

  const estimatedUsage = timed.filter(({ event }) => event.confidence.usage === "estimated").length;
  const noTokenData = timed.filter(({ event }) => !hasAnyReportedTokens(event.usage)).length;
  factors.push({
    id: "source_data",
    level: noTokenData > 0 ? "low" : estimatedUsage > 0 ? "medium" : "high",
    description:
      noTokenData > 0
        ? `${noTokenData} event(s) report no token data at all.`
        : estimatedUsage > 0
          ? `${estimatedUsage} event(s) report estimated usage rather than exact counters.`
          : "Token history is exact for every event.",
  });

  const unknownAccounting = timed.filter(
    ({ event }) => !tokenAccountingOf(event.usage).known,
  ).length;
  factors.push({
    id: "token_accounting",
    level: unknownAccounting > 0 ? "low" : "high",
    description:
      unknownAccounting > 0
        ? `${unknownAccounting} event(s) do not report every canonical token category, so their consumption cannot be established.`
        : "Every event reports all canonical token categories, so disjoint consumption is known.",
  });

  const unresolved = input.unresolvedModelEvents;
  const mapped = input.mappedModelEvents;
  factors.push({
    id: "model_mapping",
    level: unresolved > 0 ? "low" : mapped > 0 ? "medium" : "high",
    description:
      unresolved > 0
        ? `${unresolved} event(s) have unresolved models or declare unknown model attribution.`
        : mapped > 0
          ? `${mapped} event(s) use name mapping or declare mapped model attribution.`
          : "Every event model resolved exactly against the catalog.",
  });

  if (usedPricingIds.size > 0) {
    const levels = [...usedPricingIds].sort().map((pricingId) => {
      const pricing = catalog.pricing[pricingId];
      return pricing !== undefined ? levelFromVerification(pricing.verificationStatus) : "low";
    });
    factors.push({
      id: "pricing_rules",
      level: worstLevel(levels),
      description:
        "API list-price entries used by this replay, by their catalog verification status.",
    });
  } else {
    factors.push({
      id: "pricing_rules",
      level: "low",
      description:
        "No event could be priced from an API list-price entry in force at the pinned instant.",
    });
  }

  if (
    tracker.warnings.has("API_PRICE_NOT_RECORDED") ||
    tracker.warnings.has("API_PRICE_NOT_IN_FORCE") ||
    tracker.warnings.has("API_PRICE_WRONG_BASIS") ||
    tracker.warnings.has("API_PRICE_CATEGORY_UNDOCUMENTED")
  ) {
    factors.push({
      id: "pricing_completeness",
      level: "low",
      description:
        "Some events could not be priced from the API list-price records in force (no record, a record outside the pinned instant, a non-API basis, or an unestablished token category), so their monetary consumption is unknown.",
    });
  }

  if (input.notOfferedEvents > 0) {
    factors.push({
      id: "model_availability",
      level: "low",
      description: `${input.notOfferedEvents} event(s) use models the selected provider is not recorded as offering, so they are reported as unavailable rather than priced.`,
    });
  } else if (input.offeringUnestablishedEvents > 0) {
    factors.push({
      id: "model_availability",
      level: "low",
      description: `${input.offeringUnestablishedEvents} event(s) use models whose provider offering the catalog does not establish, so whether the target serves them is unknown.`,
    });
  }

  if (translation !== undefined && translation.substitutedEvents > 0) {
    factors.push({
      id: "model_translation",
      level: "low",
      description: `${translation.substitutedEvents} event(s) were replayed against a substitute model under an explicit scenario assumption. A translated replay is a counterfactual: its token quantities are assumed to carry over unchanged rather than measured.`,
    });
  }

  return { level: worstLevel(factors.map((factor) => factor.level)), factors };
}
