import type { ModelRuleV1, PlanLimitV1 } from "@stackreplay/catalog";
import { Badge } from "@stackreplay/ui";

/**
 * Plan fact tables (M4).
 *
 * These render documented plan mechanics exactly as the catalog states them:
 * amounts are decimal strings from the catalog, windows keep their kind, and
 * exceed behaviour is always named because the schema has no default for it.
 */

export function limitWindowText(limit: PlanLimitV1): string {
  return limit.window.type === "rolling"
    ? `rolling ${limit.window.duration} from ${limit.window.anchor.replaceAll("_", " ")}`
    : `calendar ${limit.window.unit}`;
}

export function limitUnitText(limit: PlanLimitV1): string {
  if (limit.type === "credit_pool") return "USD credits";
  if (limit.type === "token_limit") return "tokens";
  return "requests";
}

const exceedLabel: Record<PlanLimitV1["exceed"], string> = {
  reject_request: "rejects the request",
  latch_until_reset: "stops until the window resets",
  allow_overage: "allows overage",
  record_only: "recorded only, not enforced",
};

export function LimitTable({ limits }: { limits: readonly PlanLimitV1[] }) {
  if (limits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This plan version states no quantitative limits in the catalog.
      </p>
    );
  }
  return (
    <section className="w-full min-w-0 overflow-x-auto" aria-label="Plan limits" tabIndex={0}>
      <table className="w-full border-collapse text-sm" data-testid="limit-table">
        <caption className="sr-only">Documented plan limits</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Limit</th>
            <th className="py-2 pr-4 font-medium">Allowance</th>
            <th className="py-2 pr-4 font-medium">Window</th>
            <th className="py-2 pr-4 font-medium">When exceeded</th>
            <th className="py-2 font-medium">Applies to</th>
          </tr>
        </thead>
        <tbody>
          {limits.map((limit) => (
            <tr key={limit.id} className="border-b border-border/60 align-top">
              <td className="py-2 pr-4 text-foreground">{limit.label}</td>
              <td className="py-2 pr-4 tabular-nums text-foreground">
                {limit.amount}
                <span className="ml-1 text-xs text-muted-foreground">{limitUnitText(limit)}</span>
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{limitWindowText(limit)}</td>
              <td className="py-2 pr-4 text-muted-foreground">
                {exceedLabel[limit.exceed]}
                {limit.overageRate === undefined ? null : (
                  <span className="ml-1 text-xs">
                    (${limit.overageRate.amount} {limit.overageRate.unit.replaceAll("_", " ")})
                  </span>
                )}
              </td>
              <td className="py-2 text-muted-foreground">
                {limit.models === undefined || limit.models.length === 0
                  ? "all models"
                  : limit.models.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function ModelRuleList({ rules }: { rules: readonly ModelRuleV1[] }) {
  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No model rules are recorded for this plan version.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2" data-testid="model-rule-list">
      {rules.map((rule) => (
        <li key={rule.model}>
          <Badge variant={rule.excluded === true ? "negative" : "neutral"}>
            {rule.model}
            {rule.excluded === true ? " · not included" : ""}
            {rule.multiplier === undefined ? "" : ` · ×${rule.multiplier}`}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
