import { describe, expect, it } from "vitest";
import {
  configuredMonthlyPrice,
  configuredPlans,
  configuredStackSupport,
  eligiblePlans,
  selectedPlan,
} from "./compare-decision";
import type { SourceDemand } from "./workload-profile";

const RULES = "2026-09-24";
const sources: SourceDemand[] = [
  {
    id: "claude-code",
    events: 3,
    tokens: 0,
    unresolvedEvents: 0,
    models: [{ modelId: "claude-opus-4-8", events: 3 }],
  },
  {
    id: "codex",
    events: 4,
    tokens: 0,
    unresolvedEvents: 1,
    models: [{ modelId: "gpt-5-6-sol", events: 3 }],
  },
  {
    id: "command-code",
    events: 2,
    tokens: 0,
    unresolvedEvents: 0,
    models: [{ modelId: "deepseek-v4-pro", events: 2 }],
  },
];

describe("decision-oriented comparison", () => {
  it("offers only the plan family for the selected purchase decision", () => {
    expect(eligiblePlans("claude", RULES).map((plan) => plan.id)).toEqual([
      "anthropic-claude-max-20x",
      "anthropic-claude-max-5x",
      "anthropic-claude-pro",
    ]);
    expect(
      eligiblePlans("codex", RULES)
        .map((plan) => plan.id)
        .sort(),
    ).toEqual(["openai-chatgpt-plus", "openai-chatgpt-pro", "openai-chatgpt-pro-20x"]);
    expect(selectedPlan("claude", ["plan:anthropic-claude-pro"], RULES)).toBe(
      "anthropic-claude-pro",
    );
  });

  it("counts each supported recorded call once across configured plans", () => {
    const plans = ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"] as const;
    const support = configuredStackSupport(sources, plans, RULES);
    expect(support).toMatchObject({
      calls: 9,
      supported: 6,
      unavailable: 2,
      unresolved: 1,
      tools: [
        { id: "claude-code", supported: 3 },
        { id: "codex", supported: 3, unresolved: 1 },
        { id: "command-code", unavailable: 2 },
      ],
    });
    expect(configuredStackSupport(sources, [...plans, plans[0]], RULES)).toEqual(support);
    expect(configuredStackSupport(sources, [...plans, "api:anthropic"], RULES)).toEqual(support);
  });

  it("sums monthly plan prices only when their basis matches", () => {
    const plans = configuredPlans(
      ["plan:anthropic-claude-max-20x", "plan:openai-chatgpt-pro"],
      RULES,
    );
    expect(configuredMonthlyPrice(plans)).toBe("300");
    expect(configuredMonthlyPrice([])).toBeUndefined();
  });
});
