import {
  decimalAmountV1Schema,
  isoDateV1Schema,
  multiplierV1Schema,
  pricingRateSetV1Schema,
  pricingTierV1Schema,
  serviceTierAvailabilityV1Schema,
  serviceTierV1Schema,
  verificationStatusV1Schema,
} from "@stackreplay/schema";
import { z } from "zod";
import { executionOverlaySchema, executionVersionSchema } from "./execution-authoring.js";

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

/**
 * One of the plan provider's route variants of a rule's model (see
 * `modelRouteVariantV1Schema`), with its own price. A variant that has no
 * entry here is not covered by the plan, whatever the rule says about the
 * model's default route.
 */
export const modelRuleVariantV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  /** Prices this variant only; the rule's own `pricingRef` never does. */
  pricingRef: z.string().min(1).optional(),
  /** This variant's own consumption multiplier; the rule's is not inherited. */
  multiplier: multiplierV1Schema.optional(),
});
export type ModelRuleVariantV1 = z.infer<typeof modelRuleVariantV1Schema>;

export const modelRuleV1Schema = z.strictObject({
  model: catalogIdV1Schema,
  /** Prices the model's default route. */
  pricingRef: z.string().min(1).optional(),
  /**
   * Route variants of this model the plan's own provider offers. An event on
   * one of the provider's variant routes is covered only by its entry here.
   */
  variants: z.array(modelRuleVariantV1Schema).min(1).optional(),
  /** Consumption multiplier for this model (spec point 22, step 6). */
  multiplier: multiplierV1Schema.optional(),
  /** Excluded models are not available on the plan (spec point 23). */
  excluded: z.boolean().optional(),
  /**
   * Set only on an excluded rule: the model is outside the plan's included
   * usage, but the provider lets subscribers run it by paying with usage
   * credits. Replay still treats it as excluded from the plan's capacity; the
   * field records the paid route so a surface can say "usage credits only"
   * instead of implying the model cannot be used at all.
   */
  access: z.literal("usage_credits").optional(),
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
  /**
   * `after_limit` marks a statement that describes what happens once the
   * included usage runs out (overage billing, a pause until reset). It lets a
   * public surface answer that question from the quoted statement instead of
   * guessing from wording. Absent means the statement is about something else.
   */
  topic: z.enum(["after_limit"]).optional(),
});
export type QualitativeLimitV1 = z.infer<typeof qualitativeLimitV1Schema>;

/**
 * Where a plan fact comes from, and how much weight it carries.
 *
 * A provider can state a fact in its docs, in a product announcement, on
 * stage, in its help center, or through an identifiable staff member before
 * any page repeats it. All five are the provider speaking; an official keynote
 * announcement does not wait for a help-center page to become a fact. Third
 * parties never appear here.
 */
export const planEvidenceAuthorityV1Schema = z.enum([
  "provider_docs",
  "provider_announcement",
  "provider_keynote",
  "provider_help_center",
  "provider_staff",
]);
export type PlanEvidenceAuthorityV1 = z.infer<typeof planEvidenceAuthorityV1Schema>;

export const planEvidenceV1Schema = z.strictObject({
  url: z.string().regex(/^https:\/\/\S+$/, "must be an https URL"),
  title: z.string().min(1),
  checkedAt: isoDateV1Schema,
  authority: planEvidenceAuthorityV1Schema,
  /** The source's own words for the fact, quoted rather than paraphrased. */
  excerpt: z.string().min(1).optional(),
});
export type PlanEvidenceV1 = z.infer<typeof planEvidenceV1Schema>;

/**
 * Who a plan change applies to. A pause on new sign-ups is not a change for
 * existing subscribers, and the catalog says so instead of letting a reader
 * assume the plan was switched off.
 */
export const planAudienceV1Schema = z.enum([
  "new_subscribers",
  "upgrades",
  "existing_subscribers",
  "returning_subscribers",
]);
export type PlanAudienceV1 = z.infer<typeof planAudienceV1Schema>;

