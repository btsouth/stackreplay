import type { CandidateOutcome } from "@stackreplay/adapters/browser";
import type { DemoWorkloadPresetId } from "@stackreplay/test-fixtures";

/**
 * Internal Worker protocol (spec point 12, M3 brief).
 *
 * Typed, versioned, and explicit about success and failure: every request gets
 * exactly one terminal response, and progress messages are separate. No
 * arbitrary blobs cross the boundary, and nothing here carries the raw
 * imported file back to the main thread.
 *
 * Stale-response protection is part of the contract: the client sends a
 * monotonically increasing requestId and ignores any response whose id is not
 * the one it is currently waiting for, so a slow import can never overwrite a
 * newer one.
 */

export const WORKER_PROTOCOL_VERSION = 1;

export type ImportPhase = "reading" | "validating" | "preparing";

export type SafeErrorCode =
  | "FILE_UNREADABLE"
  | "FILE_TOO_LARGE"
  | "INTAKE_BUDGET_EXCEEDED"
  | "NOT_JSON"
  | "NOT_STACKREPLAY"
  | "UNSUPPORTED_VERSION"
  | "SCHEMA_INVALID"
  | "REDACTION_VIOLATION"
  | "EMPTY_WORKLOAD"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_CORRUPT"
  | "IMPORT_NOT_FOUND"
  | "IMPORT_CANCELLED"
  | "MEMORY_EXHAUSTED"
  | "REPLAY_FAILED"
  | "INTERNAL";

/**
 * The codes this boundary is allowed to carry.
 *
 * A thrown object is not a `SafeError` just because it has a `code` property: the
 * engine's own errors carry internal codes and identifiers, so a value only
 * crosses the Worker boundary after `isSafeError` has checked it against this
 * list and confirmed the shape (benchmark finding F029).
 */
export const SAFE_ERROR_CODES = [
  "FILE_UNREADABLE",
  "FILE_TOO_LARGE",
  "INTAKE_BUDGET_EXCEEDED",
  "NOT_JSON",
  "NOT_STACKREPLAY",
  "UNSUPPORTED_VERSION",
  "SCHEMA_INVALID",
  "REDACTION_VIOLATION",
  "EMPTY_WORKLOAD",
  "STORAGE_UNAVAILABLE",
  "STORAGE_CORRUPT",
  "IMPORT_NOT_FOUND",
  "IMPORT_CANCELLED",
  "MEMORY_EXHAUSTED",
  "REPLAY_FAILED",
  "INTERNAL",
] as const satisfies readonly SafeErrorCode[];

export function isSafeErrorCode(value: unknown): value is SafeErrorCode {
  return typeof value === "string" && (SAFE_ERROR_CODES as readonly string[]).includes(value);
}

/** Display-safe error. Never contains file content, paths or raw JSON. */
export interface SafeError {
  code: SafeErrorCode;
  title: string;
  message: string;
  hint?: string;
  /** Bounded, content-free details, e.g. "event 14: invalid timestamp". */
  details?: string[];
}

/**
 * Runtime guard for a value that may cross the boundary as a display-safe error.
 *
 * Unknown codes are rejected rather than forwarded, and the text fields must be
 * strings: an object with an arbitrary `code` is not a `SafeError`.
 */
export function isSafeError(value: unknown): value is SafeError {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SafeError>;
  return (
    isSafeErrorCode(candidate.code) &&
    typeof candidate.title === "string" &&
    typeof candidate.message === "string" &&
    (candidate.hint === undefined || typeof candidate.hint === "string") &&
    (candidate.details === undefined ||
      (Array.isArray(candidate.details) &&
        candidate.details.every((detail) => typeof detail === "string")))
  );
}

export interface SourceSummary {
  adapterId: string;
  name: string;
  role: "usage" | "attribution" | "import";
  events: number;
  sessions?: number;
  note?: string;
}

export interface OrchestrationSummary {
  harnessId: string;
  name: string;
  sessions: number;
  events: number;
  /** False when the source is present but no structured attribution was found. */
  precise: boolean;
}

export interface ModelSummary {
  rawName: string;
  canonicalId?: string;
  events: number;
  mapped: boolean;
  /**
   * How the identity was established (M4A): an exact canonical id, the canonical
   * name, or a catalog-declared alias. Absent for unmapped identifiers.
   */
  basis?: "canonical_id" | "canonical_name" | "alias";
  /** The declared alias record behind an alias mapping. */
  aliasId?: string;
}

export interface WorkloadSummary {
  eventCount: number;
  sessionCount: number;
  projectCount: number;
  firstEventAt?: string;
  lastEventAt?: string;
  tokens: {
    /** Sum of fully known event totals. */
    known: number;
    /** Reported part of events whose total is unknown: a lower bound. */
    lowerBound: number;
    unknownEvents: number;
    buckets: {
      uncachedInputTokens: number;
      cacheReadTokens: number;
      cacheWriteTokens: number;
      outputTokens: number;
      reasoningTokens: number;
    };
  };
  models: ModelSummary[];
  usageSources: SourceSummary[];
  orchestration: OrchestrationSummary[];
  /** Sources detected in the file that are not usage sources. */
  otherSources: SourceSummary[];
  redaction: {
    promptsIncluded: false;
    responsesIncluded: false;
    sourceCodeIncluded: false;
    filePathsIncluded: false;
    repositoryNamesIncluded: false;
  };
  catalogVersion: string;
}

