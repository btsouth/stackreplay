"use client";

import { useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import type { Measure, WindowFact, WorkloadProfile } from "@/lib/workload-profile";
import { CompositionBar } from "./composition";
import { count, measureNoun, measureValue, percent, plainDay, ratio, windowText } from "./format";
import { ShareBar } from "./section";

/**
 * What one window of recorded demand contained: projects, models, sessions and
 * token composition. Used for peak windows here and for limit crossings in a
 * Replay result, so both answer "what was I doing then" the same way.
 */
export function WindowDetail({
  window,
  timeZone,
  measure,
  testId,
}: {
  window: WindowFact;
  timeZone: string;
  measure: Measure;
  testId?: string;
}) {
  const projectMax = Math.max(1, ...window.projects.map((entry) => measureValue(entry, measure)));
  const modelMax = Math.max(1, ...window.models.map((entry) => measureValue(entry, measure)));
  return (
    <div
      className="grid min-w-0 gap-6 border-l-2 border-accent bg-surface-2/60 px-4 py-4 sm:px-5 lg:grid-cols-3"
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p className="font-mono text-xs tabular-nums text-foreground">
          {windowText(window.startMs, window.endMs, timeZone)}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-muted-foreground">Events</dt>
          <dd className="text-right font-mono tabular-nums">{count(window.events)}</dd>
          <dt className="text-muted-foreground">Known tokens</dt>
          <dd
            className="text-right font-mono tabular-nums"
            title={`${count(window.tokens)} tokens`}
          >
            {formatTokens(window.tokens) ?? "0"}
          </dd>
          <dt className="text-muted-foreground">Sessions</dt>
          <dd className="text-right font-mono tabular-nums">{count(window.sessions)}</dd>
          {window.unknownUsageEvents > 0 ? (
            <>
              <dt className="text-muted-foreground">Usage unknown</dt>
              <dd className="text-right font-mono tabular-nums text-warning">
                {count(window.unknownUsageEvents)} events
              </dd>
            </>
          ) : null}
        </dl>
        <CompositionBar buckets={window.buckets} size="sm" />
        <p className="text-[11px] text-muted-foreground">
          Cache reads {percent(window.tokens === 0 ? 0 : window.buckets.cacheRead / window.tokens)}{" "}
          of this window&apos;s known tokens
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs text-muted-foreground">Projects in this window</p>
        <ul className="flex flex-col gap-2">
          {window.projects.map((project) => (
            <li key={project.key} className="flex min-w-0 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">{project.label}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {measure === "events" ? count(project.events) : formatTokens(project.tokens)}
                </span>
              </span>
              <ShareBar share={measureValue(project, measure) / projectMax} />
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs text-muted-foreground">Models in this window</p>
        <ul className="flex flex-col gap-2">
          {window.models.map((model) => (
            <li key={model.key} className="flex min-w-0 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">{model.label}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  {measure === "events" ? count(model.events) : formatTokens(model.tokens)}
                </span>
              </span>
              <ShareBar share={measureValue(model, measure) / modelMax} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Calendar windows read as dates; rolling windows as their exact span. */
function pressureWhen(id: string, startMs: number, endMs: number, timeZone: string): string {
  const day = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(ms));
  if (id === "day") return plainDay(day(startMs));
  if (id === "week") return `${plainDay(day(startMs))} to ${plainDay(day(endMs - 1))}`;
  return windowText(startMs, endMs, timeZone);
}

/**
 * Historical pressure: the heaviest windows the recorded chronology contains.
 * Rolling windows are the ones Replay applies to rolling limits, so these are
 * the peaks a plan would actually have met.
 */
export function HistoricalPressure({
  profile,
  measure,
}: {
  profile: WorkloadProfile;
  measure: Measure;
}) {
  const rows = profile.pressure[measure];
  const [open, setOpen] = useState<string | undefined>(undefined);
  const windows = profile.topWindows[measure];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <table className="w-full text-sm" data-testid="pressure-table">
        <caption className="sr-only">Peak recorded {measureNoun(measure)} by window length</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-normal" scope="col">
              Window
            </th>
            <th className="py-2 pr-3 text-right font-normal" scope="col">
              Peak {measureNoun(measure)}
            </th>
            <th className="hidden py-2 pr-3 font-normal md:table-cell" scope="col">
              When
            </th>
            <th className="hidden py-2 pr-3 text-right font-normal sm:table-cell" scope="col">
              Share of all
            </th>
            <th className="hidden py-2 pr-3 text-right font-normal lg:table-cell" scope="col">
              Peak vs. median active window
            </th>
            <th className="py-2 text-right font-normal" scope="col">
              Detail
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const peak = row.peak;
            const expanded = open === row.id;
            const when =
              peak === undefined
                ? ""
                : pressureWhen(row.id, peak.startMs, peak.endMs, profile.timeZone);
            const multiple =
              peak === undefined ? undefined : ratio(measureValue(peak, measure), row.median);
            return (
              <tr
                key={row.id}
                className="border-b border-border align-top"
                data-testid={`pressure-${row.id}`}
              >
                <th className="py-3 pr-3 text-left font-normal" scope="row">
                  <span className="flex flex-col gap-0.5">
                    <span>{row.label}</span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground md:hidden">
                      {when}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {count(row.windowCount)} {row.windowCount === 1 ? "window" : "windows"} with
                      activity
                      {multiple === undefined ? (
                        ""
                      ) : (
                        <span className="lg:hidden"> · peak {multiple} the median</span>
                      )}
                    </span>
                  </span>
                </th>
                <td className="py-3 pr-3 text-right font-mono text-base tabular-nums">
                  {peak === undefined
                    ? "none"
                    : measure === "events"
                      ? count(peak.events)
                      : formatTokens(peak.tokens)}
                  {peak === undefined ? null : (
                    <span className="block text-[11px] text-muted-foreground">
                      {measure === "events"
                        ? `${formatTokens(peak.tokens) ?? "0"} tokens`
                        : `${count(peak.events)} events`}
                      <span className="sm:hidden"> · {percent(peak.share)}</span>
                    </span>
                  )}
                </td>
                <td className="hidden py-3 pr-3 font-mono text-xs tabular-nums text-muted-foreground md:table-cell">
                  {when}
                </td>
                <td className="hidden py-3 pr-3 text-right font-mono tabular-nums sm:table-cell">
                  {peak === undefined ? "" : percent(peak.share)}
                </td>
                <td className="hidden py-3 pr-3 text-right font-mono tabular-nums text-muted-foreground lg:table-cell">
                  {multiple ?? ""}
                </td>
                <td className="py-3 text-right">
                  {peak === undefined ? null : (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`pressure-detail-${row.id}`}
                      aria-label={`${expanded ? "Close" : "Inspect"} ${row.label.toLowerCase()}`}
                      className="min-h-11 text-xs text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0"
                      onClick={() => setOpen(expanded ? undefined : row.id)}
                      data-testid={`inspect-${row.id}`}
                    >
                      {expanded ? "Close" : "Inspect"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.map((row) =>
        open === row.id && row.peak !== undefined ? (
          <div id={`pressure-detail-${row.id}`} key={row.id}>
            <WindowDetail
              measure={measure}
              testId="pressure-window-detail"
              timeZone={profile.timeZone}
              window={row.peak}
            />
          </div>
        ) : null,
      )}
      {windows.length > 1 ? (
        <div className="flex min-w-0 flex-col gap-3" data-testid="top-windows">
          <p className="text-xs text-muted-foreground">
            Heaviest five-hour windows, by {measureNoun(measure)}
          </p>
          <ol className="flex flex-col">
            {windows.map((window, index) => (
              <li
                key={window.startMs}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_5rem] items-center gap-3 border-b border-border py-2 text-xs sm:grid-cols-[1.5rem_16rem_minmax(0,1fr)_5rem]"
              >
                <span className="font-mono text-muted-foreground">{index + 1}</span>
                <span className="font-mono tabular-nums">
                  {windowText(window.startMs, window.endMs, profile.timeZone)}
                </span>
                <span className="hidden sm:block">
                  <ShareBar
                    share={window.share / (windows[0]?.share || 1)}
                    emphasis={index === 0}
                  />
                </span>
                <span className="text-right font-mono tabular-nums">{percent(window.share)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
