import {
  type CatalogV1,
  catalogV1Schema,
  createModelIdentityIndex,
  getPlanVersion,
  getPricing,
  type LoadedPlanVersionV1,
  type ModelRuleV1,
  type PlanLimitV1,
  validateLoadedCatalog,
} from "@stackreplay/catalog";
import {
  type ConstraintResultV1,
  type ConstraintStatusV1,
  type CoverageDimensionsV1,
  type CoverageDimensionV1,
  type EconomicsV1,
  type ExecutionReplayResultV1,
  type ExecutionTargetV1,
  executionTargetV1Schema,
  type FeasibilityV1,
  isSubscriptionTargetV1,
  type MeasurementUnitV1,
  type ReplayAssumptionV1,
  type ReplayConfidenceV1,
  type ReplayContextV1,
  type ReplayViolationV1,
  type ReplayWarningV1,
  replayContextV1Schema,
  type SubscriptionTargetV1,
  type TextUsageEventV1,
  type TokenTotalsV1,
  type UnsupportedModelV1,
  usageEventV1Schema,
  type WorkloadSummaryV1,
} from "@stackreplay/schema";
import { type ConfidenceFactor, levelFromVerification, worstLevel } from "./confidence.js";
import { ReplayEngineError } from "./errors.js";
import { Decimal, ONE, parseAmount, toUnitString, ZERO } from "./money.js";
import { dateRangeContains, epochMsFromIso, isoFromEpochMs } from "./time.js";
import {
  hasAnyReportedTokens,
  moneyUnitsForUsage,
  reportedTokenCount,
  type TokenAccounting,
  tokenAccountingOf,
} from "./units.js";
import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "./version.js";
import {
  sliceWindows,
  sortTimedEvents,
  type TimedEvent,
  toTimedEvents,
  type WindowSlice,
} from "./windows.js";

/**
 * The replay engine (spec point 22, decisions 1-5, 13-20).
 *
 * Pure and deterministic: the same events, target, catalog and explicit rules
 * context always produce the same result, and the engine never reads a clock.
 *
 * Milestone 1 implements subscription targets end to end. The api, local and
 * hybrid target types exist in the schema but raise TARGET_NOT_IMPLEMENTED
 * here; their behavior belongs to later milestones.
 *
 * Semantics that matter for correctness:
 * - Admission is chronological and atomic across applicable constraints: an
 *   event rejected by one constraint consumes nothing from any other pool.
 * - Attempted demand and accepted consumption are separate: violations report
 *   both, and only accepted consumption advances capacity.
 * - Each rule declares its own exceed behavior; nothing latches or bills by
 *   default.
 * - Unknown consumption produces indeterminate events and unknown constraints,
 *   never a silent pass.
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
  /** Explicit rules context (decision 17): the engine never reads a clock. */
  context: ReplayContextV1;
  options?: ReplayOptions;
}