export interface ImportRecord {
  /** Opaque revision and serialized byte count, set atomically with each saved payload. */
  payloadRevision?: string;
  payloadBytes?: number;
  id: string;
  label: string;
  createdAt: string;
  eventCount: number;
  summary: WorkloadSummary;
  intake?: {
    outcomes: CandidateOutcome[];
    exactDuplicates: number;
    overlaps: number;
    warnings: { code: string; message: string }[];
  };
  savedLocally?: boolean;
  /**
   * Friendly project labels from this browser's own scan, keyed by the salted
   * project hash the events carry. Local display only: they live in this
   * record in this browser, and never enter the portable export, a share link
   * or any request.
   */
  localProjects?: { hash: string; label: string }[];
}

export type WorkerRequest =
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "IMPORT_SOURCES";
      sourceRootSalt?: string;
      requestId: number;
      importId: string;
      /**
       * `group` names the history a file was selected for (a source id such as
       * `claude-code`, or a connected location), so the scan can report
       * progress per history. It is an identifier, never a path.
       * `unavailable` marks a discovered file the browser would not hand over
       * (the browser's error name); the scan reports it as unreadable.
       */
      files: { file: File; path: string; group?: string; unavailable?: string }[];
      now: string;
      saveLocal: boolean;
      /** The workload's name in this browser, e.g. "Claude Code + Codex". */
      label?: string;
    }
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "EXPORT_LOCAL_IMPORT";
      requestId: number;
      importId: string;
    }
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "IMPORT_FILE";
      requestId: number;
      importId: string;
      label: string;
      file: File;
      now: string;
      saveLocal?: boolean;
    }
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "IMPORT_DEMO";
      requestId: number;
      importId: string;
      preset: DemoWorkloadPresetId;
      now: string;
    }
  | { protocol: typeof WORKER_PROTOCOL_VERSION; type: "LIST_LOCAL_IMPORTS"; requestId: number }
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "DELETE_LOCAL_IMPORT";
      requestId: number;
      importId: string;
    }
  | { protocol: typeof WORKER_PROTOCOL_VERSION; type: "CLEAR_LOCAL_DATA"; requestId: number }
  | { protocol: typeof WORKER_PROTOCOL_VERSION; type: "PING"; requestId: number }
  | { protocol: typeof WORKER_PROTOCOL_VERSION; type: "CANCEL_IMPORT"; requestId: number };

/**
 * Running totals of a local source scan, as the scan instrument shows them.
 * Counts, catalog model names and this browser's own project labels only: no
 * file content, no path, and nothing here ever leaves the browser.
 */
export interface ScanProgress {
  filesDone: number;
  filesTotal: number;
  sessions: number;
  /** Events reconstructed so far, before duplicates across files are removed. */
  events: number;
  skipped: number;
  examinedBytes: number;
  projects: number;
  /** The most frequent catalog models so far, by display name. */
  models: { name: string; events: number }[];
  /** The busiest projects so far, by local label. */
  topProjects: { label: string; events: number }[];
  /** Files read of files selected and events found, per selected history. */
  histories?: { id: string; filesDone: number; filesTotal: number; events: number }[];
}

export type WorkerResponse =
  | { type: "READY"; protocol: typeof WORKER_PROTOCOL_VERSION }
  | { type: "PONG"; requestId: number; protocol: typeof WORKER_PROTOCOL_VERSION }
  | { type: "CANCELLED"; requestId: number }
  | {
      type: "PROGRESS";
      requestId: number;
      operation: "import";
      phase: ImportPhase;
      /** Bounded, human-readable and content-free. */
      detail?: string;
      /** Running totals of a local source scan, when the operation is one. */
      scan?: ScanProgress;
    }
  | { type: "IMPORT_OK"; requestId: number; record: ImportRecord; replacedExisting: boolean }
  | { type: "EXPORTED"; requestId: number; bytes: Uint8Array }
  | { type: "IMPORTS"; requestId: number; imports: ImportRecord[] }
  | { type: "DELETED"; requestId: number; importId: string }
  | { type: "CLEARED"; requestId: number }
  | { type: "ERROR"; requestId: number; error: SafeError };

/** Runtime guard: the client never trusts an untyped message. */
export function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as { type?: unknown; protocol?: unknown };
  if (typeof record.type !== "string") return false;
  if (record.protocol !== undefined && record.protocol !== WORKER_PROTOCOL_VERSION) return false;
  return true;
}

export function protocolMismatch(response: WorkerResponse): boolean {
  return response.type === "READY" || response.type === "PONG"
    ? response.protocol !== WORKER_PROTOCOL_VERSION
    : false;
}
