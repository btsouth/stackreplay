"use client";

import {
  bundledPlansAt,
  bundledPublicApiProviders,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";
import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import { isSyntheticCatalogId } from "@stackreplay/share";
import { Button, buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { count, instantWithZone, money, percent } from "@/components/workload/format";
import { isPositiveAmount } from "@/lib/money-display";
import { defaultRulesDate } from "@/lib/rules-date";
import { browserTimeZone } from "@/lib/time-zone";
import { verdictOfOutcome } from "@/lib/verdict-facts";
import { describeWorkerFailure, getWorkerClient, type ReplayOutcome } from "@/lib/worker-client";
import type { ImportRecord, SafeError } from "@/lib/worker-protocol";

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

type TargetKey = `plan:${string}` | `api:${string}`;

const CURRENT_STACK_KEY = "stackreplay.current-stack";
const MAX_TARGETS = 4;

function readCurrent(): TargetKey | undefined {
  try {
    const value = window.localStorage.getItem(CURRENT_STACK_KEY);
    return value?.startsWith("plan:") || value?.startsWith("api:")
      ? (value as TargetKey)
      : undefined;
  } catch {
    return undefined;
  }
}

function writeCurrent(value: TargetKey | undefined): void {
  try {
    if (value === undefined) window.localStorage.removeItem(CURRENT_STACK_KEY);
    else window.localStorage.setItem(CURRENT_STACK_KEY, value);
  } catch {
    // A convenience only: the comparison works without it.
  }
}

interface Row {
  key: TargetKey;
  name: string;
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
  const [chosen, setChosen] = useState<TargetKey[]>([]);
  const [current, setCurrent] = useState<TargetKey | undefined>(undefined);
  const [excludeUnresolved, setExcludeUnresolved] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [rulesAsOf] = useState(() => defaultRulesDate());

  const plans = useMemo(
    () => bundledPlansAt(rulesAsOf).filter((plan) => !isSyntheticCatalogId(plan.id)),
    [rulesAsOf],
  );
  const providers = useMemo(
    () =>
      bundledPublicApiProviders(rulesAsOf).filter((provider) => !isSyntheticCatalogId(provider.id)),
    [rulesAsOf],
  );
  const nameOf = useCallback(
    (key: TargetKey) =>
      key.startsWith("plan:")
        ? (plans.find((plan) => `plan:${plan.id}` === key)?.name ?? key.slice(5))
        : `${providers.find((provider) => `api:${provider.id}` === key)?.name ?? key.slice(4)} API`,
    [plans, providers],
  );

  useEffect(() => {
    setCurrent(readCurrent());
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
  const unresolved =
    record?.summary.models
      .filter((model) => model.canonicalId === undefined)
      .reduce((sum, model) => sum + model.events, 0) ?? 0;

  useEffect(() => {
    if (chosen.length > 0 || record === undefined) return;
    // A starting set, never a recommendation: the stack the person marked as
    // current, then one plan per major provider and the Direct API route.
    const initial: TargetKey[] = [];
    const add = (key: TargetKey) => {
      if (!initial.includes(key) && initial.length < MAX_TARGETS) initial.push(key);
    };
    const saved = readCurrent();
    if (saved !== undefined) add(saved);
    for (const id of ["openai-chatgpt-pro", "anthropic-claude-max-20x", "github-copilot-pro-plus"])
      if (plans.some((plan) => plan.id === id)) add(`plan:${id}`);
    if (providers.some((provider) => provider.id === "openai")) add("api:openai");
    setChosen(initial);
  }, [chosen.length, plans, providers, record]);

  const run = useCallback(async () => {
    if (record === undefined) return;
    setRunning(true);
    const order =
      current !== undefined && chosen.includes(current)
        ? [current, ...chosen.filter((key) => key !== current)]
        : chosen;
    setRows(order.map((key) => ({ key, name: nameOf(key) })));
    for (const key of order) {
      try {
        const target = key.startsWith("plan:")
          ? ({ type: "subscription", planId: key.slice(5) } as const)
          : ({ type: "api", providerId: key.slice(4) } as const);
        const outcome = await client.runReplay(record.id, target, rulesAsOf, undefined, {
          excludeUnresolved: excludeUnresolved && unresolved > 0,
        });
        setRows((existing) =>
          existing.map((row) =>
            row.key === key ? { ...row, projection: outcome.projection, outcome } : row,
          ),
        );
      } catch (failure) {
        setRows((existing) =>
          existing.map((row) =>
            row.key === key ? { ...row, error: describeWorkerFailure(failure) } : row,
          ),
        );
      }
    }
    setRunning(false);
  }, [chosen, client, current, excludeUnresolved, nameOf, record, rulesAsOf, unresolved]);

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

  const toggle = (key: TargetKey) => {
    setRows([]);
    setChosen((list) =>
      list.includes(key)
        ? list.filter((entry) => entry !== key)
        : list.length >= MAX_TARGETS
          ? list
          : [...list, key],
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-8" data-testid="workload-compare">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">
            Targets <span className="text-muted-foreground">· up to {MAX_TARGETS}</span>
          </legend>
          <div className="grid max-h-80 min-w-0 gap-x-4 overflow-y-auto border-y border-border py-2 sm:grid-cols-2">
            {[
              ...plans.map((plan) => ({
                key: `plan:${plan.id}` as TargetKey,
                label: plan.name,
                note: `$${plan.price.amount}/${plan.price.interval}`,
              })),
              ...providers.map((provider) => ({
                key: `api:${provider.id}` as TargetKey,
                label: `${provider.name} API`,
                note: "list prices",
              })),
            ].map((option) => (
              <label
                key={option.key}
                className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={chosen.includes(option.key)}
                  disabled={!chosen.includes(option.key) && chosen.length >= MAX_TARGETS}
                  onChange={() => toggle(option.key)}
                  data-testid={`compare-choose-${option.key}`}
                />
                <span className="min-w-0 truncate">{option.label}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  {option.note}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex min-w-0 flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            What you use today (optional, kept in this browser only)
            <select
              value={current ?? ""}
              data-testid="current-stack"
              onChange={(event) => {
                const value =
                  event.target.value === "" ? undefined : (event.target.value as TargetKey);
                setCurrent(value);
                writeCurrent(value);
                if (value !== undefined && !chosen.includes(value))
                  setChosen((list) => [value, ...list].slice(0, MAX_TARGETS));
                setRows([]);
              }}
              className="min-h-11 rounded-md border border-control-border bg-surface px-2 text-sm text-foreground"
            >
              <option value="">Not specified</option>
              {plans.map((plan) => (
                <option key={plan.id} value={`plan:${plan.id}`}>
                  {plan.name}
                </option>
              ))}
              {providers.map((provider) => (
                <option key={provider.id} value={`api:${provider.id}`}>
                  {provider.name} API
                </option>
              ))}
            </select>
          </label>
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
              Leave out the {count(unresolved)} events with unresolved model identities, so each
              target can report complete figures for the rest. Every column says the scope.
            </label>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Workload: <span className="text-foreground">{record.label}</span> ·{" "}
            {count(record.summary.eventCount)} events · rules as of {rulesAsOf}. Every replay runs
            in this browser.
          </p>
          <Button
            type="button"
            onClick={() => void run()}
            disabled={running || chosen.length === 0}
            data-testid="compare-run"
            className="self-start"
          >
            {running
              ? "Replaying…"
              : `Replay against ${count(chosen.length)} ${chosen.length === 1 ? "target" : "targets"}`}
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
              key={row.key}
              className="min-w-0 border-t-2 border-border-strong pt-3"
              data-target={row.key}
              data-testid="compare-column"
            >
              <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {row.key === current
                  ? "What you use today"
                  : row.key.startsWith("api:")
                    ? "Direct API"
                    : "Subscription"}
              </p>
              <h3 className="mt-1 text-lg font-medium">{row.name}</h3>
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
                      ? ` · ${count(record.summary.eventCount - row.projection.workload.eventCount)} unresolved left out`
                      : ""}
                  </p>
                  <div className="mt-3">
                    <Findings projection={row.projection} />
                  </div>
                  <Link
                    className="mt-2 inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline"
                    href={`/app/replay?${new URLSearchParams({ import: record.id, ...(row.key.startsWith("plan:") ? { target: row.key.slice(5) } : { api: row.key.slice(4) }) }).toString()}`}
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
