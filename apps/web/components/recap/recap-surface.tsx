"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRecapData } from "@/lib/use-recap-data";
import { usePaidMultiplier } from "@/lib/use-paid-multiplier";
import { Overview } from "@/components/terminal/overview";
export function RecapSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const data = useRecapData(initialImportId),
    paid = usePaidMultiplier(data.recap),
    router = useRouter();
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
      <div className="status" data-testid="recap-empty">
        <div className="label">LOCAL · NOTHING UPLOADED</div>
        <h1>Your AI coding, all of it.</h1>
        <p>Scan your tool history to see your tokens, speed, models and rhythm here.</p>
        <Link className="btn primary" href="/app/scan">
          Scan my history ↗
        </Link>
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
          <select
            id="history"
            value={data.id}
            onChange={(e) => {
              const q = new URLSearchParams(window.location.search);
              q.set("import", e.target.value);
              router.push(`/app/recap?${q}`);
            }}
          >
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
