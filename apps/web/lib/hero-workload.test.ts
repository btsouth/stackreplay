import { describe, expect, it } from "vitest";
import rawFixture from "./generated/hero-workload.json";
import {
  formatDay,
  formatMoney,
  heroTargetView,
  loadHeroWorkload,
  splitMoney,
} from "./hero-workload";
import { currentVersionOf, loadCatalog } from "./public-catalog";

const hero = loadHeroWorkload();
const text = JSON.stringify(rawFixture);
const view = (id: string) => {
  const target = hero.targets.find((entry) => entry.id === id);
  if (target === undefined) throw new Error(`missing target ${id}`);
  return heroTargetView(hero, target);
};
const allCopy = hero.targets
  .map((target) => JSON.stringify(heroTargetView(hero, target)))
  .join("\n");

describe("the homepage's anonymized real workload", () => {
  it("is labeled as an anonymized real workload, not a visitor's own", () => {
    expect(hero.label).toBe("Anonymized real workload");
  });

  it("carries aggregates only: no identifiers, paths, or times of day", () => {
    // Nothing finer than a calendar day anywhere in the file.
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u);
    for (const day of hero.workload.days) expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    // No source identifiers or local metadata, by key or by shape.
    expect(text).not.toMatch(
      /"(sessionId|nativeSessionHash|nativeEventHash|projectHash|cwd|path|rawName|localProjects)"/u,
    );
    expect(text).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/u);
    expect(text).not.toMatch(/(?:^|["\s])\/(?:home|Users|data|tmp)\//u);
    expect(text).not.toMatch(/[A-Za-z]:\\\\/u);
    // Model mix is canonical display names, not raw provider spellings.
    for (const row of hero.workload.modelMix) expect(row.name).not.toMatch(/^[a-z0-9.-]+$/u);
  });

  it("never falls back to the synthetic example namespace", () => {
    expect(text).not.toMatch(/example[- ]cloud|example-/iu);
    expect(allCopy).not.toMatch(/example[- ]cloud|example-|synthetic/iu);
  });

  it("replays against real catalog targets whose facts match the catalog", () => {
    const catalog = loadCatalog();
    for (const target of hero.targets) {
      if (target.kind === "api") {
        expect(catalog.providers[target.reference]).toBeDefined();
        continue;
      }
      const [planId] = target.reference.split("@");
      const version = currentVersionOf(catalog, planId ?? "", hero.rulesAsOf);
      expect(version?.versionId, target.id).toBe(target.reference);
      expect(Number(version?.price.amount)).toBe(Number(target.price?.amount));
      if (target.result.class === "allowance-exhausted") {
        const limit = version?.limits[0];
        expect(Number(limit?.amount)).toBe(Number(target.result.allowance.amount));
      }
    }
  });

  it("offers materially different result classes, each with its own language", () => {
    expect(new Set(hero.targets.map((target) => target.result.class))).toEqual(
      new Set(["allowance-exhausted", "capacity-unpublished", "published-rate"]),
    );

    const copilot = view("copilot-pro-plus");
    expect(copilot.result.status.map((status) => status.text)).toEqual(["Allowance exhausted"]);
    expect(copilot.result.sentence).toMatch(/^First crossing [A-Z][a-z]{2} \d{1,2}\./u);
    expect(copilot.crossed).toBe(true);
    expect(copilot.layers[2].value).toMatch(/^\d+ crossed$/u);

    const chatgpt = view("chatgpt-pro");
    expect(chatgpt.result.status.map((status) => status.text)).toEqual([
      "Models mapped",
      "Capacity not published",
    ]);
    expect(chatgpt.result.figure.unit).toBe("/ month");
    expect(chatgpt.crossed).toBe(false);

    const claude = view("claude-max");
    expect(claude.replayClass).toBe("Translated replay");
    expect(claude.mapping.length).toBeGreaterThan(0);
    expect(claude.result.status[0]?.text).toBe("Models translated");
    expect(claude.result.ledger[0]?.note).toMatch(/not a claim that the models are equivalent/u);

    const api = view("openai-api");
    expect(api.result.status[0]?.text).toBe("Published-rate equivalent");
    expect(api.result.sentence).toMatch(/not what was paid/u);
    expect(api.layers[2].value).toBe("No allowance");
  });

  it("keeps the chronology consistent with the engine's own counts", () => {
    const copilot = hero.targets.find((target) => target.id === "copilot-pro-plus");
    if (copilot?.result.class !== "allowance-exhausted") throw new Error("expected a crossing");
    const days = hero.workload.days;
    expect(days.reduce((sum, day) => sum + day.events, 0)).toBe(hero.workload.replayedEvents);
    const above = (copilot.overPerDay ?? []).reduce((sum, value) => sum + value, 0);
    expect(Math.abs(above - copilot.result.above)).toBeLessThanOrEqual(
      copilot.result.crossings.length,
    );
    const tape = view("copilot-pro-plus").tape;
    for (const crossing of tape.crossings) {
      expect(days[crossing.dayIndex]?.date).toBe(crossing.date);
    }
    for (const share of tape.above) {
      expect(share).toBeGreaterThanOrEqual(0);
      expect(share).toBeLessThanOrEqual(1);
    }
  });

  it("formats money with thousands separators and days without a time", () => {
    expect(splitMoney("1793.32")).toEqual({ whole: "$1,793", cents: ".32" });
    expect(formatMoney("200.00")).toBe("$200");
    expect(formatMoney("1933.3")).toBe("$1,933.30");
    expect(formatDay("2026-08-23")).toBe("Aug 23");
  });

  it("writes its copy without em or en dashes", () => {
    expect(allCopy).not.toMatch(/[–—]/u);
  });
});
