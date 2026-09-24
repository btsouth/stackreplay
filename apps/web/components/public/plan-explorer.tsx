"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCatalogDate, priceText } from "@/lib/catalog-copy";
import { type CompareFacts, NO_NUMERIC_ALLOWANCE } from "@/lib/compare-facts";
import type { PublicPlanSummary, PublicProviderSummary } from "@/lib/public-catalog";
import { LimitTable } from "./plan-facts";
import { SourceList, VerificationBadge } from "./provenance";

/** "Claude Opus 5.5, Claude Fable 5.1 and 7 more models", from the plan's included releases. */
function modelLine(facts: CompareFacts | undefined): string {
  if (facts === undefined || facts.models.total === 0) return "No named model listed";
  const names = facts.models.featured.slice(0, 2).map((model) => model.name);
  const rest = facts.models.total - names.length;
  return rest === 0
    ? names.join(" and ")
    : `${names.join(", ")} and ${rest} more ${rest === 1 ? "model" : "models"}`;
}

export function PlanExplorer({
  plans,
  providers,
  facts,
}: {
  plans: readonly PublicPlanSummary[];
  providers: readonly PublicProviderSummary[];
  facts: Readonly<Record<string, CompareFacts>>;
}) {
  const [provider, setProvider] = useState("all");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(
    () =>
      plans.filter((plan) => {
        if (provider !== "all" && plan.providerId !== provider) return false;
        const search = query.trim().toLowerCase();
        return (
          search.length === 0 ||
          [plan.name, plan.providerName, plan.id].some((value) =>
            value.toLowerCase().includes(search),
          )
        );
      }),
    [plans, provider, query],
  );
  const displayed =
    provider === "all" && query.trim() === "" && !showAll ? visible.slice(0, 8) : visible;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 border-y border-border-strong py-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Choose a provider
          </p>
          <fieldset className="mt-2 flex flex-wrap gap-2">
            <legend className="sr-only">Filter plans by provider</legend>
            <button
              type="button"
              aria-pressed={provider === "all"}
              onClick={() => setProvider("all")}
              className="min-h-11 border border-border-strong px-3 text-sm text-foreground hover:border-accent aria-pressed:border-accent aria-pressed:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              All{" "}
              <span className="ml-1 font-mono text-xs text-muted-foreground">{plans.length}</span>
            </button>
            {providers.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={provider === item.id}
                onClick={() => setProvider(item.id)}
                className="min-h-11 border border-border-strong px-3 text-sm text-foreground hover:border-accent aria-pressed:border-accent aria-pressed:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {item.name}{" "}
                <span className="ml-1 font-mono text-xs text-muted-foreground">
                  {item.planIds.length}
                </span>
              </button>
            ))}
          </fieldset>
        </div>
        <label className="flex flex-col gap-2 text-xs text-muted-foreground">
          Find a plan
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Plan or provider"
            className="min-h-11 w-full border border-control-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>
      </div>
      <p className="font-mono text-xs text-muted-foreground" role="status">
        {displayed.length} of {visible.length} {visible.length === 1 ? "plan" : "plans"} shown
      </p>
      <div className="divide-y divide-border border-t border-border" data-testid="plan-results">
        {displayed.map((plan) => (
          <article key={plan.id} data-testid="plan-card" className="py-5">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,1.25fr)_minmax(7rem,0.4fr)_minmax(0,1fr)] sm:items-start">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {plan.providerName}
                </p>
                <h2 className="mt-1 text-lg font-medium text-foreground">
                  <Link className="hover:text-accent hover:underline" href={`/plans/${plan.id}`}>
                    {plan.name}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {modelLine(facts[plan.id])} · rules since {formatCatalogDate(plan.effectiveFrom)}
                </p>
              </div>
              <p className="font-mono text-xl tabular-nums text-foreground">
                {priceText(plan.price)}
              </p>
              <div className="text-sm text-muted-foreground">
                <p className="text-foreground">
                  {facts[plan.id]?.usage.lines[0]?.text ?? NO_NUMERIC_ALLOWANCE}
                </p>
                <p className="mt-1 text-xs">{facts[plan.id]?.simulation}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                className="inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
                href={`/app/import?target=${encodeURIComponent(plan.id)}`}
              >
                Replay this target ↗
              </Link>
              <Link
                className="inline-flex min-h-11 items-center text-sm text-foreground underline underline-offset-4"
                href={`/plans/${plan.id}`}
              >
                Plan detail
              </Link>
              <VerificationBadge
                status={plan.verificationStatus}
                lastVerifiedAt={plan.lastVerifiedAt}
              />
            </div>
            <details className="mt-1 border-t border-border pt-2">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-muted-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
                Inspect limits and sources
              </summary>
              <div className="grid gap-5 pb-4 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <LimitTable limits={plan.limits} />
                  {plan.qualitativeLimits.length > 0 ? (
                    <ul
                      data-testid="qualitative-limits"
                      className="mt-3 space-y-2 text-xs text-muted-foreground"
                    >
                      {plan.qualitativeLimits.map((limit) => (
                        <li key={limit.id}>
                          <span className="font-medium text-foreground">{limit.label}.</span>{" "}
                          {limit.statement}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Source evidence
                  </p>
                  <SourceList sources={plan.sources} />
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
      {displayed.length < visible.length ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="min-h-11 self-start border border-border-strong px-4 text-sm text-foreground hover:border-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
          Show all {visible.length} plans
        </button>
      ) : null}
      {visible.length === 0 ? (
        query.trim().toLowerCase().includes("deepseek") && provider === "all" ? (
          <p className="py-5 text-sm text-muted-foreground">
            DeepSeek has no subscription plan in this library. Its published API prices are a Direct
            API target.{" "}
            <Link
              className="text-accent underline underline-offset-4"
              href="/app/replay?api=deepseek"
            >
              Open DeepSeek Replay
            </Link>
            .
          </p>
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            No plans match this filter. Try another provider or search term.
          </p>
        )
      ) : null}
    </div>
  );
}
