import { z } from "zod";
import { pricingRateSetV1Schema, pricingTierV1Schema } from "./execution-rates.js";
import { decimalAmountV1Schema as amount, isoUtcTimestampV1Schema as instant } from "./scalars.js";

const id = z.string().min(1).max(256);
const refs = z.array(id).max(64);
export const executionIntervalSchema = z.strictObject({ id, start: instant, end: instant });
export const executionReasonSchema = z.strictObject({
  code: z.enum([
    "opaque_capacity",
    "unknown_debit",
    "insufficient_chronology",
    "unsupported_trailing_window",
    "measurement_missing",
    "reset_unknown",
    "initial_state_unknown",
    "eligibility_unknown",
    "eligibility_false",
    "price_unknown",
    "unsupported_continuation",
    "unsupported_purchase",
    "unsupported_semantics",
    "invalid_contract",
    "unsupported_model",
    "capacity_exhausted",
    "assignment_budget",
    "shared_resource",
    "scope_limit",
  ]),
  subject: id,
  claimRefs: refs,
});
export type ExecutionReason = z.infer<typeof executionReasonSchema>;
export type ExecutionEvaluationState =
  | "feasible"
  | "infeasible"
  | "not_computable"
  | "unavailable"
  | "not_evaluated";
export const executionMeterSchema = z.discriminatedUnion("kind", [
  z.strictObject({ id, kind: z.literal("request") }),
  z.strictObject({ id, kind: z.literal("token") }),
  z.strictObject({ id, kind: z.literal("usd_usage_value") }),
  z.strictObject({ id, kind: z.literal("provider_credit"), unitId: id }),
]);
const category = z.enum([
  "uncachedInputTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "outputTokens",
  "reasoningTokens",
]);
export const executionDebitSchema = z.strictObject({
  id,
  poolId: id,
  meterId: id,
  claimRefs: refs,
  operation: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("constant"), amount }),
    z.strictObject({
      kind: z.literal("tokens"),
      coefficients: z
        .array(z.strictObject({ category, coefficient: amount }))
        .min(1)
        .max(5),
    }),
    z.strictObject({
      kind: z.literal("rate"),
      rateId: id,
      factor: amount,
      conversion: z.literal(true).optional(),
    }),
  ]),
});
export const executionWindowV1Schema = z.discriminatedUnion("kind", [
  z.strictObject({
    id,
    kind: z.literal("calendar"),
    unit: z.enum(["day", "week", "month"]),
    timezone: id,
  }),
  z.strictObject({
    id,
    kind: z.literal("first_use_anchored"),
    durationMs: z.number().int().positive(),
    activationModels: z.array(id).min(1).max(256),
    trigger: z.literal("first_eligible_offer"),
  }),
  z.strictObject({
    id,
    kind: z.literal("fixed_partition"),
    parentCycleId: id,
    intervals: z.array(executionIntervalSchema).min(1).max(64),
  }),
]);
const requirement = z.strictObject({ id, claimRefs: refs });
export const compiledExecutionPlanV1Schema = z.strictObject({
  contractVersion: z.literal(1),
  artifactHash: id,
  catalogHash: id,
  compilerVersion: id,
  planId: id,
  planVersionId: id,
  appliedOverlayIds: refs,
  validity: z.strictObject({
    start: instant,
    end: instant,
    basis: z.enum(["effective", "current-market"]),
  }),
  purchase: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("api") }),
    z.strictObject({
      kind: z.literal("subscription"),
      term: z.enum(["month", "28_days", "annual", "unsupported"]),
      fixedUsd: amount.nullable(),
      claimRefs: refs,
    }),
  ]),
  requirements: z.array(requirement).max(64),
  computation: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("not_computable"),
      reasons: z.array(executionReasonSchema).min(1),
    }),
    z.strictObject({
      kind: z.literal("executable"),
      rates: z
        .array(
          z.strictObject({
            id,
            denomination: z.union([z.literal("USD"), z.strictObject({ meterId: id })]),
            rates: pricingRateSetV1Schema,
            tiers: z.array(pricingTierV1Schema).optional(),
            claimRefs: refs,
          }),
        )
        .max(256),
      meters: z.array(executionMeterSchema).max(16),
      pools: z.array(z.strictObject({ id, meterId: id })).max(16),
      debits: z.array(executionDebitSchema).max(256),
      windows: z.array(executionWindowV1Schema).max(32),
      constraints: z
        .array(
          z.strictObject({
            id,
            poolId: id,
            windowId: id,
            models: z.array(id).optional(),
            amount,
            exceed: z.enum(["reject_request", "latch_until_reset"]),
            claimRefs: refs,
          }),
        )
        .max(32),
      routes: z
        .array(
          z.strictObject({
            id,
            models: z.array(id).min(1).max(256),
            debitIds: refs,
            cash: z.strictObject({ rateId: id, factor: amount }).optional(),
            requirements: z.array(requirement).max(64),
            claimRefs: refs,
          }),
        )
        .min(1)
        .max(256),
      continuation: z.enum(["hard_stop", "independent_api_fallback"]),
    }),
  ]),
  claims: z
    .array(
      z.strictObject({
        id,
        evidencePackageHash: id,
        certainty: z.enum(["published", "modeled", "estimated", "synthetic"]),
        operationIds: refs,
      }),
    )
    .max(512),
});
export type ExecutionMeter = z.infer<typeof executionMeterSchema>;
export const executionObservationSchema = z.strictObject({
  resourceInstanceId: id,
  artifactHash: id,
  poolId: id,
  constraintId: id,
  window: executionIntervalSchema,
  asOf: instant,
  consumedUnits: amount,
  latched: z.boolean(),
  observationRef: id,
});
export const boundExecutionScenarioV1Schema = z.strictObject({
  version: z.literal(1),
  scenarioHash: id,
  rulesAt: instant,
  period: z.strictObject({ start: instant, end: instant }),
  resources: z
    .array(
      z.strictObject({
        id,
        artifactHash: id,
        cycle: executionIntervalSchema.optional(),
        sharedCapacityIds: refs,
        facts: z.record(id, z.enum(["true", "false", "unknown"])),
        firstUse: z
          .record(id, z.union([z.literal("inactive"), executionIntervalSchema]))
          .default({}),
      }),
    )
    .max(14),
  initial: z.strictObject({
    unlisted: z.enum(["fresh", "unknown"]).default("unknown"),
    observations: z.array(executionObservationSchema).max(2048),
    assumptionRef: id,
  }),
  observationEvidence: z
    .array(
      z.strictObject({
        id,
        hash: id,
        kind: z.enum(["user", "imported", "calibrated", "assumption", "legacy"]),
      }),
    )
    .max(2048),
  chronology: z.enum(["request", "aggregate", "unknown"]),
  maxSubscriptions: z.union([z.literal(1), z.literal(2)]).default(2),
  maxAssignmentStates: z.number().int().min(1).max(100000).default(10000),
});
export type ExecutionObservation = z.infer<typeof executionObservationSchema>;

