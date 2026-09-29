import { z } from "zod";
import { computedMoneyV1Schema } from "./money.js";
import { computedDecimalV1Schema } from "./scalars.js";

/**
 * The parts a cost is made of, for targets whose bill is not only tokens.
 *
 * A managed agent run (OpenAI's Agents API, for example) can bill model
 * inference, tool calls, hosted compute such as containers, and other metered
 * items separately. A Direct API token replay has one part, model inference,
 * and does not need a breakdown at all: the breakdown is optional, and a
 * component nobody measured is absent rather than zero.
 *
 * Nothing in the catalog prices tools or hosted compute yet, so no replay emits
 * these components today. The shape exists so a later importer or target can
 * carry them without redefining the result.
 */
export const costComponentKindV1Schema = z.enum([
  "model_inference",
  "tool",
  "hosted_compute",
  "other",
]);
export type CostComponentKindV1 = z.infer<typeof costComponentKindV1Schema>;

export const costComponentV1Schema = z.strictObject({
  kind: costComponentKindV1Schema,
  /** A short name for the part, e.g. "Web search" or "Container sessions". */
  label: z.string().min(1),
  amount: computedMoneyV1Schema,
  /** The catalog pricing record or rate the amount came from, when one did. */
  pricingRef: z.string().min(1).optional(),
});
export type CostComponentV1 = z.infer<typeof costComponentV1Schema>;

export const costBreakdownV1Schema = z.array(costComponentV1Schema).min(1);
export type CostBreakdownV1 = z.infer<typeof costBreakdownV1Schema>;

/** Exact sum of non-negative decimal strings, or undefined for a malformed value. */
export function decimalTotalOf(values: readonly string[]): string | undefined {
  if (!values.every((value) => computedDecimalV1Schema.safeParse(value).success)) return undefined;
  const parts = values.map((value) => {
    const [whole = "0", fraction = ""] = value.split(".");
    return { coefficient: BigInt(whole + fraction), scale: fraction.length };
  });
  const scale = Math.max(0, ...parts.map((part) => part.scale));
  const total = parts.reduce(
    (sum, part) => sum + part.coefficient * 10n ** BigInt(scale - part.scale),
    0n,
  );
  if (scale === 0) return total.toString();
  const digits = total.toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, -scale);
  const fraction = digits.slice(-scale).replace(/0+$/, "");
  return fraction.length === 0 ? whole : `${whole}.${fraction}`;
}

/** Whether the components add up to `total` exactly. */
export function costBreakdownMatches(breakdown: CostBreakdownV1, total: string): boolean {
  const sum = decimalTotalOf(breakdown.map((component) => component.amount.amount));
  const expected = decimalTotalOf([total]);
  return sum !== undefined && expected !== undefined && sum === expected;
}

/**
 * The components worth showing. A zero-amount component says nothing a reader
 * needs ("Hosted compute: $0" on a token replay is noise), and a breakdown with
 * a single inference component is the plain token cost the surface already
 * shows, so both collapse to nothing.
 */
export function visibleCostComponents(
  breakdown: CostBreakdownV1 | undefined,
): readonly CostComponentV1[] {
  if (breakdown === undefined) return [];
  const nonZero = breakdown.filter((component) => /[1-9]/.test(component.amount.amount));
  if (nonZero.length === 1 && nonZero[0]?.kind === "model_inference") return [];
  return nonZero;
}
