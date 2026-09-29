import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { compileExecutionPlan } from "@stackreplay/catalog/execution";
import { describe, expect, it } from "vitest";
import { buildDemoExport } from "../../test-fixtures/src/demo-workload.js";
import { optimizeCompiledExactModels } from "./compiled-optimizer.js";
import { bindExecutionScenario } from "./execution-binding.js";
import { request } from "./fixtures/exact-optimizer.js";

const rulesAt = "2026-09-27T17:39:00Z";
const c2a = [
  "anthropic-api-haiku-4-5",
  "openai-api-gpt-5-4-mini",
  "z-ai-api-glm-5-3-flash",
  "anthropic-claude-max-5x",
  "kiro-pro",
];
const c2b = [
  "anthropic-api-sonnet-5",
  "openai-api-gpt-6-sol",
  "anthropic-claude-pro",
  "anthropic-claude-max-20x",
  "openai-chatgpt-plus",
  "command-code-goat",
  "openai-chatgpt-pro",
  "ollama-cloud-pro",
  "cursor-pro",
  "github-copilot-pro",
];
const catalog = loadBundledCatalog();
const marketIds = [
  ...c2a.slice(0, 3),
  ...c2b.slice(0, 2),
  "anthropic-claude-max-5x",
  "openai-chatgpt-plus",
  "command-code-goat",
  "ollama-cloud-pro",
  "cursor-pro",
  "github-copilot-pro",
];
const plans = marketIds.map(
  (id) => compileExecutionPlan(catalog, id, `${id}-current-20260927`, [], rulesAt).artifact,
);

function scenario(period: { start: string; end: string }, artifacts = plans) {
  return bindExecutionScenario(artifacts, {
    version: 2,
    rulesAt,
    period,
    resources: artifacts.map((plan) => ({
      id: plan.planId,
      artifactHash: plan.artifactHash,
      ...(plan.purchase.kind === "subscription"
        ? {
            cycle: { id: "september", start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" },
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
    initial: { unlisted: "fresh", observations: [], assumptionRef: "c2b-local-fresh" },
    observationEvidence: [
      { id: "c2b-local-fresh", hash: "c2b-synthetic-fresh", kind: "assumption" },
    ],
    chronology: "request",
    maxSubscriptions: 2,
    maxAssignmentStates: 10000,
  });
}

describe("C2B real catalog execution", () => {
  it("prices exact standard API routes and keeps known subscription access unsupplied", () => {
    const events = [
      request("sonnet", 100_000, "claude-sonnet-5", "2026-09-27T17:45:00Z"),
      request("sol-short", 100_000, "gpt-6-sol", "2026-09-27T17:46:00Z"),
      request("sol-long", 300_000, "gpt-6-sol", "2026-09-27T17:47:00Z"),
    ];
    const result = optimizeCompiledExactModels({
      contract: "compiled-v2",
      catalog,
      artifacts: plans,
      scenario: scenario({ start: "2026-09-27T17:40:00Z", end: "2026-09-27T18:00:00Z" }),
      events,
    });
    expect(result.scope).toMatchObject({ recorded: 3, required: 3, excluded: 0 });
    expect(result.candidates.find((candidate) => candidate.id === "api")).toMatchObject({
      status: "feasible",
      variableUsd: "1.6",
      modeled: 3,
    });
    expect(result.explanation?.receipts.map((receipt) => receipt.variableUsd)).toEqual([
      "0.2",
      "1.4",
    ]);
    for (const id of [
      "openai-chatgpt-plus",
      "command-code-goat",
      "ollama-cloud-pro",
      "cursor-pro",
      "github-copilot-pro",
    ]) {
      const artifact = result.artifacts.find((entry) => entry.planId === id);
      expect(plans.find((entry) => entry.planId === id)?.computation.kind).toBe("not_computable");
      expect(artifact?.knownAccess?.length ?? 0).toBeGreaterThan(0);
      expect(result.candidates.find((candidate) => candidate.id === id)?.status).toBe(
        "not_computable",
      );
      expect(
        result.explanation?.assignments.some((assignment) => assignment.resourceInstanceId === id),
      ).toBe(false);
    }
  });

  it("preserves the full synthetic workload in a current-market counterfactual", () => {
    const events = buildDemoExport("moderate").events;
    const modelCounts = Object.fromEntries(
      [...new Set(events.map((event) => event.model.canonicalId))].map((model) => [
        model,
        events.filter((event) => event.model.canonicalId === model).length,
      ]),
    );
    const result = optimizeCompiledExactModels({
      contract: "compiled-v2",
      catalog,
      artifacts: plans,
      scenario: scenario({ start: "2026-09-13T00:00:00Z", end: "2026-09-21T00:00:00Z" }),
      events,
    });
    expect(modelCounts).toEqual({
      "claude-haiku-4-5": 249,
      "claude-sonnet-5": 285,
      "gpt-5-6-sol": 261,
      "gpt-6-sol": 105,
    });
    expect(result.candidates.find((candidate) => candidate.id === "api")).toMatchObject({
      status: "not_computable",
      modeled: 0,
      required: 900,
    });
    expect(result.search.candidateCount).toBe(43);
    expect(result.candidates.every((candidate) => candidate.status === "not_computable")).toBe(
      true,
    );
    expect(result.explanation).toBeUndefined();
    expect(events).toHaveLength(900);
    expect(result.scope).toMatchObject({ recorded: 900, required: 900, excluded: 0 });
    expect(result.artifacts).toHaveLength(11);
  });

  it("preserves the other admitted opaque plans in a separate bounded explanation", () => {
    const ids = [
      "anthropic-claude-pro",
      "anthropic-claude-max-20x",
      "openai-chatgpt-pro",
      "kiro-pro",
    ];
    const artifacts = ["anthropic-api-haiku-4-5", ...ids].map(
      (id) => compileExecutionPlan(catalog, id, `${id}-current-20260927`, [], rulesAt).artifact,
    );
    const result = optimizeCompiledExactModels({
      contract: "compiled-v2",
      catalog,
      artifacts,
      scenario: scenario({ start: "2026-09-27T17:40:00Z", end: "2026-09-27T18:00:00Z" }, artifacts),
      events: [request("haiku", 100_000, "claude-haiku-4-5", "2026-09-27T17:45:00Z")],
    });
    for (const id of ids) {
      expect(result.candidates.find((candidate) => candidate.id === id)?.status).toBe(
        "not_computable",
      );
      expect(
        result.artifacts.find((artifact) => artifact.planId === id)?.knownAccess?.length ?? 0,
      ).toBeGreaterThan(0);
    }
    expect(result.explanation?.assignments).toHaveLength(1);
    expect(result.explanation?.assignments[0]?.resourceInstanceId).toBe("anthropic-api-haiku-4-5");
  });
});
