import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";

/**
 * Timeline buckets (benchmark finding F031).
 *
 * An event whose token total is unknown contributes only a lower bound. The
 * bucket used to add that bound into the same number as fully known totals, so
 * the chart drew a lower bound as an exact value.
 */

type DraftEvent = { occurredAt: string; usage: Record<string, unknown> };

function event(occurredAt: string, usage: Record<string, unknown>): DraftEvent {
  return { occurredAt, usage };
}

const complete = (input: number) => ({
  inputTokens: input,
  outputTokens: 10,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
  accounting: {
    cacheReadIncludedInInput: false,
    cacheWriteIncludedInInput: false,
    reasoningIncludedInOutput: false,
  },
});

/** Output category missing, so the event's total is not established. */
const partial = (input: number) => ({
  inputTokens: input,
  accounting: { cacheReadIncludedInInput: false, cacheWriteIncludedInInput: false },
});

describe("buildTimeline", () => {
  it("keeps exact totals and lower bounds in separate fields", () => {
    const timeline = buildTimeline([
      event("2026-09-01T00:00:00Z", complete(1_000_000)),
      event("2026-09-01T06:00:00Z", complete(2_000_000)),
      event("2026-09-01T07:00:00Z", partial(500_000)),
    ]);

    expect(timeline).toEqual([
      {
        day: "2026-09-01",
        events: 3,
        tokens: 3_000_020,
        partialTokens: 500_000,
        partialEvents: 1,
      },
    ]);
    // The exact total above is the whole assertion: the lower bound is never
    // folded into the exact series (it would read 3,500,020 here).
  });

  it("buckets by day and counts the events behind each bound", () => {
    const timeline = buildTimeline([
      event("2026-09-01T00:00:00Z", partial(1)),
      event("2026-09-02T00:00:00Z", partial(2)),
      event("2026-09-02T12:00:00Z", complete(5)),
    ]);

    expect(timeline.map((point) => point.day)).toEqual(["2026-09-01", "2026-09-02"]);
    expect(timeline[0]).toMatchObject({ events: 1, tokens: 0, partialTokens: 1, partialEvents: 1 });
    expect(timeline[1]).toMatchObject({
      events: 2,
      tokens: 15,
      partialTokens: 2,
      partialEvents: 1,
    });
  });

  it("reports no lower bound when every event has a complete total", () => {
    const timeline = buildTimeline([event("2026-09-01T00:00:00Z", complete(7))]);
    expect(timeline[0]).toMatchObject({ tokens: 17, partialTokens: 0, partialEvents: 0 });
  });

  it("groups by the viewer's calendar day, not the UTC day", () => {
    // 03:30 UTC on Sep 24 is still the evening of Sep 23 in New York, so the
    // two events below belong to one local day there and to two UTC days.
    const events = [
      event("2026-09-23T22:00:00Z", complete(1)),
      event("2026-09-24T03:30:00Z", complete(1)),
    ];
    expect(buildTimeline(events).map((point) => point.day)).toEqual(["2026-09-23", "2026-09-24"]);
    expect(buildTimeline(events, "America/New_York")).toEqual([
      expect.objectContaining({ day: "2026-09-23", events: 2 }),
    ]);
    // A half-hour zone moves the boundary by its own offset.
    expect(
      buildTimeline([event("2026-09-23T18:45:00Z", complete(1))], "Asia/Kolkata")[0]?.day,
    ).toBe("2026-09-24");
  });

  it("falls back to UTC for a zone the runtime does not know", () => {
    expect(buildTimeline([event("2026-09-23T23:00:00Z", complete(1))], "Not/AZone")[0]?.day).toBe(
      "2026-09-23",
    );
  });
});
