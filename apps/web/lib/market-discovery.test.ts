import { describe, expect, it } from "vitest";
import { buildCompareFacts } from "./compare-facts";
import { basePrice, marketDiscovery, modelPrices, planTools } from "./market-discovery";
import { numericRate } from "./market-prices";
import { loadCatalog, loadPublicCatalog } from "./public-catalog";

describe("public market discovery", () => {
  it("publishes accepted subscription facts without exposing API plans as subscriptions", () => {
    const { catalog } = marketDiscovery("2026-09-28");
    for (const id of [
      "command-code-goat",
      "kiro-pro",
      "ollama-cloud-pro",
      "clinepass",
      "opencode-go",
      "opencode-go-plus",
      "ollama-cloud-max",
    ]) {
      const plan = catalog.planById(id);
      expect(plan, id).toBeDefined();
      expect(plan?.sources.length).toBeGreaterThan(0);
      expect(plan?.limits).toEqual([]);
    }
    expect(catalog.plans.some((plan) => plan.id.includes("-api-"))).toBe(false);
    expect(catalog.planById("command-code-goat")?.price.amount).toBe("10");
    expect(catalog.planById("ollama-cloud-pro")?.currentMarketOnly).toBe(true);
  });
  it("does not backdate new offers or expose expired execution snapshots", () => {
    expect(loadPublicCatalog("2026-09-27").planById("clinepass")).toBeUndefined();
    expect(loadPublicCatalog("2026-10-28").planById("command-code-goat")).toBeUndefined();
  });
  it("keeps reference-priced subscriptions out of executable admission", () => {
    for (const id of [
      "clinepass",
      "opencode-go",
      "opencode-go-plus",
      "ollama-cloud-max",
      "command-code-pro",
    ]) {
      expect(loadCatalog().plans[id]?.executionVersions ?? []).toEqual([]);
      expect(loadPublicCatalog("2026-09-28").planById(id)?.limits).toEqual([]);
    }
  });
  it("shows current direct API rates and keeps cache scenarios separate", () => {
    const rates = modelPrices("claude-opus-5-5", "2026-09-28");
    expect(basePrice(rates)?.rates).toMatchObject({ input: "4", output: "20", cacheRead: "0.2" });
    expect(rates.filter((rate) => rate.variantId)).toHaveLength(2);
    expect(basePrice(rates)?.rates.cacheWrite).toBeUndefined();
    expect(basePrice(modelPrices("claude-sonnet-5-5", "2026-09-28"))?.rates).toMatchObject({
      input: "2",
      output: "10",
      cacheRead: "0.2",
    });
    expect(modelPrices("claude-sonnet-5-5", "2026-09-27")).toEqual([]);
    expect(modelPrices("unpublished-model", "2026-09-28")).toEqual([]);
  });
  it("resolves explicit category aliases without inventing missing or cyclic rates", () => {
    expect(
      numericRate({ input: "2", output: "10", cacheRead: { billedAs: "input" } }, "cacheRead"),
    ).toBe("2");
    expect(numericRate({ input: "2", output: "10" }, "cacheRead")).toBeUndefined();
    expect(
      numericRate({ input: { billedAs: "output" }, output: { billedAs: "input" } }, "input"),
    ).toBeUndefined();
  });
  it("only filters tools whose compatibility is recorded", () => {
    const catalog = loadPublicCatalog("2026-09-28");
    const go = catalog.planById("opencode-go");
    const cline = catalog.planById("clinepass");
    if (!go || !cline) throw new Error("Expected admitted plans");
    expect(planTools(go)).toContain("Claude Code");
    expect(planTools(cline)).toContain("Cline");
    expect(buildCompareFacts(cline, catalog.modelById).usage.numeric).toBe(false);
    expect(planTools(cline)).not.toContain("Claude Code");
  });
});
