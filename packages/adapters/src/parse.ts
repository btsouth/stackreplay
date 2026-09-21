/**
 * Small, defensive readers for untrusted local files.
 *
 * Every value an adapter reads from disk is treated as unknown until it has
 * been checked. Nothing is coerced: a token count that is not a finite
 * non-negative integer is absent, never zero, and a missing field stays
 * missing (docs/ARCHITECTURE_DECISIONS.md, decision 15).
 */

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

export function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Token counts and request counts: finite, non-negative, integral. */
export function readCount(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (!Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export function readPath(record: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = record;
  for (const segment of path) {
    const asObj = asRecord(current);
    if (asObj === undefined) return undefined;
    current = asObj[segment];
  }
  return current;
}

export function readNestedCount(
  record: Record<string, unknown>,
  path: readonly string[],
): number | undefined {
  const value = readPath(record, path);
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (!Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export function readNestedString(
  record: Record<string, unknown>,
  path: readonly string[],
): string | undefined {
  const value = readPath(record, path);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Parses one JSON line; malformed lines are reported, never guessed at. */
export function parseJsonLine(line: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(line) };
  } catch {
    return { ok: false };
  }
}

/**
 * Whether a `YYYY-MM-DD` prefix is a real calendar date.
 *
 * `Date.parse` rolls impossible dates over instead of rejecting them
 * (`2026-02-30` becomes 2 March), which would silently move a record or a
 * filter boundary. Sources and user-supplied bounds are checked with this
 * first, so an impossible date is treated as malformed rather than admitted as
 * a plausible-looking instant (decision 11).
 */
export function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(value);
  if (match === null) return true;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/** Deterministic ordering for strings, used to keep output stable. */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
