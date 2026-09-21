import {
  type CatalogV1,
  catalogV1Schema,
  getPlanVersion,
  getPricing,
  type LoadedPlanVersionV1,
  type ModelRuleV1,
  type PlanLimitV1,
} from "@stackreplay/catalog";
import {
  type ConstraintResultV1,
  type ConstraintStatusV1,
  type ConstraintUnitV1,
  type CoverageDimensionsV1,
  type CoverageDimensionV1,
  type ExecutionReplayResultV1,
  type ExecutionTargetV1,
  isSubscriptionTargetV1,
  type ReplayAssumptionV1,
  type ReplayConfidenceV1,
  type ReplayViolationV1,
  type ReplayWarningV1,
  type TextUsageEventV1,
  type TextUsageV1,
  type UnsupportedModelV1,
  usageEventV1Schema,
  type WorkloadSummaryV1,
} from "@stackreplay/schema";
import { type ConfidenceFactor, levelFromVerification, worstLevel } from "./confidence.js";
import { ReplayEngineError } from "./errors.js";
import { Decimal, ONE, parseAmount, toUnitString, ZERO } from "./money.js";
import { dateRangeContains, epochMsFromIso, isoFromEpochMs } from "./time.js";
import { hasAnyTokenData, moneyUnitsForUsage, tokenCountOf } from "./units.js";
import { ENGINE_VERSION } from "./version.js";
import { sliceWindows, sortTimedEvents, type TimedEvent, toTimedEvents } from "./windows.js";

/**
 * The replay engine (spec point 22, decisions 1-5). Pure and deterministic:
 * same events + same target + same catalog always produce the same result.
 *
 * Milestone 1 implements subscription targets end to end. The api, local and
 * hybrid target types exist in the schema but raise TARGET_NOT_IMPLEMENTED
 * here; their behavior belongs to later milestones.
 */

/**
 * Reserved for later milestones: the M1 engine has no tunable behavior, so
 * there is nothing to configure yet.
 */
export type ReplayOptions = Record<string, never>;

export interface ReplayInput {
  events: readonly TextUsageEventV1[];
  target: ExecutionTargetV1;
  catalog: CatalogV1;
  options?: ReplayOptions;
}

export function replay(input: ReplayInput): ExecutionReplayResultV1 {
  const catalog = parseCatalog(input.catalog);
  const planVersion = resolveTargetPlan(input.target, catalog);
  const events = validateEvents(input.events);
  const timed = sortTimedEvents(toTimedEvents(events));

  const tracker = new Tracker();
  const resolution = resolveModels(timed, planVersion, catalog, tracker);
  const prepared = prepareEvents(timed, resolution, catalog, planVersion, tracker);
  const evaluation = evaluateConstraints(timed, resolution, prepared, planVersion, tracker);
  const coverage = computeCoverage(timed, resolution, evaluation.blockedEventIds);
  const confidence = computeConfidence(timed, resolution, planVersion, catalog);

  return {
    version: 1,
    workload: summarizeWorkload(timed, resolution),
    target: input.target,
    feasibility: {
      status: feasibilityStatus(coverage, evaluation.constraints),
      coveragePercent: coverage.requests.percent,
    },
    coverage,
    constraints: evaluation.constraints,
    violations: evaluation.violations,
    unsupportedModels: collectUnsupportedModels(timed, resolution),
    economics: {
      targetCost: { amount: planVersion.price.amount, currency: planVersion.price.currency },
      costBasis: "fixed_plan_price",
    },
    assumptions: buildAssumptions(planVersion, tracker, evaluation.constraints),
    confidence,
    warnings: buildWarnings(tracker),
    versions: {
      engine: ENGINE_VERSION,
      catalog: catalog.catalogVersion,
      planVersionId: planVersion.versionId,
    },
    subscription: {
      planId: planVersion.planId,
      planVersionId: planVersion.versionId,
      name: planVersion.planName,
      providerId: planVersion.providerId,
      price: { amount: planVersion.price.amount, currency: planVersion.price.currency },
      interval: planVersion.price.interval,
      verificationStatus: planVersion.verificationStatus,
    },
  };
}

