import { describe, expect, it } from "vitest";
import { stackReplayExportV1Schema } from "./export.js";
import { moneyV1Schema, signedMoneyV1Schema } from "./money.js";
import {
  constraintResultV1Schema,
  coverageDimensionV1Schema,
  economicsV1Schema,
  executionReplayResultV1Schema,
  measurementUnitV1Schema,
} from "./replay-result.js";
import {
  decimalAmountV1Schema,
  isWithinDecimalEnvelope,
  MAX_FRACTIONAL_DIGITS,
  MAX_SIGNIFICANT_DIGITS,
  multiplierV1Schema,
  signedDecimalAmountV1Schema,
} from "./scalars.js";
import { usageEventV1Schema } from "./usage-event.js";

const validEvent = {
  schemaVersion: 1,
  id: "evt-1",
  occurredAt: "2026-09-01T10:00:00Z",
  source: { adapterId: "example-adapter" },
  model: { rawName: "example-medium", canonicalId: "example-medium" },
  modality: "text",
  workloadCategory: "coding",
  usage: {
    inputTokens: 1200,
    outputTokens: 300,
    cacheReadTokens: 8000,
    accounting: {
      cacheReadIncludedInInput: false,
      cacheWriteIncludedInInput: false,
      reasoningIncludedInOutput: false,
    },
  },
  confidence: { usage: "exact", model: "exact" },
};

describe("usageEventV1Schema", () => {
  it("accepts a canonical text event", () => {
    const parsed = usageEventV1Schema.parse(validEvent);
    expect(parsed.id).toBe("evt-1");
    expect(parsed.usage.inputTokens).toBe(1200);
  });

  it("accepts an event with missing token categories", () => {
    const parsed = usageEventV1Schema.parse({ ...validEvent, usage: {} });
    expect(parsed.usage.inputTokens).toBeUndefined();
  });

  it("rejects non-UTC timestamps", () => {
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, occurredAt: "2026-09-01T10:00:00+02:00" }),
    ).toThrow();
  });

  it("rejects a metric-bag style usage shape", () => {
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, usage: { metrics: { tokens: 5 } } }),
    ).toThrow();
  });

  it("rejects unknown fields instead of silently accepting them", () => {
    expect(() => usageEventV1Schema.parse({ ...validEvent, plan: "sneaky" })).toThrow();
  });

  it("rejects negative token counts and non-integer counts", () => {
    expect(() => usageEventV1Schema.parse({ ...validEvent, usage: { inputTokens: -1 } })).toThrow();
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, usage: { inputTokens: 1.5 } }),
    ).toThrow();
  });

  it("rejects float money and accepts decimal-string money", () => {
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, nativeCost: { amount: 12.5, currency: "USD" } }),
    ).toThrow();
    const parsed = usageEventV1Schema.parse({
      ...validEvent,
      nativeCost: { amount: "12.50", currency: "USD" },
    });
    expect(parsed.nativeCost?.amount).toBe("12.50");
  });
});

describe("executionReplayResultV1Schema", () => {
  it("has no generic savings field", () => {
    const shape = executionReplayResultV1Schema.shape;
    expect("savings" in shape).toBe(false);
    expect("economics" in shape).toBe(true);
  });
});

describe("independent audit: timestamps", () => {
  it.each([
    "2026-02-30T00:00:00Z",
    "2026-01-01T24:00:00Z",
    "2026-01-01T00:60:00Z",
    "2026-01-01T00:00:60Z",
  ])("rejects impossible instant %s", (occurredAt) => {
    expect(usageEventV1Schema.safeParse({ ...validEvent, occurredAt }).success).toBe(false);
  });
  it("validates optional request timestamps too", () => {
    expect(
      usageEventV1Schema.safeParse({ ...validEvent, requestStartedAt: "2026-02-30T00:00:00Z" })
        .success,
    ).toBe(false);
  });
  it("retains nine-digit fractional precision", () => {
    const at = "2026-09-01T00:00:00.123456789Z";
    expect(usageEventV1Schema.parse({ ...validEvent, occurredAt: at }).occurredAt).toBe(at);
  });
});

