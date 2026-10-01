import { describe, expect, it } from "vitest";
import {
  compareByOccurrence,
  daysBetween,
  eventsInCategory,
  groupByDay,
  HOMEPAGE_MAX_AGE_DAYS,
  homepageBriefing,
  type MarketEventInput,
  marketEventCategories,
  marketEventSchema,
  marketFeed,
  marketFeedSchema,
  sortByOccurrence,
  validateMarketFeed,
} from "./index.js";

const TODAY = "2026-09-30";

function event(overrides: Partial<MarketEventInput> & { id: string }): MarketEventInput {
  return {
    type: "model_release",
    importance: "major",
    occurredAt: TODAY,
    dateBasis: "provider_publication_date",
    discoveredAt: TODAY,
    verifiedAt: TODAY,
    providerId: "openai",
    modelIds: ["gpt-6-1-sol"],
    title: overrides.id,
    summary: "A sourced summary.",
    status: "available",
    sources: [
      {
        url: "https://openai.com/index/example/",
        title: "Example",
        authority: "first_party",
        checkedAt: TODAY,
      },
    ],
    ...overrides,
  };
}
const parse = (input: MarketEventInput) => marketEventSchema.parse(input);

describe("homepage briefing", () => {
  it("sorts globally by occurrence, newest first, with no category ordering", () => {
    const events = [
      parse(
        event({
          id: "plan-old",
          type: "plan_launch",
          planIds: ["p"],
          modelIds: [],
          occurredAt: "2026-09-20",
        }),
      ),
      parse(event({ id: "model-new", occurredAt: "2026-09-29" })),
      parse(event({ id: "price-mid", type: "api_price_change", occurredAt: "2026-09-25" })),
      parse(
        event({
          id: "bench-newest",
          type: "benchmark_release",
          occurredAt: "2026-09-30",
          benchmark: { sourceSetIds: ["s"], benchmarkIds: [] },
        }),
      ),
    ];
    expect(homepageBriefing(events, { today: TODAY }).map((e) => e.id)).toEqual([
      "bench-newest",
      "model-new",
      "price-mid",
      "plan-old",
    ]);
  });

  it("never shows an event older than thirty days, even when the feed is sparse", () => {
    const events = [
      parse(event({ id: "fresh", occurredAt: "2026-09-29" })),
      parse(event({ id: "edge", occurredAt: "2026-08-31" })),
      parse(event({ id: "stale", occurredAt: "2026-08-30" })),
      parse(event({ id: "year-old", occurredAt: "2025-09-29" })),
    ];
    const shown = homepageBriefing(events, { today: TODAY, limit: 7 });
    expect(shown.map((e) => e.id)).toEqual(["fresh", "edge"]);
    for (const entry of shown)
      expect(daysBetween(entry.occurredAt, TODAY)).toBeLessThanOrEqual(HOMEPAGE_MAX_AGE_DAYS);
    // A caller cannot widen the hard window.
    expect(homepageBriefing(events, { today: TODAY, maxDays: 400 }).map((e) => e.id)).not.toContain(
      "year-old",
    );
  });

  it("leads with the last seven days and fills only empty rows with older events", () => {
    const week = ["2026-09-30", "2026-09-29", "2026-09-28", "2026-09-26", "2026-09-24"].map(
      (day, index) => parse(event({ id: `week-${index}`, occurredAt: day })),
    );
    const older = parse(event({ id: "older", occurredAt: "2026-09-10" }));
    expect(homepageBriefing([older, ...week], { today: TODAY, limit: 5 }).map((e) => e.id)).toEqual(
      week.map((e) => e.id),
    );
    expect(
      homepageBriefing([older, ...week.slice(0, 2)], { today: TODAY }).map((e) => e.id),
    ).toEqual(["week-0", "week-1", "older"]);
  });

  it("shows fewer events rather than filler, and has no per-category quota", () => {
    const models = Array.from({ length: 9 }, (_, index) =>
      parse(
        event({
          id: `model-${index}`,
          occurredAt: `2026-09-${String(29 - index).padStart(2, "0")}`,
        }),
      ),
    );
    const plan = parse(
      event({
        id: "plan",
        type: "plan_launch",
        planIds: ["p"],
        modelIds: [],
        occurredAt: "2026-09-02",
      }),
    );
    const shown = homepageBriefing([...models, plan], { today: TODAY, limit: 6 });
    // Six newest models; the old plan event is not promoted to give its category a slot.
    expect(shown.map((e) => e.id)).toEqual(models.slice(0, 6).map((e) => e.id));
    expect(homepageBriefing([models[0] as never], { today: TODAY })).toHaveLength(1);
    expect(homepageBriefing([], { today: TODAY })).toEqual([]);
  });

  it("leaves minor events to the Updates page and never shows a future-dated event", () => {
    const events = [
      parse(event({ id: "minor", importance: "minor" })),
      parse(event({ id: "notable", importance: "notable" })),
      parse(
        event({
          id: "future",
          occurredAt: "2026-10-02",
          discoveredAt: "2026-10-02",
          verifiedAt: "2026-10-02",
          sources: [
            {
              url: "https://openai.com/x",
              title: "x",
              authority: "first_party",
              checkedAt: "2026-10-02",
            },
          ],
        }),
      ),
    ];
    expect(homepageBriefing(events, { today: TODAY }).map((e) => e.id)).toEqual(["notable"]);
    expect(eventsInCategory(events, "all")).toHaveLength(3);
  });

  it("orders same-day events by published instant, then importance", () => {
    const a = parse(event({ id: "a", occurredAt: "2026-09-29", importance: "notable" }));
    const b = parse(event({ id: "b", occurredAt: "2026-09-29T17:00:00Z", importance: "notable" }));
    const c = parse(event({ id: "c", occurredAt: "2026-09-29", importance: "major" }));
    expect(sortByOccurrence([a, b, c]).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(compareByOccurrence(a, a)).toBe(0);
  });
});

describe("updates filters and grouping", () => {
  const events = [
    parse(event({ id: "m", occurredAt: "2026-09-29" })),
    parse(
      event({
        id: "pp",
        type: "plan_price_change",
        planIds: ["p"],
        modelIds: [],
        occurredAt: "2026-09-29",
      }),
    ),
    parse(event({ id: "ap", type: "api_price_change", occurredAt: "2026-09-21" })),
  ];
  it("puts a plan price change under both Subscriptions and Pricing", () => {
    expect(marketEventCategories("plan_price_change")).toEqual(["subscriptions", "pricing"]);
    expect(eventsInCategory(events, "pricing").map((e) => e.id)).toEqual(["pp", "ap"]);
    expect(eventsInCategory(events, "subscriptions").map((e) => e.id)).toEqual(["pp"]);
    expect(eventsInCategory(events, "models").map((e) => e.id)).toEqual(["m"]);
  });
  it("groups by occurrence day, newest day first", () => {
    expect(groupByDay(events).map((g) => [g.day, g.events.length])).toEqual([
      ["2026-09-29", 2],
      ["2026-09-21", 1],
    ]);
  });
});

describe("event schema", () => {
  it("requires a first-party accepted source", () => {
    expect(() =>
      parse(
        event({
          id: "x",
          sources: [
            {
              url: "https://techcrunch.com/x",
              title: "x",
              authority: "third_party",
              checkedAt: TODAY,
            },
          ],
        }),
      ),
    ).toThrow(/first-party/u);
  });
  it("refuses the same source cited twice", () => {
    const source = {
      url: "https://openai.com/index/x",
      title: "x",
      authority: "first_party" as const,
      checkedAt: TODAY,
    };
    expect(() => parse(event({ id: "x", sources: [source, source] }))).toThrow(/cited twice/u);
  });
  it("refuses an occurrence date after the day it was recorded", () => {
    expect(() => parse(event({ id: "x", occurredAt: "2026-10-01" }))).toThrow(/discovered before/u);
  });
  it("has no date basis for the day StackReplay recorded an event", () => {
    expect(() => parse(event({ id: "x", dateBasis: "catalog_admission" as never }))).toThrow();
  });
  it("requires canonical identities for the kind of event", () => {
    expect(() => parse(event({ id: "x", modelIds: [] }))).toThrow(/canonical model ids/u);
    expect(() => parse(event({ id: "x", type: "plan_launch", modelIds: [], planIds: [] }))).toThrow(
      /plan ids/u,
    );
    expect(() => parse(event({ id: "x", type: "benchmark_release" }))).toThrow(
      /benchmark evidence/u,
    );
  });
  it("refuses a scheduled change without its effective day", () => {
    expect(() => parse(event({ id: "x", status: "scheduled" }))).toThrow(/effective day/u);
  });
});

describe("the accepted feed", () => {
  it("parses and has unique ids", () => {
    expect(marketFeedSchema.parse(marketFeed).events.length).toBeGreaterThan(0);
  });
  it("cites a first-party source with a verbatim excerpt for every event", () => {
    for (const entry of marketFeed.events) {
      expect(entry.sources[0]?.authority, entry.id).toBe("first_party");
      expect(entry.sources[0]?.excerpt, entry.id).toBeTruthy();
    }
  });
  it("is verified no later than the feed's review day", () => {
    for (const entry of marketFeed.events)
      expect(entry.verifiedAt <= marketFeed.asOf, entry.id).toBe(true);
  });
  it("rejects identities that do not exist", () => {
    const identities = {
      providers: new Set<string>(),
      models: new Set<string>(),
      plans: new Set<string>(),
      benchmarkSourceSets: new Map(),
      benchmarkDefinitions: new Set<string>(),
    };
    expect(() => validateMarketFeed(marketFeed, identities)).toThrow(/unknown/u);
  });
});
