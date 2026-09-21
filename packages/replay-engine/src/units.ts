import type { PricingV1 } from "@stackreplay/catalog";
import type { TextUsageV1 } from "@stackreplay/schema";
import { Decimal, parseAmount, ZERO } from "./money.js";

/**
 * Consumption conversion (spec point 22, step 5). Prices are per 1M tokens.
 *
 * Fallbacks are explicit and never silent:
 * - cache tokens without a dedicated cache rate fall back to the input rate;
 * - reasoning tokens without a dedicated reasoning rate fall back to the
 *   output rate;
 * - a model without a pricing entry cannot be converted at all (0 units plus
 *   a warning), rather than being guessed.
 */

const TOKENS_PER_PRICING_UNIT = 1_000_000;

/**
 * Per-token rates are derived once per distinct per-million rate string and
 * reused: the conversion runs for every event and every pricing entry, so the
 * division is memoized rather than repeated a hundred thousand times.
 */
const perTokenRateCache = new Map<string, Decimal>();

function perTokenRate(amountPerMillion: string): Decimal {
  const cached = perTokenRateCache.get(amountPerMillion);
  if (cached !== undefined) return cached;
  const rate = parseAmount(amountPerMillion).div(TOKENS_PER_PRICING_UNIT);
  perTokenRateCache.set(amountPerMillion, rate);
  return rate;
}

export interface MoneyConversionOutcome {
  units: Decimal;
  usedCacheFallbackRate: boolean;
  usedReasoningFallbackRate: boolean;
  missingPricing: boolean;
}

export function tokenCountOf(usage: TextUsageV1): number {
  return (
    (usage.inputTokens ?? 0) +
    (usage.outputTokens ?? 0) +
    (usage.cacheReadTokens ?? 0) +
    (usage.cacheWriteTokens ?? 0) +
    (usage.reasoningTokens ?? 0)
  );
}

export function hasAnyTokenData(usage: TextUsageV1): boolean {
  return Object.values(usage).some((value) => value !== undefined);
}

export function moneyUnitsForUsage(
  usage: TextUsageV1,
  pricing: PricingV1 | undefined,
): MoneyConversionOutcome {
  if (pricing === undefined) {
    return {
      units: ZERO,
      usedCacheFallbackRate: false,
      usedReasoningFallbackRate: false,
      missingPricing: true,
    };
  }

  let units = ZERO;
  let usedCacheFallbackRate = false;
  let usedReasoningFallbackRate = false;

  const inputTokens = usage.inputTokens ?? 0;
  if (inputTokens > 0) {
    units = units.plus(new Decimal(inputTokens).times(perTokenRate(pricing.rates.input)));
  }

  const outputTokens = usage.outputTokens ?? 0;
  if (outputTokens > 0) {
    units = units.plus(new Decimal(outputTokens).times(perTokenRate(pricing.rates.output)));
  }

  const cacheReadTokens = usage.cacheReadTokens ?? 0;
  if (cacheReadTokens > 0) {
    const rate = pricing.rates.cacheRead;
    if (rate !== undefined) {
      units = units.plus(new Decimal(cacheReadTokens).times(perTokenRate(rate)));
    } else {
      units = units.plus(new Decimal(cacheReadTokens).times(perTokenRate(pricing.rates.input)));
      usedCacheFallbackRate = true;
    }
  }

  const cacheWriteTokens = usage.cacheWriteTokens ?? 0;
  if (cacheWriteTokens > 0) {
    const rate = pricing.rates.cacheWrite;
    if (rate !== undefined) {
      units = units.plus(new Decimal(cacheWriteTokens).times(perTokenRate(rate)));
    } else {
      units = units.plus(new Decimal(cacheWriteTokens).times(perTokenRate(pricing.rates.input)));
      usedCacheFallbackRate = true;
    }
  }

  const reasoningTokens = usage.reasoningTokens ?? 0;
  if (reasoningTokens > 0) {
    const rate = pricing.rates.reasoning;
    if (rate !== undefined) {
      units = units.plus(new Decimal(reasoningTokens).times(perTokenRate(rate)));
    } else {
      units = units.plus(new Decimal(reasoningTokens).times(perTokenRate(pricing.rates.output)));
      usedReasoningFallbackRate = true;
    }
  }

  return { units, usedCacheFallbackRate, usedReasoningFallbackRate, missingPricing: false };
}
