import type { LoadedPlanVersionV1 } from "@stackreplay/catalog";
import { parseAmount, toUnitString } from "./money.js";

/** Scenario-only aggregate capacity. Catalog facts and debit rates remain unchanged.
 * All accounts share the original reset phase; independent account windows and
 * atomic routing across pools are not simulated. Qualitative limits stay unknown.
 */
export function planWithQuantity(plan: LoadedPlanVersionV1, quantity = 1): LoadedPlanVersionV1 {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    throw new RangeError("Plan quantity must be an integer from 1 to 10");
  if (quantity === 1) return plan;
  return {
    ...plan,
    price: { ...plan.price, amount: toUnitString(parseAmount(plan.price.amount).mul(quantity)) },
    limits: plan.limits.map((limit) => ({
      ...limit,
      amount: toUnitString(parseAmount(limit.amount).mul(quantity)),
    })),
  };
}
