"use client";

import { bundledPlansAt } from "@stackreplay/catalog/bundled";
import {
  composeValueScope,
  formatCents,
  formatUsd,
  isSyntheticCatalogId,
  partOfWhole,
  prorateCents,
} from "@stackreplay/share";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { PriceReceipt } from "@/components/replay/price-receipt";
import { readCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import type { TargetKey } from "@/lib/routes";
import type { SourceSummary } from "@/lib/worker-protocol";
import type { Insight, WorkloadProfile } from "@/lib/workload-profile";
import type { ExcludedSlice, WorkloadValue } from "@/lib/workload-value";
import { count, percent } from "./format";

/**
 * The workload's first-scan value: what the recorded work is worth at each
 * maker's published API rates (decision 60), the comparative facts, and the
 * tool split. Every dollar figure carries "not what you paid" beside it, and
 * every figure's scope is stated with it.
 */

function splitMoney(amount: string): { whole: string; minor?: string } | undefined {
  const shown = formatUsd(amount);
  if (shown === undefined) return undefined;
  const [whole, cents] = shown.split(".");
  return { whole: whole ?? shown, ...(cents === undefined ? {} : { minor: `.${cents}` }) };
}

function excludedSentence(slice: ExcludedSlice, rulesAsOf: string): string {
  const calls = `${count(slice.calls)} ${slice.calls === 1 ? "call" : "calls"}`;
  if (slice.reason === "undocumented-category")
    return `${calls} on ${slice.models.join(" and ")} used a token category ${slice.makerName ?? "the maker"}'s price record gives no rate for`;
  if (slice.reason === "no-rate")
    return `${calls} on ${slice.models.join(" and ")} have no ${slice.makerName ?? "maker"} list price in force on ${rulesAsOf}`;
  return `${calls} on ${slice.models.join(" and ")} have no recorded maker`;
}

/** Everything left out of the value, and why, in one sentence. */
export function valueLeftOut(value: WorkloadValue): string | undefined {
  const parts = value.excluded.map((slice) => excludedSentence(slice, value.rulesAsOf));
  if (value.unresolvedCalls > 0)
    parts.push(
      `${count(value.unresolvedCalls)} ${value.unresolvedCalls === 1 ? "call has" : "calls have"} model IDs StackReplay couldn't resolve`,
    );
  if (parts.length === 0) return undefined;
  return `Left out, not estimated: ${parts.join("; ")}.`;
}

export function WorkloadValueFigure({
  value,
  compact = false,
  briefing = false,
  afterScope,
}: {
  value: WorkloadValue;
  compact?: boolean;
  /** The Workload briefing qualifies priced calls against included history. */
  briefing?: boolean;
  /** A partial-scan notice sits directly after the included-history scope. */
  afterScope?: ReactNode;
}) {
  const total = value.total === undefined ? undefined : splitMoney(value.total);
  const leftOut = valueLeftOut(value);
  const scope = composeValueScope(value);
  if (total === undefined)
    return (
      <div className="flex flex-col gap-2" data-testid="workload-value">
        <p className="text-sm leading-relaxed text-foreground" data-testid="value-none">
          No maker&apos;s published API rates cover these calls completely, so there is no
          list-price figure to show.
        </p>
        {leftOut === undefined ? null : (
          <p className="text-xs leading-relaxed text-muted-foreground">{leftOut}</p>
        )}
        {afterScope}
      </div>
    );
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="workload-value">
      <p className="sr-figure sr-figure--start" data-kind="money" data-testid="value-figure">
        {total.whole}
        {total.minor === undefined ? null : (
          <small className="sr-figure-minor">{total.minor}</small>
        )}
      </p>
      <p className="sr-micro text-muted-foreground" data-testid="value-caption">
        at published API list prices · not what you paid
      </p>
      <p className="max-w-[60ch] text-sm leading-relaxed text-foreground" data-testid="value-scope">
        {briefing ? (
          value.pricedCalls >= value.recordedCalls ? (
            `All ${count(value.recordedCalls)} included calls priced.`
          ) : (
            `${count(value.pricedCalls)} of ${count(value.recordedCalls)} included calls priced (${partOfWhole(value.pricedCalls, value.recordedCalls)}).`
          )
        ) : (
          <>
            {scope.calls}, each maker&apos;s at its own rates
            {compact
              ? "."
              : `: ${value.priced
                  .map(
                    (slice) =>
                      `${slice.makerName} ${formatUsd(slice.amount) ?? slice.amount} for ${count(slice.calls)}`,
                  )
                  .join(" · ")}.`}
          </>
        )}
      </p>
      {afterScope}
      {leftOut === undefined ? null : (
        <p
          className="max-w-[60ch] text-xs leading-relaxed text-muted-foreground"
          data-testid="value-left-out"
        >
          {leftOut}
        </p>
      )}
      {scope.tokens === undefined ? null : (
        <p
          className="max-w-[60ch] text-sm leading-relaxed text-foreground"
          data-testid="value-token-scope"
        >
          {scope.tokens}
        </p>
      )}
      {compact ? null : <ValueReceipts value={value} />}
    </div>
  );
}

