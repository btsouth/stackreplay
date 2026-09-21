import { z } from "zod";
import { executionTargetV1Schema } from "./execution-target.js";
import { moneyV1Schema } from "./money.js";
import { isoUtcTimestampV1Schema, verificationStatusV1Schema } from "./scalars.js";
import { textUsageV1Schema } from "./usage-event.js";

/**
 * Generalized replay result (Addendum A point 116, decisions 1-4).
 *
 * There is one canonical result type at version 1. Subscription-specific
 * detail nests beneath it; there is no subscription-only root result and no
 * generic `savings` field. Coverage is reported as separate named dimensions,
 * never blended into one score.
 */

export const coverageDimensionV1Schema = z.strictObject({
  /** Percentage in [0, 100], rounded deterministically by the engine. */
  percent: z.number().min(0).max(100),
  covered: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type CoverageDimensionV1 = z.infer<typeof coverageDimensionV1Schema>;

export const coverageDimensionsV1Schema = z.strictObject({
  /** Historical request coverage: events the target would have served. */
  requests: coverageDimensionV1Schema,
  /** Usage coverage: token-weighted across all token categories. */
  usage: coverageDimensionV1Schema,
  /** Model coverage: distinct models the target supports. */
  models: coverageDimensionV1Schema,
});
export type CoverageDimensionsV1 = z.infer<typeof coverageDimensionsV1Schema>;

export const feasibilityV1Schema = z.strictObject({
  status: z.enum(["full", "partial", "none", "unknown"]),
  /**
   * A named dimension, never a blended score: for subscription replay this is
   * historical request coverage (docs/ARCHITECTURE_DECISIONS.md, decision 3).
   */
  coveragePercent: z.number().min(0).max(100),
});
export type FeasibilityV1 = z.infer<typeof feasibilityV1Schema>;

export const constraintKindV1Schema = z.enum(["credit_pool", "token_limit", "request_limit"]);
export type ConstraintKindV1 = z.infer<typeof constraintKindV1Schema>;

export const constraintUnitV1Schema = z.enum(["currency", "tokens", "requests"]);
export type ConstraintUnitV1 = z.infer<typeof constraintUnitV1Schema>;

export const constraintEnforcementV1Schema = z.enum(["hard_stop", "soft", "overage", "unknown"]);
export type ConstraintEnforcementV1 = z.infer<typeof constraintEnforcementV1Schema>;

export const constraintStatusV1Schema = z.enum(["pass", "exceeded", "unknown", "not_applicable"]);
export type ConstraintStatusV1 = z.infer<typeof constraintStatusV1Schema>;

export const constraintResultV1Schema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: constraintKindV1Schema,
  unit: constraintUnitV1Schema,
  window: z.strictObject({
    kind: z.enum(["rolling", "calendar"]),
    description: z.string().min(1),
  }),
  enforcement: constraintEnforcementV1Schema,
  status: constraintStatusV1Schema,
  /** Decimal strings: money for credit pools, integer strings for counts. */
  limitUnits: z.string().min(1),
  consumedUnits: z.string().min(1),
  violationCount: z.number().int().nonnegative(),
  /** Present when the constraint applies to specific models only. */
  modelIds: z.array(z.string().min(1)).optional(),
});
export type ConstraintResultV1 = z.infer<typeof constraintResultV1Schema>;

export const replayViolationV1Schema = z.strictObject({
  type: z.enum(["rolling_window_exceeded", "calendar_window_exceeded"]),
  constraintId: z.string().min(1),
  unit: constraintUnitV1Schema,
  startedAt: isoUtcTimestampV1Schema,
  endedAt: isoUtcTimestampV1Schema,
  /** Events at and after the crossing point: blocked under a hard stop. */
  affectedEvents: z.number().int().nonnegative(),
  requiredUnits: z.string().min(1),
  availableUnits: z.string().min(1),
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
 * Economics use precise concepts and named counterfactuals (decision 4).
 * There is deliberately no generic `savings` field.
 */
export const economicsV1Schema = z.strictObject({
  targetCost: moneyV1Schema.optional(),
  costBasis: z.enum(["fixed_plan_price"]).optional(),
  baselineCost: moneyV1Schema.optional(),
  costDifference: moneyV1Schema.optional(),
  apiListPriceEquivalent: moneyV1Schema.optional(),
  ratios: z.array(z.strictObject({ name: z.string().min(1), value: z.string().min(1) })).optional(),
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

/** Reproducibility metadata (spec point 19, Addendum A point 175, decision 2). */
export const replayVersionsV1Schema = z.strictObject({
  engine: z.string().min(1),
  catalog: z.string().min(1),
  planVersionId: z.string().min(1),
});
export type ReplayVersionsV1 = z.infer<typeof replayVersionsV1Schema>;

export const workloadSummaryV1Schema = z.strictObject({
  eventCount: z.number().int().nonnegative(),
  /** Absent for an empty workload. */
  from: isoUtcTimestampV1Schema.optional(),
  to: isoUtcTimestampV1Schema.optional(),
  modelCount: z.number().int().nonnegative(),
  sessionCount: z.number().int().nonnegative().optional(),
  tokenTotals: textUsageV1Schema,
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

export const executionReplayResultV1Schema = z.strictObject({
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
});
export type ExecutionReplayResultV1 = z.infer<typeof executionReplayResultV1Schema>;
