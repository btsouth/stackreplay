import { Decimal as DecimalJs } from "decimal.js";

/**
 * Decimal-safe money arithmetic (spec point 9, decision 18). Monetary values
 * are decimal strings everywhere; they are never JavaScript numbers. decimal.js
 * is configured once, here, with a deliberately generous precision that is
 * exact for every operation supported over the schema's bounded envelope
 * (at most 28 significant digits, at most 18 fractional digits per value).
 *
 * Catalog validation also bounds simultaneous multiplier compositions and the
 * number of constraint costs summed (decision 21). The 28/18 input envelope
 * alone is not sufficient for an unbounded product of promotions. That
 * compositional budget proves all supported intermediate and final values fit
 * within 100 digits. The configuration is cloned so another Decimal consumer
 * cannot change it.
 */
const Decimal = DecimalJs.clone({ precision: 100, rounding: DecimalJs.ROUND_HALF_UP });

export { Decimal };
export type Decimal = DecimalJs;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

export function parseAmount(amount: string): Decimal {
  return new Decimal(amount);
}

/**
 * Serializes a computed unit value (money, tokens or requests) as a plain
 * decimal string without rounding, so sub-cent and very large values keep
 * their exact digits instead of switching to exponential notation. All
 * aggregates in replay results go through this so equal inputs always produce
 * equal strings.
 */
export function toUnitString(value: Decimal): string {
  // Passing the exact decimal-place count keeps the output in normal
  // (fixed-point) notation for every magnitude, which the schemas require.
  return value.toFixed(value.decimalPlaces());
}
