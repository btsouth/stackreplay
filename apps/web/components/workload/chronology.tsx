"use client";

import { useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import type { Measure } from "@/lib/workload-profile";
import { count, measureNoun, measureText, measureValue, plainDay } from "./format";

export interface ChronologyPoint {
  date: string;
  events: number;
  tokens: number;
}

/**
 * Recorded demand across the imported range: one bar per local day (or ISO
 * week for long histories), zero days kept as gaps so quiet stretches show.
 *
 * Signal Blue is reserved for the days that held the heaviest five-hour
 * windows; everything else is neutral. The median active day is a hairline,
 * so "normal" and "burst" can be told apart without a score.
 */
export function DemandChronology({
  points,
  measure,
  unit,
  highlighted,
  median,
  compact = false,
  testId,
  label,
}: {
  points: readonly ChronologyPoint[];
  measure: Measure;
  unit: "day" | "week";
  /** Dates to mark in Signal Blue, with the reason shown in the legend. */
  highlighted?: { dates: ReadonlySet<string>; legend: string } | undefined;
  median?: number | undefined;
  compact?: boolean;
  testId?: string;
  label: string;
}) {
  const [hover, setHover] = useState<number | undefined>(undefined);
  const values = points.map((point) => measureValue(point, measure));
  const max = Math.max(1, ...values);
  const peakIndex = values.indexOf(Math.max(...values));
  const shown = hover ?? peakIndex;
  const focus = points[shown];
  const height = compact ? "h-16" : "h-40 sm:h-48";
  const active = values.filter((value) => value > 0).length;
  const summary = `${label}: ${count(points.length)} ${unit === "day" ? "days" : "weeks"}, ${count(active)} with activity. Highest ${unit}: ${focus === undefined || points[peakIndex] === undefined ? "none" : `${plainDay(points[peakIndex].date)} with ${measureText(points[peakIndex], measure)}`}.`;

  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid={testId}>
      {compact ? null : (
        <p
          className="min-h-5 font-mono text-xs tabular-nums text-muted-foreground"
          aria-hidden="true"
        >
          {focus === undefined ? (
            "No activity"
          ) : (
            <>
              <span className="text-foreground">
                {unit === "week" ? "Week of " : ""}
                {plainDay(focus.date, true)}
              </span>{" "}
              · {count(focus.events)} events · {formatTokens(focus.tokens) ?? "0"} known tokens
              {hover === undefined ? ` · highest ${unit}` : ""}
            </>
          )}
        </p>
      )}
      <div className={`relative ${height}`}>
        <div
          role="img"
          aria-label={summary}
          className="absolute inset-0 flex items-end gap-px sm:gap-[2px]"
          onMouseLeave={() => setHover(undefined)}
          onMouseMove={(event) => {
            const index = Number(
              (event.target as HTMLElement).closest("[data-index]")?.getAttribute("data-index"),
            );
            setHover(Number.isInteger(index) ? index : undefined);
          }}
        >
          {points.map((point, index) => {
            const value = values[index] ?? 0;
            const isMarked = highlighted?.dates.has(point.date) === true;
            return (
              <div
                key={point.date}
                className="flex h-full min-w-0 flex-1 items-end"
                data-index={index}
                title={
                  compact ? `${plainDay(point.date)} · ${measureText(point, measure)}` : undefined
                }
              >
                {value === 0 ? (
                  <div className="h-px w-full bg-border" />
                ) : (
                  <div
                    className={`w-full rounded-t-[2px] ${
                      isMarked
                        ? "bg-accent"
                        : hover === index
                          ? "bg-foreground/60"
                          : "bg-border-strong"
                    }`}
                    style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {median !== undefined && median > 0 && !compact ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t border-foreground/40"
            style={{ bottom: `${(median / max) * 100}%` }}
          ></div>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground"
      >
        <span>{points[0] === undefined ? "" : plainDay(points[0].date)}</span>
        {points.length > 6 ? (
          <span>{plainDay(points[Math.floor(points.length / 2)]?.date ?? "")}</span>
        ) : null}
        <span>{points.at(-1) === undefined ? "" : plainDay(points.at(-1)?.date ?? "")}</span>
      </div>
      {compact ? null : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-[2px] bg-border-strong"
            />
            {measureNoun(measure)} per {unit}
          </span>
          {median === undefined || median <= 0 ? null : (
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-px w-4 bg-foreground/60" />
              median active {unit}:{" "}
              {measure === "events"
                ? count(Math.round(median))
                : (formatTokens(Math.round(median)) ?? "0")}
            </span>
          )}
          {highlighted === undefined ? null : (
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-[2px] bg-accent"
              />
              {highlighted.legend}
            </span>
          )}
        </div>
      )}
      {compact ? null : (
        <details className="text-xs text-muted-foreground">
          <summary className="min-h-11 cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
            Show {unit === "day" ? "daily" : "weekly"} values as a table
          </summary>
          <div className="mt-2 max-h-72 overflow-y-auto">
            <table className="w-full text-left font-mono tabular-nums">
              <caption className="sr-only">{label}</caption>
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 font-normal" scope="col">
                    {unit === "day" ? "Date" : "Week of"}
                  </th>
                  <th className="py-1.5 text-right font-normal" scope="col">
                    Events
                  </th>
                  <th className="py-1.5 text-right font-normal" scope="col">
                    Known tokens
                  </th>
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.date} className="border-b border-border/60">
                    <th className="py-1 font-normal" scope="row">
                      {plainDay(point.date, true)}
                    </th>
                    <td className="py-1 text-right">{count(point.events)}</td>
                    <td className="py-1 text-right">{count(point.tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
