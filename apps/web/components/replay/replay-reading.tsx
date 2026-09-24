"use client";

import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type {
  ApiPriceabilityCountsV1,
  PriceReceiptV1,
  ProjectedCrossingV1,
  ProjectedReplayV1,
} from "@stackreplay/replay-engine";
import { useEffect, useState } from "react";
import { formatUnit } from "@/components/instrument/format";
import { count, instantWithZone, money, percent, plainDay } from "@/components/workload/format";
import { WindowDetail } from "@/components/workload/pressure";
import { formatUsd, isPositiveAmount } from "@/lib/money-display";
import { apiScopeAdvice, sentence } from "@/lib/replay-advice";
import { browserTimeZone } from "@/lib/time-zone";
import { describeWorkerFailure, getWorkerClient } from "@/lib/worker-client";
import type { ResolvedScopeReplay, SafeError } from "@/lib/worker-protocol";
import { peakWindowSentences } from "@/lib/workload-facts";
import type { WindowFact, WorkloadProfile } from "@/lib/workload-profile";
import { PriceReceipt } from "./price-receipt";

/**
 * The result read dimension by dimension.
 *
 * A single status word cannot carry "the models are served, capacity cannot be
 * established, the price is fixed, one assumption was made". Each question
 * gets its own row, in the engine's own terms, and none of them is collapsed
 * into another. Historical pressure comes from the workload profile, the same
 * chronology the replay consumed.
 */

/** A constraint quantity in its own unit; money gets separators. */
function units(value: string | undefined, unit: string): string | undefined {
  return unit === "usd" ? money(value) : formatUnit(value, unit);
}

function localDate(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(ms));
}

const MODEL_NAME = (id: string): string => loadBundledCatalog().models[id]?.name ?? id;

function Row({
  label,
  children,
  testId,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  testId?: string;
  tone?: "accent" | "warning" | undefined;
}) {
  return (
    <div
      className="grid min-w-0 gap-1 border-t border-border py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6"
      data-testid={testId}
    >
      <dt
        className={`font-mono text-[11px] tracking-[0.12em] uppercase ${
          tone === "accent"
            ? "text-accent"
            : tone === "warning"
              ? "text-warning"
              : "text-muted-foreground"
        }`}
      >
        {label}
      </dt>
      <dd className="min-w-0 text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

/**
 * The zone a crossing's window is defined in: a calendar window names its own
 * ("calendar month (UTC)"), so its dates are shown in that zone, where the
 * boundary actually is. Rolling windows have no zone and use the reader's.
 */
function windowZone(crossing: ProjectedCrossingV1, fallback: string): string {
  if (crossing.kind !== "calendar_window_exceeded") return fallback;
  const zone = /\(([^)]+)\)\s*$/u.exec(crossing.window)?.[1];
  if (zone === undefined) return fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return fallback;
  }
}

/** How much of a crossing window's active days came before its allowance ran out. */
function daysBefore(
  crossing: ProjectedCrossingV1,
  profile: WorkloadProfile | undefined,
): { before: number; total: number } | undefined {
  if (profile === undefined || crossing.exceededAt === undefined) return undefined;
  if (profile.chronology.unit !== "day") return undefined;
  const start = Date.parse(crossing.startedAt);
  const end = Date.parse(crossing.endedAt);
  if (end - start < 2 * 86_400_000) return undefined;
  const tz = profile.timeZone;
  const first = localDate(start, tz);
  const last = localDate(end - 1, tz);
  const crossed = localDate(Date.parse(crossing.exceededAt), tz);
  const active = profile.chronology.points.filter(
    (point) => point.events > 0 && point.date >= first && point.date <= last,
  );
  return { before: active.filter((point) => point.date < crossed).length, total: active.length };
}

