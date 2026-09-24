"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ImportRecord, ScanProgress } from "@/lib/worker-protocol";

export type ScanStage = "idle" | "discover" | "resolve" | "reconstruct" | "ready";

/** The worker's import phases, in order, as the stage rail names them. */
export const SCAN_STAGES: readonly {
  phase: "reading" | "validating" | "preparing" | "ready";
  stage: Exclude<ScanStage, "idle">;
  label: string;
  note: string;
}[] = [
  { phase: "reading", stage: "discover", label: "Discover", note: "Finding session files" },
  {
    phase: "validating",
    stage: "resolve",
    label: "Resolve",
    note: "Recognizing each file's tool and model IDs",
  },
  {
    phase: "preparing",
    stage: "reconstruct",
    label: "Reconstruct",
    note: "Removing duplicates, rebuilding sessions and chronology",
  },
  { phase: "ready", stage: "ready", label: "Workload", note: "Normalized usage, ready to read" },
];

const count = new Intl.NumberFormat("en-US");

function megabytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function tokens(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

function shortDate(iso: string | undefined): string | undefined {
  if (iso === undefined) return undefined;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The local scan, drawn as a StackReplay instrument.
 *
 * A scan is StackReplay constructing the workload, so it uses the Replay
 * visual language: a Signal Blue path through real stages (discover, resolve,
 * reconstruct) into the workload. Every reading is a real running total from
 * the Worker: files read of files selected, sessions, events, projects, bytes,
 * and the model mix and busiest projects as they emerge. There is no invented
 * percentage; the only fraction drawn is files read over files selected.
 *
 * The privacy state is an instrument status, not a banner: the scan runs on
 * this device and the raw history is never uploaded.
 */
export function ScanInstrument({
  stage,
  sourceName,
  scan,
  detail,
  record,
  ready,
}: {
  stage: ScanStage;
  sourceName: string | undefined;
  scan: ScanProgress | undefined;
  detail: string | undefined;
  record?: ImportRecord | undefined;
  /** The completed scan's actions and evidence, shown under the resolved facts. */
  ready?: ReactNode;
}) {
  const activeIndex =
    stage === "idle" ? -1 : SCAN_STAGES.findIndex((entry) => entry.stage === stage);
  const fileShare =
    scan !== undefined && scan.filesTotal > 0 ? Math.min(1, scan.filesDone / scan.filesTotal) : 0;
  // The path is lit through every completed stage; inside Resolve it advances
  // by files read over files selected, which is the one real fraction a scan has.
  const lit =
    stage === "idle"
      ? 0
      : Math.min(1, (activeIndex + 1 + (stage === "resolve" ? fileShare : 0)) / SCAN_STAGES.length);
  const running = stage !== "idle" && stage !== "ready";
  const summary = record?.summary;
  const cacheShare =
    summary !== undefined && summary.tokens.known > 0
      ? (summary.tokens.buckets.cacheReadTokens / summary.tokens.known) * 100
      : undefined;

  return (
    <section
      aria-busy={running}
      aria-label="Local scan"
      className="sr-scan"
      data-stage={stage}
      data-testid="scan-instrument"
    >
      <div className="sr-scan-status">
        <p className="sr-micro" data-testid="scan-privacy-status">
          <span aria-hidden="true" className="sr-scan-dot" />
          Local scan · raw history never uploaded
        </p>
        <p className="sr-micro text-muted-foreground">
          {stage === "ready"
            ? "Workload ready"
            : running
              ? `Reading ${sourceName ?? "your selection"} on this device`
              : "Waiting for a folder"}
        </p>
      </div>

      <p className="sr-only" role="status">
        {stage === "ready"
          ? `Workload ready${summary === undefined ? "" : `: ${count.format(summary.eventCount)} events`}`
          : running
            ? `Scan stage: ${SCAN_STAGES[activeIndex]?.label ?? "Discover"}. ${SCAN_STAGES[activeIndex]?.note ?? ""}`
            : ""}
      </p>
      <div className="sr-scan-rail" style={{ "--lit": lit } as CSSProperties}>
        <span aria-hidden="true" className="sr-scan-track">
          <span className="sr-scan-lit" />
        </span>
        <ol aria-label="Scan stages" data-testid="import-phases">
          <li aria-hidden="true" className="sr-scan-node" data-state="done">
            <span className="sr-scan-knot" />
            <span className="sr-micro">Local history</span>
            <small>{sourceName ?? "Your folder"}</small>
          </li>
          {SCAN_STAGES.map((entry, index) => {
            const state =
              stage === "idle"
                ? "pending"
                : stage === "ready" || index < activeIndex
                  ? "done"
                  : index === activeIndex
                    ? "active"
                    : "pending";
            return (
              <li
                aria-current={state === "active" ? "step" : undefined}
                className="sr-scan-node"
                data-phase={entry.phase}
                data-state={state}
                key={entry.phase}
              >
                <span aria-hidden="true" className="sr-scan-knot" />
                <span className="sr-micro">{entry.label}</span>
                <small>{entry.note}</small>
              </li>
            );
          })}
        </ol>
      </div>

      {stage === "ready" && summary !== undefined ? (
        <div className="sr-scan-body">
          <h2 className="sr-scan-title">Workload ready</h2>
          <dl className="sr-scan-facts" data-testid="scan-ready-facts">
            <Fact label="Events" value={count.format(summary.eventCount)} />
            <Fact
              label="Sessions"
              value={summary.sessionCount === 0 ? "N/A" : count.format(summary.sessionCount)}
            />
            <Fact
              label="Projects"
              value={summary.projectCount === 0 ? "N/A" : count.format(summary.projectCount)}
            />
            <Fact
              label="Known tokens"
              note={cacheShare === undefined ? undefined : `${cacheShare.toFixed(1)}% cache reads`}
              value={tokens(summary.tokens.known)}
            />
          </dl>
          <p className="sr-scan-range">
            {shortDate(summary.firstEventAt) === undefined
              ? "No dated events"
              : `${shortDate(summary.firstEventAt)} to ${shortDate(summary.lastEventAt)}`}
            {summary.usageSources.length > 0
              ? ` · ${summary.usageSources.map((source) => source.name).join(" · ")}`
              : ""}
          </p>
          {ready}
        </div>
      ) : (
        <div className="sr-scan-body">
          {/* Sessions, events and projects appear once the Worker reports
              their real totals. */}
          {scan !== undefined ? (
            <dl className="sr-scan-readings" data-testid="scan-readings">
              <Reading
                label="Files read"
                value={`${count.format(scan.filesDone)} / ${count.format(scan.filesTotal)}`}
              />
              <Reading label="Sessions" value={count.format(scan.sessions)} />
              <Reading
                label="Events"
                note="before duplicates are removed"
                value={count.format(scan.events)}
              />
              <Reading label="Projects" value={count.format(scan.projects)} />
              <Reading
                label="Examined"
                note={
                  scan.skipped === 0
                    ? undefined
                    : `${count.format(scan.skipped)} skipped, listed after the scan`
                }
                value={megabytes(scan.examinedBytes)}
              />
            </dl>
          ) : null}
          {scan !== undefined && (scan.models.length > 0 || scan.topProjects.length > 0) ? (
            <div className="sr-scan-ledger" data-testid="scan-emerging">
              <Emerging
                label="Model mix so far"
                rows={scan.models.map((row) => ({ name: row.name, events: row.events }))}
              />
              <Emerging
                label="Busiest projects so far"
                note="Folder names stay in this browser."
                rows={scan.topProjects.map((row) => ({ name: row.label, events: row.events }))}
              />
            </div>
          ) : null}
          {running ? (
            <p className="sr-scan-detail" data-testid="import-working">
              {scan === undefined && detail !== undefined ? `${detail}. ` : ""}A background Worker
              does this work on this device; this page stays responsive.
            </p>
          ) : null}
          {stage === "idle" ? (
            <p className="sr-scan-detail">
              Choose a source above. Nothing is read until you do, and only usage counts are kept:
              prompts, responses, code and paths are discarded.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string | undefined }) {
  return (
    <div>
      <dt className="sr-micro">{label}</dt>
      <dd>
        {value}
        {note === undefined ? null : <small className="sr-scan-sub">{note}</small>}
      </dd>
    </div>
  );
}

function Reading({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | undefined;
}) {
  return (
    <div>
      <dt className="sr-micro">{label}</dt>
      <dd>
        {value}
        {note === undefined ? null : <small className="sr-scan-sub">{note}</small>}
      </dd>
    </div>
  );
}

function Emerging({
  label,
  rows,
  note,
}: {
  label: string;
  rows: readonly { name: string; events: number }[];
  note?: string;
}) {
  if (rows.length === 0) return <div />;
  const max = Math.max(1, ...rows.map((row) => row.events));
  return (
    <div>
      <p className="sr-micro text-muted-foreground">{label}</p>
      <ul>
        {rows.map((row) => (
          <li key={row.name}>
            <span title={row.name}>{row.name}</span>
            <i aria-hidden="true">
              <b style={{ width: `${(row.events / max) * 100}%` }} />
            </i>
            <strong>{count.format(row.events)}</strong>
          </li>
        ))}
      </ul>
      {note === undefined ? null : <p className="sr-scan-note">{note}</p>}
    </div>
  );
}
