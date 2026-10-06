import { addAmounts, formatUsd } from "@stackreplay/share";
import type { StackSubscription, TargetKey } from "./current-stack";
import { catalogPlansAt } from "./public-catalog";

export interface PaidPlan {
  key: TargetKey;
  id: string;
  name: string;
  /** Accounts bought on this plan: "Claude Max 5x ×2" is two. */
  quantity: number;
  /** One account's published monthly price in USD, when the catalog has one. */
  monthly: string | undefined;
}

export interface WhatYouPay {
  plans: PaidPlan[];
  /** Sum of quantities, never the number of rows. */
  accounts: number;
  /** Monthly total across every account, in USD. Absent when any plan has no USD monthly price. */
  monthlyUsd: string | undefined;
}

export interface PlanChoice {
  id: string;
  name: string;
  price: { amount: string; currency: string; interval: string };
}

/** Subscriptions people can pick: priced catalog plans, never the synthetic examples. */
export function payablePlans(rulesAsOf: string): PlanChoice[] {
  return catalogPlansAt(rulesAsOf)
    .filter((plan) => plan.price && !plan.id.startsWith("example-"))
    .map((plan) => ({ id: plan.id, name: plan.name, price: plan.price }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function subscriptionAccounts(entry: Pick<StackSubscription, "quantity">): number {
  return Number.isInteger(entry.quantity) && (entry.quantity ?? 0) >= 1 ? (entry.quantity ?? 1) : 1;
}

/**
 * What the saved subscriptions add up to. Quantities are summed per plan, so two
 * rows of one plan count as two accounts and are priced twice. `undefined` when
 * nothing is entered, which is how every surface knows to say nothing about plans.
 */
export function whatYouPay(
  subscriptions: readonly StackSubscription[],
  choices: readonly PlanChoice[],
): WhatYouPay | undefined {
  const counts = new Map<TargetKey, number>();
  for (const entry of subscriptions) {
    if (!entry.plan.startsWith("plan:")) continue;
    counts.set(entry.plan, (counts.get(entry.plan) ?? 0) + subscriptionAccounts(entry));
  }
  if (counts.size === 0) return undefined;
  const plans = [...counts].map(([key, quantity]): PaidPlan => {
    const id = key.slice(5);
    const choice = choices.find((entry) => entry.id === id);
    const usdMonthly =
      choice?.price.currency === "USD" && choice.price.interval === "month"
        ? choice.price.amount
        : undefined;
    return { key, id, name: choice?.name ?? id, quantity, monthly: usdMonthly };
  });
  const priced = plans.every((plan) => plan.monthly !== undefined);
  return {
    plans,
    accounts: plans.reduce((sum, plan) => sum + plan.quantity, 0),
    monthlyUsd: priced
      ? addAmounts(
          plans.flatMap((plan) => Array.from({ length: plan.quantity }, () => plan.monthly ?? "0")),
        )
      : undefined,
  };
}

/** "Claude Max 5x ×2 · ChatGPT Pro 100" */
export function paidPlanLabel(plan: Pick<PaidPlan, "name" | "quantity">): string {
  return plan.quantity > 1 ? `${plan.name} ×${plan.quantity}` : plan.name;
}

export function accountsText(accounts: number): string {
  return `${accounts} ${accounts === 1 ? "account" : "accounts"}`;
}

/** "$300" for whole dollars, "$8.33" otherwise. */
export function usdText(amount: string): string {
  return (formatUsd(amount) ?? `$${amount}`).replace(/\.00$/, "");
}

export function monthlyText(monthlyUsd: string): string {
  return `${usdText(monthlyUsd)}/month total`;
}

function decimal(value: string): { units: bigint; scale: bigint } | undefined {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const [whole = "", fraction = ""] = value.split(".");
  return { units: BigInt(`${whole}${fraction}`), scale: 10n ** BigInt(fraction.length) };
}

/**
 * "Nx what you paid": the whole-dollar API value the recap shows, divided by the
 * monthly total prorated to the period (days / 30.4). Whole number from 10 up,
 * one decimal below. Absent when it would round to zero, or an input is invalid.
 */
export function paidMultiplier(
  apiUsd: string,
  monthlyUsd: string,
  days: number,
): { value: number; text: string } | undefined {
  const api = decimal(apiUsd);
  const monthly = decimal(monthlyUsd);
  if (!api || !monthly || monthly.units === 0n || !Number.isSafeInteger(days) || days <= 0)
    return undefined;
  // The figure on screen is the API value rounded to whole dollars (half up).
  const dollars = (2n * api.units + api.scale) / (2n * api.scale);
  // dollars / (monthly * days / 30.4), as tenths: dollars * 304 * 10 / (monthly * days * 10).
  const numerator = dollars * monthly.scale * 304n * 10n;
  const denominator = monthly.units * BigInt(days) * 10n;
  const tenths = (2n * numerator + denominator) / (2n * denominator);
  if (tenths < 1n) return undefined;
  if (tenths >= 100n) {
    const whole = (2n * numerator + 10n * denominator) / (20n * denominator);
    return { value: Number(whole), text: `${whole}×` };
  }
  const value = Number(tenths) / 10;
  return { value, text: `${value.toFixed(1)}×` };
}
