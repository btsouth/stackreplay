import { describe, expect, it, vi } from "vitest";
import { modelPrices } from "./market-discovery";
import { modelsInView } from "./model-library";
import { loadPublicCatalog } from "./public-catalog";
import { publicFreshness, reviewDateRange } from "./public-freshness";

vi.mock("./market-discovery", () => ({ modelPrices: vi.fn() }));
vi.mock("./public-benchmarks", () => ({
  loadPublicBenchmarks: () => ({ sourceSets: [{ observations: [{ checkedAt: "2026-09-30" }] }] }),
}));
vi.mock("./market/events", () => ({
  loadMarketFeed: () => ({ events: [{ sources: [{ checkedAt: "2026-09-30" }] }] }),
}));

describe("scoped public freshness", () => {
  it("keeps ranges, deduplicates dates and omits future checks", () => {
    expect(
      reviewDateRange(["2026-09-29", "2026-09-23", "2026-09-29", "2026-11-01"], "2026-10-03"),
    ).toBe("Sep 23, 2026 to Sep 29, 2026");
    expect(reviewDateRange(["2026-09-30"], "2026-10-03")).toBe("Sep 30, 2026");
    expect(reviewDateRange([], "2026-10-03")).toBe("date not recorded");
  });

  it("a newer model review never makes its older API price look newly checked", () => {
    const catalog = loadPublicCatalog();
    const models = modelsInView(catalog.models, "models");
    vi.mocked(modelPrices).mockImplementation((id) => [
      {
        id: `${id}-price`,
        rates: { input: "1.00", output: "2.00" },
        sources: [],
        lastVerifiedAt: id === models[0]?.id ? "2026-09-23" : "2026-09-29",
      },
    ]);
    const result = publicFreshness({
      ...catalog,
      asOf: "2026-10-03",
      models: catalog.models.map((model) => ({ ...model, lastVerifiedAt: "2026-10-03" })),
      plans: catalog.plans.map((plan) => {
        const copy = { ...plan, lastVerifiedAt: "2026-10-03" };
        delete copy.publishedTerms;
        return copy;
      }),
    });
    expect(result).toBe(
      "Prices reviewed Sep 23, 2026 to Sep 29, 2026 · Plan terms checked Oct 3, 2026 · Benchmarks checked Sep 30, 2026 · Updates checked Sep 30, 2026",
    );
  });

  it("prefers published plan terms over the older Replay rule check", () => {
    const catalog = loadPublicCatalog();
    const plan = catalog.plans.find((plan) => plan.publishedTerms);
    if (!plan?.publishedTerms) throw new Error("Expected published plan terms");
    const result = publicFreshness({
      ...catalog,
      asOf: "2026-10-03",
      plans: [
        {
          ...plan,
          lastVerifiedAt: "2026-09-01",
          publishedTerms: { ...plan.publishedTerms, checkedAt: "2026-10-03" },
        },
      ],
    });
    expect(result).toContain("Plan terms checked Oct 3, 2026");
    expect(result).not.toContain("Sep 1, 2026");
  });
});
