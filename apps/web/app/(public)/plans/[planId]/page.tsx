import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LimitTable, ModelRuleList } from "@/components/public/plan-facts";
import { SourceList, VerificationBadge } from "@/components/public/provenance";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { buildCompareFacts, NO_NUMERIC_ALLOWANCE } from "@/lib/compare-facts";
import { loadPublicCatalog } from "@/lib/public-catalog";

interface PlanPageProps {
  params: Promise<{ planId: string }>;
}

export function generateStaticParams() {
  return loadPublicCatalog().plans.map((plan) => ({ planId: plan.id }));
}

export async function generateMetadata({ params }: PlanPageProps): Promise<Metadata> {
  const { planId } = await params;
  const plan = loadPublicCatalog().planById(planId);
  if (plan === undefined) return { title: "Plan not found" };
  return {
    title: `${plan.name} (${plan.providerName})`,
    description: `${plan.name} from ${plan.providerName}: $${plan.price.amount} per ${plan.price.interval}, included models, usage limits and what happens after the limit, with sources.`,
    alternates: { canonical: `/plans/${plan.id}` },
  };
}

export default async function PlanDetailPage({ params }: PlanPageProps) {
  const { planId } = await params;
  const catalog = loadPublicCatalog();
  const plan = catalog.planById(planId);
  if (plan === undefined) notFound();
  const versions = catalog.planVersions(plan.id);
  const facts = buildCompareFacts(plan, catalog.modelById);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3 border-b border-border-strong pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">
          <Link className="underline-offset-2 hover:underline" href="/plans">
            Plans
          </Link>{" "}
          · {plan.providerName}
        </p>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{plan.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Prices and rules in effect since {formatCatalogDate(plan.effectiveFrom)}
            </p>
          </div>
          <p className="text-3xl font-medium tabular-nums tracking-tight text-foreground">
            ${plan.price.amount}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              per {plan.price.interval}
            </span>
          </p>
        </div>
        <VerificationBadge status={plan.verificationStatus} lastVerifiedAt={plan.lastVerifiedAt} />
      </header>

      <section className="grid gap-4 border-b border-border pb-6 sm:grid-cols-[repeat(3,minmax(0,1fr))] sm:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Models
          </p>
          <p className="mt-1 text-sm text-foreground" data-testid="plan-models-summary">
            {facts.models.total === 0
              ? "No named model is listed for this plan."
              : `${facts.models.featured.map((model) => model.name).join(", ")}${facts.models.more.length === 0 ? "" : ` and ${facts.models.more.length} more`}`}
          </p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Usage limits
          </p>
          <p className="mt-1 text-sm text-foreground">
            {facts.usage.numeric
              ? facts.usage.lines.map((line) => line.text).join("; ")
              : NO_NUMERIC_ALLOWANCE}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{facts.simulation}</p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center border border-accent px-4 text-sm text-accent hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
          href={`/app/import?target=${encodeURIComponent(plan.id)}`}
        >
          Replay against {plan.name} ↗
        </Link>
      </section>

      {plan.billingMechanics === undefined ? null : (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-medium tracking-tight text-foreground">How billing works</h2>
          <p className="max-w-[68ch] text-base leading-relaxed text-muted-foreground">
            {plan.billingMechanics}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">Usage limits</h2>
        <LimitTable limits={plan.limits} />
        {plan.qualitativeLimits.length === 0 ? null : (
          <details className="border-t border-border pt-4">
            <summary className="min-h-11 cursor-pointer text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              What {plan.providerName} says about limits
            </summary>
            <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
              {plan.providerName} describes these without numbers. They are quoted here as written,
              not turned into amounts.
            </p>
            <ul
              className="flex max-w-6xl flex-col border-t border-border text-sm text-muted-foreground"
              data-testid="qualitative-limits"
            >
              {plan.qualitativeLimits.map((limit) => (
                <li
                  key={limit.id}
                  className="grid gap-2 border-b border-border py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
                >
                  <span className="font-medium text-foreground">{limit.label}</span>
                  <div className="min-w-0">
                    <blockquote className="max-w-[68ch] border-l border-border-strong pl-3 leading-relaxed">
                      &ldquo;{limit.statement}&rdquo;
                    </blockquote>
                    {limit.sourceUrl === undefined ? null : (
                      <a
                        className="mt-1 inline-block text-xs text-accent underline underline-offset-2"
                        href={limit.sourceUrl}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        Source for this statement ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <details className="border-t border-border pt-4">
        <summary className="min-h-11 cursor-pointer text-xl font-medium tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          Models on this plan
        </summary>
        <div className="mt-4">
          <ModelRuleList rules={plan.modelRules} modelById={catalog.modelById} />
        </div>
      </details>

      {plan.promotions.length === 0 ? null : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-medium tracking-tight text-foreground">Promotions</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {plan.promotions.map((promotion) => (
              <li key={promotion.id}>
                {promotion.label} · ×{promotion.multiplier} · from {promotion.effectiveFrom}
                {promotion.effectiveTo === undefined ? "" : ` to ${promotion.effectiveTo}`}
                {promotion.models === undefined ? "" : ` · ${promotion.models.join(", ")}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="border-t border-border pt-4">
        <summary className="min-h-11 cursor-pointer text-xl font-medium tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          Version history · {versions.length} {versions.length === 1 ? "version" : "versions"}
        </summary>
        <section className="w-full min-w-0" aria-label="Plan version history">
          <table
            className="block w-full border-collapse text-sm lg:table"
            data-testid="version-table"
          >
            <caption className="sr-only">Plan version history</caption>
            <thead className="sr-only lg:not-sr-only lg:table-header-group">
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Effective from</th>
                <th className="py-2 pr-4 font-medium">Effective to</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Limits</th>
                <th className="py-2 font-medium">Verification</th>
              </tr>
            </thead>
            <tbody className="block lg:table-row-group">
              {versions.map((version) => (
                <tr
                  key={version.versionId}
                  className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border/60 py-5 align-top lg:table-row lg:py-0"
                >
                  <td className="block min-w-0 tabular-nums text-foreground lg:table-cell lg:py-2 lg:pr-4">
                    <span className="mb-1 block text-xs text-muted-foreground lg:hidden">
                      Effective from
                    </span>
                    {version.effectiveFrom}
                  </td>
                  <td className="block min-w-0 tabular-nums text-muted-foreground lg:table-cell lg:py-2 lg:pr-4">
                    <span className="mb-1 block text-xs lg:hidden">Effective to</span>
                    {version.effectiveTo ?? "current"}
                  </td>
                  <td className="block min-w-0 tabular-nums text-foreground lg:table-cell lg:py-2 lg:pr-4">
                    <span className="mb-1 block text-xs text-muted-foreground lg:hidden">
                      Price
                    </span>
                    ${version.price.amount}/{version.price.interval}
                  </td>
                  <td className="col-span-2 block min-w-0 text-muted-foreground lg:table-cell lg:py-2 lg:pr-4">
                    <span className="mb-1 block text-xs lg:hidden">Limits</span>
                    {version.limits.map((limit) => `${limit.label} ${limit.amount}`).join(" · ")}
                  </td>
                  <td className="col-span-2 block min-w-0 lg:table-cell lg:py-2">
                    <span className="mb-1 block text-xs text-muted-foreground lg:hidden">
                      Verification
                    </span>
                    <VerificationBadge
                      status={version.verificationStatus}
                      lastVerifiedAt={version.lastVerifiedAt}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </details>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">Source evidence</h2>
        <SourceList sources={plan.sources} />
        <p className="max-w-3xl text-xs text-muted-foreground">
          Rule version {plan.versionId}. A replay against this plan uses the version in force on the
          date you choose, never today&apos;s rules by accident.
        </p>
      </section>
    </div>
  );
}
