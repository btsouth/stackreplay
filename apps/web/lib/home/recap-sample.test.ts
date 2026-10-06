import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { describe, expect, it } from "vitest";
import { sampleRecap as r, sampleGithub } from "./recap-sample";

describe("public fictional history", () => {
  it("uses current catalog models and a heavy cache-dominated month", () => {
    const catalog = loadBundledCatalog();
    expect(r.days).toHaveLength(30);
    expect(r.total).toBeGreaterThan(15e9);
    expect(r.total).toBeLessThan(25e9);
    expect(r.models).toHaveLength(12);
    expect(new Set(r.models.map((m) => m.family))).toEqual(
      new Set(["anthropic", "openai", "deepseek", "z-ai", "google"]),
    );
    for (const model of r.models) {
      expect(catalog.models[model.id]?.name).toBe(model.name);
      expect(catalog.models[model.id]?.lifecycle ?? "current").toBe("current");
    }
    expect(r.deep?.buckets.read).toBeGreaterThan(r.total * 0.95);
    expect(r.priced / r.records).toBeGreaterThan(0.95);
    expect(Number(r.usd)).toBeGreaterThan(1000);
    expect(r.deep?.speeds).toHaveLength(12);
    for (const speed of r.deep?.speeds ?? []) {
      expect(speed.n).toBeGreaterThanOrEqual(50);
      expect(speed.median).toBeGreaterThan(20);
      expect(speed.median).toBeLessThan(150);
    }
  });
  it("has quiet days, a clear peak, evening and weekend activity and consistent aggregates", () => {
    const days = r.explorer?.days ?? [];
    expect(days.some((day) => day.records === 0)).toBe(true);
    const totals = days.map((day) => day.total).sort((a, b) => a - b);
    expect(totals.at(-1)).toBeGreaterThan((totals[15] ?? 0) * 2);
    expect(days.reduce((sum, day) => sum + day.total, 0)).toBe(r.total);
    expect(r.busiestHour).toBeGreaterThanOrEqual(19);
    expect(r.lateNightShare).toBeGreaterThan(0.05);
    expect(r.deep?.weekendShare).toBeGreaterThan(0.15);
    expect(Object.keys(sampleGithub)).toEqual(r.days.map((day) => day.date));
    expect(new Set(Object.values(sampleGithub)).size).toBeGreaterThan(15);
  });
});
