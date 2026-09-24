import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  calendarLimit,
  FIXTURE_PLAN_VERSION_ID,
  fixtureContext,
  makeFixtureCatalog,
  overageRate,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent, overlappingUsage } from "./fixtures/events.js";

/**
 * Golden scenarios for subscription replay.
 *
 * Every expectation here was derived by hand from the documented semantics
 * (docs/ARCHITECTURE_DECISIONS.md, decisions 13-20) and then checked against
 * the engine. Fixture arithmetic uses round numbers on purpose: fixture-small
 * costs $1.00 per 1M input tokens, $2.00 per 1M output tokens, $0.10 per 1M
 * cache reads and $1.00 per 1M cache writes; fixture-medium costs $2.00 and
 * $4.00 with no cache or reasoning rates.
 *
 * Semantics under test: chronological admission, atomic rejection, explicit
 * exceed behavior, disjoint token accounting, unknown-versus-zero, rules
 * snapshot resolution and per-window overage.
 */

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

function run(
  catalog: ReturnType<typeof makeFixtureCatalog>,
  events: ReturnType<typeof makeEvent>[],
) {
  return replay({ events, target, catalog, context: fixtureContext });
}

describe("golden fixture: rolling 5-hour window (reject_request)", () => {
  it("rejects only the request that does not fit and serves later ones", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "rolling-credits", type: "credit_pool", amount: "20.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 6_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 8_000_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 7_000_000 }),
      }),
      makeEvent({
        id: "e4",
        occurredAt: "2026-09-01T03:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e5",
        occurredAt: "2026-09-01T06:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      }),
    ];

    const result = run(catalog, events);

    // Window 1: 6 + 8 = 14 accepted, the 7 does not fit and is rejected, the 1
    // still fits because rejected requests consume nothing.
    expect(result.violations).toEqual([
      {
        type: "rolling_window_exceeded",
        constraintId: "rolling-credits",
        unit: "usd",
        startedAt: "2026-09-01T00:00:00Z",
        endedAt: "2026-09-01T05:00:00Z",
        affectedEvents: 1,
        requiredUnits: "22",
        availableUnits: "20",
        acceptedUnits: "15",
        exceededAt: "2026-09-01T02:00:00Z",
      },
    ]);
    expect(result.constraints[0]).toMatchObject({
      status: "exceeded",
      exceed: "reject_request",
      consumedUnits: "17",
      attemptedUnits: "24",
      rejectedEvents: 1,
      indeterminateEvents: 0,
      eligibleEvents: 5,
      violationCount: 1,
    });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 80,
      covered: 4,
      total: 5,
    });
    expect(result.coverage.usage).toEqual({
      status: "known",
      percent: 70.8333,
      covered: 17_000_000,
      total: 24_000_000,
    });
    expect(result.feasibility).toEqual({
      status: "partial",
      coveragePercent: 80,
      coverageDimension: "requests",
    });
  });
});

describe("golden fixture: rolling weekly window (latch_until_reset)", () => {
  it("blocks later requests until the window resets", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "weekly-credits",
          type: "credit_pool",
          amount: "10.00",
          exceed: "latch_until_reset",
          window: { type: "rolling", duration: "P7D", anchor: "first_use" },
        }),
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 3_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-02T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 3_000_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-03T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 5_000_000 }),
      }),
      makeEvent({
        id: "e4",
        occurredAt: "2026-09-03T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e5",
        occurredAt: "2026-09-08T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.violations).toEqual([
      {
        type: "rolling_window_exceeded",
        constraintId: "weekly-credits",
        unit: "usd",
        startedAt: "2026-09-01T00:00:00Z",
        endedAt: "2026-09-08T00:00:00Z",
        affectedEvents: 2,
        requiredUnits: "12",
        availableUnits: "10",
        acceptedUnits: "6",
        exceededAt: "2026-09-03T00:00:00Z",
      },
    ]);
    expect(result.constraints[0]).toMatchObject({
      status: "exceeded",
      exceed: "latch_until_reset",
      consumedUnits: "8",
      attemptedUnits: "14",
      rejectedEvents: 2,
    });
    expect(result.warnings.map((warning) => warning.code)).toContain("LATCH_TRIGGERED");
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 60,
      covered: 3,
      total: 5,
    });
  });
});

