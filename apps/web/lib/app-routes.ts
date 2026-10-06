export type RouteQuery = Record<string, string | string[] | undefined>;

/** A removed app page and where its old links land. */
export const removedAppRoutes = {
  plans: { to: "/app/settings", hash: "what-you-pay", keep: ["period"] },
  stack: { to: "/app/settings", hash: "what-you-pay", keep: ["period"] },
  replay: { to: "/app/stats" },
  compare: { to: "/app/stats" },
  workload: { to: "/app/stats" },
  import: { to: "/app/scan" },
} as const satisfies Record<string, { to: string; hash?: string; keep?: readonly string[] }>;

export type RemovedAppRoute = keyof typeof removedAppRoutes;

/**
 * The destination of a removed page. Query values (including repeated, empty and
 * unknown ones) carry over, unless the destination only reads some of them.
 */
export function removedAppDestination(route: RemovedAppRoute, query: RouteQuery): string {
  const target: { to: string; hash?: string; keep?: readonly string[] } = removedAppRoutes[route];
  const params = new URLSearchParams();
  for (const [key, values] of Object.entries(query)) {
    if (values === undefined || (target.keep && !target.keep.includes(key))) continue;
    for (const value of Array.isArray(values) ? values : [values]) params.append(key, value);
  }
  return `${target.to}${params.size ? `?${params.toString()}` : ""}${target.hash ? `#${target.hash}` : ""}`;
}
