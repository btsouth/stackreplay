import accessData from "./subscription-access-data.json";

/** Product access is independent of exact routes admitted for Replay. */
export interface SubscriptionAccessModel {
  name: string;
  /** Explicit reviewed identity, never a fuzzy name match. */
  modelId?: string;
  note?: string;
}
export interface SubscriptionAccessGroup {
  label: string;
  access: "included" | "conditional" | "extra_usage" | "automatic";
  sourceUrl: string;
  note?: string;
  models: readonly SubscriptionAccessModel[];
}
export interface SubscriptionAccess {
  checkedAt: string;
  summary: string;
  groups: readonly SubscriptionAccessGroup[];
}

const records: Readonly<Record<string, SubscriptionAccess>> = accessData as Record<
  string,
  SubscriptionAccess
>;

export function subscriptionAccess(planId: string, asOf: string): SubscriptionAccess | undefined {
  const record = records[planId];
  return record && record.checkedAt <= asOf ? record : undefined;
}

/** Unique selectable names; separately purchased usage is not included usage. */
export function includedAccessModels(access: SubscriptionAccess): SubscriptionAccessModel[] {
  return [
    ...new Map(
      access.groups
        .filter((group) => group.access === "included" || group.access === "conditional")
        .flatMap((group) => group.models)
        .map((model) => [model.modelId ?? model.name, model]),
    ).values(),
  ];
}

/**
 * Catalogued plans whose included or conditional lineup names a model by an
 * explicit `modelId`. Unlinked lineup names never count, even when the name
 * matches a model.
 */
export function includedPlanCounts(
  plans: readonly { modelAccess?: SubscriptionAccess }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const plan of plans) {
    if (!plan.modelAccess) continue;
    const linked = new Set(
      includedAccessModels(plan.modelAccess).flatMap((entry) =>
        entry.modelId ? [entry.modelId] : [],
      ),
    );
    for (const id of linked) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
