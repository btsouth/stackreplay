import type { PricingV1 } from "@stackreplay/catalog";
import {
  economicsV1Schema,
  executionReplayResultV1Schema,
  moneyV1Schema,
  signedMoneyV1Schema,
} from "@stackreplay/schema";
import { Decimal as ExternalDecimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  calendarLimit,
  FIXTURE_PLAN_VERSION_ID,
  FIXTURE_RULES_AS_OF,
  fixtureContext,
  fixturePricing,
  makeFixtureCatalog,
  overageRate,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * Adversarial regression suite for the independent M1 audit remediation
 * (decisions 13-20). Each test is numbered to match the required coverage
 * list; items 18-20 are schema contracts and live in the schema package tests,
 * and items 23-24 are covered by the existing time, property and golden
 * suites, which must stay green.
 */

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

function run(
  catalog: ReturnType<typeof makeFixtureCatalog>,
  events: ReturnType<typeof makeEvent>[],
  rulesAsOf: string = FIXTURE_RULES_AS_OF,
) {
  return replay({ events, target, catalog, context: { rulesAsOf } });
}

/** Fixture pricing with a custom input rate, keeping every other entry intact. */
function smallPricingWith(rates: { input: string; output: string }): Record<string, PricingV1> {
  const base = fixturePricing["fixture-small-pricing"];
  if (base === undefined) throw new Error("fixture pricing entry missing");
  return { ...fixturePricing, "fixture-small-pricing": { ...base, rates } };
}

/** Exact expected value of tokens x rate/1e6 x multiplier, computed with BigInt. */
function exactUnits(tokens: number, rate: string, multiplier = "1"): string {
  const [rateInteger, rateFraction = ""] = rate.split(".");
  const [multiplierInteger, multiplierFraction = ""] = multiplier.split(".");
  const numerator =
    BigInt(tokens) *
    BigInt(rateInteger + rateFraction) *
    BigInt(multiplierInteger + multiplierFraction);
  const denominator = 10n ** BigInt(rateFraction.length + multiplierFraction.length + 6);
  const scaled = (numerator * 10n ** 80n) / denominator;
  const digits = scaled.toString().padStart(81, "0");
  const whole = digits.slice(0, digits.length - 80);
  const fraction = digits.slice(digits.length - 80).replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

describe("remediation: admission and exceed behavior", () => {
  it("1. reject_request serves a later request that fits a 10-token cap (11 then 1)", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
    });
    const result = run(catalog, [
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
    ]);
    expect(result.constraints[0]?.consumedUnits).toBe("1");
    expect(result.coverage.requests).toMatchObject({ covered: 1, total: 2 });
  });

  it("2. latch_until_reset blocks every later request until the window resets", () => {
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
        occurredAt: "2026-09-01T02:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1 }),
      }),
      makeEvent({
        id: "d",
        occurredAt: "2026-09-01T07:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1 }),
      }),
    ];
    const result = run(catalog, events);
    expect(result.constraints[0]?.rejectedEvents).toBe(3);
    expect(result.constraints[0]?.consumedUnits).toBe("1");
    // Only the event after the reset is served.
    expect(result.coverage.requests).toMatchObject({ covered: 1, total: 4 });
  });

  it("3. a rejected event consumes nothing from any other constraint", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "small-tokens",
          type: "token_limit",
          amount: "0",
          models: ["fixture-small"],
        }),
        rollingLimit({ id: "requests", type: "request_limit", amount: "1" }),
        rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" }),
      ],
    });
    const result = run(catalog, [
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
    ]);
    const [tokens, requests, credits] = result.constraints;
    expect(tokens?.rejectedEvents).toBe(1);
    // The rejected event advanced no pool: the request pool served only e2, and
    // the credit pool consumed only e2's cost.
    expect(requests?.consumedUnits).toBe("1");
    expect(credits?.consumedUnits).toBe("0.002");
  });

  it("4. attempted demand is reported separately from accepted consumption", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "5.00" })],
    });
    const result = run(catalog, [
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
    ]);
    expect(result.constraints[0]).toMatchObject({
      consumedUnits: "4",
      attemptedUnits: "12",
      rejectedEvents: 2,
      eligibleEvents: 3,
    });
    expect(result.violations[0]).toMatchObject({ requiredUnits: "12", acceptedUnits: "4" });
  });
});

