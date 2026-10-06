import type { ReactNode } from "react";
import { compact } from "@/lib/terminal-presentation";
export function Section({
  number,
  title,
  note,
  children,
  id,
}: {
  number: string;
  title: string;
  note: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="sec" id={id ?? `section-${number}`} aria-labelledby={`title-${number}`}>
      <div className="sh">
        <span className="label">{number}</span>
        <h2 id={`title-${number}`}>{title}</h2>
        <p>{note}</p>
      </div>
      {children}
    </section>
  );
}
export function Readout({
  label,
  value,
  unit,
  note,
  signal,
  testId,
}: {
  label: string;
  value: ReactNode;
  unit?: string | undefined;
  note?: ReactNode;
  signal?: boolean;
  testId?: string;
}) {
  return (
    <div className="cell kv" data-testid={testId}>
      <div className="label">{label}</div>
      <div className={`v${signal ? " sig" : ""}`}>
        {value}
        {unit && <small>{unit}</small>}
      </div>
      {note && <div className="n">{note}</div>}
    </div>
  );
}
export function BarList({
  label,
  rows,
}: {
  label: string;
  rows: { name: string; total: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="cell lcol">
      <span className="label">{label}</span>
      {rows.length ? (
        rows.map((r, i) => (
          <div className="li" key={`${r.name}-${i}`}>
            <span className="ln">{r.name}</span>
            <span className="lv">{compact(r.total)}</span>
            <div className="lb">
              <div style={{ width: `${(r.total / max) * 100}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className="dim">No recorded totals.</p>
      )}
    </div>
  );
}
