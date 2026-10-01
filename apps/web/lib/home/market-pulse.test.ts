import { planTimelineInputOf, pricingServiceTierOf } from "@stackreplay/catalog";
import { resolvePlanTimeline } from "@stackreplay/catalog/timeline";
import { describe, expect, it } from "vitest";
import { isSyntheticCatalogId, loadCatalog, loadPublicCatalog } from "../public-catalog";
import {
  latestChangeDate,
  listPriceChanges,
  marketChanges,
  type PulseItem,
  selectPulse,
} from "./market-pulse";

const AS_OF = "2026-09-30";
const catalog = loadPublicCatalog(AS_OF);
const raw = loadCatalog();
const changes = marketChanges(catalog);

describe("market changes come from real catalog records only", () => {
  it("finds changes in more than one category", () => {
    expect(new Set(changes.map((item) => item.category)).size).toBeGreaterThan(1);
  });

  it("dates every model row with the developer-published release day", () => {
    const models = changes.filter((item) => item.category === "model");
    expect(models.length).toBeGreaterThan(0);
    for (const item of models) {
      const [id] = item.modelIds;
      expect(id).toBeDefined();
      const model = raw.models[id as string];
      expect(model?.releaseDate?.date).toBe(item.date);
      expect(item.href).toBe(`/models/${id}`);
      expect(item.source?.url).toBe(model?.releaseDate?.sources[0]?.url);
    }
  });

  it("builds plan rows from dated, evidenced plan history, not catalog version dates", () => {
    const plans = changes.filter((item) => item.category === "plan");
    expect(plans.length).toBeGreaterThan(0);
    for (const item of plans) {
      const [planId] = item.planIds;
      const record = raw.plans[planId as string];
      expect(record).toBeDefined();
      const timeline = resolvePlanTimeline(planTimelineInputOf(record as never), AS_OF);
      const entries = timeline.entries.filter((entry) => entry.date === item.date);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) expect(item.change).toContain(entry.title);
      expect(item.source?.url).toMatch(/^https:\/\//u);
    }
  });

  it("reports a price change only where a later list price replaces different rates", () => {
    for (const change of listPriceChanges(raw)) {
      expect(change.to.modelId).toBe(change.from.modelId);
      expect(change.to.effectiveFrom > change.from.effectiveFrom).toBe(true);
      expect(JSON.stringify(change.to.rates)).not.toBe(JSON.stringify(change.from.rates));
    }
    const prices = changes.filter((item) => item.category === "price");
    for (const item of prices) {
      for (const modelId of item.modelIds)
        expect(
          listPriceChanges(raw).some(
            (change) => change.modelId === modelId && change.to.effectiveFrom === item.date,
          ),
        ).toBe(true);
      // A rate move is stated with the published figures on both sides.
      expect(item.change).toMatch(/\$[\d.]+ → \$[\d.]+/u);
    }
  });

  it("never lists a model's first price record on a route as a price change", () => {
    const earliest = new Map<string, { id: string; effectiveFrom: string }>();
    for (const price of Object.values(raw.pricing)) {
      if (price.basis !== "api_list_price") continue;
      const key = [
        price.modelId,
        price.endpointId ?? "",
        price.variantId ?? "",
        pricingServiceTierOf(price),
      ].join("|");
      const known = earliest.get(key);
      if (known === undefined || price.effectiveFrom < known.effectiveFrom)
        earliest.set(key, { id: price.id, effectiveFrom: price.effectiveFrom });
    }
    const replaced = new Set(listPriceChanges(raw).map((change) => change.to.id));
    for (const first of earliest.values()) expect(replaced.has(first.id)).toBe(false);
  });

  it("never exposes a synthetic catalog id", () => {
    for (const item of changes) {
      for (const id of [...item.modelIds, ...item.planIds])
        expect(isSyntheticCatalogId(id)).toBe(false);
    }
  });

  it("has no benchmark rows until reviewed benchmark evidence is supplied", () => {
    expect(changes.some((item) => item.category === "benchmark")).toBe(false);
  });

  it("marks changes dated after the catalog day as scheduled", () => {
    for (const item of changes)
      expect(item.timing).toBe(item.date > catalog.asOf ? "scheduled" : "past");
  });
});

describe("selectPulse", () => {
  const item = (id: string, category: PulseItem["category"], date: string): PulseItem => ({
    id,
    category,
    date,
    timing: "past",
    subject: id,
    href: "/",
    change: id,
    modelIds: [],
    planIds: [],
  });

  it("shows every category that has records before any category repeats", () => {
    const items = [
      item("m1", "model", "2026-09-30"),
      item("m2", "model", "2026-09-29"),
      item("m3", "model", "2026-09-28"),
      item("p1", "plan", "2026-09-10"),
      item("r1", "price", "2026-08-01"),
    ];
    const chosen = selectPulse(items, { limit: 4 });
    expect(chosen.map((entry) => entry.id)).toEqual(["m1", "m2", "p1", "r1"]);
  });

  it("fills with real rows from other categories when one has none, never a placeholder", () => {
    const items = [
      item("m1", "model", "2026-09-30"),
      item("m2", "model", "2026-09-29"),
      item("p1", "plan", "2026-09-10"),
      item("p2", "plan", "2026-09-09"),
    ];
    const chosen = selectPulse(items, { limit: 5 });
    expect(chosen.map((entry) => entry.id)).toEqual(["m1", "m2", "p1", "p2"]);
    expect(chosen.some((entry) => entry.category === "price")).toBe(false);
  });

  it("reports the newest past change and ignores scheduled ones", () => {
    expect(
      latestChangeDate([
        item("a", "model", "2026-09-28"),
        { ...item("b", "price", "2027-01-01"), timing: "scheduled" },
      ]),
    ).toBe("2026-09-28");
  });

  it("selects real rows from this catalog", () => {
    const pulse = selectPulse(changes);
    expect(pulse.length).toBeGreaterThan(0);
    expect(pulse.length).toBeLessThanOrEqual(5);
    for (const entry of pulse) expect(changes).toContain(entry);
  });
});
