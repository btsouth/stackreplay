import { formatTokens } from "@/components/instrument/format";
import type { Demand, Measure } from "@/lib/workload-profile";

/**
 * Display helpers for the workload profile. Local dates arrive as
 * `YYYY-MM-DD` already read in the profile's timezone, so they are formatted
 * as plain calendar dates, never shifted again.
 */

const NUMBER = new Intl.NumberFormat("en-US");

export function count(value: number): string {
  return NUMBER.format(value);
}

/** One decimal, so 97.6% and 2.4% read as the figures they are. */
export function percent(share: number): string {
  if (!Number.isFinite(share)) return "0%";
  const value = share * 100;
  if (value > 0 && value < 0.1) return "<0.1%";
  return `${value.toFixed(1)}%`;
}

export function measureValue(demand: Demand, measure: Measure): number {
  return measure === "events" ? demand.events : demand.tokens;
}

/** A measure's value with its unit, compact for tokens. */
export function measureText(demand: Demand, measure: Measure): string {
  return measure === "events"
    ? `${count(demand.events)} ${demand.events === 1 ? "event" : "events"}`
    : `${formatTokens(demand.tokens) ?? "0"} tokens`;
}

export function measureNoun(measure: Measure): string {
  return measure === "events" ? "events" : "known tokens";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-09-18` -> `Sep 18`. */
export function plainDay(date: string, withYear = false): string {
  const [year, month, day] = date.split("-");
  const label = `${MONTHS[Number(month) - 1] ?? month} ${Number(day)}`;
  return withYear ? `${label}, ${year}` : label;
}

export function plainRange(first: string | undefined, last: string | undefined): string {
  if (first === undefined || last === undefined) return "no recorded dates";
  const sameYear = first.slice(0, 4) === last.slice(0, 4);
  if (first === last) return plainDay(first, true);
  return `${plainDay(first, !sameYear)} to ${plainDay(last, true)}`;
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayShort(index: number): string {
  return WEEKDAY_SHORT[index] ?? "";
}

export function hourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "12 AM";
  if (normalized === 12) return "12 PM";
  return normalized < 12 ? `${normalized} AM` : `${normalized - 12} PM`;
}

/** An instant read in the profile's timezone, e.g. `Sep 23, 4:42 PM`. */
export function instant(ms: number, timeZone: string, withDate = true): string {
  return new Intl.DateTimeFormat("en-US", {
    ...(withDate ? { month: "short", day: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(ms));
}

/** A half-open window, read in the profile's timezone. */
export function windowText(startMs: number, endMs: number, timeZone: string): string {
  const startDay = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(startMs));
  const endDay = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(endMs - 1));
  return startDay === endDay
    ? `${instant(startMs, timeZone)} to ${instant(endMs, timeZone, false)}`
    : `${instant(startMs, timeZone)} to ${instant(endMs, timeZone)}`;
}

export function spanText(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = ms / 3_600_000;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function ratio(value: number, base: number): string | undefined {
  if (base <= 0 || value <= 0) return undefined;
  const multiple = value / base;
  return `${multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)}×`;
}

/** Money from an engine decimal string, with separators: `$1,852.79`. Display only. */
export function money(amount: string | undefined): string | undefined {
  if (amount === undefined) return undefined;
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value)) return undefined;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** An instant with its zone abbreviation, so a reader knows which clock it is. */
export function instantWithZone(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(ms));
}

/** An hour boundary as prose: midnight and noon read as words. */
export function hourBoundary(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "midnight";
  if (normalized === 12) return "noon";
  return hourLabel(normalized);
}
