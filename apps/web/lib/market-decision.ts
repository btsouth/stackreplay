import type { DecisionMarket } from "@stackreplay/catalog/market";
import type { MarketCoverage } from "@stackreplay/replay-engine";
import type { CapacitySummary } from "./observed-capacity";
import type { CompiledOptimizerSummary } from "./optimizer-runtime";
import type { ReviewComposition, ReviewHistory } from "./review-period";
/** Bounded durable summaries only; imported events never reach the page. */
export interface MarketDecision {
  snapshot?: Pick<DecisionMarket, "rulesAt" | "catalogHash" | "decisionSnapshotHash">;
  history?: ReviewHistory;
  capacity?: CapacitySummary;
  /** Direct imported evidence only, across explicitly identified local accounts. */
  capacitySignal?: {
    blockedAttempts: number;
    warnings: number;
    days: number;
    accounts: number;
    resourceInstanceIds?: string[];
  };
  coverage?: MarketCoverage;
  /** Separate explicitly priced subset, never a whole-workload total. */
  pricedScope?: { scenarios: MarketDecision["scenarios"] };
  /** Composed locally by the UI, never stored in the replay cache. */
  review?: ReviewComposition;
  unavailable?: { code: "observation_scope_unsupported"; calls: number; message: string };
  scenarios: { id: string; summary: CompiledOptimizerSummary }[];
}
