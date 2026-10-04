import { expect, it } from "vitest";
import { recapPlans } from "./recap-plans";

const profile = {
  account: "one",
  organizationType: "claude_max",
  rateLimitTier: "default_claude_max_5x",
};
it("detects explicit profile tiers once per account, preserving multiple subscriptions", () => {
  const result = recapPlans([], {
    a: profile,
    b: profile,
    c: { ...profile, account: "two" },
    d: { account: "unknown", organizationType: "claude_max" },
  });
  expect(result.map((s) => s.plan)).toEqual([
    "plan:anthropic-claude-max-5x",
    "plan:anthropic-claude-max-5x",
  ]);
});
it("uses saved selections instead of overriding them with profile snapshots", () => {
  const saved = [{ id: "saved", plan: "plan:openai-chatgpt-plus" as const }];
  expect(recapPlans(saved, { a: profile })).toEqual(saved);
});
