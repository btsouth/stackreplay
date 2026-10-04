import { benchmarkData, resolveComparison } from "@stackreplay/benchmarks";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelComparisonSection } from "@/components/home/model-comparison";
import { formatCatalogDate } from "../catalog-copy";
import { basePrice, modelPrices } from "../market-discovery";
import { numericRate } from "../market-prices";
import { modelSpecifications } from "../model-specifications";
import { formatRate } from "../price-table";
import { loadPublicBenchmarks } from "../public-benchmarks";
import { loadCatalog, loadPublicCatalog } from "../public-catalog";
import { homeCatalogIndex } from "./catalog-index";
import {
  benchmarkRows,
  benchmarkSheetHref,
  FEATURED_MODEL_IDS,
  featuredModelComparison,
  featuredModels,
  guidePriceScale,
  guideRateCell,
  inputModalitiesCell,
  MIN_BENCHMARK_COVERAGE,
} from "./featured-models";

const catalog = loadPublicCatalog("2026-09-30");
const evidence = loadPublicBenchmarks();

describe("featured model comparison", () => {
  it("resolves every configured id to a catalog release from a different developer", () => {
    const models = featuredModels(catalog);
    expect(models.map((model) => model.id)).toEqual([...FEATURED_MODEL_IDS]);
    for (const model of models) expect(model.kind).toBe("release");
    expect(new Set(models.map((model) => model.developerId)).size).toBe(models.length);
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
        if (rate !== undefined) expect(cell?.text).toBe(formatRate(rate));
        else expect(cell?.absent).toBe(true);
      }
    });
  });

  it("says an announced model is not yet in the API instead of inventing a price", () => {
    const comparison = featuredModelComparison(catalog);
    const index = comparison?.columns.findIndex((column) => column.id === "gemini-4-argon") ?? -1;
    expect(index).toBeGreaterThanOrEqual(0);
    const input = comparison?.groups[0]?.rows.find((row) => row.id === "input")?.cells[index];
    expect(input).toMatchObject({ absent: true, text: "Not yet in API" });
  });

  it("keeps a column's cells in its own position in every row", () => {
    const comparison = featuredModelComparison(catalog, { benchmarkData: evidence });
    for (const group of comparison?.groups ?? [])
      for (const row of group.rows) expect(row.cells).toHaveLength(comparison?.columns.length ?? 0);
    for (const row of comparison?.benchmarks ?? [])
      expect(row.cells).toHaveLength(comparison?.columns.length ?? 0);
  });

  it("carries the catalog family, so personal usage matches by identity", () => {
    const comparison = featuredModelComparison(catalog);
    const opus = comparison?.columns.find((column) => column.id === "claude-opus-5-5");
    expect(opus?.familyId).toBe(catalog.modelById("claude-opus-5-5")?.familyId);
  });
});

