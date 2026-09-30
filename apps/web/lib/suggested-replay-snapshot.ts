import { DECISION_MARKET, type DecisionMarket } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import type { ReplayOutcome } from "./worker-client";

/**
 * Suggested API runs use the legacy engine. Stamp only a full Standard receipt
 * whose exact priced routes/rates are present without overrides in the admitted
 * market. Unsupported targets, partial pricing and overlays keep the fallback.
 * Never used to stamp arbitrary custom Replay.
 */
export function suggestedReplaySnapshotHash(
  outcome: Pick<ReplayOutcome, "result" | "receipt" | "scope">,
  market: DecisionMarket = DECISION_MARKET,
): string | undefined {
  const { result, receipt } = outcome;
  const target = result.target;
  if (
    result.versions.catalog !== market.catalogHash ||
    result.versions.rulesAsOf !== market.rulesAt.slice(0, 10) ||
    target.type !== "api" ||
    (target.serviceTier !== undefined && target.serviceTier !== "standard") ||
    outcome.scope !== undefined ||
    receipt?.basis !== "api_list_price" ||
    receipt.lines.length === 0 ||
    receipt.pricedEvents !== result.workload.eventCount
  )
    return undefined;
  const represented = receipt.lines.every((line) =>
    market.plans.some((p) => {
      const a = p.artifact;
      if (
        p.providerId !== target.providerId ||
        a.purchase.kind !== "api" ||
        a.appliedOverlayIds.length !== 0 ||
        a.computation.kind !== "executable"
      )
        return false;
      const computation = a.computation;
      return computation.routes.some((route) => {
        if (
          !route.models.includes(line.modelId) ||
          !route.cash ||
          !new Decimal(route.cash.factor).eq(1) ||
          !new Decimal(line.multiplier).eq(1)
        )
          return false;
        const rate = computation.rates.find((r) => r.id === route.cash?.rateId);
        if (!rate || rate.pricingRef !== line.pricingId || rate.cashOverrides?.length) return false;
        const rates =
          line.tierId === undefined
            ? rate.rates
            : rate.tiers?.find((t) => t.id === line.tierId)?.rates;
        const value = rates?.[line.category];
        const billedAs = typeof value === "object" ? value.billedAs : undefined;
        const amount = billedAs ? rates?.[billedAs] : value;
        return (
          typeof amount === "string" &&
          billedAs === line.billedAs &&
          new Decimal(amount).eq(line.ratePerMillion)
        );
      });
    }),
  );
  return represented ? market.decisionSnapshotHash : undefined;
}
