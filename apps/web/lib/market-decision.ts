import type { CompiledOptimizerSummary } from "./optimizer-runtime";
/** Bounded durable summaries only; imported events never reach the page. */
export interface MarketDecision {
  unavailable?: { code: "observation_scope_unsupported"; calls: number; message: string };
  scenarios: { id: string; summary: CompiledOptimizerSummary }[];
}
