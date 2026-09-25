"use client";

import { formatUsd } from "@stackreplay/share";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { count, instantWithZone, plainRange } from "@/components/workload/format";
import {
  configurablePlans,
  configuredMonthlyPrice,
  configuredPlans,
  configuredStackSupport,
  eligiblePlans,
  PURCHASE_DECISIONS,
  type PurchaseDecision,
  selectedPlan,
} from "@/lib/compare-decision";
import {
  type TargetCoverage,
  type TargetKey,
  targetCoverages,
  type WorkloadSlice,
  workloadSlice,
} from "@/lib/routes";
import { localDayOf } from "@/lib/timeline";
import { describeWorkerFailure, getWorkerClient, type ReplayOutcome } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import type { WorkloadProfile } from "@/lib/workload-profile";

interface Pair {
  key: string;
  plan?: ReplayOutcome;
  api?: ReplayOutcome;
  stage: "plan" | "api" | "complete" | "error";
  error?: string;
}

function ReplayLink({
  importId,
  scope,
  target,
  children,
}: {
  importId: string;
  scope: readonly string[];
  target?: TargetKey;
  children: ReactNode;
}) {
  const params = new URLSearchParams({ import: importId });
  if (scope.length > 0) params.set("scope", scope.join(","));
  if (target?.startsWith("plan:")) params.set("target", target.slice(5));
  if (target?.startsWith("api:")) params.set("api", target.slice(4));
  return (
    <Link
      className="inline-flex min-h-11 items-center text-sm text-accent hover:underline"
      href={`/app/replay?${params.toString()}`}
    >
      {children} →
    </Link>
  );
}

function Row({
  label,
  subscription,
  api,
  testId,
}: {
  label: string;
  subscription: ReactNode;
  api: ReactNode;
  testId: string;
}) {
  return (
    <div
      className="grid min-w-0 gap-3 border-t border-border py-4 text-sm md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-7"
      data-testid={testId}
    >
      <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
      <div className="min-w-0 leading-relaxed">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:hidden">
          Subscription
        </span>
        {subscription}
      </div>
      <div className="min-w-0 leading-relaxed">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:hidden">
          Direct API
        </span>
        {api}
      </div>
    </div>
  );
}

function ColumnHead({ subscription, api }: { subscription: string; api: string }) {
  return (
    <div className="hidden border-b border-border pb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:grid md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-7">
      <span>Decision fact</span>
      <span>{subscription}</span>
      <span>{api}</span>
    </div>
  );
}

function modelReading(coverage: TargetCoverage | undefined, slice: WorkloadSlice): string {
  if (coverage === undefined) return "No catalogued target offering in force for this scope.";
  const unavailable = slice.events - coverage.runnable - slice.unresolvedEvents;
  const parts = [
    `${count(coverage.runnable)} of ${count(slice.events)} calls on offered models`,
    unavailable > 0 ? `${count(unavailable)} on unavailable models` : undefined,
    slice.unresolvedEvents > 0
      ? `${count(slice.unresolvedEvents)} with unresolved model identity`
      : undefined,
  ];
  return `${parts.filter(Boolean).join(" · ")}.`;
}

function demandReading(
  outcome: ReplayOutcome | undefined,
  name: string,
  api: boolean,
  timeZone: string,
): string {
  if (outcome === undefined) return "Checking recorded demand…";
  if (api) return "No subscription allowance. Served usage is metered at published rates.";
  const projection = outcome.projection;
  if (projection.constraints.length === 0)
    return (
      name +
      " does not publish a numeric capacity limit for this work. Model support is still known."
    );
  const crossing = projection.crossings.find((item) => item.exceededAt !== undefined);
  if (crossing?.exceededAt !== undefined)
    return (
      "First published limit crossed " +
      instantWithZone(Date.parse(crossing.exceededAt), timeZone) +
      ". " +
      count(projection.crossings.length) +
      " crossing windows in the observed chronology."
    );
  const unknown = projection.outcomes.find((item) => item.key === "unknown")?.count ?? 0;
  return unknown > 0
    ? "No published limit crossed for decidable demand; " +
        count(unknown) +
        " calls remain undecided."
    : "No published limit crossed in your recorded chronology.";
}

