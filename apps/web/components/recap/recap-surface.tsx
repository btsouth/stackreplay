"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Overview } from "@/components/terminal/overview";
import { usePaidMultiplier } from "@/lib/use-paid-multiplier";
import { useRecapData } from "@/lib/use-recap-data";
export function RecapSurface({
  initialImportId,
  sample,
}: {
  initialImportId?: string | undefined;
  sample?: ReactNode;
}) {
  const data = useRecapData(initialImportId),
    paid = usePaidMultiplier(data.recap);
  if (data.error)
    return (
      <div className="status" role="alert">
        <h1>History unavailable</h1>
        <p>{data.error}</p>
        <Link className="btn primary" href="/app/scan">
          Scan my history
        </Link>
      </div>
    );
  if (!data.recap)
    return data.imports?.length === 0 ? (
      <div className="first-run" data-testid="recap-empty">
        <div className="first-run-intro">
          <div className="path">
            <b>›</b> YOUR LOCAL AI HISTORY
          </div>
          <h1>
            Your AI coding,
            <br />
            all of it.
          </h1>
          <p>See your tokens, speed, models and rhythm in one overview.</p>
          <Link className="btn primary" href="/app/scan">
            Scan my history ↗
          </Link>
          <div className="supported-tools label">
            CLAUDE CODE · CODEX · OPENCODE · COMMAND CODE · HERMES
          </div>
          <div className="local-proof label">
            Your logs never leave this browser. Sharing uploads only the numbers on your card.
            Connecting GitHub sends only your username.
          </div>
        </div>
        {sample}
      </div>
    ) : (
      <SavedSummaryStatus status={data.indexStatus === "updating" ? "updating" : "reading"} />
    );
  return (
    <>
      {data.indexStatus !== "idle" ? <SavedSummaryStatus status={data.indexStatus} /> : null}
      {(data.imports?.length ?? 0) > 1 && (
        <div className="history-picker">
          <label htmlFor="history">History</label>
          <select id="history" value={data.id} onChange={(e) => data.selectHistory(e.target.value)}>
            {data.imports?.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.label} · ${new Date(r.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}`}
              </option>
            ))}
          </select>
        </div>
      )}
      {data.recap.records ? (
        <Overview
          recap={data.recap}
          period={data.period}
          onPeriod={data.selectPeriod}
          record={data.record}
          paid={paid}
        />
      ) : (
        <div className="status">
          <h1>No activity in this period.</h1>
          <p>Choose all time to see your saved history.</p>
          <button className="btn" type="button" onClick={() => data.selectPeriod("all")}>
            ALL
          </button>
          <Link className="btn primary" href="/app/scan">
            Scan my history
          </Link>
        </div>
      )}
    </>
  );
}

/**
 * A saved scan's derived summary can be out of date after an app or catalog
 * update. Say so plainly and show that time is passing, instead of leaving an
 * unexplained pause.
 */
function SavedSummaryStatus({ status }: { status: "reading" | "updating" }) {
  const [seconds, setSeconds] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new status restarts the elapsed timer.
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      250,
    );
    return () => window.clearInterval(timer);
  }, [status]);
  return (
    <div className="status inline-status" role="status" data-testid="recap-index-status">
      <div className="label">
        {status === "updating"
          ? "UPDATING YOUR SAVED SUMMARY (ONE TIME)"
          : "READING YOUR SAVED HISTORY"}
      </div>
      <p>Calculating your overview on this device…{seconds > 0 ? ` ${seconds}s` : ""}</p>
    </div>
  );
}
