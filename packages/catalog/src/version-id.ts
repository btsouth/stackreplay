/* Plan version ids, with no runtime dependencies so browser code can use them. */

/**
 * Version id convention: `planId@effectiveFrom` (spec point 19). A cohort's
 * version, which can start on the same day as a market version, appends
 * `~cohortId`, so market ids are unchanged and every id stays unique.
 */
export function planVersionId(planId: string, effectiveFrom: string, cohort?: string): string {
  return cohort === undefined
    ? `${planId}@${effectiveFrom}`
    : `${planId}@${effectiveFrom}~${cohort}`;
}

/** The cohort a version id names, or undefined for a market version id. */
export function cohortOfPlanVersionId(versionId: string): string | undefined {
  const at = versionId.lastIndexOf("@");
  const tilde = versionId.indexOf("~", at);
  return at === -1 || tilde === -1 ? undefined : versionId.slice(tilde + 1);
}

/** The plan id a version id belongs to. */
export function planIdOfPlanVersionId(versionId: string): string {
  const at = versionId.lastIndexOf("@");
  return at === -1 ? versionId : versionId.slice(0, at);
}
