import {
  type BenchmarkData,
  benchmarkEdition,
  benchmarkName,
  resolveComparison,
} from "@stackreplay/benchmarks";
import { selectApiTokenEstimate } from "../api-token-estimate-source";
import { benchmarkUrl } from "../benchmark-state";
import { formatCatalogDate } from "../catalog-copy";
import { basePrice, type ModelPrices, modelPrices } from "../market-discovery";
import { numericRate } from "../market-prices";
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
  /** Announced with no API yet, or released. */
  status: "announced" | "released";
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
  /** Who reported a benchmark score. */
  reporter?: string | undefined;
  /**
   * Bar length for a percent score: the reported value over 100, so every bar
   * in a row shares the benchmark's own 0-100% scale. Never set for other
   * units, and never normalized against the row or another benchmark.
   */
  bar?: number | undefined;
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

export interface GuidePrice {
  /**
   * Comparable rates come from one verified, current, unconditional Standard
   * API list-price record. Qualified rates are the selected record's base
   * values with the record's own condition shown beside them. Unavailable
   * rates are not substituted from another record.
   */
  state: "comparable" | "qualified" | "unavailable";
  input: ComparisonCell;
  output: ComparisonCell;
  cacheRead: ComparisonCell;
  /** Exact decimal strings, present only for comparable rows. */
  inputPerMillion?: string | undefined;
  outputPerMillion?: string | undefined;
  note?: string | undefined;
}

export interface GuideModel {
  id: string;
  name: string;
  developer: string | undefined;
  href: string;
  released: string | undefined;
  status: "announced" | "released";
  checkedAt: string;
  price: GuidePrice;
  modalities: ComparisonCell;
  context: ComparisonCell;
  maxInput: ComparisonCell;
  subscriptions: {
    text: string;
    detail?: string | undefined;
  };
}

export interface GuidePriceScale {
  /** Largest exact input/output rate shared by every eligible row. */
  max: number;
  /** Fractions of `max`, keyed by model id. Bars are zero-based and linear. */
  rows: Readonly<Record<string, { input: number; output: number }>>;
}

export interface ModelComparison {
  asOf: string;
  columns: readonly ComparisonColumn[];
  groups: readonly ComparisonGroup[];
  guide: readonly GuideModel[];
  /** Present only when at least two rows have strictly comparable rates. */
  priceScale?: GuidePriceScale | undefined;
  /**
   * Benchmark rows from the reviewed evidence package: exact definitions,
   * results for at least three of the columns (see `benchmarkRows`).
   */
  benchmarks: readonly ComparisonRow[];
}

const absent = (text: string): ComparisonCell => ({ text, absent: true });

/** Exact published rate text; an absent rate is never rendered as zero. */
export function guideRateCell(rate: string | undefined): ComparisonCell {
  return rate === undefined ? absent("Not listed") : { text: formatRate(rate) };
}

const INPUT_MODALITY_LABELS: Record<"text" | "image" | "audio" | "video" | "pdf", string> = {
  text: "Text input",
  image: "Image input",
  audio: "Audio input",
  video: "Video input",
  pdf: "PDF input",
};

/** Documented input modalities; an absent specification is not a claim of unsupported input. */
export function inputModalitiesCell(model: PublicModelSummary): ComparisonCell {
  const modalities = modelSpecifications(model)?.inputModalities;
  if (modalities === undefined || modalities.length === 0)
    return absent("Input modalities not recorded");
  return { text: modalities.map((modality) => INPUT_MODALITY_LABELS[modality]).join(", ") };
}

function rateCell(prices: readonly ModelPrices[], key: "input" | "output" | "cacheRead") {
  const rate = basePrice(prices)?.rates[key];
  return guideRateCell(rate);
}

/**
 * Shared linear scale for marked comparable rates. Fewer than two rows, or no
 * positive rate, means no graphic: text remains the complete presentation.
 */
export function guidePriceScale(rows: readonly GuideModel[]): GuidePriceScale | undefined {
  const eligible = rows.flatMap((row) => {
    if (row.price.state !== "comparable") return [];
    const input = Number(row.price.inputPerMillion);
    const output = Number(row.price.outputPerMillion);
    if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return [];
    return [{ id: row.id, input, output }];
  });
  if (eligible.length < 2) return undefined;
  const max = Math.max(...eligible.flatMap((row) => [row.input, row.output]));
  if (max <= 0) return undefined;
  return {
    max,
    rows: Object.fromEntries(
      eligible.map((row) => [
        row.id,
        {
          input: row.input / max,
          output: row.output / max,
        },
      ]),
    ),
  };
}

