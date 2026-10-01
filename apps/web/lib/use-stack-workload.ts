"use client";

import { useEffect, useMemo, useState } from "react";
import { accountNames, readAccountLabels, subscribeAccountLabels, toolNameOf } from "./accounts";
import type { StackSubscription } from "./current-stack";
import type { MarketDecision } from "./market-decision";
import {
  type BillingFact,
  composeReview,
  periodKey,
  type ReviewChoice,
  type ReviewComposition,
} from "./review-period";
import { assignAccounts, scopeKey, scopesToCompute } from "./stack-accounts";
import {
  paidForPeriod,
  resolveStackPeriod,
  type StackAccount,
  type StackConfirmation,
  type StackPeriod,
  type StackWorkload,
  type WorkloadFacts,
  workloadFacts,
} from "./stack-analysis";
import { getWorkerClient, SupersededError } from "./worker-client";
import type { ImportRecord } from "./worker-protocol";

interface Fetched {
  key: string;
  overall: MarketDecision;
  account?: MarketDecision | undefined;
  sources: Record<string, MarketDecision>;
  scopes: Record<string, MarketDecision>;
}

/** The workload's accounts from a whole-period result: whole-import calls, every tool. */
function recordedAccounts(decision: MarketDecision | undefined) {
  return (decision?.history?.recordedAccounts ?? []).filter((account) => account.calls > 0);
}

/**
 * The selected workload, scoped to the stack's analysis period, as My Stack
 * and Replay's stack scenario read it.
 *
 * It reuses the accepted market calculation the Workload page runs: the whole
 * period (shared with Workload's cache when the scope matches), the confirmed
 * account's scope when a confirmation names one, each recording tool's own
 * calls, and then each set of local accounts the stack's subscriptions are
 * associated with (see `stack-accounts.ts`). The Worker runs one market
 * calculation at a time and a new one replaces the last, so these requests
 * are strictly sequential; results are cached, so relinking an account reuses
 * every scope already priced.
 */
