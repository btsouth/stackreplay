import type {
  CatalogV1,
  LoadedPlanVersionV1,
  ModelRuleV1,
  ModelV1,
  OverageRateV1,
  PlanLimitV1,
  PricingV1,
  PromotionV1,
  ProviderV1,
  QualitativeLimitV1,
} from "@stackreplay/catalog";
import type {
  ReplayContextV1,
  SubscriptionTargetV1,
  VerificationStatusV1,
} from "@stackreplay/schema";

/**
 * Fixture catalog builder for engine tests. All values are synthetic and the
 * catalog version is a fixture label, not a real content hash: the engine
 * records whatever version it is given and never verifies hashes itself.
 */

export const FIXTURE_CATALOG_VERSION = "fixture:golden-v1";
export const FIXTURE_PLAN_VERSION_ID = "fixture-plan@2026-08-01";
/** Default rules instant for fixture replays (decision 17). */
export const FIXTURE_RULES_AS_OF = "2026-09-15";

export const fixtureProvider: ProviderV1 = {
  id: "fixture-provider",
  role: "provider",
  name: "Fixture Provider",
  sources: [{ url: "https://example.invalid/fixture", title: "Fixture", checkedAt: "2026-08-01" }],
  lastVerifiedAt: "2026-08-01",
  verificationStatus: "estimated",
};

export const fixtureModels: Record<string, ModelV1> = {
  "fixture-small": {
    id: "fixture-small",
    role: "model",
    name: "Fixture Small",
    sources: [
      { url: "https://example.invalid/fixture-small", title: "Fixture", checkedAt: "2026-08-01" },
    ],
    lastVerifiedAt: "2026-08-01",
    verificationStatus: "estimated",
  },
  "fixture-medium": {
    id: "fixture-medium",
    role: "model",
    name: "Fixture Medium",
    sources: [
      { url: "https://example.invalid/fixture-medium", title: "Fixture", checkedAt: "2026-08-01" },
    ],
    lastVerifiedAt: "2026-08-01",
    verificationStatus: "estimated",
  },
};

/** Per 1M tokens. Round numbers keep fixture arithmetic readable. */
export const fixturePricing: Record<string, PricingV1> = {
  "fixture-small-pricing": {
    id: "fixture-small-pricing",
    role: "pricing",
    modelId: "fixture-small",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates: {
      input: "1.00",
      output: "2.00",
      cacheRead: "0.10",
      cacheWrite: "1.00",
      reasoning: "3.00",
    },
    effectiveFrom: "2026-01-01",
    sources: [
      { url: "https://example.invalid/pricing", title: "Fixture", checkedAt: "2026-01-01" },
    ],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  },
  "fixture-medium-pricing": {
    id: "fixture-medium-pricing",
    role: "pricing",
    modelId: "fixture-medium",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates: { input: "2.00", output: "4.00" },
    effectiveFrom: "2026-01-01",
    sources: [
      { url: "https://example.invalid/pricing", title: "Fixture", checkedAt: "2026-01-01" },
    ],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  },
};

export interface FixtureCatalogOptions {
  planId?: string;
  planName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  priceAmount?: string;
  limits: PlanLimitV1[];
  /** Limits the plan states qualitatively instead of numerically (M4B). */
  qualitativeLimits?: QualitativeLimitV1[];
  modelRules?: ModelRuleV1[];
  promotions?: PromotionV1[];
  verificationStatus?: VerificationStatusV1;
  models?: Record<string, ModelV1>;
  pricing?: Record<string, PricingV1>;
}

export function makeFixtureCatalog(options: FixtureCatalogOptions): CatalogV1 {
  const planId = options.planId ?? "fixture-plan";
  const effectiveFrom = options.effectiveFrom ?? "2026-08-01";
  const versionId = `${planId}@${effectiveFrom}`;

  const version: LoadedPlanVersionV1 = {
    effectiveFrom,
    ...(options.effectiveTo !== undefined ? { effectiveTo: options.effectiveTo } : {}),
    price: { currency: "USD", amount: options.priceAmount ?? "20.00", interval: "month" },
    limits: options.limits,
    ...(options.qualitativeLimits !== undefined
      ? { qualitativeLimits: options.qualitativeLimits }
      : {}),
    modelRules: options.modelRules ?? [
      { model: "fixture-small", pricingRef: "fixture-small-pricing" },
      { model: "fixture-medium", pricingRef: "fixture-medium-pricing" },
    ],
    ...(options.promotions !== undefined ? { promotions: options.promotions } : {}),
    sources: [
      { url: "https://example.invalid/plan", title: "Fixture plan", checkedAt: effectiveFrom },
    ],
    lastVerifiedAt: effectiveFrom,
    verificationStatus: options.verificationStatus ?? "estimated",
    versionId,
    planId,
    planName: options.planName ?? "Fixture Plan",
    providerId: "fixture-provider",
  };

  return {
    catalogVersion: FIXTURE_CATALOG_VERSION,
    providers: { "fixture-provider": fixtureProvider },
    models: options.models ?? fixtureModels,
    plans: {
      [planId]: {
        id: planId,
        role: "plan",
        name: version.planName,
        providerId: "fixture-provider",
        versions: [
          {
            effectiveFrom: version.effectiveFrom,
            ...(version.effectiveTo !== undefined ? { effectiveTo: version.effectiveTo } : {}),
            price: version.price,
            limits: version.limits,
            ...(version.qualitativeLimits !== undefined
              ? { qualitativeLimits: version.qualitativeLimits }
              : {}),
            modelRules: version.modelRules,
            ...(version.promotions !== undefined ? { promotions: version.promotions } : {}),
            sources: version.sources,
            lastVerifiedAt: version.lastVerifiedAt,
            verificationStatus: version.verificationStatus,
          },
        ],
      },
    },
    planVersions: { [versionId]: version },
    pricing: options.pricing ?? fixturePricing,
  };
}

export const fixtureTarget: SubscriptionTargetV1 = {
  type: "subscription",
  planVersionId: FIXTURE_PLAN_VERSION_ID,
};

export const fixtureContext: ReplayContextV1 = { rulesAsOf: FIXTURE_RULES_AS_OF };

export function overageRate(amount: string, unit: OverageRateV1["unit"]): OverageRateV1 {
  return { amount, unit };
}

export function rollingLimit(
  overrides: Partial<PlanLimitV1> & Pick<PlanLimitV1, "id" | "type" | "amount">,
): PlanLimitV1 {
  return {
    label: overrides.label ?? overrides.id,
    window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
    exceed: "reject_request",
    ...overrides,
  };
}

export function calendarLimit(
  overrides: Partial<PlanLimitV1> & Pick<PlanLimitV1, "id" | "type" | "amount">,
): PlanLimitV1 {
  return {
    label: overrides.label ?? overrides.id,
    window: { type: "calendar", unit: "month", timezone: "UTC" },
    exceed: "reject_request",
    ...overrides,
  };
}
