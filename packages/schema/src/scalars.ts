import { z } from "zod";

/**
 * Shared scalar shapes for the versioned schemas.
 *
 * Timestamps are always ISO-8601 UTC strings (spec point 9: timestamps are
 * stored internally in UTC). Money and multipliers are decimal strings; no
 * monetary value is ever a JavaScript number (spec point 9).
 */

export const ISO_UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const DECIMAL_AMOUNT_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
export const POSITIVE_DECIMAL_PATTERN = /^(0\.\d*[1-9]\d*|[1-9]\d*(\.\d+)?)$/;

export const isoUtcTimestampV1Schema = z
  .string()
  .regex(ISO_UTC_TIMESTAMP_PATTERN, "must be an ISO-8601 UTC timestamp");

export const isoDateV1Schema = z.string().regex(ISO_DATE_PATTERN, "must be an ISO-8601 date");

/** Non-negative decimal amount (money, token counts, request counts). */
export const decimalAmountV1Schema = z
  .string()
  .regex(DECIMAL_AMOUNT_PATTERN, "must be a non-negative decimal string");

/** Strictly positive decimal, used for multipliers and similar factors. */
export const multiplierV1Schema = z
  .string()
  .regex(POSITIVE_DECIMAL_PATTERN, "must be a positive decimal string");

/** Currency is USD-only in the v1 schemas (spec point 9). */
export const currencyV1Schema = z.literal("USD");

/** Catalog trust states (spec point 21). */
export const verificationStatusV1Schema = z.enum(["verified", "estimated", "measured", "unknown"]);
export type VerificationStatusV1 = z.infer<typeof verificationStatusV1Schema>;
