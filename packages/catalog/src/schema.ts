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

/**
 * Explicit overage pricing for allow_overage rules (decisions 14, 19).
 * A credit pool's excess is already currency, so credit pools do not declare a
 * rate; token and request limits must state one.
 */
export const overageRateV1Schema = z.strictObject({
  /** Currency charged per overage unit. */
  amount: decimalAmountV1Schema,
  unit: z.enum(["per_1m_tokens", "per_request"]),
});
export type OverageRateV1 = z.infer<typeof overageRateV1Schema>;

export const planLimitV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  label: z.string().min(1),
  type: z.enum(["credit_pool", "token_limit", "request_limit"]),
  /** Decimal string: money for credit pools, integer counts for tokens/requests. */
  amount: decimalAmountV1Schema,
  /** Present when the pool applies to specific models only. */
  models: z.array(catalogIdV1Schema).optional(),
  window: limitWindowV1Schema,
  /**
   * What happens once capacity is exceeded (decision 14). There is no default:
   * every rule states its behavior explicitly rather than inheriting a hidden
   * global assumption.
   */
  exceed: z.enum(["reject_request", "latch_until_reset", "allow_overage", "record_only"]),
  /** Required for allow_overage on token and request limits. */
  overageRate: overageRateV1Schema.optional(),
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

/**
 * A limit a provider states qualitatively ("5x more usage than Pro") rather than
 * as a number. Recorded as a first-class, sourced statement so the product can
 * say "stated qualitatively" instead of inventing an amount to fit a numeric
 * schema (M4 requirement: never guess a limit).
 */
export const qualitativeLimitV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  label: z.string().min(1),
  /** The provider's own wording, quoted rather than paraphrased. */
  statement: z.string().min(1),
  /** Where the wording comes from, when it is not the plan page itself. */
  sourceUrl: z.string().min(1).optional(),
});
export type QualitativeLimitV1 = z.infer<typeof qualitativeLimitV1Schema>;

