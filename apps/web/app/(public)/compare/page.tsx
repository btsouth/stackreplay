import type { Metadata } from "next";
import Link from "next/link";
import { limitUnitText, limitWindowText } from "@/components/public/plan-facts";
import { VerificationBadge } from "@/components/public/provenance";
import { loadPublicCatalog } from "@/lib/public-catalog";

export const metadata: Metadata = {
  title: "Compare plans",
  description:
    "Compare catalogued AI coding plans on documented facts: price, limits, windows, exceed behaviour and model access, each with sources.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  const catalog = loadPublicCatalog();

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Replay target library / documented comparison
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Compare plans</h1>
        <p className="max-w-[68ch] text-base leading-relaxed text-muted-foreground">
          A comparison of documented facts, not a prediction. Two plans with the same headline price
          behave differently once rolling windows, model rules and hard stops are taken into
          account, which is exactly what a replay measures.
        </p>
      </header>

      {catalog.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sourced plan is catalogued yet.</p>
      ) : (
        <section
          className="w-full min-w-0 border-t border-border-strong"
          aria-label="Plan comparison"
        >
          <table
            className="block w-full border-collapse text-sm lg:table lg:table-fixed"
            data-testid="compare-table"
          >
            <caption className="sr-only">Catalogued plans compared</caption>
            <colgroup className="hidden lg:table-column-group">
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[42%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="sr-only lg:not-sr-only lg:table-header-group">
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="py-3 pr-5 font-medium">Execution target</th>
                <th className="py-3 pr-5 font-medium">Economics</th>
                <th className="py-3 pr-5 font-medium">Constraints & model access</th>
                <th className="py-3 font-medium">Evidence</th>
              </tr>
            </thead>
            {catalog.providers.map((provider) => (
              <tbody key={provider.id} className="block lg:table-row-group">
                <tr className="block border-b border-border-strong bg-surface/50 lg:table-row">
                  <th
                    scope="rowgroup"
                    colSpan={4}
                    className="block py-3 text-left text-sm font-medium text-foreground lg:table-cell lg:px-3 lg:py-3"
                  >
                    <span className="mr-3 text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground">
                      Execution stack
                    </span>
                    {provider.name}
                  </th>
                </tr>
                {provider.planIds.map((planId) => {
                  const plan = catalog.planById(planId);
                  if (plan === undefined) return null;
                  return (
                    <tr
                      key={plan.id}
                      className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border/70 py-6 align-top lg:table-row lg:py-0"
                    >
                      <td className="col-span-2 block min-w-0 text-lg font-medium tracking-tight sm:col-span-1 lg:table-cell lg:py-6 lg:pr-5 lg:pl-3 lg:text-base">
                        <Link
                          className="text-foreground underline-offset-4 hover:text-accent hover:underline"
                          href={`/plans/${plan.id}`}
                        >
                          {plan.name}
                        </Link>
                        <Link
                          className="mt-2 block text-xs font-normal text-accent underline-offset-2 hover:underline"
                          href={`/app/import?target=${encodeURIComponent(plan.id)}`}
                        >
                          Load into Replay ↗
                        </Link>
                      </td>
                      <td className="block min-w-0 tabular-nums text-foreground lg:table-cell lg:py-6 lg:pr-5">
                        <span className="mb-1 block text-xs text-muted-foreground">Price</span>
                        <span className="text-base font-medium">${plan.price.amount}</span>
                        <span className="text-sm text-muted-foreground">
                          /{plan.price.interval}
                        </span>
                        <span className="mt-3 block text-xs text-muted-foreground">
                          Rules since
                        </span>
                        <span className="text-sm text-muted-foreground">{plan.effectiveFrom}</span>
                      </td>
                      <td className="col-span-2 block min-w-0 text-sm leading-relaxed text-muted-foreground lg:table-cell lg:py-6 lg:pr-5">
                        <span className="mb-1 block text-xs">Documented constraints</span>
                        {plan.limits.length === 0 ? (
                          <span>No quantitative limit recorded in this catalog.</span>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {plan.limits.map((limit) => (
                              <li key={limit.id}>
                                {limit.label}: {limit.amount} {limitUnitText(limit)} ·{" "}
                                {limitWindowText(limit)} · {limit.exceed.replaceAll("_", " ")}
                              </li>
                            ))}
                          </ul>
                        )}
                        <span className="mt-3 block text-xs">Model access</span>
                        {plan.modelRules.filter((rule) => rule.excluded !== true).length} models
                        {plan.modelRules.some((rule) => rule.excluded === true)
                          ? " (some excluded)"
                          : ""}
                      </td>
                      <td className="col-span-2 block min-w-0 lg:table-cell lg:py-6">
                        <span className="mb-1 block text-xs text-muted-foreground">
                          Verification
                        </span>
                        <VerificationBadge
                          status={plan.verificationStatus}
                          lastVerifiedAt={plan.lastVerifiedAt}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </section>
      )}
    </div>
  );
}
