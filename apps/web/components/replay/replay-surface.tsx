"use client";

import {
  bundledApiProviders,
  bundledPlanFacts,
  bundledPlansAt,
  bundledProviderFacts,
} from "@stackreplay/catalog/bundled";
import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import type { ExecutionReplayResultV1, ExecutionTargetV1 } from "@stackreplay/schema";
import { isSyntheticCatalogId } from "@stackreplay/share";
import { Badge, Button, Card, CardContent, Metric } from "@stackreplay/ui";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImportSurface } from "@/components/import/import-surface";
import { ConstraintTrace } from "@/components/instrument/constraint-trace";
import { CostCounterfactual } from "@/components/instrument/cost-counterfactual";
import { CoverageDimensions } from "@/components/instrument/coverage-dimensions";
import { EvidenceLedger } from "@/components/instrument/evidence-ledger";
import { ExecutionStack } from "@/components/instrument/execution-stack";
import { modeLabel } from "@/components/instrument/mode-label";
import { ModelLanes } from "@/components/instrument/model-lanes";
import { OutcomeLedger } from "@/components/instrument/outcome-ledger";
import { MicroLabel } from "@/components/instrument/primitives";
import { ResultSettlement } from "@/components/instrument/result-settlement";
import { WorkloadSpecimen } from "@/components/instrument/workload-specimen";
import { SharePanel } from "@/components/share/share-panel";
import { createRunGuard } from "@/lib/run-guard";
import { describeWorkerFailure, getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord, ModelSummary, SafeError, TimelinePoint } from "@/lib/worker-protocol";

/** Styling for the execution-target switch (M4C). */
function segmentedClass(active: boolean): string {
  return [
    "rounded-md border px-3 py-1.5 text-xs",
    active
      ? "border-accent bg-surface-2 text-foreground"
      : "border-control-border text-muted-foreground",
  ].join(" ");
}

/**
 * Replay surface: the signature product surface (M3 brief).
 *
 * The visual story is deliberate and linear:
 *   your actual workload -> target plan -> replay result -> why
 *
 * Coverage dimensions stay separate and unknown stays visibly unknown. The
 * engine's rules instant is always explicit and shown. Charting code loads
 * dynamically so the result renders immediately.
 */

const ReplayTimeline = dynamic(() => import("./replay-timeline"), {
  ssr: false,
  loading: () => (
    <p className="text-xs text-muted-foreground" data-testid="timeline-loading">
      <div className="h-40 animate-pulse rounded-md border border-border bg-surface-2" />
    </p>
  ),
});

type Phase = "idle" | "loading" | "replaying" | "done";

/**
 * Engine warnings are written for a CLI result surface and may name rule
 * enums verbatim ("a latch_until_reset rule"); this UI humanizes them exactly
 * like the constraint detail rows do.
 */
function humanizeWarningMessage(message: string): string {
  return message.replaceAll("_", " ");
}

