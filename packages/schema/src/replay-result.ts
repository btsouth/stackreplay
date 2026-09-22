import { z } from "zod";
import { executionTargetV1Schema } from "./execution-target.js";
import { computedMoneyV1Schema, computedSignedMoneyV1Schema, moneyV1Schema } from "./money.js";
import { replaySemanticsV1Schema } from "./replay-semantics.js";
import {
  computedDecimalV1Schema,
  decimalSumEquals,
  isoDateV1Schema,
  isoUtcTimestampV1Schema,
  verificationStatusV1Schema,
} from "./scalars.js";

/**
 * Generalized replay result (Addendum A point 116, decisions 1-4, 13-20).
 *
 * There is one canonical result type at version 1. Subscription-specific
 * detail nests beneath it; there is no subscription-only root result and no
 * generic `savings` field. Coverage is reported as separate named dimensions,
 * never blended into one score, and a dimension that depends on unknown data
 * reports that it is unknown instead of guessing a percentage.
 */

/**
 * Measurement units are enumerated so incompatible units cannot be silently
 * mixed (decision 20). `usd` is the currency unit of the v1 schemas.
 */
export const measurementUnitV1Schema = z.enum(["tokens", "requests", "usd"]);
export type MeasurementUnitV1 = z.infer<typeof measurementUnitV1Schema>;

/**
 * One coverage dimension. `known` carries a percentage over a fully known
 * numerator and denominator; `unknown` carries no percentage, only a reason
 * and the count of quantities whose status could not be determined.
 */
export const coverageDimensionV1Schema = z
  .strictObject({
    status: z.enum(["known", "unknown"]),
    percent: z.number().min(0).max(100).optional(),
    covered: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
    /**
     * Quantities excluded because their status could not be determined, in the
     * same unit as `covered`/`total` (models for the model dimension, events for
     * requests). A quantity that cannot be expressed in that unit is described in
     * `reason` instead, never counted in a different one (benchmark finding F033).
     */
    unknownCount: z.number().int().nonnegative().optional(),
    reason: z.string().min(1).optional(),
  })
  .superRefine((dimension, ctx) => {
    if (dimension.status === "known") {
      if (
        dimension.percent === undefined ||
        dimension.covered === undefined ||
        dimension.total === undefined
      ) {
        ctx.addIssue({
          code: "custom",
          message: "a known coverage dimension requires percent, covered and total",
        });
      }
      if (
        dimension.covered !== undefined &&
        dimension.total !== undefined &&
        dimension.percent !== undefined
      ) {
        const expected =
          dimension.total === 0
            ? 100
            : Math.round((dimension.covered / dimension.total) * 100 * 10000) / 10000;
        if (
          dimension.covered > dimension.total ||
          dimension.percent !== expected ||
          (dimension.unknownCount ?? 0) !== 0
        ) {
          ctx.addIssue({
            code: "custom",
            message: "known coverage must match its complete numerator and denominator",
          });
        }
      }
      return;
    }
    if (dimension.percent !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["percent"],
        message: "an unknown coverage dimension must not report a percentage",
      });
    }
    if (dimension.reason === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "an unknown coverage dimension requires a reason",
      });
    }
  });
export type CoverageDimensionV1 = z.infer<typeof coverageDimensionV1Schema>;

export const coverageDimensionsV1Schema = z.strictObject({
  /** Historical request coverage: events the target would have served. */
  requests: coverageDimensionV1Schema,
  /** Usage coverage: token-weighted over disjoint, known token quantities. */
  usage: coverageDimensionV1Schema,
  /** Model coverage: distinct models the target supports. */
  models: coverageDimensionV1Schema,
});
export type CoverageDimensionsV1 = z.infer<typeof coverageDimensionsV1Schema>;

