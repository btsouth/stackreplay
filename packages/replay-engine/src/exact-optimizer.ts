import { createModelIdentityIndex, type LoadedPlanVersionV1 } from "@stackreplay/catalog";
import {
  executionTargetV1Schema,
  replayContextV1Schema,
  type TextUsageEventV1,
} from "@stackreplay/schema";
import { z } from "zod";
import {
  type CompiledOptimizationInput,
  type CompiledOptimizationResult,
  optimizeCompiledExactModels,
} from "./compiled-optimizer.js";
import { levelFromVerification, worstLevel } from "./confidence.js";
import { parseCatalog, replay, replayObservingQuotes, replayWithReceipt } from "./engine.js";
import { ReplayEngineError } from "./errors.js";
import {
  initialCapacityEntrySchema,
  type SubscriptionInitialCapacity,
  validateInitialCapacity,
} from "./initial-capacity.js";
import { type Decimal, parseAmount, toUnitString, ZERO } from "./money.js";
import {
  capacityEvidenceV1Schema,
  evaluateStackCandidate,
  prepareCandidateDemand,
} from "./optimizer.js";
import {
  matchRequestPools,
  type PoolMembership,
  type RequestPool,
} from "./optimizer-assignment.js";
import type {
  DemandGranularity,
  ExactCandidateExplanation,
  ExactCandidateSummary,
  ExactExecutionResource,
  ExactOptimizationInput,
  ExactOptimizationResult,
  OptimizationScope,
} from "./optimizer-types.js";
import { planWithQuantity } from "./plan-quantity.js";
import { isoFromEpochMs, parseInstant } from "./time.js";
import { sliceCalendarWindows, toTimedEvents } from "./windows.js";

const granularitySchema = z.enum(["request", "aggregate", "unknown"]);
const chronologySchema = z.strictObject({
  default: granularitySchema,
  byEventId: z.record(z.string(), granularitySchema).optional(),
  evidence: z.string().min(1),
});
const limitsSchema = z.strictObject({
  maxSubscriptions: z.union([z.literal(1), z.literal(2)]).default(2),
  maxAssignmentStates: z.number().int().min(1).max(100_000).default(10_000),
});
const MAX_ASSIGNMENT_WORK = 2_000_000;
const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function unsupported(message: string): never {
  throw new ReplayEngineError("TARGET_NOT_IMPLEMENTED", message);
}

interface Subscription {
  id: string;
  resource: Extract<ExactExecutionResource, { target: { type: "subscription" } }>;
  version: LoadedPlanVersionV1;
  models: Set<string>;
  fast: boolean;
  initialCapacity?: SubscriptionInitialCapacity | undefined;
}
interface Api {
  id: string;
  resource: Extract<ExactExecutionResource, { target: { type: "api" } }>;
}
interface Quote {
  resourceId: string;
  amount: string;
  pricingId: string;
}
interface Configuration {
  id: string;
  subscriptions: number[];
  api: boolean;
}
interface Prepared {
  input: ExactOptimizationInput;
  events: TextUsageEventV1[];
  scope: OptimizationScope;
  subscriptions: Subscription[];
  apis: Api[];
  quotes: (Quote | undefined)[];
  order: number[];
  pools: RequestPool[];
  membership: PoolMembership[];
  skipped: ExactOptimizationResult["skippedResources"];
  limits: z.infer<typeof limitsSchema>;
}
interface Allocation {
  summary: ExactCandidateSummary;
  /** Subscription index or -1 for API. Only one best assignment is retained. */
  placement?: Int32Array;
}

