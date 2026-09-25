import type { CatalogV1, ModelIdentityIndex } from "@stackreplay/catalog";
import { bundledPublicApiProviders } from "@stackreplay/catalog/bundled";
import {
  type PriceReceiptV1,
  replayWithReceipt,
  tokenAccountingOf,
} from "@stackreplay/replay-engine";
import type { UsageEventV1 } from "@stackreplay/schema";
import { addAmounts } from "@stackreplay/share";
import { modelIdResolver } from "./workload-scope";

/**
 * What a workload is worth at published API list prices (decision 60).
 *
 * A mixed history is never forced through one provider: each model maker's
 * calls are priced at that maker's own published API rates (OpenAI calls at
 * OpenAI's, Claude calls at Anthropic's), each by an Exact Direct API replay of
 * its own scope. Only slices the engine prices completely are added up; a
 * maker's slice that does not price completely falls back to one replay per
 * model, and whatever still does not price is counted and named, never
 * estimated. Unresolved calls are left out and counted.
 *
 * It is a list-price equivalent of the recorded demand, not a bill: every
 * surface that shows the total says "Not what you paid" beside it.
 */

export interface PricedSlice {
  /** The model maker, whose first-party API prices the slice. */
  makerId: string;
  makerName: string;
  calls: number;
  /** Exact decimal: the maker's own published rates over these calls. */
  amount: string;
  receipt?: PriceReceiptV1 | undefined;
}

export interface ExcludedSlice {
  /** Models, by display name. */
  models: string[];
  calls: number;
  /**
   * `undocumented-category`: the calls used a token category (a cache write,
   * say) the maker's price record gives no rate for. `no-rate`: the maker's
   * API has no list price in force for the model at the rules date.
   * `no-maker`: the catalog records no maker for the model, so there are no
   * "own" rates to apply.
   */
  reason: "undocumented-category" | "no-rate" | "no-maker";
  makerName?: string | undefined;
}

export interface WorkloadValue {
  rulesAsOf: string;
  recordedCalls: number;
  pricedCalls: number;
  /**
   * Known processed tokens across every recorded call, and in the priced calls.
   * Calls without complete token counts add nothing to either side. A scope
   * and materiality measure: tokens are priced at different rates, so this is
   * never a share of dollars.
   */
  knownTokens: { total: number; priced: number };
  /** Exact sum of every priced slice; absent when nothing prices. */
  total?: string | undefined;
  /**
   * The same priced calls with every cache-read token billed at its model's
   * own published input rate. Present only when every priced slice has it.
   */
  cacheReadsAtInputRate?: string | undefined;
  /** Priced slices, largest amount first. */
  priced: PricedSlice[];
  excluded: ExcludedSlice[];
  /** Calls whose model identity does not resolve. */
  unresolvedCalls: number;
}

function amountOrder(a: string, b: string): number {
  // Exact comparison of two decimal strings through their difference.
  const difference = addAmounts([a, b.startsWith("-") ? b.slice(1) : `-${b}`]);
  return difference.startsWith("-") ? -1 : difference === "0" ? 0 : 1;
}

