import { z } from "zod";
import {
  computedDecimalV1Schema,
  computedSignedDecimalV1Schema,
  currencyV1Schema,
  decimalAmountV1Schema,
  signedDecimalAmountV1Schema,
} from "./scalars.js";

/**
 * Money (spec point 9): serialized as a decimal string, never a JavaScript
 * floating-point number. This schema validates representation only; all
 * monetary arithmetic happens in @stackreplay/replay-engine with decimal.js.
 */
export const moneyV1Schema = z.strictObject({
  amount: decimalAmountV1Schema,
  currency: currencyV1Schema,
});

export type MoneyV1 = z.infer<typeof moneyV1Schema>;

/**
 * Signed money, for differences between two costs (decision 19): a negative
 * amount means the compared target costs less than the baseline. Base costs,
 * totals and unit prices use the non-negative shape above.
 */
export const signedMoneyV1Schema = z.strictObject({
  amount: signedDecimalAmountV1Schema,
  currency: currencyV1Schema,
});

export type SignedMoneyV1 = z.infer<typeof signedMoneyV1Schema>;

/** Derived exact values have a larger envelope than external rates. */
export const computedMoneyV1Schema = z.strictObject({
  amount: computedDecimalV1Schema,
  currency: currencyV1Schema,
});
export type ComputedMoneyV1 = z.infer<typeof computedMoneyV1Schema>;
export const computedSignedMoneyV1Schema = z.strictObject({
  amount: computedSignedDecimalV1Schema,
  currency: currencyV1Schema,
});
export type ComputedSignedMoneyV1 = z.infer<typeof computedSignedMoneyV1Schema>;
