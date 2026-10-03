import type { CatalogV1 } from "@stackreplay/catalog";
import { describe, expect, it } from "vitest";
import {
  currentVersionOf,
  isSyntheticCatalogId,
  loadCatalog,
  loadPublicCatalog,
} from "./public-catalog";

const OCTOBER_PUBLIC_ADDITIONS = [
  ["kiro-free", "0"],
  ["kiro-pro-plus", "40"],
  ["kiro-pro-max", "100"],
  ["kiro-power", "200"],
  ["cursor-teams-standard", "40"],
  ["cursor-teams-premium", "120"],
] as const;

/**
 * The public read model is what every public page and the sitemap are built from, so it
 * is the boundary that keeps the synthetic `example-` development catalog (fixtures and
 * demos, kept for M3 behaviour) out of anything a visitor reads as a real claim.
 */
describe("public catalog read model", () => {
  it("adds the six reference plans on October 3 without executable admission", () => {
    const before = loadPublicCatalog("2026-10-02");
    const current = loadPublicCatalog("2026-10-03");
    const stored = loadCatalog();
    for (const [id, amount] of OCTOBER_PUBLIC_ADDITIONS) {
      expect(before.planById(id), id).toBeUndefined();
      const plan = current.planById(id);
      expect(plan, id).toBeDefined();
      expect(plan?.price).toEqual({ currency: "USD", amount, interval: "month" });
      expect(plan?.limits).toEqual([]);
      expect(plan?.modelAccess?.checkedAt).toBe("2026-10-03");
      expect(plan?.publishedTerms?.checkedAt).toBe("2026-10-03");
      expect(stored.plans[id]?.executionVersions ?? []).toEqual([]);
      expect(stored.plans[id]?.versions).toHaveLength(1);
      expect(stored.plans[id]?.versions[0]?.effectiveFrom).toBe("2026-10-03");
      expect(stored.plans[id]?.versions[0]?.effectiveFromBasis).toBe("catalog_recorded");
    }
  });

  it("keeps Kiro Pro's accepted execution version separate from its public version", () => {
    const plan = loadCatalog().plans["kiro-pro"];
    expect(plan?.versions.map((version) => version.effectiveFrom)).toEqual(["2026-10-03"]);
    expect(plan?.executionVersions?.map((version) => version.id)).toEqual([
      "kiro-pro-current-20260927",
    ]);
    expect(plan?.executionVersions?.[0]?.purchase).toMatchObject({
      kind: "subscription",
      term: "month",
      fixedUsd: "20",
    });
  });

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

  /**
   * Regression (benchmark F001): the public read model treated `effectiveTo` as
   * exclusive and, when no version applied, fell back to the newest known one —
   * so a page could print a price from a version that was not in force, and
   * disagree with the engine on a version's last day. A narrow fake catalog keeps
   * the assertion on the rule rather than on today's bundled data.
   */
  it("selects the version in force by the engine's rule, never a future one", () => {
    const version = (effectiveFrom: string, effectiveTo?: string) => ({
      planId: "plan-x",
      effectiveFrom,
      ...(effectiveTo === undefined ? {} : { effectiveTo }),
    });
    const catalog = {
      plans: {
        "plan-x": {
          id: "plan-x",
          name: "Plan X",
          providerId: "provider-x",
          versions: [
            version("2026-01-01", "2026-06-30"),
            version("2026-09-01"),
          ] as unknown as CatalogV1["plans"][string]["versions"],
        },
      },
      planVersions: Object.fromEntries(
        ["2026-01-01", "2026-06-30", "2026-09-01"].map((from) => [
          `plan-x@${from}`,
          { ...version(from), versionId: `plan-x@${from}` },
        ]),
      ),
    } as unknown as CatalogV1;

    // Inclusive end day: the ending version is still in force on its last day.
    expect(currentVersionOf(catalog, "plan-x", "2026-06-30")?.effectiveFrom).toBe("2026-01-01");
    // A day in the gap between versions has no version in force: previously this
    // returned the September version, i.e. a price that had not started.
    expect(currentVersionOf(catalog, "plan-x", "2026-07-15")).toBeUndefined();
    expect(currentVersionOf(catalog, "plan-x", "2026-09-01")?.effectiveFrom).toBe("2026-09-01");
    expect(currentVersionOf(catalog, "plan-x", "2025-12-31")).toBeUndefined();
  });

  it("only lists plans whose selected version is in force at the read instant", () => {
    const asOf = "2026-09-21";
    for (const plan of loadPublicCatalog(asOf).plans) {
      expect(plan.effectiveFrom <= asOf).toBe(true);
    }
  });
});
