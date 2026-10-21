import {
  buildDemoExport,
  type DemoWorkloadPresetId,
  rebaseDemoExport,
} from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap } from "./recap";

// Long after the fixtures' fixed September 2026 anchors.
const now = "2027-03-15T09:30:00.000Z";

describe("demo rebase", () => {
  it.each(["moderate", "billing", "heavy"] as const satisfies readonly DemoWorkloadPresetId[])(
    "keeps the %s sample inside the default period whenever it is opened",
    (preset) => {
      const original = buildDemoExport(preset);
      const rebased = rebaseDemoExport(original, now);
      expect(buildRecap(original.events, "30", now, "UTC").records).toBe(0);
      expect(buildRecap(rebased.events, "30", now, "UTC").records).toBeGreaterThan(0);
      const newest = Date.parse(rebased.range.to);
      expect(newest).toBeLessThanOrEqual(Date.parse(now));
      expect(Date.parse(now) - newest).toBeLessThan(86_400_000);
    },
  );

  it("moves every timestamp by the same whole number of days", () => {
    const original = buildDemoExport("moderate");
    const rebased = rebaseDemoExport(original, now);
    const offset = Date.parse(rebased.generatedAt) - Date.parse(original.generatedAt);
    expect(offset % 86_400_000).toBe(0);
    expect(Date.parse(rebased.range.from) - Date.parse(original.range.from)).toBe(offset);
    expect(rebased.events).toHaveLength(original.events.length);
    original.events.forEach((before, index) => {
      const after = rebased.events[index];
      expect(Date.parse(after?.occurredAt ?? "") - Date.parse(before.occurredAt)).toBe(offset);
      expect({ ...after, occurredAt: "" }).toEqual({ ...before, occurredAt: "" });
    });
  });

  it("leaves a sample that is already current untouched", () => {
    const original = buildDemoExport("moderate");
    expect(rebaseDemoExport(original, original.range.to)).toBe(original);
  });
});
