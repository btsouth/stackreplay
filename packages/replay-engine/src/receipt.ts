import { Decimal, ONE, parseAmount, toUnitString, ZERO } from "./money.js";
import type { MoneyConversionPart, PricingCategory } from "./units.js";

/**
 * Price receipts: the model × category arithmetic behind an engine dollar
 * figure.
 *
 * A receipt is collected inside the replay loop from the same per-event
 * conversion that produced the engine's own total (`moneyUnitsForUsage` with
 * its parts), and only for the events the engine counted. It is therefore the
 * same arithmetic, grouped, and not a second pricing pass over aggregated
 * buckets (decision 45): its exact total equals the engine's figure by
 * construction, and `receipt.test.ts` holds it to that.
 *
 * Every line is tokens × a published per-million rate × a multiplier. Integer
 * token counts times an exact decimal rate sum without loss, so the sum of the
 * lines' exact subtotals is the engine's exact total, digit for digit.
 */

export interface PriceReceiptLineV1 {
  /** The model the price belongs to: the substitute, under a translation. */
  modelId: string;
  /** The catalog pricing record in force for it. */
  pricingId: string;
  /** The conditional tier that applied, when one did. */
  tierId?: string;
  category: PricingCategory;
  /** Present when the category is priced at another category's documented rate. */
  billedAs?: PricingCategory;
  /** A plan's model multiplier for credit demand; "1" for list prices. */
  multiplier: string;
  tokens: number;
  /** The published amount per million tokens. */
  ratePerMillion: string;
  /** Exact: tokens × rate / 1,000,000 × multiplier, never rounded. */
  subtotal: string;
  /** Events that contributed tokens to this line. */
  events: number;
}

export interface PriceReceiptV1 {
  /**
   * `api_list_price`: a Direct API target's list price for the replayed demand.
   * `credit_demand`: a plan's credit-pool demand, priced at the plan's own
   * pricing references before any allowance was applied.
   */
  basis: "api_list_price" | "credit_demand";
  lines: readonly PriceReceiptLineV1[];
  /** Exact sum of the lines. */
  total: string;
  /** Events whose price is in the lines. */
  pricedEvents: number;
  /**
   * The same demand with every cache-read token billed at its rate set's own
   * published uncached input rate. Present only when every priced cache-read
   * bucket has a published input rate beside it; a missing rate is never
   * borrowed from another rate set.
   */
  cacheReadsAtInputRate?: string;
  /** Cache-read tokens in the lines. */
  cacheReadTokens: number;
}

interface LineAccumulator {
  modelId: string;
  pricingId: string;
  tierId: string | undefined;
  category: PricingCategory;
  billedAs: PricingCategory | undefined;
  multiplier: string;
  ratePerMillion: string;
  inputRatePerMillion: string | undefined;
  tokens: number;
  events: number;
}

const CATEGORY_ORDER: Record<PricingCategory, number> = {
  input: 0,
  cacheRead: 1,
  cacheWrite: 2,
  output: 3,
  reasoning: 4,
};

const PER_MILLION = 1_000_000;

/** Groups priced parts by model, record, tier, category, rate and multiplier. */
export class PriceReceiptBuilder {
  private readonly lines = new Map<string, LineAccumulator>();
  private priced = 0;
  private cacheInputGap = false;

  constructor(private readonly basis: PriceReceiptV1["basis"]) {}

  /**
   * Records one counted event. Callers pass exactly the parts of the events the
   * engine added to its own total, so nothing uncounted enters the receipt.
   */
  add(input: {
    modelId: string;
    pricingId: string;
    tierId: string | undefined;
    multiplier: Decimal | undefined;
    parts: readonly MoneyConversionPart[];
  }): void {
    this.priced += 1;
    const multiplier = input.multiplier === undefined ? "1" : toUnitString(input.multiplier);
    for (const part of input.parts) {
      const key = `${input.modelId}\u0000${input.pricingId}\u0000${input.tierId ?? ""}\u0000${part.category}\u0000${part.ratePerMillion}\u0000${multiplier}`;
      const line = this.lines.get(key) ?? {
        modelId: input.modelId,
        pricingId: input.pricingId,
        tierId: input.tierId,
        category: part.category,
        billedAs: part.billedAs,
        multiplier,
        ratePerMillion: part.ratePerMillion,
        inputRatePerMillion: part.inputRatePerMillion,
        tokens: 0,
        events: 0,
      };
      line.tokens += part.tokens;
      line.events += 1;
      if (part.category === "cacheRead" && part.inputRatePerMillion === undefined)
        this.cacheInputGap = true;
      this.lines.set(key, line);
    }
  }

  build(): PriceReceiptV1 {
    let total = ZERO;
    let cacheCounterfactual = ZERO;
    let cacheReadTokens = 0;
    const lines: PriceReceiptLineV1[] = [];
    for (const line of this.lines.values()) {
      const multiplier = line.multiplier === "1" ? ONE : parseAmount(line.multiplier);
      const subtotal = new Decimal(line.tokens)
        .times(parseAmount(line.ratePerMillion))
        .div(PER_MILLION)
        .times(multiplier);
      total = total.plus(subtotal);
      if (line.category === "cacheRead") {
        cacheReadTokens += line.tokens;
        cacheCounterfactual = cacheCounterfactual.plus(
          line.inputRatePerMillion === undefined
            ? ZERO
            : new Decimal(line.tokens)
                .times(parseAmount(line.inputRatePerMillion))
                .div(PER_MILLION)
                .times(multiplier),
        );
      } else {
        cacheCounterfactual = cacheCounterfactual.plus(subtotal);
      }
      lines.push({
        modelId: line.modelId,
        pricingId: line.pricingId,
        ...(line.tierId !== undefined ? { tierId: line.tierId } : {}),
        category: line.category,
        ...(line.billedAs !== undefined ? { billedAs: line.billedAs } : {}),
        multiplier: line.multiplier,
        tokens: line.tokens,
        ratePerMillion: line.ratePerMillion,
        subtotal: toUnitString(subtotal),
        events: line.events,
      });
    }
    lines.sort(
      (a, b) =>
        (a.modelId < b.modelId ? -1 : a.modelId > b.modelId ? 1 : 0) ||
        ((a.tierId ?? "") < (b.tierId ?? "") ? -1 : (a.tierId ?? "") > (b.tierId ?? "") ? 1 : 0) ||
        CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
        (a.multiplier < b.multiplier ? -1 : a.multiplier > b.multiplier ? 1 : 0),
    );
    return {
      basis: this.basis,
      lines,
      total: toUnitString(total),
      pricedEvents: this.priced,
      cacheReadTokens,
      ...(this.cacheInputGap || cacheReadTokens === 0
        ? {}
        : { cacheReadsAtInputRate: toUnitString(cacheCounterfactual) }),
    };
  }
}