function prepare(input: ExactOptimizationInput): Prepared {
  if (input.initialAllowance?.kind !== "fresh" && input.initialAllowance?.kind !== "provided")
    unsupported(
      "Initial allowance must explicitly declare fresh or provided state and unlisted pools.",
    );
  const initialAllowance = z
    .discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("fresh") }),
      z.strictObject({
        kind: z.literal("provided"),
        unlistedPools: z.literal("fresh"),
        entries: z.array(initialCapacityEntrySchema.extend({ resourceId: z.string().min(1) })),
      }),
    ])
    .parse(input.initialAllowance);
  if (input.resources.length > 32)
    unsupported("At most 32 resource inputs are accepted before deduplication.");
  const chronology = chronologySchema.parse(input.chronology);
  const limits = limitsSchema.parse(input.limits ?? {});
  const catalog = parseCatalog(input.catalog);
  const context = replayContextV1Schema.parse(input.context);
  const demand = prepareCandidateDemand(input);
  if (input.resources.some((resource) => resource.target.type === "subscription")) {
    const purchaseEnd = parseInstant(demand.period.start)
      .toZonedDateTimeISO("UTC")
      .add({ months: 1 })
      .toInstant();
    if (parseInstant(demand.period.end).epochNanoseconds > purchaseEnd.epochNanoseconds)
      unsupported(
        "O2 observation exceeds one monthly purchase beginning at period.start; multi-cycle billing is not implemented.",
      );
  }
  const identity = createModelIdentityIndex(catalog);
  const identityCache = new Map<string, string | undefined>();
  const scope: OptimizationScope = {
    id: "recognized-exact-models",
    period: demand.period,
    context,
    catalogVersion: catalog.catalogVersion,
    chronologyEvidence: chronology.evidence,
    recorded: demand.events.length,
    required: 0,
    events: [],
    exclusions: [],
    usageEvidence: { exact: 0, estimated: 0 },
    apiPriceable: 0,
    apiEligibility: [],
    capacityEligible: 0,
    excludedCostImpact: "none",
  };
  const events: TextUsageEventV1[] = [];
  const eventIds = new Set(demand.events.map((event) => event.id));
  for (const id of Object.keys(chronology.byEventId ?? {}))
    if (!eventIds.has(id)) unsupported(`Chronology override references absent event: ${id}`);
  for (const event of demand.events) {
    const key = JSON.stringify([event.model.canonicalId, event.model.rawName, event.harness?.id]);
    if (!identityCache.has(key)) {
      const recorded = event.model.canonicalId;
      identityCache.set(
        key,
        recorded !== undefined && catalog.models[recorded] !== undefined
          ? recorded
          : identity.resolve(
              event.model.rawName,
              event.harness === undefined ? undefined : { harness: event.harness.id },
            ).canonicalId,
      );
    }
    const modelId = identityCache.get(key);
    if (modelId === undefined) {
      scope.exclusions.push({ eventId: event.id, reason: "unresolved-model" });
      continue;
    }
    const granularity: DemandGranularity =
      event.source.adapterId === "ccusage"
        ? "aggregate"
        : (chronology.byEventId?.[event.id] ?? chronology.default);
    scope.events.push({ eventId: event.id, modelId, granularity, apiPriceable: false });
    if (granularity === "request") scope.capacityEligible++;
    scope.usageEvidence[event.confidence.usage]++;
    events.push(
      event.model.canonicalId === modelId
        ? event
        : { ...event, model: { ...event.model, canonicalId: modelId } },
    );
  }
  scope.required = events.length;
  scope.excludedCostImpact = scope.exclusions.length > 0 ? "unbounded" : "none";
  const sharedInput = { ...input, initialAllowance, catalog, context, period: demand.period };
  const subscriptions: Subscription[] = [];
  const availablePlans = new Map<string, LoadedPlanVersionV1>();
  const apis: Api[] = [];
  const skipped: Prepared["skipped"] = [];
  const seen = new Map<string, string>();
  const requiredModels = new Set(scope.events.map((event) => event.modelId));
  for (const raw of input.resources) {
    const target = executionTargetV1Schema.parse(raw.target);
    if (target.type !== "api" && target.type !== "subscription")
      unsupported("O2 accepts only subscription and API resources.");
    if (target.modelTranslation !== undefined)
      unsupported("O2 preserves exact models; translations are not allowed.");
    if (target.type === "api") {
      replay({ events: [], target, catalog, context });
      const id = `api:${target.providerId}`;
      if (seen.has(id)) {
        skipped.push({ id, reason: "duplicate-resource" });
        continue;
      }
      seen.set(id, "api");
      apis.push({ id, resource: { target } });
    } else {
      if (!("capacityEvidence" in raw)) unsupported("Subscription capacity evidence is required.");
      const evidence = capacityEvidenceV1Schema.parse(raw.capacityEvidence);
      const run = evaluateStackCandidate({
        ...sharedInput,
        events: [],
        target: { type: "hybrid", routes: [{ priority: 0, target }] },
        capacityEvidence: { 0: evidence },
      });
      const versionId = run.routes[0]?.result.subscription?.planVersionId;
      const catalogVersion = versionId === undefined ? undefined : catalog.planVersions[versionId];
      const version = catalogVersion
        ? planWithQuantity(catalogVersion, target.quantity)
        : undefined;
      if (version === undefined) throw new Error("Validated subscription has no plan version");
      const id = `subscription:${version.versionId}`;
      const signature = JSON.stringify([evidence, target.quantity ?? 1]);
      const previous = seen.get(id);
      if (previous !== undefined) {
        if (previous !== signature) unsupported(`Conflicting capacity evidence for ${id}`);
        skipped.push({ id, reason: "duplicate-resource" });
        continue;
      }
      seen.set(id, signature);
      availablePlans.set(id, version);
      const models = new Set(
        version.modelRules.filter((rule) => !rule.excluded).map((rule) => rule.model),
      );
      if (![...models].some((model) => requiredModels.has(model))) {
        skipped.push({ id, reason: "supports-no-required-model" });
        continue;
      }
      subscriptions.push({
        id,
        resource: {
          target: { type: "subscription", planVersionId: version.versionId },
          capacityEvidence: evidence,
        },
        version,
        models,
        fast:
          version.limits.length === 1 &&
          version.limits[0]?.type === "request_limit" &&
          version.limits[0]?.window.type === "calendar",
      });
    }
  }
  subscriptions.sort((a, b) => lexical(a.id, b.id));
  apis.sort((a, b) => lexical(a.id, b.id));
  skipped.sort((a, b) => lexical(a.id, b.id) || lexical(a.reason, b.reason));
  if (subscriptions.length > 6 || apis.length > 8)
    unsupported("O2 supports at most six subscriptions and eight API resources.");
  if (initialAllowance.kind === "provided") {
    for (const entry of initialAllowance.entries)
      if (!availablePlans.has(entry.resourceId))
        unsupported("Initial capacity references an unavailable subscription resource.");
    for (const [id, version] of availablePlans) {
      const state = validateInitialCapacity(
        {
          at: demand.period.start,
          unlistedPools: "fresh",
          entries: initialAllowance.entries
            .filter((entry) => entry.resourceId === id)
            .map(({ resourceId: _id, ...entry }) => entry),
        },
        version,
      );
      const subscription = subscriptions.find((sub) => sub.id === id);
      if (subscription !== undefined) subscription.initialCapacity = state;
    }
  }
  const quotes: Prepared["quotes"] = Array.from({ length: events.length });
  const quoteCache = new Map<string, Quote>();
  const eventIndex = new Map(events.map((event, index) => [event.id, index]));
  for (const api of apis) {
    const eligibilityCounts = new Map<string, number>();
    replayObservingQuotes(
      { events, catalog, context, target: api.resource.target },
      (event, outcome, quote) => {
        const index = eventIndex.get(event.id);
        if (index === undefined) return;
        // Aggregate timestamps/request sizes cannot select conditional tiers.
        const reason =
          outcome === "priced" &&
          scope.events[index]?.granularity !== "request" &&
          (catalog.pricing[quote.pricingId ?? ""]?.tiers?.length ?? 0) > 0
            ? "aggregate-needs-request-level-pricing"
            : outcome;
        eligibilityCounts.set(reason, (eligibilityCounts.get(reason) ?? 0) + 1);
        if (reason !== "priced" || quote.amount === undefined || quote.pricingId === undefined)
          return;
        const previous = quotes[index];
        if (previous !== undefined && parseAmount(previous.amount).lte(quote.amount)) return;
        const key = JSON.stringify([api.id, quote.amount, quote.pricingId]);
        let interned = quoteCache.get(key);
        if (interned === undefined) {
          interned = { resourceId: api.id, amount: quote.amount, pricingId: quote.pricingId };
          quoteCache.set(key, interned);
        }
        quotes[index] = interned;
      },
    );
    for (const [reason, records] of [...eligibilityCounts].sort(([a], [b]) => lexical(a, b)))
      scope.apiEligibility.push({ resourceId: api.id, reason, records });
  }
  for (let index = 0; index < scope.events.length; index++) {
    const entry = scope.events[index];
    if (entry !== undefined) entry.apiPriceable = quotes[index] !== undefined;
  }
  scope.apiPriceable = quotes.filter((quote) => quote !== undefined).length;
  const weights = new Map<string, Decimal>();
  for (const quote of quotes)
    if (quote !== undefined && !weights.has(quote.amount))
      weights.set(quote.amount, parseAmount(quote.amount));
  const order = Array.from({ length: events.length }, (_, index) => index).sort((a, b) => {
    const qa = quotes[a];
    const qb = quotes[b];
    if (qa === undefined || qb === undefined) return qa === qb ? a - b : qa === undefined ? -1 : 1;
    return (weights.get(qb.amount)?.cmp(weights.get(qa.amount) ?? ZERO) ?? 0) || a - b;
  });
  const pools: RequestPool[] = [];
  const timed = toTimedEvents(events);
  const membership = subscriptions.map((subscription, resource): PoolMembership => {
    const membership = new Int32Array(events.length).fill(-1);
    const limit = subscription.version.limits[0];
    if (subscription.fast && limit?.window.type === "calendar") {
      const eligible = timed.filter(({ event }) =>
        subscription.models.has(event.model.canonicalId ?? ""),
      );
      for (const slice of sliceCalendarWindows(
        eligible,
        limit.window.unit,
        limit.window.timezone,
      )) {
        const pool = pools.length;
        const initial = subscription.initialCapacity?.entries.find(
          (entry) =>
            entry.limitId === limit.id &&
            parseInstant(entry.windowStart).epochMilliseconds === slice.startMs,
        );
        pools.push({
          maximumCapacity: limit.amount,
          initialConsumed: initial?.consumedUnits ?? "0",
          initialLatched: initial?.latched ?? false,
          resource,
          resourceId: subscription.id,
          limitId: limit.id,
          start: isoFromEpochMs(slice.startMs),
          end: isoFromEpochMs(slice.endMs),
          capacity: Math.min(
            events.length,
            initial?.latched
              ? 0
              : parseAmount(limit.amount)
                  .minus(initial?.consumedUnits ?? "0")
                  .floor()
                  .toNumber(),
          ),
        });
        for (const { event } of slice.events) {
          const index = eventIndex.get(event.id);
          if (index !== undefined) membership[index] = pool;
        }
      }
    }
    return { pools: membership };
  });
  return {
    input: sharedInput,
    events,
    scope,
    subscriptions,
    apis,
    quotes,
    order,
    pools,
    membership,
    skipped,
    limits,
  };
}

