import { CLAUDE_CODE_DISCOVERY } from "./adapters/claude-code.discovery.js";
import { CODEX_DISCOVERY } from "./adapters/codex.discovery.js";
import { COMMAND_CODE_DISCOVERY } from "./adapters/command-code.discovery.js";
import { HERMES_DISCOVERY } from "./adapters/hermes.discovery.js";
import { OPENCODE_DISCOVERY } from "./adapters/opencode.discovery.js";
import { BROWSER_SOURCE_FORMATS } from "./browser-formats.js";
import type {
  DiscoveryPlatform,
  HistoryNames,
  KnownLocation,
  SourceDiscovery,
} from "./discovery-types.js";
import type { AdapterId } from "./types.js";

export type {
  ChildMarker,
  DiscoveryPlatform,
  HistoryNames,
  KnownLocation,
  RootSignature,
  SourceDiscovery,
} from "./discovery-types.js";

/**
 * Local AI history discovery.
 *
 * The user grants one folder: normally their home or profile folder, but it
 * may be a tool folder (`.claude`), a history folder (`projects`), a data
 * folder holding a database, or a custom root. Discovery works out which by
 * asking the folder for registered names, one component at a time: the full
 * home-relative location, the rest of that location when the folder is part of
 * it, and the exact children a tool's root is known to hold. It never lists the
 * granted folder or any folder on the way to a location. The only listing
 * happens inside a history folder: to tell two tools' same-named folders apart
 * by file names (bounded to a few subfolders), and to count its files, bounded
 * by the adapter's declared depth. File sizes come without reading content.
 * Parsing waits until the user chooses what to import.
 */

/** Every source with a known local history, in the order discovery reports them. */
export const DISCOVERY_REGISTRY: readonly SourceDiscovery[] = [
  CLAUDE_CODE_DISCOVERY,
  CODEX_DISCOVERY,
  COMMAND_CODE_DISCOVERY,
  OPENCODE_DISCOVERY,
  HERMES_DISCOVERY,
];

/** Inventory stops here: the browser import refuses more candidates than this. */
export const DISCOVERY_MAX_FILES = 20_000;

/** How many subfolders of a candidate history folder the file-name check may look into. */
export const NAME_CHECK_FOLDERS = 4;

export interface DiscoveryFile {
  readonly name: string;
  /** The file's size in bytes, without reading it; undefined when the browser cannot say. */
  size(): Promise<number | undefined>;
}

export interface DiscoveryDirectory<F extends DiscoveryFile = DiscoveryFile> {
  readonly name: string;
  /** The named child folder, or null when it is absent or not visible. Never lists. */
  directory(name: string): Promise<DiscoveryDirectory<F> | null>;
  /** The named child file, or null. Never reads it. */
  file(name: string): Promise<F | null>;
  /** This folder's children. Discovery calls it only inside a found history folder. */
  list(): Promise<{ directories: DiscoveryDirectory<F>[]; files: F[] }>;
}

/**
 * - `found`: a readable history the browser can import.
 * - `empty`: the history folder exists but holds no session files yet.
 * - `access-needed`: the tool is installed here but its history is not visible
 *   (a link, a relocated folder); it needs its own folder choice.
 * - `unsupported`: the history exists, but the browser cannot parse its format.
 * - `not-found`: nothing from this tool under the chosen folder. Normal, not an error.
 */
export type DiscoveryStatus =
  | "checking"
  | "found"
  | "empty"
  | "access-needed"
  | "unsupported"
  | "not-found";

export interface DiscoveredFile<F extends DiscoveryFile> {
  file: F;
  /** Components below the chosen folder, for local display only. */
  path: readonly string[];
}

export interface SourceFinding<F extends DiscoveryFile = DiscoveryFile> {
  adapterId: AdapterId;
  name: string;
  status: DiscoveryStatus;
  /** Whether the browser import can parse this source. */
  importable: boolean;
  /** The matched location below the chosen folder. */
  location?: readonly string[];
  /** History files found so far (while checking) or in total. */
  fileCount?: number;
  /** Total size, present only when every counted file reported its size. */
  bytes?: number;
  /** Inventory stopped at DISCOVERY_MAX_FILES. */
  truncated?: boolean;
  files?: DiscoveredFile<F>[];
  relocatedBy?: string;
}

export interface DiscoveryRun<F extends DiscoveryFile = DiscoveryFile> {
  root: string;
  findings: SourceFinding<F>[];
  /** Named lookups made: every one is a registered location or a component of one. */
  probes: number;
  /** Folders listed: every one is inside a found history folder. */
  listings: number;
  /** Time spent probing and measuring, excluding any pacing the caller added. */
  durationMs: number;
}

