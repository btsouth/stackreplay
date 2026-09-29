import type { ModelPrices } from "./market-discovery";
import { formatRate } from "./price-table";

type RateKey = "input" | "output" | "cacheRead" | "cacheWrite" | "reasoning";
/** Follow only explicit billedAs relationships; absent rates stay absent. */
export function numericRate(
  rates: ModelPrices["rates"],
  key: RateKey,
  seen: RateKey[] = [],
): string | undefined {
  if (seen.includes(key)) return undefined;
  const rate = rates[key];
  return typeof rate === "string"
    ? rate
    : rate
      ? numericRate(rates, rate.billedAs, [...seen, key])
      : undefined;
}
export function basePrice(prices: readonly ModelPrices[]) {
  const base = prices.filter((price) => !price.variantId);
  const price = base.length === 1 ? base[0] : undefined;
  return price
    ? {
        ...price,
        rates: {
          input: numericRate(price.rates, "input"),
          output: numericRate(price.rates, "output"),
          cacheRead: numericRate(price.rates, "cacheRead"),
          cacheWrite: numericRate(price.rates, "cacheWrite"),
        },
      }
    : undefined;
}
/** A per-1M rate at two decimals or more, keeping every published digit ("$0.30", "$0.0028"). */
export function priceNumber(value: string | { billedAs: string } | undefined) {
  if (value === undefined) return "Not listed";
  if (typeof value !== "string") return `Billed as ${value.billedAs}`;
  return /^\d+(\.\d+)?$/u.test(value)
    ? formatRate(value)
    : `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}