/**
 * An announced change that will never take effect: the provider cancelled it,
 * or replaced it with a different change before its date. A withdrawn version
 * is never selected, whatever its dates say.
 */
export const planWithdrawalV1Schema = z.strictObject({
  reason: z.enum(["cancelled", "superseded"]),
  at: isoDateV1Schema,
  note: z.string().min(1).optional(),
});
export type PlanWithdrawalV1 = z.infer<typeof planWithdrawalV1Schema>;

/**
 * How new terms compare with the ones they replace, when the provider states
 * the comparison but not the allowance itself.
 *
 * `api_equivalent_spend` is the only measure so far: the dollar value, at API
 * list prices, of the usage the plan includes. A ratio of "0.5" with
 * `approximate: true` reads "about half the previous API-equivalent spend". It
 * is not a token ratio (cheaper models change how many tokens a dollar buys),
 * and it never becomes a numeric replay limit, because neither allowance is
 * published.
 */
export const planRelativeValueV1Schema = z.strictObject({
  measure: z.literal("api_equivalent_spend"),
  ratio: decimalAmountV1Schema,
  approximate: z.boolean(),
  comparedTo: z.literal("previous_terms"),
  evidence: z.array(planEvidenceV1Schema).min(1),
});
export type PlanRelativeValueV1 = z.infer<typeof planRelativeValueV1Schema>;

/**
 * Marks a version that starts new commercial terms, as opposed to a version
 * that only records a lineup or source update within the same terms. The
 * plan's history reads its "previous terms" and "current terms" from these.
 */
export const planRevisionV1Schema = z.strictObject({
  title: z.string().min(1),
  relativeValue: planRelativeValueV1Schema.optional(),
});
export type PlanRevisionV1 = z.infer<typeof planRevisionV1Schema>;

/**
 * A plan's allowance stated as a multiple of another plan's, in the provider's
 * own usage unit ("25 times the usage of Plus"). The unit is the provider's and
 * is not defined further, so the multiple is never read as tokens, API dollars,
 * messages or a per-model limit, and it never becomes a numeric replay limit.
 */
export const planRelativeAllowanceV1Schema = z.strictObject({
  measure: z.literal("provider_usage"),
  multiple: decimalAmountV1Schema,
  /** The plan whose allowance is the unit, e.g. ChatGPT Plus. */
  comparedToPlanId: catalogIdV1Schema,
  evidence: z.array(planEvidenceV1Schema).min(1),
});
export type PlanRelativeAllowanceV1 = z.infer<typeof planRelativeAllowanceV1Schema>;

/**
 * A group of subscribers who hold different terms of the same plan for a
 * while, such as existing subscribers kept on their previous allowance when a
 * provider revises a plan. It is not a separate product: the plan, its price
 * and its identity stay the same. `eligibility` is the provider's own wording,
 * and a date the provider does not publish (a cutoff) is not invented.
 */
export const planCohortV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  kind: z.enum(["grandfathered"]),
  /** Who is in the cohort, in a few words: "Eligible existing subscribers". */
  label: z.string().min(1),
  eligibility: z.string().min(1),
  evidence: z.array(planEvidenceV1Schema).min(1),
});
export type PlanCohortV1 = z.infer<typeof planCohortV1Schema>;

