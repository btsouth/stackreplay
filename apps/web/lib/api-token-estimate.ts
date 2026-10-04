const RATE_PATTERN = /^(0|[1-9]\d*)(?:\.(\d+))?$/u;
export const MAX_TOKEN_DIGITS = 30;

type TokenError = "blank" | "negative" | "fractional" | "nonnumeric" | "too_large";
export type TokenCount =
  | { ok: true; value: string }
  | { ok: false; code: TokenError; message: string };

export interface ApiTokenEstimateRate {
  inputRatePerMillion: string;
  outputRatePerMillion: string;
}

/** Match the accepted decimal envelope without loading a schema or pricing engine in the client. */
export function parseTokenRate(value: string): { units: bigint; places: number } | undefined {
  if (value.length > 48) return undefined;
  const match = RATE_PATTERN.exec(value);
  if (!match) return undefined;
  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  const significant = `${whole}${fraction}`.replace(/^0+/u, "");
  if (fraction.length > 18 || significant.length > 28) return undefined;
  return { units: BigInt(`${whole}${fraction}`), places: fraction.length };
}

export function parseTokenCount(value: string): TokenCount {
  const input = value.trim();
  const fail = (code: TokenError, message: string): TokenCount => ({ ok: false, code, message });
  if (input === "") return fail("blank", "Enter a token count.");
  if (input.startsWith("-")) return fail("negative", "Token count cannot be negative.");
  if (input.includes(".")) return fail("fractional", "Use a whole number of tokens.");
  if (!/^\d+$/u.test(input)) return fail("nonnumeric", "Use digits only for the token count.");
  if (input.length > MAX_TOKEN_DIGITS)
    return fail("too_large", `Use at most ${MAX_TOKEN_DIGITS} digits.`);
  return { ok: true, value: BigInt(input).toString() };
}

function decimalString(units: bigint, places: number): string {
  const digits = units.toString().padStart(places + 1, "0");
  const whole = digits.slice(0, -places);
  const fraction = digits.slice(-places).replace(/0+$/u, "").padEnd(2, "0");
  return `${whole}.${fraction}`;
}

/** At least cents, retaining every subcent digit. Never converts money to Number. */
export function formatTokenEstimateUsd(value: string): string {
  const [whole = "0", fraction = ""] = value.split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ",")}.${fraction.replace(/0+$/u, "").padEnd(2, "0")}`;
}

export type ApiTokenCalculation =
  | { ok: false; input: TokenCount; output: TokenCount; invalidRates: boolean }
  | {
      ok: true;
      inputCost: string;
      outputCost: string;
      total: string;
      inputShare: string;
      outputShare: string;
    };

/** Exact aggregate scenario: tokens × published decimal rate / 1,000,000. */
export function calculateApiTokenEstimate(
  rate: ApiTokenEstimateRate,
  inputText: string,
  outputText: string,
): ApiTokenCalculation {
  const input = parseTokenCount(inputText);
  const output = parseTokenCount(outputText);
  const inputRate = parseTokenRate(rate.inputRatePerMillion);
  const outputRate = parseTokenRate(rate.outputRatePerMillion);
  if (!input.ok || !output.ok || !inputRate || !outputRate) {
    return { ok: false, input, output, invalidRates: !inputRate || !outputRate };
  }
  const places = Math.max(inputRate.places, outputRate.places);
  const inputUnits =
    BigInt(input.value) * inputRate.units * 10n ** BigInt(places - inputRate.places);
  const outputUnits =
    BigInt(output.value) * outputRate.units * 10n ** BigInt(places - outputRate.places);
  const totalUnits = inputUnits + outputUnits;
  // The visual shares alone are rounded to basis points; currency stays exact.
  const inputBasisPoints = totalUnits === 0n ? 0n : (inputUnits * 10000n) / totalUnits;
  const outputBasisPoints = totalUnits === 0n ? 0n : 10000n - inputBasisPoints;
  const share = (points: bigint) =>
    `${points / 100n}.${(points % 100n).toString().padStart(2, "0")}%`;
  return {
    ok: true,
    inputCost: decimalString(inputUnits, places + 6),
    outputCost: decimalString(outputUnits, places + 6),
    total: decimalString(totalUnits, places + 6),
    inputShare: share(inputBasisPoints),
    outputShare: share(outputBasisPoints),
  };
}
