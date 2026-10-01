/**
 * Market event vocabulary with no runtime dependencies, so browser code can
 * order and filter events without loading the schema validator.
 */

export const MARKET_EVENT_TYPES = [
  "model_release",
  "model_announcement",
  "api_availability",
  "model_retirement",
  "benchmark_release",
  "benchmark_update",
  "api_price_change",
  "plan_launch",
  "plan_availability_change",
  "plan_price_change",
  "plan_limit_change",
  "model_added_to_plan",
  "model_removed_from_plan",
] as const;
export type MarketEventType = (typeof MARKET_EVENT_TYPES)[number];

export const MARKET_EVENT_IMPORTANCE = ["major", "notable", "minor"] as const;
export type MarketEventImportance = (typeof MARKET_EVENT_IMPORTANCE)[number];

export const MARKET_EVENT_STATUSES = [
  /** Generally available now. */
  "available",
  /** Announced, not generally available. */
  "announced",
  /** Takes effect later (see `effectiveAt`). */
  "scheduled",
  /** A rule or price change now in force. */
  "effective",
  /** No longer offered. */
  "retired",
  /** Temporarily unavailable to new customers. */
  "paused",
] as const;
export type MarketEventStatus = (typeof MARKET_EVENT_STATUSES)[number];

/** The Updates page's filters. A price change on a plan is both Subscriptions and Pricing. */
export type MarketEventCategory = "models" | "benchmarks" | "subscriptions" | "pricing";

export const MARKET_EVENT_CATEGORY_LABELS: Record<MarketEventCategory | "all", string> = {
  all: "All",
  models: "Models",
  benchmarks: "Benchmarks",
  subscriptions: "Subscriptions",
  pricing: "Pricing",
};

export function marketEventCategory(type: MarketEventType): MarketEventCategory {
  switch (type) {
    case "model_release":
    case "model_announcement":
    case "api_availability":
    case "model_retirement":
      return "models";
    case "benchmark_release":
    case "benchmark_update":
      return "benchmarks";
    case "api_price_change":
      return "pricing";
    default:
      return "subscriptions";
  }
}

export function marketEventCategories(type: MarketEventType): MarketEventCategory[] {
  const primary = marketEventCategory(type);
  return type === "plan_price_change" ? [primary, "pricing"] : [primary];
}

export const MARKET_EVENT_TYPE_LABELS: Record<MarketEventType, string> = {
  model_release: "Model release",
  model_announcement: "Model announced",
  api_availability: "API availability",
  model_retirement: "Model retirement",
  benchmark_release: "Benchmark release",
  benchmark_update: "Benchmark update",
  api_price_change: "API price change",
  plan_launch: "New plan",
  plan_availability_change: "Plan availability",
  plan_price_change: "Plan price change",
  plan_limit_change: "Plan limit change",
  model_added_to_plan: "Added to plan",
  model_removed_from_plan: "Removed from plan",
};