export function replay(input: ReplayInput): ExecutionReplayResultV1 {
  const catalog = parseCatalog(input.catalog);
  const context = parseContext(input.context);
  const target = parseTarget(input.target);
  const planVersion = resolveTargetPlan(target, catalog, context.rulesAsOf);
  const events = validateEvents(input.events);
  const timed = sortTimedEvents(toTimedEvents(events));

  const tracker = new Tracker();
  const resolution = resolveModels(timed, planVersion, catalog, context.rulesAsOf, tracker);
  const prepared = prepareEvents(timed, resolution, catalog, planVersion, tracker);
  const evaluation = evaluateConstraints(timed, resolution, prepared, planVersion, tracker);
  const coverage = computeCoverage(timed, prepared);
  const confidence = computeConfidence(timed, prepared, planVersion, catalog, evaluation, tracker);

  const pricingReferences = collectPricingReferences(planVersion);
  const economics =
    evaluation.hasOverageRule && evaluation.unknownConstraints > 0
      ? undefined
      : computeEconomics(planVersion, evaluation);
  if (economics === undefined)
    tracker.warn(
      "ECONOMICS_UNKNOWN",
      "Indeterminate admission prevents an exact overage total; economics are omitted.",
    );

  return {
    version: 1,
    workload: summarizeWorkload(timed, prepared),
    target,
    feasibility: feasibilityOf(coverage, evaluation.constraints),
    coverage,
    constraints: evaluation.constraints,
    violations: evaluation.violations,
    unsupportedModels: collectUnsupportedModels(timed, resolution),
    ...(economics !== undefined ? { economics } : {}),
    assumptions: buildAssumptions(planVersion, tracker, evaluation.constraints),
    confidence,
    warnings: buildWarnings(tracker),
    versions: {
      engine: ENGINE_VERSION,
      schema: 1,
      catalog: catalog.catalogVersion,
      methodology: REPLAY_METHODOLOGY_VERSION,
      rulesAsOf: context.rulesAsOf,
      targetType: target.type,
      targetReference: planVersion.versionId,
      ...(pricingReferences.length > 0 ? { pricingReferences } : {}),
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
  // Errors only: the catalog validator reports advisory warnings (for example a
  // model rule with no API pricing reference, which simply means no list-price
  // equivalent is available) and a warning must not make a catalog unusable.
  const issues = validateLoadedCatalog(parsed.data).filter((issue) => issue.severity === "error");
  if (issues.length > 0)
    throw new ReplayEngineError(
      "CATALOG_INVALID",
      "The catalog did not pass semantic validation.",
      issues.map((issue) => issue.message),
    );
  return parsed.data;
}

function parseContext(context: ReplayContextV1): ReplayContextV1 {
  const parsed = replayContextV1Schema.safeParse(context);
  if (!parsed.success) {
    throw new ReplayEngineError(
      "IMPORT_SCHEMA_INVALID",
      "A replay rules context with an explicit rulesAsOf date is required.",
      parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    );
  }
  return parsed.data;
}

function parseTarget(target: ExecutionTargetV1): ExecutionTargetV1 {
  const parsed = executionTargetV1Schema.safeParse(target);
  if (!parsed.success)
    throw new ReplayEngineError("IMPORT_SCHEMA_INVALID", "Invalid execution target.");
  return parsed.data;
}

/**
 * Resolves the plan version to replay against (decision 17): either the pinned
 * version, or the version effective at rulesAsOf, selected deterministically
 * without consulting any clock.
 */
function resolveTargetPlan(
  target: ExecutionTargetV1,
  catalog: CatalogV1,
  rulesAsOf: string,
): LoadedPlanVersionV1 {
  if (!isSubscriptionTargetV1(target)) {
    throw new ReplayEngineError(
      "TARGET_NOT_IMPLEMENTED",
      `Replay for "${target.type}" targets is not implemented in this milestone.`,
      [`target.type=${target.type}`],
    );
  }

  const subscriptionTarget: SubscriptionTargetV1 = target;
  const hasVersion = subscriptionTarget.planVersionId !== undefined;
  const hasPlan = subscriptionTarget.planId !== undefined;
  if (hasVersion === hasPlan) {
    throw new ReplayEngineError(
      "IMPORT_SCHEMA_INVALID",
      "A subscription target requires exactly one of planVersionId or planId.",
    );
  }

  if (hasVersion) {
    const planVersion = getPlanVersion(catalog, subscriptionTarget.planVersionId as string);
    if (planVersion === undefined) {
      throw new ReplayEngineError(
        "PLAN_VERSION_NOT_FOUND",
        "The requested plan version is not present in this catalog.",
        [`planVersionId=${subscriptionTarget.planVersionId}`],
      );
    }
    return planVersion;
  }

  const planId = subscriptionTarget.planId as string;
  const candidates = Object.values(catalog.planVersions)
    .filter(
      (version) =>
        version.planId === planId &&
        version.effectiveFrom <= rulesAsOf &&
        (version.effectiveTo === undefined || version.effectiveTo >= rulesAsOf),
    )
    .sort((a, b) =>
      a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
    );

  const selected = candidates[candidates.length - 1];
  if (selected === undefined) {
    throw new ReplayEngineError(
      "PLAN_VERSION_NOT_FOUND",
      "No plan version for this plan is in effect on the supplied rulesAsOf date.",
      [`planId=${planId}`, `rulesAsOf=${rulesAsOf}`],
    );
  }
  return selected;
}

function validateEvents(events: readonly TextUsageEventV1[]): TextUsageEventV1[] {
  if (!Array.isArray(events))
    throw new ReplayEngineError("IMPORT_SCHEMA_INVALID", "Events must be an array.");
  const validated: TextUsageEventV1[] = [];
  const seenIds = new Set<string>();
  let aggregateTokens = 0;
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
    aggregateTokens += reportedTokenCount(event.usage);
    if (!Number.isSafeInteger(aggregateTokens))
      throw new ReplayEngineError(
        "IMPORT_SCHEMA_INVALID",
        "Aggregate token counts exceed the supported safe-integer range.",
      );
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
  /** Rule multiplier times promotions active in the rules snapshot (decision 17). */
  multiplier: Decimal;
}

function resolveModels(
  timed: readonly TimedEvent[],
  planVersion: LoadedPlanVersionV1,
  catalog: CatalogV1,
  rulesAsOf: string,
  tracker: Tracker,
): Map<string, ModelResolution> {
  const ruleByModel = new Map<string, ModelRuleV1>();
  for (const rule of planVersion.modelRules) ruleByModel.set(rule.model, rule);

  // One shared identity index with the adapters: exact canonical id, canonical
  // name, or a catalog-declared alias scoped to the event's harness. Aliases are
  // declarations with their own sources, so this stays a mapping and never a guess
  // (M4A).
  const identity = createModelIdentityIndex(catalog);

  /**
   * Promotions are resolved once per model from the rules snapshot: a promotion
   * active at rulesAsOf applies to the whole replayed workload, regardless of
   * when individual events happened (decisions 17 and 18 of the audit
   * remediation).
   */
  const multiplierByModel = new Map<string, Decimal>();
  const multiplierFor = (modelId: string, rule: ModelRuleV1): Decimal => {
    const cached = multiplierByModel.get(modelId);
    if (cached !== undefined) return cached;
    let multiplier = ONE;
    if (rule.multiplier !== undefined) multiplier = multiplier.times(parseAmount(rule.multiplier));
    for (const promotion of planVersion.promotions ?? []) {
      if (!dateRangeContains(rulesAsOf, promotion.effectiveFrom, promotion.effectiveTo)) continue;
      if (promotion.models !== undefined && !promotion.models.includes(modelId)) continue;
      multiplier = multiplier.times(parseAmount(promotion.multiplier));
    }
    multiplierByModel.set(modelId, multiplier);
    return multiplier;
  };

  const resolution = new Map<string, ModelResolution>();
  for (const { event } of timed) {
    const canonicalId = event.model.canonicalId;
    let modelId: string | undefined;
    let quality: ModelResolution["quality"];

    if (canonicalId !== undefined && catalog.models[canonicalId] !== undefined) {
      modelId = canonicalId;
      quality = "exact";
    } else {
      const mapped = identity.resolve(
        event.model.rawName,
        event.harness === undefined ? undefined : { harness: event.harness.id },
      );
      if (mapped.canonicalId !== undefined) {
        modelId = mapped.canonicalId;
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
      resolution.set(event.id, {
        quality,
        supported: false,
        unsupportedReason: "unresolved",
        multiplier: ONE,
      });
      continue;
    }

    const rule = ruleByModel.get(modelId);
    if (rule === undefined) {
      resolution.set(event.id, {
        quality,
        modelId,
        supported: false,
        unsupportedReason: "not_supported",
        multiplier: ONE,
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
        multiplier: ONE,
      });
      continue;
    }
    resolution.set(event.id, {
      quality,
      modelId,
      supported: true,
      rule,
      multiplier: multiplierFor(modelId, rule),
    });
  }
  return resolution;
}

interface PreparedEvent {
  resolution: ModelResolution;
  /** Disjoint canonical token accounting for this event. */
  tokens: TokenAccounting;
  /** Money units, present only when accounting and pricing are both known. */
  moneyUnits: Decimal | undefined;
  /** Exact integer token total, present only when accounting is complete. */
  tokenCount: number | undefined;
  multiplier: Decimal;
  /** Filled in during the admission pass. */
  outcome: EventOutcome | undefined;
}

function prepareEvents(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
  catalog: CatalogV1,
  planVersion: LoadedPlanVersionV1,
  tracker: Tracker,
): Map<string, PreparedEvent> {
  const needsMoney = planVersion.limits.some((limit) => limit.type === "credit_pool");
  const prepared = new Map<string, PreparedEvent>();

  for (const { event } of timed) {
    const res = resolution.get(event.id);
    if (res === undefined) continue;
    const tokens = tokenAccountingOf(event.usage);

    if (res.supported && !tokens.known) {
      tracker.warn(
        "EVENT_TOKEN_ACCOUNTING_UNKNOWN",
        "One or more events do not report every canonical token category, so their consumption cannot be established.",
      );
    }
    if (!hasAnyReportedTokens(event.usage)) {
      tracker.warn(
        "EVENT_NO_TOKEN_DATA",
        "One or more events report no token data at all; their consumption is unknown rather than zero.",
      );
    }

    let moneyUnits: Decimal | undefined;
    if (needsMoney && res.supported) {
      const pricing =
        res.rule?.pricingRef !== undefined ? getPricing(catalog, res.rule.pricingRef) : undefined;
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
      moneyUnits = outcome.known ? outcome.units : undefined;
    }

    prepared.set(event.id, {
      resolution: res,
      tokens,
      moneyUnits,
      tokenCount: tokens.known ? tokens.total : undefined,
      multiplier: res.multiplier,
      outcome: undefined,
    });
  }
  return prepared;
}

const UNIT_BY_LIMIT_KIND: Record<PlanLimitV1["type"], MeasurementUnitV1> = {
  credit_pool: "usd",
  token_limit: "tokens",
  request_limit: "requests",
};

type EventOutcome = "served" | "rejected" | "indeterminate" | "model_unsupported";

type Units = Decimal | number;

const asDecimal = (value: Units): Decimal =>
  typeof value === "number" ? new Decimal(value) : value;

function addUnits(total: Units, value: Units): Units {
  if (typeof total === "number" && typeof value === "number") return total + value;
  return asDecimal(total).plus(value);
}

interface SliceRun {
  slice: WindowSlice;
  /** Attempted demand offered inside this window. */
  attempted: Units;
  /** Accepted consumption served inside this window. */
  accepted: Units;
  /** Events this constraint itself did not serve inside this window. */
  affectedEvents: number;
}

interface ConstraintRuntime {
  limit: PlanLimitV1;
  unit: MeasurementUnitV1;
  limitAmount: Decimal;
  /** Integer fast path for token and request limits. */
  limitNumber: number | undefined;
  slices: SliceRun[];
  /** Monotonic cursor over `slices`; events arrive in chronological order. */
  cursor: number;
  latchedSliceIndex: number | null;
  acceptedTotal: Units;
  attemptedTotal: Units;
  rejectedEvents: number;
  indeterminateEvents: number;
  eligibleEvents: number;
  overageUnits: Decimal;
  overageCost: Decimal;
  unknownConsumption: boolean;
}

interface ConstraintEvaluation {
  constraints: ConstraintResultV1[];
  violations: ReplayViolationV1[];
  /** Total billed overage across all constraints. */
  overageCost: Decimal;
  hasOverageRule: boolean;
  unknownConstraints: number;
}

function buildRuntime(limit: PlanLimitV1, eligible: readonly TimedEvent[]): ConstraintRuntime {
  const sliced = sliceWindows(eligible, limit.window);
  // The wire timestamp contract uses four-digit years. Never emit a result
  // outside that contract when a window extends beyond the event date range.
  if (
    sliced.slices.some((slice) => slice.startMs < -62167219200000 || slice.endMs >= 253402300800000)
  ) {
    throw new ReplayEngineError(
      "IMPORT_SCHEMA_INVALID",
      "A replay window extends outside the supported years 0000-9999.",
    );
  }
  const slices: SliceRun[] = sliced.slices.map((slice) => ({
    slice,
    attempted: 0,
    accepted: 0,
    affectedEvents: 0,
  }));

  const amount = parseAmount(limit.amount);
  const asNumber = limit.type === "credit_pool" ? undefined : Number(limit.amount);
  return {
    limit,
    unit: UNIT_BY_LIMIT_KIND[limit.type],
    limitAmount: amount,
    limitNumber: asNumber !== undefined && Number.isSafeInteger(asNumber) ? asNumber : undefined,
    slices,
    cursor: 0,
    latchedSliceIndex: null,
    acceptedTotal: limit.type === "credit_pool" ? ZERO : 0,
    attemptedTotal: limit.type === "credit_pool" ? ZERO : 0,
    rejectedEvents: 0,
    indeterminateEvents: 0,
    eligibleEvents: 0,
    overageUnits: ZERO,
    overageCost: ZERO,
    unknownConsumption: false,
  };
}

/** Whether a constraint applies to an event's model at all. */
function appliesTo(rt: ConstraintRuntime, res: ModelResolution): boolean {
  if (!res.supported) return false;
  if (rt.limit.models === undefined) return true;
  return res.modelId !== undefined && rt.limit.models.includes(res.modelId);
}

/**
 * Index of the window slice an event falls into, advancing the constraint's
 * cursor. Returns undefined when the event lies beyond the last slice (which
 * cannot happen for an eligible event, because the slices are built from the
 * eligible events themselves).
 */
function sliceIndexFor(rt: ConstraintRuntime, timed: TimedEvent): number | undefined {
  while (rt.cursor < rt.slices.length) {
    const slice = rt.slices[rt.cursor]?.slice;
    if (slice === undefined) break;
    const beforeEnd =
      timed.atMs < slice.endMs || (timed.atMs === slice.endMs && timed.subMs < slice.subMs);
    if (beforeEnd) return rt.cursor;
    rt.cursor += 1;
  }
  return undefined;
}

function quantityOf(rt: ConstraintRuntime, preparedEvent: PreparedEvent): Units | undefined {
  if (rt.limit.type === "request_limit") return 1;
  if (rt.limit.type === "credit_pool") {
    const base = preparedEvent.moneyUnits;
    if (base === undefined) return undefined;
    return preparedEvent.multiplier === ONE ? base : base.times(preparedEvent.multiplier);
  }
  const count = preparedEvent.tokenCount;
  if (count === undefined) return undefined;
  if (count === 0) return 0;
  return preparedEvent.multiplier === ONE
    ? count
    : new Decimal(count).times(preparedEvent.multiplier);
}

function exceedsCapacity(
  accepted: Units,
  quantity: Units,
  limitAmount: Decimal,
  limitNumber: number | undefined,
): boolean {
  if (typeof accepted === "number" && typeof quantity === "number" && limitNumber !== undefined) {
    return accepted + quantity > limitNumber;
  }
  return asDecimal(accepted).plus(asDecimal(quantity)).gt(limitAmount);
}

function overageCostOf(rt: ConstraintRuntime, overage: Decimal): Decimal {
  // A credit pool's excess is already currency.
  if (rt.limit.type === "credit_pool") return overage;
  const rate = rt.limit.overageRate;
  if (rate === undefined) return ZERO;
  const amount = parseAmount(rate.amount);
  return rate.unit === "per_1m_tokens"
    ? overage.times(amount).div(1_000_000)
    : overage.times(amount);
}

function evaluateConstraints(
  timed: readonly TimedEvent[],
  resolution: ReadonlyMap<string, ModelResolution>,
  prepared: ReadonlyMap<string, PreparedEvent>,
  planVersion: LoadedPlanVersionV1,
  tracker: Tracker,
): ConstraintEvaluation {
  const runtimes: ConstraintRuntime[] = planVersion.limits.map((limit) => {
    const eligible = timed.filter(({ event }) => {
      const res = resolution.get(event.id);
      if (res === undefined || !res.supported) return false;
      if (limit.models !== undefined) {
        if (res.modelId === undefined || !limit.models.includes(res.modelId)) return false;
      }
      return true;
    });
    return buildRuntime(limit, eligible);
  });

  for (const timedEvent of timed) {
    const { event } = timedEvent;
    const preparedEvent = prepared.get(event.id);
    if (preparedEvent === undefined) continue;

    if (!preparedEvent.resolution.supported) {
      preparedEvent.outcome = "model_unsupported";
      continue;
    }

    const applicable = runtimes.filter((rt) => appliesTo(rt, preparedEvent.resolution));

    // Attempted demand is recorded for every applicable constraint, whatever
    // the eventual outcome, so diagnostics stay complete.
    let unknown = false;
    for (const rt of applicable) {
      rt.eligibleEvents += 1;
      const quantity = quantityOf(rt, preparedEvent);
      if (quantity === undefined) {
        rt.indeterminateEvents += 1;
        rt.unknownConsumption = true;
        unknown = true;
        continue;
      }
      const index = sliceIndexFor(rt, timedEvent);
      if (index === undefined) continue;
      const run = rt.slices[index] as SliceRun;
      run.attempted = addUnits(run.attempted, quantity);
      rt.attemptedTotal = addUnits(rt.attemptedTotal, quantity);
    }

    if (unknown) {
      preparedEvent.outcome = "indeterminate";
      continue;
    }

    // Evaluate all hard rules before atomic admission, including every latch.
    const rejecting: { rt: ConstraintRuntime; index: number }[] = [];
    for (const rt of applicable) {
      const index = sliceIndexFor(rt, timedEvent);
      if (index === undefined) continue;
      if (rt.latchedSliceIndex !== null && rt.latchedSliceIndex === index) {
        rejecting.push({ rt, index });
        continue;
      }
      const exceed = rt.limit.exceed;
      if (exceed !== "reject_request" && exceed !== "latch_until_reset") continue;
      const quantity = quantityOf(rt, preparedEvent) as Units;
      const run = rt.slices[index] as SliceRun;
      if (exceedsCapacity(run.accepted, quantity, rt.limitAmount, rt.limitNumber)) {
        rejecting.push({ rt, index });
      }
    }

    if (rejecting.length > 0) {
      preparedEvent.outcome = "rejected";
      for (const rejection of rejecting) {
        const run = rejection.rt.slices[rejection.index] as SliceRun;
        run.affectedEvents += 1;
        rejection.rt.rejectedEvents += 1;
        if (rejection.rt.limit.exceed === "latch_until_reset") {
          rejection.rt.latchedSliceIndex = rejection.index;
          tracker.warn(
            "LATCH_TRIGGERED",
            "One or more events were blocked by a latch_until_reset rule until its window resets.",
          );
        }
      }
      continue;
    }

    // Served: every applicable pool advances by its own quantity.
    preparedEvent.outcome = "served";
    for (const rt of applicable) {
      const index = sliceIndexFor(rt, timedEvent);
      if (index === undefined) continue;
      const quantity = quantityOf(rt, preparedEvent) as Units;
      const run = rt.slices[index] as SliceRun;
      run.accepted = addUnits(run.accepted, quantity);
      rt.acceptedTotal = addUnits(rt.acceptedTotal, quantity);
    }
  }

  const constraints: ConstraintResultV1[] = [];
  const violations: ReplayViolationV1[] = [];
  let overageCost = ZERO;
  let hasOverageRule = false;
  let unknownConstraints = 0;

  for (const rt of runtimes) {
    const windowViolations: ReplayViolationV1[] = [];

    for (const run of rt.slices) {
      const accepted = asDecimal(run.accepted);
      const attempted = asDecimal(run.attempted);
      const overage = accepted.gt(rt.limitAmount) ? accepted.minus(rt.limitAmount) : ZERO;

      if (rt.limit.exceed === "allow_overage" || rt.limit.exceed === "record_only") {
        rt.overageUnits = rt.overageUnits.plus(overage);
        if (rt.limit.exceed === "allow_overage" && overage.gt(0)) {
          rt.overageCost = rt.overageCost.plus(overageCostOf(rt, overage));
        }
      }

      if (!attempted.gt(rt.limitAmount)) continue;
      windowViolations.push({
        type:
          rt.limit.window.type === "rolling"
            ? "rolling_window_exceeded"
            : "calendar_window_exceeded",
        constraintId: rt.limit.id,
        unit: rt.unit,
        startedAt: isoFromEpochMs(run.slice.startMs, run.slice.subMs),
        endedAt: isoFromEpochMs(run.slice.endMs, run.slice.subMs),
        affectedEvents: run.affectedEvents,
        requiredUnits: toUnitString(attempted),
        availableUnits: toUnitString(rt.limitAmount),
        acceptedUnits: toUnitString(accepted),
        ...(rt.limit.exceed !== "reject_request" && overage.gt(0)
          ? { overageUnits: toUnitString(overage) }
          : {}),
        ...(rt.limit.models !== undefined ? { modelIds: [...rt.limit.models] } : {}),
      });
    }

    if (rt.limit.exceed === "allow_overage") hasOverageRule = true;
    if (rt.unknownConsumption) unknownConstraints += 1;
    overageCost = overageCost.plus(rt.overageCost);

    const status: ConstraintStatusV1 =
      rt.eligibleEvents === 0
        ? "not_applicable"
        : rt.unknownConsumption
          ? "unknown"
          : windowViolations.length > 0
            ? "exceeded"
            : "pass";

    constraints.push({
      id: rt.limit.id,
      label: rt.limit.label,
      kind: rt.limit.type,
      unit: rt.unit,
      window: {
        kind: rt.limit.window.type,
        description:
          rt.limit.window.type === "rolling"
            ? `rolling window of ${rt.limit.window.duration} anchored at first use`
            : `calendar ${rt.limit.window.unit} (${rt.limit.window.timezone})`,
      },
      exceed: rt.limit.exceed,
      status,
      limitUnits: toUnitString(rt.limitAmount),
      consumedUnits: toUnitString(asDecimal(rt.acceptedTotal)),
      attemptedUnits: toUnitString(asDecimal(rt.attemptedTotal)),
      violationCount: windowViolations.length,
      rejectedEvents: rt.rejectedEvents,
      indeterminateEvents: rt.indeterminateEvents,
      eligibleEvents: rt.eligibleEvents,
      ...(rt.limit.exceed !== "reject_request" && rt.overageUnits.gt(0)
        ? { overageUnits: toUnitString(rt.overageUnits) }
        : {}),
      ...(rt.limit.exceed === "allow_overage" && rt.overageCost.gt(0)
        ? { overageCost: money(rt.overageCost, planVersion.price.currency) }
        : {}),
      ...(rt.limit.models !== undefined ? { modelIds: [...rt.limit.models] } : {}),
    });
    violations.push(...windowViolations);
  }

  return { constraints, violations, overageCost, hasOverageRule, unknownConstraints };
}

function money(amount: Decimal, currency: "USD"): { amount: string; currency: "USD" } {
  return { amount: toUnitString(amount), currency };
}

function roundPercent(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function knownDimension(covered: number, total: number): CoverageDimensionV1 {
  return {
    status: "known",
    percent: roundPercent(total === 0 ? 100 : (covered / total) * 100),
    covered,
    total,
  };
}

function unknownDimension(
  reason: string,
  counts: { covered?: number; total?: number; unknownCount?: number },
): CoverageDimensionV1 {
  return {
    status: "unknown",
    reason,
    ...(counts.covered !== undefined ? { covered: counts.covered } : {}),
    ...(counts.total !== undefined ? { total: counts.total } : {}),
    ...(counts.unknownCount !== undefined ? { unknownCount: counts.unknownCount } : {}),
  };
}

function computeCoverage(
  timed: readonly TimedEvent[],
  prepared: ReadonlyMap<string, PreparedEvent>,
): CoverageDimensionsV1 {
  let served = 0;
  let indeterminate = 0;
  let knownTokens = 0;
  let servedKnownTokens = 0;
  let unknownTokenEvents = 0;
  const usedModels = new Map<string, boolean>();
  let unresolvedModels = 0;

  for (const { event } of timed) {
    const preparedEvent = prepared.get(event.id);
    if (preparedEvent === undefined) continue;
    const outcome = preparedEvent.outcome;
    if (outcome === "served") served += 1;
    else if (outcome === "indeterminate") indeterminate += 1;

    if (preparedEvent.tokenCount !== undefined) {
      knownTokens += preparedEvent.tokenCount;
      if (outcome === "served") servedKnownTokens += preparedEvent.tokenCount;
    } else {
      unknownTokenEvents += 1;
    }

    const key = preparedEvent.resolution.modelId ?? `raw:${event.model.rawName}`;
    usedModels.set(key, preparedEvent.resolution.supported);
    if (preparedEvent.resolution.quality === "unknown") unresolvedModels += 1;
  }

  const requests =
    indeterminate > 0
      ? unknownDimension(
          `${indeterminate} event(s) could not be evaluated because their consumption is unknown`,
          { covered: served, total: timed.length, unknownCount: indeterminate },
        )
      : knownDimension(served, timed.length);

  const usage =
    unknownTokenEvents > 0
      ? unknownDimension(
          `${unknownTokenEvents} event(s) do not report every canonical token category, so no non-overlapping token denominator exists`,
          { covered: servedKnownTokens, total: knownTokens, unknownCount: unknownTokenEvents },
        )
      : knownDimension(servedKnownTokens, knownTokens);

  const coveredModels = [...usedModels.values()].filter(Boolean).length;
  const models =
    unresolvedModels > 0
      ? unknownDimension(
          `${unresolvedModels} event(s) use models that could not be resolved against the catalog`,
          { covered: coveredModels, total: usedModels.size, unknownCount: unresolvedModels },
        )
      : knownDimension(coveredModels, usedModels.size);

  return { requests, usage, models };
}

function feasibilityOf(
  coverage: CoverageDimensionsV1,
  constraints: readonly ConstraintResultV1[],
): FeasibilityV1 {
  const unknownConstraint = constraints.some((constraint) => constraint.status === "unknown");
  const requestUnknown = coverage.requests.status === "unknown";
  if (unknownConstraint || requestUnknown) {
    const reason =
      requestUnknown && coverage.requests.reason !== undefined
        ? coverage.requests.reason
        : "One or more constraints could not be evaluated from the workload data.";
    return {
      status: "unknown",
      coverageDimension: "requests",
      ...(coverage.requests.percent !== undefined
        ? { coveragePercent: coverage.requests.percent }
        : {}),
      reason,
    };
  }

  const percent = coverage.requests.percent as number;
  const status: FeasibilityV1["status"] =
    percent >= 100 ? "full" : percent === 0 ? "none" : "partial";
  return { status, coveragePercent: percent, coverageDimension: "requests" };
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

function computeEconomics(
  planVersion: LoadedPlanVersionV1,
  evaluation: ConstraintEvaluation,
): EconomicsV1 {
  const currency = planVersion.price.currency;
  const base = parseAmount(planVersion.price.amount);
  const overage = evaluation.overageCost;
  const total = base.plus(overage);

  return {
    // The base cost is the catalog's declared price, reported verbatim.
    basePlanCost: { amount: planVersion.price.amount, currency },
    ...(evaluation.hasOverageRule ? { overageCost: money(overage, currency) } : {}),
    // Without billed overage the total is the declared price, verbatim.
    targetCost: evaluation.hasOverageRule
      ? money(total, currency)
      : { amount: planVersion.price.amount, currency },
    costBasis: evaluation.hasOverageRule ? "fixed_plan_price_plus_overage" : "fixed_plan_price",
  };
}

function computeConfidence(
  timed: readonly TimedEvent[],
  prepared: ReadonlyMap<string, PreparedEvent>,
  planVersion: LoadedPlanVersionV1,
  catalog: CatalogV1,
  evaluation: ConstraintEvaluation,
  tracker: Tracker,
): ReplayConfidenceV1 {
  const factors: ConfidenceFactor[] = [];

  const estimatedUsage = timed.filter(({ event }) => event.confidence.usage === "estimated").length;
  const noTokenData = timed.filter(({ event }) => !hasAnyReportedTokens(event.usage)).length;
  const sourceLevel = noTokenData > 0 ? "low" : estimatedUsage > 0 ? "medium" : "high";
  factors.push({
    id: "source_data",
    level: sourceLevel,
    description:
      noTokenData > 0
        ? `${noTokenData} event(s) report no token data at all.`
        : estimatedUsage > 0
          ? `${estimatedUsage} event(s) report estimated usage rather than exact counters.`
          : "Token history is exact for every event.",
  });

  const unknownAccounting = timed.filter(
    ({ event }) => prepared.get(event.id)?.tokens.known === false,
  ).length;
  const accountingLevel = unknownAccounting > 0 ? "low" : "high";
  factors.push({
    id: "token_accounting",
    level: accountingLevel,
    description:
      unknownAccounting > 0
        ? `${unknownAccounting} event(s) do not report every canonical token category, so their consumption cannot be established.`
        : "Every event reports all canonical token categories, so disjoint consumption is known.",
  });

  const unresolved = timed.filter(
    ({ event }) =>
      prepared.get(event.id)?.resolution.quality === "unknown" ||
      event.confidence.model === "unknown",
  ).length;
  const mapped = timed.filter(
    ({ event }) =>
      prepared.get(event.id)?.resolution.quality === "mapped" ||
      event.confidence.model === "mapped",
  ).length;
  const modelLevel = unresolved > 0 ? "low" : mapped > 0 ? "medium" : "high";
  factors.push({
    id: "model_mapping",
    level: modelLevel,
    description:
      unresolved > 0
        ? `${unresolved} event(s) have unresolved models or declare unknown model attribution.`
        : mapped > 0
          ? `${mapped} event(s) use name mapping or declare mapped model attribution.`
          : "Every event model resolved exactly against the catalog.",
  });

  factors.push({
    id: "plan_rules",
    level: levelFromVerification(planVersion.verificationStatus),
    description: `Plan rules are marked "${planVersion.verificationStatus}" in the catalog.`,
  });

  const usedPricingIds = new Set<string>();
  for (const res of prepared.values()) {
    if (res.resolution.supported && res.resolution.rule?.pricingRef !== undefined)
      usedPricingIds.add(res.resolution.rule.pricingRef);
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

  if (
    tracker.warnings.has("PRICING_RATE_FALLBACK") ||
    tracker.assumptions.has("REASONING_PRICED_AS_OUTPUT")
  ) {
    factors.push({
      id: "pricing_fallback",
      level: "low",
      description:
        "Some token categories use fallback rates rather than verified category-specific pricing.",
    });
  }

  const hasPostCapRules = planVersion.limits.some(
    (limit) => limit.exceed === "allow_overage" || limit.exceed === "latch_until_reset",
  );
  if (evaluation.unknownConstraints > 0) {
    factors.push({
      id: "constraint_modeling",
      level: "low",
      description: `${evaluation.unknownConstraints} constraint(s) could not be evaluated from the workload data and are reported as unknown.`,
    });
  } else if (hasPostCapRules) {
    factors.push({
      id: "constraint_modeling",
      level: "medium",
      description:
        "Some constraints model post-capacity behavior (latching or billed overage) that the catalog declares rather than verifies.",
    });
  }

  return { level: worstLevel(factors.map((factor) => factor.level)), factors };
}

function summarizeWorkload(
  timed: readonly TimedEvent[],
  prepared: ReadonlyMap<string, PreparedEvent>,
): WorkloadSummaryV1 {
  let uncachedInput = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let output = 0;
  let reasoning = 0;
  let hasInput = false;
  let hasOutput = false;
  let hasCacheRead = false;
  let hasCacheWrite = false;
  let hasReasoning = false;
  const sessions = new Set<string>();
  const models = new Set<string>();

  for (const { event } of timed) {
    const preparedEvent = prepared.get(event.id);
    if (preparedEvent === undefined) continue;
    const tokens = preparedEvent.tokens;
    if (tokens.known) {
      uncachedInput += tokens.buckets.uncachedInputTokens;
      output += tokens.buckets.outputTokens;
      cacheRead += tokens.buckets.cacheReadTokens;
      cacheWrite += tokens.buckets.cacheWriteTokens;
      reasoning += tokens.buckets.reasoningTokens;
      hasInput = hasOutput = hasCacheRead = hasCacheWrite = hasReasoning = true;
    }
    const session = event.source.nativeSessionHash;
    if (session !== undefined) sessions.add(session);
    models.add(preparedEvent.resolution.modelId ?? `raw:${event.model.rawName}`);
  }

  // Totals are complete disjoint totals, never an unlabeled known subtotal.
  if ([...prepared.values()].some((entry) => !entry.tokens.known)) {
    hasInput = hasOutput = hasCacheRead = hasCacheWrite = hasReasoning = false;
  }
  const tokenTotals: TokenTotalsV1 = {};
  if (hasCacheRead) tokenTotals.cacheReadTokens = cacheRead;
  if (hasCacheWrite) tokenTotals.cacheWriteTokens = cacheWrite;
  if (hasInput) tokenTotals.inputTokens = uncachedInput;
  if (hasOutput) tokenTotals.outputTokens = output;
  if (hasReasoning) tokenTotals.reasoningTokens = reasoning;

  const first = timed[0];
  const last = timed[timed.length - 1];
  return {
    eventCount: timed.length,
    ...(first !== undefined ? { from: isoFromEpochMs(first.atMs, first.subMs) } : {}),
    ...(last !== undefined ? { to: isoFromEpochMs(last.atMs, last.subMs) } : {}),
    modelCount: models.size,
    ...(sessions.size > 0 ? { sessionCount: sessions.size } : {}),
    tokenTotals,
  };
}

function collectPricingReferences(planVersion: LoadedPlanVersionV1): string[] {
  const references = new Set<string>();
  for (const rule of planVersion.modelRules) {
    if (rule.pricingRef !== undefined) references.add(rule.pricingRef);
  }
  return [...references].sort();
}

function buildAssumptions(
  planVersion: LoadedPlanVersionV1,
  tracker: Tracker,
  constraints: readonly ConstraintResultV1[],
): ReplayAssumptionV1[] {
  const assumptions = new Map(tracker.assumptions);
  assumptions.set(
    "NO_PRORATION",
    "The base plan cost is the plan's fixed price; no proration is applied for replay windows shorter than a billing period.",
  );
  assumptions.set(
    "CURRENT_RULE_SNAPSHOT",
    "Plan rules, pricing references and promotions are the snapshot in effect at rulesAsOf; workload chronology inside the simulation uses the historical event timestamps.",
  );
  if (constraints.length > 1) {
    assumptions.set(
      "ATOMIC_ADMISSION",
      "Admission is atomic across constraints: an event rejected by one rule consumes nothing from any other pool, while attempted demand is still reported per constraint.",
    );
  }
  if (planVersion.limits.some((limit) => limit.type !== "request_limit")) {
    assumptions.set(
      "DISJOINT_TOKEN_ACCOUNTING",
      "Consumption uses disjoint canonical token buckets derived from each event's accounting declaration, so overlapping categories are never double counted.",
    );
  }
  if (planVersion.limits.length > 0) {
    assumptions.set("WINDOW_BOUNDARIES", "Window boundaries are half-open: [start, end).");
    assumptions.set(
      "WINDOW_CHRONOLOGY",
      "Each constraint's windows follow the events it applies to; only served events advance accepted consumption, while rejected events still count as attempted demand.",
    );
  }
  if (
    planVersion.limits.some(
      (limit) => limit.window.type === "calendar" && limit.window.unit === "month",
    )
  ) {
    assumptions.set(
      "MONTHLY_WINDOW_CALENDAR_MONTH",
      "Calendar month windows use each constraint's declared timezone; billing anchors are not supported.",
    );
  }
  if (planVersion.limits.some((limit) => limit.exceed === "allow_overage")) {
    assumptions.set(
      "OVERAGE_PER_WINDOW",
      "Overage is computed per window: units above included capacity in each window are billed at that rule's declared rate.",
    );
  }
  if (planVersion.limits.some((limit) => limit.exceed === "latch_until_reset")) {
    assumptions.set(
      "LATCH_BLOCKS_UNTIL_RESET",
      "A latch_until_reset rule blocks every applicable request until the window that triggered the latch resets.",
    );
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
