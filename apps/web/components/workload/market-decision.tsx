"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import Link from "next/link";
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import { MicroLabel } from "@/components/instrument/primitives";
import type { CapacityBurden } from "@/lib/capacity-episodes";
import { marketRange } from "@/lib/decision-presentation";
import type { MarketDecision } from "@/lib/market-decision";
import {
  composeReview,
  daysInPeriod,
  nextDate,
  periodLabel,
  periodSchema,
  resolveReviewPeriod,
} from "@/lib/review-period";
import type { TargetKey } from "@/lib/routes";
import { useReview } from "@/lib/use-review";
import { getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { BillingEditor } from "./billing-editor";
import { BillingSetup } from "./billing-setup";
import { partialScanOf } from "./evidence";
import { ObservedCapacity } from "./observed-capacity";
import { HistoryConfirmation, ReviewSetup } from "./review-setup";

const dollars = (value: string) =>
  `$${new Decimal(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const date = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
const subscriptions = DECISION_MARKET.plans.filter(
  (p) => p.artifact.purchase.kind === "subscription",
);

/** Presentation of durable engine receipts. Never prices or assigns workload events. */
export function MarketDecisionSurface({
  record,
  onResult,
  workloadContent,
  evidenceContent,
  onBurden,
  editOpen,
}: {
  onBurden?: ((burden: CapacityBurden | undefined) => void) | undefined;
  editOpen?: boolean;
  record: ImportRecord;
  workloadContent?: ReactNode;
  evidenceContent?: ReactNode;
  onResult?: (id: string, result: MarketDecision | undefined) => void;
}) {
  const [computed, setComputed] = useState<{ key: string; result: MarketDecision }>();
  const [error, setError] = useState<string>();
  const importId = record.id;
  const local = useReview(record);
  const { reviewSelected: selected, choice, billing } = local;
  const selectedPeriod = resolveReviewPeriod(choice, billing);
  const periodStart = selectedPeriod?.start,
    periodEnd = selectedPeriod?.end;
  const executionKey = `${importId}:${periodStart ?? "history"}:${periodEnd ?? ""}:${choice.resourceInstanceId ?? "all"}`;
  const decision = computed?.key === executionKey ? computed.result : undefined;
  const scan = partialScanOf(record);
  const partialScan = scan.unreadable + scan.other > 0 || !!decision?.history?.scanGapCodes?.length;
  const review = useMemo(
    () =>
      decision
        ? composeReview({
            decision,
            importId,
            choice,
            billing,
            selected,
            partialScan,
            synthetic: local.synthetic,
          })
        : undefined,
    [decision, importId, choice, billing, selected, partialScan, local.synthetic],
  );
  const recordedPeriod =
    record.summary.firstEventAt && record.summary.lastEventAt
      ? {
          start: record.summary.firstEventAt.slice(0, 10),
          end: nextDate(record.summary.lastEventAt.slice(0, 10)),
        }
      : undefined;
  const effectivePeriod = choice.mode === "history" ? recordedPeriod : selectedPeriod;
  const needsPeriod = !periodSchema.safeParse(effectivePeriod).success;
  const accounts = computed?.key.startsWith(`${importId}:`)
    ? computed.result.history?.accounts
    : undefined;
  useLayoutEffect(() => {
    onResult?.(
      importId,
      decision && !needsPeriod ? { ...decision, ...(review ? { review } : {}) } : undefined,
    );
  }, [importId, decision, review, onResult, needsPeriod]);
  useEffect(() => {
    if (!local.ready) return;
    const controller = new AbortController();

    setError(undefined);
    getWorkerClient()
      .apiMarket(
        importId,
        controller.signal,
        periodStart && periodEnd ? { start: periodStart, end: periodEnd } : undefined,
        choice.resourceInstanceId,
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setComputed({ key: executionKey, result });
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof SupersededError
              ? "A newer analysis interrupted this calculation. Reopen this workload to calculate its published API equivalent."
              : "The published API calculation could not complete. Reopen this workload to retry.",
          );
      });
    return () => controller.abort();
  }, [importId, executionKey, local.ready, periodStart, periodEnd, choice.resourceInstanceId]);
  const calculatedRange = marketRange(decision);
  const fullRange =
    calculatedRange?.priced === decision?.history?.calls ? calculatedRange : undefined;
  const partialRange = marketRange(decision?.pricedScope);
  const displayDecision = fullRange ? decision : (decision?.pricedScope ?? decision);
  const scenarios = displayDecision?.scenarios ?? [];
  const first = scenarios[0]?.summary;
  const range = fullRange ?? partialRange;
  const partialPricing = !!partialRange && !fullRange;
  const comparable = range !== undefined;
  const totals = comparable ? scenarios.map((s) => s.summary.candidates[0]?.totalUsd ?? "0") : [];
  const different = totals.length === 2 && !new Decimal(totals[0] ?? "0").eq(totals[1] ?? "0");
  const monthly = subscriptions.filter(
    (p) =>
      p.artifact.purchase.kind === "subscription" &&
      p.artifact.purchase.term === "month" &&
      p.artifact.purchase.fixedUsd !== null,
  );
  const unlisted = selected.filter((key) => !monthly.some((p) => key === `plan:${p.id}`)).length;
  const current = monthly.reduce(
    (sum, p) =>
      sum.add(
        selected.includes(`plan:${p.id}`) && p.artifact.purchase.kind === "subscription"
          ? (p.artifact.purchase.fixedUsd ?? "0")
          : "0",
      ),
    new Decimal(0),
  );

  const configured =
    !!review?.historyConfirmed &&
    review.confirmedSpend !== undefined &&
    review.confirmedCount === selected.length &&
    selected.length > 0 &&
    !needsPeriod;
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (editOpen) setEditing(true);
  }, [editOpen]);
  const planName =
    selected.length === 1
      ? (subscriptions.find((p) => `plan:${p.id}` === selected[0])?.name ?? "Selected subscription")
      : "Your subscriptions";
  const cycleLabel = effectivePeriod
    ? `${date(effectivePeriod.start)} → ${date(effectivePeriod.end)}`
    : "Choose dates";
  const ratio =
    review?.complete && range && new Decimal(review.confirmedSpend ?? "0").gt(0)
      ? [range.low, range.high].map((value) => {
          const n = new Decimal(value).div(review.confirmedSpend ?? "1");
          return n.toFixed(n.lt(1) ? 2 : 0);
        })
      : undefined;
  const controls = (
    <>
      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-3">
        <label className="min-w-0 max-w-full text-sm">
          Local source account
          <select
            aria-label="Local source account"
            className="mt-2 block min-h-11 w-full min-w-0 max-w-full border border-border bg-background px-3"
            value={choice.resourceInstanceId ?? ""}
            onChange={(e) => {
              const {
                historyConfirmation: _confirmation,
                historyConfirmed: _legacy,
                resourceInstanceId: _account,
                accountLabel: _label,
                ...rest
              } = choice;
              local.setChoice({
                ...rest,
                ...(e.target.value ? { resourceInstanceId: e.target.value } : {}),
              });
            }}
          >
            <option value="">All imported accounts</option>
            {accounts?.map((a, index) => (
              <option key={a.resourceInstanceId} value={a.resourceInstanceId}>
                {a.source} account {index + 1} · {a.calls.toLocaleString()} responses
              </option>
            ))}
          </select>
        </label>
        {choice.resourceInstanceId ? (
          <label className="min-w-0 max-w-full text-sm">
            Local account label
            <input
              aria-label="Local account label"
              maxLength={80}
              className="mt-2 block min-h-11 w-full min-w-0 max-w-full border border-border bg-background px-3"
              value={choice.accountLabel ?? ""}
              onChange={(e) => local.setChoice({ ...choice, accountLabel: e.target.value })}
            />
          </label>
        ) : null}
      </div>

      <ReviewSetup
        key={`${choice.mode}:${choice.resourceInstanceId ?? "all"}`}
        choice={choice}
        recordedPeriod={recordedPeriod}
        billing={billing}
        onChange={local.setChoice}
        names={Object.fromEntries(subscriptions.map((p) => [`plan:${p.id}`, p.name]))}
        needsPeriod={needsPeriod}
      />

      {!needsPeriod ? (
        <>
          {" "}
          {review ? (
            <div className="my-2 flex flex-col gap-2 text-sm" data-testid="review-history">
              <p>
                Recorded history:{" "}
                {review.history.firstDate && review.history.lastDate
                  ? periodLabel({
                      start: review.history.firstDate,
                      end: nextDate(review.history.lastDate),
                    })
                  : "No calls in this period"}{" "}
                · UTC
              </p>
              <p className="text-muted-foreground">
                {review.history.firstDate && review.history.lastDate && review.period
                  ? `Recorded history spans ${daysInPeriod({ start: review.history.firstDate, end: nextDate(review.history.lastDate) })} days of this ${daysInPeriod(review.period)}-day review period. `
                  : ""}
                This span does not prove complete logs.
              </p>
              <p>
                <span className="font-mono">{review.history.calls.toLocaleString()}</span>{" "}
                {review.history.nativeResponses === review.history.calls
                  ? "distinct responses"
                  : "recorded calls"}{" "}
                · <span className="font-mono">{review.history.knownTokens.toLocaleString()}</span>{" "}
                known processed tokens
                {review.history.unknownTokenCalls
                  ? ` · ${review.history.unknownTokenCalls.toLocaleString()} calls with unknown token totals`
                  : ""}
              </p>
              {review.history.outsideCalls ? (
                <p className="text-muted-foreground">
                  {review.history.outsideCalls.toLocaleString()} imported calls fall outside this
                  selected {choice.resourceInstanceId ? "account or period" : "period"}. They remain
                  in your saved workload.
                </p>
              ) : null}
              <p className="text-muted-foreground">
                {review.historyConfirmed
                  ? "History coverage: confirmed locally by you; not independently verified."
                  : "History coverage: not confirmed for this review period."}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
      <details id="current-stack" data-testid="market-subscriptions" className="text-sm">
        <summary className="cursor-pointer py-2 text-accent">
          Edit current stack · subscription prices, access and evidence
        </summary>
        <p className="py-3 text-muted-foreground">
          These commercial facts do not establish that a subscription could handle this workload.
          Published limits or debit rules are insufficient for deterministic replay. They are kept
          outside the API assignment.
        </p>
        <fieldset>
          <legend className="py-2 font-medium">
            Select the subscriptions you pay for · saved only in this browser
          </legend>
          {subscriptions.map((p) => (
            <div key={p.id} className="border-b border-border py-3">
              <label className="flex min-h-11 flex-wrap items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(`plan:${p.id}`)}
                  onChange={(e) => {
                    const key: TargetKey = `plan:${p.id}`;
                    const next = e.target.checked
                      ? [...selected, key]
                      : selected.filter((id) => id !== key);
                    const { focusedSubscription: _focus, ...rest } = choice;
                    local.setChoice(rest);
                    local.setSelected(next);
                  }}
                />
                <span>{p.name}</span>
                <span className="ml-auto font-mono">
                  {p.artifact.purchase.kind === "subscription" &&
                  p.artifact.purchase.fixedUsd !== null
                    ? `${dollars(p.artifact.purchase.fixedUsd)}/${p.artifact.purchase.term === "month" ? "mo" : p.artifact.purchase.term === "28_days" ? "28 days" : p.artifact.purchase.term}`
                    : "Price unknown"}
                </span>
              </label>
              {selected.includes(`plan:${p.id}`) ? (
                <BillingEditor
                  key={p.id}
                  name={p.name}
                  fact={billing[`plan:${p.id}`]}
                  synthetic={local.synthetic}
                  onSave={(fact) => local.saveBilling(`plan:${p.id}`, fact)}
                />
              ) : null}
              {p.claims
                .filter((c) => c.id === "cohort")
                .map((c) => (
                  <p key={c.id} className="pb-2 pl-6 text-xs text-muted-foreground">
                    Account terms: {c.excerpt}
                  </p>
                ))}
              <details className="pl-6">
                <summary className="cursor-pointer py-1 text-muted-foreground">
                  Capacity not deterministically published · access and evidence
                </summary>
                <p>
                  {p.artifact.computation.kind === "not_computable"
                    ? p.artifact.computation.reasons
                        .map((r) => `${r.code}: ${r.subject}`)
                        .join("; ")
                    : ""}
                </p>
                <p className="py-2">
                  Known exact-model access:{" "}
                  {p.artifact.knownAccess?.flatMap((r) => r.models).join(", ") || "See evidence"}.
                  Eligibility and purchase conditions still apply.
                </p>
                {p.claims.map((c) => (
                  <p key={c.id} className="py-1">
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline"
                    >
                      {c.id}: {c.locator}
                    </a>
                  </p>
                ))}
              </details>
            </div>
          ))}
        </fieldset>
        <p className="pt-4 font-mono" data-testid="market-current-spend">
          Published subscription price: ${current.toFixed(2)} / month
        </p>
        {unlisted > 0 ? (
          <p className="pt-2 text-muted-foreground">
            {unlisted} previously selected target(s) are outside this admitted subscription list and
            are not included in this subtotal. They do not count toward the displayed monthly spend.
          </p>
        ) : null}
        <a href="#api-market" className="inline-flex min-h-11 items-center text-accent underline">
          Return to your decision ↑
        </a>
        <p className="pt-2 text-muted-foreground">
          Billing facts stay in this browser. Published catalog prices and user-entered paid amounts
          remain separate. Selecting a plan does not establish eligibility or capacity.
        </p>
      </details>
    </>
  );
  const reviewControls = (
    <details
      open={!configured || editing}
      onToggle={(event) => {
        if (configured) setEditing(event.currentTarget.open);
      }}
      className="border-y border-border py-2"
      data-testid="review-editor"
    >
      <summary
        className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 text-sm"
        data-testid="review-bar"
      >
        <span>
          {configured
            ? `${choice.accountLabel || "Selected account"} · ${planName} · ${cycleLabel} · ${dollars(review?.confirmedSpend ?? "0")} confirmed`
            : "Set up your review"}
        </span>
        <span className="text-accent">
          {configured ? (editing ? "Done" : "Edit") : "Account, dates & billing"}
        </span>
      </summary>
      <div className="space-y-5 py-3">
        <BillingSetup
          key={`${choice.resourceInstanceId ?? "all"}:${selected.join(",")}`}
          local={local}
          accounts={accounts}
          onSaved={() => setEditing(false)}
        />
        {!needsPeriod && review ? (
          <div className="border-t border-border pt-4" data-testid="billing-history-confirmation">
            <p className="mb-3 text-sm">
              {review.history.calls.toLocaleString()} responses in this cycle ·{" "}
              {formatTokens(review.history.knownTokens)} known tokens
            </p>
            <HistoryConfirmation
              choice={choice}
              review={review}
              importId={importId}
              scopeDigest={decision?.scenarios[0]?.summary.scope.digest}
              partialScan={partialScan}
              onChange={local.setChoice}
            />
          </div>
        ) : null}
        <details data-testid="advanced-review-controls" className="border-t border-border pt-2">
          <summary className="min-h-11 cursor-pointer content-center text-xs text-muted-foreground">
            Advanced: custom periods &amp; multiple subscriptions
          </summary>
          <div className="space-y-4 pt-3">{controls}</div>
        </details>
      </div>
    </details>
  );
  const render = (capacity?: {
    summary: ReactNode;
    evidence: ReactNode;
    burden: CapacityBurden | undefined;
  }) => (
    <>
      {local.saveFailed ? (
        <p role="alert" className="text-sm text-warning">
          Billing facts could not be saved in this browser. These changes last only until navigation
          or reload.
        </p>
      ) : null}
      {!needsPeriod ? (
        <>
          <section className="space-y-3" aria-label="Economic result" data-testid="economic-hero">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-medium tracking-tight">
                {configured ? planName : "Recorded workload preview"}
              </h2>
              <span className="text-sm text-muted-foreground" data-testid="review-period">
                {cycleLabel}
                <span className="sr-only"> · end excluded</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span data-testid="review-state">
                {review?.complete ? "Complete billing-period review" : "Partial review"}
              </span>
              {local.synthetic ? " · Synthetic demo workload and billing data" : ""}
            </p>
            {!configured ? (
              <p className="max-w-3xl text-sm text-warning">
                {review?.reason ?? "Loading this review…"} The recorded API result remains available
                below.
              </p>
            ) : null}
            <div className="grid gap-5 border-y border-border py-5 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.6fr)]">
              <div>
                <MicroLabel>Confirmed spend</MicroLabel>
                <p
                  className={
                    configured
                      ? "mt-2 font-mono text-4xl tracking-tight sm:text-5xl"
                      : "mt-2 text-lg text-muted-foreground"
                  }
                  data-testid="review-confirmed-spend"
                >
                  {review?.confirmedSpend !== undefined
                    ? dollars(review.confirmedSpend)
                    : "Not confirmed"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {configured ? "Paid for this billing cycle" : "Enter local billing facts above"}
                </p>
              </div>
              <div className="min-w-0">
                <MicroLabel>
                  {partialPricing
                    ? "Current published API equivalent for priced workload"
                    : "Current published API equivalent"}
                </MicroLabel>
                {decision ? (
                  <p
                    data-testid="market-total"
                    className={
                      comparable
                        ? "mt-2 font-mono text-[clamp(1.55rem,3.6vw,3rem)] tracking-tight tabular-nums"
                        : "mt-2 text-sm text-muted-foreground"
                    }
                  >
                    {comparable
                      ? different
                        ? `${dollars(totals[0] ?? "0")} – ${dollars(totals[1] ?? "0")}`
                        : dollars(totals[0] ?? "0")
                      : "Pricing incomplete for this workload"}
                  </p>
                ) : error ? (
                  <div role="alert" className="my-2 text-sm">
                    <p data-testid="market-total">Calculation unavailable</p>
                    <p>{error}</p>
                  </div>
                ) : (
                  <p role="status" className="my-2 text-sm">
                    Calculating the recorded workload…
                  </p>
                )}
                {different ? (
                  <details className="mt-1 text-xs" data-testid="range-explanation">
                    <summary className="min-h-11 cursor-pointer content-center text-accent">
                      Why a range?
                    </summary>
                    <p className="max-w-xl text-muted-foreground">
                      Claude cache-write duration is not recorded. The range applies both published
                      cache-write scenarios to the same recorded calls. It is not an historical API
                      invoice or a projection.
                    </p>
                  </details>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Exact recorded work at current modeled API rates
                  </p>
                )}
              </div>
            </div>
            {ratio ? (
              <p className="text-lg" data-testid="economic-ratio">
                <strong className="font-mono text-2xl text-accent">
                  ≈ {ratio[0]}×{ratio[0] !== ratio[1] ? `–${ratio[1]}×` : ""}
                </strong>{" "}
                API-equivalent value{" "}
                <span className="text-xs text-muted-foreground">relative to confirmed spend</span>
              </p>
            ) : null}
            <dl
              className="flex flex-wrap gap-x-7 gap-y-3 border-b border-border pb-4 text-sm"
              data-testid="review-scale"
            >
              <div>
                <dd className="font-mono text-xl">
                  {review?.history.calls.toLocaleString() ?? "…"}
                </dd>
                <dt className="text-xs text-muted-foreground">
                  {review?.history.nativeResponses === review?.history.calls
                    ? "distinct responses"
                    : "recorded calls"}
                </dt>
              </div>
              <div title={review?.history.knownTokens.toLocaleString()}>
                <dd className="font-mono text-xl">
                  {formatTokens(review?.history.knownTokens) ?? "…"}
                </dd>
                <dt className="text-xs text-muted-foreground">known processed tokens</dt>
              </div>
              <div>
                <dd className="font-mono text-xl">
                  {decision?.coverage?.recorded
                    ? `${Number(((100 * decision.coverage.priced) / decision.coverage.recorded).toFixed(2))}%`
                    : "…"}
                </dd>
                <dt className="text-xs text-muted-foreground">calls priced</dt>
              </div>
              {capacity?.burden ? (
                <div>
                  <dd className="font-mono text-xl">{capacity.burden.episodes.length}</dd>
                  <dt className="text-xs text-muted-foreground">observed capacity episodes</dt>
                </div>
              ) : null}
            </dl>
            {partialPricing ? (
              <p className="text-sm text-warning">
                This is a priced-scope subtotal. Unpriced calls have unknown cost and may materially
                change the result. No whole-workload ratio or difference is available.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1">
              {" "}
              <p className="text-xs text-muted-foreground">
                Economic comparison only. It does not establish equivalent product experience or
                uninterrupted replacement.
              </p>{" "}
              {workloadContent ? (
                <Link
                  className="inline-flex min-h-11 items-center text-sm text-accent"
                  href={`/app/plans?section=compare&import=${importId}`}
                  data-testid="workload-compare-cta"
                >
                  Compare this review →
                </Link>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
      {workloadContent}
      {!needsPeriod ? (
        <>
          {first?.explanation ? (
            <section aria-label="Current API market" className="flex flex-col gap-2">
              <h2 className="text-xl font-medium tracking-tight">Model economics</h2>
              <p className="text-xs text-muted-foreground">
                Exact models in this review · current API contribution
              </p>
              {DECISION_MARKET.plans
                .filter((p) => p.artifact.purchase.kind === "api")
                .map((p) => {
                  const values = scenarios.map((s) => {
                    const resource = s.summary.scenario.resources.find(
                      (r) =>
                        r.artifactHash ===
                        DECISION_MARKET.scenarios
                          .find((x) => x.id === s.id)
                          ?.artifacts.find((a) => a.planId === p.id)?.artifactHash,
                    );
                    const receipts =
                      s.summary.explanation?.receipts.filter((r) =>
                        r.cash.some((c) => c.resourceInstanceId === resource?.id),
                      ) ?? [];
                    return {
                      calls: receipts.reduce((n, r) => n + r.accepted, 0),
                      usd: receipts
                        .reduce((n, r) => n.add(r.variableUsd), new Decimal(0))
                        .toString(),
                    };
                  });
                  if (!values.some((v) => v.calls)) return null;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"
                    >
                      <span>
                        {p.name.replace(/^.* API: /u, "")}{" "}
                        <span className="text-muted-foreground">
                          · {values[0]?.calls?.toLocaleString()}{" "}
                          {review?.history.nativeResponses === review?.history.calls
                            ? "distinct responses"
                            : "calls"}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums">
                        {values
                          .map((v) => dollars(v.usd))
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .join(" – ")}
                      </span>
                    </div>
                  );
                })}
            </section>
          ) : null}

          {capacity?.summary}
        </>
      ) : null}
      <details className="border-t border-border pt-2" data-testid="review-evidence">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
          Methodology, assumptions &amp; evidence
        </summary>
        <div className="space-y-5 py-4 text-sm">
          <p data-testid="review-source">
            {choice.mode === "cycle"
              ? "Using a locally supplied subscription cycle"
              : choice.mode === "custom"
                ? "Using your custom review period"
                : "Using recorded history span"}{" "}
            · UTC · End excluded
          </p>
          <p data-testid="review-conclusion">{review?.conclusion}</p>
          <p data-testid="decision-fixed-spend">
            {selected.length ? `${dollars(current.toString())} / month` : "Not selected"}
          </p>
          <p>
            Published subscription price, not confirmed spend. Catalog prices describe full cycles;
            no arbitrary proration is used.
          </p>
          <p data-testid="decision-difference">
            {review?.difference
              ? `${dollars(review.difference.low)} – ${dollars(review.difference.high)}`
              : "Not directly comparable yet"}
          </p>
          <p>Difference is confirmed spend minus current published API equivalent.</p>
          {decision?.unavailable ? (
            <p className="text-sm" data-testid="market-coverage">
              {decision?.unavailable.calls.toLocaleString()} calls retained.{" "}
              {decision?.unavailable.message}
            </p>
          ) : null}
          {first && decision ? (
            <div className="space-y-1 text-sm" data-testid="market-coverage">
              <p>
                API pricing:{" "}
                {(
                  decision.coverage?.priced ?? (comparable ? first.scope.required : 0)
                ).toLocaleString()}{" "}
                / {(decision.history?.calls ?? first.scope.recorded).toLocaleString()} recorded
                calls modeled and priced. Exact models preserved.
              </p>
              {decision.coverage ? (
                <>
                  <p>
                    {decision.coverage.recognized.toLocaleString()} /{" "}
                    {decision.coverage.recorded.toLocaleString()} calls recognized. All recorded
                    calls retained in this review.
                  </p>
                  <p data-testid="token-coverage">
                    {decision.coverage.pricedKnownTokens.toLocaleString()} /{" "}
                    {decision.coverage.knownTokens.toLocaleString()} known processed tokens priced
                    {decision.coverage.knownTokens
                      ? ` (${((100 * decision.coverage.pricedKnownTokens) / decision.coverage.knownTokens).toFixed(2)}%)`
                      : ""}
                    .
                    {decision.coverage.unknownTokenCalls
                      ? ` ${decision.coverage.unknownTokenCalls.toLocaleString()} calls have unknown token totals; no token percentage is claimed for them.`
                      : ""}
                  </p>
                </>
              ) : null}
              {partialPricing ? (
                <p className="text-warning">
                  This subtotal covers only the priced calls. The remaining calls have unknown cost
                  and may materially change the result. No whole-workload difference is available.
                </p>
              ) : null}
            </div>
          ) : null}
          {decision?.coverage?.models.some((m) => m.priced < m.calls) ? (
            <details className="border-y border-border py-2">
              <summary className="min-h-11 cursor-pointer content-center text-sm">
                Unpriced model details
              </summary>
              {decision.coverage.models
                .filter((m) => m.priced < m.calls)
                .map((m) => (
                  <p className="py-2 text-sm" key={m.model}>
                    {m.model}: {(m.calls - m.priced).toLocaleString()} unpriced calls ·{" "}
                    {m.knownTokens.toLocaleString()} known tokens · {m.reasons.join(", ")}
                  </p>
                ))}
            </details>
          ) : null}

          {capacity?.evidence}
          {review?.history.nativeResponses !== undefined ? (
            <details className="border-b border-border py-3" data-testid="data-integrity">
              <summary className="min-h-11 cursor-pointer content-center text-sm">
                Data integrity
              </summary>
              <p className="text-sm">
                Native responses used: {review.history.nativeResponses.toLocaleString()} · Duplicate
                rows removed: {(review.history.duplicateRows ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                StackReplay uses native response identity to prevent repeated session records from
                being counted twice. Separate source roots remain separate local accounts.
              </p>
            </details>
          ) : null}
          {comparable ? (
            <section className="border-y border-border py-3" aria-label="API scenario results">
              {scenarios.map((s) => (
                <div key={s.id} className="flex flex-wrap justify-between gap-2 py-1 text-sm">
                  <span>{DECISION_MARKET.scenarios.find((x) => x.id === s.id)?.label}</span>
                  <span className="font-mono tabular-nums">
                    {dollars(s.summary.candidates[0]?.totalUsd ?? "0")}
                  </span>
                </div>
              ))}
            </section>
          ) : null}

          <details className="min-w-0 text-sm" data-testid="market-calculation">
            <summary className="cursor-pointer py-2 text-accent">
              Inspect calculation, assumptions and evidence
            </summary>
            <div className="flex min-w-0 flex-col gap-4 pt-3 [overflow-wrap:anywhere]">
              <p>
                Both interpretations use the identical recorded calls. Neither cache duration is
                observed history. Published reasoning billing is applied without changing token
                accounting. The GPT-5.6 Sol promotion is a separately evidenced overlay; no
                undiscounted permanent price is inferred.
              </p>
              <p className="font-mono text-xs">Catalog: {DECISION_MARKET.catalogHash}</p>
              {scenarios.map((s) => (
                <details key={s.id}>
                  <summary className="cursor-pointer py-2">
                    {DECISION_MARKET.scenarios.find((x) => x.id === s.id)?.label} ·{" "}
                    {s.summary.candidates[0]?.status}
                  </summary>
                  <p className="py-2">
                    {DECISION_MARKET.scenarios.find((x) => x.id === s.id)?.assumption}
                  </p>
                  <p className="font-mono text-xs">
                    Scope {s.summary.scope.digest}
                    <br />
                    Scenario {s.summary.scenario.scenarioHash}
                    <br />
                    Exact USD total: {s.summary.candidates[0]?.totalUsd ?? "unknown"}
                  </p>
                  {s.summary.candidates
                    .flatMap((c) => c.reasons)
                    .map((r) => (
                      <p key={`${r.code}-${r.subject}`} className="py-1 text-warning">
                        {r.code}: {r.subject}
                      </p>
                    ))}
                  {s.summary.explanation?.receipts.map((r) => (
                    <div
                      key={`${s.id}-${r.cash[0]?.resourceInstanceId}`}
                      className="my-3 border-l border-border pl-3"
                    >
                      <p>
                        {r.accepted} calls · exact USD {r.variableUsd}
                      </p>
                      {r.cash.map((c) => (
                        <p
                          key={`${c.routeId}-${c.rateId}-${c.category}-${c.ratePerMillion}-${c.factor}`}
                          className="py-1 font-mono text-xs"
                        >
                          {c.resourceInstanceId} / {c.routeId} / {c.rateId} / {c.category}:{" "}
                          {c.tokens} × ${c.ratePerMillion}/1M × {c.factor} = ${c.usd} · claims{" "}
                          {c.claimRefs.join(", ")}
                        </p>
                      ))}
                    </div>
                  ))}
                  {DECISION_MARKET.scenarios
                    .find((x) => x.id === s.id)
                    ?.artifacts.map((a) => (
                      <p key={a.artifactHash} className="py-1 font-mono text-xs">
                        {a.planId}: {a.artifactHash} · overlays{" "}
                        {a.appliedOverlayIds.join(", ") || "none"}
                      </p>
                    ))}
                </details>
              ))}
              {DECISION_MARKET.plans
                .filter((p) => p.artifact.purchase.kind === "api")
                .map((p) => (
                  <details key={p.id}>
                    <summary className="cursor-pointer py-2">{p.name} · pricing sources</summary>
                    {p.claims.map((c) => (
                      <p key={c.id} className="py-1">
                        <a
                          className="text-accent underline"
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {c.id}: {c.locator}
                        </a>{" "}
                        · checked {c.reviewedAt.slice(0, 10)}
                      </p>
                    ))}
                  </details>
                ))}
            </div>
          </details>

          <p className="text-xs text-muted-foreground">
            Price snapshot: {DECISION_MARKET.rulesAt.slice(0, 10)} · review due{" "}
            {DECISION_MARKET.reviewUntil.slice(0, 10)}. Standard paid API access assumed; tools, tax
            and negotiated prices excluded. Published subscription capacity does not establish a
            deterministic quota.
          </p>
          {evidenceContent}
        </div>
      </details>
    </>
  );
  return (
    <section
      id="api-market"
      aria-label="Billing-period review"
      className="min-w-0 space-y-4"
      data-testid="market-decision"
    >
      {reviewControls}
      {decision?.capacity &&
      choice.resourceInstanceId &&
      review?.period &&
      selected.length === 1 &&
      selected[0] &&
      decision.scenarios[0]?.summary.scope.digest ? (
        <ObservedCapacity
          onBurden={onBurden}
          key={`${executionKey}:${selected[0]}:${decision.capacity.digest}`}
          summary={decision.capacity}
          importId={importId}
          resourceInstanceId={choice.resourceInstanceId}
          planId={selected[0]}
          period={review.period}
          workloadDigest={decision.scenarios[0].summary.scope.digest}
        >
          {render}
        </ObservedCapacity>
      ) : (
        render()
      )}
    </section>
  );
}
