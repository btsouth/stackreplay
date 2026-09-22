import type {
  ExecutionReplayResultV1,
  MeasurementUnitV1,
  VerificationStatusV1,
} from "@stackreplay/schema";
import { assertNoForbiddenFields, type ShareReplaySnapshotV1 } from "@stackreplay/share";

/**
 * Replay result -> share snapshot projection (M4, decision 32).
 *
 * This is the privacy boundary of sharing: everything a public link can ever
 * show passes through this one function. It is deliberately a whitelist. It
 * reads named fields off the result and constructs a new object, so a field
 * added to the replay result later cannot leak by default, and it asserts the
 * result carries no forbidden field before returning.
 *
 * Nothing here is measured from the user's data beyond what the replay already
 * computed, and nothing is inferred.
 */

/** The target facts a share snapshot needs, resolved from the catalog. */
export interface ShareTargetFacts {
  planId: string;
  planVersionId: string;
  planName: string;
  providerId: string;
  providerName: string;
  price: { currency: "USD"; amount: string; interval: "month" | "year" };
  verificationStatus: VerificationStatusV1;
  lastVerifiedAt: string;
  sources: readonly { url: string; title: string }[];
}

export interface ShareAttributionFacts {
  name: string;
  eventCount: number;
  tokenShare?: string;
}

export interface ShareSnapshotOptions {
  target: ShareTargetFacts;
  /** Include the aggregate date range. Off by default: it is the sharer's call. */
  includeRange: boolean;
  /** Include the session count. Off by default. */
  includeSessions: boolean;
  /** Per-source aggregates, only when the sharer chooses to publish them. */
  attribution?: readonly ShareAttributionFacts[];
  /** Coverage percentages are published only when the engine determined them. */
  engineVersion?: string;
}

const dateOnly = (timestamp: string): string => timestamp.slice(0, 10);

function unitOf(kind: string, unit: MeasurementUnitV1): MeasurementUnitV1 {
  if (kind === "credit_pool") return "usd";
  return unit;
}

export function toShareSnapshot(
  result: ExecutionReplayResultV1,
  options: ShareSnapshotOptions,
): ShareReplaySnapshotV1 {
  const { target } = options;
  const subscription = result.subscription;

  const tokenTotals = {
    ...(result.workload.tokenTotals.inputTokens === undefined
      ? {}
      : { inputTokens: result.workload.tokenTotals.inputTokens }),
    ...(result.workload.tokenTotals.cacheReadTokens === undefined
      ? {}
      : { cacheReadTokens: result.workload.tokenTotals.cacheReadTokens }),
    ...(result.workload.tokenTotals.cacheWriteTokens === undefined
      ? {}
      : { cacheWriteTokens: result.workload.tokenTotals.cacheWriteTokens }),
    ...(result.workload.tokenTotals.outputTokens === undefined
      ? {}
      : { outputTokens: result.workload.tokenTotals.outputTokens }),
    ...(result.workload.tokenTotals.reasoningTokens === undefined
      ? {}
      : { reasoningTokens: result.workload.tokenTotals.reasoningTokens }),
  };

  const snapshot: ShareReplaySnapshotV1 = {
    version: 1,
    workload: {
      eventCount: result.workload.eventCount,
      ...(options.includeSessions && result.workload.sessionCount !== undefined
        ? { sessionCount: result.workload.sessionCount }
        : {}),
      modelCount: result.workload.modelCount,
      tokenTotals,
      rangeIncluded: options.includeRange,
      ...(options.includeRange && result.workload.from !== undefined
        ? { from: result.workload.from }
        : {}),
      ...(options.includeRange && result.workload.to !== undefined
        ? { to: result.workload.to }
        : {}),
    },
    target: {
      type: "subscription",
      planId: subscription?.planId ?? target.planId,
      planVersionId: subscription?.planVersionId ?? target.planVersionId,
      planName: subscription?.name ?? target.planName,
      providerId: subscription?.providerId ?? target.providerId,
      providerName: target.providerName,
      price: {
        currency: target.price.currency,
        amount: subscription?.price.amount ?? target.price.amount,
        interval: subscription?.interval ?? target.price.interval,
      },
      verificationStatus: subscription?.verificationStatus ?? target.verificationStatus,
      lastVerifiedAt: target.lastVerifiedAt,
      sources: target.sources.slice(0, 8).map((source) => ({
        url: source.url,
        title: source.title,
      })),
    },
    feasibility: {
      status: result.feasibility.status,
      ...(result.feasibility.coveragePercent === undefined
        ? {}
        : { coveragePercent: result.feasibility.coveragePercent }),
      coverageDimension: result.feasibility.coverageDimension,
      ...(result.feasibility.reason === undefined ? {} : { reason: result.feasibility.reason }),
    },
    coverage: {
      requests: result.coverage.requests,
      usage: result.coverage.usage,
      models: result.coverage.models,
    },
    constraints: result.constraints.slice(0, 24).map((constraint) => ({
      id: constraint.id,
      label: constraint.label,
      kind: constraint.kind,
      unit: unitOf(constraint.kind, constraint.unit),
      window: { kind: constraint.window.kind, description: constraint.window.description },
      exceed: constraint.exceed,
      status: constraint.status,
      limitUnits: constraint.limitUnits,
      consumedUnits: constraint.consumedUnits,
      attemptedUnits: constraint.attemptedUnits,
      violationCount: constraint.violationCount,
      rejectedEvents: constraint.rejectedEvents,
      ...(constraint.overageUnits === undefined ? {} : { overageUnits: constraint.overageUnits }),
    })),
    violations: result.violations.slice(0, 64).map((violation) => ({
      constraintId: violation.constraintId,
      type: violation.type,
      startedOn: dateOnly(violation.startedAt),
      endedOn: dateOnly(violation.endedAt),
      unit: violation.unit,
      requiredUnits: violation.requiredUnits,
      availableUnits: violation.availableUnits,
      acceptedUnits: violation.acceptedUnits,
      affectedEvents: violation.affectedEvents,
      ...(violation.overageUnits === undefined ? {} : { overageUnits: violation.overageUnits }),
    })),
    ...(result.economics === undefined
      ? {}
      : {
          economics: {
            ...(result.economics.basePlanCost === undefined
              ? {}
              : { basePlanCost: result.economics.basePlanCost }),
            ...(result.economics.overageCost === undefined
              ? {}
              : { overageCost: result.economics.overageCost }),
            targetCost: result.economics.targetCost,
            costBasis: result.economics.costBasis,
            ...(result.economics.apiListPriceEquivalent === undefined
              ? {}
              : { apiListPriceEquivalent: result.economics.apiListPriceEquivalent }),
            ...(result.economics.ratios === undefined ? {} : { ratios: result.economics.ratios }),
          },
        }),
    confidence: {
      level: result.confidence.level,
      factors: result.confidence.factors.slice(0, 12).map((factor) => ({
        id: factor.id,
        level: factor.level,
        description: factor.description,
      })),
    },
    ...(options.attribution === undefined || options.attribution.length === 0
      ? {}
      : {
          attribution: {
            sources: options.attribution.slice(0, 24).map((source) => ({
              name: source.name,
              eventCount: source.eventCount,
              ...(source.tokenShare === undefined ? {} : { tokenShare: source.tokenShare }),
            })),
          },
        }),
    versions: {
      engine: result.versions.engine,
      schema: 1,
      catalog: result.versions.catalog,
      methodology: result.versions.methodology,
      rulesAsOf: result.versions.rulesAsOf,
      targetReference: result.versions.targetReference,
    },
  };

  assertNoForbiddenFields(snapshot);
  return snapshot;
}
