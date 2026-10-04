import type { PricingV1 } from "@stackreplay/catalog";
import { describe, expect, it } from "vitest";
import { apiTokenEstimateForModel, selectApiTokenEstimate } from "./api-token-estimate-source";

const day = "2026-10-03";
function price(overrides: Partial<PricingV1> = {}): PricingV1 {
  return {
    id: "exact-price",
    role: "pricing",
    modelId: "exact-model",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates: { input: "0.5", output: "1.5" },
    effectiveFrom: day,
    verificationStatus: "verified",
    lastVerifiedAt: "2026-10-02",
    sources: [{ title: "Exact source", url: "https://example.com/exact", checkedAt: "2026-10-01" }],
    ...overrides,
  };
}
const select = (...records: PricingV1[]) => selectApiTokenEstimate(records, "exact-model", day);

describe("exact Standard API basis", () => {
  it("accepts omitted and explicit Standard service tier", () => {
    expect(select(price()).state).toBe("eligible");
    expect(select(price({ serviceTier: "standard" })).state).toBe("eligible");
  });
  it.each([
    { modelId: "sibling-model" },
    { basis: "target_billing_rate" as const },
    { variantId: "explicit-interpretation" },
    { serviceTier: "batch" as const },
    { effectiveFrom: "2026-10-04" },
    { effectiveTo: "2026-10-02" },
    { effectiveFromInstant: "2026-10-04T00:00:00Z" },
    { effectiveFromInstant: "2026-10-03T23:00:00-02:00" },
  ])("excludes incompatible or noncurrent record %j", (overrides) => {
    expect(select(price(overrides))).toEqual({ state: "unavailable", reason: "no_current_base" });
  });
  it("accepts inclusive end dates and current activation instants", () => {
    expect(
      select(price({ effectiveTo: day, effectiveFromInstant: "2026-10-04T01:00:00+02:00" })).state,
    ).toBe("eligible");
  });
  it("never substitutes an interpretation or a sibling", () => {
    expect(
      select(
        price(),
        price({ id: "variant", variantId: "interpretation", rates: { input: "99", output: "99" } }),
      ),
    ).toMatchObject({ state: "eligible", pricingId: "exact-price", inputRatePerMillion: "0.5" });
    expect(selectApiTokenEstimate([price()], "pro-only-model", day).state).toBe("unavailable");
  });
  it.each(["estimated", "unknown", "measured"] as const)(
    "rejects %s records",
    (verificationStatus) => {
      expect(select(price({ verificationStatus }))).toEqual({
        state: "unavailable",
        reason: "unverified",
      });
    },
  );
});

describe("ambiguity and supersession", () => {
  it.each([
    [price(), price({ id: "tie" })],
    [price({ endpointId: "route-a" }), price({ id: "route-b", endpointId: "route-b" })],
    [price({ effectiveFrom: "2026-09-01" }), price({ id: "scoped", endpointId: "direct-api" })],
    [price(), price({ id: "bad-tie", verificationStatus: "unknown" })],
    [
      price(),
      price({
        id: "conditional-route",
        endpointId: "route-b",
        tiers: [
          {
            id: "long",
            label: "Long input",
            when: { inputTokensAbove: 1000 },
            rates: { input: "1", output: "3" },
          },
        ],
      }),
    ],
    [
      price({ effectiveFromInstant: `${day}T01:00:00Z` }),
      price({ id: "same-day", effectiveFromInstant: `${day}T02:00:00Z` }),
    ],
  ])("preserves conflicting current candidates %#", (a, b) => {
    expect(select(a, b)).toEqual({ state: "unavailable", reason: "ambiguous" });
    expect(select(b, a)).toEqual({ state: "unavailable", reason: "ambiguous" });
  });
  it("uses a strictly newer date only within the same route, regardless of input order", () => {
    const old = price({ id: "old", effectiveFrom: "2026-09-01" });
    expect(select(old, price())).toMatchObject({ state: "eligible", pricingId: "exact-price" });
    expect(select(price(), old)).toMatchObject({ state: "eligible", pricingId: "exact-price" });
    expect(select(price({ effectiveFrom: "2026-10-04" }), old)).toMatchObject({
      state: "eligible",
      pricingId: "old",
    });
  });
  it("does not fall back to a verified older snapshot", () => {
    expect(
      select(
        price({ effectiveFrom: "2026-09-01" }),
        price({ id: "new", verificationStatus: "unknown" }),
      ),
    ).toEqual({ state: "unavailable", reason: "unverified" });
  });
  it("rejects current conditional tiers instead of selecting simpler older rates", () => {
    const tiers: PricingV1["tiers"] = [
      {
        id: "long-context",
        label: "Long context",
        when: { inputTokensAbove: 272000 },
        rates: { input: "1", output: "3" },
      },
    ];
    expect(select(price({ effectiveFrom: "2026-09-01" }), price({ tiers }))).toEqual({
      state: "unavailable",
      reason: "conditional",
    });
    expect(select(price({ tiers: [] })).state).toBe("eligible");
  });
  it("rejects promotions without replacing them with regular rates", () => {
    expect(
      select(
        price({ promotion: { label: "Promotion", regularRates: { input: "10", output: "20" } } }),
      ),
    ).toEqual({ state: "unavailable", reason: "promotion" });
  });
});

