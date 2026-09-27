"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import { useEffect, useState } from "react";
import { MicroLabel } from "@/components/instrument/primitives";
import { readCurrentStack, subscribeCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import { fixedDifference, marketRange } from "@/lib/decision-presentation";
import type { MarketDecision } from "@/lib/market-decision";
import type { TargetKey } from "@/lib/routes";
import { getWorkerClient, SupersededError } from "@/lib/worker-client";

const dollars = (value: string) => `$${new Decimal(value).toFixed(2)}`;
const subscriptions = DECISION_MARKET.plans.filter(
  (p) => p.artifact.purchase.kind === "subscription",
);

/** Presentation of durable engine receipts. Never prices or assigns workload events. */
export function MarketDecisionSurface({
  importId,
  onResult,
}: {
  importId: string;
  onResult?: (id: string, result: MarketDecision) => void;
}) {
  const [decision, setDecision] = useState<MarketDecision>();
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<TargetKey[]>([]);
  useEffect(() => {
    const refresh = () => setSelected(readCurrentStack());
    refresh();
    return subscribeCurrentStack(refresh);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setDecision(undefined);
    setError(undefined);
    getWorkerClient()
      .apiMarket(importId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setDecision(result);
          onResult?.(importId, result);
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
  }, [importId, onResult]);
  const scenarios = decision?.scenarios ?? [];
  const first = scenarios[0]?.summary;
  const range = marketRange(decision);
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
  return (
    <section
      id="api-market"
      aria-labelledby="api-market-heading"
      className="flex min-w-0 scroll-mt-28 flex-col gap-4 border-t border-border-strong pt-5"
      data-testid="market-decision"
    >
      <div className="flex flex-col gap-2">
        <MicroLabel>Published API equivalent</MicroLabel>
        <h2 id="api-market-heading" className="text-xl font-medium tracking-tight">
          What would your recorded work cost?
        </h2>
        {!decision && !error ? (
          <p role="status" className="text-sm text-muted-foreground">
            Calculating what your exact models would cost through published APIs…
          </p>
        ) : null}
        {error ? (
          <div role="alert">
            <p data-testid="market-total" className="font-mono text-xl">
              Calculation unavailable
            </p>
            <p className="text-sm text-warning">{error}</p>
          </div>
        ) : null}
        {decision ? (
          <>
            <p
              data-testid="market-total"
              className="font-mono text-3xl font-medium tabular-nums tracking-tight sm:text-4xl"
            >
              {comparable
                ? different
                  ? `${dollars(totals[0] ?? "0")} – ${dollars(totals[1] ?? "0")}`
                  : dollars(totals[0] ?? "0")
                : "Full total unavailable"}
            </p>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {comparable
                ? different
                  ? "At published API prices. Claude cache-write duration is not recorded by this source, so StackReplay calculated both published possibilities."
                  : "At published API prices for the recorded workload."
                : "Some required execution or pricing facts remain unknown. No missing price is treated as zero."}{" "}
              This is a published-price comparison, not your actual bill or a subscription savings
              claim.
            </p>
            {decision.unavailable ? (
              <p className="text-sm" data-testid="market-coverage">
                {decision.unavailable.calls.toLocaleString()} calls retained.{" "}
                {decision.unavailable.message}
              </p>
            ) : null}
            {first ? (
              <p className="text-sm" data-testid="market-coverage">
                {first.scope.recorded.toLocaleString()} / {first.scope.recorded.toLocaleString()}{" "}
                calls retained in the comparison ·{" "}
                {comparable ? first.scope.required.toLocaleString() : "See unknowns for"} priced
                calls · {first.scope.excluded.toLocaleString()} unresolved calls excluded from
                pricing. {comparable ? "Exact models preserved." : ""}
              </p>
            ) : null}
          </>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Price snapshot: {DECISION_MARKET.rulesAt.slice(0, 10)} · review due{" "}
          {DECISION_MARKET.reviewUntil.slice(0, 10)}. Standard paid API access assumed; token usage
          only. Tools, tax and negotiated rates excluded.
        </p>
      </div>
      <section aria-label="Your current stack" className="border-y border-border-strong py-5">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <MicroLabel>Your current stack</MicroLabel>
            <p className="mt-2 font-mono text-3xl tabular-nums" data-testid="decision-fixed-spend">
              {selected.length ? `${dollars(current.toString())} / month` : "Not selected"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Selected fixed subscriptions at listed monthly prices.
              {unlisted > 0
                ? ` ${unlisted} selection(s) have no admitted monthly price in this subtotal; the difference is withheld.`
                : ""}
            </p>
            <button
              type="button"
              className="inline-flex min-h-11 items-center text-sm text-accent underline"
              onClick={() => {
                const element = document.getElementById("current-stack");
                if (element instanceof HTMLDetailsElement) {
                  element.open = true;
                  element.scrollIntoView({ block: "start" });
                  element.querySelector("summary")?.focus();
                }
              }}
            >
              Select or edit your subscriptions →
            </button>
            {subscriptions
              .filter((p) => selected.includes(`plan:${p.id}`))
              .map((p) => (
                <p className="text-sm" key={p.id}>
                  {p.name}
                </p>
              ))}
          </div>
          <div>
            <MicroLabel>Difference versus published API equivalent</MicroLabel>
            <p className="mt-2 font-mono text-2xl tabular-nums" data-testid="decision-difference">
              {selected.length && range && !unlisted
                ? `${dollars(fixedDifference(current.toString(), range).low)} – ${dollars(fixedDifference(current.toString(), range).high)}`
                : "Select your stack to compare"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              One monthly subscription bill versus this recorded workload
              {first
                ? ` (${first.scope.period.start.slice(0, 10)} to ${first.scope.period.end.slice(0, 10)})`
                : ""}
              . No monthly projection or prorating. This difference is not proven savings.
            </p>
          </div>
        </div>
      </section>
      <section aria-label="What StackReplay can tell you" className="grid gap-5 sm:grid-cols-2">
        <div>
          <MicroLabel>
            {comparable
              ? "API cost known · under displayed assumptions"
              : "API calculation incomplete"}
          </MicroLabel>
          <h3 className="mt-2 font-medium">What we can tell you</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {comparable
              ? `${first?.scope.required.toLocaleString()} calls priced using the exact recorded models. Both cache-write scenarios retain the same workload. `
              : "All imported calls stay in scope. Missing facts remain visible in the calculation below."}
            {selected.length
              ? " Your selected plans’ listed fixed prices are shown separately from API usage."
              : " Add your subscriptions to compare their listed fixed prices with this recorded work."}
          </p>
        </div>
        <div>
          <MicroLabel>Subscription capacity unknown</MicroLabel>
          <h3 className="mt-2 font-medium">What this does not establish</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Published subscription capacity is not deterministic enough to prove whether these plans
            would handle your bursts without interruption. API usage may provide a different product
            experience. This is not a recommendation to cancel a plan. Taxes, other tools and
            negotiated prices are not included.
          </p>
        </div>
      </section>
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
      {first?.explanation ? (
        <section aria-label="Current API market" className="flex flex-col gap-2">
          <MicroLabel>Exact models · published API routes</MicroLabel>
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
                  usd: receipts.reduce((n, r) => n.add(r.variableUsd), new Decimal(0)).toString(),
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
                    <span className="text-muted-foreground">· {values[0]?.calls} calls</span>
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
      <details className="min-w-0 text-sm" data-testid="market-calculation">
        <summary className="cursor-pointer py-2 text-accent">
          Inspect calculation, assumptions and evidence
        </summary>
        <div className="flex min-w-0 flex-col gap-4 pt-3 [overflow-wrap:anywhere]">
          <p>
            Both interpretations use the identical recorded calls. Neither cache duration is
            observed history. Published reasoning billing is applied without changing token
            accounting. The GPT-5.6 Sol promotion is a separately evidenced overlay; no undiscounted
            permanent price is inferred.
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
                      {c.resourceInstanceId} / {c.routeId} / {c.rateId} / {c.category}: {c.tokens} ×
                      ${c.ratePerMillion}/1M × {c.factor} = ${c.usd} · claims{" "}
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
                    setSelected(next);
                    writeCurrentStack(next);
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
          Selected fixed subscription spend: ${current.toFixed(2)} / month
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
          Published sticker-price arithmetic only. Selecting a plan does not establish your
          eligibility, actual billed price, or that you should cancel it.
        </p>
      </details>
    </section>
  );
}
