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
import {
  type BehaviourGroups,
  behaviourKind,
  type ExceedBehaviour,
  groupByBehaviour,
} from "@/components/instrument/constraint-behaviour";
import type { TimelinePoint } from "@/lib/worker-protocol";

/**
 * Replay timeline (M3 brief).
 *
 * Answers "when would this plan have failed?". It shows historical activity as
 * aggregate daily buckets and marks the windows that were exceeded. The data is
 * aggregate only: no event, session or project identity reaches the chart, so it
 * cannot leak private project information.
 *
 * Three things are kept honest here (benchmark findings F030, F031 and the M4D
 * projection audit):
 *
 * - not every exceeded window was refused. A rule that bills overage served the
 *   work and charged for it, one that latches blocked it until the window reset,
 *   and a record-only rule did neither. Bands are labelled and coloured by the
 *   rule's declared behaviour, never by the presence of an overage quantity: a
 *   record-only rule measures units above capacity without billing anything. A
 *   window whose rule this result does not carry says so, rather than borrowing
 *   record-only's meaning;
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
  /**
   * Each constraint's declared behaviour, keyed by constraint id. Billing is a
   * fact about the rule, so the chart reads it from the rule rather than
   * inferring it from a violation's own quantities.
   */
  behaviours: ReadonlyMap<string, ExceedBehaviour>;
  /** ISO day to centre the view on, when a violation is focused. */
  focusAt?: string | undefined;
}

export function ReplayTimeline({ points, violations, behaviours, focusAt }: ReplayTimelineProps) {
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

  /**
   * Each crossing belongs to its rule's declared behaviour, and a rule this
   * result does not carry belongs to none of them: it gets its own group
   * instead of being filed under record-only.
   */
  const groups: BehaviourGroups<ReplayViolationV1> = useMemo(
    () => groupByBehaviour(violations, (violation) => behaviours.get(violation.constraintId)),
    [behaviours, violations],
  );
  const behaviourOf = useMemo(
    () => (violation: ReplayViolationV1) => behaviours.get(violation.constraintId),
    [behaviours],
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
    const days = (entries: readonly ReplayViolationV1[]): string =>
      entries.map((violation) => violation.startedAt.slice(0, 10)).join(", ");
    return [
      `${data.length} day(s) of activity.`,
      `Busiest day ${busiest.label} with ${busiest.events.toLocaleString("en-US")} events.`,
      groups.refused.length === 0
        ? ""
        : `${groups.refused.length} window(s) the rules refused individual requests in: ${days(groups.refused)}.`,
      groups.latched.length === 0
        ? ""
        : `${groups.latched.length} window(s) the rules blocked until the window reset: ${days(groups.latched)}.`,
      groups.billed.length === 0
        ? ""
        : `${groups.billed.length} window(s) exceeded and billed at the rule's declared rate: ${days(groups.billed)}.`,
      violations.length === 0 ? "No window exceeded." : "",
      groups.recorded.length === 0
        ? ""
        : `${groups.recorded.length} window(s) exceeded without admitting or refusing anything: ${days(groups.recorded)}.`,
      groups.unestablished.length === 0
        ? ""
        : `${groups.unestablished.length} window(s) whose rule this result does not carry, so what the rule did is not established: ${days(groups.unestablished)}.`,
      partialDays === 0
        ? ""
        : `Token totals are a lower bound on ${partialDays} day(s): some events report no total.`,
    ]
      .filter((part) => part.length > 0)
      .join(" ");
  }, [data, groups, partialDays, violations.length]);

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
        {groups.billed.length === 0
          ? null
          : `${groups.billed.length} band(s) mark windows the rule served and billed above the included allowance. `}
        {groups.refused.length === 0
          ? null
          : `${groups.refused.length} band(s) mark windows the target refused individual requests in because they exceeded the constraint. `}
        {groups.latched.length === 0
          ? null
          : `${groups.latched.length} band(s) mark windows the target blocked until the window reset. `}
        {groups.recorded.length === 0
          ? null
          : `${groups.recorded.length} band(s) mark windows the target recorded without admitting or refusing anything. `}
        {groups.unestablished.length === 0
          ? null
          : `${groups.unestablished.length} band(s) mark windows whose rule this result does not carry: what the rule did with the demand is not established. `}
        {violations.length === 0 ? "No window exceeded, so no band is shaded. " : null}
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
              // The band's meaning comes from the rule's own behaviour: billed,
              // refused or blocked, recorded, or not established in this result.
              const behaviour = behaviourOf(violation);
              const kind = behaviourKind(behaviour);
              const colour =
                kind === "billed"
                  ? "var(--warning)"
                  : kind === "refused" || kind === "latched"
                    ? "var(--negative)"
                    : "var(--border-strong)";
              return (
                <ReferenceArea
                  key={`${violation.constraintId}-${violation.startedAt}`}
                  x1={from}
                  x2={to}
                  fill={colour}
                  fillOpacity={0.12}
                  stroke={colour}
                  strokeOpacity={0.35}
                  strokeDasharray={kind === "refused" || kind === "latched" ? undefined : "4 2"}
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
