export type RouteQuery = Record<string, string | string[] | undefined>;
export function legacyAppDestination(
  path: string,
  query: RouteQuery,
  section?: "replay" | "compare",
): string {
  const params = new URLSearchParams();
  if (section) params.set("section", section);
  for (const [key, values] of Object.entries(query)) {
    if (values === undefined || (section && key === "section")) continue;
    for (const value of Array.isArray(values) ? values : [values]) params.append(key, value);
  }
  return `${path}${params.size ? `?${params.toString()}` : ""}`;
}
