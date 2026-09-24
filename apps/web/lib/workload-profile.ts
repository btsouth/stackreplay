import type { CatalogV1, ModelIdentityIndex } from "@stackreplay/catalog";
import { directApiProviderIdsFor } from "@stackreplay/catalog/bundled";
import {
  durationToMs,
  sliceCalendarWindows,
  sliceRollingWindows,
  sortTimedEvents,
  Temporal,
  type TimedEvent,
  tokenAccountingOf,
  toTimedEvents,
  type WindowSlice,
} from "@stackreplay/replay-engine";
import type { UsageEventV1 } from "@stackreplay/schema";

/**
 * Workload profile: what the imported history says on its own, before any
 * target is chosen.
 *
 * Everything here is derived from the normalized events the scan already
 * produced, never from the raw source files, and every figure is a plain
 * aggregate: counts, sums, medians and maxima. There is no score, no
 * "burstiness index" and no interpretation of what the work was.
 *
 * Three rules hold throughout:
 *
 * - Token magnitude is the replay engine's own disjoint-bucket total
 *   (`tokenAccountingOf`). An event whose categories are incomplete adds to the
 *   event counts and to `unknownUsageEvents`, never to a token total.
 * - Rolling windows are sliced with the engine's `sliceRollingWindows`: a window
 *   opens at the first event after the previous one closed. That is how Replay
 *   applies a rolling limit, so a "peak 5-hour window" here is the same window
 *   a 5-hour allowance would have seen. Calendar days and weeks use the engine's
 *   calendar slicer in the viewer's timezone.
 * - Clock positions (hour of day, weekday, local date) are read in one explicit
 *   IANA timezone, which the profile names, because a UTC hour is not when
 *   anybody worked.
 *
 * Project labels are local-only display strings supplied by the caller. They
 * never enter the export, and the profile is never sent anywhere.
 */

export const PROFILE_VERSION = 1;

export type Measure = "events" | "tokens";

export interface TokenBuckets {
  uncachedInput: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
  reasoning: number;
}

/** Demand carried by one set of events, in both measures. */
export interface Demand {
  events: number;
  /** Known tokens only: events with incomplete accounting contribute nothing. */
  tokens: number;
}

export interface RankedShare extends Demand {
  key: string;
  label: string;
}

/** One concrete window of recorded demand, with what was in it. */
export interface WindowFact extends Demand {
  startMs: number;
  endMs: number;
  /** Share of the whole workload's demand in the measure the window was ranked by. */
  share: number;
  sessions: number;
  unknownUsageEvents: number;
  buckets: TokenBuckets;
  projects: RankedShare[];
  models: RankedShare[];
}

export interface PressureRow {
  id: "1h" | "3h" | "5h" | "day" | "week";
  label: string;
  /** How the windows were formed, in one line. */
  basis: string;
  /** Number of windows the workload occupied. */
  windowCount: number;
  /** Median demand of an occupied window, in the ranked measure. */
  median: number;
  peak: WindowFact | undefined;
}

export interface ProjectProfile extends Demand {
  key: string;
  label: string;
  /** `local`: a label from this browser's scan; `anonymous`: hash only; `none`: no project recorded. */
  labelKind: "local" | "anonymous" | "none";
  sessions: number;
  unknownUsageEvents: number;
  firstMs: number;
  lastMs: number;
  activeDays: number;
  buckets: TokenBuckets;
  models: RankedShare[];
  /** Local date -> demand, only for active days. */
  daily: { date: string; events: number; tokens: number }[];
  heaviestSession: SessionRow | undefined;
  peak5hByEvents: WindowFact | undefined;
  peak5hByTokens: WindowFact | undefined;
}

export interface SessionRow extends Demand {
  key: string;
  projectLabel: string | undefined;
  firstMs: number;
  lastMs: number;
  /** Time between the first and last recorded event. Not a measured duration. */
  observedSpanMs: number;
  primaryModel: string | undefined;
}

export interface ModelShare extends Demand {
  modelId: string;
  name: string;
  /**
   * Public Direct API providers the catalog records as offering this model. An
   * offering fact only: the catalog does not record who built a model.
   */
  apiProviders: { id: string; name: string }[];
  /** Observed spellings that resolved to this canonical model. */
  observedNames: string[];
}

export interface UnresolvedModel extends Demand {
  rawName: string;
}

