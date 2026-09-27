"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import { useEffect, useState } from "react";
import { MicroLabel } from "@/components/instrument/primitives";
import { readCurrentStack, writeCurrentStack } from "@/lib/current-stack";
import type { MarketDecision } from "@/lib/market-decision";
import type { TargetKey } from "@/lib/routes";
import { getWorkerClient, SupersededError } from "@/lib/worker-client";

const dollars = (value: string) => `$${new Decimal(value).toFixed(2)}`;
const subscriptions = DECISION_MARKET.plans.filter(
  (p) => p.artifact.purchase.kind === "subscription",
);

/** Presentation of durable engine receipts. Never prices or assigns workload events. */
export function MarketDecisionSurface({ importId }: { importId: string }) {
  const [decision, setDecision] = useState<MarketDecision>();
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<TargetKey[]>([]);
  useEffect(() => setSelected(readCurrentStack()), []);
  useEffect(() => {
    const controller = new AbortController();
    setDecision(undefined);
    setError(undefined);
    getWorkerClient()
      .apiMarket(importId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDecision(result);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted && !(e instanceof SupersededError))
          setError(
            "The published API calculation could not complete. Reopen this workload to retry.",
          );
      });
    return () => controller.abort();
  }, [importId]);
  const scenarios = decision?.scenarios ?? [];
  const first = scenarios[0]?.summary;
  const comparable =
    scenarios.length === 2 &&
    scenarios.every(
      (s) =>
        s.summary.scope.digest === first?.scope.digest &&
        s.summary.candidates[0]?.status === "feasible",
    );
  const totals = comparable ? scenarios.map((s) => s.summary.candidates[0]?.totalUsd ?? "0") : [];
  const different = totals.length === 2 && !new Decimal(totals[0] ?? "0").eq(totals[1] ?? "0");
  const unlisted = selected.filter(
    (key) => !subscriptions.some((p) => key === `plan:${p.id}`),
  ).length;
  const current = subscriptions.reduce(
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
          What would this workload cost?
        </h2>
        {!decision && !error ? (
          <p role="status" className="text-sm text-muted-foreground">
            Calculating the admitted direct API market locally…
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
                  ? "At published API prices, depending on cache-write duration, which this source does not record."
                  : "At published API prices for the recorded workload."
                : "Some required execution or pricing facts remain unknown. No missing price is treated as zero."}{" "}
              This is an API counterfactual, not your actual bill or a subscription savings claim.
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
          <MicroLabel>Current API market · same workload</MicroLabel>
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
                    {p.name}{" "}
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
      <details data-testid="market-subscriptions" className="text-sm">
        <summary className="cursor-pointer py-2 text-accent">
          Known subscriptions · capacity cannot yet be compared exactly
        </summary>
        <p className="py-3 text-muted-foreground">
          These commercial facts do not establish that a subscription could handle this workload.
          Published limits or debit rules are insufficient for deterministic replay. They are kept
          outside the API assignment.
        </p>
        <fieldset>
          <legend className="py-2 font-medium">
            Current subscriptions (up to four, saved only in this browser)
          </legend>
          {subscriptions.map((p) => (
            <div key={p.id} className="border-b border-border py-3">
              <label className="flex min-h-11 flex-wrap items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(`plan:${p.id}`)}
                  disabled={selected.length >= 4 && !selected.includes(`plan:${p.id}`)}
                  onChange={(e) => {
                    const key: TargetKey = `plan:${p.id}`;
                    const next = e.target.checked
                      ? [...selected, key].slice(0, 4)
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
              <details className="pl-6">
                <summary className="cursor-pointer py-1 text-muted-foreground">
                  Why capacity is not computable · access and evidence
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
          Selected admitted subscription spend: ${current.toFixed(2)} per listed billing cycle
        </p>
        {unlisted > 0 ? (
          <p className="pt-2 text-muted-foreground">
            {unlisted} previously selected target(s) are outside this admitted subscription list and
            are not included in this subtotal. Edit those selections in Compare.
          </p>
        ) : null}
        <p className="pt-2 text-muted-foreground">
          Published sticker-price arithmetic only. Selecting a plan does not establish your
          eligibility, actual billed price, or that you should cancel it.
        </p>
      </details>
    </section>
  );
}
