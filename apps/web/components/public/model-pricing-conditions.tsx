import type { ModelPrices } from "@/lib/market-discovery";
import { basePrice, priceNumber } from "@/lib/market-prices";

/** Read the same published rates as the hero; no independent price arithmetic. */
export function ModelPricingConditions({ prices }: { prices: readonly ModelPrices[] }) {
  const base = basePrice(prices);
  if (!base) return null;
  const reasoning = prices.find((price) => price.id === base.id)?.rates.reasoning;
  const writes = prices.filter((price) => price.variantId && price.rates.cacheWrite !== undefined);
  return (
    <section aria-label="Additional token pricing" className="mb-6">
      <dl className="market-fact-list">
        {base.rates.cacheWrite !== undefined && (
          <div>
            <dt>Cache writes</dt>
            <dd>{priceNumber(base.rates.cacheWrite)} / 1M tokens</dd>
          </div>
        )}
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
        {base.tiers?.map((tier) => (
          <div key={tier.id}>
            <dt>{tier.label}</dt>
            <dd>
              Input {priceNumber(tier.rates.input)} · Output {priceNumber(tier.rates.output)}
              {tier.rates.cacheRead !== undefined &&
                ` · Cache read ${priceNumber(tier.rates.cacheRead)}`}
              {tier.rates.cacheWrite !== undefined &&
                ` · Cache write ${priceNumber(tier.rates.cacheWrite)}`}
              <span className="market-muted"> / 1M tokens</span>
            </dd>
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
