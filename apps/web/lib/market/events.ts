import { type BenchmarkData, benchmarkName, resolveComparison } from "@stackreplay/benchmarks";
import {
  daysBetween,
  HOMEPAGE_MAX_AGE_DAYS,
  homepageBriefing,
  MARKET_EVENT_TYPE_LABELS,
  type MarketEvent,
  type MarketEventCategory,
  type MarketEventImportance,
  type MarketEventStatus,
  type MarketEventType,
  type MarketFeed,
  marketEventCategories,
  marketFeed,
  occurredDay,
  sortByOccurrence,
  validateMarketFeed,
} from "@stackreplay/market-events";
import { basePrice, modelPrices } from "../market-discovery";
import { modelContext, tokenSize } from "../model-specifications";
import { formatRate } from "../price-table";
import { loadPublicBenchmarks } from "../public-benchmarks";
import { loadCatalog, type PublicCatalog, planDisplayName } from "../public-catalog";

/**
 * The web boundary of the canonical market feed. Every public surface that
 * shows market news (the homepage briefing and the Updates page) reads
 * `marketEventViews`; nothing else publishes market events.
 *
 * Facts beside an event are read from the accepted catalog and the reviewed
 * benchmark evidence at render time, never written into the feed, so a price
 * or a score shown with an event is the same one the Models and Benchmarks
 * pages show.
 */

export interface MarketEventLink {
  kind: "model" | "plan";
  id: string;
  label: string;
  href: string;
}

export interface MarketEventView {
  id: string;
  type: MarketEventType;
  typeLabel: string;
  categories: MarketEventCategory[];
  importance: MarketEventImportance;
  status: MarketEventStatus;
  occurredAt: string;
  /** Calendar day the event occurred (UTC day for a published instant). */
  day: string;
  effectiveAt?: string | undefined;
  verifiedAt: string;
  providerId: string;
  providerName: string;
  title: string;
  summary: string;
  /** Short catalog or benchmark facts, each traceable to an accepted record. */
  facts: string[];
  modelIds: string[];
  planIds: string[];
  links: MarketEventLink[];
  /** The accepted first-party source. */
  source: { url: string; title: string };
  /** Primary link for the event's subject. */
  href: string;
}

/** The feed checked against the catalog and benchmark identities it names. */
export function loadMarketFeed(): MarketFeed {
  const catalog = loadCatalog();
  const benchmarks = loadPublicBenchmarks();
  return validateMarketFeed(marketFeed, {
    providers: new Set(Object.keys(catalog.providers)),
    models: new Set(
      Object.values(catalog.models)
        .filter((model) => model.kind !== "family")
        .map((model) => model.id),
    ),
    plans: new Set(Object.keys(catalog.plans)),
    benchmarkSourceSets: new Map(
      benchmarks.sourceSets.map((set) => [
        set.id,
        { modelIds: set.modelIds, benchmarkIds: set.benchmarkIds },
      ]),
    ),
    benchmarkDefinitions: new Set(benchmarks.definitions.map((definition) => definition.id)),
  });
}

function priceFact(modelId: string, asOf: string): string | undefined {
  const rates = basePrice(modelPrices(modelId, asOf))?.rates;
  if (rates?.input === undefined || rates.output === undefined) return undefined;
  return `API ${formatRate(rates.input)} in · ${formatRate(rates.output)} out per 1M tokens`;
}

/**
 * The headline benchmark result for the event's first model: the evidence
 * edition's primary observation (the one the Benchmarks page shows), and only
 * when it comes from a source set the event references. Never a composite.
 */
function benchmarkFact(event: MarketEvent, data: BenchmarkData): string | undefined {
  const reference = event.benchmark;
  const benchmarkId = reference?.headlineBenchmarkId;
  const modelId = event.modelIds[0];
  if (reference === undefined || benchmarkId === undefined || modelId === undefined)
    return undefined;
  const row = resolveComparison(data, [modelId], { coverage: "all" }).find(
    (entry) => entry.definition.id === benchmarkId,
  );
  const observation = row?.cells[0]?.observation;
  if (row === undefined || observation === undefined) return undefined;
  if (!reference.sourceSetIds.includes(observation.sourceSetId)) return undefined;
  const effort =
    observation.effort !== undefined && /^[A-Za-z]{2,8}$/u.test(observation.effort)
      ? ` (${observation.effort} effort)`
      : "";
  return `${benchmarkName(row.definition)} ${observation.displayValue}${effort}, reported by ${observation.evaluator}`;
}

