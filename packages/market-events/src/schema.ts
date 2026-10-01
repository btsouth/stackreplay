import { z } from "zod";
import {
  MARKET_EVENT_IMPORTANCE,
  MARKET_EVENT_STATUSES,
  MARKET_EVENT_TYPES,
  marketEventCategory,
} from "./taxonomy.js";

/**
 * One canonical feed of material AI model and subscription market events.
 *
 * The homepage briefing and the Updates page both read this feed; nothing else
 * publishes market news. An event records what happened, when the provider
 * says it happened, and the first-party source that says so. Catalog
 * admission dates and "last checked" dates are never occurrence dates.
 */

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/u);
const text = z.string().trim().min(1);
const url = z.url().startsWith("https://");
const day = z.iso.date();
/** A calendar day, or an instant when the provider published a time. */
const when = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

export const marketEventTypeSchema = z.enum(MARKET_EVENT_TYPES);
export const marketEventImportanceSchema = z.enum(MARKET_EVENT_IMPORTANCE);
export const marketEventStatusSchema = z.enum(MARKET_EVENT_STATUSES);

export const marketEventSourceSchema = z.strictObject({
  url,
  title: text,
  /** First-party: the provider's own page, docs, changelog, help center or official account. */
  authority: z.enum(["first_party", "third_party"]),
  checkedAt: day,
  /** Verbatim text from the page supporting the event. Never paraphrased. */
  excerpt: text.max(400).optional(),
});
export type MarketEventSource = z.infer<typeof marketEventSourceSchema>;

export const marketEventSchema = z
  .strictObject({
    id,
    type: marketEventTypeSchema,
    importance: marketEventImportanceSchema,
    /** When the provider published or made the change, as the provider states it. */
    occurredAt: when,
    /**
     * Where the occurrence date comes from. There is deliberately no value for
     * "the day StackReplay recorded it".
     */
    dateBasis: z.enum(["provider_publication_date", "provider_stated_date"]),
    /** A later day the change takes effect, when the provider names one. */
    effectiveAt: day.optional(),
    /** The day StackReplay first recorded the event. Never shown as its date. */
    discoveredAt: day,
    verifiedAt: day,
    providerId: id,
    modelIds: z.array(id).default([]),
    planIds: z.array(id).default([]),
    /**
     * Canonical benchmark evidence in `@stackreplay/benchmarks` this event
     * refers to: reviewed source sets (launch result tables) and/or benchmark
     * definitions. Scores are read from that evidence, never written here.
     */
    benchmark: z
      .strictObject({
        sourceSetIds: z.array(id).default([]),
        benchmarkIds: z.array(id).default([]),
        /** One benchmark whose reported result is worth a line in the feed. */
        headlineBenchmarkId: id.optional(),
      })
      .refine(
        (value) => value.sourceSetIds.length + value.benchmarkIds.length > 0,
        "Reference at least one source set or benchmark definition",
      )
      .optional(),
    title: text.max(90),
    /** What changed, in one or two sentences supported by the sources. */
    summary: text.max(280),
    status: marketEventStatusSchema,
    sources: z.array(marketEventSourceSchema).min(1),
  })
  .superRefine((event, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (event.sources[0]?.authority !== "first_party")
      issue(["sources", 0], "The accepted source must be first-party");
    if (event.occurredAt.slice(0, 10) > event.discoveredAt)
      issue(["discoveredAt"], "An event cannot be discovered before it occurred");
    if (event.discoveredAt > event.verifiedAt)
      issue(["verifiedAt"], "Verification cannot precede discovery");
    const urls = new Set<string>();
    for (const [index, source] of event.sources.entries()) {
      if (source.checkedAt > event.verifiedAt)
        issue(["sources", index, "checkedAt"], "A source checked after verification");
      if (urls.has(source.url)) issue(["sources", index, "url"], "The same source is cited twice");
      urls.add(source.url);
    }
    if (event.effectiveAt !== undefined && event.effectiveAt < event.occurredAt.slice(0, 10))
      issue(["effectiveAt"], "A change cannot take effect before it was announced");
    if (event.status === "scheduled" && event.effectiveAt === undefined)
      issue(["effectiveAt"], "A scheduled change needs its effective day");
    const category = marketEventCategory(event.type);
    if (category === "models" && event.modelIds.length === 0)
      issue(["modelIds"], "A model event names its canonical model ids");
    if (category === "benchmarks" && event.benchmark === undefined)
      issue(["benchmark"], "A benchmark event references canonical benchmark evidence");
    if (
      (event.type === "plan_launch" ||
        event.type === "plan_availability_change" ||
        event.type === "plan_price_change" ||
        event.type === "plan_limit_change") &&
      event.planIds.length === 0
    )
      issue(["planIds"], "A plan event names its catalog plan ids");
    if (
      (event.type === "model_added_to_plan" || event.type === "model_removed_from_plan") &&
      (event.planIds.length === 0 || event.modelIds.length === 0)
    )
      issue(["planIds"], "A lineup change names both the plans and the models");
    if (event.type === "api_price_change" && event.modelIds.length === 0)
      issue(["modelIds"], "A price change names its models");
  });
