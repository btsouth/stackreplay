import type { CatalogV1, PlanLimitV1 } from "@stackreplay/catalog";
import {
  decimalAmountV1Schema,
  economicsV1Schema,
  executionReplayResultV1Schema,
  usageEventV1Schema,
} from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  FIXTURE_PLAN_VERSION_ID,
  fixtureContext,
  fixturePricing,
  fixtureTarget,
  makeApiFixtureCatalog,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent, overlappingUsage } from "./fixtures/events.js";

const event = (id: string, tokens: number, hour = 0) =>
  makeEvent({
    id,
    occurredAt: `2026-09-01T${String(hour).padStart(2, "0")}:00:00Z`,
    usage: completeUsage({ uncachedInputTokens: tokens }),
  });
const limit = (id: string, amount: string, exceed: PlanLimitV1["exceed"] = "reject_request") =>
  rollingLimit({ id, amount, exceed, type: "token_limit" });
const run = (catalog: CatalogV1, events: ReturnType<typeof event>[]) =>
  replay({ catalog, events, target: fixtureTarget, context: fixtureContext });

/** Exact finite decimal product, independent of Decimal precision/configuration. */
function product(...values: string[]): string {
  let coefficient = 1n;
  let scale = 0;
  for (const value of values) {
    const [whole = "0", fraction = ""] = value.split(".");
    coefficient *= BigInt(whole + fraction);
    scale += fraction.length;
  }
  const digits = coefficient.toString().padStart(scale + 1, "0");
  const fraction = scale ? digits.slice(-scale).replace(/0+$/, "") : "";
  return `${scale ? digits.slice(0, -scale) : digits}${fraction ? `.${fraction}` : ""}`;
}
function priced(rate: string, limits: PlanLimitV1[], multiplier?: string) {
  const base = fixturePricing["fixture-small-pricing"];
  if (!base) throw new Error("missing fixture");
  return makeFixtureCatalog({
    limits,
    pricing: {
      ...fixturePricing,
      "fixture-small-pricing": { ...base, rates: { input: rate, output: "0" } },
    },
    modelRules: [
      {
        model: "fixture-small",
        pricingRef: "fixture-small-pricing",
        ...(multiplier ? { multiplier } : {}),
      },
    ],
  });
}

describe("independent re-audit: admission", () => {
  it.each([
    [11, 1],
    [6, 5, 4],
  ])("serves only fitting requests: %j", (...tokens: number[]) => {
    const r = run(
      makeFixtureCatalog({ limits: [limit("cap", "10")] }),
      tokens.map((n, i) => event(`${i}`, n)),
    );
    expect(r.constraints[0]?.consumedUnits).toBe(tokens.length === 2 ? "1" : "10");
    expect(r.coverage.requests.covered).toBe(tokens.length === 2 ? 1 : 2);
  });
  it("evaluates every latch before atomic rejection, regardless of rule order", () => {
    const limits = [limit("reject", "5"), limit("latch", "10", "latch_until_reset")];
    const events = [event("a", 11), event("b", 1, 1), event("c", 1, 5)];
    for (const rules of [limits, [...limits].reverse()]) {
      const r = run(makeFixtureCatalog({ limits: rules }), events);
      expect(r.coverage.requests.covered).toBe(1);
      expect(r.constraints.find((c) => c.id === "latch")?.rejectedEvents).toBe(2);
    }
  });
  it("does not advance either pool on partial fit", () => {
    const r = run(makeFixtureCatalog({ limits: [limit("small", "10"), limit("big", "20")] }), [
      event("a", 6),
      event("b", 5),
      event("c", 4),
    ]);
    expect(r.constraints.map((c) => c.consumedUnits)).toEqual(["10", "10"]);
    expect(r.constraints.map((c) => c.attemptedUnits)).toEqual(["15", "15"]);
  });
  it("distinguishes recording from billing across resets", () => {
    for (const exceed of ["record_only", "allow_overage"] as const) {
      const r = run(
        makeFixtureCatalog({
          limits: [
            {
              ...limit("cap", "1000000", exceed),
              ...(exceed === "allow_overage"
                ? { overageRate: { unit: "per_1m_tokens" as const, amount: "4" } }
                : {}),
            },
          ],
        }),
        [event("a", 1250000), event("b", 1250000, 5)],
      );
      expect(r.coverage.requests.covered).toBe(2);
      expect(r.constraints[0]?.overageUnits).toBe("500000");
      expect(r.economics?.targetCost.amount).toBe(exceed === "allow_overage" ? "22" : "20.00");
    }
  });
  it("does not pretend request count is monotone under greedy token admission", () => {
    const events = [event("a", 11), event("b", 6), event("c", 4)];
    expect(
      run(makeFixtureCatalog({ limits: [limit("cap", "10")] }), events).coverage.requests.covered,
    ).toBe(2);
    expect(
      run(makeFixtureCatalog({ limits: [limit("cap", "11")] }), events).coverage.requests.covered,
    ).toBe(1);
  });
});

