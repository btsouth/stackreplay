import { type MarketEventType, marketEventCategory } from "@stackreplay/market-events/feed";
import { shortPriceText } from "../catalog-copy";
import type { MarketEventView } from "../market/events";
import { planUsage } from "../market-discovery";
import { type PublicCatalog, planDisplayName, planIncludesModel } from "../public-catalog";

/**
 * Subscription watch: the homepage's subscription surface is the recent
 * subscription events from the canonical market feed, each beside the
 * published facts of the plans it names. No second event list: the events are
 * the feed's own, and the plan facts are read from the accepted catalog.
 */

export interface WatchPlan {
  id: string;
  name: string;
  href: string;
  /** Published price, "$500/mo". */
  price: string;
  /** The published allowance summary, as on the Plans page. */
  usage: string;
  /** Canonical models the published lineup includes, for the personal lineup check. */
  includedModelIds: readonly string[];
}

export function isSubscriptionEvent(event: { type: MarketEventType }): boolean {
  return marketEventCategory(event.type) === "subscriptions";
}

/** Facts for every plan a subscription event names, keyed by plan id. */
export function watchPlans(
  catalog: PublicCatalog,
  events: readonly MarketEventView[],
): Record<string, WatchPlan> {
  const modelIds = catalog.models.map((model) => model.id);
  const plans: Record<string, WatchPlan> = {};
  for (const event of events) {
    if (!isSubscriptionEvent(event)) continue;
    for (const id of event.planIds) {
      const plan = catalog.planById(id);
      if (plan === undefined || plans[id] !== undefined) continue;
      plans[id] = {
        id,
        name: planDisplayName(plan),
        href: `/plans/${id}`,
        price: shortPriceText(plan.price),
        usage: planUsage(plan),
        includedModelIds: modelIds.filter((modelId) => planIncludesModel(plan, modelId)),
      };
    }
  }
  return plans;
}
