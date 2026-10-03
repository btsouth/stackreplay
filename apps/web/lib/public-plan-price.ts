import type { PlanPriceV1 } from "@stackreplay/catalog";
import { formatUsd } from "./catalog-copy";
import type { SubscriptionPublishedTerms } from "./subscription-published-terms";

type PricedPlan = {
  price: PlanPriceV1;
  publishedTerms?: Pick<SubscriptionPublishedTerms, "priceBasis">;
};

/** Public price labels use the provider's reviewed billing unit. */
export function publicPlanPriceUnit(plan: PricedPlan): string {
  const basis = plan.publishedTerms?.priceBasis;
  const unit = basis === "paid_user" ? "paid user" : basis === "user" ? "user" : undefined;
  return unit ? `per ${unit} / ${plan.price.interval}` : `/ ${plan.price.interval}`;
}

export function publicPlanPriceText(plan: PricedPlan): string {
  if (Number(plan.price.amount) === 0) return "Free";
  return `${formatUsd(plan.price.amount)} ${publicPlanPriceUnit(plan)}`;
}