export function ReplayReading({
  projection,
  importId,
  scope,
  targetName,
  usageCredits,
  priceability,
  receipt,
  resolvedScope,
}: {
  projection: ProjectedReplayV1;
  importId: string | undefined;
  scope?: { excludedUnresolvedEvents: number; recordedEvents: number } | undefined;
  targetName: string;
  /** Direct API only: how each event fared, from the same replay pass. */
  priceability?: ApiPriceabilityCountsV1 | undefined;
  /** Unavailable events on models the plan runs only with paid usage credits. */
  usageCredits?: { events: number; modelIds: readonly string[] } | undefined;
  /** The engine's model × category arithmetic behind the money on this result. */
  receipt?: PriceReceiptV1 | undefined;
  /** Direct API: the resolved-only scope, when it completes the price. */
  resolvedScope?: ResolvedScopeReplay | undefined;
}) {
  const [profile, setProfile] = useState<WorkloadProfile | undefined>(undefined);
  const timeZone = profile?.timeZone ?? browserTimeZone();
  useEffect(() => {
    if (importId === undefined) return;
    let cancelled = false;
    getWorkerClient()
      .analyzeWorkload(importId, browserTimeZone())
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [importId]);

  const outcome = (key: string) =>
    projection.outcomes.find((entry) => entry.key === key)?.count ?? 0;
  const served = outcome("included") + outcome("overage");
  const unavailable = outcome("unavailable");
  const unknown = outcome("unknown");
  const blocked = outcome("blocked");
  const translated = projection.mode === "translated";
  const api = projection.target.kind === "api";
  const economics = projection.economics;
  const pressure = profile === undefined ? [] : peakWindowSentences(profile);
  const crossings = projection.crossings;
  const numeric = projection.constraints.length > 0;
  const recorded = projection.workload.eventCount;
  const advice =
    api && priceability !== undefined
      ? apiScopeAdvice(priceability, projection.target.providerName)
      : undefined;

  return (
    <section
      aria-labelledby="replay-reading-heading"
      className="flex min-w-0 flex-col gap-2"
      data-testid="replay-reading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="replay-reading-heading"
          className={`font-mono text-xs tracking-[0.14em] uppercase ${translated ? "text-accent" : "text-muted-foreground"}`}
        >
          Why
          <span className="sr-only"> · </span>
          <span className="ml-2" data-testid="reading-mode">
            {translated ? "Translated replay" : "Exact replay"}
          </span>
        </h3>
        {translated ? (
          <p className="text-xs text-muted-foreground">
            Target models are user-selected scenario substitutions, not claims of model quality
            equivalence.
          </p>
        ) : null}
      </div>
      <dl className="flex flex-col">
        <Row label="Model routing" testId="reading-routing">
          {translated && projection.translation !== undefined ? (
            <>
              {count(projection.translation.substitutedEvents)} calls substituted onto {targetName}{" "}
              models
              <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                {projection.translation.applied.map((rule) => (
                  <li key={rule.sourceModelId}>
                    {MODEL_NAME(rule.sourceModelId)} → {MODEL_NAME(rule.targetModelId)} ·{" "}
                    {count(rule.eventCount)} calls
                  </li>
                ))}
              </ul>
            </>
          ) : unavailable === 0 ? (
            unknown === 0 ? (
              `All ${count(served + blocked)} calls use models ${targetName} runs.`
            ) : (
              `${count(served + blocked)} calls use models ${targetName} runs; the other ${count(unknown)} are undecided.`
            )
          ) : (
            <>
              {count(unavailable)} calls use models {targetName} does not run
              {served + blocked > 0 ? `; ${count(served + blocked)} use models it does` : ""}.
            </>
          )}
          {usageCredits !== undefined && usageCredits.events > 0 ? (
            <span
              className="block text-xs text-muted-foreground"
              data-testid="reading-usage-credits"
            >
              {count(usageCredits.events)} of these use{" "}
              {usageCredits.modelIds.map(MODEL_NAME).join(", ")}, which {targetName} offers only
              with paid usage credits, outside its included usage. This replay does not price those
              credits.
            </span>
          ) : null}
          {translated && unavailable > 0 ? (
            <span className="block text-xs text-warning">
              {count(unavailable)} calls stay unavailable: their model was left unmapped or the
              chosen substitute is not run by this target.
            </span>
          ) : null}
        </Row>
        <Row
          label="Capacity"
          testId="reading-capacity"
          tone={crossings.length > 0 ? "warning" : undefined}
        >
          {api ? (
            "Not applicable. A Direct API target has no allowance: every request is served and billed."
          ) : !numeric ? (
            <>
              Cannot be established. {targetName} publishes its limits qualitatively, so there is no
              number to replay your chronology against. Model support and your workload&apos;s shape
              are still known.
            </>
          ) : crossings.length === 0 ? (
            served === 0 ? (
              <>
                No limit was reached, because {targetName} runs none of the recorded models. That
                says nothing about capacity for this workload.
              </>
            ) : served === recorded ? (
              "No published limit was crossed anywhere in your recorded chronology."
            ) : (
              <>
                No published limit was crossed by the {count(served)} calls {targetName} runs (
                {percent(recorded === 0 ? 0 : served / recorded)} of recorded calls). The other{" "}
                {count(recorded - served)} were not tested against its limits.
              </>
            )
          ) : (
            <CheaperPlanSummary crossings={crossings} profile={profile} timeZone={timeZone} />
          )}
        </Row>
        {pressure.length === 0 ? null : (
          <Row label="Historical pressure" testId="reading-pressure">
            {pressure.join(" ")} Replay sends these bursts through the target as they happened.
          </Row>
        )}
        <Row label={api ? "API cost" : "Subscription cost"} testId="reading-cost">
          {api ? (
            economics.targetCost !== undefined ? (
              <>
                Published-rate equivalent {money(economics.targetCost)} for the recorded demand
                {projection.workload.windowDays === undefined
                  ? ""
                  : ` (${count(projection.workload.windowDays)} days)`}
                . Not what you paid: it is this workload at the provider&apos;s published list
                prices.
                {receipt === undefined || receipt.basis !== "api_list_price" ? null : (
                  <span className="mt-2 block">
                    <PriceReceipt
                      receipt={receipt}
                      summary={`How ${formatUsd(economics.targetCost) ?? "this"} adds up`}
                      totalLabel="Published-rate equivalent"
                    />
                  </span>
                )}
              </>
            ) : (
              <>
                {sentence(
                  `Not established for all ${count(recorded)} recorded calls. ${economics.reason ?? economics.costReading}`,
                )}
                {resolvedScope?.projection.economics.targetCost === undefined ? null : (
                  <span className="mt-2 block" data-testid="cost-resolved-scope">
                    For the {count(resolvedScope.projection.workload.eventCount)} calls with
                    recognized models, the published-rate equivalent is{" "}
                    {money(resolvedScope.projection.economics.targetCost)}. The{" "}
                    {count(resolvedScope.excludedUnresolvedEvents)} with unrecognized model IDs are
                    left out and not priced. Not what you paid.
                    {resolvedScope.receipt === undefined ? null : (
                      <span className="mt-2 block">
                        <PriceReceipt
                          receipt={resolvedScope.receipt}
                          summary={`How ${formatUsd(resolvedScope.projection.economics.targetCost) ?? "this"} adds up`}
                          totalLabel="Published-rate equivalent, calls with recognized models"
                        />
                      </span>
                    )}
                  </span>
                )}
                {resolvedScope !== undefined ||
                advice === undefined ||
                advice.sentences.length === 0 ? null : (
                  <span className="block text-xs text-muted-foreground" data-testid="cost-advice">
                    {advice.sentences.join(" ")}
                  </span>
                )}
              </>
            )
          ) : economics.basePlanCost === undefined ? (
            economics.costReading
          ) : (
            <>
              {money(economics.basePlanCost)} per {projection.target.priceInterval ?? "month"},
              fixed
              {isPositiveAmount(economics.overageCost)
                ? `, plus ${money(economics.overageCost)} of modeled overage across the recorded windows.`
                : "."}
              {receipt === undefined || receipt.basis !== "credit_demand" ? null : (
                <span className="mt-2 block">
                  <PriceReceipt
                    receipt={receipt}
                    summary={`How the ${formatUsd(receipt.total) ?? ""} of credit demand adds up`}
                    testId="credit-receipt"
                    totalLabel="Credit demand at the plan's rates, before the allowance"
                  />
                </span>
              )}
            </>
          )}
        </Row>
        {translated ? (
          <Row label="Usage assumption" testId="reading-assumption" tone="accent">
            Recorded usage magnitude is preserved across the selected model substitution. Actual
            target-model token use could differ.
          </Row>
        ) : null}
        <Row
          label="Identity / evidence"
          testId="reading-evidence"
          tone={unknown > 0 ? "warning" : undefined}
        >
          {unknown === 0 ? (
            "Every replayed call had an established model and complete token data."
          ) : (
            <UndecidedReasons
              incomplete={economics.indeterminateConsumptionEvents}
              undecided={unknown}
              unresolved={projection.workload.unresolvedEventCount}
            />
          )}
          {scope !== undefined && scope.excludedUnresolvedEvents > 0 ? (
            <span className="block text-xs text-muted-foreground" data-testid="reading-scope">
              Scoped at your request: {count(scope.excludedUnresolvedEvents)} of{" "}
              {count(scope.recordedEvents)} recorded events had unresolved model identities and were
              left out of this replay.
            </span>
          ) : null}
        </Row>
      </dl>
      {crossings.length > 0 ? (
        <LimitCrossings
          crossings={crossings}
          importId={importId}
          profile={profile}
          timeZone={timeZone}
        />
      ) : null}
    </section>
  );
}

/**
 * Why calls stayed undecided, each reason with its own count. The counts come
 * from different engine readings and can overlap, so they are stated side by
 * side and never added up into the undecided total.
 */
function UndecidedReasons({
  undecided,
  unresolved,
  incomplete,
}: {
  undecided: number;
  unresolved: number | undefined;
  incomplete: number | undefined;
}) {
  const reasons: string[] = [];
  if (unresolved !== undefined && unresolved > 0)
    reasons.push(
      `${count(unresolved)} ${unresolved === 1 ? "uses a model ID" : "use model IDs"} StackReplay doesn't recognize`,
    );
  if (incomplete !== undefined && incomplete > 0)
    reasons.push(
      `${count(incomplete)} ${incomplete === 1 ? "reports" : "report"} incomplete token data`,
    );
  return (
    <>
      {count(undecided)} {undecided === 1 ? "call stayed" : "calls stayed"} undecided
      {reasons.length === 0 ? "" : `: ${reasons.join("; ")}`}. They are reported, not estimated.
    </>
  );
}

function CheaperPlanSummary({
  crossings,
  profile,
  timeZone,
}: {
  crossings: readonly ProjectedCrossingV1[];
  profile: WorkloadProfile | undefined;
  timeZone: string;
}) {
  const first = crossings[0];
  if (first === undefined) return null;
  const days = crossings.map((crossing) => daysBefore(crossing, profile));
  const measured = days.filter((entry) => entry !== undefined) as {
    before: number;
    total: number;
  }[];
  const before = measured.reduce((sum, entry) => sum + entry.before, 0);
  const total = measured.reduce((sum, entry) => sum + entry.total, 0);
  const overage = first.exceed === "allow_overage";
  return (
    <>
      {count(crossings.length)} historical limit {crossings.length === 1 ? "crossing" : "crossings"}{" "}
      of {first.constraintLabel}.{" "}
      {first.exceededAt === undefined ? null : (
        <>
          The first time, the included allowance ran out at{" "}
          {instantWithZone(Date.parse(first.exceededAt), timeZone)}.{" "}
        </>
      )}
      {measured.length > 0 && total > 0 ? (
        <>
          Within allowance on {count(before)} of {count(total)} active days in the crossed windows
          {overage
            ? "; after that, demand was billed as overage."
            : "; after that, demand was refused."}
        </>
      ) : overage ? (
        "Demand above the allowance was billed as overage."
      ) : (
        "Demand above the allowance was refused until the window reset."
      )}
    </>
  );
}

function LimitCrossings({
  crossings,
  importId,
  profile,
  timeZone,
}: {
  crossings: readonly ProjectedCrossingV1[];
  importId: string | undefined;
  profile: WorkloadProfile | undefined;
  timeZone: string;
}) {
  const [open, setOpen] = useState<string | undefined>(undefined);
  const [windows, setWindows] = useState<Record<string, WindowFact>>({});
  const [error, setError] = useState<SafeError | undefined>(undefined);
  const shown = crossings.slice(0, 12);

  async function inspect(crossing: ProjectedCrossingV1) {
    if (open === crossing.id) {
      setOpen(undefined);
      return;
    }
    setOpen(crossing.id);
    if (windows[crossing.id] !== undefined || importId === undefined) return;
    try {
      const fact = await getWorkerClient().inspectWindow(
        importId,
        Date.parse(crossing.startedAt),
        Date.parse(crossing.endedAt),
        timeZone,
      );
      setWindows((current) => ({ ...current, [crossing.id]: fact }));
    } catch (failure) {
      setError(describeWorkerFailure(failure));
    }
  }

  return (
    <div className="mt-4 flex min-w-0 flex-col gap-3" data-testid="limit-crossings">
      <h4 className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
        Limit crossings · {count(crossings.length)}
      </h4>
      <ol className="flex flex-col">
        {shown.map((crossing) => {
          const days = daysBefore(crossing, profile);
          const expanded = open === crossing.id;
          const detail = windows[crossing.id];
          return (
            <li
              key={crossing.id}
              className="flex flex-col gap-3 border-t border-border py-3"
              data-testid="limit-crossing"
            >
              <div className="grid min-w-0 gap-2 text-sm sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6">
                <div className="min-w-0">
                  <p className="font-mono text-xs tabular-nums">
                    {plainDay(
                      localDate(Date.parse(crossing.startedAt), windowZone(crossing, timeZone)),
                    )}{" "}
                    to{" "}
                    {plainDay(
                      localDate(Date.parse(crossing.endedAt) - 1, windowZone(crossing, timeZone)),
                    )}
                    {windowZone(crossing, timeZone) === timeZone
                      ? ""
                      : ` (${windowZone(crossing, timeZone)})`}
                  </p>
                  <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {crossing.constraintLabel} · resets per {crossing.window}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Demand{" "}
                  <span className="font-mono text-foreground">
                    {units(crossing.observedUnits, crossing.unit)}
                  </span>{" "}
                  against{" "}
                  <span className="font-mono text-foreground">
                    {units(crossing.includedUnits, crossing.unit)}
                  </span>{" "}
                  included
                  {crossing.excessUnits === undefined ? (
                    ""
                  ) : (
                    <>
                      {" "}
                      ·{" "}
                      <span className="font-mono text-warning">
                        {units(crossing.excessUnits, crossing.unit)}
                      </span>{" "}
                      {crossing.exceed === "allow_overage"
                        ? "billed as overage"
                        : "above the allowance"}
                    </>
                  )}
                  {crossing.affectedEvents > 0
                    ? ` · ${count(crossing.affectedEvents)} events refused`
                    : ""}
                  {crossing.exceededAt === undefined
                    ? ""
                    : ` · ran out ${instantWithZone(Date.parse(crossing.exceededAt), timeZone)}`}
                  {days === undefined
                    ? ""
                    : ` · ${count(days.before)} of ${count(days.total)} active days within allowance`}
                </p>
                {importId === undefined ? null : (
                  <button
                    type="button"
                    aria-expanded={expanded}
                    className="min-h-11 self-start text-xs text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0"
                    onClick={() => void inspect(crossing)}
                    data-testid="inspect-crossing"
                  >
                    {expanded ? "Close" : "Inspect window"}
                  </button>
                )}
              </div>
              {expanded ? (
                detail === undefined ? (
                  error === undefined ? (
                    <p className="text-xs text-muted-foreground" role="status">
                      Reading this window from your local workload…
                    </p>
                  ) : (
                    <p className="text-xs text-negative" role="alert">
                      {error.title}
                    </p>
                  )
                ) : (
                  <WindowDetail
                    measure="tokens"
                    testId="crossing-window-detail"
                    timeZone={windowZone(crossing, timeZone)}
                    window={detail}
                  />
                )
              ) : null}
            </li>
          );
        })}
      </ol>
      {crossings.length > shown.length ? (
        <p className="text-xs text-muted-foreground">
          {count(crossings.length - shown.length)} more crossings are listed in the constraint trace
          below.
        </p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        Windows are the target&apos;s own and are dated in the zone they reset in; run-out times are
        in {timeZone}. Inspecting a window reads your local workload in this browser; nothing is
        sent anywhere.
      </p>
    </div>
  );
}
