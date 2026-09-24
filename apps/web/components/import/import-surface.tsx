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
import { HistoryDiscovery } from "@/components/import/history-discovery";
import { LARGE_HISTORY_BYTES } from "@/components/import/large-history-note";
import { ScanInstrument, type ScanStage } from "@/components/import/scan-instrument";
import { formatTokens } from "@/components/instrument/format";
import {
  IntakeFileReview,
  PartialScanNotice,
  skippedOutcomesOf,
} from "@/components/workload/evidence";
import type { HistorySelection } from "@/lib/discovery-list";
import { forgetConnections, rememberConnections } from "@/lib/history-discovery";
import { createLocalImportId } from "@/lib/idb";
import { importSizeAdvice } from "@/lib/import-validation";
import { forgetSources } from "@/lib/remembered-sources";
import { describeWorkerFailure, getWorkerClient, SupersededError } from "@/lib/worker-client";
import type { ImportRecord, SafeError, ScanProgress } from "@/lib/worker-protocol";

/**
 * Import surface (M3 brief).
 *
 * Entry paths: history discovery (drop the user folder, choose what to
 * import), the per-source folder chooser, files or a ZIP, a portable workload
 * and deterministic demo data. No account, no API key, and nothing sent to a
 * server. Files are handed to the Worker as File objects, read and validated
 * there, and the main thread only ever receives progress, a summary and errors
 * that are safe to display.
 *
 * Privacy is stated as product value at the point of action, not as footer
 * legalese, because it is the reason the file never leaves the browser.
 */

type Phase = "idle" | "reading" | "validating" | "preparing" | "ready";

/**
 * Every source card opens the same `webkitdirectory` chooser. Chromium's
 * directory-access picker treats a symlink as nonexistent even after the user
 * selects it, so a linked `~/.claude/projects` failed with NotFoundError; the
 * chooser follows links and works in every browser. The cards are the manual
 * path beside discovery, and the primary path on devices that cannot drag a
 * folder.
 */
