import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import {
  addDuration,
  calendarBucketBoundsMs,
  calendarBucketEnd,
  calendarBucketStart,
  durationToMs,
  epochMsFromIso,
  isoFromEpochMs,
  parseInstant,
  utcDateOf,
} from "./time.js";

describe("calendar windows", () => {
  it("starts weeks on Monday (UTC)", () => {
    // 2026-09-06 is a Sunday; the week containing it starts Monday 2026-08-31.
    const start = calendarBucketStart(parseInstant("2026-09-06T12:00:00Z"), "week", "UTC");
    expect(start.toString()).toBe("2026-08-31T00:00:00Z");
    const end = calendarBucketEnd(parseInstant("2026-09-06T12:00:00Z"), "week", "UTC");
    expect(end.toString()).toBe("2026-09-07T00:00:00Z");
  });

  it("uses the window timezone for calendar days", () => {
    // 02:00Z on Sep 2 is 22:00 on Sep 1 in New York (EDT, UTC-4).
    const instant = parseInstant("2026-09-02T02:00:00Z");
    expect(calendarBucketStart(instant, "day", "UTC").toString()).toBe("2026-09-02T00:00:00Z");
    expect(calendarBucketStart(instant, "day", "America/New_York").toString()).toBe(
      "2026-09-01T04:00:00Z",
    );
  });

  it("handles the DST spring-forward day length", () => {
    // 2027-03-14 is the US spring-forward date: the local day is 23 hours long.
    const start = calendarBucketStart(
      parseInstant("2027-03-14T12:00:00Z"),
      "day",
      "America/New_York",
    );
    const end = calendarBucketEnd(parseInstant("2027-03-14T12:00:00Z"), "day", "America/New_York");
    expect(start.toString()).toBe("2027-03-14T05:00:00Z");
    expect(end.toString()).toBe("2027-03-15T04:00:00Z");
    const hours = Number(end.since(start).total({ unit: "hours" }));
    expect(hours).toBe(23);
  });

  it("handles the DST fall-back day length", () => {
    // 2026-11-01 is the US fall-back date: the local day is 25 hours long.
    const start = calendarBucketStart(
      parseInstant("2026-11-01T12:00:00Z"),
      "day",
      "America/New_York",
    );
    const end = calendarBucketEnd(parseInstant("2026-11-01T12:00:00Z"), "day", "America/New_York");
    const hours = Number(end.since(start).total({ unit: "hours" }));
    expect(hours).toBe(25);
  });

  it("starts months on the first day", () => {
    const start = calendarBucketStart(parseInstant("2026-09-20T10:00:00Z"), "month", "UTC");
    expect(start.toString()).toBe("2026-09-01T00:00:00Z");
    const end = calendarBucketEnd(parseInstant("2026-09-20T10:00:00Z"), "month", "UTC");
    expect(end.toString()).toBe("2026-10-01T00:00:00Z");
  });
});

describe("durations and dates", () => {
  it("adds ISO durations to instants", () => {
    expect(addDuration(parseInstant("2026-09-01T00:00:00Z"), "PT5H").toString()).toBe(
      "2026-09-01T05:00:00Z",
    );
    expect(addDuration(parseInstant("2026-09-01T00:00:00Z"), "P7D").toString()).toBe(
      "2026-09-08T00:00:00Z",
    );
  });

  it("converts ISO durations to exact milliseconds", () => {
    expect(durationToMs("PT5H")).toBe(18_000_000);
    expect(durationToMs("P7D")).toBe(604_800_000);
    expect(durationToMs("P1DT2H30M15S")).toBe(95_415_000);
    expect(() => durationToMs("P1M")).toThrow(RangeError);
  });

  it("parses UTC timestamps to epoch milliseconds", () => {
    expect(epochMsFromIso("2026-09-01T00:00:00Z")).toBe(Date.UTC(2026, 8, 1));
    expect(epochMsFromIso("2026-09-01T00:00:00.500Z")).toBe(Date.UTC(2026, 8, 1) + 500);
    // The hot-path millisecond component is paired with the remainder in windows.ts.
    expect(isoFromEpochMs(Date.UTC(2026, 8, 1) + 123, 456789)).toBe(
      "2026-09-01T00:00:00.123456789Z",
    );
  });

  it("rejects timestamps that are not real calendar instants", () => {
    expect(() => epochMsFromIso("2026-02-30T00:00:00Z")).toThrow(RangeError);
    expect(() => epochMsFromIso("2026-13-01T00:00:00Z")).toThrow(RangeError);
  });

  it("serializes epoch milliseconds in Temporal's style", () => {
    expect(isoFromEpochMs(Date.UTC(2026, 8, 1))).toBe("2026-09-01T00:00:00Z");
    expect(isoFromEpochMs(Date.UTC(2026, 8, 1) + 500)).toBe("2026-09-01T00:00:00.500Z");
  });

  it("resolves calendar bucket boundaries as epoch milliseconds", () => {
    const bounds = calendarBucketBoundsMs(Date.UTC(2026, 8, 2, 2), "day", "America/New_York");
    expect(isoFromEpochMs(bounds.startMs)).toBe("2026-09-01T04:00:00Z");
    expect(isoFromEpochMs(bounds.endMs)).toBe("2026-09-02T04:00:00Z");
  });

  it("compares instants across fractional-second precision", () => {
    const a = parseInstant("2026-09-01T10:00:00.500Z");
    const b = parseInstant("2026-09-01T10:00:00Z");
    expect(Temporal.Instant.compare(a, b)).toBe(1);
  });

  it("derives the UTC date of an instant", () => {
    expect(utcDateOf(parseInstant("2026-09-30T23:59:59Z"))).toBe("2026-09-30");
  });
});
