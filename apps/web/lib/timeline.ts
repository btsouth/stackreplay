import { tokenAccountingOf } from "@stackreplay/replay-engine";
import type { TimelinePoint } from "./worker-protocol";

/**
 * Daily activity buckets for the timeline.
 *
 * Aggregate counts only: no session, event or project identity leaves the
 * Worker, so the chart cannot leak private project information.
 *
 * Exact and lower-bound token quantities stay in separate fields. A bucket used
 * to add the reported part of an event whose total is unknown into the same
 * number as fully known totals, which presented a lower bound as an exact total
 * (benchmark finding F031). The chart plots both and labels the second one.
 */
export function buildTimeline(
  events: readonly { occurredAt: string; usage: unknown }[],
): TimelinePoint[] {
  const buckets = new Map<string, TimelinePoint>();
  for (const event of events) {
    const day = `${event.occurredAt.slice(0, 10)}T00:00:00.000Z`;
    const bucket = buckets.get(day) ?? {
      at: day,
      events: 0,
      tokens: 0,
      partialTokens: 0,
      partialEvents: 0,
    };
    bucket.events += 1;
    const accounting = tokenAccountingOf(event.usage as never);
    if (accounting.known) {
      bucket.tokens += accounting.total;
    } else {
      bucket.partialTokens += accounting.knownSubtotal;
      bucket.partialEvents += 1;
    }
    buckets.set(day, bucket);
  }
  return [...buckets.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}
