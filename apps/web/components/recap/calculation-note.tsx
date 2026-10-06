import type { Recap } from "@/lib/recap";
import { recapUsd } from "@/lib/recap-card";
export function CalculationNote({ recap }: { recap: Recap }) {
  return (
    <details className="premium-calculation">
      <summary>How this is calculated</summary>
      <p>
        Reported token categories are added without counting cache or reasoning twice. Missing
        categories are excluded. Sessions use the identifiers recorded by each tool.
      </p>
      <p>
        Each model uses its developer’s direct API list rates as of {recap.rulesAsOf}. Rates were
        available for {recap.priced.toLocaleString()} of {recap.records.toLocaleString()} requests.
        Unknown rates and incomplete usage are excluded.
      </p>
      {recap.usdHigh !== recap.usd && (
        <p>
          Unreported cache-write lifetimes give a value from {recapUsd(recap.usd)} to{" "}
          {recapUsd(recap.usdHigh)}. The headline uses the lower documented assumption.
        </p>
      )}
      <p>
        This is an estimate at current API prices, not an invoice. Plan comparisons use published
        monthly prices, prorated at 30.4 days per month. Model access is separate from capacity:
        unpublished limits remain unknown. Monthly prices exclude taxes and extra usage; some plans
        let work continue beyond an included allowance.
      </p>
    </details>
  );
}