describe("golden fixture: calendar month", () => {
  it("splits windows at UTC month boundaries", () => {
    const catalog = makeFixtureCatalog({
      limits: [calendarLimit({ id: "monthly-tokens", type: "token_limit", amount: "10000000" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-08-31T23:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 6_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 6_000_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-02T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 6_000_000 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.violations).toEqual([
      {
        type: "calendar_window_exceeded",
        constraintId: "monthly-tokens",
        unit: "tokens",
        startedAt: "2026-09-01T00:00:00Z",
        endedAt: "2026-10-01T00:00:00Z",
        affectedEvents: 1,
        requiredUnits: "12000000",
        availableUnits: "10000000",
        acceptedUnits: "6000000",
        exceededAt: "2026-09-02T00:00:00Z",
      },
    ]);
    expect(result.constraints[0]).toMatchObject({
      consumedUnits: "12000000",
      attemptedUnits: "18000000",
      status: "exceeded",
    });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 66.6667,
      covered: 2,
      total: 3,
    });
    expect(result.assumptions.map((assumption) => assumption.id)).toContain(
      "MONTHLY_WINDOW_CALENDAR_MONTH",
    );
  });
});

describe("golden fixture: promotions resolve from the rules snapshot", () => {
  const catalog = makeFixtureCatalog({
    limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "50.00" })],
    promotions: [
      {
        id: "medium-promo",
        label: "Medium promotion",
        models: ["fixture-medium"],
        multiplier: "0.5",
        effectiveFrom: "2026-09-01",
        effectiveTo: "2026-09-30",
      },
    ],
  });
  const events = [
    makeEvent({
      id: "e1",
      occurredAt: "2026-09-10T00:00:00Z",
      usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
    }),
    makeEvent({
      id: "e2",
      occurredAt: "2026-10-05T00:00:00Z",
      usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
    }),
  ];

  it("applies a promotion active at rulesAsOf to the whole historical workload", () => {
    const result = replay({ events, target, catalog, context: { rulesAsOf: "2026-09-15" } });
    // $4.00 halved twice: the promotion belongs to the current rule snapshot,
    // including for the event whose own timestamp is outside the promotion.
    expect(result.constraints[0]?.consumedUnits).toBe("4");
    expect(result.violations).toHaveLength(0);
    expect(result.assumptions.map((assumption) => assumption.id)).toContain(
      "CURRENT_RULE_SNAPSHOT",
    );
  });

  it("does not apply a promotion that is inactive at rulesAsOf", () => {
    const result = replay({ events, target, catalog, context: { rulesAsOf: "2026-10-15" } });
    expect(result.constraints[0]?.consumedUnits).toBe("8");
  });
});

describe("golden fixture: coverage dimensions keep one unit each", () => {
  /**
   * Regression (benchmark F033): a coverage dimension reports its counts in its
   * own unit. The model dimension used to report `covered`/`total` in models while
   * `unknownCount` counted *events*, so one number read as a model count and meant
   * something else.
   */
  it("counts unresolved models in models and describes events in the reason", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const unmapped = (id: string, hour: number, rawName: string) =>
      makeEvent({
        id,
        occurredAt: `2026-09-01T0${hour}:00:00Z`,
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
        model: { rawName },
      });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      unmapped("e2", 1, "ghost-a"),
      unmapped("e3", 2, "ghost-a"),
      unmapped("e4", 3, "ghost-b"),
    ];

    const { models } = run(catalog, events).coverage;

    expect(models.status).toBe("unknown");
    // Two distinct models, three events: the count is models.
    expect(models.unknownCount).toBe(2);
    expect(models.covered).toBe(1);
    expect(models.total).toBe(3);
    expect(models.reason).toContain("3 event(s)");
    expect(models.reason).toContain("2 model(s)");
  });

  /**
   * Regression (benchmark F033): the token-weighted dimension cannot express its
   * unknown part in the dimension's unit, so it must not publish an event count in
   * a field that reads as a token count.
   */
  it("omits a count in the wrong unit for the token-weighted dimension", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      // No output category reported: the event's token total is unknown.
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: {
          inputTokens: 500_000,
          accounting: { cacheReadIncludedInInput: false, cacheWriteIncludedInInput: false },
        },
      }),
    ];

    const { usage } = run(catalog, events).coverage;

    expect(usage.status).toBe("unknown");
    expect(usage.unknownCount).toBeUndefined();
    expect(usage.reason).toContain("1 event(s)");
  });
});

