import {
  decimalAmountV1Schema as amount,
  executionMeterSchema,
  executionReasonSchema,
  isoUtcTimestampV1Schema as instant,
} from "@stackreplay/schema";
import { z } from "zod";

const id = z.string().min(1).max(256);
const refs = z.array(id).min(1).max(64);
const nonempty = z.string().min(1);

/** Accepted facts live beside a plan, while captures and review candidates do not. */
export const executionClaimSchema = z
  .strictObject({
    id,
    sourceId: id,
    sourceUrl: z.url().optional(),
    sourceReference: nonempty.optional(),
    sourceType: z.enum([
      "provider_page",
      "provider_docs",
      "provider_api",
      "contract",
      "synthetic_fixture",
    ]),
    observedAt: instant,
    reviewedAt: instant,
    publishedAt: instant.optional(),
    effectiveDateBasis: z.enum(["provider_stated", "catalog_activation", "unknown"]),
    authority: z.enum(["provider", "reviewer", "synthetic"]),
    certainty: z.enum([
      "published_deterministic",
      "published_hard_limit",
      "published_estimate",
      "published_relative_limit",
      "provider_dynamic",
      "inferred",
      "synthetic",
    ]),
    locator: nonempty,
    excerpt: z.string().max(500).optional(),
    normalizedClaimHash: id,
    evidencePackageHash: id,
    rawSourceHash: id.optional(),
    reviewer: nonempty,
  })
  .refine((claim) => claim.sourceUrl !== undefined || claim.sourceReference !== undefined, {
    message: "claim requires a source URL or reference",
  });
export type ExecutionClaim = z.infer<typeof executionClaimSchema>;

export const executionSelectorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("exact"), modelIds: z.array(id).min(1) }),
  z.strictObject({ kind: z.literal("family"), familyId: id }),
  z.strictObject({ kind: z.literal("group"), groupId: id }),
  z.strictObject({ kind: z.literal("provider_supported"), providerId: id }),
  z.strictObject({
    kind: z.literal("price_at_or_below"),
    pricingRefs: z.array(id).min(1),
    basis: z.enum(["api_list_price", "target_billing_rate"]),
    currency: z.literal("USD"),
    endpointId: id,
    category: z.enum(["input", "output", "cacheRead", "cacheWrite", "reasoning"]),
    comparison: z.literal("lte"),
    threshold: amount,
    rateVersion: id,
  }),
]);
export type ExecutionSelector = z.infer<typeof executionSelectorSchema>;

export const executionRequirementSchema = z.strictObject({
  id,
  scope: z.enum(["plan", "route", "overlay", "anchor"]).default("plan"),
  kind: z.enum([
    "region",
    "cohort",
    "billing_term",
    "purchase_state",
    "organization_policy",
    "harness",
    "protocol",
    "opt_in",
    "account_reset_anchor",
  ]),
  value: nonempty,
  claimRefs: refs,
});

export const executionWindowAuthoringSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    id,
    kind: z.literal("calendar"),
    unit: z.enum(["day", "week", "month"]),
    timezone: id,
    resetTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    weekStart: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]).optional(),
    claimRefs: refs,
  }),
  z.strictObject({
    id,
    kind: z.literal("first_use_anchored"),
    durationMs: z.number().int().positive().safe(),
    activation: executionSelectorSchema,
    trigger: z.literal("first_eligible_offer"),
    claimRefs: refs,
  }),
  z.strictObject({
    id,
    kind: z.literal("fixed_partition"),
    durationMs: z.number().int().positive().safe(),
    count: z.number().int().min(1).max(64),
    parent: z.literal("purchase_cycle"),
    coverage: z.enum(["purchase_cycle", "observation"]),
    carry: z.literal("none"),
    anchorRequirementId: id,
    claimRefs: refs,
  }),
  z.strictObject({
    id,
    kind: z.literal("trailing"),
    durationMs: z.number().int().positive().safe(),
    claimRefs: refs,
  }),
]);

