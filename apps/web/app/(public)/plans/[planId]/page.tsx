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
    <div className="flex flex-col gap-10 pb-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          <Link className="underline-offset-2 hover:underline" href="/plans">
            Plans
          </Link>{" "}
          · {plan.providerName}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{plan.name}</h1>
        <p className="text-base tabular-nums text-foreground">
          ${plan.price.amount}
          <span className="text-sm text-muted-foreground"> per {plan.price.interval}</span>
        </p>
        <VerificationBadge status={plan.verificationStatus} lastVerifiedAt={plan.lastVerifiedAt} />
      </header>

      {plan.billingMechanics === undefined ? null : (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-foreground">Billing mechanics</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">{plan.billingMechanics}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Limits</h2>
        <LimitTable limits={plan.limits} />
        {plan.qualitativeLimits.length === 0 ? null : (
          <div className="flex flex-col gap-2">
            <p className="max-w-3xl text-sm text-muted-foreground">
              {plan.providerName} states the following without a number. They are recorded as
              qualitative statements rather than converted into amounts this catalog cannot source.
            </p>
            <ul
              className="flex flex-col gap-1 text-sm text-muted-foreground"
              data-testid="qualitative-limits"
            >
              {plan.qualitativeLimits.map((limit) => (
                <li key={limit.id}>
                  <span className="text-foreground">{limit.label}:</span> &ldquo;{limit.statement}
                  &rdquo;
                  {limit.sourceUrl === undefined ? null : (
                    <>
                      {" "}
                      <a
                        className="text-accent underline underline-offset-2"
                        href={limit.sourceUrl}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        source
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">Model access</h2>
        <ModelRuleList rules={plan.modelRules} />
      </section>

      {plan.promotions.length === 0 ? null : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-foreground">Promotions</h2>
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
        <h2 className="text-lg font-medium text-foreground">Version history</h2>
        <section className="w-full min-w-0 overflow-x-auto" aria-label="Plan limits" tabIndex={0}>
          <table className="w-full border-collapse text-sm" data-testid="version-table">
            <caption className="sr-only">Plan version history</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Effective from</th>
                <th className="py-2 pr-4 font-medium">Effective to</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Limits</th>
                <th className="py-2 font-medium">Verification</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.versionId} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-4 tabular-nums text-foreground">
                    {version.effectiveFrom}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-muted-foreground">
                    {version.effectiveTo ?? "current"}
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-foreground">
                    ${version.price.amount}/{version.price.interval}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {version.limits.map((limit) => `${limit.label} ${limit.amount}`).join(" · ")}
                  </td>
                  <td className="py-2">
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
        <h2 className="text-lg font-medium text-foreground">Sources</h2>
        <SourceList sources={plan.sources} />
        <p className="max-w-3xl text-xs text-muted-foreground">
          Rule version {plan.versionId}. A replay against this plan uses the version in force on the
          date you choose, never today&apos;s rules by accident.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-medium text-foreground">
          See what this plan would do with your workload
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Import a sanitized usage export and replay it against {plan.name}. The replay runs in your
          browser; nothing is uploaded.
        </p>
        <Link
          className="text-sm text-accent underline underline-offset-2"
          href={`/app/import?target=${encodeURIComponent(plan.id)}`}
        >
          Replay against {plan.name}
        </Link>
      </section>
    </div>
  );
}
