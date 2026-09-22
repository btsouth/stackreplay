import { describe, expect, it } from "vitest";
import { isSyntheticCatalogId, loadPublicCatalog } from "./public-catalog";

/**
 * The public read model is what every public page and the sitemap are built from, so it
 * is the boundary that keeps the synthetic `example-` development catalog (fixtures and
 * demos, kept for M3 behaviour) out of anything a visitor reads as a real claim.
 */
describe("public catalog read model", () => {
  it("returns no synthetic provider, plan or model id", () => {
    const catalog = loadPublicCatalog("2026-09-21");

    expect(catalog.providers.length).toBeGreaterThan(0);
    expect(catalog.plans.length).toBeGreaterThan(0);
    expect(catalog.models.length).toBeGreaterThan(0);

    for (const id of [
      ...catalog.providers.map((provider) => provider.id),
      ...catalog.plans.map((plan) => plan.id),
      ...catalog.models.map((model) => model.id),
    ]) {
      expect(isSyntheticCatalogId(id)).toBe(false);
      expect(id.startsWith("example-")).toBe(false);
    }
  });

  it("never exposes a synthetic id through a plan's model rules or sources", () => {
    const catalog = loadPublicCatalog("2026-09-21");
    for (const plan of catalog.plans) {
      for (const rule of plan.modelRules) expect(rule.model.startsWith("example-")).toBe(false);
      for (const source of plan.sources) expect(source.url).not.toContain("example.invalid");
      expect(plan.providerId.startsWith("example-")).toBe(false);
    }
    for (const model of catalog.models) {
      for (const providerId of model.providerIds)
        expect(providerId.startsWith("example-")).toBe(false);
    }
  });
});
