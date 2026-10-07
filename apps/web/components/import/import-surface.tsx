"use client";

import { BROWSER_SOURCE_FORMATS } from "@stackreplay/adapters/browser-formats";
import {
  type DemoWorkloadPresetId,
  demoWorkloadPresetIds,
  demoWorkloadPresets,
} from "@stackreplay/test-fixtures";
import { Button, buttonVariants, Card, CardContent, Metric } from "@stackreplay/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  IntakeFileReview,
  PartialScanNotice,
  skippedOutcomesOf,
} from "@/components/import/evidence";
import { formatTokens, plainRange } from "@/components/import/format";
import { HistoryDiscovery } from "@/components/import/history-discovery";
import { LARGE_HISTORY_BYTES } from "@/components/import/large-history-note";
import { ScanInstrument, type ScanStage } from "@/components/import/scan-instrument";
import {
  collectSelection,
  type HistorySelection,
  mergeFinding,
  waitingRows,
} from "@/lib/discovery-list";
import {
  discoverPickedDirectory,
  FOLDER_PICKER_NOTE,
  FOLDER_TOO_LARGE_NOTE,
  forgetConnections,
  pickerCancelled,
  pickHistoryDirectory,
  platformHint,
  rememberConnections,
  supportsDirectoryPicker,
  tooManyChosenFiles,
} from "@/lib/history-discovery";
import { createLocalImportId } from "@/lib/idb";
import { importSizeAdvice } from "@/lib/import-validation";
import { forgetSources } from "@/lib/remembered-sources";
import { forgetSkippedSources, rememberSkippedSources } from "@/lib/skipped-sources";
import { browserTimeZone } from "@/lib/time-zone";
import { localDayOf } from "@/lib/timeline";
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

type Phase = "idle" | "reading" | "validating" | "preparing" | "finishing" | "ready";

/** Set while a scan runs, so a reload can report that it was interrupted. */
const ACTIVE_SCAN_FLAG = "stackreplay.scan-active";

/** Each source card uses lazy discovery, with an explicit file-list fallback for older browsers. */
const SOURCE_CHOICES: { kind: string; name: string; action: string; path: string }[] = [
  {
    kind: "claude-code",
    name: "Claude Code",
    action: "Scan local history",
    path: "~/.claude/projects",
  },
  { kind: "codex", name: "Codex", action: "Scan local sessions", path: "~/.codex/sessions" },
  {
    kind: "command-code",
    name: "Command Code",
    action: "Scan local sessions",
    path: "~/.commandcode/projects",
  },
  {
    kind: "opencode",
    name: "OpenCode",
    action: "Scan CLI / desktop history",
    path: "~/.local/share/opencode",
  },
  {
    kind: "folder",
    name: "Folder scan",
    action: "Auto-detect supported sources",
    path: "Any supported history folder",
  },
];

function savedDateRange(entry: ImportRecord): string | undefined {
  const { firstEventAt, lastEventAt } = entry.summary;
  if (firstEventAt === undefined || lastEventAt === undefined) return undefined;
  const day = localDayOf(browserTimeZone());
  return plainRange(day(firstEventAt), day(lastEventAt));
}

