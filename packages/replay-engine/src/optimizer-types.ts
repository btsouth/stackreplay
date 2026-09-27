import type { CatalogV1, LoadedPlanVersionV1 } from "@stackreplay/catalog";
import type {
  ApiTargetV1,
  ReplayContextV1,
  SubscriptionTargetV1,
  TextUsageEventV1,
} from "@stackreplay/schema";
import type { replayWithReceipt } from "./engine.js";
import type { CapacityEvidenceV1, StackCandidateInput } from "./optimizer.js";
import type { RequestPool } from "./optimizer-assignment.js";

export type ExactExecutionResource =
  | { target: SubscriptionTargetV1; capacityEvidence: CapacityEvidenceV1 }
  | { target: ApiTargetV1 };

/** Supplied-state shape is reserved explicitly; O2 refuses it until replay supports it. */
export type InitialAllowanceState =
  | { kind: "fresh" }
  | {
      kind: "provided";
      entries: readonly {
        resourceId: string;
        limitId: string;
        windowStart: string;
        windowEnd: string;
        consumedUnits: string;
        evidence: string;
      }[];
    };

export type DemandGranularity = "request" | "aggregate" | "unknown";
export interface ExactOptimizationInput {
  events: readonly TextUsageEventV1[];
  catalog: CatalogV1;
  context: ReplayContextV1;
  period: StackCandidateInput["period"];
  resources: readonly ExactExecutionResource[];
  initialAllowance: InitialAllowanceState;
  chronology: {
    default: DemandGranularity;
    byEventId?: Readonly<Record<string, DemandGranularity>>;
    evidence: string;
  };
  limits?: { maxSubscriptions?: 1 | 2; maxAssignmentStates?: number };
}

export interface OptimizationScope {
  id: "recognized-exact-models";
  period: StackCandidateInput["period"];
  context: ReplayContextV1;
  catalogVersion: string;
  chronologyEvidence: string;
  recorded: number;
  required: number;
  /** Single canonical population shared by all candidate summaries. */
  events: {
    eventId: string;
    modelId: string;
    granularity: DemandGranularity;
    apiPriceable: boolean;
  }[];
  exclusions: { eventId: string; reason: "unresolved-model" }[];
  apiPriceable: number;
  apiEligibility: { resourceId: string; reason: string; records: number }[];
  capacityEligible: number;
  usageEvidence: { exact: number; estimated: number };
  excludedCostImpact: "none" | "unbounded";
}

export interface ExactCandidateSummary {
  id: string;
  scopeId: OptimizationScope["id"];
  subscriptions: string[];
  apiAllowed: boolean;
  status: "feasible" | "infeasible" | "unavailable";
  allocation: "weighted-matching" | "exhaustive-replay" | "api-only" | "not-evaluated";
  fixedCost: string;
  variableCost?: string;
  totalCost?: string;
  recordsRequired: number;
  recordsModeled: number;
  recordsExcluded: number;
  subscriptionRecords: number;
  apiRecords: number;
  /** Fraction of required models preserved; exactly 1 for every feasible candidate. */
  exactModelPreservation?: 1;
  /** Calls displaced from compatible subscription capacity, not user interruption sessions. */
  capacityDisplacedRecords: number;
  capacityEvaluation: "available" | "not-applicable" | "unavailable";
  failures: string[];
  pricingConfidence: "high" | "medium" | "low" | "not-applicable";
  pricingReferences: string[];
  capacityConfidence:
    | "high-confidence-modeled"
    | "estimated"
    | "user-calibrated"
    | "not-applicable";
  /** Safe observed-scope dominance; audit summary remains present. */
  dominatedBy?: string;
}

type ReplayRun = ReturnType<typeof replayWithReceipt>;
export interface ExactCandidateExplanation {
  candidateId: string;
  assignments: {
    eventId: string;
    modelId: string;
    resourceId: string;
    reason: "subscription" | "api-only-model" | "capacity-reserved" | "api-only";
    limitingPools: number[];
  }[];
  pools: (RequestPool & { id: number; used: number })[];
  resources: {
    id: string;
    records: number;
    result: ReplayRun["result"];
    receipt: ReplayRun["receipt"];
    capacityEvidence?: CapacityEvidenceV1;
  }[];
  /** Generic-policy overflow insertion checks, including displaced previously assigned calls. */
  capacityChecks: {
    eventId: string;
    resourceId: string;
    violations: ReplayRun["result"]["violations"];
  }[];
}

export interface ExactOptimizationResult {
  version: 1;
  scope: OptimizationScope;
  status: "optimal" | "infeasible" | "incomplete" | "empty";
  winnerId?: string;
  bestKnownId?: string;
  candidates: ExactCandidateSummary[];
  /** Only one full assignment/receipt result is retained, regardless of candidate count. */
  explanation?: ExactCandidateExplanation;
  resources: {
    id: string;
    target: ExactExecutionResource["target"];
    capacityEvidence?: CapacityEvidenceV1;
    subscriptionPrice?: Pick<
      LoadedPlanVersionV1,
      "price" | "sources" | "lastVerifiedAt" | "verificationStatus"
    >;
  }[];
  skippedResources: { id: string; reason: string }[];
  search: {
    maxSubscriptions: number;
    candidateCount: number;
    assignmentStateLimit: number;
    assignmentWorkLimit: number;
    family: "api-pool-plus-subscription-singletons-and-pairs";
    initialAllowance: "fresh";
    retainedAssignmentSets: number;
  };
  assumptions: readonly string[];
}