/** Every dollar opens to its arithmetic: one receipt per maker. */
function ValueReceipts({ value }: { value: WorkloadValue }) {
  if (value.total === undefined) return null;
  return (
    <details className="min-w-0" data-testid="value-receipts">
      <summary className="min-h-11 cursor-pointer content-center text-xs text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
        How {formatUsd(value.total)} adds up
      </summary>
      <div className="mt-3 flex min-w-0 flex-col gap-4">
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          Each maker&apos;s calls are an Exact Direct API replay at that maker&apos;s published list
          prices in force on {value.rulesAsOf}. The total is the sum of those replays and nothing
          else.
        </p>
        {value.priced.map((slice) =>
          slice.receipt === undefined ? null : (
            <PriceReceipt
              key={slice.makerId}
              defaultOpen={value.priced.length === 1}
              receipt={slice.receipt}
              summary={`${slice.makerName}: ${formatUsd(slice.amount)} for ${count(slice.calls)} calls`}
              testId={`value-receipt-${slice.makerId}`}
              totalLabel={`${slice.makerName}, at its published API rates`}
            />
          ),
        )}
      </div>
    </details>
  );
}

/** Which tools recorded the work, by share of calls. */
export function ToolSplit({
  sources,
  compact = false,
  testHref,
}: {
  sources: readonly SourceSummary[];
  compact?: boolean;
  /** Where "Test this work" goes for one tool's calls; omitted where no action belongs. */
  testHref?: ((adapterId: string) => string) | undefined;
}) {
  const usage = sources.filter((source) => source.role === "usage" && source.events > 0);
  const total = usage.reduce((sum, source) => sum + source.events, 0);
  if (usage.length === 0 || total === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="tool-split">
      <p className="sr-micro text-muted-foreground">
        {usage.length === 1 ? "Recorded by" : "Split across tools"}
      </p>
      {usage.length > 1 ? (
        <div aria-hidden="true" className="flex h-1.5 w-full gap-0.5">
          {usage.map((source, index) => (
            <span
              key={source.adapterId}
              className="h-full bg-foreground"
              style={{ width: `${(source.events / total) * 100}%`, opacity: 0.85 - index * 0.25 }}
            />
          ))}
        </div>
      ) : null}
      <ul
        className={
          compact ? "grid gap-x-5 gap-y-1 text-sm sm:grid-cols-3" : "flex flex-col gap-1 text-sm"
        }
      >
        {usage.map((source) => (
          <li
            key={source.adapterId}
            className={
              compact
                ? "flex min-w-0 items-baseline justify-between gap-2 sm:flex-col sm:gap-0"
                : "flex items-baseline justify-between gap-4"
            }
          >
            <span className="min-w-0 truncate">{source.name}</span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {count(source.events)} · {percent(source.events / total)}
            </span>
            {testHref === undefined ? null : (
              <Link
                className="inline-flex min-h-11 shrink-0 items-center text-xs text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0 sm:pt-1"
                href={testHref(source.adapterId)}
                aria-label={`Test the ${source.name} work against a plan or API`}
                data-testid={`test-tool-${source.adapterId}`}
              >
                Test this work →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Comparative facts: the figure, its baseline, and where to see it. */
export function InsightList({
  insights,
  limit,
  testId = "workload-insights",
  evidenceHref = (section) => `#${section}`,
}: {
  insights: readonly Insight[];
  limit?: number;
  testId?: string;
  /** Where an evidence link goes, for a list shown outside the workload page. */
  evidenceHref?: (section: string) => string;
}) {
  const shown = limit === undefined ? insights : insights.slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <ol
      className={`grid gap-x-8 gap-y-4 ${shown.length > 1 ? "lg:grid-cols-3" : ""}`}
      data-testid={testId}
    >
      {shown.map((insight, index) => (
        <li
          key={insight.id}
          className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 border-t border-border pt-3"
          data-insight={insight.id}
        >
          <span className="font-mono text-xs text-accent">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-base leading-snug text-foreground">{insight.text}</p>
            <p className="text-sm leading-snug text-muted-foreground">
              {insight.comparison}.{" "}
              <a
                className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline sm:min-h-0"
                href={evidenceHref(insight.evidence.section)}
              >
                {insight.evidence.label} →
              </a>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * What the plans a person pays for cost over the recorded days, beside what
 * the work is worth at list prices. Context only: two different products are
 * never subtracted into a "saving". The pro-rating is shown in full.
 */
export function CurrentSpend({
  value,
  periodDays,
  rulesAsOf,
}: {
  value: WorkloadValue | undefined;
  periodDays: number;
  rulesAsOf: string;
}) {
  const [stack, setStack] = useState<TargetKey[]>([]);
  useEffect(() => setStack(readCurrentStack()), []);
  const plans = useMemo(
    () => bundledPlansAt(rulesAsOf).filter((plan) => !isSyntheticCatalogId(plan.id)),
    [rulesAsOf],
  );
  const chosen = plans.filter((plan) => stack.includes(`plan:${plan.id}`));
  const rows = chosen.map((plan) => ({
    plan,
    cents: prorateCents(plan.price.amount, plan.price.interval, periodDays),
  }));
  const complete = rows.every((row) => row.cents !== undefined);
  const totalCents = rows.reduce((sum, row) => sum + (row.cents ?? 0n), 0n);
  const toggle = (key: TargetKey) => {
    const next = stack.includes(key) ? stack.filter((entry) => entry !== key) : [...stack, key];
    setStack(next);
    writeCurrentStack(next);
  };
  return (
    <details className="border-t border-border pt-3 text-sm" data-testid="current-spend">
      <summary className="min-h-11 cursor-pointer content-center text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
        What you pay today{" "}
        <span className="text-foreground">
          ·{" "}
          {chosen.length === 0
            ? "optional, kept in this browser"
            : `${chosen.map((plan) => plan.name).join(" + ")}${complete ? `: ${formatCents(totalCents)} for these ${count(periodDays)} days` : ""}`}
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {chosen.length === 0 || !complete ? null : (
          <p className="max-w-[70ch] leading-relaxed" data-testid="current-spend-sentence">
            {chosen.length === 1 ? "Your plan costs" : "Your plans cost"} {formatCents(totalCents)}{" "}
            for the {count(periodDays)} days this workload covers
            {value?.total === undefined
              ? "."
              : `; at published API list prices the same work is worth ${formatUsd(value.total)}, which is not what you paid.`}{" "}
            <span className="text-muted-foreground" data-testid="current-spend-arithmetic">
              {rows
                .map(
                  (row) =>
                    `${row.plan.name}: ${formatUsd(row.plan.price.amount)} per ${row.plan.price.interval} × ${count(periodDays)} days × ${row.plan.price.interval === "month" ? "12 ÷ 365" : "1 ÷ 365"} = ${formatCents(row.cents ?? 0n)}`,
                )
                .join("; ")}
              .
            </span>
          </p>
        )}
        <fieldset className="grid max-h-56 min-w-0 gap-x-4 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-1 text-xs text-muted-foreground">
            Mark every plan you pay for. Compare and Settings use the same list.
          </legend>
          {plans.map((plan) => (
            <label key={plan.id} className="flex min-h-11 items-center gap-2 sm:min-h-9">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={stack.includes(`plan:${plan.id}`)}
                onChange={() => toggle(`plan:${plan.id}`)}
                data-testid={`spend-plan:${plan.id}`}
              />
              <span className="min-w-0 truncate">{plan.name}</span>
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                {formatUsd(plan.price.amount)}/{plan.price.interval}
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  );
}

/**
 * Workload Ready: the first dollar answer and the strongest comparative fact,
 * before anything else is clicked.
 */
export function ReadyPreview({
  importId,
  profile,
  sources,
  afterScope,
}: {
  importId: string;
  profile: WorkloadProfile;
  sources: readonly SourceSummary[];
  /** Anything that qualifies the value's scope, such as a partial scan. */
  afterScope?: ReactNode;
}) {
  const workloadHref = `/app/workload?import=${importId}`;
  return (
    <section
      aria-label="What this workload says"
      className="grid min-w-0 gap-6 border-y border-border py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      data-testid="ready-preview"
    >
      <div className="flex min-w-0 flex-col gap-3">
        {profile.value === undefined ? (
          <>
            <p className="text-sm text-muted-foreground" role="status">
              Pricing each maker&apos;s calls at its own published API rates, in this browser…
            </p>
            {afterScope}
          </>
        ) : (
          <WorkloadValueFigure afterScope={afterScope} compact value={profile.value} />
        )}
        <InsightList
          evidenceHref={(section) => `${workloadHref}#${section}`}
          insights={profile.insights}
          limit={1}
          testId="ready-insight"
        />
      </div>
      <ToolSplit sources={sources} />
    </section>
  );
}
