"use client";

import {
  DISCOVERY_REGISTRY,
  type DiscoveryPlatform,
  discoverHistories,
  type SourceFinding,
} from "@stackreplay/adapters/discovery";
import { Button } from "@stackreplay/ui";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  formatBytes,
  LARGE_HISTORY_BYTES,
  LargeHistoryNote,
} from "@/components/import/large-history-note";
import {
  applyChosenFolder,
  collectSelection,
  FOUND,
  type HistoryRow,
  type HistorySelection,
  mergeFinding,
  type RowStatus,
  SETTLED,
  waitingRows,
} from "@/lib/discovery-list";
import {
  chosenFolder,
  droppedFolders,
  entryDirectory,
  forgetConnections,
  platformHint,
  type RememberedConnections,
  readConnections,
  supportsDropDiscovery,
  userFolderHint,
} from "@/lib/history-discovery";

/**
 * Find my AI histories.
 *
 * The step before the scan instrument, drawn in the same language: the local
 * machine at the top of a Signal Blue rail and one knot per registered history
 * location. The user drops their home folder (or a tool folder) on the
 * machine; discovery asks that folder for each registered location by name and
 * reports what is really there. Nothing is parsed until the user picks what to
 * import and presses Build my workload; the scan instrument then takes over
 * with the same histories.
 *
 * Linked, WSL, relocated and external histories go through the folder chooser,
 * the reliable path that follows links, and join the same list.
 */

type Phase = "intro" | "armed" | "discovering" | "selecting";

const count = new Intl.NumberFormat("en-US");

/** The folder that holds a source's history folder, such as `.claude`. */
function parentOf(row: HistoryRow): string | undefined {
  return DISCOVERY_REGISTRY.find(
    (source) => source.adapterId === row.adapterId,
  )?.history[0]?.path.at(-2);
}