class Tracker {
  readonly warnings = new Map<string, { message: string; count: number }>();
  readonly assumptions = new Map<string, string>();

  warn(code: string, message: string): void {
    const existing = this.warnings.get(code);
    if (existing === undefined) {
      this.warnings.set(code, { message, count: 1 });
    } else {
      existing.count += 1;
    }
  }

  assume(id: string, description: string): void {
    if (!this.assumptions.has(id)) this.assumptions.set(id, description);
  }
}

function parseCatalog(catalog: CatalogV1): CatalogV1 {
  const parsed = catalogV1Schema.safeParse(catalog);
  if (!parsed.success) {
    throw new ReplayEngineError(
      "CATALOG_INVALID",
      "The catalog did not pass validation.",
      parsed.error.issues
        .slice(0, 10)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    );
  }
  return parsed.data;
}

function resolveTargetPlan(target: ExecutionTargetV1, catalog: CatalogV1): LoadedPlanVersionV1 {
  if (!isSubscriptionTargetV1(target)) {
    throw new ReplayEngineError(
      "TARGET_NOT_IMPLEMENTED",
      `Replay for "${target.type}" targets is not implemented in this milestone.`,
      [`target.type=${target.type}`],
    );
  }
  const planVersion = getPlanVersion(catalog, target.planVersionId);
  if (planVersion === undefined) {
    throw new ReplayEngineError(
      "PLAN_VERSION_NOT_FOUND",
      "The requested plan version is not present in this catalog.",
      [`planVersionId=${target.planVersionId}`],
    );
  }
  return planVersion;
}

function validateEvents(events: readonly TextUsageEventV1[]): TextUsageEventV1[] {
  const validated: TextUsageEventV1[] = [];
  const seenIds = new Set<string>();
  for (let index = 0; index < events.length; index += 1) {
    const result = usageEventV1Schema.safeParse(events[index]);
    if (!result.success) {
      throw new ReplayEngineError(
        "IMPORT_SCHEMA_INVALID",
        "A usage event did not pass schema validation.",
        [
          `index=${index}`,
          ...result.error.issues
            .slice(0, 5)
            .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
        ],
      );
    }
    const event = result.data;
    try {
      epochMsFromIso(event.occurredAt);
    } catch {
      throw new ReplayEngineError(
        "IMPORT_SCHEMA_INVALID",
        "A usage event has an invalid UTC timestamp.",
        [`index=${index}`, `occurredAt=${event.occurredAt}`],
      );
    }
    if (seenIds.has(event.id)) {
      throw new ReplayEngineError(
        "IMPORT_SCHEMA_INVALID",
        "Duplicate event ids are not allowed; imports must be idempotent.",
        [`index=${index}`, `id=${event.id}`],
      );
    }
    seenIds.add(event.id);
    validated.push(event);
  }
  return validated;
}

interface ModelResolution {
  quality: "exact" | "mapped" | "unknown";
  modelId?: string;
  supported: boolean;
  unsupportedReason?: "not_supported" | "excluded" | "unresolved";
  rule?: ModelRuleV1;
}

