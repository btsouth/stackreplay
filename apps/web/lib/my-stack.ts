import { bundledPublicApiProviders } from "@stackreplay/catalog/bundled";
import { addAmounts, formatUsd, isSyntheticCatalogId } from "@stackreplay/share";
import { catalogPlansAt, loadPublicCatalog } from "./public-catalog";
import type { TargetKey } from "./routes";
import { type DiscoveryPlan, discoverStack } from "./stack-discovery";
import {
  includedAccessModels,
  publishedAccessModelCount,
  subscriptionAccess,
} from "./subscription-access";
import type { SourceSummary } from "./worker-protocol";
import type { SourceDemand } from "./workload-profile";

export function publishedPriceText(price: DiscoveryPlan["price"]): string {
  return `${price.currency === "USD" ? formatUsd(price.amount) : `${price.amount} ${price.currency}`}/${price.interval}`;
}

export interface StackWorkloadEvidence {
  recordedCalls: number;
  sources: readonly Pick<SourceDemand, "id" | "events" | "models" | "unresolvedEvents">[];
  sourceNames: readonly Pick<SourceSummary, "adapterId" | "name" | "role">[];
}

/** Current selections and today's published facts, separate from historical activity.
 * Aggregate inputs only; no account attribution, raw events, or import union.
 * Unknown/retired keys survive even when current facts are unavailable.
 */
export function buildMyStack(input: {
  currentStack: readonly TargetKey[];
  rulesAsOf: string;
  workload?: StackWorkloadEvidence | undefined;
  plans?: readonly DiscoveryPlan[];
  apiProviders?: readonly { id: string; name: string }[];
}) {
  const plans = (input.plans ?? catalogPlansAt(input.rulesAsOf)).filter(
    (plan) => !isSyntheticCatalogId(plan.id),
  );
  const providers = input.apiProviders ?? bundledPublicApiProviders(input.rulesAsOf);
  const targets = [...new Set(input.currentStack)].map((key) => {
    const kind = key.startsWith("plan:") ? ("plan" as const) : ("api" as const);
    const id = key.slice(kind === "plan" ? 5 : 4);
    const plan = kind === "plan" ? plans.find((plan) => plan.id === id) : undefined;
    const provider = kind === "api" ? providers.find((provider) => provider.id === id) : undefined;
    const access = plan ? subscriptionAccess(id, input.rulesAsOf.slice(0, 10)) : undefined;
    return {
      key,
      kind,
      id,
      name: plan?.name ?? (provider ? `${provider.name} API` : key),
      available: plan !== undefined || provider !== undefined,
      publishedPrice: plan?.price,
      access: access
        ? {
            summary: access.summary,
            checkedAt: access.checkedAt,
            models: includedAccessModels(access),
            modelCount: publishedAccessModelCount(access),
          }
        : undefined,
    };
  });
  const prices = new Map<string, { currency: string; interval: string; amounts: string[] }>();
  for (const target of targets) {
    const price = target.publishedPrice;
    if (!price) continue;
    const key = JSON.stringify([price.currency, price.interval]);
    const bucket = prices.get(key) ?? {
      currency: price.currency,
      interval: price.interval,
      amounts: [],
    };
    bucket.amounts.push(price.amount);
    prices.set(key, bucket);
  }
  const workload = input.workload;
  const catalog = workload ? loadPublicCatalog(input.rulesAsOf) : undefined;
  return {
    targets,
    totals: [...prices.values()].map(({ amounts, ...price }) => ({
      ...price,
      amount: addAmounts(amounts),
    })),
    unpricedPlans: targets.filter((target) => target.kind === "plan" && !target.publishedPrice)
      .length,
    apiTargets: targets.filter((target) => target.kind === "api").length,
    families: discoverStack({
      recordedCalls: workload?.recordedCalls ?? 0,
      sources: workload?.sources ?? [],
      sourceNames: workload?.sourceNames ?? [],
      rulesAsOf: input.rulesAsOf,
      currentStack: input.currentStack,
      plans,
      includeUnobserved: true,
    }).filter((group) => group.question !== undefined && group.candidates.length > 0),
    activity: (workload?.sources ?? [])
      .filter((source) => source.events > 0)
      .map((source) => ({
        sourceId: source.id,
        name:
          workload?.sourceNames.find(
            (name) => name.adapterId === source.id && name.role === "usage",
          )?.name ?? source.id,
        recordedCalls: source.events,
        shareOfWorkload:
          workload && workload.recordedCalls > 0 ? source.events / workload.recordedCalls : 0,
        observedModelIds: [...new Set(source.models.map((model) => model.modelId))].sort(),
        observedModelNames: [...new Set(source.models.map((model) => model.modelId))]
          .sort()
          .map((id) => catalog?.modelById(id)?.name ?? id),
        unresolvedCalls: source.unresolvedEvents,
      })),
  };
}

/** Undo restores one explicit selection without overwriting later stack edits. */
export function restoreRemovedTarget(
  current: readonly TargetKey[],
  key: TargetKey,
  index: number,
): TargetKey[] {
  const next = [...new Set(current)];
  if (!next.includes(key)) next.splice(Math.max(0, Math.min(next.length, index)), 0, key);
  return next;
}
