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
  relocatedBy?: string;
  files?: RowFile[];
  selected: boolean;
}

export interface HistorySelection {
  files: { file: File; path: string; group: string }[];
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
): HistoryRow {
  return {
    key,
    adapterId: finding.adapterId,
    name: finding.name,
    status: finding.status,
    where,
    via: "discovery",
    ...(extra ? { extra: true } : {}),
    ...(finding.fileCount === undefined ? {} : { fileCount: finding.fileCount }),
    ...(finding.bytes === undefined ? {} : { bytes: finding.bytes }),
    ...(finding.truncated === true ? { truncated: true } : {}),
    ...(finding.relocatedBy === undefined ? {} : { relocatedBy: finding.relocatedBy }),
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
): HistoryRow[] {
  const index = rows.findIndex((row) => row.key === finding.adapterId);
  if (index === -1) return rows;
  const existing = rows[index] as HistoryRow;
  const next = [...rows];
  if (first) {
    next[index] = rowFromFinding(finding, finding.adapterId, where, false);
    return next;
  }
  if (finding.status === "checking") return rows;
  if (FOUND.includes(existing.status)) {
    if (finding.status !== "found") return rows;
    const siblings = rows.filter((row) => row.adapterId === finding.adapterId).length;
    next.splice(
      index + siblings,
      0,
      rowFromFinding(finding, `${finding.adapterId}-${siblings + 1}`, where, true),
    );
    return next;
  }
  if (STRENGTH.indexOf(finding.status) <= STRENGTH.indexOf(existing.status)) return rows;
  next[index] = rowFromFinding(finding, finding.adapterId, where, false);
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