export function useStackWorkload(input: {
  record: ImportRecord | undefined;
  choice: ReviewChoice;
  billing: Record<string, BillingFact>;
  ready: boolean;
  partialScan: boolean;
  /** The stack whose account scopes are priced; absent prices tools only. */
  stack?: readonly StackSubscription[] | undefined;
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
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    const refresh = () => setLabels(readAccountLabels());
    refresh();
    return subscribeAccountLabels(refresh);
  }, []);
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
  // The period (and confirmed account) results arrive first; confirmation controls need only these.
  const [early, setEarly] = useState<Pick<Fetched, "key" | "overall" | "account">>();
  const [failure, setFailure] = useState<{ key: string; interrupted: boolean }>();
  const [progress, setProgress] = useState<{ key: string; done: number; total: number }>();
  const [attempt, setAttempt] = useState(0);

  // Account scopes depend on the stack's links, which can change without
  // re-pricing anything already priced: they are fetched as a second stage.
  const periodResult = early?.key === key && recordId !== undefined ? early : undefined;
  const accountRows = useMemo(
    () =>
      recordedAccounts(periodResult?.overall).map((entry) => ({
        key: entry.key,
        source: entry.source,
      })),
    [periodResult],
  );
  const neededScopes = useMemo(() => {
    if (accountRows.length === 0) return [];
    const assignment = assignAccounts(input.stack ?? [], accountRows);
    // A tool with one account reads its tool slice; only finer scopes are priced.
    const toolsWithOne = new Set(
      [...new Set(accountRows.map((row) => row.source))].filter(
        (source) => accountRows.filter((row) => row.source === source).length === 1,
      ),
    );
    return scopesToCompute(assignment, accountRows).filter((keys) => {
      const sources = [...new Set(keys.map((k) => accountRows.find((r) => r.key === k)?.source))];
      const source = sources[0];
      if (sources.length !== 1 || source === undefined) return true;
      const all = accountRows.filter((row) => row.source === source);
      return !(toolsWithOne.has(source) || all.length === keys.length);
    });
  }, [accountRows, input.stack]);
  const scopeList = neededScopes.map(scopeKey).sort().join("|");

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
      if (!controller.signal.aborted) setEarly({ key, overall, account: accountDecision });
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
        setFetched((old) => ({
          key,
          overall,
          account: accountDecision,
          sources,
          scopes: old?.key === key ? old.scopes : {},
        }));
    })().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setFailure({ key, interrupted: error instanceof SupersededError });
    });
    return () => controller.abort();
  }, [key, ready, attempt]);

  // Second stage: each account scope the stack reads, once the tool results are in.
  const toolsReady = fetched?.key === key;
  const [scopeProgress, setScopeProgress] = useState<{ key: string; pending: number }>();
  // biome-ignore lint/correctness/useExhaustiveDependencies: `scopeList` encodes the scopes; `fetched` is read for cached keys only.
  useEffect(() => {
    if (!ready || recordId === undefined || !toolsReady) return;
    const missing = neededScopes.filter((keys) => !fetched?.scopes[scopeKey(keys)]);
    if (missing.length === 0) return;
    const controller = new AbortController();
    const client = getWorkerClient();
    setScopeProgress({ key, pending: missing.length });
    void (async () => {
      for (const [index, keys] of missing.entries()) {
        const decision = await client.apiMarket(
          recordId,
          controller.signal,
          apiPeriod,
          undefined,
          undefined,
          keys,
        );
        if (controller.signal.aborted) return;
        setFetched((old) =>
          old?.key === key
            ? { ...old, scopes: { ...old.scopes, [scopeKey(keys)]: decision } }
            : old,
        );
        setScopeProgress({ key, pending: missing.length - index - 1 });
      }
    })().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setFailure({ key, interrupted: error instanceof SupersededError });
    });
    return () => controller.abort();
  }, [key, ready, toolsReady, scopeList, attempt]);

  const current = fetched?.key === key && recordId !== undefined ? fetched : undefined;
  const confirmationDecision = periodResult
    ? account
      ? periodResult.account
      : periodResult.overall
    : undefined;
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
  const scopesReady =
    current !== undefined && neededScopes.every((keys) => current.scopes[scopeKey(keys)]);
  const workload: StackWorkload | undefined = useMemo(() => {
    if (!current || !scopesReady) return undefined;
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
            accountKey: account,
            calls: current.account?.history?.calls ?? 0,
            label: choice.accountLabel,
          };
      }
    }
    const scopes: Record<string, WorkloadFacts> = Object.fromEntries(
      Object.entries(current.scopes).map(([id, decision]) => [id, workloadFacts(decision)]),
    );
    const sources = Object.fromEntries(
      Object.entries(current.sources).map(([id, decision]) => [id, workloadFacts(decision)]),
    );
    const recorded = recordedAccounts(current.overall);
    const names = accountNames(recorded, labels);
    const accounts: StackAccount[] = recorded.map((entry) => {
      const sameTool = recorded.filter((other) => other.source === entry.source);
      return {
        key: entry.key,
        source: entry.source,
        calls: entry.calls,
        name: names.get(entry.key) ?? toolNameOf(entry.source),
        facts: sameTool.length === 1 ? sources[entry.source] : scopes[scopeKey([entry.key])],
      };
    });
    return {
      period,
      overall: workloadFacts(current.overall),
      importSources: (usageSources ?? [])
        .filter((source) => source.role !== "attribution" && source.events > 0)
        .map((source) => ({ id: source.adapterId, name: source.name, events: source.events })),
      sources,
      confirmation,
      paid: paidForPeriod(billing, period),
      scopeDigest: current.overall.scenarios[0]?.summary.scope.digest,
      ...(recorded.length > 0 ? { accounts, scopes } : {}),
    };
  }, [
    current,
    scopesReady,
    review,
    account,
    choice.accountLabel,
    period,
    usageSources,
    billing,
    labels,
  ]);
  const pendingScopes =
    current && !scopesReady && scopeProgress?.key === key ? scopeProgress.pending : 0;

  return {
    period,
    workload,
    /** The market result for the overall period scope, for evidence and receipts. */
    overall: current?.overall,
    review,
    scopeDigest: confirmationDecision?.scenarios[0]?.summary.scope.digest,
    accounts: periodResult?.overall.history?.accounts,
    progress:
      progress?.key === key
        ? {
            done: progress.done + (current ? neededScopes.length - pendingScopes : 0),
            total: progress.total + neededScopes.length,
          }
        : undefined,
    failed: failure?.key === key ? failure : undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