describe("remediation: canonical token accounting", () => {
  it("5. cache categories included in input are not double counted", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10000000" })],
    });
    const overlapping = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: {
          inputTokens: 100,
          cacheReadTokens: 100,
          cacheWriteTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          accounting: {
            cacheReadIncludedInInput: true,
            cacheWriteIncludedInInput: false,
            reasoningIncludedInOutput: false,
          },
        },
      }),
    ]);
    // input 100 with 100 cache reads means 100 total tokens, not 200.
    expect(overlapping.constraints[0]?.consumedUnits).toBe("100");

    const disjoint = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: {
          inputTokens: 100,
          cacheReadTokens: 100,
          cacheWriteTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          accounting: {
            cacheReadIncludedInInput: false,
            cacheWriteIncludedInInput: false,
            reasoningIncludedInOutput: false,
          },
        },
      }),
    ]);
    expect(disjoint.constraints[0]?.consumedUnits).toBe("200");
  });

  it("6. reasoning tokens that are a subset of output are not double counted", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10000000" })],
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: {
          inputTokens: 0,
          outputTokens: 1000,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 400,
          accounting: {
            cacheReadIncludedInInput: false,
            cacheWriteIncludedInInput: false,
            reasoningIncludedInOutput: true,
          },
        },
      }),
    ]);
    expect(result.constraints[0]?.consumedUnits).toBe("1000");
  });

  it("7. usage={} under a token cap is UNKNOWN, never a false pass", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "1000000" })],
    });
    const result = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: {} }),
    ]);
    expect(result.constraints[0]?.status).toBe("unknown");
    expect(result.coverage.requests.status).toBe("unknown");
    expect(result.coverage.usage.status).toBe("unknown");
    expect(result.feasibility.status).toBe("unknown");
    expect(result.confidence.level).not.toBe("high");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("8. partial token categories degrade coverage and confidence honestly", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "1000000" })],
    });
    const complete = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 10 }),
      }),
    ]);
    const partial = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 10 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: { inputTokens: 10 },
      }),
    ]);
    expect(complete.coverage.usage.status).toBe("known");
    expect(partial.coverage.usage.status).toBe("unknown");
    expect(partial.coverage.requests.status).toBe("unknown");
    expect(
      partial.confidence.factors.find((factor) => factor.id === "token_accounting")?.level,
    ).toBe("low");
    expect(
      complete.confidence.factors.find((factor) => factor.id === "token_accounting")?.level,
    ).toBe("high");
  });

  it("9. an explicit zero is known data while a missing category is unknown", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
    });
    const zero = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: completeUsage() }),
    ]);
    expect(zero.constraints[0]?.status).toBe("pass");
    expect(zero.coverage.usage).toEqual({ status: "known", percent: 100, covered: 0, total: 0 });

    const missing = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: {} }),
    ]);
    expect(missing.constraints[0]?.status).toBe("unknown");
    expect(missing.coverage.usage.status).toBe("unknown");
  });

  it("rejects an impossible inclusion declaration (cache larger than its base)", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
    });
    expect(() =>
      run(catalog, [
        makeEvent({
          id: "e1",
          occurredAt: "2026-09-01T00:00:00Z",
          usage: {
            inputTokens: 10,
            cacheReadTokens: 50,
            outputTokens: 0,
            cacheWriteTokens: 0,
            reasoningTokens: 0,
            accounting: {
              cacheReadIncludedInInput: true,
              cacheWriteIncludedInInput: false,
              reasoningIncludedInOutput: false,
            },
          },
        }),
      ]),
    ).toThrow(/IMPORT_SCHEMA_INVALID/);
  });

  it("requires an accounting declaration when an overlapping category is present", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
    });
    expect(() =>
      run(catalog, [
        makeEvent({
          id: "e1",
          occurredAt: "2026-09-01T00:00:00Z",
          usage: { inputTokens: 10, cacheReadTokens: 10 },
        }),
      ]),
    ).toThrow(/IMPORT_SCHEMA_INVALID/);
  });
});

