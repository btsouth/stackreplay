import { type CatalogV1, catalogSourceV1Schema } from "@stackreplay/catalog";
import {
  type HybridTargetV1,
  hybridTargetV1Schema,
  isoDateV1Schema,
  isoUtcTimestampV1Schema,
  type ReplayContextV1,
  replayContextV1Schema,
  type TextUsageEventV1,
} from "@stackreplay/schema";
import { z } from "zod";
import type { ApiEventPriceability } from "./api-replay.js";
import { replayWithReceipt, type SubscriptionEventObservation, validateEvents } from "./engine.js";
import { ReplayEngineError } from "./errors.js";
import { purchaseCycleEnd } from "./execution-binding.js";
import { parseAmount, toUnitString, ZERO } from "./money.js";
import { parseInstant } from "./time.js";
import { sortTimedEvents, toTimedEvents } from "./windows.js";

/** Capacity evidence is scenario input, not a change to authoritative price data. */
export const capacityEvidenceV1Schema = z.strictObject({
  kind: z.enum([
    "published-hard-limit",
    "published-estimate",
    "relative-provider-limit",
    "empirical-user-calibration",
    "inferred",
    "synthetic",
  ]),
  sources: z.array(catalogSourceV1Schema).min(1),
  lastVerifiedAt: isoDateV1Schema,
  notes: z.string().min(1),
});
export type CapacityEvidenceV1 = z.infer<typeof capacityEvidenceV1Schema>;

const periodSchema = z.strictObject({
  start: isoUtcTimestampV1Schema,
  end: isoUtcTimestampV1Schema,
});

export interface StackCandidateInput {
  events: readonly TextUsageEventV1[];
  catalog: CatalogV1;
  context: ReplayContextV1;
  target: HybridTargetV1;
  /** Half-open, at most 31 days. Each selected monthly subscription is charged once. */
  period: z.infer<typeof periodSchema>;
  /** By route priority. Required for every subscription; never inferred from price verification. */
  capacityEvidence: Readonly<Record<number, CapacityEvidenceV1>>;
}

export interface StackAttempt {
  priority: number;
  outcome: ApiEventPriceability | SubscriptionEventObservation["disposition"];
  blockingLimitIds: readonly string[];
}

export interface StackAssignment {
  eventId: string;
  occurredAt: string;
  assignedPriority?: number;
  status: "covered" | "excluded" | "unserved";
  attempts: StackAttempt[];
}

type ReplayRun = ReturnType<typeof replayWithReceipt>;
export interface StackRouteEvaluation {
  priority: number;
  result: ReplayRun["result"];
  receipt: ReplayRun["receipt"];
  callsAssigned: number;
  fixedCost: string;
  variableCost: string;
  capacity?: {
    confidence: "high-confidence-modeled" | "estimated" | "user-calibrated";
    evidence: CapacityEvidenceV1;
  };
}

export interface StackCandidateResult {
  version: 1;
  period: StackCandidateInput["period"];
  context: ReplayContextV1;
  target: HybridTargetV1;
  status: "empty" | "complete" | "partial" | "infeasible";
  costs: {
    currency: "USD";
    basis: "one-subscription-charge-plus-modeled-api-usage";
    fixed: string;
    variable: string;
    /** A subtotal when calls are excluded or unserved; never a full-workload quote. */
    modeledTotal: string;
    complete: boolean;
  };
  coverage: { recorded: number; covered: number; excluded: number; unserved: number };
  /** Every covered call uses its original canonical identity; no substitution is accepted. */
  exactModelCalls: number;
  /** Rejected calls, not an estimate of interruption sessions or user-visible pauses. */
  capacityRejectedCalls: number;
  excludedCostImpact: "none" | "unbounded";
  assignments: StackAssignment[];
  routes: StackRouteEvaluation[];
  assumptions: readonly string[];
}

function unsupported(message: string): never {
  throw new ReplayEngineError("TARGET_NOT_IMPLEMENTED", message);
}

/** Shared validation for O1 evaluation and O2's single common scope. */
export function prepareCandidateDemand(
  input: Pick<StackCandidateInput, "events" | "period">,
  calendarMonth?: { start: string; billingTimezone: string },
) {
  const period = periodSchema.parse(input.period);
  const start = parseInstant(period.start);
  const end = parseInstant(period.end);
  // v2 may supply one explicit local monthly cycle. DST can make it exceed
  // 31 elapsed days; this is calendar containment, never a duration tolerance.
  const containedMonth =
    calendarMonth &&
    start.epochNanoseconds >= parseInstant(calendarMonth.start).epochNanoseconds &&
    end.epochNanoseconds <=
      parseInstant(purchaseCycleEnd("month", calendarMonth.start, calendarMonth.billingTimezone))
        .epochNanoseconds;
  if (
    end.epochNanoseconds <= start.epochNanoseconds ||
    (!containedMonth &&
      end.epochNanoseconds - start.epochNanoseconds > 31n * 24n * 60n * 60n * 1_000_000_000n)
  )
    unsupported("A candidate requires a positive observation period of at most 31 days.");
  return prepareRecordedDemand(input);
}

