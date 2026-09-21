import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  calendarLimit,
  FIXTURE_PLAN_VERSION_ID,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { makeEvent } from "./fixtures/events.js";

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

/** Input tokens in millions: million(6) is 6,000,000 input tokens. */
function million(tokens: number): { inputTokens: number } {
  return { inputTokens: tokens * 1_000_000 };
}

describe("golden fixture: rolling 5-hour window", () => {
  it("records one violation in the first window and none in the next", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "rolling-credits", type: "credit_pool", amount: "20.00" })],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(6) }),
      makeEvent({ id: "e2", occurredAt: "2026-09-01T01:00:00Z", usage: million(8) }),
      makeEvent({ id: "e3", occurredAt: "2026-09-01T02:00:00Z", usage: million(7) }),
      makeEvent({ id: "e4", occurredAt: "2026-09-01T03:00:00Z", usage: million(1) }),
      makeEvent({ id: "e5", occurredAt: "2026-09-01T06:00:00Z", usage: million(2) }),
    ];

    const result = replay({ events, target, catalog });

    expect(result.violations).toEqual([
      {
        type: "rolling_window_exceeded",
        constraintId: "rolling-credits",
        unit: "currency",
        startedAt: "2026-09-01T00:00:00Z",
        endedAt: "2026-09-01T05:00:00Z",
        affectedEvents: 2,
        requiredUnits: "22",
        availableUnits: "20",
      },
    ]);
    expect(result.constraints[0]?.status).toBe("exceeded");
    expect(result.constraints[0]?.consumedUnits).toBe("24");
    expect(result.coverage.requests).toEqual({ percent: 60, covered: 3, total: 5 });
    expect(result.coverage.usage).toEqual({ percent: 66.6667, covered: 16000000, total: 24000000 });
    expect(result.coverage.models).toEqual({ percent: 100, covered: 1, total: 1 });
    expect(result.feasibility.status).toBe("partial");
  });
});

describe("golden fixture: rolling weekly window", () => {
  it("spans seven days from first use", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "weekly-credits",
          type: "credit_pool",
          amount: "10.00",
          window: { type: "rolling", duration: "P7D", anchor: "first_use" },
        }),
      ],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(3) }),
      makeEvent({ id: "e2", occurredAt: "2026-09-02T00:00:00Z", usage: million(3) }),
      makeEvent({ id: "e3", occurredAt: "2026-09-03T00:00:00Z", usage: million(5) }),
      makeEvent({ id: "e4", occurredAt: "2026-09-03T01:00:00Z", usage: million(1) }),
      makeEvent({ id: "e5", occurredAt: "2026-09-08T00:00:00Z", usage: million(2) }),
    ];

    const result = replay({ events, target, catalog });

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({
      startedAt: "2026-09-01T00:00:00Z",
      endedAt: "2026-09-08T00:00:00Z",
      affectedEvents: 2,
      requiredUnits: "12",
      availableUnits: "10",
    });
    expect(result.coverage.requests).toEqual({ percent: 60, covered: 3, total: 5 });
  });
});

describe("golden fixture: calendar month", () => {
  it("splits windows at UTC month boundaries", () => {
    const catalog = makeFixtureCatalog({
      limits: [calendarLimit({ id: "monthly-tokens", type: "token_limit", amount: "10000000" })],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-08-31T23:00:00Z", usage: million(6) }),
      makeEvent({ id: "e2", occurredAt: "2026-09-01T00:00:00Z", usage: million(6) }),
      makeEvent({ id: "e3", occurredAt: "2026-09-02T00:00:00Z", usage: million(6) }),
    ];

    const result = replay({ events, target, catalog });

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
      },
    ]);
    expect(result.constraints[0]?.consumedUnits).toBe("18000000");
    expect(result.coverage.requests).toEqual({ percent: 66.6667, covered: 2, total: 3 });
    expect(result.assumptions.map((assumption) => assumption.id)).toContain(
      "MONTHLY_WINDOW_CALENDAR_MONTH",
    );
  });
});

