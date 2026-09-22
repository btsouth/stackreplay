import type { PricingRateSetV1, PricingV1 } from "@stackreplay/catalog";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  calendarLimit,
  FIXTURE_PLAN_VERSION_ID,
  FIXTURE_RULES_AS_OF,
  fixturePricing,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";
import { epochMsFromIso } from "./time.js";
import { moneyUnitsForUsage, selectRateSet } from "./units.js";

/**
 * M4A pricing remediation: undocumented pricing categories are unknown, never
 * guessed. A nonzero bucket the selected pricing rule does not establish makes
 * the event's monetary consumption unknown (decision 35); explicit zero usage in
 * an unpriced category is known data; documented category equivalences are
 * modeled as sourced catalog data; conditional tiers select rates from
 * properties the replay actually knows (request input-side token count, event
 * instant); and published decimals like 0.075 stay exact.
 */

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

function run(
  catalog: ReturnType<typeof makeFixtureCatalog>,
  events: ReturnType<typeof makeEvent>[],
) {
  return replay({ events, target, catalog, context: { rulesAsOf: FIXTURE_RULES_AS_OF } });
}

const SOURCE = [
  { url: "https://example.invalid/pricing", title: "Fixture", checkedAt: "2026-01-01" },
] as const;

function pricingEntry(
  id: string,
  rates: PricingRateSetV1,
  extra: { basis?: PricingV1["basis"]; tiers?: PricingV1["tiers"] } = {},
): Record<string, PricingV1> {
  return {
    [id]: {
      id,
      role: "pricing",
      modelId: "fixture-small",
      currency: "USD",
      unit: "per_1m_tokens",
      basis: extra.basis ?? "api_list_price",
      rates,
      ...(extra.tiers !== undefined ? { tiers: extra.tiers } : {}),
      effectiveFrom: "2026-01-01",
      sources: [...SOURCE],
      lastVerifiedAt: "2026-01-01",
      verificationStatus: "estimated",
    },
  };
}

