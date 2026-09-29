import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { stableStringify } from "@stackreplay/catalog";
import {
  type BoundExecutionResourceV2,
  type BoundExecutionScenarioV2,
  type BoundWindowInstance,
  boundExecutionScenarioV2Schema,
  type CompiledExecutionPlanV2,
  compiledExecutionPlanV2Schema,
  type ExecutionObservation,
} from "@stackreplay/schema";
import { Decimal } from "./money.js";
import { calendarBucketBoundsMs, isoFromEpochMs, parseInstant } from "./time.js";

/** Calendar months preserve wall-clock time, constraining the day to the target month. */
export function purchaseCycleEnd(
  term: "month" | "28_days",
  start: string,
  billingTimezone?: string,
): string {
  const instant = parseInstant(start);
  if (term === "28_days") return instant.add({ hours: 28 * 24 }).toString();
  if (!billingTimezone || /^[+-]/.test(billingTimezone))
    throw new Error("A monthly purchase requires an explicit IANA billing timezone");
  return (
    instant
      .toZonedDateTimeISO(billingTimezone)
      .toPlainDateTime()
      .add({ months: 1 }, { overflow: "constrain" })
      // Do not invent an account's policy for a nonexistent or ambiguous reset time.
      .toZonedDateTime(billingTimezone, { disambiguation: "reject" })
      .toInstant()
      .toString()
  );
}

/** Same canonical JSON convention as catalog; synchronous, pure and browser-safe. */
export function executionContentHash(value: unknown): string {
  return `sha256:${bytesToHex(sha256(utf8ToBytes(stableStringify(value))))}`;
}
export function hashBoundExecutionScenario(scenario: BoundExecutionScenarioV2): string {
  const { scenarioHash: _hash, ...facts } = boundExecutionScenarioV2Schema.parse(scenario);
  return executionContentHash(facts);
}

/** No workload/events parameter: this allocation is bounded by schedules, never event count. */
export function materializeFixedPartitions(
  artifact: CompiledExecutionPlanV2,
  binding: Omit<BoundExecutionResourceV2, "windowInstances">,
): BoundWindowInstance[] {
  artifact = compiledExecutionPlanV2Schema.parse(artifact);
  if (binding.artifactHash !== artifact.artifactHash) throw new Error("Artifact binding mismatch");
  if (artifact.computation.kind !== "executable") return [];
  const result: BoundWindowInstance[] = [];
  for (const window of artifact.computation.windows) {
    if (window.kind !== "fixed_partition") continue;
    const anchor = binding.windowAnchors[window.anchorRequirementId];
    if (!binding.cycle || !anchor) throw new Error("Missing partition anchor or parent cycle");
    let start = parseInstant(anchor);
    for (let index = 0; index < window.count; index++) {
      const end = start.add({ milliseconds: window.durationMs });
      const interval = { start: start.toString(), end: end.toString() };
      if (
        start.epochNanoseconds < parseInstant(binding.cycle.start).epochNanoseconds ||
        end.epochNanoseconds > parseInstant(binding.cycle.end).epochNanoseconds
      )
        throw new Error("Partition lies outside its purchase cycle");
      result.push({
        windowDefinitionId: window.id,
        windowInstanceId: executionContentHash([
          binding.id,
          artifact.artifactHash,
          binding.cycle.id,
          window.id,
          interval.start,
          interval.end,
        ]),
        ...interval,
      });
      start = end;
    }
    if (
      window.coverage === "purchase_cycle" &&
      (parseInstant(anchor).epochNanoseconds !==
        parseInstant(binding.cycle.start).epochNanoseconds ||
        start.epochNanoseconds !== parseInstant(binding.cycle.end).epochNanoseconds)
    )
      throw new Error("Partitions do not exactly cover the purchase cycle");
  }
  return result;
}
export type ExecutionScenarioDraftV2 = Omit<
  BoundExecutionScenarioV2,
  "scenarioHash" | "resources"
> & {
  resources: Omit<BoundExecutionResourceV2, "windowInstances">[];
};

