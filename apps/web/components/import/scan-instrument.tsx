"use client";

import type { CSSProperties, ReactNode } from "react";
import { LargeHistoryNote } from "@/components/import/large-history-note";
import type { ImportRecord, ScanProgress } from "@/lib/worker-protocol";

export type ScanStage = "idle" | "discover" | "resolve" | "reconstruct" | "finishing" | "ready";

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
 * this device and the raw history stays there.
 *
 * A scan of several histories (from discovery) also shows each history's own
 * files read of files selected and events found, in the order they were
 * chosen, so the rows the user selected carry straight into the scan.
 */
export function ScanInstrument({
  stage,
  sourceName,
  scan,
  detail,
  record,
  ready,
  histories,
  largeHistoryBytes,
  onCancel,
}: {
  stage: ScanStage;
  sourceName: string | undefined;
  scan: ScanProgress | undefined;
  detail: string | undefined;
  record?: ImportRecord | undefined;
  /** The completed scan's actions and evidence, shown under the resolved facts. */
  ready?: ReactNode;
  /** The histories chosen for this scan, in order, with their discovered file counts. */
  histories?: readonly { id: string; name: string; files: number }[] | undefined;
  /** A selection above the large-history threshold, noted while the scan runs. */
  largeHistoryBytes?: number | undefined;
  /** Stops the scan in progress; saved workloads are not touched. */
  onCancel?: (() => void) | undefined;
}) {
  const activeIndex =
    stage === "idle"
      ? -1
      : stage === "finishing"
        ? SCAN_STAGES.length - 1
        : SCAN_STAGES.findIndex((entry) => entry.stage === stage);
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
          Local scan · raw history stays on this device
        </p>
        <p className="sr-micro text-muted-foreground">
          {stage === "ready"
            ? "Workload ready"
            : stage === "finishing"
              ? "Finishing value and insight analysis"
              : running
                ? `Reading ${sourceName ?? "your selection"} on this device`
                : "Waiting for a folder"}
        </p>
      </div>

      <p className="sr-only" role="status">
        {stage === "ready"
          ? `Workload ready${summary === undefined ? "" : `: ${count.format(summary.eventCount)} ${summary.eventCount === 1 ? "call" : "calls"}`}`
          : stage === "finishing"
            ? "Finishing the published API value and strongest insight."
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
                <small>
                  {stage === "finishing" && index === SCAN_STAGES.length - 1
                    ? "Pricing and finding insights"
                    : entry.note}
                </small>
              </li>
            );
          })}
        </ol>
      </div>

      {stage === "ready" && summary !== undefined ? (
        <div className="sr-scan-body">
          <h2 className="sr-scan-title">Workload ready</h2>
          <dl className="sr-scan-facts" data-testid="scan-ready-facts">
            <Fact label="Calls" value={count.format(summary.eventCount)} />
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
              ? "No dated calls"
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
                label="Calls"
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
          {histories !== undefined && histories.length > 1 ? (
            <HistoryLedger histories={histories} scan={scan} />
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
          {running && largeHistoryBytes !== undefined ? (
            <LargeHistoryNote bytes={largeHistoryBytes} />
          ) : null}
          {running ? (
            <div className="sr-scan-foot">
              <p className="sr-scan-detail" data-testid="import-working">
                {detail !== undefined && (scan === undefined || stage === "finishing")
                  ? `${detail}. `
                  : ""}
                A background Worker does this work on this device; this page stays responsive.
              </p>
              {onCancel === undefined ? null : (
                <button
                  type="button"
                  className="sr-scan-cancel"
                  onClick={onCancel}
                  data-testid="cancel-scan"
                >
                  Cancel scan
                </button>
              )}
            </div>
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

/**
 * Each chosen history's own progress: files read of the files discovery found
 * for it, and the events its files produced. A history whose files the Worker
 * has not reached yet is waiting; nothing here is estimated.
 */
function HistoryLedger({
  histories,
  scan,
}: {
  histories: readonly { id: string; name: string; files: number }[];
  scan: ScanProgress | undefined;
}) {
  const progress = new Map((scan?.histories ?? []).map((entry) => [entry.id, entry]));
  return (
    <div className="sr-scan-histories" data-testid="scan-histories">
      <p className="sr-micro text-muted-foreground">Histories</p>
      <ul>
        {histories.map((history) => {
          const entry = progress.get(history.id);
          const total = entry?.filesTotal ?? history.files;
          const done = entry?.filesDone ?? 0;
          const state = done === 0 ? "waiting" : done >= total ? "done" : "reading";
          return (
            <li key={history.id} data-state={state} data-testid={`scan-history-${history.id}`}>
              <span className="sr-scan-history-name" title={history.name}>
                {history.name}
              </span>
              <i aria-hidden="true">
                <b style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }} />
              </i>
              <span className="sr-scan-history-files">
                {state === "waiting"
                  ? `waiting · ${count.format(total)} files`
                  : `${count.format(done)} / ${count.format(total)} files`}
              </span>
              <strong>
                {entry === undefined || entry.events === 0
                  ? ""
                  : `${count.format(entry.events)} calls`}
              </strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
