"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import { formatUsdWhole } from "@stackreplay/share";
import Link from "next/link";
import type { ReactNode } from "react";
import { publishedPriceText } from "@/lib/my-stack";
import {
  leverageText,
  money,
  type Range,
  rangeText,
  type StackAnalysis,
  type StackWorkload,
} from "@/lib/stack-analysis";
import { EvidenceWord } from "./evidence";

/** Whole dollars read at a glance; exact cents stay in the title and the evidence. */
function headline(range: Range): string {
  const whole = (amount: string) =>
    new Decimal(amount).gte(100) ? (formatUsdWhole(amount) ?? money(amount)) : money(amount);
  const low = whole(range.low);
  const high = whole(range.high);
  return low === high ? low : `${low}–${high}`;
}

export function StackSummary({
  analysis,
  workload,
  workloadState,
  period,
  onSetup,
}: {
  analysis: StackAnalysis;
  workload: StackWorkload | undefined;
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
  return (
    <section
      className="stack-summary"
      aria-labelledby="stack-summary-heading"
      data-testid="stack-overview"
    >
      <h2 id="stack-summary-heading" className="sr-only">
        Your stack against this workload
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
              <p className="stack-caption">
                across {analysis.planCount}{" "}
                {analysis.planCount === 1 ? "subscription" : "subscriptions"} · published prices,
                not your bill
                {others.length ? ` · also ${others.map(publishedPriceText).join(", ")}` : ""}
              </p>
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
                One published price per selected plan, grouped by currency and billing interval.
                Account and seat quantities, taxes, discounts and actual payments are not included.
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
          <p className="stack-eyebrow">
            {overall?.value || !overall?.pricedValue
              ? "Recorded work · API-equivalent"
              : "Recorded work · priced calls only"}
          </p>
          {overall && value ? (
            <>
              <p className="stack-figure" title={rangeText(value)}>
                {headline(value)}
              </p>
              <p className="stack-caption">
                {overall.calls.toLocaleString("en-US")}{" "}
                {overall.distinctResponses ? "distinct responses" : "recorded calls"} ·{" "}
                {overall.value
                  ? "every call priced"
                  : `${overall.pricedValue?.calls.toLocaleString("en-US")} priced; the rest are unknown, not zero`}{" "}
                · accepted API rates {DECISION_MARKET.rulesAt.slice(0, 10)}
              </p>
            </>
          ) : overall ? (
            <>
              <p className="stack-summary-empty">
                {overall.calls === 0 ? "No recorded calls in this period" : "Not priced"}
              </p>
              <p className="stack-caption">
                {overall.calls.toLocaleString("en-US")} recorded calls · no applicable accepted API
                prices. Nothing is estimated.
              </p>
            </>
          ) : (
            workloadState
          )}
        </div>
        <div className="stack-summary-figure" data-testid="stack-leverage">
          <p className="stack-eyebrow">Subscription leverage</p>
          {analysis.leverage ? (
            <>
              <p className="stack-figure stack-figure-accent">{leverageText(analysis.leverage)}</p>
              <p className="stack-caption">
                recorded value ÷ {money(analysis.leverage.price).replace(/\.00$/u, "")}/mo{" "}
                {analysis.leverage.priceBasis === "paid" ? "paid" : "published"} ·{" "}
                <EvidenceWord level={analysis.leverage.level} />
              </p>
              <p className="stack-caption">
                {analysis.leveragePlans.length < analysis.planCount
                  ? `For ${analysis.leveragePlans.join(", ")}. `
                  : ""}
                Not money saved.
              </p>
            </>
          ) : (
            <>
              <p className="stack-summary-empty">Not available</p>
              <p className="stack-caption">
                {empty
                  ? "Add a subscription to compare it with recorded work."
                  : (analysis.leverageNote ??
                    (workload
                      ? "No recorded work is associated with your subscriptions in this period."
                      : "Select a workload to compare recorded work with what you pay."))}
              </p>
            </>
          )}
        </div>
      </div>
      {period}
      {analysis.notReadable.length ? (
        <p className="stack-caption stack-summary-note">
          StackReplay cannot read usage history for {analysis.notReadable.join(", ")}; their prices
          are in your stack total, and their use is not analyzed.
        </p>
      ) : null}
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
