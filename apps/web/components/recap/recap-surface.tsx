"use client";
import { Select } from "@stackreplay/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppPageSkeleton } from "@/components/plans/app-page-state";
import { readAccountIdentities } from "@/lib/account-identity";
import {
  newSubscriptionId,
  readStackSubscriptions,
  type StackSubscription,
  stackCounts,
  stackKeys,
  subscribeCurrentStack,
  writeStackSubscriptions,
} from "@/lib/current-stack";
import { buildMyStack, publishedPriceText } from "@/lib/my-stack";
import { catalogPlansAt } from "@/lib/public-catalog";
import type { Recap, RecapPeriod } from "@/lib/recap";
import { recapUsd, renderRecapCard } from "@/lib/recap-card";
import { paidMultiplier, recapPlans } from "@/lib/recap-plans";
import type { TargetKey } from "@/lib/routes";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { PeriodControl } from "./period-control";
import { RecapShareCard } from "./recap-share-card";
import { RecapStory } from "./recap-story";

export function RecapSurface({
  initialImportId,
  initialTarget,
}: {
  initialImportId?: string | undefined;
  initialTarget?: string | undefined;
}) {
  const router = useRouter();
  const query = useSearchParams();
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
    setId(initialImportId);
  }, [initialImportId]);
  useEffect(() => {
    const selected = query.get("period");
    setPeriod(selected === "90" || selected === "all" ? selected : "30");
  }, [query]);
  function selectPeriod(next: RecapPeriod) {
    setPeriod(next);
    const query = new URLSearchParams(window.location.search);
    query.set("period", next);
    router.replace(`/app/recap?${query}${window.location.hash}`, { scroll: false });
  }
  function selectHistory(next: string) {
    setId(next);
    const query = new URLSearchParams(window.location.search);
    query.set("import", next);
    router.push(`/app/recap?${query}${window.location.hash}`, { scroll: false });
  }
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
        counts: stackCounts(stack),
        rulesAsOf: now.slice(0, 10),
      }),
    [stack, now],
  );
  const counts = stackCounts(stack);
  const selectedPlanCount = Object.entries(counts).reduce(
    (sum, [key, quantity]) => sum + (key.startsWith("plan:") ? quantity : 0),
    0,
  );
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
          <span className="recap-eyebrow">Your history, in perspective</span>
          <h1>
            Your coding recap<span>.</span>
          </h1>
        </div>
        <div className="recap-controls">
          <PeriodControl value={period} onChange={selectPeriod} />
          {imports.length > 1 && (
            <Select
              label="History"
              value={id ?? ""}
              onValueChange={selectHistory}
              options={imports.map((r) => ({ value: r.id, label: r.label }))}
            />
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className="recap-status">
          {error} <a href="/app/scan">Scan histories</a>
        </p>
      )}
      {!recap && !error && (
        <div className="recap-status">
          {!loaded || id ? (
            <AppPageSkeleton label="Bringing your history into focus" />
          ) : (
            <>
              <h2>Your next chapter starts here.</h2>
              <p>Connect your AI coding histories for a recap that stays in this browser.</p>
              <a className="recap-button" href="/app/scan">
                Find my AI histories
              </a>
            </>
          )}
        </div>
      )}
      {recap &&
        (recap.records ? (
          <div data-testid="recap-ready" data-period={recap.period}>
            <RecapStory
              recap={recap}
              period={period}
              projects={imports.find((r) => r.id === id)?.localProjects ?? []}
              {...(multiplierText ? { multiplierText } : {})}
            />
            <div style={{ maxWidth: "600px", margin: "32px auto" }}>
              <RecapShareCard recap={recap} />
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
                                {(counts[key] ?? 1) > 1 ? ` × ${counts[key]}` : ""}
                                <small>{publishedPriceText(p.price)}</small>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                    {selectedPlanCount > 0 && !monthlyCost && (
                      <p>
                        Selected plans use different currencies or billing intervals, or have an
                        unreported price. See <a href="/app/plans">My Stack</a> for their individual
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
                href={`/app/stats?import=${encodeURIComponent(id ?? "")}${initialTarget ? `&target=${encodeURIComponent(initialTarget)}` : ""}`}
              >
                Explore your stats →
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
