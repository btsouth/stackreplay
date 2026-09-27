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
} from "@stackreplay/schema";
import { parseInstant } from "./time.js";

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
      }
      return { ...binding, windowInstances: materializeFixedPartitions(artifact, binding) };
    }),
  });
  scenario.scenarioHash = hashBoundExecutionScenario(scenario);
  return scenario;
}