function configurations(prepared: Prepared): Configuration[] {
  const sets: number[][] = [];
  for (let a = 0; a < prepared.subscriptions.length; a++) {
    sets.push([a]);
    if (prepared.limits.maxSubscriptions === 2)
      for (let b = a + 1; b < prepared.subscriptions.length; b++) {
        if (prepared.subscriptions[a]?.version.planId !== prepared.subscriptions[b]?.version.planId)
          sets.push([a, b]);
      }
  }
  const result: Configuration[] = [];
  if (prepared.apis.length > 0) result.push({ id: "api-only", subscriptions: [], api: true });
  for (const subscriptions of sets)
    for (const api of prepared.apis.length > 0 ? [false, true] : [false]) {
      const ids = subscriptions.map((index) => prepared.subscriptions[index]?.id ?? "");
      result.push({ id: JSON.stringify([ids, api ? "api-pool" : "no-api"]), subscriptions, api });
    }
  return result.sort((a, b) => lexical(a.id, b.id));
}

/** Feasible-first, exact decimal monetary comparison, then explicit stable ties. */
export function compareExactCandidates(a: ExactCandidateSummary, b: ExactCandidateSummary): number {
  const statusOrder = { feasible: 0, infeasible: 1, unavailable: 2 };
  const status = statusOrder[a.status] - statusOrder[b.status];
  if (status !== 0) return status;
  if (a.status !== "feasible") return lexical(a.id, b.id);
  if (
    a.totalCost === undefined ||
    a.variableCost === undefined ||
    b.totalCost === undefined ||
    b.variableCost === undefined
  )
    throw new ReplayEngineError(
      "IMPORT_SCHEMA_INVALID",
      "Feasible candidates require complete monetary costs.",
    );
  return (
    parseAmount(a.totalCost).cmp(b.totalCost) ||
    parseAmount(a.variableCost).cmp(b.variableCost) ||
    a.subscriptions.length - b.subscriptions.length ||
    a.apiRecords - b.apiRecords ||
    lexical(a.id, b.id)
  );
}

