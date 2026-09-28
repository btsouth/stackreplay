"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import { MicroLabel } from "@/components/instrument/primitives";
import type { CapacityBurden } from "@/lib/capacity-episodes";
import { marketRange } from "@/lib/decision-presentation";
import type { MarketDecision } from "@/lib/market-decision";
import { useReview } from "@/lib/use-review";
import { getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import type { WorkloadProfile } from "@/lib/workload-profile";
import { MarketDecisionSurface } from "./market-decision";

const usd = (n: string) => `$${new Decimal(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const n = (value: number) => value.toLocaleString("en-US");
const day = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(value.slice(0, 10) + "T00:00:00Z"),
  );
const rangeText = (range: { low: string; high: string }) =>
  range.low === range.high ? usd(range.low) : `${usd(range.low)} – ${usd(range.high)}`;

/** Aggregate receipts, not an alternative pricing implementation. */
function ModelEconomics({
  decision,
  profile,
}: {
  decision: MarketDecision | undefined;
  profile: WorkloadProfile | undefined;
}) {
  const priced = marketRange(decision) ? decision : decision?.pricedScope;
  const models = profile?.models.canonical ?? [];
  return (
    <section aria-label="Model economics" data-testid="overview-models" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-medium tracking-tight">Models &amp; API economics</h2>
        <span className="text-xs text-muted-foreground">Full imported workload · exact models</span>
      </div>
      {models.map((model) => {
        const contributions = priced?.scenarios.map((scenario) => {
          const lines =
            scenario.summary.explanation?.receipts
              .flatMap((receipt) => receipt.cash)
              .filter((cash) => {
                const resource = scenario.summary.scenario.resources.find(
                  (resource) => resource.id === cash.resourceInstanceId,
                );
                const artifact = DECISION_MARKET.scenarios
                  .find((option) => option.id === scenario.id)
                  ?.artifacts.find((artifact) => artifact.artifactHash === resource?.artifactHash);
                if (artifact?.computation.kind !== "executable") return false;
                const route = artifact.computation.routes.find(
                  (route) => route.id === cash.routeId,
                );
                return route?.models.length === 1 && route.models[0] === model.modelId;
              }) ?? [];
          return lines.length
            ? lines.reduce((sum, line) => sum.add(line.usd), new Decimal(0)).toString()
            : undefined;
        });
        // These admitted API artifacts are exact-model routes. Unknown contributions remain unknown.
        const complete =
          contributions?.length === 2 && contributions.every((value) => value !== undefined);
        const coverage = decision?.coverage?.models.find((entry) => entry.model === model.modelId);
        return (
          <div
            key={model.modelId}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-2 text-sm"
          >
            <div>
              <span>{model.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {n(model.events)} responses · {formatTokens(model.tokens)} known tokens
              </span>
            </div>
            <span className="font-mono tabular-nums">
              {complete
                ? [...new Set(contributions.map((value) => usd(value ?? "0")))].join(" – ")
                : decision
                  ? "No complete price"
                  : "Pricing…"}
              {coverage && coverage.priced < coverage.calls ? (
                <span className="ml-2 font-sans text-xs text-muted-foreground">
                  {n(coverage.priced)} / {n(coverage.calls)} priced
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
      {profile?.models.unresolved.length ? (
        <p className="text-sm text-muted-foreground">
          {n(profile.overview.unresolvedEvents)} calls have unresolved model identities. No
          substitution or price is inferred.
        </p>
      ) : null}
      {!profile ? (
        <p className="text-sm text-muted-foreground">Reading recorded model distribution…</p>
      ) : null}
    </section>
  );
}

function ApiEvidence({ decision }: { decision: MarketDecision | undefined }) {
  const display = marketRange(decision) ? decision : decision?.pricedScope;
  return (
    <div className="space-y-4 text-sm" data-testid="overview-pricing-evidence">
      <p>
        Exact recorded calls at current accepted API prices, not a reconstructed historical invoice.
        No extrapolation, subscription quota or model substitution. Tools, taxes and negotiated
        prices are not included.
      </p>
      {decision?.coverage ? (
        <p>
          {n(decision.coverage.recognized)} / {n(decision.coverage.recorded)} calls recognized ·{" "}
          {n(decision.coverage.priced)} / {n(decision.coverage.recorded)} calls priced.{" "}
          {n(decision.coverage.pricedKnownTokens)} / {n(decision.coverage.knownTokens)} known
          processed tokens priced
          {decision.coverage.unknownTokenCalls
            ? ` · ${n(decision.coverage.unknownTokenCalls)} calls have unknown token totals`
            : ""}
          .
        </p>
      ) : null}
      {decision?.history?.duplicateRows ? (
        <p>
          Data integrity: {n(decision.history.nativeResponses ?? 0)} native responses used ·{" "}
          {n(decision.history.duplicateRows)} duplicate rows removed. Native response identity
          prevents repeated session records from being counted twice; local account roots remain
          separate.
        </p>
      ) : null}
      {decision?.coverage?.models
        .filter((row) => row.priced < row.calls)
        .map((row) => (
          <p key={row.model}>
            {row.model}: {n(row.calls - row.priced)} unpriced calls · {row.reasons.join(", ")}.
            Unknown costs are not zero.
          </p>
        ))}
      {display?.scenarios.map((scenario) => (
        <details key={scenario.id} className="border-t border-border py-2">
          <summary className="min-h-11 cursor-pointer content-center">
            {DECISION_MARKET.scenarios.find((option) => option.id === scenario.id)?.label} · exact
            pricing receipts
          </summary>
          <p className="py-2">
            Exact USD total: {scenario.summary.candidates[0]?.totalUsd ?? "Unpriced"}
          </p>
          <p>{scenario.summary.assumptions.join(" ")}</p>
          {scenario.summary.explanation?.receipts.map((receipt) => (
            <div
              key={receipt.cash[0]?.resourceInstanceId ?? JSON.stringify(receipt.reasons)}
              className="my-3 break-words text-xs"
            >
              <p>
                {receipt.cash[0]?.resourceInstanceId ?? "Unassigned"} · {receipt.accepted} priced
                responses · ${receipt.variableUsd}
              </p>
              {receipt.cash.map((cash) => (
                <p
                  key={`${cash.resourceInstanceId}:${cash.routeId}:${cash.rateId}:${cash.category}:${cash.factor}`}
                >
                  {cash.category}: {cash.tokens} tokens × ${cash.ratePerMillion}/M × {cash.factor} =
                  ${cash.usd} · {cash.claimRefs.join(", ")}
                </p>
              ))}
            </div>
          ))}
          <p className="break-all text-xs">
            {scenario.summary.methodology} · {scenario.summary.engineVersion} · scope{" "}
            {scenario.summary.scope.digest}
          </p>
        </details>
      ))}
      <details>
        <summary className="min-h-11 cursor-pointer content-center">
          Catalog identity &amp; pricing sources
        </summary>
        <p className="break-all text-xs">
          {DECISION_MARKET.catalogHash} · prices accepted at {DECISION_MARKET.rulesAt} · review due{" "}
          {DECISION_MARKET.reviewUntil}
        </p>
        {DECISION_MARKET.plans
          .filter((plan) => plan.artifact.purchase.kind === "api")
          .map((plan) => (
            <details key={plan.id}>
              <summary className="min-h-11 cursor-pointer content-center">{plan.name}</summary>
              {plan.claims.map((claim) => (
                <p key={claim.id}>
                  <a
                    href={claim.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline"
                  >
                    {claim.id}: {claim.locator}
                  </a>
                </p>
              ))}
            </details>
          ))}
      </details>
    </div>
  );
}

function useAutomaticMarket(record: ImportRecord) {
  const [overview, setOverview] = useState<MarketDecision>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    getWorkerClient()
      .apiMarket(record.id, controller.signal)
      .then(setOverview)
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !(error instanceof SupersededError)) setError(true);
      });
    return () => controller.abort();
  }, [record.id]);
  return { overview, error };
}

export function AutomaticWorkload({
  record,
  profile,
  projects,
  highlights,
  evidence,
  onResult,
}: {
  record: ImportRecord;
  profile: WorkloadProfile | undefined;
  projects: ReactNode;
  highlights: ReactNode;
  evidence: ReactNode;
  onResult: (id: string, result: MarketDecision | undefined) => void;
}) {
  const { overview, error } = useAutomaticMarket(record);
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [billingIntent, setBillingIntent] = useState<"edit" | "timeline">("edit");
  const collapseOnCompletion = useRef(false);
  const [billing, setBilling] = useState<MarketDecision>();
  const [burden, setBurden] = useState<CapacityBurden>();
  const action = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const local = useReview(record);
  useEffect(() => {
    // An explicit Compare return link opens its focused review, never the default overview.
    if (window.location.hash === "#api-market") {
      setBillingLoaded(true);
      setBillingOpen(true);
    }
  }, []);
  const receiveBilling = useCallback(
    (_id: string, decision: MarketDecision | undefined) => setBilling(decision),
    [],
  );
  useEffect(() => {
    onResult(record.id, billingOpen && billing ? billing : overview);
  }, [record.id, onResult, overview, billing, billingOpen]);
  const hasSavedReview = !!local.choice.historyConfirmation || !!local.choice.historyConfirmed;
  const mountBilling = !!overview && (billingLoaded || hasSavedReview);
  const complete = billing?.review?.complete === true;
  const matchingScope =
    complete &&
    billing?.scenarios[0]?.summary.scope.digest === overview?.scenarios[0]?.summary.scope.digest;
  const billingRange = complete ? marketRange(billing) : undefined;
  const paid = complete ? billing?.review?.confirmedSpend : undefined;
  const ratio =
    billingRange && paid && new Decimal(paid).gt(0)
      ? [billingRange.low, billingRange.high].map((amount) => {
          const value = new Decimal(amount).div(paid);
          return value.toFixed(value.lt(1) ? 2 : 0);
        })
      : undefined;
  const plans = local.selected
    .map((key) => DECISION_MARKET.plans.find((plan) => `plan:${plan.id}` === key)?.name)
    .filter(Boolean)
    .join(" + ");
  const period = billing?.review?.period;
  const billingLabel =
    complete && period
      ? `${local.choice.accountLabel ?? "Selected account"} · ${plans} · ${day(period.start)} → ${day(period.end)} · ${usd(paid ?? "0")} confirmed`
      : undefined;
  const range = marketRange(overview);
  const full = range && range.priced === overview?.history?.calls;
  const shownRange = full ? range : marketRange(overview?.pricedScope);
  const summary = record.summary;
  const calls = overview?.history?.calls ?? summary.eventCount;
  const tokens = overview?.history?.knownTokens ?? summary.tokens.known;
  const distinct = overview?.history?.nativeResponses === calls && calls > 0;
  const from = profile?.overview.firstDate ?? summary.firstEventAt,
    to = profile?.overview.lastDate ?? summary.lastEventAt;
  const days =
    profile?.overview.spanDays ??
    (from && to
      ? Math.round((Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10))) / 86400000) + 1
      : undefined);
  const sources = summary.usageSources.map((source) => source.name).join(" + ");
  const makers = [
    ...new Set(
      profile?.models.canonical.flatMap((model) => (model.maker ? [model.maker] : [])) ?? [],
    ),
  ].join(" · ");
  const coverage = overview?.coverage;
  const signal = overview?.capacitySignal;
  const openBilling = () => {
    collapseOnCompletion.current = billing?.review ? !billing.review.complete : !hasSavedReview;
    setBillingIntent("edit");
    setBillingLoaded(true);
    setBillingOpen(true);
  };
  useEffect(() => {
    if (billingOpen) panel.current?.focus();
  }, [billingOpen]);
  const openTimeline = () => {
    collapseOnCompletion.current = false;
    setBillingIntent("timeline");
    setBillingLoaded(true);
    setBillingOpen(true);
  };
  useLayoutEffect(() => {
    // Finishing new setup collapses it. Loading or explicitly editing a saved review does not.
    if (complete && billingOpen && collapseOnCompletion.current) {
      collapseOnCompletion.current = false;
      setBillingOpen(false);
      action.current?.focus();
    }
  }, [complete, billingOpen]);
  useEffect(() => {
    if (billingOpen && billingIntent === "timeline" && burden) {
      const timeline = document.getElementById("capacity-timeline");
      if (timeline instanceof HTMLDetailsElement) {
        timeline.open = true;
        timeline.scrollIntoView({ block: "start" });
        timeline.querySelector("summary")?.focus();
      }
    }
  }, [billingOpen, billingIntent, burden]);
  const closeBilling = () => {
    setBillingOpen(false);
    action.current?.focus();
  };
  return (
    <div className="space-y-7" data-testid="automatic-workload">
      <section
        aria-label="Imported workload overview"
        data-testid="workload-hero"
        className="space-y-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel>Full imported workload</MicroLabel>
            <h2 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              {sources || "Your AI workload"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="overview-period">
            {from && to
              ? `${day(from)} – ${day(to)} · ${days} days · ${profile?.timeZone ?? "UTC"}`
              : "Imported history"}
          </p>
        </div>
        <div className="grid gap-5 border-y border-border py-5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <MicroLabel>
              {full
                ? "Current published API equivalent"
                : shownRange
                  ? "Current API equivalent · priced workload"
                  : "Current published API equivalent"}
            </MicroLabel>
            <p
              data-testid="overview-api-total"
              className={
                shownRange
                  ? "mt-3 font-mono text-[clamp(1.6rem,3.8vw,3.5rem)] leading-tight tracking-tight tabular-nums"
                  : "mt-3 text-base text-muted-foreground"
              }
            >
              {shownRange
                ? rangeText(shownRange)
                : error
                  ? "Pricing could not finish"
                  : overview
                    ? "No applicable API prices"
                    : "Pricing recorded work…"}
            </p>
            {shownRange ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {full
                  ? "The exact imported workload at current modeled API rates"
                  : `${n(coverage?.priced ?? 0)} priced calls only. Remaining costs are unknown.`}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {error
                  ? "Reload to retry. Your imported workload remains available."
                  : overview
                    ? "Your workload analysis is available below; no missing prices are estimated."
                    : "Analyzed locally, with no date or subscription setup"}
              </p>
            )}
            {shownRange && shownRange.low !== shownRange.high ? (
              <details data-testid="overview-range" className="mt-1 text-xs">
                <summary className="min-h-11 cursor-pointer content-center text-accent">
                  Why a range?
                </summary>
                <p className="max-w-lg text-muted-foreground">
                  Claude cache-write duration is not recorded. Both published cache-write scenarios
                  price the same calls. This is not a historical invoice or a monthly projection.
                </p>
              </details>
            ) : null}
          </div>
          <dl
            className="grid grid-cols-2 gap-x-5 gap-y-4 content-start"
            data-testid="overview-scale"
          >
            <div>
              <dt className="text-xs text-muted-foreground">
                {distinct ? "Distinct responses" : "Recorded calls"}
              </dt>
              <dd className="mt-1 font-mono text-3xl tracking-tight">{n(calls)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Known processed tokens</dt>
              <dd className="mt-1 font-mono text-3xl tracking-tight">{formatTokens(tokens)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">API pricing coverage</dt>
              <dd className="mt-1 font-mono text-xl">
                {coverage
                  ? `${((coverage.priced / Math.max(1, coverage.recorded)) * 100).toFixed(coverage.priced === coverage.recorded ? 0 : 2)}%`
                  : "Calculating…"}
                {coverage ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n(coverage.priced)} / {n(coverage.recorded)} calls
                    {coverage.knownTokens
                      ? ` · ${((coverage.pricedKnownTokens / coverage.knownTokens) * 100).toFixed(coverage.pricedKnownTokens === coverage.knownTokens ? 0 : 1)}% known tokens`
                      : ""}
                  </p>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {matchingScope && burden ? "Capacity episodes" : "Projects · sessions"}
              </dt>
              <dd className="mt-1 font-mono text-xl">
                {matchingScope && burden
                  ? n(burden.episodes.length)
                  : `${n(summary.projectCount)} · ${n(summary.sessionCount)}`}
                {signal?.blockedAttempts ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n(signal.blockedAttempts)} observed blocked attempts
                  </p>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>
        {makers ? (
          <p className="text-xs text-muted-foreground">Recorded models from {makers}</p>
        ) : null}
        {matchingScope && paid ? (
          <div
            className="flex flex-wrap items-baseline gap-x-6 gap-y-2"
            data-testid="overview-confirmed"
          >
            <p>
              <span className="font-mono text-3xl">{usd(paid)}</span>
              <span className="ml-2 text-sm text-muted-foreground">
                confirmed spend for this same workload period
              </span>
            </p>
            {ratio ? (
              <p className="text-sm">
                <strong className="font-mono text-xl text-accent">
                  ≈ {ratio[0]}×{ratio[0] !== ratio[1] ? `–${ratio[1]}×` : ""}
                </strong>{" "}
                API-equivalent value
              </p>
            ) : null}
          </div>
        ) : null}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"
          data-testid="billing-summary-bar"
        >
          {billingLabel ? (
            <p className="text-sm">{billingLabel}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {local.synthetic ? "Synthetic sample workload. " : ""}Recorded economics, not a
              subscription replacement claim.
            </p>
          )}
          <button
            ref={action}
            type="button"
            onClick={openBilling}
            aria-expanded={billingOpen}
            aria-controls="billing-review-panel"
            className="min-h-11 text-sm text-accent"
            data-testid="billing-action"
          >
            {billingLabel ? "Edit billing review" : "Compare against what I paid →"}
          </button>
        </div>
        {complete && !matchingScope && billingRange ? (
          <div
            data-testid="focused-billing-summary"
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
          >
            <span>
              Billing-cycle comparison · {n(billing?.review?.history.calls ?? 0)} responses
            </span>
            <span>{usd(paid ?? "0")} paid</span>
            <span>{rangeText(billingRange)} current API equivalent</span>
            {ratio ? (
              <span className="font-mono text-accent">
                ≈ {ratio[0]}×–{ratio[1]}×
              </span>
            ) : null}
          </div>
        ) : null}
      </section>
      <section
        ref={panel}
        id="billing-review-panel"
        aria-label="Optional billing comparison"
        tabIndex={-1}
        hidden={!billingOpen}
        className="space-y-4 border-l-2 border-accent pl-4 outline-none"
        data-testid="billing-panel"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-medium">Compare against what I paid</h2>
          <button type="button" className="min-h-11 text-sm text-accent" onClick={closeBilling}>
            Back to workload overview
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose one account and a billing cycle of up to 31 days. This focused comparison does not
          change your full imported overview.
        </p>
        {mountBilling ? (
          <MarketDecisionSurface
            record={record}
            onResult={receiveBilling}
            onBurden={setBurden}
            editOpen={billingOpen && billingIntent === "edit"}
          />
        ) : (
          <p className="text-sm">Preparing local review controls…</p>
        )}
        <Link
          href={`/app/compare?import=${record.id}`}
          className="inline-flex min-h-11 items-center text-sm text-accent"
          data-testid="workload-compare-cta"
        >
          Open this billing review in Compare →
        </Link>
      </section>
      {projects}
      <ModelEconomics decision={overview} profile={profile} />
      {highlights}
      {signal?.blockedAttempts || (complete && burden) ? (
        <section className="space-y-2 border-y border-border py-4" data-testid="overview-capacity">
          <h2 className="text-lg font-medium">Observed capacity burden</h2>
          {complete && burden ? (
            <>
              <p className="text-xs text-muted-foreground">
                {period ? `${day(period.start)} → ${day(period.end)}` : ""} · confirmed billing
                review
              </p>
              <p className="text-sm">
                <strong className="font-mono text-lg">{burden.episodes.length}</strong> limit
                episodes · {burden.attempts} blocked attempts · {burden.days} days affected ·{" "}
                {burden.withOtherBeforeMain} episodes with other AI activity before the next
                main-account response
              </p>
            </>
          ) : (
            <p className="text-sm">
              {signal?.blockedAttempts} directly observed blocked attempts · {signal?.days} days ·{" "}
              {signal?.accounts} local {signal?.accounts === 1 ? "account" : "accounts"}. Repeated
              retries are not independent outages.
            </p>
          )}
          <button type="button" onClick={openTimeline} className="min-h-11 text-sm text-accent">
            {complete
              ? "Review interruption timeline →"
              : "Inspect capacity evidence in a focused review →"}
          </button>
        </section>
      ) : null}
      <details className="border-t border-border pt-2" data-testid="overview-evidence">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
          Methodology, assumptions &amp; evidence
        </summary>
        <div className="space-y-6 py-4">
          <ApiEvidence decision={overview} />
          {evidence}
        </div>
      </details>
    </div>
  );
}