export function ImportSurface({
  initialImports,
}: {
  initialImports: ImportRecord[];
  /** Plan id chosen on a public plan page; forwarded to the replay surface. */
}) {
  const client = getWorkerClient();
  const router = useRouter();
  const generation = useRef(0);
  const inputId = useId();
  const sourceInputId = useId();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  /** The source card that opened the folder chooser, so the scan names the tool. */
  const folderSourceRef = useRef<string | undefined>(undefined);
  const folderPickingRef = useRef(false);
  const [folderPicking, setFolderPicking] = useState(false);
  const [pickerCapable, setPickerCapable] = useState(false);
  const [pickerNote, setPickerNote] = useState<string | undefined>(undefined);
  const [folderSupported, setFolderSupported] = useState(true);
  /**
   * Saving is the default: a scan can take a minute, and losing it to a reload
   * is worse than keeping normalized usage in this browser. Only the normalized
   * workload is stored (the same record and export a checked box always wrote);
   * raw session files are never copied.
   */
  const [saveLocal, setSaveLocal] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<SafeError | undefined>(undefined);
  /** A large-but-allowed file: said out loud before the work starts. */
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [record, setRecord] = useState<ImportRecord | undefined>(undefined);
  const [imports, setImports] = useState<ImportRecord[]>(initialImports);
  const [importsState, setImportsState] = useState<"loading" | "loaded" | "error">("loading");
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
  /** The last scan was cancelled; saved scans were left alone. */
  const [canceled, setCanceled] = useState(false);
  /** A previous visit started a scan that a reload or close abandoned. */
  const [interrupted, setInterrupted] = useState(false);
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
    setPickerCapable(supportsDirectoryPicker());
  }, []);

  // A reload or close during a scan throws the in-memory progress away. Warn
  // first, and on return say plainly that the previous scan was interrupted.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(ACTIVE_SCAN_FLAG) === "1") {
        sessionStorage.removeItem(ACTIVE_SCAN_FLAG);
        setInterrupted(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const refreshImports = useCallback(async () => {
    try {
      setImports(await client.listImports());
      setImportsState("loaded");
    } catch {
      setImportsState("error");
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
      const request = ++generation.current;
      setBusy(true);
      setCanceled(false);
      setInterrupted(false);
      setError(undefined);
      setRecord(undefined);
      setPhase("reading");
      setDetail(undefined);
      setScan(undefined);
      try {
        sessionStorage.setItem(ACTIVE_SCAN_FLAG, "1");
      } catch {}
      // A superseded request must not clear the interface state a newer request
      // owns, so the busy flag is only released by the request that still owns it.
      let superseded = false;
      try {
        const imported = await run((next, nextDetail, nextScan) => {
          if (request !== generation.current) return;
          setPhase(next);
          setDetail(nextDetail);
          if (nextScan !== undefined) setScan(nextScan);
        });
        if (request !== generation.current) return;
        // The worker has finished normalization and the requested local save.
        // Analysis belongs to Workload and must not delay this handoff.
        setRecord(imported);
        setNotice(undefined);
        setPhase("ready");
        // A rescan of the same source replaces its earlier saved scan; scans of
        // other sources stay. Labels carry the source, dates carry the time.
        if (imported.savedLocally !== false) {
          try {
            const prior = (await client.listImports()).filter(
              (row) => row.id !== imported.id && row.label === imported.label,
            );
            for (const row of prior) await client.deleteImport(row.id).catch(() => undefined);
          } catch {}
        }
        await refreshImports();
        return imported;
      } catch (failure) {
        if (request !== generation.current || failure instanceof SupersededError) {
          superseded = true;
          return;
        }
        setError(describeWorkerFailure(failure));
        setPhase("idle");
      } finally {
        if (!superseded && request === generation.current) {
          setBusy(false);
          try {
            sessionStorage.removeItem(ACTIVE_SCAN_FLAG);
          } catch {}
        }
      }
    },
    [client, refreshImports],
  );

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (record === undefined || phase !== "ready") return;
    const request = generation.current;
    const href = `/app/recap?import=${encodeURIComponent(record.id)}`;
    router.prefetch(href);
    const timer = window.setTimeout(() => {
      if (generation.current === request) router.replace(href);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [record, phase, router]);

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
        generation.current += 1;
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
      setScanSource("your history file");
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
      setScanSource("a sample history");
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
      if (imported !== undefined && selection.skipped.length > 0)
        rememberSkippedSources(imported.id, selection.skipped);
    },
    [client, runImport, saveLocal],
  );

  /**
   * Stops the scan in progress. Only this scan: saved scans are untouched,
   * nothing from it is kept, and the page returns to the sources it came from.
   */
  const cancelScan = useCallback(() => {
    generation.current += 1;
    void client.cancelImport().catch(() => undefined);
    setBusy(false);
    setPhase("idle");
    setScan(undefined);
    setDetail(undefined);
    setRecord(undefined);
    setLargeBytes(undefined);
    setCanceled(true);
    try {
      sessionStorage.removeItem(ACTIVE_SCAN_FLAG);
    } catch {}
  }, [client]);

  /** Per-tool choices discover the same known paths as the drop path. */
  const chooseFolder = useCallback(
    async (sourceName?: string) => {
      if (busy || !ready || folderPickingRef.current) return;
      folderSourceRef.current = sourceName;
      setPickerNote(undefined);
      if (!supportsDirectoryPicker()) {
        folderInputRef.current?.click();
        return;
      }
      folderPickingRef.current = true;
      setFolderPicking(true);
      try {
        const folder = await pickHistoryDirectory();
        const choice = SOURCE_CHOICES.find((entry) => entry.name === sourceName);
        const run = await discoverPickedDirectory(folder, platformHint(), choice?.kind);
        let rows = waitingRows();
        for (const finding of run.findings)
          rows = mergeFinding(rows, finding, folder.name, true, "chooser");
        const selected = rows.filter(
          (row) => row.selected && (choice === undefined || row.adapterId === choice.kind),
        );
        if (selected.length === 0) {
          setPickerNote(
            "No readable history found. Choose the tool folder, such as .claude or .codex. For a custom or linked location, use files or an export below.",
          );
          return;
        }
        await importHistories(await collectSelection(selected));
      } catch (failure) {
        if (!pickerCancelled(failure)) setPickerNote(FOLDER_PICKER_NOTE);
      } finally {
        folderPickingRef.current = false;
        setFolderPicking(false);
      }
    },
    [busy, ready, importHistories],
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
    generation.current += 1;
    setBusy(false);
    setError(undefined);
    setRecord(undefined);
    setPhase("idle");
    forgetConnections();
    forgetSkippedSources();
    try {
      await forgetSources();
    } catch {
      setNotice(
        "Scans were cleared, but folder access saved by an earlier version could not be cleared in this browser.",
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
            : phase === "finishing"
              ? "finishing"
              : "discover"
        : record !== undefined
          ? "ready"
          : "idle";

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
                <p className="mt-6 text-sm text-accent" role="status">
                  Opening your recap…
                </p>
              }
              scan={scan}
              sourceName={scanSource}
              stage={scanStage}
              histories={scanHistories}
              largeHistoryBytes={largeBytes}
              onCancel={scanActive && phase !== "finishing" ? cancelScan : undefined}
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
            Nothing from it was saved, and your saved scans are unchanged. Your sources are below.
          </p>
        ) : null}
        {scanActive && imports.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>To stop this scan, use Cancel scan above.</span>
            <ClearAllControl count={imports.length} onConfirm={() => void clearAll()} />
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
              {notice.startsWith("Scans were cleared") ? "Browser note" : "Large file"}
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
                    onClick={() => void chooseFolder()}
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
      <div className="intake-main flex min-w-0 flex-col gap-5" hidden={scanShown}>
        <p className="intake-mobile-note" data-testid="scan-mobile-note">
          Scanning your AI tools needs a desktop browser where they are installed. On a phone you
          can open an export or choose files, or see a sample.
        </p>
        <HistoryDiscovery
          busy={busy || folderPicking}
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
                    disabled={busy || !ready || folderPicking}
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
                {pickerCapable
                  ? "Choose a tool folder such as .claude or .codex. Only known history locations are read. Browsers may block Home or linked folders; drag Home above, or choose the actual tool folder. Raw history stays on this device."
                  : folderSupported
                    ? "Choose a tool folder such as .claude or .codex, or its history folder. Avoid choosing Home: this browser lists every file first. Raw history stays on this device."
                    : "Folder selection is unavailable in this browser. Choose the folder's files below instead."}
              </p>
              {pickerNote === undefined ? null : (
                <p
                  role="alert"
                  className="mt-2 text-sm text-muted-foreground"
                  data-testid="source-picker-note"
                >
                  {pickerNote}
                </p>
              )}
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="w-fit cursor-pointer underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
                  Folder locations and browser access
                </summary>
                <div className="mt-2 flex max-w-prose flex-col gap-2 leading-relaxed">
                  <p>
                    Claude Code uses <code>~/.claude/projects</code>; Codex uses{" "}
                    <code>~/.codex/sessions</code>. On Windows, look under your user profile. If you
                    set <code>CLAUDE_CONFIG_DIR</code> or <code>CODEX_HOME</code>, choose that
                    location. For a link (symlink), choose its actual location or use files below.
                    For WSL, choose the folder under{" "}
                    <code>\\wsl.localhost\&lt;distro&gt;\home</code>.
                  </p>
                  <p>
                    The browser cannot keep access to the folder, so choose it again to scan newer
                    sessions.
                  </p>
                  <p>
                    A local scan accepts up to 16 GB of selected files, with a 2 GB limit for each
                    JSONL session file and 512 MB for other source files. If a full history exceeds
                    the limit, choose a smaller date folder, such as a Codex year or month. OpenCode
                    CLI and desktop share their session database: close OpenCode before selecting
                    its folder, and include opencode.db-wal if present. OpenCode database files and
                    the combined copy are limited to 128 MB; use a CLI export for larger histories.
                    ChatGPT web conversations do not have a local sessions folder; a ChatGPT data
                    export is not usage evidence.
                  </p>
                </div>
              </details>
            </div>
          }
        />
        <input
          ref={folderInputRef}
          type="file"
          disabled={busy || !ready || folderPicking}
          multiple
          {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          data-testid="source-folder-input"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length === 0) return;
            if (tooManyChosenFiles(files.length)) {
              setPickerNote(FOLDER_TOO_LARGE_NOTE);
              return;
            }
            setScanSource(
              folderSourceRef.current ??
                (files[0]?.webkitRelativePath.split("/")[0] || "the selected folder"),
            );
            void importSources(files);
            event.target.value = "";
          }}
        />
        <details className="order-2">
          <summary className="min-h-11 cursor-pointer content-center">
            Use files or an export instead
          </summary>
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
              "order-2 transition-colors",
              dragActive
                ? "border border-dashed border-accent bg-surface-2 p-5 sm:p-6"
                : "border-t border-border bg-transparent pt-5",
            ].join(" ")}
          >
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-base font-medium">Choose history files or an export</h2>
                <p className="mt-1 text-sm text-muted-foreground">Files are read on this device.</p>
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
                      disabled={busy || !ready || folderPicking}
                      multiple
                      accept=".json,.jsonl,.db,.db-wal,.zip,application/json,application/zip"
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
                    StackReplay export
                  </label>
                  <div className="relative flex min-h-12 min-w-0 items-center justify-between gap-3 border border-control-border bg-surface px-3 py-2 text-sm transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                    <span
                      className="min-w-0 text-foreground [overflow-wrap:anywhere]"
                      id={`${inputId}-selection`}
                    >
                      {selectedFiles.workload || "Choose a StackReplay export"}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-xs text-accent">
                      Browse
                    </span>
                    <input
                      id={inputId}
                      type="file"
                      disabled={busy || !ready || folderPicking}
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
                  disabled={busy || !ready || folderPicking}
                  checked={saveLocal}
                  onChange={(event) => setSaveLocal(event.target.checked)}
                />
                Save this scan in this browser
              </label>
              <p
                className="text-xs leading-relaxed text-muted-foreground"
                data-testid="save-local-note"
              >
                {saveLocal
                  ? "On by default so a finished scan survives a reload. Only the numbers behind your work are kept, in this browser's storage: models, token counts, timestamps, salted session and project hashes, and local project labels. Raw session files are never copied. Delete it any time below or in Settings."
                  : "Off: the next scan stays available only until this page reloads."}
              </p>
              <p className="text-xs text-muted-foreground">
                Supported raw files:{" "}
                {BROWSER_SOURCE_FORMATS.map((source) => `${source.name} ${source.format}`).join(
                  ", ",
                )}
                . Other formats are reported without guessing.
              </p>
            </div>
          </div>
        </details>
        <details className="order-2">
          <summary className="min-h-11 cursor-pointer content-center">Try a sample recap</summary>
          <Card className="order-2 rounded-none border-x-0 border-b-0 bg-transparent px-0 shadow-none">
            <CardContent className="flex flex-col gap-4 p-5">
              <div>
                <h2 className="text-sm font-medium">Try a fictional history</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fictional data, ready to explore.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" data-testid="demo-presets">
                {demoWorkloadPresetIds.map((presetId) => (
                  <Button
                    key={presetId}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy || !ready || folderPicking}
                    data-testid={`demo-${presetId}`}
                    onClick={() => void importDemo(presetId)}
                  >
                    {demoWorkloadPresets[presetId].name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Start with Complete billing period: 3,600 synthetic calls, sample paid subscriptions
                and a same-period API comparison.
              </p>
            </CardContent>
          </Card>{" "}
        </details>
      </div>

      {!scanShown ? (
        <div className="flex min-w-0 flex-col gap-5">
          {interrupted ? (
            <p
              role="status"
              data-testid="scan-interrupted"
              className="border-l-2 border-warning py-1 pl-3 text-sm text-muted-foreground"
            >
              <span className="font-mono text-[11px] tracking-[0.12em] text-foreground uppercase">
                Scan interrupted
              </span>{" "}
              The last scan was interrupted by a reload or a closed tab. Your saved scans are
              unchanged. Choose your files again to make a new recap.
            </p>
          ) : null}
          {showIntro ? (
            <section
              className={`border-y border-border-strong py-4 ${imports.length > 0 ? "order-2" : ""}`}
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
                The scanner keeps models, token counts, dates, and anonymous session and project
                groups. It leaves out prompts, responses, code, command output, full paths, and
                credentials. Project folder names label your projects in this browser only; exports
                and share links never carry them. Filenames remain in local scan details.
              </p>
              <div className="mt-3 min-w-0 border-l-2 border-accent pl-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                  Your machine
                </p>
                <p className="mt-1 text-sm text-foreground">Your files → local scan → your recap</p>
                <div className="my-2 border-t border-dashed border-border-strong" />
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Network boundary
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Site assets and page analytics only. Connecting GitHub sends only your username to
                  a public lookup. A share link is created only when you choose to share a result,
                  and it uploads only the numbers on your card.
                </p>
              </div>
            </section>
          ) : null}
          <section
            aria-labelledby="saved-workloads-heading"
            className={`order-1 flex flex-col gap-3 ${imports.length > 0 || !showIntro ? "border-t border-border-strong pt-4" : "pt-1"}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="saved-workloads-heading" className="text-sm font-medium">
                Saved scans
              </h2>
              {imports.length > 0 ? (
                <ClearAllControl count={imports.length} onConfirm={() => void clearAll()} />
              ) : null}
            </div>
            {importsState === "loading" ? (
              <p
                className="text-xs text-muted-foreground"
                role="status"
                data-testid="stored-imports-loading"
              >
                Looking up saved scans…
              </p>
            ) : importsState === "error" ? (
              <div
                role="alert"
                className="flex flex-col items-start gap-2 border-l-2 border-warning pl-3 text-xs"
              >
                <p>Saved scans couldn’t be opened in this browser.</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void refreshImports()}
                >
                  Try again
                </Button>
              </div>
            ) : imports.length === 0 ? (
              <p className="text-xs text-muted-foreground" data-testid="no-stored-imports">
                No scans saved here yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border" data-testid="stored-imports">
                {imports.map((entry, index) => (
                  <li key={entry.id} className="flex min-w-0 flex-col gap-3 py-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
                        <span>{entry.label}</span>
                        {index === 0 ? (
                          <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
                            Latest
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {entry.eventCount.toLocaleString("en-US")}{" "}
                        {entry.eventCount === 1 ? "call" : "calls"}
                        {savedDateRange(entry) === undefined ? "" : ` · ${savedDateRange(entry)}`}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {entry.savedLocally === false ? "Temporary" : "Saved"}{" "}
                        {new Date(entry.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-x-4 gap-y-2"
                      data-testid="stored-import-actions"
                    >
                      <Link
                        href={`/app/recap?import=${entry.id}`}
                        data-testid={`open-import-${entry.id}`}
                        aria-label={`Open my recap for ${entry.label}${imports.length > 1 ? `, scan ${index + 1} of ${imports.length}` : ""}`}
                        className={`${buttonVariants({ size: "sm" })} min-h-11 sm:min-h-9`}
                      >
                        Open my recap
                      </Link>
                      <Link
                        href={`/app/stats?import=${entry.id}`}
                        aria-label={`Explore my stats for ${entry.label}${imports.length > 1 ? `, scan ${index + 1} of ${imports.length}` : ""}`}
                        className={`${buttonVariants({ variant: "secondary", size: "sm" })} min-h-11 justify-center sm:min-h-9`}
                      >
                        Explore my stats
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-11 sm:min-h-9"
                        aria-label={`Export ${entry.label}${imports.length > 1 ? `, scan ${index + 1} of ${imports.length}` : ""}`}
                        onClick={() => void exportWorkload(entry.id)}
                      >
                        Export
                      </Button>
                      <details
                        className="group text-xs text-muted-foreground"
                        data-testid={`delete-menu-${entry.id}`}
                      >
                        <summary className="min-h-11 cursor-pointer content-center sm:min-h-9">
                          More
                        </summary>
                        <p className="py-1 font-mono text-[11px] text-muted-foreground">
                          Scan {entry.id.slice(0, 6)}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-negative"
                          data-testid={`delete-import-${entry.id}`}
                          aria-label={`Delete scan ${entry.id.slice(0, 6)} of ${entry.label}`}
                          onClick={() => void removeImport(entry.id)}
                        >
                          Delete scan
                        </Button>
                      </details>
                    </div>
                    <details className="border-t border-border pt-2" data-testid="import-details">
                      <summary className="min-h-11 cursor-pointer content-center text-xs text-muted-foreground">
                        Import details
                      </summary>
                      <div className="space-y-4 py-3" data-testid="saved-import-summary">
                        <PartialScanNotice record={entry} />
                        <ImportSummaryGrid record={entry} />
                        {entry.intake === undefined ? null : (
                          <div data-testid="intake-review">
                            <p
                              className="text-xs text-muted-foreground"
                              data-testid="detected-sources"
                            >
                              {entry.summary.usageSources.map((source) => source.name).join(" · ")}
                              {" · "}
                              {skippedOutcomesOf(entry).length.toLocaleString("en-US")} files
                              ignored or not included
                            </p>
                            <IntakeFileReview record={entry} />
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {importsState === "loaded" && imports.length > 1 ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Rescanning the same source replaces its earlier saved scan. Scans of different
                sources are kept separately; similar counts are never merged by appearance.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Clearing every saved workload cannot be undone, so it asks once, in place,
 * and names what goes.
 */
function ClearAllControl({ count, onConfirm }: { count: number; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 sm:min-h-9"
        data-testid="clear-local-data"
        onClick={() => setAsking(true)}
      >
        Clear all local data
      </Button>
    );
  return (
    <fieldset
      aria-label="Confirm clearing local data"
      className="m-0 flex w-full min-w-0 flex-wrap items-center gap-2 border-0 border-l-2 border-negative py-1 pl-3 text-xs"
      data-testid="clear-local-data-confirmation"
    >
      <span className="basis-full text-foreground">
        Delete {count === 1 ? "the saved scan" : `all ${count.toLocaleString("en-US")} saved scans`}{" "}
        and remembered folders from this browser? This cannot be undone.
      </span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="min-h-11 sm:min-h-9"
        data-testid="clear-local-data-confirm"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        Delete everything
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 sm:min-h-9"
        onClick={() => setAsking(false)}
      >
        Keep my scans
      </Button>
    </fieldset>
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
        <Metric label="Calls" value={summary.eventCount.toLocaleString("en-US")} size="lg" />
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
            ? { hint: `${summary.tokens.unknownEvents.toLocaleString("en-US")} calls unknown` }
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
        {summary.tokens.buckets.reasoningTokens > 0 ? (
          <p>Reasoning: {formatTokens(summary.tokens.buckets.reasoningTokens)}</p>
        ) : null}
        <p className="tabular-nums">Reported tokens: {exactTokens}</p>
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
                    {model.events.toLocaleString("en-US")} {model.events === 1 ? "call" : "calls"}
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
                  <li className="text-sm text-muted-foreground">No recorded calls found.</li>
                ) : (
                  summary.usageSources.map((source) => (
                    <li
                      key={source.adapterId}
                      className="flex min-w-0 flex-wrap items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 [overflow-wrap:anywhere]">{source.name}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        {source.events.toLocaleString("en-US")}{" "}
                        {source.events === 1 ? "call" : "calls"}
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
              Detected with no calls in this file:{" "}
              {summary.otherSources.map((source) => source.name).join(", ")}.
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
