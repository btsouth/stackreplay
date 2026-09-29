import { describe, expect, it } from "vitest";
import { billingContextV1Schema, billingSourceOfTarget } from "./billing-source.js";
import { costBreakdownMatches, decimalTotalOf, visibleCostComponents } from "./cost-breakdown.js";
import { apiTargetV1Schema } from "./execution-target.js";
import { economicsV1Schema } from "./replay-result.js";
import { billedServiceTierOf, serviceTierV1Schema } from "./service-tier.js";
import { textUsageEventV1Schema } from "./usage-event.js";

const usd = (amount: string) => ({ amount, currency: "USD" as const });

describe("service tiers", () => {
  it("is a closed set of processing tiers, not models", () => {
    expect(serviceTierV1Schema.options).toEqual(["standard", "batch", "flex", "fast", "ultrafast"]);
    expect(serviceTierV1Schema.safeParse("gpt-6-astra-ultrafast").success).toBe(false);
  });

  it("keeps an API target without a tier valid, and accepts an explicit tier", () => {
    expect(apiTargetV1Schema.parse({ type: "api", providerId: "openai" }).serviceTier).toBe(
      undefined,
    );
    expect(
      apiTargetV1Schema.parse({ type: "api", providerId: "openai", serviceTier: "fast" })
        .serviceTier,
    ).toBe("fast");
    expect(
      apiTargetV1Schema.safeParse({ type: "api", providerId: "openai", serviceTier: "priority" })
        .success,
    ).toBe(false);
  });

  it("bills the resolved tier only, never the requested one", () => {
    // OpenAI: a Fast request downgraded under ramp limits reports and bills Standard.
    expect(billedServiceTierOf({ requested: "fast", resolved: "standard" })).toBe("standard");
    expect(billedServiceTierOf({ requested: "fast" })).toBeUndefined();
    expect(billedServiceTierOf(undefined)).toBeUndefined();
  });
});

describe("billing source", () => {
  it("follows the target type, never a harness", () => {
    expect(billingSourceOfTarget({ type: "subscription", planId: "openai-chatgpt-pro" })).toEqual({
      kind: "subscription",
      planId: "openai-chatgpt-pro",
    });
    expect(billingSourceOfTarget({ type: "api", providerId: "openai" })).toEqual({
      kind: "direct_api",
      providerId: "openai",
    });
    expect(billingSourceOfTarget({ type: "local" })).toEqual({ kind: "local" });
    expect(billingSourceOfTarget({ type: "hybrid" })).toBeUndefined();
  });

  it("lets one harness, provider and model carry either billing source", () => {
    const base = {
      schemaVersion: 1 as const,
      id: "evt-1",
      occurredAt: "2026-09-29T12:00:00Z",
      source: { adapterId: "opencode" },
      harness: { id: "opencode", attribution: "exact" as const },
      provider: { id: "openai", attribution: "exact" as const },
      model: { rawName: "gpt-6.1-sol" },
      modality: "text" as const,
      usage: { inputTokens: 10, outputTokens: 5 },
      confidence: { usage: "exact" as const, model: "exact" as const },
    };
    const viaPlan = textUsageEventV1Schema.parse({
      ...base,
      billing: { kind: "subscription", planId: "openai-chatgpt-plus", attribution: "exact" },
    });
    const viaApi = textUsageEventV1Schema.parse({
      ...base,
      id: "evt-2",
      billing: { kind: "direct_api", providerId: "openai", attribution: "exact" },
    });
    expect(viaPlan.harness).toEqual(viaApi.harness);
    expect(viaPlan.billing?.kind).toBe("subscription");
    expect(viaApi.billing?.kind).toBe("direct_api");
    // An event without billing context stays valid: the source is unknown.
    expect(textUsageEventV1Schema.parse(base).billing).toBeUndefined();
    expect(billingContextV1Schema.safeParse({ kind: "subscription" }).success).toBe(false);
  });
});

describe("cost breakdown", () => {
  it("adds decimal strings exactly", () => {
    expect(decimalTotalOf(["0.1", "0.2"])).toBe("0.3");
    expect(decimalTotalOf(["12.50", "0.005", "7"])).toBe("19.505");
    expect(decimalTotalOf([])).toBe("0");
    expect(decimalTotalOf(["-1"])).toBeUndefined();
  });

  it("requires the parts to add up to the target cost", () => {
    const breakdown = [
      { kind: "model_inference" as const, label: "Model tokens", amount: usd("4.20") },
      { kind: "tool" as const, label: "Web search", amount: usd("0.30") },
      { kind: "hosted_compute" as const, label: "Container sessions", amount: usd("0.03") },
    ];
    expect(costBreakdownMatches(breakdown, "4.53")).toBe(true);
    const economics = {
      targetCost: usd("4.53"),
      costBasis: "api_list_price" as const,
      breakdown,
    };
    expect(economicsV1Schema.safeParse(economics).success).toBe(true);
    expect(economicsV1Schema.safeParse({ ...economics, targetCost: usd("4.50") }).success).toBe(
      false,
    );
  });

  it("leaves economics without a breakdown exactly as before", () => {
    expect(
      economicsV1Schema.safeParse({ targetCost: usd("1"), costBasis: "api_list_price" }).success,
    ).toBe(true);
  });

  it("hides zero and inference-only parts, so a token replay stays one number", () => {
    expect(
      visibleCostComponents([
        { kind: "model_inference", label: "Model tokens", amount: usd("4.20") },
        { kind: "tool", label: "Tools", amount: usd("0") },
        { kind: "hosted_compute", label: "Hosted compute", amount: usd("0.00") },
      ]),
    ).toEqual([]);
    expect(
      visibleCostComponents([
        { kind: "model_inference", label: "Model tokens", amount: usd("4.20") },
        { kind: "tool", label: "Web search", amount: usd("0.30") },
        { kind: "hosted_compute", label: "Hosted compute", amount: usd("0") },
      ]).map((component) => component.label),
    ).toEqual(["Model tokens", "Web search"]);
    expect(visibleCostComponents(undefined)).toEqual([]);
  });
});
