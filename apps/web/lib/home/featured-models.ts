import {
  type BenchmarkData,
  benchmarkEdition,
  benchmarkName,
  resolveComparison,
} from "@stackreplay/benchmarks";
import { benchmarkUrl } from "../benchmark-state";
import { formatCatalogDate } from "../catalog-copy";
import { basePrice, type ModelPrices, modelPrices } from "../market-discovery";
import { modelContext, modelSpecifications, tokenSize } from "../model-specifications";
import { formatRate } from "../price-table";
import { loadCatalog, type PublicCatalog, type PublicModelSummary } from "../public-catalog";

/**
 * The homepage model comparison: a few current releases side by side.
 *
 * The configuration below holds canonical model ids only. Every fact shown is
 * read from the accepted catalog at render time, so nothing here can drift
 * from the Models pages. An id the catalog no longer knows (or that names a
 * family rather than a release) is left out rather than failing the page.
 *
 * Editorial selection, not a ranking: the newest frontier release from each of five
 * major developers as of September 30, 2026, across a wide price range.
 */
export const FEATURED_MODEL_IDS = [
  "gpt-6-1-sol",
  "claude-opus-5-5",
  "gemini-4-argon",
  "grok-4-7",
  "deepseek-v4-1-flash",
] as const;

export interface ComparisonColumn {
  id: string;
  name: string;
  developer: string | undefined;
  href: string;
  released: string | undefined;
  /** Newest check of the model record or its list price. */
  checkedAt: string;
  /** Family identity record, for "an earlier release of this model" on the personal row. */
  familyId: string | undefined;
}

export interface ComparisonCell {
  text: string;
  /** Secondary words under the value ("context", "max input", plan names). */
  detail?: string | undefined;
  /** The value is absent from the catalog; rendered quietly. */
  absent?: boolean | undefined;
  /** Evidence link for this cell (benchmark rows carry one per score). */
  source?: { url: string; title: string } | undefined;
  /** The row's highest reported value (lowest where lower is better), ties included. */
  highest?: boolean | undefined;
}

export interface ComparisonRow {
  id: string;
  label: string;
  /** Secondary words under the row label (benchmark metric). */
  note?: string | undefined;
  /** Figures read down a column (prices, token counts) and are set in tabular figures. */
  numeric?: boolean | undefined;
  cells: readonly ComparisonCell[];
}

export interface ComparisonGroup {
  id: string;
  label: string;
  /** Shown once under the group label: units, basis. */
  note?: string | undefined;
  rows: readonly ComparisonRow[];
}

export interface ModelComparison {
  asOf: string;
  columns: readonly ComparisonColumn[];
  groups: readonly ComparisonGroup[];
  /**
   * Benchmark rows from the reviewed evidence package: exact definitions,
   * results for at least three of the columns (see `benchmarkRows`).
   */
  benchmarks: readonly ComparisonRow[];
}

const absent = (text: string): ComparisonCell => ({ text, absent: true });

function rateCell(prices: readonly ModelPrices[], key: "input" | "output" | "cacheRead") {
  const rate = basePrice(prices)?.rates[key];
  return rate === undefined ? absent("Not listed") : { text: formatRate(rate) };
}

/** Resolve the configured ids to releases the catalog still carries. */
export function featuredModels(
  catalog: PublicCatalog,
  ids: readonly string[] = FEATURED_MODEL_IDS,
): PublicModelSummary[] {
  return ids.flatMap((id) => {
    const model = catalog.modelById(id);
    return model !== undefined && model.kind === "release" ? [model] : [];
  });
}