function unavailablePriceNote(
  reason:
    | "no_current_base"
    | "unverified"
    | "ambiguous"
    | "conditional"
    | "promotion"
    | "invalid_rates",
): string {
  switch (reason) {
    case "no_current_base":
      return "No current standard API list rate is recorded.";
    case "unverified":
      return "A current rate is recorded but not verified, so it is not shown as a comparison.";
    case "ambiguous":
      return "Current standard API list rates conflict, so no single rate is selected.";
    case "conditional":
      return "The current rate is conditional and could not be matched to displayed base rates.";
    case "promotion":
      return "The current rate is promotional and could not be matched to displayed base rates.";
    case "invalid_rates":
      return "The current record does not contain valid input and output token rates.";
  }
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
  const guidePrice = (model: PublicModelSummary): GuidePrice => {
    if (notInApi(model)) {
      return {
        state: "unavailable",
        input: absent("Not yet in API"),
        output: absent("Not yet in API"),
        cacheRead: absent("Not yet in API"),
        note: "Announced; a standard API list rate is not established.",
      };
    }
    const eligibility = selectApiTokenEstimate(Object.values(raw.pricing), model.id, catalog.asOf);
    if (eligibility.state === "eligible") {
      const record = raw.pricing[eligibility.pricingId];
      return {
        state: "comparable",
        input: guideRateCell(eligibility.inputRatePerMillion),
        output: guideRateCell(eligibility.outputRatePerMillion),
        cacheRead: guideRateCell(
          record === undefined ? undefined : numericRate(record.rates, "cacheRead"),
        ),
        inputPerMillion: eligibility.inputRatePerMillion,
        outputPerMillion: eligibility.outputRatePerMillion,
        note: "Verified, unconditional Standard API list rate.",
      };
    }

    const price = basePrice(priceOf(model));
    if (
      eligibility.reason === "ambiguous" &&
      price !== undefined &&
      price.endpointId !== undefined
    ) {
      return {
        state: "qualified",
        input: guideRateCell(price.rates.input),
        output: guideRateCell(price.rates.output),
        cacheRead: guideRateCell(price.rates.cacheRead),
        note: "Comparable pricing is unavailable because current route records conflict. These are the current explicit-route base rates; no bar is drawn.",
      };
    }
    if (
      eligibility.reason === "conditional" &&
      price !== undefined &&
      (price.tiers?.length ?? 0) > 0
    ) {
      return {
        state: "qualified",
        input: guideRateCell(price.rates.input),
        output: guideRateCell(price.rates.output),
        cacheRead: guideRateCell(price.rates.cacheRead),
        note: `Conditional pricing: ${price.tiers?.map((tier) => tier.label).join(" · ")}.${model.pricingNote === undefined ? "" : ` ${model.pricingNote}`}`,
      };
    }
    if (
      eligibility.reason === "promotion" &&
      price !== undefined &&
      price.promotion !== undefined
    ) {
      return {
        state: "qualified",
        input: guideRateCell(price.rates.input),
        output: guideRateCell(price.rates.output),
        cacheRead: guideRateCell(price.rates.cacheRead),
        note: `Promotional rate: ${price.promotion.label}.${model.pricingNote === undefined ? "" : ` ${model.pricingNote}`}`,
      };
    }
    return {
      state: "unavailable",
      input: absent("Not listed"),
      output: absent("Not listed"),
      cacheRead: absent("Not listed"),
      note: unavailablePriceNote(eligibility.reason),
    };
  };

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
      status: notInApi(model) ? "announced" : "released",
    };
  });
  const guide: GuideModel[] = models.flatMap((model, index) => {
    const column = columns[index];
    if (column === undefined) return [];
    const specs = modelSpecifications(model);
    const plans = model.places.filter((place) => place.kind === "plan");
    const namedPlans = plans.slice(0, 2).map((place) => place.label);
    const rest = plans.length - namedPlans.length;
    return [
      {
        id: column.id,
        name: column.name,
        developer: column.developer,
        href: column.href,
        released: column.released,
        status: column.status,
        checkedAt: column.checkedAt,
        price: guidePrice(model),
        modalities: inputModalitiesCell(model),
        context:
          specs?.contextTokens === undefined
            ? absent("Not documented")
            : { text: tokenSize(specs.contextTokens) },
        maxInput:
          specs?.maxInputTokens === undefined
            ? absent("Not documented")
            : { text: tokenSize(specs.maxInputTokens) },
        subscriptions: {
          text:
            plans.length === 0
              ? "None catalogued"
              : `${plans.length} ${plans.length === 1 ? "plan" : "plans"}`,
          ...(namedPlans.length === 0
            ? {}
            : { detail: `${namedPlans.join(", ")}${rest > 0 ? ` +${rest} more` : ""}` }),
        },
      },
    ];
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
    guide,
    priceScale: guidePriceScale(guide),
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
/** Three rows read at a glance; the full sheet is one click away. */
export const MAX_BENCHMARK_ROWS = 3;

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
        reporter: observation.evaluator,
        source: {
          url: observation.sourceUrl,
          title: `${observation.evaluator}: ${benchmarkName(row.definition)}`,
        },
        bar:
          row.definition.unit === "percent"
            ? Math.min(1, Math.max(0, observation.value / 100))
            : undefined,
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
