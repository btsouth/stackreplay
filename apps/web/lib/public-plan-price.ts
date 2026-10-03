import type { PlanPriceV1 } from "@stackreplay/catalog";
import { formatUsd } from "./catalog-copy";
import type { SubscriptionPublishedTerms } from "./subscription-published-terms";

/** Commercial display prices only; these never enter Replay purchases. */
export type PublicPlanPrice =
  | { kind: "fixed"; currency: "USD"; amount: string; interval: "month" | "year" }
  | {
      kind: "per_user";
      currency: "USD";
      amount: string;
      interval: "month" | "year";
      basis: "user" | "paid_user" | "licensed_user";
    }
  | {
      kind: "base_seat";
      currency: "USD";
      baseAmount: string;
      seatAmount: string;
      interval: "month";
      basis: "full_developer_seat";
    };

type PricedPlan =
  | {
      price: PlanPriceV1;
      publishedTerms?: Pick<SubscriptionPublishedTerms, "priceBasis">;
    }
  | { publicPrice: PublicPlanPrice };

export function publicPlanPrice(plan: PricedPlan): PublicPlanPrice {
  if ("publicPrice" in plan) return plan.publicPrice;
  const basis = plan.publishedTerms?.priceBasis;
  return basis ? { ...plan.price, kind: "per_user", basis } : { ...plan.price, kind: "fixed" };
}

/** Every public surface uses the same amount, billing unit and formula. */
export function publicPlanPricePresentation(plan: PricedPlan) {
  const price = publicPlanPrice(plan);
  if (price.kind === "base_seat") {
    const amount = `${formatUsd(price.baseAmount)}/month base + ${formatUsd(price.seatAmount)}/month per full developer seat`;
    return { amount, unit: "", text: amount, formula: true };
  }
  const basis =
    price.kind === "per_user"
      ? price.basis === "paid_user"
        ? "paid user"
        : price.basis === "licensed_user"
          ? "licensed user"
          : "user"
      : undefined;
  const unit = basis ? `per ${basis} / ${price.interval}` : `/ ${price.interval}`;
  const amount = formatUsd(price.amount);
  return {
    amount,
    unit,
    text: Number(price.amount) === 0 ? "Free" : `${amount} ${unit}`,
    formula: false,
  };
}

export function publicPlanPriceUnit(plan: PricedPlan): string {
  return publicPlanPricePresentation(plan).unit;
}
export function publicPlanPriceText(plan: PricedPlan): string {
  return publicPlanPricePresentation(plan).text;
}

const BASIS_ORDER = { fixed: 0, user: 1, paid_user: 2, licensed_user: 3, full_developer_seat: 4 };
/** Group unlike billing bases; a formula's base is never a comparable total. */
export function comparePublicPlanPrices(
  left: PricedPlan & { name: string },
  right: PricedPlan & { name: string },
): number {
  const a = publicPlanPrice(left);
  const b = publicPlanPrice(right);
  const rank = (price: PublicPlanPrice) =>
    BASIS_ORDER[price.kind === "fixed" ? "fixed" : price.basis];
  return (
    rank(a) - rank(b) ||
    (a.kind !== "base_seat" && b.kind !== "base_seat"
      ? a.interval.localeCompare(b.interval) || Number(a.amount) - Number(b.amount)
      : 0) ||
    left.name.localeCompare(right.name)
  );
}
export const PUBLIC_PRICE_SORT_NOTE =
  "Published prices grouped by billing basis: subscription, per user, per paid user, per licensed user, then base plus seats. Taxes and commitment offers may differ.";