export interface RhythmFacts {
  busiestHour: number | undefined;
  /** Smallest run of consecutive hours holding at least 80% of demand. */
  typicalWindow: { startHour: number; endHour: number; share: number } | undefined;
  bands: { id: "night" | "morning" | "afternoon" | "evening"; label: string; share: number }[];
  busiestWeekday: number | undefined;
  weekendShare: number;
}

export interface Insight {
  id: string;
  text: string;
}

export interface WorkloadProfile {
  version: typeof PROFILE_VERSION;
  timeZone: string;
  overview: {
    events: number;
    sessions: number;
    projects: number;
    knownTokens: number;
    knownTokenEvents: number;
    unknownUsageEvents: number;
    /** Reported part of events whose total is unknown: a lower bound, kept apart. */
    lowerBoundTokens: number;
    firstMs: number | undefined;
    lastMs: number | undefined;
    firstDate: string | undefined;
    lastDate: string | undefined;
    /** Calendar days from the first to the last local date, inclusive. */
    spanDays: number;
    activeDays: number;
    resolvedEvents: number;
    unresolvedEvents: number;
    unresolvedIds: number;
    eventsWithoutSession: number;
    eventsWithoutProject: number;
  };
  tokens: TokenBuckets;
  chronology: {
    unit: "day" | "week";
    points: { date: string; events: number; tokens: number; unknownUsageEvents: number }[];
  };
  rhythm: {
    /** [weekday 0=Mon..6=Sun][hour 0..23]. */
    events: number[][];
    tokens: number[][];
    byEvents: RhythmFacts;
    byTokens: RhythmFacts;
  };
  days: {
    activeDays: number;
    medianEvents: number;
    medianTokens: number;
    peakByEvents: { date: string; events: number; tokens: number } | undefined;
    peakByTokens: { date: string; events: number; tokens: number } | undefined;
  };
  pressure: { events: PressureRow[]; tokens: PressureRow[] };
  /** The heaviest five-hour windows, ranked by each measure. */
  topWindows: { events: WindowFact[]; tokens: WindowFact[] };
  projects: ProjectProfile[];
  models: { canonical: ModelShare[]; unresolved: UnresolvedModel[] };
  sessions: {
    count: number;
    perActiveDay: number;
    medianEvents: number;
    medianTokens: number;
    top: SessionRow[];
    longestSpan: SessionRow | undefined;
  };
  insights: Insight[];
}

export interface ProfileOptions {
  identity: ModelIdentityIndex;
  catalog: CatalogV1;
  timeZone: string;
  /** Local-only labels by project hash, from this browser's scan. */
  projectLabels?: ReadonlyMap<string, string> | undefined;
}

const HOUR_MS = 3_600_000;
const QUARTER_HOUR_MS = 900_000;
const NO_PROJECT = "__none__";
const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function weekdayName(index: number): string {
  return WEEKDAY_NAMES[index] ?? "";
}

/** A usable IANA zone, or UTC when the runtime does not know the requested one. */
export function safeTimeZone(timeZone: string | undefined): string {
  if (timeZone === undefined || timeZone.length === 0) return "UTC";
  try {
    Temporal.Instant.fromEpochMilliseconds(0).toZonedDateTimeISO(timeZone);
    return timeZone;
  } catch {
    return "UTC";
  }
}

interface LocalParts {
  date: string;
  hour: number;
  /** 0 = Monday ... 6 = Sunday. */
  weekday: number;
}

/**
 * Clock position of an instant in one timezone. Every real-world UTC offset is
 * a whole number of quarter hours, so the position is constant across a
 * quarter-hour UTC bucket and one Temporal conversion serves every event in it.
 */
function localClock(timeZone: string): (ms: number) => LocalParts {
  const cache = new Map<number, LocalParts>();
  return (ms) => {
    const bucket = Math.floor(ms / QUARTER_HOUR_MS);
    const cached = cache.get(bucket);
    if (cached !== undefined) return cached;
    const zoned = Temporal.Instant.fromEpochMilliseconds(
      bucket * QUARTER_HOUR_MS,
    ).toZonedDateTimeISO(timeZone);
    const parts: LocalParts = {
      date: zoned.toPlainDate().toString(),
      hour: zoned.hour,
      weekday: zoned.dayOfWeek - 1,
    };
    cache.set(bucket, parts);
    return parts;
  };
}

