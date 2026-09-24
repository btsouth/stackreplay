import {
  DISCOVERY_REGISTRY,
  type DiscoveryFile,
  type SourceDiscovery,
  type SourceFinding,
} from "@stackreplay/adapters/discovery";

/**
 * The discovered-history list behind Find my AI histories: one row per
 * registered source, plus any second location or folder the user connects.
 * Pure state rules, kept apart from the component so they are unit tested.
 */

/** A discovered file the browser hands over as a File when the build starts. */
export interface ResolvableFile extends DiscoveryFile {
  file(): Promise<File>;
}

export type RowStatus = SourceFinding["status"] | "waiting" | "connected";

export interface RowFile {
  get(): Promise<File>;
  path: string;
}

export interface HistoryRow {
  /** Also the scan's history group: a lowercase identifier, never a path. */
  key: string;
  adapterId?: string;
  name: string;
  status: RowStatus;
  fileCount?: number;
  bytes?: number;
  truncated?: boolean;
  /** The folder this history was found in or chosen as, shown on this screen only. */
  where?: string;
  via?: "discovery" | "chooser";
  /** A second location for a history already found in another folder. */
  extra?: boolean;
  /** Access needed because the folder was only named like this history, so not examined. */
  unconfirmed?: boolean;
  relocatedBy?: string;
  files?: RowFile[];
  selected: boolean;
}

export interface HistorySelection {
  /**
   * Every discovered file of the selected histories. One the browser would not
   * hand over carries `unavailable` (the browser's error name) and an empty
   * placeholder, so the scan reports it instead of silently leaving it out.
   */
  files: { file: File; path: string; group: string; unavailable?: string }[];
  label: string;
  histories: { id: string; name: string; files: number; bytes?: number }[];
  bytes: number;
  remembered: { id: string; name: string; via: "discovery" | "chooser" }[];
}

export const FOUND: readonly RowStatus[] = ["found", "connected"];
export const SETTLED: readonly RowStatus[] = [
  "found",
  "connected",
  "empty",
  "access-needed",
  "unsupported",
  "not-found",
];
/** How strongly a row says something is here; a later folder can only raise it. */
export const STRENGTH: readonly RowStatus[] = [
  "waiting",
  "checking",
  "not-found",
  "empty",
  "unsupported",
  "access-needed",
  "found",
  "connected",
];

export function waitingRows(): HistoryRow[] {
  return DISCOVERY_REGISTRY.map((source) => ({
    key: source.adapterId,
    adapterId: source.adapterId,
    name: source.name,
    status: "waiting",
    selected: false,
  }));
}

export function rowFromFinding(
  finding: SourceFinding<ResolvableFile>,
  key: string,
  where: string,
  extra: boolean,
  via: "discovery" | "chooser" = "discovery",
): HistoryRow {
  return {
    key,
    adapterId: finding.adapterId,
    name: finding.name,
    status: finding.status,
    where,
    via,
    ...(extra ? { extra: true } : {}),
    ...(finding.fileCount === undefined ? {} : { fileCount: finding.fileCount }),
    ...(finding.bytes === undefined ? {} : { bytes: finding.bytes }),
    ...(finding.truncated === true ? { truncated: true } : {}),
    ...(finding.relocatedBy === undefined ? {} : { relocatedBy: finding.relocatedBy }),
    ...(finding.unconfirmed === true ? { unconfirmed: true } : {}),
    ...(finding.files === undefined
      ? {}
      : {
          files: finding.files.map((entry) => ({
            get: () => entry.file.file(),
            path: entry.path.join("/"),
          })),
        }),
    // Found histories start selected: the list is the explicit review step.
    selected: finding.status === "found",
  };
}

/**
 * Folds a finding into the list. The first folder fills the registry rows. A
 * later folder can only strengthen a row (a history found where the first had
 * none) or add a second location for a history that is already found.
 */
export function mergeFinding(
  rows: HistoryRow[],
  finding: SourceFinding<ResolvableFile>,
  where: string,
  first: boolean,
  via: "discovery" | "chooser" = "discovery",
): HistoryRow[] {
  const index = rows.findIndex((row) => row.key === finding.adapterId);
  if (index === -1) return rows;
  const existing = rows[index] as HistoryRow;
  const next = [...rows];
  if (first) {
    next[index] = rowFromFinding(finding, finding.adapterId, where, false, via);
    return next;
  }
  if (finding.status === "checking") return rows;
  if (FOUND.includes(existing.status)) {
    if (finding.status !== "found") return rows;
    const siblings = rows.filter((row) => row.adapterId === finding.adapterId).length;
    next.splice(
      index + siblings,
      0,
      rowFromFinding(finding, `${finding.adapterId}-${siblings + 1}`, where, true, via),
    );
    return next;
  }
  if (STRENGTH.indexOf(finding.status) <= STRENGTH.indexOf(existing.status)) return rows;
  next[index] = rowFromFinding(finding, finding.adapterId, where, false, via);
  return next;
}

