import { describe, expect, it } from "vitest";
import { basePrice, modelPrices } from "../market-discovery";
import { formatRate } from "../price-table";
import { loadPublicCatalog } from "../public-catalog";
import { FEATURED_MODEL_IDS, featuredModelComparison, featuredModels } from "./featured-models";

const catalog = loadPublicCatalog("2026-09-30");

describe("featured model comparison", () => {
  it("resolves every configured id to a catalog release", () => {
    const models = featuredModels(catalog);
    expect(models.map((model) => model.id)).toEqual([...FEATURED_MODEL_IDS]);
    for (const model of models) expect(model.kind).toBe("release");
  });

  it("leaves out an id the catalog does not know, and a family identity", () => {
    const models = featuredModels(catalog, ["claude-opus-5-5", "no-such-model", "claude-opus"]);
    expect(models.map((model) => model.id)).toEqual(["claude-opus-5-5"]);
  });

  it("is not a comparison with fewer than two models", () => {
    expect(featuredModelComparison(catalog, { ids: ["claude-opus-5-5", "nope"] })).toBe(undefined);
  });

  it("reads every price from the catalog's list-price records", () => {
    const comparison = featuredModelComparison(catalog);
    expect(comparison).toBeDefined();
    const price = comparison?.groups.find((group) => group.id === "price");
    comparison?.columns.forEach((column, index) => {
      const rates = basePrice(modelPrices(column.id, catalog.asOf))?.rates;
      for (const [row, key] of [
        ["input", "input"],
        ["cache-read", "cacheRead"],
        ["output", "output"],
      ] as const) {
        const cell = price?.rows.find((entry) => entry.id === row)?.cells[index];
        const rate = rates?.[key];
        expect(cell?.text).toBe(rate === undefined ? "Not listed" : formatRate(rate));
      }
    });
  });

  it("keeps a column's cells in its own position in every row", () => {
    const comparison = featuredModelComparison(catalog);
    for (const group of comparison?.groups ?? [])
      for (const row of group.rows) expect(row.cells).toHaveLength(comparison?.columns.length ?? 0);
  });

  it("carries the catalog family, so personal usage matches by identity", () => {
    const comparison = featuredModelComparison(catalog);
    const opus = comparison?.columns.find((column) => column.id === "claude-opus-5-5");
    expect(opus?.familyId).toBe(catalog.modelById("claude-opus-5-5")?.familyId);
  });

  it("shows no benchmark rows until reviewed, comparable evidence exists", () => {
    expect(featuredModelComparison(catalog)?.benchmarks).toEqual([]);
  });

  it("marks absent facts quietly instead of leading with them", () => {
    const comparison = featuredModelComparison(catalog, {
      ids: ["claude-opus-5-5", "gemini-4-argon"],
    });
    const cells = comparison?.groups.flatMap((group) => group.rows.flatMap((row) => row.cells));
    for (const cell of cells ?? []) {
      if (cell.absent === true) expect(cell.text).not.toMatch(/unknown|unavailable/iu);
      expect(cell.text).not.toMatch(/^not published$/iu);
    }
    expect(cells?.some((cell) => cell.absent === true)).toBe(true);
  });
});
