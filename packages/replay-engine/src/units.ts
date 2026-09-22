import type { PricingRateSetV1, PricingTierConditionV1, PricingV1 } from "@stackreplay/catalog";
import type { TextUsageV1 } from "@stackreplay/schema";
import { Decimal, parseAmount, ZERO } from "./money.js";
import { utcWallClock } from "./time.js";

/**
 * Canonical token accounting (decision 15) and money conversion
 * (spec point 22, step 5, decision 35 and the M4A pricing remediation).
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
 * Money conversion prices the disjoint buckets at the rates the selected
 * pricing rule establishes for them, and nothing else:
 *
 * - a category with a published rate is priced at it;
 * - a category with an explicit, sourced `billedAs` relationship is priced at
 *   the named category's rate (for example thinking tokens billed as output);
 * - a nonzero bucket the pricing rule does not establish makes the event's
 *   monetary consumption unknown. There is no universal fallback: a missing
 *   cache rate is never substituted with the input rate and a missing reasoning
 *   rate is never substituted with the output rate (decision 35);
 * - explicit zero consumption in an unpriced category is known data and does
 *   not make the event unknown;
 * - missing telemetry (`missingCategories`) and missing pricing
 *   (`unpricedCategories`, `missingPricing`) stay distinguishable.
 *
 * A pricing record may select its rates per event through conditional tiers
 * (request-size or UTC time-of-day schedules); see `selectRateSet`. A model
 * without a pricing entry cannot be converted at all.
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

export type PricingCategory = "input" | "output" | "cacheRead" | "cacheWrite" | "reasoning";

export interface PricingSelectionContext {
  /** Historical event instant in epoch milliseconds; the engine never reads a clock. */
  atMs: number;
  /**
   * The request's total input-side token count: uncached input plus cache
   * reads plus cache writes.
   */
  inputTokens: number;
}

export interface RateSetSelection {
  rates: PricingRateSetV1;
  /** Id of the conditional tier that applied; absent means the base rates. */
  tierId?: string;
}

const DAY_BY_UTC_WEEKDAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function minutesOfDay(value: string): number {
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

function tierApplies(condition: PricingTierConditionV1, when: PricingSelectionContext): boolean {
  if ("inputTokensAbove" in condition) return when.inputTokens > condition.inputTokensAbove;
  const clock = utcWallClock(when.atMs);
  const day = DAY_BY_UTC_WEEKDAY[clock.day];
  if (day === undefined) return false;
  return condition.utcWindows.some(
    (window) =>
      window.days.includes(day) &&
      minutesOfDay(window.start) <= clock.minutes &&
      clock.minutes < minutesOfDay(window.end),
  );
}

/**
 * Selects the rate set that prices one event (M4A pricing remediation).
 *
 * A conditional tier overrides the record's base rates when its documented
 * condition holds for properties the replay knows about the event: the
 * request's input-side token count and the historical instant. Catalog
 * validation keeps tier conditions disjoint, so at most one tier can match and
 * selection never depends on declaration order.
 */
export function selectRateSet(pricing: PricingV1, when: PricingSelectionContext): RateSetSelection {
  for (const tier of pricing.tiers ?? []) {
    if (tierApplies(tier.when, when)) return { rates: tier.rates, tierId: tier.id };
  }
  return { rates: pricing.rates };
}

/**
 * Per-token rate for a category, following only explicit, sourced `billedAs`
 * relationships. Catalog validation guarantees the target of such a
 * relationship is a published amount in the same rate set, so the result is
 * never a chained or cyclic substitution.
 */
function rateFor(rates: PricingRateSetV1, category: PricingCategory): Decimal | undefined {
  const value = rates[category];
  if (value === undefined) return undefined;
  if (typeof value === "string") return perTokenRate(value);
  const target = rates[value.billedAs];
  return typeof target === "string" ? perTokenRate(target) : undefined;
}

export interface MoneyConversionOutcome {
  /** False when telemetry is incomplete, pricing is absent, or a nonzero bucket is unpriced. */
  known: boolean;
  units: Decimal;
  /** No pricing entry establishes rates for this event's model at all. */
  missingPricing: boolean;
  /** Nonzero consumed buckets the selected rate set does not establish. */
  unpricedCategories: readonly PricingCategory[];
  /** Categories the event does not report: missing telemetry, never missing pricing. */
  missingCategories: readonly string[];
  /** Conditional tier that priced this event; absent means the base rates. */
  tierId?: string;
}

export function moneyUnitsForUsage(
  usage: TextUsageV1,
  pricing: PricingV1 | undefined,
  when: { atMs: number },
): MoneyConversionOutcome {
  const accounting = tokenAccountingOf(usage);

  if (pricing === undefined) {
    return {
      known: false,
      units: ZERO,
      missingPricing: true,
      unpricedCategories: [],
      missingCategories: accounting.known ? [] : accounting.missing,
    };
  }

  if (!accounting.known) {
    return {
      known: false,
      units: ZERO,
      missingPricing: false,
      unpricedCategories: [],
      missingCategories: accounting.missing,
    };
  }

  const { buckets } = accounting;
  const selection = selectRateSet(pricing, {
    atMs: when.atMs,
    inputTokens: buckets.uncachedInputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens,
  });

  const quantities: ReadonlyArray<readonly [PricingCategory, number]> = [
    ["input", buckets.uncachedInputTokens],
    ["cacheRead", buckets.cacheReadTokens],
    ["cacheWrite", buckets.cacheWriteTokens],
    ["output", buckets.outputTokens],
    ["reasoning", buckets.reasoningTokens],
  ];

  let units = ZERO;
  const unpricedCategories: PricingCategory[] = [];
  for (const [category, count] of quantities) {
    // Explicit zero consumption in an unpriced category is known data and must
    // not make the event's economics unknown. A non-positive bucket is not
    // consumption and never contributes.
    if (count <= 0) continue;
    const rate = rateFor(selection.rates, category);
    if (rate === undefined) {
      unpricedCategories.push(category);
      continue;
    }
    units = units.plus(new Decimal(count).times(rate));
  }

  return {
    // Never publish a partial number: unknown is not a subtotal.
    known: unpricedCategories.length === 0,
    units: unpricedCategories.length === 0 ? units : ZERO,
    missingPricing: false,
    unpricedCategories,
    missingCategories: [],
    ...(selection.tierId !== undefined ? { tierId: selection.tierId } : {}),
  };
}
