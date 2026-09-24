import type { ApiPriceabilityCountsV1 } from "@stackreplay/replay-engine";

/**
 * What would complete a Direct API cost, computed from the replay's own
 * per-event priceability rather than assumed.
 *
 * The engine publishes a Direct API total only when every event is served and
 * priced (decision 44). When it does not, the tempting advice is "leave out the
 * unresolved events". That is only true when unresolved identity is the one gap
 * left; a workload whose other models the provider does not offer stays
 * incomplete however many unresolved events are dropped. This module says which
 * case the replay is in, from counts the same pass produced.
 */

export interface ApiScopeAdvice {
  /** True when leaving out the unresolved events leaves every remaining event priced. */
  resolvedScopeCompletes: boolean;
  /** Plain sentences, each ending in one full stop. */
  sentences: string[];
}

const count = (value: number): string => value.toLocaleString("en-US");
const plural = (value: number, one: string, many: string): string => (value === 1 ? one : many);

export function apiScopeAdvice(
  priceability: ApiPriceabilityCountsV1,
  providerName: string,
): ApiScopeAdvice {
  const blockers: string[] = [];
  if (priceability.not_offered > 0)
    blockers.push(
      `${count(priceability.not_offered)} ${plural(priceability.not_offered, "call uses a model", "calls use models")} ${providerName} doesn't offer`,
    );
  if (priceability.offering_unestablished > 0)
    blockers.push(
      `${count(priceability.offering_unestablished)} ${plural(priceability.offering_unestablished, "call uses a model", "calls use models")} whose ${providerName} offering the catalog doesn't establish`,
    );
  if (priceability.usage_incomplete > 0)
    blockers.push(
      `${count(priceability.usage_incomplete)} ${plural(priceability.usage_incomplete, "call reports", "calls report")} incomplete token data`,
    );
  const unpriced = priceability.price_not_recorded + priceability.price_category_undocumented;
  if (unpriced > 0)
    blockers.push(
      `${count(unpriced)} ${plural(unpriced, "call uses a model", "calls use models")} with no published ${providerName} rate for what ${plural(unpriced, "it", "they")} consumed`,
    );

  const unresolved = priceability.unresolved;
  if (blockers.length === 0 && unresolved === 0)
    return { resolvedScopeCompletes: false, sentences: [] };
  if (blockers.length === 0)
    return {
      resolvedScopeCompletes: true,
      sentences: [
        `Only the ${count(unresolved)} ${plural(unresolved, "call", "calls")} with unrecognized model IDs ${plural(unresolved, "stands", "stand")} in the way. Leaving ${plural(unresolved, "it", "them")} out gives a complete priced scope for the rest.`,
      ],
    };
  const listed = joinClauses(blockers);
  return {
    resolvedScopeCompletes: false,
    sentences:
      unresolved === 0
        ? [`${capitalize(listed)}.`]
        : [
            `${capitalize(listed)}, so leaving out the ${count(unresolved)} ${plural(unresolved, "call", "calls")} with unrecognized model IDs would still not complete the cost.`,
          ],
  };
}

function joinClauses(clauses: readonly string[]): string {
  if (clauses.length <= 1) return clauses[0] ?? "";
  return `${clauses.slice(0, -1).join(", ")} and ${clauses.at(-1)}`;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}

/**
 * Ends a sentence exactly once. Engine reasons often carry their own full stop,
 * and a template that adds another printed "a partial one.." on screen.
 */
export function sentence(text: string): string {
  const trimmed = text.trimEnd();
  if (trimmed.length === 0) return trimmed;
  return /[.!?…:]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}