/** v2 artifacts contain schedule semantics only; account instants belong to bindings. */
export const fixedPartitionScheduleSchema = z.strictObject({
  id,
  kind: z.literal("fixed_partition"),
  durationMs: z.number().int().positive().safe(),
  count: z.number().int().min(1).max(64),
  parent: z.literal("purchase_cycle"),
  coverage: z.enum(["purchase_cycle", "observation"]),
  carry: z.literal("none"),
  anchorRequirementId: id,
  claimRefs: refs,
});
export const executionWindowV2Schema = z.discriminatedUnion("kind", [
  executionWindowV1Schema.options[0],
  executionWindowV1Schema.options[1],
  fixedPartitionScheduleSchema,
]);
export const compiledExecutionPlanV2Schema = compiledExecutionPlanV1Schema.extend({
  contractVersion: z.literal(2),
  computation: z.discriminatedUnion("kind", [
    compiledExecutionPlanV1Schema.shape.computation.options[0],
    compiledExecutionPlanV1Schema.shape.computation.options[1].extend({
      windows: z.array(executionWindowV2Schema).max(32),
    }),
  ]),
});
/** Resource/artifact identity is inherited from the containing resource binding. */
export const boundWindowInstanceSchema = z.strictObject({
  windowDefinitionId: id,
  windowInstanceId: id,
  start: instant,
  end: instant,
});
export const boundExecutionResourceV2Schema =
  boundExecutionScenarioV1Schema.shape.resources.element.extend({
    billingTimezone: id.optional(),
    windowAnchors: z.record(id, instant),
    windowInstances: z.array(boundWindowInstanceSchema).max(2048),
  });
export const boundExecutionScenarioV2Schema = boundExecutionScenarioV1Schema.extend({
  version: z.literal(2),
  resources: z.array(boundExecutionResourceV2Schema).max(14),
});
export const compiledExecutionPlanSchema = z.discriminatedUnion("contractVersion", [
  compiledExecutionPlanV1Schema,
  compiledExecutionPlanV2Schema,
]);
export const boundExecutionScenarioSchema = z.discriminatedUnion("version", [
  boundExecutionScenarioV1Schema,
  boundExecutionScenarioV2Schema,
]);
export type CompiledExecutionPlanV1 = z.infer<typeof compiledExecutionPlanV1Schema>;
export type CompiledExecutionPlanV2 = z.infer<typeof compiledExecutionPlanV2Schema>;
export type CompiledExecutionPlan = z.infer<typeof compiledExecutionPlanSchema>;
export type BoundExecutionScenarioV1 = z.infer<typeof boundExecutionScenarioV1Schema>;
export type BoundExecutionScenarioV2 = z.infer<typeof boundExecutionScenarioV2Schema>;
export type BoundExecutionScenario = z.infer<typeof boundExecutionScenarioSchema>;
export type BoundExecutionResourceV2 = z.infer<typeof boundExecutionResourceV2Schema>;
export type BoundWindowInstance = z.infer<typeof boundWindowInstanceSchema>;
export type FixedPartitionSchedule = z.infer<typeof fixedPartitionScheduleSchema>;
export type ExecutionWindow =
  | z.infer<typeof executionWindowV1Schema>
  | z.infer<typeof executionWindowV2Schema>;
export type ExecutableRules = Extract<CompiledExecutionPlan["computation"], { kind: "executable" }>;
/** The public unversioned window schema now denotes the current compiler target. */
export const executionWindowSchema = executionWindowV2Schema;
