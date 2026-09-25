/**
 * Money for display. The engine keeps exact decimal strings; a person reads
 * cents. Two rules hold here:
 *
 * - A figure is formatted from its exact decimal string, never through a
 *   JavaScript float, so "$9,812.82" is the exact value rounded half-up once.
 * - A table of rounded rows adds up to its rounded total. Rounding each row on
 *   its own can leave the column a cent away from the total printed under it,
 *   which is exactly the discrepancy a careful reader checks for, so rows are
 *   apportioned by largest remainder: each row stays within one cent of its
 *   exact value, and the column sums to the total.
 *
 * The arithmetic is BigInt over the decimal digits, so this module has no
 * dependency and can be used on any page, including the homepage.
 */

interface Scaled {
  /** The value times 10^scale, as an integer. */
  units: bigint;
  scale: number;
}

function parseDecimal(amount: string): Scaled {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(amount.trim());
  if (match === null) throw new Error(`not a decimal amount: ${amount}`);
  const [, sign = "", whole = "0", fraction = ""] = match;
  const units = BigInt(`${whole}${fraction}`) * (sign === "-" ? -1n : 1n);
  return { units, scale: fraction.length };
}

function rescale(value: Scaled, scale: number): bigint {
  return value.units * 10n ** BigInt(scale - value.scale);
}

/** Integer division rounding half away from zero. */
function divideHalfUp(numerator: bigint, divisor: bigint): bigint {
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const quotient = magnitude / divisor;
  const remainder = magnitude % divisor;
  const rounded = remainder * 2n >= divisor ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

/** An exact decimal string rounded half-up to whole cents, as an integer count. */
export function toCents(amount: string): bigint {
  const value = parseDecimal(amount);
  if (value.scale <= 2) return rescale(value, 2);
  return divideHalfUp(value.units, 10n ** BigInt(value.scale - 2));
}

function group(whole: bigint): string {
  return whole.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
}

/** "$1,234.56" from a whole number of cents. */
export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}$${group(absolute / 100n)}.${fraction}`;
}

/** An exact decimal amount, displayed in dollars and cents. */
export function formatUsd(amount: string | undefined): string | undefined {
  if (amount === undefined) return undefined;
  try {
    return formatCents(toCents(amount));
  } catch {
    return undefined;
  }
}

/** Whole dollars for headline sentences ("about $9,673"), rounded half-up. */
export function formatUsdWhole(amount: string | undefined): string | undefined {
  if (amount === undefined) return undefined;
  try {
    const cents = toCents(amount);
    const dollars = divideHalfUp(cents, 100n);
    return `${dollars < 0n ? "-" : ""}$${group(dollars < 0n ? -dollars : dollars)}`;
  } catch {
    return undefined;
  }
}

/**
 * Rounds each exact amount to cents so that the rounded amounts add up to the
 * rounded total of the exact amounts. Returns cents per input, in input order.
 * Amounts are non-negative (subtotals of published rates).
 */
export function apportionCents(amounts: readonly string[]): bigint[] {
  if (amounts.length === 0) return [];
  const parsed = amounts.map(parseDecimal);
  const scale = Math.max(2, ...parsed.map((value) => value.scale));
  const perCent = 10n ** BigInt(scale - 2);
  const units = parsed.map((value) => rescale(value, scale));
  const total = units.reduce((sum, value) => sum + value, 0n);
  const target = divideHalfUp(total, perCent);
  const floors = units.map((value) => value / perCent);
  let remaining = target - floors.reduce((sum, value) => sum + value, 0n);
  const order = units
    .map((value, index) => ({ index, remainder: value % perCent }))
    .sort((a, b) =>
      b.remainder > a.remainder ? 1 : b.remainder < a.remainder ? -1 : a.index - b.index,
    );
  const result = [...floors];
  for (const entry of order) {
    if (remaining <= 0n) break;
    result[entry.index] = (result[entry.index] ?? 0n) + 1n;
    remaining -= 1n;
  }
  return result;
}

/** True when an exact decimal amount is greater than zero. */
export function isPositiveAmount(amount: string | undefined): boolean {
  if (amount === undefined) return false;
  try {
    return parseDecimal(amount).units > 0n;
  } catch {
    return false;
  }
}

/** An exact decimal string from an integer count of 10^-scale units, without trailing zeros. */
function toDecimal(units: bigint, scale: number): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = scale === 0 ? "" : digits.slice(digits.length - scale).replace(/0+$/u, "");
  return `${negative ? "-" : ""}${whole}${fraction === "" ? "" : `.${fraction}`}`;
}

/** The exact sum of decimal amounts, as a decimal string. Never through a float. */
export function addAmounts(amounts: readonly string[]): string {
  if (amounts.length === 0) return "0";
  const parsed = amounts.map(parseDecimal);
  const scale = Math.max(...parsed.map((value) => value.scale));
  return toDecimal(
    parsed.reduce((sum, value) => sum + rescale(value, scale), 0n),
    scale,
  );
}

/**
 * A plan price pro-rated to a number of days, in whole cents, rounded once:
 * price × days × 12 / 365 for a monthly price, price × days / 365 for a yearly
 * one. Nothing is extrapolated beyond the days given.
 */
export function prorateCents(amount: string, interval: string, days: number): bigint | undefined {
  if (!Number.isInteger(days) || days < 0) return undefined;
  const perYear = interval === "month" ? 12n : interval === "year" ? 1n : undefined;
  if (perYear === undefined) return undefined;
  try {
    return divideHalfUp(toCents(amount) * BigInt(days) * perYear, 365n);
  } catch {
    return undefined;
  }
}
