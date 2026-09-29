import type { WindowFact, WorkloadProfile } from "./workload-profile";

/**
 * Canonical readings of the workload profile that more than one surface prints
 * (decision 57). Each fact is taken from exactly one window or one day, and a
 * sentence never combines figures from two of them.
 *
 * - The busiest five-hour window is ranked by calls (recorded events). The
 *   heaviest five-hour window by tokens is a different window, named as such.
 * - A day is a calendar day in the profile's timezone.
 * - Output is the disjoint output bucket; reasoning is its own bucket.
 * - Models are canonical catalog models; unresolved identifiers are counted
 *   separately.
 */

export interface PeakFiveHours {
  /** Ranked by calls; its token figures are that same window's. */
  byCalls: WindowFact | undefined;
  /** Ranked by known tokens. */
  byTokens: WindowFact | undefined;
  /** True when both rankings pick the window that starts at the same instant. */
  sameWindow: boolean;
}

export function peakFiveHours(profile: WorkloadProfile): PeakFiveHours {
  const byCalls = profile.pressure.events.find((row) => row.id === "5h")?.peak;
  const byTokens = profile.pressure.tokens.find((row) => row.id === "5h")?.peak;
  return {
    byCalls,
    byTokens,
    sameWindow:
      byCalls !== undefined && byTokens !== undefined && byCalls.startMs === byTokens.startMs,
  };
}

/** A window's share of the workload's known tokens, from that window's own tokens. */
export function tokenShareOf(window: WindowFact, profile: WorkloadProfile): number | undefined {
  const known = profile.overview.knownTokens;
  return known === 0 ? undefined : window.tokens / known;
}

/** A window's share of the workload's calls, from that window's own count. */
export function callShareOf(window: WindowFact, profile: WorkloadProfile): number | undefined {
  const total = profile.overview.events;
  return total === 0 ? undefined : window.events / total;
}

/** Share of known processed tokens that were reads from the prompt cache. */
export function cacheReadShareOf(profile: WorkloadProfile): number | undefined {
  const known = profile.overview.knownTokens;
  return known === 0 ? undefined : profile.tokens.cacheRead / known;
}

const count = (value: number): string => value.toLocaleString("en-US");
const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

function startsAt(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(ms));
}

/**
 * The historical-pressure sentences: the busiest window by calls, with every
 * figure read from that one window, then the heaviest window by tokens only
 * when it is a different window.
 */
export function peakWindowSentences(profile: WorkloadProfile): string[] {
  const { byCalls, byTokens, sameWindow } = peakFiveHours(profile);
  const zone = profile.timeZone;
  const sentences: string[] = [];
  if (byCalls !== undefined) {
    const calls = callShareOf(byCalls, profile);
    const tokens = tokenShareOf(byCalls, profile);
    sentences.push(
      `Your busiest five-hour window, starting ${startsAt(byCalls.startMs, zone)}, held ${count(byCalls.events)} calls${calls === undefined ? "" : ` (${percent(calls)} of all calls)`}${tokens === undefined ? "" : ` and ${percent(tokens)} of known tokens`}.`,
    );
  }
  if (byTokens !== undefined && !sameWindow) {
    const tokens = tokenShareOf(byTokens, profile);
    if (tokens !== undefined)
      sentences.push(
        `By tokens, the heaviest five-hour window started ${startsAt(byTokens.startMs, zone)} and held ${percent(tokens)} of known tokens.`,
      );
  }
  return sentences;
}

/** Canonical models and unresolved identifiers, never added together as "models". */
export function modelCounts(profile: WorkloadProfile): { models: number; unresolvedIds: number } {
  return {
    models: profile.models.canonical.length,
    unresolvedIds: profile.overview.unresolvedIds,
  };
}
