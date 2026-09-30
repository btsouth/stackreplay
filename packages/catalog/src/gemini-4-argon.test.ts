import { describe, expect, it } from "vitest";
import { bundledApiProviderModels, loadBundledCatalog } from "./bundled.js";
import { loadDefaultCatalog } from "./load.js";

describe("Gemini 4 Argon announcement admission", () => {
  it("records the exact announcement and output limit without inferring context or API identity", () => {
    const catalog = loadDefaultCatalog();
    expect(catalog.models["gemini-4-argon"]).toMatchObject({
      name: "Gemini 4 Argon",
      developerId: "google",
      releaseDate: { date: "2026-09-30" },
      specifications: { maxOutputTokens: 1000000 },
      apiAvailability: "not_established",
      providerIds: [],
      aliases: [],
    });
    expect(catalog.models["gemini-4-argon"]?.specifications?.contextTokens).toBeUndefined();
    expect(catalog.models["gemini-4-argon"]?.specifications?.maxInputTokens).toBeUndefined();
    expect(loadBundledCatalog().models["gemini-4-argon"]).toEqual(catalog.models["gemini-4-argon"]);
  });

  it("keeps future prices and access out of executable pricing and subscription capacity", () => {
    const catalog = loadDefaultCatalog();
    expect(Object.values(catalog.pricing).filter((p) => p.modelId === "gemini-4-argon")).toEqual(
      [],
    );
    expect(
      bundledApiProviderModels("google", "2026-09-30").find((m) => m.id === "gemini-4-argon"),
    ).toBeUndefined();
    for (const plan of Object.values(catalog.plans)) {
      for (const version of plan.versions) {
        expect(version.modelRules.some((r) => r.model === "gemini-4-argon")).toBe(false);
      }
      for (const version of plan.executionVersions ?? []) {
        expect(JSON.stringify(version.routes)).not.toContain("gemini-4-argon");
      }
    }
    expect(catalog.models["gemini-4-argon"]?.pricingNote).toContain("not executable rates");
  });
});