describe("pricing remediation: undocumented categories are unknown", () => {
  it("1. a missing nonzero cache price makes the event's monetary consumption unknown", () => {
    const outcome = moneyUnitsForUsage(
      completeUsage({ cacheReadTokens: 1_000_000 }),
      pricingEntry("p", { input: "2.00", output: "4.00" })["p"],
      { atMs: epochMsFromIso("2026-09-01T00:00:00Z") },
    );
    expect(outcome.known).toBe(false);
    expect(outcome.units.toString()).toBe("0");
    expect(outcome.unpricedCategories).toEqual(["cacheRead"]);
    expect(outcome.missingCategories).toEqual([]);
    expect(outcome.missingPricing).toBe(false);

    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "credits",
          type: "credit_pool",
          amount: "100.00",
          exceed: "allow_overage",
        }),
      ],
    });
    // fixture-medium-pricing publishes input and output only, so its nonzero
    // cache read cannot yield known economics. The pool admits nothing it
    // cannot measure and no fallback rate is substituted.
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ cacheReadTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ]);
    expect(result.constraints[0]).toMatchObject({
      status: "unknown",
      indeterminateEvents: 1,
      consumedUnits: "0",
    });
    expect(result.economics).toBeUndefined();
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "PRICING_CATEGORY_UNDOCUMENTED",
    );
  });

  it("2. a missing nonzero reasoning price makes the event's monetary consumption unknown", () => {
    const outcome = moneyUnitsForUsage(
      completeUsage({ reasoningTokens: 1_000_000 }),
      pricingEntry("p", { input: "2.00", output: "4.00" })["p"],
      { atMs: epochMsFromIso("2026-09-01T00:00:00Z") },
    );
    expect(outcome.known).toBe(false);
    // The output rate is never substituted for undocumented reasoning pricing.
    expect(outcome.units.toString()).toBe("0");
    expect(outcome.unpricedCategories).toEqual(["reasoning"]);

    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "credits",
          type: "credit_pool",
          amount: "100.00",
          exceed: "allow_overage",
        }),
      ],
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ reasoningTokens: 1_000_000 }),
        model: { rawName: "fixture-medium", canonicalId: "fixture-medium" },
      }),
    ]);
    expect(result.economics).toBeUndefined();
    expect(result.constraints[0]?.indeterminateEvents).toBe(1);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "PRICING_CATEGORY_UNDOCUMENTED",
    );
  });

  it("keeps missing telemetry and missing pricing distinguishable", () => {
    const pricing = pricingEntry("p", { input: "2.00", output: "4.00" })["p"];
    const atMs = epochMsFromIso("2026-09-01T00:00:00Z");

    const telemetryGap = moneyUnitsForUsage({ inputTokens: 10 }, pricing, { atMs });
    expect(telemetryGap.known).toBe(false);
    expect(telemetryGap.missingCategories).toContain("outputTokens");
    expect(telemetryGap.unpricedCategories).toEqual([]);
    expect(telemetryGap.missingPricing).toBe(false);

    const pricingGap = moneyUnitsForUsage(completeUsage({ uncachedInputTokens: 10 }), undefined, {
      atMs,
    });
    expect(pricingGap.known).toBe(false);
    expect(pricingGap.missingPricing).toBe(true);
    expect(pricingGap.unpricedCategories).toEqual([]);
    expect(pricingGap.missingCategories).toEqual([]);
  });

  it("3. an explicit sourced category equivalence prices the category at the named rate", () => {
    // The shape a provider's documented "thinking tokens are billed as output"
    // statement takes: a relationship in catalog data, never an engine default.
    const pricing = pricingEntry("p", {
      input: "2.00",
      output: "4.00",
      reasoning: { billedAs: "output" },
    })["p"];
    const outcome = moneyUnitsForUsage(
      completeUsage({ uncachedInputTokens: 500_000, reasoningTokens: 500_000 }),
      pricing,
      { atMs: epochMsFromIso("2026-09-01T00:00:00Z") },
    );
    expect(outcome.known).toBe(true);
    // 500k input at $2/1M plus 500k reasoning at the documented output rate.
    expect(outcome.units.toString()).toBe("3");
  });

  it("4. explicit zero usage in an unpriced category does not poison pricing", () => {
    const pricing = pricingEntry("p", { input: "2.00", output: "4.00" })["p"];
    const outcome = moneyUnitsForUsage(
      completeUsage({
        uncachedInputTokens: 1_000_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
      }),
      pricing,
      { atMs: epochMsFromIso("2026-09-01T00:00:00Z") },
    );
    expect(outcome.known).toBe(true);
    expect(outcome.units.toString()).toBe("2");
    expect(outcome.unpricedCategories).toEqual([]);
  });
});

