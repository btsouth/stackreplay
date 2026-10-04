import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap, totalTokensOf } from "./recap";

const base = buildDemoExport("billing").events[0]!;
const now = "2026-10-04T12:00:00Z";
function event(id: string, at: string, harness: string, provider?: string) {
  return {
    ...base,
    id,
    occurredAt: at,
    source: { ...base.source, adapterId: harness, nativeSessionHash: id },
    harness: { id: harness, attribution: "exact" as const },
    ...(provider
      ? { provider: { id: provider, attribution: "exact" as const } }
      : { provider: undefined }),
    usage: {
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 50,
      cacheWriteTokens: 10,
      reasoningTokens: 0,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    },
  };
}
describe("deep recap provenance", () => {
  it.each(["30", "90", "all"] as const)(
    "includes all token-bearing harnesses and uses the same denominator for %s",
    (period) => {
      const events = ["claude-code", "codex", "opencode", "command-code", "hermes", "t3-code"].map(
        (id, i) => event(id, "2026-10-03T12:00:00Z", id, i % 2 ? "openai" : "command-code"),
      );
      const r = buildRecap(events, period, now, "UTC");
      expect(r.deep!.harnesses).toHaveLength(6);
      expect(r.deep!.harnesses.reduce((n, x) => n + x.total, 0)).toBe(r.total);
      expect(r.deep!.providers.reduce((n, x) => n + x.total, 0)).toBe(r.total);
      expect(r.deep!.harnesses.reduce((n, x) => n + x.total / r.total, 0)).toBeCloseTo(1);
      expect(Object.values(r.deep!.buckets).reduce((a, b) => a + b, 0)).toBe(r.total);
    },
  );
  it("T3 replaces the recording harness without duplicating its usage", () => {
    const e = {
      ...event("x", "2026-10-03T12:00:00Z", "codex"),
      harness: { id: "t3-code", attribution: "exact" as const },
    };
    const r = buildRecap([e], "30", now, "UTC");
    expect(r.deep!.harnesses).toEqual([{ id: "t3-code", records: 1, total: totalTokensOf(e) }]);
  });
  it("does not turn an inferred model developer into a serving provider", () => {
    const e = {
      ...event("x", "2026-10-03T12:00:00Z", "hermes"),
      provider: { id: "anthropic", attribution: "inferred" as const },
    };
    expect(buildRecap([e], "all", now, "UTC").deep!.providers[0]!.id).toBe("unattributed");
  });
  it("filters Hermes on last_seen and never allocates its aggregate across a boundary", () => {
    const e = {
      ...event("x", "2026-09-04T00:00:00Z", "hermes", "openai"),
      requestStartedAt: "2026-09-01T00:00:00Z",
      requestEndedAt: "2026-09-04T00:00:00Z",
    };
    expect(buildRecap([e], "30", now, "UTC").deep!.harnesses).toHaveLength(0);
    expect(buildRecap([e], "90", now, "UTC").deep!.harnesses[0]!.total).toBe(180);
    expect(buildRecap([e], "all", now, "UTC").deep!.speeds).toHaveLength(0);
  });
  it("requires 50 reliable samples, reports interpolated quartiles and median wait", () => {
    const events = Array.from({ length: 50 }, (_, i) => ({
      ...event(String(i), "2026-10-03T12:00:10Z", "claude-code"),
      requestStartedAt: "2026-10-03T12:00:00Z",
      requestEndedAt: "2026-10-03T12:00:10Z",
      usage: { outputTokens: 100 + i * 10 },
    }));
    expect(buildRecap(events.slice(0, 49), "30", now, "UTC").deep!.speeds).toHaveLength(0);
    const s = buildRecap(events, "30", now, "UTC").deep!.speeds[0]!;
    expect(s).toMatchObject({ n: 50, median: 34.5, p25: 22.25, p75: 46.75, wait: 10 });
    expect(
      buildRecap(
        events.map((e) => ({ ...e, source: { ...e.source, adapterId: "hermes" } })),
        "30",
        now,
        "UTC",
      ).deep!.speeds,
    ).toHaveLength(0);
  });
  it("keeps inactive weeks on a continuous scaled time axis", () => {
    const r = buildRecap([event("x", "2026-10-03T12:00:00Z", "codex")], "90", now, "UTC");
    expect(r.weeks.length).toBeGreaterThanOrEqual(13);
    expect(r.weeks[0]!.families).toEqual({});
  });
});
