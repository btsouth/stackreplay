import type { ApiTokenEstimateEligibility } from "@/lib/api-token-estimate-source";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { ApiTokenEstimateLauncher } from "./api-token-estimate-launcher";
import { SourceList } from "./provenance";

const UNAVAILABLE: Record<
  Extract<ApiTokenEstimateEligibility, { state: "unavailable" }>["reason"],
  string
> = {
  no_current_base:
    "No current Standard API list price is recorded for this exact model. Prices for another model or processing tier cannot supply an estimate.",
  unverified: "The current Standard API list price for this exact model is not verified.",
  ambiguous:
    "More than one current base price or pricing route is recorded. A single unambiguous rate is needed for this estimate.",
  conditional:
    "This model has conditional rates. Aggregate token totals cannot establish which request or schedule conditions apply.",
  promotion:
    "This model has promotional pricing. Promotional and regular-rate scenarios are outside this calculator.",
  invalid_rates:
    "A supported numeric input and output rate could not be established from this exact pricing record.",
};

/** Provenance and unavailable explanations remain readable in the server HTML. */
export function ApiTokenEstimateSection({ estimate }: { estimate: ApiTokenEstimateEligibility }) {
  return (
    <section
      aria-labelledby="api-token-estimate-heading"
      className="my-10 min-w-0 border-y border-border-strong py-7"
      data-testid="api-token-estimate-section"
      data-pricing-id={estimate.state === "eligible" ? estimate.pricingId : undefined}
    >
      <p className="market-kicker">API token estimate</p>
      <h2 id="api-token-estimate-heading" className="mt-2 text-2xl font-medium tracking-[-0.035em]">
        {estimate.state === "eligible" ? "Explore a token scenario" : "Token estimate unavailable"}
      </h2>
      {estimate.state === "eligible" ? (
        <>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Uncached text input and billed output at this exact model’s recorded Standard API list
            price. Totals across a scenario, without a claim about one-request capacity.
          </p>
          <ApiTokenEstimateLauncher
            rate={{
              inputRatePerMillion: estimate.inputRatePerMillion,
              outputRatePerMillion: estimate.outputRatePerMillion,
            }}
          />
          <div
            className="mt-5 min-w-0 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]"
            data-testid="api-estimate-provenance"
          >
            <p>Standard API list price · USD / 1M tokens</p>
            <p className="mt-1">
              Pricing checked {formatCatalogDate(estimate.lastVerifiedAt)} · Rate record from{" "}
              {formatCatalogDate(estimate.effectiveFrom)}
              {estimate.effectiveTo && (
                <> · Record through {formatCatalogDate(estimate.effectiveTo)}</>
              )}
            </p>
            <p className="mt-1">
              Record dates describe catalog coverage; they do not establish provider price
              activation.
            </p>
            {estimate.effectiveFromInstant && (
              <p className="mt-1">
                Recorded price activation instant: {estimate.effectiveFromInstant}
              </p>
            )}
            <div className="mt-2">
              <SourceList sources={estimate.sources} />
            </div>
            <p className="mt-2">Pricing record: {estimate.pricingId}</p>
          </div>
        </>
      ) : (
        <p
          className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground"
          data-testid="api-estimate-unavailable"
        >
          {UNAVAILABLE[estimate.reason]}
        </p>
      )}
    </section>
  );
}
