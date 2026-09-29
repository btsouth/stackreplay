import type { ServiceTierAvailabilityV1, ServiceTierV1 } from "@stackreplay/schema";
import type { CatalogV1 } from "./catalog.js";
import type { ModelServiceTierV1, PricingV1 } from "./schema.js";

/**
 * Processing-tier selection, in one place.
 *
 * Every consumer that picks "the" API price for a model uses
 * `isDefaultPriceRecord`, so a Batch, Flex, Fast or Ultrafast record can never
 * be read as the model's Standard price. A replay that asks for a tier reads
 * only that tier's records: a tier with no record in force is unpriced, never
 * Standard, and a tier the provider does not offer yet is never priced at all.
 */

/** The tier a pricing record prices; records written before tiers existed are Standard. */
export function pricingServiceTierOf(pricing: Pick<PricingV1, "serviceTier">): ServiceTierV1 {
  return pricing.serviceTier ?? "standard";
}

/** Whether automatic (Standard, non-variant) price selection may use this record. */
export function isDefaultPriceRecord(pricing: Pick<PricingV1, "variantId" | "serviceTier">) {
  return pricing.variantId === undefined && pricingServiceTierOf(pricing) === "standard";
}

/** Whether a replay at `tier` may use this record. */
export function pricesServiceTier(
  pricing: Pick<PricingV1, "variantId" | "serviceTier">,
  tier: ServiceTierV1,
): boolean {
  return pricing.variantId === undefined && pricingServiceTierOf(pricing) === tier;
}

/** A tier's availability as the catalog records it, or `not_recorded`. */
export type ServiceTierAvailabilityReadingV1 = ServiceTierAvailabilityV1 | "not_recorded";

export interface ServiceTierReadingV1 {
  tier: ServiceTierV1;
  availability: ServiceTierAvailabilityReadingV1;
  note?: string;
  /** The API list-price record in force for this tier on the day asked about. */
  pricing?: PricingV1;
  /**
   * Whether a replay may price this tier: offered (`available`) and priced.
   * Standard needs no availability entry, because every API list price written
   * before tiers existed is a Standard price.
   */
  priceable: boolean;
}

function inForce(pricing: PricingV1, day: string): boolean {
  return (
    pricing.effectiveFrom <= day &&
    (pricing.effectiveTo === undefined || pricing.effectiveTo >= day) &&
    (pricing.effectiveFromInstant === undefined || pricing.effectiveFromInstant.slice(0, 10) <= day)
  );
}

/** The API list-price record for one model and tier in force on `day`, newest first. */
export function tierPricingAt(
  catalog: Pick<CatalogV1, "pricing">,
  modelId: string,
  tier: ServiceTierV1,
  day: string,
): PricingV1 | undefined {
  let selected: PricingV1 | undefined;
  for (const pricing of Object.values(catalog.pricing)) {
    if (pricing.modelId !== modelId || pricing.basis !== "api_list_price") continue;
    if (!pricesServiceTier(pricing, tier) || !inForce(pricing, day)) continue;
    if (
      selected === undefined ||
      pricing.effectiveFrom > selected.effectiveFrom ||
      (pricing.effectiveFrom === selected.effectiveFrom && pricing.id < selected.id)
    )
      selected = pricing;
  }
  return selected;
}

function readingFor(
  catalog: Pick<CatalogV1, "pricing">,
  modelId: string,
  tier: ServiceTierV1,
  listed: ModelServiceTierV1 | undefined,
  day: string,
): ServiceTierReadingV1 {
  const pricing = tierPricingAt(catalog, modelId, tier, day);
  const availability: ServiceTierAvailabilityReadingV1 = listed?.availability ?? "not_recorded";
  const offered =
    tier === "standard" ? availability !== "unavailable" : availability === "available";
  return {
    tier,
    availability,
    ...(listed?.note !== undefined ? { note: listed.note } : {}),
    ...(pricing !== undefined ? { pricing } : {}),
    priceable: offered && pricing !== undefined,
  };
}

/** One model's reading for one tier on `day`. */
export function resolveServiceTier(
  catalog: Pick<CatalogV1, "models" | "pricing">,
  modelId: string,
  tier: ServiceTierV1,
  day: string,
): ServiceTierReadingV1 {
  const listed = catalog.models[modelId]?.serviceTiers?.find((entry) => entry.tier === tier);
  return readingFor(catalog, modelId, tier, listed, day.slice(0, 10));
}

/**
 * Every tier the catalog records for a model, in the model's own order, with
 * Standard first when the model lists it. A model that lists no tiers returns
 * nothing: its tiers are not established.
 */
export function modelServiceTiers(
  catalog: Pick<CatalogV1, "models" | "pricing">,
  modelId: string,
  day: string,
): ServiceTierReadingV1[] {
  const listed = catalog.models[modelId]?.serviceTiers ?? [];
  return listed.map((entry) => readingFor(catalog, modelId, entry.tier, entry, day.slice(0, 10)));
}
