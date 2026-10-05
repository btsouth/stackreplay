"use client";

import { buttonVariants, StatTile } from "@stackreplay/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { formatTokens } from "@/components/instrument/format";
import { MicroLabel } from "@/components/instrument/primitives";
import { MissingWorkload } from "@/components/missing-workload";
import { PageHeader } from "@/components/page-header";
import {
  AppPageSkeleton,
  LocalReadError,
  ScanEmptyState,
  TemporaryScanNotice,
} from "@/components/plans/app-page-state";
import { AppSelect } from "@/components/plans/app-select";
import { SharePanelV2 } from "@/components/share/share-panel-v2";
import type { MarketDecision } from "@/lib/market-decision";
import { replayLink, routeCopy, routeLink } from "@/lib/replay-navigation";

import { suggestRoutes, workloadSlices } from "@/lib/routes";
import { defaultRulesDate } from "@/lib/rules-date";
import { type ShareOptions, workloadShareV2 } from "@/lib/share-v2";
import { localDayOf } from "@/lib/timeline";
import { loadWorkloadProfile } from "@/lib/use-workload-profile";
import { describeWorkerFailure, getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord, SafeError } from "@/lib/worker-protocol";
import { cacheReadShareOf } from "@/lib/workload-facts";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import type { Measure, WorkloadProfile } from "@/lib/workload-profile";
import { AutomaticWorkload } from "./automatic-workload";
import { DemandChronology } from "./chronology";
import { CompositionLedger } from "./composition";
import { PartialScanNotice, ScanEvidence } from "./evidence";
import { count, percent, plainDay, plainRange } from "./format";
import { WorkloadSkeleton } from "./loading";
import { ModelMix } from "./models";
import { HistoricalPressure } from "./pressure";
import { ProjectLedger } from "./projects";
import { WorkRhythm } from "./rhythm";
import { ACTION_LINK, WorkloadSection } from "./section";
import { SessionShape } from "./sessions";
import { CurrentSpend, WorkloadValueFigure } from "./value";

export { replayLink } from "@/lib/replay-navigation";

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
 * The workload page: SCAN → UNDERSTAND. What the recorded history says on its
 * own, before any target is chosen. Replay is the second question, offered at
 * the end and from the sections that naturally raise it.
 */