export function presentMarketEvent(
  event: MarketEvent,
  catalog: PublicCatalog,
  benchmarks: BenchmarkData,
): MarketEventView {
  const raw = loadCatalog();
  const links: MarketEventLink[] = [
    ...event.modelIds.flatMap((id): MarketEventLink[] => {
      const model = catalog.modelById(id);
      return model === undefined
        ? []
        : [{ kind: "model", id, label: model.name, href: `/models/${id}` }];
    }),
    ...event.planIds.flatMap((id): MarketEventLink[] => {
      const plan = catalog.planById(id);
      const name = plan === undefined ? raw.plans[id]?.name : planDisplayName(plan);
      return name === undefined ? [] : [{ kind: "plan", id, label: name, href: `/plans/${id}` }];
    }),
  ];
  const facts: string[] = [];
  const lead = event.modelIds[0];
  const model = lead === undefined ? undefined : catalog.modelById(lead);
  if (
    model !== undefined &&
    (event.type === "model_release" ||
      event.type === "model_announcement" ||
      event.type === "api_availability" ||
      event.type === "api_price_change")
  ) {
    const price = priceFact(model.id, catalog.asOf);
    if (price !== undefined) facts.push(price);
    else if (raw.models[model.id]?.apiAvailability === "not_established")
      facts.push("API pricing not yet published");
    const context = modelContext(model);
    if (context.value !== undefined) facts.push(`${tokenSize(context.value)} ${context.label}`);
  }
  const score = benchmarkFact(event, benchmarks);
  if (score !== undefined) facts.push(score);
  const [primary] = event.sources;
  if (primary === undefined) throw new Error(`Market event ${event.id} has no source`);
  return {
    id: event.id,
    type: event.type,
    typeLabel: MARKET_EVENT_TYPE_LABELS[event.type],
    categories: marketEventCategories(event.type),
    importance: event.importance,
    status: event.status,
    occurredAt: event.occurredAt,
    day: occurredDay(event),
    effectiveAt: event.effectiveAt,
    verifiedAt: event.verifiedAt,
    providerId: event.providerId,
    providerName: raw.providers[event.providerId]?.name ?? event.providerId,
    title: event.title,
    summary: event.summary,
    facts,
    modelIds: [...event.modelIds],
    planIds: [...event.planIds],
    links,
    source: { url: primary.url, title: primary.title },
    href: links[0]?.href ?? primary.url,
  };
}

/** Every accepted event, presented, newest first by occurrence. */
export function marketEventViews(catalog: PublicCatalog): MarketEventView[] {
  const feed = loadMarketFeed();
  const benchmarks = loadPublicBenchmarks();
  return sortByOccurrence(
    feed.events.map((event) => presentMarketEvent(event, catalog, benchmarks)),
  );
}

/**
 * What the homepage may show, decided again in the browser against the
 * reader's own day: every major or notable event no older than thirty days
 * on the day the page was built. The client narrows this with
 * `homepageBriefing`, so a page served later never shows an event older than
 * thirty days by the reader's clock.
 */
export function briefingCandidates(
  views: readonly MarketEventView[],
  today: string,
): MarketEventView[] {
  return homepageBriefing(views, { today, limit: views.length });
}

/** Every accepted event, any importance, no older than thirty days on `today`. */
export function recentEvents(views: readonly MarketEventView[], today: string): MarketEventView[] {
  return views.filter((view) => {
    const age = daysBetween(view.day, today);
    return age >= 0 && age <= HOMEPAGE_MAX_AGE_DAYS;
  });
}

export { homepageBriefing };
