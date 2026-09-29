import type { CompiledExecutionPlanV2 } from "@stackreplay/schema";
import type { ExecutionClaim } from "./execution-authoring.js";
export interface DecisionMarket {
  rulesAt: string;
  reviewUntil: string;
  catalogHash: string;
  scenarios: {
    id: string;
    label: string;
    assumption: string;
    artifacts: CompiledExecutionPlanV2[];
  }[];
  plans: {
    id: string;
    name: string;
    provider: string;
    providerId: string;
    claims: ExecutionClaim[];
    artifact: CompiledExecutionPlanV2;
  }[];
}
export { DECISION_MARKET } from "./decision-market.generated.js";