function baseSummary(prepared: Prepared, configuration: Configuration): ExactCandidateSummary {
  let fixed = ZERO;
  for (const index of configuration.subscriptions)
    fixed = fixed.plus(prepared.subscriptions[index]?.version.price.amount ?? "0");
  return {
    id: configuration.id,
    scopeId: prepared.scope.id,
    subscriptions: configuration.subscriptions.map(
      (index) => prepared.subscriptions[index]?.id ?? "",
    ),
    apiAllowed: configuration.api,
    status: "infeasible",
    allocation: "not-evaluated",
    fixedCost: toUnitString(fixed),
    recordsRequired: prepared.events.length,
    recordsModeled: 0,
    recordsExcluded: prepared.scope.exclusions.length,
    subscriptionRecords: 0,
    apiRecords: 0,
    capacityDisplacedRecords: 0,
    capacityEvaluation: configuration.subscriptions.length === 0 ? "not-applicable" : "available",
    failures: [],
    pricingConfidence: "not-applicable",
    pricingReferences: [],
    capacityConfidence:
      configuration.subscriptions.length === 0
        ? "not-applicable"
        : configuration.subscriptions.every(
              (index) =>
                prepared.subscriptions[index]?.resource.capacityEvidence.kind ===
                  "published-hard-limit" &&
                prepared.subscriptions[index]?.version.verificationStatus === "verified",
            )
          ? "high-confidence-modeled"
          : configuration.subscriptions.every(
                (index) =>
                  prepared.subscriptions[index]?.resource.capacityEvidence.kind ===
                  "empirical-user-calibration",
              )
            ? "user-calibrated"
            : "estimated",
  };
}

