import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadDefaultCatalog } from "./load.js";
import { resolvePlanTimeline } from "./plan-timeline.js";
import { createModelIdentityIndex } from "./resolve.js";
import {
  isDefaultPriceRecord,
  modelServiceTiers,
  resolveServiceTier,
  tierPricingAt,
} from "./service-tiers.js";
import { planVersionId } from "./version-id.js";
import { selectPlanVersionAt } from "./versions.js";

/**
 * The OpenAI DevDay (Sep 29, 2026) catalog changes, read from the real
 * catalog: the ChatGPT Pro 200 revision and its history, Pro 500, GPT-6.1 Sol
 * as its own model, and processing tiers that price only what OpenAI prices.
 */

const catalog = loadDefaultCatalog();
const pro200 = catalog.plans["openai-chatgpt-pro-20x"];
if (pro200 === undefined) throw new Error("Pro $200 plan missing");

describe("ChatGPT Pro 200: market terms and grandfathered terms", () => {
  const market = (day: string) => selectPlanVersionAt(pro200.versions, day);
  const grandfathered = (day: string) =>
    selectPlanVersionAt(pro200.versions, day, { cohort: "grandfathered" });
  const id = (version: { effectiveFrom: string; cohort?: string | undefined } | undefined) =>
    version === undefined
      ? undefined
      : planVersionId("openai-chatgpt-pro-20x", version.effectiveFrom, version.cohort);

  it("is not yet revised on Sep 28, for anyone", () => {
    expect(id(market("2026-09-28"))).toBe("openai-chatgpt-pro-20x@2026-09-22");
    expect(id(grandfathered("2026-09-28"))).toBe("openai-chatgpt-pro-20x@2026-09-22");
    const timeline = resolvePlanTimeline(pro200, "2026-09-28");
    expect(timeline.current?.revision).toBeUndefined();
    // Nothing about the revision was known yet.
    expect(timeline.scheduled).toBeUndefined();
    expect(timeline.cohortWindows).toEqual([]);
  });

  it("offers the revised allowance to a buyer from Sep 29, from its structured date alone", () => {
    expect(id(market("2026-09-29"))).toBe("openai-chatgpt-pro-20x@2026-09-29");
    const timeline = resolvePlanTimeline(pro200, "2026-09-29");
    expect(timeline.current?.versionId).toBe("openai-chatgpt-pro-20x@2026-09-29");
    expect(timeline.current?.revision?.relativeValue).toMatchObject({
      measure: "api_equivalent_spend",
      ratio: "0.5",
      approximate: true,
      comparedTo: "previous_terms",
    });
    expect(timeline.current?.revision?.relativeValue?.evidence[0]?.authority).toBe(
      "provider_staff",
    );
    expect(timeline.applied?.versionId).toBe(timeline.current?.versionId);
    expect(timeline.applied?.cohort).toBeUndefined();
  });

  it("keeps eligible grandfathered subscribers on the previous allowance on the same day", () => {
    const version = grandfathered("2026-09-29");
    expect(id(version)).toBe("openai-chatgpt-pro-20x@2026-09-29~grandfathered");
    expect(version?.revision).toBeUndefined();
    const timeline = resolvePlanTimeline(pro200, "2026-09-29", { cohort: "grandfathered" });
    expect(timeline.applied).toMatchObject({
      versionId: "openai-chatgpt-pro-20x@2026-09-29~grandfathered",
      cohort: "grandfathered",
      endedAt: "2026-10-29",
    });
    // The market reading on the same day is unchanged: both term sets coexist.
    expect(timeline.current?.versionId).toBe("openai-chatgpt-pro-20x@2026-09-29");
  });

  it("treats Oct 29 as the last grandfathered day and Oct 30 as the first on revised terms", () => {
    expect(id(grandfathered("2026-10-29"))).toBe("openai-chatgpt-pro-20x@2026-09-29~grandfathered");
    expect(id(grandfathered("2026-10-30"))).toBe("openai-chatgpt-pro-20x@2026-09-29");
    expect(id(market("2026-10-29"))).toBe("openai-chatgpt-pro-20x@2026-09-29");
    const window = (day: string) => resolvePlanTimeline(pro200, day).cohortWindows[0];
    expect(window("2026-10-29")?.status).toBe("current");
    expect(window("2026-10-30")?.status).toBe("ended");
    expect(window("2026-10-30")?.effectiveTo).toBe("2026-10-29");
  });

  it("never gives a buyer grandfathered terms by default", () => {
    for (const day of ["2026-09-29", "2026-10-01", "2026-10-29", "2026-12-01"]) {
      expect(market(day)?.cohort).toBeUndefined();
      expect(resolvePlanTimeline(pro200, day).applied?.cohort).toBeUndefined();
    }
  });

  it("keeps grandfathering a Pro $200 allowance, not a Pro $500 upgrade or Ultrafast", () => {
    const version = grandfathered("2026-10-01");
    expect(version?.price).toEqual({ currency: "USD", amount: "200", interval: "month" });
    const statements = (version?.qualitativeLimits ?? []).map((limit) => limit.statement).join(" ");
    expect(statements).toContain("does not upgrade your plan or add Ultrafast");
    expect(statements).toContain("Ultrafast is available only on Pro 500");
    expect(version?.relativeAllowances).toBeUndefined();
    expect(pro200.cohorts?.map((cohort) => cohort.id)).toEqual(["grandfathered"]);
  });

  it("records the eligibility in OpenAI's words without inventing the cutoff date", () => {
    const cohort = pro200.cohorts?.[0];
    expect(cohort?.eligibility).toContain("eligibility cutoff");
    expect(cohort?.eligibility).toContain("seven days before it");
    // The Help Center states no cutoff date, and the catalog holds none.
    expect(cohort?.eligibility).not.toMatch(/\b(Sep|September|Oct|October) (?!29, 2026)\d/u);
    expect(JSON.stringify(cohort)).not.toMatch(/cutoff[^.]*2026-/u);
  });

  it("keeps the previous terms without a fabricated start date", () => {
    const timeline = resolvePlanTimeline(pro200, "2026-10-01");
    expect(timeline.previous?.startedAt).toBeUndefined();
    expect(timeline.previous?.endedAt).toBe("2026-09-28");
    expect(timeline.current?.startedAt).toBe("2026-09-29");
    expect(timeline.current?.audience).toEqual(["new_subscribers"]);
  });

  it("records the Sep 10 pause as new subscribers and upgrades only", () => {
    const pause = resolvePlanTimeline(pro200, "2026-10-01").entries.find(
      (entry) => entry.id === "new-subscriptions-paused",
    );
    expect(pause).toMatchObject({
      date: "2026-09-10",
      status: "effective",
      appliesTo: ["new_subscribers", "upgrades"],
      unaffected: ["existing_subscribers"],
    });
    expect(pause?.title).not.toMatch(/disabled|shut down|discontinued/i);
  });

  it("lists the history in order: the pause, then the Sep 29 reopening and revision", () => {
    const timeline = resolvePlanTimeline(pro200, "2026-10-01");
    expect(timeline.entries.map((entry) => [entry.date, entry.id])).toEqual([
      ["2026-09-10", "new-subscriptions-paused"],
      ["2026-09-29", "new-subscriptions-reopen"],
      ["2026-09-29", "revised-usage-allowance"],
    ]);
    expect(timeline.entries.filter((entry) => entry.startsCurrentTerms).map((e) => e.id)).toEqual([
      "revised-usage-allowance",
    ]);
  });
});

