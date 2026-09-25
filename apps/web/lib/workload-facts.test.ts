import { createModelIdentityIndex } from "@stackreplay/catalog";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { modelCounts, peakFiveHours, peakWindowSentences } from "./workload-facts";
import { buildWorkloadProfile } from "./workload-profile";

const catalog = loadBundledCatalog();
const identity = createModelIdentityIndex(catalog);

function event(
  id: string,
  occurredAt: string,
  cacheRead: number,
  rawName = "gpt-6-sol",
): TextUsageEventV1 {
  return {
    schemaVersion: 1,
    id,
    occurredAt,
    source: { adapterId: "codex", nativeSessionHash: "ns_a" },
    model: { rawName },
    modality: "text",
    usage: {
      inputTokens: 100 + cacheRead,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: 0,
      outputTokens: 50,
      reasoningTokens: 0,
      accounting: {
        cacheReadIncludedInInput: true,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    },
    projectHash: "ph_one",
    confidence: { usage: "exact", model: "exact" },
  };
}

/**
 * Two bursts on different days: many light calls on Sep 2, a few enormous
 * calls on Sep 5. The busiest window by calls and the heaviest by tokens are
 * different windows, which is exactly the case the audit found mixed.
 */
function twoBursts(): TextUsageEventV1[] {
  const events: TextUsageEventV1[] = [];
  for (let index = 0; index < 40; index += 1)
    events.push(
      event(`light-${index}`, `2026-09-02T10:${String(index).padStart(2, "0")}:00Z`, 1_000),
    );
  for (let index = 0; index < 4; index += 1)
    events.push(event(`heavy-${index}`, `2026-09-05T14:0${index}:00Z`, 5_000_000));
  events.push(event("lone", "2026-09-08T09:00:00Z", 10));
  return events;
}

const profile = (events: TextUsageEventV1[], timeZone = "UTC") =>
  buildWorkloadProfile(events, { identity, catalog, timeZone });

describe("canonical peak windows", () => {
  it("keeps the busiest window by calls and the heaviest by tokens apart", () => {
    const facts = peakFiveHours(profile(twoBursts()));
    expect(facts.sameWindow).toBe(false);
    expect(facts.byCalls?.events).toBe(40);
    expect(facts.byTokens?.events).toBe(4);
  });

  it("never prints one window's time beside another window's share", () => {
    const built = profile(twoBursts());
    const [first, second] = peakWindowSentences(built);
    const byCalls = peakFiveHours(built).byCalls;
    // Every figure in the first sentence belongs to the busiest window by calls.
    const tokenShare = ((byCalls?.tokens ?? 0) / built.overview.knownTokens) * 100;
    expect(first).toContain("Sep 2");
    expect(first).toContain("40 calls");
    expect(first).toContain(`${tokenShare.toFixed(1)}% of known tokens`);
    // The token peak is named as a different window with its own start.
    expect(second).toContain("By tokens");
    expect(second).toContain("Sep 5");
  });

  it("says it once when both rankings pick the same window", () => {
    const events = [
      event("a", "2026-09-02T10:00:00Z", 900_000),
      event("b", "2026-09-02T10:05:00Z", 900_000),
      event("c", "2026-09-06T10:00:00Z", 10),
    ];
    const sentences = peakWindowSentences(profile(events));
    expect(sentences).toHaveLength(1);
  });
});

describe("canonical day basis", () => {
  it("puts late-evening work on the viewer's day, not the UTC day", () => {
    const events = [
      event("a", "2026-09-23T23:30:00Z", 10),
      event("b", "2026-09-24T02:30:00Z", 10),
      event("c", "2026-09-24T03:10:00Z", 10),
      event("d", "2026-09-24T15:00:00Z", 10),
    ];
    expect(profile(events, "UTC").days.peakByEvents?.date).toBe("2026-09-24");
    expect(profile(events, "America/New_York").days.peakByEvents?.date).toBe("2026-09-23");
  });
});

describe("canonical model counts", () => {
  it("counts unresolved identifiers apart from models", () => {
    const events = [
      event("a", "2026-09-02T10:00:00Z", 1),
      event("b", "2026-09-02T10:01:00Z", 1, "gpt-5.6-sol"),
      event("c", "2026-09-02T10:02:00Z", 1, "mystery-alpha"),
      event("d", "2026-09-02T10:03:00Z", 1, "mystery-beta"),
    ];
    expect(modelCounts(profile(events))).toEqual({ models: 2, unresolvedIds: 2 });
  });
});
