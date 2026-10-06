import { describe, expect, it } from "vitest";
import type { StackSubscription } from "./current-stack";
import { paidMultiplier, payablePlans, whatYouPay } from "./what-you-pay";

const DATE = "2026-10-05";
const choices = payablePlans(DATE);
const sub = (id: string, plan: `plan:${string}`, quantity?: number): StackSubscription => ({
  id,
  plan,
  ...(quantity === undefined ? {} : { quantity }),
});
const MAX_5X = "plan:anthropic-claude-max-5x";
const PRO_100 = "plan:openai-chatgpt-pro";

describe("what you pay", () => {
  it("offers priced catalog plans and no synthetic examples", () => {
    expect(choices.length).toBeGreaterThan(10);
    expect(choices.some((plan) => plan.id.startsWith("example-"))).toBe(false);
    expect(choices.find((plan) => plan.id === "anthropic-claude-max-5x")?.name).toBe(
      "Claude Max 5x",
    );
    expect(choices.find((plan) => plan.id === "openai-chatgpt-pro")?.name).toBe("ChatGPT Pro 100");
  });

  it("shows nothing when no plan is entered", () => {
    expect(whatYouPay([], choices)).toBeUndefined();
    expect(whatYouPay([{ id: "abcd", plan: "api:openai" }], choices)).toBeUndefined();
  });

  it("sums quantities: Claude Max 5x ×2 and ChatGPT Pro 100 is 3 accounts and $300 a month", () => {
    const pay = whatYouPay([sub("abcd", MAX_5X, 2), sub("efgh", PRO_100)], choices);
    expect(pay?.plans.map((plan) => [plan.name, plan.quantity])).toEqual([
      ["Claude Max 5x", 2],
      ["ChatGPT Pro 100", 1],
    ]);
    expect(pay?.accounts).toBe(3);
    expect(Number(pay?.monthlyUsd)).toBe(300);
  });

  it("counts rows of one plan by their quantities, not as one row each", () => {
    const pay = whatYouPay([sub("abcd", MAX_5X), sub("efgh", MAX_5X, 3)], choices);
    expect(pay?.plans).toHaveLength(1);
    expect(pay?.accounts).toBe(4);
    expect(Number(pay?.monthlyUsd)).toBe(400);
  });

  it("gives no total when a plan has no dollar price in the catalog", () => {
    const pay = whatYouPay([sub("abcd", MAX_5X), sub("efgh", "plan:retired-plan")], choices);
    expect(pay?.accounts).toBe(2);
    expect(pay?.monthlyUsd).toBeUndefined();
  });
});

describe("Nx what you paid", () => {
  it("Claude Max 5x ×2 + ChatGPT Pro 100 over 30 days", () => {
    const pay = whatYouPay([sub("abcd", MAX_5X, 2), sub("efgh", PRO_100)], choices);
    const monthly = pay?.monthlyUsd ?? "0";
    // $300 a month for 30 of 30.4 days is $296.05; $9,673 of API value is 32.7 times that.
    expect(paidMultiplier("9673.4", monthly, 30)).toEqual({ value: 33, text: "33×" });
    // Below ten it keeps one decimal.
    expect(paidMultiplier("1000", monthly, 30)).toEqual({ value: 3.4, text: "3.4×" });
    expect(paidMultiplier("2950", monthly, 30)).toEqual({ value: 10, text: "10×" });
  });

  it("prorates the monthly total to the period", () => {
    expect(paidMultiplier("9673", "300", 90)?.text).toBe("11×");
    expect(paidMultiplier("9673", "300", 30)?.text).toBe("33×");
    expect(paidMultiplier("9673", "300", 365)?.text).toBe("2.7×");
  });

  it("uses the whole-dollar API value the page shows", () => {
    expect(paidMultiplier("1000.49", "300", 30)).toEqual(paidMultiplier("1000", "300", 30));
    expect(paidMultiplier("1000.5", "300", 30)).toEqual(paidMultiplier("1001", "300", 30));
  });

  it("omits a figure that rounds to nothing or has bad inputs", () => {
    for (const [value, cost, days] of [
      ["1", "300", 30],
      ["10", "0", 30],
      ["NaN", "10", 30],
      ["10", "-1", 30],
      ["10", "Infinity", 30],
      ["10", "10", 0],
      ["10", "10", 1.5],
    ] as const)
      expect(paidMultiplier(value, cost, days)).toBeUndefined();
  });
});
