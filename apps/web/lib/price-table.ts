import type { CatalogV1 } from "@stackreplay/catalog";
import type { PriceReceiptV1 } from "@stackreplay/replay-engine";
import { apportionCents, toCents } from "./money-display";

/**
 * A price receipt as the table a reader checks: model, category, tokens,
 * published rate, subtotal and the source the rate came from.
 *
 * The money is the receipt's (the engine's own arithmetic); the catalog is read
 * for names, tier labels and provenance only. Subtotals are apportioned to
 * cents, so the column adds up to the headline exactly.
 */

export const CATEGORY_LABELS: Record<PriceReceiptV1["lines"][number]["category"], string> = {
  input: "Uncached input",
  cacheRead: "Cached input (cache read)",
  cacheWrite: "Cache write",
  output: "Output",
  reasoning: "Reasoning",
};

export interface PriceTableRow {
  key: string;
  modelId: string;
  modelName: string;
  category: PriceReceiptV1["lines"][number]["category"];
  categoryLabel: string;
  /** "billed as output", when the category uses another category's rate. */
  billedAsLabel: string | undefined;
  /** The conditional tier's own label, when a tier priced the line. */
  tierLabel: string | undefined;
  tokens: number;
  ratePerMillion: string;
  /** Plan multiplier; "1" for list prices. */
  multiplier: string;
  exact: string;
  cents: bigint;
  events: number;
}

export interface PriceTableGroup {
  modelId: string;
  modelName: string;
  cents: bigint;
  tokens: number;
  rows: PriceTableRow[];
  pricingId: string;
  source: { url: string; title: string } | undefined;
  effectiveFrom: string | undefined;
  verificationStatus: string | undefined;
}

export interface PriceTable {
  basis: PriceReceiptV1["basis"];
  groups: PriceTableGroup[];
  totalCents: bigint;
  exactTotal: string;
  /** True when any line carries a plan multiplier other than 1. */
  multiplied: boolean;
}

export function priceTableOf(
  receipt: PriceReceiptV1,
  catalog: Pick<CatalogV1, "models" | "pricing">,
): PriceTable {
  const cents = apportionCents(receipt.lines.map((line) => line.subtotal));
  const groups = new Map<string, PriceTableGroup>();
  receipt.lines.forEach((line, index) => {
    const pricing = catalog.pricing[line.pricingId];
    const modelName = catalog.models[line.modelId]?.name ?? line.modelId;
    const tier =
      line.tierId === undefined
        ? undefined
        : pricing?.tiers?.find((entry) => entry.id === line.tierId);
    const row: PriceTableRow = {
      key: `${line.modelId}:${line.pricingId}:${line.tierId ?? "base"}:${line.category}:${line.multiplier}:${line.ratePerMillion}`,
      modelId: line.modelId,
      modelName,
      category: line.category,
      categoryLabel: CATEGORY_LABELS[line.category],
      billedAsLabel:
        line.billedAs === undefined
          ? undefined
          : `billed as ${CATEGORY_LABELS[line.billedAs].toLowerCase()}`,
      tierLabel: tier?.label ?? (line.tierId === undefined ? undefined : line.tierId),
      tokens: line.tokens,
      ratePerMillion: line.ratePerMillion,
      multiplier: line.multiplier,
      exact: line.subtotal,
      cents: cents[index] ?? 0n,
      events: line.events,
    };
    const groupKey = `${line.modelId}\u0000${line.pricingId}`;
    const group = groups.get(groupKey) ?? {
      modelId: line.modelId,
      modelName,
      cents: 0n,
      tokens: 0,
      rows: [],
      pricingId: line.pricingId,
      source:
        pricing?.sources[0] === undefined
          ? undefined
          : { url: pricing.sources[0].url, title: pricing.sources[0].title },
      effectiveFrom: pricing?.effectiveFrom,
      verificationStatus: pricing?.verificationStatus,
    };
    group.rows.push(row);
    group.cents += row.cents;
    group.tokens += row.tokens;
    groups.set(groupKey, group);
  });
  const ordered = [...groups.values()].sort(
    (a, b) =>
      (b.cents > a.cents ? 1 : b.cents < a.cents ? -1 : 0) || (a.modelName < b.modelName ? -1 : 1),
  );
  return {
    basis: receipt.basis,
    groups: ordered,
    totalCents: toCents(receipt.total),
    exactTotal: receipt.total,
    multiplied: receipt.lines.some((line) => line.multiplier !== "1"),
  };
}

/** "$4.00", "$0.40", "$0.075": a published per-million rate, as published. */
export function formatRate(ratePerMillion: string): string {
  const [whole = "0", fraction = ""] = ratePerMillion.split(".");
  const trimmed = fraction.replace(/0+$/u, "");
  const shown = trimmed.length < 2 ? trimmed.padEnd(2, "0") : trimmed;
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ",")}.${shown}`;
}
