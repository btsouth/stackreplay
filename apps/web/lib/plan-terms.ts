import type {
  PlanAudienceV1,
  PlanCohortWindowV1,
  PlanEvidenceV1,
  PlanRelativeValueV1,
  PlanTimelineEntryV1,
  PlanTimelineInputV1,
  PlanTimelineV1,
} from "@stackreplay/catalog";
import { planTermsOfVersion } from "@stackreplay/catalog/timeline";
import { formatCatalogDate } from "./catalog-copy";

/**
 * Words for a plan's terms and history, composed from the resolved timeline
 * (`resolvePlanTimeline`). Every surface that describes a plan change (the plan
 * page, Compare, Replay) reads these, so "scheduled", "current" and the size of
 * a change are worded once.
 *
 * A relative change is stated in the measure the provider used. "About half the
 * API-equivalent spend" is not "half the tokens": cheaper models change how many
 * tokens a dollar of API-equivalent usage buys.
 */

/** "0.5" -> "50", "0.125" -> "12.5", without floating-point arithmetic. */
export function percentOfRatio(ratio: string): string | undefined {
  const match = /^(\d+)(?:\.(\d+))?$/u.exec(ratio);
  if (match === null) return undefined;
  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const integer = `${whole}${fraction.slice(0, 2)}`.replace(/^0+(?=\d)/u, "");
  const rest = fraction.slice(2).replace(/0+$/u, "");
  return rest.length === 0 ? integer : `${integer}.${rest}`;
}

/** "≈50% of the previous API-equivalent spend". */
export function relativeValuePhrase(value: PlanRelativeValueV1): string {
  const percent = percentOfRatio(value.ratio) ?? value.ratio;
  return `${value.approximate ? "≈" : ""}${percent}% of the previous API-equivalent spend`;
}

const AUDIENCE_WORDS: Record<PlanAudienceV1, string> = {
  new_subscribers: "new subscribers",
  upgrades: "upgrades",
  existing_subscribers: "existing subscribers",
  returning_subscribers: "returning subscribers",
};

