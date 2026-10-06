import type { CSSProperties, ReactNode } from "react";
import { compact } from "@/lib/terminal-presentation";
/** Keep the mono decimal glyph close to its neighbouring digits. */
export function TightNumber({ value }: { value: string | number }) {
  const [whole, fraction] = String(value).split(".");
  return (
    <>
      <span>{whole}</span>
      {fraction !== undefined && (
        <span>
          <span className="pt">.</span>
          {fraction}
        </span>
      )}
    </>
  );
}
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
      <div
        className={`v${signal ? " sig" : ""}${typeof value === "string" && !/\d/.test(value) ? " text-value" : ""}`}
      >
        {typeof value === "string" || typeof value === "number" ? (
          <TightNumber value={value} />
        ) : (
          value
        )}
        {unit && <small>{unit}</small>}
      </div>
      {note && <div className="n">{note}</div>}
    </div>
  );
}
export function HeatLegend({ max }: { max: number }) {
  return (
    <div className="heat-legend">
      <span className="label">MODEL CALLS · 0 … {max.toLocaleString("en-US")}</span>
      <span className="heat-swatches" aria-hidden="true">
        {[0, 0.33, 0.67, 1].map((value) => (
          <i key={value} style={{ "--v": value } as CSSProperties} />
        ))}
      </span>
    </div>
  );
}
export function BarList({
  label,
  rows,
}: {
  label: string;
  rows: { id?: string; name: string; total: number }[];
}) {
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const shown = rows.filter((r) => r.total / Math.max(1, total) >= 0.0001).slice(0, 8);
  const remaining = rows.filter((r) => !shown.includes(r));
  const max = Math.max(1, ...shown.map((r) => r.total));
  return (
    <div className="cell lcol">
      <span className="label">{label}</span>
      {rows.length ? (
        shown.map((r) => (
          <div className="li" key={r.id ?? r.name}>
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
      {remaining.length > 0 && (
        <div className="tail bar-tail">
          {remaining.map((r) => (
            <span className="tl" key={r.id ?? r.name}>
              {r.name}
              <b>{compact(r.total)}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
