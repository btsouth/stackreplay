import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { Decimal, replayObservingQuotes } from "@stackreplay/replay-engine";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap, outputOf, totalTokensOf } from "./recap";

const base = buildDemoExport("billing").events;
const event = base[0]!;
describe("private recap metrics", () => {
  it("uses local calendar days across DST and excludes future records", () => {
    const events = [
      "2026-03-07T04:59:00Z",
      "2026-03-07T05:00:00Z",
      "2026-03-08T07:00:00Z",
      "2026-03-09T04:00:00Z",
      "2026-04-06T16:00:01Z",
    ].map((occurredAt, i) => ({ ...event, id: `e${i}`, occurredAt }));
    const r = buildRecap(events, "30", "2026-04-06T16:00:00Z", "America/New_York");
    expect(r.start).toBe("2026-03-08");
    expect(r.days).toHaveLength(30);
    expect(r.records).toBe(2);
    expect(r.longestStreak).toBe(4);
    expect(r.streak).toBe(0);
  });
  it("keeps yesterday's streak open today and counts native tool/session identities", () => {
    const events = [
      "2026-10-01T10:00:00Z",
      "2026-10-02T23:00:00Z",
      "2026-10-02T23:01:00Z",
      "2026-10-03T23:00:00Z",
    ].map((occurredAt, i) => ({
      ...event,
      id: `e${i}`,
      occurredAt,
      source: {
        ...event.source,
        nativeSessionHash: "same",
        adapterId: i === 3 ? "codex" : "claude-code",
      },
    }));
    const r = buildRecap(events, "30", "2026-10-04T12:00:00Z", "UTC");
    expect(r.streak).toBe(3);
    expect(r.longestStreak).toBe(3);
    expect(r.sessions).toBe(2);
    expect(r.busiestHour).toBe(23);
    expect(r.busiestDay).toBe("2026-10-02");
  });
  it("does not double count included reasoning or invent missing output", () => {
    expect(
      outputOf({
        ...event,
        usage: {
          outputTokens: 100,
          reasoningTokens: 30,
          accounting: { reasoningIncludedInOutput: true },
        },
      }),
    ).toBe(100);
    expect(
      outputOf({
        ...event,
        usage: {
          outputTokens: 100,
          reasoningTokens: 30,
          accounting: { reasoningIncludedInOutput: false },
        },
      }),
    ).toBe(130);
    expect(outputOf({ ...event, usage: {} })).toBeUndefined();
  });
  it("prices a subset with exact engine quotes and preserves unknown models", () => {
    const model = { rawName: "claude-opus-5-5", canonicalId: "claude-opus-5-5" };
    const known = {
      ...event,
      id: "known",
      occurredAt: "2026-10-03T12:00:00Z",
      model,
      usage: { ...event.usage, cacheWriteTokens: 0 },
    };
    const unknown = { ...known, id: "unknown", model: { rawName: "private-model" } };
    const missing = { ...known, id: "missing", usage: {} };
    const catalog = loadBundledCatalog();
    let expected = new Decimal(0);
    replayObservingQuotes(
      {
        events: [known],
        catalog,
        target: { type: "api", providerId: "anthropic" },
        context: { rulesAsOf: "2026-10-04" },
      },
      (_e, outcome, q) => {
        if (outcome === "priced" && q.amount) expected = expected.add(q.amount);
      },
    );
    const r = buildRecap([known, unknown, missing], "30", "2026-10-04T12:00:00Z", "UTC", catalog);
    expect(r.priced).toBe(1);
    expect(r.usd).toBe(expected.toString());
    expect(r.outputKnown).toBe(2);
    expect(r.models.find((m) => m.id === "private-model")?.priced).toBe(0);
    const unpriced = buildRecap([unknown], "30", "2026-10-04T12:00:00Z", "UTC", catalog);
    expect(unpriced.explorer?.days.find((d) => d.records > 0)?.usd).toBeUndefined();
    expect(unpriced.explorer?.days.find((d) => d.records === 0)?.usd).toBe("0");
  });
  it("keeps charts and breakdowns equal to the event totals without mutating fixtures", () => {
    const before = JSON.stringify(base);
    const r = buildRecap(base, "all", "2026-10-04T12:00:00Z", "UTC");
    expect(r.tools.reduce((s, t) => s + t.records, 0)).toBe(r.records);
    expect(r.models.reduce((s, m) => s + m.output, 0)).toBe(r.output);
    expect(
      r.weeks.reduce((s, w) => s + Object.values(w.families).reduce((a, b) => a + b, 0), 0),
    ).toBe(r.total);
    expect(JSON.stringify(base)).toBe(before);
  });
  it("has no phantom metrics for empty history", () => {
    const r = buildRecap([], "all", "2026-10-04T12:00:00Z", "UTC");
    expect(r.records).toBe(0);
    expect(r.sessions).toBe(0);
    expect(r.priced).toBe(0);
    expect(r.streak).toBe(0);
  });
});

it("uses both documented cache-write TTL prices as a scenario range", () => {
  const e = {
    ...event,
    occurredAt: "2026-10-03T12:00:00Z",
    model: { rawName: "claude-opus-5-5", canonicalId: "claude-opus-5-5" },
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 1000000,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: false,
      },
    },
  };
  const r = buildRecap([e], "30", "2026-10-04T12:00:00Z", "UTC");
  expect(r.usd).toBe("5");
  expect(r.usdHigh).toBe("8");
  expect(r.cacheScenarioRecords).toBe(1);
  expect(r.priced).toBe(1);
});

