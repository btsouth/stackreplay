import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPublicDirectory, type PublicDirectory } from "@/lib/public-directory";
import sitemap from "../app/sitemap";
import { absoluteUrl } from "./site";

vi.mock("@/lib/public-providers", () => ({
  loadPublicProviderDirectory: () => ({ providers: [{ id: "provider-a" }, { id: "devin" }] }),
}));

vi.mock("@/lib/public-directory", () => ({
  loadPublicDirectory: vi.fn(),
}));

const mockedLoadPublicDirectory = vi.mocked(loadPublicDirectory);

const indexEntries = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/plans", changeFrequency: "weekly", priority: 0.9 },
  { path: "/models", changeFrequency: "weekly", priority: 0.8 },
  { path: "/providers", changeFrequency: "weekly", priority: 0.8 },
  { path: "/benchmarks", changeFrequency: "weekly", priority: 0.8 },
  { path: "/compare", changeFrequency: "weekly", priority: 0.7 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.6 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.6 },
] as const;

function catalogFixture(): PublicDirectory {
  const asOf = new Date().toISOString().slice(0, 10);
  return {
    catalogVersion: "test",
    asOf,
    providers: [],
    plans: [
      {
        kind: "catalog_plan",
        publicPrice: { kind: "fixed", currency: "USD", amount: "20", interval: "month" },
        id: "plan-a",
        name: "Plan A",
        providerId: "provider-a",
        providerName: "Provider A",
        versionId: "plan-a@2025-01-01",
        effectiveFrom: "2025-01-01",
        price: { currency: "USD", amount: "20", interval: "month" },
        limits: [],
        modelRules: [],
        promotions: [],
        qualitativeLimits: [],
        verificationStatus: "verified",
        lastVerifiedAt: "2025-01-10",
        sources: [],
        billingMechanics: undefined,
        versionCount: 1,
        modelAccess: { checkedAt: "2025-03-10", summary: "", groups: [] },
        publishedTerms: {
          checkedAt: "2025-02-10",
          sourceUrls: [],
          allowanceSummary: "",
          terms: [],
        },
      },
    ],
    models: [
      {
        id: "model-a",
        name: "Model A",
        kind: "release",
        lifecycle: undefined,
        developerId: undefined,
        developerName: undefined,
        pricingNote: undefined,
        familyId: undefined,
        familyName: undefined,
        releaseIds: [],
        providerIds: [],
        providerNames: [],
        planIds: [],
        places: [],
        aliases: [],
        verificationStatus: "verified",
        lastVerifiedAt: "2025-04-10",
        sources: [],
      },
    ],
    planById: () => undefined,
    modelById: () => undefined,
    planVersions: () => [],
  };
}

describe("public sitemap content dates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedLoadPublicDirectory.mockImplementation(catalogFixture);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("omits index dates instead of tracking render time", () => {
    vi.setSystemTime(new Date("2035-01-01T12:00:00Z"));
    const first = new Map(sitemap().map((entry) => [entry.url, entry]));

    vi.setSystemTime(new Date("2036-01-01T12:00:00Z"));
    const second = new Map(sitemap().map((entry) => [entry.url, entry]));

    for (const { path, changeFrequency, priority } of indexEntries) {
      const url = absoluteUrl(path);
      const firstEntry = first.get(url);
      expect(firstEntry).toEqual({ url, changeFrequency, priority });
      expect(firstEntry).not.toHaveProperty("lastModified");
      expect(second.get(url)).toEqual(firstEntry);
    }
  });

  it("includes hub paths without inferred dates", () => {
    for (const id of ["provider-a", "devin"]) {
      expect(sitemap().find((entry) => entry.url === absoluteUrl(`/providers/${id}`))).toEqual({
        url: absoluteUrl(`/providers/${id}`),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    expect(
      sitemap().some((entry) => entry.url.includes("example-") || entry.url.includes("/app/")),
    ).toBe(false);
  });

  it("keeps a newer rule review when published terms are older", () => {
    const catalog = catalogFixture();
    const plan = catalog.plans[0];
    if (!plan) throw new Error("Missing fixture plan");
    plan.lastVerifiedAt = "2025-05-10";
    mockedLoadPublicDirectory.mockReturnValue(catalog);

    expect(
      sitemap().find((entry) => entry.url === absoluteUrl("/plans/plan-a"))?.lastModified,
    ).toEqual(new Date("2025-05-10"));
  });

  it("uses the newest reviewed plan fact and omits the model review date", () => {
    vi.setSystemTime(new Date("2035-01-01T12:00:00Z"));
    const entries = new Map(sitemap().map((entry) => [entry.url, entry]));

    expect(entries.get(absoluteUrl("/plans/plan-a"))?.lastModified).toEqual(new Date("2025-03-10"));
    expect(entries.get(absoluteUrl("/models/model-a"))).toEqual({
      url: absoluteUrl("/models/model-a"),
      changeFrequency: "monthly",
      priority: 0.5,
    });
  });
});
