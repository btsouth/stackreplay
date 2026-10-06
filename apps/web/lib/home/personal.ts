import type { TargetKey } from "../current-stack";
import type { ImportRecord, WorkloadSummary } from "../worker-protocol";

/**
 * The homepage's personal layer, as pure functions over data the browser
 * already stores: the newest saved workload's summary (written at import) and
 * the Current Stack selection. Nothing here opens a workload payload or runs a
 * replay; the analyses themselves live in the application.
 *
 * Identity is canonical only. A recorded model counts toward a catalog model
 * when the summary's resolved `canonicalId` is exactly that id. A raw name that
 * did not resolve stays unresolved: it is never compared with model names, so
 * "claude-opus-5-5-preview" is not Claude Opus 5.5.
 *
 * This module is imported by client components, so it takes catalog facts as
 * plain data (`HomeCatalogIndex`) instead of importing the catalog.
 */

export interface HomeCatalogIndex {
  models: Readonly<
    Record<string, { name: string; developer?: string | undefined; familyId?: string | undefined }>
  >;
  plans: Readonly<
    Record<
      string,
      {
        name: string;
        providerName: string;
        price: { amount: string; currency: string; interval: string };
        /** Reviewed subscription family (stack discovery), never a name match. */
        family?: string | undefined;
      }
    >
  >;
  apiProviders: Readonly<Record<string, string>>;
}

/** The labelled example workload the personal chapter shows before a scan. */
export interface ExampleWorkload {
  label: string;
  source: string;
  from: string;
  to: string;
  rangeDays: number;
  calls: number;
  knownTokens: number;
  models: number;
  /** An API figure the engine established for the calls it could price. */
  api?: { name: string; cost: string; pricedCalls: number; rulesAsOf: string } | undefined;
}

export interface CanonicalUsage {
  /** Recorded calls per canonical model id. */
  byModel: ReadonlyMap<string, number>;
  /** Calls whose model identity did not resolve to any catalog model. */
  unresolved: number;
  total: number;
}

export function canonicalUsage(
  summary: Pick<WorkloadSummary, "models" | "eventCount">,
): CanonicalUsage {
  const byModel = new Map<string, number>();
  let unresolved = 0;
  for (const model of summary.models) {
    if (model.mapped && model.canonicalId !== undefined)
      byModel.set(model.canonicalId, (byModel.get(model.canonicalId) ?? 0) + model.events);
    else unresolved += model.events;
  }
  return { byModel, unresolved, total: summary.eventCount };
}

export type ModelUsageView =
  | { kind: "used"; calls: number; share: number }
  | {
      kind: "related";
      /** Other releases (or the bare family name) of the same model family the workload used. */
      related: readonly { id: string; name: string; calls: number; familyOnly: boolean }[];
    }
  | { kind: "unseen" };

/**
 * Whether the workload used a model, or another release of its family. The
 * family relationship is the catalog's `familyId`, never a name comparison.
 */
export function modelUsage(
  modelId: string,
  familyId: string | undefined,
  usage: CanonicalUsage,
  index: HomeCatalogIndex,
): ModelUsageView {
  const calls = usage.byModel.get(modelId) ?? 0;
  if (calls > 0) return { kind: "used", calls, share: usage.total === 0 ? 0 : calls / usage.total };
  if (familyId === undefined) return { kind: "unseen" };
  const related = [...usage.byModel]
    .filter(
      ([id, count]) =>
        count > 0 && id !== modelId && (id === familyId || index.models[id]?.familyId === familyId),
    )
    .map(([id, count]) => ({
      id,
      name: index.models[id]?.name ?? id,
      calls: count,
      familyOnly: id === familyId,
    }))
    .sort((a, b) => b.calls - a.calls);
  return related.length > 0 ? { kind: "related", related } : { kind: "unseen" };
}

export interface Share {
  label: string;
  calls: number;
  share: number;
}

function shares(entries: Iterable<[string, number]>, total: number): Share[] {
  return [...entries]
    .filter(([, calls]) => calls > 0)
    .map(([label, calls]) => ({ label, calls, share: total === 0 ? 0 : calls / total }))
    .sort((a, b) => b.calls - a.calls || a.label.localeCompare(b.label));
}

export interface StackLine {
  key: TargetKey;
  name: string;
  /** How many subscriptions of this plan the stack holds. */
  count?: number | undefined;
  price?: { amount: string; currency: string; interval: string } | undefined;
}

export interface PersonalSnapshot {
  importId: string;
  label: string;
  firstEventAt?: string | undefined;
  lastEventAt?: string | undefined;
  calls: number;
  knownTokens: number;
  /** Events whose token total is incomplete; their reported tokens are a lower bound. */
  unknownTokenEvents: number;
  resolvedModels: number;
  unresolvedCalls: number;
  tools: readonly Share[];
  developers: readonly Share[];
  topModel?: (Share & { id: string }) | undefined;
  stack: readonly StackLine[];
  /** Sum of monthly USD published prices, when every subscription in the stack has one. */
  stackMonthlyUsd?: string | undefined;
}