function duration(ms: number): string {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function describe(finding: SourceFinding): string {
  switch (finding.status) {
    case "found":
      return `found, ${count.format(finding.fileCount ?? 0)} files`;
    case "access-needed":
      return "additional access required";
    case "unsupported":
      return "found, not readable in the browser";
    case "empty":
      return "folder found, no sessions yet";
    default:
      return "not found";
  }
}

export function HistoryDiscovery({
  busy,
  ready,
  onBuild,
  connectIndividually,
  saveLocal,
}: {
  busy: boolean;
  ready: boolean;
  onBuild: (selection: HistorySelection) => void;
  /** The per-source folder chooser cards: the manual, keyboard and no-drag path. */
  connectIndividually: ReactNode;
  saveLocal: boolean;
}) {
  const headingId = useId();
  const connectId = useId();
  const [phase, setPhase] = useState<Phase>("intro");
  const [rows, setRows] = useState<HistoryRow[]>(waitingRows);
  const [dropCapable, setDropCapable] = useState(true);
  const [platform, setPlatform] = useState<DiscoveryPlatform | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [remembered, setRemembered] = useState<RememberedConnections | undefined>(undefined);
  const [roots, setRoots] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<{ probes: number; durationMs: number } | undefined>(
    undefined,
  );
  const [announcement, setAnnouncement] = useState("");
  const [dropNote, setDropNote] = useState<string | undefined>(undefined);
  const [building, setBuilding] = useState(false);
  const [rail, setRail] = useState<{ top: number; height: number; lit: number } | undefined>(
    undefined,
  );
  const chooserRef = useRef<HTMLInputElement>(null);
  const chooserTarget = useRef<{ key?: string } | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const instrumentRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    setDropCapable(supportsDropDiscovery());
    setPlatform(platformHint());
    setRemembered(readConnections());
  }, []);

  const found = rows.filter((row) => FOUND.includes(row.status));
  const selected = found.filter((row) => row.selected);
  const selectedBytes = selected.reduce((total, row) => total + (row.bytes ?? 0), 0);
  const selectedFiles = selected.reduce((total, row) => total + (row.fileCount ?? 0), 0);
  const unmeasured = selected.some((row) => row.bytes === undefined);
  const accessNeeded = rows.filter((row) => row.status === "access-needed");
  const settled = phase === "selecting";
  const intro = phase === "intro";

  // The rail runs knot to knot and is lit as far as the probe has really gone.
  // Rows differ in height, so it is measured rather than assumed.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a row changing state moves the lit end without resizing anything, so rows and phase re-run the measurement the observer cannot see.
  useLayoutEffect(() => {
    const root = instrumentRef.current;
    if (root === null || intro) {
      setRail(undefined);
      return;
    }
    const measure = () => {
      const knots = Array.from(root.querySelectorAll<HTMLElement>("[data-rail-knot]")).filter(
        (knot) => knot.getClientRects().length > 0,
      );
      const first = knots[0];
      const last = knots.at(-1);
      if (first === undefined || last === undefined || knots.length < 2) {
        setRail(undefined);
        return;
      }
      const base = root.getBoundingClientRect().top;
      const center = (knot: HTMLElement) => {
        const box = knot.getBoundingClientRect();
        return box.top - base + box.height / 2;
      };
      const top = center(first);
      const litKnot = knots.filter((knot) => knot.dataset.railKnot === "lit").at(-1);
      setRail({
        top,
        height: center(last) - top,
        lit: litKnot === undefined ? 0 : center(litKnot) - top,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [intro, rows, phase, roots.length, dropNote]);

  // Discovery's result is announced once the list has settled.
  const completed = useRef(0);
  const [runs, setRuns] = useState(0);
  useEffect(() => {
    if (runs === 0 || runs === completed.current) return;
    completed.current = runs;
    const access = rows.filter((row) => row.status === "access-needed").length;
    setAnnouncement(
      `Discovery complete. ${found.length} ${found.length === 1 ? "history" : "histories"} found${
        access > 0 ? `, ${access} need additional access` : ""
      }. Nothing has been imported yet.`,
    );
  }, [runs, rows, found.length]);

  const arm = useCallback(() => {
    setPhase((current) => (current === "intro" ? "armed" : current));
    setDropNote(undefined);
    requestAnimationFrame(() => headingRef.current?.focus());
  }, []);

  const runDiscovery = useCallback(
    async (folders: FileSystemDirectoryEntry[]) => {
      if (runningRef.current) return;
      runningRef.current = true;
      const firstDrop = roots.length === 0;
      if (firstDrop) setRows(waitingRows());
      setPhase("discovering");
      setDropNote(undefined);
      setConnectOpen(false);
      const pace = prefersReducedMotion()
        ? undefined
        : () => new Promise<void>((resolve) => setTimeout(resolve, 140));
      let probes = metrics?.probes ?? 0;
      let durationMs = metrics?.durationMs ?? 0;
      let first = firstDrop;
      try {
        for (const folder of folders) {
          const where = folder.name || "dropped folder";
          const fillsRegistry = first;
          setRoots((current) => [...current, where]);
          const run = await discoverHistories(entryDirectory(folder), {
            platform,
            ...(pace === undefined ? {} : { beforeSource: pace }),
            onFinding: (finding) => {
              setRows((current) => mergeFinding(current, finding, where, fillsRegistry));
              if (finding.status !== "checking")
                setAnnouncement(`${finding.name}: ${describe(finding)}.`);
              else if (finding.fileCount === undefined)
                setAnnouncement(`Checking ${finding.name}.`);
            },
          });
          probes += run.probes;
          durationMs += run.durationMs;
          first = false;
        }
      } catch {
        setDropNote(
          "The browser stopped answering for that folder. Drop it again, or connect a history folder with the chooser.",
        );
      } finally {
        runningRef.current = false;
        setMetrics({ probes, durationMs });
        setPhase("selecting");
        setRuns((value) => value + 1);
      }
    },
    [metrics, platform, roots.length],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      if (busy || runningRef.current) return;
      // Entries must be taken inside the event: the browser empties it afterwards.
      const { folders, files } = droppedFolders(event.dataTransfer);
      if (folders.length === 0) {
        setPhase((current) => (current === "intro" ? "armed" : current));
        setDropNote(
          files > 0
            ? "That was a file. Drop a folder: your user folder, or a tool folder such as .claude or .codex."
            : "Nothing usable was dropped. Drag your user folder from your file manager.",
        );
        return;
      }
      void runDiscovery(folders);
    },
    [busy, runDiscovery],
  );

  const openChooser = useCallback((key?: string) => {
    chooserTarget.current = key === undefined ? {} : { key };
    chooserRef.current?.click();
  }, []);

  /**
   * A folder from the folder chooser is recognized by the same rules as a drop,
   * over the files the chooser already handed the page, then joins the list.
   */
  const onChosen = useCallback(
    async (list: File[]) => {
      const target = chooserTarget.current;
      chooserTarget.current = undefined;
      if (target === undefined || list.length === 0) return;
      const folder = list[0]?.webkitRelativePath.split("/")[0] || "chosen folder";
      const tree = chosenFolder(list);
      const run = tree === undefined ? undefined : await discoverHistories(tree, { platform });
      const findings = run?.findings ?? [];
      setRows((current) => applyChosenFolder(current, findings, list, folder, target.key));
      const named = findings
        .filter((finding) => finding.status !== "not-found")
        .map((finding) => `${finding.name}: ${describe(finding)}`);
      setAnnouncement(
        `${folder} connected${named.length > 0 ? `. ${named.join(". ")}` : ""}. Review the list, then build the workload.`,
      );
      setPhase("selecting");
    },
    [platform],
  );

  const toggle = useCallback((key: string, value: boolean) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, selected: value } : row)),
    );
  }, []);

  const build = useCallback(async () => {
    if (selected.length === 0 || building) return;
    setBuilding(true);
    try {
      onBuild(await collectSelection(selected));
    } finally {
      setBuilding(false);
    }
  }, [building, onBuild, selected]);

  const reset = useCallback(() => {
    setRows(waitingRows());
    setRoots([]);
    setMetrics(undefined);
    setPhase("intro");
    setDropNote(undefined);
    setAnnouncement("");
  }, []);

  const forget = useCallback(() => {
    forgetConnections();
    setRemembered(undefined);
  }, []);

  const disabled = busy || !ready;
  const connectToggle = (label: string, quiet = false) => (
    <button
      type="button"
      className={quiet ? "sr-find-link sr-find-link-quiet" : "sr-find-link"}
      aria-expanded={connectOpen}
      aria-controls={connectId}
      onClick={() => setConnectOpen((open) => !open)}
      data-testid="connect-individually"
    >
      {label}
    </button>
  );

  /* Devices that cannot drag a folder go straight to the per-source chooser. */
  if (!dropCapable) {
    return (
      <section
        aria-labelledby={headingId}
        className="sr-find"
        data-testid="history-discovery"
        data-mode="chooser"
      >
        <div className="sr-find-status">
          <p className="sr-micro sr-find-kicker">
            <span aria-hidden="true" className="sr-find-dot" />
            Local AI history
          </p>
          <p className="sr-micro text-muted-foreground">Raw history stays on this device</p>
        </div>
        <div className="sr-find-head">
          <h2 id={headingId} className="sr-find-title">
            Connect your AI history
          </h2>
          <p className="sr-find-lede">
            Choose the folder for the tool you use. StackReplay reads it on this device.
          </p>
        </div>
        <div className="sr-find-connect">{connectIndividually}</div>
        <p className="sr-find-fine mt-3" data-testid="discovery-unavailable">
          Finding every history from one folder needs a desktop browser where you can drag a folder.
        </p>
      </section>
    );
  }

  const summary =
    found.length > 0
      ? `${found.length} ${found.length === 1 ? "history" : "histories"} found`
      : "No supported history found here";

  return (
    <section
      aria-labelledby={headingId}
      className="sr-find"
      data-testid="history-discovery"
      data-mode="drop"
      data-phase={phase}
      data-drag={dragOver ? "over" : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape" && phase === "armed") reset();
      }}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDragOver(false);
      }}
      onDrop={onDrop}
    >
      <p className="sr-only" role="status" data-testid="discovery-announcer">
        {announcement}
      </p>
      <div className="sr-find-status">
        <p className="sr-micro sr-find-kicker">
          <span aria-hidden="true" className="sr-find-dot" />
          Local AI history
        </p>
        <p className="sr-micro text-muted-foreground" data-testid="discovery-boundary">
          {metrics === undefined
            ? "Raw history stays on this device"
            : `Checked ${count.format(metrics.probes)} known paths in ${duration(metrics.durationMs)} · only found histories listed`}
        </p>
      </div>

      <div className="sr-find-head">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="sr-find-title">
          {intro
            ? "Find my AI histories"
            : phase === "armed"
              ? "Choose your user folder"
              : settled
                ? found.length > 0
                  ? "AI histories found"
                  : "Nothing to import here yet"
                : "Finding your AI histories"}
        </h2>
        {intro ? (
          <p className="sr-find-rule" data-testid="discovery-promise">
            One folder permission · known AI locations only · raw history stays here
          </p>
        ) : phase === "armed" ? (
          <p className="sr-find-lede" data-testid="permission-preview">
            Drag it onto the machine below. StackReplay checks only the known AI history locations
            inside it. It won't open your documents, repositories or downloads, and raw history
            stays on this device.
          </p>
        ) : settled ? (
          <p className="sr-find-lede">
            {found.length > 0
              ? "Choose what to import. Nothing is read until you build the workload."
              : "Drop your user folder (the one that holds .claude or .codex), or connect a history folder yourself."}
          </p>
        ) : (
          <p className="sr-find-lede">
            Asking the folder for each known location by name. Nothing is imported yet.
          </p>
        )}
      </div>

      {intro && remembered !== undefined ? (
        <div className="sr-find-remembered" data-testid="connected-histories">
          <p className="sr-micro text-muted-foreground">Connected AI histories</p>
          <p className="sr-find-remembered-names">
            {remembered.sources.map((source) => source.name).join(" · ")}
          </p>
          <p className="sr-find-fine">
            Last built{" "}
            {new Date(remembered.at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
            . Browsers don't keep folder access between visits, so a refresh asks for your user
            folder again.
          </p>
          <div className="sr-find-more">
            <button
              type="button"
              className="sr-find-link"
              disabled={disabled}
              onClick={arm}
              data-testid="refresh-connected"
            >
              Refresh all →
            </button>
            <button type="button" className="sr-find-link sr-find-link-quiet" onClick={forget}>
              Forget these
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={instrumentRef}
        className="sr-find-instrument"
        data-testid="discovery-instrument"
        style={
          rail === undefined
            ? undefined
            : ({
                "--rail-top": `${rail.top}px`,
                "--rail-height": `${rail.height}px`,
                "--rail-lit": `${rail.lit}px`,
              } as CSSProperties)
        }
      >
        {rail === undefined ? null : (
          <span aria-hidden="true" className="sr-find-rail">
            <span className="sr-find-rail-lit" />
          </span>
        )}
        <div className="sr-find-machine" data-testid="discovery-machine">
          <span
            aria-hidden="true"
            className="sr-find-knot sr-find-knot-machine"
            data-rail-knot={roots.length > 0 ? "lit" : "idle"}
          />
          <div className="sr-find-machine-body">
            <p className="sr-micro">Local machine</p>
            {roots.length > 0 ? (
              <p className="sr-find-machine-root" data-testid="discovery-roots">
                {roots.join(" · ")}
              </p>
            ) : (
              <>
                <p className="sr-find-machine-drop">Drop your user folder here</p>
                <p className="sr-find-fine">
                  {userFolderHint(platform)} A tool folder such as .claude or .codex works too.
                </p>
              </>
            )}
            {dropNote === undefined ? null : (
              <p className="sr-find-note" role="alert" data-testid="discovery-drop-note">
                {dropNote}
              </p>
            )}
          </div>
        </div>

        <ol className="sr-find-rows" aria-label="Known AI history locations">
          {rows.map((row) => (
            <HistoryRowView
              key={row.key}
              row={row}
              selectable={settled}
              disabled={disabled}
              onToggle={toggle}
              onConnect={openChooser}
            />
          ))}
        </ol>

        <div
          className="sr-find-summary"
          data-testid="discovery-summary"
          data-found={found.length}
          hidden={!settled}
        >
          <span
            aria-hidden="true"
            className="sr-find-knot sr-find-knot-summary"
            data-rail-knot={found.length > 0 ? "lit" : "idle"}
            data-state={found.length > 0 ? "found" : "not-found"}
          />
          <p className="sr-micro">{summary}</p>
        </div>
      </div>

      {intro ? (
        <div className="sr-find-actions">
          <Button
            type="button"
            size="lg"
            disabled={disabled}
            onClick={arm}
            data-testid="find-histories"
          >
            Find my AI histories
          </Button>
          {connectToggle("Connect individually →")}
        </div>
      ) : null}

      {phase === "armed" ? (
        <div className="sr-find-actions">
          {connectToggle("Can't drag? Connect individually →")}
          <button type="button" className="sr-find-link sr-find-link-quiet" onClick={reset}>
            Cancel
          </button>
        </div>
      ) : null}

      {settled ? (
        <div className="sr-find-footer" data-testid="discovery-selection">
          {accessNeeded.length > 0 || found.length === 0 ? (
            <p className="sr-find-fine" data-testid="access-guidance">
              A linked folder, WSL, another drive or a custom{" "}
              {[...new Set(accessNeeded.map((row) => row.relocatedBy).filter(Boolean))].join(
                " or ",
              ) || "location"}{" "}
              isn't visible from here. Connect it with the folder chooser, which follows links.
              {platform === "windows"
                ? " For WSL, choose \\\\wsl.localhost\\<distro>\\home\\<you>\\.claude\\projects or .codex\\sessions."
                : ""}
            </p>
          ) : null}
          <div className="sr-find-build">
            <div className="min-w-0">
              <p className="sr-micro" data-testid="selection-count">
                {selected.length} selected
                {selected.length > 0
                  ? ` · ${count.format(selectedFiles)} files${unmeasured ? "" : ` · ${formatBytes(selectedBytes)}`}`
                  : ""}
              </p>
              {selectedBytes > LARGE_HISTORY_BYTES ? (
                <LargeHistoryNote bytes={selectedBytes} />
              ) : (
                <p className="sr-find-fine">
                  {saveLocal
                    ? "Only normalized usage is kept, in this browser."
                    : "The workload stays available until this page reloads."}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="lg"
              disabled={disabled || selected.length === 0 || building}
              onClick={() => void build()}
              data-testid="build-workload"
              aria-label={`Build my workload from ${selected.length} selected ${selected.length === 1 ? "history" : "histories"}`}
            >
              Build my workload →
            </Button>
          </div>
          <div className="sr-find-more">
            <button
              type="button"
              className="sr-find-link"
              disabled={disabled}
              onClick={() => openChooser()}
              data-testid="add-location"
            >
              Add another location →
            </button>
            {connectToggle("Connect individually", true)}
            <button type="button" className="sr-find-link sr-find-link-quiet" onClick={reset}>
              Start over
            </button>
          </div>
          <p className="sr-find-fine" data-testid="chooser-note">
            You can also drop another folder on the machine. Connect and Add another location open
            your browser's folder chooser: choose the AI history folder itself, because the browser
            gives this page the list of files in the folder you pick. Its confirmation may describe
            sending files to this site; StackReplay reads them on this device and sends none of
            them.
          </p>
        </div>
      ) : null}

      <div
        id={connectId}
        hidden={!connectOpen}
        className="sr-find-connect"
        data-testid="connect-panel"
      >
        <p className="sr-micro text-muted-foreground">Connect individually</p>
        <p className="sr-find-lede mb-3">
          Choose one tool's history folder. StackReplay reads only that folder, on this device, and
          scans it straight away.
        </p>
        {connectIndividually}
      </div>
      <input
        ref={chooserRef}
        type="file"
        multiple
        disabled={disabled}
        {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        data-testid="discovery-folder-input"
        onChange={(event) => {
          void onChosen(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </section>
  );
}

/** Where each history lives, for the picker hint: a hidden folder in the home folder. */
const HIDDEN_FOLDERS: Readonly<Record<string, string>> = {
  "claude-code": "~/.claude/projects",
  codex: "~/.codex/sessions",
  "command-code": "~/.commandcode/projects",
};

const TAGS: Record<RowStatus, string> = {
  waiting: "",
  checking: "Checking",
  found: "Found",
  connected: "Connected",
  empty: "No sessions yet",
  "access-needed": "Additional access required",
  unsupported: "Not readable in browser",
  "not-found": "Not found",
};

/** A text mark for each state, so no state depends on color. */
const MARKS: Partial<Record<RowStatus, string>> = {
  found: "✓",
  connected: "✓",
  "access-needed": "!",
  unsupported: "–",
  empty: "–",
  "not-found": "–",
};

function HistoryRowView({
  row,
  selectable,
  disabled,
  onToggle,
  onConnect,
}: {
  row: HistoryRow;
  selectable: boolean;
  disabled: boolean;
  onToggle: (key: string, value: boolean) => void;
  onConnect: (key?: string) => void;
}) {
  const inputId = useId();
  const detailId = useId();
  const files =
    row.fileCount === undefined
      ? undefined
      : `${count.format(row.fileCount)}${row.truncated === true ? "+" : ""} file${row.fileCount === 1 ? "" : "s"}${row.bytes === undefined ? "" : ` · ${formatBytes(row.bytes)}`}`;
  const detail =
    row.status === "checking"
      ? row.fileCount === undefined
        ? undefined
        : `${count.format(row.fileCount)} files so far`
      : row.status === "found" || row.status === "connected"
        ? [
            files,
            row.via === "chooser"
              ? `from ${row.where}`
              : row.extra === true
                ? `in ${row.where}`
                : undefined,
          ]
            .filter(Boolean)
            .join(" · ")
        : row.status === "access-needed"
          ? row.unconfirmed === true
            ? `This folder has the name of its history folder, but nothing shows it is ${row.name}'s, so StackReplay did not look inside. Drop the folder that holds it${parentOf(row) === undefined ? "" : ` (${parentOf(row)})`}, or connect it to choose it yourself.`
            : "Installed here, but its history folder isn't visible. It may be a link or a custom location."
          : row.status === "unsupported"
            ? "Found. The browser can't read this tool's database yet."
            : row.status === "empty"
              ? row.via === "chooser"
                ? `No session files in ${row.where ?? "that folder"}.`
                : "The folder exists but holds no sessions yet."
              : undefined;
  const checkable = selectable && FOUND.includes(row.status);
  const mark = MARKS[row.status];
  const tag =
    row.status === "waiting" ? null : (
      <span className="sr-find-tag" data-status={row.status}>
        {mark === undefined ? null : <span aria-hidden="true">{mark} </span>}
        {TAGS[row.status]}
      </span>
    );
  return (
    <li
      className="sr-find-row"
      data-status={row.status}
      data-testid={`history-${row.key}`}
      aria-busy={row.status === "checking" ? true : undefined}
    >
      <span
        aria-hidden="true"
        className="sr-find-knot"
        data-state={row.status}
        data-rail-knot={SETTLED.includes(row.status) || row.status === "checking" ? "lit" : "idle"}
      />
      <div className="sr-find-row-body">
        {checkable ? (
          <label htmlFor={inputId} className="sr-find-choice">
            <input
              id={inputId}
              type="checkbox"
              checked={row.selected}
              disabled={disabled}
              aria-describedby={detail === undefined ? undefined : detailId}
              onChange={(event) => onToggle(row.key, event.target.checked)}
              data-testid={`select-${row.key}`}
            />
            <span className="sr-find-name">{row.name}</span>
            {tag}
          </label>
        ) : (
          <p className="sr-find-choice">
            <span className="sr-find-name">{row.name}</span>
            {tag}
          </p>
        )}
        {detail === undefined || detail === "" ? null : (
          <p className="sr-find-detail" id={detailId}>
            {detail}
          </p>
        )}
        {row.status === "access-needed" && selectable ? (
          <button
            type="button"
            className="sr-find-link"
            disabled={disabled}
            onClick={() => onConnect(row.key)}
            data-testid={`connect-row-${row.key}`}
          >
            Connect {row.name} →
          </button>
        ) : null}
        {row.status === "access-needed" && selectable ? (
          <p className="sr-find-detail" data-testid={`connect-hint-${row.key}`}>
            {HIDDEN_FOLDERS[row.adapterId ?? row.key] === undefined
              ? ""
              : `Choose ${HIDDEN_FOLDERS[row.adapterId ?? row.key]}. It is a hidden folder: in the picker, press ⌘⇧. on a Mac or Ctrl+H on Linux to show it. `}
            Your browser will call this an upload. The files are read in this tab; none are sent
            anywhere.
          </p>
        ) : null}
      </div>
    </li>
  );
}
