import { Temporal } from "@stackreplay/replay-engine";

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
