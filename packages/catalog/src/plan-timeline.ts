import type {
  PlanAudienceV1,
  PlanEventKindV1,
  PlanEvidenceV1,
  PlanRevisionV1,
  PlanV1,
  PlanVersionEntryV1,
  PlanWithdrawalV1,
} from "./schema.js";
import { selectPlanVersionAt } from "./versions.js";

/**
 * A plan's history and terms as they stood on one day, in one place.
 *
 * Every surface that says "current", "scheduled" or "previous" about a plan
 * reads it from here, so the plan page, Compare and Replay cannot disagree and
 * no component compares dates of its own. The function reads no clock: the
 * caller passes the day.
 *
 * Dates. The catalog records provider dates as calendar days (`YYYY-MM-DD`),
 * because that is what providers announce. A day-dated change is in effect for
 * every `asOf` on or after that day, compared as strings, exactly as plan
 * versions are selected (`selectPlanVersionAt`). The day a surface passes is its
 * own rules date: Replay's rules date (the viewer's calendar day by default,
 * `apps/web/lib/rules-date.ts`), or today's date on a public page. So an
 * announced change becomes current on its date with no catalog edit, and the
 * same `asOf` always gives the same answer.
 *
 * Knowledge. An entry appears only once it was known: an event announced after
 * `asOf` is left out, so a look back at an earlier day shows what could have
 * been known then. A withdrawn change shows as cancelled or superseded from the
 * day it was withdrawn and never takes effect.
 */

export type PlanTimelineStatusV1 =
  /** Happened, or took effect, on or before `asOf`. */
  | "effective"
  /** Announced, with an effective date after `asOf`. */
  | "scheduled"
  /** Announced with no effective date. It never takes effect by time alone. */
  | "announced"
  | "cancelled"
  | "superseded";

export interface PlanTimelineEntryV1 {
  id: string;
  kind: PlanEventKindV1;
  title: string;
  summary?: string;
  /** The day the entry sits at: the announcement day for announcements, else the effective day. */
  date?: string;
  status: PlanTimelineStatusV1;
  announcedAt?: string;
  effectiveAt?: string;
  appliesTo?: readonly PlanAudienceV1[];
  unaffected?: readonly PlanAudienceV1[];
  /** The version this entry starts, when it starts one. */
  versionId?: string;
  /** True when this entry started the terms in force on `asOf`. */
  startsCurrentTerms: boolean;
  withdrawn?: PlanWithdrawalV1;
  evidence: readonly PlanEvidenceV1[];
}

/** One run of versions under the same commercial terms. */
export interface PlanTermsV1 {
  /** The first version of these terms. */
  versionId: string;
  effectiveFrom: string;
  /**
   * The start date, only when the provider stated it. A catalog's first
   * record is not a launch date, so it is never offered here.
   */
  startedAt?: string;
  /** The last day these terms were in force, when later terms replaced them. */
  endedAt?: string;
  announcedAt?: string;
  audience?: readonly PlanAudienceV1[];
  revision?: PlanRevisionV1;
  status: "previous" | "current" | "scheduled";
}

export interface PlanTimelineV1 {
  planId: string;
  asOf: string;
  /** The terms in force on `asOf`; absent when no version is. */
  current?: PlanTermsV1;
  /** The terms the current ones replaced, when the current ones are a revision. */
  previous?: PlanTermsV1;
  /** The next announced revision after `asOf`, if one is scheduled. */
  scheduled?: PlanTermsV1;
  /** Events known on `asOf`, oldest first, undated announcements last. */
  entries: readonly PlanTimelineEntryV1[];
}

const versionIdOf = (planId: string, effectiveFrom: string) => `${planId}@${effectiveFrom}`;

/** The day before an ISO date, in UTC calendar arithmetic. */
function dayBefore(date: string): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() - 1);
  return instant.toISOString().slice(0, 10);
}

interface TermsRun {
  first: PlanVersionEntryV1;
  versions: PlanVersionEntryV1[];
}

/**
 * Versions grouped into runs of the same terms: a run starts at the first
 * version and at every version that declares a revision. Withdrawn versions
 * never took effect and belong to no run.
 */
function termsRuns(versions: readonly PlanVersionEntryV1[]): TermsRun[] {
  const live = versions
    .filter((version) => version.withdrawn === undefined)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
  const runs: TermsRun[] = [];
  for (const version of live) {
    const last = runs.at(-1);
    if (last === undefined || version.revision !== undefined)
      runs.push({ first: version, versions: [version] });
    else last.versions.push(version);
  }
  return runs;
}

