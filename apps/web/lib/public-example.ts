import type { ShareReplaySnapshotV1 } from "@stackreplay/share";
import type { PublicPlanSummary } from "./public-catalog";

/**
 * Public worked example (M4).
 *
 * The public site must show what a replay result looks like without publishing
 * anyone's real workload. This module builds a synthetic workload against a
 * *real* catalog plan: the plan's price, limits, windows and provenance are the
 * catalog's own facts, and only the consumption numbers are made up. The result
 * is labelled as a synthetic example wherever it is rendered, and it is
 * deterministic, so the same example produces the same share token.
 */

const EXAMPLE_RANGE = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-08-31T00:00:00.000Z",
} as const;

const EXAMPLE_WORKLOAD = {
  eventCount: 4_812,
  sessionCount: 96,
  modelCount: 3,
  tokenTotals: {
    inputTokens: 18_402_119,
    cacheReadTokens: 142_880_400,
    outputTokens: 6_118_240,
  },
} as const;

function knownCoverage(covered: number, total: number) {
  return {
    status: "known" as const,
    percent: total === 0 ? 100 : Math.round((covered / total) * 100 * 10000) / 10000,
    covered,
    total,
  };
}

/**
 * Deterministic synthetic consumption for one limit: limits the example does not
 * intend to breach land at 62% of the allowance, and the first breaching limit
 * lands at 148%.
 */
function syntheticConsumption(
  limitAmount: string,
  index: number,
): { consumed: string; attempted: string } {
  const amount = Number(limitAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { consumed: limitAmount, attempted: limitAmount };
  }
  const ratio = index === 0 ? 1.48 : 0.62;
  const attempted = Math.round(amount * ratio);
  return {
    consumed: `${Math.min(attempted, amount)}`,
    attempted: `${attempted}`,
  };
}

export interface ExampleSnapshotOptions {
  plan: PublicPlanSummary;
  /** Catalog version string, recorded in the snapshot's version block. */
  catalogVersion: string;
  engineVersion: string;
  methodologyVersion: string;
  asOf: string;
}

export function buildExampleSnapshot({
  plan,
  catalogVersion,
  engineVersion,
  methodologyVersion,
  asOf,
}: ExampleSnapshotOptions): ShareReplaySnapshotV1 {
  const constraints = plan.limits.slice(0, 6).map((limit, index) => {
    const { consumed, attempted } = syntheticConsumption(limit.amount, index);
    const exceeded = Number(attempted) > Number(limit.amount);
    return {
      id: `${plan.id}:${limit.id}`,
      label: limit.label,
      kind: limit.type,
      unit:
        limit.type === "credit_pool"
          ? ("usd" as const)
          : limit.type === "token_limit"
            ? ("tokens" as const)
            : ("requests" as const),
      window: {
        kind: limit.window.type === "rolling" ? ("rolling" as const) : ("calendar" as const),
        description:
          limit.window.type === "rolling"
            ? `rolling ${limit.window.duration}`
            : `calendar ${limit.window.unit}`,
      },
      exceed: limit.exceed,
      status: exceeded ? ("exceeded" as const) : ("pass" as const),
      limitUnits: limit.amount,
      consumedUnits: consumed,
      attemptedUnits: attempted,
      violationCount: exceeded ? 2 : 0,
      rejectedEvents: exceeded ? Number(attempted) - Number(limit.amount) : 0,
    };
  });

  const violations = constraints
    .filter((constraint) => constraint.status === "exceeded")
    .map((constraint) => ({
      constraintId: constraint.id,
      type: constraint.kind,
      startedOn: "2026-08-11",
      endedOn: "2026-08-11",
      unit: constraint.unit,
      requiredUnits: constraint.attemptedUnits,
      availableUnits: constraint.limitUnits,
      acceptedUnits: constraint.consumedUnits,
      affectedEvents: constraint.rejectedEvents,
    }));

  // Coverage percentages are derived from the counts, never written by hand: the
  // schema requires a known dimension's percentage to match its own numerator and
  // denominator exactly.
  const requestCoverage = knownCoverage(
    Math.round(EXAMPLE_WORKLOAD.eventCount * 0.94),
    EXAMPLE_WORKLOAD.eventCount,
  );
  const usageCoverage = knownCoverage(
    Math.round(EXAMPLE_WORKLOAD.eventCount * 0.88),
    EXAMPLE_WORKLOAD.eventCount,
  );
  const modelCoverage = knownCoverage(EXAMPLE_WORKLOAD.modelCount, EXAMPLE_WORKLOAD.modelCount);

  return {
    version: 1,
    workload: {
      eventCount: EXAMPLE_WORKLOAD.eventCount,
      sessionCount: EXAMPLE_WORKLOAD.sessionCount,
      modelCount: EXAMPLE_WORKLOAD.modelCount,
      tokenTotals: EXAMPLE_WORKLOAD.tokenTotals,
      rangeIncluded: true,
      from: EXAMPLE_RANGE.from,
      to: EXAMPLE_RANGE.to,
    },
    target: {
      type: "subscription",
      planId: plan.id,
      planVersionId: plan.versionId,
      planName: plan.name,
      providerId: plan.providerId,
      providerName: plan.providerName,
      price: {
        currency: plan.price.currency,
        amount: plan.price.amount,
        interval: plan.price.interval,
      },
      verificationStatus: plan.verificationStatus,
      lastVerifiedAt: plan.lastVerifiedAt,
      sources: plan.sources.slice(0, 4).map((source) => ({
        url: source.url,
        title: source.title,
      })),
    },
    feasibility: {
      status: constraints.some((constraint) => constraint.status === "exceeded")
        ? "partial"
        : "full",
      coveragePercent: requestCoverage.percent,
      coverageDimension: "requests",
    },
    coverage: {
      requests: requestCoverage,
      usage: usageCoverage,
      models: modelCoverage,
    },
    constraints,
    violations,
    economics: {
      targetCost: { amount: plan.price.amount, currency: plan.price.currency },
      costBasis: "fixed_plan_price",
    },
    confidence: {
      level: "medium",
      factors: [
        {
          id: "plan_rules",
          level: plan.verificationStatus === "verified" ? "high" : "medium",
          description: `Plan rules are ${plan.verificationStatus} as of ${plan.lastVerifiedAt}.`,
        },
        {
          id: "workload_shape",
          level: "medium",
          description:
            "Synthetic workload shape: consumption numbers are illustrative, not measured.",
        },
      ],
    },
    versions: {
      engine: engineVersion,
      schema: 1,
      catalog: catalogVersion,
      methodology: methodologyVersion,
      rulesAsOf: asOf,
      targetReference: plan.versionId,
    },
  };
}
