// biome-ignore-all lint/style/noNonNullAssertion: fixture construction guarantees array entries.
import type { CompiledExecutionPlan, CompiledExecutionPlanV1 } from "@stackreplay/schema";
import type { CompiledOptimizationInput } from "../compiled-optimizer.js";
import { request, scenario } from "./exact-optimizer.js";
export const start = "2026-09-01T00:00:00Z",
  end = "2026-10-01T00:00:00Z";
export const models = ["fixture-small", "fixture-medium"];
export function syntheticPlan(
  id = "plan",
  amount = "100",
  price = "20",
): CompiledExecutionPlanV1 & {
  computation: Extract<CompiledExecutionPlanV1["computation"], { kind: "executable" }>;
} {
  return {
    contractVersion: 1,
    artifactHash: `synthetic:${id}:v1`,
    catalogHash: "synthetic-catalog-v1",
    compilerVersion: "synthetic-compiler-v1",
    planId: id,
    planVersionId: `${id}-v1`,
    appliedOverlayIds: [],
    validity: { start, end, basis: "effective" },
    purchase: { kind: "subscription", term: "month", fixedUsd: price, claimRefs: ["claim"] },
    requirements: [],
    computation: {
      kind: "executable",
      rates: [
        {
          id: "rate",
          denomination: "USD",
          rates: {
            input: "1",
            output: "2",
            cacheRead: "0.1",
            cacheWrite: "1.25",
            reasoning: { billedAs: "output" },
          },
          claimRefs: ["claim"],
        },
      ],
      meters: [{ id: "requests", kind: "request" }],
      pools: [{ id: "included", meterId: "requests" }],
      debits: [
        {
          id: "debit",
          poolId: "included",
          meterId: "requests",
          operation: { kind: "constant", amount: "1" },
          claimRefs: ["claim"],
        },
      ],
      windows: [{ id: "monthly", kind: "calendar", unit: "month", timezone: "UTC" }],
      constraints: [
        {
          id: "cap",
          poolId: "included",
          windowId: "monthly",
          amount,
          exceed: "reject_request",
          claimRefs: ["claim"],
        },
      ],
      routes: [
        {
          id: "included-route",
          models,
          debitIds: ["debit"],
          requirements: [],
          claimRefs: ["claim"],
        },
      ],
      continuation: "independent_api_fallback",
    },
    claims: [
      {
        id: "claim",
        evidencePackageHash: "synthetic-evidence",
        certainty: "synthetic",
        operationIds: ["cap", "debit", "rate"],
      },
    ],
  };
}
export function syntheticApi(
  id = "api",
  price = "1",
): CompiledExecutionPlanV1 & {
  computation: Extract<CompiledExecutionPlanV1["computation"], { kind: "executable" }>;
} {
  const plan = syntheticPlan(id);
  plan.purchase = { kind: "api" };
  plan.computation.pools = [];
  plan.computation.constraints = [];
  plan.computation.windows = [];
  plan.computation.debits = [];
  plan.computation.meters = [];
  plan.computation.rates[0]!.rates.input = price;
  plan.computation.routes = [
    {
      id: `${id}-route`,
      models,
      debitIds: [],
      cash: { rateId: "rate", factor: "1" },
      requirements: [],
      claimRefs: ["claim"],
    },
  ];
  return plan;
}
export function compiledScenario(
  count = 2,
  plans: CompiledExecutionPlan[] = [syntheticPlan(), syntheticApi()],
): CompiledOptimizationInput {
  return {
    contract: "compiled-v1",
    events: Array.from({ length: count }, (_, i) =>
      request(
        `e${i}`,
        1000000,
        models[i % 2],
        new Date(Date.parse(start) + i * 1000).toISOString(),
      ),
    ),
    catalog: scenario([]).catalog,
    artifacts: plans,
    scenario: {
      version: 1,
      scenarioHash: "synthetic-scenario-v1",
      rulesAt: start,
      period: { start, end },
      resources: plans.map((p) => ({
        id: p.planId,
        artifactHash: p.artifactHash,
        ...(p.purchase.kind === "subscription" ? { cycle: { id: "cycle", start, end } } : {}),
        sharedCapacityIds: [],
        facts: {},
        firstUse: {},
      })),
      initial: { unlisted: "fresh", observations: [], assumptionRef: "fresh" },
      observationEvidence: [{ id: "fresh", hash: "synthetic-user-evidence", kind: "assumption" }],
      chronology: "request",
      maxSubscriptions: 2,
      maxAssignmentStates: 10000,
    },
  };
}
export function multiConstraintPlan(): ReturnType<typeof syntheticPlan> {
  const p = syntheticPlan("multi", "70");
  p.computation.meters = [{ id: "value", kind: "usd_usage_value" }];
  p.computation.pools[0]!.meterId = "value";
  p.computation.debits[0]!.meterId = "value";
  p.computation.debits[0]!.operation = { kind: "rate", rateId: "rate", factor: "1" };
  p.computation.windows.push(
    { id: "weekly", kind: "calendar", unit: "week", timezone: "UTC" },
    {
      id: "session",
      kind: "first_use_anchored",
      durationMs: 18000000,
      activationModels: models,
      trigger: "first_eligible_offer",
    },
  );
  p.computation.constraints.push(
    { ...p.computation.constraints[0]!, id: "weekly-cap", windowId: "weekly", amount: "35" },
    { ...p.computation.constraints[0]!, id: "session-cap", windowId: "session", amount: "14" },
    { ...p.computation.constraints[0]!, id: "model-cap", amount: "20", models: [models[0]!] },
  );
  return p;
}
export function namedPoolsPlan(): ReturnType<typeof syntheticPlan> {
  const p = syntheticPlan("pools", "10");
  p.computation.pools.push({ id: "other", meterId: "requests" });
  p.computation.debits.push({ ...p.computation.debits[0]!, id: "other-debit", poolId: "other" });
  p.computation.constraints.push({
    ...p.computation.constraints[0]!,
    id: "other-cap",
    poolId: "other",
    amount: "20",
  });
  p.computation.routes = [
    { ...p.computation.routes[0]!, models: [models[0]!] },
    {
      ...p.computation.routes[0]!,
      id: "other-route",
      models: [models[1]!],
      debitIds: ["other-debit"],
    },
  ];
  return p;
}
