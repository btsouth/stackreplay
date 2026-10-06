"use client";
import { encodeShareTokenV2 } from "@stackreplay/share";
import { Select } from "@stackreplay/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppPageSkeleton } from "@/components/app/app-page-state";
import { PartialScanNotice } from "@/components/import/evidence";
import type { Recap, RecapPeriod } from "@/lib/recap";
import { renderRecapCard } from "@/lib/recap-card";
import { recapShareV2 } from "@/lib/share-v2";
import { usePaidMultiplier } from "@/lib/use-paid-multiplier";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import { PeriodControl } from "./period-control";
import { RecapShareCard } from "./recap-share-card";
import { RecapStory } from "./recap-story";

export function RecapSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const router = useRouter();
  const query = useSearchParams();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [id, setId] = useState(initialImportId);
  const [period, setPeriod] = useState<RecapPeriod>("30");
  const [recap, setRecap] = useState<Recap>();
  const [error, setError] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [shareHref, setShareHref] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const now = useMemo(() => new Date().toISOString(), []);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  useEffect(() => {
    setId(initialImportId);
  }, [initialImportId]);
  useEffect(() => {
    let selected = query.get("period");
    if (selected === null) {
      try {
        selected = window.localStorage.getItem("stackreplay.recap-period");
      } catch {}
    }
    setPeriod(selected === "90" || selected === "all" ? selected : "30");
  }, [query]);
  function selectPeriod(next: RecapPeriod) {
    setPeriod(next);
    try {
      window.localStorage.setItem("stackreplay.recap-period", next);
    } catch {}
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
  const paid = usePaidMultiplier(recap);
  async function download(portrait: boolean) {
    if (!recap) return;
    const trigger = document.activeElement;
    setExporting(true);
    try {
      const blob = await renderRecapCard(recap, portrait);
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
      // Disabling a focused button during export moves focus to the body.
      // Restore it after React enables the button, unless the user moved on.
      window.requestAnimationFrame(() => {
        if (
          trigger instanceof HTMLButtonElement &&
          trigger.isConnected &&
          document.activeElement === document.body
        )
          trigger.focus({ preventScroll: true });
      });
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
          {error} <a href="/app/scan">Scan my history</a>
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
                Scan my history
              </a>
            </>
          )}
        </div>
      )}
      {recap &&
        (recap.records ? (
          <div data-testid="recap-ready" data-period={recap.period}>
            {imports.find((r) => r.id === id) && (
              <PartialScanNotice
                record={imports.find((r) => r.id === id) as ImportRecord}
                briefing
                action={
                  <Link className="text-sm text-accent" href="/app/scan">
                    Scan again
                  </Link>
                }
              />
            )}
            <RecapStory
              recap={recap}
              period={period}
              projects={imports.find((r) => r.id === id)?.localProjects ?? []}
              {...(paid ? { paid } : {})}
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
            <section className="recap-share">
              <div>
                <h2>Let your numbers travel.</h2>
                <p>A link to the same card. Only the numbers you see here are shared.</p>
              </div>
              <div>
                {shareHref ? (
                  <Link className="recap-button" href={shareHref} data-testid="recap-share-open">
                    Open shared recap
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="recap-button secondary"
                    data-testid="recap-share-create"
                    onClick={async () => {
                      try {
                        setShareHref(
                          `/s/${await encodeShareTokenV2(
                            recapShareV2(
                              recap,
                              imports.some(
                                (record) => record.id === id && isSyntheticWorkload(record),
                              ),
                            ),
                          )}`,
                        );
                      } catch {
                        setError("Your share link couldn't be created. Try again.");
                      }
                    }}
                  >
                    Create a share link
                  </button>
                )}
              </div>
            </section>
            <footer className="recap-footer">
              <span>Calculated on this device. Your logs stay here.</span>
              <span>
                <Link href="/app/scan">Scan again</Link>
                {" · "}
                <Link
                  href={`/app/stats?import=${encodeURIComponent(id ?? "")}`}
                  onNavigate={() => window.scrollTo(0, 0)}
                >
                  Explore your stats →
                </Link>
              </span>
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
