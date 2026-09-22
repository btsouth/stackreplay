import type { ExecutionReplayResultV1 } from "@stackreplay/schema";
import { findForbiddenFields } from "@stackreplay/share";
import { describe, expect, it } from "vitest";
import { type ShareTargetFacts, toShareSnapshot } from "./share-snapshot";

/**
 * The share snapshot is the privacy boundary: these tests assert it is a
 * whitelist, not a filter. A field added to the replay result must not appear in
 * a share link unless this projection is changed on purpose.
 */

const target: ShareTargetFacts = {
  planId: "claude-max-20x",
  planVersionId: "claude-max-20x@2026-04-01",
  planName: "Claude Max 20x",
  providerId: "anthropic",
  providerName: "Anthropic",
  price: { currency: "USD", amount: "200.00", interval: "month" },
  verificationStatus: "verified",
  lastVerifiedAt: "2026-04-01",
  sources: [{ url: "https://www.anthropic.com/pricing", title: "Anthropic pricing" }],
};

/** The same facts for a synthetic demo plan, used to assert the demo marker. */
const syntheticTarget: ShareTargetFacts = {
  ...target,
  planId: "example-medium-plan",
  planVersionId: "example-medium-plan@2026-09-01",
  planName: "Example Medium",
  providerId: "example-cloud",
  providerName: "Example Cloud",
  verificationStatus: "estimated",
  lastVerifiedAt: "2026-09-01",
  sources: [{ url: "https://example.invalid/pricing", title: "Example pricing" }],
};

function sampleResult(): ExecutionReplayResultV1 {
  return {
    version: 1,
    workload: {
      eventCount: 1_000,
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:00.000Z",
      modelCount: 3,
      sessionCount: 40,
      tokenTotals: {
        inputTokens: 100_000,
        cacheReadTokens: 900_000,
        outputTokens: 50_000,
      },
    },
    target: { type: "subscription", planVersionId: "claude-max-20x@2026-04-01" },
    feasibility: { status: "partial", coveragePercent: 90, coverageDimension: "requests" },
    coverage: {
      requests: { status: "known", percent: 90, covered: 900, total: 1_000, unknownCount: 0 },
      usage: { status: "known", percent: 80, covered: 800, total: 1_000, unknownCount: 0 },
      models: { status: "known", percent: 100, covered: 3, total: 3, unknownCount: 0 },
    },
    constraints: [
      {
        id: "claude-max-20x@2026-04-01:request_limit",
        label: "Requests",
        kind: "request_limit",
        unit: "requests",
        window: { kind: "rolling", description: "rolling PT5H" },
        exceed: "latch_until_reset",
        status: "exceeded",
        limitUnits: "600",
        consumedUnits: "600",
        attemptedUnits: "900",
        violationCount: 2,
        rejectedEvents: 100,
        indeterminateEvents: 0,
        eligibleEvents: 1_000,
      },
    ],
    violations: [
      {
        type: "rolling_window_exceeded",
        constraintId: "claude-max-20x@2026-04-01:request_limit",
        unit: "requests",
        startedAt: "2026-08-12T09:15:00.000Z",
        endedAt: "2026-08-12T14:15:00.000Z",
        affectedEvents: 100,
        requiredUnits: "900",
        availableUnits: "600",
        acceptedUnits: "600",
      },
    ],
    unsupportedModels: [
      { rawName: "some-unmapped-model", eventCount: 12, reason: "not_supported" },
    ],
    economics: {
      basePlanCost: { amount: "20.00", currency: "USD" },
      targetCost: { amount: "20.00", currency: "USD" },
      costBasis: "fixed_plan_price",
    },
    assumptions: [{ id: "rules_as_of", description: "Rules resolved at the replay instant." }],
    confidence: {
      level: "medium",
      factors: [{ id: "coverage", level: "medium", description: "Partial request coverage." }],
    },
    warnings: [{ code: "LATCH_TRIGGERED", message: "A latch_until_reset rule triggered." }],
    versions: {
      engine: "0.0.2",
      schema: 1,
      catalog: "2026.09.1",
      methodology: "1.1.0",
      rulesAsOf: "2026-09-21",
      targetType: "subscription",
      targetReference: "claude-max-20x@2026-04-01",
    },
    subscription: {
      planId: "claude-max-20x",
      planVersionId: "claude-max-20x@2026-04-01",
      name: "Claude Max 20x",
      providerId: "anthropic",
      price: { amount: "200.00", currency: "USD" },
      interval: "month",
      verificationStatus: "verified",
    },
  };
}

