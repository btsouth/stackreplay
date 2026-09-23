import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LimitTable, ModelRuleList } from "@/components/public/plan-facts";
import { SourceList, VerificationBadge } from "@/components/public/provenance";
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
    description: `${plan.name} from ${plan.providerName}: $${plan.price.amount} per ${plan.price.interval}, documented limits, windows, exceed behaviour and model access, with sources and a verification state.`,
    alternates: { canonical: `/plans/${plan.id}` },
  };
}

export default async function PlanDetailPage({ params }: PlanPageProps) {
  const { planId } = await params;
  const catalog = loadPublicCatalog();
  const plan = catalog.planById(planId);
  if (plan === undefined) notFound();
  const versions = catalog.planVersions(plan.id);

  return (
    <div className="flex flex-col gap-12 pb-8">
      <header className="flex flex-col gap-3 border-b border-border-strong pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">
          <Link className="underline-offset-2 hover:underline" href="/plans">
            Plans
          </Link>{" "}
          · {plan.providerName}
        </p>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{plan.name}</h1>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              Rule version {plan.versionId} · effective {plan.effectiveFrom}
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

      {plan.billingMechanics === undefined ? null : (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-medium tracking-tight text-foreground">Billing mechanics</h2>
          <p className="max-w-[68ch] text-base leading-relaxed text-muted-foreground">
            {plan.billingMechanics}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Documented constraints
        </h2>
        <LimitTable limits={plan.limits} />
        {plan.qualitativeLimits.length === 0 ? null : (
          <div className="flex flex-col gap-5">
            <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
              {plan.providerName} states the following without a number. They are recorded as
              qualitative statements rather than converted into amounts this catalog cannot source.
            </p>
            <ul
              className="flex max-w-5xl flex-col border-t border-border text-sm text-muted-foreground"
              data-testid="qualitative-limits"
            >
              {plan.qualitativeLimits.map((limit) => (
                <li
                  key={limit.id}
                  className="grid gap-2 border-b border-border py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6"
                >
                  <span className="font-medium text-foreground">{limit.label}</span>
                  <div className="min-w-0">
                    <blockquote className="max-w-[68ch] border-l border-border-strong pl-3 leading-relaxed">
                      &ldquo;{limit.statement}&rdquo;
                    </blockquote>
                    {limit.sourceUrl === undefined ? null : (
                      <a
                        className="mt-2 inline-block text-xs text-accent underline underline-offset-2"
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
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">Model access</h2>
        <ModelRuleList rules={plan.modelRules} />
      </section>

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

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">Version history</h2>
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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium tracking-tight text-foreground">Source evidence</h2>
        <SourceList sources={plan.sources} />
        <p className="max-w-3xl text-xs text-muted-foreground">
          Rule version {plan.versionId}. A replay against this plan uses the version in force on the
          date you choose, never today&apos;s rules by accident.
        </p>
      </section>

      <section className="flex flex-col gap-3 border-t border-border-strong pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">
          From catalog to Replay
        </p>
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          See what this plan would do with your workload
        </h2>
        <p className="max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          Import a sanitized usage export and replay it against {plan.name}. The replay runs in your
          browser; nothing is uploaded.
        </p>
        <Link
          className="inline-flex min-h-11 items-center self-start text-sm font-medium text-accent underline underline-offset-4"
          href={`/app/import?target=${encodeURIComponent(plan.id)}`}
        >
          Replay against {plan.name}
        </Link>
      </section>
    </div>
  );
}