function finish(
  prepared: Prepared,
  configuration: Configuration,
  summary: ExactCandidateSummary,
  placement: Int32Array,
): Allocation {
  let variable = ZERO;
  const pricingIds = new Set<string>();
  for (let index = 0; index < placement.length; index++) {
    if ((placement[index] ?? -1) >= 0) summary.subscriptionRecords++;
    else {
      const quote = configuration.api ? prepared.quotes[index] : undefined;
      if (quote === undefined) continue;
      summary.apiRecords++;
      pricingIds.add(quote.pricingId);
      variable = variable.plus(quote.amount);
      const model = prepared.scope.events[index]?.modelId ?? "";
      if (
        configuration.subscriptions.some((resource) =>
          prepared.subscriptions[resource]?.models.has(model),
        )
      )
        summary.capacityDisplacedRecords++;
    }
  }
  summary.pricingReferences = [...pricingIds].sort(lexical);
  const priceLevels = [
    ...configuration.subscriptions.map((index) =>
      levelFromVerification(prepared.subscriptions[index]?.version.verificationStatus ?? "unknown"),
    ),
    ...[...pricingIds].map((id) =>
      levelFromVerification(prepared.input.catalog.pricing[id]?.verificationStatus ?? "unknown"),
    ),
  ];
  summary.pricingConfidence = priceLevels.length === 0 ? "not-applicable" : worstLevel(priceLevels);
  summary.recordsModeled = summary.subscriptionRecords + summary.apiRecords;
  if (summary.recordsModeled !== summary.recordsRequired) {
    summary.failures.push(
      "Required recognized records cannot all be served and priced; none were excluded from comparison.",
    );
    return { summary };
  }
  summary.status = "feasible";
  summary.variableCost = toUnitString(variable);
  summary.totalCost = toUnitString(variable.plus(summary.fixedCost));
  summary.exactModelPreservation = 1;
  return { summary, placement };
}

/** General policy fallback. Subscription replay is the sole admission oracle. */
function exhaustive(
  prepared: Prepared,
  configuration: Configuration,
  summary: ExactCandidateSummary,
): Allocation {
  const choices = prepared.scope.events.map(({ modelId }, index) => [
    ...configuration.subscriptions.filter((resource) =>
      prepared.subscriptions[resource]?.models.has(modelId),
    ),
    ...(configuration.api && prepared.quotes[index] !== undefined ? [-1] : []),
  ]);
  if (choices.some((entry) => entry.length === 0)) {
    summary.failures.push("At least one required model has no executable, priced resource.");
    return { summary };
  }
  let states = 1;
  for (const options of choices) {
    states *= options.length;
    if (
      states > prepared.limits.maxAssignmentStates ||
      states * prepared.events.length > MAX_ASSIGNMENT_WORK
    ) {
      summary.status = "unavailable";
      summary.capacityEvaluation = "unavailable";
      summary.failures.push(
        "Exact assignment search exceeds the state/work budget; no heuristic optimum is reported.",
      );
      return { summary };
    }
  }
  // Bound recursion depth independently of branching (a large one-choice stream is trivial).
  const branching = choices
    .map((options, index) => (options.length > 1 ? index : -1))
    .filter((index) => index >= 0);
  const current = new Int32Array(choices.map((options) => options[0] ?? -1));
  const cache = new Map<string, boolean>();
  let best: Int32Array | undefined;
  let bestCost: Decimal | undefined;
  let bestApiCount = Number.POSITIVE_INFINITY;
  const visit = (depth: number) => {
    if (depth < branching.length) {
      const index = branching[depth];
      if (index === undefined) return;
      for (const option of choices[index] ?? []) {
        current[index] = option;
        visit(depth + 1);
      }
      return;
    }
    let cost = ZERO;
    let apiCount = 0;
    for (let index = 0; index < current.length; index++)
      if (current[index] === -1) {
        cost = cost.plus(prepared.quotes[index]?.amount ?? "0");
        apiCount++;
      }
    if (
      bestCost !== undefined &&
      (cost.gt(bestCost) || (cost.eq(bestCost) && apiCount >= bestApiCount))
    )
      return;
    for (const resource of configuration.subscriptions) {
      const indices: number[] = [];
      for (let index = 0; index < current.length; index++)
        if (current[index] === resource) indices.push(index);
      const key = `${resource}:${indices.join(",")}`;
      let feasible = cache.get(key);
      if (feasible === undefined) {
        const subscription = prepared.subscriptions[resource];
        if (subscription === undefined) throw new Error("Missing prepared subscription");
        let included = 0;
        replayWithReceipt(
          {
            events: indices.map((index) => prepared.events[index] as TextUsageEventV1),
            target: subscription.resource.target,
            initialCapacity: subscription.initialCapacity,
            catalog: prepared.input.catalog,
            context: prepared.input.context,
          },
          {
            subscription: (_event, observation) => {
              if (observation.disposition === "included") included++;
            },
          },
        );
        feasible = included === indices.length;
        // Bounded cache: never retain event-sized subset keys for many candidates.
        if (cache.size < 4096 && indices.length <= 64) cache.set(key, feasible);
      }
      if (!feasible) return;
    }
    best = current.slice();
    bestCost = cost;
    bestApiCount = apiCount;
  };
  visit(0);
  summary.allocation = "exhaustive-replay";
  if (best === undefined) {
    summary.failures.push(
      "Exhaustive assignment found no allocation satisfying every selected plan's admission rules.",
    );
    return { summary };
  }
  return finish(prepared, configuration, summary, best);
}

