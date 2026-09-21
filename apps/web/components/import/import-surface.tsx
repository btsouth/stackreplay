"use client";

import {
  type DemoWorkloadPresetId,
  demoWorkloadPresetIds,
  demoWorkloadPresets,
} from "@stackreplay/test-fixtures";
import { Button, buttonVariants, Card, CardContent, Metric } from "@stackreplay/ui";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createLocalImportId } from "@/lib/idb";
import { describeWorkerFailure, getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord, SafeError } from "@/lib/worker-protocol";

/**
 * Import surface (M3 brief).
 *
 * Three entry paths: drag/drop, file picker and deterministic demo data. No
 * account, no API key, no upload. The file is handed to the Worker as a File,
 * read and validated there, and the main thread only ever receives progress,
 * a summary and errors that are safe to display.
 *
 * Privacy is stated as product value at the point of action, not as footer
 * legalese, because it is the reason the file never leaves the browser.
 */

type Phase = "idle" | "reading" | "validating" | "preparing" | "ready";

const PHASE_ORDER: Phase[] = ["reading", "validating", "preparing", "ready"];
const PHASE_LABEL: Record<Phase, string> = {
  idle: "Waiting for a file",
  reading: "Reading",
  validating: "Validating",
  preparing: "Preparing workload",
  ready: "Ready",
};