describe("remediation: current-rule snapshot", () => {
  it("10. a promotion active at rulesAsOf applies to events that predate it", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "50.00" })],
      promotions: [
        {
          id: "promo",
          label: "Promotion",
          multiplier: "0.5",
          effectiveFrom: "2026-09-15",
        },
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      }),
    ];
    // The event is before the promotion date, but the snapshot at rulesAsOf is
    // the current rule set, so the promotion applies.
    expect(run(catalog, events, "2026-09-20").constraints[0]?.consumedUnits).toBe("1");
  });

  it("11. a promotion inactive at rulesAsOf does not apply", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "50.00" })],
      promotions: [
        {
          id: "promo",
          label: "Promotion",
          multiplier: "0.5",
          effectiveFrom: "2026-09-15",
        },
      ],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-20T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 2_000_000 }),
      }),
    ];
    // The event is inside the promotion period, but the snapshot at rulesAsOf
    // is before it, so no promotion applies.
    expect(run(catalog, events, "2026-09-01").constraints[0]?.consumedUnits).toBe("2");
  });

  it("12. selects the plan version effective at rulesAsOf deterministically", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "20.00" })],
      effectiveTo: "2026-09-14",
    });
    const firstVersion = catalog.plans["fixture-plan"]?.versions[0];
    if (firstVersion === undefined) throw new Error("fixture plan missing");
    const { effectiveTo: _closed, ...openVersion } = firstVersion;
    const secondVersion = {
      ...openVersion,
      effectiveFrom: "2026-09-15",
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "40.00" })],
    };
    catalog.plans["fixture-plan"]?.versions.push(secondVersion);
    catalog.planVersions["fixture-plan@2026-09-15"] = {
      ...secondVersion,
      versionId: "fixture-plan@2026-09-15",
      planId: "fixture-plan",
      planName: "Fixture Plan",
      providerId: "fixture-provider",
    };

    const planTarget = { type: "subscription", planId: "fixture-plan" } as const;
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-08-20T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ];

    const before = replay({
      events,
      target: planTarget,
      catalog,
      context: { rulesAsOf: "2026-09-01" },
    });
    const after = replay({
      events,
      target: planTarget,
      catalog,
      context: { rulesAsOf: "2026-09-20" },
    });
    const again = replay({
      events,
      target: planTarget,
      catalog,
      context: { rulesAsOf: "2026-09-01" },
    });

    expect(before.versions.targetReference).toBe("fixture-plan@2026-08-01");
    expect(before.constraints[0]?.limitUnits).toBe("20");
    expect(after.versions.targetReference).toBe("fixture-plan@2026-09-15");
    expect(after.constraints[0]?.limitUnits).toBe("40");
    expect(JSON.stringify(again)).toBe(JSON.stringify(before));
  });

  it("13. never reads the system clock", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "20.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ];
    const original = Date.now;
    Date.now = () => {
      throw new Error("the engine must not read the system clock");
    };
    try {
      const result = run(catalog, events);
      expect(result.versions.rulesAsOf).toBe(FIXTURE_RULES_AS_OF);
    } finally {
      Date.now = original;
    }
  });

  it("requires an explicit rules context", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "20.00" })],
    });
    expect(() => replay({ events: [], target, catalog, context: undefined as never })).toThrow(
      /IMPORT_SCHEMA_INVALID/,
    );
  });

  it("requires exactly one of planVersionId or planId", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "20.00" })],
    });
    expect(() =>
      replay({
        events: [],
        target: { type: "subscription" },
        catalog,
        context: fixtureContext,
      }),
    ).toThrow(/IMPORT_SCHEMA_INVALID/);
    expect(() =>
      replay({
        events: [],
        target: {
          type: "subscription",
          planVersionId: FIXTURE_PLAN_VERSION_ID,
          planId: "fixture-plan",
        },
        catalog,
        context: fixtureContext,
      }),
    ).toThrow(/IMPORT_SCHEMA_INVALID/);
  });
});

