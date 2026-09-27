import type { ObservedCapacityEvent } from "@stackreplay/schema";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { afterEach, expect, it, vi } from "vitest";
import {
  type ActivityPoint,
  activityPoint,
  composeCapacityBurden,
  intervalUnionMs,
} from "./capacity-episodes";
import {
  readContextIds,
  readEpisodeImpacts,
  saveContextIds,
  saveEpisodeImpacts,
} from "./episode-local";
import { summarizeCapacity } from "./observed-capacity";
import { clearReviewState } from "./review-storage";

const period = { start: "2026-09-01", end: "2026-10-01" };
const row: ObservedCapacityEvent = {
  id: "a",
  resourceInstanceId: "main",
  timestamp: "2026-09-02T10:00:00Z",
  eventType: "hard_limit_reached",
  windowType: "five_hour",
  resetAt: "2026-09-02T12:00:00Z",
  sessionId: "session",
  evidence: "native-client",
  code: "quota_rejected",
  duplicateRows: 0,
};
const point = (
  id: string,
  at: string,
  source = "claude-code",
  resourceInstanceId = "main",
): ActivityPoint => ({ id, at: `2026-09-02T${at}Z`, source, resourceInstanceId });
function compose(
  events: ObservedCapacityEvent[],
  mainActivity: ActivityPoint[] = [],
  contextActivity: ActivityPoint[] = [],
) {
  return composeCapacityBurden({
    capacity: summarizeCapacity(
      { methodology: "claude-native-capacity-v1", events },
      [],
      period,
      "main",
    ),
    mainActivity,
    contextActivity,
    resourceInstanceId: "main",
    planId: "synthetic-plan",
    period,
    mainSource: "claude-code",
  });
}
it("groups repeated attempts across sessions by exact constraint and reset without merging models or roots", () => {
  const result = compose([
    row,
    { ...row, id: "b", sessionId: "other-session", timestamp: "2026-09-02T11:00:00Z" },
    { ...row, id: "c", resetAt: "2026-09-02T13:00:00Z" },
    { ...row, id: "d", windowType: "model", modelLabel: "Fable", code: "model_limit" },
    { ...row, id: "other", resourceInstanceId: "other" },
  ]);
  expect(result.episodes).toHaveLength(3);
  expect(result.attempts).toBe(4);
  expect(result.episodes[0]?.blockedAttemptIds).toEqual(["a", "b"]);
  expect(result.episodes[0]?.affectedSessionIds).toHaveLength(2);
  expect(result.episodes[0]?.retrySpanMs).toBe(3600000);
  expect(result.scheduledExposureMs).toBe(3 * 3600000);
});
it("keeps no-reset model messages separate even seconds apart and preserves ordering independent of input", () => {
  const { resetAt: _reset, ...unknown } = row;
  const events = [
    { ...unknown, id: "b", windowType: "model" as const, timestamp: "2026-09-02T10:00:01Z" },
    { ...unknown, id: "a", windowType: "model" as const },
  ];
  // The provenance digest pins the original import; grouping is order independent.
  expect(compose(events).episodes).toEqual(compose([...events].reverse()).episodes);
  expect(compose(events).unlinked).toBe(2);
});
it("distinguishes retry span, scheduled remainder and positive responses before the last retry", () => {
  const result = compose(
    [row, { ...row, id: "retry", timestamp: "2026-09-02T11:00:00Z" }],
    [point("before", "09:00:00"), point("main", "10:20:00")],
    [point("other", "10:02:00", "codex", "codex")],
  );
  expect(result.nextMainMs?.median).toBe(20 * 60000);
  expect(result.nextAnyMs?.median).toBe(2 * 60000);
  expect(result.retrySpan?.median).toBe(3600000);
  expect(result.scheduledRemaining?.median).toBe(2 * 3600000);
  expect(result.withOtherBeforeMain).toBe(1);
});
it("does not use later or out-of-cycle context to claim continuity before main response", () => {
  const result = compose(
    [row],
    [point("main", "10:20:00")],
    [
      point("other", "10:30:00", "opencode", "other"),
      { ...point("outside", "10:01:00", "codex", "other"), at: "2026-10-01T00:00:00Z" },
    ],
  );
  expect(result.withOtherBeforeMain).toBe(0);
  expect(result.noOtherBeforeBoundary).toBe(1);
  expect(result.nextAnyMs?.median).toBe(20 * 60000);
});
it("keeps missing next response unknown, clips exposure at cycle end and rejects a reset in the past", () => {
  const result = compose([
    { ...row, timestamp: "2026-09-30T23:00:00Z", resetAt: "2026-10-01T01:00:00Z" },
  ]);
  expect(result.nextMainMs).toBeUndefined();
  expect(result.nextAnyMs).toBeUndefined();
  expect(result.scheduledExposureMs).toBe(3600000);
  expect(result.scheduledRemaining?.median).toBe(2 * 3600000);
  expect(compose([{ ...row, resetAt: "2026-09-02T09:00:00Z" }]).scheduledRemaining).toBeUndefined();
});
it("union exposure never double counts overlap or nested intervals", () => {
  expect(
    intervalUnionMs([
      [10, 30],
      [20, 40],
      [15, 25],
      [50, 60],
      [70, 60],
    ]),
  ).toBe(40);
});
it("excludes aggregate, zero-output and unknown-output records from precise response chronology", () => {
  const event = buildDemoExport("moderate").events[0];
  if (!event) throw Error("fixture missing");
  expect(activityPoint({ ...event, usage: { ...event.usage, outputTokens: 1 } })).toBeDefined();
  expect(
    activityPoint({ ...event, confidence: { ...event.confidence, usage: "estimated" } }),
  ).toBeUndefined();
  expect(activityPoint({ ...event, usage: { outputTokens: 0 } })).toBeUndefined();
  expect(activityPoint({ ...event, usage: {} })).toBeUndefined();
});
it("episode-onset statistics count a reset-linked group once instead of weighting retries", () => {
  const capacity = summarizeCapacity(
    {
      methodology: "claude-native-capacity-v1",
      events: [
        row,
        { ...row, id: "b", timestamp: "2026-09-02T10:01:00Z" },
        { ...row, id: "c", timestamp: "2026-09-02T10:02:00Z" },
      ],
    },
    [],
    period,
    "main",
  );
  capacity.events.forEach((e, i) => {
    e.before = [
      {
        hours: 5,
        responses: 1,
        knownTokens: (i + 1) * 100,
        unknownTokenResponses: 0,
        models: { test: 1 },
      },
    ];
  });
  const result = composeCapacityBurden({
    capacity,
    mainActivity: [],
    contextActivity: [],
    resourceInstanceId: "main",
    planId: "plan",
    period,
    mainSource: "claude-code",
  });
  expect(result.onset[0]?.tokens).toMatchObject({ count: 1, median: 100 });
});
afterEach(() => vi.unstubAllGlobals());
it("keeps impact local and scope bound, rejects malformed annotations, and clears impact/context with the import", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    },
  });
  const value = {
    impact: "Delayed me" as const,
    note: "Synthetic note",
    confirmedAt: "2026-09-21T00:00:00Z",
    provenance: "local-user" as const,
  };
  expect(saveEpisodeImpacts("import", "scope", { episode: value })).toBe(true);
  expect(readEpisodeImpacts("import", "scope")).toEqual({ episode: value });
  expect(readEpisodeImpacts("import", "changed")).toEqual({});
  expect(
    saveEpisodeImpacts("import", "scope", { episode: { ...value, note: "x".repeat(501) } }),
  ).toBe(false);
  saveContextIds("import", ["context"]);
  expect(readContextIds("import")).toEqual(["context"]);
  clearReviewState("import");
  expect(readEpisodeImpacts("import", "scope")).toEqual({});
  expect(readContextIds("import")).toEqual([]);
});