describe("pricing remediation: conditional rate tiers", () => {
  const tiered = pricingEntry(
    "p",
    { input: "2.50", output: "15.00", cacheRead: "0.25", cacheWrite: "2.50" },
    {
      tiers: [
        {
          id: "long-context",
          label: "Above 272K input tokens",
          when: { inputTokensAbove: 272_000 },
          rates: { input: "5.00", output: "30.00", cacheRead: "0.50", cacheWrite: "5.00" },
        },
      ],
    },
  )["p"] as PricingV1;

  it("5. long-context boundaries select the base tier through the threshold and the tier above it", () => {
    const atMs = epochMsFromIso("2026-09-01T00:00:00Z");
    expect(selectRateSet(tiered, { atMs, inputTokens: 271_999 }).tierId).toBeUndefined();
    expect(selectRateSet(tiered, { atMs, inputTokens: 272_000 }).tierId).toBeUndefined();
    expect(selectRateSet(tiered, { atMs, inputTokens: 272_001 }).tierId).toBe("long-context");

    const below = moneyUnitsForUsage(completeUsage({ uncachedInputTokens: 272_000 }), tiered, {
      atMs,
    });
    const above = moneyUnitsForUsage(completeUsage({ uncachedInputTokens: 272_001 }), tiered, {
      atMs,
    });
    // 272,000 at $2.50/1M = $0.68; 272,001 at $5/1M = $1.360005.
    expect(below.units.toString()).toBe("0.68");
    expect(above.units.toString()).toBe("1.360005");
  });

  it("6. the request-size selector counts the whole input side of the request", () => {
    const atMs = epochMsFromIso("2026-09-01T00:00:00Z");
    // 222,001 uncached input plus 30,000 cache reads plus 20,000 cache writes
    // is 272,001 input-side tokens: above the threshold even though the
    // uncached input alone is far below it.
    const aboveThreshold = moneyUnitsForUsage(
      completeUsage({
        uncachedInputTokens: 222_001,
        cacheReadTokens: 30_000,
        cacheWriteTokens: 20_000,
      }),
      tiered,
      { atMs },
    );
    expect(aboveThreshold.known).toBe(true);
    expect(aboveThreshold.tierId).toBe("long-context");

    const atThreshold = moneyUnitsForUsage(
      completeUsage({
        uncachedInputTokens: 222_000,
        cacheReadTokens: 30_000,
        cacheWriteTokens: 20_000,
      }),
      tiered,
      { atMs },
    );
    expect(atThreshold.known).toBe(true);
    expect(atThreshold.tierId).toBeUndefined();
  });

  const scheduled = pricingEntry(
    "p",
    { input: "0.15", output: "0.60", cacheRead: "0.003" },
    {
      tiers: [
        {
          id: "weekday-peak",
          label: "Peak: 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday",
          when: {
            utcWindows: [
              { days: ["mon", "tue", "wed", "thu", "fri"], start: "01:00", end: "04:00" },
              { days: ["mon", "tue", "wed", "thu", "fri"], start: "06:00", end: "10:00" },
            ],
          },
          rates: { input: "0.30", output: "1.20", cacheRead: "0.006" },
        },
      ],
    },
  )["p"] as PricingV1;

  it("7. schedule boundaries select the documented rate at every edge", () => {
    const cases: Array<[string, boolean]> = [
      // Monday 2026-09-21, UTC wall clock.
      ["2026-09-21T00:59:59.999Z", false], // before the first peak window
      ["2026-09-21T01:00:00.000Z", true], // at peak start
      ["2026-09-21T03:59:59.999Z", true], // at the end of the first window
      ["2026-09-21T04:00:00.000Z", false], // at peak end: windows are half-open
      ["2026-09-21T05:00:00.000Z", false], // between the two peak windows
      ["2026-09-21T06:00:00.000Z", true], // at the second peak start
      ["2026-09-21T09:59:59.999Z", true], // before the second peak end
      ["2026-09-21T10:00:00.000Z", false], // at the second peak end
      ["2026-09-22T01:30:00.000Z", true], // Tuesday inside the window
      ["2026-09-26T02:00:00.000Z", false], // Saturday: weekend is off-peak
      ["2026-09-27T07:00:00.000Z", false], // Sunday: weekend is off-peak
    ];
    for (const [instant, peak] of cases) {
      const selection = selectRateSet(scheduled, {
        atMs: epochMsFromIso(instant),
        inputTokens: 1_000,
      });
      expect(selection.tierId, instant).toBe(peak ? "weekday-peak" : undefined);
    }
  });

  it("keeps the schedule in UTC rather than a local wall clock", () => {
    // Monday 01:30 UTC is still Sunday 21:30 in New York; the documented
    // windows are UTC, so this must take the peak rates.
    const selection = selectRateSet(scheduled, {
      atMs: epochMsFromIso("2026-09-21T01:30:00Z"),
      inputTokens: 1_000,
    });
    expect(selection.tierId).toBe("weekday-peak");
  });

  it("8. an engine replay consumes credits at the scheduled rates", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
      pricing: {
        ...fixturePricing,
        "fixture-small-pricing": pricingEntry(
          "fixture-small-pricing",
          { input: "0.15", output: "0.60", cacheRead: "0.003" },
          {
            tiers: [
              {
                id: "weekday-peak",
                label: "Peak: 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday",
                when: {
                  utcWindows: [
                    { days: ["mon", "tue", "wed", "thu", "fri"], start: "01:00", end: "04:00" },
                    { days: ["mon", "tue", "wed", "thu", "fri"], start: "06:00", end: "10:00" },
                  ],
                },
                rates: { input: "0.30", output: "1.20", cacheRead: "0.006" },
              },
            ],
          },
        )["fixture-small-pricing"] as PricingV1,
      },
    });
    const result = run(catalog, [
      makeEvent({
        id: "peak",
        occurredAt: "2026-09-21T01:30:00Z",
        usage: completeUsage({ cacheReadTokens: 1_000_000 }),
      }),
      makeEvent({
        id: "off-peak",
        occurredAt: "2026-09-21T05:00:00Z",
        usage: completeUsage({ cacheReadTokens: 1_000_000 }),
      }),
    ]);
    // 1M cache reads at $0.006/1M peak plus 1M at $0.003/1M off-peak.
    expect(result.constraints[0]?.consumedUnits).toBe("0.009");
  });
});