export const planVersionEntryV1Schema = z.strictObject({
  effectiveFrom: isoDateV1Schema,
  effectiveTo: isoDateV1Schema.optional(),
  /**
   * The cohort these terms apply to. Absent means the market terms: what
   * someone subscribing on that day gets. A cohort's versions run beside the
   * market versions and may overlap them in time.
   */
  cohort: catalogIdV1Schema.optional(),
  /**
   * What `effectiveFrom` means. `provider` is a date the provider stated;
   * `catalog_recorded` is the day this catalog first recorded the terms, which
   * says nothing about when the provider introduced them. Absent on older
   * records, where it is not established either way.
   */
  effectiveFromBasis: z.enum(["provider", "catalog_recorded"]).optional(),
  /** When the provider announced these terms, if before they took effect. */
  announcedAt: isoDateV1Schema.optional(),
  /** Who these terms apply to, when the provider limits them. */
  audience: z.array(planAudienceV1Schema).min(1).optional(),
  revision: planRevisionV1Schema.optional(),
  withdrawn: planWithdrawalV1Schema.optional(),
  /** Allowances the provider states relative to another plan's. */
  relativeAllowances: z.array(planRelativeAllowanceV1Schema).min(1).optional(),
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

/**
 * Something that happened to a plan that a subscriber would want to know.
 *
 * An event is not a version. A version holds terms a replay calculates with;
 * an event is history: a pause on new sign-ups, an announcement, a reopening.
 * A pause can matter to a buyer without changing anything for an existing
 * subscriber, so it is an event with no version behind it. An event that
 * starts new terms names that version by its `effectiveFrom`.
 *
 * `announcement` events record the announcement itself and are dated by
 * `announcedAt`. Every other kind is dated by `effectiveAt`; one with no
 * `effectiveAt` is announced but undated and never takes effect by the
 * passage of time.
 */
export const planEventKindV1Schema = z.enum([
  "announcement",
  "availability",
  "price",
  "allowance",
  "model_access",
  "promotion",
  "feature_added",
  "feature_removed",
  "terms",
]);
export type PlanEventKindV1 = z.infer<typeof planEventKindV1Schema>;

export const planEventV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  kind: planEventKindV1Schema,
  /** A few words: "New subscriptions paused". */
  title: z.string().min(1),
  /** One short line of detail, shown under the title. */
  summary: z.string().min(1).optional(),
  announcedAt: isoDateV1Schema.optional(),
  effectiveAt: isoDateV1Schema.optional(),
  appliesTo: z.array(planAudienceV1Schema).min(1).optional(),
  /** Audiences the provider explicitly says are not affected. */
  unaffected: z.array(planAudienceV1Schema).min(1).optional(),
  /** The version this event starts, by its `effectiveFrom`. */
  versionEffectiveFrom: isoDateV1Schema.optional(),
  withdrawn: planWithdrawalV1Schema.optional(),
  evidence: z.array(planEvidenceV1Schema).min(1),
});
export type PlanEventV1 = z.infer<typeof planEventV1Schema>;

export const planHistoryV1Schema = z.strictObject({
  events: z.array(planEventV1Schema).min(1),
});
export type PlanHistoryV1 = z.infer<typeof planHistoryV1Schema>;