export function personalSnapshot(
  record: Pick<ImportRecord, "id" | "label" | "summary">,
  stack: readonly TargetKey[],
  counts: Readonly<Record<string, number>> | undefined,
  index: HomeCatalogIndex,
): PersonalSnapshot {
  const summary = record.summary;
  const usage = canonicalUsage(summary);
  const developerCalls = new Map<string, number>();
  for (const [id, calls] of usage.byModel) {
    const developer = index.models[id]?.developer ?? "Developer not recorded";
    developerCalls.set(developer, (developerCalls.get(developer) ?? 0) + calls);
  }
  const top = [...usage.byModel].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const usageTools = summary.usageSources.filter((source) => source.events > 0);
  const toolTotal = usageTools.reduce((sum, source) => sum + source.events, 0);
  const lines = stack.map((key): StackLine => {
    if (key.startsWith("plan:")) {
      const plan = index.plans[key.slice(5)];
      const count = Math.max(1, counts?.[key] ?? 1);
      return {
        key,
        name: plan?.name ?? "Plan no longer listed",
        price: plan?.price,
        ...(count > 1 ? { count } : {}),
      };
    }
    const provider = index.apiProviders[key.slice(4)];
    return { key, name: provider === undefined ? "API no longer listed" : `${provider} API` };
  });
  const plans = lines.filter((line) => line.key.startsWith("plan:"));
  const monthly =
    plans.length > 0 &&
    plans.every((line) => line.price?.currency === "USD" && line.price.interval === "month")
      ? addCents(
          plans.flatMap((line) =>
            Array.from({ length: line.count ?? 1 }, () => line.price?.amount ?? "0"),
          ),
        )
      : undefined;
  return {
    importId: record.id,
    label: displayLabel(
      record.label,
      usageTools.filter((source) => source.events > 0).map((source) => source.name),
    ),
    firstEventAt: summary.firstEventAt,
    lastEventAt: summary.lastEventAt,
    calls: summary.eventCount,
    knownTokens: summary.tokens.known,
    unknownTokenEvents: summary.tokens.unknownEvents,
    resolvedModels: usage.byModel.size,
    unresolvedCalls: usage.unresolved,
    tools: shares(
      usageTools.map((source) => [source.name, source.events] as [string, number]),
      toolTotal,
    ),
    developers: shares(developerCalls, usage.total - usage.unresolved),
    topModel:
      top === undefined
        ? undefined
        : {
            id: top[0],
            label: index.models[top[0]]?.name ?? top[0],
            calls: top[1],
            share: usage.total === 0 ? 0 : top[1] / usage.total,
          },
    stack: lines,
    stackMonthlyUsd: monthly,
  };
}

/**
 * The import worker names a multi-file selection "Selected workload (N files)"
 * and an unnamed one "Selected workload". Those say nothing about the work, so
 * the snapshot names the recording tools instead. A label the user chose stays.
 */
export function isGeneratedLabel(label: string): boolean {
  return /^Selected workload(?: \(\d[\d,]* files?\))?$/u.test(label.trim());
}

function displayLabel(label: string, tools: readonly string[]): string {
  if (!isGeneratedLabel(label) || tools.length === 0) return label;
  return `${tools.join(" + ")} history`;
}

/** Decimal dollar strings summed in integer cents, so "19.99" + "20" is exactly "39.99". */
export function addCents(amounts: readonly string[]): string {
  let cents = 0n;
  for (const amount of amounts) {
    const [whole = "0", fraction = ""] = amount.split(".");
    cents += BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2));
  }
  const whole = cents / 100n;
  const rest = cents % 100n;
  return rest === 0n ? whole.toString() : `${whole}.${rest.toString().padStart(2, "0")}`;
}

/** Which market changes touch this visitor: a plan in their stack, or a model they used. */
export function personalRelevance(
  item: { planIds: readonly string[]; modelIds: readonly string[] },
  stack: readonly TargetKey[],
  usage: CanonicalUsage | undefined,
): "stack" | "workload" | undefined {
  if (item.planIds.some((id) => stack.includes(`plan:${id}`))) return "stack";
  if (usage !== undefined && item.modelIds.some((id) => (usage.byModel.get(id) ?? 0) > 0))
    return "workload";
  return undefined;
}

export type MarketRelationKind = "stack" | "used" | "related";

export interface MarketRelation {
  kind: MarketRelationKind;
  /** "In your stack", "Used by you", "Relevant to you". */
  label: string;
  /** The established relation, in words ("12,402 recorded calls"). */
  detail: string;
  /** Recorded calls on the exact model, for a "used" relation. */
  calls?: number | undefined;
}