describe("independent re-audit: accounting and unknowns", () => {
  it("rejects combined included cache subsets exceeding input", () => {
    const e = makeEvent({
      id: "a",
      occurredAt: "2026-09-01T00:00:00Z",
      usage: overlappingUsage({ inputTokens: 100, cacheReadTokens: 80, cacheWriteTokens: 80 }),
    });
    expect(usageEventV1Schema.safeParse(e).success).toBe(false);
    expect(() => run(makeFixtureCatalog({ limits: [limit("cap", "100")] }), [e])).toThrow(
      /IMPORT_SCHEMA_INVALID/,
    );
  });
  it("reports disjoint workload totals, not overlapping counters without their declarations", () => {
    const e = makeEvent({
      id: "a",
      occurredAt: "2026-09-01T00:00:00Z",
      usage: overlappingUsage({
        inputTokens: 100,
        cacheReadTokens: 100,
        outputTokens: 100,
        reasoningTokens: 40,
      }),
    });
    const r = run(makeFixtureCatalog({ limits: [limit("cap", "1000")] }), [e]);
    expect(r.workload.tokenTotals).toEqual({
      inputTokens: 0,
      cacheReadTokens: 100,
      cacheWriteTokens: 0,
      outputTokens: 60,
      reasoningTokens: 40,
    });
    expect(r.coverage.usage.total).toBe(200);
  });
  it("keeps request-only admission known for missing usage", () => {
    const r = run(
      makeFixtureCatalog({
        limits: [rollingLimit({ id: "requests", type: "request_limit", amount: "1" })],
      }),
      [makeEvent({ id: "a", occurredAt: "2026-09-01T00:00:00Z", usage: {} })],
    );
    expect(r.coverage.requests).toMatchObject({ status: "known", covered: 1 });
    expect(r.coverage.usage.status).toBe("unknown");
  });
  it("does not publish an exact overage total for indeterminate admission", () => {
    const r = run(
      makeFixtureCatalog({
        limits: [
          {
            ...limit("cap", "1", "allow_overage"),
            overageRate: { unit: "per_1m_tokens", amount: "2" },
          },
        ],
      }),
      [makeEvent({ id: "a", occurredAt: "2026-09-01T00:00:00Z", usage: {} })],
    );
    expect(r.economics).toBeUndefined();
    expect(r.warnings.some((w) => w.code === "ECONOMICS_UNKNOWN")).toBe(true);
  });
});

describe("independent re-audit: numeric and serialized contracts", () => {
  it("counts zeros after a significant integer inside the 28-digit envelope", () => {
    expect(decimalAmountV1Schema.safeParse("1234567890123456789012345678.01").success).toBe(false);
  });
  it("rejects promotion compositions beyond the supported exact-arithmetic budget", () => {
    const catalog = makeFixtureCatalog({
      limits: [limit("cap", "100")],
      promotions: Array.from({ length: 8 }, (_, i) => ({
        id: `p${i}`,
        label: "Synthetic",
        effectiveFrom: "2026-01-01",
        multiplier: "1.111111111111111111",
      })),
    });
    expect(() => run(catalog, [event("a", 1)])).toThrow(/CATALOG_INVALID/);
  });
  it.each(["0.000000000000000001", "9999999999999999999999999999"])(
    "serializes exact computed cost outside the external-input envelope: %s",
    (rate) => {
      const r = run(
        priced(rate, [
          rollingLimit({ id: "credit", type: "credit_pool", amount: "0", exceed: "allow_overage" }),
        ]),
        [event("a", Number.MAX_SAFE_INTEGER)],
      );
      expect(r.economics?.overageCost?.amount).toBe(
        product(rate, String(Number.MAX_SAFE_INTEGER), "0.000001"),
      );
      expect(executionReplayResultV1Schema.safeParse(r).success).toBe(true);
    },
  );
  it("preserves repeated tiny overages and multiplier composition exactly", () => {
    const rate = "0.000000000000000001";
    const r = run(
      priced(
        rate,
        [rollingLimit({ id: "credit", type: "credit_pool", amount: "0", exceed: "allow_overage" })],
        "10",
      ),
      [event("a", 1), event("b", 1), event("c", 1, 5)],
    );
    expect(r.economics?.overageCost?.amount).toBe("0.00000000000000000000003");
    expect(executionReplayResultV1Schema.safeParse(r).success).toBe(true);
  });
  it("rejects inconsistent economic identities", () => {
    const valid = {
      basePlanCost: { currency: "USD", amount: "20" },
      overageCost: { currency: "USD", amount: "1" },
      targetCost: { currency: "USD", amount: "21" },
      costBasis: "fixed_plan_price_plus_overage",
      baselineCost: { currency: "USD", amount: "22" },
      costDifference: { currency: "USD", amount: "-1" },
    };
    expect(economicsV1Schema.safeParse(valid).success).toBe(true);
    expect(
      economicsV1Schema.safeParse({ ...valid, costDifference: { currency: "USD", amount: "-2" } })
        .success,
    ).toBe(false);
    expect(
      economicsV1Schema.safeParse({ ...valid, targetCost: { currency: "USD", amount: "22" } })
        .success,
    ).toBe(false);
  });
  it("rejects dimensionally wrong units, invalid numbers and inconsistent coverage", () => {
    const r = run(makeFixtureCatalog({ limits: [limit("cap", "10")] }), [event("a", 1)]);
    for (const bad of [{ unit: "usd" }, { consumedUnits: "bananas" }, { consumedUnits: "-1" }]) {
      expect(
        executionReplayResultV1Schema.safeParse({
          ...r,
          constraints: r.constraints.map((c) => ({ ...c, ...bad })),
        }).success,
      ).toBe(false);
    }
    expect(
      executionReplayResultV1Schema.safeParse({
        ...r,
        coverage: {
          ...r.coverage,
          requests: { status: "known", covered: 2, total: 1, percent: 100 },
        },
      }).success,
    ).toBe(false);
  });
});

