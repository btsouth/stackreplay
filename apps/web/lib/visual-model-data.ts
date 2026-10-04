import {
  type BenchmarkData,
  type BenchmarkObservation,
  benchmarkName,
  resolveComparison,
} from "@stackreplay/benchmarks";
import { basePrice, modelPrices } from "./market-discovery";
import { modelSpecifications } from "./model-specifications";
import { formatRate } from "./price-table";
import type { PublicCatalog } from "./public-catalog";

export interface VisualModel {
  id: string;
  name: string;
  developer: string;
  lab: string;
  input?: string | undefined;
  output?: string | undefined;
  cached?: string | undefined;
  blended?: string | undefined;
  context?: number | undefined;
  plans: { id: string; name: string; price: string }[];
  details: string[];
  sources: { url: string; title: string }[];
}
export interface VisualBenchmark {
  id: string;
  name: string;
  unit: string;
  higherIsBetter: boolean;
  coverage: number;
  description: string;
  scores: Record<string, BenchmarkObservation>;
}
export interface VisualData {
  models: VisualModel[];
  benchmarks: VisualBenchmark[];
  asOf: string;
}

/** Exact decimal blend; convert to Number only at the SVG geometry boundary. */
export function blendedPrice(
  input: string | undefined,
  output: string | undefined,
): string | undefined {
  if (
    input === undefined ||
    output === undefined ||
    !/^\d+(\.\d+)?$/u.test(input) ||
    !/^\d+(\.\d+)?$/u.test(output)
  )
    return undefined;
  const digits = Math.max(input.split(".")[1]?.length ?? 0, output.split(".")[1]?.length ?? 0);
  const integer = (value: string) =>
    BigInt(
      value
        .replace(".", "")
        .padEnd(value.replace(".", "").length + digits - (value.split(".")[1]?.length ?? 0), "0"),
    );
  const numerator = (integer(input) * 3n + integer(output)) * 25n;
  const scale = 10n ** BigInt(digits + 2);
  const whole = numerator / scale;
  const fraction = (numerator % scale)
    .toString()
    .padStart(digits + 2, "0")
    .replace(/0+$/u, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/** Count distinct models, not observations; preserve the edition's primary choices. */
export function benchmarkCoverage(
  data: BenchmarkData,
  modelIds: readonly string[],
): VisualBenchmark[] {
  const rows = new Map<string, VisualBenchmark>();
  for (const modelId of modelIds) {
    for (const row of resolveComparison(data, [modelId], { coverage: "all" })) {
      const observation = row.cells[0]?.observation;
      if (!observation) continue;
      const entry = rows.get(row.definition.id) ?? {
        id: row.definition.id,
        name: benchmarkName(row.definition),
        unit: row.definition.unit,
        higherIsBetter: row.definition.higherIsBetter,
        coverage: 0,
        description: row.definition.description,
        scores: {},
      };
      entry.scores[modelId] = observation;
      entry.coverage = Object.keys(entry.scores).length;
      rows.set(entry.id, entry);
    }
  }
  return [...rows.values()].sort((a, b) => b.coverage - a.coverage || a.name.localeCompare(b.name));
}

export function chartModels(
  models: readonly VisualModel[],
  benchmark: VisualBenchmark,
): VisualModel[] {
  return models.filter(
    (model) =>
      model.blended !== undefined &&
      Number(model.blended) > 0 &&
      Number.isFinite(Number(model.blended)) &&
      benchmark.scores[model.id] !== undefined,
  );
}

/** Price coverage is independent of benchmark coverage. Zero rates remain visible. */
export function apiPriceModels(models: readonly VisualModel[], lab = ""): VisualModel[] {
  const rate = (value: string | undefined) =>
    value !== undefined && /^\d+(\.\d+)?$/u.test(value) && Number.isFinite(Number(value));
  return models
    .filter((model) => rate(model.input) && rate(model.output) && (!lab || model.lab === lab))
    .sort(
      (a, b) =>
        Number(a.input) - Number(b.input) ||
        Number(a.output) - Number(b.output) ||
        a.name.localeCompare(b.name),
    );
}

export function planLeaders(models: readonly VisualModel[]): VisualModel[] {
  return models
    .filter((model) => model.plans.length > 0)
    .sort(
      (a, b) =>
        new Set(b.plans.map((plan) => plan.id)).size -
          new Set(a.plans.map((plan) => plan.id)).size || a.name.localeCompare(b.name),
    )
    .slice(0, 6);
}

export function visualModelData(catalog: PublicCatalog, evidence: BenchmarkData): VisualData {
  const models = catalog.models
    .filter((model) => model.kind === "release")
    .map((model): VisualModel => {
      const price = basePrice(modelPrices(model.id, catalog.asOf));
      const specs = modelSpecifications(model);
      return {
        id: model.id,
        name: model.name,
        developer: model.developerName ?? "",
        lab: model.developerId ?? "other",
        input: price?.rates.input,
        output: price?.rates.output,
        cached: price?.rates.cacheRead,
        blended: blendedPrice(price?.rates.input, price?.rates.output),
        context: specs?.contextTokens,
        plans: model.places.flatMap((place) =>
          place.kind === "plan" && place.planId
            ? [
                {
                  id: place.planId,
                  name: place.label,
                  price: place.price ? `$${place.price.amount}/${place.price.interval}` : "",
                },
              ]
            : [],
        ),
        details: [
          "Standard API base rates in USD per 1M tokens. Discounts, taxes and other service tiers are excluded.",
          ...(model.pricingNote ? [model.pricingNote] : []),
          ...(price?.tiers ?? []).map(
            (tier) =>
              `${tier.label}: ${Object.entries(tier.rates)
                .map(
                  ([key, value]) =>
                    `${key === "cacheRead" ? "Cached input" : key === "cacheWrite" ? "Cache write" : key} ${typeof value === "string" ? formatRate(value) : `billed as ${value?.billedAs ?? "unrecorded"}`}`,
                )
                .join(", ")} per 1M tokens`,
          ),
          ...(price?.promotion ? [`Promotion: ${price.promotion.label}`] : []),
          `Model checked ${model.lastVerifiedAt}${price ? `; price checked ${price.lastVerifiedAt}` : ""}.`,
        ],
        sources: [
          ...new Map(
            [...model.sources, ...(price?.sources ?? []), ...(specs?.sources ?? [])].map(
              (source) => [source.url, { url: source.url, title: source.title }],
            ),
          ).values(),
        ],
      };
    });
  return {
    models,
    benchmarks: benchmarkCoverage(
      evidence,
      models.map((model) => model.id),
    ),
    asOf: catalog.asOf,
  };
}