export function workloadValue(
  events: readonly UsageEventV1[],
  options: { catalog: CatalogV1; identity: ModelIdentityIndex; rulesAsOf: string },
): WorkloadValue {
  const { catalog, rulesAsOf } = options;
  const modelIdOf = modelIdResolver(options.identity);
  const apis = new Set(bundledPublicApiProviders(rulesAsOf).map((provider) => provider.id));
  const byMaker = new Map<string, Map<string, UsageEventV1[]>>();
  const noMaker = new Map<string, number>();
  let unresolvedCalls = 0;
  for (const event of events) {
    const modelId = modelIdOf(event);
    if (modelId === undefined) {
      unresolvedCalls += 1;
      continue;
    }
    const maker = catalog.models[modelId]?.developerId;
    if (maker === undefined || !apis.has(maker)) {
      noMaker.set(modelId, (noMaker.get(modelId) ?? 0) + 1);
      continue;
    }
    const models = byMaker.get(maker) ?? new Map<string, UsageEventV1[]>();
    const list = models.get(modelId) ?? [];
    list.push(event);
    models.set(modelId, list);
    byMaker.set(maker, models);
  }

  const tokensOf = (event: UsageEventV1) => {
    const accounting = tokenAccountingOf(event.usage);
    return accounting.known ? accounting.total : 0;
  };
  const tokensIn = (list: readonly UsageEventV1[]) =>
    list.reduce((sum, event) => sum + tokensOf(event), 0);
  let pricedTokens = 0;
  const priced: PricedSlice[] = [];
  const excluded: ExcludedSlice[] = [];
  const nameOf = (modelId: string) => catalog.models[modelId]?.name ?? modelId;
  const replayed = (slice: readonly UsageEventV1[], maker: string) =>
    replayWithReceipt({
      events: slice,
      target: { type: "api", providerId: maker },
      catalog,
      context: { rulesAsOf },
    });

  for (const [maker, models] of [...byMaker.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const makerName = (catalog.providers[maker]?.name ?? maker).replace(/\s*\([^)]*\)\s*$/u, "");
    const all = [...models.values()].flat();
    const whole = replayed(all, maker);
    if (whole.result.economics !== undefined) {
      pricedTokens += tokensIn(all);
      priced.push({
        makerId: maker,
        makerName,
        calls: all.length,
        amount: whole.result.economics.targetCost.amount,
        receipt: whole.receipt,
      });
      continue;
    }
    // Not every model of this maker prices: each model is its own complete
    // scope, and the ones that price are added as one slice for the maker.
    const amounts: string[] = [];
    const receipts: PriceReceiptV1[] = [];
    let calls = 0;
    const unpriced = { "undocumented-category": [] as string[], "no-rate": [] as string[] };
    const unpricedCalls = { "undocumented-category": 0, "no-rate": 0 };
    for (const [modelId, slice] of models) {
      const one = replayed(slice, maker);
      if (one.result.economics === undefined) {
        const reason = one.result.warnings.some(
          (warning) => warning.code === "API_PRICE_CATEGORY_UNDOCUMENTED",
        )
          ? "undocumented-category"
          : "no-rate";
        unpriced[reason].push(nameOf(modelId));
        unpricedCalls[reason] += slice.length;
        continue;
      }
      amounts.push(one.result.economics.targetCost.amount);
      pricedTokens += tokensIn(slice);
      if (one.receipt !== undefined) receipts.push(one.receipt);
      calls += slice.length;
    }
    if (calls > 0)
      priced.push({
        makerId: maker,
        makerName,
        calls,
        amount: addAmounts(amounts),
        receipt: mergeReceipts(receipts),
      });
    for (const reason of ["undocumented-category", "no-rate"] as const)
      if (unpricedCalls[reason] > 0)
        excluded.push({
          models: unpriced[reason],
          calls: unpricedCalls[reason],
          reason,
          makerName,
        });
  }
  if (noMaker.size > 0)
    excluded.push({
      models: [...noMaker.keys()].map(nameOf),
      calls: [...noMaker.values()].reduce((sum, value) => sum + value, 0),
      reason: "no-maker",
    });

  priced.sort((a, b) => amountOrder(b.amount, a.amount) || (a.makerName < b.makerName ? -1 : 1));
  const withCache = priced.map((slice) => slice.receipt?.cacheReadsAtInputRate);
  return {
    rulesAsOf,
    recordedCalls: events.length,
    pricedCalls: priced.reduce((sum, slice) => sum + slice.calls, 0),
    knownTokens: { total: tokensIn(events), priced: pricedTokens },
    ...(priced.length === 0 ? {} : { total: addAmounts(priced.map((slice) => slice.amount)) }),
    ...(priced.length === 0 || withCache.some((amount) => amount === undefined)
      ? {}
      : { cacheReadsAtInputRate: addAmounts(withCache as string[]) }),
    priced,
    excluded,
    unresolvedCalls,
  };
}

/** One receipt for several complete per-model receipts of the same maker. */
function mergeReceipts(receipts: readonly PriceReceiptV1[]): PriceReceiptV1 | undefined {
  const first = receipts[0];
  if (first === undefined) return undefined;
  if (receipts.length === 1) return first;
  const cache = receipts.map((receipt) => receipt.cacheReadsAtInputRate);
  return {
    basis: first.basis,
    lines: receipts.flatMap((receipt) => receipt.lines),
    total: addAmounts(receipts.map((receipt) => receipt.total)),
    pricedEvents: receipts.reduce((sum, receipt) => sum + receipt.pricedEvents, 0),
    ...(cache.some((amount) => amount === undefined)
      ? {}
      : { cacheReadsAtInputRate: addAmounts(cache as string[]) }),
    cacheReadTokens: receipts.reduce((sum, receipt) => sum + receipt.cacheReadTokens, 0),
  };
}
