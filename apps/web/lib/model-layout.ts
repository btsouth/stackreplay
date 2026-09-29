/**
 * The models page layout lives in the URL (`/models?view=table`) so a table
 * link can be shared, while the page itself stays static. The server renders
 * both layouts; this script runs before first paint from the root layout and
 * marks the document so CSS shows only the requested one until the explorer
 * hydrates and keeps just that layout. No cards-to-table flash on load.
 */
export type ModelLayout = "cards" | "table";

export const modelLayoutInitScript = `(function(){try{if(/^\\/models\\/?$/.test(location.pathname)&&new URLSearchParams(location.search).get("view")==="table")document.documentElement.setAttribute("data-model-layout","table");}catch(e){}})();`;

export function modelLayoutFromSearch(search: string): ModelLayout {
  return new URLSearchParams(search).get("view") === "table" ? "table" : "cards";
}