describe("ChatGPT Pro 500", () => {
  const pro500 = catalog.plans["openai-chatgpt-pro-500"];
  const version =
    pro500 === undefined ? undefined : selectPlanVersionAt(pro500.versions, "2026-09-29");
  const statements = (version?.qualitativeLimits ?? []).map((limit) => limit.statement).join(" ");

  it("records the $500 price, Ultrafast and the highest-usage statement", () => {
    expect(version?.price).toEqual({ currency: "USD", amount: "500", interval: "month" });
    expect(statements).toContain("Ultrafast is available only on Pro 500");
    expect(statements).toContain("Pro 500 offers the highest included usage of the three plans");
    expect(selectPlanVersionAt(pro500?.versions ?? [], "2026-09-28")).toBeUndefined();
  });

  it("records 25x as a relative usage claim from the keynote, never a quota", () => {
    expect(version?.relativeAllowances).toEqual([
      expect.objectContaining({
        measure: "provider_usage",
        multiple: "25",
        comparedToPlanId: "openai-chatgpt-plus",
      }),
    ]);
    expect(version?.relativeAllowances?.[0]?.evidence[0]).toMatchObject({
      authority: "provider_keynote",
      url: expect.stringContaining("youtube.com/watch?v=Fls_onRviPM"),
    });
    // No numeric limit, token count or API-dollar figure is derived from it.
    expect(version?.limits).toEqual([]);
    expect(JSON.stringify(version)).not.toMatch(
      /25x (tokens|messages|API)|25 times the (tokens|API)/iu,
    );
  });

  it("keeps the 8x speed claim and the 8x included-usage rate as separate, labelled facts", () => {
    const speed = version?.qualitativeLimits?.find((limit) => limit.id === "ultrafast-speed-claim");
    const rate = version?.qualitativeLimits?.find(
      (limit) => limit.id === "ultrafast-included-usage-rate",
    );
    expect(speed?.label).toMatch(/speed/iu);
    expect(speed?.statement).toContain("not billing rates");
    expect(rate?.label).toMatch(/not a speed figure/iu);
    expect(rate?.statement).toContain("don't describe speed increases");
  });

  it("states the five-hour position only as OpenAI's statement about Pro plans", () => {
    const five = version?.qualitativeLimits?.find((limit) => limit.id === "no-five-hour-limit");
    expect(five?.statement).toBe(
      "Pro plans currently have no five-hour limit. Weekly limits may also apply.",
    );
    expect(five?.sourceUrl).toBe("https://learn.chatgpt.com/docs/pricing");
  });
});