export const feasibilityV1Schema = z.strictObject({
  status: z.enum(["full", "partial", "none", "unknown"]),
  /**
   * A named dimension, never a blended score: for subscription replay this is
   * historical request coverage (decision 3). Absent when that dimension is
   * unknown (decision 16).
   */
  coveragePercent: z.number().min(0).max(100).optional(),
  coverageDimension: z.literal("requests"),
  /** Why the headline dimension is unknown, when it is. */
  reason: z.string().min(1).optional(),
});
export type FeasibilityV1 = z.infer<typeof feasibilityV1Schema>;

export const constraintKindV1Schema = z.enum(["credit_pool", "token_limit", "request_limit"]);
export type ConstraintKindV1 = z.infer<typeof constraintKindV1Schema>;

/** Explicit exceed behavior per rule (decision 14). No hidden global default. */
export const constraintExceedV1Schema = z.enum([
  "reject_request",
  "latch_until_reset",
  "allow_overage",
  "record_only",
]);
export type ConstraintExceedV1 = z.infer<typeof constraintExceedV1Schema>;

export const constraintStatusV1Schema = z.enum(["pass", "exceeded", "unknown", "not_applicable"]);
export type ConstraintStatusV1 = z.infer<typeof constraintStatusV1Schema>;

export const constraintResultV1Schema = z
  .strictObject({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: constraintKindV1Schema,
    unit: measurementUnitV1Schema,
    window: z.strictObject({
      kind: z.enum(["rolling", "calendar"]),
      description: z.string().min(1),
    }),
    exceed: constraintExceedV1Schema,
    status: constraintStatusV1Schema,
    /** Decimal strings in the declared unit; token consumption can be multiplier-adjusted. */
    limitUnits: computedDecimalV1Schema,
    /** Accepted consumption: units the simulated target actually served. */
    consumedUnits: computedDecimalV1Schema,
    /** Attempted demand: units the workload offered, rejected events included. */
    attemptedUnits: computedDecimalV1Schema,
    violationCount: z.number().int().nonnegative(),
    /** Events this constraint rejected (not served). */
    rejectedEvents: z.number().int().nonnegative(),
    /** Events whose required consumption was unknown for this constraint. */
    indeterminateEvents: z.number().int().nonnegative(),
    /** Events the constraint applies to at all. */
    eligibleEvents: z.number().int().nonnegative(),
    /** Units above included capacity, for allow_overage and record_only rules. */
    overageUnits: computedDecimalV1Schema.optional(),
    /** Billed overage for allow_overage rules. */
    overageCost: computedMoneyV1Schema.optional(),
    /** Present when the constraint applies to specific models only. */
    modelIds: z.array(z.string().min(1)).optional(),
  })
  .superRefine((constraint, ctx) => {
    const expectedUnit = { credit_pool: "usd", token_limit: "tokens", request_limit: "requests" }[
      constraint.kind
    ];
    if (constraint.unit !== expectedUnit)
      ctx.addIssue({ code: "custom", path: ["unit"], message: "unit must match constraint kind" });
    if (constraint.overageCost !== undefined && constraint.exceed !== "allow_overage")
      ctx.addIssue({ code: "custom", message: "only allow_overage rules bill overage" });
    if (constraint.overageCost !== undefined && constraint.overageUnits === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["overageCost"],
        message: "overageCost requires overageUnits",
      });
    }
    if (constraint.overageUnits !== undefined && constraint.exceed === "reject_request") {
      ctx.addIssue({
        code: "custom",
        path: ["overageUnits"],
        message: "reject_request rules cannot produce overage units",
      });
    }
  });
export type ConstraintResultV1 = z.infer<typeof constraintResultV1Schema>;

export const replayViolationV1Schema = z.strictObject({
  type: z.enum(["rolling_window_exceeded", "calendar_window_exceeded"]),
  constraintId: z.string().min(1),
  unit: measurementUnitV1Schema,
  startedAt: isoUtcTimestampV1Schema,
  endedAt: isoUtcTimestampV1Schema,
  /** Events in this window the constraint did not serve. */
  affectedEvents: z.number().int().nonnegative(),
  /** Attempted demand in the window. */
  requiredUnits: computedDecimalV1Schema,
  availableUnits: computedDecimalV1Schema,
  /** Accepted consumption actually served inside the window. */
  acceptedUnits: computedDecimalV1Schema,
  /** Units above included capacity, when the rule allows them. */
  overageUnits: computedDecimalV1Schema.optional(),
  modelIds: z.array(z.string().min(1)).optional(),
});
export type ReplayViolationV1 = z.infer<typeof replayViolationV1Schema>;

