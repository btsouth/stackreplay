import type { CatalogV1 } from "@stackreplay/catalog";
import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import type { ExecutionReplayResultV1 } from "@stackreplay/schema";
import {
  composeVerdict,
  VERDICT_FACTS_VERSION,
  type VerdictFactsV1,
  type VerdictV1,
  verdictFactsV1Schema,
} from "@stackreplay/share";
import type { ReplayScope } from "./scoped-replay";
import { localDayOf } from "./timeline";

/**
 * Verdict facts from a replay: the one derivation every result surface uses.
 *
 * Every count is the engine's (the projection's outcomes, crossings and
 * economics); the catalog supplies names only (model, maker and provider
 * names). Calendar days are the viewer's, like everywhere else (decision 57).
 */

export interface VerdictScope {
  kind: VerdictFactsV1["scope"]["kind"];
  label?: string | undefined;
  /** Calls in the whole recorded workload, before any scope. */
  recordedCalls: number;
  /** Calls in the tool slice, before any are left out. */
  sourceCalls?: number | undefined;
  /** Calls left out because their model IDs are unrecognized. */
  unrecognizedLeftOut?: number | undefined;
}

export interface VerdictInput {
  projection: ProjectedReplayV1;
  result: Pick<ExecutionReplayResultV1, "unsupportedModels">;
  /** The target's display name, e.g. "Copilot Pro+" or "Anthropic API". */
  targetName: string;
  scope: VerdictScope;
  timeZone: string;
  catalog: Pick<CatalogV1, "models" | "providers">;
}

/** "Z.AI (Zhipu)" -> "Z.AI": the name a sentence can use. */
export function shortProviderName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, "").trim() || name;
}

function makerName(catalog: VerdictInput["catalog"], modelId: string): string {
  const model = catalog.models[modelId];
  const developer = model?.developerId;
  if (developer !== undefined) {
    const provider = catalog.providers[developer];
    if (provider !== undefined) return shortProviderName(provider.name);
  }
  return model?.name ?? modelId;
}

function orderedNames(entries: readonly { name: string; events: number }[]): string[] {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(entry.name, (totals.get(entry.name) ?? 0) + entry.events);
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([name]) => name)
    .slice(0, 12);
}

/**
 * Who made the models on each side of the line. When one maker is on both
 * sides ("the ones on OpenAI models; the other use OpenAI models"), makers
 * say nothing, so both sides are named by model instead.
 */
function makerLists(
  served: readonly { modelId: string; eventCount: number }[],
  unavailable: readonly { canonicalId?: string | undefined; rawName: string; eventCount: number }[],
  catalog: VerdictInput["catalog"],
): Pick<VerdictFactsV1, "servedMakers" | "unavailableMakers" | "namedBy"> {
  const servedByMaker = served.map((entry) => ({
    name: makerName(catalog, entry.modelId),
    events: entry.eventCount,
  }));
  const unavailableByMaker = unavailable.map((entry) => ({
    name: entry.canonicalId === undefined ? entry.rawName : makerName(catalog, entry.canonicalId),
    events: entry.eventCount,
  }));
  const servedNames = new Set(servedByMaker.map((entry) => entry.name));
  if (!unavailableByMaker.some((entry) => servedNames.has(entry.name)))
    return {
      servedMakers: orderedNames(servedByMaker),
      unavailableMakers: orderedNames(unavailableByMaker),
      namedBy: "maker",
    };
  return {
    servedMakers: orderedNames(
      served.map((entry) => ({
        name: catalog.models[entry.modelId]?.name ?? entry.modelId,
        events: entry.eventCount,
      })),
    ),
    unavailableMakers: orderedNames(
      unavailable.map((entry) => ({
        name:
          entry.canonicalId === undefined
            ? entry.rawName
            : (catalog.models[entry.canonicalId]?.name ?? entry.canonicalId),
        events: entry.eventCount,
      })),
    ),
    namedBy: "model",
  };
}

