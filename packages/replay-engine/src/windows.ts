import type { LimitWindowV1 } from "@stackreplay/catalog";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { type CalendarUnit, calendarBucketBoundsMs, durationToMs, epochMsFromIso } from "./time.js";

/**
 * Window slicing (spec point 24). Boundaries are half-open: [start, end).
 *
 * Rolling windows are anchored at first use: a window opens at the first
 * event that arrives after the previous window ended, and the next window
 * opens at the first event at or after its end.
 *
 * Calendar windows are computed in the window's IANA timezone, so DST
 * transitions move the boundary the way a provider's local reset would.
 *
 * Instants are epoch milliseconds internally: exact for every timestamp the
 * schema accepts, and far cheaper than polyfilled Temporal instants in the
 * per-event hot path. Temporal is used only to resolve calendar buckets, once
 * per distinct UTC date rather than once per event.
 */

export interface TimedEvent {
  /** Epoch milliseconds. */
  atMs: number;
  event: TextUsageEventV1;
}

export interface WindowSlice {
  /** Epoch milliseconds, inclusive. */
  startMs: number;
  /** Epoch milliseconds, exclusive. */
  endMs: number;
  events: TimedEvent[];
}

export function toTimedEvents(events: readonly TextUsageEventV1[]): TimedEvent[] {
  return events.map((event) => ({ atMs: epochMsFromIso(event.occurredAt), event }));
}

/** Canonical chronological order: by instant, then by event id. */
export function sortTimedEvents(timed: readonly TimedEvent[]): TimedEvent[] {
  return [...timed].sort((a, b) => {
    if (a.atMs !== b.atMs) return a.atMs - b.atMs;
    if (a.event.id < b.event.id) return -1;
    if (a.event.id > b.event.id) return 1;
    return 0;
  });
}

export function sliceRollingWindows(
  events: readonly TimedEvent[],
  durationMs: number,
): WindowSlice[] {
  const slices: WindowSlice[] = [];
  let current: WindowSlice | null = null;
  for (const timed of events) {
    if (current === null || timed.atMs >= current.endMs) {
      if (current !== null) slices.push(current);
      current = { startMs: timed.atMs, endMs: timed.atMs + durationMs, events: [] };
    }
    current.events.push(timed);
  }
  if (current !== null) slices.push(current);
  return slices;
}

export function sliceCalendarWindows(
  events: readonly TimedEvent[],
  unit: CalendarUnit,
  timeZone: string,
): WindowSlice[] {
  const slices: WindowSlice[] = [];
  const byStart = new Map<number, WindowSlice>();

  /**
   * Bucket boundaries are computed once per distinct UTC date and verified
   * against the instant before reuse: a cached bucket is only accepted when it
   * actually contains the instant, so zones whose local date differs from the
   * UTC date still resolve correctly. Events are processed in chronological
   * order, so slices are created in chronological order.
   */
  const bucketCache = new Map<string, { startMs: number; endMs: number }>();

  for (const timed of events) {
    const dateKey = timed.event.occurredAt.slice(0, 10);
    let bucket = bucketCache.get(dateKey);
    if (bucket === undefined || timed.atMs < bucket.startMs || timed.atMs >= bucket.endMs) {
      bucket = calendarBucketBoundsMs(timed.atMs, unit, timeZone);
      bucketCache.set(dateKey, bucket);
    }

    let slice = byStart.get(bucket.startMs);
    if (slice === undefined) {
      slice = { startMs: bucket.startMs, endMs: bucket.endMs, events: [] };
      byStart.set(bucket.startMs, slice);
      slices.push(slice);
    }
    slice.events.push(timed);
  }
  return slices;
}

export interface SlicedWindows {
  kind: "rolling" | "calendar";
  description: string;
  slices: WindowSlice[];
}

export function sliceWindows(events: readonly TimedEvent[], window: LimitWindowV1): SlicedWindows {
  if (window.type === "rolling") {
    return {
      kind: "rolling",
      description: `rolling window of ${window.duration} anchored at first use`,
      slices: sliceRollingWindows(events, durationToMs(window.duration)),
    };
  }
  return {
    kind: "calendar",
    description: `calendar ${window.unit} (${window.timezone})`,
    slices: sliceCalendarWindows(events, window.unit, window.timezone),
  };
}
