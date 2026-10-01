import feedData from "./data/market-events.json" with { type: "json" };
import { marketFeedSchema } from "./schema.js";

export * from "./feed.js";
export * from "./schema.js";

/**
 * The accepted feed, schema-checked. Catalog and benchmark identities are
 * checked at the public boundary with `validateMarketFeed`, because this
 * package imports neither the catalog nor the benchmark evidence.
 */
export const marketFeed = marketFeedSchema.parse(feedData);