function evaluate(prepared: Prepared, configuration: Configuration): Allocation {
  const summary = baseSummary(prepared, configuration);
  if (configuration.subscriptions.length === 0) {
    summary.allocation = "api-only";
    return finish(
      prepared,
      configuration,
      summary,
      new Int32Array(prepared.events.length).fill(-1),
    );
  }
  if (prepared.scope.capacityEligible !== prepared.scope.required) {
    summary.status = "unavailable";
    summary.capacityEvaluation = "unavailable";
    summary.failures.push(
      "Insufficient chronological event data; aggregate/unknown records cannot establish subscription capacity survival.",
    );
    return { summary };
  }
  if (configuration.subscriptions.some((index) => !prepared.subscriptions[index]?.fast))
    return exhaustive(prepared, configuration, summary);
  const match = matchRequestPools(
    prepared.events.length,
    prepared.order,
    configuration.subscriptions,
    prepared.membership,
    prepared.pools,
  );
  const placement = match.placement;
  for (let index = 0; index < placement.length; index++)
    placement[index] = prepared.pools[placement[index] ?? -1]?.resource ?? -1;
  summary.allocation = "weighted-matching";
  return finish(prepared, configuration, summary, placement);
}

function explain(
  prepared: Prepared,
  configuration: Configuration,
  allocation: Allocation,
): ExactCandidateExplanation {
  if (allocation.placement === undefined || allocation.summary.status !== "feasible")
    throw new Error("Only feasible candidates have execution assignments");
  const placement = allocation.placement;
  const assigned = new Map<string, TextUsageEventV1[]>();
  const used = new Int32Array(prepared.pools.length);
  for (let index = 0; index < placement.length; index++) {
    const resource = placement[index] ?? -1;
    const id =
      resource >= 0 ? prepared.subscriptions[resource]?.id : prepared.quotes[index]?.resourceId;
    const event = prepared.events[index];
    if (id === undefined || event === undefined)
      throw new Error("Feasible assignment has no resource");
    const list = assigned.get(id) ?? [];
    list.push(event);
    assigned.set(id, list);
    const pool = prepared.membership[resource]?.pools[index] ?? -1;
    if (pool >= 0) used[pool] = (used[pool] ?? 0) + 1;
  }
  const resources: ExactCandidateExplanation["resources"] = [];
  const selected = [
    ...configuration.subscriptions
      .map((index) => prepared.subscriptions[index])
      .filter((entry) => entry !== undefined),
    ...prepared.apis.filter((api) => assigned.has(api.id)),
  ].sort((a, b) => lexical(a.id, b.id));
  let verifiedVariable = ZERO;
  for (const resource of selected) {
    const events = assigned.get(resource.id) ?? [];
    let accepted = 0;
    const run = replayWithReceipt(
      {
        events,
        target: resource.resource.target,
        ...("initialCapacity" in resource ? { initialCapacity: resource.initialCapacity } : {}),
        catalog: prepared.input.catalog,
        context: prepared.input.context,
      },
      {
        subscription: (_event, outcome) => {
          if (outcome.disposition === "included") accepted++;
        },
        api: (_event, outcome) => {
          if (outcome === "priced") accepted++;
        },
      },
    );
    if (accepted !== events.length)
      throw new Error("Optimizer assignment did not agree with replay admission/pricing");
    if (resource.resource.target.type === "api")
      verifiedVariable = verifiedVariable.plus(run.receipt?.total ?? "0");
    resources.push({
      id: resource.id,
      records: events.length,
      result: run.result,
      receipt: run.receipt,
      ...("initialCapacity" in resource && resource.initialCapacity !== undefined
        ? { initialCapacity: resource.initialCapacity }
        : {}),
      ...("capacityEvidence" in resource.resource
        ? { capacityEvidence: resource.resource.capacityEvidence }
        : {}),
    });
  }
  if (!verifiedVariable.eq(allocation.summary.variableCost ?? "0"))
    throw new Error("Optimizer cost did not agree with replay receipts");
  const capacityChecks: ExactCandidateExplanation["capacityChecks"] = [];
  const assignments = prepared.events.map(
    (event, index): ExactCandidateExplanation["assignments"][number] => {
      const resource = placement[index] ?? -1;
      const modelId = prepared.scope.events[index]?.modelId ?? "";
      const compatible = configuration.subscriptions.filter((entry) =>
        prepared.subscriptions[entry]?.models.has(modelId),
      );
      const limitingPools =
        resource < 0
          ? compatible
              .map((entry) => prepared.membership[entry]?.pools[index] ?? -1)
              .filter(
                (pool) => pool >= 0 && (used[pool] ?? 0) >= (prepared.pools[pool]?.capacity ?? 0),
              )
          : [];
      if (resource < 0 && allocation.summary.allocation === "exhaustive-replay")
        for (const entry of compatible) {
          const subscription = prepared.subscriptions[entry];
          if (subscription === undefined) continue;
          const blocking = new Set<string>();
          const trial = replayWithReceipt(
            {
              events: [...(assigned.get(subscription.id) ?? []), event],
              target: subscription.resource.target,
              initialCapacity: subscription.initialCapacity,
              catalog: prepared.input.catalog,
              context: prepared.input.context,
            },
            {
              subscription: (_event, observation) => {
                for (const id of observation.blockingLimitIds) blocking.add(id);
              },
            },
          );
          capacityChecks.push({
            eventId: event.id,
            resourceId: subscription.id,
            violations: trial.result.violations,
            blockingLimitIds: [...blocking].sort(lexical),
          });
        }
      return {
        eventId: event.id,
        modelId,
        resourceId:
          resource >= 0
            ? (prepared.subscriptions[resource]?.id ?? "")
            : (prepared.quotes[index]?.resourceId ?? ""),
        reason:
          resource >= 0
            ? "subscription"
            : configuration.subscriptions.length === 0
              ? "api-only"
              : compatible.length === 0
                ? "api-only-model"
                : "capacity-reserved",
        limitingPools,
      };
    },
  );
  return {
    candidateId: configuration.id,
    assignments,
    pools: prepared.pools
      .map((pool, index) => ({ ...pool, id: index, used: used[index] ?? 0 }))
      .filter((pool) => configuration.subscriptions.includes(pool.resource)),
    resources,
    capacityChecks,
  };
}

