"use client";

import type { ProjectedCrossingV1, ProjectedReplayV1 } from "@stackreplay/replay-engine";
import {
  behaviourPhrase,
  billsExcess,
  dispositionPhrase,
  refusesExcess,
} from "./constraint-behaviour";
import { formatCount, formatInstant, formatUnit, unitNoun } from "./format";
import { LedgerRow, MicroLabel, SectionIndex, StatusWord } from "./primitives";

/**
 * Constraint forensics: what the target's own rules did to the workload.
 *
 * Subscription targets get their constraints, and every crossing the engine
 * recorded is inspectable in place. A Direct API target has no allowance, so it
 * gets no constraint rows at all: instead of an empty table it shows what a
 * direct target can actually establish, which is priceability, and says plainly
 * that there is no allowance to exceed.
 *
 * Each crossing is a native disclosure: it stays inside the chronology it
 * explains, it opens from the keyboard, and it works with no JavaScript state of
 * its own, which is also why it survives reduced motion unchanged.
 */
export function ConstraintTrace({
  projection,
  index = "04",
  chronologyActive,
}: {
  projection: ProjectedReplayV1;
  index?: string;
  chronologyActive: boolean;
}) {
  const constraints = projection.constraints;
  const crossings = projection.crossings;
  const isApi = projection.target.kind === "api";

  if (isApi) {
    const pricing = projection.pricing;
    return (
      <section
        className="flex flex-col gap-3 border-t border-border pt-4"
        data-testid="constraint-trace"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionIndex index={index} label="Pricing applicability" />
          <MicroLabel>no allowance to exceed</MicroLabel>
        </div>
        {/* The absence of constraints is the statement here: an API target
            rejects nothing at the allowance level, so the panel says so
            instead of rendering an empty table. */}
        <p
          className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
          data-testid="api-no-constraints"
        >
          A Direct API target declares no allowance, no reset and no admission rule, so there is no
          constraint to exceed and no blocked or overage state in the result below. What a direct
          target can establish is priceability.
        </p>
        <div className="flex flex-col">
          <LedgerRow
            label="Events the target admits"
            note="the target's own rules admitted them; this says nothing about their price"
            testId="api-served-events"
            value={formatCount(pricing?.servedEvents) ?? "unknown"}
          />
          <LedgerRow
            label="Events the engine could price"
            note="its pricing evidence found a price in force for them"
            testId="api-priced-events"
            value={formatCount(pricing?.pricedEvents) ?? "unknown"}
          />
          <LedgerRow
            label="Events it could not price"
            note="admitted by the target's service outcome, but the engine's pricing evidence did not establish a price for them"
            testId="api-unpriced-events"
            value={formatCount(pricing?.unpricedEvents) ?? "unknown"}
          />
        </div>
        {pricing?.reason === undefined ? null : (
          <p
            className="max-w-prose text-[11px] leading-relaxed text-muted-foreground"
            data-testid="api-pricing-reason"
          >
            {pricing.reason}
          </p>
        )}
        <p className="max-w-prose text-[11px] leading-relaxed text-muted-foreground">
          {projection.economics.targetCostEstablished
            ? "The engine priced every event it could decide, so the total below covers this workload. "
            : "The engine reported no total for this workload: part of the demand is unpriced or unserved, and a subtotal would present part of it as the whole. "}
          A Direct API target rejects nothing at the allowance level, and this result invents no
          overage or blocked state to fill that column.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`flex flex-col gap-3 border-t pt-4 transition-colors duration-300 motion-reduce:transition-none ${
        chronologyActive ? "border-accent" : "border-border"
      }`}
      data-testid="constraint-trace"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <SectionIndex index={index} label="Constraint trace" />
        <MicroLabel>
          {crossings.length === 0
            ? "no crossing recorded"
            : crossings.length === 1
              ? "1 crossing recorded"
              : `${crossings.length} crossings recorded`}
        </MicroLabel>
      </div>
      <ul className="flex flex-col">
        {constraints.map((constraint) => (
          <li
            className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0"
            data-testid={`constraint-${constraint.id}`}
            key={constraint.id}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="flex min-w-0 flex-col">
                <span className="text-xs text-foreground">{constraint.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {constraint.window} · {constraint.exceed.replace(/_/gu, " ")}
                </span>
              </span>
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {formatUnit(constraint.consumedUnits, constraint.unit) ?? "unknown"}
                  <span className="text-muted-foreground">
                    {" / "}
                    {formatUnit(constraint.limitUnits, constraint.unit) ?? "unknown"}
                  </span>
                </span>
                <ConstraintStatus status={constraint.status} />
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                {formatUnit(constraint.attemptedUnits, constraint.unit) ?? "unknown"}{" "}
                {unitNoun(constraint.unit)} attempted
              </span>
              {refusesExcess(constraint.exceed) ? (
                <span>
                  {formatCount(constraint.rejectedEvents) ?? "unknown"} events{" "}
                  {constraint.exceed === "latch_until_reset" ? "blocked while latched" : "rejected"}
                </span>
              ) : (
                <span>
                  {formatCount(constraint.rejectedEvents) ?? "unknown"} events refused
                  {billsExcess(constraint.exceed)
                    ? " (this rule bills the excess instead)"
                    : constraint.exceed === "record_only"
                      ? ": it records the window and refuses nothing"
                      : ""}
                </span>
              )}
              {constraint.indeterminateEvents > 0 ? (
                <span className="text-warning">
                  {formatCount(constraint.indeterminateEvents) ?? "—"} events undecided
                </span>
              ) : null}
              {constraint.overageUnits === undefined ? null : (
                <span>
                  {formatUnit(constraint.overageUnits, constraint.unit)}{" "}
                  {billsExcess(constraint.exceed) ? "above allowance" : "measured above capacity"}
                  {constraint.overageCost === undefined || !billsExcess(constraint.exceed)
                    ? ""
                    : ` · ${formatUnit(constraint.overageCost, "usd")} billed`}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {crossings.length === 0 ? (
        <p className="max-w-prose text-[11px] leading-relaxed text-muted-foreground">
          This demand stayed inside every window the target declares. That is a statement about the
          rules that were modelled, not about the whole account.
        </p>
      ) : (
        <div className="flex flex-col gap-2" data-testid="violations">
          <MicroLabel>Recorded crossings</MicroLabel>
          {crossings.map((crossing) => (
            <CrossingRow
              constraint={constraints.find((entry) => entry.id === crossing.constraintId)}
              crossing={crossing}
              key={crossing.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ConstraintStatus({
  status,
}: {
  status: ProjectedReplayV1["constraints"][number]["status"];
}) {
  switch (status) {
    case "exceeded":
      return <StatusWord tone="negative">exceeded</StatusWord>;
    case "pass":
      return <StatusWord tone="positive">within limits</StatusWord>;
    case "unknown":
      return <StatusWord tone="warning">unknown</StatusWord>;
    default:
      return <StatusWord tone="neutral">not applicable</StatusWord>;
  }
}

/**
 * One crossing, closed until asked. The summary carries the two numbers that
 * make the crossing legible; the open state carries the window, the demand, the
 * declared limit and what the rule did about it.
 */
function CrossingRow({
  crossing,
  constraint,
}: {
  crossing: ProjectedCrossingV1;
  constraint: ProjectedReplayV1["constraints"][number] | undefined;
}) {
  return (
    <details className="border-l border-accent pl-3" data-testid={`crossing-${crossing.index}`}>
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-baseline justify-between gap-2 py-2">
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-foreground">
            {crossing.constraintLabel}
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
              {crossing.kind === "rolling_window_exceeded" ? "rolling window" : "calendar window"}
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            from {formatInstant(crossing.startedAt) ?? "an unrecorded instant"}
            {crossing.endedAt === "" ? "" : ` to ${formatInstant(crossing.endedAt)}`}
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {formatUnit(crossing.observedUnits, crossing.unit) ?? "unknown"}
          <span className="text-muted-foreground">
            {" vs "}
            {formatUnit(crossing.includedUnits, crossing.unit) ?? "unknown"} included
          </span>
        </span>
      </summary>
      <dl
        className="grid grid-cols-2 gap-x-6 gap-y-2 pb-2 pt-1 text-[11px] sm:grid-cols-3"
        data-testid={`crossing-detail-${crossing.index}`}
      >
        <CrossingFact
          label="Window"
          value={`${crossing.startedAt} to ${crossing.endedAt === "" ? "open" : crossing.endedAt}`}
        />
        <CrossingFact
          label="Attempted demand"
          value={formatUnit(crossing.observedUnits, crossing.unit) ?? "unknown"}
        />
        <CrossingFact
          label="Window limit"
          value={formatUnit(constraint?.limitUnits, crossing.unit) ?? "unknown"}
        />
        <CrossingFact
          label="Accepted"
          value={formatUnit(crossing.acceptedUnits, crossing.unit) ?? "unknown"}
        />
        <CrossingFact
          label="Affected events"
          value={formatCount(crossing.affectedEvents) ?? "unknown"}
        />
        <CrossingFact
          label="Above included capacity"
          value={
            crossing.excessUnits === undefined
              ? "not quantified: the rule records the window without splitting the excess"
              : (formatUnit(crossing.excessUnits, crossing.unit) ?? "unknown")
          }
        />
        <CrossingFact label="Behaviour" value={behaviourPhrase(crossing.exceed)} />
        <CrossingFact label="Disposition" value={dispositionPhrase(crossing.exceed)} />
      </dl>
    </details>
  );
}

function CrossingFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}
