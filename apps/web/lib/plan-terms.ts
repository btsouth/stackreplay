import type {
  PlanAudienceV1,
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

export interface PlanTermsNoticeV1 {
  /** `scheduled`: officially announced, not yet in effect. `revised`: the current terms are a revision. */
  state: "scheduled" | "revised";
  effectiveFrom: string;
  headline: string;
  detail?: string;
}

/**
 * The one line a plan header shows about its terms, or nothing for a plan whose
 * terms have never been revised. An announced revision takes precedence over a
 * past one, because it is what a buyer needs to know next.
 */
export function planTermsNotice(timeline: PlanTimelineV1): PlanTermsNoticeV1 | undefined {
  const terms = timeline.scheduled ?? (timeline.current?.revision ? timeline.current : undefined);
  if (terms?.revision === undefined) return undefined;
  const state = terms.status === "scheduled" ? "scheduled" : "revised";
  const date = formatCatalogDate(terms.effectiveFrom);
  const value = terms.revision.relativeValue;
  const scope =
    terms.audience !== undefined && terms.audience.length > 0
      ? `For ${audienceWords(terms.audience)}`
      : undefined;
  const detail =
    value !== undefined
      ? `${scope === undefined ? "" : `${scope}: `}${state === "scheduled" ? "new terms provide" : "usage is"} ${relativeValuePhrase(value)}.`
      : scope === undefined
        ? undefined
        : `${scope}.`;
  return {
    state,
    effectiveFrom: terms.effectiveFrom,
    headline: state === "scheduled" ? `Official change effective ${date}` : `Terms changed ${date}`,
    ...(detail !== undefined ? { detail: capitalize(detail) } : {}),
  };
}

/** Replay's line for the terms a result uses. */
export function planTermsInUse(timeline: PlanTimelineV1): {
  terms: string;
  change?: string;
} {
  const current = timeline.current;
  const scheduled = timeline.scheduled;
  const terms =
    current?.revision !== undefined
      ? `Using terms effective ${formatCatalogDate(current.effectiveFrom)}`
      : "Current terms";
  if (scheduled?.revision !== undefined)
    return {
      terms,
      change: `Official revision takes effect ${formatCatalogDate(scheduled.effectiveFrom)}`,
    };
  const value = current?.revision?.relativeValue;
  if (value !== undefined) return { terms, change: capitalize(relativeValuePhrase(value)) };
  return { terms };
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
    const details = [
      ...(earlier.endedAt !== undefined
        ? [
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
  for (const [key, entries] of byDate) {
    const state = stepState(entries);
    const date = entries[0]?.date;
    const lines = entries.map((entry) => lineOf(entry, timeline));
    const shared =
      lines.length > 1 && lines.every((line) => line.audience === lines[0]?.audience)
        ? lines[0]?.audience
        : undefined;
    steps.push({
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
  return steps;
}

/**
 * The terms a result was computed on, from its own plan version: "terms
 * effective Sep 30, 2026", or "terms before the Sep 30, 2026 revision". A plan
 * that has never been revised needs no label. It reads the stored version id,
 * never today's date, so a saved result keeps naming the terms it used.
 */
export function versionTermsLabel(
  plan: PlanTimelineInputV1,
  versionId: string,
): string | undefined {
  const terms = planTermsOfVersion(plan, versionId);
  if (terms === undefined) return undefined;
  if (terms.revision !== undefined)
    return `terms effective ${formatCatalogDate(terms.effectiveFrom)}`;
  if (terms.nextRevisionFrom !== undefined)
    return `terms before the ${formatCatalogDate(terms.nextRevisionFrom)} revision`;
  return undefined;
}
