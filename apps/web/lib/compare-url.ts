/**
 * The compare page keeps its plans in the URL (`/compare?left=…&right=…&third=…`)
 * so a comparison can be shared, while the page itself stays static. This
 * script runs before first paint from the root layout and holds back the
 * comparison until the explorer has read the URL, so a shared link never
 * flashes the default pair.
 */
export const compareInitScript = `(function(){try{if(!/^\\/compare\\/?$/.test(location.pathname))return;var p=new URLSearchParams(location.search);if(p.has("left")||p.has("right")||p.has("third"))document.documentElement.setAttribute("data-compare","pending");}catch(e){}})();`;

/** Two or three distinct plans from a shared URL; unknown ids fall back to the default pair. */
export function readComparePlans(
  search: string,
  planIds: readonly string[],
  fallback: readonly [string, string],
): string[] {
  const params = new URLSearchParams(search);
  const valid = (key: string) => {
    const id = params.get(key);
    return id !== null && planIds.includes(id) ? id : undefined;
  };
  const left = valid("left") ?? fallback[0];
  const right = valid("right") ?? fallback[1];
  const third = valid("third");
  return third !== undefined && third !== left && third !== right
    ? [left, right, third]
    : [left, right];
}

/** The query string for the chosen plans; the default pair keeps /compare plain. */
export function compareSearch(ids: readonly string[], fallback: readonly [string, string]): string {
  if (ids.length === 2 && ids[0] === fallback[0] && ids[1] === fallback[1]) return "";
  const params = new URLSearchParams();
  const [left, right, third] = ids;
  if (left) params.set("left", left);
  if (right) params.set("right", right);
  if (third) params.set("third", third);
  return `?${params.toString()}`;
}
