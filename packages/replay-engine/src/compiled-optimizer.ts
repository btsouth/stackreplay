import { type CatalogV1, createModelIdentityIndex } from "@stackreplay/catalog";
import {
  type BoundExecutionScenario,
  boundExecutionScenarioSchema,
  type CompiledExecutionPlan,
  compiledExecutionPlanSchema,
  type ExecutionEvaluationState,
  type ExecutionReason,
  type TextUsageEventV1,
} from "@stackreplay/schema";
import {
  type CapacityWitness,
  type CompiledReplay,
  type CompiledResource,
  ns,
  quoteRoute,
  reason,
  replayCompiledResource,
  resourceReadiness,
  routeEligibility,
  windowAt,
} from "./compiled-capacity.js";
import { hashBoundExecutionScenario, purchaseCycleEnd } from "./execution-binding.js";
import { Decimal, toUnitString, ZERO } from "./money.js";
import { prepareCandidateDemand } from "./optimizer.js";
import {
  matchRequestPools,
  type PoolMembership,
  type RequestPool,
} from "./optimizer-assignment.js";
import { ENGINE_VERSION } from "./version.js";

export interface CompiledOptimizationInput {
  contract: "compiled-v1" | "compiled-v2";
  events: readonly TextUsageEventV1[];
  /** Identity resolution only. Execution rules and rates come exclusively from artifacts. */
  catalog: CatalogV1;
  artifacts: readonly CompiledExecutionPlan[];
  scenario: BoundExecutionScenario;
}
export interface CompiledCandidate {
  id: string;
  resources: string[];
  apiAllowed: boolean;
  status: ExecutionEvaluationState;
  reasons: ExecutionReason[];
  /** Bounded witnesses from one rejected allocation, not a proof that every allocation fails. */
  capacityCrossings: CapacityWitness[];
  fixedUsd: string | null;
  fixedLowerBoundUsd: string;
  variableUsd?: string;
  totalUsd?: string;
  required: number;
  modeled: number;
  excluded: number;
  subscriptionRecords: number;
  apiRecords: number;
  exactModelPreservation?: 1;
  allocation: "api-only" | "weighted-matching" | "exhaustive-replay" | "not-evaluated";
}
export interface CompiledOptimizationResult {
  contract: "compiled-v1" | "compiled-v2";
  engineVersion: string;
  methodology: "compiled-offline-v1" | "compiled-offline-v2";
  status: "optimal" | "incomplete" | "infeasible" | "empty";
  winnerId?: string;
  bestKnownId?: string;
  scope: {
    digest: string;
    recorded: number;
    required: number;
    excluded: number;
    exclusions: string[];
    period: BoundExecutionScenario["period"];
  };
  scenario: BoundExecutionScenario;
  artifacts: {
    artifactHash: string;
    catalogHash: string;
    compilerVersion: string;
    planId: string;
    planVersionId: string;
    claims: CompiledExecutionPlan["claims"];
    meters: unknown[];
    knownAccess?: NonNullable<
      Extract<CompiledExecutionPlan, { contractVersion: 2 }>["knownAccess"]
    >;
    nonComputableReasons?: ExecutionReason[];
    purchase?: CompiledExecutionPlan["purchase"];
  }[];
  candidates: CompiledCandidate[];
  search: {
    family: "api-pool-plus-subscription-singletons-and-pairs";
    familyComplete: boolean;
    candidateCount: number;
    assignmentWorkLimit: number;
    omissions: ExecutionReason[];
  };
  explanation?: {
    candidateId: string;
    fixedFees: {
      resourceInstanceId: string;
      artifactHash: string;
      cycle: unknown;
      usd: string;
      claimRefs: string[];
    }[];
    receipts: CompiledReplay[];
    assignments: {
      eventId: string;
      modelId: string;
      resourceInstanceId: string;
      routeId: string;
    }[];
  };
  assumptions: string[];
}
interface Event {
  event: TextUsageEventV1;
  modelId: string;
  at: bigint;
}
interface Choice {
  resource: number;
  route: string;
  cash: string;
}
const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const WORK_LIMIT = 2_000_000;
export function compareCompiledCandidates(a: CompiledCandidate, b: CompiledCandidate): number {
  const rank = (c: CompiledCandidate) => (c.status === "feasible" ? 0 : 1);
  return (
    rank(a) - rank(b) ||
    new Decimal(a.totalUsd ?? 0).cmp(b.totalUsd ?? 0) ||
    new Decimal(a.variableUsd ?? 0).cmp(b.variableUsd ?? 0) ||
    a.resources.length - b.resources.length ||
    a.apiRecords - b.apiRecords ||
    lexical(a.id, b.id)
  );
}
/** Non-security content fingerprint. Pinned artifacts/scenario retain their compiler hashes. */
function fingerprint(
  events: readonly Event[],
  excluded: string[],
  period: BoundExecutionScenario["period"],
): string {
  let a = 2166136261,
    b = 0x9e3779b9;
  const add = (s: string) => {
    for (let i = 0; i < s.length; i++) {
      a = Math.imul(a ^ s.charCodeAt(i), 16777619);
      b = Math.imul(b ^ s.charCodeAt(i), 2246822519);
    }
  };
  add(JSON.stringify(period));
  add(JSON.stringify(excluded));
  for (const e of events)
    add(JSON.stringify([e.event.id, e.modelId, e.event.occurredAt, e.event.usage, e.event.source]));
  return `scope-fnv64-v1:${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`;
}
export function optimizeCompiledExactModels(
  input: CompiledOptimizationInput,
  runtime?: { onPhase?: (phase: "preparing" | "enumerating" | "assigning" | "receipts") => void },
): CompiledOptimizationResult {
  runtime?.onPhase?.("preparing");
  const scenario = boundExecutionScenarioSchema.parse(input.scenario);
  if (input.artifacts.length > 14) throw new Error("Compiled artifact bound exceeded");
  const artifacts = input.artifacts.map((p) => compiledExecutionPlanSchema.parse(p));
  if (
    input.contract !== `compiled-v${scenario.version}` ||
    artifacts.some((p) => p.contractVersion !== scenario.version)
  )
    throw new Error("Mixed compiled contract versions");
  if (scenario.version === 2 && scenario.scenarioHash !== hashBoundExecutionScenario(scenario))
    throw new Error("Bound scenario hash mismatch");
  if (
    new Set(artifacts.map((p) => p.artifactHash)).size !== artifacts.length ||
    new Set(scenario.resources.map((r) => r.id)).size !== scenario.resources.length
  )
    throw new Error("Duplicate compiled identity");
  const resources: CompiledResource[] = [...scenario.resources]
    .sort((a, b) => lexical(a.id, b.id))
    .map((binding) => {
      const artifact = artifacts.find((p) => p.artifactHash === binding.artifactHash);
      if (!artifact) throw new Error("Missing pinned artifact");
      return { binding, artifact };
    });
  if (
    scenario.initial.observations.some(
      (o) => !resources.some((r) => r.binding.id === o.resourceInstanceId),
    )
  )
    throw new Error("Unknown initial resource");
  const subscriptions = resources.flatMap((r, i) =>
    r.artifact.purchase.kind === "subscription" ? [i] : [],
  );
  const apiResources = resources.flatMap((r, i) => (r.artifact.purchase.kind === "api" ? [i] : []));
  if (
    subscriptions.length > 6 ||
    apiResources.reduce(
      (n, i) =>
        n +
        (resources[i]?.artifact.computation.kind === "executable"
          ? (resources[i]?.artifact.computation.routes.length ?? 0)
          : 1),
      0,
    ) > 8
  )
    throw new Error("Compiled candidate family bound exceeded");
  const calendarMonth =
    scenario.version === 2
      ? scenario.resources.find((b) => {
          const p = artifacts.find((p) => p.artifactHash === b.artifactHash);
          if (
            p?.purchase.kind !== "subscription" ||
            p.purchase.term !== "month" ||
            !b.cycle ||
            !b.billingTimezone
          )
            return false;
          try {
            return (
              ns(purchaseCycleEnd("month", b.cycle.start, b.billingTimezone)) === ns(b.cycle.end) &&
              ns(b.cycle.start) <= ns(scenario.period.start) &&
              ns(b.cycle.end) >= ns(scenario.period.end)
            );
          } catch {
            return false;
          }
        })
      : undefined;
  const demand = prepareCandidateDemand(
    { events: input.events, period: scenario.period },
    calendarMonth?.cycle && calendarMonth.billingTimezone
      ? { start: calendarMonth.cycle.start, billingTimezone: calendarMonth.billingTimezone }
      : undefined,
  );
  const identity = createModelIdentityIndex(input.catalog);
  const events: Event[] = [],
    excluded: string[] = [];
  const identityCache = new Map<string, string | undefined>();
  for (const t of demand.timed) {
    const key = JSON.stringify([t.event.model, t.event.harness?.id]);
    if (!identityCache.has(key))
      identityCache.set(
        key,
        t.event.model.canonicalId && input.catalog.models[t.event.model.canonicalId]
          ? t.event.model.canonicalId
          : identity.resolve(
              t.event.model.rawName,
              t.event.harness ? { harness: t.event.harness.id } : undefined,
            ).canonicalId,
      );
    const modelId = identityCache.get(key);
    if (!modelId) excluded.push(t.event.id);
    else events.push({ event: t.event, modelId, at: BigInt(t.atMs) * 1000000n + BigInt(t.subMs) });
  }
  // Aggregate adapters cannot acquire chronology through a caller override.
  if (events.some((e) => e.event.source.adapterId === "ccusage")) {
    scenario.chronology = "aggregate";
    // Pin the effective scenario facts after conservative chronology normalization.
    if (scenario.version === 2) scenario.scenarioHash = hashBoundExecutionScenario(scenario);
  }
  const readiness = resources.map((r) => resourceReadiness(r, scenario));
  const interned = new Map<string, Choice>();
  const choice = (resource: number, route: string, cash: string): Choice => {
    const key = JSON.stringify([resource, route, cash]);
    const existing = interned.get(key);
    if (existing) return existing;
    const value = { resource, route, cash };
    if (interned.size < 4096) interned.set(key, value);
    return value;
  };
  const api: (Choice | undefined)[] = new Array(events.length);
  const apiUnknown = new Map<string, ExecutionReason>();
  const remember = (reasons: ExecutionReason[]) => {
    for (const r of reasons) apiUnknown.set(JSON.stringify(r), r);
  };
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e) continue;
    for (const index of apiResources) {
      const resource = resources[index];
      const ready = readiness[index];
      if (!resource || !ready) continue;
      if (
        resource.artifact.computation.kind === "executable" &&
        !resource.artifact.computation.routes.some((route) => route.models.includes(e.modelId))
      )
        continue;
      if (ready.status !== "feasible") {
        remember(ready.reasons);
        continue;
      }
      const rules = resource.artifact.computation;
      if (rules.kind !== "executable") continue;
      for (const route of [...rules.routes].sort((a, b) => lexical(a.id, b.id))) {
        if (!route.models.includes(e.modelId)) continue;
        const eligibility = routeEligibility(route, resource.binding);
        if (eligibility) {
          remember([eligibility]);
          continue;
        }
        const quote = quoteRoute(rules, route, e.event, scenario.chronology);
        if (quote.reason) {
          remember([quote.reason]);
          continue;
        }
        const current = api[i];
        if (!current || quote.cash.lt(current.cash))
          api[i] = choice(index, route.id, toUnitString(quote.cash));
      }
    }
  }
  const unknownApi = [...apiUnknown.values()];
  runtime?.onPhase?.("enumerating");
  const configs: { subs: number[]; api: boolean; id: string }[] = [];
  const add = (subs: number[], paid: boolean) =>
    configs.push({
      subs,
      api: paid,
      id: [
        ...subs.map((i) => {
          const id = resources[i]?.binding.id ?? "";
          return id === "api" ? "@api" : encodeURIComponent(id);
        }),
        ...(paid ? ["api"] : []),
      ].join("+"),
    });
  if (apiResources.length) add([], true);
  for (let i = 0; i < subscriptions.length; i++) {
    const s = subscriptions[i];
    if (s === undefined) continue;
    add([s], false);
    if (apiResources.length) add([s], true);
    if (scenario.maxSubscriptions === 2)
      for (let j = i + 1; j < subscriptions.length; j++) {
        const t = subscriptions[j];
        if (t === undefined) continue;
        add([s, t], false);
        if (apiResources.length) add([s, t], true);
      }
  }
  const candidates: CompiledCandidate[] = [];
  let best: { candidate: CompiledCandidate; placement: Choice[] } | undefined;
  runtime?.onPhase?.("assigning");
  for (const config of configs) {
    let fixed = ZERO,
      unknownFee = false;
    for (const index of config.subs) {
      const p = resources[index]?.artifact.purchase;
      if (p?.kind === "subscription") {
        if (p.fixedUsd === null) unknownFee = true;
        else fixed = fixed.add(p.fixedUsd);
      }
    }
    const c: CompiledCandidate = {
      id: config.id,
      resources: config.subs.map((i) => resources[i]?.binding.id ?? ""),
      apiAllowed: config.api,
      status: "feasible",
      reasons: [],
      capacityCrossings: [],
      fixedUsd: unknownFee ? null : toUnitString(fixed),
      fixedLowerBoundUsd:
        !unknownFee &&
        config.subs.every((index) => {
          const p = resources[index]?.artifact;
          return (
            p?.purchase.kind === "subscription" &&
            p.purchase.claimRefs.length > 0 &&
            p.purchase.claimRefs.every((ref) => p.claims.some((c) => c.id === ref))
          );
        })
          ? toUnitString(fixed)
          : "0",
      required: events.length,
      modeled: 0,
      excluded: excluded.length,
      subscriptionRecords: 0,
      apiRecords: 0,
      allocation: config.subs.length ? "exhaustive-replay" : "api-only",
    };
    candidates.push(c);
    const states = config.subs.map((i) => readiness[i]).filter((s) => s && s.status !== "feasible");
    if (states.length) {
      c.status = states.some((s) => s?.status === "unavailable") ? "unavailable" : "not_computable";
      c.reasons = states.flatMap((s) => s?.reasons ?? []);
      continue;
    }
    if (config.subs.length && scenario.chronology !== "request") {
      c.status = "not_computable";
      c.reasons = [reason("insufficient_chronology", config.id)];
      continue;
    }
    const instances = config.subs
      .map((i) => resources[i])
      .filter((r): r is CompiledResource => !!r);
    if (
      new Set(instances.map((r) => r.artifact.planId)).size !== instances.length ||
      new Set(instances.flatMap((r) => r.binding.sharedCapacityIds)).size !==
        instances.flatMap((r) => r.binding.sharedCapacityIds).length
    ) {
      c.status = "not_computable";
      c.reasons = [reason("shared_resource", config.id)];
      continue;
    }
    const choices: Choice[][] = [];
    const choiceLists = new Map<string, Choice[]>();
    let unknown: ExecutionReason[] = [],
      unavailable = config.api && unknownApi.some((r) => r.code === "eligibility_false");
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e) continue;
      const list: Choice[] = [];
      for (const index of config.subs) {
        const r = resources[index];
        if (r?.artifact.computation.kind !== "executable") continue;
        const route = r.artifact.computation.routes.find((route) =>
          route.models.includes(e.modelId),
        );
        if (!route) continue;
        const eligibility = routeEligibility(route, r.binding);
        if (eligibility) {
          if (eligibility.code === "eligibility_false") unavailable = true;
          else unknown.push(eligibility);
          continue;
        }
        if (
          !route.cash &&
          route.debitIds.every(
            (id) =>
              r.artifact.computation.kind === "executable" &&
              r.artifact.computation.debits.some(
                (d) => d.id === id && d.operation.kind === "constant",
              ),
          )
        ) {
          list.push(choice(index, route.id, "0"));
        } else {
          const quote = quoteRoute(r.artifact.computation, route, e.event, scenario.chronology);
          if (quote.reason) unknown.push(quote.reason);
          else list.push(choice(index, route.id, toUnitString(quote.cash)));
        }
      }
      if (config.api && api[i]) list.push(api[i] as Choice);
      const key = list.map((p) => JSON.stringify([p.resource, p.route, p.cash])).join(";");
      const cached = choiceLists.get(key);
      if (cached) choices.push(cached);
      else {
        choices.push(list);
        if (choiceLists.size < 4096) choiceLists.set(key, list);
      }
    }
    // Unknown routes may be cheaper or rescue exhaustion: don't certify a restricted subset silently.
    if (config.api)
      unknown = [...unknown, ...unknownApi.filter((r) => r.code !== "eligibility_false")];
    if (unknown.length) {
      c.status = "not_computable";
      c.reasons = [...new Map(unknown.map((r) => [JSON.stringify(r), r])).values()];
      continue;
    }
    if (choices.some((list) => !list.length)) {
      c.status = unavailable ? "unavailable" : "infeasible";
      c.reasons = [reason(unavailable ? "eligibility_false" : "unsupported_model", config.id)];
      continue;
    }
    let selected: Choice[] | undefined;
    let selectedCost: Decimal | undefined;
    let lastFailure: ExecutionReason[] = [];
    const evaluate = (placement: Choice[]): boolean => {
      for (const index of config.subs) {
        const r = resources[index];
        if (!r) continue;
        function* offers() {
          for (let i = 0; i < events.length; i++) {
            const e = events[i];
            const p = placement[i];
            if (e && p?.resource === index) yield { ...e, routeId: p.route };
          }
        }
        const run = replayCompiledResource(r, scenario, offers(), false);
        if (run.status !== "feasible") {
          lastFailure = run.reasons;
          c.capacityCrossings = run.capacity.filter((w) => w.crossings > 0).slice(0, 16);
          if (run.status !== "infeasible") c.status = run.status;
          return false;
        }
      }
      return true;
    };
    // Reuse the proven matcher only for one calendar constraint and unit request debit.
    const fast =
      config.subs.length > 0 &&
      instances.every((r) => {
        const p = r.artifact.computation;
        if (
          p.kind !== "executable" ||
          p.constraints.length !== 1 ||
          p.windows.length !== 1 ||
          p.windows[0]?.kind !== "calendar" ||
          p.constraints[0]?.models ||
          p.constraints[0]?.exceed !== "reject_request" ||
          !new Decimal(p.constraints[0]?.amount ?? 0).isInteger()
        )
          return false;
        return p.routes.every(
          (route) =>
            !route.cash &&
            route.debitIds.length === 1 &&
            p.debits.some(
              (d) =>
                d.id === route.debitIds[0] &&
                d.operation.kind === "constant" &&
                d.operation.amount === "1" &&
                p.meters.some((m) => m.id === d.meterId && m.kind === "request"),
            ),
        );
      });
    if (fast) {
      const pools: RequestPool[] = [],
        memberships: PoolMembership[] = resources.map(() => ({
          pools: new Int32Array(events.length).fill(-1),
        }));
      for (const index of config.subs) {
        const r = resources[index];
        if (r?.artifact.computation.kind !== "executable") continue;
        const rules = r.artifact.computation,
          constraint = rules.constraints[0],
          window = rules.windows[0];
        if (!constraint || !window) continue;
        const ids = new Map<string, number>(),
          active = new Map();
        for (let i = 0; i < events.length; i++) {
          const e = events[i];
          if (!e || !choices[i]?.some((ch) => ch.resource === index)) continue;
          const bounds = windowAt(window, r.binding, e.at, active);
          if (!bounds) continue;
          let pool = ids.get(bounds.id);
          if (pool === undefined) {
            const observation = scenario.initial.observations.find(
              (o) =>
                o.resourceInstanceId === r.binding.id &&
                o.constraintId === constraint.id &&
                o.window.id === bounds.id,
            );
            if (
              !observation &&
              bounds.start < ns(scenario.period.start) &&
              scenario.initial.unlisted !== "fresh"
            ) {
              c.status = "not_computable";
              c.reasons = [reason("initial_state_unknown", constraint.id)];
              break;
            }
            const remaining = new Decimal(constraint.amount).sub(observation?.consumedUnits ?? 0);
            if (!remaining.isInteger()) {
              c.status = "not_computable";
              c.reasons = [reason("unsupported_semantics", "fractional_request_initial")];
              break;
            }
            pool = pools.length;
            ids.set(bounds.id, pool);
            pools.push({
              resource: index,
              resourceId: r.binding.id,
              limitId: constraint.id,
              start: bounds.start.toString(),
              end: bounds.end.toString(),
              capacity: observation?.latched ? 0 : Math.min(events.length, remaining.toNumber()),
            });
          }
          const membership = memberships[index];
          if (membership) membership.pools[i] = pool;
        }
      }
      if (c.status !== "feasible") continue;
      const order = events
        .map((_, i) => i)
        .sort((a, b) => {
          const aa = config.api ? api[a] : undefined,
            bb = config.api ? api[b] : undefined;
          return (!aa && !bb ? 0 : !aa ? -1 : !bb ? 1 : new Decimal(bb.cash).cmp(aa.cash)) || a - b;
        });
      const matched = matchRequestPools(events.length, order, config.subs, memberships, pools);
      const placement = events.map((_, i) => {
        const pool = pools[matched.placement[i] ?? -1];
        return pool
          ? choices[i]?.find((ch) => ch.resource === pool.resource)
          : config.api
            ? api[i]
            : undefined;
      });
      // Matching proves admission for this narrowly checked domain. Independently
      // replay the selected winner below, as the legacy optimizer does.
      if (placement.every((p): p is Choice => p !== undefined)) selected = placement;
      c.allocation = "weighted-matching";
    } else {
      let count = 1;
      for (const list of choices) {
        count *= list.length;
        if (count > scenario.maxAssignmentStates) break;
      }
      const multiplicity = Math.max(
        1,
        ...instances.map((r) =>
          r.artifact.computation.kind === "executable"
            ? 1 + r.artifact.computation.constraints.length + r.artifact.computation.debits.length
            : 1,
        ),
      );
      if (
        count > scenario.maxAssignmentStates ||
        (count + 1) * events.length * multiplicity > WORK_LIMIT
      ) {
        c.status = "not_evaluated";
        c.allocation = "not-evaluated";
        c.reasons = [reason("assignment_budget", config.id)];
        continue;
      }
      // Mixed-radix iteration avoids recursion/stack growth for 100k single-choice events.
      const digits = new Int32Array(events.length);
      for (let state = 0; state < count; state++) {
        const placement = choices.map((list, i) => list[digits[i] ?? 0] as Choice);
        const cost = placement.reduce((sum, p) => sum.add(p.cash), ZERO);
        if ((!selectedCost || cost.lt(selectedCost)) && evaluate(placement)) {
          selected = placement;
          selectedCost = cost;
        }
        for (let i = digits.length - 1; i >= 0; i--) {
          digits[i] = (digits[i] ?? 0) + 1;
          if ((digits[i] ?? 0) < (choices[i]?.length ?? 0)) break;
          digits[i] = 0;
        }
      }
    }
    if (!selected) {
      if (c.status === "feasible") c.status = "infeasible";
      c.reasons = lastFailure.length ? lastFailure : [reason("capacity_exhausted", c.id)];
      continue;
    }
    if (c.status !== "feasible") {
      c.reasons = lastFailure;
      continue;
    }
    const variable = selected.reduce((sum, p) => sum.add(p.cash), ZERO);
    c.variableUsd = toUnitString(variable);
    c.totalUsd = toUnitString(fixed.add(variable));
    c.modeled = events.length;
    c.exactModelPreservation = 1;
    c.apiRecords = selected.filter(
      (ch) => resources[ch.resource]?.artifact.purchase.kind === "api",
    ).length;
    c.subscriptionRecords = events.length - c.apiRecords;
    if (!best || compareCompiledCandidates(c, best.candidate) < 0)
      best = { candidate: c, placement: selected };
  }
  runtime?.onPhase?.("receipts");
  const omissions = candidates.filter(
    (c) => c.status === "not_computable" || c.status === "not_evaluated",
  );
  const certified =
    best &&
    omissions.every((c) => new Decimal(c.fixedLowerBoundUsd).gt(best?.candidate.totalUsd ?? 0));
  const result: CompiledOptimizationResult = {
    contract: input.contract,
    engineVersion: ENGINE_VERSION,
    methodology: scenario.version === 2 ? "compiled-offline-v2" : "compiled-offline-v1",
    status: !events.length
      ? "empty"
      : certified
        ? "optimal"
        : omissions.length
          ? "incomplete"
          : "infeasible",
    ...(best ? { bestKnownId: best.candidate.id } : {}),
    ...(certified && best && events.length ? { winnerId: best.candidate.id } : {}),
    scope: {
      digest: fingerprint(events, excluded, scenario.period),
      recorded: demand.events.length,
      required: events.length,
      excluded: excluded.length,
      exclusions: excluded,
      period: scenario.period,
    },
    scenario,
    artifacts: artifacts.map((a) => ({
      artifactHash: a.artifactHash,
      catalogHash: a.catalogHash,
      compilerVersion: a.compilerVersion,
      planId: a.planId,
      planVersionId: a.planVersionId,
      claims: a.claims,
      meters: a.computation.kind === "executable" ? a.computation.meters : [],
      ...(a.contractVersion === 2
        ? {
            purchase: a.purchase,
            knownAccess: a.knownAccess ?? [],
            ...(a.computation.kind === "not_computable"
              ? { nonComputableReasons: a.computation.reasons }
              : {}),
          }
        : {}),
    })),
    candidates: candidates.sort(compareCompiledCandidates),
    search: {
      family: "api-pool-plus-subscription-singletons-and-pairs",
      familyComplete: omissions.length === 0,
      candidateCount: candidates.length,
      assignmentWorkLimit: WORK_LIMIT,
      omissions: omissions.flatMap((c) => c.reasons),
    },
    assumptions: [
      "Retrospective assignment uses the complete recorded workload; this is not a live routing policy.",
      "One explicit full-price billing cycle per purchased resource; no unobserved concurrent activity.",
      `Unlisted initial state: ${scenario.initial.unlisted}; first-use activation is separately bound.`,
      "Optimality is confined to the bounded singleton/pair candidate family.",
      "After child teardown, chronological verification requires original workload and pinned artifacts/scenario; summary verifies aggregate arithmetic only.",
    ],
  };
  if (best) {
    const winner = best;
    const receipts = resources.flatMap((r, index) => {
      if (!winner.placement.some((p) => p.resource === index)) return [];
      function* offers() {
        for (let i = 0; i < events.length; i++) {
          const e = events[i],
            p = winner.placement[i];
          if (e && p?.resource === index) yield { ...e, routeId: p.route };
        }
      }
      const receipt = replayCompiledResource(r, scenario, offers());
      if (receipt.status !== "feasible") throw new Error("Compiled assignment verification failed");
      return [receipt];
    });
    if (
      !new Decimal(best.candidate.variableUsd ?? 0).eq(
        receipts.reduce((sum, r) => sum.add(r.variableUsd), ZERO),
      )
    )
      throw new Error("Compiled cash receipt mismatch");
    result.explanation = {
      candidateId: best.candidate.id,
      fixedFees: resources.flatMap((r) =>
        best?.candidate.resources.includes(r.binding.id) &&
        r.artifact.purchase.kind === "subscription"
          ? [
              {
                resourceInstanceId: r.binding.id,
                artifactHash: r.artifact.artifactHash,
                cycle: r.binding.cycle,
                usd: r.artifact.purchase.fixedUsd ?? "0",
                claimRefs: r.artifact.purchase.claimRefs,
              },
            ]
          : [],
      ),
      receipts,
      assignments: events.map((e, i) => {
        const p = winner.placement[i];
        if (!p) throw new Error("Missing assignment");
        return {
          eventId: e.event.id,
          modelId: e.modelId,
          resourceInstanceId: resources[p.resource]?.binding.id ?? "",
          routeId: p.route,
        };
      }),
    };
  }
  return result;
}
