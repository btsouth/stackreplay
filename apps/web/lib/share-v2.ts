import type { CatalogV1 } from "@stackreplay/catalog";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import {
  assertNoForbiddenFields,
  isSyntheticCatalogId,
  SHAREABLE_TOOLS,
  type ShareableToolId,
  type ShareReplayV2,
  type ShareWorkloadV2,
  shareableToolId,
  type VerdictFactsV1,
} from "@stackreplay/share";
import { marketRange } from "./decision-presentation";
import type { MarketDecision } from "./market-decision";
import { daysInPeriod, nextDate } from "./review-period";
import type { ImportRecord } from "./worker-protocol";
import { isSyntheticWorkload } from "./workload-kind";
import type { WorkloadProfile } from "./workload-profile";

/**
 * Result -> share snapshot V2 (decision 61): the privacy boundary for every
 * V2 link. Both builders are whitelists that construct new objects from named
 * fields. Names are re-checked on the way out: a maker or model name is kept
 * only when the catalog knows it, and a tool is named only through the fixed
 * list of known recording tools, so a label from a hand-edited portable file
 * cannot reach a public page.
 */

export interface ShareOptions {
  /** Publish the recorded date range. Off by default. */
  includePeriod: boolean;
  /** Explicit opt-in to publishing the billing review dates and aggregates. */
  includeReview?: boolean;
  /** Independent opt-in; never included by default or implied by date sharing. */
  includePaid?: boolean;
  /** Workload only: publish the session count. Off by default. */
  includeSessions?: boolean;
  /** Workload only: publish when each peak happened, and the time zone. Off by default. */
  includeTimes?: boolean;
}

function catalogNames(catalog: Pick<CatalogV1, "models" | "providers">): Set<string> {
  const names = new Set<string>();
  for (const model of Object.values(catalog.models)) names.add(model.name);
  for (const provider of Object.values(catalog.providers)) {
    names.add(provider.name);
    names.add(provider.name.replace(/\s*\([^)]*\)\s*$/u, "").trim());
  }
  return names;
}

function toolLabel(ids: readonly string[]): string {
  const labels = [...new Set(ids.map((id) => SHAREABLE_TOOLS[shareableToolId(id)]))];
  return labels.join(" + ").slice(0, 60);
}

export interface ReplayShareInput {
  facts: VerdictFactsV1;
  projection: ProjectedReplayV1;
  /** The tool slice's adapter ids, when the replay was scoped to one. */
  sourceIds?: readonly string[] | undefined;
  /** Catalog provenance for the target. */
  target: {
    verificationStatus: ShareReplayV2["target"]["verificationStatus"];
    lastVerifiedAt?: string | undefined;
    sources: readonly { url: string; title: string }[];
  };
  catalog: Pick<CatalogV1, "models" | "providers">;
}

export function replayShareV2(input: ReplayShareInput, options: ShareOptions): ShareReplayV2 {
  const { facts, projection } = input;
  const known = catalogNames(input.catalog);
  const keep = (names: readonly string[]) => names.filter((name) => known.has(name));
  const api = projection.target.kind === "api";
  const id = api
    ? (projection.provenance.apiProvider ?? projection.target.reference)
    : (projection.target.planId ?? projection.target.reference);
  const scope = { ...facts.scope };
  if (scope.kind === "source") scope.label = toolLabel(input.sourceIds ?? []) || "Selected tool";
  const snapshot: ShareReplayV2 = {
    version: 2,
    kind: "replay",
    ...(isSyntheticCatalogId(id) ? { synthetic: true as const } : {}),
    verdict: {
      ...facts,
      scope,
      servedMakers: keep(facts.servedMakers),
      unavailableMakers: keep(facts.unavailableMakers),
      substitutions: facts.substitutions.filter(
        (rule) => known.has(rule.from) && known.has(rule.to),
      ),
    },
    target: {
      type: api ? "api" : "subscription",
      id,
      ...(api || projection.target.planVersionId === undefined
        ? {}
        : { versionId: projection.target.planVersionId }),
      verificationStatus: input.target.verificationStatus,
      ...(input.target.lastVerifiedAt === undefined
        ? {}
        : { lastVerifiedAt: input.target.lastVerifiedAt }),
      sources: input.target.sources.slice(0, 4).map((source) => ({
        url: source.url,
        title: source.title,
      })),
    },
    ...(options.includePeriod &&
    projection.workload.from !== undefined &&
    projection.workload.to !== undefined
      ? {
          period: {
            from: projection.workload.from.slice(0, 10),
            to: projection.workload.to.slice(0, 10),
          },
        }
      : {}),
    versions: {
      engine: projection.provenance.engineVersion,
      catalog: projection.provenance.catalogVersion,
      methodology: projection.provenance.methodologyVersion,
      rulesAsOf: projection.provenance.rulesAsOf,
    },
  };
  assertNoForbiddenFields(snapshot);
  return snapshot;
}

