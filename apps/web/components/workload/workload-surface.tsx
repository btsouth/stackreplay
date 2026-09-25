"use client";

import { shareText } from "@stackreplay/share";
import { buttonVariants } from "@stackreplay/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import { MicroLabel } from "@/components/instrument/primitives";
import { SharePanelV2 } from "@/components/share/share-panel-v2";
import { coverageShare, type SuggestedRoute, suggestRoutes, workloadSlices } from "@/lib/routes";
import { defaultRulesDate } from "@/lib/rules-date";
import { type ShareOptions, workloadShareV2 } from "@/lib/share-v2";
import { localDayOf } from "@/lib/timeline";
import { loadWorkloadProfile } from "@/lib/use-workload-profile";
import { describeWorkerFailure, getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord, SafeError } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import type { Measure, WorkloadProfile } from "@/lib/workload-profile";
import { DemandChronology } from "./chronology";
import { CompositionLedger } from "./composition";
import { PartialScanNotice, ScanEvidence } from "./evidence";
import { count, percent, plainDay, plainRange } from "./format";
import { ModelMix } from "./models";
import { HistoricalPressure } from "./pressure";
import { ProjectLedger } from "./projects";
import { WorkRhythm } from "./rhythm";
import { ACTION_LINK, WorkloadSection } from "./section";
import { SessionShape } from "./sessions";
import { CurrentSpend, InsightList, ToolSplit, WorkloadValueFigure } from "./value";

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function segmented(active: boolean): string {
  return [
    "min-h-11 border px-3 text-xs sm:min-h-8",
    active
      ? "border-accent bg-surface-2 text-foreground"
      : "border-control-border text-muted-foreground hover:text-foreground",
  ].join(" ");
}

/**
 * Replay links carry an opaque local id, catalog ids and recording-tool ids
 * only, never workload content.
 */
export function replayLink(
  importId: string,
  options: {
    plan?: string | undefined;
    api?: string | undefined;
    scope?: readonly string[] | undefined;
  } = {},
): string {
  const params = new URLSearchParams({ import: importId });
  if (options.plan !== undefined) params.set("target", options.plan);
  if (options.api !== undefined) params.set("api", options.api);
  if (options.scope !== undefined && options.scope.length > 0)
    params.set("scope", options.scope.join(","));
  return `/app/replay?${params.toString()}`;
}

/** The replay a suggested route opens. */
function routeLink(importId: string, route: SuggestedRoute): string {
  return replayLink(importId, {
    ...(route.target.kind === "api" ? { api: route.target.id } : { plan: route.target.id }),
    scope: route.slice.sources,
  });
}

/** Words for a suggested route: what it runs against, and what it can answer. */
function routeCopy(route: SuggestedRoute): { kind: string; title: string; body: string } {
  const whole = route.slice.sources.length === 0;
  const name = route.target.name;
  const share = shareText(coverageShare(route.target));
  const yourCalls = whole ? "your calls" : `your ${route.slice.label} calls`;
  if (route.id === "api-value")
    return {
      kind: "Published API rates",
      title: whole ? `Same models, ${name}` : `Your ${route.slice.label} work, ${name}`,
      body: `What ${whole ? "this workload" : `your ${count(route.slice.events)} ${route.slice.label} calls`} would cost at the provider's published list prices. Not what you paid.`,
    };
  if (route.id === "numeric-limits")
    return {
      kind: "Numeric limits",
      title: whole ? `Where ${name} would run out` : `Your ${route.slice.label} work on ${name}`,
      body: `It runs ${share} of ${yourCalls} and publishes its allowance, so Replay can show whether and when it would have run out.`,
    };
  return {
    kind: "Translated replay",
    title: route.target.runnable > 0 ? `Put everything on ${name}` : `Move to ${name}`,
    body:
      route.target.runnable > 0
        ? `It runs ${share} of your calls as they are; you choose which of its models take the rest.`
        : "It runs none of these models as they are; you choose which of its models take your calls.",
  };
}

