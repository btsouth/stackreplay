import {
  decimalAmountV1Schema,
  isoDateV1Schema,
  multiplierV1Schema,
  verificationStatusV1Schema,
} from "@stackreplay/schema";
import { z } from "zod";

/**
 * Catalog entry schemas (spec points 18-21, decision 6).
 *
 * The catalog is version-controlled product data, not a database table. All
 * data in this repository is clearly synthetic: fictional providers, models,
 * plans and prices. Real provider values are never invented here.
 *
 * Role-specific canonical IDs: every entity declares its role and lives in a
 * role-scoped namespace (`provider` | `model` | `plan` | `pricing`), so one
 * brand can hold several role-specific identities.
 */

export const catalogIdV1Schema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "must be a lowercase slug (a-z, 0-9, dashes)");

export const ISO_DURATION_PATTERN = /^P(?=\d|T\d)(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/;

export const catalogSourceV1Schema = z.strictObject({
  url: z.string().regex(/^https:\/\/\S+$/, "must be an https URL"),
  title: z.string().min(1),
  checkedAt: isoDateV1Schema,
});
export type CatalogSourceV1 = z.infer<typeof catalogSourceV1Schema>;

export const rollingWindowV1Schema = z.strictObject({
  type: z.literal("rolling"),
  /** ISO-8601 duration, e.g. PT5H or P7D. */
  duration: z.string().regex(ISO_DURATION_PATTERN, "must be an ISO-8601 duration"),
  anchor: z.literal("first_use"),
});
export type RollingWindowV1 = z.infer<typeof rollingWindowV1Schema>;

export const calendarWindowV1Schema = z.strictObject({
  type: z.literal("calendar"),
  unit: z.enum(["day", "week", "month"]),
  /** IANA timezone; UTC unless a provider's reset semantics require otherwise. */
  timezone: z.string().min(1).default("UTC"),
});
export type CalendarWindowV1 = z.infer<typeof calendarWindowV1Schema>;

export const limitWindowV1Schema = z.discriminatedUnion("type", [
  rollingWindowV1Schema,
  calendarWindowV1Schema,
]);
export type LimitWindowV1 = z.infer<typeof limitWindowV1Schema>;

export const planLimitV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  label: z.string().min(1),
  type: z.enum(["credit_pool", "token_limit", "request_limit"]),
  /** Decimal string: money for credit pools, integer counts for tokens/requests. */
  amount: decimalAmountV1Schema,
  /** Present when the pool applies to specific models only. */
  models: z.array(catalogIdV1Schema).optional(),
  window: limitWindowV1Schema,
  enforcement: z.enum(["hard_stop", "soft", "overage"]).default("hard_stop"),
});
export type PlanLimitV1 = z.infer<typeof planLimitV1Schema>;

export const modelRuleV1Schema = z.strictObject({
  model: catalogIdV1Schema,
  pricingRef: z.string().min(1).optional(),
  /** Consumption multiplier for this model (spec point 22, step 6). */
  multiplier: multiplierV1Schema.optional(),
  /** Excluded models are not available on the plan (spec point 23). */
  excluded: z.boolean().optional(),
});
export type ModelRuleV1 = z.infer<typeof modelRuleV1Schema>;

export const promotionV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  label: z.string().min(1),
  /** Absent means the promotion applies to all models. */
  models: z.array(catalogIdV1Schema).optional(),
  multiplier: multiplierV1Schema,
  effectiveFrom: isoDateV1Schema,
  effectiveTo: isoDateV1Schema.optional(),
});
export type PromotionV1 = z.infer<typeof promotionV1Schema>;

export const planPriceV1Schema = z.strictObject({
  currency: z.literal("USD"),
  amount: decimalAmountV1Schema,
  interval: z.enum(["month", "year"]),
});
export type PlanPriceV1 = z.infer<typeof planPriceV1Schema>;

export const planVersionEntryV1Schema = z.strictObject({
  effectiveFrom: isoDateV1Schema,
  effectiveTo: isoDateV1Schema.optional(),
  price: planPriceV1Schema,
  billingMechanics: z.string().min(1).optional(),
  limits: z.array(planLimitV1Schema).min(1),
  modelRules: z.array(modelRuleV1Schema).min(1),
  promotions: z.array(promotionV1Schema).optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type PlanVersionEntryV1 = z.infer<typeof planVersionEntryV1Schema>;

export const planV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("plan"),
  name: z.string().min(1),
  providerId: catalogIdV1Schema,
  versions: z.array(planVersionEntryV1Schema).min(1),
});
export type PlanV1 = z.infer<typeof planV1Schema>;

export const providerV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("provider"),
  name: z.string().min(1),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type ProviderV1 = z.infer<typeof providerV1Schema>;

export const modelV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("model"),
  name: z.string().min(1),
  providerIds: z.array(catalogIdV1Schema).optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type ModelV1 = z.infer<typeof modelV1Schema>;

export const pricingV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("pricing"),
  modelId: catalogIdV1Schema,
  currency: z.literal("USD"),
  unit: z.literal("per_1m_tokens"),
  rates: z.strictObject({
    input: decimalAmountV1Schema,
    output: decimalAmountV1Schema,
    cacheRead: decimalAmountV1Schema.optional(),
    cacheWrite: decimalAmountV1Schema.optional(),
    reasoning: decimalAmountV1Schema.optional(),
  }),
  effectiveFrom: isoDateV1Schema,
  effectiveTo: isoDateV1Schema.optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type PricingV1 = z.infer<typeof pricingV1Schema>;