function apiPrice(outcome: ReplayOutcome | undefined, slice: WorkloadSlice): ReactNode {
  if (outcome === undefined) return "Calculating published-rate usage…";
  const resolved = outcome.resolvedScope;
  const amount =
    resolved?.projection.economics.targetCost ?? outcome.projection.economics.targetCost;
  const priced = resolved?.projection.workload.eventCount ?? outcome.priceability?.priced ?? 0;
  if (amount === undefined)
    return `No complete published-rate total. Priceable usage: ${count(outcome.priceability?.priced ?? 0)} of ${count(slice.events)} calls. The rest are not estimated.`;
  return (
    <>
      <strong className="font-medium">{formatUsd(amount)}</strong> modeled usage at published API
      rates for {count(priced)} of {count(slice.events)} calls. Not what you paid.
    </>
  );
}

function gaps(
  coverage: TargetCoverage | undefined,
  outcome: ReplayOutcome | undefined,
  api: boolean,
): string {
  if (coverage === undefined) return "Offering evidence is unavailable.";
  const unavailable = coverage.events - coverage.runnable - coverage.unresolved;
  const price = outcome?.priceability;
  const unpriced =
    api && price !== undefined
      ? price.usage_incomplete +
        price.price_not_recorded +
        price.price_category_undocumented +
        price.offering_unestablished
      : 0;
  const parts = [
    unavailable > 0
      ? `${count(unavailable)} calls on models this target does not offer`
      : undefined,
    coverage.unresolved > 0
      ? `${count(coverage.unresolved)} calls with unresolved model identity`
      : undefined,
    unpriced > 0
      ? `${count(unpriced)} ${unpriced === 1 ? "call" : "calls"} without complete API pricing evidence`
      : undefined,
  ];
  return parts.filter(Boolean).length === 0
    ? "No model or identity gap established."
    : `${parts.filter(Boolean).join(" · ")}.`;
}

/**
 * The decision in two figures: what the plan costs and what is known about it
 * carrying this work, beside what the same calls cost at API list prices. They
 * are set side by side with their own units and never subtracted.
 */
function PurchaseAnswer({
  plan,
  planName,
  planOutcome,
  api,
  apiName,
  slice,
  timeZone,
}: {
  plan: ReturnType<typeof eligiblePlans>[number] | undefined;
  planName: string;
  planOutcome: ReplayOutcome | undefined;
  api: ReplayOutcome | undefined;
  apiName: string;
  slice: WorkloadSlice;
  timeZone: string;
}) {
  const resolved = api?.resolvedScope;
  const apiAmount =
    resolved?.projection.economics.targetCost ?? api?.projection.economics.targetCost;
  const apiCalls = resolved?.projection.workload.eventCount ?? api?.priceability?.priced;
  const days = api?.projection.workload.windowDays;
  const projection = planOutcome?.projection;
  const crossing = projection?.crossings.find((item) => item.exceededAt !== undefined);
  const capacity =
    projection === undefined
      ? "Checking this plan against your recorded demand…"
      : projection.constraints.length === 0
        ? `Its limits are unpublished, so whether ${planName} would have kept up with these calls can't be determined.`
        : crossing?.exceededAt !== undefined
          ? `Its published limit would have been crossed first on ${instantWithZone(Date.parse(crossing.exceededAt), timeZone)}.`
          : "No published limit would have been crossed by this recorded demand.";
  const money = (amount: string | undefined) => {
    const shown = formatUsd(amount);
    if (shown === undefined) return undefined;
    const [whole, cents] = shown.split(".");
    return { whole: whole ?? shown, cents };
  };
  const planPrice = money(plan?.price.amount);
  const apiPrice = money(apiAmount);
  return (
    <div
      className="grid min-w-0 gap-6 border-b border-border pb-6 md:grid-cols-2 md:gap-10"
      data-testid="compare-answer"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {planName} · subscription
        </p>
        {planPrice === undefined ? (
          <p className="text-sm text-muted-foreground">No published plan price in force.</p>
        ) : (
          <p className="sr-figure sr-figure--compact" data-kind="money">
            {planPrice.whole}
            <small className="sr-figure-minor">
              {planPrice.cents === undefined || planPrice.cents === "00"
                ? ""
                : `.${planPrice.cents}`}
              /{plan?.price.interval}
            </small>
          </p>
        )}
        <p className="max-w-[48ch] text-sm leading-relaxed">{capacity}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {apiName} · list prices
        </p>
        {api === undefined ? (
          <p className="text-sm text-muted-foreground" role="status">
            Pricing the same {count(slice.events)} calls…
          </p>
        ) : apiPrice === undefined ? (
          <p className="text-sm leading-relaxed">
            No complete published-rate total for these calls; the unpriced ones are not estimated.
          </p>
        ) : (
          <>
            <p className="sr-figure sr-figure--compact" data-kind="money">
              {apiPrice.whole}
              {apiPrice.cents === undefined ? null : (
                <small className="sr-figure-minor">.{apiPrice.cents}</small>
              )}
            </p>
            <p className="max-w-[48ch] text-sm leading-relaxed">
              For {apiCalls === undefined ? "these" : count(apiCalls)}
              {apiCalls !== undefined && apiCalls < slice.events
                ? ` of ${count(slice.events)}`
                : ""}{" "}
              calls{days === undefined ? "" : ` over ${count(days)} days`}, at published API rates.
              Not what you paid.
            </p>
          </>
        )}
      </div>
      <p className="max-w-[80ch] text-xs leading-relaxed text-muted-foreground md:col-span-2">
        Two different ways to buy the same work: a fixed monthly price with limits, or metered
        usage. The difference between the two figures is not a saving.
      </p>
    </div>
  );
}