export const planVersionEntryV1Schema = z.strictObject({
  effectiveFrom: isoDateV1Schema,
  effectiveTo: isoDateV1Schema.optional(),
  price: planPriceV1Schema,
  billingMechanics: z.string().min(1).optional(),
  /**
   * Numeric limits only. A plan whose provider publishes no number has an empty
   * list and states its limits qualitatively instead; a number is never invented
   * to fill this array.
   */
  limits: z.array(planLimitV1Schema),
  /** Limits the provider describes without a number. Never a substitute for one. */
  qualitativeLimits: z.array(qualitativeLimitV1Schema).optional(),
  modelRules: z.array(modelRuleV1Schema).min(1),
  promotions: z.array(promotionV1Schema).optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type PlanVersionEntryV1 = z.infer<typeof planVersionEntryV1Schema>;

/** A plan version must state at least one limit, numeric or qualitative. */
export const planVersionEntryWithLimitsV1Schema = planVersionEntryV1Schema.refine(
  (version) => version.limits.length > 0 || (version.qualitativeLimits?.length ?? 0) > 0,
  { message: "a plan version must state at least one limit" },
);

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

/**
 * A model identity an outside system may observe for this model (M4A).
 *
 * Aliases are declarations, not patterns: the catalog names the exact identifier
 * a provider or harness emits and says where that spelling comes from. Nothing is
 * matched by similarity, so an undeclared spelling stays unresolved.
 *
 * `provider_id` is a spelling the model's own provider issues (for example a
 * dated or dotted API id). `harness_alias` is a spelling a third-party harness or
 * router emits, which the provider's documentation does not prove on its own, so
 * it carries its own sources and may be scoped to the harness that uses it.
 * `provider_route` (M4B) is a differently-branded route that another provider or
 * router documents as invoking this same underlying model. All three mean the
 * same model; none of them is a capability-equivalent substitute, and a route is
 * never a reason to expect equal quality, tokenization or tool behaviour.
 */
export const modelAliasV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  /** The observed identifier, verbatim. */
  alias: z.string().min(1),
  kind: z.enum(["provider_id", "harness_alias", "provider_route"]),
  /** Harness this spelling is scoped to, when it is harness-specific. */
  harness: catalogIdV1Schema.optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type ModelAliasV1 = z.infer<typeof modelAliasV1Schema>;

export const modelV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("model"),
  name: z.string().min(1),
  providerIds: z.array(catalogIdV1Schema).optional(),
  aliases: z.array(modelAliasV1Schema).optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type ModelV1 = z.infer<typeof modelV1Schema>;

/**
 * An explicit, sourced billing relationship (M4A pricing remediation).
 *
 * Some providers document that one token category is billed at another
 * category's rate (for example thinking tokens billed as output). That
 * relationship is catalog data backed by the record's own sources, never a
 * universal engine assumption. A category with neither a published rate nor a
 * documented relationship is absent from the record and stays unknown in
 * results (decision 35).
 */
export const billingEquivalenceV1Schema = z.strictObject({
  billedAs: z.enum(["input", "output", "cacheRead", "cacheWrite", "reasoning"]),
});
export type BillingEquivalenceV1 = z.infer<typeof billingEquivalenceV1Schema>;

/** A rate is a published amount, or a documented billed-as relationship. */
export const rateValueV1Schema = z.union([decimalAmountV1Schema, billingEquivalenceV1Schema]);
export type RateValueV1 = z.infer<typeof rateValueV1Schema>;

/**
 * One complete rate set per the record's `per_1m_tokens` unit. A category the
 * provider does not document is absent; it is never filled with another
 * category's rate by assumption.
 */
export const pricingRateSetV1Schema = z.strictObject({
  input: rateValueV1Schema,
  output: rateValueV1Schema,
  cacheRead: rateValueV1Schema.optional(),
  cacheWrite: rateValueV1Schema.optional(),
  reasoning: rateValueV1Schema.optional(),
});
export type PricingRateSetV1 = z.infer<typeof pricingRateSetV1Schema>;

export const UTC_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type UtcWeekdayV1 = (typeof UTC_WEEKDAYS)[number];

export const UTC_TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A time-of-day window, UTC, half-open `[start, end)` on each named weekday.
 * Only same-day windows are representable; a source whose schedule wraps
 * midnight is not modeled here and its rates must not be flattened.
 */
export const utcTimeWindowV1Schema = z.strictObject({
  days: z.array(z.enum(UTC_WEEKDAYS)).min(1),
  /** Inclusive start, minute-of-day UTC as "HH:MM". */
  start: z.string().regex(UTC_TIME_OF_DAY_PATTERN, "must be HH:MM"),
  /** Exclusive end, minute-of-day UTC as "HH:MM". */
  end: z.string().regex(UTC_TIME_OF_DAY_PATTERN, "must be HH:MM"),
});
export type UtcTimeWindowV1 = z.infer<typeof utcTimeWindowV1Schema>;

/**
 * A conditional rate tier (M4A pricing remediation).
 *
 * Real providers publish more than one flat rate set: request-size (context)
 * tiers selected by the request's input-token count, and time-of-day schedules
 * selected by the historical event instant. A tier's condition names only
 * properties a replay knows for every event, and `rates` under a matched tier
 * replaces the record's base rates in full.
 */
export const pricingTierInputConditionV1Schema = z.strictObject({
  /**
   * Applies when the request's total input-side token count (uncached input
   * plus cache reads plus cache writes) exceeds this count. A request at the
   * threshold itself takes the base rates ("through 272K").
   */
  inputTokensAbove: z.number().int().positive(),
});
export type PricingTierInputConditionV1 = z.infer<typeof pricingTierInputConditionV1Schema>;

export const pricingTierScheduleConditionV1Schema = z.strictObject({
  utcWindows: z.array(utcTimeWindowV1Schema).min(1),
});
export type PricingTierScheduleConditionV1 = z.infer<typeof pricingTierScheduleConditionV1Schema>;

export const pricingTierConditionV1Schema = z.union([
  pricingTierInputConditionV1Schema,
  pricingTierScheduleConditionV1Schema,
]);
export type PricingTierConditionV1 = z.infer<typeof pricingTierConditionV1Schema>;

export const pricingTierV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  label: z.string().min(1),
  when: pricingTierConditionV1Schema,
  /** Complete rate set for this tier; same categories as the base rates. */
  rates: pricingRateSetV1Schema,
});
export type PricingTierV1 = z.infer<typeof pricingTierV1Schema>;

/**
 * What the rates represent (M4A pricing remediation).
 *
 * `api_list_price` is the model's own provider's published API list prices.
 * `target_billing_rate` is the rates an execution target publishes for
 * computing that target's own consumption (for example GitHub's Copilot
 * AI-credit rates). The two are never interchangeable by coincidence of
 * numbers: they carry different sources and possibly different conditions, and
 * a plan rule that prices consumption must prefer the rates its own provider
 * publishes for it.
 */
export const pricingBasisV1Schema = z.enum(["api_list_price", "target_billing_rate"]);
export type PricingBasisV1 = z.infer<typeof pricingBasisV1Schema>;

export const pricingV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("pricing"),
  modelId: catalogIdV1Schema,
  currency: z.literal("USD"),
  unit: z.literal("per_1m_tokens"),
  basis: pricingBasisV1Schema,
  rates: pricingRateSetV1Schema,
  /** Conditional rate sets that override `rates` when their condition matches. */
  tiers: z.array(pricingTierV1Schema).optional(),
  effectiveFrom: isoDateV1Schema,
  effectiveTo: isoDateV1Schema.optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type PricingV1 = z.infer<typeof pricingV1Schema>;