describe("remediation: canonical token accounting", () => {
  it("requires a declaration for each overlapping category that is present", () => {
    const withoutDeclaration = {
      ...validEvent,
      usage: { inputTokens: 100, cacheReadTokens: 100 },
    };
    const parsed = usageEventV1Schema.safeParse(withoutDeclaration);
    expect(parsed.success).toBe(false);
    expect(
      parsed.error?.issues.some((issue) =>
        issue.path.join(".").includes("cacheReadIncludedInInput"),
      ),
    ).toBe(true);
  });

  it("requires reasoning declarations as well", () => {
    expect(
      usageEventV1Schema.safeParse({
        ...validEvent,
        usage: { outputTokens: 10, reasoningTokens: 4 },
      }).success,
    ).toBe(false);
  });

  it("accepts a fully declared event and a partial event without overlapping categories", () => {
    expect(usageEventV1Schema.safeParse(validEvent).success).toBe(true);
    expect(
      usageEventV1Schema.safeParse({ ...validEvent, usage: { inputTokens: 5, outputTokens: 5 } })
        .success,
    ).toBe(true);
  });

  it("rejects an included quantity larger than its base", () => {
    const parsed = usageEventV1Schema.safeParse({
      ...validEvent,
      usage: {
        inputTokens: 10,
        cacheReadTokens: 50,
        accounting: { cacheReadIncludedInInput: true },
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an inclusion declaration without its category", () => {
    const parsed = usageEventV1Schema.safeParse({
      ...validEvent,
      usage: { inputTokens: 10, accounting: { cacheReadIncludedInInput: true } },
    });
    expect(parsed.success).toBe(false);
  });
});

describe("remediation: bounded decimal envelope", () => {
  it("accepts values exactly at the envelope boundary", () => {
    const maxSignificant = "1".repeat(MAX_SIGNIFICANT_DIGITS);
    const maxFractional = `0.${"1".repeat(MAX_FRACTIONAL_DIGITS)}`;
    expect(decimalAmountV1Schema.safeParse(maxSignificant).success).toBe(true);
    expect(decimalAmountV1Schema.safeParse(maxFractional).success).toBe(true);
    expect(isWithinDecimalEnvelope(maxSignificant)).toBe(true);
    expect(isWithinDecimalEnvelope(maxFractional)).toBe(true);
  });

  it("rejects one digit beyond the envelope", () => {
    const tooManySignificant = "1".repeat(MAX_SIGNIFICANT_DIGITS + 1);
    const tooManyFractional = `0.${"1".repeat(MAX_FRACTIONAL_DIGITS + 1)}`;
    expect(decimalAmountV1Schema.safeParse(tooManySignificant).success).toBe(false);
    expect(decimalAmountV1Schema.safeParse(tooManyFractional).success).toBe(false);
  });

  it("applies the envelope to multipliers and signed amounts", () => {
    expect(multiplierV1Schema.safeParse("0.5").success).toBe(true);
    expect(multiplierV1Schema.safeParse(`0.${"1".repeat(MAX_FRACTIONAL_DIGITS + 1)}`).success).toBe(
      false,
    );
    expect(signedDecimalAmountV1Schema.safeParse("-1.5").success).toBe(true);
    expect(
      signedDecimalAmountV1Schema.safeParse(`-0.${"1".repeat(MAX_FRACTIONAL_DIGITS + 1)}`).success,
    ).toBe(false);
  });

  it("still rejects floats, exponents and negatives where they are not allowed", () => {
    expect(decimalAmountV1Schema.safeParse(1.5 as never).success).toBe(false);
    expect(decimalAmountV1Schema.safeParse("1e3").success).toBe(false);
    expect(decimalAmountV1Schema.safeParse("-1").success).toBe(false);
    expect(signedDecimalAmountV1Schema.safeParse("-1").success).toBe(true);
  });
});

describe("remediation: money shapes", () => {
  it("keeps base costs non-negative and differences signed", () => {
    expect(moneyV1Schema.safeParse({ amount: "0", currency: "USD" }).success).toBe(true);
    expect(moneyV1Schema.safeParse({ amount: "-1.50", currency: "USD" }).success).toBe(false);
    expect(signedMoneyV1Schema.safeParse({ amount: "-1.50", currency: "USD" }).success).toBe(true);
    expect(signedMoneyV1Schema.safeParse({ amount: "1.50", currency: "USD" }).success).toBe(true);
  });

  it("requires a baseline for a cost difference and a matching basis for overage", () => {
    const base = {
      targetCost: { amount: "20.00", currency: "USD" },
      costBasis: "fixed_plan_price" as const,
    };
    expect(
      economicsV1Schema.safeParse({ ...base, costDifference: { amount: "-1.00", currency: "USD" } })
        .success,
    ).toBe(false);
    expect(
      economicsV1Schema.safeParse({
        ...base,
        baselineCost: { amount: "21.00", currency: "USD" },
        costDifference: { amount: "-1.00", currency: "USD" },
      }).success,
    ).toBe(true);
    expect(
      economicsV1Schema.safeParse({ ...base, overageCost: { amount: "1.00", currency: "USD" } })
        .success,
    ).toBe(false);
    expect(
      economicsV1Schema.safeParse({
        ...base,
        costBasis: "fixed_plan_price_plus_overage",
        overageCost: { amount: "1.00", currency: "USD" },
      }).success,
    ).toBe(true);
  });
});

describe("remediation: measurement units and coverage contracts", () => {
  it("accepts only enumerated measurement units", () => {
    expect(measurementUnitV1Schema.safeParse("tokens").success).toBe(true);
    expect(measurementUnitV1Schema.safeParse("requests").success).toBe(true);
    expect(measurementUnitV1Schema.safeParse("usd").success).toBe(true);
    expect(measurementUnitV1Schema.safeParse("bananas").success).toBe(false);
    expect(measurementUnitV1Schema.safeParse("currency").success).toBe(false);
  });

  it("rejects an arbitrary unit inside a constraint result", () => {
    const constraint = {
      id: "c",
      label: "C",
      kind: "credit_pool",
      unit: "bananas",
      window: { kind: "rolling", description: "rolling window of PT5H anchored at first use" },
      exceed: "reject_request",
      status: "pass",
      limitUnits: "1",
      consumedUnits: "0",
      attemptedUnits: "0",
      violationCount: 0,
      rejectedEvents: 0,
      indeterminateEvents: 0,
      eligibleEvents: 0,
    };
    expect(constraintResultV1Schema.safeParse(constraint).success).toBe(false);
    expect(constraintResultV1Schema.safeParse({ ...constraint, unit: "usd" }).success).toBe(true);
  });

  it("requires a known dimension to carry a percentage and an unknown one to omit it", () => {
    expect(
      coverageDimensionV1Schema.safeParse({ status: "known", percent: 50, covered: 1, total: 2 })
        .success,
    ).toBe(true);
    expect(
      coverageDimensionV1Schema.safeParse({ status: "known", covered: 1, total: 2 }).success,
    ).toBe(false);
    expect(
      coverageDimensionV1Schema.safeParse({ status: "unknown", reason: "missing data" }).success,
    ).toBe(true);
    expect(
      coverageDimensionV1Schema.safeParse({
        status: "unknown",
        percent: 100,
        reason: "missing data",
      }).success,
    ).toBe(false);
    expect(coverageDimensionV1Schema.safeParse({ status: "unknown" }).success).toBe(false);
  });
});

describe("remediation: export range validation", () => {
  const exportDocument = (from: string, to: string) => ({
    format: "stackreplay",
    version: 1,
    generatedAt: "2026-09-01T00:00:00Z",
    collectorVersion: "0.0.1",
    range: { from, to },
    detectedSources: [],
    events: [],
    redactionReport: {
      promptsIncluded: false,
      responsesIncluded: false,
      sourceCodeIncluded: false,
      filePathsIncluded: false,
      repositoryNamesIncluded: false,
    },
  });

  it("rejects a range whose from is after its to", () => {
    expect(
      stackReplayExportV1Schema.safeParse(
        exportDocument("2026-09-02T00:00:00Z", "2026-09-01T00:00:00Z"),
      ).success,
    ).toBe(false);
  });

  it("accepts an empty range where from equals to", () => {
    expect(
      stackReplayExportV1Schema.safeParse(
        exportDocument("2026-09-01T00:00:00Z", "2026-09-01T00:00:00Z"),
      ).success,
    ).toBe(true);
  });

  it("orders sub-millisecond timestamps exactly", () => {
    expect(
      stackReplayExportV1Schema.safeParse(
        exportDocument("2026-09-01T00:00:00.000002Z", "2026-09-01T00:00:00.000001Z"),
      ).success,
    ).toBe(false);
    expect(
      stackReplayExportV1Schema.safeParse(
        exportDocument("2026-09-01T00:00:00.000001Z", "2026-09-01T00:00:00.000002Z"),
      ).success,
    ).toBe(true);
  });
});
