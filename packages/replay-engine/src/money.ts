import { Decimal } from "decimal.js";

/**
 * Decimal-safe money arithmetic (spec point 9). Monetary values are decimal
 * strings everywhere; they are never JavaScript numbers. decimal.js is
 * configured once, here.
 */

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function parseAmount(amount: string): Decimal {
  return new Decimal(amount);
}

/**
 * Serializes a computed unit value (money, tokens or requests) as a decimal
 * string, rounded to 4 decimal places with trailing zeros removed. All
 * aggregates in replay results go through this so equal inputs always produce
 * equal strings.
 */
export function toUnitString(value: Decimal): string {
  const fixed = value.toFixed(4, Decimal.ROUND_HALF_UP);
  if (!fixed.includes(".")) return fixed;
  const trimmed = fixed.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}