describe("golden fixture: model exclusion", () => {
  it("reports excluded models and reduces model coverage", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
      modelRules: [
        { model: "fixture-small", pricingRef: "fixture-small-pricing" },
        { model: "fixture-medium", excluded: true },
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e4",
        occurredAt: "2026-09-01T03:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e5",
        occurredAt: "2026-09-01T04:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ];

    const result = run(catalog, events);

    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-medium",
        canonicalId: "fixture-medium",
        eventCount: 2,
        reason: "excluded",
      },
    ]);
    expect(result.coverage.models).toEqual({ status: "known", percent: 50, covered: 1, total: 2 });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 60,
      covered: 3,
      total: 5,
    });
    // Unsupported events are never offered to the pool.
    expect(result.constraints[0]).toMatchObject({
      consumedUnits: "3",
      attemptedUnits: "3",
      eligibleEvents: 3,
    });
  });
});

describe("golden fixture: hard credit cap (reject_request)", () => {
  it("rejects every request that individually does not fit", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "cap", type: "credit_pool", amount: "5.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 4_000_000 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.violations[0]).toMatchObject({
      affectedEvents: 2,
      requiredUnits: "12",
      availableUnits: "5",
      acceptedUnits: "4",
    });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 33.3333,
      covered: 1,
      total: 3,
    });
    expect(result.feasibility).toEqual({
      status: "partial",
      coveragePercent: 33.3333,
      coverageDimension: "requests",
    });
  });
});

describe("golden fixture: overage plan (allow_overage)", () => {
  it("serves everything and bills the excess above included capacity", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "overage-credits",
          type: "credit_pool",
          amount: "1.00",
          exceed: "allow_overage",
        }),
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 100,
      covered: 3,
      total: 3,
    });
    expect(result.constraints[0]).toMatchObject({
      status: "exceeded",
      exceed: "allow_overage",
      consumedUnits: "3",
      attemptedUnits: "3",
      rejectedEvents: 0,
      overageUnits: "2",
      overageCost: { amount: "2", currency: "USD" },
    });
    expect(result.violations[0]).toMatchObject({
      requiredUnits: "3",
      availableUnits: "1",
      acceptedUnits: "3",
      overageUnits: "2",
      affectedEvents: 0,
    });
    expect(result.economics).toEqual({
      basePlanCost: { amount: "20.00", currency: "USD" },
      overageCost: { amount: "2", currency: "USD" },
      targetCost: { amount: "22", currency: "USD" },
      costBasis: "fixed_plan_price_plus_overage",
    });
    expect(result.assumptions.map((assumption) => assumption.id)).toContain("OVERAGE_PER_WINDOW");
  });

  it("bills token overage at the declared per-million rate", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        calendarLimit({
          id: "monthly-tokens",
          type: "token_limit",
          amount: "1000000",
          exceed: "allow_overage",
          overageRate: overageRate("3.00", "per_1m_tokens"),
        }),
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 2_500_000 }),
      }),
    ];

    const result = run(catalog, events);

    // 1,500,000 tokens above capacity at $3.00 per 1M tokens.
    expect(result.constraints[0]?.overageUnits).toBe("1500000");
    expect(result.constraints[0]?.overageCost).toEqual({ amount: "4.5", currency: "USD" });
    expect(result.economics).toMatchObject({
      overageCost: { amount: "4.5", currency: "USD" },
      targetCost: { amount: "24.5", currency: "USD" },
    });
  });
});

