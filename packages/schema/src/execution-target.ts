import { z } from "zod";
import {
  modelTranslationPolicyV1Schema,
  workloadScopeDeclarationV1Schema,
} from "./replay-semantics.js";
import { isoDateV1Schema } from "./scalars.js";

/**
 * Execution targets (Addendum A point 115, decision 1) and the explicit replay
 * rules context (decision 17). The union is capable of representing
 * subscription, api, local and hybrid targets from the start.
 *
 * Milestone 1 implements replay behavior for subscription targets only. The
 * api, local and hybrid variants are reference-only shells: they exist so the
 * architecture does not assume subscriptions are the only possible target.
 * Their behavior, catalogs and UI arrive in later milestones.
 */

/**
 * Subscription target. Exactly one selection is supplied:
 *
 * - `planVersionId`: a pinned plan version (explicit historical selection).
 * - `planId`: the plan whose version is effective at the replay context's
 *   `rulesAsOf` is selected deterministically by the engine.
 *
 * The engine validates the exactly-one rule and raises IMPORT_SCHEMA_INVALID.
 *
 * M4B adds two optional scenario dimensions to the target because a target is
 * an execution stack, not a plan SKU: an explicit `modelTranslation` policy
 * (cross-model substitution, always an assumption) and a `resetAssumption`
 * declaration. Both are scenario input; neither is catalog data, and neither
 * changes what the plan itself claims.
 */
export const subscriptionTargetV1Schema = z
  .strictObject({
    type: z.literal("subscription"),
    planVersionId: z.string().min(1).optional(),
    planId: z.string().min(1).optional(),
    /** Explicit cross-model substitution policy (M4B). Never a catalog fact. */
    modelTranslation: modelTranslationPolicyV1Schema.optional(),
    /**
     * Declares that the account's allowance reset phase is not established.
     * A scenario may only weaken what the plan's own windows establish.
     */
    resetAssumption: z.strictObject({ kind: z.literal("fixed-unknown") }).optional(),
  })
  .refine((target) => (target.planId === undefined) !== (target.planVersionId === undefined), {
    message: "supply exactly one of planId and planVersionId",
  });
export type SubscriptionTargetV1 = z.infer<typeof subscriptionTargetV1Schema>;

/**
 * Explicit replay rules context (decision 17). The engine never reads a clock,
 * so the caller must state which rule instant applies. Rule effective dates and
 * workload event times are different concepts: `rulesAsOf` selects the rule
 * snapshot, event timestamps drive workload chronology.
 *
 * M4B adds an optional workload-scope declaration: what the supplied event
 * stream actually covers. Absent means the conservative reading, an imported
 * workload only.
 */
export const replayContextV1Schema = z.strictObject({
  rulesAsOf: isoDateV1Schema,
  workloadScope: workloadScopeDeclarationV1Schema.optional(),
});
export type ReplayContextV1 = z.infer<typeof replayContextV1Schema>;

/**
 * Legacy cross-model mapping from the pre-M4A API shell.
 *
 * @deprecated Not executable. M4B established `ModelTranslationPolicyV1` as the
 * only cross-model mechanism, and this shape carries none of its semantics (no
 * provenance, no transform, no policy identity), so normalizing it into a
 * policy would have to invent what it means. An API target that still carries it
 * parses, so stored documents stay readable, and is refused at execution with a
 * typed error that points at `modelTranslation`.
 */
export const apiModelMappingV1Schema = z.strictObject({
  fromModelId: z.string().min(1),
  toModelId: z.string().min(1),
});
export type ApiModelMappingV1 = z.infer<typeof apiModelMappingV1Schema>;

/**
 * Direct API target (M4C), reconciling the pre-M4A shell with M4B semantics.
 *
 * The executable shape is provider-scoped: the provider whose API the recorded
 * demand is applied to. Everything else the replay needs is already carried by
 * the existing context and version metadata, so nothing is duplicated here:
 *
 * - the rules/pricing instant is `ReplayContextV1.rulesAsOf`;
 * - the catalog is the caller's catalog, pinned by its `catalogVersion`;
 * - cross-model substitution, when a scenario supplies it, is
 *   `ModelTranslationPolicyV1` (M4B) - the only cross-model mechanism;
 * - the pricing records actually used are pinned in the result's versions.
 *
 * Two legacy fields from the non-executable shell are accepted for parsing
 * compatibility and refused at execution, because neither can be honoured
 * without inventing semantics:
 *
 * - `pricingVersionId` named one global pricing record. A multi-model API
 *   workload cannot be priced by one arbitrary record: each effective model is
 *   priced with the API-list-price record valid for it at the replay instant.
 * - `modelMapping` was an unlabelled model substitution. Executing it would
 *   bypass M4B's translation-provenance semantics and turn an assumption into
 *   what reads as identity, so callers are directed to `modelTranslation`.
 */
export const apiTargetV1Schema = z.strictObject({
  type: z.literal("api"),
  providerId: z.string().min(1),
  /** Explicit cross-model substitution policy (M4B). Never a catalog fact. */
  modelTranslation: modelTranslationPolicyV1Schema.optional(),
  /** @deprecated Refused for API execution; see the schema comment. */
  pricingVersionId: z.string().min(1).optional(),
  /** @deprecated Refused for API execution; use `modelTranslation`. */
  modelMapping: z.array(apiModelMappingV1Schema).optional(),
});
export type ApiTargetV1 = z.infer<typeof apiTargetV1Schema>;

export const localTargetV1Schema = z.strictObject({
  type: z.literal("local"),
  hardwareProfileId: z.string().min(1),
  localModelProfileId: z.string().min(1),
  assumptions: z.array(z.string().min(1)).optional(),
});
export type LocalTargetV1 = z.infer<typeof localTargetV1Schema>;

/** Hybrid routes reference non-hybrid targets to avoid recursive definitions. */
export const hybridRouteTargetV1Schema = z.discriminatedUnion("type", [
  subscriptionTargetV1Schema,
  apiTargetV1Schema,
  localTargetV1Schema,
]);

export const hybridRouteV1Schema = z.strictObject({
  priority: z.number().int().nonnegative(),
  target: hybridRouteTargetV1Schema,
  conditions: z
    .strictObject({
      models: z.array(z.string().min(1)).optional(),
      maxContext: z.number().int().positive().optional(),
      fallbackOnly: z.boolean().optional(),
    })
    .optional(),
});
export type HybridRouteV1 = z.infer<typeof hybridRouteV1Schema>;

export const hybridTargetV1Schema = z.strictObject({
  type: z.literal("hybrid"),
  routes: z.array(hybridRouteV1Schema).min(1),
});
export type HybridTargetV1 = z.infer<typeof hybridTargetV1Schema>;

export const executionTargetV1Schema = z.discriminatedUnion("type", [
  subscriptionTargetV1Schema,
  apiTargetV1Schema,
  localTargetV1Schema,
  hybridTargetV1Schema,
]);
export type ExecutionTargetV1 = z.infer<typeof executionTargetV1Schema>;

export function isSubscriptionTargetV1(target: ExecutionTargetV1): target is SubscriptionTargetV1 {
  return target.type === "subscription";
}

export function isApiTargetV1(target: ExecutionTargetV1): target is ApiTargetV1 {
  return target.type === "api";
}
