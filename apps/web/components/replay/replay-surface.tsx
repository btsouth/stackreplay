"use client";

import { bundledPlanFacts, bundledPlansAt } from "@stackreplay/catalog/bundled";
import type {
  ExecutionReplayResultV1,
  ExecutionTargetV1,
  ReplaySemanticsV1,
} from "@stackreplay/schema";
import { isSyntheticCatalogId } from "@stackreplay/share";
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardContent,
  ConfidenceBadge,
  type ConstraintState,
  ConstraintStatus,
  Metric,
} from "@stackreplay/ui";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SharePanel } from "@/components/share/share-panel";
import { DISPOSITION_ROWS, replayModeNote, resetNote } from "@/lib/replay-disclosure";
import { describeWorkerFailure, getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord, ModelSummary, SafeError, TimelinePoint } from "@/lib/worker-protocol";

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
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function constraintStateOf(status: string): ConstraintState {
  switch (status) {
    case "pass":
      return "pass";
    case "exceeded":
      return "exceeded";
    case "unknown":
      return "unknown";
    default:
      return "not-applicable";
  }
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Display formatting for engine values. These functions never feed a value back
 * into a calculation: the engine works in exact decimal strings and temporal
 * units, and everything here is presentation only.
 *
 * Coverage percentages are shown to one decimal place, with a clean 100% at the
 * top and 0% at the floor, because the raw engine value (67.9833%) is precision
 * nobody reads. The exact value stays available in the title attribute.
 */
function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "unknown";
  const rounded = Math.round(value * 10) / 10;
  if (rounded >= 100) return "100%";
  if (rounded <= 0) return "0%";
  return `${rounded.toFixed(1)}%`;
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

/** Units come from the canonical schema; currency reads as USD, not usd. */
function formatUnit(unit: string): string {
  return unit.toLowerCase() === "usd" ? "USD" : unit;
}

/**
 * A quantity in its own unit: money renders as money, and everything else keeps
 * the canonical unit text next to a grouped number. Currency amounts never
 * repeat a unit the currency symbol already carries, so no phrase reads
 * "$2.11 USD".
 */
function quantityPhrase(value: string, unit: string): string {
  return unit.toLowerCase() === "usd"
    ? formatMoney(value)
    : `${groupQuantity(value)} ${formatUnit(unit)}`;
}

/**
 * Groups the digits of an exact decimal string (thousands separators) without
 * changing a single digit. Constraint quantities arrive from the engine as
 * decimal strings, and they sit next to metrics that already use separators;
 * ungrouped seven-digit numbers in the same card read as a different product.
 */
function groupQuantity(value: string): string {
  const [whole = "", fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
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
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<ReplayOutcome | undefined>(undefined);
  /**
   * What the displayed result was computed from. The panel reads its labels from
   * the result itself, and this record lets it say which workload produced it
   * (benchmark finding F026).
   */
  const [outcomeSelection, setOutcomeSelection] = useState<
    { workloadLabel: string; workloadId: string; planId: string; rulesAsOf: string } | undefined
  >(undefined);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

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
    if (workload === undefined || selectedPlan === undefined) return;
    setPhase("loading");
    setError(undefined);
    setOutcome(undefined);
    setOutcomeSelection(undefined);
    const target: ExecutionTargetV1 = { type: "subscription", planId: selectedPlan.id };
    try {
      const response = await client.runReplay(
        workload.id,
        target,
        rulesAsOf,
        (next, nextDetail) => {
          setPhase(next === "loading" ? "loading" : "replaying");
          setDetail(nextDetail);
        },
      );
      setOutcome(response);
      setOutcomeSelection({
        workloadLabel: workload.label,
        workloadId: workload.id,
        planId: selectedPlan.id,
        rulesAsOf,
      });
      setPhase("done");
    } catch (failure) {
      // A superseded request is not a failure: a newer replay owns this surface.
      if (failure instanceof SupersededError) return;
      setError(describeWorkerFailure(failure));
      setPhase("idle");
    }
  }, [client, rulesAsOf, selectedPlan, workload]);

  /**
   * Choosing a different target or rules date drops the displayed result: it was
   * computed for the previous selection, and leaving it on screen under the new
   * labels described a replay that never ran (benchmark finding F026).
   */
  const selectPlan = useCallback((id: string) => {
    setPlanId(id);
    setOutcome(undefined);
    setOutcomeSelection(undefined);
    setPhase("idle");
  }, []);

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
      <Card data-testid="replay-empty">
        <CardContent className="flex flex-col gap-3 p-6">
          <h2 className="text-sm font-medium">No workload yet</h2>
          <p className="text-sm text-muted-foreground">
            Replay needs a workload. Import a StackReplay export, or start from a demo workload.
            Everything stays in this browser.
          </p>
          <div>
            <Link href="/app/import" className={buttonVariants({ size: "sm" })}>
              Import a workload
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
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
          setOutcome(undefined);
          setOutcomeSelection(undefined);
          setPhase("idle");
        }}
      />

      <Card>
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">Target plan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Catalogued plans are the real, sourced entries the public pages describe. The
                synthetic <span className="font-mono text-xs">example-</span> plans are demos kept
                for trying the replay mechanics; each one is labelled and none of them is a
                real-world claim.
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
                    setOutcome(undefined);
                    setOutcomeSelection(undefined);
                  }}
                  className="rounded-md border border-control-border bg-surface px-2 py-1.5 font-mono text-sm tabular-nums"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Find a plan
              <input
                type="search"
                value={query}
                placeholder="Search plans, providers, or IDs"
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
                This workload is one of the bundled synthetic demos, so its models belong to the
                demo catalog. It replays against a demo plan; import your own export to replay
                against a catalogued plan.
              </p>
            ) : null}
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
          </div>

          {selectedPlan !== undefined ? (
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
                selectedPlan === undefined ||
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
    <Card data-testid="workload-strip">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium">Your actual workload</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {workload.label} · {range}
            </p>
          </div>
          {imports.length > 1 ? (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Stored workload
              <select
                value={workload.id}
                data-testid="workload-select"
                onChange={(event) => onSelect(event.target.value)}
                className="rounded-md border border-control-border bg-surface px-2 py-1.5 text-sm"
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
          <li key={model.rawName} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-foreground">{model.rawName}</span>
            {model.mapped ? (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  →
                </span>
                <span className="text-muted-foreground">{model.canonicalId}</span>
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

function ReplayResult({
  outcome,
  computedFor,
  workload,
}: {
  outcome: ReplayOutcome;
  /** What this result was computed from; may be absent for older callers. */
  computedFor: { workloadLabel: string; planId: string; rulesAsOf: string } | undefined;
  workload: ImportRecord | undefined;
}) {
  const { result, timeline } = outcome;
  const shareTarget = bundledPlanFacts(result.versions.targetReference);
  // Every label comes from the result, never from the surface's current
  // selection: the panel describes the replay that ran (benchmark finding F026).
  const planLabel = shareTarget?.planName ?? result.versions.targetReference;
  const attribution = workload?.summary.usageSources
    .filter((source) => source.role === "usage" && source.events > 0)
    .map((source) => ({ name: source.name, eventCount: source.events }));
  const [focusedViolation, setFocusedViolation] = useState<string | undefined>(undefined);
  const headline =
    result.feasibility.status === "full"
      ? "Fully served"
      : result.feasibility.status === "partial"
        ? "Partly served"
        : result.feasibility.status === "none"
          ? "Not served"
          : "Unknown";

  return (
    <div className="flex flex-col gap-6" data-testid="replay-result">
      <Card data-testid="replay-headline">
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Replay result</p>
              <h2 className="mt-1 text-2xl font-medium" data-testid="headline-status">
                {headline}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {planLabel} · rules as of{" "}
                <span className="font-mono tabular-nums">{result.versions.rulesAsOf}</span>
              </p>
              {computedFor === undefined ? null : (
                <p className="mt-1 text-xs text-muted-foreground" data-testid="result-computed-for">
                  Computed from &ldquo;{computedFor.workloadLabel}&rdquo; ·{" "}
                  {formatCount(result.workload.eventCount)} events · target{" "}
                  <span className="font-mono">{computedFor.planId}</span> · rules as of{" "}
                  <span className="font-mono">{computedFor.rulesAsOf}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result.semantics === undefined ? null : (
                <Badge
                  variant={result.semantics.mode === "translated" ? "warning" : "neutral"}
                  data-testid="replay-mode"
                >
                  {result.semantics.mode === "translated" ? "Translated replay" : "Exact replay"}
                </Badge>
              )}
              <ConfidenceBadge level={result.confidence.level} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <CoverageDimension
              title="Historical request coverage"
              dimension={result.coverage.requests}
              testId="coverage-requests"
            />
            <CoverageDimension
              title="Usage coverage"
              dimension={result.coverage.usage}
              testId="coverage-usage"
            />
            <CoverageDimension
              title="Model coverage"
              dimension={result.coverage.models}
              testId="coverage-models"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Dimensions stay separate on purpose: one blended score would hide which question each
            number answers.
          </p>
        </CardContent>
      </Card>

      {result.constraints.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="text-sm font-medium">Constraints</h2>
            <ul className="flex flex-col divide-y divide-border" data-testid="constraints">
              {result.constraints.map((constraint) => (
                <li key={constraint.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">{constraint.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {constraint.kind.replaceAll("_", " ")} · {constraint.window.description} ·{" "}
                        {constraint.exceed.replaceAll("_", " ")}
                      </p>
                    </div>
                    <ConstraintStatus
                      state={constraintStateOf(constraint.status)}
                      detail={[
                        `${quantityPhrase(constraint.consumedUnits, constraint.unit)} accepted`,
                        constraint.window.kind === "rolling"
                          ? `limit ${quantityPhrase(constraint.limitUnits, constraint.unit)} per window`
                          : `limit ${quantityPhrase(constraint.limitUnits, constraint.unit)}`,
                      ].join(" · ")}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs tabular-nums text-muted-foreground">
                    <span>
                      attempted {quantityPhrase(constraint.attemptedUnits, constraint.unit)}
                    </span>
                    <span>
                      accepted {quantityPhrase(constraint.consumedUnits, constraint.unit)}
                    </span>
                    <span>limit {quantityPhrase(constraint.limitUnits, constraint.unit)}</span>
                    {constraint.rejectedEvents > 0 ? (
                      <span>rejected events {formatCount(constraint.rejectedEvents)}</span>
                    ) : null}
                    {constraint.indeterminateEvents > 0 ? (
                      <span>indeterminate {formatCount(constraint.indeterminateEvents)}</span>
                    ) : null}
                    {constraint.overageUnits !== undefined ? (
                      <span>overage {groupQuantity(constraint.overageUnits)}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {result.economics !== undefined ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="text-sm font-medium">Cost on this target</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {result.economics.basePlanCost !== undefined ? (
                <Metric
                  label="Plan cost"
                  value={formatMoney(result.economics.basePlanCost.amount)}
                  unit={`per ${shareTarget?.price.interval ?? "month"}`}
                />
              ) : null}
              {result.economics.overageCost !== undefined ? (
                <Metric
                  label="Overage"
                  value={formatMoney(result.economics.overageCost.amount)}
                  tone="warning"
                />
              ) : null}
              <Metric
                label="Target cost"
                value={formatMoney(result.economics.targetCost.amount)}
                size="lg"
                hint={result.economics.costBasis.replaceAll("_", " ")}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-5 p-5">
          <h2 className="text-sm font-medium">When this plan would have failed</h2>
          <ReplayTimeline
            points={timeline}
            violations={result.violations}
            {...(focusedViolation !== undefined ? { focusAt: focusedViolation } : {})}
          />
          {result.violations.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="no-violations">
              No window was exceeded for this workload on this target.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="violations">
              {result.violations.map((violation) => {
                const constraint = result.constraints.find(
                  (entry) => entry.id === violation.constraintId,
                );
                const key = `${violation.constraintId}-${violation.startedAt}`;
                return (
                  <li key={key}>
                    <details
                      onToggle={(event) => {
                        const open = (event.target as HTMLDetailsElement).open;
                        setFocusedViolation(open ? violation.startedAt : undefined);
                      }}
                    >
                      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 py-2 text-sm">
                        {violation.type.replaceAll("_", " ")} · {violation.startedAt.slice(0, 10)} ·{" "}
                        <span className="font-mono tabular-nums">
                          {quantityPhrase(violation.requiredUnits, violation.unit)} required,{" "}
                          {quantityPhrase(violation.acceptedUnits, violation.unit)} accepted
                        </span>
                      </summary>
                      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                        <Detail
                          label="Window"
                          value={`${violation.startedAt} → ${violation.endedAt}`}
                        />
                        <Detail
                          label="Attempted demand"
                          value={quantityPhrase(violation.requiredUnits, violation.unit)}
                        />
                        <Detail
                          label="Available capacity"
                          value={quantityPhrase(violation.availableUnits, violation.unit)}
                        />
                        <Detail
                          label="Accepted"
                          value={quantityPhrase(violation.acceptedUnits, violation.unit)}
                        />
                        <Detail
                          label="Affected events"
                          value={formatCount(violation.affectedEvents)}
                        />
                        {violation.overageUnits !== undefined ? (
                          <Detail
                            label="Overage"
                            value={quantityPhrase(violation.overageUnits, violation.unit)}
                          />
                        ) : null}
                        {constraint !== undefined ? (
                          <Detail
                            label="Behaviour"
                            value={
                              constraint.exceed === "latch_until_reset"
                                ? "latched until the window reset"
                                : constraint.exceed === "reject_request"
                                  ? "individual requests rejected"
                                  : constraint.exceed === "allow_overage"
                                    ? "served, billed as overage"
                                    : "recorded only"
                            }
                          />
                        ) : null}
                      </dl>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Confidence</h2>
              <ConfidenceBadge level={result.confidence.level} />
            </div>
            <ul className="flex flex-col gap-2" data-testid="confidence-factors">
              {result.confidence.factors.map((factor) => (
                <li key={factor.id} className="flex items-start gap-3 text-sm">
                  <Badge
                    variant={
                      factor.level === "high"
                        ? "positive"
                        : factor.level === "medium"
                          ? "warning"
                          : "negative"
                    }
                  >
                    {factor.level}
                  </Badge>
                  <span className="text-muted-foreground">{factor.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="text-sm font-medium">Calculation details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <Detail label="Engine" value={result.versions.engine} />
              <Detail label="Methodology" value={result.versions.methodology} />
              <Detail label="Catalog" value={result.versions.catalog.slice(0, 22)} />
              <Detail label="Rules as of" value={result.versions.rulesAsOf} />
              <Detail label="Plan version" value={result.versions.targetReference} />
              <Detail label="Events replayed" value={formatCount(result.workload.eventCount)} />
            </dl>
            {result.unsupportedModels.length > 0 ? (
              <div data-testid="unsupported-models">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Models this target does not serve
                </h3>
                <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                  {result.unsupportedModels.slice(0, 8).map((model) => (
                    <li key={model.rawName}>
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
            {result.warnings.length > 0 ? (
              <div data-testid="replay-warnings">
                <h3 className="text-xs font-medium text-muted-foreground">Warnings</h3>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {result.warnings.map((warning) => (
                    <li key={warning.code}>
                      {humanizeWarningMessage(warning.message)}
                      {warning.eventCount !== undefined
                        ? ` (${formatCount(warning.eventCount)} events)`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {workload !== undefined ? (
              <p className="text-xs text-muted-foreground">
                Workload stored locally in this browser: {workload.label}. No workload data has left
                this browser.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {shareTarget === undefined ? null : (
        <SharePanel
          result={result}
          target={shareTarget}
          {...(attribution === undefined ? {} : { attribution })}
        />
      )}

      {result.semantics === undefined ? null : <ReplaySemanticsCard semantics={result.semantics} />}
    </div>
  );
}

/**
 * M4B semantic disclosures.
 *
 * Everything here is read straight from the result's own semantics block, so a
 * translated replay can never be displayed as an exact one, an unresolved
 * portion can never read as full coverage, and paid overage is never shown as a
 * block. The card adds disclosures only; it does not restate the engine's
 * numbers in its own words.
 *
 * It sits after the result's other cards on purpose: a tall block placed above
 * the share panel pushed the share action thousands of pixels down at phone
 * widths, and Playwright's own hit test then raced the replay timeline's late
 * mount. The mode badge lives in the headline, where it is read first.
 */
function ReplaySemanticsCard({ semantics }: { semantics: ReplaySemanticsV1 }) {
  const {
    dispositions,
    evidence,
    replayability,
    modelMix,
    workloadScope,
    targetStack,
    translation,
  } = semantics;
  const reset = resetNote(semantics);
  const dimensionRows: ReadonlyArray<{
    label: string;
    dimension: ReplaySemanticsV1["evidence"]["rules"];
  }> = [
    { label: "Model resolution", dimension: evidence.modelResolution },
    { label: "Usage categories", dimension: evidence.usageCategories },
    { label: "Pricing", dimension: evidence.pricing },
    { label: "Rule coverage", dimension: evidence.rules },
    { label: "Temporal coverage", dimension: evidence.temporal },
  ];
  const outcomeRows: ReadonlyArray<{ label: string; value: number; note: string }> =
    DISPOSITION_ROWS.map((row) => ({
      label: row.label,
      value: dispositions[row.key],
      note: row.note,
    }));

  return (
    <Card data-testid="replay-semantics">
      <CardContent className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Replay semantics</h2>
          <p className="text-xs text-muted-foreground">
            Recorded demand, replayed against the target
          </p>
        </div>
        <p className="text-xs text-muted-foreground" data-testid="replay-mode-note">
          {replayModeNote(semantics)}
        </p>

        {translation === undefined ? null : translation.substitutedEvents > 0 ? (
          <div data-testid="replay-translation">
            <h3 className="text-xs font-medium text-muted-foreground">Model translation applied</h3>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
              {translation.applied.map((rule) => (
                <li key={`${rule.sourceModelId}->${rule.targetModelId}`}>
                  {rule.sourceModelId} &rarr; {rule.targetModelId} · {formatCount(rule.eventCount)}{" "}
                  events
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Token-preserving assumption: the recorded token quantities are replayed unchanged
              against the substitute model. No conversion ratio is applied or implied.
            </p>
          </div>
        ) : (
          // A supplied policy that matched nothing is provenance, not a transform:
          // the block is only shown when demand was actually replayed elsewhere.
          <p className="text-xs text-muted-foreground" data-testid="replay-translation-unmatched">
            The scenario supplies a translation policy
            {targetStack.modelTranslation === undefined
              ? ""
              : ` (${targetStack.modelTranslation.id}@${targetStack.modelTranslation.version})`}
            , but no recorded model matched it, so no substitution was applied.
          </p>
        )}

        <div>
          <h3 className="text-xs font-medium text-muted-foreground">Outcomes</h3>
          <dl
            className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5"
            data-testid="replay-dispositions"
          >
            {outcomeRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5" title={row.note}>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="font-mono text-lg tabular-nums">{formatCount(row.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Every replayed event lands in exactly one of these. Paid overage is its own outcome and
            is never counted as blocked.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Evidence</h3>
            <ul className="mt-2 flex flex-col gap-1 text-xs" data-testid="replay-evidence">
              {dimensionRows.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {row.dimension.status === "not_applicable"
                      ? "not applicable"
                      : `${formatCount(row.dimension.events?.covered ?? 0)} of ${formatCount(row.dimension.events?.total ?? 0)} events`}
                    {row.dimension.status === "partial" ? " (partial)" : ""}
                  </span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Translation method</span>
                <span className="font-mono text-muted-foreground">
                  {evidence.translationMethod.method === "none" ? "none" : "token-preserving"}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Reset phase</span>
                <span className="font-mono text-muted-foreground">
                  {evidence.resetPhase.status === "established"
                    ? "established"
                    : evidence.resetPhase.status === "not_applicable"
                      ? "not applicable"
                      : "unknown"}
                </span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Each dimension carries its own denominator. There is no single blended score, because
              one number would hide which question it answers.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-medium text-muted-foreground">
              Replayability of the target&rsquo;s rules
            </h3>
            <p className="mt-2 flex items-center gap-2">
              <Badge
                variant={
                  replayability.class === "deterministic"
                    ? "positive"
                    : replayability.class === "bounded"
                      ? "warning"
                      : "neutral"
                }
                data-testid="replay-replayability"
              >
                {replayability.class}
              </Badge>
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              {replayability.reasons.map((reason) => (
                <li key={reason.id}>{reason.description}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-xs font-medium text-muted-foreground">Observed model mix</h3>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
              {modelMix.models.slice(0, 6).map((model) => (
                <li key={`${model.modelId}|${model.resolutionKind}`}>
                  {model.modelId} · {model.resolutionKind} · {formatCount(model.eventCount)} events
                </li>
              ))}
              {modelMix.unresolvedEventCount > 0 ? (
                <li>
                  {formatCount(modelMix.unresolvedEventCount)} events · identifiers the catalog does
                  not establish
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <h3 className="text-xs font-medium text-muted-foreground">Reset assumption</h3>
          <p className="text-xs text-muted-foreground">{reset}</p>
          <h3 className="mt-2 text-xs font-medium text-muted-foreground">
            What this replay covers
          </h3>
          <p className="text-xs text-muted-foreground" data-testid="replay-scope">
            {workloadScope.statement}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Effective rules instant{" "}
            <span className="font-mono tabular-nums">{targetStack.effectiveAt}</span> · catalog{" "}
            <span className="font-mono">{targetStack.catalogVersion}</span> · plan version{" "}
            <span className="font-mono">{targetStack.planVersionId}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CoverageDimension({
  title,
  dimension,
  testId,
}: {
  title: string;
  dimension: {
    status: "known" | "unknown";
    percent?: number | undefined;
    covered?: number | undefined;
    total?: number | undefined;
    unknownCount?: number | undefined;
    reason?: string | undefined;
  };
  testId: string;
}) {
  return (
    <div
      className="rounded-md border border-border p-4"
      data-testid={testId}
      data-status={dimension.status}
    >
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{title}</p>
      {dimension.status === "known" ? (
        <>
          <p
            className="mt-2 font-mono text-2xl tabular-nums"
            title={dimension.percent === undefined ? undefined : `${dimension.percent}% exact`}
          >
            {formatPercent(dimension.percent ?? 0)}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            {formatCount(dimension.covered ?? 0)} of {formatCount(dimension.total ?? 0)}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-2xl font-medium text-warning" data-testid={`${testId}-unknown`}>
            UNKNOWN
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dimension.reason ?? "This dimension could not be determined."}
            {dimension.unknownCount !== undefined
              ? ` (${formatCount(dimension.unknownCount)} indeterminate)`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