interface ReplayOutcome {
  result: ExecutionReplayResultV1;
  timeline: TimelinePoint[];
  /** The display contract for the same result (M4D). */
  projection: ProjectedReplayV1;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Plan and economic amounts are money and always render with cents, so $50 and
 * $50.00 can never appear in the same column. Amounts are rounded for display
 * only; the exported result keeps the exact decimal string.
 */
function formatMoney(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `$${amount}`;
  const [whole = "0", cents = "00"] = value.toFixed(2).split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ",")}.${cents}`;
}

export function ReplaySurface({
  initialImportId,
  initialTarget,
}: {
  initialImportId?: string | undefined;
  /** Plan id preselected from a public plan page, never a workload detail. */
  initialTarget?: string | undefined;
}) {
  const client = getWorkerClient();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialImportId);
  const [rulesAsOf, setRulesAsOf] = useState<string>(todayUtc());
  const [query, setQuery] = useState("");
  const [planId, setPlanId] = useState<string | undefined>(initialTarget);
  /**
   * Which kind of execution target this surface replays against (M4C). A
   * subscription plan is the default; a Direct API target prices the same
   * workload at the selected provider's published list prices instead, with no
   * plan, allowance or admission involved.
   */
  const [targetKind, setTargetKind] = useState<"subscription" | "api">("subscription");
  const [providerId, setProviderId] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<ReplayOutcome | undefined>(undefined);
  /**
   * What the displayed result was computed from. The panel reads its labels from
   * the result itself, and this record lets it say which workload produced it
   * (benchmark finding F026).
   */
  const [outcomeSelection, setOutcomeSelection] = useState<
    { workloadLabel: string; workloadId: string; target: string; rulesAsOf: string } | undefined
  >(undefined);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  /**
   * Every replay is tagged with the selection it was run for. A response whose
   * tag is no longer current is dropped instead of displayed (finding F026,
   * extended to a run that is still in flight when the target changes).
   */
  const guardRef = useRef<ReturnType<typeof createRunGuard> | null>(null);
  if (guardRef.current === null) guardRef.current = createRunGuard();
  const guard = guardRef.current;

  /** Drops the displayed result and any replay still in flight for it. */
  const dropResult = useCallback(() => {
    guard.invalidate();
    setOutcome(undefined);
    setOutcomeSelection(undefined);
    setPhase("idle");
  }, [guard]);

  const plans = useMemo(() => bundledPlansAt(rulesAsOf), [rulesAsOf]);
  const filteredPlans = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return plans;
    return plans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(needle) ||
        plan.id.toLowerCase().includes(needle) ||
        plan.providerId.toLowerCase().includes(needle),
    );
  }, [plans, query]);

  const selectedPlan = useMemo(
    () =>
      filteredPlans.find((plan) => plan.id === planId) ?? plans.find((plan) => plan.id === planId),
    [filteredPlans, planId, plans],
  );

  /**
   * Providers a Direct API replay can be run against. The list comes from the
   * same bundled catalog the worker replays against, and each entry carries the
   * counts a visitor needs: how many models the catalog records this provider as
   * offering, and how many of those have API list prices, so a replay that can
   * only price part of the demand says so before it runs.
   */
  const providers = useMemo(() => bundledApiProviders(rulesAsOf), [rulesAsOf]);
  const filteredProviders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return providers;
    return providers.filter(
      (provider) =>
        provider.name.toLowerCase().includes(needle) || provider.id.toLowerCase().includes(needle),
    );
  }, [providers, query]);
  const selectedProvider = useMemo(
    () =>
      filteredProviders.find((provider) => provider.id === providerId) ??
      providers.find((provider) => provider.id === providerId),
    [filteredProviders, providerId, providers],
  );
  const targetReady =
    targetKind === "api" ? selectedProvider !== undefined : selectedPlan !== undefined;
  /**
   * The workload the surface is working on, and only that one.
   *
   * A stale `?import=` used to be answered with `imports[0]`, so a link naming a
   * workload that is no longer stored silently replayed a different one
   * (benchmark finding F027). The surface now says the named workload is gone and
   * waits to be told which one to use.
   */
  const workload = useMemo(
    () => imports.find((entry) => entry.id === selectedId),
    [imports, selectedId],
  );
  const requestedWorkloadMissing = selectedId !== undefined && workload === undefined;

  // The first-run intake changes only this route's query string. React keeps
  // the Replay surface mounted, so the selected id must follow the new prop.
  useEffect(() => {
    if (initialImportId !== undefined) setSelectedId(initialImportId);
  }, [initialImportId]);

  /**
   * The bundled demo workloads are synthetic and use the `example-` model
   * namespace, so they only map onto the synthetic demo plans. Saying so beats a
   * result that reads as a failure when a visitor replays a demo against a
   * catalogued plan.
   */
  const selectedWorkloadIsDemo = useMemo(() => {
    const models = workload?.summary.models ?? [];
    return models.length > 0 && models.every((model) => model.rawName.startsWith("example-"));
  }, [workload]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await client.listImports();
        if (cancelled) return;
        setImports(list);
        if (initialImportId === undefined && list.length > 0) setSelectedId(list[0]?.id);
      } catch {
        if (!cancelled) setImports([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, initialImportId]);

  const runReplay = useCallback(async () => {
    const target: ExecutionTargetV1 | undefined =
      targetKind === "api"
        ? selectedProvider === undefined
          ? undefined
          : { type: "api", providerId: selectedProvider.id }
        : selectedPlan === undefined
          ? undefined
          : { type: "subscription", planId: selectedPlan.id };
    if (workload === undefined || target === undefined) return;
    const token = guard.begin();
    setPhase("loading");
    setError(undefined);
    setOutcome(undefined);
    setOutcomeSelection(undefined);
    try {
      const response = await client.runReplay(
        workload.id,
        target,
        rulesAsOf,
        (next, nextDetail) => {
          if (!guard.isCurrent(token)) return;
          setPhase(next === "loading" ? "loading" : "replaying");
          setDetail(nextDetail);
        },
      );
      // The target, workload or rules date may have changed while this ran: the
      // result belongs to a selection the surface no longer shows.
      if (!guard.isCurrent(token)) return;
      setOutcome(response);
      setOutcomeSelection({
        workloadLabel: workload.label,
        workloadId: workload.id,
        target: target.type === "api" ? target.providerId : (selectedPlan?.id ?? ""),
        rulesAsOf,
      });
      setPhase("done");
    } catch (failure) {
      if (!guard.isCurrent(token)) return;
      // A superseded request is not a failure: a newer replay owns this surface.
      if (failure instanceof SupersededError) return;
      setError(describeWorkerFailure(failure));
      setPhase("idle");
    }
  }, [client, guard, rulesAsOf, selectedPlan, selectedProvider, targetKind, workload]);

  /**
   * Choosing a different target or rules date drops the displayed result: it was
   * computed for the previous selection, and leaving it on screen under the new
   * labels described a replay that never ran (benchmark finding F026).
   */
  const selectPlan = useCallback(
    (id: string) => {
      setPlanId(id);
      dropResult();
    },
    [dropResult],
  );

  const selectProvider = useCallback(
    (id: string) => {
      setProviderId(id);
      dropResult();
    },
    [dropResult],
  );

  /**
   * Switching the target kind drops the displayed result for the same reason
   * choosing a different target does: the panel would otherwise describe a
   * replay that was never run against what the surface now shows.
   */
  const selectTargetKind = useCallback(
    (kind: "subscription" | "api") => {
      setTargetKind(kind);
      dropResult();
    },
    [dropResult],
  );

  const onPlanKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (filteredPlans.length === 0) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = Math.min(Math.max(activeIndex + delta, 0), filteredPlans.length - 1);
        setActiveIndex(next);
        const option = filteredPlans[next];
        if (option !== undefined) selectPlan(option.id);
        const node = listRef.current?.querySelectorAll<HTMLElement>("[data-plan-option]")[next];
        node?.focus();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void runReplay();
      }
    },
    [activeIndex, filteredPlans, runReplay, selectPlan],
  );

  if (imports.length === 0) {
    return (
      <div data-testid="replay-empty">
        <ImportSurface initialImports={[]} initialTarget={initialTarget} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {requestedWorkloadMissing ? (
        <Card role="alert" className="border-warning/40" data-testid="workload-missing">
          <CardContent className="flex flex-col gap-2 p-5">
            <h2 className="text-sm font-medium text-warning">
              That workload is no longer stored in this browser
            </h2>
            <p className="text-sm text-muted-foreground">
              It was deleted or cleared, so this page will not substitute a different one. Choose a
              stored workload below, or import the file again.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <WorkloadStrip
        workload={workload}
        imports={imports}
        onSelect={(id) => {
          setSelectedId(id);
          dropResult();
        }}
      />

      <Card className="rounded-none border-x-0 border-b-0 bg-transparent p-0">
        <CardContent className="flex flex-col gap-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">Execution target</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {targetKind === "api" ? (
                  <>
                    A Direct API target applies the selected provider&apos;s published API list
                    prices to every recorded event. No plan, allowance, admission or reset is
                    simulated, and no discount, batch price, tax or negotiated rate is assumed.
                    Prices are the catalog&apos;s records in force at the rules date.
                  </>
                ) : (
                  <>
                    Catalogued plans are the real, sourced entries the public pages describe. The
                    synthetic <span className="font-mono text-xs">example-</span> plans are demos
                    kept for trying the replay mechanics; each one is labelled and none of them is a
                    real-world claim.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Rules as of
                <input
                  type="date"
                  value={rulesAsOf}
                  data-testid="rules-as-of"
                  onChange={(event) => {
                    setRulesAsOf(event.target.value);
                    dropResult();
                  }}
                  className="rounded-md border border-control-border bg-surface px-2 py-1.5 font-mono text-sm tabular-nums"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <fieldset className="flex flex-col gap-2" data-testid="target-kind">
              <legend className="text-xs uppercase tracking-widest text-muted-foreground">
                Target kind
              </legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={targetKind === "subscription"}
                  data-testid="target-kind-subscription"
                  onClick={() => selectTargetKind("subscription")}
                  className={segmentedClass(targetKind === "subscription")}
                >
                  Subscription plan
                </button>
                <button
                  type="button"
                  aria-pressed={targetKind === "api"}
                  data-testid="target-kind-api"
                  onClick={() => selectTargetKind("api")}
                  className={segmentedClass(targetKind === "api")}
                >
                  Direct API list prices
                </button>
              </div>
            </fieldset>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {targetKind === "api" ? "Find a provider" : "Find a plan"}
              <input
                type="search"
                value={query}
                placeholder={
                  targetKind === "api"
                    ? "Search providers or IDs"
                    : "Search plans, providers, or IDs"
                }
                data-testid="plan-search"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                className="w-full max-w-sm rounded-md border border-control-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            {selectedWorkloadIsDemo ? (
              <p
                className="max-w-xl text-xs text-muted-foreground"
                data-testid="demo-workload-note"
              >
                {targetKind === "api"
                  ? "This workload is one of the bundled synthetic demos, so its models belong to the demo catalog. Its models are offered by the demo providers (example-cloud, example-open); a catalogued provider will report them as unavailable rather than price them."
                  : "This workload is one of the bundled synthetic demos, so its models belong to the demo catalog. It replays against a demo plan; import your own export to replay against a catalogued plan."}
              </p>
            ) : null}
            {targetKind === "api" ? (
              <ul
                aria-label="Direct API providers"
                data-testid="provider-list"
                className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border"
              >
                {filteredProviders.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">
                    No catalogued provider is recorded as offering a model.
                  </li>
                ) : (
                  filteredProviders.map((provider) => (
                    <li key={provider.id}>
                      <button
                        type="button"
                        aria-pressed={provider.id === providerId}
                        data-provider-option={provider.id}
                        data-testid={`provider-${provider.id}`}
                        onClick={() => selectProvider(provider.id)}
                        className={[
                          "flex w-full items-baseline justify-between gap-4 border-l-2 px-3 py-2.5 text-left",
                          provider.id === providerId
                            ? "border-accent bg-surface-2"
                            : "border-transparent bg-transparent",
                        ].join(" ")}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">
                            {provider.name}
                            {isSyntheticCatalogId(provider.id) ? (
                              <span className="ml-2 rounded border border-warning/50 px-1 text-[10px] text-warning">
                                demo
                              </span>
                            ) : null}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {provider.id} · {formatCount(provider.pricedModelCount)} of{" "}
                            {formatCount(provider.modelCount)} offered models have API list prices
                            in force at this rules date
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {provider.verificationStatus}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <ul
                ref={listRef}
                aria-label="Target plans"
                data-testid="plan-list"
                onKeyDown={onPlanKeyDown}
                className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border"
              >
                {filteredPlans.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">
                    No plan is effective at this rules date.
                  </li>
                ) : (
                  filteredPlans.map((plan, index) => (
                    <li key={plan.id}>
                      <button
                        type="button"
                        aria-pressed={plan.id === planId}
                        data-plan-option={plan.id}
                        data-testid={`plan-${plan.id}`}
                        onClick={() => selectPlan(plan.id)}
                        onFocus={() => setActiveIndex(index)}
                        className={[
                          "flex w-full items-baseline justify-between gap-4 border-l-2 px-3 py-2.5 text-left",
                          plan.id === planId
                            ? "border-accent bg-surface-2"
                            : "border-transparent bg-transparent",
                        ].join(" ")}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm">
                            {plan.name}
                            {isSyntheticCatalogId(plan.id) ? (
                              <span className="ml-2 rounded border border-warning/50 px-1 text-[10px] text-warning">
                                demo
                              </span>
                            ) : null}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {plan.providerId} · rules from {plan.effectiveFrom}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-sm tabular-nums">
                          {formatMoney(plan.price.amount)}/{plan.price.interval}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {targetKind === "api" ? (
            selectedProvider === undefined ? null : (
              <div
                className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
                data-testid="provider-facts"
              >
                <Badge variant="outline">{selectedProvider.id}</Badge>
                <span>
                  {formatCount(selectedProvider.pricedModelCount)} of{" "}
                  {formatCount(selectedProvider.modelCount)} offered models carry API list prices in
                  force at this rules date
                </span>
                {selectedProvider.pricedModelCount === 0 ? (
                  <span className="text-warning" data-testid="provider-unpriced-note">
                    No model this provider offers has an API list price record, so a replay will
                    report the demand as unpriced rather than invent a cost.
                  </span>
                ) : null}
                <Badge
                  variant={
                    selectedProvider.verificationStatus === "verified" ? "positive" : "warning"
                  }
                >
                  catalog: {selectedProvider.verificationStatus}
                </Badge>
              </div>
            )
          ) : selectedPlan !== undefined ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline">{selectedPlan.versionId}</Badge>
              <span>
                {selectedPlan.limitCount} limit {selectedPlan.limitCount === 1 ? "rule" : "rules"}
              </span>
              <span>
                {selectedPlan.modelCount} model {selectedPlan.modelCount === 1 ? "rule" : "rules"}
              </span>
              <Badge
                variant={selectedPlan.verificationStatus === "verified" ? "positive" : "warning"}
              >
                catalog: {selectedPlan.verificationStatus}
              </Badge>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              data-testid="run-replay"
              disabled={
                !targetReady ||
                workload === undefined ||
                phase === "loading" ||
                phase === "replaying"
              }
              onClick={() => void runReplay()}
            >
              {phase === "loading" || phase === "replaying" ? "Replaying…" : "Replay this workload"}
            </Button>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {phase === "idle"
                ? "Nothing is uploaded; replay runs in this browser."
                : (detail ?? "Working in a background Worker.")}
            </span>
          </div>
        </CardContent>
      </Card>

      {error !== undefined ? (
        <Card role="alert" className="border-negative/40" data-testid="replay-error">
          <CardContent className="flex flex-col gap-2 p-5">
            <h2 className="text-sm font-medium text-negative">{error.title}</h2>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {error.hint !== undefined ? (
              <p className="text-xs text-muted-foreground">{error.hint}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {outcome !== undefined ? (
        <ReplayResult
          outcome={outcome}
          computedFor={outcomeSelection}
          workload={imports.find((entry) => entry.id === outcomeSelection?.workloadId)}
        />
      ) : null}
    </div>
  );
}

function WorkloadStrip({
  workload,
  imports,
  onSelect,
}: {
  workload: ImportRecord | undefined;
  imports: ImportRecord[];
  onSelect: (id: string) => void;
}) {
  if (workload === undefined) return null;
  const { summary } = workload;
  const range =
    summary.firstEventAt !== undefined && summary.lastEventAt !== undefined
      ? `${summary.firstEventAt.slice(0, 10)} to ${summary.lastEventAt.slice(0, 10)}`
      : "unknown";
  return (
    <Card
      data-testid="workload-strip"
      className="min-w-0 rounded-none border-x-0 border-b-0 bg-transparent p-0"
    >
      <CardContent className="flex min-w-0 flex-col gap-4 py-5">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-full">
            <h2 className="text-sm font-medium">Your actual workload</h2>
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {workload.label} · {range}
            </p>
          </div>
          {imports.length > 1 ? (
            <label className="flex w-full min-w-0 max-w-full flex-col gap-1 text-xs text-muted-foreground sm:w-auto sm:max-w-xs">
              Stored workload
              <select
                value={workload.id}
                data-testid="workload-select"
                onChange={(event) => onSelect(event.target.value)}
                className="block w-full min-w-0 max-w-full rounded-md border border-control-border bg-surface px-2 py-1.5 text-sm"
              >
                {imports.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Events" value={formatCount(summary.eventCount)} size="lg" />
          <Metric label="Known tokens" value={formatCount(summary.tokens.known)} />
          <Metric label="Sessions" value={formatCount(summary.sessionCount)} />
          <Metric
            label="Unknown usage"
            value={formatCount(summary.tokens.unknownEvents)}
            unit="events"
            tone={summary.tokens.unknownEvents > 0 ? "warning" : "default"}
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {summary.usageSources.map((source) => (
            <span key={source.adapterId}>
              {source.name}:{" "}
              <span className="font-mono tabular-nums">{formatCount(source.events)}</span>
            </span>
          ))}
        </div>
        <ModelIdentityList models={summary.models} />
      </CardContent>
    </Card>
  );
}

/**
 * How each observed model name maps onto the catalog (M4A).
 *
 * The observed identifier is always shown as it was reported, next to the
 * canonical model it was resolved to and the basis for that mapping. Identifiers
 * the catalog cannot justify are listed as unmapped, because leaving a name
 * unresolved and saying so is the honest outcome: nothing here guesses an
 * identity from a similar-looking name.
 */
function ModelIdentityList({ models }: { models: ModelSummary[] }) {
  if (models.length === 0) return null;
  const ordered = [...models].sort((a, b) => b.events - a.events);
  const unmapped = ordered.filter((model) => !model.mapped).length;
  const basisLabel: Record<NonNullable<ModelSummary["basis"]>, string> = {
    canonical_id: "exact id",
    canonical_name: "catalog name",
    alias: "catalog alias",
  };
  return (
    <div data-testid="model-identities" className="border-t border-border pt-4">
      <h3 className="text-xs font-medium text-muted-foreground">Models in this workload</h3>
      <ul className="mt-2 flex flex-col gap-1 font-mono text-xs">
        {ordered.slice(0, 12).map((model) => (
          <li key={model.rawName} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="min-w-0 text-foreground [overflow-wrap:anywhere]">
              {model.rawName}
            </span>
            {model.mapped ? (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
                <span className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
                  {model.canonicalId}
                </span>
                <span className="rounded border border-border px-1 text-[10px] text-muted-foreground">
                  {model.basis === undefined ? "mapped" : basisLabel[model.basis]}
                </span>
              </>
            ) : (
              <span className="rounded border border-border px-1 text-[10px] text-warning">
                unmapped
              </span>
            )}
            <span className="tabular-nums text-muted-foreground">
              {formatCount(model.events)} events
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        {unmapped === 0
          ? "Every observed model name resolved to a catalog model."
          : `${formatCount(unmapped)} observed model ${unmapped === 1 ? "name" : "names"} did not resolve. Unresolved names are left unmapped and reported: StackReplay never guesses a model identity.`}
      </p>
    </div>
  );
}

/**
 * The result composition: one primary result, then the detail behind it.
 *
 * Everything above the detail rule is the projection read back: the engine's own
 * status word, the request dimension, the three coverage dimensions kept apart,
 * the target stack, the constraints with their recorded crossings, the
 * dispositions, the cost basis and the evidence ledger. Nothing here recomputes
 * a figure the engine produced or restates one in its own words.
 *
 * The detail section carries what the instrument does not: the day-by-day shape
 * of the workload, the engine's warnings, the scope and reset disclaimers, and
 * the provenance rows an audit asks for. The share panel is last, because
 * possession of that URL is access to every number above it.
 */
function ReplayResult({
  outcome,
  computedFor,
  workload,
}: {
  outcome: ReplayOutcome;
  /** What this result was computed from; may be absent for older callers. */
  computedFor: { workloadLabel: string; target: string; rulesAsOf: string } | undefined;
  workload: ImportRecord | undefined;
}) {
  const { result, timeline, projection } = outcome;
  const apiTarget = projection.target.kind === "api";
  const translated = projection.mode === "translated";
  /**
   * Each rule's declared behaviour, by constraint id. The timeline classifies a
   * crossing by what its rule declared it does, never by which quantities the
   * violation happens to carry: a record-only rule measures overage units
   * without billing anything.
   */
  const constraintBehaviours = useMemo(
    () =>
      new Map<string, ProjectedReplayV1["constraints"][number]["exceed"]>(
        projection.constraints.map((constraint) => [constraint.id, constraint.exceed]),
      ),
    [projection.constraints],
  );
  const planVersionId = projection.target.planVersionId;
  const shareTarget =
    apiTarget || planVersionId === undefined ? undefined : bundledPlanFacts(planVersionId);
  const providerFacts =
    apiTarget && projection.provenance.apiProvider !== undefined
      ? bundledProviderFacts(projection.provenance.apiProvider)
      : undefined;
  // Attribution comes from the stored workload, never from the current
  // selection: the panel describes the replay that ran (benchmark finding F026).
  const attribution = workload?.summary.usageSources
    .filter((source) => source.role === "usage" && source.events > 0)
    .map((source) => ({ name: source.name, eventCount: source.events }));
  const targetName = providerFacts?.name ?? shareTarget?.planName ?? projection.target.label;

  return (
    <div className="flex min-w-0 flex-col gap-7" data-testid="replay-result">
      <section className="flex flex-col gap-5" data-testid="replay-headline">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Replay result</p>
            <h2 className="mt-1 text-2xl font-medium" data-testid="headline-status">
              {projection.headline.statusLabel}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {targetName} · {projection.target.referenceLabel}{" "}
              <span className="font-mono">{projection.target.reference}</span> · rules as of{" "}
              <span className="font-mono tabular-nums">{projection.provenance.rulesAsOf}</span>
            </p>
            {computedFor === undefined ? null : (
              <p
                className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]"
                data-testid="result-computed-for"
              >
                Computed from &ldquo;{computedFor.workloadLabel}&rdquo; ·{" "}
                {formatCount(result.workload.eventCount)} events · target{" "}
                <span className="font-mono">{computedFor.target}</span> · rules as of{" "}
                <span className="font-mono">{computedFor.rulesAsOf}</span>
              </p>
            )}
          </div>
          <span
            className="border border-border px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase"
            data-testid="replay-mode"
          >
            {/* The badge states the result's own mode, so a result carrying none
                is not labelled with the mode it certainly did not apply. */}
            {modeLabel(projection.mode)}
          </span>
        </div>

        <ResultSettlement projection={projection} settled />
        <CoverageDimensions index="01" projection={projection} />
        <p
          className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
          data-testid="replay-mode-note"
        >
          {projection.modeNote}
        </p>
      </section>

      <div className="flex max-w-[80rem] min-w-0 flex-col gap-6">
        <WorkloadSpecimen active index="02" projection={projection} />
        <ModelLanes
          identityActive
          index="03"
          projection={projection}
          translationActive={translated}
        />
        <ExecutionStack index="04" projection={projection} targetActive />
        <ConstraintTrace chronologyActive index="05" projection={projection} />
        <OutcomeLedger index="06" projection={projection} settled />
        <EvidenceLedger index="07" projection={projection} />
        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 className="text-sm text-foreground" data-testid="cost-heading">
            Cost on this target
          </h2>
          <CostCounterfactual index="08" projection={projection} settled />
        </section>
      </div>

      <section
        className="flex flex-col gap-6 border-t border-border pt-6"
        data-testid="replay-detail"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Detail and provenance</h2>
          <MicroLabel>the same recorded crossings, day by day</MicroLabel>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-5 p-5">
            <h3 className="text-sm font-medium">
              {apiTarget ? "Activity over the workload window" : "When this plan would have failed"}
            </h3>
            <p className="text-xs text-muted-foreground" data-testid="timeline-note">
              {apiTarget
                ? "A Direct API target rejects nothing, so there are no failure windows to shade. The bars show the recorded activity the list prices were applied to."
                : "Shaded bands are the windows where the target's own rules would have pushed back on this workload."}
            </p>
            <ReplayTimeline
              behaviours={constraintBehaviours}
              points={timeline}
              violations={result.violations}
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium">Calculation details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <Detail label="Engine" value={projection.provenance.engineVersion} />
              <Detail label="Methodology" value={projection.provenance.methodologyVersion} />
              <Detail label="Catalog" value={projection.provenance.catalogVersion.slice(0, 22)} />
              <Detail label="Rules as of" value={projection.provenance.rulesAsOf} />
              <Detail
                label={apiTarget ? "Direct API provider" : "Plan version"}
                value={projection.target.reference}
              />
              <Detail label="Events replayed" value={formatCount(result.workload.eventCount)} />
            </dl>
            {result.warnings.length > 0 ? (
              <div data-testid="replay-warnings">
                <h3 className="text-xs font-medium text-muted-foreground">Warnings</h3>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {result.warnings.map((warning) => (
                    <li key={warning.code}>
                      {humanizeWarningMessage(warning.message)}
                      {warning.eventCount === undefined
                        ? ""
                        : ` (${formatCount(warning.eventCount)} events)`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.unsupportedModels.length > 0 ? (
              <div data-testid="unserved-models">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Models this target does not serve
                </h3>
                <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                  {result.unsupportedModels.slice(0, 8).map((model) => (
                    <li key={model.rawName} className="[overflow-wrap:anywhere]">
                      {model.rawName} · {formatCount(model.eventCount)} events · {model.reason}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Consumption for these identifiers is left unknown rather than estimated. A name
                  StackReplay cannot map to the catalog is never guessed at.
                </p>
              </div>
            ) : null}
            {workload === undefined ? null : (
              <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                Workload stored locally in this browser: {workload.label}. No workload data has left
                this browser.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">What this result is not</h3>
            <p
              className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
              data-testid="replay-scope"
            >
              {projection.provenance.workloadScope}
            </p>
            <p
              className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
              data-testid="replay-reset-phase"
            >
              {projection.provenance.resetPhase}
            </p>
          </div>
        </div>
      </section>

      {/* The panel is always present: a result that cannot become a link says
          why (a Direct API target has no plan facts a V1 link could carry). */}
      <SharePanel
        result={result}
        {...(shareTarget === undefined ? {} : { target: shareTarget })}
        {...(attribution === undefined ? {} : { attribution })}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}
