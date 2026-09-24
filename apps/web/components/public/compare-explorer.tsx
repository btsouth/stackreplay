"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import type { CompareFacts } from "@/lib/compare-facts";
import type { PublicPlanSummary, PublicProviderSummary } from "@/lib/public-catalog";
import { limitUnitText, limitWindowText } from "./plan-facts";
import { SourceList, VerificationBadge } from "./provenance";

/**
 * Public plan comparison (launch).
 *
 * Rows follow the questions a person asks before choosing a plan, in order:
 * price, models, coding tools, usage limits, what StackReplay can simulate,
 * what happens after the limit, and evidence. Every catalog detail (limit
 * types, provider statements, model rules, versions, sources) stays one level
 * down under "Inspect constraints and sources".
 */

function ModelsCell({ facts }: { facts: CompareFacts }) {
  const { featured, more, total } = facts.models;
  if (total === 0) {
    return <p className="text-muted-foreground">No named model is listed for this plan.</p>;
  }
  return (
    <div>
      <p className="text-foreground">{featured.map((model) => model.name).join(", ")}</p>
      {more.length === 0 ? null : (
        <details className="mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
            + {more.length} more
          </summary>
          <ul className="space-y-1 pb-2 text-sm text-foreground" data-testid="compare-more-models">
            {more.map((model) => (
              <li key={model.id}>
                {model.name}
                {model.legacy ? <span className="text-muted-foreground"> · Legacy</span> : null}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function UsageCell({ facts }: { facts: CompareFacts }) {
  if (!facts.usage.numeric) {
    return <p className="text-foreground">Provider does not publish a numeric allowance.</p>;
  }
  return (
    <ul className="space-y-2">
      {facts.usage.lines.map((line) => (
        <li key={`${line.text}-${line.detail}`}>
          <span className="text-foreground">{line.text}</span>
          <span className="block text-xs text-muted-foreground">{line.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function AfterLimitCell({ facts }: { facts: CompareFacts }) {
  const { lines, quotes } = facts.afterLimit;
  if (lines.length === 0 && quotes.length === 0) {
    return <p className="text-muted-foreground">Not stated in the sources StackReplay records.</p>;
  }
  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <p key={line} className="text-foreground">
          {line}
        </p>
      ))}
      {lines.length === 0
        ? quotes.slice(0, 1).map((quote) => (
            <blockquote
              key={quote.text}
              className="border-l border-border-strong pl-3 text-muted-foreground"
            >
              &ldquo;{quote.excerpt}&rdquo;
            </blockquote>
          ))
        : null}
    </div>
  );
}

function InspectCell({ plan, facts }: { plan: PublicPlanSummary; facts: CompareFacts }) {
  return (
    <details className="border-t border-border pt-1 sm:border-t-0 sm:pt-0">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
        Inspect constraints and sources
      </summary>
      <div className="space-y-5 pb-4 pt-2 text-sm" data-testid="compare-inspect">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Numeric limits
          </p>
          {plan.limits.length === 0 ? (
            <p className="mt-1 text-muted-foreground">No numeric limit is published.</p>
          ) : (
            <ul className="mt-1 space-y-3">
              {plan.limits.map((limit) => (
                <li key={limit.id} className="border-l border-border-strong pl-3">
                  <span className="font-medium text-foreground">{limit.label}</span>
                  <span className="block text-muted-foreground">
                    {limit.amount} {limitUnitText(limit)} · {limitWindowText(limit)} ·{" "}
                    {limit.exceed.replaceAll("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {plan.qualitativeLimits.length > 0 ? (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Provider statements
            </p>
            <ul className="mt-1 space-y-2 text-xs text-muted-foreground">
              {plan.qualitativeLimits.map((limit) => (
                <li key={limit.id}>
                  <span className="font-medium text-foreground">{limit.label}.</span>{" "}
                  {limit.statement}
                  {limit.sourceUrl === undefined ? null : (
                    <>
                      {" "}
                      <a
                        className="text-accent underline underline-offset-2"
                        href={limit.sourceUrl}
                        rel="noreferrer noopener"
                        target="_blank"
                      >
                        Source
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Model rules
          </p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {facts.rules.map((rule) => (
              <li key={rule.id}>
                <span className="text-foreground">{rule.name}</span>{" "}
                <span className="font-mono">({rule.id})</span> · {rule.kindLabel}
                {rule.excluded
                  ? rule.usageCredits
                    ? " · usage credits only"
                    : " · not included"
                  : ""}
                {rule.multiplier === undefined ? "" : ` · ×${rule.multiplier}`}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Version
          </p>
          <p className="mt-1 break-all font-mono text-xs text-foreground">{plan.versionId}</p>
          <p className="text-xs text-muted-foreground">
            {facts.effective} · {plan.versionCount}{" "}
            {plan.versionCount === 1 ? "version" : "versions"} on record
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Sources
          </p>
          <SourceList sources={plan.sources} />
          <VerificationBadge
            status={plan.verificationStatus}
            lastVerifiedAt={plan.lastVerifiedAt}
          />
        </div>
      </div>
    </details>
  );
}

function Row({
  label,
  left,
  right,
  leftName,
  rightName,
  testId,
}: {
  label: string;
  left: ReactNode;
  right: ReactNode;
  leftName: string;
  rightName: string;
  testId: string;
}) {
  return (
    <div
      className="grid gap-x-6 gap-y-3 border-b border-border py-4 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]"
      data-testid={`compare-row-${testId}`}
    >
      <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-0.5">
        {label}
      </h3>
      <div className="min-w-0">
        <p className="mb-1 text-xs text-muted-foreground sm:hidden">{leftName}</p>
        {left}
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-xs text-muted-foreground sm:hidden">{rightName}</p>
        {right}
      </div>
    </div>
  );
}

function TargetHeader({ plan, facts }: { plan: PublicPlanSummary; facts: CompareFacts }) {
  return (
    <section className="min-w-0 border-t border-border-strong pt-4" data-testid="compare-target">
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {plan.providerName}
      </p>
      <h2 className="mt-1 text-xl font-medium text-foreground">
        <Link className="hover:text-accent hover:underline" href={`/plans/${plan.id}`}>
          {plan.name}
        </Link>
      </h2>
      <p
        className="mt-3 font-mono text-3xl tabular-nums text-foreground"
        data-testid="compare-price"
      >
        {facts.price}
      </p>
      <Link
        className="mt-1 inline-flex min-h-11 items-center text-sm text-accent underline underline-offset-4"
        href={`/app/import?target=${encodeURIComponent(plan.id)}`}
      >
        Replay your workload here ↗
      </Link>
    </section>
  );
}

export function CompareExplorer({
  plans,
  providers,
  facts,
  initialPair,
}: {
  plans: readonly PublicPlanSummary[];
  providers: readonly PublicProviderSummary[];
  facts: Readonly<Record<string, CompareFacts>>;
  initialPair: readonly [string, string];
}) {
  const [leftId, setLeftId] = useState(initialPair[0]);
  const [rightId, setRightId] = useState(initialPair[1]);
  const left = plans.find((plan) => plan.id === leftId);
  const right = plans.find((plan) => plan.id === rightId);
  const leftFacts = facts[leftId];
  const rightFacts = facts[rightId];
  const selector = (label: string, value: string, change: (id: string) => void) => (
    <label className="flex min-w-0 flex-col gap-2 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => change(event.target.value)}
        className="min-h-11 w-full border border-control-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {providers.map((provider) => (
          <optgroup key={provider.id} label={provider.name}>
            {plans
              .filter((plan) => plan.providerId === provider.id)
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
  const ready =
    left !== undefined &&
    right !== undefined &&
    leftFacts !== undefined &&
    rightFacts !== undefined;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 border-y border-border-strong py-4 sm:grid-cols-2">
        {selector("First plan", leftId, setLeftId)}
        {selector("Second plan", rightId, setRightId)}
      </div>
      {leftId === rightId ? (
        <p className="text-sm text-muted-foreground">
          Choose a different second plan to see a comparison.
        </p>
      ) : null}
      {ready ? (
        <div className="flex min-w-0 flex-col" data-testid="compare-table">
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="hidden sm:block" />
            <TargetHeader plan={left} facts={leftFacts} />
            <TargetHeader plan={right} facts={rightFacts} />
          </div>
          <div className="mt-4 border-t border-border">
            <Row
              label="Models"
              testId="models"
              leftName={left.name}
              rightName={right.name}
              left={<ModelsCell facts={leftFacts} />}
              right={<ModelsCell facts={rightFacts} />}
            />
            <Row
              label="Coding tools"
              testId="coding-tools"
              leftName={left.name}
              rightName={right.name}
              left={
                <p className="text-foreground">
                  {leftFacts.codingTools.join(", ") || "Not named in this plan's sources"}
                </p>
              }
              right={
                <p className="text-foreground">
                  {rightFacts.codingTools.join(", ") || "Not named in this plan's sources"}
                </p>
              }
            />
            <Row
              label="Usage limits"
              testId="usage"
              leftName={left.name}
              rightName={right.name}
              left={<UsageCell facts={leftFacts} />}
              right={<UsageCell facts={rightFacts} />}
            />
            <Row
              label="StackReplay can simulate"
              testId="simulation"
              leftName={left.name}
              rightName={right.name}
              left={<p className="text-foreground">{leftFacts.simulation}</p>}
              right={<p className="text-foreground">{rightFacts.simulation}</p>}
            />
            <Row
              label="After the limit"
              testId="after-limit"
              leftName={left.name}
              rightName={right.name}
              left={<AfterLimitCell facts={leftFacts} />}
              right={<AfterLimitCell facts={rightFacts} />}
            />
            <Row
              label="Evidence"
              testId="evidence"
              leftName={left.name}
              rightName={right.name}
              left={<p className="text-xs text-muted-foreground">{leftFacts.evidence}</p>}
              right={<p className="text-xs text-muted-foreground">{rightFacts.evidence}</p>}
            />
            <Row
              label="Details"
              testId="inspect"
              leftName={left.name}
              rightName={right.name}
              left={<InspectCell plan={left} facts={leftFacts} />}
              right={<InspectCell plan={right} facts={rightFacts} />}
            />
          </div>
        </div>
      ) : null}
      <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
        These are the plans as their providers document them. There is no score or winner here. To
        see how each plan handles the work you actually do, replay your own history against them.
      </p>
      <Link
        className="inline-flex min-h-11 items-center self-start text-sm text-accent underline underline-offset-4"
        href="/app/compare"
        data-testid="compare-with-workload"
      >
        Compare against my workload →
      </Link>
    </div>
  );
}