export const unsupportedModelV1Schema = z.strictObject({
  rawName: z.string().min(1),
  canonicalId: z.string().min(1).optional(),
  eventCount: z.number().int().positive(),
  reason: z.enum(["not_supported", "excluded", "unresolved"]),
});
export type UnsupportedModelV1 = z.infer<typeof unsupportedModelV1Schema>;

/**
 * Economics use precise concepts and named counterfactuals (decisions 4, 19).
 * `targetCost` is the total simulated cost of the workload on the target:
 * base plan cost plus any billed overage. There is deliberately no generic
 * `savings` field, and a cost difference is signed.
 */
export const economicsV1Schema = z
  .strictObject({
    /** Fixed subscription price for the plan version, when the target is a subscription. */
    basePlanCost: computedMoneyV1Schema.optional(),
    /** Billed consumption above included capacity. */
    overageCost: computedMoneyV1Schema.optional(),
    /** Total simulated target cost: base plus overage where applicable. */
    targetCost: computedMoneyV1Schema,
    costBasis: z.enum(["fixed_plan_price", "fixed_plan_price_plus_overage", "api_list_price"]),
    baselineCost: computedMoneyV1Schema.optional(),
    /** targetCost - baselineCost; negative means the target costs less. */
    costDifference: computedSignedMoneyV1Schema.optional(),
    apiListPriceEquivalent: computedMoneyV1Schema.optional(),
    ratios: z
      .array(z.strictObject({ name: z.string().min(1), value: z.string().min(1) }))
      .optional(),
  })
  .superRefine((economics, ctx) => {
    if (
      economics.costBasis !== "api_list_price" &&
      (economics.basePlanCost === undefined ||
        !decimalSumEquals(
          economics.basePlanCost.amount,
          economics.overageCost?.amount ?? "0",
          economics.targetCost.amount,
        ))
    )
      ctx.addIssue({
        code: "custom",
        message: "targetCost must equal basePlanCost plus overageCost",
      });
    if (
      economics.costBasis === "fixed_plan_price_plus_overage" &&
      economics.overageCost === undefined
    )
      ctx.addIssue({ code: "custom", message: "overage basis requires overageCost" });
    if (
      economics.costDifference !== undefined &&
      economics.baselineCost !== undefined &&
      !decimalSumEquals(
        economics.baselineCost.amount,
        economics.costDifference.amount,
        economics.targetCost.amount,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "costDifference must equal targetCost minus baselineCost",
      });

    if (economics.costDifference !== undefined && economics.baselineCost === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["costDifference"],
        message: "costDifference requires baselineCost",
      });
    }
    if (
      economics.overageCost !== undefined &&
      economics.costBasis !== "fixed_plan_price_plus_overage"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["overageCost"],
        message: "overageCost requires the fixed_plan_price_plus_overage cost basis",
      });
    }
  });
export type EconomicsV1 = z.infer<typeof economicsV1Schema>;

export const replayAssumptionV1Schema = z.strictObject({
  id: z.string().min(1),
  description: z.string().min(1),
});
export type ReplayAssumptionV1 = z.infer<typeof replayAssumptionV1Schema>;

export const replayWarningV1Schema = z.strictObject({
  code: z.string().min(1),
  message: z.string().min(1),
  eventCount: z.number().int().nonnegative().optional(),
});
export type ReplayWarningV1 = z.infer<typeof replayWarningV1Schema>;

