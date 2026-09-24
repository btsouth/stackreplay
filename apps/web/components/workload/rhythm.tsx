"use client";

import { useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import type { Measure, WorkloadProfile } from "@/lib/workload-profile";
import { count, hourBoundary, hourLabel, measureNoun, percent, weekdayShort } from "./format";
import { ShareBar } from "./section";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DAYS = Array.from({ length: 7 }, (_, day) => day);

function cellValue(value: number, measure: Measure): string {
  return measure === "events" ? `${count(value)} events` : `${formatTokens(value) ?? "0"} tokens`;
}

/**
 * When the work happens: one weekday × hour grid in a single hue, with the
 * hour and weekday totals as its margins. It answers both "what time" and
 * "which days" in one object instead of three charts of the same fact.
 */
export function WorkRhythm({ profile, measure }: { profile: WorkloadProfile; measure: Measure }) {
  const grid = measure === "events" ? profile.rhythm.events : profile.rhythm.tokens;
  const facts = measure === "events" ? profile.rhythm.byEvents : profile.rhythm.byTokens;
  const [hover, setHover] = useState<{ day: number; hour: number } | undefined>(undefined);
  const hours = HOURS.map((hour) => grid.reduce((sum, row) => sum + (row[hour] ?? 0), 0));
  const days = DAYS.map((day) => (grid[day] ?? []).reduce((sum, value) => sum + value, 0));
  const total = hours.reduce((sum, value) => sum + value, 0);
  const cellMax = Math.max(1, ...grid.flat());
  const hourMax = Math.max(1, ...hours);
  const dayMax = Math.max(1, ...days);
  const hovered = hover === undefined ? undefined : (grid[hover.day]?.[hover.hour] ?? 0);

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3" data-testid="rhythm-grid">
        <p
          className="min-h-5 font-mono text-xs tabular-nums text-muted-foreground"
          aria-hidden="true"
        >
          {hover === undefined || hovered === undefined ? (
            <>Hover a cell for its hour · times in {profile.timeZone}</>
          ) : (
            <>
              <span className="text-foreground">
                {weekdayShort(hover.day)} {hourLabel(hover.hour)} to {hourLabel(hover.hour + 1)}
              </span>{" "}
              · {cellValue(hovered, measure)} · {percent(total === 0 ? 0 : hovered / total)}
            </>
          )}
        </p>
        <div
          role="img"
          aria-label={`Recorded ${measureNoun(measure)} by weekday and hour in ${profile.timeZone}. Busiest hour ${facts.busiestHour === undefined ? "none" : hourLabel(facts.busiestHour)}; busiest weekday ${facts.busiestWeekday === undefined ? "none" : weekdayShort(facts.busiestWeekday)}.`}
          className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] gap-x-2 gap-y-1"
          onMouseLeave={() => setHover(undefined)}
          onMouseMove={(event) => {
            const cell = (event.target as HTMLElement).getAttribute("data-cell");
            if (cell === null) return;
            const [day, hour] = cell.split(":").map(Number);
            if (day !== undefined && hour !== undefined) setHover({ day, hour });
          }}
        >
          {DAYS.map((day) => (
            <div className="contents" key={day}>
              <span className="self-center font-mono text-[11px] text-muted-foreground">
                {weekdayShort(day)}
              </span>
              <div className="grid grid-cols-24 gap-px">
                {HOURS.map((hour) => {
                  const value = grid[day]?.[hour] ?? 0;
                  const intensity = value === 0 ? 0 : 12 + (value / cellMax) * 88;
                  return (
                    <div
                      key={hour}
                      className="aspect-square min-w-0 rounded-[2px] bg-surface-2"
                      data-cell={`${day}:${hour}`}
                      style={
                        value === 0
                          ? undefined
                          : {
                              background: `color-mix(in oklab, var(--accent) ${intensity.toFixed(0)}%, var(--surface-2))`,
                            }
                      }
                    />
                  );
                })}
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="h-1.5 flex-1 bg-surface-2">
                  <div
                    className="h-1.5 bg-border-strong"
                    style={{ width: `${((days[day] ?? 0) / dayMax) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          <span />
          <div className="grid h-8 grid-cols-24 items-end gap-px pt-1">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="w-full rounded-t-[1px] bg-border-strong"
                style={{
                  height: `${Math.max(hours[hour] === 0 ? 0 : 6, ((hours[hour] ?? 0) / hourMax) * 100)}%`,
                }}
              />
            ))}
          </div>
          <span />
          <span />
          <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span className="hidden sm:inline">11 PM</span>
          </div>
          <span />
        </div>
        <div
          className="flex items-center gap-2 text-[11px] text-muted-foreground"
          aria-hidden="true"
        >
          <span>less</span>
          {[0, 25, 50, 75, 100].map((step) => (
            <span
              key={step}
              className="inline-block h-2.5 w-2.5 rounded-[2px] bg-surface-2"
              style={
                step === 0
                  ? undefined
                  : {
                      background: `color-mix(in oklab, var(--accent) ${12 + step * 0.88}%, var(--surface-2))`,
                    }
              }
            />
          ))}
          <span>more {measureNoun(measure)} per hour</span>
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="min-h-11 cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
            Show hour and weekday totals as a table
          </summary>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <table className="w-full text-left font-mono tabular-nums">
              <caption className="sr-only">Recorded {measureNoun(measure)} by hour</caption>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} className="border-b border-border/60">
                    <th className="py-0.5 font-normal" scope="row">
                      {hourLabel(hour)}
                    </th>
                    <td className="py-0.5 text-right">{cellValue(hours[hour] ?? 0, measure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="w-full self-start text-left font-mono tabular-nums">
              <caption className="sr-only">Recorded {measureNoun(measure)} by weekday</caption>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="border-b border-border/60">
                    <th className="py-0.5 font-normal" scope="row">
                      {weekdayShort(day)}
                    </th>
                    <td className="py-0.5 text-right">{cellValue(days[day] ?? 0, measure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="flex min-w-0 flex-col gap-5" data-testid="rhythm-facts">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Busiest hour</dt>
            <dd className="font-mono text-lg tabular-nums">
              {facts.busiestHour === undefined ? "none" : hourLabel(facts.busiestHour)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Busiest weekday</dt>
            <dd className="font-mono text-lg tabular-nums">
              {facts.busiestWeekday === undefined ? "none" : weekdayShort(facts.busiestWeekday)}
            </dd>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Typical window</dt>
            <dd className="text-sm leading-snug">
              {facts.typicalWindow === undefined ? (
                "Not established"
              ) : facts.typicalWindow.startHour === facts.typicalWindow.endHour ? (
                "Activity spreads across the whole day"
              ) : (
                <>
                  <span className="font-mono tabular-nums">
                    {hourBoundary(facts.typicalWindow.startHour)} to{" "}
                    {hourBoundary(facts.typicalWindow.endHour)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    holds {percent(facts.typicalWindow.share)} of recorded {measureNoun(measure)}
                  </span>
                </>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Weekend share</dt>
            <dd className="font-mono text-lg tabular-nums">{percent(facts.weekendShare)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Active days</dt>
            <dd className="font-mono text-lg tabular-nums">
              {count(profile.overview.activeDays)}
              <span className="text-sm text-muted-foreground">
                {" "}
                of {count(profile.overview.spanDays)}
              </span>
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {facts.bands.map((band) => (
            <div
              key={band.id}
              className="grid grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-xs"
            >
              <span className="text-muted-foreground">{band.label}</span>
              <ShareBar
                share={band.share}
                emphasis={band.share === Math.max(...facts.bands.map((entry) => entry.share))}
              />
              <span className="text-right font-mono tabular-nums">{percent(band.share)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
