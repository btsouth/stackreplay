"use client";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type CompletedReplay, saveCompletedReplay } from "@/lib/completed-replays";
import { baselineRange, replayCost, replayDifference } from "@/lib/replay-strategies";
import { getWorkerClient, type ReplayOutcome } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";

/** The target the engine resolved, pinned: the plan version it used, or the provider and tier. */
function savedTargetOf(outcome: ReplayOutcome): CompletedReplay["target"] {
  const { result } = outcome;
  if (result.target.type === "api")
    return {
      type: "api",
      providerId: result.target.providerId,
      ...(result.target.serviceTier !== undefined
        ? { serviceTier: result.target.serviceTier }
        : {}),
    };
  if (result.subscription !== undefined)
    return {
      type: "subscription",
      planId: result.subscription.planId,
      planVersionId: result.subscription.planVersionId,
      ...(result.target.type === "subscription" && result.target.cohort !== undefined
        ? { cohort: result.target.cohort }
        : {}),
    };
  return undefined;
}

/** Preserve a completed manual run, never rerun it when adding to Compare. */
export function SaveCustomReplay({
  outcome,
  record,
}: {
  outcome: ReplayOutcome;
  record: ImportRecord;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => {
    if (outcome) setState("idle");
  }, [outcome]);
  async function save() {
    setState("saving");
    try {
      const baseline = await getWorkerClient().apiMarket(record.id);
      const full =
        outcome.result.workload.eventCount === record.eventCount &&
        !outcome.scope?.source &&
        !outcome.scope?.excludedUnresolvedEvents;
      const sameRates =
        outcome.result.versions.rulesAsOf === DECISION_MARKET.rulesAt.slice(0, 10) &&
        outcome.result.versions.catalog === DECISION_MARKET.catalogHash;
      const base = full && sameRates ? baselineRange(baseline) : undefined;
      const api = outcome.result.target.type === "api";
      const price = api ? replayCost(outcome) : { priced: 0, cost: undefined };
      const calls = outcome.result.workload.eventCount;
      const translation = outcome.result.semantics?.translation;
      const ok = saveCompletedReplay({
        version: 1,
        id: crypto.randomUUID(),
        importId: record.id,
        scopeDigest: full
          ? (baseline.scenarios[0]?.summary.scope.digest ?? record.id)
          : `${record.id}:${JSON.stringify(outcome.scope)}`,
        catalogHash: outcome.result.versions.catalog,
        rulesAt: sameRates ? DECISION_MARKET.rulesAt : outcome.result.versions.rulesAsOf,
        title: `Custom: ${outcome.projection.target.label}`,
        mode: api ? (outcome.projection.mode ?? "assessment") : "assessment",
        createdAt: new Date().toISOString(),
        calls,
        tokens: Object.values(outcome.result.workload.tokenTotals).reduce<number>(
          (n, v) => n + (v ?? 0),
          0,
        ),
        priced: price.priced,
        translatedCalls: translation?.substitutedEvents ?? 0,
        cost: price.cost,
        baseline: base,
        difference: replayDifference(base, price.cost, calls, price.priced),
        ...(outcome.projection.translation
          ? {
              policy: {
                id: outcome.projection.translation.policyId,
                version: outcome.projection.translation.policyVersion,
              },
            }
          : {}),
        mappings: (outcome.projection.translation?.applied ?? []).map((r) => ({
          source: r.sourceModelId,
          target: r.targetModelId,
          calls: r.eventCount,
        })),
        contributions: [],
        ...(savedTargetOf(outcome) !== undefined ? { target: savedTargetOf(outcome) } : {}),
        limitations: [
          "Saved from the manual replay, with its original scope and pricing date. Inspect the original replay for its detailed capacity trace.",
          ...(!api
            ? [
                "Subscription results do not establish a whole-workload API cost. Published fixed prices remain separate from actual spend.",
              ]
            : []),
          ...(!full || !sameRates
            ? [
                "The Workload baseline uses a different scope or pinned pricing instant. No same-scope difference is reported.",
              ]
            : []),
        ],
      });
      setState(ok ? "saved" : "error");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="flex flex-wrap gap-4 border-t border-border py-4">
      <button
        type="button"
        className="min-h-11 text-sm text-accent"
        disabled={state === "saving" || state === "saved"}
        onClick={() => void save()}
      >
        {state === "saved"
          ? "Added to Compare"
          : state === "saving"
            ? "Saving local result…"
            : "Add completed replay to Compare →"}
      </button>
      {state === "saved" ? (
        <Link
          className="inline-flex min-h-11 items-center text-sm text-accent"
          href={`/app/plans?section=compare&import=${encodeURIComponent(record.id)}`}
        >
          Compare completed replays →
        </Link>
      ) : null}
      {state === "error" ? (
        <p role="alert">The result could not be saved locally. Retry or keep this page open.</p>
      ) : null}
    </div>
  );
}
