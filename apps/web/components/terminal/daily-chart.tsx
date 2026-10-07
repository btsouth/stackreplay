"use client";
import { useEffect, useRef, useState } from "react";
import { compact, dateLabel, dollars } from "@/lib/terminal-presentation";
/** A responsive SVG keeps axis text at 10 CSS pixels at every width. */
export function DailyChart({
  days,
  github,
  cost = false,
}: {
  days: { date: string; value: number }[];
  github?: Map<string, number> | undefined;
  cost?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [size, setSize] = useState({ width: 800, height: cost ? 210 : 260 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: Math.max(200, entry.contentRect.width),
          height: Math.max(cost ? 190 : 240, entry.contentRect.height),
        });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cost]);
  const { width, height: h } = size;
  const left = 54,
    base = github ? h * 0.6 : h - 22,
    max = Math.max(1, ...days.map((d) => d.value)),
    ghMax = Math.max(1, ...(github?.values() ?? []));
  const slot = (width - left) / Math.max(1, days.length),
    bw = Math.max(0.25, slot * 0.73),
    peak = days.reduce((p, d, i) => (d.value > (days[p]?.value ?? 0) ? i : p), 0);
  const ticks = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];
  return (
    <div ref={ref} className="chart-area">
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${h}`}
        role="img"
        aria-label={
          cost
            ? "Daily API value"
            : "Daily tokens above the line and GitHub contributions below when connected"
        }
      >
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line
              className="grid"
              x1={left}
              x2={width}
              y1={base - (base - 24) * f}
              y2={base - (base - 24) * f}
            />
            <text className="axis" x={left - 8} y={base - (base - 24) * f + 4} textAnchor="end">
              {cost ? dollars(max * f) : compact(max * f)}
            </text>
          </g>
        ))}
        <line className="base" x1={left} x2={width} y1={base} y2={base} />
        <text className="axis" x={left - 8} y={base + 4} textAnchor="end">
          0
        </text>
        {days.map((d, i) => {
          const bh = ((base - 24) * d.value) / max,
            g = github?.get(d.date) ?? 0;
          return (
            <g key={d.date}>
              <title>{`${dateLabel(d.date)}: ${cost ? dollars(d.value) : `${compact(d.value)} tokens`}${github ? ` · ${g} GitHub contributions` : ""}`}</title>
              {d.value > 0 && (
                <rect
                  className={`bar${i === peak ? " hot" : cost ? " dimbar" : ""}`}
                  x={left + i * slot}
                  y={base - Math.max(2, bh)}
                  width={bw}
                  height={Math.max(2, bh)}
                />
              )}
              {github && g > 0 && (
                <rect
                  className="gh"
                  x={left + i * slot}
                  y={base + 6}
                  width={bw}
                  height={((h - base - 30) * g) / ghMax}
                />
              )}
            </g>
          );
        })}
        {github && (
          <text className="axis" x={left - 8} y={h - 27} textAnchor="end">
            {ghMax}
          </text>
        )}
        {ticks.map((i, k) => (
          <text
            key={i}
            className="axis"
            x={left + i * slot}
            y={h - 3}
            textAnchor={k === 2 ? "end" : "start"}
          >
            {dateLabel(days[i]?.date ?? "2000-01-01").toUpperCase()}
          </text>
        ))}
      </svg>
    </div>
  );
}
