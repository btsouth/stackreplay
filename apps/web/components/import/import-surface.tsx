"use client";

import { BROWSER_SOURCE_FORMATS } from "@stackreplay/adapters/browser-formats";
import {
  type DemoWorkloadPresetId,
  demoWorkloadPresetIds,
  demoWorkloadPresets,
} from "@stackreplay/test-fixtures";
import { Button, buttonVariants, Card, CardContent, Metric } from "@stackreplay/ui";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createLocalImportId } from "@/lib/idb";
import { importSizeAdvice } from "@/lib/import-validation";
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

/** Replay link for an import, carrying a preselected target when there is one. */
function replayHref(importId: string, target?: string | undefined): string {
  return target === undefined
    ? `/app/replay?import=${importId}`
    : `/app/replay?import=${importId}&target=${encodeURIComponent(target)}`;
}

export function ImportSurface({
  initialImports,
  initialTarget,
}: {
  initialImports: ImportRecord[];
  /** Plan id chosen on a public plan page; forwarded to the replay surface. */
  initialTarget?: string | undefined;
}) {
  const client = getWorkerClient();
  const inputId = useId();
  const sourceInputId = useId();
  const folderInputId = useId();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [folderSupported, setFolderSupported] = useState(true);
  const [saveLocal, setSaveLocal] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  /** A large-but-allowed file: said out loud before the work starts. */
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [record, setRecord] = useState<ImportRecord | undefined>(undefined);
  const [visibleOutcomes, setVisibleOutcomes] = useState(30);
  const [imports, setImports] = useState<ImportRecord[]>(initialImports);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({ source: "", folder: "", workload: "" });
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => setReady(true), []);

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

  useEffect(() => {
    const input = folderInputRef.current;
    if (input === null) return;
    setFolderSupported(
      (input as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory === true,
    );
  }, []);

  const runImport = useCallback(
    async (
      run: (onProgress: (next: Phase, nextDetail?: string) => void) => Promise<ImportRecord>,
    ) => {
      setBusy(true);
      setError(undefined);
      setRecord(undefined);
      setVisibleOutcomes(30);
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

  /**
   * A file larger than the browser can realistically parse is refused here with a
   * real explanation, and one that is merely large warns before the work starts:
   * the size guard alone could only fire after the read had already been attempted
   * (benchmark finding F008). The Worker applies the same rule, so this is advice
   * rather than the boundary.
   */
  const importFile = useCallback(
    (file: File) => {
      const advice = importSizeAdvice(file.size);
      if (advice.level === "refused") {
        void client.cancelImport().catch(() => undefined);
        setBusy(false);
        setRecord(undefined);
        setPhase("idle");
        setError({
          code: "FILE_TOO_LARGE",
          title: "This file is larger than StackReplay imports in the browser.",
          message: `The file is ${advice.readableSize}; the browser limit is ${advice.readableLimit}.`,
          hint: "Export a narrower date range with `stackreplay export --since <date>`.",
        });
        return;
      }
      setNotice(advice.level === "large" ? advice.message : undefined);
      return runImport((onProgress) =>
        client.importFile(file, {
          importId: createLocalImportId(),
          label: file.name.replace(/\.json$/u, ""),
          now: new Date().toISOString(),
          saveLocal,
          onProgress: (next, nextDetail) => onProgress(next as Phase, nextDetail),
        }),
      );
    },
    [client, runImport, saveLocal],
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

  const importSources = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setNotice(undefined);
      return runImport((onProgress) =>
        client.importSources(
          files.map((file) => ({ file, path: file.webkitRelativePath || file.name })),
          {
            importId: createLocalImportId(),
            now: new Date().toISOString(),
            saveLocal,
            onProgress: (next, nextDetail) => onProgress(next as Phase, nextDetail),
          },
        ),
      );
    },
    [client, runImport, saveLocal],
  );

  const exportWorkload = useCallback(
    async (importId: string) => {
      try {
        const bytes = await client.exportImport(importId);
        const url = URL.createObjectURL(
          new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/json" }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "workload.stackreplay.json";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      } catch (failure) {
        setError(describeWorkerFailure(failure));
      }
    },
    [client],
  );

  /**
   * Deleting and clearing report their failures. Both used to swallow every
   * error, so a deletion that did not happen looked exactly like one that did
   * (benchmark finding F007).
   */
  const removeImport = useCallback(
    async (importId: string) => {
      try {
        await client.deleteImport(importId);
      } catch (failure) {
        setError(describeWorkerFailure(failure));
        return;
      }
      if (record?.id === importId) setRecord(undefined);
      await refreshImports();
    },
    [client, record?.id, refreshImports],
  );

  const clearAll = useCallback(async () => {
    try {
      await client.clearLocalData();
    } catch (failure) {
      setError(describeWorkerFailure(failure));
      return;
    }
    setRecord(undefined);
    setPhase("idle");
    await refreshImports();
  }, [client, refreshImports]);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length === 1 && files[0]?.name.endsWith(".stackreplay.json"))
        void importFile(files[0]);
      else void importSources(files);
    },
    [importFile, importSources],
  );

  const activePhaseIndex = PHASE_ORDER.indexOf(phase === "idle" ? "reading" : phase);

  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start"
      data-testid="intake-surface"
      data-ready={ready}
    >
      <div className="flex min-w-0 flex-col gap-5">
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
            "border border-dashed p-5 transition-colors sm:p-6",
            dragActive ? "border-accent bg-surface-2" : "border-border-strong bg-transparent",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-medium">Load workload</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your selected workload files are processed in this browser. StackReplay does not
                upload the raw workload files.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
                <label htmlFor={sourceInputId} className="text-sm font-medium">
                  Source files or ZIP
                </label>
                <div className="relative flex min-h-12 min-w-0 items-center justify-between gap-3 border border-control-border bg-surface px-3 py-2 text-sm transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <span
                    className="min-w-0 text-foreground [overflow-wrap:anywhere]"
                    id={`${sourceInputId}-selection`}
                  >
                    {selectedFiles.source || "Choose files or ZIP"}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-xs text-accent">
                    Browse
                  </span>
                  <input
                    id={sourceInputId}
                    type="file"
                    disabled={!ready}
                    multiple
                    accept=".json,.jsonl,.zip,application/json,application/zip"
                    aria-describedby={`${sourceInputId}-selection`}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    data-testid="source-file-input"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setSelectedFiles((current) => ({
                        ...current,
                        source:
                          files.length === 1
                            ? (files[0]?.name ?? "")
                            : `${files.length} files selected`,
                      }));
                      void importSources(files);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
                <label htmlFor={folderInputId} className="text-sm font-medium">
                  Selected folder
                </label>
                <div className="relative flex min-h-12 min-w-0 items-center justify-between gap-3 border border-control-border bg-surface px-3 py-2 text-sm transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <span
                    className="min-w-0 text-foreground [overflow-wrap:anywhere]"
                    id={`${folderInputId}-selection`}
                  >
                    {selectedFiles.folder || "Choose folder"}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-xs text-accent">
                    Browse
                  </span>
                  <input
                    id={folderInputId}
                    ref={folderInputRef}
                    type="file"
                    disabled={!ready}
                    multiple
                    {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                    aria-describedby={`${folderInputId}-selection`}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    data-testid="source-folder-input"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setSelectedFiles((current) => ({
                        ...current,
                        folder:
                          files.length === 0
                            ? ""
                            : `${files[0]?.webkitRelativePath?.split("/")[0] || "Folder"} · ${files.length} files selected`,
                      }));
                      void importSources(files);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
              {!folderSupported ? (
                <p className="text-xs text-muted-foreground">
                  Folder selection is unavailable in this browser. Choose files above instead.
                </p>
              ) : null}
              <div className="grid gap-1.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center">
                <label htmlFor={inputId} className="text-sm font-medium">
                  StackReplay workload
                </label>
                <div className="relative flex min-h-12 min-w-0 items-center justify-between gap-3 border border-control-border bg-surface px-3 py-2 text-sm transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                  <span
                    className="min-w-0 text-foreground [overflow-wrap:anywhere]"
                    id={`${inputId}-selection`}
                  >
                    {selectedFiles.workload || "Choose workload file"}
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-xs text-accent">
                    Browse
                  </span>
                  <input
                    id={inputId}
                    type="file"
                    disabled={!ready}
                    accept=".stackreplay.json,.json,application/json"
                    aria-describedby={`${inputId}-selection`}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    data-testid="import-file-input"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file !== undefined) {
                        setSelectedFiles((current) => ({ ...current, workload: file.name }));
                        void importFile(file);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use an existing CLI export here, or drop selected files above. If your browser
                cannot select a folder, choose its files instead.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                disabled={!ready}
                checked={saveLocal}
                onChange={(event) => setSaveLocal(event.target.checked)}
              />
              Save normalized workload on this browser
            </label>
            <p className="text-xs text-muted-foreground">
              Supported raw files:{" "}
              {BROWSER_SOURCE_FORMATS.map((source) => `${source.name} ${source.format}`).join(", ")}
              . Other formats are reported without guessing.
            </p>
          </div>
        </div>

        <Card className="rounded-none border-x-0 border-b-0 bg-transparent px-0 shadow-none">
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
                  disabled={busy || !ready}
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

        <Card
          aria-busy={busy}
          className="rounded-none border-x-0 border-b-0 bg-transparent px-0 shadow-none"
        >
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="text-sm font-medium">Import progress</h2>
            <p className="sr-only" role="status">
              {busy
                ? `Import ${PHASE_LABEL[phase]}`
                : phase === "ready"
                  ? "Import ready"
                  : "Import idle"}
            </p>
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

        {notice === undefined ? null : (
          <Card data-testid="import-size-notice" className="border-warning/40">
            <CardContent className="flex flex-col gap-1 pt-6">
              <h2 className="text-sm font-medium text-warning">Large import</h2>
              <p className="text-sm text-muted-foreground">{notice}</p>
            </CardContent>
          </Card>
        )}

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
          <Card data-testid="import-summary" className="min-w-0 border-positive/40">
            <CardContent className="flex min-w-0 flex-col gap-5 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-medium">StackReplay understood your file</h2>
                  <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {record.label} ·{" "}
                    {record.savedLocally === false
                      ? "temporary until reload"
                      : "saved on this browser"}
                  </p>
                </div>
                <Link
                  href={replayHref(record.id, initialTarget)}
                  data-testid="continue-to-replay"
                  className={buttonVariants({ size: "sm" })}
                >
                  Replay this workload
                </Link>
              </div>
              <ImportSummaryGrid record={record} />
              {record.intake !== undefined ? (
                <div data-testid="intake-review" className="border-t border-border pt-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide">
                    Selected file review
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.intake.exactDuplicates} exact event duplicates removed ·{" "}
                    {record.intake.overlaps} recognized overlaps
                  </p>
                  <ul className="mt-3 divide-y divide-border text-xs">
                    {record.intake.outcomes.slice(0, visibleOutcomes).map((item) => (
                      <li
                        key={`${item.path}-${item.status}-${item.reason}`}
                        className="flex min-w-0 flex-wrap justify-between gap-2 py-2"
                      >
                        <span className="min-w-0 break-all font-mono">{item.path}</span>
                        <span className="min-w-0 break-words">
                          {item.source ?? item.status} · {item.reason} · {item.events} events
                        </span>
                      </li>
                    ))}
                  </ul>
                  {record.intake.outcomes.length > visibleOutcomes ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleOutcomes((count) => count + 30)}
                    >
                      Show more files ({record.intake.outcomes.length - visibleOutcomes} remaining)
                    </Button>
                  ) : null}
                  {record.intake.warnings.length > 0 ? (
                    <div className="mt-3 text-xs text-muted-foreground">
                      <h4 className="font-medium">
                        Source notes ({record.intake.warnings.length})
                      </h4>
                      <ul className="mt-1 list-inside list-disc">
                        {record.intake.warnings.slice(0, 12).map((warning) => (
                          <li key={`${warning.code}-${warning.message}`} className="break-words">
                            {warning.code}: {warning.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void exportWorkload(record.id)}
              >
                Export portable workload
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card className="bg-surface-2">
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="text-sm font-medium">Processed locally in your browser</h2>
            <p className="text-xs text-muted-foreground">
              Saved and exported workloads contain replay telemetry, with:
            </p>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>No prompts.</li>
              <li>No responses.</li>
              <li>No source code.</li>
              <li>No file paths or repository names.</li>
              <li>Selected raw workload files are never uploaded to StackReplay.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Replay runs in a Web Worker on this device, using the same deterministic engine as the
              CLI.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium">Local workloads</h2>
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
                {imports.map((entry, index) => (
                  <li
                    key={entry.id}
                    className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium [overflow-wrap:anywhere]">
                        {entry.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {entry.eventCount.toLocaleString("en-US")} events ·{" "}
                        {entry.savedLocally === false
                          ? "temporary until reload"
                          : "saved on this browser"}{" "}
                        · {new Date(entry.createdAt).toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <div
                      className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0 sm:items-center"
                      data-testid="stored-import-actions"
                    >
                      <Link
                        href={replayHref(entry.id, initialTarget)}
                        aria-label={`Replay ${entry.label}${imports.length > 1 ? `, workload ${index + 1} of ${imports.length}` : ""}`}
                        className={`${buttonVariants({ variant: "ghost", size: "sm" })} min-h-11 justify-center sm:min-h-0`}
                      >
                        Replay
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 border border-negative/40 text-negative sm:min-h-0"
                        data-testid={`delete-import-${entry.id}`}
                        aria-label={`Delete ${entry.label}${imports.length > 1 ? `, workload ${index + 1} of ${imports.length}` : ""}`}
                        onClick={() => void removeImport(entry.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 sm:min-h-0"
                        aria-label={`Export ${entry.label}${imports.length > 1 ? `, workload ${index + 1} of ${imports.length}` : ""}`}
                        onClick={() => void exportWorkload(entry.id)}
                      >
                        Export
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
    <div className="flex min-w-0 flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Events" value={summary.eventCount.toLocaleString("en-US")} size="lg" />
        <Metric
          label="Sessions"
          value={summary.sessionCount === 0 ? "N/A" : summary.sessionCount.toLocaleString("en-US")}
          {...(summary.sessionCount === 0 ? { hint: "Not identified" } : {})}
        />
        <Metric
          label="Projects"
          value={summary.projectCount === 0 ? "N/A" : summary.projectCount.toLocaleString("en-US")}
          {...(summary.projectCount === 0 ? { hint: "Not identified" } : {})}
        />
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
      <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
        Activity range: {range}
      </p>

      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Observed models
        </h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs" data-testid="intake-models">
          {summary.models.slice(0, 8).map((model) => (
            <li key={model.rawName} className="flex min-w-0 flex-wrap justify-between gap-2">
              <span className="min-w-0 font-mono [overflow-wrap:anywhere]">{model.rawName}</span>
              <span className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">
                {model.events.toLocaleString("en-US")} events ·{" "}
                {model.canonicalId === undefined
                  ? "canonical identity unknown"
                  : `resolved as ${model.canonicalId}`}
              </span>
            </li>
          ))}
        </ul>
        {summary.models.length > 8 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.models.length - 8} more raw model identifiers
          </p>
        ) : null}
      </div>

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
                  className="flex min-w-0 flex-wrap items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">{source.name}</span>
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
                  className="flex min-w-0 flex-wrap items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">{entry.name}</span>
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
        <p
          className="text-xs text-muted-foreground [overflow-wrap:anywhere]"
          data-testid="other-sources"
        >
          Detected with no events in this file:{" "}
          {summary.otherSources.map((source) => source.name).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
