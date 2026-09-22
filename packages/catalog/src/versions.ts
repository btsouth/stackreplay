import type { LoadedPlanVersionV1 } from "./catalog.js";

/**
 * Plan-version selection, in one place.
 *
 * A plan's version history is a list of intervals, and more than one surface
 * needs to answer "which version was in force at this instant": the replay
 * engine, the public read model, and the plan pickers. Each of them used to
 * carry its own copy of the rule, and the copies disagreed. The public read
 * model treated `effectiveTo` as exclusive and fell back to the newest version
 * when nothing applied, so on a gap day it described a price the engine would
 * refuse to replay against (and a version that had not started yet). The picker
 * relied on array order instead of sorting.
 *
 * The rule, stated once (inclusive at both ends, latest `effectiveFrom` wins):
 *
 * - a version applies when `effectiveFrom <= at` and, if it declares an
 *   `effectiveTo`, `effectiveTo >= at`; both bounds are inclusive, so a day is
 *   covered by the version that ends that day and by the version that starts it,
 *   and the later `effectiveFrom` breaks the tie;
 * - when no version applies, the answer is `undefined`. A version that starts
 *   after `at` is never returned as the version "in effect": a surface with no
 *   honest answer must say so rather than borrow a future one.
 *
 * Comparison is on the date part (`YYYY-MM-DD`), which is how the catalog stores
 * `effectiveFrom`/`effectiveTo`, so a caller holding a full timestamp for `at`
 * still gets the day-level answer the interval data can actually support.
 */

export interface PlanVersionIntervalV1 {
  effectiveFrom: string;
  /** Absent when the version is open-ended; `undefined` allowed explicitly. */
  effectiveTo?: string | undefined;
}

const datePart = (value: string): string => value.slice(0, 10);

/**
 * The interval applying at `at`, or undefined when none does.
 *
 * Generic over the interval shape so the loaded version and the lighter version
 * records the bundled catalog keeps both work; the returned value is the caller's
 * own object, never a copy.
 */
export function selectPlanVersionAt<T extends PlanVersionIntervalV1>(
  versions: readonly T[],
  at: string,
): T | undefined {
  const instant = datePart(at);
  let selected: T | undefined;
  for (const version of versions) {
    if (datePart(version.effectiveFrom) > instant) continue;
    if (version.effectiveTo !== undefined && datePart(version.effectiveTo) < instant) continue;
    if (
      selected === undefined ||
      datePart(version.effectiveFrom) > datePart(selected.effectiveFrom)
    )
      selected = version;
  }
  return selected;
}

/**
 * The version in force at `at` among a catalog's loaded plan versions for one
 * plan, or undefined when the plan has no version in effect then.
 */
export function selectLoadedPlanVersionAt(
  versions: readonly LoadedPlanVersionV1[],
  planId: string,
  at: string,
): LoadedPlanVersionV1 | undefined {
  return selectPlanVersionAt(
    versions.filter((version) => version.planId === planId),
    at,
  );
}
