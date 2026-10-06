const NUMBER = new Intl.NumberFormat("en-US");

export function count(value: number): string {
  return NUMBER.format(value);
}

/** Compact magnitude: a missing quantity is never rendered as a number. */
export function formatTokens(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value < 1_000) return NUMBER.format(value);
  if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}K`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return `${(value / 1_000_000_000).toFixed(2)}B`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-09-18` -> `Sep 18`. Local dates are plain calendar dates, never shifted. */
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
