import { modelServiceTiers, type ServiceTierReadingV1 } from "@stackreplay/catalog";
import { numericRate, priceNumber } from "@/lib/market-prices";
import { loadCatalog } from "@/lib/public-catalog";

const TIER_NAMES: Record<ServiceTierReadingV1["tier"], string> = {
  standard: "Standard",
  batch: "Batch",
  flex: "Flex",
  fast: "Fast",
  ultrafast: "Ultrafast",
};

const AVAILABILITY: Record<ServiceTierReadingV1["availability"], string> = {
  available: "Available",
  preview: "Limited preview",
  coming_soon: "Coming soon",
  unavailable: "Not offered",
  not_recorded: "Not recorded",
};

const COLUMNS = [
  ["input", "Input"],
  ["cacheRead", "Cache read"],
  ["output", "Output"],
] as const;

/**
 * The processing tiers a provider documents for one model. A tier is a way of
 * running the same model, so it sits on the model's page rather than being a
 * model of its own. A tier without a published price shows no price, and an
 * announced tier says so instead of borrowing another tier's rates.
 */
export function ModelServiceTiers({ modelId, asOf }: { modelId: string; asOf: string }) {
  const tiers = modelServiceTiers(loadCatalog(), modelId, asOf);
  if (tiers.length < 2) return null;
  return (
    <section aria-labelledby="processing-tiers" className="mb-8" data-testid="model-service-tiers">
      <h2 className="mb-2 text-base font-medium" id="processing-tiers">
        Processing tiers
      </h2>
      <p className="market-muted mb-3 max-w-3xl">
        The same model, processed on a different service tier. Rates for prompts up to the
        long-context threshold; speed claims are the provider&rsquo;s and are not modelled.
      </p>
      <table className="market-rate-table market-tier-table">
        <caption className="sr-only">
          API rates by processing tier, US dollars per million tokens
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Tier</span>
            </th>
            {COLUMNS.map(([key, label]) => (
              <th key={key} scope="col">
                {label}
              </th>
            ))}
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr data-testid={`service-tier-row-${tier.tier}`} key={tier.tier}>
              <th scope="row">{TIER_NAMES[tier.tier]}</th>
              {COLUMNS.map(([key, label]) => {
                const value =
                  tier.pricing === undefined ? undefined : numericRate(tier.pricing.rates, key);
                return (
                  <td key={key}>
                    <span className="market-table-label">{label}</span>
                    {value === undefined ? (
                      <span className="market-muted market-rate-missing">No price</span>
                    ) : (
                      priceNumber(value)
                    )}
                  </td>
                );
              })}
              <td className="market-tier-status">
                <span className="market-table-label">Status</span>
                {AVAILABILITY[tier.availability]}
                {tier.note !== undefined && tier.availability !== "available" ? (
                  <span className="market-muted block">{tier.note}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
