import { describe, expect, it } from "vitest";
import { loadBundledCatalog } from "./bundled.js";
import { DECISION_MARKET } from "./decision-market.js";
import { compileExecutionPlan } from "./execution-compiler.js";

const catalog = loadBundledCatalog();
describe("D0 admitted market snapshot", () => {
  it("reproduces every derived artifact with pinned overlays and catalog identity", () => {
    expect(DECISION_MARKET.catalogHash).toBe(catalog.catalogVersion);
    expect(DECISION_MARKET.plans).toHaveLength(22);
    for (const scenario of DECISION_MARKET.scenarios) {
      expect(scenario.artifacts).toHaveLength(12);
      for (const a of scenario.artifacts)
        expect(
          compileExecutionPlan(
            catalog,
            a.planId,
            a.planVersionId,
            a.appliedOverlayIds,
            DECISION_MARKET.rulesAt,
          ).artifact,
        ).toEqual(a);
    }
  });
  it("admits GPT-5.6 Sol only with its evidenced promotion, including long-context rates", () => {
    const a = DECISION_MARKET.plans.find((p) => p.id === "openai-api-gpt-5-6-sol")?.artifact;
    if (a?.computation.kind !== "executable") throw new Error("Missing admitted promotion");
    expect(a.computation.routes[0]?.models).toEqual(["gpt-5-6-sol"]);
    const rate = a.computation.rates[0];
    expect(rate?.basePricingRef).toBeNull();
    expect(rate?.rates).toEqual({
      input: "4",
      output: "20",
      cacheRead: "0.4",
      cacheWrite: "5",
      reasoning: { billedAs: "output" },
    });
    expect(rate?.tiers?.[0]?.rates).toEqual({
      input: "8",
      output: "30",
      cacheRead: "0.8",
      cacheWrite: "10",
      reasoning: { billedAs: "output" },
    });
    expect(rate?.cashOverrides).toHaveLength(5);
    expect(
      compileExecutionPlan(catalog, a.planId, a.planVersionId, [], DECISION_MARKET.rulesAt).artifact
        .computation.kind,
    ).toBe("not_computable");
    expect(() =>
      compileExecutionPlan(
        catalog,
        a.planId,
        a.planVersionId,
        a.appliedOverlayIds,
        DECISION_MARKET.reviewUntil,
      ),
    ).toThrow();
  });
  it("keeps conditional pricing variants out of permanent source rates", () => {
    const base = catalog.pricing["anthropic-api-sonnet-5-current-rate"];
    expect(base?.rates.cacheWrite).toBeUndefined();
    expect(base?.rates.reasoning).toBeUndefined();
    expect(catalog.pricing["anthropic-api-sonnet-5-cache-5m-d0"]?.variantId).toBe("cache-write-5m");
    expect(catalog.pricing["anthropic-api-sonnet-5-cache-1h-d0"]?.rates.cacheWrite).toBe("4");
    expect(
      DECISION_MARKET.scenarios[0]?.artifacts.find((p) => p.planId === "anthropic-api-sonnet-5")
        ?.artifactHash,
    ).not.toBe(
      DECISION_MARKET.scenarios[1]?.artifacts.find((p) => p.planId === "anthropic-api-sonnet-5")
        ?.artifactHash,
    );
  });
});
