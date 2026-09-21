import { describe, expect, it } from "vitest";
import { BUNDLED_CATALOG_VERSION, bundledPlansAt, loadBundledCatalog } from "./bundled.js";
import { defaultCatalogDataDirectory, loadCatalogFromDirectory } from "./load.js";

/**
 * The bundled snapshot must be exactly the catalog the YAML defines. A failure
 * here means someone edited packages/catalog/data without regenerating:
 * run `pnpm --filter @stackreplay/catalog build` (twice on a fresh checkout)
 * and commit the regenerated snapshot.
 */
describe("bundled catalog snapshot", () => {
  it("matches the YAML catalog exactly", () => {
    const fromYaml = loadCatalogFromDirectory(defaultCatalogDataDirectory());
    const bundled = loadBundledCatalog();
    expect(bundled).toEqual(fromYaml);
    expect(BUNDLED_CATALOG_VERSION).toBe(fromYaml.catalogVersion);
  });

  it("resolves plan versions for a rules instant", () => {
    const plans = bundledPlansAt("2026-09-15");
    expect(plans.length).toBeGreaterThan(0);
    const starter = plans.find((plan) => plan.id === "example-cloud-starter");
    expect(starter?.versionId).toBe("example-cloud-starter@2026-09-15");
    expect(starter?.price.amount).toBe("20.00");
    expect(starter?.limitCount).toBeGreaterThan(0);
  });

  it("is deterministic and cached", () => {
    expect(loadBundledCatalog()).toBe(loadBundledCatalog());
  });
});
