import type { CompiledOptimizerSummary } from "./optimizer-runtime";
import type { ReviewComposition, ReviewHistory } from "./review-period";
/** Bounded durable summaries only; imported events never reach the page. */
export interface MarketDecision {
  history?: ReviewHistory;
  /** Composed locally by the UI, never stored in the replay cache. */
  review?: ReviewComposition;
  unavailable?: { code: "observation_scope_unsupported"; calls: number; message: string };
  scenarios: { id: string; summary: CompiledOptimizerSummary }[];
}