describe("golden fixture: model promotion", () => {
  it("halves consumption inside the promotion window only", () => {
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
        usage: million(2),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-10-05T00:00:00Z",
        usage: million(2),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ];

    const result = replay({ events, target, catalog });

    // $4.00 halved inside the promotion plus $4.00 at full price.
    expect(result.constraints[0]?.consumedUnits).toBe("6");
    expect(result.violations).toHaveLength(0);
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
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(1) }),
      makeEvent({ id: "e2", occurredAt: "2026-09-01T01:00:00Z", usage: million(1) }),
      makeEvent({ id: "e3", occurredAt: "2026-09-01T02:00:00Z", usage: million(1) }),
      makeEvent({
        id: "e4",
        occurredAt: "2026-09-01T03:00:00Z",
        usage: million(1),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e5",
        occurredAt: "2026-09-01T04:00:00Z",
        usage: million(1),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ];

    const result = replay({ events, target, catalog });

    expect(result.unsupportedModels).toEqual([
      {
        rawName: "fixture-medium",
        canonicalId: "fixture-medium",
        eventCount: 2,
        reason: "excluded",
      },
    ]);
    expect(result.coverage.models).toEqual({ percent: 50, covered: 1, total: 2 });
    expect(result.coverage.requests).toEqual({ percent: 60, covered: 3, total: 5 });
    expect(result.constraints[0]?.consumedUnits).toBe("3");
  });
});

describe("golden fixture: hard credit cap", () => {
  it("blocks the crossing event and everything after it", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "cap", type: "credit_pool", amount: "5.00" })],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(4) }),
      makeEvent({ id: "e2", occurredAt: "2026-09-01T01:00:00Z", usage: million(4) }),
      makeEvent({ id: "e3", occurredAt: "2026-09-01T02:00:00Z", usage: million(4) }),
    ];

    const result = replay({ events, target, catalog });

    expect(result.violations[0]).toMatchObject({
      affectedEvents: 2,
      requiredUnits: "12",
      availableUnits: "5",
    });
    expect(result.coverage.requests).toEqual({ percent: 33.3333, covered: 1, total: 3 });
    expect(result.feasibility).toEqual({ status: "partial", coveragePercent: 33.3333 });
  });
});

describe("golden fixture: overage plan", () => {
  it("reports the constraint as UNKNOWN instead of guessing overage costs", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "overage-credits",
          type: "credit_pool",
          amount: "1.00",
          enforcement: "overage",
        }),
      ],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(1) }),
      makeEvent({ id: "e2", occurredAt: "2026-09-01T01:00:00Z", usage: million(1) }),
      makeEvent({ id: "e3", occurredAt: "2026-09-01T02:00:00Z", usage: million(1) }),
    ];

    const result = replay({ events, target, catalog });

    expect(result.violations).toHaveLength(0);
    expect(result.constraints[0]?.status).toBe("unknown");
    expect(result.constraints[0]?.consumedUnits).toBe("3");
    expect(result.warnings.map((warning) => warning.code)).toContain("CONSTRAINT_TYPE_UNSUPPORTED");
    expect(result.coverage.requests).toEqual({ percent: 100, covered: 3, total: 3 });
    expect(result.feasibility.status).toBe("unknown");
    expect(result.confidence.factors.map((factor) => factor.id)).toContain("constraint_modeling");
  });
});