function resolveModels(
  timed: readonly TimedEvent[],
  planVersion: LoadedPlanVersionV1,
  catalog: CatalogV1,
  tracker: Tracker,
): Map<string, ModelResolution> {
  const ruleByModel = new Map<string, ModelRuleV1>();
  for (const rule of planVersion.modelRules) ruleByModel.set(rule.model, rule);

  const byName = new Map<string, string>();
  for (const model of Object.values(catalog.models)) {
    byName.set(model.id.toLowerCase(), model.id);
    byName.set(model.name.toLowerCase(), model.id);
  }

  const resolution = new Map<string, ModelResolution>();
  for (const { event } of timed) {
    const canonicalId = event.model.canonicalId;
    let modelId: string | undefined;
    let quality: ModelResolution["quality"];

    if (canonicalId !== undefined && catalog.models[canonicalId] !== undefined) {
      modelId = canonicalId;
      quality = "exact";
    } else {
      const mapped = byName.get(event.model.rawName.toLowerCase());
      if (mapped !== undefined) {
        modelId = mapped;
        quality = "mapped";
      } else {
        quality = "unknown";
      }
    }

    if (modelId === undefined) {
      tracker.warn(
        "MODEL_UNRESOLVED",
        "One or more events use models that could not be mapped to the catalog.",
      );
      resolution.set(event.id, { quality, supported: false, unsupportedReason: "unresolved" });
      continue;
    }

    const rule = ruleByModel.get(modelId);
    if (rule === undefined) {
      resolution.set(event.id, {
        quality,
        modelId,
        supported: false,
        unsupportedReason: "not_supported",
      });
      continue;
    }
    if (rule.excluded === true) {
      resolution.set(event.id, {
        quality,
        modelId,
        supported: false,
        unsupportedReason: "excluded",
        rule,
      });
      continue;
    }
    resolution.set(event.id, { quality, modelId, supported: true, rule });
  }
  return resolution;
}

interface PreparedEvent {
  moneyUnits: Decimal;
  /** Exact integer token count; converted to Decimal only when a multiplier applies. */
  tokenUnits: number;
  multiplier: Decimal;
}

function prepareEvents(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
  catalog: CatalogV1,
  planVersion: LoadedPlanVersionV1,
  tracker: Tracker,
): Map<string, PreparedEvent> {
  const needsMoney = planVersion.limits.some((limit) => limit.type === "credit_pool");
  const needsMultipliedUnits = planVersion.limits.some((limit) => limit.type !== "request_limit");

  const prepared = new Map<string, PreparedEvent>();
  for (const { event } of timed) {
    const res = resolution.get(event.id);
    if (res === undefined) continue;

    if (!hasAnyTokenData(event.usage)) {
      tracker.warn(
        "EVENT_MISSING_TOKEN_DATA",
        "One or more events carry no token data; their consumption could not be measured.",
      );
    }

    let moneyUnits = ZERO;
    if (needsMoney && res.supported && res.rule !== undefined) {
      const pricing =
        res.rule.pricingRef !== undefined ? getPricing(catalog, res.rule.pricingRef) : undefined;
      const outcome = moneyUnitsForUsage(event.usage, pricing);
      if (outcome.missingPricing) {
        tracker.warn(
          "PRICING_MISSING",
          "One or more events use a model without a pricing entry; credit consumption could not be measured for them.",
        );
      }
      if (outcome.usedCacheFallbackRate) {
        tracker.warn(
          "PRICING_RATE_FALLBACK",
          "One or more events include cache tokens priced at the input rate because the pricing entry has no cache rate.",
        );
      }
      if (outcome.usedReasoningFallbackRate) {
        tracker.assume(
          "REASONING_PRICED_AS_OUTPUT",
          "Reasoning tokens are priced at the output rate when a pricing entry has no dedicated reasoning rate.",
        );
      }
      moneyUnits = outcome.units;
    }

    prepared.set(event.id, {
      moneyUnits,
      tokenUnits: tokenCountOf(event.usage),
      multiplier: needsMultipliedUnits
        ? consumptionMultiplier(event.occurredAt, res, planVersion)
        : ONE,
    });
  }
  return prepared;
}

/**
 * Consumption multiplier for an event: the model rule's multiplier times any
 * active promotion. The common case (no multiplier, no promotions) returns the
 * shared ONE instance, which callers compare by identity to skip a Decimal
 * multiplication for every event.
 */
