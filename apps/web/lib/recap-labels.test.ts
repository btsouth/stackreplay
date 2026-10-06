import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildRecap, pricingCoverage, type Recap, requestCountOf } from "./recap";
import {
  activeDays,
  dollarRate,
  namedModelCount,
  periodFirstSeen,
  plural,
  pricedRequestShare,
  tokenSplit,
} from "./terminal-presentation";

const event = buildDemoExport("billing").events[0]!;

function at(occurredAt: string, over: Partial<typeof event> = {}): typeof event {
  return { ...event, occurredAt, ...over };
}

describe("recap label calculations", () => {
  it("keeps session summaries out of the request count", () => {
    const normal = at("2026-10-02T12:00:00Z");
    const aggregate = at("2026-10-02T13:00:00Z", {
      source: { ...event.source, adapterId: "hermes" },
      confidence: { ...event.confidence, usage: "estimated" },
    });
    const r = buildRecap([normal, aggregate], "30", "2026-10-03T12:00:00Z", "UTC");
    expect(r.records).toBe(2);
    expect(r.aggregateRecords).toBe(1);
    expect(requestCountOf(r)).toBe(1);
    expect(requestCountOf({ records: 5, aggregateRecords: 9 })).toBe(0);
  });

  it("counts new tokens as input, output and cache writes", () => {
    const r = buildRecap(
      [
        at("2026-10-02T12:00:00Z", {
          usage: {
            inputTokens: 1000,
            outputTokens: 100,
            cacheReadTokens: 600,
            cacheWriteTokens: 200,
            reasoningTokens: 0,
            accounting: {
              cacheReadIncludedInInput: false,
              cacheWriteIncludedInInput: false,
              reasoningIncludedInOutput: true,
            },
          },
        }),
      ],
      "30",
      "2026-10-03T12:00:00Z",
      "UTC",
    );
    const split = tokenSplit(r);
    expect(split?.newTokens).toBe(1300);
    expect(split?.cacheRead).toBe(600);
    expect(split?.cacheShare).toBeCloseTo(600 / 1900, 6);
  });

  it("counts only days with logged requests", () => {
    const r = buildRecap(
      [at("2026-09-10T12:00:00Z"), at("2026-09-12T12:00:00Z")],
      "30",
      "2026-10-02T12:00:00Z",
      "UTC",
    );
    expect(r.days.length).toBe(30);
    expect(activeDays(r)).toBe(2);
  });

  it("reports the priced request share and per-model coverage", () => {
    expect(pricedRequestShare({ priced: 90, records: 100 })).toBe(90);
    expect(pricedRequestShare({ priced: 168134, records: 185961 })).toBe(90);
    expect(pricedRequestShare({ priced: 0, records: 0 })).toBe(0);
    expect(pricingCoverage({ priced: 0, records: 5 })).toBe("none");
    expect(pricingCoverage({ priced: 2, records: 5 })).toBe("partial");
    expect(pricingCoverage({ priced: 5, records: 5 })).toBe("full");
  });

  it("scopes first-seen to the period, and shows all of them for all time", () => {
    const r = {
      period: "30",
      start: "2026-09-07",
      end: "2026-10-06",
      deep: {
        firstSeen: [
          { id: "old", date: "2026-08-21" },
          { id: "new", date: "2026-09-10" },
          { id: "edge", date: "2026-10-06" },
        ],
      },
    } as unknown as Recap;
    expect(periodFirstSeen(r).map((entry) => entry.id)).toEqual(["new", "edge"]);
    expect(periodFirstSeen({ ...r, period: "all" }).map((entry) => entry.id)).toEqual([
      "old",
      "new",
      "edge",
    ]);
  });

  it("counts named models apart from unresolved IDs", () => {
    const row = (id: string, name: string, family: string) => ({
      id,
      name,
      family,
      output: 0,
      total: 5,
      records: 1,
      priced: 1,
      usd: "1",
      usdHigh: "1",
      cacheScenarioRecords: 0,
    });
    const r = {
      models: [row("a", "A", "openai"), row("space-bunny-free", "Other / Unresolved", "other")],
    } as unknown as Recap;
    expect(namedModelCount(r)).toBe(1);
  });

  it("keeps a positive sub-cent rate from reading as zero", () => {
    expect(dollarRate(0)).toBe("$0.00");
    expect(dollarRate(0.0003)).toBe("<$0.01");
    expect(dollarRate(0.02)).toBe("$0.02");
  });

  it("uses singular labels for one", () => {
    expect(plural(1, "DAY", "DAYS")).toBe("1 DAY");
    expect(plural(2, "DAY", "DAYS")).toBe("2 DAYS");
    expect(plural(0, "LOG SOURCE", "LOG SOURCES")).toBe("0 LOG SOURCES");
  });
});