export function ImportSurface({ initialImports }: { initialImports: ImportRecord[] }) {
  const client = getWorkerClient();
  const inputId = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  const [record, setRecord] = useState<ImportRecord | undefined>(undefined);
  const [imports, setImports] = useState<ImportRecord[]>(initialImports);
  const [busy, setBusy] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const refreshImports = useCallback(async () => {
    try {
      setImports(await client.listImports());
    } catch {
      setImports([]);
    }
  }, [client]);

  useEffect(() => {
    void refreshImports();
  }, [refreshImports]);

  const runImport = useCallback(
    async (
      run: (onProgress: (next: Phase, nextDetail?: string) => void) => Promise<ImportRecord>,
    ) => {
      setBusy(true);
      setError(undefined);
      setRecord(undefined);
      setPhase("reading");
      setDetail(undefined);
      // A superseded request must not clear the interface state a newer request
      // owns, so the busy flag is only released by the request that still owns it.
      let superseded = false;
      try {
        const imported = await run((next, nextDetail) => {
          setPhase(next);
          setDetail(nextDetail);
        });
        setRecord(imported);
        setPhase("ready");
        await refreshImports();
      } catch (failure) {
        if (failure instanceof SupersededError) {
          superseded = true;
          return;
        }
        setError(describeWorkerFailure(failure));
        setPhase("idle");
      } finally {
        if (!superseded) setBusy(false);
      }
    },
    [refreshImports],
  );

  const importFile = useCallback(
    (file: File) =>
      runImport((onProgress) =>
        client.importFile(file, {
          importId: createLocalImportId(),
          label: file.name.replace(/\.json$/u, ""),
          now: new Date().toISOString(),
          onProgress: (next, nextDetail) => onProgress(next as Phase, nextDetail),
        }),
      ),
    [client, runImport],
  );

  const importDemo = useCallback(
    (preset: DemoWorkloadPresetId) =>
      runImport((onProgress) =>
        client.importDemo(preset, {
          importId: createLocalImportId(),
          now: new Date().toISOString(),
          onProgress: (next, nextDetail) => onProgress(next as Phase, nextDetail),
        }),
      ),
    [client, runImport],
  );

  const removeImport = useCallback(
    async (importId: string) => {
      await client.deleteImport(importId).catch(() => undefined);
      if (record?.id === importId) setRecord(undefined);
      await refreshImports();
    },
    [client, record?.id, refreshImports],
  );

  const clearAll = useCallback(async () => {
    await client.clearLocalData().catch(() => undefined);
    setRecord(undefined);
    setPhase("idle");
    await refreshImports();
  }, [client, refreshImports]);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file !== undefined) void importFile(file);
    },
    [importFile],
  );

  const activePhaseIndex = PHASE_ORDER.indexOf(phase === "idle" ? "reading" : phase);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-6">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: this is a drop
            target, not a control. The file input inside it is the keyboard and
            screen-reader path; dragging is an additional convenience. */}
        <div
          ref={dropRef}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          data-testid="import-dropzone"
          data-drag-active={dragActive ? "true" : "false"}
          className={[
            "rounded-lg border border-dashed p-8 transition-colors",
            dragActive ? "border-accent bg-surface-2" : "border-border-strong bg-surface",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-medium">Drop a StackReplay export</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The file is read by this browser. Nothing is uploaded.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={inputId} className="sr-only">
                Choose a StackReplay export file
              </label>
              <input
                id={inputId}
                type="file"
                accept=".json,application/json"
                className="block w-full max-w-xs cursor-pointer rounded-md border border-control-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-xs file:font-medium"
                data-testid="import-file-input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) void importFile(file);
                }}
              />
              <span className="text-xs text-muted-foreground">
                or drop a file above, or start from a demo workload
              </span>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div>
              <h2 className="text-sm font-medium">Demo workloads</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Deterministic synthetic data. No personal history is ever used as a demo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" data-testid="demo-presets">
              {demoWorkloadPresetIds.map((presetId) => (
                <Button
                  key={presetId}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  data-testid={`demo-${presetId}`}
                  onClick={() => void importDemo(presetId)}
                >
                  {demoWorkloadPresets[presetId].name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{demoWorkloadPresets.heavy.description}</p>
          </CardContent>
        </Card>

        <Card aria-live="polite" aria-busy={busy}>
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="text-sm font-medium">Import progress</h2>
            <ol className="flex flex-wrap gap-x-6 gap-y-2" data-testid="import-phases">
              {PHASE_ORDER.map((entry, index) => {
                const state =
                  phase === "idle"
                    ? "pending"
                    : index < activePhaseIndex || phase === "ready"
                      ? "done"
                      : index === activePhaseIndex
                        ? "active"
                        : "pending";
                return (
                  <li
                    key={entry}
                    data-phase={entry}
                    data-state={state}
                    aria-current={state === "active" ? "step" : undefined}
                    className={[
                      "flex items-center gap-2 text-sm",
                      // The current step is marked by weight and aria-current, not
                      // by a low-contrast colour: phase state must not rely on
                      // colour alone, and reduced opacity failed contrast checks.
                      state === "active" ? "font-medium text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "size-1.5 rounded-full",
                        state === "active"
                          ? "bg-accent"
                          : state === "done"
                            ? "bg-positive"
                            : "bg-border-strong",
                      ].join(" ")}
                    />
                    {PHASE_LABEL[entry]}
                  </li>
                );
              })}
            </ol>
            {detail !== undefined && phase !== "ready" ? (
              <p className="text-xs text-muted-foreground">{detail}</p>
            ) : null}
            {busy ? (
              <p className="text-xs text-muted-foreground" data-testid="import-working">
                Working in a background Worker. This page stays responsive.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {error !== undefined ? (
          <Card role="alert" data-testid="import-error" className="border-negative/40">
            <CardContent className="flex flex-col gap-2 p-5">
              <h2 className="text-sm font-medium text-negative">{error.title}</h2>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              {error.hint !== undefined ? (
                <p className="text-xs text-muted-foreground">{error.hint}</p>
              ) : null}
              {error.details !== undefined && error.details.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                  {error.details.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {record !== undefined ? (
          <Card data-testid="import-summary" className="border-positive/40">
            <CardContent className="flex flex-col gap-5 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">StackReplay understood your file</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.label} · stored only in this browser
                  </p>
                </div>
                <Link
                  href={`/app/replay?import=${record.id}`}
                  data-testid="continue-to-replay"
                  className={buttonVariants({ size: "sm" })}
                >
                  Replay this workload
                </Link>
              </div>
              <ImportSummaryGrid record={record} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <Card className="bg-surface-2">
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-medium">Processed locally in your browser</h2>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>No prompts.</li>
              <li>No responses.</li>
              <li>No source code.</li>
              <li>No file paths or repository names.</li>
              <li>Nothing uploaded. There is no import endpoint.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Replay runs in a Web Worker on this device, using the same deterministic engine as the
              CLI.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium">Stored in this browser</h2>
              {imports.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="clear-local-data"
                  onClick={() => void clearAll()}
                >
                  Clear all local data
                </Button>
              ) : null}
            </div>
            {imports.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-testid="no-stored-imports">
                No workloads stored yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border" data-testid="stored-imports">
                {imports.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.eventCount.toLocaleString("en-US")} events ·{" "}
                        {new Date(entry.createdAt).toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/app/replay?import=${entry.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Replay
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-testid={`delete-import-${entry.id}`}
                        onClick={() => void removeImport(entry.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Workload summary: usage sources and orchestration are separate concepts. */
export function ImportSummaryGrid({ record }: { record: ImportRecord }) {
  const { summary } = record;
  const range =
    summary.firstEventAt !== undefined && summary.lastEventAt !== undefined
      ? `${summary.firstEventAt.slice(0, 10)} to ${summary.lastEventAt.slice(0, 10)}`
      : "unknown";
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Events" value={summary.eventCount.toLocaleString("en-US")} size="lg" />
        <Metric label="Sessions" value={summary.sessionCount.toLocaleString("en-US")} />
        <Metric label="Projects" value={summary.projectCount.toLocaleString("en-US")} />
        <Metric
          label="Known tokens"
          value={summary.tokens.known.toLocaleString("en-US")}
          hint={
            summary.tokens.unknownEvents > 0
              ? `${summary.tokens.unknownEvents} events unknown`
              : "complete"
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">Activity range: {range}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Usage sources
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5" data-testid="usage-sources">
            {summary.usageSources.length === 0 ? (
              <li className="text-sm text-muted-foreground">No usage events found.</li>
            ) : (
              summary.usageSources.map((source) => (
                <li
                  key={source.adapterId}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span>{source.name}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {source.events.toLocaleString("en-US")} events
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Orchestration
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5" data-testid="orchestration">
            {summary.orchestration.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                No orchestration metadata in this file.
              </li>
            ) : (
              summary.orchestration.map((entry) => (
                <li
                  key={entry.harnessId}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span>{entry.name}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {entry.precise
                      ? `${entry.sessions.toLocaleString("en-US")} sessions attributed`
                      : "attribution available"}
                  </span>
                </li>
              ))
            )}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Orchestration describes which harness drove a session. Consumption is always counted
            from the underlying source, never twice.
          </p>
        </div>
      </div>

      {summary.otherSources.length > 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="other-sources">
          Detected with no events in this file:{" "}
          {summary.otherSources.map((source) => source.name).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
