import {
  type CatalogV1,
  type PricingV1,
  planHasHistory,
  planTimelineInputOf,
  pricingServiceTierOf,
} from "@stackreplay/catalog";
import { resolvePlanTimeline } from "@stackreplay/catalog/timeline";
import { formatCatalogDate } from "../catalog-copy";
import { basePrice, modelPrices } from "../market-discovery";
import { numericRate } from "../market-prices";
import { modelContext, tokenSize } from "../model-specifications";
import { formatRate } from "../price-table";
import {
  isSyntheticCatalogId,
  loadCatalog,
  type PublicCatalog,
  planDisplayName,
} from "../public-catalog";

/**
 * Market Pulse: the homepage's short list of real, dated market changes.
 *
 * Every item is derived from accepted catalog records, never written by hand:
 *
 * - model: a release's developer-published release day (`releaseDate`).
 * - plan: a dated event in a plan's provider-evidenced history (introduced,
 *   paused, reopened, allowance revised). Catalog version dates are not used:
 *   a version recorded on the day StackReplay added a plan is not market news.
 * - price: a list-price record that supersedes an earlier record for the same
 *   model and route with different rates. A model's first price record is not
 *   a price change, because its date can be the day it was recorded.
 * - benchmark: callers can pass reviewed benchmark items explicitly. The
 *   homepage does not yet adapt the separate benchmark evidence package.
 *
 * A category with no records simply contributes no rows.
 */

export type PulseCategory = "model" | "benchmark" | "plan" | "price";

export const PULSE_CATEGORY_LABELS: Record<PulseCategory, string> = {
  model: "Model",
  benchmark: "Benchmark",
  plan: "Plan",
  price: "Price",
};

const CATEGORY_ORDER: readonly PulseCategory[] = ["model", "benchmark", "plan", "price"];

export interface PulseItem {
  /** Stable key for rendering and tests. */
  id: string;
  category: PulseCategory;
  /** The day the change happened, or takes effect. */
  date: string;
  /** `scheduled` when `date` is after the catalog's as-of day. */
  timing: "past" | "scheduled";
  /** Model or plan name. */
  subject: string;
  href: string;
  /** One concise sentence of what changed. */
  change: string;
  provider?: string | undefined;
  source?: { url: string; title: string } | undefined;
  /** Canonical model ids the change is about (personal relevance matches these exactly). */
  modelIds: readonly string[];
  /** Catalog plan ids the change is about. */
  planIds: readonly string[];
}

function modelReleaseItems(catalog: PublicCatalog): PulseItem[] {
  return catalog.models.flatMap((model): PulseItem[] => {
    const release = model.releaseDate;
    if (model.kind !== "release" || release === undefined) return [];
    const raw = loadCatalog().models[model.id];
    const parts: string[] = [];
    if (raw?.apiAvailability === "not_established") parts.push("API access not yet established");
    else {
      const price = basePrice(modelPrices(model.id, catalog.asOf));
      if (price?.rates.input !== undefined && price.rates.output !== undefined)
        parts.push(
          `API ${formatRate(price.rates.input)} in, ${formatRate(price.rates.output)} out per 1M tokens`,
        );
    }
    const context = modelContext(model);
    if (context.value !== undefined) parts.push(`${tokenSize(context.value)} ${context.label}`);
    const first = release.sources[0];
    return [
      {
        id: `model:${model.id}`,
        category: "model",
        date: release.date,
        timing: release.date > catalog.asOf ? "scheduled" : "past",
        subject: model.name,
        href: `/models/${model.id}`,
        change: `${model.developerName === undefined ? "New release" : `${model.developerName} release`}${
          parts.length > 0 ? `. ${parts.join(" · ")}.` : "."
        }`,
        provider: model.developerName,
        source: first === undefined ? undefined : { url: first.url, title: first.title },
        modelIds: [model.id],
        planIds: [],
      },
    ];
  });
}

function planEventItems(catalog: PublicCatalog, raw: CatalogV1): PulseItem[] {
  const items: PulseItem[] = [];
  for (const plan of catalog.plans) {
    const record = raw.plans[plan.id];
    if (record === undefined || !planHasHistory(record)) continue;
    const timeline = resolvePlanTimeline(planTimelineInputOf(record), catalog.asOf);
    // One row per plan and day: several events on one day are one change to read.
    const byDay = new Map<string, (typeof timeline.entries)[number][]>();
    for (const entry of timeline.entries) {
      if (entry.date === undefined) continue;
      if (entry.status !== "effective" && entry.status !== "scheduled") continue;
      byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry]);
    }
    for (const [date, entries] of byDay) {
      const evidence = entries.flatMap((entry) => entry.evidence)[0];
      items.push({
        id: `plan:${plan.id}:${date}`,
        category: "plan",
        date,
        timing: date > catalog.asOf ? "scheduled" : "past",
        subject: planDisplayName(plan),
        href: `/plans/${plan.id}`,
        change: entries
          .flatMap((entry) => [
            entry.title,
            ...(entry.summary === undefined ? [] : [entry.summary]),
          ])
          .map(sentence)
          .join(" "),
        provider: plan.providerName,
        source: evidence === undefined ? undefined : { url: evidence.url, title: evidence.title },
        modelIds: [],
        planIds: [plan.id],
      });
    }
  }
  return items;
}

