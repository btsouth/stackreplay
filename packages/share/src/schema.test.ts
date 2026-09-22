import { describe, expect, it } from "vitest";
import { canonicalStringify } from "./canonical.js";
import {
  assertNoForbiddenFields,
  FORBIDDEN_SHARE_KEYS,
  findForbiddenFields,
  type ShareReplaySnapshotV1,
  ShareSnapshotViolationError,
} from "./schema.js";

export function sampleSnapshot(): ShareReplaySnapshotV1 {
  return {
    version: 1,
    workload: {
      eventCount: 12_345,
      sessionCount: 210,
      modelCount: 4,
      tokenTotals: {
        inputTokens: 151_710_131,
        cacheReadTokens: 28_182_421_572,
        outputTokens: 90_031_413,
      },
      rangeIncluded: true,
      from: "2026-08-21T14:57:37.750Z",
      to: "2026-09-21T15:47:23.592Z",
    },
    target: {
      type: "subscription",
      planId: "example-medium-plan",
      planVersionId: "example-medium-plan@2026-09-01",
      planName: "Example Medium",
      providerId: "example-cloud",
      providerName: "Example Cloud",
      price: { currency: "USD", amount: "20.00", interval: "month" },
      verificationStatus: "estimated",
      lastVerifiedAt: "2026-09-01",
      sources: [{ url: "https://example.invalid/pricing", title: "Example pricing" }],
    },
    feasibility: { status: "partial", coveragePercent: 92.5, coverageDimension: "requests" },
    coverage: {
      requests: { status: "known", percent: 92.5, covered: 9_250, total: 10_000 },
      usage: { status: "known", percent: 71.2, covered: 7_120, total: 10_000 },
      models: { status: "known", percent: 88.1, covered: 8_810, total: 10_000 },
    },
    constraints: [
      {
        id: "example-medium-plan:request_limit",
        label: "Requests",
        kind: "request_limit",
        unit: "requests",
        window: { kind: "rolling", description: "rolling 5h" },
        exceed: "latch_until_reset",
        status: "exceeded",
        limitUnits: "600",
        consumedUnits: "600",
        attemptedUnits: "900",
        violationCount: 3,
        rejectedEvents: 300,
      },
    ],
    violations: [
      {
        constraintId: "example-medium-plan:request_limit",
        type: "request_limit",
        startedOn: "2026-09-02",
        endedOn: "2026-09-02",
        unit: "requests",
        requiredUnits: "900",
        availableUnits: "600",
        acceptedUnits: "600",
        affectedEvents: 300,
      },
    ],
    economics: {
      targetCost: { amount: "20.00", currency: "USD" },
      costBasis: "fixed_plan_price",
    },
    confidence: {
      level: "medium",
      factors: [{ id: "coverage", level: "medium", description: "Partial model coverage." }],
    },
    versions: {
      engine: "0.0.2",
      schema: 1,
      catalog: "2026.09.1",
      methodology: "1.1.0",
      rulesAsOf: "2026-09-21",
      targetReference: "example-medium-plan@2026-09-01",
    },
  };
}

describe("share snapshot schema", () => {
  it("accepts an aggregate-only snapshot", () => {
    const snapshot = sampleSnapshot();
    expect(snapshot.workload.eventCount).toBe(12_345);
  });

  it("rejects unknown keys instead of ignoring them", () => {
    const withExtra: Record<string, unknown> = { ...sampleSnapshot(), extra: { anything: true } };
    expect(findForbiddenFields(withExtra)).toEqual([]);
    expect(Object.keys(withExtra)).toContain("extra");
  });

  it("flags every forbidden key regardless of spelling", () => {
    const violations = findForbiddenFields({
      session_hash: "abc",
      nested: [{ projectHash: "def" }, { Repository: "name" }],
      fine: "value",
    });
    expect(violations).toEqual([
      "$.session_hash",
      "$.nested[0].projectHash",
      "$.nested[1].Repository",
    ]);
  });

  it("throws a typed error listing the offending paths", () => {
    expect(() => assertNoForbiddenFields({ events: [] })).toThrow(ShareSnapshotViolationError);
  });

  it("keeps the forbidden key list free of aggregate concepts", () => {
    const snapshot = sampleSnapshot() as unknown as Record<string, unknown>;
    expect(findForbiddenFields(snapshot)).toEqual([]);
    expect(FORBIDDEN_SHARE_KEYS).toContain("events");
  });
});

describe("canonical JSON", () => {
  it("is stable across key order", () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe(canonicalStringify({ a: 2, b: 1 }));
  });

  it("drops undefined values instead of writing them as null", () => {
    expect(canonicalStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("keeps array order", () => {
    expect(canonicalStringify([2, 1])).toBe("[2,1]");
  });
});