/** Local observations are counter readings, never catalog claims or synthetic calls. */
export function reconcileInitialObservations(
  artifacts: readonly CompiledExecutionPlanV2[],
  scenario: BoundExecutionScenarioV2,
): ExecutionObservation[] {
  const resources = new Map(scenario.resources.map((r) => [r.id, r]));
  const plans = new Map(artifacts.map((p) => [p.artifactHash, p]));
  const evidence = new Map(scenario.observationEvidence.map((e) => [e.id, e]));
  if (!evidence.has(scenario.initial.assumptionRef))
    throw new Error("Missing local initial-state assumption evidence");
  if (
    scenario.initial.unlisted === "fresh" &&
    evidence.get(scenario.initial.assumptionRef)?.kind !== "assumption"
  )
    throw new Error("Fresh starting state requires explicit local assumption evidence");
  const catalogClaims = new Set(artifacts.flatMap((p) => p.claims.map((c) => c.id)));
  if (scenario.observationEvidence.some((e) => catalogClaims.has(e.id)))
    throw new Error("Catalog claims and local observations require separate evidence identities");
  const seen = new Map<string, ExecutionObservation>();
  for (const o of scenario.initial.observations) {
    const resource = resources.get(o.resourceInstanceId);
    const plan = plans.get(o.artifactHash);
    const rules = plan?.computation;
    if (
      !resource ||
      resource.artifactHash !== o.artifactHash ||
      !plan ||
      rules?.kind !== "executable"
    )
      throw new Error("Observation resource or artifact mismatch");
    const constraint = rules.constraints.find(
      (c) => c.id === o.constraintId && c.poolId === o.poolId,
    );
    const window = rules.windows.find((w) => w.id === constraint?.windowId);
    const at = parseInstant(scenario.period.start).epochNanoseconds;
    if (
      !constraint ||
      !window ||
      !evidence.has(o.observationRef) ||
      parseInstant(o.asOf).epochNanoseconds !== at ||
      parseInstant(o.window.start).epochNanoseconds > at ||
      parseInstant(o.window.end).epochNanoseconds <= at ||
      new Decimal(o.consumedUnits).gt(constraint.amount) ||
      (o.latched && constraint.exceed !== "latch_until_reset")
    )
      throw new Error("Invalid local initial observation");
    let expected: { id: string; start: string; end: string } | undefined;
    if (window.kind === "fixed_partition") {
      const bound = resource.windowInstances.find(
        (i) => i.windowDefinitionId === window.id && i.windowInstanceId === o.window.id,
      );
      if (bound) expected = { id: bound.windowInstanceId, start: bound.start, end: bound.end };
    } else if (window.kind === "first_use_anchored") {
      const bound = resource.firstUse[window.id];
      if (bound && bound !== "inactive") expected = bound;
    } else {
      const bounds = calendarBucketBoundsMs(
        Date.parse(scenario.period.start),
        window.unit,
        window.timezone,
      );
      const start = isoFromEpochMs(bounds.startMs),
        end = isoFromEpochMs(bounds.endMs);
      expected = { id: `${window.id}:${start}`, start, end };
    }
    if (
      !expected ||
      expected.id !== o.window.id ||
      parseInstant(expected.start).epochNanoseconds !==
        parseInstant(o.window.start).epochNanoseconds ||
      parseInstant(expected.end).epochNanoseconds !== parseInstant(o.window.end).epochNanoseconds
    )
      throw new Error("Observation targets a different window instance");
    const key = stableStringify([
      o.resourceInstanceId,
      o.artifactHash,
      o.poolId,
      o.constraintId,
      o.window.id,
    ]);
    const previous = seen.get(key);
    if (previous && stableStringify(previous) !== stableStringify(o))
      throw new Error("Conflicting local observations");
    seen.set(key, o);
  }
  const rows = [...seen.values()].sort((a, b) => {
    const left = stableStringify([a.resourceInstanceId, a.poolId, a.constraintId, a.window.id]);
    const right = stableStringify([b.resourceInstanceId, b.poolId, b.constraintId, b.window.id]);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  for (const o of rows) {
    const plan = plans.get(o.artifactHash);
    if (!plan) throw new Error("Observation artifact disappeared during reconciliation");
    if (plan.computation.kind !== "executable") continue;
    const subset = plan.computation.constraints.find((c) => c.id === o.constraintId);
    if (!subset?.models) continue;
    const shared = rows.find(
      (other) =>
        other.resourceInstanceId === o.resourceInstanceId &&
        other.poolId === o.poolId &&
        other.window.start === o.window.start &&
        other.window.end === o.window.end &&
        plan.computation.kind === "executable" &&
        plan.computation.constraints.some((c) => c.id === other.constraintId && !c.models),
    );
    if (shared && new Decimal(o.consumedUnits).gt(shared.consumedUnits))
      throw new Error("Subset observation exceeds shared counter");
  }
  return rows;
}
/** Bind local facts without changing or rehashing any immutable catalog artifact. */
export function bindExecutionScenario(
  artifacts: readonly CompiledExecutionPlanV2[],
  draft: ExecutionScenarioDraftV2,
): BoundExecutionScenarioV2 {
  const checked = boundExecutionScenarioV2Schema.parse({
    ...draft,
    scenarioHash: "pending",
    resources: draft.resources.map((binding) => ({ ...binding, windowInstances: [] })),
  });
  const plans = artifacts.map((p) => compiledExecutionPlanV2Schema.parse(p));
  if (new Set(checked.resources.map((r) => r.id)).size !== checked.resources.length)
    throw new Error("Duplicate local resource instance ID");
  const scenario = boundExecutionScenarioV2Schema.parse({
    ...checked,
    scenarioHash: "pending",
    resources: checked.resources.map((binding) => {
      const artifact = plans.find((p) => p.artifactHash === binding.artifactHash);
      if (!artifact) throw new Error("Missing pinned artifact");
      if (artifact.purchase.kind === "subscription") {
        const term = artifact.purchase.term;
        if (term !== "month" && term !== "28_days") throw new Error("Unsupported purchase term");
        if (
          !binding.cycle ||
          parseInstant(purchaseCycleEnd(term, binding.cycle.start, binding.billingTimezone))
            .epochNanoseconds !== parseInstant(binding.cycle.end).epochNanoseconds
        )
          throw new Error("Invalid purchase cycle");
        if (
          parseInstant(binding.cycle.start).epochNanoseconds >
            parseInstant(draft.period.start).epochNanoseconds ||
          parseInstant(binding.cycle.end).epochNanoseconds <
            parseInstant(draft.period.end).epochNanoseconds
        )
          throw new Error("Observation period crosses the purchased cycle");
      } else if (binding.cycle) {
        throw new Error("Independent API resource cannot bind a purchase cycle");
      }
      const required = [
        ...artifact.requirements,
        ...(artifact.computation.kind === "executable"
          ? artifact.computation.routes.flatMap((route) => route.requirements)
          : []),
      ];
      const facts = Object.fromEntries(
        [...new Set([...Object.keys(binding.facts), ...required.map((r) => r.id)])]
          .sort()
          .map((id) => [id, binding.facts[id] ?? "unknown"]),
      );
      return { ...binding, facts, windowInstances: materializeFixedPartitions(artifact, binding) };
    }),
  });
  scenario.initial.observations = reconcileInitialObservations(plans, scenario);
  scenario.scenarioHash = hashBoundExecutionScenario(scenario);
  return scenario;
}