export interface DiscoveryOptions<F extends DiscoveryFile> {
  registry?: readonly SourceDiscovery[];
  /** A hint from the browser: its locations are tried first. The chosen folder decides. */
  platform?: DiscoveryPlatform | undefined;
  importable?: (adapterId: AdapterId) => boolean;
  /** Called with each real state change, including running file counts. */
  onFinding?: (finding: SourceFinding<F>) => void;
  /** Awaited before each source is checked; a caller may pace the reveal of real work. */
  beforeSource?: (source: SourceDiscovery) => Promise<void>;
  maxFiles?: number;
  now?: () => number;
  signal?: AbortSignal;
}

const BROWSER_IMPORTABLE = new Set<string>(BROWSER_SOURCE_FORMATS.map((format) => format.id));

function byName(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, "en", { sensitivity: "accent" }) === 0;
}

/**
 * The component lists to try under a chosen folder for one location.
 *
 * The full path assumes the folder is a home or profile folder. When the folder
 * is itself part of the path (someone chose `.claude` or `.codex`), the rest of
 * the path is tried from there. A folder that *is* a history folder is tried
 * when the source can confirm it by file names (`historyNames`), or when exactly
 * one registered location ends with its name; a folder called `projects` is
 * never guessed to be Claude Code rather than Command Code. Every returned path
 * is the tail of a registered location.
 */
export function anchoredPaths(
  location: KnownLocation,
  rootName: string,
  registry: readonly SourceDiscovery[] = DISCOVERY_REGISTRY,
  role: "history" | "installed" = "history",
  /** The source can confirm a same-named history folder by its file names. */
  verifiable = false,
): (readonly string[])[] {
  const paths: (readonly string[])[] = [location.path];
  location.path.forEach((component, index) => {
    if (!sameName(component, rootName)) return;
    const rest = location.path.slice(index + 1);
    // A chosen folder that is itself an installation marker proves the tool is here.
    if (rest.length === 0 && role === "history" && !verifiable) {
      const endingHere = registry
        .flatMap((source) => source.history)
        .filter((candidate) => sameName(candidate.path.at(-1) ?? "", rootName));
      if (endingHere.length !== 1) return;
    }
    paths.push(rest);
  });
  return paths;
}

function ordered(
  locations: readonly KnownLocation[],
  platform: DiscoveryPlatform | undefined,
): KnownLocation[] {
  if (platform === undefined) return [...locations];
  const hinted = locations.filter((location) => location.platforms.includes(platform));
  return [...hinted, ...locations.filter((location) => !hinted.includes(location))];
}

class Prober<F extends DiscoveryFile> {
  probes = 0;
  listings = 0;
  private readonly directories = new Map<string, Promise<DiscoveryDirectory<F> | null>>();
  private readonly files = new Map<string, Promise<F | null>>();

  constructor(root: DiscoveryDirectory<F>) {
    this.directories.set("", Promise.resolve(root));
  }

  directory(path: readonly string[]): Promise<DiscoveryDirectory<F> | null> {
    const key = path.join("\u0000");
    const cached = this.directories.get(key);
    if (cached !== undefined) return cached;
    const lookup = this.directory(path.slice(0, -1)).then(async (parent) => {
      if (parent === null) return null;
      this.probes += 1;
      return parent.directory(path.at(-1) as string);
    });
    this.directories.set(key, lookup);
    return lookup;
  }

  file(path: readonly string[]): Promise<F | null> {
    const key = path.join("\u0000");
    const cached = this.files.get(key);
    if (cached !== undefined) return cached;
    const lookup = this.directory(path.slice(0, -1)).then(async (parent) => {
      if (parent === null) return null;
      this.probes += 1;
      return parent.file(path.at(-1) as string);
    });
    this.files.set(key, lookup);
    return lookup;
  }

  async exists(kind: "directory" | "file", path: readonly string[]): Promise<boolean> {
    if (path.length === 0) return kind === "directory";
    return kind === "directory"
      ? (await this.directory(path)) !== null
      : (await this.file(path)) !== null;
  }

  private readonly listed = new Map<
    DiscoveryDirectory<F>,
    ReturnType<DiscoveryDirectory<F>["list"]>
  >();

  /** Lists a folder once, however many sources look into it. */
  list(directory: DiscoveryDirectory<F>): ReturnType<DiscoveryDirectory<F>["list"]> {
    const cached = this.listed.get(directory);
    if (cached !== undefined) return cached;
    this.listings += 1;
    const listing = directory.list();
    this.listed.set(directory, listing);
    return listing;
  }
}

function aborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

/**
 * Whether a candidate history folder holds this source's kind of files, judged
 * by names in the folder and its first few subfolders. Nothing is read.
 */
async function namesFit<F extends DiscoveryFile>(
  prober: Prober<F>,
  directory: DiscoveryDirectory<F>,
  names: HistoryNames,
): Promise<boolean> {
  const anyOf = names.anyOf.map((pattern) => new RegExp(pattern, "u"));
  const noneOf = (names.noneOf ?? []).map((pattern) => new RegExp(pattern, "u"));
  const seen: string[] = [];
  const top = await prober.list(directory);
  const collect = (listing: Awaited<typeof top>) => {
    for (const file of listing.files) seen.push(file.name);
    for (const folder of listing.directories) seen.push(folder.name);
  };
  collect(top);
  for (const folder of [...top.directories].sort(byName).slice(0, NAME_CHECK_FOLDERS)) {
    collect(await prober.list(folder));
  }
  return (
    seen.some((name) => anyOf.some((pattern) => pattern.test(name))) &&
    !seen.some((name) => noneOf.some((pattern) => pattern.test(name)))
  );
}

/** Lists a found history folder, bounded by the adapter's depth, extension and file limit. */
async function inventory<F extends DiscoveryFile>(
  prober: Prober<F>,
  directory: DiscoveryDirectory<F>,
  location: readonly string[],
  spec: NonNullable<SourceDiscovery["inventory"]>,
  limit: number,
  onCount: (count: number) => void,
  signal: AbortSignal | undefined,
): Promise<{ files: DiscoveredFile<F>[]; truncated: boolean }> {
  const files: DiscoveredFile<F>[] = [];
  let truncated = false;
  let lastReported = 0;
  const visit = async (
    current: DiscoveryDirectory<F>,
    path: readonly string[],
    depth: number,
  ): Promise<void> => {
    if (truncated || aborted(signal)) return;
    const children = await prober.list(current);
    for (const file of [...children.files].sort(byName)) {
      const name = file.name.toLowerCase();
      if (!name.endsWith(spec.extension)) continue;
      if (spec.excludeSuffixes?.some((suffix) => name.endsWith(suffix))) continue;
      if (files.length >= limit) {
        truncated = true;
        return;
      }
      files.push({ file, path: [...path, file.name] });
    }
    if (files.length - lastReported >= 100) {
      lastReported = files.length;
      onCount(files.length);
    }
    if (depth >= spec.maxDepth) return;
    for (const child of [...children.directories].sort(byName)) {
      await visit(child, [...path, child.name], depth + 1);
      if (truncated) return;
    }
  };
  await visit(directory, location, 0);
  return { files, truncated };
}

async function totalSize<F extends DiscoveryFile>(
  files: readonly DiscoveredFile<F>[],
): Promise<number | undefined> {
  let total = 0;
  for (let start = 0; start < files.length; start += 64) {
    const sizes = await Promise.all(files.slice(start, start + 64).map(({ file }) => file.size()));
    for (const size of sizes) {
      if (size === undefined) return undefined;
      total += size;
    }
  }
  return total;
}

/**
 * Where this source's history is under the chosen folder, if anywhere: the
 * registered location or the rest of it (tried by name), then a root the
 * source recognizes by its exact children. A history folder reached without its
 * tool's own parent folder must also fit the source's file names.
 */
async function locateHistory<F extends DiscoveryFile>(
  prober: Prober<F>,
  root: DiscoveryDirectory<F>,
  source: SourceDiscovery,
  registry: readonly SourceDiscovery[],
  platform: DiscoveryPlatform | undefined,
): Promise<{ path: readonly string[]; kind: "directory" | "file" } | undefined> {
  const confirmed = async (path: readonly string[], kind: "directory" | "file", named: boolean) => {
    if (kind === "file" || named || source.historyNames === undefined) return true;
    const directory = path.length === 0 ? root : await prober.directory(path);
    return directory !== null && namesFit(prober, directory, source.historyNames);
  };
  const verifiable = source.historyNames !== undefined;
  for (const location of ordered(source.history, platform)) {
    for (const path of anchoredPaths(location, root.name, registry, "history", verifiable)) {
      if (!(await prober.exists(location.kind, path))) continue;
      // The folder itself is the history folder: its name alone may be shared.
      if (await confirmed(path, location.kind, path.length > 0))
        return { path, kind: location.kind };
    }
  }
  for (const signature of source.roots ?? []) {
    let present = true;
    for (const marker of signature.requires) {
      if (!(await prober.exists(marker.kind, [marker.name]))) {
        present = false;
        break;
      }
    }
    if (!present) continue;
    if (!(await prober.exists(signature.kind, signature.history))) continue;
    // Two tools can share a root signature; the history's file names decide.
    if (await confirmed(signature.history, signature.kind, false))
      return { path: signature.history, kind: signature.kind };
  }
  return undefined;
}

