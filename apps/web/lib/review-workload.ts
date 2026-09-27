import { tokenAccountingOf } from "@stackreplay/replay-engine";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { periodSchema, type ReviewHistory, type ReviewPeriod } from "./review-period";

/** Worker-only scope selection. Retain original events; return references, never clone usage. */
export function reviewWorkload(events: readonly TextUsageEventV1[], period?: ReviewPeriod) {
  if (period) periodSchema.parse(period);
  const start = period ? Date.parse(`${period.start}T00:00:00Z`) : -Infinity;
  const end = period ? Date.parse(`${period.end}T00:00:00Z`) : Infinity;
  const scoped = period
    ? events.filter((event) => {
        const at = Date.parse(event.occurredAt);
        return at >= start && at < end;
      })
    : events;
  const history: ReviewHistory = {
    calls: scoped.length,
    knownTokens: 0,
    unknownTokenCalls: 0,
    activeDays: 0,
    importedCalls: events.length,
    outsideCalls: events.length - scoped.length,
  };
  const active = new Set<string>();
  for (const event of scoped) {
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
