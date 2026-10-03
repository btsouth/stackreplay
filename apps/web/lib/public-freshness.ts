import { formatCatalogDate } from "./catalog-copy";
import { loadMarketFeed } from "./market/events";
import { modelPrices } from "./market-discovery";
import { modelsInView } from "./model-library";
import { loadPublicBenchmarks } from "./public-benchmarks";
import type { PublicCatalog } from "./public-catalog";

/** A review range, never the newest record presented as a check of everything. */
export function reviewDateRange(dates: readonly string[], asOf: string): string {
  const days = [...new Set(dates.map((date) => date.slice(0, 10)))]
    .filter((day) => day <= asOf)
    .sort();
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) return "date not recorded";
  if (first === last) return formatCatalogDate(first);
  return `${formatCatalogDate(first)} to ${formatCatalogDate(last)}`;
}

export function publicFreshness(catalog: PublicCatalog): string {
  const dates = {
    "Prices reviewed": modelsInView(catalog.models, "models").flatMap((model) =>
      modelPrices(model.id, catalog.asOf).map((price) => price.lastVerifiedAt),
    ),
    "Plan terms checked": catalog.plans.map(
      (plan) => plan.publishedTerms?.checkedAt ?? plan.lastVerifiedAt,
    ),
    "Benchmarks checked": loadPublicBenchmarks().sourceSets.flatMap((set) =>
      set.observations.map((observation) => observation.checkedAt),
    ),
    "Updates checked": loadMarketFeed().events.flatMap((event) =>
      event.sources.map((source) => source.checkedAt),
    ),
  };
  return Object.entries(dates)
    .map(([label, days]) => `${label} ${reviewDateRange(days, catalog.asOf)}`)
    .join(" · ");
}