export function PurchaseComparison({
  decision,
  record,
  profile,
  current,
  rulesAsOf,
}: {
  decision: PurchaseDecision;
  record: ImportRecord;
  profile: WorkloadProfile;
  current: readonly TargetKey[];
  rulesAsOf: string;
}) {
  const client = getWorkerClient();
  const definition = PURCHASE_DECISIONS[decision];
  const [chosenPlan, setChosenPlan] = useState<string | undefined>();
  const [pair, setPair] = useState<Pair | undefined>();
  const planId = chosenPlan ?? selectedPlan(decision, current, rulesAsOf);
  const pairKey = [record.id, decision, planId, rulesAsOf].join("|");
  const shown = pair?.key === pairKey ? pair : undefined;
  const names = new Map(record.summary.usageSources.map((item) => [item.adapterId, item.name]));
  const slice = workloadSlice(profile.sources, names, [definition.source]);
  const options = targetCoverages(slice, rulesAsOf, { synthetic: isSyntheticWorkload(record) });
  const plan = eligiblePlans(decision, rulesAsOf).find((item) => item.id === planId);
  const planCoverage = options.find((item) => item.key === `plan:${planId}`);
  const apiCoverage = options.find((item) => item.key === `api:${definition.api}`);
  const planName = plan?.name ?? "Selected subscription";
  const apiName = definition.api === "anthropic" ? "Anthropic API" : "OpenAI API";
  const first = shown?.plan?.projection.workload.from;
  const last = shown?.plan?.projection.workload.to;
  const day = localDayOf(profile.timeZone);
  const scopeDates =
    first === undefined || last === undefined
      ? "Checking this slice's dates…"
      : plainRange(day(first), day(last));

  useEffect(() => {
    if (planId === undefined) return;
    let active = true;
    setPair({ key: pairKey, stage: "plan" });
    void (async () => {
      try {
        const result = await client.runReplay(
          record.id,
          { type: "subscription", planId },
          rulesAsOf,
          undefined,
          { sources: [definition.source] },
        );
        if (!active) return;
        setPair({ key: pairKey, stage: "api", plan: result });
        const api = await client.runReplay(
          record.id,
          { type: "api", providerId: definition.api },
          rulesAsOf,
          undefined,
          { sources: [definition.source] },
        );
        if (active) setPair({ key: pairKey, stage: "complete", plan: result, api });
      } catch (failure) {
        if (active)
          setPair({ key: pairKey, stage: "error", error: describeWorkerFailure(failure).title });
      }
    })();
    return () => {
      active = false;
    };
  }, [client, definition.api, definition.source, pairKey, planId, record.id, rulesAsOf]);

  return (
    <section className="flex min-w-0 flex-col gap-6" data-testid="purchase-comparison">
      <div className="border-y border-accent/60 py-4" data-testid="comparison-object">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Comparing one recorded slice
        </p>
        <h2 className="mt-1 text-xl font-medium">{definition.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {count(slice.events)} calls · {scopeDates} · Models as recorded
        </p>
      </div>
      <label
        className="flex flex-col gap-1 self-start text-xs text-muted-foreground"
        htmlFor="compare-plan"
      >
        {decision === "claude" ? "Claude plan" : "ChatGPT plan"}
        <select
          id="compare-plan"
          className="min-h-11 min-w-56 border border-border bg-background px-3 text-sm text-foreground"
          value={planId ?? ""}
          onChange={(event) => setChosenPlan(event.target.value)}
          data-testid="compare-plan"
        >
          {eligiblePlans(decision, rulesAsOf).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {current.includes(`plan:${planId}` as TargetKey) ? (
          <span className="text-accent">In your configured stack</span>
        ) : null}
      </label>
      <PurchaseAnswer
        api={shown?.api}
        apiName={apiName}
        plan={plan}
        planName={planName}
        planOutcome={shown?.plan}
        slice={slice}
        timeZone={profile.timeZone}
      />
      <ColumnHead subscription={`Subscription · ${planName}`} api={`Direct API · ${apiName}`} />
      <div data-testid="compare-results">
        <Row
          label="Recorded models supported?"
          testId="compare-models"
          subscription={modelReading(planCoverage, slice)}
          api={modelReading(apiCoverage, slice)}
        />
        <Row
          label="At your observed demand"
          testId="compare-demand"
          subscription={demandReading(shown?.plan, planName, false, profile.timeZone)}
          api={demandReading(shown?.api, apiName, true, profile.timeZone)}
        />
        <Row
          label="Price basis"
          testId="compare-price"
          subscription={
            plan === undefined ? (
              "No published plan price in force."
            ) : (
              <>
                {formatUsd(plan.price.amount)} per {plan.price.interval} for the plan
                {shown?.plan?.projection.economics.overageCost === undefined
                  ? ""
                  : `; modeled overage ${formatUsd(shown.plan.projection.economics.overageCost)}`}
                . No per-token subscription value is inferred.
              </>
            )
          }
          api={apiPrice(shown?.api, slice)}
        />
        <Row
          label="Not covered / unknown"
          testId="compare-gaps"
          subscription={gaps(planCoverage, shown?.plan, false)}
          api={gaps(apiCoverage, shown?.api, true)}
        />
      </div>
      {shown?.error === undefined ? null : (
        <p role="alert" className="text-sm text-negative">
          {shown.error}
        </p>
      )}
      {shown?.stage === "complete" || shown?.stage === "error" ? null : (
        <p role="status" className="text-sm text-muted-foreground">
          Replaying the same {count(slice.events)} calls against both purchasing options…
        </p>
      )}
      <div className="flex flex-wrap gap-x-8">
        {planId === undefined ? null : (
          <ReplayLink
            importId={record.id}
            scope={slice.sources}
            target={`plan:${planId}` as TargetKey}
          >
            Inspect subscription Replay
          </ReplayLink>
        )}
        <ReplayLink
          importId={record.id}
          scope={slice.sources}
          target={`api:${definition.api}` as TargetKey}
        >
          Inspect API Replay
        </ReplayLink>
      </div>
    </section>
  );
}

export function StackComparison({
  record,
  profile,
  current,
  rulesAsOf,
  onCurrentChange,
}: {
  record: ImportRecord;
  profile: WorkloadProfile;
  current: readonly TargetKey[];
  rulesAsOf: string;
  onCurrentChange: (keys: TargetKey[]) => void;
}) {
  const plans = configuredPlans(current, rulesAsOf);
  const [pickerOpen, setPickerOpen] = useState(plans.length === 0);
  const support = configuredStackSupport(profile.sources, current, rulesAsOf);
  const monthly = configuredMonthlyPrice(plans);
  const names = new Map(record.summary.usageSources.map((item) => [item.adapterId, item.name]));
  const value = profile.value;
  const picker = configurablePlans(rulesAsOf, isSyntheticWorkload(record));
  const toggle = (key: TargetKey) => {
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    if (next.length <= 4) onCurrentChange(next);
  };
  return (
    <section className="flex min-w-0 flex-col gap-6" data-testid="stack-comparison">
      <div className="border-y border-accent/60 py-4" data-testid="comparison-object">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Comparing your configured whole stack
        </p>
        <h2 className="mt-1 text-xl font-medium">All recorded work</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {count(profile.overview.events)} calls ·{" "}
          {plainRange(profile.overview.firstDate, profile.overview.lastDate)} · Models as recorded
        </p>
      </div>
      {plans.length === 0 ? (
        <p className="max-w-prose text-sm" data-testid="stack-configure">
          Which plans do you use today? Choose them below. Imported history does not identify your
          subscriptions.
        </p>
      ) : (
        <p className="max-w-[70ch] text-sm">
          Your selected plans are remembered in this browser. Model support is a union across those
          plans; a call appears once even when more than one plan offers its model.
        </p>
      )}
      <details
        className="border-y border-border py-3"
        open={pickerOpen}
        onToggle={(event) => setPickerOpen(event.currentTarget.open)}
        data-testid="stack-plan-picker"
      >
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          {plans.length === 0 ? "Choose your plans" : "Change configured plans"}{" "}
          <span className="text-xs font-normal text-muted-foreground">· up to four</span>
        </summary>
        <fieldset className="mt-3 grid max-h-64 gap-x-5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-xs text-muted-foreground">
            Only plans you select are treated as your current stack.
          </legend>
          {picker.map((plan) => {
            const key = `plan:${plan.id}` as TargetKey;
            return (
              <label key={plan.id} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={current.includes(key)}
                  onChange={() => toggle(key)}
                  disabled={!current.includes(key) && current.length >= 4}
                  data-testid={`stack-plan-${plan.id}`}
                />
                <span className="min-w-0 flex-1">{plan.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatUsd(plan.price.amount)}/{plan.price.interval}
                </span>
              </label>
            );
          })}
        </fieldset>
      </details>
      {plans.length === 0 ? null : (
        <>
          <ColumnHead subscription="Your configured plans" api="Published API equivalent" />
          <div data-testid="compare-results">
            <Row
              label="Recorded models supported?"
              testId="compare-models"
              subscription={
                <>
                  {count(support.supported)} of {count(support.calls)} calls use models offered by
                  at least one configured plan. This checks model availability, not whether a tool
                  can use that plan.
                </>
              }
              api="Each maker's own API prices its recorded models where the catalog has a published rate."
            />
            <Row
              label="At your observed demand"
              testId="compare-demand"
              subscription="There is no combined stack allowance. Each plan has its own published rules; inspect it in Replay to test capacity against work it can serve."
              api="No subscription allowance applies. The same observed provider mix is valued at each maker's published API rates."
            />
            <Row
              label="Price basis"
              testId="compare-price"
              subscription={
                monthly === undefined ? (
                  "No single monthly total: selected plans have different billing intervals or an unavailable price."
                ) : (
                  <>
                    <strong className="font-medium">{formatUsd(monthly)}/month</strong> for{" "}
                    {plans.map((plan) => plan.name).join(" + ")}. Fixed plan prices; no per-token
                    subscription value is inferred.
                  </>
                )
              }
              api={
                value?.total === undefined ? (
                  "No complete published API value for the priceable scope."
                ) : (
                  <>
                    <strong className="font-medium">{formatUsd(value.total)}</strong> for{" "}
                    {count(value.pricedCalls)} of {count(value.recordedCalls)} calls at published
                    list prices. Not what you paid.
                  </>
                )
              }
            />
            <Row
              label="Not covered / unknown"
              testId="compare-gaps"
              subscription={
                count(support.unavailable) +
                " calls on models outside these plans · " +
                count(support.unresolved) +
                " with unresolved model identity."
              }
              api={
                value === undefined
                  ? "Pricing analysis is still loading."
                  : count(value.recordedCalls - value.pricedCalls) +
                    " calls excluded from the API equivalent; no price is guessed for them."
              }
            />
          </div>
          <div className="border-t border-border pt-4 text-sm" data-testid="stack-tool-breakdown">
            <h3 className="font-medium">Where the model support falls</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {support.tools.map((tool) => (
                <li key={tool.id} className="border-l border-border pl-3">
                  <span className="block">{names.get(tool.id) ?? tool.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {count(tool.supported)} supported · {count(tool.unavailable)} outside plans ·{" "}
                    {count(tool.unresolved)} unresolved
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
            These are different purchasing models. The plan total is a configured monthly price; the
            API figure models recorded usage at published rates. Their difference is not a savings
            figure. History does not prove which subscriptions you had.
          </p>
        </>
      )}
    </section>
  );
}
