"use client";
import { useEffect, useState } from "react";
import type {
  CapacityBurden,
  Distribution,
  ObservedCapacityEpisode,
} from "@/lib/capacity-episodes";
import {
  type EpisodeImpact,
  IMPACTS,
  readContextIds,
  readEpisodeImpacts,
  saveContextIds,
  saveEpisodeImpacts,
} from "@/lib/episode-local";
import type { ReviewPeriod } from "@/lib/review-period";
import { getWorkerClient } from "@/lib/worker-client";
import type { ImportRecord } from "@/lib/worker-protocol";

const number = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
export const duration = (ms: number | undefined) =>
  ms === undefined
    ? "Not observed"
    : ms < 1
      ? "0 s"
      : ms < 60000
        ? `${number(ms / 1000)} s`
        : ms < 3600000
          ? `${number(ms / 60000)} min`
          : `${number(ms / 3600000)} h`;
const at = (s: string) => `${s.slice(0, 10)} ${s.slice(11, 19)} UTC`;
const timing = (d: Distribution | undefined) =>
  d
    ? `${duration(d.median)} median · ${duration(d.min)} to ${duration(d.max)} · ${d.count} episodes`
    : "No observations";
const field = "min-h-11 w-full border border-border bg-background px-3 text-sm";

function Episode({
  episode,
  impact,
  onSave,
}: {
  episode: ObservedCapacityEpisode;
  impact: EpisodeImpact | undefined;
  onSave: (value: EpisodeImpact | undefined) => void;
}) {
  const events = [
    ...episode.blockedAttempts.map((attempt, i) => ({
      at: attempt.at,
      label: i === 0 ? "First block" : `Blocked attempt ${i + 1}`,
    })),
    ...(episode.resetAt ? [{ at: episode.resetAt, label: "Client-reported reset schedule" }] : []),
    ...(episode.nextMainSuccess
      ? [{ at: episode.nextMainSuccess.at, label: "Next recorded main-account response" }]
      : []),
    ...(episode.nextOtherHarnessActivity
      ? [
          {
            at: episode.nextOtherHarnessActivity.at,
            label: `Next recorded other-harness response (${episode.nextOtherHarnessActivity.source})`,
          },
        ]
      : []),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return (
    <details className="border-t border-border py-2" data-testid="capacity-episode">
      <summary className="min-h-11 cursor-pointer content-center text-sm">
        {at(episode.firstBlockedAt)} · {episode.scope.replace("five_hour", "five-hour")} ·{" "}
        {episode.blockedAttemptIds.length} blocked attempts
      </summary>
      <p className="my-2 text-xs text-muted-foreground">
        {episode.grouping === "explicit-reset"
          ? "Grouped by account, constraint and explicit reset identity."
          : "No explicit reset identity. Kept separate; not proven to be an independent outage."}{" "}
        {episode.affectedSessionIds.length} affected sessions.
      </p>
      <ol className="space-y-2 border-l border-border pl-4 text-xs">
        {events.map((e) => (
          <li key={`${e.label}-${e.at}`}>
            <time className="font-mono" dateTime={e.at}>
              {at(e.at)}
            </time>
            <span className="ml-2">{e.label}</span>
          </li>
        ))}
      </ol>
      <dl className="my-3 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt>Retry span</dt>
          <dd>{duration(episode.retrySpanMs)}</dd>
        </div>
        <div>
          <dt>Scheduled time remaining when first blocked</dt>
          <dd>{duration(episode.scheduledRemainingMs)}</dd>
        </div>
        <div>
          <dt>Time to next main-account response</dt>
          <dd>
            {duration(
              episode.nextMainSuccess
                ? Date.parse(episode.nextMainSuccess.at) - Date.parse(episode.firstBlockedAt)
                : undefined,
            )}
          </dd>
        </div>
        <div>
          <dt>Time to next recorded AI activity</dt>
          <dd>
            {duration(
              episode.nextAnyActivity
                ? Date.parse(episode.nextAnyActivity.at) - Date.parse(episode.firstBlockedAt)
                : undefined,
            )}
            {episode.nextAnyActivity ? ` · ${episode.nextAnyActivity.source}` : ""}
          </dd>
        </div>
      </dl>
      {!episode.nextOtherHarnessActivity ||
      Date.parse(episode.nextOtherHarnessActivity.at) >= Date.parse(episode.observationEnd) ? (
        <p className="text-xs text-muted-foreground">
          No other-harness response was recorded before{" "}
          {episode.nextMainSuccess
            ? "the next main-account response"
            : episode.resetAt
              ? "the scheduled reset or cycle end"
              : "the cycle ended"}
          . Missing history or ordinary inactivity may explain this.
        </p>
      ) : null}
      <details>
        <summary className="min-h-11 cursor-pointer content-center text-xs">
          Workload before episode onset
        </summary>
        <ul className="space-y-2 text-xs">
          {episode.before.map((c) => (
            <li key={c.hours}>
              Prior {c.hours === 168 ? "7 days" : `${c.hours} hours`}: {number(c.responses)}{" "}
              main-account responses · {number(c.knownTokens)} known tokens
              {c.unknownTokenResponses
                ? ` · ${c.unknownTokenResponses} incomplete token records`
                : ""}
              <p className="text-muted-foreground">
                {Object.entries(c.models)
                  .map(([model, n]) => `${model}: ${number(n)}`)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </details>
      <form
        aria-label={`Impact for episode ${at(episode.firstBlockedAt)}`}
        className="my-3 grid max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const impactValue = String(data.get("impact"));
          onSave(
            IMPACTS.includes(impactValue as EpisodeImpact["impact"])
              ? {
                  impact: impactValue as EpisodeImpact["impact"],
                  note: String(data.get("note")).trim(),
                  confirmedAt: new Date().toISOString(),
                  provenance: "local-user",
                }
              : undefined,
          );
        }}
      >
        <label className="text-xs">
          Your impact (optional)
          <select className={field} name="impact" defaultValue={impact?.impact ?? ""}>
            <option value="">Not classified</option>
            {IMPACTS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Episode note (local only)
          <textarea
            className={field}
            name="note"
            maxLength={500}
            defaultValue={impact?.note ?? ""}
          />
        </label>
        <button type="submit" className="min-h-11 border border-border px-3 text-sm">
          Save episode impact locally
        </button>
        {impact ? (
          <p className="text-xs text-muted-foreground">
            User-confirmed: {impact.impact}. Saved {at(impact.confirmedAt)}.
          </p>
        ) : null}
      </form>
      <details>
        <summary className="min-h-11 cursor-pointer content-center text-xs">
          Episode evidence identities
        </summary>
        <p className="break-all font-mono text-xs">
          {episode.episodeId}
          <br />
          {episode.blockedAttemptIds.join(" · ")}
        </p>
      </details>
    </details>
  );
}

export function CapacityBurdenSurface({
  importId,
  resourceInstanceId,
  planId,
  period,
  workloadDigest,
}: {
  importId: string;
  resourceInstanceId: string;
  planId: string;
  period: ReviewPeriod;
  workloadDigest: string;
}) {
  const [ids, setIds] = useState<string[]>();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [burden, setBurden] = useState<CapacityBurden>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [impacts, setImpacts] = useState<Record<string, EpisodeImpact>>({});
  useEffect(() => {
    setIds(readContextIds(importId));
    let active = true;
    getWorkerClient()
      .listImports()
      .then((values) => {
        if (active) setImports(values.filter((v) => v.id !== importId));
      })
      .catch(() => {
        if (active) setError("Saved context histories could not be listed.");
      });
    return () => {
      active = false;
    };
  }, [importId]);
  const scope = JSON.stringify({
    importId,
    resourceInstanceId,
    planId,
    period,
    contextImportIds: ids ?? [],
  });
  const ready = ids !== undefined;
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setBurden(undefined);
    setError("");
    getWorkerClient()
      .capacityBurden(JSON.parse(scope))
      .then((value) => {
        if (active) setBurden(value);
      })
      .catch(() => {
        if (active)
          setError(
            "Episode chronology could not be calculated. Your economic result is unchanged.",
          );
      });
    return () => {
      active = false;
    };
  }, [scope, ready]);
  const binding = JSON.stringify([
    workloadDigest,
    resourceInstanceId,
    planId,
    period,
    burden?.digest,
  ]);
  useEffect(() => {
    setImpacts(burden ? readEpisodeImpacts(importId, binding) : {});
    setStatus("");
  }, [importId, binding, burden]);
  const choose = (next: string[]) => {
    if (next.length > 10) {
      setError("Choose up to 10 context imports.");
      return;
    }
    setIds(next);
    if (!saveContextIds(importId, next)) setError("Context selection could not be saved locally.");
  };
  const impactCounts = IMPACTS.map((impact) => ({
    impact,
    count: Object.values(impacts).filter((v) => v.impact === impact).length,
  }));
  return (
    <div className="space-y-4" data-testid="capacity-burden">
      {burden ? (
        <>
          <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {[
              ["Capacity episode groups", burden.episodes.length],
              ["Blocked attempts", burden.attempts],
              ["Affected sessions", burden.sessions],
              ["Days affected (UTC)", burden.days],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-mono text-2xl tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="max-w-3xl text-sm" data-testid="burden-conclusion">
            {burden.attempts
              ? `StackReplay found ${burden.episodes.length} conservative capacity episode groups containing ${burden.attempts} blocked attempts during this cycle. ${burden.resetLinked} groups share an explicit reset identity; ${burden.unlinked} limit records have no usable reset identity and remain separate.`
              : "No directly observable capacity-limit episodes were found in the available history. This does not establish that no limits were hit."}
          </p>
          <p className="max-w-3xl text-sm" data-testid="continuity-conclusion">
            Other-harness responses were recorded before the next main-account response in{" "}
            {burden.withOtherBeforeMain} of {burden.withObservedNextMain} episodes with an observed
            subsequent main response. This is chronology, not proof of why work continued elsewhere.
          </p>
          <p className="text-xs text-muted-foreground">
            Chronology uses only the selected local histories; their completeness is not confirmed.
            {burden.contextWarnings.length || burden.contextUnavailable.length
              ? " Some context records were incomplete or unavailable."
              : ""}{" "}
            {burden.fiveHour} five-hour episode groups · {burden.modelSpecific} model-specific
            groups. Unlinked model limits may overlap; the grouping does not prove independent
            outages. Response timing does not measure continuous unavailability or lost
            productivity.
          </p>
          {Object.keys(impacts).length ? (
            <div className="text-xs" data-testid="impact-summary">
              <p>
                User-confirmed impact:{" "}
                {impactCounts.map((v) => `${v.impact}: ${v.count}`).join(" · ")}
              </p>
              <p>
                You marked{" "}
                {
                  Object.values(impacts).filter(
                    (v) => v.impact === "Delayed me" || v.impact === "Stopped work",
                  ).length
                }{" "}
                of {burden.episodes.length} episodes as delaying or stopping your work.
              </p>
            </div>
          ) : null}
          <details>
            <summary className="min-h-11 cursor-pointer content-center text-sm">
              Inspect episode timeline and timing
            </summary>
            <dl className="my-3 space-y-3 text-xs">
              <div>
                <dt>Scheduled time remaining when first blocked</dt>
                <dd>{timing(burden.scheduledRemaining)}</dd>
              </div>
              <div>
                <dt>Retry span</dt>
                <dd>{timing(burden.retrySpan)}</dd>
              </div>
              <div>
                <dt>Time to next recorded main-account response</dt>
                <dd>{timing(burden.nextMainMs)}</dd>
              </div>
              <div>
                <dt>Time to next recorded AI activity</dt>
                <dd>{timing(burden.nextAnyMs)}</dd>
              </div>
              <div>
                <dt>Observed scheduled-block exposure</dt>
                <dd>
                  {duration(burden.scheduledExposureMs)} of unique wall-clock exposure, overlapping
                  schedules counted once and clipped to this cycle. Not downtime.
                </dd>
              </div>
            </dl>
            <p className="my-3 text-xs text-muted-foreground">
              No other-harness response was observed in {burden.noOtherBeforeBoundary} episodes
              before the next main-account response, or the scheduled reset/cycle end when no main
              response followed. That does not establish that work stopped. A main-account response
              may use a different model or arrive between retries; it does not prove the reported
              constraint cleared.
            </p>
            <details>
              <summary className="min-h-11 cursor-pointer content-center text-xs">
                Episode-onset workload statistics
              </summary>
              {burden.onset.map((v) => (
                <p className="my-2 text-xs" key={v.hours}>
                  Prior {v.hours === 168 ? "7 days" : `${v.hours} hours`}:{" "}
                  {v.tokens
                    ? `${number(v.tokens.median)} median known tokens · ${number(v.tokens.min)} to ${number(v.tokens.max)} · ${v.tokens.count} episode onsets`
                    : "No observations"}
                  . {v.partialContexts} contexts contain incomplete token records.
                </p>
              ))}
              <p className="text-xs text-muted-foreground">
                Main-account workload only, restricted to this cycle. Retrospective descriptions,
                not quota estimates. Each episode onset counts once.
              </p>
            </details>
            {burden.episodes.map((e) => (
              <Episode
                key={`${binding}:${e.episodeId}`}
                episode={e}
                impact={impacts[e.episodeId]}
                onSave={(value) => {
                  const next = { ...impacts };
                  if (value) next[e.episodeId] = value;
                  else delete next[e.episodeId];
                  if (saveEpisodeImpacts(importId, binding, next)) {
                    setImpacts(next);
                    setStatus("Episode impact saved locally.");
                  } else setError("Episode impact could not be saved locally.");
                }}
              />
            ))}
          </details>
        </>
      ) : (
        <p className="text-sm" role="status">
          {error ? "Episode chronology unavailable." : "Composing observed episodes…"}
        </p>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer content-center text-sm">
          Continuity history and methodology
        </summary>
        <p className="my-2 text-xs text-muted-foreground">
          The selected workload supplies main-account responses. Add saved histories from other
          harnesses as chronology context only. Their tokens and spend never enter this Claude
          review. Import additional histories through the existing Import page.
        </p>
        {imports.map((record) => (
          <label key={record.id} className="flex min-h-11 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={ids?.includes(record.id) ?? false}
              onChange={(e) =>
                choose(
                  e.target.checked
                    ? [...(ids ?? []), record.id]
                    : (ids ?? []).filter((id) => id !== record.id),
                )
              }
            />
            {record.label} · {number(record.eventCount)} records
          </label>
        ))}
        {burden ? (
          <>
            <p className="my-2 text-xs">
              Eligible response records:{" "}
              {burden.sources
                .map((s) => `${s.source}: ${number(s.eligibleResponses)}`)
                .join(" · ") || "None"}
              . {burden.excludedActivityRecords} context records lacked exact per-response usage or
              positive output and were excluded.
            </p>
            {burden.contextWarnings.length || burden.contextUnavailable.length ? (
              <p className="text-xs text-warning">
                Context coverage is incomplete. {burden.contextWarnings.join(", ")}
                {burden.contextUnavailable.length
                  ? ` · ${burden.contextUnavailable.length} selected imports unavailable`
                  : ""}
                . Absence of recorded activity is not proof of inactivity.
              </p>
            ) : null}
            <p className="my-2 text-xs text-muted-foreground">
              Positive output in an exact per-response usage record establishes recorded activity.
              Source timestamps are not guaranteed generation-completion times. All chronology is
              limited to this cycle. A separate import from the main harness is not used to infer
              another account. Full history coverage is not asserted for context imports.
            </p>
            <p className="break-all font-mono text-xs">
              {burden.methodology} · {burden.digest}
              <br />
              Workload: {workloadDigest}
            </p>
          </>
        ) : null}
      </details>
      {error ? (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      ) : null}
      <p role="status" className="text-xs">
        {status}
      </p>
    </div>
  );
}
