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