it("counts exclusive categories once, including cache-only and partial records", () => {
  const usage = {
    inputTokens: 1000,
    outputTokens: 100,
    cacheReadTokens: 600,
    cacheWriteTokens: 200,
    reasoningTokens: 30,
  };
  for (const included of [true, false]) {
    const e = {
      ...event,
      usage: {
        ...usage,
        accounting: {
          cacheReadIncludedInInput: included,
          cacheWriteIncludedInInput: included,
          reasoningIncludedInOutput: included,
        },
      },
    };
    expect(totalTokensOf(e)).toBe(included ? 1100 : 1930);
    const r = buildRecap([e], "all", "2026-10-04T12:00:00Z", "UTC");
    expect(r.total).toBe(included ? 1100 : 1930);
    expect(r.models[0]?.total).toBe(r.total);
    expect(r.tools[0]?.total).toBe(r.total);
  }
  expect(
    totalTokensOf({
      ...event,
      usage: { cacheReadTokens: 12, accounting: { cacheReadIncludedInInput: false } },
    }),
  ).toBe(12);
  expect(totalTokensOf({ ...event, usage: { inputTokens: 0 } })).toBe(0);
  expect(totalTokensOf({ ...event, usage: {} })).toBeUndefined();
});

describe("full-history activity", () => {
  it("does not clip either streak when the period changes", () => {
    const events = Array.from({ length: 120 }, (_, i) => ({
      ...event,
      id: `day-${i}`,
      occurredAt: new Date(Date.parse("2026-10-04T12:00:00Z") - i * 86400000).toISOString(),
    }));
    for (const period of ["30", "90", "all"] as const) {
      const recap = buildRecap(events, period, "2026-10-04T16:00:00Z", "UTC");
      expect(recap.streak).toBe(120);
      expect(recap.longestStreak).toBe(120);
      expect(recap.records).toBe(period === "all" ? 120 : Number(period));
    }
  });
  it("unions sources at local midnight rather than UTC midnight", () => {
    const events = ["2026-10-03T03:59:00Z", "2026-10-03T04:00:00Z", "2026-10-04T04:00:00Z"].map(
      (occurredAt, i) => ({
        ...event,
        id: `source-${i}`,
        occurredAt,
        source: { ...event.source, adapterId: ["codex", "claude-code", "command-code"][i]! },
      }),
    );
    const recap = buildRecap(events, "30", "2026-10-04T12:00:00Z", "America/Kentucky/Louisville");
    expect(recap.streak).toBe(3);
    expect(recap.longestStreak).toBe(3);
    expect(recap.days.filter((d) => d.records).map((d) => d.date)).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(buildRecap(events, "30", "2026-10-04T12:00:00Z", "UTC").streak).toBe(2);
  });
  it("marks only the first and last local days of aggregate activity, preserving volume and costs", () => {
    const aggregate = {
      ...event,
      id: "aggregate",
      source: { ...event.source, adapterId: "hermes" },
      confidence: { ...event.confidence, usage: "estimated" as const },
      occurredAt: "2026-03-09T04:01:00Z",
      requestStartedAt: "2026-03-07T04:59:00Z",
      requestEndedAt: "2026-03-09T04:01:00Z",
    };
    const recap = buildRecap(
      [
        aggregate,
        {
          ...aggregate,
          id: "native",
          source: { ...event.source, adapterId: "codex" },
          confidence: { ...event.confidence, usage: "exact" as const },
        },
      ],
      "30",
      "2026-03-09T12:00:00Z",
      "America/Kentucky/Louisville",
    );
    expect(recap.streak).toBe(1);
    expect(recap.longestStreak).toBe(1);
    expect(recap.days.filter((d) => d.records).map((d) => d.records)).toEqual([1, 2]);
    expect(recap.records).toBe(2);
    expect(recap.days.reduce((n, d) => n + d.output, 0)).toBe(recap.output);
  });
  it("clips an ongoing aggregate at today and ignores future or reversed spans", () => {
    const aggregate = {
      ...event,
      source: { ...event.source, adapterId: "hermes" },
      confidence: { ...event.confidence, usage: "estimated" as const },
      occurredAt: "2026-10-06T12:00:00Z",
      requestStartedAt: "2026-10-01T12:00:00Z",
      requestEndedAt: "2026-10-06T12:00:00Z",
    };
    const recap = buildRecap([aggregate], "all", "2026-10-04T12:00:00Z", "UTC");
    expect(recap.streak).toBe(1);
    expect(recap.records).toBe(0);
    expect(
      buildRecap(
        [{ ...aggregate, requestStartedAt: "2026-10-07T12:00:00Z" }],
        "all",
        "2026-10-04T12:00:00Z",
        "UTC",
      ).streak,
    ).toBe(0);
  });
  it("keeps the current streak alive before today's first activity", () => {
    const events = ["2026-10-01", "2026-10-02", "2026-10-03"].map((d, i) => ({
      ...event,
      id: `grace-${i}`,
      occurredAt: `${d}T12:00:00Z`,
    }));
    const recap = buildRecap(events, "30", "2026-10-04T08:00:00Z", "UTC");
    expect(recap.streak).toBe(3);
    expect(recap.longestStreak).toBe(3);
  });
});
