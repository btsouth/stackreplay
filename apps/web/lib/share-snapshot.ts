import type {
  ExecutionReplayResultV1,
  MeasurementUnitV1,
  VerificationStatusV1,
} from "@stackreplay/schema";
import {
  assertNoForbiddenFields,
  type ShareReplaySnapshotV1,
  snapshotIsSynthetic,
} from "@stackreplay/share";

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

/**
 * Why a result cannot be published as a V1 share link, or undefined when it can.
 *
 * A Direct API result cannot be published at all (M4C): `ShareReplaySnapshotV1`
 * carries a plan id, a plan version, a plan name and a plan price, and a Direct
 * API replay has none of those. Widening V1 would change the link format for
 * every existing reader, so this path is refused with a reason instead, exactly
 * as the M4B translated case is.
 *
 * `ShareReplaySnapshotV1` also has no field for the replay's routing assumption,
 * so a translated replay would reach a public page that can only be read as an
 * exact replay of the target's own models. M4B refuses that path instead of
 * widening V1: the link format is unchanged, and old links keep decoding exactly
 * as before (M4B plan section 14).
 *
 * The test is defense in depth. `mode` is the engine's own statement, and the
 * applied rules are what actually reached the public page's numbers, so the
 * refusal holds even if a future caller hands over a semantics block whose mode
 * and translation disagree: a substituted event or an applied rule is on its own
 * enough to keep the link closed. The target check reads `result.target` rather
 * than the semantics block, so a result whose semantics were dropped is still
 * refused.
 */
export function shareSnapshotRefusal(result: ExecutionReplayResultV1): string | undefined {
  if (result.target.type !== "subscription")
    return [
      `this is a ${result.target.type === "api" ? "Direct API" : result.target.type} replay, and a`,
      "share link carries a subscription target only: a plan id, a plan version, a plan name and a",
      "plan price. Publishing it as a subscription link would describe a plan this replay never ran against.",
    ].join(" ");
  const semantics = result.semantics;
  if (semantics === undefined) return undefined;
  const substituted = semantics.translation?.substitutedEvents ?? 0;
  const appliedRules = semantics.translation?.applied.length ?? 0;
  if (semantics.mode !== "translated" && substituted === 0 && appliedRules === 0) return undefined;
  const substitutedEvents =
    substituted > 0 ? `${substituted} event(s)` : "an unstated number of events";
  return [
    `this is a translated replay: it substitutes ${substitutedEvents} onto different models under an explicit`,
    "scenario assumption. A share link carries no way to say that, so a reader could take it as an",
    "exact replay of the target's own models.",
  ].join(" ");
}

const dateOnly = (timestamp: string): string => timestamp.slice(0, 10);

/**
 * Bounds the public snapshot carries, and the export-truncation marker.
 *
 * These are the schema's maxima. When the sharer's own result is larger, the
 * snapshot keeps the first N entries and records how many existed, so a reader
 * can tell a complete artifact from a truncated one (benchmark finding F009).
 */
const SHARE_BOUNDS = {
  sources: 8,
  constraints: 24,
  violations: 64,
  confidenceFactors: 12,
  attributionSources: 24,
  ratios: 8,
} as const;

type ShareBoundKey = keyof typeof SHARE_BOUNDS;

/**
 * The entries a snapshot records for each list that had to be cut.
 *
 * Every value is the size the sharer's own result had for that list — never the
 * number of entries left out — and a list that fits is absent entirely.
 */
function truncationOf(
  resultSizes: Partial<Record<ShareBoundKey, number>>,
): ShareReplaySnapshotV1["truncation"] {
  const cut: Partial<Record<ShareBoundKey, number>> = {};
  for (const [key, size] of Object.entries(resultSizes) as [ShareBoundKey, number | undefined][]) {
    if (size !== undefined && size > SHARE_BOUNDS[key]) cut[key] = size;
  }
  return Object.keys(cut).length === 0 ? undefined : cut;
}

function unitOf(kind: string, unit: MeasurementUnitV1): MeasurementUnitV1 {
  if (kind === "credit_pool") return "usd";
  return unit;
}

export function toShareSnapshot(
  result: ExecutionReplayResultV1,
  options: ShareSnapshotOptions,
): ShareReplaySnapshotV1 {
  const refusal = shareSnapshotRefusal(result);
  if (refusal !== undefined) throw new Error(`This result cannot be shared: ${refusal}`);
  const { target } = options;
  const subscription = result.subscription;

  // The synthetic `example-` namespace is filtered out of the public catalog read
  // model, but a share link carries its target inside the token, so the snapshot
  // must mark a synthetic target itself (benchmark finding F011). The public page
  // labels the whole result as demo data when the marker is present. Every id the
  // snapshot can carry is checked, not just the one it ends up preferring: a
  // synthetic fact must not slip in through the field the other one would have won.
  const resolvedPlanId = subscription?.planId ?? target.planId;
  const resolvedProviderId = subscription?.providerId ?? target.providerId;
  const synthetic =
    snapshotIsSynthetic({ planId: resolvedPlanId, providerId: resolvedProviderId }) ||
    snapshotIsSynthetic({ planId: target.planId, providerId: target.providerId });

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
    ...(synthetic ? { synthetic: true as const } : {}),
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
    // A bounded list that had to be cut says so, instead of reading as complete.
    ...(() => {
      const truncation = truncationOf({
        sources: target.sources.length,
        constraints: result.constraints.length,
        violations: result.violations.length,
        confidenceFactors: result.confidence.factors.length,
        ...(options.attribution === undefined
          ? {}
          : { attributionSources: options.attribution.length }),
        ...(result.economics?.ratios === undefined
          ? {}
          : { ratios: result.economics.ratios.length }),
      });
      return truncation === undefined ? {} : { truncation };
    })(),
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
