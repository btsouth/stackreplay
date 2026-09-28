import type { TextUsageEventV1 } from "@stackreplay/schema";
import type { CapacityContext, CapacitySummary } from "./observed-capacity";
import type { ReviewPeriod } from "./review-period";

export interface ActivityPoint {
  id: string;
  at: string;
  source: string;
  resourceInstanceId?: string;
}
export interface ObservedCapacityEpisode {
  episodeId: string;
  resourceInstanceId: string;
  planId: string | undefined;
  firstBlockedAt: string;
  lastBlockedAt: string;
  resetAt?: string;
  scope: string;
  grouping: "explicit-reset" | "unlinked-record";
  blockedAttemptIds: string[];
  blockedAttempts: { id: string; at: string }[];
  affectedSessionIds: string[];
  nextMainSuccess?: ActivityPoint;
  nextAnyActivity?: ActivityPoint;
  nextOtherHarnessActivity?: ActivityPoint;
  observationEnd: string;
  retrySpanMs: number;
  scheduledRemainingMs?: number;
  before: CapacityContext[];
}
export interface Distribution {
  count: number;
  min: number;
  median: number;
  max: number;
}
export interface CapacityBurden {
  methodology: "capacity-episodes-v1";
  digest: string;
  episodes: ObservedCapacityEpisode[];
  resetLinked: number;
  unlinked: number;
  fiveHour: number;
  modelSpecific: number;
  attempts: number;
  sessions: number;
  days: number;
  sources: { source: string; eligibleResponses: number }[];
  excludedActivityRecords: number;
  contextUnavailable: string[];
  contextWarnings: string[];
  withOtherBeforeMain: number;
  withObservedNextMain: number;
  noOtherBeforeBoundary: number;
  scheduledExposureMs: number;
  scheduledRemaining?: Distribution | undefined;
  retrySpan?: Distribution | undefined;
  nextMainMs?: Distribution | undefined;
  nextAnyMs?: Distribution | undefined;
  onset: { hours: number; tokens?: Distribution | undefined; partialContexts: number }[];
}
export function distribution(values: number[]): Distribution | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    max: sorted.at(-1) ?? 0,
    median:
      sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2,
  };
}
export function evidenceDigest(value: unknown): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(JSON.stringify(value)))
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return hash.toString(16);
}
/** Positive, exact per-response output is evidence of activity. Aggregates and zero/unknown output are not. */
export function activityPoint(event: TextUsageEventV1): ActivityPoint | undefined {
  if (
    event.confidence.usage !== "exact" ||
    !(event.usage.outputTokens && event.usage.outputTokens > 0)
  )
    return;
  return {
    id: event.source.nativeEventHash ?? event.id,
    at: event.occurredAt,
    source: event.source.adapterId,
    ...(event.source.resourceInstanceId
      ? { resourceInstanceId: event.source.resourceInstanceId }
      : {}),
  };
}
export function intervalUnionMs(intervals: [number, number][]): number {
  const sorted = intervals.filter(([a, b]) => b >= a).sort((a, b) => a[0] - b[0]);
  let start: number | undefined,
    end = 0,
    total = 0;
  for (const [a, b] of sorted) {
    if (start === undefined) {
      start = a;
      end = b;
    } else if (a <= end) end = Math.max(end, b);
    else {
      total += end - start;
      start = a;
      end = b;
    }
  }
  return total + (start === undefined ? 0 : end - start);
}
function nextActivity(rows: ActivityPoint[], at: string): ActivityPoint | undefined {
  const time = Date.parse(at);
  let low = 0,
    high = rows.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (Date.parse(rows[mid]?.at ?? "") <= time) low = mid + 1;
    else high = mid;
  }
  return rows[low];
}
/** Deterministic episode composition. Other-source chronology never contributes to main-account workload. */
export function composeCapacityBurden(input: {
  capacity: CapacitySummary;
  mainActivity: ActivityPoint[];
  contextActivity: ActivityPoint[];
  resourceInstanceId: string;
  planId: string | undefined;
  period: ReviewPeriod;
  mainSource: string;
  excludedActivityRecords?: number;
  contextUnavailable?: string[];
  contextWarnings?: string[];
}): CapacityBurden {
  const { capacity, resourceInstanceId, planId, period } = input;
  const start = Date.parse(`${period.start}T00:00:00Z`),
    end = Date.parse(`${period.end}T00:00:00Z`);
  const inPeriod = (at: string) => Date.parse(at) >= start && Date.parse(at) < end;
  const ordered = (rows: ActivityPoint[]) =>
    [
      ...new Map(
        rows
          .filter((r) => inPeriod(r.at))
          .map((r) => [JSON.stringify([r.source, r.resourceInstanceId, r.id]), r]),
      ).values(),
    ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
  const main = ordered(
    input.mainActivity.filter((r) => r.resourceInstanceId === resourceInstanceId),
  );
  const context = ordered(
    input.contextActivity.filter(
      (r) =>
        r.source !== input.mainSource ||
        (r.resourceInstanceId !== undefined && r.resourceInstanceId !== resourceInstanceId),
    ),
  );
  const others = context.filter((r) => r.source !== input.mainSource);
  const any = ordered([...main, ...context]);
  const groups = new Map<string, CapacitySummary["events"]>();
  const hard = [
    ...new Map(
      capacity.events
        .filter(
          (e) =>
            e.eventType === "hard_limit_reached" &&
            e.resourceInstanceId === resourceInstanceId &&
            inPeriod(e.timestamp),
        )
        .map((e) => [e.id, e]),
    ).values(),
  ].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.id.localeCompare(b.id));
  for (const event of hard) {
    const explicit = event.resetAt && Date.parse(event.resetAt) >= Date.parse(event.timestamp);
    const key = JSON.stringify([
      resourceInstanceId,
      event.windowType,
      event.code,
      event.modelLabel ?? null,
      explicit ? event.resetAt : event.id,
    ]);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  const episodes: ObservedCapacityEpisode[] = [];
  for (const [key, events] of groups) {
    const first = events[0],
      last = events.at(-1);
    if (!first || !last) continue;
    const explicit = first.resetAt && Date.parse(first.resetAt) >= Date.parse(first.timestamp);
    const nextMain = nextActivity(main, first.timestamp),
      nextAny = nextActivity(any, first.timestamp),
      nextOther = nextActivity(others, first.timestamp);
    const boundary =
      nextMain?.at ??
      (explicit && first.resetAt && Date.parse(first.resetAt) < end
        ? first.resetAt
        : new Date(end).toISOString());
    episodes.push({
      episodeId: `episode-v1:${evidenceDigest(key)}`,
      resourceInstanceId,
      planId,
      firstBlockedAt: first.timestamp,
      lastBlockedAt: last.timestamp,
      ...(first.resetAt ? { resetAt: first.resetAt } : {}),
      scope: first.modelLabel ? `${first.windowType}: ${first.modelLabel}` : first.windowType,
      grouping: explicit ? "explicit-reset" : "unlinked-record",
      blockedAttemptIds: events.map((e) => e.id),
      blockedAttempts: events.map((e) => ({ id: e.id, at: e.timestamp })),
      affectedSessionIds: [...new Set(events.map((e) => e.sessionId))],
      ...(nextMain ? { nextMainSuccess: nextMain } : {}),
      ...(nextAny ? { nextAnyActivity: nextAny } : {}),
      ...(nextOther ? { nextOtherHarnessActivity: nextOther } : {}),
      observationEnd: boundary,
      retrySpanMs: Date.parse(last.timestamp) - Date.parse(first.timestamp),
      ...(explicit && first.resetAt
        ? { scheduledRemainingMs: Date.parse(first.resetAt) - Date.parse(first.timestamp) }
        : {}),
      before: first.before,
    });
  }
  const sources = new Map<string, number>();
  for (const point of any) sources.set(point.source, (sources.get(point.source) ?? 0) + 1);
  const durations = (key: "nextMainSuccess" | "nextAnyActivity") =>
    episodes.flatMap((e) => (e[key] ? [Date.parse(e[key].at) - Date.parse(e.firstBlockedAt)] : []));
  return {
    methodology: "capacity-episodes-v1",
    digest: `episodes-v1:${evidenceDigest([capacity.digest, period, resourceInstanceId, planId, main, context, input.contextUnavailable ?? [], input.contextWarnings ?? []])}`,
    episodes,
    resetLinked: episodes.filter((e) => e.grouping === "explicit-reset").length,
    unlinked: episodes.filter((e) => e.grouping === "unlinked-record").length,
    fiveHour: episodes.filter((e) => e.scope === "five_hour").length,
    modelSpecific: episodes.filter((e) => e.scope.startsWith("model")).length,
    attempts: hard.length,
    sessions: new Set(hard.map((e) => e.sessionId)).size,
    days: new Set(hard.map((e) => e.timestamp.slice(0, 10))).size,
    sources: [...sources].map(([source, eligibleResponses]) => ({ source, eligibleResponses })),
    excludedActivityRecords: input.excludedActivityRecords ?? 0,
    contextUnavailable: input.contextUnavailable ?? [],
    contextWarnings: input.contextWarnings ?? [],
    withOtherBeforeMain: episodes.filter(
      (e) =>
        e.nextMainSuccess &&
        e.nextOtherHarnessActivity &&
        Date.parse(e.nextOtherHarnessActivity.at) < Date.parse(e.nextMainSuccess.at),
    ).length,
    withObservedNextMain: episodes.filter((e) => e.nextMainSuccess).length,
    noOtherBeforeBoundary: episodes.filter(
      (e) =>
        !e.nextOtherHarnessActivity ||
        Date.parse(e.nextOtherHarnessActivity.at) >= Date.parse(e.observationEnd),
    ).length,
    scheduledExposureMs: intervalUnionMs(
      episodes.flatMap((e) =>
        e.scheduledRemainingMs !== undefined && e.resetAt
          ? [
              [Date.parse(e.firstBlockedAt), Math.min(end, Date.parse(e.resetAt))] as [
                number,
                number,
              ],
            ]
          : [],
      ),
    ),
    scheduledRemaining: distribution(
      episodes.flatMap((e) =>
        e.scheduledRemainingMs !== undefined ? [e.scheduledRemainingMs] : [],
      ),
    ),
    retrySpan: distribution(episodes.map((e) => e.retrySpanMs)),
    nextMainMs: distribution(durations("nextMainSuccess")),
    nextAnyMs: distribution(durations("nextAnyActivity")),
    onset: [5, 24, 168].map((hours) => {
      const contexts = episodes.flatMap((e) => e.before.filter((c) => c.hours === hours));
      return {
        hours,
        tokens: distribution(contexts.map((c) => c.knownTokens)),
        partialContexts: contexts.filter((c) => c.unknownTokenResponses > 0).length,
      };
    }),
  };
}
