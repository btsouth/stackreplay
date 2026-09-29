import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanHistory, PlanTermsNotice } from "@/components/plan-history";
import { MarketFooter } from "@/components/public/market-header";
import { LimitTable, ModelRuleList } from "@/components/public/plan-facts";
import { SourceList } from "@/components/public/provenance";
import { PublishedSubscriptionTerms } from "@/components/public/published-subscription-terms";
import { SubscriptionModelAccess } from "@/components/public/subscription-model-access";
import { buildCompareFacts } from "@/lib/compare-facts";
import { planTools, planUsage } from "@/lib/market-discovery";
import { loadPublicCatalog } from "@/lib/public-catalog";

interface Props {
  params: Promise<{ planId: string }>;
}
export function generateStaticParams() {
  return loadPublicCatalog().plans.map((p) => ({ planId: p.id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { planId } = await params;
  const p = loadPublicCatalog().planById(planId);
  return {
    title: p?.name ?? "Plan not found",
    description: `${p?.name ?? "Plan"}: published price, model access, compatible tools and usage terms.`,
    alternates: { canonical: `/plans/${planId}` },
  };
}
export default async function PlanPage({ params }: Props) {
  const { planId } = await params;
  const catalog = loadPublicCatalog();
  const plan = catalog.planById(planId);
  if (!plan) notFound();
  const facts = buildCompareFacts(plan, catalog.modelById);
  const tools = planTools(plan);
  const practicalTerms = plan.qualitativeLimits.filter(
    (term) =>
      !/Included usage|Compatible tools|What the provider does not publish|Model availability scope|route pricing depends|funding|purchase cap/i.test(
        term.label,
      ) && !/after|overage|exhaust|exceed|continuation/i.test(term.label),
  );
  const siblings = catalog.plans
    .filter((p) => p.providerId === plan.providerId && p.id !== plan.id)
    .sort((a, b) => Number(a.price.amount) - Number(b.price.amount));
  return (
    <div>
      <header className="market-header">
        <div>
          <Link href="/plans" className="market-kicker">
            Subscriptions / {plan.providerName}
          </Link>
          <h1>{plan.name}</h1>
          <p className="market-description">{planUsage(plan)}</p>
          <p className="market-muted mt-3">
            Published terms checked {plan.publishedTerms?.checkedAt ?? plan.lastVerifiedAt}
          </p>
        </div>
        <aside className="self-end border-l-2 border-accent pl-6">
          <p className="market-kicker">Published subscription price</p>
          <p className="my-3 text-[clamp(4rem,8vw,7rem)] leading-none tracking-[-.06em]">
            ${Number(plan.price.amount).toLocaleString("en-US")}
          </p>
          <p className="market-muted">
            USD / {plan.price.interval} · actual paid amount may differ
          </p>
          {plan.timeline !== undefined && (
            <PlanTermsNotice
              asOf={catalog.asOf}
              followToday
              historyHref="#history"
              plan={plan.timeline}
            />
          )}
          {plan.publishedTerms?.availabilityNote && (
            <p className="my-3 max-w-sm text-sm text-warning">
              {plan.publishedTerms.availabilityNote}
            </p>
          )}
          <Link href={`/compare?left=${plan.id}`} className="market-link">
            Compare this plan ↗
          </Link>
        </aside>
      </header>
      <section className="market-detail-stats">
        <div>
          <p className="market-kicker mb-3">Works with</p>
          <p className="text-lg">{tools.join(" · ") || "See provider terms"}</p>
        </div>
        <div>
          <p className="market-kicker mb-3">Model access</p>
          <p className="text-lg" data-testid="plan-models-summary">
            {facts.models.total ? `${facts.models.total} named models` : "Provider model lineup"}
          </p>
        </div>
        <div>
          <p className="market-kicker mb-3">Billing</p>
          <p className="text-lg">
            {plan.price.interval === "month" ? "Monthly" : plan.price.interval} subscription
          </p>
        </div>
      </section>
      {plan.timeline !== undefined && (
        <PlanHistory asOf={catalog.asOf} followToday id="history" plan={plan.timeline} />
      )}
      <section id="usage" className="scroll-mt-24">
        <div className="market-section-title">
          <span>01 / What you get</span>
        </div>
        {plan.publishedTerms ? (
          <PublishedSubscriptionTerms terms={plan.publishedTerms} />
        ) : (
          <>
            {plan.limits.length > 0 && <LimitTable limits={plan.limits} />}
            <div className="market-plan-terms">
              {practicalTerms.map((term) => (
                <details key={term.id}>
                  <summary>{term.label.replace(/ \(.*\)$/u, "")}</summary>
                  <p>{term.statement}</p>
                  {term.sourceUrl && (
                    <a
                      href={term.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="market-link"
                    >
                      Provider details ↗
                    </a>
                  )}
                </details>
              ))}
            </div>
            {plan.billingMechanics && (
              <p className="market-muted mt-5 max-w-3xl">{plan.billingMechanics}</p>
            )}
          </>
        )}
      </section>
      <section id="model-access" className="mt-10 scroll-mt-24">
        <div className="market-section-title">
          <span>02 / Included models & access</span>
        </div>
        {plan.modelAccess ? (
          <SubscriptionModelAccess access={plan.modelAccess} />
        ) : facts.models.total > 0 ? (
          <>
            <p className="market-muted mb-4">
              Exact releases verified in this catalog. The provider may offer additional models;
              consult its current lineup below.
            </p>
            <ModelRuleList
              rules={plan.modelRules.filter(
                (rule) => catalog.modelById(rule.model)?.kind !== "family",
              )}
              modelById={catalog.modelById}
            />
          </>
        ) : (
          <p className="market-muted">
            The provider publishes a broader lineup. Exact model entitlements are not yet admitted
            here; inspect the official source below.
          </p>
        )}
      </section>
      <section className="mt-10">
        <div className="market-section-title">
          <span>03 / When you reach the limit</span>
        </div>
        <div className="max-w-3xl space-y-3 text-sm leading-relaxed">
          {facts.afterLimit.lines.length || facts.afterLimit.quotes.length ? (
            [...facts.afterLimit.lines, ...facts.afterLimit.quotes.map((q) => q.text)].map(
              (line) => <p key={line}>{line}</p>,
            )
          ) : (
            <p>
              Continuation behavior is not fully established in this catalog. Check the provider
              before relying on overflow.
            </p>
          )}
        </div>
      </section>
      {siblings.length > 0 && (
        <section className="mt-10">
          <div className="market-section-title">
            <span>Other {plan.providerName} subscriptions</span>
          </div>
          {siblings.map((p) => (
            <Link
              key={p.id}
              href={`/compare?left=${plan.id}&right=${p.id}`}
              className="flex flex-wrap justify-between gap-3 border-b border-border py-4 hover:text-accent"
            >
              <span>{p.name}</span>
              <span className="font-mono text-sm">
                ${p.price.amount} / {p.price.interval}{" "}
                <span className="ml-4 text-accent">Compare ↗</span>
              </span>
            </Link>
          ))}
        </section>
      )}
      <details className="mt-10 border-y border-border-strong py-4">
        <summary className="min-h-11 cursor-pointer text-lg">
          Published terms, sources & history
        </summary>
        <div className="space-y-5 py-5">
          <p className="market-muted">
            {plan.limits.length
              ? "Published rules are available for this plan."
              : "Published price and access do not establish a deterministic workload allowance."}
          </p>
          <ul className="space-y-4" data-testid="qualitative-limits">
            {plan.qualitativeLimits.map((limit) => (
              <li key={limit.id}>
                <p className="text-sm font-medium">{limit.label}</p>
                <p className="market-muted mt-1 max-w-3xl">{limit.statement}</p>
              </li>
            ))}
          </ul>
          <SourceList sources={plan.sources} />
          <p className="market-muted">
            Catalog record {plan.versionId}.{" "}
            {plan.currentMarketOnly
              ? "Current-market observation; not evidence of historical terms."
              : "Catalog dates identify recorded rule versions. New admissions do not establish a provider launch date."}{" "}
            Provider credits are specific to that provider. Listing a price does not establish
            capacity, equivalent experience or that a plan could replace another.
          </p>
          <fieldset aria-label="Plan version history" data-testid="version-table">
            {catalog.planVersions(plan.id).map((v) => (
              <p className="market-muted" key={v.versionId}>
                {v.effectiveFrom} · ${v.price.amount}/{v.price.interval} · checked{" "}
                {v.lastVerifiedAt}
                {v.withdrawn !== undefined
                  ? ` · ${v.withdrawn.reason}, never in effect`
                  : v.effectiveFrom > catalog.asOf
                    ? " · scheduled, not yet in effect"
                    : v.versionId === plan.versionId
                      ? " · in effect"
                      : ""}
              </p>
            ))}
          </fieldset>
        </div>
      </details>
      <MarketFooter />
    </div>
  );
}
