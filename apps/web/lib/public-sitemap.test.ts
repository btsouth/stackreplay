import { describe, expect, it, vi } from "vitest";
import sitemap from "../app/sitemap";
import { loadPublicCatalog } from "./public-catalog";
import { absoluteUrl } from "./site";

describe("public sitemap content dates", () => {
  it("uses the catalog date for indexes, independent of render time", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2035-01-01"));
      const entries = sitemap();
      for (const path of [
        "/",
        "/models",
        "/plans",
        "/benchmarks",
        "/compare",
        "/methodology",
        "/changelog",
      ]) {
        expect(entries.find((entry) => entry.url === absoluteUrl(path))?.lastModified).toEqual(
          new Date(loadPublicCatalog().asOf),
        );
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses each model review and each plan's published-terms check when present", () => {
    const catalog = loadPublicCatalog();
    const entries = new Map(sitemap().map((entry) => [entry.url, entry.lastModified]));
    for (const model of catalog.models)
      expect(entries.get(absoluteUrl(`/models/${model.id}`))).toEqual(
        new Date(model.lastVerifiedAt),
      );
    for (const plan of catalog.plans)
      expect(entries.get(absoluteUrl(`/plans/${plan.id}`))).toEqual(
        new Date(plan.publishedTerms?.checkedAt ?? plan.lastVerifiedAt),
      );
  });
});
