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
        <h1 className="text-2xl font-semibold text-foreground">Compare plans</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          A comparison of documented facts, not a prediction. Two plans with the same headline price
          behave differently once rolling windows, model rules and hard stops are taken into
          account, which is exactly what a replay measures.
        </p>
      </header>

      {catalog.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sourced plan is catalogued yet.</p>
      ) : (
        <section
          className="w-full min-w-0 overflow-x-auto"
          aria-label="Plan comparison"
          tabIndex={0}
        >
          <table className="w-full border-collapse text-sm" data-testid="compare-table">
            <caption className="sr-only">Catalogued plans compared</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Limits</th>
                <th className="py-2 pr-4 font-medium">Model access</th>
                <th className="py-2 pr-4 font-medium">Rules since</th>
                <th className="py-2 font-medium">Verification</th>
              </tr>
            </thead>
            <tbody>
              {catalog.plans.map((plan) => (
                <tr key={plan.id} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-4">
                    <Link
                      className="text-accent underline underline-offset-2"
                      href={`/plans/${plan.id}`}
                    >
                      {plan.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{plan.providerName}</div>
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-foreground">
                    ${plan.price.amount}
                    <span className="text-xs text-muted-foreground">/{plan.price.interval}</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    <ul className="flex flex-col gap-1">
                      {plan.limits.map((limit) => (
                        <li key={limit.id}>
                          {limit.label}: {limit.amount} {limitUnitText(limit)} ·{" "}
                          {limitWindowText(limit)} · {limit.exceed.replaceAll("_", " ")}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {plan.modelRules.filter((rule) => rule.excluded !== true).length} models
                    {plan.modelRules.some((rule) => rule.excluded === true)
                      ? " (some excluded)"
                      : ""}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                    {plan.effectiveFrom}
                  </td>
                  <td className="py-3">
                    <VerificationBadge
                      status={plan.verificationStatus}
                      lastVerifiedAt={plan.lastVerifiedAt}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
