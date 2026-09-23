import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";

/**
 * How a replay's own mode reads on screen.
 *
 * The mode states one thing: whether a scenario applied a cross-model
 * substitution. A result that carries no mode states nothing, and the surfaces
 * must say so rather than defaulting to the mode that was not applied. Three
 * surfaces used to decide this for themselves with a boolean, which is exactly
 * how "no mode recorded" came out as "Exact replay".
 */
export function modeLabel(mode: ProjectedReplayV1["mode"]): string {
  switch (mode) {
    case "exact":
      return "Exact replay";
    case "translated":
      return "Translated replay";
    default:
      return "Routing assumption not recorded";
  }
}

/** The same three states, in the lower case a micro-label uses. */
export function modeMicroLabel(mode: ProjectedReplayV1["mode"]): string {
  switch (mode) {
    case "exact":
      return "exact replay";
    case "translated":
      return "translated replay";
    default:
      return "routing assumption not recorded";
  }
}
