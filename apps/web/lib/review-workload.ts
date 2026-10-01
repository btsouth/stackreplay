import { tokenAccountingOf } from "@stackreplay/replay-engine";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { accountKeyOf } from "./accounts";
import { dateSchema, periodSchema, type ReviewHistory, type ReviewPeriod } from "./review-period";

/** Chronological filtering has no billing-cycle length limit. Returns original event references. */
export function recordedEventsInPeriod(
  events: readonly TextUsageEventV1[],
  period?: ReviewPeriod,
  resourceInstanceId?: string,
) {
  if (period) {
    dateSchema.parse(period.start);
    dateSchema.parse(period.end);
    if (period.end <= period.start) throw new Error("End must be after start");
  }
  const start = period ? Date.parse(`${period.start}T00:00:00Z`) : -Infinity;
  const end = period ? Date.parse(`${period.end}T00:00:00Z`) : Infinity;
  return period || resourceInstanceId
    ? events.filter((event) => {
        const at = Date.parse(event.occurredAt);
        return (
          at >= start &&
          at < end &&
          (!resourceInstanceId || event.source.resourceInstanceId === resourceInstanceId)
        );
      })
    : events;
}

/** Worker-only scope selection. Retain original events; return references, never clone usage. */
export function reviewWorkload(
  events: readonly TextUsageEventV1[],
  period?: ReviewPeriod,
  resourceInstanceId?: string,
) {
  if (period) periodSchema.parse(period);
  const scoped = recordedEventsInPeriod(events, period, resourceInstanceId);
  const history: ReviewHistory = {
    calls: scoped.length,
    knownTokens: 0,
    unknownTokenCalls: 0,
    activeDays: 0,
    importedCalls: events.length,
    outsideCalls: events.length - scoped.length,
  };
  if (resourceInstanceId) history.resourceInstanceId = resourceInstanceId;
  const accounts = new Map<string, { resourceInstanceId: string; source: string; calls: number }>();
  for (const event of events) {
    const id = event.source.resourceInstanceId;
    if (!id) continue;
    const account = accounts.get(id) ?? {
      resourceInstanceId: id,
      source: event.source.adapterId,
      calls: 0,
    };
    account.calls++;
    accounts.set(id, account);
  }
  history.accounts = [...accounts.values()];
  const recorded = new Map<string, { key: string; source: string; calls: number }>();
  for (const event of events) {
    const key = accountKeyOf(event.source);
    const account = recorded.get(key) ?? { key, source: event.source.adapterId, calls: 0 };
    account.calls++;
    recorded.set(key, account);
  }
  history.recordedAccounts = [...recorded.values()];
  const active = new Set<string>();
  for (const event of scoped) {
    if (event.source.nativeResponse) {
      history.nativeResponses = (history.nativeResponses ?? 0) + 1;
      history.duplicateRows =
        (history.duplicateRows ?? 0) + event.source.nativeResponse.duplicateRows;
    }
    const date = new Date(event.occurredAt).toISOString().slice(0, 10);
    active.add(date);
    if (!history.firstDate || date < history.firstDate) history.firstDate = date;
    if (!history.lastDate || date > history.lastDate) history.lastDate = date;
    const accounting = tokenAccountingOf(event.usage);
    if (accounting.known) history.knownTokens += accounting.total;
    else history.unknownTokenCalls++;
  }
  history.activeDays = active.size;
  return { events: scoped, history };
}
