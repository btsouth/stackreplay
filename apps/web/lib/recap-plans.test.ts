import { expect, it } from "vitest";
import { paidMultiplier, recapPlans } from "./recap-plans";

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

it("prorates monthly cost across the same recap calendar days", () => {
  expect(paidMultiplier("15000", "100", 90)).toBe(51);
  expect(paidMultiplier("1000", "100", 30)).toBe(10);
  expect(paidMultiplier("1000", "100", 1)).toBe(304);
});
it("only shows ratios at least two before whole-number rounding", () => {
  expect(paidMultiplier("199", "30.4", 100)).toBeUndefined();
  expect(paidMultiplier("200", "30.4", 100)).toBe(2);
  expect(paidMultiplier("250", "30.4", 100)).toBe(3);
});
it("omits invalid or zero payment references", () => {
  for (const [value, cost, days] of [
    ["10", "0", 30],
    ["10", "-1", 30],
    ["NaN", "10", 30],
    ["10", "Infinity", 30],
    ["10", "10", 0],
    ["10", "10", 1.5],
  ] as const)
    expect(paidMultiplier(value, cost, days)).toBeUndefined();
});
