import { createModelIdentityIndex } from "@stackreplay/catalog";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { sliceRollingWindows, sortTimedEvents, toTimedEvents } from "@stackreplay/replay-engine";
import type { TextUsageEventV1 } from "@stackreplay/schema";
import { buildArchetypeExport, buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildWorkloadProfile, inspectWindow, safeTimeZone } from "./workload-profile";

const catalog = loadBundledCatalog();
const identity = createModelIdentityIndex(catalog);

function event(
  id: string,
  occurredAt: string,
  overrides: Partial<TextUsageEventV1> & { tokens?: [number, number, number, number] } = {},
): TextUsageEventV1 {
  const [input, cacheRead, cacheWrite, output] = overrides.tokens ?? [100, 900, 0, 50];
  const { tokens: _tokens, ...rest } = overrides;
  return {
    schemaVersion: 1,
    id,
    occurredAt,
    source: { adapterId: "codex", nativeSessionHash: "ns_a" },
    model: { rawName: "gpt-6-sol" },
    modality: "text",
    usage: {
      inputTokens: input + cacheRead,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
      outputTokens: output,
      reasoningTokens: 0,
      accounting: {
        cacheReadIncludedInInput: true,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    },
    projectHash: "ph_one",
    confidence: { usage: "exact", model: "exact" },
    ...rest,
  };
}

const options = (timeZone = "UTC", labels?: Map<string, string>) => ({
  identity,
  catalog,
  timeZone,
  ...(labels === undefined ? {} : { projectLabels: labels }),
});

describe("workload profile", () => {
  it("reconciles projects, models, token categories, chronology and rhythm with the totals", () => {
    const exported = buildDemoExport("heavy");
    const profile = buildWorkloadProfile(exported.events, options("America/Chicago"));
    const { overview } = profile;
    expect(overview.events).toBe(exported.events.length);

    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    expect(sum(profile.projects.map((project) => project.events))).toBe(overview.events);
    expect(sum(profile.projects.map((project) => project.tokens))).toBe(overview.knownTokens);
    expect(
      sum(profile.models.canonical.map((model) => model.events)) +
        sum(profile.models.unresolved.map((model) => model.events)),
    ).toBe(overview.events);
    expect(sum(Object.values(profile.tokens))).toBe(overview.knownTokens);
    expect(sum(profile.chronology.points.map((point) => point.events))).toBe(overview.events);
    expect(sum(profile.chronology.points.map((point) => point.tokens))).toBe(overview.knownTokens);
    expect(sum(profile.rhythm.events.flat())).toBe(overview.events);
    expect(sum(profile.rhythm.tokens.flat())).toBe(overview.knownTokens);
    expect(profile.chronology.points.length).toBe(overview.spanDays);
  });

  it("keeps incomplete usage and unresolved identities explicit", () => {
    const events = [
      event("ev_1", "2026-09-01T10:00:00.000Z"),
      event("ev_2", "2026-09-01T10:05:00.000Z", {
        model: { rawName: "mystery-model-9" },
      }),
      event("ev_3", "2026-09-01T10:10:00.000Z", {
        usage: { inputTokens: 40 },
      }),
    ];
    const profile = buildWorkloadProfile(events, options());
    expect(profile.overview.unresolvedEvents).toBe(1);
    expect(profile.overview.unresolvedIds).toBe(1);
    expect(profile.models.unresolved[0]?.rawName).toBe("mystery-model-9");
    expect(profile.overview.unknownUsageEvents).toBe(1);
    expect(profile.overview.lowerBoundTokens).toBe(40);
    // The incomplete event is counted, but adds nothing to the known total.
    expect(profile.overview.knownTokens).toBe(2 * 1050);
  });

  it("finds peak windows with the engine's own anchored rolling slices", () => {
    const events = [
      event("ev_1", "2026-09-01T10:00:00.000Z"),
      event("ev_2", "2026-09-01T10:30:00.000Z"),
      event("ev_3", "2026-09-01T14:59:59.000Z"),
      event("ev_4", "2026-09-01T15:00:00.000Z", { tokens: [10_000, 0, 0, 0] }),
      event("ev_5", "2026-09-02T09:00:00.000Z"),
    ];
    const profile = buildWorkloadProfile(events, options());
    const byEvents = profile.pressure.events.find((row) => row.id === "5h");
    expect(byEvents?.peak?.events).toBe(3);
    expect(byEvents?.peak?.startMs).toBe(Date.parse("2026-09-01T10:00:00.000Z"));
    expect(byEvents?.peak?.endMs).toBe(Date.parse("2026-09-01T15:00:00.000Z"));
    expect(byEvents?.windowCount).toBe(
      sliceRollingWindows(sortTimedEvents(toTimedEvents(events)), 5 * 3_600_000).length,
    );
    const byTokens = profile.pressure.tokens.find((row) => row.id === "5h");
    expect(byTokens?.peak?.startMs).toBe(Date.parse("2026-09-01T15:00:00.000Z"));
    expect(byTokens?.peak?.tokens).toBe(10_000);
    expect(byTokens?.peak?.share).toBeCloseTo(10_000 / (10_000 + 4 * 1050));
    // Deterministic: the same input gives the same profile.
    expect(buildWorkloadProfile(events, options())).toEqual(profile);
  });

  it("reads clock positions in the named timezone, including half-hour offsets", () => {
    const events = [
      event("ev_1", "2026-09-01T02:30:00.000Z"),
      event("ev_2", "2026-09-01T02:20:00.000Z"),
      event("ev_3", "2026-09-01T02:40:00.000Z"),
    ];
    const utc = buildWorkloadProfile(events, options("UTC"));
    // Tuesday 02:xx UTC.
    expect(utc.rhythm.events[1]?.[2]).toBe(3);
    const chicago = buildWorkloadProfile(events, options("America/Chicago"));
    // Monday Aug 31, 21:xx CDT.
    expect(chicago.rhythm.events[0]?.[21]).toBe(3);
    expect(chicago.overview.firstDate).toBe("2026-08-31");
    const kolkata = buildWorkloadProfile(events, options("Asia/Kolkata"));
    // 07:50, 08:00 and 08:10 IST.
    expect(kolkata.rhythm.events[1]?.[7]).toBe(1);
    expect(kolkata.rhythm.events[1]?.[8]).toBe(2);
    expect(safeTimeZone("Not/AZone")).toBe("UTC");
  });

  it("uses local labels when this browser has them, and never invents a name", () => {
    const events = [
      event("ev_1", "2026-09-01T10:00:00.000Z"),
      event("ev_2", "2026-09-01T11:00:00.000Z", { projectHash: "ph_two" }),
      event("ev_3", "2026-09-01T12:00:00.000Z", { projectHash: undefined }),
    ];
    const labelled = buildWorkloadProfile(
      events,
      options("UTC", new Map([["ph_one", "StackReplay"]])),
    );
    const labels = labelled.projects.map((project) => [project.label, project.labelKind]);
    expect(labels).toContainEqual(["StackReplay", "local"]);
    expect(labels).toContainEqual(["Project 1", "anonymous"]);
    expect(labels).toContainEqual(["No project recorded", "none"]);
    expect(labelled.overview.projects).toBe(2);
    const anonymous = buildWorkloadProfile(events, options());
    expect(JSON.stringify(anonymous)).not.toContain("StackReplay");
  });

  it("inspects one explicit window", () => {
    const events = [
      event("ev_1", "2026-09-01T10:00:00.000Z"),
      event("ev_2", "2026-09-01T10:30:00.000Z", { projectHash: "ph_two" }),
      event("ev_3", "2026-09-01T16:00:00.000Z"),
    ];
    const window = inspectWindow(
      events,
      Date.parse("2026-09-01T10:00:00.000Z"),
      Date.parse("2026-09-01T11:00:00.000Z"),
      options("UTC", new Map([["ph_one", "StackReplay"]])),
    );
    expect(window.events).toBe(2);
    expect(window.projects.map((project) => project.label).sort()).toEqual([
      "Project 1",
      "StackReplay",
    ]);
    expect(window.models[0]?.label).toBe(catalog.models["gpt-6-sol"]?.name);
  });

  it("states comparative facts only, each with its baseline and its evidence", () => {
    const profile = buildWorkloadProfile(buildDemoExport("heavy").events, options());
    expect(profile.insights.length).toBeGreaterThan(0);
    expect(profile.insights.length).toBeLessThanOrEqual(6);
    for (const insight of profile.insights) {
      expect(insight.comparison).toMatch(/\d/u);
      expect(insight.evidence.section).toMatch(/^[a-z]+$/u);
      expect(insight.text.trim()).toMatch(/[.]$/u);
    }
    // The top three cover as many families as there are, strongest first.
    const top = profile.insights.slice(0, 3);
    const families = new Set(profile.insights.map((insight) => insight.family)).size;
    expect(new Set(top.map((insight) => insight.family)).size).toBe(Math.min(3, families));
    expect(top[0]?.strength).toBe(Math.max(...profile.insights.map((insight) => insight.strength)));
    // Without a rules date there is no value, so no dollar fact.
    expect(profile.value).toBeUndefined();
    expect(profile.insights.some((insight) => insight.id === "cache-value")).toBe(false);
  });

  it("with a rules date, carries the published-rate value and its cache fact", () => {
    const exported = buildArchetypeExport("mixed");
    const profile = buildWorkloadProfile(exported.events, {
      ...options(),
      rulesAsOf: "2026-09-24",
    });
    expect(profile.value?.total).toBeDefined();
    const cache = profile.insights.find((insight) => insight.id === "cache-value");
    expect(cache?.text).toMatch(/at published API list prices/u);
    expect(cache?.comparison).toMatch(/× the list-price value without caching$/u);
    // The cache share is stated once, in the tokens section, not in a fact.
    expect(profile.insights.every((insight) => !/cache reads were/iu.test(insight.text))).toBe(
      true,
    );
  });
});