function emptyBuckets(): TokenBuckets {
  return { uncachedInput: 0, cacheRead: 0, cacheWrite: 0, output: 0, reasoning: 0 };
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function measureOf(demand: Demand, measure: Measure): number {
  return measure === "events" ? demand.events : demand.tokens;
}

function rank<T extends Demand>(items: readonly T[], measure: Measure): T[] {
  return [...items].sort(
    (a, b) =>
      measureOf(b, measure) - measureOf(a, measure) ||
      measureOf(b, measure === "events" ? "tokens" : "events") -
        measureOf(a, measure === "events" ? "tokens" : "events"),
  );
}

interface PreparedEvent {
  timed: TimedEvent;
  tokens: number;
  known: boolean;
  buckets: TokenBuckets | undefined;
  modelKey: string;
  modelLabel: string;
  resolved: boolean;
  session: string | undefined;
  project: string;
  local: LocalParts;
}

/**
 * Resolves and measures every event once. Model identity follows the same
 * shared rules the workload summary and the engine apply: a recorded canonical
 * id the catalog still knows, otherwise the catalog's alias resolution, and
 * otherwise the raw spelling, left unresolved.
 */
function prepare(
  events: readonly UsageEventV1[],
  options: ProfileOptions,
  clock: (ms: number) => LocalParts,
): PreparedEvent[] {
  const { identity, catalog } = options;
  const known = new Set(identity.modelIds);
  const resolutionCache = new Map<string, string | undefined>();
  const timed = sortTimedEvents(toTimedEvents(events as UsageEventV1[]));
  return timed.map((item) => {
    const event = item.event;
    const harness = event.harness?.id;
    const cacheKey = `${event.model.canonicalId ?? ""}\u0000${event.model.rawName}\u0000${harness ?? ""}`;
    let canonicalId = resolutionCache.get(cacheKey);
    if (!resolutionCache.has(cacheKey)) {
      const recorded = event.model.canonicalId;
      canonicalId =
        recorded !== undefined && known.has(recorded)
          ? recorded
          : identity.resolve(event.model.rawName, harness === undefined ? undefined : { harness })
              .canonicalId;
      resolutionCache.set(cacheKey, canonicalId);
    }
    const accounting = tokenAccountingOf(event.usage);
    const buckets = accounting.known
      ? {
          uncachedInput: accounting.buckets.uncachedInputTokens,
          cacheRead: accounting.buckets.cacheReadTokens,
          cacheWrite: accounting.buckets.cacheWriteTokens,
          output: accounting.buckets.outputTokens,
          reasoning: accounting.buckets.reasoningTokens,
        }
      : undefined;
    return {
      timed: item,
      tokens: accounting.known ? accounting.total : 0,
      known: accounting.known,
      buckets,
      modelKey: canonicalId ?? `raw:${event.model.rawName}`,
      modelLabel:
        canonicalId === undefined
          ? event.model.rawName
          : (catalog.models[canonicalId]?.name ?? canonicalId),
      resolved: canonicalId !== undefined,
      session: event.source.nativeSessionHash,
      project: event.projectHash ?? NO_PROJECT,
      local: clock(item.atMs),
    };
  });
}

function projectLabelOf(
  key: string,
  labels: ReadonlyMap<string, string> | undefined,
  anonymousIndex: Map<string, number>,
): { label: string; kind: ProjectProfile["labelKind"] } {
  if (key === NO_PROJECT) return { label: "No project recorded", kind: "none" };
  const local = labels?.get(key);
  if (local !== undefined) return { label: local, kind: "local" };
  let index = anonymousIndex.get(key);
  if (index === undefined) {
    index = anonymousIndex.size + 1;
    anonymousIndex.set(key, index);
  }
  return { label: `Project ${index}`, kind: "anonymous" };
}

/** Totals and composition of one group of prepared events. */
function describe(
  events: readonly PreparedEvent[],
  startMs: number,
  endMs: number,
  total: Demand,
  measure: Measure,
  labelFor: (project: string) => string,
): WindowFact {
  const buckets = emptyBuckets();
  const sessions = new Set<string>();
  const projects = new Map<string, RankedShare>();
  const models = new Map<string, RankedShare>();
  let tokens = 0;
  let unknown = 0;
  for (const item of events) {
    tokens += item.tokens;
    if (item.buckets === undefined) unknown += 1;
    else {
      buckets.uncachedInput += item.buckets.uncachedInput;
      buckets.cacheRead += item.buckets.cacheRead;
      buckets.cacheWrite += item.buckets.cacheWrite;
      buckets.output += item.buckets.output;
      buckets.reasoning += item.buckets.reasoning;
    }
    if (item.session !== undefined) sessions.add(item.session);
    const project = projects.get(item.project) ?? {
      key: item.project,
      label: labelFor(item.project),
      events: 0,
      tokens: 0,
    };
    project.events += 1;
    project.tokens += item.tokens;
    projects.set(item.project, project);
    const model = models.get(item.modelKey) ?? {
      key: item.modelKey,
      label: item.modelLabel,
      events: 0,
      tokens: 0,
    };
    model.events += 1;
    model.tokens += item.tokens;
    models.set(item.modelKey, model);
  }
  const demand = { events: events.length, tokens };
  const whole = measureOf(total, measure);
  return {
    startMs,
    endMs,
    ...demand,
    share: whole === 0 ? 0 : measureOf(demand, measure) / whole,
    sessions: sessions.size,
    unknownUsageEvents: unknown,
    buckets,
    projects: rank([...projects.values()], measure).slice(0, 5),
    models: rank([...models.values()], measure).slice(0, 5),
  };
}

function sliceDemand(slice: WindowSlice, byId: ReadonlyMap<string, PreparedEvent>): Demand {
  let tokens = 0;
  for (const timed of slice.events) tokens += byId.get(timed.event.id)?.tokens ?? 0;
  return { events: slice.events.length, tokens };
}

function pressureRow(
  id: PressureRow["id"],
  label: string,
  basis: string,
  slices: readonly WindowSlice[],
  byId: ReadonlyMap<string, PreparedEvent>,
  total: Demand,
  measure: Measure,
  labelFor: (project: string) => string,
): PressureRow {
  let best: { slice: WindowSlice; value: number } | undefined;
  const values: number[] = [];
  for (const slice of slices) {
    const value = measureOf(sliceDemand(slice, byId), measure);
    values.push(value);
    if (best === undefined || value > best.value) best = { slice, value };
  }
  return {
    id,
    label,
    basis,
    windowCount: slices.length,
    median: median(values),
    peak:
      best === undefined
        ? undefined
        : describe(
            best.slice.events.map((timed) => byId.get(timed.event.id) as PreparedEvent),
            best.slice.startMs,
            best.slice.endMs,
            total,
            measure,
            labelFor,
          ),
  };
}

function topWindows(
  slices: readonly WindowSlice[],
  byId: ReadonlyMap<string, PreparedEvent>,
  total: Demand,
  measure: Measure,
  labelFor: (project: string) => string,
  count: number,
): WindowFact[] {
  return slices
    .map((slice) => ({ slice, value: measureOf(sliceDemand(slice, byId), measure) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || a.slice.startMs - b.slice.startMs)
    .slice(0, count)
    .map(({ slice }) =>
      describe(
        slice.events.map((timed) => byId.get(timed.event.id) as PreparedEvent),
        slice.startMs,
        slice.endMs,
        total,
        measure,
        labelFor,
      ),
    );
}

function rhythmFacts(grid: readonly number[][]): RhythmFacts {
  const hours = Array.from({ length: 24 }, (_, hour) =>
    grid.reduce((sum, row) => sum + (row[hour] ?? 0), 0),
  );
  const weekdays = grid.map((row) => row.reduce((sum, value) => sum + value, 0));
  const total = hours.reduce((sum, value) => sum + value, 0);
  if (total === 0)
    return {
      busiestHour: undefined,
      typicalWindow: undefined,
      bands: [],
      busiestWeekday: undefined,
      weekendShare: 0,
    };
  let busiestHour = 0;
  for (let hour = 1; hour < 24; hour += 1)
    if ((hours[hour] ?? 0) > (hours[busiestHour] ?? 0)) busiestHour = hour;
  let busiestWeekday = 0;
  for (let day = 1; day < 7; day += 1)
    if ((weekdays[day] ?? 0) > (weekdays[busiestWeekday] ?? 0)) busiestWeekday = day;

  let typicalWindow: RhythmFacts["typicalWindow"];
  for (let length = 1; length <= 24 && typicalWindow === undefined; length += 1) {
    let bestStart = -1;
    let bestSum = -1;
    for (let start = 0; start < 24; start += 1) {
      let sum = 0;
      for (let offset = 0; offset < length; offset += 1) sum += hours[(start + offset) % 24] ?? 0;
      if (sum > bestSum) {
        bestSum = sum;
        bestStart = start;
      }
    }
    if (bestSum >= total * 0.8)
      typicalWindow = {
        startHour: bestStart,
        endHour: (bestStart + length) % 24,
        share: bestSum / total,
      };
  }
  const band = (from: number, to: number) =>
    hours.slice(from, to).reduce((sum, value) => sum + value, 0) / total;
  return {
    busiestHour,
    typicalWindow,
    bands: [
      { id: "night", label: "Midnight to 6 AM", share: band(0, 6) },
      { id: "morning", label: "6 AM to noon", share: band(6, 12) },
      { id: "afternoon", label: "Noon to 6 PM", share: band(12, 18) },
      { id: "evening", label: "6 PM to midnight", share: band(18, 24) },
    ],
    busiestWeekday,
    weekendShare: ((weekdays[5] ?? 0) + (weekdays[6] ?? 0)) / total,
  };
}

function addDays(date: string, days: number): string {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

function daysBetween(from: string, to: string): number {
  return Temporal.PlainDate.from(from).until(Temporal.PlainDate.from(to), { largestUnit: "days" })
    .days;
}

function mondayOf(date: string): string {
  const plain = Temporal.PlainDate.from(date);
  return plain.subtract({ days: plain.dayOfWeek - 1 }).toString();
}

const PERCENT = (value: number): string => `${(value * 100).toFixed(1)}%`;

export function formatHour(hour: number): string {
  if (hour === 0) return "midnight";
  if (hour === 12) return "noon";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function shortDate(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(ms));
}

/**
 * A handful of deterministic observations, each one a direct reading of a
 * figure computed above. They are chosen by fixed rules in a fixed order, not
 * written or ranked by anything that interprets the work.
 */
function insightsFor(profile: Omit<WorkloadProfile, "insights">): Insight[] {
  const insights: Insight[] = [];
  const { overview, tokens, timeZone } = profile;
  const knownTokens = overview.knownTokens;
  if (knownTokens > 0 && tokens.cacheRead / knownTokens >= 0.5)
    insights.push({
      id: "cache-share",
      text: `${PERCENT(tokens.cacheRead / knownTokens)} of known processed tokens were cache reads: context reused from earlier turns, not fresh input.`,
    });
  // The busiest five-hour window is ranked by calls everywhere it is named
  // (decision 57); every figure in this sentence belongs to that one window.
  const peak = profile.pressure.events.find((row) => row.id === "5h")?.peak;
  if (peak !== undefined && overview.spanDays > 1)
    insights.push({
      id: "peak-5h",
      text: `Your busiest five-hour window, starting ${shortDate(peak.startMs, timeZone)}, held ${PERCENT(peak.share)} of all recorded calls.`,
    });
  const named = profile.projects.filter((project) => project.labelKind !== "none");
  if (named.length >= 4 && knownTokens > 0) {
    const topThree = rank(profile.projects, "tokens")
      .slice(0, 3)
      .reduce((sum, project) => sum + project.tokens, 0);
    insights.push({
      id: "project-concentration",
      text: `Three projects generated ${PERCENT(topThree / knownTokens)} of known token volume across ${named.length.toLocaleString("en-US")} projects.`,
    });
  }
  const topModel = rank(profile.models.canonical, "events")[0];
  if (topModel !== undefined && overview.events > 0)
    insights.push({
      id: "top-model",
      text: `${topModel.name} handled ${PERCENT(topModel.events / overview.events)} of recorded events.`,
    });
  const window = profile.rhythm.byEvents.typicalWindow;
  if (window !== undefined && window.endHour !== window.startHour && insights.length < 5)
    insights.push({
      id: "typical-window",
      text: `${PERCENT(window.share)} of recorded events fell between ${formatHour(window.startHour)} and ${formatHour(window.endHour)} (${timeZone}).`,
    });
  return insights.slice(0, 5);
}

/**
 * Builds the profile. Pure and deterministic for a given event set, catalog,
 * timezone and label map; it reads no clock.
 */
export function buildWorkloadProfile(
  events: readonly UsageEventV1[],
  options: ProfileOptions,
): WorkloadProfile {
  const timeZone = safeTimeZone(options.timeZone);
  const clock = localClock(timeZone);
  const prepared = prepare(events, options, clock);
  const byId = new Map(prepared.map((item) => [item.timed.event.id, item]));
  const anonymous = new Map<string, number>();
  // Anonymous numbering follows first appearance in chronological order, so it
  // is stable for a given workload.
  for (const item of prepared) projectLabelOf(item.project, options.projectLabels, anonymous);
  const labelFor = (project: string) =>
    projectLabelOf(project, options.projectLabels, anonymous).label;

  const tokens = emptyBuckets();
  const total: Demand = { events: prepared.length, tokens: 0 };
  const sessions = new Map<string, SessionRow & { models: Map<string, number>; project: string }>();
  const projects = new Map<
    string,
    {
      events: PreparedEvent[];
      sessions: Set<string>;
      daily: Map<string, { events: number; tokens: number }>;
      buckets: TokenBuckets;
      tokens: number;
      unknown: number;
    }
  >();
  const models = new Map<string, ModelShare>();
  const unresolved = new Map<string, UnresolvedModel>();
  const daily = new Map<string, { events: number; tokens: number; unknown: number }>();
  const gridEvents = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  const gridTokens = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let knownTokenEvents = 0;
  let lowerBound = 0;
  let unresolvedEvents = 0;
  let withoutSession = 0;
  let withoutProject = 0;

  for (const item of prepared) {
    const event = item.timed.event;
    total.tokens += item.tokens;
    if (item.buckets !== undefined) {
      knownTokenEvents += 1;
      tokens.uncachedInput += item.buckets.uncachedInput;
      tokens.cacheRead += item.buckets.cacheRead;
      tokens.cacheWrite += item.buckets.cacheWrite;
      tokens.output += item.buckets.output;
      tokens.reasoning += item.buckets.reasoning;
    } else {
      const accounting = tokenAccountingOf(event.usage);
      if (!accounting.known) lowerBound += accounting.knownSubtotal;
    }

    const day = daily.get(item.local.date) ?? { events: 0, tokens: 0, unknown: 0 };
    day.events += 1;
    day.tokens += item.tokens;
    if (!item.known) day.unknown += 1;
    daily.set(item.local.date, day);
    const eventsRow = gridEvents[item.local.weekday];
    const tokensRow = gridTokens[item.local.weekday];
    if (eventsRow !== undefined) eventsRow[item.local.hour] = (eventsRow[item.local.hour] ?? 0) + 1;
    if (tokensRow !== undefined)
      tokensRow[item.local.hour] = (tokensRow[item.local.hour] ?? 0) + item.tokens;

    if (item.resolved) {
      const model = models.get(item.modelKey) ?? {
        modelId: item.modelKey,
        name: item.modelLabel,
        apiProviders: directApiProviderIdsFor(options.catalog, item.modelKey).map((id) => ({
          id,
          name: options.catalog.providers[id]?.name ?? id,
        })),
        events: 0,
        tokens: 0,
        observedNames: [],
      };
      model.events += 1;
      model.tokens += item.tokens;
      if (!model.observedNames.includes(event.model.rawName))
        model.observedNames.push(event.model.rawName);
      models.set(item.modelKey, model);
    } else {
      unresolvedEvents += 1;
      const entry = unresolved.get(event.model.rawName) ?? {
        rawName: event.model.rawName,
        events: 0,
        tokens: 0,
      };
      entry.events += 1;
      entry.tokens += item.tokens;
      unresolved.set(event.model.rawName, entry);
    }

    if (item.session === undefined) withoutSession += 1;
    else {
      const session = sessions.get(item.session) ?? {
        key: item.session,
        projectLabel: undefined,
        project: item.project,
        firstMs: item.timed.atMs,
        lastMs: item.timed.atMs,
        observedSpanMs: 0,
        primaryModel: undefined,
        events: 0,
        tokens: 0,
        models: new Map<string, number>(),
      };
      session.events += 1;
      session.tokens += item.tokens;
      session.lastMs = item.timed.atMs;
      session.models.set(item.modelLabel, (session.models.get(item.modelLabel) ?? 0) + 1);
      sessions.set(item.session, session);
    }

    if (item.project === NO_PROJECT) withoutProject += 1;
    const project = projects.get(item.project) ?? {
      events: [],
      sessions: new Set<string>(),
      daily: new Map<string, { events: number; tokens: number }>(),
      buckets: emptyBuckets(),
      tokens: 0,
      unknown: 0,
    };
    project.events.push(item);
    if (item.session !== undefined) project.sessions.add(item.session);
    const projectDay = project.daily.get(item.local.date) ?? { events: 0, tokens: 0 };
    projectDay.events += 1;
    projectDay.tokens += item.tokens;
    project.daily.set(item.local.date, projectDay);
    project.tokens += item.tokens;
    if (item.buckets === undefined) project.unknown += 1;
    else {
      project.buckets.uncachedInput += item.buckets.uncachedInput;
      project.buckets.cacheRead += item.buckets.cacheRead;
      project.buckets.cacheWrite += item.buckets.cacheWrite;
      project.buckets.output += item.buckets.output;
      project.buckets.reasoning += item.buckets.reasoning;
    }
    projects.set(item.project, project);
  }

  for (const model of models.values()) model.observedNames.sort();

  const sessionRows: SessionRow[] = [...sessions.values()].map((session) => {
    let primary: string | undefined;
    let primaryCount = 0;
    for (const [name, count] of session.models)
      if (
        count > primaryCount ||
        (count === primaryCount && primary !== undefined && name < primary)
      ) {
        primary = name;
        primaryCount = count;
      }
    return {
      key: session.key,
      projectLabel: session.project === NO_PROJECT ? undefined : labelFor(session.project),
      firstMs: session.firstMs,
      lastMs: session.lastMs,
      observedSpanMs: session.lastMs - session.firstMs,
      primaryModel: primary,
      events: session.events,
      tokens: session.tokens,
    };
  });

  // Chronology: every local day between the first and last event, zero-filled,
  // or ISO weeks when the history is long enough that days stop being readable.
  const dates = [...daily.keys()].sort();
  const firstDate = dates[0];
  const lastDate = dates.at(-1);
  const spanDays =
    firstDate === undefined || lastDate === undefined ? 0 : daysBetween(firstDate, lastDate) + 1;
  const unit: "day" | "week" = spanDays > 180 ? "week" : "day";
  const points: WorkloadProfile["chronology"]["points"] = [];
  if (firstDate !== undefined && lastDate !== undefined) {
    if (unit === "day") {
      for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
        const day = daily.get(date);
        points.push({
          date,
          events: day?.events ?? 0,
          tokens: day?.tokens ?? 0,
          unknownUsageEvents: day?.unknown ?? 0,
        });
      }
    } else {
      const weeks = new Map<string, { events: number; tokens: number; unknown: number }>();
      for (const [date, day] of daily) {
        const week = mondayOf(date);
        const entry = weeks.get(week) ?? { events: 0, tokens: 0, unknown: 0 };
        entry.events += day.events;
        entry.tokens += day.tokens;
        entry.unknown += day.unknown;
        weeks.set(week, entry);
      }
      for (let week = mondayOf(firstDate); week <= lastDate; week = addDays(week, 7)) {
        const entry = weeks.get(week);
        points.push({
          date: week,
          events: entry?.events ?? 0,
          tokens: entry?.tokens ?? 0,
          unknownUsageEvents: entry?.unknown ?? 0,
        });
      }
    }
  }

  const activeDayValues = [...daily.entries()].map(([date, day]) => ({ date, ...day }));
  const peakDay = (measure: Measure) => {
    const best = rank(activeDayValues, measure)[0];
    return best === undefined
      ? undefined
      : { date: best.date, events: best.events, tokens: best.tokens };
  };

  const timedAll = prepared.map((item) => item.timed);
  const rolling = (duration: string) => sliceRollingWindows(timedAll, durationToMs(duration));
  const slices = {
    "1h": rolling("PT1H"),
    "3h": rolling("PT3H"),
    "5h": rolling("PT5H"),
    day: sliceCalendarWindows(timedAll, "day", timeZone),
    week: sliceCalendarWindows(timedAll, "week", timeZone),
  } as const;
  const rollingBasis =
    "Opens at the first event after the previous window closes, as Replay applies rolling limits";
  const pressureFor = (measure: Measure): PressureRow[] => [
    pressureRow("1h", "Peak 1 hour", rollingBasis, slices["1h"], byId, total, measure, labelFor),
    pressureRow("3h", "Peak 3 hours", rollingBasis, slices["3h"], byId, total, measure, labelFor),
    pressureRow("5h", "Peak 5 hours", rollingBasis, slices["5h"], byId, total, measure, labelFor),
    pressureRow(
      "day",
      "Peak day",
      `Calendar day in ${timeZone}`,
      slices.day,
      byId,
      total,
      measure,
      labelFor,
    ),
    pressureRow(
      "week",
      "Peak week",
      `Calendar week from Monday, in ${timeZone}`,
      slices.week,
      byId,
      total,
      measure,
      labelFor,
    ),
  ];

  const projectProfiles: ProjectProfile[] = [...projects.entries()].map(([key, project]) => {
    const { label, kind } = projectLabelOf(key, options.projectLabels, anonymous);
    const modelCounts = new Map<string, RankedShare>();
    for (const item of project.events) {
      const entry = modelCounts.get(item.modelKey) ?? {
        key: item.modelKey,
        label: item.modelLabel,
        events: 0,
        tokens: 0,
      };
      entry.events += 1;
      entry.tokens += item.tokens;
      modelCounts.set(item.modelKey, entry);
    }
    const projectTotal = { events: project.events.length, tokens: project.tokens };
    const windows = sliceRollingWindows(
      project.events.map((item) => item.timed),
      durationToMs("PT5H"),
    );
    const heaviestSession = rank(
      sessionRows.filter((session) => project.sessions.has(session.key)),
      "tokens",
    )[0];
    return {
      key,
      label,
      labelKind: kind,
      ...projectTotal,
      sessions: project.sessions.size,
      unknownUsageEvents: project.unknown,
      firstMs: project.events[0]?.timed.atMs ?? 0,
      lastMs: project.events.at(-1)?.timed.atMs ?? 0,
      activeDays: project.daily.size,
      buckets: project.buckets,
      models: rank([...modelCounts.values()], "events"),
      daily: [...project.daily.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, day]) => ({ date, ...day })),
      heaviestSession,
      peak5hByEvents: pressureRow("5h", "", "", windows, byId, projectTotal, "events", labelFor)
        .peak,
      peak5hByTokens: pressureRow("5h", "", "", windows, byId, projectTotal, "tokens", labelFor)
        .peak,
    };
  });

  const activeDays = daily.size;
  const base: Omit<WorkloadProfile, "insights"> = {
    version: PROFILE_VERSION,
    timeZone,
    overview: {
      events: prepared.length,
      sessions: sessions.size,
      projects: [...projects.keys()].filter((key) => key !== NO_PROJECT).length,
      knownTokens: total.tokens,
      knownTokenEvents,
      unknownUsageEvents: prepared.length - knownTokenEvents,
      lowerBoundTokens: lowerBound,
      firstMs: prepared[0]?.timed.atMs,
      lastMs: prepared.at(-1)?.timed.atMs,
      firstDate,
      lastDate,
      spanDays,
      activeDays,
      resolvedEvents: prepared.length - unresolvedEvents,
      unresolvedEvents,
      unresolvedIds: unresolved.size,
      eventsWithoutSession: withoutSession,
      eventsWithoutProject: withoutProject,
    },
    tokens,
    chronology: { unit, points },
    rhythm: {
      events: gridEvents,
      tokens: gridTokens,
      byEvents: rhythmFacts(gridEvents),
      byTokens: rhythmFacts(gridTokens),
    },
    days: {
      activeDays,
      medianEvents: median(activeDayValues.map((day) => day.events)),
      medianTokens: median(activeDayValues.map((day) => day.tokens)),
      peakByEvents: peakDay("events"),
      peakByTokens: peakDay("tokens"),
    },
    pressure: { events: pressureFor("events"), tokens: pressureFor("tokens") },
    topWindows: {
      events: topWindows(slices["5h"], byId, total, "events", labelFor, 5),
      tokens: topWindows(slices["5h"], byId, total, "tokens", labelFor, 5),
    },
    projects: rank(projectProfiles, "tokens"),
    models: {
      canonical: rank([...models.values()], "events"),
      unresolved: rank([...unresolved.values()], "events"),
    },
    sessions: {
      count: sessions.size,
      perActiveDay: activeDays === 0 ? 0 : sessions.size / activeDays,
      medianEvents: median(sessionRows.map((session) => session.events)),
      medianTokens: median(sessionRows.map((session) => session.tokens)),
      top: rank(sessionRows, "tokens").slice(0, 8),
      longestSpan: [...sessionRows].sort(
        (a, b) => b.observedSpanMs - a.observedSpanMs || a.firstMs - b.firstMs,
      )[0],
    },
  };
  return { ...base, insights: insightsFor(base) };
}

/**
 * What recorded demand fell inside one explicit window, for inspecting a peak
 * or a limit crossing. Half-open: [startMs, endMs).
 */
export function inspectWindow(
  events: readonly UsageEventV1[],
  startMs: number,
  endMs: number,
  options: ProfileOptions,
): WindowFact {
  const timeZone = safeTimeZone(options.timeZone);
  const prepared = prepare(events, options, localClock(timeZone));
  const anonymous = new Map<string, number>();
  for (const item of prepared) projectLabelOf(item.project, options.projectLabels, anonymous);
  const inside = prepared.filter((item) => item.timed.atMs >= startMs && item.timed.atMs < endMs);
  const total = prepared.reduce(
    (sum, item) => ({ events: sum.events + 1, tokens: sum.tokens + item.tokens }),
    { events: 0, tokens: 0 },
  );
  return describe(
    inside,
    startMs,
    endMs,
    total,
    "tokens",
    (project) => projectLabelOf(project, options.projectLabels, anonymous).label,
  );
}

export { HOUR_MS };
