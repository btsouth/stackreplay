import type { ObservedCapacityEvent } from "@stackreplay/schema";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { afterEach, expect, it, vi } from "vitest";
import { capacityBinding, readManualCapacity, saveManualCapacity } from "./capacity-local";
import { summarizeCapacity } from "./observed-capacity";
import { clearReviewState } from "./review-storage";

const event: ObservedCapacityEvent = {
  id: "one",
  resourceInstanceId: "main",
  timestamp: "2026-09-15T12:00:00Z",
  eventType: "hard_limit_reached",
  windowType: "five_hour",
  resetAt: "2026-09-15T13:00:00Z",
  sessionId: "session",
  evidence: "native-client",
  code: "quota_rejected",
  duplicateRows: 2,
};
const period = { start: "2026-09-14", end: "2026-09-21" };
const observations = {
  methodology: "claude-native-capacity-v1" as const,
  events: [
    event,
    { ...event, id: "two" },
    { ...event, id: "other", resourceInstanceId: "secondary" },
    { ...event, id: "outside", timestamp: "2026-09-21T00:00:00Z" },
  ],
};
it("scopes evidence to one root and cycle, counting attempts separately from reset schedules", () => {
  const result = summarizeCapacity(observations, [], period, "main");
  expect(result).toMatchObject({
    directHardLimits: 2,
    scheduledResets: 1,
    days: 1,
    sessions: 1,
    duplicateRows: 4,
  });
  expect(summarizeCapacity(observations, [], period, undefined).directHardLimits).toBe(0);
  expect(summarizeCapacity(undefined, [], period, "main").historyInspected).toBe(false);
});
it("reports retrospective recorded workload without counting other accounts or events at the interruption", () => {
  const base = buildDemoExport("moderate").events[0];
  if (!base) throw new Error("fixture missing");
  const events = [-6, -2, 0].map((hours) => ({
    ...base,
    source: { ...base.source, resourceInstanceId: "main" },
    occurredAt: new Date(Date.parse(event.timestamp) + hours * 3600000).toISOString(),
  }));
  events.push({ ...base, source: { ...base.source, resourceInstanceId: "secondary" } });
  const result = summarizeCapacity({ ...observations, events: [event] }, events, period, "main");
  expect(result.events[0]?.before.map((w) => w.responses)).toEqual([1, 2, 2]);
  expect(result.events[0]?.before[0]?.knownTokens).toBeGreaterThan(0);
  expect(
    summarizeCapacity(
      { ...observations, events: [{ ...event, resetAt: "2026-09-15T14:00:00Z" }] },
      events,
      period,
      "main",
    ).digest,
  ).not.toBe(result.digest);
});
afterEach(() => vi.unstubAllGlobals());
it("keeps user assertions local, invalidates every scope change and clears them with local data", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    },
  });
  const scope = {
    resourceInstanceId: "main",
    planId: "plan",
    period,
    workloadDigest: "usage",
    capacityDigest: "evidence",
  };
  const binding = capacityBinding(scope);
  const manual = {
    id: "manual",
    timestamp: event.timestamp,
    note: "Synthetic test observation",
    evidence: "local-user" as const,
    recordedAt: event.timestamp,
  };
  expect(saveManualCapacity("import", binding, [manual])).toBe(true);
  expect(readManualCapacity("import", binding)).toEqual([manual]);
  for (const change of [
    { resourceInstanceId: "secondary" },
    { planId: "other" },
    { period: { ...period, end: "2026-09-20" } },
    { workloadDigest: "changed" },
    { capacityDigest: "changed" },
  ])
    expect(readManualCapacity("import", capacityBinding({ ...scope, ...change }))).toEqual([]);
  saveManualCapacity("import", capacityBinding({ ...scope, resourceInstanceId: "secondary" }), []);
  expect(readManualCapacity("import", binding)).toEqual([manual]);
  clearReviewState("import");
  expect(readManualCapacity("import", binding)).toEqual([]);
});

it("joins projects and preceding models only through exact account and session identity", () => {
  const base = buildDemoExport("moderate").events[0];
  if (!base) throw new Error("fixture missing");
  const row = (session: string, account: string, at: string, project: string) => ({
    ...base,
    occurredAt: at,
    projectHash: project,
    source: { ...base.source, resourceInstanceId: account, nativeSessionHash: session },
  });
  const rows = [
    row("session", "main", "2026-09-15T13:00:00Z", "project-after"),
    row("session", "main", "2026-09-15T11:00:00Z", "project-a"),
    row("unrelated", "main", "2026-09-15T11:59:59Z", "wrong-session"),
    row("session", "secondary", "2026-09-15T11:59:58Z", "wrong-account"),
  ];
  const summary = summarizeCapacity(
    { ...observations, events: [event, { ...event, id: "missing", sessionId: "missing" }] },
    rows,
    period,
    "main",
    new Map([["project-a", "Example project"]]),
  );
  expect(summary.events[0]?.sessionContext).toEqual({
    sessionId: "session",
    projects: [
      { hash: "project-a", label: "Example project" },
      { hash: "project-after", label: "Project project-" },
    ],
    firstResponseAt: "2026-09-15T11:00:00Z",
    lastResponseAt: "2026-09-15T13:00:00Z",
    responses: 2,
    precedingResponse: {
      at: "2026-09-15T11:00:00Z",
      model: base.model.rawName,
      projectLabel: "Example project",
    },
  });
  expect(summary.events[1]?.sessionContext).toBeUndefined();
});