export function WorkloadSurface({
  initialImportId,
  initialTarget,
}: {
  initialImportId?: string | undefined;
  initialTarget?: string | undefined;
}) {
  const client = getWorkerClient();
  const [market, setMarket] = useState<{ id: string; result: MarketDecision }>();
  const onMarket = useCallback(
    (id: string, result: MarketDecision | undefined) =>
      setMarket(result ? { id, result } : undefined),
    [],
  );
  const [imports, setImports] = useState<ImportRecord[] | undefined>(undefined);
  const [importsError, setImportsError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialImportId);
  const [localZone, setLocalZone] = useState(() =>
    typeof window === "undefined" ? "UTC" : browserTimeZone(),
  );
  const [useUtc, setUseUtc] = useState(false);
  const [profileState, setProfileState] = useState<{ id: string; profile: WorkloadProfile }>();
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
  const profile =
    profileState?.id === record?.id && profileState?.profile.timeZone === timeZone
      ? profileState.profile
      : undefined;

  // A workload chosen here replaces a stale id in the address, so a reload or
  // Back returns to what is on screen rather than to the missing one.
  const router = useRouter();
  useEffect(() => {
    if (record === undefined) return;
    const current = new URLSearchParams(window.location.search).get("import");
    if (current !== record.id) {
      const params = new URLSearchParams(window.location.search);
      params.set("import", record.id);
      router.replace(`/app/stats?${params}${window.location.hash}`, { scroll: false });
    }
  }, [record, router]);

  const analyze = useCallback(async (importId: string, zone: string, cancelled: () => boolean) => {
    setError(undefined);
    try {
      const next = await loadWorkloadProfile(importId, zone);
      if (!cancelled()) setProfileState({ id: importId, profile: next });
    } catch (failure) {
      if (failure instanceof SupersededError || cancelled()) return;
      setError(describeWorkerFailure(failure));
    }
  }, []);

  useEffect(() => {
    if (record === undefined) return;
    let cancelled = false;
    void analyze(record.id, timeZone, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [analyze, record, timeZone]);

  if (importsError) return <LocalReadError retry={() => window.location.reload()} />;
  if (imports === undefined)
    return <AppPageSkeleton label="Opening your stats" testId="workload-restoring" />;
  if (imports.length === 0 || (record === undefined && selectedId === undefined))
    return (
      <div className="premium-app">
        <PageHeader
          title="Your stats"
          description="See where your AI coding work goes, from your biggest projects to your busiest days."
        />
        <ScanEmptyState testId="workload-empty" />
      </div>
    );

  if (record === undefined)
    return <MissingWorkload latest={imports[0]} onOpenLatest={setSelectedId} />;

  return (
    <div className="premium-app flex min-w-0 flex-col gap-8" data-testid="workload-surface">
      <WorkloadOpening
        onMarket={onMarket}
        target={initialTarget}
        record={record}
        profile={profile}
        profileFailed={error !== undefined}
        imports={imports}
        onSelect={(next) => {
          setSelectedId(next);
          const params = new URLSearchParams(window.location.search);
          params.set("import", next);
          router.push(`/app/stats?${params}${window.location.hash}`, { scroll: false });
        }}
        analysisContent={(decision) =>
          profile ? (
            <WorkloadAnalysis
              decision={decision}
              measure={measure}
              onMeasure={setMeasure}
              onUtc={setUseUtc}
              profile={profile}
              record={record}
              useUtc={useUtc}
              localZone={localZone}
            />
          ) : error !== undefined ? null : (
            <WorkloadSection index="02" eyebrow="Model mix" title="Which models did the work">
              <WorkloadSkeleton
                testId="analysis-loading"
                label="Preparing model mix, activity and demand windows"
              />
            </WorkloadSection>
          )
        }
        detailContent={
          <>
            {initialTarget === undefined ? null : (
              <Link
                className={ACTION_LINK}
                href={replayLink(record.id, { plan: initialTarget })}
                data-testid="selected-plan-replay"
              >
                Continue with your selected plan in Replay →
              </Link>
            )}
            {profile === undefined ? (
              error === undefined ? (
                <div
                  className="flex flex-col gap-3 border-t border-border pt-4"
                  role="status"
                  data-testid="workload-analyzing"
                >
                  <p className="text-sm text-muted-foreground">
                    Restoring {count(record.eventCount)} recorded calls and analyzing their
                    chronology, projects and sessions in this browser…
                  </p>
                </div>
              ) : null
            ) : (
              <WorkloadBody
                decision={market?.id === record.id ? market.result : undefined}
                profile={profile}
                record={record}
              />
            )}
          </>
        }
      />
      {error !== undefined ? (
        <div role="alert" className="border-l-2 border-negative pl-4" data-testid="workload-error">
          <p className="text-sm font-medium text-negative">{error.title}</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : null}
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
    <div className="flex w-full min-w-0 max-w-xs flex-col gap-1 text-xs text-muted-foreground">
      Stored workload
      <AppSelect
        label="History"
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
      </AppSelect>
    </div>
  );
}

function WorkloadOpening({
  target,
  record,
  profile,
  profileFailed,
  imports,
  onSelect,
  onMarket,
  detailContent,
  analysisContent,
}: {
  target?: string | undefined;
  record: ImportRecord;
  profile: WorkloadProfile | undefined;
  profileFailed: boolean;
  imports: ImportRecord[];
  onSelect: (id: string) => void;
  onMarket: (id: string, result: MarketDecision | undefined) => void;
  detailContent: ReactNode;
  analysisContent: (decision: MarketDecision | undefined) => ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-4" data-testid="workload-opening">
      <div className="app-stats-header">
        <PageHeader
          eyebrow="Your work, up close"
          title="Your stats"
          description="See what drives your usage, where your work goes, and how it adds up at published API prices."
          actions={
            <Link
              className={ACTION_LINK}
              href={`/app/plans?import=${encodeURIComponent(record.id)}${target ? `&target=${encodeURIComponent(target)}` : ""}`}
            >
              Find plans for this work →
            </Link>
          }
        />
        <WorkloadPicker imports={imports} selectedId={record.id} onSelect={onSelect} />
      </div>
      {record.savedLocally === false ? <TemporaryScanNotice /> : null}
      <div className="app-stat-strip">
        <StatTile
          label="Known tokens processed"
          value={formatTokens(record.summary.tokens.known) ?? "0"}
          hint="Input, output and recorded cache usage across this scan"
          tone="citron"
        />
        <StatTile
          label="Sessions"
          value={record.summary.sessionCount ? count(record.summary.sessionCount) : "Unknown"}
          hint={`${count(record.eventCount)} recorded calls`}
        />
        <StatTile
          label="Active days"
          value={profile ? count(profile.overview.activeDays) : "…"}
          hint={recordedRange(record)}
        />
      </div>
      <PartialScanNotice
        record={record}
        briefing
        action={
          <Link className={ACTION_LINK} href="/app/scan" data-testid="workload-rescan">
            Rescan history →
          </Link>
        }
      />
      <AutomaticWorkload
        key={record.id}
        record={record}
        profile={profile}
        profileFailed={profileFailed}
        onResult={onMarket}
        projects={
          profile ? (
            <WorkloadSection
              index="01"
              eyebrow="Projects"
              title="Where your work went"
              id="projects"
              testId="section-projects"
            >
              <ProjectLedger profile={profile} measure="tokens" initialRows={5} />
            </WorkloadSection>
          ) : profileFailed ? null : (
            <WorkloadSection index="01" eyebrow="Projects" title="Where your work went">
              <WorkloadSkeleton testId="project-loading" label="Preparing project distribution" />
            </WorkloadSection>
          )
        }
        analysis={analysisContent}
        tools={detailContent}
        evidence={
          <>
            <ImportedWorkloadEvidence record={record} profile={profile} />
            {profile ? (
              <div data-testid="section-evidence">
                <ScanEvidence profile={profile} record={record} />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Models are grouped by exact canonical identity. Known processed tokens count recorded
              input, cache reads, cache writes, output and separately reported reasoning. Unknown
              categories are not estimated. Historical rolling demand windows start with the first
              call after the previous window closes; they describe workload, not subscription
              capacity.
            </p>
          </>
        }
      />
    </div>
  );
}

function ImportedWorkloadEvidence({
  record,
  profile,
}: {
  record: ImportRecord;
  profile: WorkloadProfile | undefined;
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
    <header className="flex min-w-0 flex-col gap-6" data-testid="imported-workload-evidence">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <MicroLabel className="text-accent">
            {origin === "synthetic demo" ? "Synthetic demo workload" : "Your workload"}
          </MicroLabel>
          <h3 className="text-lg font-medium">Imported history</h3>
          <p
            className="text-sm text-muted-foreground [overflow-wrap:anywhere]"
            data-testid="opening-meta"
          >
            Imported history ({profile?.timeZone ?? "UTC"}) ·{" "}
            {overview === undefined
              ? recordedRange(record)
              : plainRange(overview.firstDate, overview.lastDate)}{" "}
            · {sources} · {origin}
            {overview === undefined ? "" : ` · ${count(overview.activeDays)} active days`}
          </p>
          <dl
            className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"
            aria-label="Workload scale"
          >
            {figures.map((figure) => (
              <div
                key={figure.label}
                className="flex items-baseline gap-1.5"
                data-testid={figure.testId}
              >
                <dd
                  className="font-mono font-medium tabular-nums text-foreground"
                  title={figure.title}
                >
                  {figure.value}
                </dd>
                <dt>{figure.label}</dt>
              </div>
            ))}
          </dl>
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
          {record.savedLocally === false ? (
            <p className="text-xs text-warning" data-testid="workload-not-saved">
              Not saved in this browser: this workload is available only until the page reloads.
            </p>
          ) : null}
        </div>
      </div>

      <details data-testid="legacy-workload">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
          Inspect earlier replay valuation
        </summary>
        <section
          className="flex min-w-0 flex-col gap-2 border-t border-border pt-5"
          aria-label="Published API valuation"
        >
          <MicroLabel>Recorded provider valuation</MicroLabel>
          <p className="text-xs text-muted-foreground">
            Historical replay pricing view. The admitted market calculation above uses its own
            pinned evidence and explicit cache assumptions; these are distinct pricing methods.
          </p>
          {profile?.value === undefined ? (
            <p className="text-sm text-muted-foreground" role="status" data-testid="value-pending">
              Pricing each maker&apos;s calls at its own published API rates, in this browser…
            </p>
          ) : (
            <WorkloadValueFigure value={profile.value} briefing />
          )}
        </section>
      </details>
    </header>
  );
}

function WorkloadAnalysis({
  decision,
  profile,
  record,
  measure,
  onMeasure,
  useUtc,
  onUtc,
  localZone,
}: {
  decision: MarketDecision | undefined;
  profile: WorkloadProfile;
  record: ImportRecord;
  measure: Measure;
  onMeasure: (measure: Measure) => void;
  useUtc: boolean;
  onUtc: (value: boolean) => void;
  localZone: string;
}) {
  const peakDates = new Set<string>();
  for (const window of profile.topWindows[measure]) {
    peakDates.add(
      new Intl.DateTimeFormat("en-CA", { timeZone: profile.timeZone }).format(
        new Date(window.startMs),
      ),
    );
  }
  const median = measure === "events" ? profile.days.medianEvents : profile.days.medianTokens;
  const peakDay = measure === "events" ? profile.days.peakByEvents : profile.days.peakByTokens;

  return (
    <div className="flex min-w-0 flex-col gap-10 sm:gap-14" data-testid="analysis-region">
      <div
        className="sticky top-16 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-1 py-2 backdrop-blur sm:top-[4.5rem]"
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
        index="02"
        eyebrow="Model mix"
        title="Which models did the work"
        id="models"
        testId="section-models"
      >
        <ModelMix measure={measure} profile={profile} decision={decision} />
        <div id="tokens" data-testid="section-tokens" className="space-y-3 pt-3">
          <h3 className="text-sm font-medium">Token behavior</h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-foreground" data-testid="cache-share">
              {percent(cacheReadShareOf(profile) ?? 0)}
            </span>{" "}
            of known tokens were cache reads.
          </p>
          <CompositionLedger buckets={profile.tokens} />
        </div>
      </WorkloadSection>

      <WorkloadSection
        index="03"
        eyebrow="Recorded demand"
        title="Your history, day by day"
        lede={`${count(profile.overview.activeDays)} active days. ${peakDay ? `Busiest day: ${plainDay(peakDay.date)} · ${measure === "events" ? `${count(peakDay.events)} calls` : `${formatTokens(peakDay.tokens)} known tokens`}.` : ""}`}
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
        <div id="rhythm" data-testid="section-rhythm" className="space-y-3 pt-4">
          <h3 className="text-sm font-medium">Hours and weekdays</h3>
          <WorkRhythm measure={measure} profile={profile} />
        </div>
      </WorkloadSection>

      <WorkloadSection
        index="04"
        eyebrow="Session shape"
        title="How intense the work became"
        id="sessions"
        testId="section-sessions"
      >
        <SessionShape profile={profile} />
        <div id="pressure" data-testid="section-pressure" className="space-y-4 pt-4">
          <h3 className="text-lg font-medium">Your heaviest windows</h3>
          <HistoricalPressure
            measure={measure}
            profile={profile}
            sourceNames={
              new Map(record.summary.usageSources.map((source) => [source.adapterId, source.name]))
            }
          />
        </div>
      </WorkloadSection>
    </div>
  );
}

function WorkloadBody({
  decision,
  profile,
  record,
}: {
  decision: MarketDecision | undefined;
  profile: WorkloadProfile;
  record: ImportRecord;
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
    (options: ShareOptions) => workloadShareV2(record, profile, options, decision),
    [profile, record, decision],
  );
  return (
    <div className="space-y-6">
      <section
        id="next"
        aria-labelledby="next-heading"
        className="flex min-w-0 flex-col gap-6 border-y border-accent/60 bg-surface-2/50 px-4 py-7 sm:px-6"
        data-testid="replay-transition"
      >
        <div className="flex max-w-3xl flex-col gap-2">
          <MicroLabel className="text-accent">After the analysis</MicroLabel>
          <h2 id="next-heading" className="text-2xl font-medium tracking-tight">
            What would you like to test next?
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose a part of this recorded work to replay against a plan or API, or compare ways to
            buy that same work. The chronology and peaks you just inspected stay in the analysis.
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
                  scope={`${route.slice.label} · ${count(route.slice.events)} calls`}
                  alternative={
                    route.alternative
                      ? {
                          name: route.alternative.name,
                          href: replayLink(record.id, {
                            plan: route.alternative.id,
                            scope: route.slice.sources,
                          }),
                        }
                      : undefined
                  }
                />
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href={replayLink(record.id)}
            className={buttonVariants({ size: "sm" })}
            data-testid="workload-replay-cta"
          >
            Replay this workload
          </Link>
          <Link
            href={`/app/plans?section=compare&view=billing&import=${record.id}`}
            className={ACTION_LINK}
            data-testid="legacy-workload-compare-cta"
          >
            Compare ways to buy this work →
          </Link>
        </div>
      </section>

      <CurrentSpend
        periodDays={profile.overview.spanDays}
        rulesAsOf={profile.value?.rulesAsOf ?? defaultRulesDate()}
        value={profile.value}
      />

      <details className="border-t border-border pt-2" data-testid="workload-tools" id="share">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
          Share this workload
        </summary>
        <div className="scroll-mt-36">
          <SharePanelV2
            key={`${record.id}:${decision ? "ready" : "pending"}`}
            build={shareBuild}
            kind="workload"
            refusal={
              decision === undefined
                ? "The published market calculation must finish before creating this share."
                : undefined
            }
          />
        </div>

        <p
          className="max-w-prose border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground"
          data-testid="workload-privacy"
        >
          Your workload stays local unless you explicitly choose to share something. This analysis
          ran in a Worker in this browser; project names, sessions and timestamps were not sent
          anywhere.
        </p>
      </details>
    </div>
  );
}

function NextStep({
  href,
  kind,
  title,
  body,
  testId,
  alternative,
  scope,
}: {
  alternative?: { name: string; href: string } | undefined;
  scope: string;
  href: string;
  kind: string;
  title: string;
  body: string;
  testId: string;
}) {
  return (
    <li className="flex flex-col bg-background">
      <Link
        href={href}
        className="group flex flex-1 min-h-11 flex-col gap-2 p-4 focus-visible:outline-2 focus-visible:outline-ring"
        data-testid={testId}
      >
        <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {kind}
        </span>
        <span className="text-sm font-medium text-foreground group-hover:text-accent">
          {title} →
        </span>
        <span className="text-xs text-muted-foreground">Scope: {scope}</span>
        <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
      </Link>
      {alternative ? (
        <Link href={alternative.href} className={`${ACTION_LINK} px-4 pb-3`}>
          Test {alternative.name} on the same work →
        </Link>
      ) : null}
    </li>
  );
}