describe("golden fixture: mixed models", () => {
  it("converts each model with its own pricing", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "50.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ outputTokens: 500_000 }),
        model: { rawName: "Fixture Small", canonicalId: "fixture-small" },
      }),
    ];

    const result = run(catalog, events);

    // $1.00 + $2.00 + $1.00 (500k output at $2/1M).
    expect(result.constraints[0]?.consumedUnits).toBe("4");
    expect(result.coverage.models).toEqual({ status: "known", percent: 100, covered: 2, total: 2 });
    expect(result.workload.tokenTotals).toEqual({
      inputTokens: 2_000_000,
      outputTokens: 500_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    });
    expect(result).toMatchSnapshot();
  });
});

describe("golden fixture: timezone reset", () => {
  it("uses the window timezone for calendar days", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        calendarLimit({
          id: "daily-requests",
          type: "request_limit",
          amount: "2",
          window: { type: "calendar", unit: "day", timezone: "America/New_York" },
        }),
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-02T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-02T03:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-02T04:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e4",
        occurredAt: "2026-09-02T05:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e5",
        occurredAt: "2026-09-02T06:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.violations).toEqual([
      {
        type: "calendar_window_exceeded",
        constraintId: "daily-requests",
        unit: "requests",
        startedAt: "2026-09-02T04:00:00Z",
        endedAt: "2026-09-03T04:00:00Z",
        affectedEvents: 1,
        requiredUnits: "3",
        availableUnits: "2",
        acceptedUnits: "2",
        exceededAt: "2026-09-02T06:00:00Z",
      },
    ]);
    expect(result.constraints[0]?.consumedUnits).toBe("4");
    expect(result.constraints[0]?.attemptedUnits).toBe("5");
  });
});

describe("golden fixture: DST boundary", () => {
  it("models the 23-hour spring-forward local day", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        calendarLimit({
          id: "daily-requests",
          type: "request_limit",
          amount: "2",
          window: { type: "calendar", unit: "day", timezone: "America/New_York" },
        }),
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2027-03-14T06:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2027-03-14T08:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2027-03-14T12:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e4",
        occurredAt: "2027-03-15T04:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.violations).toEqual([
      {
        type: "calendar_window_exceeded",
        constraintId: "daily-requests",
        unit: "requests",
        startedAt: "2027-03-14T05:00:00Z",
        endedAt: "2027-03-15T04:00:00Z",
        affectedEvents: 1,
        requiredUnits: "3",
        availableUnits: "2",
        acceptedUnits: "2",
        exceededAt: "2027-03-14T12:00:00Z",
      },
    ]);
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 75,
      covered: 3,
      total: 4,
    });
  });
});

describe("golden fixture: unsupported model", () => {
  it("distinguishes models the plan does not include from unresolvable models", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
      modelRules: [{ model: "fixture-small", pricingRef: "fixture-small-pricing" }],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
        model: { rawName: "mystery-model" },
      }),
    ];

    const result = run(catalog, events);

    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-medium",
        canonicalId: "fixture-medium",
        eventCount: 1,
        reason: "not_supported",
      },
      { rawName: "mystery-model", eventCount: 1, reason: "unresolved" },
    ]);
    expect(result.warnings.map((warning) => warning.code)).toContain("MODEL_UNRESOLVED");
    // An unresolved model makes the model dimension indeterminate rather than
    // counting it as definitively unsupported.
    expect(result.coverage.models).toMatchObject({
      status: "unknown",
      covered: 1,
      total: 3,
      unknownCount: 1,
    });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 33.3333,
      covered: 1,
      total: 3,
    });
  });
});

