"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readAccountIdentities } from "@/lib/account-identity";
import {
  newSubscriptionId,
  readStackSubscriptions,
  type StackSubscription,
  stackKeys,
  subscribeCurrentStack,
  writeStackSubscriptions,
} from "@/lib/current-stack";
import { buildMyStack, publishedPriceText } from "@/lib/my-stack";
import { catalogPlansAt } from "@/lib/public-catalog";
import { familyColors, type Recap, type RecapPeriod } from "@/lib/recap";
import { activityDays, compactNumber, recapUsd, renderRecapCard } from "@/lib/recap-card";
import { paidMultiplier, recapPlans } from "@/lib/recap-plans";
import type { TargetKey } from "@/lib/routes";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import "./recap.css";

const toolNames: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
  "command-code": "Command Code",
  hermes: "Hermes",
  ccusage: "ccusage import",
};
const color = (family: string) => familyColors[family] ?? familyColors.other;
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="recap-info">
      <summary aria-label={label}>i</summary>
      <div>{children}</div>
    </details>
  );
}
function Heatmap({ recap }: { recap: Recap }) {
  const days = activityDays(recap.days);
  const offset = new Date(`${days[0]?.date ?? recap.start}T00:00:00Z`).getUTCDay();
  const count = Math.ceil((days.length + offset) / 7);
  const gap = Math.min(5, 100 / count);
  const max = Math.max(1, ...days.map((d) => d.records));
  return (
    <div className="recap-calendar-scroll">
      <div className="recap-calendar-labels">
        <span>{days[0]?.date ?? recap.start}</span>
        <span>{recap.end}</span>
      </div>
      <div
        className="recap-calendar-grid"
        role="img"
        aria-label={`${days.filter((d) => d.records).length} active days. Activity by local day, from ${days[0]?.date ?? recap.start} to ${recap.end}.`}
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          maxWidth: `${count * 26 + (count - 1) * gap}px`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: count }, (_, col) => (
          <div
            className="recap-calendar-week"
            key={days[Math.max(0, col * 7 - offset)]?.date ?? col}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday, row) => {
              const day = days[col * 7 + row - offset];
              return (
                <div
                  key={weekday}
                  className={day?.records ? "active" : day ? "empty" : "blank"}
                  style={{ opacity: day?.records ? 0.3 + 0.7 * Math.sqrt(day.records / max) : 1 }}
                  title={
                    day ? `${day.date}: ${day.records.toLocaleString()} usage records` : undefined
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
function Mix({ recap }: { recap: Recap }) {
  const families = [...new Set(recap.models.map((m) => m.family))];
  const max = Math.max(
    1,
    ...recap.weeks.map((w) => Object.values(w.families).reduce((a, b) => a + b, 0)),
  );
  const bw = 600 / Math.max(1, recap.weeks.length);
  return (
    <>
      <svg
        className="recap-mix"
        role="img"
        aria-label="Weekly output token mix by model developer"
        viewBox="0 0 640 220"
      >
        {recap.weeks.map((w, i) => {
          let base = 180;
          return (
            <g key={w.date}>
              {families.map((f) => {
                const height = ((w.families[f] ?? 0) / max) * 155;
                base -= height;
                return (
                  <rect
                    key={f}
                    x={20 + i * bw}
                    y={base}
                    width={Math.max(2, bw - 8)}
                    height={height}
                    rx="2"
                    fill={color(f)}
                  >
                    <title>
                      {w.date}, {f}: {compactNumber(w.families[f] ?? 0)} output tokens
                    </title>
                  </rect>
                );
              })}
              {(recap.weeks.length < 10 || i % Math.ceil(recap.weeks.length / 6) === 0) && (
                <text x={20 + i * bw} y="208">
                  {w.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="recap-legend">
        {families.map((f) => (
          <span key={f}>
            <i style={{ background: color(f) }} />
            {f === "other" ? "Other / unresolved" : f}
          </span>
        ))}
      </div>
    </>
  );
}
export function RecapSurface({
  initialImportId,
  initialTarget,
}: {
  initialImportId?: string | undefined;
  initialTarget?: string | undefined;
}) {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [id, setId] = useState(initialImportId);
  const [period, setPeriod] = useState<RecapPeriod>("30");
  const [recap, setRecap] = useState<Recap>();
  const [error, setError] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [stack, setStack] = useState<StackSubscription[]>([]);
  const [showPaid, setShowPaid] = useState(false);
  const [confirmedPlans, setConfirmedPlans] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const now = useMemo(() => new Date().toISOString(), []);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  useEffect(() => {
    const refresh = () => {
      const saved = readStackSubscriptions();
      const effective =
        window.localStorage.getItem("stackreplay.recap-plans-manual") === "true"
          ? saved
          : recapPlans(saved, readAccountIdentities());
      setStack(effective);
    };
    setShowPaid(window.localStorage.getItem("stackreplay.recap-show-paid") === "true");
    setConfirmedPlans(
      window.localStorage.getItem("stackreplay.recap-paid-confirmation") ?? undefined,
    );
    refresh();
    const unsubscribe = subscribeCurrentStack(refresh);
    window.addEventListener("stackreplay-account-labels", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("stackreplay-account-labels", refresh);
    };
  }, []);
  useEffect(() => {
    let active = true;
    getWorkerClient()
      .listImports()
      .then((rows) => {
        if (active) {
          setImports(rows);
          setId((old) => old ?? rows[0]?.id);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not open local history.");
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    const worker = new Worker("/stackreplay-recap-worker.js", { type: "module" });
    setRecap(undefined);
    setError(undefined);
    worker.onmessage = (message: MessageEvent<{ recap?: Recap; error?: string }>) => {
      if (active) {
        setRecap(message.data.recap);
        setError(message.data.error);
      }
    };
    worker.onerror = () => {
      if (active) setError("Could not calculate your recap. Reload to try again.");
    };
    getWorkerClient()
      .exportImport(id)
      .then((bytes) => {
        if (active) worker.postMessage({ bytes, period, now, timeZone }, [bytes.buffer]);
      })
      .catch(() => {
        if (active) setError("This history is unavailable. Choose another or scan again.");
      });
    return () => {
      active = false;
      worker.terminate();
    };
  }, [id, period, now, timeZone]);
  const plans = useMemo(() => catalogPlansAt(now.slice(0, 10)), [now]);
  const planSummary = useMemo(
    () =>
      buildMyStack({
        currentStack: stackKeys(stack),
        counts: Object.fromEntries(
          stackKeys(stack).map((key) => [key, stack.filter((s) => s.plan === key).length]),
        ),
        rulesAsOf: now.slice(0, 10),
      }),
    [stack, now],
  );
  const selectedPlanCount = stack.filter((s) => s.plan.startsWith("plan:")).length;
  const monthly = planSummary.totals.find((t) => t.currency === "USD" && t.interval === "month");
  const monthlyCost =
    selectedPlanCount && !planSummary.unpricedPlans && planSummary.totals.length === 1 && monthly
      ? monthly.amount
      : undefined;
  const planSignature = JSON.stringify({
    plans: stack
      .filter((s) => s.plan.startsWith("plan:"))
      .map((s) => s.plan)
      .sort(),
    monthlyCost,
  });
  const confirmed = confirmedPlans === planSignature;
  const multiplier =
    showPaid && confirmed && recap && monthlyCost
      ? paidMultiplier(recap.usd, monthlyCost, recap.days.length)
      : undefined;
  const multiplierText = multiplier ? `${multiplier}× what I paid` : undefined;
  async function download(portrait: boolean) {
    if (!recap) return;
    setExporting(true);
    try {
      const blob = await renderRecapCard(recap, portrait, multiplierText);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stackreplay-recap-${portrait ? "1080x1350" : "1200x630"}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Image download failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="recap-page">
      <header className="recap-toolbar">
        <div>
          <span className="recap-eyebrow">YOUR HISTORY, IN PERSPECTIVE</span>
          <h1>
            Your coding recap<span>.</span>
          </h1>
        </div>
        <div className="recap-controls">
          <label className="sr-only" htmlFor="recap-period">
            Recap period
          </label>
          <select
            id="recap-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as RecapPeriod)}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          {imports.length > 1 && (
            <select aria-label="History" value={id} onChange={(e) => setId(e.target.value)}>
              {imports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className="recap-status">
          {error} <a href="/app/import">Scan histories</a>
        </p>
      )}
      {!recap && !error && (
        <div className="recap-status">
          {!loaded || id ? (
            "Bringing your history into focus…"
          ) : (
            <>
              <h2>Your next chapter starts here.</h2>
              <p>Connect your AI coding histories for a recap that stays in this browser.</p>
              <a className="recap-button" href="/app/import">
                Find my AI histories
              </a>
            </>
          )}
        </div>
      )}
      {recap &&
        (recap.records ? (
          <div data-testid="recap-ready">
            <section className="recap-hero">
              <div className="recap-hero-top">
                <span className="recap-eyebrow">
                  {recap.start} / {recap.end}
                </span>
                <span className="recap-local">● ONLY IN YOUR BROWSER</span>
              </div>
              <div className="recap-hero-number">
                {recap.priced
                  ? recapUsd(recap.usd)
                  : compactNumber(recap.outputKnown ? recap.output : recap.records)}
              </div>
              <div className="recap-hero-caption">
                {recap.priced
                  ? "of AI coding at API prices"
                  : recap.outputKnown
                    ? "logged output tokens"
                    : "logged activity records"}
                <Info label="How API-equivalent value is calculated">
                  <p>
                    What the priced records would cost at their model developer's catalog API list
                    prices, pinned to {recap.rulesAsOf}. The replay engine accounts for input,
                    output, cache, reasoning and supported rate conditions.
                  </p>
                  {recap.usdHigh !== recap.usd && (
                    <p>
                      {recapUsd(recap.usd)} to {recapUsd(recap.usdHigh)}: cache-write lifetimes are
                      unreported for {recap.cacheScenarioRecords.toLocaleString()} records. The main
                      number uses the 5-minute rate; the upper bound uses the 1-hour rate.
                    </p>
                  )}
                  <p>
                    {recap.priced.toLocaleString()} of {recap.records.toLocaleString()} usage
                    records priced ({Math.round((recap.priced / recap.records) * 100)}%). Unknown
                    models or incomplete pricing are excluded. This is an estimate, not a bill or
                    savings.
                  </p>
                </Info>
              </div>
              {multiplierText && recap.priced > 0 && (
                <p className="recap-plan-comparison">
                  <strong>{multiplierText}</strong>
                  <Info label="How the payment multiplier is calculated">
                    <p>
                      API-equivalent value divided by (your confirmed monthly plan cost ×{" "}
                      {recap.days.length} days / 30.4). Rounded to a whole number and shown only at
                      2× or above. The same lower cache-rate scenario is used throughout.
                    </p>
                    <p>
                      Current published plan prices are the reference you confirmed. Taxes,
                      discounts, plan changes and separate API charges are excluded.
                    </p>
                  </Info>
                </p>
              )}
            </section>
            <section className="recap-stats" aria-label="Your key numbers">
              {[
                [
                  `${recap.streak}`,
                  "day activity streak",
                  "Days with logged usage, anchored to today or yesterday. Includes agent activity.",
                ],
                ...(recap.outputKnown
                  ? [
                      [
                        compactNumber(recap.output),
                        "output tokens",
                        `Logged output including separately reported reasoning, without double counting. ${recap.outputKnown.toLocaleString()} of ${recap.records.toLocaleString()} records report output.`,
                      ],
                    ]
                  : []),
                ...(recap.sessions
                  ? [
                      [
                        recap.sessions.toLocaleString(),
                        "sessions",
                        `${recap.sessionKnown.toLocaleString()} records have native session identity. Distinct tool and session pairs, including sessions started by child agents; not user visits.`,
                      ],
                    ]
                  : []),
                [
                  new Date(Date.UTC(2026, 0, 1, recap.busiestHour)).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    timeZone: "UTC",
                  }),
                  "busiest hour",
                  `Most usage records by local hour in ${recap.timeZone}, not human work time.`,
                ],
              ].map(([value, label, method]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>
                    {label}
                    <Info label={`About ${label}`}>
                      <p>{method}</p>
                    </Info>
                  </span>
                </div>
              ))}
            </section>
            <section className="recap-panel">
              <div className="recap-section-heading">
                <div>
                  <h2>A little, then a lot.</h2>
                </div>
                <span>
                  {recap.days.filter((d) => d.records).length} active days
                  <Info label="About activity">
                    <p>
                      Each square counts normalized usage records on a local calendar day in{" "}
                      {recap.timeZone}. Darker means more activity. Aggregate imports place usage on
                      their recorded timestamp; records across tools are not equivalent API calls.
                      Only the selected local history is covered.
                    </p>
                  </Info>
                </span>
              </div>
              <Heatmap recap={recap} />
              <div className="recap-calendar-footer">
                <span>From the first active week. Each cell is a day.</span>
                <span>
                  Less <i /> <i /> <i /> More
                </span>
              </div>
            </section>
            <div className="recap-two-column">
              {recap.outputKnown > 0 && (
                <section className="recap-panel">
                  <h2>
                    Your model mix.{" "}
                    <Info label="About model API values">
                      <p>
                        Each model uses the same lower cache-rate scenario as the hero. Unreported
                        cache-write lifetimes use the 5-minute rate; the 1-hour rate can yield a
                        higher value. Unknown or incomplete prices are excluded.
                      </p>
                    </Info>
                  </h2>
                  <p className="recap-subtitle">Output tokens, week by week.</p>
                  <Mix recap={recap} />
                  <div className="recap-models">
                    {recap.models.slice(0, 7).map((m, i) => (
                      <div key={m.id}>
                        <span className="recap-model-rank">{String(i + 1).padStart(2, "0")}</span>
                        <i style={{ background: color(m.family) }} />
                        <span className="recap-model-name">{m.name}</span>
                        <span>
                          {compactNumber(m.output)}
                          <small>output tokens</small>
                        </span>
                        <span>
                          {m.priced ? recapUsd(m.usd) : "Unpriced"}
                          <small>
                            {m.priced < m.records && m.priced ? "priced records" : "API equivalent"}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div className="recap-right-column">
                <section className="recap-panel">
                  <h2>Many tools. One story.</h2>
                  <p className="recap-subtitle">Share of output tokens.</p>
                  <div className="recap-tools">
                    {[...recap.tools]
                      .sort((a, b) => b.output - a.output)
                      .map((t) => (
                        <div key={t.id}>
                          <div>
                            <strong>{toolNames[t.id] ?? t.id}</strong>
                            <span>{Math.round((t.output / Math.max(1, recap.output)) * 100)}%</span>
                          </div>
                          <div className="recap-tool-track">
                            <i
                              style={{ width: `${(t.output / Math.max(1, recap.output)) * 100}%` }}
                            />
                          </div>
                          <small>
                            {t.records.toLocaleString()}{" "}
                            {t.id === "hermes" ? "session/model aggregates" : "records"}
                            {recap.outputKnown > 0
                              ? ` · ${compactNumber(t.output)} output tokens`
                              : ""}
                          </small>
                        </div>
                      ))}
                  </div>
                </section>
                <section className="recap-panel recap-facts">
                  <h2>Patterns worth keeping.</h2>
                  <p>
                    <strong>{recap.longestStreak} days</strong>
                    <span>Your longest logged activity streak.</span>
                  </p>
                  <p>
                    <strong>
                      {new Date(`${recap.busiestDay}T12:00:00Z`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </strong>
                    <span>Your busiest day by usage records.</span>
                  </p>
                  <p>
                    <strong>{Math.round(recap.lateNightShare * 100)}%</strong>
                    <span>Of usage records landed between midnight and 5 AM.</span>
                  </p>
                </section>
              </div>
            </div>
            <section className="recap-share">
              <div>
                <h2>A chapter worth sharing.</h2>
                <p>A card of your numbers. No logs, no account details.</p>
              </div>
              <div>
                <button
                  type="button"
                  className="recap-button"
                  disabled={exporting}
                  onClick={() => void download(false)}
                >
                  Download landscape <span>1200 × 630</span>
                </button>
                <button
                  type="button"
                  className="recap-button secondary"
                  disabled={exporting}
                  onClick={() => void download(true)}
                >
                  Download portrait <span>1080 × 1350</span>
                </button>
              </div>
            </section>
            <section className="recap-payment" aria-label="Card payment comparison">
              <label className="recap-paid-toggle">
                <input
                  type="checkbox"
                  checked={showPaid}
                  onChange={(e) => {
                    setShowPaid(e.target.checked);
                    window.localStorage.setItem(
                      "stackreplay.recap-show-paid",
                      String(e.target.checked),
                    );
                  }}
                />
                Show what I paid
              </label>
              {showPaid && (
                <>
                  <details className="recap-plans" open={!confirmed}>
                    <summary>{selectedPlanCount ? "Confirm your plans" : "Add your plans"}</summary>
                    <p>
                      Choose the subscriptions you pay for. Confirm the monthly total before
                      including it in your recap.
                    </p>
                    <div>
                      {plans
                        .filter((p) => p.price && !p.id.startsWith("example-"))
                        .map((p) => {
                          const key = `plan:${p.id}` as TargetKey;
                          return (
                            <label key={key}>
                              <input
                                type="checkbox"
                                checked={stack.some((s) => s.plan === key)}
                                onChange={(e) => {
                                  window.localStorage.setItem(
                                    "stackreplay.recap-plans-manual",
                                    "true",
                                  );
                                  writeStackSubscriptions(
                                    e.target.checked
                                      ? [
                                          ...stack,
                                          {
                                            id: newSubscriptionId(stack.map((s) => s.id)),
                                            plan: key,
                                          },
                                        ]
                                      : stack.filter((s) => s.plan !== key),
                                  );
                                }}
                              />
                              <span>
                                {p.name}
                                {stack.filter((s) => s.plan === key).length > 1
                                  ? ` × ${stack.filter((s) => s.plan === key).length}`
                                  : ""}
                                <small>{publishedPriceText(p.price)}</small>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                    {selectedPlanCount > 0 && !monthlyCost && (
                      <p>
                        Selected plans use different currencies or billing intervals, or have an
                        unreported price. See <a href="/app/stack">My Stack</a> for their individual
                        prices.
                      </p>
                    )}
                  </details>
                  {monthlyCost && (
                    <p className="recap-payment-total">
                      {recapUsd(monthlyCost)}/month across {selectedPlanCount}{" "}
                      {selectedPlanCount === 1 ? "subscription" : "subscriptions"}.
                    </p>
                  )}
                  <button
                    type="button"
                    className="recap-button secondary"
                    disabled={!monthlyCost || confirmed}
                    onClick={() => {
                      setConfirmedPlans(planSignature);
                      window.localStorage.setItem(
                        "stackreplay.recap-paid-confirmation",
                        planSignature,
                      );
                    }}
                  >
                    {confirmed && monthlyCost ? "Plans confirmed" : "Confirm what I paid"}
                  </button>
                  {confirmed && monthlyCost && !multiplier && (
                    <p className="recap-payment-total">
                      Your comparison is below 2×, so the multiplier stays off your recap.
                    </p>
                  )}
                </>
              )}
            </section>
            <footer className="recap-footer">
              Calculated on this device. Your logs stay here.{" "}
              <Link
                href={`/app/workload?import=${encodeURIComponent(id ?? "")}${initialTarget ? `&target=${encodeURIComponent(initialTarget)}` : ""}`}
              >
                Explore workload details →
              </Link>
            </footer>
          </div>
        ) : (
          <div className="recap-status">
            <h2>No activity in this period.</h2>
            <p>Try all time or scan a more recent history.</p>
          </div>
        ))}
    </div>
  );
}
