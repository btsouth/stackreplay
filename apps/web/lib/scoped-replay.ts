import type { CatalogV1, ModelIdentityIndex } from "@stackreplay/catalog";
import {
  type ApiPriceabilityCountsV1,
  type PriceReceiptV1,
  type ProjectedReplayV1,
  projectReplay,
  replayWithReceipt,
} from "@stackreplay/replay-engine";
import type { ExecutionReplayResultV1, ExecutionTargetV1, UsageEventV1 } from "@stackreplay/schema";
import { splitByIdentity } from "./workload-scope";

/**
 * A replay under an explicit scope, and the one place scopes are applied.
 *
 * Two scopes exist, and both are stated wherever the result is shown:
 *
 * - A tool slice: only the calls one or more recording tools made ("your
 *   Claude Code work"). A mixed workload is several workloads recorded side by
 *   side, and a plan that runs one tool's models can be asked about that tool's
 *   calls on their own.
 * - Resolved-only (decision 49): the calls whose model identity resolves, when
 *   the person leaves the others out.
 *
 * Separately, a Direct API replay whose price is blocked only by unrecognized
 * model IDs is also replayed over its resolved calls (decision 58). That replay
 * is returned beside the unchanged result, never in its place.
 */

export interface ReplayScope {
  /** Calls in the whole recorded workload. */
  recordedEvents: number;
  /** Calls the person chose to leave out because their model identity is unresolved. */
  excludedUnresolvedEvents: number;
  /** The tool slice, when the replay is scoped to one. */
  source?: { ids: string[]; label: string; events: number } | undefined;
}

export interface ResolvedScopeReplay {
  result: ExecutionReplayResultV1;
  projection: ProjectedReplayV1;
  receipt?: PriceReceiptV1;
  /** Calls left out because their model IDs are unrecognized. */
  excludedUnresolvedEvents: number;
  /** Calls in the scope before they were left out. */
  recordedEvents: number;
}

export interface ScopedReplayInput {
  events: readonly UsageEventV1[];
  target: ExecutionTargetV1;
  catalog: CatalogV1;
  identity: ModelIdentityIndex;
  rulesAsOf: string;
  timeZone?: string | undefined;
  /** Recording tools to keep, by adapter id; absent or empty for every tool. */
  sources?: readonly string[] | undefined;
  /** Display names of recording tools, by adapter id. */
  sourceNames?: ReadonlyMap<string, string> | undefined;
  excludeUnresolved?: boolean | undefined;
}

export interface ScopedReplay {
  result: ExecutionReplayResultV1;
  projection: ProjectedReplayV1;
  receipt?: PriceReceiptV1 | undefined;
  priceability?: ApiPriceabilityCountsV1 | undefined;
  /** Present when the replay ran under a scope. */
  scope?: ReplayScope | undefined;
  resolvedScope?: ResolvedScopeReplay | undefined;
  /** The calls the replay ran over, for the timeline. */
  events: readonly UsageEventV1[];
}

export function runScopedReplay(input: ScopedReplayInput): ScopedReplay {
  const { catalog, target, rulesAsOf, identity } = input;
  const timeZone = input.timeZone;
  const wanted = input.sources ?? [];
  const sliced =
    wanted.length === 0
      ? input.events
      : input.events.filter((event) => wanted.includes(event.source.adapterId));
  const source =
    wanted.length === 0
      ? undefined
      : {
          ids: [...wanted],
          label: wanted.map((id) => input.sourceNames?.get(id) ?? id).join(" + "),
          events: sliced.length,
        };
  const split = input.excludeUnresolved === true ? splitByIdentity(sliced, identity) : undefined;
  const events = split?.resolved ?? sliced;

  const { result, receipt, priceability } = replayWithReceipt({
    events,
    target,
    catalog,
    context: { rulesAsOf },
  });

  // A Direct API price blocked only by unrecognized model IDs: replay the
  // resolved-only part of the same scope too, so the result can state a
  // complete price for a stated scope instead of no price at all.
  let resolvedScope: ResolvedScopeReplay | undefined;
  if (
    target.type === "api" &&
    split === undefined &&
    result.economics === undefined &&
    priceability !== undefined &&
    priceability.unresolved > 0 &&
    priceability.priced > 0 &&
    priceability.priced + priceability.unresolved === events.length
  ) {
    const resolved = splitByIdentity(events, identity);
    const run = replayWithReceipt({
      events: resolved.resolved,
      target,
      catalog,
      context: { rulesAsOf },
    });
    if (run.result.economics !== undefined)
      resolvedScope = {
        result: run.result,
        projection: projectReplay(run.result, catalog, { timeZone }),
        ...(run.receipt === undefined ? {} : { receipt: run.receipt }),
        excludedUnresolvedEvents: resolved.unresolved,
        recordedEvents: events.length,
      };
  }

  const scoped = split !== undefined || source !== undefined;
  return {
    result,
    projection: projectReplay(result, catalog, { timeZone }),
    receipt,
    priceability,
    ...(scoped
      ? {
          scope: {
            recordedEvents: input.events.length,
            excludedUnresolvedEvents: split?.unresolved ?? 0,
            ...(source === undefined ? {} : { source }),
          },
        }
      : {}),
    ...(resolvedScope === undefined ? {} : { resolvedScope }),
    events,
  };
}