describe("golden fixture: unknown consumption", () => {
  it("reports UNKNOWN instead of a false pass when token data is missing", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
      makeEvent({ id: "e2", occurredAt: "2026-09-01T01:00:00Z", usage: {} }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.constraints[0]).toMatchObject({
      status: "unknown",
      consumedUnits: "2",
      attemptedUnits: "2",
      indeterminateEvents: 1,
      rejectedEvents: 0,
      violationCount: 0,
    });
    expect(result.coverage.requests).toMatchObject({
      status: "unknown",
      covered: 2,
      total: 3,
      unknownCount: 1,
    });
    expect(result.coverage.requests.percent).toBeUndefined();
    expect(result.coverage.usage.status).toBe("unknown");
    expect(result.feasibility.status).toBe("unknown");
    expect(result.feasibility.coveragePercent).toBeUndefined();
    expect(result.confidence.level).toBe("low");
    expect(result.warnings.map((warning) => warning.code)).toContain("EVENT_NO_TOKEN_DATA");
  });

  it("treats a token limit over unknown usage as unknown rather than passed", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "1000000" })],
    });
    const result = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: {} }),
    ]);
    expect(result.constraints[0]?.status).toBe("unknown");
    expect(result.feasibility.status).toBe("unknown");
  });
});

describe("golden fixture: cache pricing", () => {
  it("prices documented categories and reports undocumented ones as unknown, never guessed", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ cacheReadTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ cacheReadTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ reasoningTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ];

    const result = run(catalog, events);

    // Only e1 prices: $0.10 at the documented cache rate. e2 has no cache rate
    // and e3 no reasoning rate on fixture-medium, and neither may fall back to
    // the input or output rate (decision 35): their monetary consumption is
    // unknown instead of guessed.
    expect(result.constraints[0]).toMatchObject({
      status: "unknown",
      consumedUnits: "0.1",
      indeterminateEvents: 2,
    });
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "PRICING_CATEGORY_UNDOCUMENTED",
    );
    expect(result.warnings.map((warning) => warning.code)).not.toContain("PRICING_RATE_FALLBACK");
    expect(result.assumptions.map((assumption) => assumption.id)).not.toContain(
      "REASONING_PRICED_AS_OUTPUT",
    );
  });
});

describe("golden fixture: disjoint token accounting", () => {
  it("never double counts cache tokens that the source includes in input", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });

    const overlapping = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: overlappingUsage({ inputTokens: 1_000_000, cacheReadTokens: 1_000_000 }),
      }),
    ]);
    // 1M input of which 1M were cache reads: only the cache rate applies.
    expect(overlapping.constraints[0]?.consumedUnits).toBe("0.1");

    const disjoint = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000, cacheReadTokens: 1_000_000 }),
      }),
    ]);
    expect(disjoint.constraints[0]?.consumedUnits).toBe("1.1");
  });

  it("never double counts reasoning tokens that are a subset of output", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: overlappingUsage({
          inputTokens: 0,
          outputTokens: 1_000_000,
          reasoningTokens: 400_000,
        }),
      }),
    ]);
    // 600k output at $2/1M plus 400k reasoning at its own documented $3/1M
    // rate: the subset is subtracted from output and each disjoint bucket is
    // priced at its own rate.
    expect(result.constraints[0]?.consumedUnits).toBe("2.4");
  });
});

describe("golden fixture: per-request rejection versus latching", () => {
  it("serves a later request that fits when the rule only rejects the request", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
    });
    const events = [
      makeEvent({
        id: "a",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 11 }),
      }),
      makeEvent({
        id: "b",
        occurredAt: "2026-09-01T00:01:00Z",
        usage: completeUsage({ uncachedInputTokens: 1 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.constraints[0]).toMatchObject({
      status: "exceeded",
      consumedUnits: "1",
      attemptedUnits: "12",
      rejectedEvents: 1,
    });
    expect(result.violations[0]).toMatchObject({
      requiredUnits: "12",
      availableUnits: "10",
      acceptedUnits: "1",
      affectedEvents: 1,
    });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 50,
      covered: 1,
      total: 2,
    });
  });

  it("blocks the rest of the window when the rule latches", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "tokens",
          type: "token_limit",
          amount: "10",
          exceed: "latch_until_reset",
        }),
      ],
    });
    const events = [
      makeEvent({
        id: "a",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 11 }),
      }),
      makeEvent({
        id: "b",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1 }),
      }),
      makeEvent({
        id: "c",
        occurredAt: "2026-09-01T06:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1 }),
      }),
    ];

    const result = run(catalog, events);

    expect(result.constraints[0]).toMatchObject({
      consumedUnits: "1",
      attemptedUnits: "13",
      rejectedEvents: 2,
    });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 33.3333,
      covered: 1,
      total: 3,
    });
  });
});

