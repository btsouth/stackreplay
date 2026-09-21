import { z } from "zod";

/**
 * Shared scalar shapes for the versioned schemas.
 *
 * Timestamps are always ISO-8601 UTC strings (spec point 9: timestamps are
 * stored internally in UTC). Money and multipliers are decimal strings; no
 * monetary value is ever a JavaScript number (spec point 9).
 *
 * Bounded decimal envelope (decision 18): at most 28 significant digits and at
 * most 18 fractional digits. The engine computes with 100 significant digits,
 * which is exact for every supported operation over values inside this
 * envelope, so an accepted value is never silently rounded. Values outside the
 * envelope are rejected instead.
 */

export const MAX_SIGNIFICANT_DIGITS = 28;
export const MAX_FRACTIONAL_DIGITS = 18;

export const ISO_UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const DECIMAL_AMOUNT_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
export const SIGNED_DECIMAL_AMOUNT_PATTERN = /^-?(0|[1-9]\d*)(\.\d+)?$/;
export const POSITIVE_DECIMAL_PATTERN = /^(0\.\d*[1-9]\d*|[1-9]\d*(\.\d+)?)$/;

export const isoUtcTimestampV1Schema = z
  .string()
  .regex(ISO_UTC_TIMESTAMP_PATTERN, "must be an ISO-8601 UTC timestamp")
  .refine(isValidUtcTimestamp, "must be a real UTC instant (leap seconds are unsupported)");

export function isValidDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= (days[month - 1] ?? 0);
}

export function isValidUtcTimestamp(value: string): boolean {
  return (
    ISO_UTC_TIMESTAMP_PATTERN.test(value) &&
    isValidDate(value.slice(0, 10)) &&
    Number(value.slice(11, 13)) < 24 &&
    Number(value.slice(14, 16)) < 60 &&
    Number(value.slice(17, 19)) < 60
  );
}

/**
 * Whether a decimal string is inside the supported arithmetic envelope.
 * Leading zeros are not significant; a value may be signed.
 */
export function isWithinDecimalEnvelope(value: string): boolean {
  const digits = value.startsWith("-") ? value.slice(1) : value;
  const dot = digits.indexOf(".");
  const integerPart = dot === -1 ? digits : digits.slice(0, dot);
  const fractionalPart = dot === -1 ? "" : digits.slice(dot + 1);
  if (fractionalPart.length > MAX_FRACTIONAL_DIGITS) return false;
  const significantInteger = integerPart.replace(/^0+/, "");
  const significantFraction = fractionalPart.replace(/^0+/, "");
  return significantInteger.length + significantFraction.length <= MAX_SIGNIFICANT_DIGITS;
}

export const DECIMAL_ENVELOPE_MESSAGE = `must be a decimal within the supported envelope (at most ${MAX_SIGNIFICANT_DIGITS} significant digits and ${MAX_FRACTIONAL_DIGITS} fractional digits)`;

export const isoDateV1Schema = z.string().refine(isValidDate, "must be a real ISO-8601 date");

/** Non-negative decimal amount (money, token counts, request counts). */
export const decimalAmountV1Schema = z
  .string()
  .regex(DECIMAL_AMOUNT_PATTERN, "must be a non-negative decimal string")
  .refine(isWithinDecimalEnvelope, DECIMAL_ENVELOPE_MESSAGE);

/** Signed decimal amount, used where a negative value is meaningful. */
export const signedDecimalAmountV1Schema = z
  .string()
  .regex(SIGNED_DECIMAL_AMOUNT_PATTERN, "must be a signed decimal string")
  .refine(isWithinDecimalEnvelope, DECIMAL_ENVELOPE_MESSAGE);

/** Strictly positive decimal, used for multipliers and similar factors. */
export const multiplierV1Schema = z
  .string()
  .regex(POSITIVE_DECIMAL_PATTERN, "must be a positive decimal string")
  .refine(isWithinDecimalEnvelope, DECIMAL_ENVELOPE_MESSAGE);

/** Currency is USD-only in the v1 schemas (spec point 9). */
export const currencyV1Schema = z.literal("USD");

/** Catalog trust states (spec point 21). */
export const verificationStatusV1Schema = z.enum(["verified", "estimated", "measured", "unknown"]);
export type VerificationStatusV1 = z.infer<typeof verificationStatusV1Schema>;
