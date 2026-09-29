"use client";
import Link from "next/link";
import { useState } from "react";
import type { CompareFacts } from "@/lib/compare-facts";
import type { PublicPlanSummary, PublicProviderSummary } from "@/lib/public-catalog";
export function PlanExplorer({
  plans,
  providers,
  facts,
  tools = {},
  usage = {},
}: {
  plans: readonly PublicPlanSummary[];
  providers: readonly PublicProviderSummary[];
  facts: Readonly<Record<string, CompareFacts>>;
  tools?: Record<string, string[]>;
  usage?: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [provider, setProvider] = useState("all");
  const [tool, setTool] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("provider");
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
        ? Number(a.price.amount) - Number(b.price.amount)
        : a.providerName.localeCompare(b.providerName) ||
          Number(a.price.amount) - Number(b.price.amount),
    );
  return (
    <div>
      <div className="market-section-title">
        <span>01 / Find your subscription</span>
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
        <label>
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="all">All providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Works with
          <select value={tool} onChange={(e) => setTool(e.target.value)}>
            <option value="all">All tools</option>
            {options.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Order by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="provider">Provider</option>
            <option value="price">Monthly price</option>
          </select>
        </label>
      </div>
      <p role="status" className="market-muted border-b border-border pb-4">
        {visible.length} plans · USD monthly list prices · taxes and annual offers may differ
      </p>
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
            <div>
              <p className="market-stat">${Number(plan.price.amount).toLocaleString("en-US")}</p>
              <p className="market-muted">/ {plan.price.interval}</p>
            </div>
            <div>
              <p className="text-sm leading-relaxed">
                {usage[plan.id] ?? "Included model access. Usage varies with your work."}
              </p>
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
                  "Model lineup in provider documentation"}
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
              <Link href={`/plans/${plan.id}`} className="market-link">
                Explore plan ↗
              </Link>
              <Link
                href={`/compare?left=${encodeURIComponent(plan.id)}`}
                className="market-link block"
              >
                Compare plans →
              </Link>
            </div>
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
        </p>
      )}
    </div>
  );
}
