import { Temporal, tokenAccountingOf } from "@stackreplay/replay-engine";
import type { TimelinePoint } from "./worker-protocol";

/**
 * Daily activity buckets for the timeline.
 *
 * Aggregate counts only: no session, event or project identity leaves the
 * Worker, so the chart cannot leak private project information.
 *
 * A day is a calendar day in the viewer's timezone, the same day basis the
 * workload page uses, so "busiest day" names the same date on both surfaces
 * (decision 57). A UTC day split one evening's work across two dates.
 *
 * Exact and lower-bound token quantities stay in separate fields. A bucket used
 * to add the reported part of an event whose total is unknown into the same
 * number as fully known totals, which presented a lower bound as an exact total
 * (benchmark finding F031). The chart plots both and labels the second one.
 */
export function buildTimeline(
  events: readonly { occurredAt: string; usage: unknown }[],
  timeZone = "UTC",
): TimelinePoint[] {
  const buckets = new Map<string, TimelinePoint>();
  const dayOf = localDayOf(timeZone);
  for (const event of events) {
    const day = dayOf(event.occurredAt);
    const bucket = buckets.get(day) ?? {
      day,
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
  return [...buckets.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

const QUARTER_HOUR_MS = 900_000;

/**
 * The calendar date of an instant in one timezone. Every real UTC offset is a
 * whole number of quarter hours, so one conversion serves a whole quarter-hour
 * bucket, the same shortcut the workload profile takes.
 */
export function localDayOf(timeZone: string): (instant: string | number) => string {
  const cache = new Map<number, string>();
  let zone = timeZone;
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(zone);
  } catch {
    zone = "UTC";
  }
  return (instant) => {
    const ms = typeof instant === "number" ? instant : Date.parse(instant);
    const bucket = Math.floor(ms / QUARTER_HOUR_MS);
    const cached = cache.get(bucket);
    if (cached !== undefined) return cached;
    const date = Temporal.Instant.fromEpochMilliseconds(bucket * QUARTER_HOUR_MS)
      .toZonedDateTimeISO(zone)
      .toPlainDate()
      .toString();
    cache.set(bucket, date);
    return date;
  };
}
