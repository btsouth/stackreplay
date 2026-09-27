import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { compileExecutionPlan } from "@stackreplay/catalog/execution";
import { describe, expect, it } from "vitest";
import { buildDemoExport } from "../../test-fixtures/src/demo-workload.js";
import { optimizeCompiledExactModels } from "./compiled-optimizer.js";
import { bindExecutionScenario } from "./execution-binding.js";
import { request } from "./fixtures/exact-optimizer.js";

const rulesAt = "2026-09-27T14:40:00Z";
const period = { start: "2026-09-27T14:40:00Z", end: "2026-09-27T15:00:00Z" };
const records = [
  ["anthropic-api-haiku-4-5", "claude-haiku-4-5", "1"],
  ["openai-api-gpt-5-4-mini", "gpt-5-4-mini", "0.75"],
  ["z-ai-api-glm-5-3-flash", "glm-5-3-flash", "0.15"],
] as const;

describe("C2A current real catalog pilot", () => {
  const catalog = loadBundledCatalog();
  const plans = [
    ...records.map(
      ([id]) => compileExecutionPlan(catalog, id, `${id}-current-20260927`, [], rulesAt).artifact,
    ),
    ...["anthropic-claude-max-5x", "kiro-pro"].map(
      (id) => compileExecutionPlan(catalog, id, `${id}-current-20260927`, [], rulesAt).artifact,
    ),
  ];

  it("pins each route to an independently valid exact rate and repeats semantic hashes", () => {
    for (const [id, model, inputUsd] of records) {
      const first = compileExecutionPlan(catalog, id, `${id}-current-20260927`, [], rulesAt);
      const repeat = compileExecutionPlan(catalog, id, `${id}-current-20260927`, [], rulesAt);
      expect(first.artifact.artifactHash).toBe(repeat.artifact.artifactHash);
      expect(first.artifact.computation.kind).toBe("executable");
      expect(first.artifact.knownAccess).toMatchObject([{ models: [model] }]);
      if (first.artifact.computation.kind !== "executable")
        throw new Error("expected executable route");
      expect(first.artifact.computation.routes).toMatchObject([{ models: [model] }]);
      expect(first.artifact.computation.rates).toMatchObject([
        {
          rateVersion: "current-20260927",
          validity: { start: "2026-09-27T14:38:00.000Z", end: "2026-10-27T00:00:00Z" },
          rates: { input: inputUsd },
        },
      ]);
      expect(first.artifact.computation.rates[0]?.rates.cacheWrite).toBeUndefined();
      expect(first.artifact.computation.rates[0]?.rates.reasoning).toBeUndefined();
    }
  });

  it("quotes three exact API calls while retaining opaque subscriptions as known, unsupplied plans", () => {
    const scenario = bindExecutionScenario(plans, {
      version: 2,
      rulesAt,
      period,
      resources: plans.map((plan) => ({
        id: plan.planId,
        artifactHash: plan.artifactHash,
        ...(plan.purchase.kind === "subscription"
          ? {
              cycle: {
                id: "september",
                start: "2026-09-01T00:00:00Z",
                end: "2026-10-01T00:00:00Z",
              },
              billingTimezone: "UTC",
            }
          : {}),
        windowAnchors: {},
        firstUse: {},
        facts: Object.fromEntries(
          [
            ...plan.requirements,
            ...(plan.computation.kind === "executable"
              ? plan.computation.routes.flatMap((route) => route.requirements)
              : []),
          ].map((requirement) => [requirement.id, "true" as const]),
        ),
        sharedCapacityIds: [],
      })),
      initial: { unlisted: "fresh", observations: [], assumptionRef: "local-fresh" },
      observationEvidence: [{ id: "local-fresh", hash: "c2a-synthetic-fresh", kind: "assumption" }],
      chronology: "request",
      maxSubscriptions: 2,
      maxAssignmentStates: 10000,
    });
    const events = records.map(([, model], index) =>
      request(`c2a-${index}`, 1_000_000, model, "2026-09-27T14:45:00Z"),
    );
    const result = optimizeCompiledExactModels({
      contract: "compiled-v2",
      catalog,
      artifacts: plans,
      scenario,
      events,
    });
    expect(result.scope).toMatchObject({ recorded: 3, required: 3, excluded: 0 });
    expect(result.candidates.find((candidate) => candidate.id === "api")).toMatchObject({
      status: "feasible",
      variableUsd: "1.9",
      modeled: 3,
    });
    for (const id of ["anthropic-claude-max-5x", "kiro-pro"]) {
      expect(result.candidates.find((candidate) => candidate.id === id)?.status).toBe(
        "not_computable",
      );
      expect(result.artifacts.find((artifact) => artifact.planId === id)).toMatchObject({
        purchase: { kind: "subscription" },
        knownAccess: [{ models: ["claude-haiku-4-5", "claude-sonnet-5"] }],
      });
      expect(
        result.explanation?.assignments.some((assignment) => assignment.resourceInstanceId === id),
      ).toBe(false);
    }
    expect(result.explanation?.assignments).toHaveLength(3);
    expect(result.explanation?.receipts).toHaveLength(3);
    for (const [id, , inputUsd] of records) {
      const receipt = result.explanation?.receipts.find((item) =>
        item.cash.some((cash) => cash.resourceInstanceId === id),
      );
      expect(receipt).toMatchObject({ status: "feasible", accepted: 1, variableUsd: inputUsd });
      expect(receipt?.cash).toEqual([
        expect.objectContaining({
          resourceInstanceId: id,
          category: "input",
          tokens: "1000000",
          usd: inputUsd,
        }),
      ]);
    }
  });

  it("keeps the representative synthetic workload scope in a current-market counterfactual", () => {
    const events = buildDemoExport("moderate").events;
    const scenario = bindExecutionScenario(plans, {
      version: 2,
      rulesAt,
      period: { start: "2026-09-13T00:00:00Z", end: "2026-09-21T00:00:00Z" },
      resources: plans.map((plan) => ({
        id: plan.planId,
        artifactHash: plan.artifactHash,
        ...(plan.purchase.kind === "subscription"
          ? {
              cycle: {
                id: "september",
                start: "2026-09-01T00:00:00Z",
                end: "2026-10-01T00:00:00Z",
              },
              billingTimezone: "UTC",
            }
          : {}),
        windowAnchors: {},
        firstUse: {},
        facts: Object.fromEntries(
          [
            ...plan.requirements,
            ...(plan.computation.kind === "executable"
              ? plan.computation.routes.flatMap((route) => route.requirements)
              : []),
          ].map((requirement) => [requirement.id, "true" as const]),
        ),
        sharedCapacityIds: [],
      })),
      initial: { unlisted: "fresh", observations: [], assumptionRef: "local-fresh" },
      observationEvidence: [{ id: "local-fresh", hash: "c2a-synthetic-fresh", kind: "assumption" }],
      chronology: "request",
      maxSubscriptions: 2,
      maxAssignmentStates: 10000,
    });
    const result = optimizeCompiledExactModels({
      contract: "compiled-v2",
      catalog,
      artifacts: plans,
      scenario,
      events,
    });
    expect(result.scope.recorded).toBe(events.length);
    expect(events).toHaveLength(900);
    expect(result.scope).toMatchObject({ required: 900, excluded: 0 });
    expect(result.scope.required + result.scope.excluded).toBe(events.length);
    expect(result.artifacts).toHaveLength(5);
    expect(result.search.candidateCount).toBe(7);
    expect(
      result.artifacts.find((item) => item.planId === "anthropic-api-haiku-4-5")?.claims,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id: "rate" })]));
    expect(
      result.artifacts.find((item) => item.planId === "kiro-pro")?.nonComputableReasons,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ code: "opaque_capacity" })]));
  });
});
