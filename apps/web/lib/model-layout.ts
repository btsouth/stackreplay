/**
 * The models page keeps its layout, filters and order in the URL
 * (`/models?view=table&sort=input`) so a view can be shared, while the page
 * itself stays static. The server renders both layouts with default filters;
 * this script runs before first paint from the root layout and marks the
 * document so CSS shows only the requested layout, and holds back the results
 * while shared filters are applied. The explorer reads the URL as it hydrates
 * and clears both marks, so a shared link never flashes the default list. If
 * the explorer never hydrates, the results come back after four seconds.
 */
export type ModelLayout = "cards" | "table";

/**
 * Query keys other than the layout, in the order they are written. The init
 * script below lists them literally; a unit test keeps the two in step.
 */
export const MODEL_FILTER_PARAMS = [
  "q",
  "tab",
  "developer",
  "capability",
  "sort",
  "dir",
  "included",
  "priced",
] as const;

export const modelLayoutInitScript = `(function(){try{if(!/^\\/models\\/?$/.test(location.pathname))return;var p=new URLSearchParams(location.search),d=document.documentElement;if(p.get("view")==="table")d.setAttribute("data-model-layout","table");if(["q","tab","developer","capability","sort","dir","included","priced"].some(function(k){return p.has(k)})){d.setAttribute("data-model-filters","pending");setTimeout(function(){d.removeAttribute("data-model-filters")},4e3);}}catch(e){}})();`;

export function modelLayoutFromSearch(search: string): ModelLayout {
  return new URLSearchParams(search).get("view") === "table" ? "table" : "cards";
}

export interface ModelLibraryUrlState {
  layout: ModelLayout;
  query: string;
  tab: "models" | "legacy" | "identity";
  developer: string;
  capability: string;
  sort: string;
  direction: "ascending" | "descending";
  included: boolean;
  priced: boolean;
}

/**
 * Read a shared models URL. Unknown values fall back to the defaults instead
 * of reaching a select as an option it does not have.
 */
export function readModelLibraryUrl(
  search: string,
  allowed: {
    developers: readonly string[];
    capabilities: readonly string[];
    sorts: readonly string[];
    defaultDirection: (sort: string) => "ascending" | "descending";
  },
): ModelLibraryUrlState {
  const params = new URLSearchParams(search);
  const pick = (key: string, values: readonly string[], fallback: string) => {
    const value = params.get(key);
    return value !== null && values.includes(value) ? value : fallback;
  };
  const sort = pick("sort", allowed.sorts, "featured");
  const dir = params.get("dir");
  return {
    layout: modelLayoutFromSearch(search),
    query: params.get("q") ?? "",
    tab: pick("tab", ["legacy", "identity"], "models") as ModelLibraryUrlState["tab"],
    developer: pick("developer", allowed.developers, "all"),
    capability: pick("capability", allowed.capabilities, "all"),
    sort,
    direction:
      dir === "asc" ? "ascending" : dir === "desc" ? "descending" : allowed.defaultDirection(sort),
    included: params.get("included") === "1",
    priced: params.get("priced") === "1",
  };
}

/** The query string for a state, leaving out every default so plain /models stays plain. */
export function modelLibrarySearch(
  state: ModelLibraryUrlState,
  defaultDirection: (sort: string) => "ascending" | "descending",
): string {
  const params = new URLSearchParams();
  if (state.layout === "table") params.set("view", "table");
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.tab !== "models") params.set("tab", state.tab);
  if (state.developer !== "all") params.set("developer", state.developer);
  if (state.capability !== "all") params.set("capability", state.capability);
  if (state.sort !== "featured") {
    params.set("sort", state.sort);
    if (state.direction !== defaultDirection(state.sort))
      params.set("dir", state.direction === "ascending" ? "asc" : "desc");
  }
  if (state.included) params.set("included", "1");
  if (state.priced) params.set("priced", "1");
  const search = params.toString();
  return search ? `?${search}` : "";
}
