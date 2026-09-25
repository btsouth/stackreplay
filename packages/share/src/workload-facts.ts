import { z } from "zod";
import { formatUsdWhole } from "./money.js";

/**
 * Comparative workload facts: the structured form, and the one set of words
 * for them.
 *
 * The workload page, a workload share link, its public page and its image all
 * print these sentences from the same fields with the same templates, so a
 * fact cannot read one way in the app and another in public. A fact carries a
 * time or a time zone only when it is shown to its owner, or when the sharer
 * chose to publish times; the templates read naturally without them.
 */

const count = z.number().int().nonnegative();
const amount = z.string().regex(/^\d{1,24}(\.\d{1,40})?$/u);

export const WORKLOAD_FACT_IDS = [
  "peak-day",
  "peak-hour",
  "peak-5h",
  "largest-session",
  "cache-value",
  "projects",
  "late-night",
] as const;

export const workloadFactV1Schema = z.strictObject({
  id: z.enum(WORKLOAD_FACT_IDS),
  /** The measured figure: calls, tokens, priced calls or late days, by fact. */
  figure: z.number().nonnegative(),
  /** What it is compared with: a median, or an even share. */
  baseline: z.number().nonnegative(),
  /** Figure against baseline. */
  ratio: z.number().nonnegative().max(1_000_000),
  /** A share of the whole, 0 to 1, where the sentence states one. */
  share: z.number().min(0).max(1).optional(),
  /** A count the sentence names: days in the record, projects, active days, recorded calls. */
  count: count.optional(),
  /** Caching's effect: the list-price value, and the same tokens billed as fresh input. */
  amounts: z.strictObject({ value: amount, without: amount }).optional(),
  /** When, as shown to its owner ("Aug 31, 10:01 AM"). Published only by choice. */
  at: z.string().min(1).max(40).optional(),
  /** The time zone a clock-hour fact was read in. Published only by choice. */
  zone: z.string().min(1).max(60).optional(),
});

export type WorkloadFactV1 = z.infer<typeof workloadFactV1Schema>;

const NUMBER = new Intl.NumberFormat("en-US");
const n = (value: number): string => NUMBER.format(Math.round(value));
const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const ratio = (value: number): string => `${value.toFixed(value < 10 ? 1 : 0)}×`;

function compactTokens(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return n(value);
}

/** The fact's sentence and its comparison, from fixed templates. */
export function composeWorkloadFact(fact: WorkloadFactV1): { text: string; comparison: string } {
  const at = fact.at;
  const share = fact.share ?? 0;
  switch (fact.id) {
    case "peak-day":
      return {
        text: `Your busiest day${at === undefined ? "" : `, ${at},`} carried ${n(fact.figure)} calls, ${percent(share)} of the whole ${n(fact.count ?? 0)}-day record.`,
        comparison: `${ratio(fact.ratio)} your median active day (${n(fact.baseline)} calls)`,
      };
    case "peak-hour":
      return {
        text: `Your heaviest hour${at === undefined ? "" : `, starting ${at},`} held ${n(fact.figure)} calls.`,
        comparison: `${ratio(fact.ratio)} your median active hour (${n(fact.baseline)} calls)`,
      };
    case "peak-5h":
      return {
        text: `Your busiest five-hour window${at === undefined ? "" : `, starting ${at},`} held ${n(fact.figure)} calls, ${percent(share)} of all recorded calls.`,
        comparison: `${ratio(fact.ratio)} your median active five-hour window (${n(fact.baseline)} calls)`,
      };
    case "largest-session":
      return {
        text: `Your largest session processed ${compactTokens(fact.figure)} tokens, ${percent(share)} of everything processed.`,
        comparison: `${ratio(fact.ratio)} your median session`,
      };
    case "cache-value": {
      const all = fact.count !== undefined && fact.figure >= fact.count;
      const value = formatUsdWhole(fact.amounts?.value) ?? "";
      const without = formatUsdWhole(fact.amounts?.without) ?? "";
      return {
        text: `Cache reads keep ${all ? "this work" : `the ${n(fact.figure)} priced calls`} at ${value} at published API list prices; billed as fresh input, the same tokens would be worth ${without}.`,
        comparison: `${ratio(fact.ratio)} the list-price value without caching`,
      };
    }
    case "projects":
      return {
        text: `Three projects generated ${percent(share)} of your processed tokens.`,
        comparison: `${ratio(fact.ratio)} their even share across ${n(fact.count ?? 0)} projects`,
      };
    case "late-night":
      return {
        text: `${percent(share)} of your calls came between 10 PM and 4 AM${fact.zone === undefined ? "" : ` (${fact.zone})`}.`,
        comparison: `on ${n(fact.figure)} of ${n(fact.count ?? 0)} active days`,
      };
  }
}
