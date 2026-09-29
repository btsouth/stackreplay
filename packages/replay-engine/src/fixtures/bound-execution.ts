/** Synthetic v2 bindings only; not accepted provider/catalog data. */
import { type CompiledExecutionPlanV2, compiledExecutionPlanV2Schema } from "@stackreplay/schema";
import {
  bindExecutionScenario,
  executionContentHash,
  purchaseCycleEnd,
} from "../execution-binding.js";
import { compiledScenario, syntheticPlan } from "./compiled-execution.js";

export function partitionPlan(): CompiledExecutionPlanV2 {
  const legacy = syntheticPlan("slices", "2");
  const plan = compiledExecutionPlanV2Schema.parse({
    ...legacy,
    contractVersion: 2,
    validity: { start: "2026-01-01T00:00:00Z", end: "2029-01-01T00:00:00Z", basis: "effective" },
    purchase: { ...legacy.purchase, term: "28_days" },
    computation: {
      ...legacy.computation,
      windows: [
        {
          id: "monthly",
          kind: "fixed_partition",
          durationMs: 7 * 86400000,
          count: 4,
          parent: "purchase_cycle",
          coverage: "purchase_cycle",
          carry: "none",
          anchorRequirementId: "reset",
          claimRefs: ["claim"],
        },
      ],
    },
  });
  return pinPlan(plan);
}
export function pinPlan(plan: CompiledExecutionPlanV2): CompiledExecutionPlanV2 {
  const { artifactHash: _old, ...content } = plan;
  return { ...plan, artifactHash: executionContentHash(content) };
}
export function boundFixture(
  plan = partitionPlan(),
  start = "2026-09-03T10:00:00Z",
  billingTimezone = "UTC",
  resourceId = "account",
) {
  const legacy = compiledScenario(0);
  const term =
    plan.purchase.kind === "subscription" && plan.purchase.term === "month" ? "month" : "28_days";
  const end = purchaseCycleEnd(term, start, billingTimezone);
  const scenario = bindExecutionScenario([plan], {
    ...legacy.scenario,
    version: 2,
    period: { start, end },
    resources: [
      {
        id: resourceId,
        artifactHash: plan.artifactHash,
        cycle: { id: "purchase", start, end },
        billingTimezone,
        windowAnchors: { reset: start },
        firstUse: {},
        facts: {},
        sharedCapacityIds: [],
      },
    ],
  });
  return { ...legacy, contract: "compiled-v2" as const, artifacts: [plan], scenario };
}
