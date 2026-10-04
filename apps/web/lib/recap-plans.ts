import type { ClaudeProfile } from "@stackreplay/adapters/claude-profile";
import { suggestedPlanId } from "./account-identity";
import type { StackSubscription } from "./current-stack";
import type { TargetKey } from "./routes";

/** Saved selections win. Otherwise use explicit profile tiers, once per account, without persisting guesses. */
export function recapPlans(
  saved: readonly StackSubscription[],
  profiles: Readonly<Record<string, ClaudeProfile>>,
): StackSubscription[] {
  if (saved.some((s) => s.plan.startsWith("plan:"))) return [...saved];
  const seen = new Set<string>();
  const detected = Object.entries(profiles).flatMap(([account, profile], i) => {
    const plan = suggestedPlanId(profile);
    if (!plan || seen.has(profile.account)) return [];
    seen.add(profile.account);
    return [{ id: `detected${i}`, plan: `plan:${plan}` as TargetKey, account }];
  });
  return [...saved, ...detected];
}

/** Same calendar window, with exact decimal arithmetic and 30.4 days per month. */
export function paidMultiplier(
  apiUsd: string,
  monthlyUsd: string,
  days: number,
): number | undefined {
  const parse = (value: string) => {
    if (!/^\d+(?:\.\d+)?$/.test(value)) return undefined;
    const [whole, fraction = ""] = value.split(".");
    return { units: BigInt(`${whole}${fraction}`), scale: 10n ** BigInt(fraction.length) };
  };
  const value = parse(apiUsd);
  const monthly = parse(monthlyUsd);
  if (!value || !monthly || monthly.units === 0n || !Number.isSafeInteger(days) || days <= 0)
    return undefined;
  const numerator = value.units * monthly.scale * 304n;
  const denominator = value.scale * monthly.units * BigInt(days) * 10n;
  if (numerator < 2n * denominator) return undefined;
  const rounded = (2n * numerator + denominator) / (2n * denominator);
  const result = Number(rounded);
  return Number.isSafeInteger(result) ? result : undefined;
}
