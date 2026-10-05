"use client";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { PlanTermsNotice } from "@/components/plan-history";
import { CatalogSelect } from "@/components/public/catalog-select";
import type { CompareFacts } from "@/lib/compare-facts";
import type { PublicProviderSummary } from "@/lib/public-catalog";
import type { PublicDirectoryPlan } from "@/lib/public-directory";
import {
  comparePublicPlanPrices,
  PUBLIC_PRICE_SORT_NOTE,
  publicPlanPricePresentation,
} from "@/lib/public-plan-price";
export function PlanExplorer({
  plans,
  providers,
  facts,
  tools = {},
  usage = {},
  asOf,
  spotlight,
}: {
  spotlight?: ReactNode;
  plans: readonly PublicDirectoryPlan[];
  providers: readonly PublicProviderSummary[];
  facts: Readonly<Record<string, CompareFacts>>;
  tools?: Record<string, string[]>;
  usage?: Record<string, string>;
  /** The day plan terms were resolved on; the viewer's day takes over after hydration. */
  asOf: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [provider, setProvider] = useState("all");
  const [tool, setTool] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("provider");
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("stackreplay:public-plans") ?? "null");
      if (saved) {
        setProvider(providers.some((p) => p.id === saved.provider) ? saved.provider : "all");
        setTool(Object.values(tools).flat().includes(saved.tool) ? saved.tool : "all");
        setQuery(typeof saved.query === "string" ? saved.query : "");
        setSort(saved.sort === "price" ? "price" : "provider");
        setExpanded(saved.expanded === true);
      }
    } catch {
      /* Storage can be disabled. Discovery remains usable. */
    }
    setRestored(true);
  }, [providers, tools]);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(
        "stackreplay:public-plans",
        JSON.stringify({ provider, tool, query, sort, expanded }),
      );
    } catch {
      /* Optional view memory. */
    }
  }, [restored, provider, tool, query, sort, expanded]);
  const options = [...new Set(Object.values(tools).flat())].sort();
  const visible = plans
    .filter(
      (p) =>
        (provider === "all" || p.providerId === provider) &&
        (tool === "all" || tools[p.id]?.includes(tool)) &&
        `${p.name} ${p.providerName} ${[...(facts[p.id]?.models.featured ?? []), ...(facts[p.id]?.models.more ?? [])].map((m) => m.name).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "price"
        ? comparePublicPlanPrices(a, b)
        : a.providerName.localeCompare(b.providerName) || comparePublicPlanPrices(a, b),
    );
  return (
    <div>
      <div className="market-section-title">
        <span>Find your subscription</span>
        <span>
          {providers.length} providers · {plans.length} plans
        </span>
      </div>
      <div className="market-filters">
        <label className="grow">
          Find a plan
          <input
            type="search"
            placeholder="Plan, provider or model…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="catalog-control">
          Provider
          <CatalogSelect
            label="Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="all">All providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </CatalogSelect>
        </div>
        <div className="catalog-control">
          Works with
          <CatalogSelect label="Works with" value={tool} onChange={(e) => setTool(e.target.value)}>
            <option value="all">All tools</option>
            {options.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </CatalogSelect>
        </div>
        <div className="catalog-control">
          Order by
          <CatalogSelect label="Order by" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="provider">Provider</option>
            <option value="price">Published price</option>
          </CatalogSelect>
        </div>
      </div>
      <p role="status" className="market-muted border-b border-border pb-4">
        {visible.length} plans · {PUBLIC_PRICE_SORT_NOTE}
      </p>
      {spotlight && <div className="model-library-spotlight">{spotlight}</div>}
      <div data-testid="plan-results">
        {visible.slice(0, expanded ? undefined : 12).map((plan) => (
          <article className="market-plan-row" data-testid="plan-card" key={plan.id}>
            <div>
              <p className="market-kicker mb-2">{plan.providerName}</p>
              <h2>
                <Link href={`/plans/${plan.id}`} className="hover:text-accent">
                  {plan.name}
                </Link>
              </h2>
              <p className="market-muted mt-2">
                {tools[plan.id]?.join(" · ") || "See provider access details"}
              </p>
            </div>
            <div
              className={
                publicPlanPricePresentation(plan).formula ? "min-w-0 max-w-[11rem]" : undefined
              }
            >
              <p
                className={
                  publicPlanPricePresentation(plan).formula
                    ? "text-xl leading-relaxed"
                    : "market-stat"
                }
              >
                {publicPlanPricePresentation(plan).amount}
              </p>
              <p className="market-muted">{publicPlanPricePresentation(plan).unit}</p>
            </div>
            <div>
              <p className="text-sm leading-relaxed">
                {usage[plan.id] ?? "Included model access. Usage varies with your work."}
              </p>
              {plan.kind === "catalog_plan" && plan.timeline !== undefined && (
                <PlanTermsNotice
                  asOf={asOf}
                  followToday
                  variant="line"
                  historyHref={`/plans/${plan.id}#history`}
                  plan={plan.timeline}
                />
              )}
              <p className="market-muted mt-2" data-testid="plan-models-preview">
                {facts[plan.id]?.models.featured.slice(0, 3).map((m, index) => (
                  <span key={m.id}>
                    {index > 0 && " · "}
                    {m.id.startsWith("published:") ? (
                      m.name
                    ) : (
                      <Link
                        href={`/models/${m.id}`}
                        className="underline-offset-4 hover:text-accent hover:underline"
                      >
                        {m.name}
                      </Link>
                    )}
                  </span>
                ))}
                {!facts[plan.id]?.models.featured.length &&
                  (plan.modelAccess?.summary ?? "Model lineup in provider documentation")}
                {(facts[plan.id]?.models.total ?? 0) > 3 && (
                  <Link
                    href={`/plans/${plan.id}#model-access`}
                    className="underline-offset-4 hover:text-accent hover:underline"
                  >
                    {" "}
                    · +{(facts[plan.id]?.models.total ?? 0) - 3} more
                  </Link>
                )}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1">
              <Link href={`/plans/${plan.id}`} className="market-link whitespace-nowrap">
                Explore plan ↗
              </Link>
              <Link
                href={`/compare?left=${encodeURIComponent(plan.id)}`}
                className="market-link block whitespace-nowrap"
              >
                Compare plans →
              </Link>
            </div>
            {plan.kind === "public_offer" && (
              <p className="market-plan-note text-xs text-muted-foreground">
                {facts[plan.id]?.simulation}
              </p>
            )}
            {plan.publishedTerms?.availabilityNote && (
              <p className="market-plan-note text-xs text-warning">
                {plan.publishedTerms.availabilityNote}
              </p>
            )}
          </article>
        ))}
      </div>
      {visible.length > 12 && (
        <button type="button" className="market-link my-4" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer plans ↑" : `Show all ${visible.length} plans ↓`}
        </button>
      )}
      {!visible.length && (
        <p className="py-8 text-muted-foreground">
          No plans match these filters. Try another tool or provider.
          <button
            className="market-link block"
            type="button"
            onClick={() => {
              setProvider("all");
              setTool("all");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </p>
      )}
    </div>
  );
}
