"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketDecision } from "./market-decision";
import {
  type BillingFact,
  composeReview,
  periodKey,
  type ReviewChoice,
  type ReviewComposition,
} from "./review-period";
import {
  paidForPeriod,
  resolveStackPeriod,
  type StackConfirmation,
  type StackPeriod,
  type StackWorkload,
  workloadFacts,
} from "./stack-analysis";
import { getWorkerClient, SupersededError } from "./worker-client";
import type { ImportRecord } from "./worker-protocol";

interface Fetched {
  key: string;
  overall: MarketDecision;
  account?: MarketDecision | undefined;
  sources: Record<string, MarketDecision>;
}

/**
 * The selected workload, scoped to the stack's analysis period, as My Stack
 * and Replay's stack scenario read it.
 *
 * It reuses the accepted market calculation the Workload page runs: the whole
 * period (shared with Workload's cache when the scope matches), the confirmed
 * account's scope when a confirmation names one, then each recording tool's
 * own calls. The Worker runs one market calculation at a time and a new one
 * replaces the last, so these requests are strictly sequential.
 */
export function useStackWorkload(input: {
  record: ImportRecord | undefined;
  choice: ReviewChoice;
  billing: Record<string, BillingFact>;
  ready: boolean;
  partialScan: boolean;
  asOf?: string | undefined;
}) {
  const { record, choice, billing, ready, partialScan } = input;
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);
  const firstEventAt = record?.summary.firstEventAt;
  const lastEventAt = record?.summary.lastEventAt;
  const period: StackPeriod = useMemo(
    () => resolveStackPeriod({ choice, billing, firstEventAt, lastEventAt, asOf }),
    [choice, billing, firstEventAt, lastEventAt, asOf],
  );
  const apiPeriod = period.kind === "billing" ? period.period : undefined;
  const account = choice.resourceInstanceId;
  const usageSources = record?.summary.usageSources;
  // Every tool whose calls are in the workload, including imported aggregates
  // (ccusage); attribution-only harnesses own no calls.
  const tools = useMemo(
    () =>
      (usageSources ?? [])
        .filter((source) => source.role !== "attribution" && source.events > 0)
        .map((source) => source.adapterId)
        .sort(),
    [usageSources],
  );
  // The whole-period result stands in for a tool's slice only when that tool owns every call.
  const singleTool =
    tools.length === 1 &&
    (usageSources ?? [])
      .filter((source) => source.role !== "attribution")
      .reduce((sum, source) => sum + source.events, 0) === (record?.eventCount ?? -1);
  const recordId = record?.id;
  const key = [
    recordId ?? "",
    apiPeriod ? periodKey(apiPeriod) : "history",
    account ?? "all",
    tools.join(","),
    singleTool ? "single" : "sliced",
  ].join("|");
  const [fetched, setFetched] = useState<Fetched>();
  const [failure, setFailure] = useState<{ key: string; interrupted: boolean }>();
  const [progress, setProgress] = useState<{ key: string; done: number; total: number }>();
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` encodes every scope input; `attempt` restarts on retry.
  useEffect(() => {
    if (!ready || recordId === undefined) return;
    const controller = new AbortController();
    const client = getWorkerClient();
    const total = 1 + (account ? 1 : 0) + (singleTool ? 0 : tools.length);
    let done = 0;
    const step = () => {
      done += 1;
      if (!controller.signal.aborted) setProgress({ key, done, total });
    };
    setFailure(undefined);
    setProgress({ key, done: 0, total });
    void (async () => {
      const overall = await client.apiMarket(recordId, controller.signal, apiPeriod);
      step();
      const accountDecision = account
        ? await client.apiMarket(recordId, controller.signal, apiPeriod, account)
        : undefined;
      if (account) step();
      const sources: Record<string, MarketDecision> = {};
      if (singleTool && tools[0]) sources[tools[0]] = overall;
      else
        for (const tool of tools) {
          sources[tool] = await client.apiMarket(
            recordId,
            controller.signal,
            apiPeriod,
            undefined,
            [tool],
          );
          step();
        }
      if (!controller.signal.aborted)
        setFetched({ key, overall, account: accountDecision, sources });
    })().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setFailure({ key, interrupted: error instanceof SupersededError });
    });
    return () => controller.abort();
  }, [key, ready, attempt]);

  const current = fetched?.key === key && recordId !== undefined ? fetched : undefined;
  const confirmationDecision = current ? (account ? current.account : current.overall) : undefined;
  const review: ReviewComposition | undefined = useMemo(
    () =>
      confirmationDecision && recordId !== undefined
        ? composeReview({
            decision: confirmationDecision,
            importId: recordId,
            choice,
            billing,
            selected: [],
            partialScan,
            asOf,
          })
        : undefined,
    [confirmationDecision, recordId, choice, billing, partialScan, asOf],
  );
  const workload: StackWorkload | undefined = useMemo(() => {
    if (!current) return undefined;
    let confirmation: StackConfirmation | undefined;
    if (review?.historyConfirmed) {
      if (!account) confirmation = { scope: "all" };
      else {
        const source = current.overall.history?.accounts?.find(
          (entry) => entry.resourceInstanceId === account,
        )?.source;
        if (source)
          confirmation = {
            scope: "account",
            sourceId: source,
            calls: current.account?.history?.calls ?? 0,
            label: choice.accountLabel,
          };
      }
    }
    return {
      period,
      overall: workloadFacts(current.overall),
      importSources: (usageSources ?? [])
        .filter((source) => source.role !== "attribution" && source.events > 0)
        .map((source) => ({ id: source.adapterId, name: source.name, events: source.events })),
      sources: Object.fromEntries(
        Object.entries(current.sources).map(([id, decision]) => [id, workloadFacts(decision)]),
      ),
      confirmation,
      paid: paidForPeriod(billing, period),
      scopeDigest: current.overall.scenarios[0]?.summary.scope.digest,
    };
  }, [current, review, account, choice.accountLabel, period, usageSources, billing]);

  return {
    period,
    workload,
    /** The market result for the overall period scope, for evidence and receipts. */
    overall: current?.overall,
    review,
    scopeDigest: confirmationDecision?.scenarios[0]?.summary.scope.digest,
    accounts: current?.overall.history?.accounts,
    progress: progress?.key === key ? progress : undefined,
    failed: failure?.key === key ? failure : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
