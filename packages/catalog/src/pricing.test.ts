import { describe, expect, it } from "vitest";
import type { RawCatalogData } from "./validate.js";
import { validateCatalogData } from "./validate.js";

/**
 * Pricing semantics validation (M4A pricing remediation): a `billedAs`
 * relationship must name a different category with a published amount in the
 * same rate set, a tier is a complete alternative rate set, and tier conditions
 * can never overlap, so rate selection cannot depend on declaration order.
 */

const SOURCE = {
  url: "https://example.invalid/pricing",
  title: "Fixture",
  checkedAt: "2026-01-01",
};

function check(pricing: Record<string, unknown>): string[] {
  const raw: RawCatalogData = {
    providers: [
      {
        file: "providers/p.yaml",
        data: {
          id: "p",
          role: "provider",
          name: "P",
          sources: [SOURCE],
          lastVerifiedAt: "2026-01-01",
          verificationStatus: "estimated",
        },
      },
    ],
    models: [
      {
        file: "models/m.yaml",
        data: {
          id: "m",
          role: "model",
          name: "M",
          sources: [SOURCE],
          lastVerifiedAt: "2026-01-01",
          verificationStatus: "estimated",
        },
      },
    ],
    plans: [],
    pricing: [{ file: "pricing/pricing.yaml", data: pricing }],
  };
  return validateCatalogData(raw)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.code);
}

function record(rates: Record<string, unknown>, tiers?: unknown[]): Record<string, unknown> {
  return {
    id: "m-pricing",
    role: "pricing",
    modelId: "m",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates,
    ...(tiers !== undefined ? { tiers } : {}),
    effectiveFrom: "2026-01-01",
    sources: [SOURCE],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  };
}

describe("catalog pricing semantics: billed-as relationships", () => {
  it("accepts a documented equivalence to a published rate", () => {
    expect(
      check(record({ input: "2.00", output: "4.00", reasoning: { billedAs: "output" } })),
    ).toEqual([]);
  });

  it("rejects a chain of equivalences", () => {
    expect(
      check(
        record({
          input: "2.00",
          output: { billedAs: "reasoning" },
          reasoning: { billedAs: "cacheRead" },
          cacheRead: "0.50",
        }),
      ),
    ).toContain("PRICING_EQUIVALENCE_INVALID");
  });

  it("rejects a cycle of equivalences", () => {
    expect(
      check(
        record({
          input: "2.00",
          output: { billedAs: "reasoning" },
          reasoning: { billedAs: "output" },
        }),
      ),
    ).toContain("PRICING_EQUIVALENCE_INVALID");
  });

  it("rejects a self-reference and a reference to an absent category", () => {
    expect(check(record({ input: "2.00", output: { billedAs: "output" } }))).toContain(
      "PRICING_EQUIVALENCE_INVALID",
    );
    expect(
      check(record({ input: "2.00", output: "4.00", reasoning: { billedAs: "cacheWrite" } })),
    ).toContain("PRICING_EQUIVALENCE_INVALID");
  });
});

describe("catalog pricing semantics: conditional tiers", () => {
  const completeRates = { input: "2.00", output: "4.00", cacheRead: "0.50" };

  it("accepts one request-size tier and disjoint schedule tiers", () => {
    expect(
      check(
        record(completeRates, [
          {
            id: "long-context",
            label: "Above 272K input tokens",
            when: { inputTokensAbove: 272_000 },
            rates: { input: "4.00", output: "8.00", cacheRead: "1.00" },
          },
        ]),
      ),
    ).toEqual([]);
    expect(
      check(
        record(completeRates, [
          {
            id: "weekday-peak",
            label: "Peak",
            when: {
              utcWindows: [
                { days: ["mon", "tue", "wed", "thu", "fri"], start: "01:00", end: "04:00" },
                { days: ["sat", "sun"], start: "06:00", end: "10:00" },
              ],
            },
            rates: { input: "4.00", output: "8.00", cacheRead: "1.00" },
          },
        ]),
      ),
    ).toEqual([]);
  });

  it("rejects a tier that does not establish every category of the base rates", () => {
    expect(
      check(
        record(completeRates, [
          {
            id: "long-context",
            label: "Above 272K input tokens",
            when: { inputTokensAbove: 272_000 },
            rates: { input: "4.00", output: "8.00" },
          },
        ]),
      ),
    ).toContain("PRICING_TIER_RATES_INCOMPLETE");
  });

  it("rejects duplicate tier ids", () => {
    const tier = {
      id: "long-context",
      label: "Above 272K input tokens",
      when: { inputTokensAbove: 272_000 },
      rates: { input: "4.00", output: "8.00", cacheRead: "1.00" },
    };
    expect(check(record(completeRates, [tier, { ...tier }]))).toContain(
      "PRICING_TIER_ID_DUPLICATE",
    );
  });

  it("rejects two request-size tiers and mixed condition families", () => {
    const sizeTier = {
      id: "long-context",
      label: "Above 272K input tokens",
      when: { inputTokensAbove: 272_000 },
      rates: { input: "4.00", output: "8.00", cacheRead: "1.00" },
    };
    expect(
      check(
        record(completeRates, [
          sizeTier,
          { ...sizeTier, id: "longer-context", when: { inputTokensAbove: 544_000 } },
        ]),
      ),
    ).toContain("PRICING_TIER_OVERLAP");
    expect(
      check(
        record(completeRates, [
          sizeTier,
          {
            id: "weekday-peak",
            label: "Peak",
            when: {
              utcWindows: [{ days: ["mon"], start: "01:00", end: "04:00" }],
            },
            rates: { input: "4.00", output: "8.00", cacheRead: "1.00" },
          },
        ]),
      ),
    ).toContain("PRICING_TIER_OVERLAP");
  });

  it("rejects overlapping schedule windows across tiers", () => {
    const rates = { input: "4.00", output: "8.00", cacheRead: "1.00" };
    expect(
      check(
        record(completeRates, [
          {
            id: "weekday-peak",
            label: "Peak",
            when: {
              utcWindows: [{ days: ["mon", "tue"], start: "01:00", end: "04:00" }],
            },
            rates,
          },
          {
            id: "weekday-morning",
            label: "Morning",
            when: {
              utcWindows: [{ days: ["tue"], start: "03:00", end: "06:00" }],
            },
            rates,
          },
        ]),
      ),
    ).toContain("PRICING_TIER_OVERLAP");
  });

  it("rejects a window that wraps midnight instead of flattening the schedule", () => {
    expect(
      check(
        record(completeRates, [
          {
            id: "overnight",
            label: "Overnight",
            when: {
              utcWindows: [{ days: ["mon"], start: "23:00", end: "01:00" }],
            },
            rates: { input: "4.00", output: "8.00", cacheRead: "1.00" },
          },
        ]),
      ),
    ).toContain("PRICING_TIER_WINDOW_INVALID");
  });
});