const BASE_OPTIONS = { target, includeRange: false, includeSessions: false } as const;

describe("toShareSnapshot", () => {
  it("produces a snapshot with no forbidden field", () => {
    const snapshot = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(findForbiddenFields(snapshot)).toEqual([]);
  });

  it("carries exactly the documented key set", () => {
    const snapshot = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        "confidence",
        "constraints",
        "coverage",
        "economics",
        "feasibility",
        "target",
        "version",
        "versions",
        "violations",
        "workload",
      ].sort(),
    );
    expect(Object.keys(snapshot.workload).sort()).toEqual(
      ["eventCount", "modelCount", "rangeIncluded", "tokenTotals"].sort(),
    );
    expect(Object.keys(snapshot.target).sort()).toEqual(
      [
        "lastVerifiedAt",
        "planId",
        "planName",
        "planVersionId",
        "price",
        "providerId",
        "providerName",
        "sources",
        "type",
        "verificationStatus",
      ].sort(),
    );
  });

  it("omits the date range and session count unless the sharer elects them", () => {
    const without = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(without.workload.rangeIncluded).toBe(false);
    expect(without.workload.from).toBeUndefined();
    expect(without.workload.to).toBeUndefined();
    expect(without.workload.sessionCount).toBeUndefined();

    const withBoth = toShareSnapshot(sampleResult(), {
      target,
      includeRange: true,
      includeSessions: true,
    });
    expect(withBoth.workload.rangeIncluded).toBe(true);
    expect(withBoth.workload.from).toBe("2026-08-01T00:00:00.000Z");
    expect(withBoth.workload.sessionCount).toBe(40);
  });

  it("reduces violation windows to date granularity", () => {
    const snapshot = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(snapshot.violations[0]?.startedOn).toBe("2026-08-12");
    expect(snapshot.violations[0]?.endedOn).toBe("2026-08-12");
    expect(JSON.stringify(snapshot)).not.toContain("09:15");
  });

  it("keeps unknown token categories absent instead of zero", () => {
    const snapshot = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(snapshot.workload.tokenTotals.cacheWriteTokens).toBeUndefined();
    expect(snapshot.workload.tokenTotals.reasoningTokens).toBeUndefined();
    expect(snapshot.workload.tokenTotals.cacheReadTokens).toBe(900_000);
  });

  it("does not publish unsupported model names or warnings", () => {
    const snapshot = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    const text = JSON.stringify(snapshot);
    expect(text).not.toContain("some-unmapped-model");
    expect(text).not.toContain("LATCH_TRIGGERED");
    expect(text).not.toContain("assumptions");
  });

  it("includes attribution only when it is supplied", () => {
    const without = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(without.attribution).toBeUndefined();
    const withAttribution = toShareSnapshot(sampleResult(), {
      ...BASE_OPTIONS,
      attribution: [{ name: "Claude Code", eventCount: 700, tokenShare: "0.71" }],
    });
    expect(withAttribution.attribution?.sources[0]?.name).toBe("Claude Code");
  });

  it("is deterministic for the same result", () => {
    const first = JSON.stringify(toShareSnapshot(sampleResult(), BASE_OPTIONS));
    const second = JSON.stringify(toShareSnapshot(sampleResult(), BASE_OPTIONS));
    expect(first).toBe(second);
  });

  it("keeps the target facts the public page needs", () => {
    const snapshot = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(snapshot.target.planName).toBe("Claude Max 20x");
    expect(snapshot.target.providerName).toBe("Anthropic");
    expect(snapshot.target.sources).toHaveLength(1);
    expect(snapshot.target.lastVerifiedAt).toBe("2026-04-01");
    expect(snapshot.versions.targetReference).toBe("claude-max-20x@2026-04-01");
  });

  /**
   * Regression (benchmark F011): a share link carries its target inside the
   * token, so a demo plan reaches a public page without ever being filtered by
   * the public catalog read model. The snapshot now says so, and the public page
   * labels the whole result as demo data.
   */
  it("marks a synthetic demo target and leaves a real target unmarked", () => {
    const real = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(real.synthetic).toBeUndefined();

    const demo = toShareSnapshot(sampleResult(), { ...BASE_OPTIONS, target: syntheticTarget });
    expect(demo.synthetic).toBe(true);
  });

  /**
   * Regression (benchmark F009): the bounded lists used to be sliced with no
   * marker, so a truncated artifact read as a complete one.
   */
  it("records which bounded list had to be cut, and stays silent when none was", () => {
    const complete = toShareSnapshot(sampleResult(), BASE_OPTIONS);
    expect(complete.truncation).toBeUndefined();

    const result = sampleResult();
    const [firstConstraint] = result.constraints;
    const [firstViolation] = result.violations;
    if (firstConstraint === undefined || firstViolation === undefined) {
      throw new Error("fixture must carry at least one constraint and violation");
    }
    const many = {
      ...result,
      constraints: Array.from({ length: 30 }, (_, index) => ({
        ...firstConstraint,
        id: `constraint-${index}`,
      })),
      violations: Array.from({ length: 70 }, (_, index) => ({
        ...firstViolation,
        constraintId: `constraint-${index}`,
      })),
      confidence: {
        level: result.confidence.level,
        factors: Array.from({ length: 20 }, (_, index) => ({
          id: `factor-${index}`,
          level: "high" as const,
          description: `Factor ${index}.`,
        })),
      },
    } satisfies ExecutionReplayResultV1;
    const snapshot = toShareSnapshot(many, {
      ...BASE_OPTIONS,
      attribution: Array.from({ length: 30 }, (_, index) => ({
        name: `Source ${index}`,
        eventCount: index,
      })),
    });
    expect(snapshot.truncation).toEqual({
      constraints: 30,
      violations: 70,
      confidenceFactors: 20,
      attributionSources: 30,
    });
    // The snapshot is still bounded: the marker describes what was left out.
    expect(snapshot.constraints).toHaveLength(24);
    expect(snapshot.violations).toHaveLength(64);
  });

  /**
   * Regression (benchmark F010): constraint and violation quantities are computed
   * by the engine and carry the computed envelope (up to 100 digits), not the
   * input envelope the share schema used to demand.
   */
  it("shares a result whose computed quantities exceed the input decimal envelope", () => {
    const result = sampleResult();
    const wide = "9".repeat(30);
    const [firstConstraint] = result.constraints;
    const [firstViolation] = result.violations;
    if (firstConstraint === undefined || firstViolation === undefined) {
      throw new Error("fixture must carry at least one constraint and violation");
    }
    const computed = {
      ...result,
      constraints: [{ ...firstConstraint, consumedUnits: wide, attemptedUnits: wide }],
      violations: [{ ...firstViolation, requiredUnits: wide, acceptedUnits: wide }],
    } satisfies ExecutionReplayResultV1;
    const snapshot = toShareSnapshot(computed, BASE_OPTIONS);
    expect(snapshot.constraints[0]?.consumedUnits).toBe(wide);
    expect(snapshot.violations[0]?.requiredUnits).toBe(wide);
  });
});