export const replayConfidenceV1Schema = z.strictObject({
  level: z.enum(["high", "medium", "low"]),
  factors: z.array(
    z.strictObject({
      id: z.string().min(1),
      level: z.enum(["high", "medium", "low"]),
      description: z.string().min(1),
    }),
  ),
});
export type ReplayConfidenceV1 = z.infer<typeof replayConfidenceV1Schema>;

/**
 * Reproducibility metadata (spec point 19, Addendum A point 175, decisions 2,
 * 17, 20). Generalized on purpose: it does not require a subscription-specific
 * id, so future api, local and hybrid targets record the same shape.
 *
 * M4B pins the translation policy alongside the other versions. Model
 * resolution is pinned by the catalog version: catalog model ids and declared
 * aliases are catalog data, and the resolution order itself is fixed by the
 * engine's methodology version.
 */
export const replayVersionsV1Schema = z.strictObject({
  engine: z.string().min(1),
  /** Result schema version this document conforms to. */
  schema: z.literal(1),
  catalog: z.string().min(1),
  /** Semantic revision of the replay rules applied to this result. */
  methodology: z.string().min(1),
  /** The explicit rule instant used to resolve current rules. */
  rulesAsOf: isoDateV1Schema,
  targetType: z.enum(["subscription", "api", "local", "hybrid"]),
  /** Resolved target reference: the plan version for subscription targets. */
  targetReference: z.string().min(1),
  /** Pricing references used by this replay, when applicable. */
  pricingReferences: z.array(z.string().min(1)).optional(),
  /** Translation policy used by this replay, when one was supplied. */
  translationPolicy: z
    .strictObject({ id: z.string().min(1), version: z.string().min(1) })
    .optional(),
});
export type ReplayVersionsV1 = z.infer<typeof replayVersionsV1Schema>;

/** Disjoint normalized token totals; omitted when workload consumption is incomplete. */
export const tokenTotalsV1Schema = z.strictObject({
  inputTokens: z.number().int().nonnegative().optional(),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  reasoningTokens: z.number().int().nonnegative().optional(),
});
export type TokenTotalsV1 = z.infer<typeof tokenTotalsV1Schema>;

export const workloadSummaryV1Schema = z.strictObject({
  eventCount: z.number().int().nonnegative(),
  /** Absent for an empty workload. */
  from: isoUtcTimestampV1Schema.optional(),
  to: isoUtcTimestampV1Schema.optional(),
  modelCount: z.number().int().nonnegative(),
  sessionCount: z.number().int().nonnegative().optional(),
  /** Disjoint bucket totals; empty when any event has incomplete consumption. */
  tokenTotals: tokenTotalsV1Schema,
});
export type WorkloadSummaryV1 = z.infer<typeof workloadSummaryV1Schema>;

/** Subscription-specific detail nested beneath the generalized result. */
export const subscriptionReplayDetailV1Schema = z.strictObject({
  planId: z.string().min(1),
  planVersionId: z.string().min(1),
  name: z.string().min(1),
  providerId: z.string().min(1),
  price: moneyV1Schema,
  interval: z.enum(["month", "year"]),
  verificationStatus: verificationStatusV1Schema,
});
export type SubscriptionReplayDetailV1 = z.infer<typeof subscriptionReplayDetailV1Schema>;