export const planV1Schema = z
  .strictObject({
    id: catalogIdV1Schema,
    role: z.literal("plan"),
    name: z.string().min(1),
    providerId: catalogIdV1Schema,
    versions: z.array(planVersionEntryV1Schema),
    /** Subscriber groups that hold their own terms for a while (grandfathering). */
    cohorts: z.array(planCohortV1Schema).min(1).optional(),
    /** Events a subscriber would want to know about, separate from the versions. */
    history: planHistoryV1Schema.optional(),
    /** New accepted execution semantics. Legacy `versions` retain their original reader. */
    executionVersions: z.array(executionVersionSchema).optional(),
    executionOverlays: z.array(executionOverlaySchema).optional(),
  })
  .refine((plan) => plan.versions.length > 0 || (plan.executionVersions?.length ?? 0) > 0, {
    message: "a plan requires a legacy or accepted execution version",
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
/**
 * A provider's own execution variant of a model, reached through its own
 * identifier (for example Command Code's `deepseek/deepseek-v4.1-flash-fast`,
 * a higher-throughput route to DeepSeek V4.1 Flash with its own rates).
 *
 * A variant is not a model. The alias still resolves to the canonical model,
 * so model mix, identity and cross-target replay treat it as that model. The
 * variant travels next to the identity and decides one thing: on the
 * provider that sells it, only a price record or plan rule for the same
 * variant may price it. The default route's price is never used in its place.
 * On any other target the call runs on that target's own route for the same
 * model, and the replay says so.
 */
export const modelRouteVariantV1Schema = z.strictObject({
  /** Matches `variantId` on the provider's price records and `variants` on its plan rules. */
  id: catalogIdV1Schema,
  /** The provider that sells this route. */
  providerId: catalogIdV1Schema,
  /** Display name, for example "Fast". */
  label: z.string().min(1),
});
export type ModelRouteVariantV1 = z.infer<typeof modelRouteVariantV1Schema>;

export const modelAliasV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  /** The observed identifier, verbatim. */
  alias: z.string().min(1),
  kind: z.enum(["provider_id", "harness_alias", "provider_route"]),
  /** Harness this spelling is scoped to, when it is harness-specific. */
  harness: catalogIdV1Schema.optional(),
  /**
   * The provider route variant this identifier selects. Only a harness-scoped
   * alias may declare one: the same spelling elsewhere is not established to
   * mean the same route.
   */
  variant: modelRouteVariantV1Schema.optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type ModelAliasV1 = z.infer<typeof modelAliasV1Schema>;

/**
 * What a model record identifies (launch taxonomy).
 *
 * `release` is one concrete model shipped under its own pinned identifier.
 * `family` is an identity record for a family name (for example the `opus`
 * alias a harness accepts) that resolves to different releases depending on
 * the surface and the date. A family record stays fully resolvable so plans
 * and workloads that name it keep replaying the same way; it is simply not a
 * model release in its own right. Absent means `release`, so records written
 * before this field existed keep their meaning.
 */
export const modelKindV1Schema = z.enum(["release", "family"]);
export type ModelKindV1 = z.infer<typeof modelKindV1Schema>;

/**
 * Where a release sits in its developer's own lineup: `current`, or `legacy`
 * (still documented but superseded, or historical). Absent means the catalog
 * does not record it, which is never read as current.
 */
export const modelLifecycleV1Schema = z.enum(["current", "legacy"]);
export type ModelLifecycleV1 = z.infer<typeof modelLifecycleV1Schema>;

/** Sourced discovery facts. Display only; these never supply replay capacity or rates. */
export const modelSpecificationsV1Schema = z.strictObject({
  contextTokens: z.number().int().positive().optional(),
  maxInputTokens: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  inputModalities: z.array(z.enum(["text", "image", "audio", "video", "pdf"])).optional(),
  outputModalities: z.array(z.enum(["text", "image", "audio", "video"])).optional(),
  reasoning: z.boolean().optional(),
  toolCalling: z.boolean().optional(),
  structuredOutput: z.boolean().optional(),
  knowledgeCutoff: z.string().min(1).optional(),
  notes: z.array(z.string().min(1)).optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
});

/**
 * One processing tier a provider offers a model at, and whether it is offered
 * yet. A tier the model does not list is unknown, not unavailable, and a
 * listed tier carries no price: prices live on tier-scoped pricing records.
 */
export const modelServiceTierV1Schema = z.strictObject({
  tier: serviceTierV1Schema,
  availability: serviceTierAvailabilityV1Schema,
  /** The provider's own words when it qualifies the tier ("coming later"). */
  note: z.string().min(1).optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
});
export type ModelServiceTierV1 = z.infer<typeof modelServiceTierV1Schema>;

export const modelV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("model"),
  name: z.string().min(1),
  /** Absent means `release`. */
  kind: modelKindV1Schema.optional(),
  /** For a release: the family identity record it belongs to. */
  familyId: catalogIdV1Schema.optional(),
  /** For a release: current or legacy, per the developer's own documentation. */
  lifecycle: modelLifecycleV1Schema.optional(),
  /**
   * The provider record of who develops the model, set only where the record's
   * own sources establish it. This is a different fact from `providerIds`,
   * which lists the routes the model is offered through; neither is ever
   * inferred from the other.
   */
  developerId: catalogIdV1Schema.optional(),
  specifications: modelSpecificationsV1Schema.optional(),
  /** A precise explanation when API pricing or access differs from normal token billing. */
  pricingNote: z.string().min(1).optional(),
  /** Public access status, separate from subscription access and executable admission. */
  apiAvailability: z.enum(["available", "not_established", "retired"]).optional(),
  /** Routes that offer this model (a Direct API, a subscription platform). */
  providerIds: z.array(catalogIdV1Schema).optional(),
  /** API processing tiers, when the provider documents them for this model. */
  serviceTiers: z.array(modelServiceTierV1Schema).optional(),
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
export {
  type BillingEquivalenceV1,
  billingEquivalenceV1Schema,
  type PricingRateSetV1,
  type PricingTierConditionV1,
  type PricingTierInputConditionV1,
  type PricingTierScheduleConditionV1,
  type PricingTierV1,
  pricingRateSetV1Schema,
  pricingTierConditionV1Schema,
  pricingTierInputConditionV1Schema,
  pricingTierScheduleConditionV1Schema,
  pricingTierV1Schema,
  type RateValueV1,
  rateValueV1Schema,
  UTC_TIME_OF_DAY_PATTERN,
  UTC_WEEKDAYS,
  type UtcTimeWindowV1,
  type UtcWeekdayV1,
  utcTimeWindowV1Schema,
} from "@stackreplay/schema";
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

/**
 * A price record's published promotional standing, for display only. Price
 * selection and Replay never read it: the record's own dates decide when its
 * rates apply. Regular rates are recorded only when the provider publishes
 * them (a struck-through list price, or rates announced for after the
 * promotion); otherwise surfaces say they are not published.
 */
export const pricingPromotionV1Schema = z.strictObject({
  /** The provider's standing in a few plain words, e.g. "Permanent 50% discount". */
  label: z.string().min(1),
  regularRates: pricingRateSetV1Schema.optional(),
  /** Regular rates for the record's conditional tiers, by tier id. */
  regularTiers: z
    .array(z.strictObject({ id: z.string().min(1), rates: pricingRateSetV1Schema }))
    .optional(),
  /** Set when the regular rates are a published later price rather than a current list price. */
  regularFrom: isoDateV1Schema.optional(),
});
export type PricingPromotionV1 = z.infer<typeof pricingPromotionV1Schema>;

export const pricingV1Schema = z.strictObject({
  id: catalogIdV1Schema,
  role: z.literal("pricing"),
  modelId: catalogIdV1Schema,
  currency: z.literal("USD"),
  unit: z.literal("per_1m_tokens"),
  basis: pricingBasisV1Schema,
  /** Explicit endpoint and immutable rate revision for new execution selectors. */
  endpointId: catalogIdV1Schema.optional(),
  rateVersion: catalogIdV1Schema.optional(),
  /** An explicitly selected interpretation/promotion; excluded from automatic price selection. */
  variantId: catalogIdV1Schema.optional(),
  /**
   * The processing tier these rates apply to. Absent means Standard. A record
   * for any other tier is priced only when a replay asks for that tier, so a
   * Batch price can never stand in for a Standard one or the reverse.
   */
  serviceTier: serviceTierV1Schema.optional(),
  rates: pricingRateSetV1Schema,
  /** Conditional rate sets that override `rates` when their condition matches. */
  tiers: z.array(pricingTierV1Schema).optional(),
  promotion: pricingPromotionV1Schema.optional(),
  effectiveFrom: isoDateV1Schema,
  effectiveTo: isoDateV1Schema.optional(),
  /** Exact activation instant when the provider publishes one. */
  effectiveFromInstant: z.string().datetime({ offset: true }).optional(),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  verificationStatus: verificationStatusV1Schema,
});
export type PricingV1 = z.infer<typeof pricingV1Schema>;
