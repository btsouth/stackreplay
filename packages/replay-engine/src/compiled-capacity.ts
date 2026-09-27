import { validateExecutionRates } from "@stackreplay/catalog";
import type {
  BoundExecutionScenario,
  CompiledExecutionPlan,
  ExecutableRules,
  ExecutionEvaluationState,
  ExecutionReason,
  ExecutionWindow,
  TextUsageEventV1,
} from "@stackreplay/schema";
import { type Decimal as Amount, Decimal, toUnitString, ZERO } from "./money.js";
import { calendarBucketBoundsMs, isoFromEpochMs, parseInstant } from "./time.js";
import { moneyUnitsForUsage, tokenAccountingOf } from "./units.js";

export const reason = (
  code: ExecutionReason["code"],
  subject: string,
  claimRefs: string[] = [],
): ExecutionReason => ({ code, subject, claimRefs });
export const ns = (value: string) => parseInstant(value).epochNanoseconds;
export type BoundResource = BoundExecutionScenario["resources"][number];
export interface CompiledResource {
  binding: BoundResource;
  artifact: CompiledExecutionPlan;
}
export interface CapacityWitness {
  resourceInstanceId: string;
  artifactHash: string;
  poolId: string;
  constraintId: string;
  window: { id: string; start: string; end: string };
  meterId: string;
  initial: string;
  accepted: string;
  ceiling: string;
  latched: boolean;
  observationRefs: string[];
  claimRefs: string[];
  crossings: number;
  firstCrossing?: { eventId: string; occurredAt: string; attemptedDebit: string };
}
export interface DebitComponent {
  category: string;
  quantity: string;
  rate: string;
  divisor: "1" | "1000000";
  factor: string;
  units: string;
}
export interface DebitReceipt {
  resourceInstanceId: string;
  poolId: string;
  meterId: string;
  debitId: string;
  components: DebitComponent[];
  units: string;
  records: number;
  claimRefs: string[];
}
export interface CashReceipt {
  resourceInstanceId: string;
  routeId: string;
  rateId: string;
  category: string;
  ratePerMillion: string;
  factor: string;
  tokens: string;
  usd: string;
  records: number;
  claimRefs: string[];
}
export interface CompiledReplay {
  status: ExecutionEvaluationState;
  reasons: ExecutionReason[];
  records: number;
  accepted: number;
  variableUsd: string;
  capacity: CapacityWitness[];
  debits: DebitReceipt[];
  cash: CashReceipt[];
}
function unique(items: { id: string }[]): boolean {
  return new Set(items.map((x) => x.id)).size === items.length;
}
/** Structural/semantic validation at the compilation boundary, never provider interpretation. */
export function resourceReadiness(
  resource: CompiledResource,
  scenario: BoundExecutionScenario,
): { status: ExecutionEvaluationState; reasons: ExecutionReason[] } {
  const { binding: b, artifact: p } = resource;
  const fail = (
    code: ExecutionReason["code"],
    subject = b.id,
    refs: string[] = [],
  ): ReturnType<typeof resourceReadiness> => ({
    status: code === "eligibility_false" ? "unavailable" : "not_computable",
    reasons: [reason(code, subject, refs)],
  });
  if (ns(scenario.rulesAt) < ns(p.validity.start) || ns(scenario.rulesAt) >= ns(p.validity.end))
    return fail("unsupported_semantics", "rules_binding");
  for (const r of p.requirements) {
    if (b.facts[r.id] !== "true")
      return fail(
        b.facts[r.id] === "false" ? "eligibility_false" : "eligibility_unknown",
        r.id,
        r.claimRefs,
      );
  }
  if (p.purchase.kind === "subscription") {
    if (p.purchase.term === "annual" || p.purchase.term === "unsupported")
      return fail("unsupported_purchase");
    if (p.purchase.fixedUsd === null) return fail("price_unknown");
    if (!b.cycle) return fail("reset_unknown", "purchase_cycle");
    const start = parseInstant(b.cycle.start);
    const expected =
      p.purchase.term === "28_days"
        ? start.add({ hours: 28 * 24 })
        : start.toZonedDateTimeISO("UTC").add({ months: 1 }).toInstant();
    if (
      expected.epochNanoseconds !== ns(b.cycle.end) ||
      ns(b.cycle.start) > ns(scenario.period.start) ||
      ns(b.cycle.end) < ns(scenario.period.end)
    )
      return fail("unsupported_purchase");
  }
  if (p.computation.kind === "not_computable")
    return { status: "not_computable", reasons: p.computation.reasons };
  const r = p.computation;
  for (const rate of r.rates)
    if (
      validateExecutionRates(rate).length ||
      (rate.denomination !== "USD" &&
        !r.meters.some((m) => m.id === (rate.denomination as { meterId: string }).meterId))
    )
      return fail("invalid_contract", rate.id);
  if (
    ![r.rates, r.meters, r.pools, r.debits, r.windows, r.constraints, r.routes, p.claims].every(
      unique,
    )
  )
    return fail("invalid_contract", "duplicate_id");
  const claims = new Set(p.claims.map((c) => c.id));
  for (const x of [
    ...p.requirements,
    ...r.rates,
    ...r.debits,
    ...r.constraints,
    ...r.routes,
    ...r.routes.flatMap((x) => x.requirements),
    ...(p.purchase.kind === "subscription" ? [p.purchase] : []),
  ])
    if (x.claimRefs.some((ref) => !claims.has(ref)))
      return fail("invalid_contract", "claim_reference");
  const seenModels = new Set<string>();
  for (const route of r.routes) {
    const pools = new Set<string>();
    for (const model of route.models) {
      if (p.purchase.kind === "subscription" && seenModels.has(model))
        return fail("unsupported_semantics", "ambiguous_included_route");
      seenModels.add(model);
    }
    for (const ref of route.debitIds) {
      const debit = r.debits.find((d) => d.id === ref);
      if (!debit || pools.has(debit.poolId)) return fail("invalid_contract", "debit_reference");
      pools.add(debit.poolId);
    }
    if (
      route.cash &&
      !r.rates.some((rate) => rate.id === route.cash?.rateId && rate.denomination === "USD")
    )
      return fail("price_unknown", route.id);
    if (
      p.purchase.kind === "api" &&
      (!route.cash || route.debitIds.length || r.constraints.length || r.pools.length)
    )
      return fail("unsupported_semantics", "limited_or_unpriced_paid_route");
  }
  for (const pool of r.pools)
    if (
      !r.meters.some((m) => m.id === pool.meterId) ||
      !r.constraints.some((c) => c.poolId === pool.id)
    )
      return fail("invalid_contract", pool.id);
  for (const d of r.debits) {
    if (!r.pools.some((pool) => pool.id === d.poolId && pool.meterId === d.meterId))
      return fail("invalid_contract", d.id);
    if (
      d.operation.kind === "rate" &&
      !r.rates.some((rate) => rate.id === (d.operation as { rateId: string }).rateId)
    )
      return fail("unknown_debit", d.id);
    if (d.operation.kind === "rate") {
      const source = r.rates.find((rate) => rate.id === (d.operation as { rateId: string }).rateId);
      const target = r.meters.find((m) => m.id === d.meterId);
      const same =
        source?.denomination === "USD"
          ? target?.kind === "usd_usage_value"
          : source?.denomination.meterId === d.meterId;
      if (!same && !d.operation.conversion)
        return fail("invalid_contract", "implicit_unit_conversion");
    }
    if (
      d.operation.kind === "tokens" &&
      new Set(d.operation.coefficients.map((c) => c.category)).size !==
        d.operation.coefficients.length
    )
      return fail("invalid_contract", d.id);
  }
  for (const c of r.constraints)
    if (!r.pools.some((p) => p.id === c.poolId) || !r.windows.some((w) => w.id === c.windowId))
      return fail("invalid_contract", c.id);
  for (const w of r.windows) {
    if (w.kind === "fixed_partition") {
      if (
        !b.cycle ||
        w.parentCycleId !== b.cycle.id ||
        ns(w.intervals[0]?.start ?? scenario.period.end) > ns(scenario.period.start) ||
        ns(w.intervals.at(-1)?.end ?? scenario.period.start) < ns(scenario.period.end)
      )
        return fail("reset_unknown", w.id);
      let previous: string | undefined;
      for (const interval of w.intervals) {
        if (
          ns(interval.start) >= ns(interval.end) ||
          ns(interval.start) < ns(b.cycle.start) ||
          ns(interval.end) > ns(b.cycle.end) ||
          (previous && ns(previous) !== ns(interval.start))
        )
          return fail("invalid_contract", w.id);
        previous = interval.end;
      }
      if (!unique(w.intervals)) return fail("invalid_contract", w.id);
    } else if (w.kind === "first_use_anchored") {
      const state = b.firstUse[w.id];
      if (!state) return fail("reset_unknown", w.id);
      if (
        state !== "inactive" &&
        (ns(state.end) - ns(state.start) !== BigInt(w.durationMs) * 1000000n ||
          ns(state.start) > ns(scenario.period.start) ||
          ns(state.end) <= ns(scenario.period.start))
      )
        return fail("invalid_contract", w.id);
    } else {
      try {
        calendarBucketBoundsMs(Date.parse(scenario.period.start), w.unit, w.timezone);
      } catch {
        return fail("invalid_contract", w.id);
      }
    }
  }
  const observations = scenario.initial.observations.filter((o) => o.resourceInstanceId === b.id);
  const seen = new Map<string, string>();
  for (const o of observations) {
    const c = r.constraints.find((c) => c.id === o.constraintId && c.poolId === o.poolId);
    if (
      o.artifactHash !== p.artifactHash ||
      !c ||
      (o.latched && c.exceed !== "latch_until_reset") ||
      ns(o.asOf) !== ns(scenario.period.start) ||
      ns(o.window.start) > ns(scenario.period.start) ||
      ns(o.window.end) <= ns(scenario.period.start) ||
      new Decimal(o.consumedUnits).gt(c.amount) ||
      !scenario.observationEvidence.some((e) => e.id === o.observationRef)
    )
      return fail("invalid_contract", "initial_observation");
    const key = JSON.stringify([o.poolId, o.constraintId, o.window.id]);
    const value = JSON.stringify([
      o.artifactHash,
      ns(o.asOf).toString(),
      ns(o.window.start).toString(),
      ns(o.window.end).toString(),
      toUnitString(new Decimal(o.consumedUnits)),
      o.latched,
      o.observationRef,
    ]);
    if (seen.has(key) && seen.get(key) !== value)
      return fail("invalid_contract", "conflicting_observation");
    seen.set(key, value);
    const w = r.windows.find((w) => w.id === c.windowId);
    if (!w) return fail("invalid_contract", c.id);
    const bounds = windowAt(w, b, ns(scenario.period.start), new Map());
    if (
      !bounds ||
      bounds.start !== ns(o.window.start) ||
      bounds.end !== ns(o.window.end) ||
      bounds.id !== o.window.id
    )
      return fail("invalid_contract", "observation_window");
  }
  for (const o of observations) {
    const subset = r.constraints.find((c) => c.id === o.constraintId);
    if (!subset?.models) continue;
    const shared = observations.find(
      (other) =>
        other.poolId === o.poolId &&
        ns(other.window.start) === ns(o.window.start) &&
        ns(other.window.end) === ns(o.window.end) &&
        r.constraints.some((c) => c.id === other.constraintId && !c.models),
    );
    if (shared && new Decimal(o.consumedUnits).gt(shared.consumedUnits))
      return fail("invalid_contract", "subset_initial_exceeds_shared");
  }
  return { status: "feasible", reasons: [] };
}
interface Bounds {
  id: string;
  start: bigint;
  end: bigint;
}
export function windowAt(
  w: ExecutionWindow,
  binding: BoundResource,
  at: bigint,
  active: Map<string, Bounds>,
  activate = false,
): Bounds | undefined {
  let current = active.get(w.id);
  if (current && current.start <= at && at < current.end) return current;
  if (w.kind === "calendar") {
    const bounds = calendarBucketBoundsMs(Number(at / 1000000n), w.unit, w.timezone);
    current = {
      id: `${w.id}:${isoFromEpochMs(bounds.startMs)}`,
      start: BigInt(bounds.startMs) * 1000000n,
      end: BigInt(bounds.endMs) * 1000000n,
    };
  } else if (w.kind === "fixed_partition") {
    const interval = w.intervals.find((i) => ns(i.start) <= at && at < ns(i.end));
    if (!interval) return undefined;
    current = { id: interval.id, start: ns(interval.start), end: ns(interval.end) };
  } else {
    const seed = binding.firstUse[w.id];
    if (seed && seed !== "inactive" && ns(seed.start) <= at && at < ns(seed.end))
      current = { id: seed.id, start: ns(seed.start), end: ns(seed.end) };
    else if (activate)
      current = { id: `${w.id}:${iso(at)}`, start: at, end: at + BigInt(w.durationMs) * 1000000n };
    else return undefined;
  }
  active.set(w.id, current);
  return current;
}
function iso(at: bigint) {
  return isoFromEpochMs(Number(at / 1000000n), Number(at % 1000000n));
}
export function routeEligibility(
  route: ExecutableRules["routes"][number],
  b: BoundResource,
): ExecutionReason | undefined {
  for (const r of route.requirements)
    if (b.facts[r.id] !== "true")
      return reason(
        b.facts[r.id] === "false" ? "eligibility_false" : "eligibility_unknown",
        r.id,
        r.claimRefs,
      );
  return undefined;
}
export function quoteRoute(
  rules: ExecutableRules,
  route: ExecutableRules["routes"][number],
  event: TextUsageEventV1,
  chronology: BoundExecutionScenario["chronology"],
): {
  cash: Amount;
  debits: { id: string; poolId: string; meterId: string; amount: Amount; claimRefs: string[] }[];
  reason?: ExecutionReason;
} {
  const result: ReturnType<typeof quoteRoute> = { cash: ZERO, debits: [] };
  const rate = (id: string) => {
    const pricing = rules.rates.find((r) => r.id === id);
    if (chronology !== "request" && pricing?.tiers?.some((t) => "utcWindows" in t.when))
      return undefined;
    const outcome = moneyUnitsForUsage(event.usage, pricing, {
      atMs: Date.parse(event.occurredAt),
    });
    return outcome.known ? outcome.units : undefined;
  };
  if (route.cash) {
    const value = rate(route.cash.rateId);
    if (!value) return { ...result, reason: reason("price_unknown", route.cash.rateId) };
    result.cash = value.mul(route.cash.factor);
  }
  for (const id of route.debitIds) {
    const d = rules.debits.find((d) => d.id === id);
    if (!d) return { ...result, reason: reason("invalid_contract", id) };
    let value: Amount | undefined;
    if (d.operation.kind === "constant") value = new Decimal(d.operation.amount);
    else if (d.operation.kind === "rate") value = rate(d.operation.rateId)?.mul(d.operation.factor);
    else {
      const usage = tokenAccountingOf(event.usage);
      if (usage.known)
        value = d.operation.coefficients.reduce(
          (sum, term) => sum.add(new Decimal(usage.buckets[term.category]).mul(term.coefficient)),
          ZERO,
        );
    }
    if (!value) return { ...result, reason: reason("unknown_debit", id, d.claimRefs) };
    result.debits.push({
      id,
      poolId: d.poolId,
      meterId: d.meterId,
      amount: value,
      claimRefs: d.claimRefs,
    });
  }
  return result;
}
/** Atomic offer replay. Initial observations never create calls, receipts, or money. */
export function replayCompiledResource(
  resource: CompiledResource,
  scenario: BoundExecutionScenario,
  offers: Iterable<{ event: TextUsageEventV1; modelId: string; routeId: string; at: bigint }>,
  receipts = true,
): CompiledReplay {
  const ready = resourceReadiness(resource, scenario);
  const output: CompiledReplay = {
    ...ready,
    records: 0,
    accepted: 0,
    variableUsd: "0",
    capacity: [],
    debits: [],
    cash: [],
  };
  if (ready.status !== "feasible" || resource.artifact.computation.kind !== "executable")
    return output;
  const rules = resource.artifact.computation;
  if (resource.artifact.purchase.kind === "subscription" && scenario.chronology !== "request")
    return {
      ...output,
      status: "not_computable",
      reasons: [reason("insufficient_chronology", resource.binding.id)],
    };
  const active = new Map<string, Bounds>();
  const windowCounts = new Map<string, number>();
  const counters = new Map<
    string,
    { witness: CapacityWitness; accepted: Amount; initial: Amount }
  >();
  const debitTotals = new Map<string, DebitReceipt>();
  const cashTotals = new Map<string, CashReceipt>();
  const initial = scenario.initial.observations.filter(
    (o) => o.resourceInstanceId === resource.binding.id,
  );
  let cash = ZERO;
  const periodStart = ns(scenario.period.start),
    periodEnd = ns(scenario.period.end);
  let previous: { at: bigint; id: string } | undefined;
  for (const { event, modelId, routeId, at } of offers) {
    if (
      at < periodStart ||
      at >= periodEnd ||
      (previous && (at < previous.at || (at === previous.at && event.id <= previous.id)))
    )
      return {
        ...output,
        status: "not_computable",
        reasons: [reason("invalid_contract", "offer_order_or_scope")],
      };
    previous = { at, id: event.id };
    output.records++;
    const route = rules.routes.find((r) => r.id === routeId && r.models.includes(modelId));
    if (!route) {
      output.status = "infeasible";
      output.reasons = [reason("unsupported_model", modelId)];
      continue;
    }
    const eligibility = routeEligibility(route, resource.binding);
    if (eligibility)
      return {
        ...output,
        status: eligibility.code === "eligibility_false" ? "unavailable" : "not_computable",
        reasons: [eligibility],
      };
    const quote = quoteRoute(rules, route, event, scenario.chronology);
    if (quote.reason) return { ...output, status: "not_computable", reasons: [quote.reason] };
    // Activate shared groups on offers, including rejected offers; subsets do not own anchors.
    for (const w of rules.windows)
      if (w.kind === "first_use_anchored" && w.activationModels.includes(modelId))
        windowAt(w, resource.binding, at, active, true);
    const pending: {
      counter: { witness: CapacityWitness; accepted: Amount; initial: Amount };
      debit: Amount;
      exceed: string;
    }[] = [];
    for (const debit of quote.debits)
      for (const constraint of rules.constraints) {
        if (
          constraint.poolId !== debit.poolId ||
          (constraint.models && !constraint.models.includes(modelId))
        )
          continue;
        const definition = rules.windows.find((w) => w.id === constraint.windowId);
        const window = definition && windowAt(definition, resource.binding, at, active);
        if (!window)
          return {
            ...output,
            status: "not_computable",
            reasons: [reason("reset_unknown", constraint.windowId)],
          };
        const key = JSON.stringify([constraint.id, window.id]);
        let counter = counters.get(key);
        if (!counter) {
          const count = (windowCounts.get(constraint.id) ?? 0) + 1;
          if (count > 64)
            return {
              ...output,
              status: "not_computable",
              reasons: [reason("scope_limit", "window_instance_count")],
            };
          windowCounts.set(constraint.id, count);
          const observation = initial.find(
            (o) => o.constraintId === constraint.id && o.window.id === window.id,
          );
          if (!observation && window.start < periodStart && scenario.initial.unlisted !== "fresh")
            return {
              ...output,
              status: "not_computable",
              reasons: [reason("initial_state_unknown", constraint.id)],
            };
          const witness: CapacityWitness = {
            resourceInstanceId: resource.binding.id,
            artifactHash: resource.artifact.artifactHash,
            poolId: debit.poolId,
            constraintId: constraint.id,
            meterId: debit.meterId,
            window: { id: window.id, start: iso(window.start), end: iso(window.end) },
            initial: observation?.consumedUnits ?? "0",
            accepted: "0",
            ceiling: constraint.amount,
            latched: observation?.latched ?? false,
            observationRefs: observation
              ? [observation.observationRef]
              : [scenario.initial.assumptionRef],
            claimRefs: constraint.claimRefs,
            crossings: 0,
          };
          counter = { witness, initial: new Decimal(witness.initial), accepted: ZERO };
          counters.set(key, counter);
        }
        pending.push({ counter, debit: debit.amount, exceed: constraint.exceed });
      }
    const blocked = pending.filter(
      ({ counter, debit }) =>
        counter.witness.latched ||
        counter.initial.add(counter.accepted).add(debit).gt(counter.witness.ceiling),
    );
    if (blocked.length) {
      output.status = "infeasible";
      for (const { counter, debit, exceed } of blocked) {
        counter.witness.crossings++;
        counter.witness.firstCrossing ??= {
          eventId: event.id,
          occurredAt: event.occurredAt,
          attemptedDebit: toUnitString(debit),
        };
        if (exceed === "latch_until_reset") counter.witness.latched = true;
      }
      output.reasons = [
        ...new Map(
          [
            ...output.reasons,
            ...blocked.map((p) =>
              reason(
                "capacity_exhausted",
                p.counter.witness.constraintId,
                p.counter.witness.claimRefs,
              ),
            ),
          ].map((r) => [r.subject, r]),
        ).values(),
      ];
      continue;
    }
    for (const { counter, debit } of pending) counter.accepted = counter.accepted.add(debit);
    output.accepted++;
    cash = cash.add(quote.cash);
    if (!receipts) continue;
    for (const d of quote.debits) {
      let line = debitTotals.get(d.id);
      if (!line) {
        line = {
          resourceInstanceId: resource.binding.id,
          poolId: d.poolId,
          meterId: d.meterId,
          debitId: d.id,
          components: [],
          units: "0",
          records: 0,
          claimRefs: d.claimRefs,
        };
        debitTotals.set(d.id, line);
      }
      line.units = toUnitString(new Decimal(line.units).add(d.amount));
      line.records++;
      const operation = rules.debits.find((rule) => rule.id === d.id)?.operation;
      const addComponent = (
        category: string,
        quantity: number,
        rate: string,
        divisor: "1" | "1000000",
        factor: string,
      ) => {
        let component = line.components.find(
          (c) =>
            c.category === category &&
            c.rate === rate &&
            c.factor === factor &&
            c.divisor === divisor,
        );
        if (!component) {
          component = { category, quantity: "0", rate, divisor, factor, units: "0" };
          line.components.push(component);
        }
        component.quantity = toUnitString(new Decimal(component.quantity).add(quantity));
        component.units = toUnitString(
          new Decimal(component.quantity).mul(rate).div(divisor).mul(factor),
        );
      };
      if (operation?.kind === "constant") addComponent("records", 1, operation.amount, "1", "1");
      else if (operation?.kind === "tokens") {
        const usage = tokenAccountingOf(event.usage);
        if (usage.known)
          for (const term of operation.coefficients)
            addComponent(term.category, usage.buckets[term.category], term.coefficient, "1", "1");
      } else if (operation?.kind === "rate") {
        const pricing = rules.rates.find((r) => r.id === operation.rateId);
        for (const part of moneyUnitsForUsage(
          event.usage,
          pricing,
          { atMs: Date.parse(event.occurredAt) },
          { parts: true },
        ).parts ?? [])
          addComponent(
            part.category,
            part.tokens,
            part.ratePerMillion,
            "1000000",
            operation.factor,
          );
      }
    }
    if (route.cash) {
      const pricing = rules.rates.find((r) => r.id === route.cash?.rateId);
      const parts =
        moneyUnitsForUsage(
          event.usage,
          pricing,
          { atMs: Date.parse(event.occurredAt) },
          { parts: true },
        ).parts ?? [];
      for (const part of parts) {
        const key = JSON.stringify([
          route.id,
          route.cash.rateId,
          part.category,
          part.ratePerMillion,
          route.cash.factor,
        ]);
        let line = cashTotals.get(key);
        if (!line) {
          line = {
            resourceInstanceId: resource.binding.id,
            routeId: route.id,
            rateId: route.cash.rateId,
            category: part.category,
            ratePerMillion: part.ratePerMillion,
            factor: route.cash.factor,
            tokens: "0",
            usd: "0",
            records: 0,
            claimRefs: pricing?.claimRefs ?? [],
          };
          cashTotals.set(key, line);
        }
        line.tokens = toUnitString(new Decimal(line.tokens).add(part.tokens));
        line.records++;
        line.usd = toUnitString(
          new Decimal(line.tokens).mul(line.ratePerMillion).div(1000000).mul(line.factor),
        );
      }
    }
  }
  output.variableUsd = toUnitString(cash);
  output.capacity = [...counters.values()].map((c) => ({
    ...c.witness,
    accepted: toUnitString(c.accepted),
  }));
  output.debits = [...debitTotals.values()];
  if (
    receipts &&
    output.debits.some(
      (line) =>
        !new Decimal(line.units).eq(line.components.reduce((sum, c) => sum.add(c.units), ZERO)),
    )
  )
    throw new Error("Compiled debit receipt mismatch");
  output.cash = [...cashTotals.values()];
  if (receipts && !cash.eq(output.cash.reduce((sum, line) => sum.add(line.usd), ZERO)))
    throw new Error("Compiled monetary receipt mismatch");
  return output;
}