function consumptionMultiplier(
  occurredAt: string,
  res: ModelResolution,
  planVersion: LoadedPlanVersionV1,
): Decimal {
  const ruleMultiplier = res.rule?.multiplier;
  const promotions = planVersion.promotions;
  if (ruleMultiplier === undefined && (promotions === undefined || promotions.length === 0)) {
    return ONE;
  }

  let multiplier = ONE;
  if (ruleMultiplier !== undefined) multiplier = multiplier.times(parseAmount(ruleMultiplier));

  // `occurredAt` is validated as an ISO-8601 UTC timestamp, so its first ten
  // characters are its UTC date. No Temporal conversion is needed here.
  const date = occurredAt.slice(0, 10);
  for (const promotion of promotions ?? []) {
    if (!dateRangeContains(date, promotion.effectiveFrom, promotion.effectiveTo)) continue;
    const applies =
      promotion.models === undefined ||
      (res.modelId !== undefined && promotion.models.includes(res.modelId));
    if (applies) multiplier = multiplier.times(parseAmount(promotion.multiplier));
  }
  return multiplier;
}

const UNIT_BY_LIMIT_KIND: Record<PlanLimitV1["type"], ConstraintUnitV1> = {
  credit_pool: "currency",
  token_limit: "tokens",
  request_limit: "requests",
};

interface ConstraintEvaluation {
  constraints: ConstraintResultV1[];
  violations: ReplayViolationV1[];
  blockedEventIds: Set<string>;
}

function evaluateConstraints(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
  prepared: ReadonlyMap<string, PreparedEvent>,
  planVersion: LoadedPlanVersionV1,
  tracker: Tracker,
): ConstraintEvaluation {
  const constraints: ConstraintResultV1[] = [];
  const violations: ReplayViolationV1[] = [];
  const blockedEventIds = new Set<string>();

  for (const limit of planVersion.limits) {
    const unit = UNIT_BY_LIMIT_KIND[limit.type];
    const eligible = timed.filter(({ event }) => {
      const res = resolution.get(event.id);
      if (res === undefined || !res.supported) return false;
      if (limit.models !== undefined) {
        if (res.modelId === undefined || !limit.models.includes(res.modelId)) return false;
      }
      return true;
    });

    const limitAmount = parseAmount(limit.amount);
    const sliced = sliceWindows(eligible, limit.window);
    const windowViolations: ReplayViolationV1[] = [];
    let totalDemand = ZERO;

    const isRequestLimit = limit.type === "request_limit";
    const isCreditPool = limit.type === "credit_pool";

    /**
     * Units one event consumes against this limit. Request counts and token
     * counts stay plain integers while no multiplier applies, so the common
     * case never allocates a Decimal per event.
     */
    const unitsOf = (event: TextUsageEventV1): Decimal | number => {
      if (isRequestLimit) return 1;
      const preparedEvent = prepared.get(event.id);
      if (preparedEvent === undefined) return 0;
      if (isCreditPool) {
        const base = preparedEvent.moneyUnits;
        if (base.isZero()) return ZERO;
        return preparedEvent.multiplier === ONE ? base : base.times(preparedEvent.multiplier);
      }
      const tokens = preparedEvent.tokenUnits;
      if (tokens === 0) return 0;
      return preparedEvent.multiplier === ONE
        ? tokens
        : new Decimal(tokens).times(preparedEvent.multiplier);
    };

    /** Exact sum of the units consumed by a set of events. */
    const sumOf = (events: readonly TimedEvent[]): Decimal => {
      let numberTotal = 0;
      let decimalTotal: Decimal | null = null;
      for (const { event } of events) {
        const value = unitsOf(event);
        if (typeof value === "number") {
          numberTotal += value;
        } else if (!value.isZero()) {
          decimalTotal = decimalTotal === null ? value : decimalTotal.plus(value);
        }
      }
      if (decimalTotal === null) return new Decimal(numberTotal);
      return numberTotal === 0 ? decimalTotal : decimalTotal.plus(numberTotal);
    };

    for (const slice of sliced.slices) {
      const windowTotal = sumOf(slice.events);
      totalDemand = totalDemand.plus(windowTotal);
      if (!windowTotal.gt(limitAmount)) continue;
      if (limit.enforcement === "overage") continue;

      let running = ZERO;
      let affected = 0;
      let crossed = false;
      for (const { event } of slice.events) {
        if (crossed) {
          affected += 1;
          if (limit.enforcement === "hard_stop") blockedEventIds.add(event.id);
          continue;
        }
        const raw = unitsOf(event);
        const value = typeof raw === "number" ? new Decimal(raw) : raw;
        if (!value.isZero() && running.plus(value).gt(limitAmount)) {
          crossed = true;
          affected += 1;
          if (limit.enforcement === "hard_stop") blockedEventIds.add(event.id);
        } else if (!value.isZero()) {
          running = running.plus(value);
        }
      }

      windowViolations.push({
        type: sliced.kind === "rolling" ? "rolling_window_exceeded" : "calendar_window_exceeded",
        constraintId: limit.id,
        unit,
        startedAt: isoFromEpochMs(slice.startMs),
        endedAt: isoFromEpochMs(slice.endMs),
        affectedEvents: affected,
        requiredUnits: toUnitString(windowTotal),
        availableUnits: toUnitString(limitAmount),
        ...(limit.models !== undefined ? { modelIds: [...limit.models] } : {}),
      });
    }

    if (limit.enforcement === "overage") {
      tracker.warn(
        "CONSTRAINT_TYPE_UNSUPPORTED",
        "One or more constraints use overage enforcement, which is not modeled in this milestone; they are reported as UNKNOWN.",
      );
    }

    const status: ConstraintStatusV1 =
      limit.enforcement === "overage"
        ? "unknown"
        : windowViolations.length > 0
          ? "exceeded"
          : "pass";

    constraints.push({
      id: limit.id,
      label: limit.label,
      kind: limit.type,
      unit,
      window: { kind: sliced.kind, description: sliced.description },
      enforcement: limit.enforcement,
      status,
      limitUnits: toUnitString(limitAmount),
      consumedUnits: toUnitString(totalDemand),
      violationCount: windowViolations.length,
      ...(limit.models !== undefined ? { modelIds: [...limit.models] } : {}),
    });
    violations.push(...windowViolations);
  }

  return { constraints, violations, blockedEventIds };
}

