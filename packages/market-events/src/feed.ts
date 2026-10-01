import type { MarketEvent } from "./schema.js";
import {
  type MarketEventCategory,
  type MarketEventImportance,
  type MarketEventType,
  marketEventCategories,
} from "./taxonomy.js";

export * from "./taxonomy.js";

/**
 * The fields ordering and selection read. Display models built from events
 * carry them too, so the browser can order and filter without the schema.
 */
export type Datable = { id: string; occurredAt: string; importance: MarketEventImportance };

/** The calendar day an event occurred on, as the provider wrote it (an offset instant keeps its local day). */
export const occurredDay = (event: Pick<MarketEvent, "occurredAt">): string =>
  event.occurredAt.slice(0, 10);

const IMPORTANCE_ORDER: Record<MarketEventImportance, number> = { major: 0, notable: 1, minor: 2 };

/**
 * Newest first by when the event actually occurred. Same-day events keep a
 * stable order: a published instant before a bare day, then importance, then
 * id. There is no category ordering anywhere.
 */
export function compareByOccurrence(a: Datable, b: Datable): number {
  const dayA = occurredDay(a);
  const dayB = occurredDay(b);
  if (dayA !== dayB) return dayB.localeCompare(dayA);
  if (a.occurredAt !== b.occurredAt) return b.occurredAt.localeCompare(a.occurredAt);
  return (
    IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance] || a.id.localeCompare(b.id)
  );
}

export function sortByOccurrence<T extends Datable>(events: readonly T[]): T[] {
  return [...events].sort(compareByOccurrence);
}

/** Whole days from `from` to `to` (ISO calendar days or instants; the UTC day counts). */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) /
      86_400_000,
  );
}

export interface BriefingOptions {
  /** Today's calendar day, from the reader's clock. */
  today: string;
  /** Most rows shown. */
  limit?: number;
  /** The hard window, capped at thirty days. */
  maxDays?: number;
}

/** Nothing older than this ever appears in the homepage briefing. */
export const HOMEPAGE_MAX_AGE_DAYS = 30;

/**
 * The homepage briefing: major and notable events, newest first by occurrence.
 * The newest come first, so the last seven days always lead and older events
 * up to thirty days old only fill rows the last week leaves empty. Never
 * older than thirty days, never future-dated, no category quota. Fewer events
 * is a correct answer.
 */
export function homepageBriefing<T extends Datable>(
  events: readonly T[],
  options: BriefingOptions,
): T[] {
  const limit = options.limit ?? 7;
  const maxDays = Math.min(options.maxDays ?? HOMEPAGE_MAX_AGE_DAYS, HOMEPAGE_MAX_AGE_DAYS);
  const age = (event: T) => daysBetween(occurredDay(event), options.today);
  return sortByOccurrence(
    events.filter(
      (event) => event.importance !== "minor" && age(event) >= 0 && age(event) <= maxDays,
    ),
  ).slice(0, limit);
}

/** Events in a filter, newest first. `all` keeps every accepted event. */
export function eventsInCategory<T extends Datable & { type: MarketEventType }>(
  events: readonly T[],
  category: MarketEventCategory | "all",
): T[] {
  return sortByOccurrence(
    category === "all"
      ? events
      : events.filter((event) => marketEventCategories(event.type).includes(category)),
  );
}

/** Consecutive days, newest first, each with its events in feed order. */
export function groupByDay<T extends Datable>(
  events: readonly T[],
): { day: string; events: T[] }[] {
  const groups: { day: string; events: T[] }[] = [];
  for (const event of sortByOccurrence(events)) {
    const day = occurredDay(event);
    const last = groups.at(-1);
    if (last?.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}