export type MarketEvent = z.infer<typeof marketEventSchema>;
export type MarketEventInput = z.input<typeof marketEventSchema>;

export const marketFeedSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    /** The day the feed was last reviewed as a whole. */
    asOf: day,
    events: z.array(marketEventSchema),
  })
  .superRefine((feed, ctx) => {
    const seen = new Set<string>();
    for (const [index, event] of feed.events.entries()) {
      if (seen.has(event.id))
        ctx.addIssue({ code: "custom", path: ["events", index, "id"], message: "Duplicate id" });
      seen.add(event.id);
      if (event.verifiedAt > feed.asOf)
        ctx.addIssue({
          code: "custom",
          path: ["events", index, "verifiedAt"],
          message: "Verified after the feed's review day",
        });
    }
  });
export type MarketFeed = z.infer<typeof marketFeedSchema>;

/** Catalog and benchmark identities are injected at the public boundary. */
export interface MarketIdentities {
  providers: ReadonlySet<string>;
  /** Releases only; a family name is not a canonical model for an event. */
  models: ReadonlySet<string>;
  plans: ReadonlySet<string>;
  benchmarkSourceSets: ReadonlyMap<
    string,
    { modelIds: readonly string[]; benchmarkIds: readonly string[] }
  >;
  benchmarkDefinitions: ReadonlySet<string>;
}

/** Schema, then canonical identities: every id an event names must exist. */
export function validateMarketFeed(raw: unknown, identities: MarketIdentities): MarketFeed {
  const feed = marketFeedSchema.parse(raw);
  for (const event of feed.events) {
    const fail = (message: string): never => {
      throw new Error(`Market event ${event.id}: ${message}`);
    };
    if (!identities.providers.has(event.providerId)) fail(`unknown provider ${event.providerId}`);
    for (const modelId of event.modelIds)
      if (!identities.models.has(modelId)) fail(`unknown canonical model release ${modelId}`);
    for (const planId of event.planIds)
      if (!identities.plans.has(planId)) fail(`unknown catalog plan ${planId}`);
    if (event.benchmark === undefined) continue;
    const sets = event.benchmark.sourceSetIds.map(
      (setId) =>
        identities.benchmarkSourceSets.get(setId) ?? fail(`unknown benchmark source set ${setId}`),
    );
    for (const benchmarkId of event.benchmark.benchmarkIds)
      if (!identities.benchmarkDefinitions.has(benchmarkId))
        fail(`unknown benchmark definition ${benchmarkId}`);
    const headline = event.benchmark.headlineBenchmarkId;
    if (headline !== undefined && !sets.some((set) => set.benchmarkIds.includes(headline)))
      fail(`headline benchmark ${headline} is not in its source sets`);
    if (sets.length > 0)
      for (const modelId of event.modelIds)
        if (!sets.some((set) => set.modelIds.includes(modelId)))
          fail(`model ${modelId} has no result in the referenced benchmark evidence`);
  }
  return feed;
}
