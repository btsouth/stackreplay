"use client";
import Link from "next/link";
import type { ReactNode } from "react";
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
          <div className="local-proof label">NOTHING LEAVES YOUR BROWSER. YOUR LOGS STAY HERE.</div>
        </div>
        {sample}
      </div>
    ) : (
      <div className="status" role="status">
        <div className="label">READING LOCAL HISTORY</div>
        <p>Calculating your overview on this device…</p>
      </div>
    );
  return (
    <>
      {(data.imports?.length ?? 0) > 1 && (
        <div className="history-picker">
          <label htmlFor="history">History</label>
          <select id="history" value={data.id} onChange={(e) => data.selectHistory(e.target.value)}>
            {data.imports?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
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