/**
 * Checks one chosen folder for every registered history.
 *
 * Findings are reported as they become real: `checking` when a source's probe
 * starts (with running file counts inside a found folder), then its settled
 * status. Nothing is parsed.
 */
export async function discoverHistories<F extends DiscoveryFile>(
  root: DiscoveryDirectory<F>,
  options: DiscoveryOptions<F> = {},
): Promise<DiscoveryRun<F>> {
  const registry = options.registry ?? DISCOVERY_REGISTRY;
  const importable = options.importable ?? ((id: AdapterId) => BROWSER_IMPORTABLE.has(id));
  const limit = options.maxFiles ?? DISCOVERY_MAX_FILES;
  const now = options.now ?? (() => Date.now());
  const started = now();
  const prober = new Prober(root);
  const findings: SourceFinding<F>[] = [];

  let paced = 0;
  for (const source of registry) {
    if (aborted(options.signal)) break;
    if (options.beforeSource !== undefined) {
      const waited = now();
      await options.beforeSource(source);
      paced += now() - waited;
    }
    const base = {
      adapterId: source.adapterId,
      name: source.name,
      importable: importable(source.adapterId),
      ...(source.relocatedBy === undefined ? {} : { relocatedBy: source.relocatedBy }),
    };
    options.onFinding?.({ ...base, status: "checking" });

    const match = await locateHistory(prober, root, source, registry, options.platform);

    let finding: SourceFinding<F>;
    if (match === undefined) {
      let installed = false;
      if (base.importable) {
        for (const marker of ordered(source.installed, options.platform)) {
          for (const path of anchoredPaths(marker, root.name, registry, "installed")) {
            if (await prober.exists(marker.kind, path)) installed = true;
            if (installed) break;
          }
          if (installed) break;
        }
      }
      finding = { ...base, status: installed ? "access-needed" : "not-found" };
    } else if (!base.importable) {
      finding = { ...base, status: "unsupported", location: match.path };
    } else if (source.inventory === undefined || match.kind === "file") {
      finding = { ...base, status: "unsupported", location: match.path };
    } else {
      const directory = match.path.length === 0 ? root : await prober.directory(match.path);
      if (directory === null) throw new Error("A probed history folder disappeared");
      const listed = await inventory(
        prober,
        directory,
        match.path,
        source.inventory,
        limit,
        (count) => options.onFinding?.({ ...base, status: "checking", fileCount: count }),
        options.signal,
      );
      const bytes = await totalSize(listed.files);
      finding = {
        ...base,
        status: listed.files.length === 0 ? "empty" : "found",
        location: match.path,
        fileCount: listed.files.length,
        ...(bytes === undefined ? {} : { bytes }),
        ...(listed.truncated ? { truncated: true } : {}),
        files: listed.files,
      };
    }
    findings.push(finding);
    options.onFinding?.(finding);
  }

  return {
    root: root.name,
    findings,
    probes: prober.probes,
    listings: prober.listings,
    durationMs: Math.max(0, now() - started - paced),
  };
}

/** A browser platform hint, from `navigator.userAgentData.platform` or `navigator.platform`. */
export function discoveryPlatformFromHint(hint: string | undefined): DiscoveryPlatform | undefined {
  if (hint === undefined) return undefined;
  if (/win/iu.test(hint)) return "windows";
  if (/mac|iphone|ipad/iu.test(hint)) return "macos";
  if (/linux|x11|cros/iu.test(hint)) return "linux";
  return undefined;
}

/**
 * Every path discovery may ask for by name, as joined component strings: each
 * registered location and every prefix of it, and each root signature's child
 * names. The privacy contract tests compare every real probe against this set.
 */
export function registeredProbePaths(
  registry: readonly SourceDiscovery[] = DISCOVERY_REGISTRY,
): Set<string> {
  const paths = new Set<string>();
  const add = (path: readonly string[]) => {
    for (let end = 1; end <= path.length; end += 1) paths.add(path.slice(0, end).join("/"));
  };
  for (const source of registry) {
    for (const location of [...source.history, ...source.installed]) add(location.path);
    for (const signature of source.roots ?? []) {
      for (const marker of signature.requires) add([marker.name]);
      add(signature.history);
    }
  }
  return paths;
}