describe("GPT-6.1 Sol identity", () => {
  const index = createModelIdentityIndex(catalog);
  it("is its own canonical model, never an alias of GPT-6 Sol", () => {
    expect(catalog.models["gpt-6-1-sol"]?.name).toBe("GPT-6.1 Sol");
    expect(index.resolve("gpt-6.1-sol").canonicalId).toBe("gpt-6-1-sol");
    expect(index.resolve("gpt-6-sol").canonicalId).toBe("gpt-6-sol");
    expect(index.resolve("gpt-6-sol", { harness: "codex" }).canonicalId).toBe("gpt-6-sol");
    const sol = catalog.models["gpt-6-sol"];
    expect(sol?.aliases?.some((alias) => alias.alias.includes("6.1"))).toBe(false);
  });

  it("has its own prices, not GPT-6 Sol's", () => {
    const standard = tierPricingAt(catalog, "gpt-6-1-sol", "standard", "2026-09-29");
    expect(standard?.rates).toMatchObject({ input: "2.00", cacheRead: "0.10", output: "10.00" });
    const older = tierPricingAt(catalog, "gpt-6-sol", "standard", "2026-09-29");
    expect(older?.rates.cacheRead).not.toBe(standard?.rates.cacheRead);
  });
});

describe("processing tiers", () => {
  it("prices a documented tier exactly", () => {
    const fast = resolveServiceTier(catalog, "gpt-6-1-sol", "fast", "2026-09-29");
    expect(fast.priceable).toBe(true);
    expect(fast.pricing?.rates).toMatchObject({ input: "4.00", output: "20.00" });
    const batch = resolveServiceTier(catalog, "gpt-6-1-sol", "batch", "2026-09-29");
    expect(batch.pricing?.rates).toMatchObject({ input: "1.00", output: "5.00" });
    const astra = resolveServiceTier(catalog, "gpt-6-astra", "ultrafast", "2026-09-29");
    expect(astra.priceable).toBe(true);
    expect(astra.pricing?.rates).toMatchObject({ input: "60.00", output: "300.00" });
  });

  it("keeps a coming-soon tier out of replay, with no price inferred", () => {
    const ultrafast = resolveServiceTier(catalog, "gpt-6-1-sol", "ultrafast", "2026-09-29");
    expect(ultrafast).toMatchObject({ availability: "coming_soon", priceable: false });
    expect(ultrafast.pricing).toBeUndefined();
    expect(ultrafast.note).toMatch(/coming later/);
  });

  it("never falls back to Standard for a tier with no record", () => {
    const fast = resolveServiceTier(catalog, "gpt-6-sol", "fast", "2026-09-29");
    expect(fast.availability).toBe("not_recorded");
    expect(fast.pricing).toBeUndefined();
    expect(fast.priceable).toBe(false);
  });

  it("keeps tier records out of default price selection", () => {
    const tiered = Object.values(catalog.pricing).filter(
      (pricing) => (pricing.serviceTier ?? "standard") !== "standard",
    );
    expect(tiered.length).toBeGreaterThanOrEqual(7);
    for (const pricing of tiered) expect(isDefaultPriceRecord(pricing)).toBe(false);
  });

  it("lists tiers only where the model documents them", () => {
    expect(modelServiceTiers(catalog, "gpt-6-sol", "2026-09-29")).toEqual([]);
    expect(modelServiceTiers(catalog, "gpt-6-1-sol", "2026-09-29").map((t) => t.tier)).toEqual([
      "standard",
      "batch",
      "flex",
      "fast",
      "ultrafast",
    ]);
  });
});

describe("catalog wording", () => {
  it("never states a plan change as a token cut", () => {
    const dir = join(import.meta.dirname, "..", "data");
    for (const sub of ["plans", "models", "pricing"])
      for (const file of readdirSync(join(dir, sub))) {
        const text = readFileSync(join(dir, sub, file), "utf8");
        expect(text, `${sub}/${file}`).not.toMatch(
          /fewer tokens|half (the )?tokens|50% (fewer|less) tokens/i,
        );
      }
  });
});
