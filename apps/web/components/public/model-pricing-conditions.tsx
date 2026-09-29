import { PromoTag } from "@/components/public/promo-tag";
import type { ModelPrices } from "@/lib/market-discovery";
import { basePrice, numericRate, priceNumber } from "@/lib/market-prices";

const RATE_COLUMNS = [
  ["input", "Input"],
  ["output", "Output"],
  ["cacheRead", "Cache read"],
  ["cacheWrite", "Cache write"],
] as const;

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);
const longDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The base rate, its conditional tiers and, for a promotion, the provider's
 * regular rates, in one aligned table. Only published rates appear.
 */
export function ModelRateTable({ prices }: { prices: readonly ModelPrices[] }) {
  const base = basePrice(prices);
  const record = prices.find((price) => price.id === base?.id);
  if (!base || !record) return null;
  const promotion = base.promotion;
  const tierLabel = (id: string) => base.tiers?.find((tier) => tier.id === id)?.label ?? id;
  const regular = promotion?.regularFrom
    ? `Regular rate from ${longDate(promotion.regularFrom)}`
    : "Regular rate";
  const rows = [
    {
      id: "base",
      label: promotion ? "Promotional rate" : "Standard",
      rates: record.rates,
    },
    ...(base.tiers ?? []).map((tier) => ({
      id: tier.id,
      label: promotion ? `Promotional rate, ${lowerFirst(tier.label)}` : tier.label,
      rates: tier.rates,
    })),
    ...(promotion?.regularRates
      ? [{ id: "regular", label: regular, rates: promotion.regularRates, regular: true }]
      : []),
    ...(promotion?.regularTiers ?? []).map((tier) => ({
      id: `regular-${tier.id}`,
      label: `${regular}, ${lowerFirst(tierLabel(tier.id))}`,
      rates: tier.rates,
      regular: true,
    })),
  ];
  const columns = RATE_COLUMNS.filter(
    ([key]) => key !== "cacheWrite" || rows.some((row) => numericRate(row.rates, key)),
  );
  return (
    <>
      {promotion && (
        <p className="market-promo-note" data-testid="promotion-note">
          <PromoTag promotion={promotion} />
          <span>
            {promotion.label}.{" "}
            {promotion.regularRates
              ? `The provider's regular ${promotion.regularTiers?.length ? "rates are" : "rate is"} listed below.`
              : "No regular rate is published."}
          </span>
        </p>
      )}
      <table className="market-rate-table" data-testid="model-rate-table">
        <caption className="sr-only">Published API rates in US dollars per million tokens</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Rate</span>
            </th>
            {columns.map(([key, label]) => (
              <th key={key} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-regular={"regular" in row || undefined}>
              <th scope="row">{row.label}</th>
              {columns.map(([key, label]) => {
                const value = numericRate(row.rates, key);
                return (
                  <td key={key}>
                    <span className="market-table-label">{label}</span>
                    {value === undefined ? (
                      <span className="market-muted market-rate-missing">Not published</span>
                    ) : (
                      priceNumber(value)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Cache-write variants and reasoning billing: conditions the rate table does not show. */
export function ModelPricingConditions({ prices }: { prices: readonly ModelPrices[] }) {
  const base = basePrice(prices);
  if (!base) return null;
  const reasoning = prices.find((price) => price.id === base.id)?.rates.reasoning;
  const WRITE_ORDER = ["cache-write-5m", "cache-write-1h"];
  const writes = prices
    .filter((price) => price.variantId && price.rates.cacheWrite !== undefined)
    .toSorted(
      (a, b) => WRITE_ORDER.indexOf(a.variantId ?? "") - WRITE_ORDER.indexOf(b.variantId ?? ""),
    );
  return (
    <section aria-label="Additional token pricing" className="mb-6">
      <dl className="market-fact-list">
        {writes.map((price) => (
          <div key={price.id}>
            <dt>
              {price.variantId === "cache-write-5m"
                ? "Cache writes · 5 minutes"
                : price.variantId === "cache-write-1h"
                  ? "Cache writes · 1 hour"
                  : price.variantId}
            </dt>
            <dd>{priceNumber(price.rates.cacheWrite)} / 1M tokens</dd>
          </div>
        ))}
        {reasoning !== undefined && (
          <div>
            <dt>Reasoning tokens</dt>
            <dd>
              {typeof reasoning === "string"
                ? `${priceNumber(reasoning)} / 1M tokens`
                : `Billed at the ${reasoning.billedAs} token rate`}
            </dd>
          </div>
        )}
      </dl>
      <p className="market-muted mt-3">
        Published rate checked {base.lastVerifiedAt}. Sources below.
      </p>
    </section>
  );
}
