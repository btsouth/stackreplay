import type { PricingV1 } from "@stackreplay/catalog";
import type { TextUsageV1 } from "@stackreplay/schema";
import { Decimal, parseAmount, ZERO } from "./money.js";

/**
 * Canonical token accounting (decision 15) and money conversion
 * (spec point 22, step 5).
 *
 * The canonical buckets are disjoint: uncached input, cache reads, cache
 * writes, output and reasoning. An event declares how its reported categories
 * relate to each other, and this module derives the disjoint view, so a subset
 * category is never added twice.
 *
 * Knownness is explicit (decisions 15, 16): a bucket is known when its category
 * is present, and a token total is known only when every canonical bucket is
 * present. An absent category is unknown, not zero; an explicit zero is known
 * data.
 *
 * Money conversion prices the disjoint buckets:
 * - uncached input at the input rate;
 * - cache reads and writes at their own rates, falling back to the input rate
 *   when the pricing entry has none (explicit, warned);
 * - output at the output rate;
 * - reasoning at its own rate, falling back to the output rate (explicit, warned).
 * A model without a pricing entry cannot be converted at all.
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

export interface DisjointBuckets {
  uncachedInputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export type TokenAccounting =
  | { known: true; buckets: DisjointBuckets; total: number }
  | { known: false; knownSubtotal: number; missing: readonly string[] };

/** Raw sum of the categories an event reports, used as a safety bound only. */
export function reportedTokenCount(usage: TextUsageV1): number {
  return (
    (usage.inputTokens ?? 0) +
    (usage.outputTokens ?? 0) +
    (usage.cacheReadTokens ?? 0) +
    (usage.cacheWriteTokens ?? 0) +
    (usage.reasoningTokens ?? 0)
  );
}

export function hasAnyReportedTokens(usage: TextUsageV1): boolean {
  return (
    usage.inputTokens !== undefined ||
    usage.outputTokens !== undefined ||
    usage.cacheReadTokens !== undefined ||
    usage.cacheWriteTokens !== undefined ||
    usage.reasoningTokens !== undefined
  );
}

/**
 * Derives the disjoint canonical buckets. Categories declared as included in
 * their base are subtracted from it, so overlapping telemetry is never double
 * counted. A missing category makes the total unknown.
 */
export function tokenAccountingOf(usage: TextUsageV1): TokenAccounting {
  const missing: string[] = [];
  const reported = (value: number | undefined, name: string): number => {
    if (value === undefined) {
      missing.push(name);
      return 0;
    }
    return value;
  };

  const input = reported(usage.inputTokens, "inputTokens");
  const cacheRead = reported(usage.cacheReadTokens, "cacheReadTokens");
  const cacheWrite = reported(usage.cacheWriteTokens, "cacheWriteTokens");
  const output = reported(usage.outputTokens, "outputTokens");
  const reasoning = reported(usage.reasoningTokens, "reasoningTokens");

  const accounting = usage.accounting;
  const buckets: DisjointBuckets = {
    uncachedInputTokens:
      input -
      (accounting?.cacheReadIncludedInInput === true ? cacheRead : 0) -
      (accounting?.cacheWriteIncludedInInput === true ? cacheWrite : 0),
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    outputTokens: output - (accounting?.reasoningIncludedInOutput === true ? reasoning : 0),
    reasoningTokens: reasoning,
  };

  const total =
    buckets.uncachedInputTokens +
    buckets.cacheReadTokens +
    buckets.cacheWriteTokens +
    buckets.outputTokens +
    buckets.reasoningTokens;

  return missing.length === 0
    ? { known: true, buckets, total }
    : { known: false, knownSubtotal: total, missing };
}

export interface MoneyConversionOutcome {
  /** False when a required token category is unknown or pricing is missing. */
  known: boolean;
  units: Decimal;
  usedCacheFallbackRate: boolean;
  usedReasoningFallbackRate: boolean;
  missingPricing: boolean;
  missingCategories: readonly string[];
}

export function moneyUnitsForUsage(
  usage: TextUsageV1,
  pricing: PricingV1 | undefined,
): MoneyConversionOutcome {
  const accounting = tokenAccountingOf(usage);

  if (pricing === undefined) {
    return {
      known: false,
      units: ZERO,
      usedCacheFallbackRate: false,
      usedReasoningFallbackRate: false,
      missingPricing: true,
      missingCategories: accounting.known ? [] : accounting.missing,
    };
  }

  if (!accounting.known) {
    return {
      known: false,
      units: ZERO,
      usedCacheFallbackRate: false,
      usedReasoningFallbackRate: false,
      missingPricing: false,
      missingCategories: accounting.missing,
    };
  }

  const { buckets } = accounting;
  let units = ZERO;
  let usedCacheFallbackRate = false;
  let usedReasoningFallbackRate = false;

  if (buckets.uncachedInputTokens > 0) {
    units = units.plus(
      new Decimal(buckets.uncachedInputTokens).times(perTokenRate(pricing.rates.input)),
    );
  }

  if (buckets.cacheReadTokens > 0) {
    const rate = pricing.rates.cacheRead;
    units = units.plus(
      new Decimal(buckets.cacheReadTokens).times(
        rate !== undefined ? perTokenRate(rate) : perTokenRate(pricing.rates.input),
      ),
    );
    if (rate === undefined) usedCacheFallbackRate = true;
  }

  if (buckets.cacheWriteTokens > 0) {
    const rate = pricing.rates.cacheWrite;
    units = units.plus(
      new Decimal(buckets.cacheWriteTokens).times(
        rate !== undefined ? perTokenRate(rate) : perTokenRate(pricing.rates.input),
      ),
    );
    if (rate === undefined) usedCacheFallbackRate = true;
  }

  if (buckets.outputTokens > 0) {
    units = units.plus(new Decimal(buckets.outputTokens).times(perTokenRate(pricing.rates.output)));
  }

  if (buckets.reasoningTokens > 0) {
    const rate = pricing.rates.reasoning;
    units = units.plus(
      new Decimal(buckets.reasoningTokens).times(
        rate !== undefined ? perTokenRate(rate) : perTokenRate(pricing.rates.output),
      ),
    );
    if (rate === undefined) usedReasoningFallbackRate = true;
  }

  return {
    known: true,
    units,
    usedCacheFallbackRate,
    usedReasoningFallbackRate,
    missingPricing: false,
    missingCategories: [],
  };
}