const sentence = (text: string) => (/[.!?]$/u.test(text.trim()) ? text.trim() : `${text.trim()}.`);

interface PriceChange {
  modelId: string;
  from: PricingV1;
  to: PricingV1;
}

/** Consecutive list-price records for one model and route whose rates differ. */
export function listPriceChanges(raw: CatalogV1): PriceChange[] {
  const routes = new Map<string, PricingV1[]>();
  for (const price of Object.values(raw.pricing)) {
    if (isSyntheticCatalogId(price.modelId) || price.basis !== "api_list_price") continue;
    if (price.verificationStatus !== "verified") continue;
    const key = [
      price.modelId,
      price.endpointId ?? "",
      price.variantId ?? "",
      pricingServiceTierOf(price),
    ].join("|");
    routes.set(key, [...(routes.get(key) ?? []), price]);
  }
  const changes: PriceChange[] = [];
  for (const records of routes.values()) {
    const ordered = records.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (let index = 1; index < ordered.length; index += 1) {
      const from = ordered[index - 1] as PricingV1;
      const to = ordered[index] as PricingV1;
      if (JSON.stringify(from.rates) !== JSON.stringify(to.rates))
        changes.push({ modelId: to.modelId, from, to });
    }
  }
  return changes;
}

function rateMove(change: PriceChange, key: "input" | "output"): string | undefined {
  const before = numericRate(change.from.rates, key);
  const after = numericRate(change.to.rates, key);
  if (before === undefined || after === undefined || before === after) return undefined;
  return `${key} ${formatRate(before)} → ${formatRate(after)}`;
}

function priceChangeItems(catalog: PublicCatalog, raw: CatalogV1): PulseItem[] {
  // Identical changes on one day from one developer read as one row that names every model.
  const groups = new Map<string, PriceChange[]>();
  for (const change of listPriceChanges(raw)) {
    const moves = [rateMove(change, "input"), rateMove(change, "output")].join(";");
    const developer = raw.models[change.modelId]?.developerId ?? "";
    const key = [change.to.effectiveFrom, developer, moves].join("|");
    groups.set(key, [...(groups.get(key) ?? []), change]);
  }
  const items: PulseItem[] = [];
  for (const changes of groups.values()) {
    const models = changes
      .map((change) => catalog.modelById(change.modelId))
      .filter((model) => model !== undefined)
      .sort(
        (a, b) =>
          (b.releaseDate?.date ?? "").localeCompare(a.releaseDate?.date ?? "") ||
          b.name.localeCompare(a.name, "en", { numeric: true }),
      );
    const lead = models[0];
    const change = changes.find((entry) => entry.modelId === lead?.id);
    if (lead === undefined || change === undefined) continue;
    const moves = [rateMove(change, "input"), rateMove(change, "output")].filter(
      (move) => move !== undefined,
    );
    if (moves.length === 0) continue;
    const date = change.to.effectiveFrom;
    const scheduled = date > catalog.asOf;
    const others = models.slice(1).map((model) => model.name);
    const source = change.to.sources[0];
    items.push({
      id: `price:${lead.id}:${date}`,
      category: "price",
      date,
      timing: scheduled ? "scheduled" : "past",
      subject: lead.name,
      href: `/models/${lead.id}`,
      change: `API list price ${scheduled ? "changes" : "changed"} ${formatCatalogDate(date)}: ${moves.join(", ")} per 1M tokens.${
        others.length > 0 ? ` Same change for ${joinNames(others)}.` : ""
      }`,
      provider: lead.developerName,
      source: source === undefined ? undefined : { url: source.url, title: source.title },
      modelIds: models.map((model) => model.id),
      planIds: [],
    });
  }
  return items;
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Every derivable market change, newest first within each category. */
export function marketChanges(
  catalog: PublicCatalog,
  options: { benchmarks?: readonly PulseItem[] } = {},
): PulseItem[] {
  const raw = loadCatalog();
  return [
    ...modelReleaseItems(catalog),
    ...(options.benchmarks ?? []),
    ...planEventItems(catalog, raw),
    ...priceChangeItems(catalog, raw),
  ].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      b.date.localeCompare(a.date) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * A short pulse: every category that has records is represented before any
 * category gets a second row, then rows are listed in category order.
 */
export function selectPulse(
  items: readonly PulseItem[],
  options: { limit?: number; perCategory?: number } = {},
): PulseItem[] {
  const limit = options.limit ?? 5;
  const perCategory = options.perCategory ?? 2;
  const queues = CATEGORY_ORDER.map((category) =>
    items.filter((item) => item.category === category),
  );
  const chosen: PulseItem[] = [];
  for (let round = 0; round < perCategory && chosen.length < limit; round += 1)
    for (const queue of queues) {
      const next = queue[round];
      if (next !== undefined && chosen.length < limit) chosen.push(next);
    }
  return chosen.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      b.date.localeCompare(a.date),
  );
}

/** The newest day any listed change happened on, ignoring scheduled ones. */
export function latestChangeDate(items: readonly PulseItem[]): string | undefined {
  return items
    .filter((item) => item.timing === "past")
    .map((item) => item.date)
    .sort()
    .at(-1);
}