export const executionReplayResultV1Schema = z
  .strictObject({
    version: z.literal(1),
    workload: workloadSummaryV1Schema,
    target: executionTargetV1Schema,
    feasibility: feasibilityV1Schema,
    coverage: coverageDimensionsV1Schema,
    constraints: z.array(constraintResultV1Schema),
    violations: z.array(replayViolationV1Schema),
    unsupportedModels: z.array(unsupportedModelV1Schema),
    economics: economicsV1Schema.optional(),
    assumptions: z.array(replayAssumptionV1Schema),
    confidence: replayConfidenceV1Schema,
    warnings: z.array(replayWarningV1Schema),
    versions: replayVersionsV1Schema,
    subscription: subscriptionReplayDetailV1Schema.optional(),
    /**
     * M4B replay semantics. Optional so every accepted M1-M4A result stays valid
     * exactly as it was; the engine always emits it, so a missing block means a
     * result produced before M4B.
     */
    semantics: replaySemanticsV1Schema.optional(),
  })
  .superRefine((result, ctx) => {
    if (result.target.type !== result.versions.targetType)
      ctx.addIssue({ code: "custom", message: "version target type must match target" });
    const requests = result.coverage.requests;
    const expectedStatus =
      requests.status === "unknown"
        ? "unknown"
        : requests.percent === 100
          ? "full"
          : requests.percent === 0
            ? "none"
            : "partial";
    if (
      result.feasibility.status !== expectedStatus ||
      result.feasibility.coveragePercent !== requests.percent
    )
      ctx.addIssue({ code: "custom", message: "feasibility must match request coverage" });
    const constraints = new Map(result.constraints.map((c) => [c.id, c]));
    if (constraints.size !== result.constraints.length)
      ctx.addIssue({ code: "custom", message: "constraint ids must be unique" });
    for (const violation of result.violations) {
      const constraint = constraints.get(violation.constraintId);
      if (constraint === undefined || constraint.unit !== violation.unit)
        ctx.addIssue({
          code: "custom",
          message: "violation must reference a constraint with the same unit",
        });
    }

    const semantics = result.semantics;
    if (semantics === undefined) return;

    // Every historical event lands in exactly one disposition, so the aggregate
    // outcome cannot quietly lose or double count demand.
    const dispositions = semantics.dispositions;
    const accounted =
      dispositions.included +
      dispositions.overage +
      dispositions.blocked +
      dispositions.unavailable +
      dispositions.unknown;
    if (accounted !== result.workload.eventCount)
      ctx.addIssue({
        code: "custom",
        path: ["semantics", "dispositions"],
        message: "dispositions must account for every replayed event exactly once",
      });

    if (semantics.targetStack.effectiveAt !== result.versions.rulesAsOf)
      ctx.addIssue({
        code: "custom",
        path: ["semantics", "targetStack", "effectiveAt"],
        message: "the target stack's effective instant is the rules instant used",
      });
    if (semantics.targetStack.catalogVersion !== result.versions.catalog)
      ctx.addIssue({
        code: "custom",
        path: ["semantics", "targetStack", "catalogVersion"],
        message: "the target stack's catalog version is the catalog this replay used",
      });

    const subscription = result.subscription;
    if (subscription !== undefined) {
      const stack = semantics.targetStack;
      if (
        stack.planId !== subscription.planId ||
        stack.planVersionId !== subscription.planVersionId ||
        stack.providerId !== subscription.providerId
      )
        ctx.addIssue({
          code: "custom",
          path: ["semantics", "targetStack"],
          message: "the target stack identifies the plan this replay simulated",
        });
    }

    const policy = semantics.targetStack.modelTranslation;
    const pinnedPolicy = result.versions.translationPolicy;
    if ((policy === undefined) !== (pinnedPolicy === undefined))
      ctx.addIssue({
        code: "custom",
        path: ["versions", "translationPolicy"],
        message: "the pinned translation policy matches the stack's translation policy",
      });
    else if (policy !== undefined && pinnedPolicy !== undefined) {
      if (policy.id !== pinnedPolicy.id || policy.version !== pinnedPolicy.version)
        ctx.addIssue({
          code: "custom",
          path: ["versions", "translationPolicy"],
          message: "the pinned translation policy identifies the policy that was applied",
        });
    }

    if (semantics.evidence.translationMethod.policyId !== undefined && policy !== undefined) {
      if (
        semantics.evidence.translationMethod.policyId !== policy.id ||
        semantics.evidence.translationMethod.policyVersion !== policy.version
      )
        ctx.addIssue({
          code: "custom",
          path: ["semantics", "evidence", "translationMethod"],
          message: "the stated translation method belongs to the policy that was applied",
        });
    }
  });
export type ExecutionReplayResultV1 = z.infer<typeof executionReplayResultV1Schema>;