export const executionVersionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  validity: z.strictObject({
    start: instant,
    end: instant,
    basis: z.enum(["effective", "current-market"]),
    claimRefs: refs,
  }),
  publication: z.strictObject({
    observedAt: instant,
    reviewedAt: instant,
    providerPublishedAt: instant.optional(),
    catalogActivatedAt: instant.optional(),
  }),
  productId: id,
  purchase: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("api") }),
    z.strictObject({
      kind: z.literal("subscription"),
      term: z.enum(["month", "28_days", "annual", "unsupported"]),
      fixedUsd: amount.nullable(),
      claimRefs: refs,
    }),
  ]),
  claims: z.array(executionClaimSchema).min(1),
  requirements: z.array(executionRequirementSchema).default([]),
  groups: z
    .array(z.strictObject({ id, modelIds: z.array(id).min(1), claimRefs: refs }))
    .default([]),
  rates: z
    .array(
      z.strictObject({
        id,
        pricingRef: id.nullable(),
        basis: z.enum(["api_list_price", "target_billing_rate"]),
        endpointId: id,
        rateVersion: id,
        denomination: z.union([z.literal("USD"), z.strictObject({ meterId: id })]),
        claimRefs: refs,
      }),
    )
    .default([]),
  meters: z.array(executionMeterSchema).default([]),
  pools: z.array(z.strictObject({ id, meterId: id })).default([]),
  debits: z
    .array(
      z.strictObject({
        id,
        poolId: id,
        meterId: id,
        claimRefs: refs,
        operation: z.discriminatedUnion("kind", [
          z.strictObject({ kind: z.literal("constant"), amount }),
          z.strictObject({
            kind: z.literal("tokens"),
            coefficients: z
              .array(
                z.strictObject({
                  category: z.enum([
                    "uncachedInputTokens",
                    "cacheReadTokens",
                    "cacheWriteTokens",
                    "outputTokens",
                    "reasoningTokens",
                  ]),
                  coefficient: amount,
                }),
              )
              .min(1)
              .max(5),
          }),
          z.strictObject({
            kind: z.literal("rate"),
            rateId: id,
            debitFactor: amount,
            conversion: z.literal(true).optional(),
          }),
          z.strictObject({ kind: z.literal("opaque") }),
        ]),
      }),
    )
    .default([]),
  windows: z.array(executionWindowAuthoringSchema).default([]),
  constraints: z
    .array(
      z.strictObject({
        id,
        poolId: id,
        windowId: id,
        models: executionSelectorSchema.optional(),
        amount: amount.nullable(),
        exceed: z.enum(["reject_request", "latch_until_reset"]),
        claimRefs: refs,
      }),
    )
    .default([]),
  routes: z
    .array(
      z.strictObject({
        id,
        endpointId: id,
        protocol: id,
        harnessIds: z.array(id).min(1),
        models: executionSelectorSchema,
        exclude: executionSelectorSchema.optional(),
        debitIds: z.array(id),
        cash: z.strictObject({ rateId: id, cashRateFactor: amount }).optional(),
        requirementIds: z.array(id).default([]),
        claimRefs: refs,
      }),
    )
    .min(1),
  continuation: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("hard_stop"), claimRefs: refs }),
    z.strictObject({ kind: z.literal("independent_api_fallback"), claimRefs: refs }),
    z.strictObject({
      kind: z.enum(["automatic_payg", "purchased_balance", "manual_upgrade", "unknown"]),
      claimRefs: refs,
    }),
  ]),
  capabilities: z
    .array(z.strictObject({ code: executionReasonSchema.shape.code, subject: id, claimRefs: refs }))
    .default([]),
});
export type ExecutionVersion = z.infer<typeof executionVersionSchema>;

export const executionOverlaySchema = z.strictObject({
  id,
  validFrom: instant,
  validUntil: instant,
  planVersionIds: z.array(id).min(1),
  requirementIds: z.array(id).default([]),
  precedence: z.number().int().nonnegative(),
  claimRefs: refs,
  modifications: z
    .array(
      z.discriminatedUnion("kind", [
        z.strictObject({ kind: z.literal("fixed_fee"), fixedUsd: amount, claimRefs: refs }),
        z.strictObject({
          kind: z.literal("allowance_factor"),
          constraintId: id,
          factor: amount,
          claimRefs: refs,
        }),
        z.strictObject({
          kind: z.literal("constraint_amount"),
          constraintId: id,
          amount,
          claimRefs: refs,
        }),
        z.strictObject({
          kind: z.literal("debit_factor"),
          debitId: id,
          factor: amount,
          claimRefs: refs,
        }),
        z.strictObject({
          kind: z.literal("cash_category_override"),
          rateId: id,
          category: z.enum(["input", "output", "cacheRead", "cacheWrite", "reasoning"]),
          pricingRef: id,
          claimRefs: refs,
        }),
        z.strictObject({
          kind: z.literal("cash_rate_factor"),
          routeId: id,
          factor: amount,
          claimRefs: refs,
        }),
        z.strictObject({
          kind: z.literal("entitlement_set"),
          routeId: id,
          modelIds: z.array(id).min(1),
          claimRefs: refs,
        }),
      ]),
    )
    .min(1),
});
export type ExecutionOverlay = z.infer<typeof executionOverlaySchema>;
