import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import type { MarketDecision } from "./market-decision";

/** Arithmetic over durable receipts, never a second pricing engine. */
export function marketRange(decision: MarketDecision | undefined) {
  const scenarios = decision?.scenarios;
  const first = scenarios?.[0]?.summary;
  if (!first || scenarios?.length !== 2 || new Set(scenarios.map((s) => s.id)).size !== 2)
    return undefined;
  if (
    !scenarios.every(
      (s) =>
        DECISION_MARKET.scenarios.some((known) => known.id === s.id) &&
        s.summary.scope.digest === first.scope.digest &&
        s.summary.scope.required === first.scope.required &&
        s.summary.scope.recorded === first.scope.recorded &&
        s.summary.scope.excluded === first.scope.excluded &&
        s.summary.candidates[0]?.status === "feasible" &&
        s.summary.candidates[0]?.totalUsd !== null &&
        s.summary.candidates[0]?.totalUsd !== undefined,
    )
  )
    return undefined;
  const totals = scenarios.flatMap((s) => {
    const total = s.summary.candidates[0]?.totalUsd;
    return typeof total === "string" ? [total] : [];
  });
  if (totals.length !== 2) return undefined;
  return {
    low: Decimal.min(...totals).toString(),
    high: Decimal.max(...totals).toString(),
    calls: first.scope.recorded,
    priced: first.scope.required,
  };
}

export function fixedDifference(fixed: string, range: { low: string; high: string }) {
  return {
    low: new Decimal(fixed).minus(range.high).toString(),
    high: new Decimal(fixed).minus(range.low).toString(),
  };
}