/** Reconstruct detailed assignments/receipts without retaining them for every candidate. */
export function explainExactCandidate(
  input: ExactOptimizationInput,
  candidateId: string,
): ExactCandidateExplanation {
  const prepared = prepare(input);
  const configuration = configurations(prepared).find((entry) => entry.id === candidateId);
  if (configuration === undefined)
    unsupported("Candidate ID is not in this bounded configuration family.");
  return explain(prepared, configuration, evaluate(prepared, configuration));
}

type OptimizerDiagnostics = {
  onPhase?: (phase: "preparing" | "enumerating" | "assigning" | "receipts") => void;
};
export function optimizeExactModels(
  input: CompiledOptimizationInput,
  runtime?: OptimizerDiagnostics,
): CompiledOptimizationResult;
/** Legacy catalog-v1 compatibility entry; frozen economics and persisted receipt semantics. */
export function optimizeExactModels(
  input: ExactOptimizationInput,
  runtime?: OptimizerDiagnostics,
): ExactOptimizationResult;
export function optimizeExactModels(
  input: ExactOptimizationInput | CompiledOptimizationInput,
  runtime: OptimizerDiagnostics = {},
): ExactOptimizationResult | CompiledOptimizationResult {
  if ("contract" in input) return optimizeCompiledExactModels(input, runtime);
  runtime.onPhase?.("preparing");
  const prepared = prepare(input);
  runtime.onPhase?.("enumerating");
  const configs = configurations(prepared);
  const candidates: ExactCandidateSummary[] = [];
  let best: { configuration: Configuration; allocation: Allocation } | undefined;
  runtime.onPhase?.("assigning");
  for (const configuration of configs) {
    const allocation = evaluate(prepared, configuration);
    candidates.push(allocation.summary);
    if (
      allocation.summary.status === "feasible" &&
      (best === undefined ||
        compareExactCandidates(allocation.summary, best.allocation.summary) < 0)
    )
      best = { configuration, allocation };
  }
  candidates.sort(compareExactCandidates);
  // Strict observed-scope dominance only for the same purchased capacity/evidence.
  // This commonly marks a needless API-enabled duplicate of a subscription-only solution.
  for (const candidate of candidates) {
    if (candidate.status !== "feasible") continue;
    const dominator = candidates.find(
      (other) =>
        other !== candidate &&
        other.status === "feasible" &&
        JSON.stringify(other.subscriptions) === JSON.stringify(candidate.subscriptions) &&
        compareExactCandidates(other, candidate) < 0 &&
        parseAmount(other.totalCost ?? "0").lte(candidate.totalCost ?? "0") &&
        other.apiRecords <= candidate.apiRecords &&
        other.capacityDisplacedRecords <= candidate.capacityDisplacedRecords,
    );
    if (dominator !== undefined) candidate.dominatedBy = dominator.id;
  }
  const unresolved = candidates.filter((candidate) => candidate.status === "unavailable");
  const certified =
    best !== undefined &&
    unresolved.every((candidate) =>
      parseAmount(candidate.fixedCost).gt(best?.allocation.summary.totalCost ?? "0"),
    );
  const nonempty = prepared.scope.required > 0;
  runtime.onPhase?.("receipts");
  const explanation =
    best !== undefined && nonempty
      ? explain(prepared, best.configuration, best.allocation)
      : undefined;
  return {
    version: 1,
    scope: prepared.scope,
    status: !nonempty
      ? "empty"
      : certified
        ? "optimal"
        : unresolved.length > 0
          ? "incomplete"
          : "infeasible",
    ...(certified && nonempty && best !== undefined ? { winnerId: best.configuration.id } : {}),
    ...(best !== undefined && nonempty ? { bestKnownId: best.configuration.id } : {}),
    candidates,
    ...(explanation === undefined ? {} : { explanation }),
    resources: [
      ...prepared.subscriptions.map((entry) => ({
        id: entry.id,
        ...entry.resource,
        subscriptionPrice: {
          price: entry.version.price,
          sources: entry.version.sources,
          lastVerifiedAt: entry.version.lastVerifiedAt,
          verificationStatus: entry.version.verificationStatus,
        },
      })),
      ...prepared.apis.map((entry) => ({ id: entry.id, ...entry.resource })),
    ].sort((a, b) => lexical(a.id, b.id)),
    skippedResources: prepared.skipped,
    search: {
      maxSubscriptions: prepared.limits.maxSubscriptions,
      candidateCount: candidates.length,
      assignmentStateLimit: prepared.limits.maxAssignmentStates,
      assignmentWorkLimit: MAX_ASSIGNMENT_WORK,
      family: "api-pool-plus-subscription-singletons-and-pairs",
      initialAllowance: prepared.input.initialAllowance,
      retainedAssignmentSets: explanation === undefined ? 0 : 1,
    },
    assumptions: [
      ...(prepared.subscriptions.some((entry) => (entry.resource.target.quantity ?? 1) > 1)
        ? [
            "Purchased account quantities use aggregate numeric capacity with the original reset schedule. Independent account pools and windows are not simulated.",
          ]
        : []),
      "Optimum is over the declared API pool and subscription singleton/pair family, not arbitrary purchases.",
      "Each selected subscription is purchased at period.start for one full UTC calendar month; no proration or multi-cycle extrapolation.",
      "Initial allowance is explicit: supplied consumption applies only to its stated active window; unlisted pools start fresh. No historical calls are fabricated.",
      "All recognized records are required. Unknown identities alone are excluded globally; missing prices cannot make a candidate cheaper.",
      "API resources have no fixed charges or modeled rate limits. Aggregate records use only chronology-independent flat prices.",
      "Calendar request quotas use exact weighted matching. Other hard policies use bounded exhaustive replay; incomplete search never silently becomes an optimum.",
      "This is an offline hindsight allocation, not an online routing guarantee. It may reserve capacity for later expensive calls; displacement counts are not observed user interruptions.",
      "Existing replay pricing, evidence, cache accounting, rule snapshots and invoice exclusions remain authoritative.",
    ],
  };
}
