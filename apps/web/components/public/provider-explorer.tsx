"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const router = useRouter();
  const pathname = usePathname();
  const pendingSearch = useRef<string | undefined>(undefined);
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
    // A previous replace can commit while someone is still typing the next query.
    if (
      pendingSearch.current !== undefined &&
      providerDiscoverySearch(next) !== pendingSearch.current
    )
      return;
    setState(next);
  }, [routedSearch, tools]);
  // Reconcile after the router commits: Workers can restore a cached search snapshot.
  useEffect(() => {
    if (pathname !== "/providers") {
      pendingSearch.current = undefined;
      return;
    }
    if (routedSearch === undefined || window.location.pathname !== "/providers") return;
    if (pendingSearch.current !== undefined && window.location.search !== pendingSearch.current)
      return;
    pendingSearch.current = undefined;
    const nextState = readProviderDiscovery(window.location.search, tools);
    setState((current) =>
      JSON.stringify(current) === JSON.stringify(nextState) ? current : nextState,
    );
    const next = `/providers${providerDiscoverySearch(nextState)}${window.location.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
      router.replace(next, { scroll: false });
  }, [routedSearch, tools, router, pathname]);
  const select = (next: ProviderDiscoveryState) => {
    setState(next);
    const search = providerDiscoverySearch(next);
    pendingSearch.current = window.location.search === search ? undefined : search;
    router.replace(`/providers${search}${window.location.hash}`, {
      scroll: false,
    });
  };
  const visible = filterProviderRows(rows, state);
  const displayOnly = routedSearch === undefined || !hydrated;
  return (
    <div>
      <div className="market-section-title">
        <span>01 / Explore providers</span>
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
        <label>
          View
          <select
            value={state.scope}
            disabled={displayOnly}
            onChange={(event) =>
              select({ ...state, scope: event.target.value === "all" ? "all" : "featured" })
            }
          >
            <option value="featured">Featured</option>
            <option value="all">All providers</option>
          </select>
        </label>
        <label>
          Provider role
          <select
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
          </select>
        </label>
        {tools.length > 0 && (
          <label>
            Works with
            <select
              value={state.tool}
              disabled={displayOnly}
              onChange={(event) => select({ ...state, tool: event.target.value, scope: "all" })}
            >
              <option value="all">All tools</option>
              {tools.map((tool) => (
                <option key={tool}>{tool}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="market-muted mb-4">
        Featured providers are editorial starting points for text, chat and coding, not a usage or
        quality ranking.
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
          <article key={row.id} className="border-b border-border py-6" data-testid="provider-row">
            <h2 className="text-xl">
              <Link className="hover:text-accent" href={`/providers/${row.id}`}>
                {row.name} ↗
              </Link>
            </h2>
            <p className="market-muted mt-2">
              {row.releases} developed releases ({row.legacy} legacy) · {row.families} family
              records · {row.apiReleases} releases with recorded API access · {row.plans} published
              plans and offers · {row.updates} accepted updates
            </p>
            {state.tool !== "all" && (
              <p className="mt-2 text-sm">
                {matchingPublishedPlans(row, state.tool)} matching published plans · {state.tool}.
                Model counts above show total coverage.
              </p>
            )}
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
