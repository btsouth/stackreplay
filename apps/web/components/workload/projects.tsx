"use client";

import { useMemo, useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import type { Measure, ProjectProfile, WorkloadProfile } from "@/lib/workload-profile";
import { DemandChronology } from "./chronology";
import { CompositionBar, totalOf } from "./composition";
import {
  count,
  measureNoun,
  measureValue,
  percent,
  plainRange,
  spanText,
  windowText,
} from "./format";
import { WindowDetail } from "./pressure";
import { ShareBar } from "./section";

const INITIAL_ROWS = 8;

function dateOf(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(ms));
}

/**
 * Projects, named with this browser's local labels. A workload loaded from a
 * portable export carries hashes only, so its projects are numbered instead of
 * named, and the section says why.
 */
export function ProjectLedger({
  profile,
  measure,
}: {
  profile: WorkloadProfile;
  measure: Measure;
}) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const ranked = useMemo(
    () =>
      [...profile.projects].sort(
        (a, b) => measureValue(b, measure) - measureValue(a, measure) || b.events - a.events,
      ),
    [profile.projects, measure],
  );
  const visible = showAll ? ranked : ranked.slice(0, INITIAL_ROWS);
  const whole = measure === "events" ? profile.overview.events : profile.overview.knownTokens;
  const top = measureValue(ranked[0] ?? { events: 0, tokens: 0 }, measure);
  const selectedProject = ranked.find((project) => project.key === selected);
  const anonymous = profile.projects.some((project) => project.labelKind === "anonymous");

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {anonymous ? (
        <p
          className="max-w-prose text-xs leading-relaxed text-muted-foreground"
          data-testid="projects-anonymous-note"
        >
          Some projects are numbered rather than named. Names exist only for workloads scanned in
          this browser; a portable export carries salted project hashes, never folder names.
        </p>
      ) : null}
      <div className="min-w-0">
        <table className="w-full text-sm" data-testid="project-table">
          <caption className="sr-only">Projects ranked by {measureNoun(measure)}</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-normal" scope="col">
                Project
              </th>
              <th className="hidden py-2 pr-3 text-right font-normal sm:table-cell" scope="col">
                Events
              </th>
              <th className="hidden py-2 pr-3 text-right font-normal md:table-cell" scope="col">
                Sessions
              </th>
              <th className="py-2 pr-3 text-right font-normal" scope="col">
                {measure === "events" ? "Share" : "Known tokens"}
              </th>
              <th className="hidden py-2 font-normal lg:table-cell" scope="col">
                Primary model
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((project) => {
              const value = measureValue(project, measure);
              const isSelected = project.key === selected;
              return (
                <tr
                  key={project.key}
                  className={`border-b border-border align-top ${isSelected ? "bg-surface-2" : ""}`}
                  data-testid="project-row"
                >
                  <th className="py-2.5 pr-3 text-left font-normal" scope="row">
                    <button
                      type="button"
                      aria-expanded={isSelected}
                      aria-controls="project-drilldown"
                      className={`flex min-h-11 w-full min-w-0 flex-col items-start gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0 ${isSelected ? "text-accent" : "text-foreground hover:text-accent"}`}
                      onClick={() => setSelected(isSelected ? undefined : project.key)}
                    >
                      <span className="max-w-full truncate [overflow-wrap:anywhere]">
                        {project.label}
                      </span>
                      <ShareBar
                        share={top === 0 ? 0 : value / top}
                        emphasis={isSelected}
                        className="max-w-56"
                      />
                    </button>
                  </th>
                  <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums sm:table-cell">
                    {count(project.events)}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-right font-mono tabular-nums md:table-cell">
                    {count(project.sessions)}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                    {measure === "events"
                      ? percent(whole === 0 ? 0 : value / whole)
                      : formatTokens(project.tokens)}
                    <span className="block text-[11px] text-muted-foreground">
                      {measure === "events"
                        ? `${count(project.events)} events`
                        : percent(whole === 0 ? 0 : value / whole)}
                    </span>
                  </td>
                  <td className="hidden py-2.5 text-xs text-muted-foreground lg:table-cell">
                    {project.models[0]?.label ?? "unknown"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ranked.length > INITIAL_ROWS ? (
        <button
          type="button"
          className="min-h-11 self-start text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => setShowAll((value) => !value)}
          data-testid="projects-show-all"
        >
          {showAll ? "Show the top projects" : `View all ${count(ranked.length)} projects`}
        </button>
      ) : null}
      {selectedProject === undefined ? null : (
        <ProjectDrilldown
          measure={measure}
          onClose={() => setSelected(undefined)}
          profile={profile}
          project={selectedProject}
        />
      )}
    </div>
  );
}

function ProjectDrilldown({
  project,
  profile,
  measure,
  onClose,
}: {
  project: ProjectProfile;
  profile: WorkloadProfile;
  measure: Measure;
  onClose: () => void;
}) {
  const { timeZone } = profile;
  const byDate = new Map(project.daily.map((day) => [day.date, day]));
  const points =
    profile.chronology.unit === "day"
      ? profile.chronology.points.map((point) => ({
          date: point.date,
          events: byDate.get(point.date)?.events ?? 0,
          tokens: byDate.get(point.date)?.tokens ?? 0,
        }))
      : [];
  const whole = measure === "events" ? profile.overview.events : profile.overview.knownTokens;
  const known = totalOf(project.buckets);
  const peak = measure === "events" ? project.peak5hByEvents : project.peak5hByTokens;
  const session = project.heaviestSession;
  return (
    <section
      id="project-drilldown"
      aria-label={`${project.label} workload`}
      className="flex min-w-0 flex-col gap-6 border border-border bg-surface px-4 py-5 sm:px-6"
      data-testid="project-drilldown"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            Project workload · local name
          </p>
          <h3 className="mt-1 text-lg font-medium [overflow-wrap:anywhere]">{project.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {plainRange(dateOf(project.firstMs, timeZone), dateOf(project.lastMs, timeZone))} ·{" "}
            {count(project.activeDays)} active {project.activeDays === 1 ? "day" : "days"} ·{" "}
            {percent(whole === 0 ? 0 : measureValue(project, measure) / whole)} of all{" "}
            {measureNoun(measure)}
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={onClose}
        >
          Close project
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Events</dt>
          <dd className="font-mono text-xl tabular-nums">{count(project.events)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Sessions</dt>
          <dd className="font-mono text-xl tabular-nums">{count(project.sessions)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Known tokens</dt>
          <dd className="font-mono text-xl tabular-nums" title={`${count(project.tokens)} tokens`}>
            {formatTokens(project.tokens) ?? "0"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cache reads</dt>
          <dd className="font-mono text-xl tabular-nums">
            {percent(known === 0 ? 0 : project.buckets.cacheRead / known)}
          </dd>
        </div>
      </dl>
      {points.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {measureNoun(measure)} per day, across the whole workload&apos;s range
          </p>
          <DemandChronology
            compact
            label={`${project.label} activity`}
            measure={measure}
            points={points}
            unit="day"
          />
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Model mix</p>
          <ul className="flex flex-col gap-2">
            {project.models.slice(0, 5).map((model) => (
              <li key={model.key} className="flex flex-col gap-1 text-xs">
                <span className="flex justify-between gap-3">
                  <span className="truncate">{model.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {count(model.events)} events ·{" "}
                    {percent(project.events === 0 ? 0 : model.events / project.events)}
                  </span>
                </span>
                <ShareBar share={project.events === 0 ? 0 : model.events / project.events} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Token composition</p>
          <CompositionBar buckets={project.buckets} size="sm" />
          <p className="text-xs text-muted-foreground">
            Fresh input {formatTokens(project.buckets.uncachedInput) ?? "0"} · cache read{" "}
            {formatTokens(project.buckets.cacheRead) ?? "0"} · output{" "}
            {formatTokens(project.buckets.output) ?? "0"}
          </p>
          {session === undefined ? null : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Heaviest session:{" "}
              <span className="text-foreground">
                {count(session.events)} events · {formatTokens(session.tokens)} tokens
              </span>{" "}
              · {session.primaryModel ?? "unknown model"} · started{" "}
              {windowText(session.firstMs, session.firstMs + 60_000, timeZone).split(" to ")[0]} ·{" "}
              {spanText(session.observedSpanMs)} between first and last event
            </p>
          )}
        </div>
      </div>
      {peak === undefined ? null : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            This project&apos;s heaviest five-hour window
          </p>
          <WindowDetail measure={measure} timeZone={timeZone} window={peak} />
        </div>
      )}
    </section>
  );
}
