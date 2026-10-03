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
      if (plan?.kind !== "catalog_plan") throw new Error("Expected catalog plan");
      expect(plan.limits).toEqual([]);
    }
    expect(catalog.plans.some((plan) => plan.id.includes("-api-"))).toBe(false);
    const goat = catalog.planById("command-code-goat");
    const ollama = catalog.planById("ollama-cloud-pro");
    expect(goat?.kind === "catalog_plan" && goat.price.amount).toBe("10");
    expect(ollama?.kind === "catalog_plan" && ollama.currentMarketOnly).toBe(true);
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
  it("lists the October 3 public coding plans without making them replay targets", () => {
    const { catalog } = marketDiscovery("2026-10-03");
    for (const [id, amount] of [
      ["kiro-free", "0"],
      ["kiro-pro-plus", "40"],
      ["kiro-pro-max", "100"],
      ["kiro-power", "200"],
      ["cursor-teams-standard", "40"],
      ["cursor-teams-premium", "120"],
    ] as const) {
      const plan = catalog.planById(id);
      if (plan?.kind !== "catalog_plan") throw new Error("Expected catalog plan");
      expect(plan.price.amount, id).toBe(amount);
      expect(plan.limits, id).toEqual([]);
      expect(loadCatalog().plans[id]?.executionVersions ?? [], id).toEqual([]);
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
  it("records Mistral Large 3 as a Standard API list price from the first catalog observation", () => {
    const rates = Object.values(loadCatalog().pricing).filter(
      (price) => price.modelId === "mistral-large-3",
    );
    expect(rates).toHaveLength(1);
    const record = rates[0];
    expect(record).toMatchObject({
      id: "mistral-large-3-api-pricing",
      basis: "api_list_price",
      effectiveFrom: "2026-10-03",
      rates: { input: "0.5", output: "1.5", cacheRead: "0.05" },
      verificationStatus: "verified",
    });
    expect(record?.serviceTier).toBeUndefined();
    expect(record?.rates.cacheWrite).toBeUndefined();
    expect(record?.sources).toEqual([
      {
        url: "https://docs.mistral.ai/inference/pricing",
        title:
          "Standard/default service tier, Mistral Large 3 row: input $0.5, cached input $0.05, output $1.5 per 1M tokens. First catalog observation is 2026-10-03; no provider-published price activation date is established in this source.",
        checkedAt: "2026-10-03",
      },
    ]);

    expect(basePrice(modelPrices("mistral-large-3", "2026-10-03"))?.rates).toMatchObject({
      input: "0.5",
      output: "1.5",
      cacheRead: "0.05",
    });
    expect(modelPrices("mistral-large-3", "2026-10-02")).toEqual([]);

    const publicModel = loadPublicCatalog("2026-10-03").modelById("mistral-large-3");
    expect(publicModel?.lastVerifiedAt).toBe("2026-09-30");
    expect(publicModel?.places).toContainEqual(
      expect.objectContaining({ kind: "api", providerId: "mistral", label: "Mistral AI API" }),
    );
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

describe("model and subscription detail completeness", () => {
  const catalog = loadPublicCatalog("2026-09-28");
  it("exposes first-party specifications and keeps missing capabilities unknown", () => {
    const sonnet = catalog.modelById("claude-sonnet-5-5");
    expect(sonnet?.specifications).toMatchObject({
      contextTokens: 1_000_000,
      maxOutputTokens: 128_000,
      toolCalling: true,
    });
    expect(sonnet?.specifications?.sources.length).toBeGreaterThan(0);
    expect(catalog.modelById("mai-code-1-1-flash")?.specifications?.contextTokens).toBeUndefined();
  });
  it("keeps product-specific and modality-specific prices out of a generic API rate", () => {
    for (const id of ["composer-2-5", "nano-banana-pro", "gpt-5-6-sol-pro"]) {
      expect(basePrice(modelPrices(id, "2026-09-28"))).toBeUndefined();
      expect(catalog.modelById(id)?.pricingNote?.length).toBeGreaterThan(40);
    }
  });
  it("does not advertise an API for retired routes or unmatched subscription labels", () => {
    for (const id of [
      "gemini-3-pro",
      "gemini-3-flash-lite",
      "gpt-5-6-sol-pro",
      "gpt-5-thinking-mini",
    ]) {
      expect(catalog.modelById(id)?.places.some((place) => place.kind === "api")).toBe(false);
    }
  });
  it("fills sourced API prices without assuming cache duration or reasoning billing", () => {
    expect(basePrice(modelPrices("kimi-k3", "2026-09-28"))?.rates).toMatchObject({
      input: "3",
      output: "15",
      cacheRead: "0.3",
    });
    expect(basePrice(modelPrices("kimi-k3", "2026-09-28"))?.rates.cacheWrite).toBeUndefined();
    expect(
      catalog
        .modelById("kimi-k3")
        ?.places.some((place) => place.kind === "api" && place.providerId === "moonshot"),
    ).toBe(true);
    expect(basePrice(modelPrices("grok-4-5", "2026-09-28"))?.rates.cacheRead).toBe("0.3");
    const opus = modelPrices("claude-opus-4-7", "2026-09-28");
    expect(basePrice(opus)?.rates.cacheWrite).toBeUndefined();
    expect(opus.filter((price) => price.variantId)).toHaveLength(2);
  });
  it("does not extend temporary reference prices past their published period", () => {
    expect(basePrice(modelPrices("gemini-3-7-flash", "2026-09-28"))?.rates.input).toBe("0.75");
    // The promotion ends; the rate Google publishes for January 1 takes over.
    expect(basePrice(modelPrices("gemini-3-7-flash", "2027-01-01"))?.rates.input).toBe("1.50");
    const sol = (date: string) =>
      modelPrices("gpt-5-6-sol", date).some((price) => price.variantId === "promotion-d0");
    expect(sol("2026-10-27")).toBe(true);
    expect(sol("2026-10-28")).toBe(false);
  });
  it("shows relevant usage and tool facts without treating them as quotas", () => {
    const max = catalog.planById("anthropic-claude-max-5x");
    const pro = catalog.planById("openai-chatgpt-pro-20x");
    expect(
      max?.qualitativeLimits.find((term) => term.label === "Included usage")?.statement,
    ).toContain("5× Pro");
    expect(max?.limits).toEqual([]);
    expect(pro && planTools(pro)).toContain("Codex");
  });
});

describe("processing tiers stay out of a model's price", () => {
  it("shows GPT-6 Astra and GPT-6.1 Sol at Standard rates, not a newer Batch or Ultrafast record", () => {
    const astra = modelPrices("gpt-6-astra", "2026-09-29").filter((price) => !price.variantId);
    expect(astra.map((price) => price.rates.input)).toEqual(["10.00"]);
    const sol = modelPrices("gpt-6-1-sol", "2026-09-29").filter((price) => !price.variantId);
    expect(sol.map((price) => [price.id, price.rates.input])).toEqual([
      ["gpt-6-1-sol-pricing", "2.00"],
    ]);
  });
});
