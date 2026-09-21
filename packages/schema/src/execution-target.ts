import { z } from "zod";

/**
 * Execution targets (Addendum A point 115, decision 1). The union is capable
 * of representing subscription, api, local and hybrid targets from the start.
 *
 * Milestone 1 implements replay behavior for subscription targets only. The
 * api, local and hybrid variants are reference-only shells: they exist so the
 * architecture does not assume subscriptions are the only possible target.
 * Their behavior, catalogs and UI arrive in later milestones.
 */

export const subscriptionTargetV1Schema = z.strictObject({
  type: z.literal("subscription"),
  planVersionId: z.string().min(1),
});
export type SubscriptionTargetV1 = z.infer<typeof subscriptionTargetV1Schema>;

export const apiModelMappingV1Schema = z.strictObject({
  fromModelId: z.string().min(1),
  toModelId: z.string().min(1),
});
export type ApiModelMappingV1 = z.infer<typeof apiModelMappingV1Schema>;

export const apiTargetV1Schema = z.strictObject({
  type: z.literal("api"),
  providerId: z.string().min(1),
  pricingVersionId: z.string().min(1),
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
