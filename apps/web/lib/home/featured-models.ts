import { formatCatalogDate } from "../catalog-copy";
import { basePrice, type ModelPrices, modelPrices } from "../market-discovery";
import {
  modelCapabilities,
  modelContext,
  modelSpecifications,
  tokenSize,
} from "../model-specifications";
import { formatRate } from "../price-table";
import type { PublicCatalog, PublicModelSummary } from "../public-catalog";

/**
 * The homepage model comparison: a few current releases side by side.
 *
 * The configuration below holds canonical model ids only. Every fact shown is
 * read from the accepted catalog at render time, so nothing here can drift
 * from the Models pages. An id the catalog no longer knows (or that names a
 * family rather than a release) is left out rather than failing the page.
 *
 * Editorial selection, not a ranking: current releases from different
 * developers across a wide price range.
 */
export const FEATURED_MODEL_IDS = [
  "claude-opus-5-5",
  "gpt-6-1-sol",
  "gemini-3-1-pro",
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
}

export interface ComparisonRow {
  id: string;
  label: string;
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
   * Benchmark rows appear only when reviewed evidence gives every column a
   * result for the same benchmark, version, metric and task subset. None has
   * landed in this catalog yet, so this is empty.
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
  options: { ids?: readonly string[]; benchmarks?: readonly ComparisonRow[] } = {},
): ModelComparison | undefined {
  const models = featuredModels(catalog, options.ids);
  // One model is not a comparison.
  if (models.length < 2) return undefined;
  const prices = new Map(models.map((model) => [model.id, modelPrices(model.id, catalog.asOf)]));
  const priceOf = (model: PublicModelSummary) => prices.get(model.id) ?? [];

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
        row("input", "Input", (model) => rateCell(priceOf(model), "input"), true),
        row("cache-read", "Cached input", (model) => rateCell(priceOf(model), "cacheRead"), true),
        row("output", "Output", (model) => rateCell(priceOf(model), "output"), true),
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
      id: "capabilities",
      label: "Capabilities",
      rows: [
        row("capabilities", "Documented", (model) => {
          const capabilities = modelCapabilities(model);
          return capabilities.length === 0
            ? absent("None recorded")
            : { text: capabilities.join(" · ") };
        }),
      ],
    },
    {
      id: "access",
      label: "Where to use it",
      rows: [
        row("api", "Direct API", (model) => {
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

  return { asOf: catalog.asOf, columns, groups, benchmarks: options.benchmarks ?? [] };
}