describe("explicit same-record billing and provenance", () => {
  it("resolves chained aliases to known numeric categories", () => {
    expect(
      select(
        price({
          rates: {
            input: { billedAs: "cacheRead" },
            cacheRead: { billedAs: "reasoning" },
            reasoning: "0.25",
            output: { billedAs: "input" },
          },
        }),
      ),
    ).toMatchObject({
      state: "eligible",
      inputRatePerMillion: "0.25",
      outputRatePerMillion: "0.25",
    });
  });
  it.each([
    { input: { billedAs: "output" }, output: { billedAs: "input" } },
    { input: { billedAs: "input" }, output: "1" },
    { input: { billedAs: "cacheRead" }, output: "1" },
    { input: "0.5" },
    { input: "-1", output: "1" },
    { input: "0.5", output: "Infinity" },
    { input: { billedAs: "not-a-category" }, output: "1" },
  ])("fails closed on missing, cyclic, unknown or invalid numeric rates %j", (rates) => {
    expect(select(price({ rates: rates as PricingV1["rates"] }))).toEqual({
      state: "unavailable",
      reason: "invalid_rates",
    });
  });
  it("keeps the selected record's identity, all sources and dates together", () => {
    const selected = price({
      id: "latest",
      endpointId: "explicit-route",
      effectiveFromInstant: `${day}T01:00:00Z`,
      effectiveTo: "2026-11-01",
      sources: [
        { title: "Rate sheet", url: "https://example.com/rates", checkedAt: day },
        {
          title: "Billing categories",
          url: "https://example.com/billing",
          checkedAt: "2026-10-02",
        },
      ],
    });
    expect(
      select(
        price({ id: "old", effectiveFrom: "2026-09-01", endpointId: "explicit-route" }),
        selected,
      ),
    ).toEqual({
      state: "eligible",
      modelId: "exact-model",
      pricingId: "latest",
      inputRatePerMillion: "0.5",
      outputRatePerMillion: "1.5",
      endpointId: "explicit-route",
      effectiveFrom: day,
      effectiveFromInstant: `${day}T01:00:00Z`,
      effectiveTo: "2026-11-01",
      lastVerifiedAt: "2026-10-02",
      sources: selected.sources,
    });
  });
  it("retains the accepted Mistral observation without inventing an endpoint", () => {
    expect(apiTokenEstimateForModel("mistral-large-3", day)).toMatchObject({
      state: "eligible",
      pricingId: "mistral-large-3-api-pricing",
      inputRatePerMillion: "0.5",
      outputRatePerMillion: "1.5",
      endpointId: undefined,
      effectiveFrom: day,
      lastVerifiedAt: day,
      sources: [
        {
          checkedAt: day,
          title: expect.stringContaining("no provider-published price activation date"),
        },
      ],
    });
    expect(apiTokenEstimateForModel("gpt-6-luna", day)).toEqual({
      state: "unavailable",
      reason: "conditional",
    });
    expect(apiTokenEstimateForModel("gemini-3-8-flash", day)).toEqual({
      state: "unavailable",
      reason: "promotion",
    });
    expect(apiTokenEstimateForModel("gpt-5-6-sol-pro", day).state).toBe("unavailable");
  });
});