describe("independent re-audit: boundary contracts", () => {
  it("rejects window bounds outside the four-digit timestamp contract explicitly", () => {
    const e = makeEvent({
      id: "end",
      occurredAt: "9999-12-31T23:59:59.999999999Z",
      usage: completeUsage({ uncachedInputTokens: 1 }),
    });
    expect(() => run(makeFixtureCatalog({ limits: [limit("cap", "0")] }), [e])).toThrow(
      /IMPORT_SCHEMA_INVALID/,
    );
  });

  it("keeps exact tiny composed rates and a large base cost in one serialized sum", () => {
    const rate = "0.000000000000000001";
    const catalog = priced(
      rate,
      [rollingLimit({ id: "credit", type: "credit_pool", amount: "0", exceed: "allow_overage" })],
      "0.000000000000000001",
    );
    const version = catalog.planVersions[FIXTURE_PLAN_VERSION_ID];
    if (!version) throw new Error("missing version");
    version.promotions = [
      {
        id: "tiny",
        label: "Synthetic tiny factor",
        effectiveFrom: "2026-01-01",
        multiplier: "0.000000000001",
      },
    ];
    const sourceVersion = catalog.plans[version.planId]?.versions[0];
    if (!sourceVersion) throw new Error("missing source version");
    sourceVersion.promotions = version.promotions;
    version.price.amount = "9999999999999999999999999999";
    const result = run(catalog, [event("a", 1), event("b", 1)]);
    const tiny = product(rate, "0.000000000000000001", "0.000000000001", "0.000001", "2");
    expect(result.economics?.overageCost?.amount).toBe(tiny);
    expect(result.economics?.targetCost.amount).toBe(version.price.amount + tiny.slice(1));
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  });
});

describe("independent re-audit: request billing and target serialization", () => {
  it("bills request overage once per excess request across reset windows", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "requests",
          type: "request_limit",
          amount: "1",
          exceed: "allow_overage",
          overageRate: { unit: "per_request", amount: "0.125" },
        }),
      ],
    });
    const result = run(catalog, [
      event("a", 0),
      event("b", 0),
      event("c", 0, 5),
      event("d", 0, 5),
      event("e", 0, 5),
    ]);
    expect(result.coverage.requests.covered).toBe(5);
    expect(result.constraints[0]?.overageUnits).toBe("3");
    expect(result.economics?.overageCost?.amount).toBe("0.375");
    expect(result.economics?.targetCost.amount).toBe("20.375");
    expect(executionReplayResultV1Schema.safeParse(result).success).toBe(true);
  });

  it("refuses a subscription result relabelled as an API target, and accepts a faithful one", () => {
    const result = run(makeFixtureCatalog({ limits: [limit("cap", "10")] }), []);
    for (const target of [{ type: "subscription" }, { ...fixtureTarget, planId: "fixture-plan" }]) {
      expect(executionReplayResultV1Schema.safeParse({ ...result, target }).success).toBe(false);
    }

    /**
     * The M1 re-audit permitted a subscription result to be relabelled as an API
     * target once the subscription detail was dropped: the result schema was
     * generalized so a future target kind would not need a second result type.
     * M4C tightens that deliberately. An API target now has to agree with its
     * target stack, carry no allowance constraints and no plan economics, so the
     * relabel is refused instead of accepted. What the M1 finding was protecting
     * (a real API result needs no subscription detail) is covered by the
     * positive case below and by api-replay.test.ts.
     */
    const { subscription: _subscription, ...generalized } = result;
    const relabelled = {
      ...generalized,
      target: { type: "api", providerId: "synthetic", pricingVersionId: "synthetic" },
      versions: { ...result.versions, targetType: "api", targetReference: "synthetic" },
    };
    expect(executionReplayResultV1Schema.safeParse(relabelled).success).toBe(false);

    const apiResult = replay({
      catalog: makeApiFixtureCatalog(),
      events: [event("api-1", 1_000_000)],
      target: { type: "api", providerId: "fixture-provider" },
      context: fixtureContext,
    });
    expect(executionReplayResultV1Schema.safeParse(apiResult).success).toBe(true);
    expect(apiResult.subscription).toBeUndefined();
    expect(apiResult.constraints).toEqual([]);
    // And the reverse relabel is refused: an API stack cannot be pinned by a
    // subscription target.
    expect(
      executionReplayResultV1Schema.safeParse({
        ...apiResult,
        target: { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID },
      }).success,
    ).toBe(false);
  });
});