const LIMIT_OF_UNIT = { usd: "credits", tokens: "tokens", requests: "requests" } as const;
const BEHAVIOUR_OF_EXCEED = {
  allow_overage: "overage",
  reject_request: "refused",
  latch_until_reset: "held",
  record_only: "recorded",
} as const;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function verdictFactsOf(input: VerdictInput): VerdictFactsV1 | undefined {
  const { projection, result, catalog, scope } = input;
  if (projection.mode === undefined) return undefined;
  const outcome = (key: string): number =>
    projection.outcomes.find((entry) => entry.key === key)?.count ?? 0;
  const dayOf = localDayOf(input.timeZone);
  const firstDay =
    projection.workload.from === undefined ? undefined : dayOf(projection.workload.from);

  const unavailable = result.unsupportedModels.filter(
    (entry) => entry.reason !== "unresolved" && entry.reason !== "offering_unestablished",
  );
  const unavailableIds = new Set(unavailable.flatMap((entry) => entry.canonicalId ?? []));
  const served =
    projection.mode === "translated"
      ? []
      : projection.workload.modelShare.filter((entry) => !unavailableIds.has(entry.modelId));

  const crossings = projection.crossings
    .filter((crossing) => crossing.exceededAt !== undefined && crossing.exceed !== undefined)
    .sort((a, b) => ((a.exceededAt ?? "") < (b.exceededAt ?? "") ? -1 : 1));
  const firstCrossing = crossings[0];
  let runOut: VerdictFactsV1["runOut"];
  if (firstCrossing?.exceed !== undefined && firstDay !== undefined) {
    const same = crossings.filter(
      (crossing) => crossing.constraintId === firstCrossing.constraintId,
    );
    const dates = [...new Set(same.map((crossing) => dayOf(crossing.exceededAt ?? "")))].slice(
      0,
      12,
    );
    runOut = {
      limit: LIMIT_OF_UNIT[firstCrossing.unit],
      behaviour: BEHAVIOUR_OF_EXCEED[firstCrossing.exceed],
      dates: dates.map((date) => ({ date, day: daysBetween(firstDay, date) + 1 })),
      windows: same.length,
    };
  }

  const economics = projection.economics;
  const api = projection.target.kind === "api";
  const undecided = outcome("unknown");
  const facts: VerdictFactsV1 = {
    version: VERDICT_FACTS_VERSION,
    target: {
      kind: api ? "api" : "subscription",
      name: input.targetName,
      providerName: shortProviderName(projection.target.providerName),
      ...(projection.target.priceAmount === undefined
        ? {}
        : {
            price: {
              amount: projection.target.priceAmount,
              interval: projection.target.priceInterval ?? "month",
            },
          }),
      capacity: api
        ? "not-applicable"
        : projection.constraints.length > 0
          ? "numeric"
          : "unpublished",
    },
    mode: projection.mode,
    substitutions: (projection.translation?.applied ?? []).slice(0, 16).map((rule) => ({
      from: catalog.models[rule.sourceModelId]?.name ?? rule.sourceModelId,
      to: catalog.models[rule.targetModelId]?.name ?? rule.targetModelId,
      calls: rule.eventCount,
    })),
    scope: {
      kind: scope.kind,
      ...(scope.label === undefined ? {} : { label: scope.label.slice(0, 60) }),
      recordedCalls: scope.recordedCalls,
      ...(scope.sourceCalls === undefined ? {} : { sourceCalls: scope.sourceCalls }),
      ...(scope.unrecognizedLeftOut === undefined || scope.unrecognizedLeftOut === 0
        ? {}
        : { unrecognizedLeftOut: scope.unrecognizedLeftOut }),
    },
    calls: {
      total: projection.workload.eventCount,
      withinAllowance: outcome("included"),
      overage: outcome("overage"),
      blocked: outcome("blocked"),
      unavailable: outcome("unavailable"),
      undecided,
      unrecognized: Math.min(undecided, projection.workload.unresolvedEventCount ?? 0),
    },
    ...makerLists(served, unavailable, catalog),
    // The projection's own day count, so the verdict and the reading beneath
    // it state one period.
    ...(projection.workload.windowDays === undefined
      ? {}
      : { periodDays: projection.workload.windowDays }),
    ...(runOut === undefined ? {} : { runOut }),
    money: {
      ...(economics.basePlanCost === undefined ? {} : { planPrice: economics.basePlanCost }),
      ...(economics.overageCost === undefined || !economics.targetCostEstablished
        ? {}
        : { overage: economics.overageCost }),
      ...(api && economics.targetCost !== undefined ? { apiCost: economics.targetCost } : {}),
    },
  };
  const parsed = verdictFactsV1Schema.safeParse(facts);
  return parsed.success ? parsed.data : undefined;
}

/** Facts and the verdict composed from them, or undefined for a result with no semantics. */
export function verdictOf(
  input: VerdictInput,
): { facts: VerdictFactsV1; verdict: VerdictV1 } | undefined {
  const facts = verdictFactsOf(input);
  return facts === undefined ? undefined : { facts, verdict: composeVerdict(facts) };
}

type ReplayedScope = Pick<VerdictInput, "projection" | "result">;

/** A completed replay as the worker returns it, reduced to what a verdict reads. */
export interface VerdictOutcome extends ReplayedScope {
  /** A scope the person chose: a tool slice, unresolved model IDs left out, or both. */
  scope?: ReplayScope | undefined;
  /** Direct API: the resolved-only replay the worker ran beside the full one. */
  resolvedScope?:
    | (ReplayedScope & { recordedEvents: number; excludedUnresolvedEvents: number })
    | undefined;
}

/**
 * The verdict for a worker outcome. Replay and Compare both call this, so the
 * choice of which replay a verdict reads and which scope it states is made in
 * one place: the resolved-only replay when the worker ran one (its scope is
 * then the verdict's first words), the person's own scope when they chose one,
 * and otherwise every recorded call.
 */
export function verdictOfOutcome(
  outcome: VerdictOutcome,
  targetName: string,
  options: { timeZone: string; catalog: VerdictInput["catalog"] },
): { facts: VerdictFactsV1; verdict: VerdictV1 } | undefined {
  const { resolvedScope, scope } = outcome;
  const replayed = resolvedScope ?? outcome;
  const unrecognizedLeftOut =
    resolvedScope?.excludedUnresolvedEvents ?? scope?.excludedUnresolvedEvents ?? 0;
  const slice = scope?.source;
  return verdictOf({
    projection: replayed.projection,
    result: replayed.result,
    targetName,
    scope: {
      kind: slice !== undefined ? "source" : unrecognizedLeftOut > 0 ? "resolved" : "all",
      ...(slice === undefined ? {} : { label: slice.label, sourceCalls: slice.events }),
      recordedCalls:
        scope?.recordedEvents ??
        resolvedScope?.recordedEvents ??
        outcome.projection.workload.eventCount,
      unrecognizedLeftOut,
    },
    ...options,
  });
}
