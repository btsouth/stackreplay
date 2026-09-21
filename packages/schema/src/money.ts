import { z } from "zod";
import { currencyV1Schema, decimalAmountV1Schema } from "./scalars.js";

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