/** Recorded API demand has no purchase-cycle length. Dates remain lossless and scoped. */
export function prepareRecordedDemand(input: Pick<StackCandidateInput, "events" | "period">) {
  const period = periodSchema.parse(input.period);
  const start = parseInstant(period.start);
  const end = parseInstant(period.end);
  if (end.epochNanoseconds <= start.epochNanoseconds)
    unsupported("Recorded demand requires a positive observation period.");
  const timed = sortTimedEvents(toTimedEvents(validateEvents(input.events)));
  // Reuse replay's lossless timestamps instead of allocating another Temporal
  // instant per event in a large workload.
  const startMs = start.epochMilliseconds;
  const endMs = end.epochMilliseconds;
  const startSubMs = Number(start.epochNanoseconds - BigInt(startMs) * 1_000_000n);
  const endSubMs = Number(end.epochNanoseconds - BigInt(endMs) * 1_000_000n);
  for (const { atMs, subMs } of timed) {
    if (
      atMs < startMs ||
      (atMs === startMs && subMs < startSubMs) ||
      atMs > endMs ||
      (atMs === endMs && subMs >= endSubMs)
    )
      unsupported("Every event must lie inside the observation period.");
  }
  const events = timed.map(({ event }) => event);
  return { events, timed, period };
}

/**
 * Evaluate a configured priority strategy, NOT an optimizer/search or a monthly forecast.
 * Each route reuses one whole replay pass. Rejected/unpriced calls continue to the next
 * route, and a successful call leaves the pending set exactly once. O(R * N log N),
 * bounded to 16 routes; no event-by-event replays or duplicate quota/price arithmetic.
 */
