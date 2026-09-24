"use client";

import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { ProjectedCrossingV1, ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { useEffect, useState } from "react";
import { formatUnit } from "@/components/instrument/format";
import {
  count,
  instant,
  instantWithZone,
  money,
  percent,
  plainDay,
} from "@/components/workload/format";
import { WindowDetail } from "@/components/workload/pressure";
import { describeWorkerFailure, getWorkerClient } from "@/lib/worker-client";
import type { SafeError } from "@/lib/worker-protocol";
import type { WindowFact, WorkloadProfile } from "@/lib/workload-profile";

/**
 * The result read dimension by dimension.
 *
 * A single status word cannot carry "the models are served, capacity cannot be
 * established, the price is fixed, one assumption was made". Each question
 * gets its own row, in the engine's own terms, and none of them is collapsed
 * into another. Historical pressure comes from the workload profile, the same
 * chronology the replay consumed.
 */

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

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
}: {
  projection: ProjectedReplayV1;
  importId: string | undefined;
  scope?: { excludedUnresolvedEvents: number; recordedEvents: number } | undefined;
  targetName: string;
  /** Unavailable events on models the plan runs only with paid usage credits. */
  usageCredits?: { events: number; modelIds: readonly string[] } | undefined;
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
  const peak = profile?.pressure.events.find((row) => row.id === "5h")?.peak;
  const peakTokens = profile?.pressure.tokens.find((row) => row.id === "5h")?.peak;
  const crossings = projection.crossings;
  const numeric = projection.constraints.length > 0;

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
          data-testid="reading-mode"
        >
          {translated ? "Translated replay" : "Exact replay"}
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
              {count(projection.translation.substitutedEvents)} events substituted onto {targetName}{" "}
              models
              <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                {projection.translation.applied.map((rule) => (
                  <li key={rule.sourceModelId}>
                    {MODEL_NAME(rule.sourceModelId)} → {MODEL_NAME(rule.targetModelId)} ·{" "}
                    {count(rule.eventCount)} events
                  </li>
                ))}
              </ul>
            </>
          ) : unavailable === 0 ? (
            `${count(served + blocked)} events on models ${targetName} runs.`
          ) : (
            <>
              {count(unavailable)} events on models {targetName} does not run
              {served + blocked > 0 ? `; ${count(served + blocked)} on models it does` : ""}.
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
              {count(unavailable)} events stay unavailable: their model was left unmapped or the
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
            "All modeled numeric constraints satisfied across your recorded chronology."
          ) : (
            <CheaperPlanSummary crossings={crossings} profile={profile} timeZone={timeZone} />
          )}
        </Row>
        {peak === undefined ? null : (
          <Row label="Historical pressure" testId="reading-pressure">
            Your heaviest five-hour window held {count(peak.events)} events
            {peakTokens === undefined ? "" : ` and ${percent(peakTokens.share)} of known tokens`} (
            {instant(peak.startMs, timeZone)}). That peak is {percent(peak.share)} of all recorded
            events, replayed as it happened.
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
              </>
            ) : (
              <>
                Not established: {economics.reason ?? economics.costReading}.
                {unknown > 0
                  ? " Leaving out the unresolved events gives a complete priced scope."
                  : ""}
              </>
            )
          ) : economics.basePlanCost === undefined ? (
            economics.costReading
          ) : (
            <>
              {money(economics.basePlanCost)} per {projection.target.priceInterval ?? "month"},
              fixed
              {economics.overageCost !== undefined && Number(economics.overageCost) > 0
                ? `, plus ${money(economics.overageCost)} of modeled overage across the recorded windows.`
                : "."}
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
          {unknown === 0
            ? "Every replayed event had an established model and complete token accounting."
            : `${count(unknown)} events stayed undecided: their model identity or accounting is not established. They are reported, not estimated.`}
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