/**
 * The workload page: SCAN → UNDERSTAND. What the recorded history says on its
 * own, before any target is chosen. Replay is the second question, offered at
 * the end and from the sections that naturally raise it.
 */
export function WorkloadSurface({ initialImportId }: { initialImportId?: string | undefined }) {
  const client = getWorkerClient();
  const [imports, setImports] = useState<ImportRecord[] | undefined>(undefined);
  const [importsError, setImportsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialImportId);
  const [localZone, setLocalZone] = useState(() =>
    typeof window === "undefined" ? "UTC" : browserTimeZone(),
  );
  const [useUtc, setUseUtc] = useState(false);
  const [profile, setProfile] = useState<WorkloadProfile | undefined>(undefined);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  const [measure, setMeasure] = useState<Measure>("events");

  useEffect(() => setLocalZone(browserTimeZone()), []);
  useEffect(() => {
    if (initialImportId !== undefined) setSelectedId(initialImportId);
  }, [initialImportId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await client.listImports();
        if (cancelled) return;
        setImports(list);
        setSelectedId((current) => current ?? list[0]?.id);
      } catch {
        if (!cancelled) setImportsError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const record = useMemo(
    () => imports?.find((entry) => entry.id === selectedId),
    [imports, selectedId],
  );
  const timeZone = useUtc ? "UTC" : localZone;

  const analyze = useCallback(async (importId: string, zone: string, cancelled: () => boolean) => {
    setError(undefined);
    try {
      const next = await loadWorkloadProfile(importId, zone);
      if (!cancelled()) setProfile(next);
    } catch (failure) {
      if (failure instanceof SupersededError || cancelled()) return;
      setError(describeWorkerFailure(failure));
    }
  }, []);

  useEffect(() => {
    if (record === undefined) return;
    let cancelled = false;
    setProfile((current) => (current?.timeZone === timeZone ? current : undefined));
    void analyze(record.id, timeZone, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [analyze, record, timeZone]);

  if (importsError)
    return (
      <div role="alert" className="border-l-2 border-warning pl-4 text-sm">
        Local workloads could not be read from this browser. Reload to try again.
      </div>
    );

  if (imports === undefined)
    return (
      <div
        className="flex max-w-2xl flex-col gap-3 border-t border-border pt-6"
        role="status"
        data-testid="workload-restoring"
      >
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Opening your workload
        </p>
        <h1 className="text-2xl font-medium">Restoring your recorded work</h1>
        <p className="text-sm text-muted-foreground">
          Looking up the workload saved in this browser…
        </p>
      </div>
    );

  if (imports.length === 0 || (record === undefined && selectedId === undefined))
    return (
      <div className="flex max-w-2xl flex-col gap-4" data-testid="workload-empty">
        <h1 className="text-2xl font-medium tracking-tight">Workload</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No workload in this browser yet. Scan your Claude Code or Codex history, or load a demo
          workload, to see how you actually use AI: when you work, your heaviest windows, which
          projects and models carry the demand, and where the tokens go. Everything is read in this
          browser; nothing in your history leaves it.
        </p>
        <Link href="/app/import" className={`${buttonVariants({ size: "sm" })} self-start`}>
          Scan your AI history
        </Link>
      </div>
    );

  if (record === undefined)
    return (
      <div
        role="alert"
        className="flex max-w-2xl flex-col gap-3 border-l-2 border-warning pl-4"
        data-testid="workload-missing"
      >
        <h2 className="text-sm font-medium text-warning">
          That workload is no longer stored in this browser
        </h2>
        <p className="text-sm text-muted-foreground">
          A scan that was not saved on this browser is kept only until the page reloads, and a saved
          one may have been deleted. Choose a stored workload, or scan again.
        </p>
        <WorkloadPicker imports={imports} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    );

  return (
    <div className="flex min-w-0 flex-col gap-12" data-testid="workload-surface">
      <WorkloadOpening
        record={record}
        profile={profile}
        imports={imports}
        onSelect={setSelectedId}
      />
      {error !== undefined ? (
        <div role="alert" className="border-l-2 border-negative pl-4" data-testid="workload-error">
          <p className="text-sm font-medium text-negative">{error.title}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : null}
      {profile === undefined ? (
        error === undefined ? (
          <div
            className="flex flex-col gap-3 border-t border-border pt-4"
            role="status"
            data-testid="workload-analyzing"
          >
            <p className="text-sm text-muted-foreground">
              Restoring {count(record.eventCount)} recorded calls and analyzing their chronology,
              projects and sessions in this browser…
            </p>
          </div>
        ) : null
      ) : (
        <WorkloadBody
          measure={measure}
          onMeasure={setMeasure}
          onUtc={setUseUtc}
          profile={profile}
          record={record}
          useUtc={useUtc}
          localZone={localZone}
        />
      )}
    </div>
  );
}

/** A stored workload named by what it holds, not by how many files were selected. */
function recordedRange(entry: ImportRecord): string {
  const first = entry.summary.firstEventAt;
  const last = entry.summary.lastEventAt;
  if (first === undefined || last === undefined) return "no recorded dates";
  const day = localDayOf(browserTimeZone());
  return plainRange(day(first), day(last));
}

function workloadName(entry: ImportRecord): string {
  const sources = entry.summary.usageSources.map((source) => source.name).join(" + ");
  const range =
    entry.summary.firstEventAt === undefined || entry.summary.lastEventAt === undefined
      ? ""
      : ` · ${recordedRange(entry)}`;
  return `${sources.length > 0 ? sources : entry.label} · ${count(entry.eventCount)} calls${range}`;
}

function WorkloadPicker({
  imports,
  selectedId,
  onSelect,
}: {
  imports: ImportRecord[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (imports.length < 2 && selectedId !== undefined && imports[0]?.id === selectedId) return null;
  return (
    <label className="flex w-full min-w-0 max-w-xs flex-col gap-1 text-xs text-muted-foreground">
      Stored workload
      <select
        value={selectedId ?? ""}
        data-testid="workload-picker"
        onChange={(event) => onSelect(event.target.value)}
        className="block w-full min-w-0 rounded-md border border-control-border bg-surface px-2 py-1.5 text-sm text-foreground"
      >
        {selectedId !== undefined && !imports.some((entry) => entry.id === selectedId) ? (
          <option value={selectedId}>Choose a workload</option>
        ) : null}
        {imports.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {workloadName(entry)}
          </option>
        ))}
      </select>
    </label>
  );
}

function WorkloadOpening({
  record,
  profile,
  imports,
  onSelect,
}: {
  record: ImportRecord;
  profile: WorkloadProfile | undefined;
  imports: ImportRecord[];
  onSelect: (id: string) => void;
}) {
  const { summary } = record;
  const sources =
    summary.usageSources.map((source) => source.name).join(" + ") || "Portable workload";
  const origin =
    record.intake !== undefined
      ? "local scan"
      : record.label.startsWith("Demo:")
        ? "synthetic demo"
        : "portable workload file";
  const overview = profile?.overview;
  const figures: { label: string; value: string; title?: string; testId: string }[] = [
    { label: "calls", value: count(summary.eventCount), testId: "opening-events" },
    {
      label: "sessions",
      value: summary.sessionCount === 0 ? "n/a" : count(summary.sessionCount),
      testId: "opening-sessions",
    },
    {
      label: "projects",
      value: summary.projectCount === 0 ? "n/a" : count(summary.projectCount),
      testId: "opening-projects",
    },
    {
      label: "known tokens",
      value: formatTokens(summary.tokens.known) ?? "0",
      title: `${count(summary.tokens.known)} known tokens processed`,
      testId: "opening-tokens",
    },
  ];
  return (
    <header className="flex min-w-0 flex-col gap-7" data-testid="workload-opening">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <MicroLabel className="text-accent">
            {origin === "synthetic demo" ? "Synthetic demo workload" : "Your workload"}
          </MicroLabel>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            How you actually use AI
          </h1>
        </div>
        <WorkloadPicker imports={imports} selectedId={record.id} onSelect={onSelect} />
      </div>
      <div className="grid min-w-0 gap-8 border-t border-border pt-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-3">
          <MicroLabel>What this work is worth</MicroLabel>
          {profile?.value === undefined ? (
            <p className="text-sm text-muted-foreground" role="status" data-testid="value-pending">
              Pricing each maker&apos;s calls at its own published API rates, in this browser…
            </p>
          ) : (
            <WorkloadValueFigure value={profile.value} />
          )}
          {profile === undefined ? null : (
            <a
              className={`${ACTION_LINK} self-start`}
              data-testid="share-workload-link"
              href="#share"
            >
              Share this workload →
            </a>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <ToolSplit sources={summary.usageSources} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4">
            {figures.map((figure) => (
              <div
                key={figure.label}
                className="flex min-w-0 flex-col gap-0.5"
                data-testid={figure.testId}
              >
                <dd
                  className="order-1 font-sans text-2xl font-semibold leading-none tracking-tight tabular-nums"
                  title={figure.title}
                >
                  {figure.value}
                </dd>
                <dt className="order-2 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  {figure.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {profile === undefined || profile.insights.length === 0 ? null : (
        <section aria-labelledby="insights-heading" className="flex min-w-0 flex-col gap-3">
          <h2
            id="insights-heading"
            className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase"
          >
            What stands out
          </h2>
          <InsightList insights={profile.insights} limit={3} />
          {profile.insights.length > 3 ? (
            <details data-testid="more-insights">
              <summary className="min-h-11 cursor-pointer content-center text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0">
                {count(profile.insights.length - 3)} more{" "}
                {profile.insights.length - 3 === 1 ? "fact" : "facts"}
              </summary>
              <div className="mt-3">
                <InsightList insights={profile.insights.slice(3)} testId="workload-insights-more" />
              </div>
            </details>
          ) : null}
        </section>
      )}
      <div className="flex min-w-0 flex-col gap-1.5 text-sm">
        <p className="text-muted-foreground [overflow-wrap:anywhere]" data-testid="opening-meta">
          <span className="text-foreground">
            {overview === undefined
              ? recordedRange(record)
              : plainRange(overview.firstDate, overview.lastDate)}
          </span>{" "}
          · {sources} · {origin}
          {overview === undefined ? "" : ` · ${count(overview.activeDays)} active days`}
        </p>
        {record.savedLocally === false ? (
          <p className="text-xs text-warning" data-testid="workload-not-saved">
            Not saved in this browser: this workload is available only until the page reloads.
          </p>
        ) : null}
        <PartialScanNotice
          record={record}
          action={
            <Link className={ACTION_LINK} href="/app/import" data-testid="workload-rescan">
              Rescan history →
            </Link>
          }
        />
        {overview === undefined ? null : (
          <p className="text-xs text-muted-foreground" data-testid="opening-quality">
            {overview.unresolvedEvents === 0
              ? `All ${count(overview.events)} calls resolved to catalog models`
              : `${count(overview.resolvedEvents)} calls fully resolved · ${count(overview.unresolvedEvents)} ${overview.unresolvedEvents === 1 ? "call needs" : "calls need"} identity review`}
            {overview.unknownUsageEvents === 0
              ? " · token totals known for every call"
              : ` · ${count(overview.unknownUsageEvents)} calls with unknown usage`}
          </p>
        )}
        {profile === undefined || overview === undefined ? null : (
          <CurrentSpend
            periodDays={overview.spanDays}
            rulesAsOf={profile.value?.rulesAsOf ?? defaultRulesDate()}
            value={profile.value}
          />
        )}
      </div>
    </header>
  );
}

function WorkloadBody({
  profile,
  record,
  measure,
  onMeasure,
  useUtc,
  onUtc,
  localZone,
}: {
  profile: WorkloadProfile;
  record: ImportRecord;
  measure: Measure;
  onMeasure: (measure: Measure) => void;
  useUtc: boolean;
  onUtc: (value: boolean) => void;
  localZone: string;
}) {
  // Every suggestion is chosen from how much of this workload the target runs
  // (lib/routes.ts), never from a fixed list.
  const routes = useMemo(() => {
    const names = new Map(
      record.summary.usageSources.map((source) => [source.adapterId, source.name]),
    );
    return suggestRoutes(workloadSlices(profile.sources, names), defaultRulesDate(), {
      synthetic: isSyntheticWorkload(record),
    });
  }, [profile.sources, record]);
  const shareBuild = useCallback(
    (options: ShareOptions) => workloadShareV2(record, profile, options),
    [profile, record],
  );
  const apiRoute = routes.find((route) => route.id === "api-value");
  const numericRoute = routes.find((route) => route.id === "numeric-limits");
  const switchRoute = routes.find((route) => route.id === "switch-provider");
  const peakDates = new Set<string>();
  for (const window of profile.topWindows[measure]) {
    peakDates.add(
      new Intl.DateTimeFormat("en-CA", { timeZone: profile.timeZone }).format(
        new Date(window.startMs),
      ),
    );
  }
  const known = profile.overview.knownTokens;
  const cacheShare = known === 0 ? 0 : profile.tokens.cacheRead / known;
  const median = measure === "events" ? profile.days.medianEvents : profile.days.medianTokens;
  const peakDay = measure === "events" ? profile.days.peakByEvents : profile.days.peakByTokens;

  return (
    <div className="flex min-w-0 flex-col gap-14">
      <section
        className="flex flex-col gap-4 border-y border-accent/60 py-5"
        aria-labelledby="next-question-heading"
      >
        <div>
          <MicroLabel className="text-accent">Next question</MicroLabel>
          <h2 id="next-question-heading" className="mt-1 text-lg font-medium">
            What could run this work?
          </h2>
          <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            Choose all recorded work or one tool&apos;s work, then test it against a plan or direct
            API. Models stay as recorded unless you explicitly choose a substitution.
          </p>
        </div>
        <Link
          href={replayLink(record.id)}
          className={`${buttonVariants({ size: "sm" })} self-start`}
          data-testid="workload-replay-top"
        >
          Replay this workload
        </Link>
      </section>

      <nav
        aria-label="Explore workload details"
        className="flex flex-col gap-2 border-b border-border pb-5 text-sm"
      >
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Explore the detail
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a className={ACTION_LINK} href="#projects">
            What drives usage
          </a>
          <a className={ACTION_LINK} href="#pressure">
            When demand gets heavy
          </a>
          <a className={ACTION_LINK} href="#tokens">
            How tokens behave
          </a>
          <a className={ACTION_LINK} href="#sessions">
            Session shape
          </a>
        </div>
      </nav>

      <div
        className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-1 py-2 backdrop-blur"
        data-testid="measure-bar"
      >
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Read demand as</legend>
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            Read demand as
          </span>
          <button
            type="button"
            aria-pressed={measure === "events"}
            className={segmented(measure === "events")}
            onClick={() => onMeasure("events")}
            data-testid="measure-events"
          >
            Calls
          </button>
          <button
            type="button"
            aria-pressed={measure === "tokens"}
            className={segmented(measure === "tokens")}
            onClick={() => onMeasure("tokens")}
            data-testid="measure-tokens"
          >
            Known tokens
          </button>
        </fieldset>
        <p className="text-xs text-muted-foreground">
          Times in <span className="font-mono text-foreground">{profile.timeZone}</span> ·{" "}
          <button
            type="button"
            className="min-h-11 text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring sm:min-h-0"
            onClick={() => onUtc(!useUtc)}
            data-testid="timezone-toggle"
          >
            {useUtc ? `Use ${localZone}` : "Use UTC"}
          </button>
        </p>
      </div>

      <WorkloadSection
        index="01"
        eyebrow="Projects"
        title="Where the work came from"
        lede="Named from folder names on this device. The names stay in this browser: they are not part of an export, a share link or any request."
        id="projects"
        testId="section-projects"
      >
        <ProjectLedger measure={measure} profile={profile} />
      </WorkloadSection>

      <WorkloadSection
        index="02"
        eyebrow="Model mix"
        title="Which models did the work"
        lede="Grouped by canonical model, so different spellings of one model are counted once."
        id="models"
        testId="section-models"
        action={
          switchRoute === undefined ? undefined : (
            <Link
              className={ACTION_LINK}
              href={routeLink(record.id, switchRoute)}
              data-testid="models-translate-link"
            >
              Try these models' demand on {switchRoute.target.name} →
            </Link>
          )
        }
      >
        <ModelMix measure={measure} profile={profile} />
      </WorkloadSection>

      <WorkloadSection
        index="03"
        eyebrow="Recorded demand"
        title="Your history, day by day"
        lede={`${count(profile.overview.activeDays)} active days across ${count(profile.overview.spanDays)}. ${peakDay === undefined ? "" : `The busiest day, ${plainDay(peakDay.date)}, carried ${measure === "events" ? `${count(peakDay.events)} calls` : `${formatTokens(peakDay.tokens) ?? "0"} known tokens`}; the median active day, ${measure === "events" ? count(Math.round(median)) : (formatTokens(Math.round(median)) ?? "0")}. `}This is the demand stream Replay sends through a target.`}
        id="chronology"
        testId="section-chronology"
      >
        <DemandChronology
          highlighted={{
            dates: peakDates,
            legend: "day holding one of the five heaviest five-hour windows",
          }}
          label="Recorded demand"
          measure={measure}
          median={profile.chronology.unit === "day" ? median : undefined}
          points={profile.chronology.points}
          testId="workload-chronology"
          unit={profile.chronology.unit}
        />
      </WorkloadSection>

      <WorkloadSection
        index="04"
        eyebrow="When you work"
        title="Hours and weekdays"
        lede={`Read in ${profile.timeZone}, from each call's recorded timestamp.`}
        id="rhythm"
        testId="section-rhythm"
      >
        <WorkRhythm measure={measure} profile={profile} />
      </WorkloadSection>

      <WorkloadSection
        index="05"
        eyebrow="Historical pressure"
        title="Your heaviest windows"
        lede="Monthly totals hide bursts. Rolling windows open at the first call after the previous one closes, the same way Replay applies a rolling plan limit, so these are the peaks a plan would have met."
        id="pressure"
        testId="section-pressure"
        action={
          numericRoute === undefined ? undefined : (
            <Link
              className={ACTION_LINK}
              href={routeLink(record.id, numericRoute)}
              data-testid="pressure-replay-link"
            >
              See how {numericRoute.target.name} handles these peaks →
            </Link>
          )
        }
      >
        <HistoricalPressure
          measure={measure}
          profile={profile}
          sourceNames={
            new Map(record.summary.usageSources.map((source) => [source.adapterId, source.name]))
          }
        />
      </WorkloadSection>

      <WorkloadSection
        index="06"
        eyebrow="Token composition"
        title="Where the tokens go"
        id="tokens"
        testId="section-tokens"
        action={
          apiRoute === undefined ? undefined : (
            <Link
              className={ACTION_LINK}
              href={routeLink(record.id, apiRoute)}
              data-testid="tokens-api-link"
            >
              {apiRoute.slice.sources.length === 0
                ? `Estimate at ${apiRoute.target.name} rates →`
                : `Price your ${apiRoute.slice.label} work at ${apiRoute.target.name} rates →`}
            </Link>
          )
        }
      >
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <p
              className="font-sans text-5xl font-semibold leading-none tracking-tight tabular-nums sm:text-6xl"
              data-testid="cache-share"
            >
              {percent(cacheShare)}
            </p>
            <p className="text-sm leading-relaxed">
              of {formatTokens(known) ?? "0"} known processed tokens were cache reads.
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Processed tokens count everything a model read or wrote on each request, including
              context it re-read from cache on every turn. They are not unique text, and a cache
              read is not billed like fresh input. Fresh input was{" "}
              <span className="font-mono text-foreground">
                {formatTokens(profile.tokens.uncachedInput) ?? "0"}
              </span>{" "}
              and output{" "}
              <span className="font-mono text-foreground">
                {formatTokens(profile.tokens.output) ?? "0"}
              </span>
              {profile.tokens.reasoning > 0 ? (
                <>
                  , with{" "}
                  <span className="font-mono text-foreground">
                    {formatTokens(profile.tokens.reasoning) ?? "0"}
                  </span>{" "}
                  reasoning counted separately
                </>
              ) : null}
              .
            </p>
            {profile.overview.unknownUsageEvents > 0 ? (
              <p className="text-xs text-warning">
                {count(profile.overview.unknownUsageEvents)} calls report an incomplete set of token
                categories and are not in these totals. Their reported part is at least{" "}
                {formatTokens(profile.overview.lowerBoundTokens) ?? "0"} tokens.
              </p>
            ) : null}
          </div>
          <CompositionLedger buckets={profile.tokens} />
        </div>
      </WorkloadSection>

      <WorkloadSection
        index="07"
        eyebrow="Session shape"
        title="How the sessions break down"
        id="sessions"
        testId="section-sessions"
      >
        <SessionShape profile={profile} />
      </WorkloadSection>

      <section
        id="next"
        aria-labelledby="next-heading"
        className="flex min-w-0 flex-col gap-6 border-y border-accent/60 bg-surface-2/50 px-4 py-7 sm:px-6"
        data-testid="replay-transition"
      >
        <div className="flex max-w-3xl flex-col gap-2">
          <MicroLabel className="text-accent">Replay</MicroLabel>
          <h2 id="next-heading" className="text-2xl font-medium tracking-tight">
            What if you changed the stack?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Test this recorded workload against another subscription, provider, or API. Replay keeps
            your real chronology, the bursts above included, and applies the target&apos;s own rules
            to it.
          </p>
        </div>
        {routes.length === 0 ? null : (
          <ul
            className={`grid gap-px border border-border bg-border ${routes.length === 1 ? "" : routes.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
            data-testid="suggested-routes"
          >
            {routes.map((route) => {
              const copy = routeCopy(route);
              return (
                <NextStep
                  key={route.id}
                  body={copy.body}
                  href={routeLink(record.id, route)}
                  kind={copy.kind}
                  testId={
                    route.id === "api-value"
                      ? "next-api"
                      : route.id === "numeric-limits"
                        ? "next-numeric"
                        : "next-cross-provider"
                  }
                  title={copy.title}
                />
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={replayLink(record.id)}
            className={buttonVariants({ size: "sm" })}
            data-testid="workload-replay-cta"
          >
            Replay this workload
          </Link>
          <Link
            href={`/app/compare?import=${record.id}`}
            className={buttonVariants({ size: "sm", variant: "secondary" })}
            data-testid="workload-compare-cta"
          >
            Compare this workload
          </Link>
        </div>
      </section>

      <div className="scroll-mt-20" id="share">
        <SharePanelV2 build={shareBuild} kind="workload" />
      </div>

      <WorkloadSection
        index="08"
        eyebrow="Scan quality"
        title="Evidence behind these figures"
        id="evidence"
        testId="section-evidence"
      >
        <ScanEvidence profile={profile} record={record} />
      </WorkloadSection>

      <p
        className="max-w-prose border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground"
        data-testid="workload-privacy"
      >
        Your workload stays local unless you explicitly choose to share something. This analysis ran
        in a Worker in this browser; project names, sessions and timestamps were not sent anywhere.
      </p>
    </div>
  );
}

function NextStep({
  href,
  kind,
  title,
  body,
  testId,
}: {
  href: string;
  kind: string;
  title: string;
  body: string;
  testId: string;
}) {
  return (
    <li className="bg-background">
      <Link
        href={href}
        className="group flex h-full min-h-11 flex-col gap-2 p-4 focus-visible:outline-2 focus-visible:outline-ring"
        data-testid={testId}
      >
        <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {kind}
        </span>
        <span className="text-sm font-medium text-foreground group-hover:text-accent">
          {title} →
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
      </Link>
    </li>
  );
}