export function evaluateStackCandidate(input: StackCandidateInput): StackCandidateResult {
  const target = hybridTargetV1Schema.parse(input.target);
  const context = replayContextV1Schema.parse(input.context);
  const { events, period } = prepareCandidateDemand(input);
  if (target.routes.length > 16) unsupported("A candidate supports at most 16 routes.");
  const ordered = [...target.routes].sort((a, b) => a.priority - b.priority);
  const priorities = new Set<number>();
  for (const route of ordered) {
    if (priorities.has(route.priority)) unsupported("Route priorities must be unique.");
    priorities.add(route.priority);
    if (route.conditions !== undefined) unsupported("Conditional routes are not implemented.");
    if (route.target.type === "local") unsupported("Local execution is not implemented.");
    if (route.target.modelTranslation !== undefined)
      unsupported("Stack candidates must preserve exact models.");
  }
  const assignments = events.map(
    (event): StackAssignment => ({
      eventId: event.id,
      occurredAt: event.occurredAt,
      status: "unserved",
      attempts: [],
    }),
  );
  const byId = new Map(assignments.map((assignment) => [assignment.eventId, assignment]));
  const routes: StackRouteEvaluation[] = [];
  const selectedPlans = new Set<string>();
  let pending = events;
  let fixed = ZERO;
  let variable = ZERO;

  for (const route of ordered) {
    const accepted = new Set<string>();
    const attempt = (
      event: TextUsageEventV1,
      outcome: StackAttempt["outcome"],
      blockingLimitIds: readonly string[],
      served: boolean,
    ) => {
      const assignment = byId.get(event.id);
      if (assignment === undefined) throw new Error("Missing validated event assignment");
      assignment.attempts.push({ priority: route.priority, outcome, blockingLimitIds });
      if (served) {
        accepted.add(event.id);
        assignment.status = "covered";
        assignment.assignedPriority = route.priority;
      }
    };
    // Empty replays still validate selected targets and charge purchased subscriptions.
    const run = replayWithReceipt(
      { events: pending, catalog: input.catalog, context, target: route.target },
      {
        subscription: (event, observation) =>
          attempt(
            event,
            observation.disposition,
            observation.blockingLimitIds,
            observation.disposition === "included",
          ),
        api: (event, outcome) => attempt(event, outcome, [], outcome === "priced"),
      },
    );
    let routeFixed = ZERO;
    const routeVariable =
      route.target.type === "api" ? parseAmount(run.receipt?.total ?? "0") : ZERO;
    let capacity: StackRouteEvaluation["capacity"];
    if (route.target.type === "subscription") {
      const subscription = run.result.subscription;
      const version =
        subscription === undefined
          ? undefined
          : input.catalog.planVersions[subscription.planVersionId];
      if (version === undefined) throw new Error("Replay did not resolve a subscription version");
      if (selectedPlans.has(version.planId))
        unsupported("A subscription plan may only be selected once.");
      selectedPlans.add(version.planId);
      if (version.price.interval !== "month")
        unsupported("Only one-cycle monthly subscriptions are implemented.");
      if (route.target.resetAssumption !== undefined)
        unsupported("Unknown reset phase cannot establish capacity.");
      if ((version.qualitativeLimits?.length ?? 0) > 0 || version.limits.length === 0)
        unsupported("Opaque or qualitative capacity cannot be treated as unlimited.");
      if (
        version.limits.some(
          (limit) => !["reject_request", "latch_until_reset"].includes(limit.exceed),
        )
      )
        unsupported("Only hard admission limits are implemented for stack subscriptions.");
      if (
        version.modelRules.some(
          (rule) =>
            !rule.excluded &&
            !version.limits.some(
              (limit) => limit.models === undefined || limit.models.includes(rule.model),
            ),
        )
      )
        unsupported("Every included model must have an explicit numeric capacity rule.");
      const evidence = capacityEvidenceV1Schema.parse(input.capacityEvidence[route.priority]);
      capacity = {
        confidence:
          evidence.kind === "empirical-user-calibration"
            ? "user-calibrated"
            : evidence.kind === "published-hard-limit" && version.verificationStatus === "verified"
              ? "high-confidence-modeled"
              : "estimated",
        evidence,
      };
      routeFixed = parseAmount(version.price.amount).mul(route.target.quantity ?? 1);
    }
    fixed = fixed.plus(routeFixed);
    variable = variable.plus(routeVariable);
    routes.push({
      priority: route.priority,
      result: run.result,
      receipt: run.receipt,
      callsAssigned: accepted.size,
      fixedCost: toUnitString(routeFixed),
      variableCost: toUnitString(routeVariable),
      ...(capacity === undefined ? {} : { capacity }),
    });
    pending = pending.filter((event) => !accepted.has(event.id));
  }
  const unknownOutcomes = new Set<StackAttempt["outcome"]>([
    "unknown",
    "unresolved",
    "offering_unestablished",
    "usage_incomplete",
    "price_not_recorded",
    "price_category_undocumented",
  ]);
  for (const assignment of assignments) {
    if (
      assignment.status !== "covered" &&
      assignment.attempts.some((entry) => unknownOutcomes.has(entry.outcome))
    )
      assignment.status = "excluded";
  }
  const coverage = { recorded: events.length, covered: 0, excluded: 0, unserved: 0 };
  for (const assignment of assignments) coverage[assignment.status] += 1;
  const complete = coverage.excluded === 0 && coverage.unserved === 0;
  return {
    version: 1,
    period,
    context,
    target: { ...target, routes: ordered },
    status:
      events.length === 0
        ? "empty"
        : coverage.unserved > 0
          ? "infeasible"
          : complete
            ? "complete"
            : "partial",
    costs: {
      currency: "USD",
      basis: "one-subscription-charge-plus-modeled-api-usage",
      fixed: toUnitString(fixed),
      variable: toUnitString(variable),
      modeledTotal: toUnitString(fixed.plus(variable)),
      complete,
    },
    coverage,
    exactModelCalls: coverage.covered,
    capacityRejectedCalls: assignments.filter((entry) =>
      entry.attempts.some((attempt) => attempt.outcome === "blocked"),
    ).length,
    excludedCostImpact: coverage.excluded > 0 ? "unbounded" : "none",
    assignments,
    routes,
    assumptions: [
      "One full monthly charge per purchased account; no proration, renewal replay or monthly extrapolation.",
      ...(ordered.some(
        (route) => route.target.type === "subscription" && (route.target.quantity ?? 1) > 1,
      )
        ? [
            "Account quantities scale aggregate numeric capacity with the original reset schedule, not independent account pools.",
          ]
        : []),
      "Each event represents one request. Aggregate logs must not be used as request-level demand.",
      "Recorded demand only; missing histories and other account usage are not reconstructed. No allowance is consumed before the observation period.",
      "Priority routing is a configured strategy, not a proof of minimum cost. Each call is assigned atomically.",
      "API rate limits are not modeled. API costs retain replay's catalog price, token accounting and invoice exclusions.",
      "First-use anchored windows are fixed-duration sessions, not sliding lookbacks; calendar windows use their catalog timezone.",
      "Excluded calls can change both costs and capacity conclusions; call-count coverage does not bound their financial impact.",
    ],
  };
}
