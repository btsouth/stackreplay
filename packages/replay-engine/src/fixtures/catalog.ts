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

/* ------------------------------------------------------------------ *
 * Direct API fixtures (M4C)
 *
 * The subscription fixtures above are byte-pinned by golden snapshots, so the
 * API path gets its own catalog rather than reshaping theirs. These models carry
 * explicit offering sets, because "which providers serve this model" is the
 * question a Direct API replay has to answer and a subscription replay never
 * asks.
 * ------------------------------------------------------------------ */

/** A second provider: offering sets that differ per provider need one. */
export const fixtureOpenProvider: ProviderV1 = {
  id: "fixture-open",
  role: "provider",
  name: "Fixture Open",
  sources: [
    { url: "https://example.invalid/fixture-open", title: "Fixture", checkedAt: "2026-08-01" },
  ],
  lastVerifiedAt: "2026-08-01",
  verificationStatus: "estimated",
};

const apiModel = (
  id: string,
  overrides: { providerIds?: string[]; aliases?: ModelV1["aliases"] } = {},
): ModelV1 => ({
  id,
  role: "model",
  name: `${id} (fixture)`,
  ...(overrides.providerIds !== undefined ? { providerIds: overrides.providerIds } : {}),
  ...(overrides.aliases !== undefined ? { aliases: overrides.aliases } : {}),
  sources: [{ url: `https://example.invalid/${id}`, title: "Fixture", checkedAt: "2026-08-01" }],
  lastVerifiedAt: "2026-08-01",
  verificationStatus: "estimated",
});

export const apiFixtureModels: Record<string, ModelV1> = {
  /** Offered by the provider under test, priced from 2026-01-01. */
  "fixture-api-small": apiModel("fixture-api-small", {
    providerIds: ["fixture-provider"],
    aliases: [
      {
        id: "fixture-api-small-provider-alias",
        alias: "fixture-api-small-v2",
        kind: "provider_id",
        sources: [
          { url: "https://example.invalid/alias", title: "Fixture alias", checkedAt: "2026-08-01" },
        ],
        lastVerifiedAt: "2026-08-01",
        verificationStatus: "estimated",
      },
    ],
  }),
  /** Offered by both providers: availability is a per-provider fact. */
  "fixture-api-dual": apiModel("fixture-api-dual", {
    providerIds: ["fixture-provider", "fixture-open"],
  }),
  /** Known to exist, but only the other provider offers it. */
  "fixture-api-open-only": apiModel("fixture-api-open-only", { providerIds: ["fixture-open"] }),
  /** The catalog does not record which providers offer it. */
  "fixture-api-no-offering": apiModel("fixture-api-no-offering"),
  /** Offered, but with no pricing record of any basis. */
  "fixture-api-unpriced": apiModel("fixture-api-unpriced", {
    providerIds: ["fixture-provider"],
  }),
  /** Offered, but its only pricing record is a billing-rate, not an API price. */
  "fixture-api-rate-basis": apiModel("fixture-api-rate-basis", {
    providerIds: ["fixture-provider"],
  }),
};

/** Round numbers keep fixture arithmetic readable. Per 1M tokens. */
export const apiFixturePricing: Record<string, PricingV1> = {
  "fixture-api-small-pricing": {
    id: "fixture-api-small-pricing",
    role: "pricing",
    modelId: "fixture-api-small",
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
    /** Ends when the next price for this model starts: the catalog forbids overlap. */
    effectiveTo: "2026-09-30",
    sources: [
      { url: "https://example.invalid/api-pricing", title: "Fixture", checkedAt: "2026-01-01" },
    ],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  },
  /** The same model, repriced later: selection is by the pinned instant. */
  "fixture-api-small-pricing-2026-10": {
    id: "fixture-api-small-pricing-2026-10",
    role: "pricing",
    modelId: "fixture-api-small",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates: { input: "4.00", output: "8.00" },
    effectiveFrom: "2026-10-01",
    sources: [
      { url: "https://example.invalid/api-pricing-2", title: "Fixture", checkedAt: "2026-10-01" },
    ],
    lastVerifiedAt: "2026-10-01",
    verificationStatus: "estimated",
  },
  "fixture-api-dual-pricing": {
    id: "fixture-api-dual-pricing",
    role: "pricing",
    modelId: "fixture-api-dual",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates: { input: "0.50", output: "1.50" },
    effectiveFrom: "2026-01-01",
    sources: [
      { url: "https://example.invalid/api-pricing", title: "Fixture", checkedAt: "2026-01-01" },
    ],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  },
  /** A model that only the other provider offers, priced anyway. */
  "fixture-api-open-only-pricing": {
    id: "fixture-api-open-only-pricing",
    role: "pricing",
    modelId: "fixture-api-open-only",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    rates: { input: "1.00", output: "2.00" },
    effectiveFrom: "2026-01-01",
    sources: [
      { url: "https://example.invalid/api-pricing", title: "Fixture", checkedAt: "2026-01-01" },
    ],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  },
  /** Not an API price: a subscription-equivalent billing rate. */
  "fixture-api-rate-basis-pricing": {
    id: "fixture-api-rate-basis-pricing",
    role: "pricing",
    modelId: "fixture-api-rate-basis",
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "target_billing_rate",
    rates: { input: "9.00", output: "9.00" },
    effectiveFrom: "2026-01-01",
    sources: [
      { url: "https://example.invalid/billing-rate", title: "Fixture", checkedAt: "2026-01-01" },
    ],
    lastVerifiedAt: "2026-01-01",
    verificationStatus: "estimated",
  },
};

/** One fixture pricing record, or a loud failure: tests never index blindly. */
/** The fixture model record for one id, or a clear failure. */
export function apiModelRecord(id: string): ModelV1 {
  const record = apiFixtureModels[id];
  if (record === undefined) throw new Error(`no API fixture model "${id}"`);
  return record;
}

export function apiPricingRecord(id: string): PricingV1 {
  const record = apiFixturePricing[id];
  if (record === undefined) throw new Error(`no API fixture pricing record "${id}"`);
  return record;
}

export interface ApiFixtureCatalogOptions {
  models?: Record<string, ModelV1>;
  pricing?: Record<string, PricingV1>;
  providers?: Record<string, ProviderV1>;
}

/**
 * A Direct API fixture catalog.
 *
 * Deliberately not built through `makeFixtureCatalog`: that helper's plan
 * versions, limits and model rules describe a subscription target, and the point
 * of the API path is that none of those govern it.
 */
export function makeApiFixtureCatalog(options: ApiFixtureCatalogOptions = {}): CatalogV1 {
  return {
    catalogVersion: FIXTURE_CATALOG_VERSION,
    providers: options.providers ?? {
      "fixture-provider": fixtureProvider,
      "fixture-open": fixtureOpenProvider,
    },
    models: options.models ?? apiFixtureModels,
    plans: {},
    planVersions: {},
    pricing: options.pricing ?? apiFixturePricing,
  };
}

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