describe("remediation: decimal envelope", () => {
  it("14. computes the maximum accepted precision exactly", () => {
    const rate = "1234567890.123456789012345678"; // 28 significant digits, 18 fractional
    const multiplier = "1.000000000000000001"; // 19 significant digits, 18 fractional
    const tokens = Number.MAX_SAFE_INTEGER; // 16 digits
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({ id: "credits", type: "credit_pool", amount: "99999999999999999999" }),
      ],
      modelRules: [{ model: "fixture-small", pricingRef: "fixture-small-pricing", multiplier }],
      pricing: smallPricingWith({ input: rate, output: "0" }),
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: tokens }),
      }),
    ]);
    expect(result.constraints[0]?.consumedUnits).toBe(exactUnits(tokens, rate, multiplier));
  });

  it("15. rejects one digit beyond the accepted precision", () => {
    const build = (rate: string) =>
      makeFixtureCatalog({
        limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100" })],
        pricing: smallPricingWith({ input: rate, output: "0" }),
      });

    // 19 fractional digits: one beyond the envelope.
    expect(() => run(build("1.0000000000000000001"), [])).toThrow(/CATALOG_INVALID/);
    // 29 significant digits: one beyond the envelope.
    expect(() => run(build("12345678901234567890123456789"), [])).toThrow(/CATALOG_INVALID/);
    // Exactly at the envelope: accepted.
    expect(() => run(build("1234567890123456789012345678"), [])).not.toThrow();
  });

  it("16. keeps tiny monetary differences distinguishable", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({ id: "credits", type: "credit_pool", amount: "0.000000000000000001" }),
      ],
      pricing: smallPricingWith({ input: "1.000000000000000001", output: "0" }),
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1 }),
      }),
    ]);
    const violation = result.violations[0];
    expect(violation?.requiredUnits).toBe("0.000001000000000000000001");
    expect(violation?.availableUnits).toBe("0.000000000000000001");
    expect(violation?.requiredUnits).not.toBe(violation?.availableUnits);
  });
});

describe("remediation: overage economics", () => {
  it("17. bills included capacity plus exact excess units at the declared rate", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "requests",
          type: "request_limit",
          amount: "2",
          exceed: "allow_overage",
          overageRate: overageRate("0.25", "per_request"),
        }),
      ],
    });
    const events = [0, 1, 2, 3, 4].map((index) =>
      makeEvent({
        id: `e${index}`,
        occurredAt: `2026-09-01T0${index}:00:00Z`,
        usage: completeUsage({ uncachedInputTokens: 10 }),
      }),
    );
    const result = run(catalog, events);
    expect(result.constraints[0]).toMatchObject({
      consumedUnits: "5",
      overageUnits: "3",
      overageCost: { amount: "0.75", currency: "USD" },
      rejectedEvents: 0,
    });
    expect(result.economics).toMatchObject({
      basePlanCost: { amount: "20.00", currency: "USD" },
      overageCost: { amount: "0.75", currency: "USD" },
      targetCost: { amount: "20.75", currency: "USD" },
      costBasis: "fixed_plan_price_plus_overage",
    });
    // Overage affects economics: the target cost is not just the sticker price.
    expect(result.economics?.targetCost.amount).not.toBe(result.economics?.basePlanCost?.amount);
  });

  it("21. distinguishes an unknown denominator from a genuinely empty workload", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: "10" })],
    });
    const empty = run(catalog, []);
    expect(empty.coverage.requests).toEqual({
      status: "known",
      percent: 100,
      covered: 0,
      total: 0,
    });
    expect(empty.coverage.usage).toEqual({ status: "known", percent: 100, covered: 0, total: 0 });

    const unknown = run(catalog, [
      makeEvent({ id: "e1", occurredAt: "2026-09-01T00:00:00Z", usage: {} }),
    ]);
    expect(unknown.coverage.requests.status).toBe("unknown");
    expect(unknown.coverage.requests.percent).toBeUndefined();
    expect(unknown.coverage.usage.status).toBe("unknown");
    expect(unknown.coverage.usage.percent).toBeUndefined();
  });

  it("22. confidence cannot improve when input quality degrades", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const exact = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 10 }),
      }),
    ]);
    const estimated = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 10 }),
      }),
      makeEvent({
        id: "e2",
        occurredAt: "2026-09-01T01:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 10 }),
        confidence: { usage: "estimated", model: "exact" },
      }),
    ]);
    const unknown = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 10 }),
      }),
      makeEvent({ id: "e2", occurredAt: "2026-09-01T01:00:00Z", usage: {} }),
    ]);

    const order = { high: 2, medium: 1, low: 0 } as const;
    expect(order[estimated.confidence.level]).toBeLessThanOrEqual(order[exact.confidence.level]);
    expect(order[unknown.confidence.level]).toBeLessThanOrEqual(order[estimated.confidence.level]);
    expect(unknown.confidence.level).toBe("low");
  });
});

