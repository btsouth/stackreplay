import { z } from "zod";
import { decimalAmountV1Schema, isoDateV1Schema } from "./scalars.js";
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

/**
 * A time-of-day schedule, optionally with a published date calendar.
 *
 * Some schedules skip named dates: DeepSeek's peak hours exclude Chinese public
 * holidays, so a weekday holiday is off-peak all day. The calendar is dated in
 * UTC, which only works when every window falls inside the same calendar day in
 * the source's own zone; the author checks that before listing dates.
 *
 * A calendar is only as complete as its source. `unestablishedUtcDates` names
 * dates the source leaves open (it is not clear whether a window applies), and
 * `datesKnownThrough` bounds the calendar: on a later date the windows' own
 * hours are unestablished, because a holiday there would not be listed yet.
 * Outside the windows' hours the base rates apply either way.
 */
export const pricingTierScheduleConditionV1Schema = z.strictObject({
  utcWindows: z.array(utcTimeWindowV1Schema).min(1),
  /** UTC dates on which no window applies; the base rates price the whole day. */
  exceptUtcDates: z.array(isoDateV1Schema).min(1).optional(),
  /** UTC dates on which the source does not establish whether a window applies. */
  unestablishedUtcDates: z.array(isoDateV1Schema).min(1).optional(),
  /** Last UTC date the date lists are complete for. Required with either list. */
  datesKnownThrough: isoDateV1Schema.optional(),
});
export type PricingTierScheduleConditionV1 = z.infer<typeof pricingTierScheduleConditionV1Schema>;

export const pricingTierConditionV1Schema = z.union([
  pricingTierInputConditionV1Schema,
  pricingTierScheduleConditionV1Schema,
]);
export type PricingTierConditionV1 = z.infer<typeof pricingTierConditionV1Schema>;

export const pricingTierV1Schema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be a lowercase slug (a-z, 0-9, dashes)"),
  label: z.string().min(1),
  when: pricingTierConditionV1Schema,
  /** Complete rate set for this tier; same categories as the base rates. */
  rates: pricingRateSetV1Schema,
});
export type PricingTierV1 = z.infer<typeof pricingTierV1Schema>;

export interface ExecutionTokenRateV1 {
  rates: PricingRateSetV1;
  tiers?: PricingTierV1[] | undefined;
}