export function featuredModelComparison(
  catalog: PublicCatalog,
  options: {
    ids?: readonly string[];
    /** Precomputed rows (tests); otherwise built from `benchmarkData`. */
    benchmarks?: readonly ComparisonRow[];
    /** The reviewed benchmark evidence package, validated at the public boundary. */
    benchmarkData?: BenchmarkData;
  } = {},
): ModelComparison | undefined {
  const models = featuredModels(catalog, options.ids);
  // One model is not a comparison.
  if (models.length < 2) return undefined;
  const prices = new Map(models.map((model) => [model.id, modelPrices(model.id, catalog.asOf)]));
  const priceOf = (model: PublicModelSummary) => prices.get(model.id) ?? [];
  const raw = loadCatalog();
  // An announced model with no API yet: say so instead of "Not listed".
  const notInApi = (model: PublicModelSummary) =>
    raw.models[model.id]?.apiAvailability === "not_established" && priceOf(model).length === 0;
  const priceCell = (model: PublicModelSummary, key: "input" | "output" | "cacheRead") =>
    notInApi(model) ? absent("Not yet in API") : rateCell(priceOf(model), key);

  const columns: ComparisonColumn[] = models.map((model) => {
    const checked = [model.lastVerifiedAt, ...priceOf(model).map((price) => price.lastVerifiedAt)]
      .sort()
      .at(-1);
    return {
      id: model.id,
      name: model.name,
      developer: model.developerName,
      href: `/models/${model.id}`,
      released:
        model.releaseDate === undefined ? undefined : formatCatalogDate(model.releaseDate.date),
      checkedAt: formatCatalogDate(checked ?? model.lastVerifiedAt),
      familyId: model.familyId,
    };
  });

  const row = (
    id: string,
    label: string,
    cell: (model: PublicModelSummary) => ComparisonCell,
    numeric = false,
  ): ComparisonRow => ({ id, label, numeric, cells: models.map(cell) });

  const groups: ComparisonGroup[] = [
    {
      id: "price",
      label: "API list price",
      note: "Standard tier, per 1M tokens",
      rows: [
        row("input", "Input", (model) => priceCell(model, "input"), true),
        row("cache-read", "Cached input", (model) => priceCell(model, "cacheRead"), true),
        row("output", "Output", (model) => priceCell(model, "output"), true),
      ],
    },
    {
      id: "limits",
      label: "Limits",
      rows: [
        row(
          "context",
          "Context",
          (model) => {
            const context = modelContext(model);
            return context.value === undefined
              ? absent("Not documented")
              : {
                  text: tokenSize(context.value),
                  ...(context.label === "context" ? {} : { detail: context.label }),
                };
          },
          true,
        ),
        row(
          "max-output",
          "Max output",
          (model) => {
            const value = modelSpecifications(model)?.maxOutputTokens;
            return value === undefined ? absent("Not documented") : { text: tokenSize(value) };
          },
          true,
        ),
      ],
    },
    {
      id: "access",
      label: "Where to use it",
      rows: [
        row("api", "Direct API", (model) => {
          if (notInApi(model)) return absent("Announced, not yet available");
          const apis = model.places.filter((place) => place.kind === "api");
          return apis.length === 0
            ? absent("Not established")
            : { text: apis.map((place) => place.label).join(", ") };
        }),
        row("plans", "Subscriptions", (model) => {
          const plans = model.places.filter((place) => place.kind === "plan");
          if (plans.length === 0) return absent("None catalogued");
          const named = plans.slice(0, 2).map((place) => place.label);
          const rest = plans.length - named.length;
          return {
            text: `${plans.length} ${plans.length === 1 ? "plan" : "plans"}`,
            detail: `${named.join(", ")}${rest > 0 ? ` +${rest} more` : ""}`,
          };
        }),
      ],
    },
  ];

  return {
    asOf: catalog.asOf,
    columns,
    groups,
    benchmarks:
      options.benchmarks ??
      (options.benchmarkData === undefined
        ? []
        : benchmarkRows(
            options.benchmarkData,
            models.map((model) => model.id),
          )),
  };
}

/** Fewest columns with a reported result before a benchmark row is worth showing. */
export const MIN_BENCHMARK_COVERAGE = 3;
export const MAX_BENCHMARK_ROWS = 4;

/**
 * Benchmark rows for the featured columns, from the reviewed evidence package.
 *
 * Each row is one exact benchmark definition (name, version, variant, metric
 * and task subset); variants are separate definitions, so nothing is blended.
 * A cell shows the evidence edition's primary observation for that model, the
 * same one the Benchmarks page shows, with its reporter. A row needs results
 * for at least three of the columns. The highest reported value is marked per
 * row, ties included, exactly as the Benchmarks page marks it; it does not
 * claim matching setups and there is no composite.
 */
export function benchmarkRows(
  data: BenchmarkData,
  modelIds: readonly string[],
  options: { minimum?: number; limit?: number } = {},
): ComparisonRow[] {
  const minimum = options.minimum ?? MIN_BENCHMARK_COVERAGE;
  const limit = options.limit ?? MAX_BENCHMARK_ROWS;
  // With fewer columns than the minimum, every column must report: a row is
  // never shown with fewer than three results unless there are fewer columns.
  const rows = resolveComparison(data, modelIds, { coverage: "all" })
    .map((row) => ({ row, present: row.cells.filter((cell) => cell.observation).length }))
    .filter((entry) => entry.present >= Math.min(minimum, modelIds.length));
  // Most columns covered first; definition order (the evidence package's) breaks ties.
  rows.sort((a, b) => b.present - a.present);
  return rows.slice(0, limit).map(({ row }) => ({
    id: `benchmark:${row.definition.id}`,
    label: benchmarkName(row.definition),
    note: row.definition.metric,
    numeric: true,
    cells: row.cells.map((cell): ComparisonCell => {
      const observation = cell.observation;
      if (observation === undefined) return absent("Not reported");
      return {
        text: observation.displayValue,
        detail: `Reported by ${observation.evaluator}`,
        source: {
          url: observation.sourceUrl,
          title: `${observation.evaluator}: ${benchmarkName(row.definition)}`,
        },
        highest: row.highestModelIds.includes(cell.modelId) ? true : undefined,
      };
    }),
  }));
}

/** The full benchmark sheet for exactly these models. */
export function benchmarkSheetHref(modelIds: readonly string[]): string {
  return benchmarkUrl({
    modelIds: [...modelIds],
    category: "all",
    coverage: "all",
    observationIds: [],
    edition: benchmarkEdition,
  });
}
