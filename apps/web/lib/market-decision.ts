import type { MarketCoverage } from "@stackreplay/replay-engine";
import type { CapacitySummary } from "./observed-capacity";
import type { CompiledOptimizerSummary } from "./optimizer-runtime";
import type { ReviewComposition, ReviewHistory } from "./review-period";
/** Bounded durable summaries only; imported events never reach the page. */
export interface MarketDecision {
  history?: ReviewHistory;
  capacity?: CapacitySummary;
  coverage?: MarketCoverage;
  /** Separate explicitly priced subset, never a whole-workload total. */
  pricedScope?: { scenarios: MarketDecision["scenarios"] };
  /** Composed locally by the UI, never stored in the replay cache. */
  review?: ReviewComposition;
  unavailable?: { code: "observation_scope_unsupported"; calls: number; message: string };
  scenarios: { id: string; summary: CompiledOptimizerSummary }[];
}
