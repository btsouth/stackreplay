import type { PricingV1 } from "@stackreplay/catalog";
import { type ApiTokenEstimateRate, parseTokenRate } from "./api-token-estimate";
import { loadCatalog } from "./public-catalog";

export type ApiTokenEstimateEligibility =
  | ({
      state: "eligible";
      modelId: string;
      pricingId: string;
      endpointId?: string | undefined;
      effectiveFrom: string;
      effectiveFromInstant?: string | undefined;
      effectiveTo?: string | undefined;
      lastVerifiedAt: string;
      sources: { title: string; url: string; checkedAt: string }[];
    } & ApiTokenEstimateRate)
  | {
      state: "unavailable";
      reason:
        | "no_current_base"
        | "unverified"
        | "ambiguous"
        | "conditional"
        | "promotion"
        | "invalid_rates";
    };

type RateKey = keyof PricingV1["rates"];
const RATE_KEYS: readonly RateKey[] = ["input", "output", "cacheRead", "cacheWrite", "reasoning"];

/** Resolve only explicit same-record aliases to known numeric categories, failing closed on cycles. */
function numericRate(
  rates: PricingV1["rates"],
  key: RateKey,
  seen: RateKey[] = [],
): string | undefined {
  if (seen.includes(key)) return undefined;
  const rate = rates[key];
  if (typeof rate === "string") return parseTokenRate(rate) ? rate : undefined;
  if (!rate || !RATE_KEYS.includes(rate.billedAs)) return undefined;
  return numericRate(rates, rate.billedAs, [...seen, key]);
}

/**
 * Read full records on the server. Strictly newer record dates supersede earlier
 * snapshots only within the same explicit endpoint (or the same unscoped basis).
 * Same-day ties and unscoped/scoped mixtures remain ambiguous; access-provider
 * identities never supply a route. Conditions and verification are checked AFTER
 * selection, so a simpler/verified old record cannot replace a current conflict.
 */
export function selectApiTokenEstimate(
  records: readonly PricingV1[],
  modelId: string,
  asOf: string,
): ApiTokenEstimateEligibility {
  const current = records.filter(
    (record) =>
      record.modelId === modelId &&
      record.basis === "api_list_price" &&
      (record.serviceTier ?? "standard") === "standard" &&
      record.variantId === undefined &&
      record.effectiveFrom <= asOf &&
      (!record.effectiveTo || record.effectiveTo >= asOf) &&
      (!record.effectiveFromInstant ||
        Date.parse(record.effectiveFromInstant) < Date.parse(`${asOf}T00:00:00Z`) + 86_400_000),
  );
  if (current.length === 0) return { state: "unavailable", reason: "no_current_base" };
  const routes = new Map<string | undefined, PricingV1[]>();
  for (const record of current) {
    const group = routes.get(record.endpointId) ?? [];
    const newest = group[0];
    if (!newest || record.effectiveFrom > newest.effectiveFrom)
      routes.set(record.endpointId, [record]);
    else if (record.effectiveFrom === newest.effectiveFrom) group.push(record);
  }
  const candidates = [...routes.values()].flat();
  if (candidates.length !== 1) return { state: "unavailable", reason: "ambiguous" };
  const record = candidates[0];
  if (record?.verificationStatus !== "verified")
    return { state: "unavailable", reason: "unverified" };
  if (record.tiers?.length) return { state: "unavailable", reason: "conditional" };
  if (record.promotion) return { state: "unavailable", reason: "promotion" };
  const inputRatePerMillion = numericRate(record.rates, "input");
  const outputRatePerMillion = numericRate(record.rates, "output");
  if (
    record.currency !== "USD" ||
    record.unit !== "per_1m_tokens" ||
    inputRatePerMillion === undefined ||
    outputRatePerMillion === undefined
  ) {
    return { state: "unavailable", reason: "invalid_rates" };
  }
  return {
    state: "eligible",
    modelId,
    pricingId: record.id,
    inputRatePerMillion,
    outputRatePerMillion,
    endpointId: record.endpointId,
    effectiveFrom: record.effectiveFrom,
    effectiveFromInstant: record.effectiveFromInstant,
    effectiveTo: record.effectiveTo,
    lastVerifiedAt: record.lastVerifiedAt,
    sources: record.sources.map(({ title, url, checkedAt }) => ({ title, url, checkedAt })),
  };
}

export function apiTokenEstimateForModel(
  modelId: string,
  asOf: string,
): ApiTokenEstimateEligibility {
  return selectApiTokenEstimate(Object.values(loadCatalog().pricing), modelId, asOf);
}
