import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { isPositiveAmount } from "@/lib/money-display";
import { formatCount, formatExactTokens, formatMoney, formatTokens } from "./format";
import { LedgerRow, MicroLabel, SectionIndex, StatusWord } from "./primitives";

/**
 * The cost counterfactual.
 *
 * Subscription: the plan's own price, any billed overage, and the resulting
 * target cost, each from the engine's economics block. Direct API: the workload's
 * token quantities per category, the engine's own count of events it could price,
 * and the engine's own total. This panel prices nothing itself: money exists here
 * only where the engine computed it.
 *
 * Three rules the brief states are enforced by shape here. Nothing prints `$0`
 * for an unknown cost, and nothing calls an absent total a lower bound: a bound
 * is arithmetic the engine either states or does not, so the panel shows the
 * engine's own reason and stops. A fixed plan price is still an established
 * cost, because it does not depend on the demand that stayed undecided. And a
 * figure covering part of the demand is never presented as this workload's
 * total: the ratios and equivalents that would depend on that total wait until
 * the engine establishes one.
 */
export function CostCounterfactual({
  projection,
  index = "07",
  settled,
}: {
  projection: ProjectedReplayV1;
  index?: string;
  settled: boolean;
}) {
  const economics = projection.economics;
  const pricing = projection.pricing;
  const isApi = projection.target.kind === "api";
  const consumptionOpen = !economics.consumptionEstablished;
  /**
   * Why this target has no total. The engine's own reason comes first, then the
   * pricing evidence's reason; when neither exists the panel says pricing could
   * not be established instead of inventing a cause such as a missing record.
   */
  const incompleteReason =
    economics.reason ?? pricing?.reason ?? "pricing could not be established for every event";

  return (
    <section
      className={`flex flex-col gap-3 border-t pt-4 transition-colors duration-500 motion-reduce:transition-none ${
        settled ? "border-accent" : "border-border"
      }`}
      data-testid="cost-counterfactual"
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Cost counterfactual" />
        <MicroLabel>
          {economics.targetCostEstablished
            ? "established for this workload"
            : "not established in full"}
        </MicroLabel>
      </div>

      {isApi ? (
        <div className="flex flex-col">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-x-4 border-b border-border py-2 sm:grid">
            <MicroLabel>Category</MicroLabel>
            <MicroLabel>Tokens</MicroLabel>
          </div>
          {pricing?.categories.map((category) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-border py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:items-baseline"
              data-testid={`billable-${category.key}`}
              key={category.key}
            >
              <span className="text-xs text-foreground">{category.label}</span>
              <span
                className="font-mono text-sm tabular-nums text-foreground"
                title={formatExactTokens(category.tokens)}
              >
                {formatTokens(category.tokens) ?? "—"}
              </span>
            </div>
          ))}
          <div className="grid min-w-0 gap-2 border-t border-border-strong pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] sm:items-baseline">
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-foreground">Counterfactual at list price</span>
              <span className="text-xs text-muted-foreground">
                {pricing === undefined
                  ? "priceability was not reported for this target"
                  : `${formatCount(pricing.pricedEvents) ?? "unknown"} of ${
                      formatCount(pricing.servedEvents) ?? "unknown"
                    } served events priced`}
              </span>
            </span>
            <span
              className="min-w-0 break-words font-mono text-lg tabular-nums text-foreground sm:text-right"
              data-testid="api-total"
              title={economics.targetCost}
            >
              {economics.targetCost === undefined
                ? "not determinable"
                : (formatMoney(economics.targetCost) ?? "not determinable")}
            </span>
          </div>
          {pricing?.reason === undefined ? null : (
            <p
              className="text-xs leading-relaxed text-muted-foreground"
              data-testid="cost-price-note"
            >
              {pricing.reason}
            </p>
          )}
          {economics.targetCostEstablished ? null : (
            <p className="text-xs leading-relaxed text-warning" data-testid="cost-incomplete">
              {incompleteReason}. No total is reported for this workload.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <LedgerRow
            label="Plan price"
            note={
              economics.basePlanCost === undefined ? undefined : "fixed price of the target plan"
            }
            value={
              economics.basePlanCost === undefined
                ? "unknown"
                : (formatMoney(economics.basePlanCost) ?? "unknown")
            }
          />
          <LedgerRow
            label="Billed above allowance"
            note={
              !isPositiveAmount(economics.overageCost)
                ? "no demand was billed above the allowance"
                : "served and charged at the rule's declared rate"
            }
            value={
              economics.overageCost === undefined
                ? "unknown"
                : (formatMoney(economics.overageCost) ?? "unknown")
            }
          />
          <div className="grid min-w-0 gap-2 border-t border-border-strong pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)] sm:items-baseline">
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-foreground">Simulated target cost</span>
              <span className="text-xs text-muted-foreground">
                {economics.costBasis === "fixed_plan_price_plus_overage"
                  ? "plan price plus billed overage"
                  : "plan price only"}
              </span>
            </span>
            <span
              className="min-w-0 break-words font-mono text-lg tabular-nums text-foreground sm:text-right"
              data-testid="subscription-total"
              title={economics.targetCost}
            >
              {economics.targetCost === undefined
                ? "not determinable"
                : (formatMoney(economics.targetCost) ?? "not determinable")}
            </span>
          </div>
          {economics.apiListPriceEquivalent === undefined ||
          !economics.targetCostEstablished ? null : (
            <LedgerRow
              label="Same workload at API list price"
              note="what the identical demand would have cost metered"
              value={formatMoney(economics.apiListPriceEquivalent) ?? "unknown"}
            />
          )}
          {economics.targetCostEstablished ? null : (
            <p className="text-xs leading-relaxed text-warning" data-testid="cost-incomplete">
              {incompleteReason}. No total is reported for this workload.
            </p>
          )}
        </div>
      )}
      {consumptionOpen && economics.targetCostEstablished ? (
        <p className="text-xs leading-relaxed text-muted-foreground" data-testid="cost-consumption">
          {economics.consumptionReading}.
        </p>
      ) : null}
      {/* A ratio is a statement about a total, so it is shown only where a total
          is established. Beside "not determinable" the same numbers would read
          as figures for the whole workload. */}
      {economics.ratios.length === 0 || !economics.targetCostEstablished ? null : (
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {economics.ratios.map((ratio) => (
            <li className="text-xs text-muted-foreground" key={ratio.name}>
              <StatusWord tone="neutral">{ratio.name}</StatusWord>{" "}
              <span className="font-mono tabular-nums text-foreground">{ratio.value}</span>
            </li>
          ))}
        </ul>
      )}
      {projection.warnings.length === 0 ? null : (
        <ul className="flex flex-col gap-1 border-t border-border pt-3" data-testid="cost-warnings">
          {projection.warnings.map((warning) => (
            <li className="text-xs leading-relaxed text-muted-foreground" key={warning.code}>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-warning">
                {warning.code.replace(/_/gu, " ").toLowerCase()}
              </span>{" "}
              {warning.message}
              {warning.count === undefined ? "" : ` (${formatCount(warning.count)} events)`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
