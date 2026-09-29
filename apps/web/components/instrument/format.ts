/**
 * Display formatting for the Replay Instrument.
 *
 * Two rules run through every helper here, and they are the reason it is a
 * module rather than inline template strings:
 *
 * 1. A missing quantity is never rendered as a number. Every formatter takes
 *    `undefined` and returns `undefined` for it, so a component has to decide
 *    what to say about an unknown instead of printing a zero or a dash that
 *    reads as one.
 * 2. A rounded figure keeps its exact value available as the element's title,
 *    because a counterfactual cost printed as `$48.76` is a display decision,
 *    not a claim that the engine computed two decimals.
 */

import { formatUsd } from "@/lib/money-display";

const NUMBER = new Intl.NumberFormat("en-US");

export function formatCount(value: number | undefined): string | undefined {
  return value === undefined ? undefined : NUMBER.format(value);
}

/** Compact magnitude for a dense ledger cell; the exact value stays in `title`. */
export function formatTokens(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value < 1_000) return NUMBER.format(value);
  if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}K`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return `${(value / 1_000_000_000).toFixed(2)}B`;
}

export function formatExactTokens(value: number | undefined): string | undefined {
  return value === undefined ? undefined : `${NUMBER.format(value)} tokens`;
}

export function formatPercent(value: number | undefined, digits = 1): string | undefined {
  return value === undefined ? undefined : `${value.toFixed(digits)}%`;
}

/**
 * How a metered total reads. The observed window is the only period this
 * workload covers, so a cost is never described as a month's cost just because
 * the plan is priced per month.
 */
export function listPriceWindowLabel(windowDays: number | undefined): string {
  return windowDays === undefined
    ? "list price for this workload"
    : `${NUMBER.format(windowDays)} days at list price`;
}

/**
 * Money from a decimal string. The engine carries amounts as strings to keep
 * precision; an interface shows two decimals and keeps the full value in the
 * title so nobody has to guess which one is rounded.
 */
/** Two decimals with thousands separators: "$1,891.79", never "$1891.79". */
const MONEY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: string | undefined, currency = "USD"): string | undefined {
  if (amount === undefined) return undefined;
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed)) return undefined;
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${MONEY.format(parsed)}`;
}

export function formatUnit(
  value: string | number | undefined,
  unit: "tokens" | "requests" | "usd" | string,
): string | undefined {
  if (value === undefined) return undefined;
  switch (unit) {
    case "usd":
      return formatUsd(String(value));
    case "requests": {
      const parsed = Number.parseFloat(String(value));
      if (!Number.isFinite(parsed)) return undefined;
      return NUMBER.format(parsed);
    }
    default: {
      const parsed = Number.parseFloat(String(value));
      if (!Number.isFinite(parsed)) return undefined;
      return formatTokens(parsed);
    }
  }
}

export function unitNoun(unit: "tokens" | "requests" | "usd" | string): string {
  switch (unit) {
    case "usd":
      return "credit";
    case "requests":
      return "requests";
    default:
      return "tokens";
  }
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** A stable instant for the demonstration surfaces: the artifact's own `rulesAsOf`. */
export function formatDay(iso: string | undefined): string | undefined {
  if (iso === undefined) return undefined;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? undefined : DATE.format(parsed);
}

export function formatInstant(iso: string | undefined): string | undefined {
  if (iso === undefined) return undefined;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? undefined : `${DATE_TIME.format(parsed)}Z`;
}

export function formatWindow(from: string | undefined, to: string | undefined): string | undefined {
  const start = formatDay(from);
  const end = formatDay(to);
  if (start === undefined || end === undefined) return undefined;
  return `${start} to ${end}`;
}

/** `5-hour request window` etc. stay as the engine words them; this only tidies ids. */
export function humanizeCode(code: string): string {
  return code
    .split(/[_-]/u)
    .filter((part) => part.length > 0)
    .map((part, index) => (index === 0 ? part : part.toLowerCase()))
    .join(" ");
}
