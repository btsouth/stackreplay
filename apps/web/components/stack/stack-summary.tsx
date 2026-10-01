"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import { formatUsdWhole } from "@stackreplay/share";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { publishedPriceText } from "@/lib/my-stack";
import {
  money,
  type Range,
  rangeText,
  type StackAnalysis,
  type StackWorkload,
} from "@/lib/stack-analysis";
import { type StackCoverage, workloadPeriodText } from "@/lib/stack-investigations";

/** Whole dollars read at a glance; exact cents stay in the title and the evidence. */
function headline(range: Range): string {
  const whole = (amount: string) =>
    new Decimal(amount).gte(100) ? (formatUsdWhole(amount) ?? money(amount)) : money(amount);
  const low = whole(range.low);
  const high = whole(range.high);
  return low === high ? low : `${low}–${high}`;
}

/**
 * The first screen of My Stack, in three plain answers: what you pay, what
 * workload is loaded, and which of your subscriptions that workload can
 * actually evaluate. When only one tool's history is loaded the coverage
 * column says so per subscription, so a three-plan stack never reads as if
 * all three were evaluated. Subscription leverage is not a headline here; it
 * stays in each subscription's evidence disclosure.
 */
export function StackSummary({
  analysis,
  workload,
  coverage,
  workloadState,
  period,
  onSetup,
}: {
  analysis: StackAnalysis;
  workload: StackWorkload | undefined;
  coverage: StackCoverage;
  /** Shown in the workload column when no priced facts are available yet. */
  workloadState: ReactNode;
  period: ReactNode;
  onSetup: () => void;
}) {
  const { model } = analysis;
  const monthly = model.totals.find(
    (total) => total.currency === "USD" && total.interval === "month",
  );
  const others = model.totals.filter((total) => total !== monthly);
  const overall = workload?.overall;
  const value = overall?.value ?? overall?.pricedValue;
  const empty = model.targets.length === 0;
  const unit = overall?.distinctResponses ? "recorded responses" : "recorded calls";
  return (
    <section
      className="stack-summary"
      aria-labelledby="stack-summary-heading"
      data-testid="stack-overview"
    >
      <h2 id="stack-summary-heading" className="sr-only">
        Your stack, your recorded workload and what can be analyzed
      </h2>
      <div className="stack-summary-figures">
        <div className="stack-summary-figure" data-testid="stack-published-total">
          <p className="stack-eyebrow">Your stack</p>
          {empty ? (
            <>
              <p className="stack-summary-empty">No subscriptions yet</p>
              <p className="stack-caption">
                Tell StackReplay what you currently pay for so it can analyze this workload against
                your stack.
              </p>
              <button type="button" className="stack-primary" onClick={onSetup}>
                Choose your subscriptions
              </button>
            </>
          ) : monthly ? (
            <>
              <p className="stack-figure" title={publishedPriceText(monthly)}>
                {money(monthly.amount).replace(/\.00$/u, "")}
                <span>/mo</span>
              </p>
              <p className="stack-summary-sub">
                {analysis.planCount} {analysis.planCount === 1 ? "subscription" : "subscriptions"}
                {others.length ? ` · also ${others.map(publishedPriceText).join(", ")}` : ""}
              </p>
              <p className="stack-caption">Published prices, not your bill.</p>
            </>
          ) : (
            <p className="stack-summary-empty">
              {model.unpricedPlans > 0
                ? "Published plan price unavailable"
                : model.targets.length > 0
                  ? "No fixed plan price"
                  : "Add a plan to see its price"}
            </p>
          )}
          {!empty ? (
            <details className="stack-price-note">
              <summary>What is included?</summary>
              <p>
                One published price per subscription in your stack (two subscriptions of the same
                plan count twice), grouped by currency and billing interval. Seat quantities, taxes,
                discounts and actual payments are not included.
                {model.unpricedPlans > 0
                  ? ` ${model.unpricedPlans} selected ${model.unpricedPlans === 1 ? "plan has" : "plans have"} no current published price.`
                  : ""}
                {model.apiTargets > 0
                  ? ` ${model.apiTargets} API ${model.apiTargets === 1 ? "target is" : "targets are"} excluded from these subtotals.`
                  : ""}{" "}
                Facts accepted {DECISION_MARKET.rulesAt.slice(0, 10)}.
              </p>
            </details>
          ) : null}
        </div>

        <div className="stack-summary-figure" data-testid="stack-workload-value">
          <p className="stack-eyebrow">Recorded workload</p>
          {overall ? (
            <>
              <p className="stack-figure">{overall.calls.toLocaleString("en-US")}</p>
              <p className="stack-summary-sub">
                {unit}
                {workload ? ` · ${workloadPeriodText(workload)}` : ""}
              </p>
              {value ? (
                <p className="stack-caption" title={rangeText(value)}>
                  <span className="stack-summary-value" data-testid="stack-api-equivalent">
                    {headline(value)}
                  </span>{" "}
                  API-equivalent
                  {overall.value
                    ? " · every call priced"
                    : ` for ${overall.pricedValue?.calls.toLocaleString("en-US")} priced calls; the rest are unknown, not zero`}{" "}
                  · API list prices as of {formatCatalogDate(DECISION_MARKET.rulesAt.slice(0, 10))}
                </p>
              ) : (
                <p className="stack-caption">
                  {overall.calls === 0
                    ? "No recorded calls in this period."
                    : "Not priced: no applicable accepted API prices. Nothing is estimated."}
                </p>
              )}
            </>
          ) : (
            workloadState
          )}
        </div>

        <div className="stack-summary-figure" data-testid="stack-coverage">
          <p className="stack-eyebrow">Analysis coverage</p>
          {empty ? (
            <p className="stack-caption">
              Add a subscription to see what this workload can evaluate.
            </p>
          ) : (
            <>
              <p className="stack-figure" data-testid="stack-coverage-count">
                {workload ? coverage.analyzed : "–"}
                <span>of {coverage.total}</span>
              </p>
              <p className="stack-summary-sub">
                {coverage.total === 1 ? "subscription" : "subscriptions"} with history loaded
              </p>
              <ul className="stack-coverage-list">
                {coverage.lines.map((line) => (
                  <li
                    key={line.key}
                    data-state={line.state}
                    data-testid={`stack-coverage-${line.ref}`}
                  >
                    <span aria-hidden="true" className="stack-coverage-mark" />
                    <span className="stack-coverage-plan">
                      {line.plan}
                      {line.account ? (
                        <span className="stack-coverage-account"> · {line.account}</span>
                      ) : null}
                    </span>
                    <span className="stack-coverage-text">{line.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      {!empty && workload ? (
        <p
          className="stack-coverage-headline"
          data-testid="stack-coverage-headline"
          data-complete={coverage.analyzed === coverage.total ? "true" : "false"}
        >
          {coverage.headline}
        </p>
      ) : null}
      {period}
    </section>
  );
}

export function WorkloadMissing({ hasSaved }: { hasSaved: boolean }) {
  return (
    <>
      <p className="stack-summary-empty">{hasSaved ? "No workload selected" : "No workload yet"}</p>
      <p className="stack-caption">
        {hasSaved
          ? "Choose a saved workload above to analyze your stack against it."
          : "Scan your AI history to see what your subscriptions actually carried."}
      </p>
      {!hasSaved ? (
        <Link href="/app/import" className="stack-link">
          Scan history →
        </Link>
      ) : null}
    </>
  );
}
