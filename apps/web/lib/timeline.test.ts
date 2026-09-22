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
        at: "2026-09-01T00:00:00.000Z",
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

    expect(timeline.map((point) => point.at)).toEqual([
      "2026-09-01T00:00:00.000Z",
      "2026-09-02T00:00:00.000Z",
    ]);
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
});
