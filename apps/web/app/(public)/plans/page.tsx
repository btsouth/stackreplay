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
    <div className="flex flex-col gap-10 pb-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Catalogued plans</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Plan mechanics as the providers document them, versioned by the date a rule took effect.
          Each claim carries its sources and a verification state, so you can check it yourself
          instead of trusting a table. A static comparison is not a prediction:{" "}
          <Link className="text-accent underline underline-offset-2" href="/methodology">
            replay your own workload
          </Link>{" "}
          to see what a plan would do with it.
        </p>
        <p className="text-xs text-muted-foreground">
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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium text-foreground">{provider.name}</h2>
              <VerificationBadge
                status={provider.verificationStatus}
                lastVerifiedAt={provider.lastVerifiedAt}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-8">
              {provider.planIds.map((planId) => {
                const plan = catalog.planById(planId);
                if (plan === undefined) return null;
                return (
                  <article
                    key={plan.id}
                    className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-5"
                    data-testid="plan-card"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="text-base font-medium text-foreground">
                        <Link
                          className="underline-offset-2 hover:underline"
                          href={`/plans/${plan.id}`}
                        >
                          {plan.name}
                        </Link>
                      </h3>
                      <p className="text-base tabular-nums text-foreground">
                        ${plan.price.amount}
                        <span className="text-xs text-muted-foreground">
                          /{plan.price.interval}
                        </span>
                      </p>
                    </div>
                    {plan.billingMechanics === undefined ? null : (
                      <p className="max-w-3xl text-sm text-muted-foreground">
                        {plan.billingMechanics}
                      </p>
                    )}
                    <LimitTable limits={plan.limits} />
                    {plan.qualitativeLimits.length === 0 ? null : (
                      <ul
                        className="flex flex-col gap-1 text-sm text-muted-foreground"
                        data-testid="qualitative-limits"
                      >
                        {plan.qualitativeLimits.map((limit) => (
                          <li key={limit.id}>
                            <span className="text-foreground">Stated qualitatively:</span>{" "}
                            {limit.label} — &ldquo;{limit.statement}&rdquo;
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Sources
                        </span>
                        <SourceList sources={plan.sources} />
                      </div>
                      <VerificationBadge
                        status={plan.verificationStatus}
                        lastVerifiedAt={plan.lastVerifiedAt}
                      />
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
