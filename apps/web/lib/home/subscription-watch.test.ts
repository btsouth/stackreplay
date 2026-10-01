import { marketEventCategory } from "@stackreplay/market-events";
import { describe, expect, it } from "vitest";
import { shortPriceText } from "../catalog-copy";
import { marketEventViews, recentEvents } from "../market/events";
import { planUsage } from "../market-discovery";
import { loadPublicCatalog } from "../public-catalog";
import { isSubscriptionEvent, watchPlans } from "./subscription-watch";

const TODAY = "2026-09-30";
const catalog = loadPublicCatalog(TODAY);
const events = recentEvents(marketEventViews(catalog), TODAY).filter(isSubscriptionEvent);

describe("subscription watch", () => {
  it("reads subscription events from the canonical feed only", () => {
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) expect(marketEventCategory(event.type)).toBe("subscriptions");
    expect(events.map((event) => event.id)).toContain("chatgpt-pro-500-launched");
  });

  it("states each named plan's published price and allowance from the catalog", () => {
    const plans = watchPlans(catalog, events);
    for (const event of events)
      for (const id of event.planIds) {
        const plan = catalog.planById(id);
        if (plan === undefined) continue;
        expect(plans[id]?.price).toBe(shortPriceText(plan.price));
        expect(plans[id]?.usage).toBe(planUsage(plan));
        expect(plans[id]?.href).toBe(`/plans/${id}`);
      }
    expect(plans["openai-chatgpt-pro-500"]?.price).toBe("$500/mo");
  });

  it("lists the canonical models each plan's lineup includes, for the personal check", () => {
    const plans = watchPlans(catalog, events);
    expect(plans["anthropic-claude-max-20x"]?.includedModelIds).toContain("claude-opus-5-5");
    expect(plans["anthropic-claude-max-20x"]?.includedModelIds).not.toContain("gpt-6-1-sol");
  });
});
