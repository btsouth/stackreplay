import { Decimal as DecimalJs } from "decimal.js";

/**
 * Decimal-safe money arithmetic (spec point 9). Monetary values are decimal
 * strings everywhere; they are never JavaScript numbers. decimal.js is
 * configured once, here.
 */

const Decimal = DecimalJs.clone({ precision: 40, rounding: DecimalJs.ROUND_HALF_UP });

export { Decimal };
export type Decimal = DecimalJs;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function parseAmount(amount: string): Decimal {
  return new Decimal(amount);
}

/**
 * Serializes a computed unit value (money, tokens or requests) as a decimal
 * string without display rounding; sub-cent violations must remain visible. All
 * aggregates in replay results go through this so equal inputs always produce
 * equal strings.
 */
export function toUnitString(value: Decimal): string {
  return value.toFixed();
}
