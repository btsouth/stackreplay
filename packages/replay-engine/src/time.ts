import { Temporal } from "@js-temporal/polyfill";

/**
 * Controlled Temporal polyfill (spec point 24). Every time computation in the
 * engine goes through this module so the dependency stays in one place and can
 * be replaced when the runtime ships Temporal natively.
 *
 * Internal timestamps are UTC. Parsing, sorting, comparing and slicing rolling
 * windows use epoch milliseconds, which is exact for every timestamp the
 * schema accepts and orders of magnitude cheaper than polyfilled instants in a
 * hundred-thousand-event hot path. The polyfill is used only where calendar
 * semantics (IANA timezones, DST, calendar buckets) genuinely require it.
 */

export { Temporal };

export function parseInstant(isoUtcTimestamp: string): Temporal.Instant {
  return Temporal.Instant.from(isoUtcTimestamp);
}

export function instantToIso(instant: Temporal.Instant): string {
  return instant.toString();
}

/**
 * Adds an ISO duration to an instant. Calendar units (days) are added in UTC,
 * so a rolling "P7D" window is exactly 168 hours rather than a calendar week.
 */
export function addDuration(instant: Temporal.Instant, duration: string): Temporal.Instant {
  return instant.toZonedDateTimeISO("UTC").add(Temporal.Duration.from(duration)).toInstant();
}

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;

/**
 * Epoch milliseconds of an ISO-8601 UTC timestamp. Throws RangeError when the
 * timestamp is not a real calendar instant (for example 2026-02-30) so callers
 * can raise a typed error instead of silently rolling the date over.
 */
export function epochMsFromIso(isoUtcTimestamp: string): number {
  const epochMs = Date.parse(isoUtcTimestamp);
  if (Number.isNaN(epochMs)) throw new RangeError(`invalid UTC timestamp: ${isoUtcTimestamp}`);
  // Date.parse rolls impossible calendar dates over (2026-02-30 becomes
  // 2026-03-02). Only days past the 28th can be impossible, so the round-trip
  // comparison that catches it is skipped for the rest of the workload.
  if (Number(isoUtcTimestamp.slice(8, 10)) > 28) {
    if (new Date(epochMs).toISOString().slice(0, 19) !== isoUtcTimestamp.slice(0, 19)) {
      throw new RangeError(`invalid UTC timestamp: ${isoUtcTimestamp}`);
    }
  }
  return epochMs;
}

/** ISO-8601 UTC timestamp for epoch milliseconds, in the same style as Temporal. */
export function isoFromEpochMs(epochMs: number): string {
  return new Date(epochMs).toISOString().replace(/\.000Z$/, "Z");
}

/**
 * Exact milliseconds of an ISO-8601 duration. The catalog schema only allows
 * days, hours, minutes and seconds, so every rolling window duration converts
 * exactly; calendar units (months, years) are rejected.
 */
export function durationToMs(duration: string): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duration);
  if (match === null) throw new RangeError(`unsupported ISO-8601 duration: ${duration}`);
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * MS_PER_DAY +
    Number(hours ?? 0) * MS_PER_HOUR +
    Number(minutes ?? 0) * MS_PER_MINUTE +
    Number(seconds ?? 0) * MS_PER_SECOND
  );
}

export type CalendarUnit = "day" | "week" | "month";

/** Start of the calendar bucket containing the instant, in the window timezone. */
export function calendarBucketStart(
  instant: Temporal.Instant,
  unit: CalendarUnit,
  timeZone: string,
): Temporal.Instant {
  const zoned = instant.toZonedDateTimeISO(timeZone);
  switch (unit) {
    case "day":
      return zoned.startOfDay().toInstant();
    case "week":
      // Weeks start on Monday (spec point 24 example: calendar week Monday UTC).
      return zoned
        .startOfDay()
        .subtract({ days: zoned.dayOfWeek - 1 })
        .toInstant();
    case "month":
      return zoned.with({ day: 1 }).startOfDay().toInstant();
  }
}

/** End of the calendar bucket (start of the next one), exclusive. */
export function calendarBucketEnd(
  instant: Temporal.Instant,
  unit: CalendarUnit,
  timeZone: string,
): Temporal.Instant {
  const start = calendarBucketStart(instant, unit, timeZone).toZonedDateTimeISO(timeZone);
  const next =
    unit === "day"
      ? start.add({ days: 1 })
      : unit === "week"
        ? start.add({ days: 7 })
        : start.add({ months: 1 });
  return next.toInstant();
}

/** Calendar bucket boundaries, as epoch milliseconds, for the containing instant. */
export function calendarBucketBoundsMs(
  epochMs: number,
  unit: CalendarUnit,
  timeZone: string,
): { startMs: number; endMs: number } {
  const instant = Temporal.Instant.fromEpochMilliseconds(epochMs);
  return {
    startMs: calendarBucketStart(instant, unit, timeZone).epochMilliseconds,
    endMs: calendarBucketEnd(instant, unit, timeZone).epochMilliseconds,
  };
}

/** Whether the instant falls inside a date range given as inclusive ISO dates. */
export function dateRangeContains(date: string, from: string, to?: string): boolean {
  if (date < from) return false;
  if (to !== undefined && date > to) return false;
  return true;
}

/** UTC date (YYYY-MM-DD) of an instant. */
export function utcDateOf(instant: Temporal.Instant): string {
  return instant.toZonedDateTimeISO("UTC").toPlainDate().toString();
}
