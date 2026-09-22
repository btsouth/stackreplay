"use client";

import type { ReplayViolationV1 } from "@stackreplay/schema";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimelinePoint } from "@/lib/worker-protocol";

/**
 * Replay timeline (M3 brief).
 *
 * Answers "when would this plan have failed?". It shows historical activity as
 * aggregate daily buckets and marks the windows that were exceeded. The data is
 * aggregate only: no event, session or project identity reaches the chart, so it
 * cannot leak private project information.
 *
 * Two things are kept honest here (benchmark findings F030 and F031):
 *
 * - not every exceeded window was refused. A rule that bills overage served the
 *   work and charged for it, so the bands are labelled and coloured by outcome
 *   instead of all being described as work the target did not serve;
 * - tokens from events whose total is unknown are a lower bound and are plotted
 *   as their own band, never added into the exact series.
 *
 * Loaded dynamically by the replay surface, because charting code is heavy and
 * the result must render fast without it.
 */

const numberFormat = new Intl.NumberFormat("en-US", { notation: "compact" });

interface ReplayTimelineProps {
  points: TimelinePoint[];
  violations: readonly ReplayViolationV1[];
  /** ISO day to centre the view on, when a violation is focused. */
  focusAt?: string | undefined;
}

export function ReplayTimeline({ points, violations, focusAt }: ReplayTimelineProps) {
  const data = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        day: point.at.slice(0, 10),
        label: new Date(point.at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      })),
    [points],
  );

  const refused = useMemo(
    () => violations.filter((violation) => violation.overageUnits === undefined),
    [violations],
  );
  const billed = useMemo(
    () => violations.filter((violation) => violation.overageUnits !== undefined),
    [violations],
  );
  const partialDays = useMemo(() => data.filter((entry) => entry.partialEvents > 0).length, [data]);

  const summary = useMemo(() => {
    if (data.length === 0) return "No activity in this workload.";
    const firstDay = data[0];
    if (firstDay === undefined) return "No activity in this workload.";
    const busiest = data.reduce(
      (best, entry) => (entry.events > best.events ? entry : best),
      firstDay,
    );
    return [
      `${data.length} day(s) of activity.`,
      `Busiest day ${busiest.label} with ${busiest.events.toLocaleString("en-US")} events.`,
      refused.length === 0
        ? ""
        : `${refused.length} window(s) exceeded and not served: ${refused
            .map((violation) => violation.startedAt.slice(0, 10))
            .join(", ")}.`,
      billed.length === 0
        ? ""
        : `${billed.length} window(s) exceeded and billed as overage: ${billed
            .map((violation) => violation.startedAt.slice(0, 10))
            .join(", ")}.`,
      refused.length === 0 && billed.length === 0 ? "No window exceeded." : "",
      partialDays === 0
        ? ""
        : `Token totals are a lower bound on ${partialDays} day(s): some events report no total.`,
    ]
      .filter((part) => part.length > 0)
      .join(" ");
  }, [billed, data, partialDays, refused]);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="timeline-empty">
        No activity to plot.
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-3" data-testid="replay-timeline">
      <figcaption className="text-xs text-muted-foreground" data-testid="timeline-caption">
        Historical activity per day.{" "}
        {refused.length === 0
          ? null
          : `${refused.length} shaded band(s) mark windows the target did not serve. `}
        {billed.length === 0
          ? null
          : `${billed.length} band(s) mark windows that exceeded the included allowance and were served and billed as overage. `}
        {refused.length === 0 && billed.length === 0
          ? "No window exceeded, so no band is shaded. "
          : null}
        {partialDays === 0
          ? null
          : `Token totals are a lower bound on ${partialDays} day(s): events that report no total are plotted separately.`}
      </figcaption>
      <div
        role="img"
        aria-label={`Replay timeline. ${summary}`}
        className="h-56 w-full"
        data-testid="timeline-chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              width={44}
              tickFormatter={(value: number) => numberFormat.format(value)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
            />
            <Area
              type="monotone"
              name="events"
              dataKey="events"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.16}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            {/*
              Exact and lower-bound tokens are separate series on purpose: one line
              that added them together presented a lower bound as an exact total
              (benchmark finding F031).
            */}
            <Area
              type="monotone"
              name="tokens (known total)"
              dataKey="tokens"
              stroke="var(--positive)"
              fill="var(--positive)"
              fillOpacity={0.12}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              name="tokens (lower bound)"
              dataKey="partialTokens"
              stroke="var(--warning)"
              fill="var(--warning)"
              fillOpacity={0.1}
              strokeDasharray="3 3"
              strokeWidth={1.25}
              isAnimationActive={false}
            />
            {violations.map((violation) => {
              const start = violation.startedAt.slice(0, 10);
              const end = violation.endedAt.slice(0, 10);
              const from = data.find((entry) => entry.day >= start)?.label ?? data[0]?.label;
              const to =
                [...data].reverse().find((entry) => entry.day <= end)?.label ?? data.at(-1)?.label;
              if (from === undefined || to === undefined) return null;
              // A window billed as overage was served and charged; one without
              // overage is work the target refused. Same band, different meaning.
              const billedWindow = violation.overageUnits !== undefined;
              const colour = billedWindow ? "var(--warning)" : "var(--negative)";
              return (
                <ReferenceArea
                  key={`${violation.constraintId}-${violation.startedAt}`}
                  x1={from}
                  x2={to}
                  fill={colour}
                  fillOpacity={0.12}
                  stroke={colour}
                  strokeOpacity={0.35}
                  strokeDasharray={billedWindow ? "4 2" : undefined}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
      {focusAt !== undefined ? (
        <p className="text-xs text-muted-foreground">
          Focused window starts {focusAt.slice(0, 10)}.
        </p>
      ) : null}
    </figure>
  );
}

export default ReplayTimeline;