describe("golden fixture: mixed models", () => {
  it("converts each model with its own pricing and passes the result schema", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "50.00" })],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(1) }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: million(1),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: { outputTokens: 500_000 },
        model: { rawName: "Fixture Small", canonicalId: "fixture-small" },
      }),
    ];

    const result = replay({ events, target, catalog });

    // $1.00 + $2.00 + $1.00 (500k output at $2/1M).
    expect(result.constraints[0]?.consumedUnits).toBe("4");
    expect(result.coverage.models).toEqual({ percent: 100, covered: 2, total: 2 });
    expect(result.workload.tokenTotals).toEqual({ inputTokens: 2000000, outputTokens: 500000 });
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
      makeEvent({ id: "e1", occurredAt: "2026-09-02T02:00:00Z" }),
      makeEvent({ id: "e2", occurredAt: "2026-09-02T03:00:00Z" }),
      makeEvent({ id: "e3", occurredAt: "2026-09-02T04:00:00Z" }),
      makeEvent({ id: "e4", occurredAt: "2026-09-02T05:00:00Z" }),
      makeEvent({ id: "e5", occurredAt: "2026-09-02T06:00:00Z" }),
    ];

    const result = replay({ events, target, catalog });

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
      },
    ]);
    expect(result.constraints[0]?.consumedUnits).toBe("5");
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
      makeEvent({ id: "e1", occurredAt: "2027-03-14T06:00:00Z" }),
      makeEvent({ id: "e2", occurredAt: "2027-03-14T08:00:00Z" }),
      makeEvent({ id: "e3", occurredAt: "2027-03-14T12:00:00Z" }),
      makeEvent({ id: "e4", occurredAt: "2027-03-15T04:00:00Z" }),
    ];

    const result = replay({ events, target, catalog });

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
      },
    ]);
  });
});

describe("golden fixture: unsupported model", () => {
  it("distinguishes models the plan does not include from unresolvable models", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
      modelRules: [{ model: "fixture-small", pricingRef: "fixture-small-pricing" }],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(1) }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: million(1),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: million(1),
        model: { rawName: "mystery-model" },
      }),
    ];

    const result = replay({ events, target, catalog });

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
    expect(result.coverage.models).toEqual({ percent: 33.3333, covered: 1, total: 3 });
    expect(result.coverage.requests).toEqual({ percent: 33.3333, covered: 1, total: 3 });
  });
});

describe("golden fixture: missing token counts", () => {
  it("keeps missing data visible instead of inventing tokens", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const events = [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: million(1) }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: {},
        confidence: { usage: "estimated", model: "exact" },
      }),
      makeEvent({ id: "e3", occurredAt: "2026-09-01T02:00:00Z", usage: million(1) }),
    ];

    const result = replay({ events, target, catalog });

    const missing = result.warnings.find((warning) => warning.code === "EVENT_MISSING_TOKEN_DATA");
    expect(missing?.eventCount).toBe(1);
    expect(result.constraints[0]?.consumedUnits).toBe("2");
    expect(result.confidence.level).toBe("low");
    expect(result.confidence.factors.find((factor) => factor.id === "source_data")?.level).toBe(
      "low",
    );
    expect(result.coverage.requests).toEqual({ percent: 100, covered: 3, total: 3 });
  });
});

describe("golden fixture: cache pricing", () => {
  it("prices cache reads at the cache rate and falls back explicitly", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: { cacheReadTokens: 1_000_000 },
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: { cacheReadTokens: 1_000_000 },
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
      makeEvent({
        id: "e3",
        occurredAt: "2026-09-01T02:00:00Z",
        usage: { reasoningTokens: 1_000_000 },
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ];

    const result = replay({ events, target, catalog });

    // $0.10 (cache rate) + $2.00 (cache at input rate, no cache rate) + $4.00 (reasoning at output rate).
    expect(result.constraints[0]?.consumedUnits).toBe("6.1");
    expect(result.confidence.level).toBe("low");
    expect(
      result.confidence.factors.find((factor) => factor.id === "pricing_fallback")?.level,
    ).toBe("low");
    expect(result.warnings.map((warning) => warning.code)).toContain("PRICING_RATE_FALLBACK");
    expect(result.assumptions.map((assumption) => assumption.id)).toContain(
      "REASONING_PRICED_AS_OUTPUT",
    );
  });
});
