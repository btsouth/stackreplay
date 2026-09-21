"use client";

import { type BundledPlanSummary, bundledPlansAt } from "@stackreplay/catalog/bundled";
import type { ExecutionReplayResultV1, ExecutionTargetV1 } from "@stackreplay/schema";
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
import { describeWorkerFailure, getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord, SafeError, TimelinePoint } from "@/lib/worker-protocol";

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

export function ReplaySurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const client = getWorkerClient();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialImportId);
  const [rulesAsOf, setRulesAsOf] = useState<string>(todayUtc());
  const [query, setQuery] = useState("");
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<ReplayOutcome | undefined>(undefined);
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
  const workload = useMemo(
    () => imports.find((entry) => entry.id === selectedId) ?? imports[0],
    [imports, selectedId],
  );

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
      setPhase("done");
    } catch (failure) {
      // A superseded request is not a failure: a newer replay owns this surface.
      if (failure instanceof SupersededError) return;
      setError(describeWorkerFailure(failure));
      setPhase("idle");
    }
  }, [client, rulesAsOf, selectedPlan, workload]);

  const onPlanKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (filteredPlans.length === 0) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = Math.min(Math.max(activeIndex + delta, 0), filteredPlans.length - 1);
        setActiveIndex(next);
        const option = filteredPlans[next];
        if (option !== undefined) setPlanId(option.id);
        const node = listRef.current?.querySelectorAll<HTMLElement>("[data-plan-option]")[next];
        node?.focus();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void runReplay();
      }
    },
    [activeIndex, filteredPlans, runReplay],
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
      <WorkloadStrip
        workload={workload}
        imports={imports}
        onSelect={(id) => {
          setSelectedId(id);
          setOutcome(undefined);
          setPhase("idle");
        }}
      />

      <Card>
        <CardContent className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">Target plan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The catalog is synthetic demo data in this build. Real plan data arrives with the
                public catalog.
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
                      onClick={() => setPlanId(plan.id)}
                      onFocus={() => setActiveIndex(index)}
                      className={[
                        "flex w-full items-baseline justify-between gap-4 border-l-2 px-3 py-2.5 text-left",
                        plan.id === planId
                          ? "border-accent bg-surface-2"
                          : "border-transparent bg-transparent",
                      ].join(" ")}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm">{plan.name}</span>
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
              disabled={selectedPlan === undefined || phase === "loading" || phase === "replaying"}
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
          plan={selectedPlan}
          rulesAsOf={rulesAsOf}
          workload={workload}
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
      </CardContent>
    </Card>
  );
}

function ReplayResult({
  outcome,
  plan,
  rulesAsOf,
  workload,
}: {
  outcome: ReplayOutcome;
  plan: BundledPlanSummary | undefined;
  rulesAsOf: string;
  workload: ImportRecord | undefined;
}) {
  const { result, timeline } = outcome;
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
                {plan?.name ?? result.versions.targetReference} · rules as of{" "}
                <span className="font-mono tabular-nums">{rulesAsOf}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                        {constraint.kind.replace("_", " ")} · {constraint.window.description} ·{" "}
                        {constraint.exceed.replace("_", " ")}
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
                  unit={`per ${plan?.price.interval ?? "month"}`}
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
              </div>
            ) : null}
            {result.warnings.length > 0 ? (
              <div data-testid="replay-warnings">
                <h3 className="text-xs font-medium text-muted-foreground">Warnings</h3>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                  {result.warnings.map((warning) => (
                    <li key={warning.code}>
                      {warning.message}
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
    </div>
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
