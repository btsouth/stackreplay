import accessData from "./subscription-access-data.json";

/** Product access is independent of exact routes admitted for Replay. */
export interface SubscriptionAccessModel {
  name: string;
  /** Explicit reviewed identity, never a fuzzy name match. */
  modelId?: string;
  /**
   * The provider's own route variant of `modelId` (for example Command Code's
   * Fast route). The same model on a separately priced route: a separate row,
   * never merged into the default route's.
   */
  variant?: string;
  note?: string;
}

/** One key per listed route: a model's variant never replaces its default route. */
export function accessModelKey(model: SubscriptionAccessModel): string {
  if (model.modelId === undefined) return `published:${model.name}`;
  return model.variant === undefined ? model.modelId : `${model.modelId}~${model.variant}`;
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

/**
 * A plan keeps one reviewed snapshot per review date, so a lineup change (a new
 * model on a given day) does not rewrite what was true before it. A plan with a
 * single review stores it on its own.
 */
const records: Readonly<Record<string, SubscriptionAccess | readonly SubscriptionAccess[]>> =
  accessData as Record<string, SubscriptionAccess | SubscriptionAccess[]>;

/** The latest reviewed snapshot on or before `asOf`. */
export function subscriptionAccess(planId: string, asOf: string): SubscriptionAccess | undefined {
  const stored = records[planId];
  const snapshots: readonly SubscriptionAccess[] =
    stored === undefined ? [] : Array.isArray(stored) ? stored : [stored as SubscriptionAccess];
  let selected: SubscriptionAccess | undefined;
  for (const snapshot of snapshots)
    if (
      snapshot.checkedAt <= asOf &&
      (selected === undefined || snapshot.checkedAt > selected.checkedAt)
    )
      selected = snapshot;
  return selected;
}

/** Unique selectable names; separately purchased usage is not included usage. */
export function includedAccessModels(access: SubscriptionAccess): SubscriptionAccessModel[] {
  return [
    ...new Map(
      access.groups
        .filter((group) => group.access === "included" || group.access === "conditional")
        .flatMap((group) => group.models)
        .map((model) => [accessModelKey(model), model]),
    ).values(),
  ];
}

/** Distinct reviewed model identities; route variants count as the same model. */
export function publishedAccessModelCount(access: SubscriptionAccess): number {
  return new Set(includedAccessModels(access).map((model) => model.modelId ?? model.name)).size;
}
