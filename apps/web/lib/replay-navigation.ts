import { shareText } from "@stackreplay/share";
import { coverageShare, type SuggestedRoute } from "./routes";

/**
 * Replay links carry an opaque local id, catalog ids and recording-tool ids
 * only, never workload content.
 */
export function replayLink(
  importId: string,
  options: {
    plan?: string | undefined;
    api?: string | undefined;
    scope?: readonly string[] | undefined;
  } = {},
): string {
  const params = new URLSearchParams({ import: importId });
  if (options.plan !== undefined) params.set("target", options.plan);
  if (options.api !== undefined) params.set("api", options.api);
  if (options.scope !== undefined && options.scope.length > 0)
    params.set("scope", options.scope.join(","));
  return `/app/replay?${params.toString()}`;
}

/** The replay a suggested route opens. */
export function routeLink(importId: string, route: SuggestedRoute): string {
  return replayLink(importId, {
    ...(route.target.kind === "api" ? { api: route.target.id } : { plan: route.target.id }),
    scope: route.slice.sources,
  });
}

/** Words for a suggested route: what it runs against, and what it can answer. */
export function routeCopy(route: SuggestedRoute): { kind: string; title: string; body: string } {
  const whole = route.slice.sources.length === 0;
  const name = route.target.name;
  const share = shareText(coverageShare(route.target));
  const yourCalls = whole ? "your calls" : `your ${route.slice.label} calls`;
  if (route.id === "api-value")
    return {
      kind: route.alternative ? `${route.alternative.name} vs ${name}` : "Published API rates",
      title: whole ? `Same models, ${name}` : `Your ${route.slice.label} work, ${name}`,
      body: `Published API cost for ${whole ? "this workload" : `your ${route.slice.events.toLocaleString("en-US")} ${route.slice.label} calls`}. Not what you paid.${route.alternative ? ` ${route.alternative.name} offers the recognized models; ${route.alternative.capacity === "unpublished" ? "its exact capacity cannot be computed from published terms" : "test its published numeric limits separately"}.` : ""}`,
    };
  if (route.id === "numeric-limits")
    return {
      kind: "Numeric limits",
      title: whole ? `Where ${name} would run out` : `Your ${route.slice.label} work on ${name}`,
      body: `It offers the models for ${share} of ${yourCalls} and publishes its allowance, so Replay can show whether and when it would have run out.`,
    };
  return {
    kind: "Translated replay",
    title: `Move ${whole ? "this work" : `your ${route.slice.label} work`} to ${name}`,
    body:
      route.target.runnable > 0
        ? `It offers the models for ${share} of ${yourCalls}; you choose which of its models take the rest. Exact subscription capacity is not computable from published terms.`
        : "It offers none of these models; you choose which of its models take your calls.",
  };
}