function roundPercent(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function coverageDimension(covered: number, total: number): CoverageDimensionV1 {
  return {
    percent: roundPercent(total === 0 ? 100 : (covered / total) * 100),
    covered,
    total,
  };
}

function computeCoverage(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
  blockedEventIds: ReadonlySet<string>,
): CoverageDimensionsV1 {
  let coveredEvents = 0;
  let totalTokens = 0;
  let coveredTokens = 0;
  const usedModels = new Map<string, boolean>();

  for (const { event } of timed) {
    const res = resolution.get(event.id);
    const tokens = tokenCountOf(event.usage);
    totalTokens += tokens;
    const supported = res?.supported === true;
    const covered = supported && !blockedEventIds.has(event.id);
    if (covered) {
      coveredEvents += 1;
      coveredTokens += tokens;
    }
    const key = res?.modelId ?? `raw:${event.model.rawName}`;
    usedModels.set(key, supported);
  }

  const coveredModels = [...usedModels.values()].filter(Boolean).length;
  return {
    requests: coverageDimension(coveredEvents, timed.length),
    usage: coverageDimension(coveredTokens, totalTokens),
    models: coverageDimension(coveredModels, usedModels.size),
  };
}

function feasibilityStatus(
  coverage: CoverageDimensionsV1,
  constraints: readonly ConstraintResultV1[],
): ExecutionReplayResultV1["feasibility"]["status"] {
  if (constraints.some((constraint) => constraint.status === "unknown")) return "unknown";
  if (coverage.requests.total === 0 || coverage.requests.percent >= 100) return "full";
  if (coverage.requests.percent === 0) return "none";
  return "partial";
}

function collectUnsupportedModels(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
): UnsupportedModelV1[] {
  const byKey = new Map<
    string,
    { rawName: string; canonicalId?: string; count: number; reason: UnsupportedModelV1["reason"] }
  >();

  for (const { event } of timed) {
    const res = resolution.get(event.id);
    if (res === undefined || res.supported) continue;
    const key = res.modelId ?? `raw:${event.model.rawName}`;
    const existing = byKey.get(key);
    if (existing !== undefined) {
      existing.count += 1;
      continue;
    }
    byKey.set(key, {
      rawName: event.model.rawName,
      ...(res.modelId !== undefined ? { canonicalId: res.modelId } : {}),
      count: 1,
      reason: res.unsupportedReason ?? "unresolved",
    });
  }

  return [...byKey.values()]
    .sort((a, b) => (a.rawName < b.rawName ? -1 : a.rawName > b.rawName ? 1 : 0))
    .map((entry) => ({
      rawName: entry.rawName,
      ...(entry.canonicalId !== undefined ? { canonicalId: entry.canonicalId } : {}),
      eventCount: entry.count,
      reason: entry.reason,
    }));
}

function computeConfidence(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
  planVersion: LoadedPlanVersionV1,
  catalog: CatalogV1,
): ReplayConfidenceV1 {
  const factors: ConfidenceFactor[] = [];

  const missingTokenData = timed.filter(({ event }) => !hasAnyTokenData(event.usage)).length;
  const estimatedUsage = timed.filter(({ event }) => event.confidence.usage === "estimated").length;
  const sourceLevel = missingTokenData > 0 ? "low" : estimatedUsage > 0 ? "medium" : "high";
  factors.push({
    id: "source_data",
    level: sourceLevel,
    description:
      missingTokenData > 0
        ? `${missingTokenData} event(s) carry no token data.`
        : estimatedUsage > 0
          ? `${estimatedUsage} event(s) report estimated usage rather than exact counters.`
          : "Token history is exact for every event.",
  });

  const unresolved = timed.filter(
    ({ event }) => resolution.get(event.id)?.quality === "unknown",
  ).length;
  const mapped = timed.filter(({ event }) => resolution.get(event.id)?.quality === "mapped").length;
  const modelLevel = unresolved > 0 ? "low" : mapped > 0 ? "medium" : "high";
  factors.push({
    id: "model_mapping",
    level: modelLevel,
    description:
      unresolved > 0
        ? `${unresolved} event(s) use models that are not in the catalog.`
        : mapped > 0
          ? `${mapped} event(s) were mapped to catalog models by name rather than by canonical id.`
          : "Every event model resolved exactly against the catalog.",
  });

  factors.push({
    id: "plan_rules",
    level: levelFromVerification(planVersion.verificationStatus),
    description: `Plan rules are marked "${planVersion.verificationStatus}" in the catalog.`,
  });

  const usedPricingIds = new Set<string>();
  for (const res of resolution.values()) {
    if (res.supported && res.rule?.pricingRef !== undefined)
      usedPricingIds.add(res.rule.pricingRef);
  }
  if (usedPricingIds.size > 0) {
    const levels = [...usedPricingIds].sort().map((pricingId) => {
      const pricing = catalog.pricing[pricingId];
      return pricing !== undefined ? levelFromVerification(pricing.verificationStatus) : "low";
    });
    factors.push({
      id: "pricing_rules",
      level: worstLevel(levels),
      description: "Pricing entries used by this replay, by their catalog verification status.",
    });
  }

  const unsupportedConstraints = planVersion.limits.filter(
    (limit) => limit.enforcement === "overage",
  ).length;
  if (unsupportedConstraints > 0) {
    factors.push({
      id: "constraint_modeling",
      level: "medium",
      description: `${unsupportedConstraints} constraint(s) cannot be fully modeled yet.`,
    });
  }

  return { level: worstLevel(factors.map((factor) => factor.level)), factors };
}

function summarizeWorkload(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
): WorkloadSummaryV1 {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let reasoningTokens = 0;
  let hasInput = false;
  let hasOutput = false;
  let hasCacheRead = false;
  let hasCacheWrite = false;
  let hasReasoning = false;
  const sessions = new Set<string>();
  const models = new Set<string>();

  for (const { event } of timed) {
    const usage = event.usage;
    if (usage.inputTokens !== undefined) {
      inputTokens += usage.inputTokens;
      hasInput = true;
    }
    if (usage.outputTokens !== undefined) {
      outputTokens += usage.outputTokens;
      hasOutput = true;
    }
    if (usage.cacheReadTokens !== undefined) {
      cacheReadTokens += usage.cacheReadTokens;
      hasCacheRead = true;
    }
    if (usage.cacheWriteTokens !== undefined) {
      cacheWriteTokens += usage.cacheWriteTokens;
      hasCacheWrite = true;
    }
    if (usage.reasoningTokens !== undefined) {
      reasoningTokens += usage.reasoningTokens;
      hasReasoning = true;
    }
    const session = event.source.nativeSessionHash;
    if (session !== undefined) sessions.add(session);
    const res = resolution.get(event.id);
    models.add(res?.modelId ?? `raw:${event.model.rawName}`);
  }

  const tokenTotals: TextUsageV1 = {};
  if (hasCacheRead) tokenTotals.cacheReadTokens = cacheReadTokens;
  if (hasCacheWrite) tokenTotals.cacheWriteTokens = cacheWriteTokens;
  if (hasInput) tokenTotals.inputTokens = inputTokens;
  if (hasOutput) tokenTotals.outputTokens = outputTokens;
  if (hasReasoning) tokenTotals.reasoningTokens = reasoningTokens;

  const first = timed[0];
  const last = timed[timed.length - 1];
  return {
    eventCount: timed.length,
    ...(first !== undefined ? { from: isoFromEpochMs(first.atMs) } : {}),
    ...(last !== undefined ? { to: isoFromEpochMs(last.atMs) } : {}),
    modelCount: models.size,
    ...(sessions.size > 0 ? { sessionCount: sessions.size } : {}),
    tokenTotals,
  };
}

function buildAssumptions(
  planVersion: LoadedPlanVersionV1,
  tracker: Tracker,
  constraints: readonly ConstraintResultV1[],
): ReplayAssumptionV1[] {
  const assumptions = new Map(tracker.assumptions);
  assumptions.set(
    "NO_PRORATION",
    "The target cost is the plan's fixed price; no proration is applied for replay windows shorter than a billing period.",
  );
  if (constraints.length > 1) {
    assumptions.set(
      "CONSTRAINTS_EVALUATED_INDEPENDENTLY",
      "Constraints are evaluated independently: an event blocked by one hard limit still counts toward other limits' demand.",
    );
  }
  if (
    planVersion.limits.some(
      (limit) => limit.window.type === "calendar" && limit.window.unit === "month",
    )
  ) {
    assumptions.set(
      "MONTHLY_WINDOW_CALENDAR_MONTH",
      "Calendar month windows are modeled as UTC calendar months; billing anchors are not part of the data model yet.",
    );
  }
  if (planVersion.limits.some((limit) => limit.type === "token_limit")) {
    assumptions.set(
      "TOKEN_LIMIT_ALL_CATEGORIES",
      "Token limits count all recorded token categories summed.",
    );
  }
  if (planVersion.limits.length > 0) {
    assumptions.set("WINDOW_BOUNDARIES", "Window boundaries are half-open: [start, end).");
  }

  return [...assumptions.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, description]) => ({ id, description }));
}

function buildWarnings(tracker: Tracker): ReplayWarningV1[] {
  return [...tracker.warnings.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([code, entry]) => ({ code, message: entry.message, eventCount: entry.count }));
}
