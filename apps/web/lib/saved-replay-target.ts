import { bundledPlanTimelineInput, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { cohortOfPlanVersionId } from "@stackreplay/catalog/timeline";
import type { CompletedReplay } from "./completed-replays";
import { versionTermsLabel } from "./plan-terms";

const TIER_NAMES = {
  standard: "Standard",
  batch: "Batch",
  flex: "Flex",
  fast: "Fast",
  ultrafast: "Ultrafast",
} as const;

/**
 * What a saved result ran against, in words, from the record alone. A plan is
 * named with the terms its stored plan version belongs to; nothing is looked up
 * by today's date, so the line never changes when the catalog moves on. A
 * single-target result saved before targets were recorded says so instead of
 * guessing a version.
 */
export function savedReplayTargetLine(record: CompletedReplay): string | undefined {
  const target = record.target;
  if (target === undefined)
    return record.title.startsWith("Custom:")
      ? "Plan version not recorded with this saved result"
      : undefined;
  const catalog = loadBundledCatalog();
  if (target.type === "api") {
    const provider = catalog.providers[target.providerId]?.name ?? target.providerId;
    return `${provider} API · ${TIER_NAMES[target.serviceTier ?? "standard"]} processing`;
  }
  const name = catalog.plans[target.planId]?.name ?? target.planId;
  const input = bundledPlanTimelineInput(target.planId);
  const terms = input === undefined ? undefined : versionTermsLabel(input, target.planVersionId);
  const effectiveFrom = target.planVersionId.slice(target.planVersionId.lastIndexOf("@") + 1);
  const label =
    terms === undefined ? `${name} · plan version from ${effectiveFrom}` : `${name} · ${terms}`;
  // A cohort that was asked for but did not apply on the replay's date.
  const unapplied =
    target.cohort !== undefined && cohortOfPlanVersionId(target.planVersionId) === undefined;
  return unapplied ? `${label} (cohort terms did not apply; market terms used)` : label;
}