describe("golden fixture: atomic admission across constraints", () => {
  it("does not consume a shared pool for an event another rule rejects", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "small-model-tokens",
          type: "token_limit",
          amount: "0",
          models: ["fixture-small"],
        }),
        rollingLimit({ id: "requests", type: "request_limit", amount: "1" }),
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T00:01:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ];

    const result = run(catalog, events);

    const [tokens, requests] = result.constraints;
    // The small-model rule rejects the first event, which therefore consumes
    // nothing from the global request pool, so the medium event is served.
    expect(tokens).toMatchObject({
      id: "small-model-tokens",
      rejectedEvents: 1,
      consumedUnits: "0",
    });
    expect(requests).toMatchObject({ id: "requests", rejectedEvents: 0, consumedUnits: "1" });
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 50,
      covered: 1,
      total: 2,
    });
  });
});

describe("golden fixture: explicit zero versus missing data", () => {
  const catalog = makeFixtureCatalog({
    limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
  });

  it("treats a complete report of zero tokens as known zero", () => {
    const result = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: completeUsage() }),
    ]);
    expect(result.constraints[0]?.status).toBe("pass");
    expect(result.coverage.usage).toEqual({ status: "known", percent: 100, covered: 0, total: 0 });
    expect(result.warnings.map((warning) => warning.code)).not.toContain("EVENT_NO_TOKEN_DATA");
  });

  it("treats an incomplete report as unknown rather than zero", () => {
    const result = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: { inputTokens: 0 } }),
    ]);
    expect(result.constraints[0]?.status).toBe("unknown");
    expect(result.coverage.usage.status).toBe("unknown");
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "EVENT_TOKEN_ACCOUNTING_UNKNOWN",
    );
  });
});

describe("golden fixture: empty workload versus unknown denominator", () => {
  const catalog = makeFixtureCatalog({
    limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
  });

  it("keeps the documented 100 percent convention for a genuinely empty workload", () => {
    const result = run(catalog, []);
    expect(result.violations).toEqual([]);
    expect(result.coverage.requests).toEqual({
      status: "known",
      percent: 100,
      covered: 0,
      total: 0,
    });
    expect(result.coverage.usage).toEqual({ status: "known", percent: 100, covered: 0, total: 0 });
    expect(result.constraints[0]?.status).toBe("not_applicable");
    expect(result.feasibility).toEqual({
      status: "full",
      coveragePercent: 100,
      coverageDimension: "requests",
    });
    expect(result.workload).toEqual({ eventCount: 0, modelCount: 0, tokenTotals: {} });
  });

  it("never reports 100 percent for an unknown denominator", () => {
    const result = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: {} }),
    ]);
    expect(result.coverage.usage.percent).toBeUndefined();
    expect(result.coverage.usage.status).toBe("unknown");
    expect(result.feasibility.coveragePercent).toBeUndefined();
  });
});

describe("limit crossing instant", () => {
  it("records when attempted demand first passed included capacity, per window", () => {
    const catalog = makeFixtureCatalog({
      limits: [calendarLimit({ id: "monthly-tokens", type: "token_limit", amount: "10000000" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-08-05T10:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 9_000_000 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-08-20T10:00:00.250Z",
        usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-08-25T10:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      }),
      makeEvent({
        id: "e4",
        occurredAt: "2026-09-03T10:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ];
    const result = run(catalog, events);
    expect(result.violations.map((violation) => violation.exceededAt)).toEqual([
      "2026-08-20T10:00:00.250Z",
    ]);
    // A window that never crossed carries no violation and no instant.
    expect(result.violations).toHaveLength(1);
  });
});