export function sourceFor(row: HistoryRow | undefined): SourceDiscovery | undefined {
  return DISCOVERY_REGISTRY.find((source) => source.adapterId === row?.adapterId);
}

/** The chosen folder's files this history would import: its session files only. */
export function chosenFiles(files: File[], source: SourceDiscovery | undefined): File[] {
  const spec = source?.inventory;
  return files.filter((file) => {
    const name = file.name.toLowerCase();
    if (spec === undefined) return /\.(jsonl|json)$/u.test(name);
    if (!name.endsWith(spec.extension)) return false;
    return !spec.excludeSuffixes?.some((suffix) => name.endsWith(suffix));
  });
}

/**
 * Folds what a folder picked with the folder chooser turned out to be into the
 * list. Recognized histories join like a later drop. A tool's own Connect
 * button trusts the person when the folder is not recognized: the row takes
 * the folder's session files and the scan confirms them. A folder recognized
 * as nothing becomes an added location, identified by content at import.
 */
export function applyChosenFolder(
  rows: HistoryRow[],
  findings: readonly SourceFinding<ResolvableFile>[],
  files: readonly File[],
  folder: string,
  targetKey: string | undefined,
): HistoryRow[] {
  const target = targetKey === undefined ? undefined : rows.find((row) => row.key === targetKey);
  const own = findings.find(
    (finding) =>
      finding.adapterId === target?.adapterId &&
      (finding.status === "found" || finding.status === "empty"),
  );
  const recognized = findings.filter(
    (finding) =>
      finding !== own &&
      (finding.status === "found" ||
        finding.status === "empty" ||
        finding.status === "unsupported"),
  );
  let next = rows;
  for (const finding of recognized) next = mergeFinding(next, finding, folder, false, "chooser");
  if (target !== undefined) {
    const row =
      own === undefined
        ? connectedRow(target, chosenFiles([...files], sourceFor(target)), folder)
        : rowFromFinding(own, target.key, folder, false, "chooser");
    return next.map((existing) => (existing.key === target.key ? row : existing));
  }
  if (recognized.length > 0) return next;
  const locations = next.filter((row) => row.key.startsWith("location-")).length;
  return [
    ...next,
    connectedRow(
      { key: `location-${locations + 1}`, name: "Added location" },
      chosenFiles([...files], undefined),
      folder,
    ),
  ];
}

function connectedRow(
  base: { key: string; name: string; adapterId?: string },
  files: File[],
  folder: string,
): HistoryRow {
  return {
    key: base.key,
    ...(base.adapterId === undefined ? {} : { adapterId: base.adapterId }),
    name: base.name,
    status: files.length === 0 ? "empty" : "connected",
    where: folder,
    via: "chooser",
    fileCount: files.length,
    bytes: files.reduce((total, file) => total + file.size, 0),
    files: files.map((file) => ({
      get: () => Promise.resolve(file),
      path: file.webkitRelativePath || file.name,
    })),
    selected: files.length > 0,
  };
}

function browserErrorName(error: unknown): string {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? (error as { name: unknown }).name
      : undefined;
  return typeof name === "string" && /^[A-Za-z]{1,40}$/u.test(name) && name !== "Error"
    ? name
    : "NotReadableError";
}

/**
 * Hands the selected histories' files to a build. A discovered file the
 * browser no longer hands over is kept as an unavailable entry, so the scan
 * counts and reports it as unreadable; the workload then says it is partial.
 */
export async function collectSelection(selected: readonly HistoryRow[]): Promise<HistorySelection> {
  const files: HistorySelection["files"] = [];
  for (const row of selected) {
    for (const entry of row.files ?? []) {
      try {
        files.push({ file: await entry.get(), path: entry.path, group: row.key });
      } catch (error) {
        const name = entry.path.split("/").at(-1) ?? entry.path;
        files.push({
          file: new File([], name),
          path: entry.path,
          group: row.key,
          unavailable: browserErrorName(error),
        });
      }
    }
  }
  return {
    files,
    label: [...new Set(selected.map((row) => row.name))].join(" + "),
    histories: selected.map((row) => ({
      id: row.key,
      name: row.extra === true ? `${row.name} · ${row.where}` : row.name,
      files: row.fileCount ?? 0,
      ...(row.bytes === undefined ? {} : { bytes: row.bytes }),
    })),
    bytes: selected.reduce((total, row) => total + (row.bytes ?? 0), 0),
    remembered: selected.flatMap((row) =>
      row.adapterId === undefined || row.extra === true
        ? []
        : [{ id: row.adapterId, name: row.name, via: row.via ?? "discovery" }],
    ),
  };
}
