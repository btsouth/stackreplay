import { Decimal, type DisjointBuckets, tokenAccountingOf } from "@stackreplay/replay-engine";
import type { UsageEventV1 } from "@stackreplay/schema";

/**
 * Workload summary for `scan`.
 *
 * Token totals use the engine's own disjoint-bucket derivation, so the numbers
 * a scan prints are the numbers a replay will use. A workload whose events do
 * not all report every canonical category is reported as partially unknown:
 * the known part is shown, and the unknown part is counted, never estimated.
 */

export interface ModelUsage {
  rawName: string;
  canonicalId?: string;
  events: number;
  tokens: number;
}

export interface WorkloadSummary {
  events: number;
  sessions: number;
  projects: number;
  firstEventAt?: string;
  lastEventAt?: string;
  perSource: { adapterId: string; events: number }[];
  models: ModelUsage[];
  tokens: {
    /** Sum of fully known event totals. */
    known: number;
    /** Sum of the reported part of events whose total is unknown (a lower bound). */
    lowerBound: number;
    /** Events whose total is unknown because a category is missing. */
    unknownEvents: number;
    buckets: DisjointBuckets;
    /** Events that report no reasoning category at all. */
    reasoningUnknownEvents: number;
  };
  nativeCost?: { amount: string; events: number };
}

export function summarizeEvents(events: readonly UsageEventV1[]): WorkloadSummary {
  const sessions = new Set<string>();
  const projects = new Set<string>();
  const perSource = new Map<string, number>();
  const models = new Map<string, ModelUsage>();
  const buckets: DisjointBuckets = {
    uncachedInputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
  };
  let known = 0;
  let lowerBound = 0;
  let unknownEvents = 0;
  let reasoningUnknownEvents = 0;
  let cost = new Decimal(0);
  let costEvents = 0;
  let first: string | undefined;
  let last: string | undefined;

  for (const event of events) {
    if (event.source.nativeSessionHash !== undefined) sessions.add(event.source.nativeSessionHash);
    if (event.projectHash !== undefined) projects.add(event.projectHash);
    perSource.set(event.source.adapterId, (perSource.get(event.source.adapterId) ?? 0) + 1);

    const accounting = tokenAccountingOf(event.usage);
    if (accounting.known) {
      known += accounting.total;
      buckets.uncachedInputTokens += accounting.buckets.uncachedInputTokens;
      buckets.cacheReadTokens += accounting.buckets.cacheReadTokens;
      buckets.cacheWriteTokens += accounting.buckets.cacheWriteTokens;
      buckets.outputTokens += accounting.buckets.outputTokens;
      buckets.reasoningTokens += accounting.buckets.reasoningTokens;
    } else {
      unknownEvents += 1;
      lowerBound += accounting.knownSubtotal;
    }
    if (event.usage.reasoningTokens === undefined) reasoningUnknownEvents += 1;

    const existing = models.get(event.model.rawName);
    const tokens = accounting.known ? accounting.total : accounting.knownSubtotal;
    if (existing === undefined) {
      models.set(event.model.rawName, {
        rawName: event.model.rawName,
        ...(event.model.canonicalId !== undefined ? { canonicalId: event.model.canonicalId } : {}),
        events: 1,
        tokens,
      });
    } else {
      existing.events += 1;
      existing.tokens += tokens;
    }

    if (event.nativeCost !== undefined) {
      cost = cost.plus(event.nativeCost.amount);
      costEvents += 1;
    }

    if (first === undefined || event.occurredAt < first) first = event.occurredAt;
    if (last === undefined || event.occurredAt > last) last = event.occurredAt;
  }

  const summary: WorkloadSummary = {
    events: events.length,
    sessions: sessions.size,
    projects: projects.size,
    perSource: [...perSource.entries()]
      .map(([adapterId, count]) => ({ adapterId, events: count }))
      .sort((a, b) => (a.adapterId < b.adapterId ? -1 : a.adapterId > b.adapterId ? 1 : 0)),
    models: [...models.values()].sort(
      (a, b) => b.events - a.events || (a.rawName < b.rawName ? -1 : 1),
    ),
    tokens: {
      known,
      lowerBound,
      unknownEvents,
      buckets,
      reasoningUnknownEvents,
    },
  };
  if (first !== undefined) summary.firstEventAt = first;
  if (last !== undefined) summary.lastEventAt = last;
  if (costEvents > 0) summary.nativeCost = { amount: cost.toString(), events: costEvents };
  return summary;
}
