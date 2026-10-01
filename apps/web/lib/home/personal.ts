import type { TargetKey } from "../routes";
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
      return { key, name: plan?.name ?? "Plan no longer listed", price: plan?.price };
    }
    const provider = index.apiProviders[key.slice(4)];
    return { key, name: provider === undefined ? "API no longer listed" : `${provider} API` };
  });
  const plans = lines.filter((line) => line.key.startsWith("plan:"));
  const monthly =
    plans.length > 0 &&
    plans.every((line) => line.price?.currency === "USD" && line.price.interval === "month")
      ? addCents(plans.map((line) => line.price?.amount ?? "0"))
      : undefined;
  return {
    importId: record.id,
    label: record.label,
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

/** Share of recorded calls on models a plan's published lineup includes. */
export function lineupCoverage(includedModelIds: readonly string[], usage: CanonicalUsage): number {
  if (usage.total === 0) return 0;
  let covered = 0;
  for (const id of includedModelIds) covered += usage.byModel.get(id) ?? 0;
  return covered / usage.total;
}