describe("featured model field guide", () => {
  const comparison = featuredModelComparison(catalog, { benchmarkData: evidence });
  if (comparison === undefined) throw new Error("featured comparison did not render");
  const guide = new Map(comparison.guide.map((row) => [row.id, row]));

  it("keeps the five editorial releases in canonical order", () => {
    expect(comparison.guide.map((row) => row.id)).toEqual([...FEATURED_MODEL_IDS]);
    expect(comparison.guide.map((row) => row.href)).toEqual(
      FEATURED_MODEL_IDS.map((id) => `/models/${id}`),
    );
  });

  it("projects documented input modalities, leaving an absent specification explicit", () => {
    for (const row of comparison.guide) {
      const model = catalog.modelById(row.id);
      if (model === undefined) throw new Error(`missing model ${row.id}`);
      const modalities = modelSpecifications(model)?.inputModalities;
      if (modalities === undefined || modalities.length === 0) {
        expect(row.modalities).toMatchObject({
          absent: true,
          text: "Input modalities not recorded",
        });
      } else {
        expect(row.modalities.text).toBe(
          modalities
            .map(
              (modality) =>
                ({
                  text: "Text input",
                  image: "Image input",
                  audio: "Audio input",
                  video: "Video input",
                  pdf: "PDF input",
                })[modality],
            )
            .join(", "),
        );
      }
    }

    const model = catalog.modelById("gpt-6-1-sol");
    if (model?.specifications === undefined) throw new Error("missing GPT-6.1 Sol specifications");
    expect(
      inputModalitiesCell({
        ...model,
        specifications: { ...model.specifications, inputModalities: undefined },
      }),
    ).toEqual({ absent: true, text: "Input modalities not recorded" });
  });

  it("keeps announced/no API, conditional rates and missing rates distinct", () => {
    const gemini = guide.get("gemini-4-argon");
    expect(gemini?.status).toBe("announced");
    expect(gemini?.price).toMatchObject({
      state: "unavailable",
      input: { absent: true, text: "Not yet in API" },
      output: { absent: true, text: "Not yet in API" },
      cacheRead: { absent: true, text: "Not yet in API" },
    });
    expect(gemini?.price.note).toContain("not established");

    for (const id of ["gpt-6-1-sol", "grok-4-7", "deepseek-v4-1-flash"]) {
      expect(guide.get(id)?.price.state, id).toBe("qualified");
      expect(guide.get(id)?.price.note, id).toContain("Conditional pricing");
    }
    expect(guide.get("claude-opus-5-5")?.price.state).toBe("qualified");
    expect(guide.get("claude-opus-5-5")?.price.note).toContain("route records conflict");
    expect(comparison.priceScale).toBeUndefined();
    expect(guideRateCell(undefined)).toEqual({ absent: true, text: "Not listed" });
  });

  it("qualifies DeepSeek's off-peak figures with its peak tier and open dates", () => {
    const deepseek = guide.get("deepseek-v4-1-flash");
    const record = loadCatalog().pricing["deepseek-v4-1-flash-pricing"];
    const tier = record?.tiers?.find((entry) => entry.id === "peak-hours");
    if (tier === undefined || !("utcWindows" in tier.when))
      throw new Error("missing DeepSeek peak schedule");
    const peakInput = numericRate(tier.rates, "input");
    const peakCacheRead = numericRate(tier.rates, "cacheRead");
    const peakOutput = numericRate(tier.rates, "output");
    if (peakInput === undefined || peakCacheRead === undefined || peakOutput === undefined)
      throw new Error("missing DeepSeek peak rates");

    expect(deepseek?.price).toMatchObject({
      state: "qualified",
      input: { text: "$0.15" },
      cacheRead: { text: "$0.003" },
      output: { text: "$0.60" },
    });
    expect(deepseek?.price.note).toContain("The displayed rates are off-peak/base rates.");
    expect(deepseek?.price.note).toContain(
      `During the peak window (${tier.label.replace(/^Peak:\s*/iu, "")}), the peak rates are ` +
        `input ${formatRate(peakInput)}, cached input ${formatRate(peakCacheRead)}, and output ${formatRate(peakOutput)}.`,
    );
    for (const date of tier.when.unestablishedUtcDates ?? [])
      expect(deepseek?.price.note).toContain(formatCatalogDate(date));
    expect(deepseek?.price.note).toContain(
      "The source does not establish whether peak rates apply on",
    );
    expect(deepseek?.price.note).toContain("those dates are not confirmed off-peak");
  });

  it("retains sub-cent precision in text and only plots strictly comparable rows", () => {
    expect(guide.get("deepseek-v4-1-flash")?.price.cacheRead.text).toBe("$0.003");

    const fixture = comparison.guide.map((row, index) =>
      index < 2
        ? {
            ...row,
            price: {
              ...row.price,
              state: "comparable" as const,
              input: { text: index === 0 ? "$0.003" : "$0.40" },
              output: { text: index === 0 ? "$0.02" : "$2.00" },
              cacheRead: { text: "$0.0015" },
              inputPerMillion: index === 0 ? "0.003" : "0.4",
              outputPerMillion: index === 0 ? "0.02" : "2",
              note: undefined,
            },
          }
        : row,
    );
    const scale = guidePriceScale(fixture);
    expect(scale?.max).toBe(2);
    expect(scale?.rows["gpt-6-1-sol"]?.input).toBeCloseTo(0.0015);
    expect(scale?.rows["claude-opus-5-5"]?.output).toBeCloseTo(1);
  });

  it("renders five guides and keeps the full table in a native disclosure", () => {
    const html = renderToStaticMarkup(
      createElement(ModelComparisonSection, {
        comparison,
        index: homeCatalogIndex(catalog),
        sheetHref: benchmarkSheetHref([...FEATURED_MODEL_IDS]),
      }),
    );
    expect(html.match(/data-guide-model=/gu) ?? []).toHaveLength(5);
    expect(html).toContain('data-testid="featured-model-guide"');
    expect(html).toContain('data-testid="home-full-comparison"');
    expect(html).toContain("Prices, limits, access and reported benchmarks");
    expect(html).not.toContain('data-testid="price-bar-scale"');

    const fixture = comparison.guide.map((row, index) =>
      index < 2
        ? {
            ...row,
            price: {
              ...row.price,
              state: "comparable" as const,
              input: { text: index === 0 ? "$0.003" : "$0.40" },
              output: { text: index === 0 ? "$0.02" : "$2.00" },
              cacheRead: { text: "$0.0015" },
              inputPerMillion: index === 0 ? "0.003" : "0.4",
              outputPerMillion: index === 0 ? "0.02" : "2",
              note: undefined,
            },
          }
        : row,
    );
    const withScale = {
      ...comparison,
      guide: fixture,
      priceScale: guidePriceScale(fixture),
    };
    const scaledHtml = renderToStaticMarkup(
      createElement(ModelComparisonSection, {
        comparison: withScale,
        index: homeCatalogIndex(catalog),
        sheetHref: benchmarkSheetHref([...FEATURED_MODEL_IDS]),
      }),
    );
    expect(scaledHtml).toContain('data-testid="price-bar-scale"');
    expect(scaledHtml.match(/class="home-guide-bar"/gu) ?? []).toHaveLength(4);
  });

  it("renders DeepSeek's off-peak figures beside the peak qualification", () => {
    const html = renderToStaticMarkup(
      createElement(ModelComparisonSection, {
        comparison,
        index: homeCatalogIndex(catalog),
        sheetHref: benchmarkSheetHref([...FEATURED_MODEL_IDS]),
      }),
    );
    const start = html.indexOf('data-guide-model="deepseek-v4-1-flash"');
    const end = html.indexOf("</li>", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const row = html.slice(start, end);
    expect(row).toContain("$0.15");
    expect(row).toContain("$0.003");
    expect(row).toContain("$0.60");
    expect(row).toContain(guide.get("deepseek-v4-1-flash")?.price.note ?? "missing price note");
  });
});

describe("benchmark rows on the homepage", () => {
  const ids = [...FEATURED_MODEL_IDS];
  const comparison = featuredModelComparison(catalog, { benchmarkData: evidence });

  it("consumes the verified benchmark package: rows exist when shared evidence exists", () => {
    const shared = resolveComparison(benchmarkData, ids, { coverage: "all" }).filter(
      (row) => row.cells.filter((cell) => cell.observation).length >= MIN_BENCHMARK_COVERAGE,
    );
    expect(shared.length).toBeGreaterThan(0);
    expect(comparison?.benchmarks.length).toBeGreaterThan(0);
  });

  it("shows each cell's primary observation exactly, with its reporter and source", () => {
    const resolved = resolveComparison(benchmarkData, ids, { coverage: "all" });
    for (const row of comparison?.benchmarks ?? []) {
      const definitionId = row.id.replace(/^benchmark:/u, "");
      const source = resolved.find((entry) => entry.definition.id === definitionId);
      expect(source, row.id).toBeDefined();
      row.cells.forEach((cell, index) => {
        const observation = source?.cells[index]?.observation;
        if (observation === undefined) expect(cell.absent).toBe(true);
        else {
          expect(cell.text).toBe(observation.displayValue);
          expect(cell.detail).toBe(`Reported by ${observation.evaluator}`);
          expect(cell.source?.url).toBe(observation.sourceUrl);
        }
      });
    }
  });

  it("uses one exact definition per row: no blended versions, no composite row", () => {
    const labels = comparison?.benchmarks.map((row) => row.label) ?? [];
    expect(new Set(labels).size).toBe(labels.length);
    for (const row of comparison?.benchmarks ?? []) {
      const definition = benchmarkData.definitions.find(
        (entry) => `benchmark:${entry.id}` === row.id,
      );
      expect(definition, row.id).toBeDefined();
      expect(row.note).toBe(definition?.metric);
    }
    expect(labels.some((label) => /composite|average|overall/iu.test(label))).toBe(false);
  });

  it("marks only the row's highest reported value, ties included", () => {
    const resolved = resolveComparison(benchmarkData, ids, { coverage: "all" });
    for (const row of comparison?.benchmarks ?? []) {
      const source = resolved.find((entry) => `benchmark:${entry.definition.id}` === row.id);
      row.cells.forEach((cell, index) => {
        const modelId = ids[index] as string;
        expect(cell.highest === true, `${row.id}/${modelId}`).toBe(
          source?.highestModelIds.includes(modelId) ?? false,
        );
      });
    }
  });

  it("shows at most three rows, each bar the percent score on its own 0-100% scale", () => {
    expect(comparison?.benchmarks.length).toBeLessThanOrEqual(3);
    const resolved = resolveComparison(benchmarkData, ids, { coverage: "all" });
    for (const row of comparison?.benchmarks ?? []) {
      const source = resolved.find((entry) => `benchmark:${entry.definition.id}` === row.id);
      row.cells.forEach((cell, index) => {
        const observation = source?.cells[index]?.observation;
        if (observation === undefined || source?.definition.unit !== "percent")
          expect(cell.bar).toBeUndefined();
        else expect(cell.bar).toBeCloseTo(observation.value / 100, 10);
      });
    }
  });

  it("requires results for at least three of the columns", () => {
    for (const row of comparison?.benchmarks ?? [])
      expect(row.cells.filter((cell) => !cell.absent).length).toBeGreaterThanOrEqual(
        MIN_BENCHMARK_COVERAGE,
      );
    expect(benchmarkRows(benchmarkData, ["grok-4-7", "deepseek-v4-1-flash"])).toHaveLength(
      resolveComparison(benchmarkData, ["grok-4-7", "deepseek-v4-1-flash"], {
        coverage: "all",
      }).filter((row) => row.cells.every((cell) => cell.observation)).length,
    );
  });

  it("links to the benchmark sheet for exactly these models", () => {
    expect(benchmarkSheetHref(ids)).toContain(`models=${ids.join("%2C")}`);
  });
});