describe("remediation: result contract", () => {
  it("produces a result that satisfies the v1 schema, including signed money shapes", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "credits",
          type: "credit_pool",
          amount: "1.00",
          exceed: "allow_overage",
        }),
      ],
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ]);
    const parsed = executionReplayResultV1Schema.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result.versions).toMatchObject({
      schema: 1,
      methodology: expect.any(String),
      rulesAsOf: FIXTURE_RULES_AS_OF,
      targetType: "subscription",
      targetReference: FIXTURE_PLAN_VERSION_ID,
    });
    expect(result.versions.pricingReferences).toEqual([
      "fixture-medium-pricing",
      "fixture-small-pricing",
    ]);
  });

  it("keeps version metadata generalized (no subscription-only requirement)", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const result = run(catalog, []);
    const { subscription: _subscription, ...generalized } = result;
    expect(executionReplayResultV1Schema.safeParse(generalized).success).toBe(true);
    expect(generalized.versions.targetType).toBe("subscription");
    expect(generalized.versions.targetReference).toBe(FIXTURE_PLAN_VERSION_ID);
  });

  it("represents a negative cost difference with the signed money shape only", () => {
    expect(signedMoneyV1Schema.safeParse({ amount: "-1.50", currency: "USD" }).success).toBe(true);
    expect(moneyV1Schema.safeParse({ amount: "-1.50", currency: "USD" }).success).toBe(false);
    expect(
      economicsV1Schema.safeParse({
        basePlanCost: { amount: "18.50", currency: "USD" },
        targetCost: { amount: "18.50", currency: "USD" },
        costBasis: "fixed_plan_price",
        baselineCost: { amount: "20.00", currency: "USD" },
        costDifference: { amount: "-1.50", currency: "USD" },
      }).success,
    ).toBe(true);
  });

  it("rejects an overage cost without overage units or a matching basis", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const result = run(catalog, []);
    expect(
      economicsV1Schema.safeParse({
        ...result.economics,
        overageCost: { amount: "1.00", currency: "USD" },
      }).success,
    ).toBe(false);
  });

  it("keeps decimal arithmetic isolated from another decimal.js consumer", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const events = [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_234_567 }),
      }),
    ];
    const before = run(catalog, events);
    const precision = ExternalDecimal.precision;
    try {
      ExternalDecimal.set({ precision: 2 });
      expect(JSON.stringify(run(catalog, events))).toBe(JSON.stringify(before));
    } finally {
      ExternalDecimal.set({ precision });
    }
  });
});

describe("remediation: catalog exceed behavior is explicit", () => {
  it("requires an explicit exceed behavior on every limit", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
    });
    const withoutExceed = { ...catalog.plans["fixture-plan"]?.versions[0] };
    if (withoutExceed === undefined) throw new Error("fixture plan missing");
    const broken = JSON.parse(JSON.stringify(catalog)) as typeof catalog;
    const limit = broken.plans["fixture-plan"]?.versions[0]?.limits[0] as Record<string, unknown>;
    delete limit.exceed;
    expect(() => replay({ events: [], target, catalog: broken, context: fixtureContext })).toThrow(
      /CATALOG_INVALID/,
    );
  });

  it("rejects an allow_overage token limit without an explicit overage rate", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        calendarLimit({
          id: "tokens",
          type: "token_limit",
          amount: "1000",
          exceed: "allow_overage",
        }),
      ],
    });
    expect(() => replay({ events: [], target, catalog, context: fixtureContext })).toThrow(
      /CATALOG_INVALID/,
    );
  });
});
