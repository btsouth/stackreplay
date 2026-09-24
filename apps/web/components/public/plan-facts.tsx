import type { ModelRuleV1, PlanLimitV1 } from "@stackreplay/catalog";
import { durationText, lifecycleText } from "@/lib/catalog-copy";
import type { PublicModelSummary } from "@/lib/public-catalog";

/**
 * Plan fact tables (M4).
 *
 * These render documented plan mechanics exactly as the catalog states them:
 * amounts are decimal strings from the catalog, windows keep their kind, and
 * exceed behaviour is always named because the schema has no default for it.
 */

export function limitWindowText(limit: PlanLimitV1): string {
  return limit.window.type === "rolling"
    ? `rolling ${durationText(limit.window.duration)} from ${limit.window.anchor.replaceAll("_", " ")}`
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
        The provider does not publish a numeric allowance for this plan.
      </p>
    );
  }
  return (
    <section className="w-full min-w-0" aria-label="Plan limits">
      <table className="block w-full border-collapse text-sm lg:table" data-testid="limit-table">
        <caption className="sr-only">Documented plan limits</caption>
        <thead className="sr-only lg:not-sr-only lg:table-header-group">
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Limit</th>
            <th className="py-2 pr-4 font-medium">Allowance</th>
            <th className="py-2 pr-4 font-medium">Window</th>
            <th className="py-2 pr-4 font-medium">When exceeded</th>
            <th className="py-2 font-medium">Applies to</th>
          </tr>
        </thead>
        <tbody className="block lg:table-row-group">
          {limits.map((limit) => (
            <tr
              key={limit.id}
              className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border/60 py-5 align-top lg:table-row lg:py-0"
            >
              <td className="col-span-2 block min-w-0 text-base font-medium text-foreground lg:table-cell lg:py-2 lg:pr-4 lg:text-sm lg:font-normal">
                {limit.label}
              </td>
              <td className="block min-w-0 tabular-nums text-foreground lg:table-cell lg:py-2 lg:pr-4">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">
                  Allowance
                </span>
                {limit.amount}
                <span className="ml-1 text-xs text-muted-foreground">{limitUnitText(limit)}</span>
              </td>
              <td className="block min-w-0 text-muted-foreground lg:table-cell lg:py-2 lg:pr-4">
                <span className="mb-1 block text-xs lg:hidden">Window</span>
                {limitWindowText(limit)}
              </td>
              <td className="col-span-2 block min-w-0 text-muted-foreground lg:table-cell lg:py-2 lg:pr-4">
                <span className="mb-1 block text-xs lg:hidden">When exceeded</span>
                {exceedLabel[limit.exceed]}
                {limit.overageRate === undefined ? null : (
                  <span className="ml-1 text-xs">
                    (${limit.overageRate.amount} {limit.overageRate.unit.replaceAll("_", " ")})
                  </span>
                )}
              </td>
              <td className="col-span-2 block min-w-0 text-muted-foreground lg:table-cell lg:py-2">
                <span className="mb-1 block text-xs lg:hidden">Applies to</span>
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

function RuleRow({ rule, model }: { rule: ModelRuleV1; model: PublicModelSummary | undefined }) {
  const status = lifecycleText(model?.lifecycle);
  return (
    <li className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 border-b border-border py-2 text-sm">
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        <span className="text-foreground">{model?.name ?? rule.model}</span>
        {status === "Legacy" ? <span className="text-muted-foreground"> · Legacy</span> : null}
        <span className="block font-mono text-xs text-muted-foreground">{rule.model}</span>
      </span>
      {rule.excluded === true ? (
        rule.access === "usage_credits" ? (
          <span className="text-warning">usage credits only</span>
        ) : (
          <span className="text-negative">not included</span>
        )
      ) : null}
      {rule.multiplier === undefined ? null : (
        <span className="tabular-nums text-muted-foreground">×{rule.multiplier}</span>
      )}
    </li>
  );
}

/**
 * A plan's model rules by model name, releases first. Family names the rules
 * also cover are identity records, not models, so they are listed separately.
 */
export function ModelRuleList({
  rules,
  modelById,
}: {
  rules: readonly ModelRuleV1[];
  modelById: (id: string) => PublicModelSummary | undefined;
}) {
  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No model rules are recorded for this plan version.
      </p>
    );
  }
  const releases = rules.filter((rule) => modelById(rule.model)?.kind !== "family");
  const families = rules.filter((rule) => modelById(rule.model)?.kind === "family");
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3" data-testid="model-rule-list">
        {releases.map((rule) => (
          <RuleRow key={rule.model} rule={rule} model={modelById(rule.model)} />
        ))}
      </ul>
      {families.length === 0 ? null : (
        <div>
          <p className="text-sm text-muted-foreground">
            Family names these rules also cover. They are not models; StackReplay keeps them so
            workloads that use a family name still resolve.
          </p>
          <ul className="mt-1 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((rule) => (
              <RuleRow key={rule.model} rule={rule} model={modelById(rule.model)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
