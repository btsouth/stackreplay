import { partOfWhole } from "./verdict.js";

/**
 * What a published-rate value covers, in words: the calls it prices and,
 * when some are left out, how much of the known processed-token demand the
 * priced calls carry. One set of words for the workload page, Workload Ready,
 * a workload link and its image.
 *
 * The token share is a scope and materiality measure, not a share of dollars:
 * tokens are priced at different rates by category and model, so it is never
 * turned into money.
 */

const NUMBER = new Intl.NumberFormat("en-US");

export interface ValueScopeInput {
  recordedCalls: number;
  pricedCalls: number;
  /** Known processed tokens across all recorded calls, and in the priced calls. */
  knownTokens?: { total: number; priced: number } | undefined;
}

export function composeValueScope(scope: ValueScopeInput): {
  /** "3,199 of 3,200 calls (99.97%)", or "All 3,200 calls". */
  calls: string;
  /** Present when calls are left out and known tokens exist. */
  tokens?: string | undefined;
} {
  const { recordedCalls, pricedCalls, knownTokens } = scope;
  const complete = pricedCalls >= recordedCalls;
  const calls = complete
    ? `All ${NUMBER.format(recordedCalls)} calls`
    : `${NUMBER.format(pricedCalls)} of ${NUMBER.format(recordedCalls)} calls (${partOfWhole(pricedCalls, recordedCalls)})`;
  if (complete || knownTokens === undefined || knownTokens.total <= 0) return { calls };
  const excluded = recordedCalls - pricedCalls;
  return {
    calls,
    tokens: `The priced calls carry ${partOfWhole(knownTokens.priced, knownTokens.total)} of known processed tokens; the ${NUMBER.format(excluded)} left out ${excluded === 1 ? "carries" : "carry"} ${partOfWhole(knownTokens.total - knownTokens.priced, knownTokens.total)}.`,
  };
}
