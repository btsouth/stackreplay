"use client";

import { useEffect, useState } from "react";
import { MicroLabel } from "@/components/instrument/primitives";
import {
  capacityBinding,
  type ManualCapacityEvent,
  readManualCapacity,
  saveManualCapacity,
} from "@/lib/capacity-local";
import type { CapacitySummary } from "@/lib/observed-capacity";
import type { ReviewPeriod } from "@/lib/review-period";

const count = (n: number) => n.toLocaleString();
const time = (value: string) => `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
const field = "min-h-11 w-full border border-border bg-background px-3 text-sm";

export function ObservedCapacity({
  summary,
  importId,
  resourceInstanceId,
  planId,
  planName,
  period,
  workloadDigest,
}: {
  summary: CapacitySummary;
  importId: string;
  resourceInstanceId: string;
  planId: string;
  planName: string;
  period: ReviewPeriod;
  workloadDigest: string;
}) {
  const binding = capacityBinding({
    resourceInstanceId,
    planId,
    period,
    workloadDigest,
    capacityDigest: summary.digest,
  });
  const [manual, setManual] = useState<ManualCapacityEvent[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    setManual(readManualCapacity(importId, binding));
    setStatus("");
    setError("");
  }, [importId, binding]);
  const save = (events: ManualCapacityEvent[]) => {
    if (!saveManualCapacity(importId, binding, events)) {
      setError("This observation could not be saved locally. Check browser storage and try again.");
      return false;
    }
    setManual(events);
    setError("");
    return true;
  };
  return (
    <section
      aria-label="Observed subscription capacity"
      className="space-y-4 border-y border-border py-6"
      data-testid="observed-capacity"
    >
      <div>
        <MicroLabel>Observed subscription capacity</MicroLabel>
        <h3 className="mt-2 font-medium">{planName} · this account and cycle</h3>
      </div>
      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {[
          ["Direct hard-limit events", summary.directHardLimits],
          ["Affected sessions", summary.sessions],
          ["Days affected (UTC)", summary.days],
          ["Distinct scheduled resets", summary.scheduledResets],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-2xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="max-w-3xl text-sm" data-testid="capacity-conclusion">
        {summary.directHardLimits
          ? `StackReplay observed ${count(summary.directHardLimits)} direct capacity-limit event${summary.directHardLimits === 1 ? "" : "s"} during this cycle. These are recorded blocked attempts, not a count of independent outages. Repeated attempts can share a reset time.`
          : "No directly observable capacity-limit events were found in the available history. This does not establish that no limits were hit."}{" "}
        {manual.length
          ? `${manual.length} additional user-confirmed interruption${manual.length === 1 ? "" : "s"} recorded locally; these may overlap native events.`
          : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        {summary.historyInspected
          ? "Evidence: native client limit records."
          : "This import has no native capacity scan attached. Reimport native history to inspect it."}{" "}
        {summary.warnings} directly parsed warnings. {summary.duplicateRows} repeated capacity
        records removed. Reset times are client-reported schedules, not observed resets or proof of
        restored capacity. Missing warnings and limits may not have been preserved.
      </p>
      <details className="border-t border-border pt-2">
        <summary className="min-h-11 cursor-pointer content-center text-sm">
          Inspect capacity timeline · {summary.events.length} native records
        </summary>
        <p className="my-3 text-xs text-muted-foreground">
          All times UTC. Workload before each limit is descriptive, restricted to the imported
          account and cycle, and may be truncated at the cycle start. It does not establish the
          provider's quota accounting. No reset start or uninterrupted stretch is inferred.
        </p>
        <details>
          <summary className="min-h-11 cursor-pointer content-center text-xs">
            Daily workload and hard-limit events
          </summary>
          <ul className="space-y-1 text-xs font-mono">
            {summary.daily.map((d) => (
              <li key={d.date}>
                {d.date} · {count(d.responses)} responses · {d.hardLimits} hard-limit events
              </li>
            ))}
          </ul>
        </details>
        <ol className="divide-y divide-border">
          {summary.events.map((event) => (
            <li key={event.id} className="py-3 text-sm">
              <div className="font-mono text-xs">{time(event.timestamp)}</div>
              <p className="mt-1">
                {event.eventType === "hard_limit_reached"
                  ? "Limit reached"
                  : event.eventType === "usage_warning"
                    ? "Usage warning"
                    : event.code === "api_rate_limit"
                      ? "API rate-limit retry, subscription attribution unknown"
                      : "Usage credits exhausted, subscription attribution unknown"}{" "}
                ·{" "}
                {event.windowType === "five_hour"
                  ? "five-hour limit"
                  : event.windowType === "model"
                    ? `${event.modelLabel ?? "Model"} limit`
                    : "window unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                Direct native client evidence · session {event.sessionId.slice(-8)}
                {event.resetAt
                  ? ` · Reset shown: ${time(event.resetAt)}`
                  : " · Reset time unavailable"}
              </p>
              {event.before.length ? (
                <details>
                  <summary className="min-h-11 cursor-pointer content-center text-xs">
                    Workload before this event
                  </summary>
                  <ul className="space-y-2 text-xs">
                    {event.before.map((c) => (
                      <li key={c.hours}>
                        Prior {c.hours === 168 ? "7 days" : `${c.hours} hours`}:{" "}
                        {count(c.responses)} responses · {count(c.knownTokens)} known processed
                        tokens
                        {c.unknownTokenResponses
                          ? ` · ${c.unknownTokenResponses} responses with incomplete token accounting`
                          : ""}
                        <p className="text-muted-foreground">
                          {Object.entries(c.models)
                            .map(([model, n]) => `${model}: ${count(n)}`)
                            .join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
          {manual.map((event) => (
            <li key={event.id} className="py-3 text-sm">
              <p className="font-mono text-xs">{time(event.timestamp)}</p>
              <p>
                User-confirmed interruption
                {event.resetAt ? ` · Reset shown: ${time(event.resetAt)}` : ""}
              </p>
              {event.note ? (
                <p className="break-words text-xs text-muted-foreground">{event.note}</p>
              ) : null}
              <button
                type="button"
                className="min-h-11 text-xs underline"
                onClick={() => {
                  if (save(manual.filter((e) => e.id !== event.id)))
                    setStatus("Observation removed.");
                }}
              >
                Remove local observation at {time(event.timestamp)}
              </button>
            </li>
          ))}
        </ol>
      </details>
      <details>
        <summary className="min-h-11 cursor-pointer content-center text-sm">
          Add observed interruption
        </summary>
        <form
          className="mt-3 grid max-w-xl gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const at = String(data.get("timestamp"));
            const reset = String(data.get("resetAt"));
            const timestamp = `${at}:00.000Z`;
            const resetAt = reset ? `${reset}:00.000Z` : undefined;
            if (
              !Number.isFinite(Date.parse(timestamp)) ||
              timestamp < `${period.start}T00:00:00.000Z` ||
              timestamp >= `${period.end}T00:00:00.000Z` ||
              (resetAt && (!Number.isFinite(Date.parse(resetAt)) || resetAt < timestamp))
            ) {
              setError(
                "Enter a time within this review cycle and a reset at or after the interruption.",
              );
              return;
            }
            if (
              save([
                ...manual,
                {
                  id: crypto.randomUUID(),
                  timestamp,
                  ...(resetAt ? { resetAt } : {}),
                  note: String(data.get("note")).trim(),
                  recordedAt: new Date().toISOString(),
                  evidence: "local-user",
                },
              ])
            ) {
              form.reset();
              setStatus("Interruption saved locally for this account, plan, workload and cycle.");
            }
          }}
        >
          <p className="text-xs text-muted-foreground">
            Record only an interruption you experienced. This is your local assertion, separate from
            parsed client evidence. Check the timeline first to avoid entering the same interruption
            twice.
          </p>
          <label className="text-xs">
            Limit reached at (UTC)
            <input className={field} type="datetime-local" name="timestamp" required />
          </label>
          <label className="text-xs">
            Reset shown (UTC, optional)
            <input className={field} type="datetime-local" name="resetAt" />
          </label>
          <label className="text-xs">
            Notes (optional, local only)
            <textarea className={field} name="note" maxLength={500} />
          </label>
          <button className="min-h-11 border border-border px-3 text-sm" type="submit">
            Confirm and save interruption locally
          </button>
        </form>
      </details>
      {error ? (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      ) : null}
      <p role="status" className="text-xs">
        {status}
      </p>
      <p className="max-w-3xl text-xs text-muted-foreground">
        This establishes observed interruptions for this account and plan, not universal capacity, a
        future quota, equivalent API experience, or whether these limits were acceptable to you.
        Capacity observations and notes stay local and are excluded from shared results.
      </p>
      <details>
        <summary className="min-h-11 cursor-pointer content-center text-xs">
          Calibration provenance
        </summary>
        <p className="break-all font-mono text-xs">
          Method: {summary.methodology}
          <br />
          Account: {resourceInstanceId}
          <br />
          Plan: {planId}
          <br />
          Cycle: {period.start} inclusive to {period.end} exclusive
          <br />
          Workload: {workloadDigest}
          <br />
          Evidence: {summary.digest}
        </p>
        <p className="text-xs text-muted-foreground">
          Native event identities are retained in the local import. Changing account, plan, period
          or evidence invalidates local manual assertions for this view. Parsed observations are
          recalculated for the selected scope.
        </p>
      </details>
    </section>
  );
}