const SOURCE_CHOICES: { kind: string; name: string; action: string; path: string }[] = [
  {
    kind: "claude-code",
    name: "Claude Code",
    action: "Scan local history",
    path: "~/.claude/projects",
  },
  { kind: "codex", name: "Codex", action: "Scan local sessions", path: "~/.codex/sessions" },
  {
    kind: "folder",
    name: "Folder scan",
    action: "Auto-detect supported sources",
    path: "Any supported history folder",
  },
];

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
  const folderInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  /** The source card that opened the folder chooser, so the scan names the tool. */
  const folderSourceRef = useRef<string | undefined>(undefined);
  /** Which path started the last scan, so Rescan can repeat it. */
  const [lastScan, setLastScan] = useState<"folder" | "files" | "histories" | undefined>(undefined);
  const [folderSupported, setFolderSupported] = useState(true);
  /**
   * Saving is the default: a scan can take a minute, and losing it to a reload
   * is worse than keeping normalized usage in this browser. Only the normalized
   * workload is stored (the same record and export a checked box always wrote);
   * raw session files are never copied.
   */
  const [saveLocal, setSaveLocal] = useState(true);
  /** Whether the scan being shown asked to be saved, so a refused save is visible. */
  const [requestedSave, setRequestedSave] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  /** A large-but-allowed file: said out loud before the work starts. */
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [record, setRecord] = useState<ImportRecord | undefined>(undefined);
  const [imports, setImports] = useState<ImportRecord[]>(initialImports);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({ source: "", workload: "" });
  /** The Worker's running totals for the scan in progress. */
  const [scan, setScan] = useState<ScanProgress | undefined>(undefined);
  /** What is being scanned, in the reader's words: a tool, a folder, files. */
  const [scanSource, setScanSource] = useState<string | undefined>(undefined);
  /** The discovered histories this scan reads, in the order they were chosen. */
  const [scanHistories, setScanHistories] = useState<HistorySelection["histories"] | undefined>(
    undefined,
  );
  /** A selection above the large-history threshold, noted inside the instrument. */
  const [largeBytes, setLargeBytes] = useState<number | undefined>(undefined);
  /** The last scan was cancelled; saved workloads were left alone. */
  const [canceled, setCanceled] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const progressAnchorRef = useRef<HTMLDivElement>(null);
  const feedbackAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A failure scrolls to its explanation; a scan and its result scroll to the
    // top of the instrument, so the resolved workload is what comes into view.
    const anchor =
      error !== undefined
        ? feedbackAnchorRef.current
        : busy || record !== undefined
          ? progressAnchorRef.current
          : null;
    if (anchor === null) return;
    anchor.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [busy, error, record]);

  useEffect(() => {
    setReady(true);
  }, []);

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
      run: (
        onProgress: (next: Phase, nextDetail?: string, nextScan?: ScanProgress) => void,
      ) => Promise<ImportRecord>,
    ) => {
      setRequestedSave(saveLocal);
      setBusy(true);
      setCanceled(false);
      setError(undefined);
      setRecord(undefined);
      setPhase("reading");
      setDetail(undefined);
      setScan(undefined);
      // A superseded request must not clear the interface state a newer request
      // owns, so the busy flag is only released by the request that still owns it.
      let superseded = false;
      try {
        const imported = await run((next, nextDetail, nextScan) => {
          setPhase(next);
          setDetail(nextDetail);
          if (nextScan !== undefined) setScan(nextScan);
        });
        setRecord(imported);
        setPhase("ready");
        await refreshImports();
        return imported;
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
    [refreshImports, saveLocal],
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
      setLargeBytes(undefined);
      setScanHistories(undefined);
      setScanSource("your workload file");
      return runImport((onProgress) =>
        client.importFile(file, {
          importId: createLocalImportId(),
          label: file.name.replace(/\.json$/u, ""),
          now: new Date().toISOString(),
          saveLocal,
          onProgress: (next, nextDetail, nextScan) =>
            onProgress(next as Phase, nextDetail, nextScan),
        }),
      );
    },
    [client, runImport, saveLocal],
  );

  const importDemo = useCallback(
    (preset: DemoWorkloadPresetId) => {
      setScanSource("a synthetic demo workload");
      setScanHistories(undefined);
      setLargeBytes(undefined);
      setNotice(undefined);
      return runImport((onProgress) =>
        client.importDemo(preset, {
          importId: createLocalImportId(),
          now: new Date().toISOString(),
          onProgress: (next, nextDetail, nextScan) =>
            onProgress(next as Phase, nextDetail, nextScan),
        }),
      );
    },
    [client, runImport],
  );

  const importCandidates = useCallback(
    (files: { file: File; path: string }[]) => {
      if (files.length === 0) {
        setError({
          code: "EMPTY_WORKLOAD",
          title: "No files found.",
          message: "Choose a folder with supported session or usage files.",
          hint: "You can also select files or an archive below.",
        });
        return;
      }
      const selectedBytes = files.reduce((total, candidate) => total + candidate.file.size, 0);
      setNotice(undefined);
      setScanHistories(undefined);
      setLargeBytes(selectedBytes > LARGE_HISTORY_BYTES ? selectedBytes : undefined);
      return runImport((onProgress) =>
        client.importSources(files, {
          importId: createLocalImportId(),
          now: new Date().toISOString(),
          saveLocal,
          onProgress: (next, nextDetail, nextScan) =>
            onProgress(next as Phase, nextDetail, nextScan),
        }),
      );
    },
    [client, runImport, saveLocal],
  );

  const importSources = useCallback(
    (files: File[]) =>
      importCandidates(files.map((file) => ({ file, path: file.webkitRelativePath || file.name }))),
    [importCandidates],
  );

  /**
   * Builds one workload from the histories chosen after discovery. Each file
   * carries its history's id so the instrument can show per-history progress,
   * and the connections are remembered (tool names only) once the build lands.
   */
  const importHistories = useCallback(
    async (selection: HistorySelection) => {
      if (selection.files.length === 0) {
        setError({
          code: "EMPTY_WORKLOAD",
          title: "No session files to read.",
          message: "The selected histories had no readable session files.",
          hint: "Drop the folder again, or connect the history with the folder chooser.",
        });
        return;
      }
      setLastScan("histories");
      setScanSource(selection.label);
      setScanHistories(selection.histories);
      setLargeBytes(selection.bytes > LARGE_HISTORY_BYTES ? selection.bytes : undefined);
      setNotice(undefined);
      const imported = await runImport((onProgress) =>
        client.importSources(selection.files, {
          importId: createLocalImportId(),
          now: new Date().toISOString(),
          saveLocal,
          label: selection.label,
          onProgress: (next, nextDetail, nextScan) =>
            onProgress(next as Phase, nextDetail, nextScan),
        }),
      );
      if (imported !== undefined && selection.remembered.length > 0)
        rememberConnections(selection.remembered, new Date().toISOString());
    },
    [client, runImport, saveLocal],
  );

  /**
   * Stops the scan in progress. Only this scan: saved workloads are untouched,
   * nothing from it is kept, and the page returns to the sources it came from.
   */
  const cancelScan = useCallback(() => {
    void client.cancelImport().catch(() => undefined);
    setBusy(false);
    setPhase("idle");
    setScan(undefined);
    setDetail(undefined);
    setRecord(undefined);
    setLargeBytes(undefined);
    setCanceled(true);
  }, [client]);

  /** Opens the folder chooser; a source card passes the tool name the scan shows. */
  const chooseFolder = useCallback((sourceName?: string) => {
    folderSourceRef.current = sourceName;
    folderInputRef.current?.click();
  }, []);

  /**
   * Repeats the last scan by reopening the same chooser, because the browser's
   * earlier file snapshot cannot be read again.
   */
  const rescan = useCallback(() => {
    if (lastScan === "histories") {
      // Dropped folders stay readable while this page is open, so the same
      // list is one Build away.
      const discovery = document.querySelector<HTMLElement>('[data-testid="history-discovery"]');
      discovery?.scrollIntoView({ block: "start" });
      discovery?.querySelector<HTMLElement>('[data-testid="build-workload"]')?.focus();
    } else if (lastScan === "folder") folderInputRef.current?.click();
    else sourceInputRef.current?.click();
  }, [lastScan]);

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
    forgetConnections();
    try {
      await forgetSources();
    } catch {
      setNotice(
        "Workloads were cleared, but folder access saved by an earlier version could not be cleared in this browser.",
      );
    }
    await refreshImports();
  }, [client, refreshImports]);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length === 1 && files[0]?.name.endsWith(".stackreplay.json"))
        void importFile(files[0]);
      else {
        setLastScan("files");
        setScanSource(
          files.length === 1
            ? (files[0]?.name ?? "the dropped file")
            : `${files.length} dropped files`,
        );
        void importSources(files);
      }
    },
    [importFile, importSources],
  );

  const scanActive = busy;
  const scanShown = scanActive || record !== undefined;
  const showIntro = !scanActive && record === undefined;
  const scanStage: ScanStage =
    record !== undefined && phase === "ready"
      ? "ready"
      : busy
        ? phase === "validating"
          ? "resolve"
          : phase === "preparing"
            ? "reconstruct"
            : "discover"
        : record !== undefined
          ? "ready"
          : "idle";
  const skippedOutcomes = record === undefined ? [] : skippedOutcomesOf(record);

  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start"
      data-testid="intake-surface"
      data-ready={ready}
    >
      <div
        className="flex min-w-0 flex-col gap-4 lg:col-span-2"
        data-testid="scan-area"
        hidden={!scanShown && notice === undefined && error === undefined && !canceled}
      >
        <div ref={progressAnchorRef} className="scroll-mt-20" />
        {scanShown ? (
          <div data-testid={scanStage === "ready" ? "import-summary" : undefined}>
            <ScanInstrument
              detail={detail}
              record={scanStage === "ready" ? record : undefined}
              ready={
                record === undefined ? null : (
                  <ReadyDetails
                    busy={busy}
                    initialTarget={initialTarget}
                    onExport={() => void exportWorkload(record.id)}
                    onRescan={rescan}
                    record={record}
                    requestedSave={requestedSave}
                    skippedCount={skippedOutcomes.length}
                  />
                )
              }
              scan={scan}
              sourceName={scanSource}
              stage={scanStage}
              histories={scanHistories}
              largeHistoryBytes={largeBytes}
              onCancel={scanActive ? cancelScan : undefined}
            />
          </div>
        ) : null}
        {canceled && !scanActive ? (
          <p
            className="border-l-2 border-border-strong py-1 pl-3 text-sm text-muted-foreground"
            role="status"
            data-testid="scan-canceled"
          >
            <span className="font-mono text-[11px] tracking-[0.12em] text-foreground uppercase">
              Scan canceled
            </span>{" "}
            Nothing from it was saved, and your saved workloads are unchanged. Your sources are
            below.
          </p>
        ) : null}
        {scanActive && imports.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>To stop this scan, use Cancel scan above.</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-negative"
              data-testid="clear-local-data"
              onClick={() => void clearAll()}
            >
              Clear all local data
            </Button>
          </div>
        ) : null}
        <div ref={feedbackAnchorRef} className="scroll-mt-20" />
        {notice === undefined ? null : (
          <div
            data-testid="import-size-notice"
            className="border-l-2 border-warning py-1 pl-3"
            role="status"
          >
            <p className="font-mono text-[11px] tracking-[0.12em] text-foreground uppercase">
              {notice.startsWith("Workloads were cleared") ? "Browser note" : "Large file"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
          </div>
        )}

        {error !== undefined ? (
          <Card role="alert" data-testid="import-error" className="border-negative/40">
            <CardContent className="flex flex-col gap-2 p-5">
              <h2 className="text-sm font-medium text-negative">{error.title}</h2>
              <p className="text-sm text-muted-foreground">{error.message}</p>
              {error.hint !== undefined ? (
                <p className="text-xs text-muted-foreground">{error.hint}</p>
              ) : null}
              {error.code === "FILE_UNREADABLE" ? (
                <div className="flex flex-col items-start gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                  >
                    Choose a local folder
                  </Button>
                  <p className="max-w-prose text-xs text-muted-foreground">
                    Your browser's confirmation may describe sending files to this site. StackReplay
                    reads the folder locally; the session files are not sent to StackReplay.
                  </p>
                </div>
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
      </div>
      <div className="flex min-w-0 flex-col gap-5" hidden={scanActive}>
        <HistoryDiscovery
          busy={busy}
          ready={ready}
          saveLocal={saveLocal}
          onBuild={(selection) => void importHistories(selection)}
          connectIndividually={
            <div data-testid="connect-sources">
              <div
                className="grid gap-px border border-border bg-border sm:grid-cols-3"
                data-testid="source-choices"
              >
                {SOURCE_CHOICES.map((choice, index) => (
                  <button
                    key={choice.kind}
                    type="button"
                    disabled={busy || !ready}
                    onClick={() => chooseFolder(choice.kind === "folder" ? undefined : choice.name)}
                    data-testid={`connect-${choice.kind}`}
                    className="group flex min-h-28 min-w-0 flex-col items-start justify-between bg-background p-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:opacity-50 sm:min-h-36"
                  >
                    <span className="flex w-full justify-between font-mono text-[11px] text-muted-foreground">
                      <span>0{index + 1}</span>
                      <span aria-hidden="true" className="text-accent">
                        ↗
                      </span>
                    </span>
                    <span className="block w-full">
                      <span className="block text-base font-medium">{choice.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {choice.action}
                      </span>
                      <span className="mt-3 block font-mono text-[11px] text-accent">
                        {choice.path}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <p
                className="mt-3 text-xs leading-relaxed text-muted-foreground"
                data-testid="picker-note"
              >
                {folderSupported
                  ? "Your browser's confirmation may describe sending files to this site. They stay on this device: StackReplay reads the folder locally and sends none of it to a server."
                  : "Folder selection is unavailable in this browser. Choose the folder's files below instead."}
              </p>
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="w-fit cursor-pointer underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
                  Folder locations and browser access
                </summary>
                <div className="mt-2 flex max-w-prose flex-col gap-2 leading-relaxed">
                  <p>
                    Claude Code uses <code>~/.claude/projects</code>; Codex uses{" "}
                    <code>~/.codex/sessions</code>. On Windows, look under your user profile. If you
                    set <code>CLAUDE_CONFIG_DIR</code> or <code>CODEX_HOME</code>, choose that
                    location. A folder that is a link (symlink) works the same way. For WSL, choose
                    the folder under <code>\\wsl.localhost\&lt;distro&gt;\home</code>.
                  </p>
                  <p>
                    The browser cannot keep access to the folder, so choose it again to scan newer
                    sessions.
                  </p>
                  <p>
                    A local scan accepts up to 5 GB of selected files, with a 512 MB limit for each
                    raw source file. Large scans need substantial browser memory. If a full history
                    exceeds the limit, choose a smaller date folder, such as a Codex year or month.
                    ChatGPT web conversations do not have a local sessions folder; a ChatGPT data
                    export is not replay-grade usage evidence.
                  </p>
                </div>
              </details>
            </div>
          }
        />
        <input
          ref={folderInputRef}
          type="file"
          disabled={busy || !ready}
          multiple
          {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          data-testid="source-folder-input"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            setLastScan("folder");
            setScanSource(
              folderSourceRef.current ??
                (files[0]?.webkitRelativePath.split("/")[0] || "the selected folder"),
            );
            void importSources(files);
            event.target.value = "";
          }}
        />
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
            "order-2 border border-dashed p-5 transition-colors sm:p-6",
            dragActive ? "border-accent bg-surface-2" : "border-border-strong bg-transparent",
          ].join(" ")}
        >
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-medium">Other ways to bring in a workload</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your selected workload files are read locally in this browser. They are never sent
                to StackReplay.
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
                    ref={sourceInputRef}
                    type="file"
                    disabled={busy || !ready}
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
                      setLastScan("files");
                      setScanSource(
                        files.length === 1
                          ? (files[0]?.name ?? "the selected file")
                          : `${files.length} selected files`,
                      );
                      void importSources(files);
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>
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
                    disabled={busy || !ready}
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
                disabled={busy || !ready}
                checked={saveLocal}
                onChange={(event) => setSaveLocal(event.target.checked)}
              />
              Save normalized workload on this browser
            </label>
            <p
              className="text-xs leading-relaxed text-muted-foreground"
              data-testid="save-local-note"
            >
              {saveLocal
                ? "On by default so a finished scan survives a reload. Only normalized usage is kept, in this browser's storage: models, token counts, timestamps, salted session and project hashes, and local project labels. Raw session files are never copied. Delete it any time below or in Settings."
                : "Off: the next scan stays available only until this page reloads."}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported raw files:{" "}
              {BROWSER_SOURCE_FORMATS.map((source) => `${source.name} ${source.format}`).join(", ")}
              . Other formats are reported without guessing.
            </p>
          </div>
        </div>

        <Card className="order-2 rounded-none border-x-0 border-b-0 bg-transparent px-0 shadow-none">
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
      </div>

      {!scanActive ? (
        <div className="flex min-w-0 flex-col gap-5">
          {showIntro ? (
            <section
              className="border-y border-border-strong py-4"
              data-testid="privacy-boundary"
              aria-label="Local scan privacy boundary"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                Before you connect
              </p>
              <h2 className="mt-2 max-w-[32ch] text-lg font-medium leading-snug text-foreground">
                Scanned locally. Raw AI history stays on this device.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A local Worker keeps models, tokens, chronology, session boundaries, and salted
                project grouping. It discards prompts, responses, code, command output, full paths,
                and credentials. Project folder names label your projects in this browser only;
                exports and share links never carry them. Filenames remain in local scan details.
              </p>
              <div className="mt-3 min-w-0 border-l-2 border-accent pl-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                  Your machine
                </p>
                <p className="mt-1 text-sm text-foreground">Sessions → local scanner → Replay</p>
                <div className="my-2 border-t border-dashed border-border-strong" />
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Network boundary
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Site assets and public catalog facts only. A share link is created only when you
                  choose to share a result.
                </p>
              </div>
            </section>
          ) : null}
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
      ) : null}
    </div>
  );
}

/**
 * What a completed scan offers under its resolved facts: the next step first,
 * then anything that qualifies the totals (a partial scan, an unsaved result),
 * then the evidence behind them.
 */
function ReadyDetails({
  record,
  requestedSave,
  busy,
  onRescan,
  onExport,
  initialTarget,
  skippedCount,
}: {
  record: ImportRecord;
  requestedSave: boolean;
  busy: boolean;
  onRescan: () => void;
  onExport: () => void;
  initialTarget?: string | undefined;
  skippedCount: number;
}) {
  return (
    <div className="mt-5 flex min-w-0 flex-col gap-5">
      <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {record.label} ·{" "}
        {record.savedLocally === false
          ? "scan results available until reload"
          : "saved on this browser"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/app/workload?import=${record.id}`}
          data-testid="open-workload"
          className={buttonVariants({ size: "lg" })}
        >
          See how you use AI →
        </Link>
        <Link
          href={replayHref(record.id, initialTarget)}
          data-testid="continue-to-replay"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Replay this workload
        </Link>
      </div>
      <PartialScanNotice
        record={record}
        action={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onRescan}
            disabled={busy}
            data-testid="rescan"
          >
            Rescan
          </Button>
        }
      />
      {record.savedLocally === false ? (
        <p
          className="border-l-2 border-warning bg-surface-2 px-3 py-2.5 text-sm leading-relaxed"
          data-testid="not-saved-notice"
          role="status"
        >
          <span className="font-mono text-[11px] tracking-[0.12em] text-warning uppercase">
            Not saved
          </span>{" "}
          {requestedSave
            ? "This browser did not accept the save (storage unavailable or full), so this workload is available only until the page reloads. Export a portable workload to keep it."
            : "You chose not to save this workload, so it is available only until the page reloads."}
        </p>
      ) : null}
      <ImportSummaryGrid compact record={record} />
      {record.intake !== undefined ? (
        <div
          className="grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-3"
          data-testid="detected-sources"
        >
          <div>
            <p className="text-xs text-muted-foreground">Detected sources</p>
            <p className="mt-1 font-medium">
              {[
                ...new Set(
                  record.intake.outcomes
                    .filter((item) => item.status === "imported")
                    .map((item) => item.source ?? "Source"),
                ),
              ].join(" · ") || "Portable workload"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Files skipped or unsupported</p>
            <p className="mt-1 font-medium">{skippedCount.toLocaleString("en-US")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Evidence</p>
            <p className="mt-1 font-medium">
              {record.summary.tokens.unknownEvents > 0
                ? `${record.summary.tokens.unknownEvents.toLocaleString("en-US")} included events have unknown usage`
                : "Token totals known for included events"}
            </p>
          </div>
        </div>
      ) : null}
      {record.intake !== undefined ? (
        <details data-testid="intake-review" className="border-b border-border pb-4">
          <summary className="min-h-11 content-center cursor-pointer text-xs font-medium uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-ring">
            File review and parser notes
            {skippedCount > 0 ? ` · ${skippedCount.toLocaleString("en-US")} skipped` : ""}
          </summary>
          <div className="mt-2">
            <IntakeFileReview record={record} />
          </div>
        </details>
      ) : null}
      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={onExport}>
        Export portable workload
      </Button>
    </div>
  );
}

/** Workload summary: usage sources and orchestration are separate concepts. */
export function ImportSummaryGrid({
  record,
  compact = false,
}: {
  record: ImportRecord;
  /** Omit the headline counts when the surrounding surface already shows them. */
  compact?: boolean;
}) {
  const { summary } = record;
  const range =
    summary.firstEventAt !== undefined && summary.lastEventAt !== undefined
      ? `${summary.firstEventAt.slice(0, 10)} to ${summary.lastEventAt.slice(0, 10)}`
      : "unknown";
  const exactTokens = summary.tokens.known.toLocaleString("en-US");
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div
        className="grid grid-cols-2 gap-x-5 gap-y-6 border-y border-border py-5 sm:grid-cols-4"
        hidden={compact}
      >
        <Metric label="Events" value={summary.eventCount.toLocaleString("en-US")} size="lg" />
        <Metric
          label="Sessions"
          value={summary.sessionCount === 0 ? "N/A" : summary.sessionCount.toLocaleString("en-US")}
          size="lg"
          {...(summary.sessionCount === 0 ? { hint: "Not identified" } : {})}
        />
        <Metric
          label="Projects"
          value={summary.projectCount === 0 ? "N/A" : summary.projectCount.toLocaleString("en-US")}
          size="lg"
          {...(summary.projectCount === 0 ? { hint: "Not identified" } : {})}
        />
        <Metric
          label="Tokens processed"
          value={formatTokens(summary.tokens.known) ?? "0"}
          size="lg"
          title={`${exactTokens} reported tokens processed, including reused context read from cache`}
          {...(summary.tokens.unknownEvents > 0
            ? { hint: `${summary.tokens.unknownEvents.toLocaleString("en-US")} events unknown` }
            : {})}
        />
      </div>
      <div className="flex flex-wrap justify-between gap-x-5 gap-y-1 text-xs leading-relaxed text-muted-foreground">
        {compact ? null : <p>Activity: {range}</p>}
        <p>Uncached input: {formatTokens(summary.tokens.buckets.uncachedInputTokens)}</p>
        <p>Cache writes: {formatTokens(summary.tokens.buckets.cacheWriteTokens)}</p>
        <p>
          Reused context read from cache: {formatTokens(summary.tokens.buckets.cacheReadTokens)}
        </p>
        <p>Output: {formatTokens(summary.tokens.buckets.outputTokens)}</p>
        <p className="tabular-nums">Exact known tokens: {exactTokens}</p>
      </div>

      <details className="border-t border-border pt-4" data-testid="import-sources-details">
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-ring">
          Models, sources and orchestration
        </summary>
        <div className="mt-4 flex min-w-0 flex-col gap-6">
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Observed models
            </h3>
            <ul className="mt-2 divide-y divide-border text-sm" data-testid="intake-models">
              {summary.models.slice(0, 8).map((model) => (
                <li
                  key={model.rawName}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 py-2"
                >
                  <span className="min-w-0 font-mono text-xs [overflow-wrap:anywhere]">
                    {model.rawName}
                  </span>
                  <span className="text-right text-xs tabular-nums text-muted-foreground">
                    {model.events.toLocaleString("en-US")} events
                    {model.canonicalId === undefined ? " · no catalog match" : ""}
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
      </details>
    </div>
  );
}
