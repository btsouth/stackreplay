const MONEY_PATTERN = /^(0|[1-9]\d*)(?:\.(\d+))?$/u;
const SEAT_PATTERN = /^\d+$/u;

// BigInt keeps the arithmetic exact. The digit bound only prevents pathological
// client input from creating an expensive exponent or multiplication.
const MAX_SEAT_INPUT_DIGITS = 30;
const MAX_MONEY_DIGITS = 80;

export type SeatEstimateErrorCode =
  | "blank"
  | "negative"
  | "fractional"
  | "nonnumeric"
  | "too_large"
  | "invalid_money";

export type FullDeveloperSeatEstimate =
  | {
      ok: true;
      seats: string;
      seatsDisplay: string;
      total: string;
      totalDisplay: string;
      zeroSeats: boolean;
    }
  | { ok: false; code: SeatEstimateErrorCode; message: string };

interface DecimalParts {
  whole: string;
  fraction: string;
}

const ERROR_MESSAGES: Record<SeatEstimateErrorCode, string> = {
  blank: "Enter the number of full developer seats.",
  negative: "Seat count cannot be negative.",
  fractional: "Use a whole number of full developer seats.",
  nonnumeric: "Use digits only for the number of full developer seats.",
  too_large: "That seat count is too large to calculate safely.",
  invalid_money: "The published pricing for this estimate is invalid.",
};

function error(code: SeatEstimateErrorCode): FullDeveloperSeatEstimate {
  return { ok: false, code, message: ERROR_MESSAGES[code] };
}

function parseMoney(amount: string): DecimalParts | undefined {
  const match = MONEY_PATTERN.exec(amount);
  if (match === null) return undefined;
  const whole = match[1];
  const fraction = match[2] ?? "";
  if (whole === undefined || whole.length + fraction.length > MAX_MONEY_DIGITS) return undefined;
  return { whole, fraction };
}

function scale(parts: DecimalParts, decimalPlaces: number): bigint {
  const paddedFraction = parts.fraction.padEnd(decimalPlaces, "0");
  return BigInt(parts.whole) * 10n ** BigInt(decimalPlaces) + BigInt(paddedFraction || "0");
}

function decimalString(value: bigint, decimalPlaces: number): string {
  if (decimalPlaces === 0) return value.toString();
  const sign = value < 0n ? "-" : "";
  const digits = (value < 0n ? -value : value).toString().padStart(decimalPlaces + 1, "0");
  const whole = digits.slice(0, -decimalPlaces);
  const fraction = digits.slice(-decimalPlaces);
  return `${sign}${whole}.${fraction}`;
}

function groupedInteger(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
}

function formatDecimalString(value: string): string {
  const [whole = "0", fraction = ""] = value.split(".");
  const trimmed = fraction.replace(/0+$/u, "");
  const shownFraction = trimmed.length === 1 ? `${trimmed}0` : trimmed;
  return `$${groupedInteger(whole)}${shownFraction === "" ? "" : `.${shownFraction}`}`;
}

/** Formats a published decimal amount exactly, without converting it to Number. */
export function formatExactUsd(amount: string): string | undefined {
  const parsed = parseMoney(amount);
  if (parsed === undefined) return undefined;
  return formatDecimalString(
    decimalString(scale(parsed, parsed.fraction.length), parsed.fraction.length),
  );
}

/**
 * Calculates a monthly full-developer-seat scenario from published decimal
 * strings. This is arithmetic on the accepted offer only; it does not admit a
 * provider seat maximum or any purchase, capacity or invoice claim.
 */
export function calculateFullDeveloperSeatMonthlyTotal(
  baseAmount: string,
  seatAmount: string,
  seatInput: string,
): FullDeveloperSeatEstimate {
  const input = seatInput.trim();
  if (input === "") return error("blank");
  if (input.startsWith("-")) return error("negative");
  if (input.includes(".")) return error("fractional");
  if (!SEAT_PATTERN.test(input)) return error("nonnumeric");

  const seatsText = input.replace(/^0+(?=\d)/u, "");
  if (seatsText.length > MAX_SEAT_INPUT_DIGITS) return error("too_large");

  const base = parseMoney(baseAmount);
  const seat = parseMoney(seatAmount);
  if (base === undefined || seat === undefined) return error("invalid_money");

  const seats = BigInt(seatsText);
  const decimalPlaces = Math.max(base.fraction.length, seat.fraction.length);
  const totalUnits = scale(base, decimalPlaces) + seats * scale(seat, decimalPlaces);
  const total = decimalString(totalUnits, decimalPlaces);

  return {
    ok: true,
    seats: seats.toString(),
    seatsDisplay: groupedInteger(seats.toString()),
    total,
    totalDisplay: formatDecimalString(total),
    zeroSeats: seats === 0n,
  };
}
