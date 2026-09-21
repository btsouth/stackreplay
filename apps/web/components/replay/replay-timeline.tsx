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
 * aggregate daily buckets and marks the windows the target did not serve. The
 * data is aggregate only: no event, session or project identity reaches the
 * chart, so it cannot leak private project information.
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

  const summary = useMemo(() => {
    if (data.length === 0) return "No activity in this workload.";
    const busiest = data.reduce(
      (best, entry) => (entry.events > best.events ? entry : best),
      data[0]!,
    );
    const windows = violations.length;
    return [
      `${data.length} day(s) of activity.`,
      `Busiest day ${busiest.label} with ${busiest.events.toLocaleString("en-US")} events.`,
      windows === 0
        ? "No window exceeded."
        : `${windows} window(s) exceeded: ${violations
            .map((violation) => violation.startedAt.slice(0, 10))
            .join(", ")}.`,
    ].join(" ");
  }, [data, violations]);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="timeline-empty">
        No activity to plot.
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-3" data-testid="replay-timeline">
      <figcaption className="text-xs text-muted-foreground">
        Historical activity per day. Shaded bands mark windows the target did not serve.
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
            {violations.map((violation) => {
              const start = violation.startedAt.slice(0, 10);
              const end = violation.endedAt.slice(0, 10);
              const from = data.find((entry) => entry.day >= start)?.label ?? data[0]?.label;
              const to =
                [...data].reverse().find((entry) => entry.day <= end)?.label ?? data.at(-1)?.label;
              if (from === undefined || to === undefined) return null;
              return (
                <ReferenceArea
                  key={`${violation.constraintId}-${violation.startedAt}`}
                  x1={from}
                  x2={to}
                  fill="var(--negative)"
                  fillOpacity={0.12}
                  stroke="var(--negative)"
                  strokeOpacity={0.35}
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