/** "new subscribers and upgrades". */
export function audienceWords(audience: readonly PlanAudienceV1[]): string {
  const words = audience.map((entry) => AUDIENCE_WORDS[entry]);
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Who stated a relative change, so a staff description is not read as a published rate. */
function attribution(value: PlanRelativeValueV1, providerName: string | undefined): string {
  const who = providerName ?? "the provider";
  switch (value.evidence[0]?.authority) {
    case "provider_staff":
      return `described by ${who} staff as`;
    case "provider_keynote":
    case "provider_announcement":
      return `announced by ${who} as`;
    default:
      return `stated by ${who} as`;
  }
}

/** Cohort windows that matter today: running now, or announced and about to start. */
const liveWindows = (timeline: PlanTimelineV1) =>
  timeline.cohortWindows.filter((window) => window.status !== "ended");

/** "Eligible existing subscribers keep their previous allowance through Oct 29, 2026." */
function cohortSentence(window: PlanCohortWindowV1): string {
  const until =
    window.effectiveTo === undefined
      ? "; no end date is published"
      : ` through ${formatCatalogDate(window.effectiveTo)}`;
  const verb = window.status === "ended" ? "kept" : "keep";
  return `${window.cohort.label} ${verb} their previous allowance${until}.`;
}

export interface PlanTermsNoticeV1 {
  /** `scheduled`: officially announced, not yet in effect. `revised`: the current terms are a revision. */
  state: "scheduled" | "revised";
  effectiveFrom: string;
  headline: string;
  detail?: string;
  /** A conditional exception for a cohort, such as grandfathered subscribers. */
  exception?: { lead: string; text: string };
}

/**
 * The lines a plan header shows about its terms, or nothing for a plan whose
 * terms have never been revised. The headline and detail describe what someone
 * subscribing today gets; a running cohort window (grandfathering) is a
 * separate, secondary exception. An announced revision takes precedence over a
 * past one, because it is what a buyer needs to know next.
 */
export function planTermsNotice(
  timeline: PlanTimelineV1,
  options: { planName?: string; providerName?: string } = {},
): PlanTermsNoticeV1 | undefined {
  const terms = timeline.scheduled ?? (timeline.current?.revision ? timeline.current : undefined);
  if (terms?.revision === undefined) return undefined;
  const state = terms.status === "scheduled" ? "scheduled" : "revised";
  const date = formatCatalogDate(terms.effectiveFrom);
  const value = terms.revision.relativeValue;
  const windows = liveWindows(timeline);
  const subject = windows.some((window) => window.cohort.kind === "grandfathered")
    ? "New and non-grandfathered subscriptions"
    : terms.audience !== undefined && terms.audience.length > 0
      ? capitalize(audienceWords(terms.audience))
      : "Subscriptions";
  const what = `the ${lowerFirst(terms.revision.title)}`;
  const detail =
    value === undefined
      ? `${subject} ${state === "scheduled" ? "will get" : "get"} ${what}.`
      : `${subject} ${state === "scheduled" ? "will get" : "get"} ${what}, ${attribution(value, options.providerName)} ${relativeValuePhrase(value)}.`;
  const window = windows[0];
  return {
    state,
    effectiveFrom: terms.effectiveFrom,
    headline:
      state === "scheduled"
        ? `Official change effective ${date}`
        : `${terms.revision.title} since ${date}`,
    detail,
    ...(window !== undefined
      ? {
          exception: {
            lead:
              options.planName === undefined
                ? "Already subscribed?"
                : `Already on ${options.planName}?`,
            text: cohortSentence(window),
          },
        }
      : {}),
  };
}

/** Replay's line for the terms a replay uses, and a cohort it could use instead. */
export function planTermsInUse(timeline: PlanTimelineV1): {
  terms: string;
  change?: string;
  cohortOffer?: { id: string; label: string; text: string; through?: string };
} {
  const applied = timeline.applied;
  const current = timeline.current;
  const scheduled = timeline.scheduled;
  if (applied?.cohort !== undefined) {
    const window = timeline.cohortWindows.find((entry) => entry.versionId === applied.versionId);
    return {
      terms:
        window === undefined
          ? "Cohort terms"
          : `${window.cohort.label}: previous allowance${
              window.effectiveTo === undefined
                ? ""
                : ` through ${formatCatalogDate(window.effectiveTo)}`
            }`,
    };
  }
  const running = timeline.cohortWindows.find((window) => window.status === "current");
  const cohortOffer =
    running === undefined
      ? undefined
      : {
          id: running.cohort.id,
          label: running.cohort.label,
          text: cohortSentence(running),
          ...(running.effectiveTo !== undefined ? { through: running.effectiveTo } : {}),
        };
  const terms =
    current?.revision !== undefined
      ? `Current market terms, revised ${formatCatalogDate(current.effectiveFrom)}`
      : "Current terms";
  if (scheduled?.revision !== undefined)
    return {
      terms,
      change: `Official revision takes effect ${formatCatalogDate(scheduled.effectiveFrom)}`,
      ...(cohortOffer !== undefined ? { cohortOffer } : {}),
    };
  const value = current?.revision?.relativeValue;
  return {
    terms,
    ...(value !== undefined ? { change: capitalize(relativeValuePhrase(value)) } : {}),
    ...(cohortOffer !== undefined ? { cohortOffer } : {}),
  };
}

export type PlanHistoryStepStateV1 =
  | "previous"
  | "current"
  | "past"
  | "scheduled"
  | "announced"
  | "cancelled"
  | "superseded";

export interface PlanHistoryLineV1 {
  key: string;
  title: string;
  details: readonly string[];
  audience?: string;
  evidence: readonly PlanEvidenceV1[];
}

export interface PlanHistoryStepV1 {
  key: string;
  /** `terms` is the run of terms before the history's events; `events` is one day. */
  kind: "terms" | "events";
  /** ISO date the step sits at, when it has one. */
  date?: string;
  dateLabel: string;
  state: PlanHistoryStepStateV1;
  stateLabel: string;
  lines: readonly PlanHistoryLineV1[];
  /** An audience every line of the step shares, said once for the step. */
  audience?: string;
  /** A cohort exception that starts on this day, shown as a compact note. */
  note?: { label: string; text: string };
}

const STATE_LABELS: Record<PlanHistoryStepStateV1, string> = {
  previous: "Previous",
  current: "Current",
  past: "Past",
  scheduled: "Scheduled · official",
  announced: "Announced, no date set",
  cancelled: "Cancelled",
  superseded: "Superseded",
};

function lineOf(entry: PlanTimelineEntryV1, timeline: PlanTimelineV1): PlanHistoryLineV1 {
  const linked = [timeline.current, timeline.scheduled].find(
    (terms) => terms !== undefined && terms.versionId === entry.versionId,
  );
  const value = entry.kind === "announcement" ? undefined : linked?.revision?.relativeValue;
  const details = [
    ...(value !== undefined ? [capitalize(relativeValuePhrase(value))] : []),
    ...(entry.summary !== undefined ? [entry.summary] : []),
    ...(entry.withdrawn?.note !== undefined ? [entry.withdrawn.note] : []),
  ];
  const applies =
    entry.appliesTo !== undefined ? `Applies to ${audienceWords(entry.appliesTo)}` : undefined;
  const unaffected =
    entry.unaffected !== undefined
      ? `${capitalize(audienceWords(entry.unaffected))} not affected`
      : undefined;
  const audience = [applies, unaffected].filter((part) => part !== undefined).join(" · ");
  return {
    key: entry.id,
    title: entry.title,
    details,
    ...(audience.length > 0 ? { audience } : {}),
    evidence: entry.evidence,
  };
}

function stepState(entries: readonly PlanTimelineEntryV1[]): PlanHistoryStepStateV1 {
  if (entries.some((entry) => entry.startsCurrentTerms)) return "current";
  const statuses = new Set(entries.map((entry) => entry.status));
  if (statuses.has("scheduled")) return "scheduled";
  if (statuses.has("announced")) return "announced";
  if (statuses.has("effective")) return "past";
  if (statuses.has("superseded")) return "superseded";
  return "cancelled";
}

/**
 * The steps a plan-history timeline draws: the earlier terms first (with no
 * invented start date), then one step per day with that day's events, then
 * undated announcements.
 */
export function planHistorySteps(timeline: PlanTimelineV1): PlanHistoryStepV1[] {
  const steps: PlanHistoryStepV1[] = [];
  const hasRevision =
    timeline.previous !== undefined ||
    timeline.scheduled !== undefined ||
    timeline.current?.revision !== undefined;
  const earlier =
    timeline.previous ?? (timeline.current?.revision === undefined ? timeline.current : undefined);
  if (earlier !== undefined && hasRevision) {
    const state: PlanHistoryStepStateV1 = earlier.status === "previous" ? "previous" : "current";
    // The rail position is the terms' start. Only a provider-stated start is a
    // date; otherwise the step sits before every dated event as "Earlier".
    // Terms a cohort keeps after the market moved on end on two dates, and the
    // step says both rather than implying everyone lost them on the first.
    const kept =
      earlier.endedAt === undefined
        ? undefined
        : timeline.cohortWindows.find(
            (window) =>
              window.cohort.kind === "grandfathered" &&
              window.effectiveFrom === dayAfter(earlier.endedAt as string),
          );
    const details = [
      ...(earlier.endedAt !== undefined
        ? kept !== undefined
          ? [
              `Offered to new subscribers until ${formatCatalogDate(earlier.endedAt)}`,
              `Kept by ${lowerFirst(kept.cohort.label)}${
                kept.effectiveTo === undefined
                  ? ""
                  : ` through ${formatCatalogDate(kept.effectiveTo)}`
              }`,
            ]
          : [
              state === "previous"
                ? `In effect until ${formatCatalogDate(earlier.endedAt)}`
                : `In effect through ${formatCatalogDate(earlier.endedAt)}`,
            ]
        : []),
      ...(earlier.startedAt === undefined ? ["Start date not published"] : []),
    ];
    steps.push({
      key: `terms-${earlier.versionId}`,
      kind: "terms",
      ...(earlier.startedAt !== undefined ? { date: earlier.startedAt } : {}),
      dateLabel: earlier.startedAt !== undefined ? formatCatalogDate(earlier.startedAt) : "Earlier",
      state,
      stateLabel: STATE_LABELS[state],
      lines: [
        {
          key: `terms-${earlier.versionId}`,
          title: state === "previous" ? "Previous terms" : "Terms in effect",
          details,
          evidence: [],
        },
      ],
    });
  }
  const byDate = new Map<string, PlanTimelineEntryV1[]>();
  for (const entry of timeline.entries) {
    const key = entry.date ?? `undated-${entry.id}`;
    byDate.set(key, [...(byDate.get(key) ?? []), entry]);
  }
  const dated: PlanHistoryStepV1[] = [];
  const undated: PlanHistoryStepV1[] = [];
  for (const [key, entries] of byDate) {
    const state = stepState(entries);
    const date = entries[0]?.date;
    const lines = entries.map((entry) => lineOf(entry, timeline));
    const shared =
      lines.length > 1 && lines.every((line) => line.audience === lines[0]?.audience)
        ? lines[0]?.audience
        : undefined;
    (date === undefined ? undated : dated).push({
      key,
      kind: "events",
      ...(date !== undefined ? { date } : {}),
      dateLabel: date !== undefined ? formatCatalogDate(date) : "Date not announced",
      state,
      stateLabel: STATE_LABELS[state],
      lines: shared === undefined ? lines : lines.map(({ audience: _audience, ...line }) => line),
      ...(shared !== undefined ? { audience: shared } : {}),
    });
  }
  // A cohort window is drawn from its own version's dates: a note on the day
  // it starts, and a step on the day its terms end. Nothing restates a date.
  for (const window of timeline.cohortWindows) {
    const note = { label: cohortNoteLabel(window), text: cohortSentence(window) };
    const start = dated.find((step) => step.date === window.effectiveFrom);
    if (start !== undefined) start.note = note;
    else
      dated.push({
        key: `cohort-${window.versionId}`,
        kind: "events",
        date: window.effectiveFrom,
        dateLabel: formatCatalogDate(window.effectiveFrom),
        state: window.status === "scheduled" ? "scheduled" : "past",
        stateLabel: STATE_LABELS[window.status === "scheduled" ? "scheduled" : "past"],
        lines: [],
        note,
      });
    if (window.effectiveTo !== undefined) {
      const endState: PlanHistoryStepStateV1 = window.status === "ended" ? "past" : "scheduled";
      dated.push({
        key: `cohort-end-${window.versionId}`,
        kind: "events",
        date: dayAfter(window.effectiveTo),
        dateLabel: `After ${formatCatalogDate(window.effectiveTo)}`,
        state: endState,
        stateLabel: STATE_LABELS[endState],
        lines: [
          {
            key: `cohort-end-${window.versionId}`,
            title: `${cohortNoteLabel(window)} ends`,
            details: [`${window.cohort.label} move to the current market terms.`],
            evidence: window.cohort.evidence,
          },
        ],
      });
    }
  }
  dated.sort((a, b) =>
    (a.date ?? "") < (b.date ?? "") ? -1 : (a.date ?? "") > (b.date ?? "") ? 1 : 0,
  );
  return [...steps, ...dated, ...undated];
}

function dayAfter(date: string): string {
  const instant = new Date(`${date}T00:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + 1);
  return instant.toISOString().slice(0, 10);
}

function cohortNoteLabel(window: PlanCohortWindowV1): string {
  return window.cohort.kind === "grandfathered" ? "Grandfathered allowance" : window.cohort.label;
}

/**
 * The terms a result was computed on, from its own plan version: "terms
 * effective Sep 29, 2026", "terms before the Sep 29, 2026 revision", or a
 * cohort's previous allowance "through Oct 29, 2026". A plan
 * that has never been revised needs no label. It reads the stored version id,
 * never today's date, so a saved result keeps naming the terms it used.
 */
export function versionTermsLabel(
  plan: PlanTimelineInputV1,
  versionId: string,
): string | undefined {
  const terms = planTermsOfVersion(plan, versionId);
  if (terms === undefined) return undefined;
  if (terms.cohort !== undefined)
    return `${lowerFirst(terms.cohort.label)}' previous allowance${
      terms.effectiveTo === undefined ? "" : ` through ${formatCatalogDate(terms.effectiveTo)}`
    }`;
  if (terms.revision !== undefined)
    return `terms effective ${formatCatalogDate(terms.effectiveFrom)}`;
  if (terms.nextRevisionFrom !== undefined)
    return `terms before the ${formatCatalogDate(terms.nextRevisionFrom)} revision`;
  return undefined;
}
