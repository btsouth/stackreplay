import type { UsageEventV1 } from "@stackreplay/schema";
import type { ModelMapper } from "./models.js";

/**
 * Adapter contract (spec points 13, 14, 16, 17).
 *
 * Adapters read local agent histories and normalize them into canonical
 * usage events. They are the only part of StackReplay that knows a specific
 * tool's on-disk format, and they never invent data: a category a source does
 * not report stays unknown (docs/ADAPTERS.md documents each decision).
 *
 * Three adapter kinds exist:
 * - `usage`: emits canonical usage events from a tool's own history.
 * - `attribution`: emits no usage of its own. It maps provider sessions to the
 *   harness that orchestrated them, so orchestrated runs are attributed
 *   without double counting (spec point 16).
 * - `import`: reads a documented third-party export (for example ccusage
 *   JSON) supplied by the user. Imports are never auto-detected as a source of
 *   truth for the machine.
 */

export type AdapterId =
  | "command-code"
  | "opencode"
  | "codex"
  | "claude-code"
  | "hermes"
  | "t3-code"
  | "ccusage";

export type AdapterKind = "usage" | "attribution" | "import";

export type PlatformId = "linux" | "darwin" | "win32";

export interface PathProbe {
  /** Absolute path that was probed. */
  path: string;
  exists: boolean;
  readable: boolean;
  kind?: "file" | "directory";
  /** Cheaply countable session records, when the layout allows it. */
  sessionCount?: number;
}

export interface DetectionResult {
  adapterId: AdapterId;
  name: string;
  kind: AdapterKind;
  /** The tool's local data was found. */
  detected: boolean;
  /** StackReplay can read this layout. False means detected but unsupported. */
  supported: boolean;
  probes: PathProbe[];
  /** Human-readable explanation, required when detected is false or unsupported is true. */
  note?: string;
}

export type WarningCode =
  | "SOURCE_UNREADABLE"
  | "SOURCE_LAYOUT_UNSUPPORTED"
  | "RECORD_MALFORMED"
  | "RECORD_UNSUPPORTED"
  | "RECORD_INCOMPLETE"
  | "SESSION_PARTIAL"
  | "SESSION_ID_MISSING"
  | "TIMESTAMP_INVALID"
  | "MODEL_UNKNOWN"
  | "MODEL_UNMAPPED"
  | "USAGE_MISSING"
  | "ACCOUNTING_UNESTABLISHED"
  | "SCHEMA_VERSION_UNKNOWN"
  | "PROJECT_UNKNOWN"
  | "SOURCE_TRUNCATED"
  /**
   * A record's reported categories contradict the record's own published total,
   * so its accounting could not be reconciled (its cache categories are then
   * reported as unknown rather than published).
   */
  | "ACCOUNTING_UNRECONCILED"
  /**
   * A record aggregates a whole day, month or block and names no session, so it
   * cannot be matched against a native scan of the same work (decision 24: only
   * session identity can recognise that overlap).
   */
  | "AGGREGATE_NO_SESSION"
  /**
   * An aggregate import was kept alongside native scans of the same provider:
   * the import's rows cannot be deduplicated, so they are counted in addition.
   */
  | "DOUBLE_COUNT_RISK";

export interface AdapterWarning {
  code: WarningCode;
  message: string;
  path?: string;
}

export interface CollectOptions {
  /** Explicit roots overriding platform defaults (used by tests and --source-path). */
  roots?: string[];
  /** Inclusive lower bound, ISO-8601 UTC. */
  since?: string;
  /** Exclusive upper bound, ISO-8601 UTC. */
  until?: string;
  /** Injected clock. Adapters never read the wall clock themselves. */
  now: Date;
  /** Local project-hashing salt. Never exported, never logged. */
  salt: string;
  /** Catalog-backed model resolver shared by all adapters. */
  mapper: ModelMapper;
  /** Harness attribution discovered from attribution adapters (for example T3 Code). */
  attribution?: AttributionIndex;
  /** Explicit input file for import adapters (ccusage). */
  inputFile?: string;
  /** Safety bound on files read per adapter. */
  maxFiles?: number;
  /** Safety bound on bytes read per file, for very large histories. */
  maxFileBytes?: number;
}

export interface CollectStats {
  filesScanned: number;
  filesSkipped: number;
  sessionsScanned: number;
  recordsRead: number;
  recordsUnsupported: number;
  eventsEmitted: number;
}

export function emptyStats(): CollectStats {
  return {
    filesScanned: 0,
    filesSkipped: 0,
    sessionsScanned: 0,
    recordsRead: 0,
    recordsUnsupported: 0,
    eventsEmitted: 0,
  };
}

export interface CollectResult {
  adapterId: AdapterId;
  events: UsageEventV1[];
  warnings: AdapterWarning[];
  stats: CollectStats;
}

/** Attribution of one provider session to the harness that drove it. */
export interface HarnessAttribution {
  harnessId: string;
  harnessSessionId: string;
  attribution: "exact" | "inferred";
}

export interface AttributionIndex {
  /**
   * Keyed by `${providerAdapterId}\u0000${nativeSessionId}` so that two tools
   * reusing the same session id never collide.
   */
  byProviderSession: Map<string, HarnessAttribution>;
  /** Additional provider-history roots discovered from the harness's own data. */
  additionalRoots: { adapterId: AdapterId; path: string }[];
  warnings: AdapterWarning[];
  stats: CollectStats;
}

export function attributionKey(providerAdapterId: AdapterId, nativeSessionId: string): string {
  return `${providerAdapterId}\u0000${nativeSessionId}`;
}

export interface LocalSourceAdapter {
  id: AdapterId;
  name: string;
  kind: AdapterKind;
  defaultRoots(env: SourceEnvironment): string[];
  detect(env: SourceEnvironment): Promise<DetectionResult>;
  collect(env: SourceEnvironment, options: CollectOptions): Promise<CollectResult>;
}

export interface AttributionAdapter {
  id: AdapterId;
  name: string;
  kind: "attribution";
  defaultRoots(env: SourceEnvironment): string[];
  detect(env: SourceEnvironment): Promise<DetectionResult>;
  collectAttribution(env: SourceEnvironment, options: CollectOptions): Promise<AttributionIndex>;
}

export type AnyAdapter = LocalSourceAdapter | AttributionAdapter;

export function isAttributionAdapter(adapter: AnyAdapter): adapter is AttributionAdapter {
  return adapter.kind === "attribution";
}

export function isUsageAdapter(
  adapter: AnyAdapter,
): adapter is LocalSourceAdapter & { kind: "usage" | "import" } {
  return adapter.kind !== "attribution";
}

/** Filesystem surface used by adapters. Injected so fixtures are testable. */
export interface FileSystem {
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ kind: "file" | "directory"; size: number; mtimeMs: number } | null>;
  listDir(path: string): Promise<string[]>;
  readTextFile(path: string, maxBytes?: number): Promise<string>;
  /** Yields non-empty lines without loading the whole file into memory. */
  readLines(path: string, maxBytes?: number): AsyncIterable<string>;
}

export interface SourceEnvironment {
  platform: PlatformId;
  homeDir: string;
  env: Record<string, string | undefined>;
  fs: FileSystem;
  /** Import file supplied on the command line (import adapters only). */
  inputFile?: string;
}
