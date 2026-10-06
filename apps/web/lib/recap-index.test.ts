import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";
import { buildRecapFromIndex, buildRecapIndex } from "./recap-index";

const now = "2026-10-06T12:00:00Z";
const base = buildDemoExport("billing").events[0]!;
describe("daily recap index equivalence", () => {
  for (const preset of ["billing", "moderate", "heavy", "multistack"] as const) {
    // Preset list below is checked by the fixture package's public contract.
    it(`matches ${preset} for every period`, () => {
      const events = buildDemoExport(preset).events;
      const index = buildRecapIndex(events, now, "America/Louisville");
      for (const period of ["30", "90", "all"] as const)
        expect(buildRecapFromIndex(index, period, now)).toEqual(
          buildRecap(events, period, now, "America/Louisville"),
        );
    });
  }
  it.each(["UTC", "America/New_York", "Asia/Kolkata", "Asia/Kathmandu", "Australia/Lord_Howe"])(
    "matches unsorted, partial, timed and aggregate history in %s",
    (tz) => {
      const at = [
        "2026-03-07T04:59:00Z",
        "2026-03-08T06:59:59Z",
        "2026-03-08T07:00:00Z",
        "2026-10-05T18:29:59Z",
        "2026-10-05T18:30:00Z",
        "2026-10-05T18:44:59Z",
        "2026-10-05T18:45:00Z",
        "2026-10-06T12:00:01Z",
      ];
      const events = Array.from({ length: 180 }, (_, i) => ({
        ...base,
        id: `index-${i}`,
        occurredAt: at[i % at.length]!,
        source: {
          ...base.source,
          adapterId: ["opencode", "command-code", "codex"][i % 3]!,
          nativeSessionHash: `s${i % 17}`,
        },
        model: i % 7 === 0 ? { rawName: "private" } : base.model,
        confidence: {
          ...base.confidence,
          usage: i % 9 === 0 ? ("estimated" as const) : ("exact" as const),
        },
        usage: i % 11 === 0 ? {} : { ...base.usage, outputTokens: 100 + i },
        requestStartedAt: "2026-10-05T12:00:00Z",
        requestEndedAt: "2026-10-05T12:00:04Z",
      })).reverse();
      events.push({
        ...base,
        id: "span",
        source: { ...base.source, adapterId: "hermes", nativeSessionHash: "span-session" },
        confidence: { ...base.confidence, usage: "estimated" },
        occurredAt: "2026-10-08T12:00:00Z",
        requestStartedAt: "2026-03-07T04:59:00Z",
        requestEndedAt: "2026-10-08T12:00:00Z",
      });
      const index = buildRecapIndex(events, now, tz);
      for (const period of ["30", "90", "all"] as const)
        expect(buildRecapFromIndex(index, period, now)).toEqual(
          buildRecap(events, period, now, tz),
        );
    },
  );
  it("retains timing samples below the daily minimum for exact period quantiles", () => {
    const events = Array.from({ length: 60 }, (_, i) => ({
      ...base,
      id: `speed-${i}`,
      occurredAt: `2026-10-0${(i % 3) + 1}T12:00:00Z`,
      source: { ...base.source, adapterId: "opencode" },
      confidence: { ...base.confidence, usage: "exact" as const },
      usage: { ...base.usage, outputTokens: 100 + i },
      requestStartedAt: "2026-10-01T12:00:00Z",
      requestEndedAt: "2026-10-01T12:00:02Z",
    }));
    const index = buildRecapIndex(events, now, "UTC");
    const recap = buildRecapFromIndex(index, "all", now);
    expect(recap.deep!.speeds[0]!.n).toBe(60);
    expect(recap).toEqual(buildRecap(events, "all", now, "UTC"));
  });
  it("handles empty history", () =>
    expect(buildRecapFromIndex(buildRecapIndex([], now, "UTC"), "all", now)).toEqual(
      buildRecap([], "all", now, "UTC"),
    ));
});
