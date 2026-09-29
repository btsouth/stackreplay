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
import { selectPlanVersionAt } from "./versions.js";

/**
 * The OpenAI DevDay (Sep 29, 2026) catalog changes, read from the real
 * catalog: the ChatGPT Pro $200 revision and its history, Pro $500, GPT-6.1 Sol
 * as its own model, and processing tiers that price only what OpenAI prices.
 */

const catalog = loadDefaultCatalog();
const pro200 = catalog.plans["openai-chatgpt-pro-20x"];
if (pro200 === undefined) throw new Error("Pro $200 plan missing");

describe("ChatGPT Pro $200 revised terms", () => {
  it("shows the Sep 30 revision as officially scheduled on Sep 29", () => {
    const timeline = resolvePlanTimeline(pro200, "2026-09-29");
    expect(timeline.current?.revision).toBeUndefined();
    expect(timeline.scheduled?.effectiveFrom).toBe("2026-09-30");
    expect(timeline.scheduled?.announcedAt).toBe("2026-09-29");
    const value = timeline.scheduled?.revision?.relativeValue;
    expect(value).toMatchObject({
      measure: "api_equivalent_spend",
      ratio: "0.5",
      approximate: true,
      comparedTo: "previous_terms",
    });
    expect(value?.evidence[0]?.authority).toBe("provider_staff");
  });

  it("makes the revision current on Sep 30 from its structured date alone", () => {
    const before = resolvePlanTimeline(pro200, "2026-09-29");
    const on = resolvePlanTimeline(pro200, "2026-09-30");
    const after = resolvePlanTimeline(pro200, "2026-10-01");
    expect(before.current?.versionId).toBe("openai-chatgpt-pro-20x@2026-09-21");
    expect(on.current?.versionId).toBe("openai-chatgpt-pro-20x@2026-09-30");
    expect(after.current?.versionId).toBe("openai-chatgpt-pro-20x@2026-09-30");
    expect(on.scheduled).toBeUndefined();
    // The engine selects the same version on each day.
    expect(selectPlanVersionAt(pro200.versions, "2026-09-29")?.effectiveFrom).toBe("2026-09-29");
    expect(selectPlanVersionAt(pro200.versions, "2026-09-30")?.effectiveFrom).toBe("2026-09-30");
  });

  it("keeps the previous terms without a fabricated start date", () => {
    const timeline = resolvePlanTimeline(pro200, "2026-10-01");
    expect(timeline.previous?.startedAt).toBeUndefined();
    expect(timeline.previous?.endedAt).toBe("2026-09-29");
    expect(timeline.current?.startedAt).toBe("2026-09-30");
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

  it("lists the history in order, each entry dated", () => {
    const timeline = resolvePlanTimeline(pro200, "2026-10-01");
    expect(timeline.entries.map((entry) => [entry.date, entry.id])).toEqual([
      ["2026-09-10", "new-subscriptions-paused"],
      ["2026-09-29", "revised-terms-announced"],
      ["2026-09-30", "new-subscriptions-reopen"],
      ["2026-09-30", "revised-usage-terms"],
    ]);
    expect(timeline.entries.filter((entry) => entry.startsCurrentTerms).map((e) => e.id)).toEqual([
      "revised-usage-terms",
    ]);
  });

  it("does not describe the Sep 29 announcement before it was made", () => {
    const earlier = resolvePlanTimeline(pro200, "2026-09-20");
    expect(earlier.entries.map((entry) => entry.id)).toEqual(["new-subscriptions-paused"]);
    expect(earlier.scheduled).toBeUndefined();
  });
});

describe("ChatGPT Pro $500", () => {
  const pro500 = catalog.plans["openai-chatgpt-pro-500"];
  it("records only the published price and Ultrafast access, no invented allowance", () => {
    const version =
      pro500 === undefined ? undefined : selectPlanVersionAt(pro500.versions, "2026-09-29");
    expect(version?.price).toEqual({ currency: "USD", amount: "500", interval: "month" });
    expect(version?.limits).toEqual([]);
    const statements = (version?.qualitativeLimits ?? []).map((limit) => limit.statement).join(" ");
    expect(statements).toMatch(/Ultrafast/);
    expect(statements).not.toMatch(/25x|25×/);
    expect(selectPlanVersionAt(pro500?.versions ?? [], "2026-09-28")).toBeUndefined();
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
