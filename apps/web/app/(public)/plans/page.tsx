import type { Metadata } from "next";
import Link from "next/link";
import { LimitTable } from "@/components/public/plan-facts";
import { SourceList, VerificationBadge } from "@/components/public/provenance";
import { loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Plans",
  description:
    "Every catalogued AI coding subscription plan, with its documented limits, windows, exceed behaviour, model access, sources and verification state.",
  alternates: { canonical: "/plans" },
};

export default function PlansPage() {
  const catalog = loadPublicCatalog();

  return (
    <div className="flex flex-col gap-9 pb-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
          Replay target library / plans
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Catalogued plans</h1>
        <p className="max-w-[68ch] text-base leading-relaxed text-muted-foreground">
          Plan mechanics as the providers document them, versioned by the date a rule took effect.
          Each claim carries its sources and a verification state, so you can check it yourself
          instead of trusting a table. A static comparison is not a prediction:{" "}
          <Link className="text-accent underline underline-offset-2" href="/methodology">
            replay your own workload
          </Link>{" "}
          to see what a plan would do with it.
        </p>
        <p className="text-sm text-muted-foreground">
          Catalog version {shortCatalogVersion(catalog.catalogVersion)} · current as of{" "}
          {catalog.asOf} · {siteName} publishes only plans it can source
        </p>
      </header>

      {catalog.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sourced plan is catalogued yet. This page publishes nothing until a plan has a source
          and a verification state.
        </p>
      ) : (
        catalog.providers.map((provider) => (
          <section
            key={provider.id}
            className="flex min-w-0 flex-col gap-4"
            data-testid="provider-section"
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-strong pb-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Execution stack / provider
                </p>
                <h2 className="text-xl font-medium tracking-tight text-foreground">
                  {provider.name}
                </h2>
              </div>
              <VerificationBadge
                status={provider.verificationStatus}
                lastVerifiedAt={provider.lastVerifiedAt}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              {provider.planIds.map((planId) => {
                const plan = catalog.planById(planId);
                if (plan === undefined) return null;
                return (
                  <article
                    key={plan.id}
                    className="grid min-w-0 gap-5 border-b border-border py-6 lg:grid-cols-[minmax(12rem,0.27fr)_minmax(0,0.73fr)] lg:gap-8 lg:py-6"
                    data-testid="plan-card"
                  >
                    <div className="flex min-w-0 flex-col items-start gap-3">
                      <h3 className="text-xl font-medium tracking-tight text-foreground">
                        <Link
                          className="underline-offset-4 hover:text-accent hover:underline"
                          href={`/plans/${plan.id}`}
                        >
                          {plan.name}
                        </Link>
                      </h3>
                      <p className="text-2xl font-medium tabular-nums tracking-tight text-foreground">
                        ${plan.price.amount}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          /{plan.price.interval}
                        </span>
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        Rules effective {plan.effectiveFrom}
                      </p>
                      <Link
                        className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4 lg:min-h-8"
                        href={`/app/import?target=${encodeURIComponent(plan.id)}`}
                      >
                        Load into Replay{" "}
                        <span aria-hidden="true" className="ml-1">
                          ↗
                        </span>
                      </Link>
                    </div>
                    <div className="flex min-w-0 flex-col gap-4">
                      {plan.billingMechanics === undefined ? null : (
                        <div className="grid gap-1 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
                          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                            Billing basis
                          </p>
                          <p className="max-w-[75ch] text-sm leading-relaxed text-foreground/85">
                            {plan.billingMechanics}
                          </p>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          Documented constraints
                        </p>
                        <LimitTable limits={plan.limits} />
                      </div>
                      {plan.qualitativeLimits.length === 0 ? null : (
                        <ul
                          className="flex flex-col gap-2 text-sm"
                          data-testid="qualitative-limits"
                        >
                          {plan.qualitativeLimits.map((limit) => (
                            <li
                              key={limit.id}
                              className="grid gap-1 border-l border-border-strong pl-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4"
                            >
                              <span className="font-medium text-foreground">{limit.label}</span>
                              <span className="max-w-[75ch] leading-relaxed text-muted-foreground">
                                &ldquo;{limit.statement}&rdquo;
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border pt-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                            Source evidence
                          </span>
                          <SourceList sources={plan.sources} />
                        </div>
                        <VerificationBadge
                          status={plan.verificationStatus}
                          lastVerifiedAt={plan.lastVerifiedAt}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