export function workloadShareV2(
  record: ImportRecord,
  profile: WorkloadProfile,
  options: ShareOptions,
  decision?: MarketDecision,
): ShareWorkloadV2 {
  const tools = new Map<ShareableToolId, number>();
  for (const source of record.summary.usageSources)
    if (source.role === "usage" && source.events > 0) {
      const id = shareableToolId(source.adapterId);
      tools.set(id, (tools.get(id) ?? 0) + source.events);
    }
  const value = profile.value;
  const overview = profile.overview;
  const range = marketRange(decision) ?? marketRange(decision?.pricedScope);
  const reviewHistory = decision?.review?.history;
  const firstDate = reviewHistory ? reviewHistory.firstDate : overview.firstDate;
  const lastDate = reviewHistory ? reviewHistory.lastDate : overview.lastDate;
  const snapshot: ShareWorkloadV2 = {
    version: 2,
    kind: "workload",
    ...(decision?.review
      ? {
          review: {
            ...(options.includeReview && decision.review.period
              ? { period: { start: decision.review.period.start, end: decision.review.period.end } }
              : {}),
            ...(options.includeReview &&
            decision.review.history.firstDate &&
            decision.review.history.lastDate
              ? {
                  history: {
                    from: decision.review.history.firstDate,
                    to: decision.review.history.lastDate,
                  },
                }
              : {}),
            calls: decision.review.history.calls,
            knownTokens: decision.review.history.knownTokens,
            historyConfirmed: decision.review.historyConfirmed,
            ...(decision.coverage
              ? {
                  pricedKnownTokens: decision.coverage.pricedKnownTokens,
                  recognizedCalls: decision.coverage.recognized,
                }
              : {}),
            state: decision.review.complete
              ? options.includePaid
                ? ("aligned" as const)
                : ("spend-private" as const)
              : ("partial" as const),
            ...(range
              ? {
                  api: {
                    low: range.low,
                    high: range.high,
                    priced: range.priced,
                    rulesAsOf: DECISION_MARKET.rulesAt.slice(0, 10),
                    catalog: DECISION_MARKET.catalogHash,
                  },
                }
              : {}),
            ...(options.includePaid && decision.review.confirmedSpend !== undefined
              ? {
                  spend: {
                    amount: decision.review.confirmedSpend,
                    basis: "local-user-confirmed" as const,
                    subscriptions: decision.review.confirmedCount,
                  },
                }
              : {}),
            ...(options.includePaid && decision.review.complete && decision.review.difference
              ? {
                  difference: {
                    low: decision.review.difference.low,
                    high: decision.review.difference.high,
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(!decision?.review && range && range.calls <= overview.events
      ? {
          market: {
            low: range.low,
            high: range.high,
            priced: range.priced,
            rulesAsOf: DECISION_MARKET.rulesAt.slice(0, 10),
            catalog: DECISION_MARKET.catalogHash,
            assumption: "cache-write-5m-or-1h" as const,
          },
        }
      : {}),
    ...(isSyntheticWorkload(record) ? { synthetic: true as const } : {}),
    workload: {
      calls: decision?.review?.history.calls ?? overview.events,
      spanDays: reviewHistory
        ? firstDate && lastDate
          ? daysInPeriod({ start: firstDate, end: nextDate(lastDate) })
          : 0
        : overview.spanDays,
      activeDays: reviewHistory?.activeDays ?? overview.activeDays,
      knownTokens: decision?.review?.history.knownTokens ?? overview.knownTokens,
      ...(options.includeSessions === true &&
      (!reviewHistory || reviewHistory.calls === overview.events)
        ? { sessions: overview.sessions }
        : {}),
      tools: [
        ...(decision?.review && decision.review.history.calls !== overview.events
          ? []
          : tools.entries()),
      ]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, calls]) => ({ id, calls })),
      ...(options.includePeriod && firstDate !== undefined && lastDate !== undefined
        ? { period: { from: firstDate, to: lastDate } }
        : {}),
    },
    ...(value === undefined || decision !== undefined
      ? {}
      : {
          value: {
            rulesAsOf: value.rulesAsOf,
            recordedCalls: value.recordedCalls,
            pricedCalls: value.pricedCalls,
            knownTokens: { total: value.knownTokens.total, priced: value.knownTokens.priced },
            ...(value.total === undefined ? {} : { total: value.total }),
            makers: value.priced.slice(0, 8).map((slice) => ({
              name: slice.makerName.slice(0, 40),
              calls: slice.calls,
              amount: slice.amount,
            })),
            excluded: value.excluded.slice(0, 8).map((slice) => ({
              ...(slice.makerName === undefined ? {} : { maker: slice.makerName.slice(0, 40) }),
              calls: slice.calls,
              reason: slice.reason,
            })),
            unresolvedCalls: value.unresolvedCalls,
          },
        }),
    facts: (decision?.review
      ? []
      : profile.insights.filter(({ id }) => !decision || id !== "cache-value")
    )
      .slice(0, 3)
      .map(({ fact }) => {
        const { at, zone, ...rest } = fact;
        return options.includeTimes === true
          ? {
              ...rest,
              ...(at === undefined ? {} : { at }),
              ...(zone === undefined ? {} : { zone }),
            }
          : rest;
      }),
    versions: { catalog: record.summary.catalogVersion },
  };
  assertNoForbiddenFields(snapshot);
  return snapshot;
}

/** A recap link contains only the aggregates printed on the card. Model labels resolve from catalog IDs. */
export function recapShareV2(recap: import("./recap").Recap, synthetic = false): ShareWorkloadV2 {
  const snapshot: ShareWorkloadV2 = {
    version: 2,
    kind: "workload",
    ...(synthetic ? { synthetic: true as const } : {}),
    recap: {
      totalTokens: recap.total,
      usd: recap.usd,
      usdHigh: recap.usdHigh,
      pricedRequests: recap.priced,
      rulesAsOf: recap.rulesAsOf,
      streak: recap.longestStreak,
      models: recap.models
        .filter((m) => m.family !== "other")
        .slice(0, 5)
        .map((m) => ({ id: m.id, tokenCount: m.total })),
    },
    workload: {
      calls: recap.records,
      spanDays: recap.days.length,
      activeDays: recap.days.filter((d) => d.records > 0).length,
      knownTokens: recap.total,
      sessions: recap.sessions,
      tools: recap.tools.slice(0, 8).map((t) => ({ id: shareableToolId(t.id), calls: t.records })),
    },
    facts: [],
    versions: { catalog: "recap-v1" },
  };
  assertNoForbiddenFields(snapshot);
  return snapshot;
}
