"use client";

import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { shareText } from "@stackreplay/share";
import { Button, buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { count, instantWithZone, money, percent } from "@/components/workload/format";
import { readCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import { isPositiveAmount } from "@/lib/money-display";
import {
  type CompareColumn,
  columnId,
  coverageBySlice,
  coverageShare,
  defaultColumns,
  stackCoverage,
  type TargetKey,
  workloadSlices,
} from "@/lib/routes";
import { defaultRulesDate } from "@/lib/rules-date";
import { browserTimeZone } from "@/lib/time-zone";
import { useWorkloadProfile } from "@/lib/use-workload-profile";
import { verdictOfOutcome } from "@/lib/verdict-facts";
import { describeWorkerFailure, getWorkerClient, type ReplayOutcome } from "@/lib/worker-client";
import type { ImportRecord, SafeError } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";

/**
 * Compare against my workload.
 *
 * The static comparison shows what two plans document. This one replays the
 * workload stored in this browser against each chosen target and lays the
 * engine's own findings side by side: whether the target runs the recorded
 * models, whether its capacity is numeric at all, what the recorded chronology
 * crossed, and what it costs. There is no score and no ranking; targets stay in
 * the order they were chosen, and a finding the engine did not establish is
 * shown as not established.
 */

const MAX_TARGETS = 4;

interface Row extends CompareColumn {
  id: string;
  name: string;
  /** The tool slice's name, when the column is scoped to one. */
  scopeLabel?: string | undefined;
  projection?: ProjectedReplayV1;
  outcome?: ReplayOutcome;
  error?: SafeError;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-t border-border py-2.5 text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 leading-relaxed">{children}</dd>
    </div>
  );
}

/**
 * A column leads with the same verdict the full Replay result leads with, so a
 * target is introduced by what it would have done with this workload, not by
 * the engine's state word.
 */
function ColumnVerdict({ outcome, name }: { outcome: ReplayOutcome | undefined; name: string }) {
  if (outcome === undefined) return null;
  const composed = verdictOfOutcome(outcome, name, {
    timeZone: browserTimeZone(),
    catalog: loadBundledCatalog(),
  });
  if (composed === undefined) return null;
  const { verdict } = composed;
  return (
    <div className="mt-2 flex flex-col gap-2" data-testid="compare-verdict">
      <p className="sr-figure sr-figure--compact" data-testid="compare-figure">
        {verdict.figure.value}
        {verdict.figure.minor === undefined ? null : (
          <small className="sr-figure-minor">{verdict.figure.minor}</small>
        )}
      </p>
      <p className="sr-micro text-muted-foreground">{verdict.figure.caption}</p>
      <p className="text-sm leading-snug text-foreground" data-testid="compare-verdict-headline">
        {verdict.headline}
      </p>
      {verdict.support[0] === undefined ? null : (
        <p className="text-xs leading-relaxed text-muted-foreground">{verdict.support[0]}</p>
      )}
      <span className="sr-mode self-start" data-testid="compare-mode">
        {verdict.modeLabel}
      </span>
    </div>
  );
}

function Findings({ projection }: { projection: ProjectedReplayV1 }) {
  const outcome = (key: string) =>
    projection.outcomes.find((entry) => entry.key === key)?.count ?? 0;
  const unavailable = outcome("unavailable");
  const unknown = outcome("unknown");
  const total = projection.workload.eventCount;
  const api = projection.target.kind === "api";
  const crossings = projection.crossings;
  const economics = projection.economics;
  return (
    <dl className="flex flex-col">
      <Fact label="Models">
        {unavailable === 0 ? (
          <span>Exact replay available: every resolved model is run by this target.</span>
        ) : (
          <span className="text-warning">
            Translation required: {percent(total === 0 ? 0 : unavailable / total)} of calls (
            {count(unavailable)}) use models it does not run.
          </span>
        )}
      </Fact>
      <Fact label="Capacity">
        {api
          ? "No allowance: every request is served and billed."
          : projection.constraints.length === 0
            ? "No published numeric allowance to replay against."
            : `${count(projection.constraints.length)} published numeric ${projection.constraints.length === 1 ? "limit" : "limits"} modeled.`}
      </Fact>
      <Fact label="Crossings">
        {api || projection.constraints.length === 0 ? (
          <span className="text-muted-foreground">Not applicable</span>
        ) : crossings.length === 0 ? (
          "None in your recorded chronology."
        ) : (
          <span className="text-warning">
            {count(crossings.length)} historical {crossings.length === 1 ? "crossing" : "crossings"}
            {crossings[0]?.exceededAt === undefined
              ? ""
              : `; first ran out ${instantWithZone(Date.parse(crossings[0].exceededAt), Intl.DateTimeFormat().resolvedOptions().timeZone)}`}
          </span>
        )}
      </Fact>
      <Fact label={api ? "API cost" : "Price"}>
        {api ? (
          economics.targetCost === undefined ? (
            <span className="text-muted-foreground">Not established for this workload</span>
          ) : (
            <span>{money(economics.targetCost)} published-rate equivalent</span>
          )
        ) : (
          <span>
            {money(economics.basePlanCost) ?? "unknown"}/
            {projection.target.priceInterval ?? "month"}
            {isPositiveAmount(economics.overageCost) ? (
              <> + {money(economics.overageCost)} modeled overage</>
            ) : null}
          </span>
        )}
      </Fact>
      <Fact label="Open evidence">
        {unknown === 0 ? "None" : `${count(unknown)} calls undecided (identity or accounting)`}
      </Fact>
    </dl>
  );
}

export function WorkloadCompare({ initialImportId }: { initialImportId?: string | undefined }) {
  const client = getWorkerClient();
  const [imports, setImports] = useState<ImportRecord[] | undefined>(undefined);
  const [importId, setImportId] = useState<string | undefined>(initialImportId);
  const [chosen, setChosen] = useState<CompareColumn[] | undefined>(undefined);
  const [current, setCurrent] = useState<TargetKey[]>([]);
  const [excludeUnresolved, setExcludeUnresolved] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [rulesAsOf] = useState(() => defaultRulesDate());

  useEffect(() => {
    setCurrent(readCurrentStack());
    let cancelled = false;
    void client
      .listImports()
      .then((list) => {
        if (cancelled) return;
        setImports(list);
        setImportId((value) => value ?? list[0]?.id);
      })
      .catch(() => setImports([]));
    return () => {
      cancelled = true;
    };
  }, [client]);

  const record = imports?.find((entry) => entry.id === importId);
  const profile = useWorkloadProfile(record?.id);
  const synthetic = record === undefined ? false : isSyntheticWorkload(record);
  const names = useMemo(
    () =>
      new Map(
        (record?.summary.usageSources ?? []).map((source) => [source.adapterId, source.name]),
      ),
    [record],
  );
  const slices = useMemo(
    () => (profile === undefined ? undefined : workloadSlices(profile.sources, names)),
    [names, profile],
  );
  const bySlice = useMemo(
    () => (slices === undefined ? undefined : coverageBySlice(slices, rulesAsOf, { synthetic })),
    [rulesAsOf, slices, synthetic],
  );
  /** Every target, ordered by how much of the whole workload it runs. */
  const options = bySlice?.[0]?.coverages ?? [];
  const nameOf = useCallback(
    (key: TargetKey) => options.find((coverage) => coverage.key === key)?.name ?? key,
    [options],
  );
  const stack = useMemo(
    () => (bySlice === undefined ? undefined : stackCoverage(current, bySlice)),
    [bySlice, current],
  );
  const unresolved = profile?.overview.unresolvedEvents ?? 0;

  // A starting set chosen from this workload, never a recommendation.
  useEffect(() => {
    if (chosen !== undefined || slices === undefined) return;
    setChosen(
      defaultColumns(readCurrentStack(), slices, rulesAsOf, { synthetic, max: MAX_TARGETS }),
    );
  }, [chosen, rulesAsOf, slices, synthetic]);

  const labelOf = useCallback(
    (sources: readonly string[]) =>
      sources.length === 0 ? undefined : sources.map((id) => names.get(id) ?? id).join(" + "),
    [names],
  );

  const run = useCallback(async () => {
    if (record === undefined || chosen === undefined) return;
    setRunning(true);
    const order = [
      ...chosen.filter((column) => column.current),
      ...chosen.filter((column) => !column.current),
    ];
    setRows(
      order.map((column) => ({
        ...column,
        id: columnId(column),
        name: nameOf(column.key),
        scopeLabel: labelOf(column.sources),
      })),
    );
    for (const column of order) {
      const id = columnId(column);
      try {
        const target = column.key.startsWith("plan:")
          ? ({ type: "subscription", planId: column.key.slice(5) } as const)
          : ({ type: "api", providerId: column.key.slice(4) } as const);
        const outcome = await client.runReplay(record.id, target, rulesAsOf, undefined, {
          excludeUnresolved: excludeUnresolved && unresolved > 0,
          sources: column.sources,
        });
        setRows((existing) =>
          existing.map((row) =>
            row.id === id ? { ...row, projection: outcome.projection, outcome } : row,
          ),
        );
      } catch (failure) {
        setRows((existing) =>
          existing.map((row) =>
            row.id === id ? { ...row, error: describeWorkerFailure(failure) } : row,
          ),
        );
      }
    }
    setRunning(false);
  }, [chosen, client, excludeUnresolved, labelOf, nameOf, record, rulesAsOf, unresolved]);

  if (imports === undefined)
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Opening local workloads…
      </p>
    );
  if (record === undefined)
    return (
      <div className="flex max-w-2xl flex-col gap-3" data-testid="compare-empty">
        <p className="text-sm text-muted-foreground">
          Comparing against your workload needs a workload stored in this browser. The static plan
          comparison works without one.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ size: "sm" })} href="/app/import">
            Scan your history
          </Link>
          <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href="/compare">
            Compare documented plan facts
          </Link>
        </div>
      </div>
    );

  const columns = chosen ?? [];
  const toggle = (key: TargetKey) => {
    setRows([]);
    setChosen((list = []) =>
      list.some((column) => column.key === key)
        ? list.filter((column) => column.key !== key)
        : list.length >= MAX_TARGETS
          ? list
          : [...list, { key, sources: [], current: current.includes(key) }],
    );
  };
  const toggleCurrent = (key: TargetKey) => {
    const next = current.includes(key)
      ? current.filter((entry) => entry !== key)
      : [...current, key].slice(0, MAX_TARGETS);
    setCurrent(next);
    writeCurrentStack(next);
    setRows([]);
    if (bySlice === undefined) return;
    // The stack leads the columns, each on the work it carries; the rest keep
    // their place while there is room.
    const members = stackCoverage(next, bySlice).members.map((member) => ({
      key: member.key,
      sources: member.sources,
      current: true,
    }));
    setChosen((list = []) =>
      [
        ...members,
        ...list.filter(
          (column) => !column.current && !members.some((member) => member.key === column.key),
        ),
      ].slice(0, MAX_TARGETS),
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-8" data-testid="workload-compare">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">
            Targets <span className="text-muted-foreground">· up to {MAX_TARGETS}</span>
          </legend>
          <p className="text-xs text-muted-foreground">
            {bySlice === undefined
              ? "Reading which targets run this workload…"
              : "Ordered by how much of this workload each target runs."}
          </p>
          <div className="grid max-h-80 min-w-0 gap-x-4 overflow-y-auto border-y border-border py-2 sm:grid-cols-2">
            {options.map((option) => (
              <label
                key={option.key}
                className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={columns.some((column) => column.key === option.key)}
                  disabled={
                    !columns.some((column) => column.key === option.key) &&
                    columns.length >= MAX_TARGETS
                  }
                  onChange={() => toggle(option.key)}
                  data-testid={`compare-choose-${option.key}`}
                />
                <span className="min-w-0 truncate">{option.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {option.runnable === 0 ? "runs none" : `runs ${shareText(coverageShare(option))}`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex min-w-0 flex-col gap-4">
          <details className="border-y border-border py-2" data-testid="current-stack">
            <summary className="min-h-11 cursor-pointer text-sm focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
              What you use today{" "}
              <span className="text-muted-foreground">
                ·{" "}
                {current.length === 0
                  ? "not specified"
                  : current.map((key) => nameOf(key)).join(" + ")}
              </span>
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Mark every plan you pay for. Each is replayed on the work it carries. Kept in this
              browser only.
            </p>
            <div className="mt-2 grid max-h-56 min-w-0 gap-x-4 overflow-y-auto sm:grid-cols-2">
              {options.map((option) => (
                <label
                  key={option.key}
                  className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={current.includes(option.key)}
                    onChange={() => toggleCurrent(option.key)}
                    data-testid={`current-${option.key}`}
                  />
                  <span className="min-w-0 truncate">{option.name}</span>
                </label>
              ))}
            </div>
          </details>
          {stack === undefined || stack.members.length === 0 ? null : (
            <p className="text-sm leading-relaxed" data-testid="stack-summary">
              {stack.members
                .map((member) =>
                  member.carries === "all"
                    ? `${member.name} runs every tool's work here.`
                    : member.carries === "none"
                      ? `${member.name} runs under half of any one tool's work here.`
                      : `${member.name} carries your ${member.label} work.`,
                )
                .join(" ")}
              {stack.uncovered.length === 0
                ? ""
                : ` ${stack.uncovered
                    .map((tool) => `${count(tool.events)} ${tool.label} calls`)
                    .join(
                      " and ",
                    )} ${stack.uncovered.length === 1 && stack.uncovered[0]?.events === 1 ? "is" : "are"} not carried by ${stack.members.length === 1 ? "it" : "any of them"}.`}
            </p>
          )}
          {unresolved > 0 ? (
            <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={excludeUnresolved}
                onChange={(event) => {
                  setExcludeUnresolved(event.target.checked);
                  setRows([]);
                }}
              />
              Leave out the {count(unresolved)} calls with unresolved model identities, so each
              target can report complete figures for the rest. Every column says the scope.
            </label>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Workload: <span className="text-foreground">{record.label}</span> ·{" "}
            {count(record.summary.eventCount)} calls · rules as of {rulesAsOf}. Every replay runs in
            this browser.
          </p>
          <Button
            type="button"
            onClick={() => void run()}
            disabled={running || columns.length === 0}
            data-testid="compare-run"
            className="self-start"
          >
            {running
              ? "Replaying…"
              : `Replay against ${count(columns.length)} ${columns.length === 1 ? "target" : "targets"}`}
          </Button>
        </div>
      </div>

      {rows.length > 0 ? (
        <div
          className={`grid min-w-0 gap-6 sm:grid-cols-2 ${rows.length > 2 ? "xl:grid-cols-4" : ""}`}
          data-testid="compare-results"
        >
          {rows.map((row) => (
            <section
              key={row.id}
              className="min-w-0 border-t-2 border-border-strong pt-3"
              data-scope={row.sources.join(",")}
              data-target={row.key}
              data-testid="compare-column"
            >
              <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {row.current
                  ? "What you use today"
                  : row.key.startsWith("api:")
                    ? "Direct API"
                    : "Subscription"}
              </p>
              <h3 className="mt-1 text-lg font-medium">{row.name}</h3>
              {row.scopeLabel === undefined ? null : (
                <p className="text-xs text-muted-foreground" data-testid="compare-scope">
                  Your {row.scopeLabel} work
                </p>
              )}
              {row.projection === undefined ? (
                row.error === undefined ? (
                  <p className="mt-3 text-sm text-muted-foreground" role="status">
                    Replaying…
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-negative" role="alert">
                    {row.error.title}
                  </p>
                )
              ) : (
                <>
                  <ColumnVerdict name={row.name} outcome={row.outcome} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {count(row.projection.workload.eventCount)} calls replayed
                    {row.projection.workload.eventCount < record.summary.eventCount
                      ? ` of ${count(record.summary.eventCount)}`
                      : ""}
                  </p>
                  <div className="mt-3">
                    <Findings projection={row.projection} />
                  </div>
                  <Link
                    className="mt-2 inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline"
                    href={`/app/replay?${new URLSearchParams({
                      import: record.id,
                      ...(row.key.startsWith("plan:")
                        ? { target: row.key.slice(5) }
                        : { api: row.key.slice(4) }),
                      ...(row.sources.length === 0 ? {} : { scope: row.sources.join(",") }),
                    }).toString()}`}
                  >
                    Open full replay →
                  </Link>
                </>
              )}
            </section>
          ))}
        </div>
      ) : null}
      <p className="max-w-[70ch] border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        Findings are the engine&apos;s, per target, for this recorded workload. They are not a
        ranking. A target that needs model substitution can be replayed as a translated scenario
        from its full replay page.
      </p>
    </div>
  );
}
