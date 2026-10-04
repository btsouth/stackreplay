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