describe("pricing remediation: target-specific billing rates", () => {
  it("9. target billing rates drive credit-pool consumption, not API list prices", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: "100.00" })],
      modelRules: [{ model: "fixture-small", pricingRef: "target-billing" }],
      pricing: {
        // The same model can carry an API list price and the rates an execution
        // target publishes for its own consumption; the plan rule names the one
        // that computes the pool.
        ...pricingEntry(
          "api-list",
          { input: "2.50", output: "15.00" },
          { basis: "api_list_price" },
        ),
        ...pricingEntry(
          "target-billing",
          { input: "0.02", output: "0.08" },
          { basis: "target_billing_rate" },
        ),
      },
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ uncachedInputTokens: 1_000_000 }),
      }),
    ]);
    // 1M input at the target's published $0.02/1M, not the $2.50 API list price.
    expect(result.constraints[0]?.consumedUnits).toBe("0.02");
    expect(result.versions.pricingReferences).toEqual(["target-billing"]);
  });
});

describe("pricing remediation: decimal exactness", () => {
  it("10. a published 0.075 rate stays exact end to end", () => {
    const pricing = pricingEntry("p", {
      input: "2.00",
      output: "4.00",
      cacheRead: "0.075",
    })["p"];
    const atMs = epochMsFromIso("2026-09-01T00:00:00Z");
    const one = moneyUnitsForUsage(completeUsage({ cacheReadTokens: 1_000_000 }), pricing, {
      atMs,
    });
    expect(one.units.toString()).toBe("0.075");
    const two = moneyUnitsForUsage(completeUsage({ cacheReadTokens: 2_000_000 }), pricing, {
      atMs,
    });
    expect(two.units.toString()).toBe("0.15");

    const catalog = makeFixtureCatalog({
      limits: [calendarLimit({ id: "credits", type: "credit_pool", amount: "1.00" })],
      pricing: {
        ...fixturePricing,
        "fixture-small-pricing": pricingEntry("fixture-small-pricing", {
          input: "2.00",
          output: "4.00",
          cacheRead: "0.075",
        })["fixture-small-pricing"] as PricingV1,
      },
    });
    const result = run(catalog, [
      makeEvent({
        id: "e1",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: completeUsage({ cacheReadTokens: 1_000_000 }),
      }),
    ]);
    expect(result.constraints[0]?.consumedUnits).toBe("0.075");
  });
});