function termsOf(
  planId: string,
  run: TermsRun,
  next: TermsRun | undefined,
  status: PlanTermsV1["status"],
): PlanTermsV1 {
  const { first } = run;
  const lastVersion = run.versions.at(-1);
  const endedAt =
    next !== undefined ? dayBefore(next.first.effectiveFrom) : lastVersion?.effectiveTo;
  return {
    versionId: versionIdOf(planId, first.effectiveFrom),
    effectiveFrom: first.effectiveFrom,
    ...(first.effectiveFromBasis === "provider" ? { startedAt: first.effectiveFrom } : {}),
    ...(endedAt !== undefined && status !== "scheduled" ? { endedAt } : {}),
    ...(first.announcedAt !== undefined ? { announcedAt: first.announcedAt } : {}),
    ...(first.audience !== undefined ? { audience: first.audience } : {}),
    ...(first.revision !== undefined ? { revision: first.revision } : {}),
    status,
  };
}

function entryStatus(
  event: NonNullable<PlanV1["history"]>["events"][number],
  asOf: string,
): PlanTimelineStatusV1 | undefined {
  const knownFrom =
    event.kind === "announcement" ? event.announcedAt : (event.announcedAt ?? event.effectiveAt);
  if (knownFrom === undefined || knownFrom > asOf) return undefined;
  if (event.withdrawn !== undefined && event.withdrawn.at <= asOf) return event.withdrawn.reason;
  if (event.kind === "announcement") return "effective";
  if (event.effectiveAt === undefined) return "announced";
  return event.effectiveAt > asOf ? "scheduled" : "effective";
}

const STATUS_ORDER: Record<PlanTimelineStatusV1, number> = {
  effective: 0,
  scheduled: 1,
  superseded: 2,
  cancelled: 3,
  announced: 4,
};

/**
 * The plan's terms and history as of one calendar day.
 */
export function resolvePlanTimeline(
  plan: Pick<PlanV1, "id" | "versions" | "history">,
  asOf: string,
): PlanTimelineV1 {
  const day = asOf.slice(0, 10);
  const runs = termsRuns(plan.versions);
  const inForce = selectPlanVersionAt(plan.versions, day);
  const currentIndex =
    inForce === undefined ? -1 : runs.findIndex((run) => run.versions.includes(inForce));

  const current =
    currentIndex >= 0
      ? termsOf(plan.id, runs[currentIndex] as TermsRun, runs[currentIndex + 1], "current")
      : undefined;
  const previousRun = currentIndex > 0 ? runs[currentIndex - 1] : undefined;
  const previous =
    previousRun !== undefined && current?.revision !== undefined
      ? termsOf(plan.id, previousRun, runs[currentIndex], "previous")
      : undefined;
  const scheduledRun = runs.find(
    (run) =>
      run.first.effectiveFrom > day &&
      run.first.revision !== undefined &&
      (run.first.announcedAt === undefined || run.first.announcedAt <= day),
  );
  const scheduled =
    scheduledRun !== undefined ? termsOf(plan.id, scheduledRun, undefined, "scheduled") : undefined;

  const entries: PlanTimelineEntryV1[] = [];
  for (const event of plan.history?.events ?? []) {
    const status = entryStatus(event, day);
    if (status === undefined) continue;
    const date = event.kind === "announcement" ? event.announcedAt : event.effectiveAt;
    const versionId =
      event.versionEffectiveFrom === undefined
        ? undefined
        : versionIdOf(plan.id, event.versionEffectiveFrom);
    entries.push({
      id: event.id,
      kind: event.kind,
      title: event.title,
      ...(event.summary !== undefined ? { summary: event.summary } : {}),
      ...(date !== undefined ? { date } : {}),
      status,
      ...(event.announcedAt !== undefined ? { announcedAt: event.announcedAt } : {}),
      ...(event.effectiveAt !== undefined ? { effectiveAt: event.effectiveAt } : {}),
      ...(event.appliesTo !== undefined ? { appliesTo: event.appliesTo } : {}),
      ...(event.unaffected !== undefined ? { unaffected: event.unaffected } : {}),
      ...(versionId !== undefined ? { versionId } : {}),
      // An announcement names the version it announced but does not start it.
      startsCurrentTerms:
        event.kind !== "announcement" &&
        status === "effective" &&
        current !== undefined &&
        versionId === current.versionId,
      ...(event.withdrawn !== undefined && status !== "scheduled"
        ? { withdrawn: event.withdrawn }
        : {}),
      evidence: event.evidence,
    });
  }
  entries.sort((a, b) => {
    if (a.date === undefined || b.date === undefined) {
      if (a.date !== b.date) return a.date === undefined ? 1 : -1;
    } else if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return {
    planId: plan.id,
    asOf: day,
    ...(current !== undefined ? { current } : {}),
    ...(previous !== undefined ? { previous } : {}),
    ...(scheduled !== undefined ? { scheduled } : {}),
    entries,
  };
}

/** Whether a plan has any history worth a timeline: events or a revision. */
export function planHasHistory(plan: Pick<PlanV1, "versions" | "history">): boolean {
  return (
    (plan.history?.events.length ?? 0) > 0 ||
    plan.versions.some((version) => version.revision !== undefined)
  );
}