export const MARKET_RELATION_LABELS: Record<MarketRelationKind, string> = {
  stack: "In your stack",
  used: "Used by you",
  related: "Relevant to you",
};

const callCount = (calls: number) => `${calls.toLocaleString("en-US")} recorded calls`;

/**
 * How a market event relates to this visitor, by canonical identity only:
 *
 * - stack: a plan the event names is in the Current Stack;
 * - used: a model the event names has recorded calls under its exact id;
 * - related: a model the event names shares the catalog `familyId` of a used
 *   model, or a plan it names is in the same reviewed subscription family as
 *   a plan in the stack.
 *
 * A raw, unresolved model name is never compared with anything, so a lookalike
 * name relates to nothing. Unknown stays unknown: no relation is returned.
 */
export function marketRelation(
  item: { planIds: readonly string[]; modelIds: readonly string[] },
  stack: readonly TargetKey[],
  usage: CanonicalUsage | undefined,
  index: HomeCatalogIndex,
): MarketRelation | undefined {
  const stackPlans = stack.filter((key) => key.startsWith("plan:")).map((key) => key.slice(5));
  const inStack = item.planIds.find((id) => stackPlans.includes(id));
  if (inStack !== undefined)
    return {
      kind: "stack",
      label: MARKET_RELATION_LABELS.stack,
      detail: `${index.plans[inStack]?.name ?? "This plan"} is in your stack`,
    };
  if (usage !== undefined) {
    const used = item.modelIds
      .map((id) => ({ id, calls: usage.byModel.get(id) ?? 0 }))
      .filter((entry) => entry.calls > 0)
      .sort((a, b) => b.calls - a.calls)[0];
    if (used !== undefined)
      return {
        kind: "used",
        label: MARKET_RELATION_LABELS.used,
        detail: `${callCount(used.calls)} on ${index.models[used.id]?.name ?? "this model"}`,
        calls: used.calls,
      };
    for (const id of item.modelIds) {
      const family = index.models[id]?.familyId;
      if (family === undefined) continue;
      const sibling = [...usage.byModel]
        .filter(
          ([other, calls]) =>
            calls > 0 &&
            other !== id &&
            (other === family || index.models[other]?.familyId === family),
        )
        .sort((a, b) => b[1] - a[1])[0];
      if (sibling !== undefined)
        return {
          kind: "related",
          label: MARKET_RELATION_LABELS.related,
          detail: `You used ${index.models[sibling[0]]?.name ?? "another release"} (${callCount(sibling[1])})`,
        };
    }
  }
  for (const id of item.planIds) {
    const family = index.plans[id]?.family;
    if (family === undefined) continue;
    const sibling = stackPlans.find((planId) => index.plans[planId]?.family === family);
    if (sibling !== undefined)
      return {
        kind: "related",
        label: MARKET_RELATION_LABELS.related,
        detail: `Same plan family as ${index.plans[sibling]?.name ?? "a plan"} in your stack`,
      };
  }
  return undefined;
}

const RELATION_ORDER: Record<MarketRelationKind, number> = { used: 0, stack: 1, related: 2 };
const IMPORTANCE_ORDER = { major: 0, notable: 1, minor: 2 } as const;

/**
 * Related events, strongest relation first (recorded use by calls, then the
 * stack, then family), then importance and recency. One per related subject:
 * a relation's detail names its model or plan ("… on Claude Opus 5.5",
 * "Claude Max 5x is in your stack"), so the first event about a subject
 * stands for the rest.
 */
export function strongestFirst<
  T extends { id: string; day: string; importance: keyof typeof IMPORTANCE_ORDER },
>(
  events: readonly T[],
  relations: ReadonlyMap<string, MarketRelation>,
): { event: T; relation: MarketRelation }[] {
  const sorted = events
    .flatMap((event) => {
      const relation = relations.get(event.id);
      return relation === undefined ? [] : [{ event, relation }];
    })
    .sort(
      (a, b) =>
        RELATION_ORDER[a.relation.kind] - RELATION_ORDER[b.relation.kind] ||
        (b.relation.calls ?? 0) - (a.relation.calls ?? 0) ||
        IMPORTANCE_ORDER[a.event.importance] - IMPORTANCE_ORDER[b.event.importance] ||
        b.event.day.localeCompare(a.event.day),
    );
  const seen = new Set<string>();
  return sorted.filter(({ relation }) => {
    if (seen.has(relation.detail)) return false;
    seen.add(relation.detail);
    return true;
  });
}

/** Share of recorded calls on models a plan's published lineup includes. */
export function lineupCoverage(includedModelIds: readonly string[], usage: CanonicalUsage): number {
  if (usage.total === 0) return 0;
  let covered = 0;
  for (const id of includedModelIds) covered += usage.byModel.get(id) ?? 0;
  return covered / usage.total;
}
