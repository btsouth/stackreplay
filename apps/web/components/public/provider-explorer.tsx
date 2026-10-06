"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { CatalogSelect } from "@/components/public/catalog-select";
import {
  DEFAULT_PROVIDER_DISCOVERY,
  filterProviderRows,
  matchingPublishedPlans,
  type ProviderDiscoveryRow,
  type ProviderDiscoveryState,
  providerDiscoverySearch,
  readProviderDiscovery,
} from "@/lib/public-discovery";

export function RoutedProviderExplorer(props: { rows: readonly ProviderDiscoveryRow[] }) {
  const search = useSearchParams();
  return <ProviderExplorer {...props} routedSearch={search.toString()} />;
}
export function ProviderExplorer({
  rows,
  routedSearch,
}: {
  rows: readonly ProviderDiscoveryRow[];
  routedSearch?: string;
}) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const tools = useMemo(
    () => [...new Set(rows.flatMap((row) => row.planTools.flatMap((plan) => plan.tools)))].sort(),
    [rows],
  );
  const [state, setState] = useState<ProviderDiscoveryState>(() =>
    routedSearch === undefined
      ? DEFAULT_PROVIDER_DISCOVERY
      : readProviderDiscovery(routedSearch, tools),
  );
  useLayoutEffect(() => {
    if (routedSearch === undefined) return;
    setHydrated(true);
    const next = readProviderDiscovery(routedSearch, tools);
    // Only reconcile the snapshot that matches the browser's committed URL.
    if (
      providerDiscoverySearch(next) !==
      providerDiscoverySearch(readProviderDiscovery(window.location.search, tools))
    )
      return;
    setState(next);
  }, [routedSearch, tools]);
  // Reconcile after the router commits: Workers can restore a cached search snapshot.
  useEffect(() => {
    if (pathname !== "/providers") return;
    if (routedSearch === undefined || window.location.pathname !== "/providers") return;
    const nextState = readProviderDiscovery(window.location.search, tools);
    setState((current) =>
      JSON.stringify(current) === JSON.stringify(nextState) ? current : nextState,
    );
    const next = `/providers${providerDiscoverySearch(nextState)}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
      window.history.replaceState(window.history.state, "", next);
  }, [routedSearch, tools, pathname]);
  useEffect(() => {
    const restore = () => {
      if (window.location.pathname === "/providers")
        setState(readProviderDiscovery(window.location.search, tools));
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [tools]);
  const select = (next: ProviderDiscoveryState) => {
    setState(next);
    const search = providerDiscoverySearch(next);
    // These filters use already-loaded rows. Keep focus while updating the shareable URL.
    window.history.replaceState(
      window.history.state,
      "",
      `/providers${search}${window.location.hash}`,
    );
  };
  const visible = filterProviderRows(rows, state);
  const displayOnly = routedSearch === undefined || !hydrated;
  return (
    <div>
      <div className="market-section-title">
        <span>Explore providers</span>
        <span>{rows.length} providers recorded</span>
      </div>
      <div className="market-filters">
        <label className="grow">
          Find a provider
          <input
            type="search"
            placeholder="Provider, model or plan…"
            value={state.query}
            disabled={displayOnly}
            onChange={(event) => select({ ...state, query: event.target.value, scope: "all" })}
          />
        </label>
        <div className="catalog-control">
          View
          <CatalogSelect
            label="View"
            value={state.scope}
            disabled={displayOnly}
            onChange={(event) =>
              select({ ...state, scope: event.target.value === "all" ? "all" : "featured" })
            }
          >
            <option value="featured">Featured</option>
            <option value="all">All providers</option>
          </CatalogSelect>
        </div>
        <div className="catalog-control">
          Provider role
          <CatalogSelect
            label="Provider role"
            value={state.role}
            disabled={displayOnly}
            onChange={(event) =>
              select({
                ...state,
                role: event.target.value as ProviderDiscoveryState["role"],
                scope: "all",
              })
            }
          >
            <option value="all">All roles</option>
            <option value="developer">Developed models</option>
            <option value="api">Recorded API access</option>
            <option value="publisher">Published plans</option>
          </CatalogSelect>
        </div>
        {tools.length > 0 && (
          <div className="catalog-control">
            Works with
            <CatalogSelect
              label="Works with"
              value={state.tool}
              disabled={displayOnly}
              onChange={(event) => select({ ...state, tool: event.target.value, scope: "all" })}
            >
              <option value="all">All tools</option>
              {tools.map((tool) => (
                <option key={tool}>{tool}</option>
              ))}
            </CatalogSelect>
          </div>
        )}
      </div>
      <p className="market-muted mb-4">
        Featured providers are editorial starting points for text, chat and coding, not a usage or
        quality ranking. Zero means no records in this public view, not absence from the market.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="market-muted" role="status">
          {visible.length} providers · {state.scope === "all" ? "All providers" : "Featured"}
          {state.tool !== "all"
            ? ` · Matching published plans for ${state.tool}`
            : " · Total recorded coverage per provider"}
        </p>
        <button
          className="market-link"
          type="button"
          disabled={displayOnly}
          onClick={() => select(DEFAULT_PROVIDER_DISCOVERY)}
        >
          Clear filters
        </button>
      </div>
      <div data-testid="provider-results">
        {visible.map((row) => (
          <article key={row.id} className="market-provider-row" data-testid="provider-row">
            <div className="market-provider-overview">
              <div>
                <h2 className="text-xl">
                  <Link className="hover:text-accent" href={`/providers/${row.id}`}>
                    {row.name} ↗
                  </Link>
                </h2>
                <p className="market-muted mt-2">
                  {[
                    row.releases + row.families > 0 ? "Model developer" : undefined,
                    row.apiRecords > 0 ? "API access provider" : undefined,
                    row.plans > 0 ? "Plan publisher" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No model or plan roles recorded"}
                </p>
              </div>
              <dl className="market-provider-counts">
                <div>
                  <dt>Developed releases</dt>
                  <dd>{row.releases}</dd>
                </div>
                <div>
                  <dt>Published plans / offers</dt>
                  <dd>{row.plans}</dd>
                </div>
              </dl>
            </div>
            {state.tool !== "all" && (
              <p className="mt-2 text-sm">
                {matchingPublishedPlans(row, state.tool)} matching published plans · {state.tool}.
                Developed releases and detailed model counts show total coverage; published plans /
                offers shows the total for this provider.
              </p>
            )}
            <details className="market-provider-coverage">
              <summary>
                Coverage details<span className="sr-only"> for {row.name}</span>
              </summary>
              <dl>
                <div>
                  <dt>Legacy developed releases</dt>
                  <dd>{row.legacy}</dd>
                </div>
                <div>
                  <dt>Family records</dt>
                  <dd>{row.families}</dd>
                </div>
                <div>
                  <dt>Releases with recorded API access</dt>
                  <dd>{row.apiReleases}</dd>
                </div>
                <div>
                  <dt>Accepted updates</dt>
                  <dd>{row.updates}</dd>
                </div>
              </dl>
            </details>
          </article>
        ))}
        {visible.length === 0 && (
          <div className="py-8">
            <p>
              No providers match these filters in{" "}
              {state.scope === "all" ? "All providers" : "Featured"}.
            </p>
            <button
              className="market-link mt-3"
              type="button"
              disabled={displayOnly}
              onClick={() => select({ ...state, scope: "all" })}
            >
              Show all providers
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
