import type { ExecutionReplayResultV1, ExecutionTargetV1 } from "@stackreplay/schema";
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
export type ReplayPhase = "loading" | "replaying";

export type SafeErrorCode =
  | "FILE_UNREADABLE"
  | "FILE_TOO_LARGE"
  | "NOT_JSON"
  | "NOT_STACKREPLAY"
  | "UNSUPPORTED_VERSION"
  | "SCHEMA_INVALID"
  | "REDACTION_VIOLATION"
  | "EMPTY_WORKLOAD"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_CORRUPT"
  | "IMPORT_NOT_FOUND"
  | "REPLAY_FAILED"
  | "INTERNAL";

/** Display-safe error. Never contains file content, paths or raw JSON. */
export interface SafeError {
  code: SafeErrorCode;
  title: string;
  message: string;
  hint?: string;
  /** Bounded, content-free details, e.g. "event 14: invalid timestamp". */
  details?: string[];
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
  id: string;
  label: string;
  createdAt: string;
  eventCount: number;
  summary: WorkloadSummary;
}

/** One activity bucket for the replay timeline. Aggregate only, no identities. */
export interface TimelinePoint {
  /** Bucket start, ISO-8601 UTC (daily buckets). */
  at: string;
  events: number;
  tokens: number;
}

export type WorkerRequest =
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "IMPORT_FILE";
      requestId: number;
      importId: string;
      label: string;
      file: File;
      now: string;
    }
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "IMPORT_DEMO";
      requestId: number;
      importId: string;
      preset: DemoWorkloadPresetId;
      now: string;
    }
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "RUN_REPLAY";
      requestId: number;
      importId: string;
      target: ExecutionTargetV1;
      rulesAsOf: string;
    }
  | { protocol: typeof WORKER_PROTOCOL_VERSION; type: "LIST_LOCAL_IMPORTS"; requestId: number }
  | {
      protocol: typeof WORKER_PROTOCOL_VERSION;
      type: "DELETE_LOCAL_IMPORT";
      requestId: number;
      importId: string;
    }
  | { protocol: typeof WORKER_PROTOCOL_VERSION; type: "CLEAR_LOCAL_DATA"; requestId: number }
  | { protocol: typeof WORKER_PROTOCOL_VERSION; type: "PING"; requestId: number };

export type WorkerResponse =
  | { type: "READY"; protocol: typeof WORKER_PROTOCOL_VERSION }
  | { type: "PONG"; requestId: number; protocol: typeof WORKER_PROTOCOL_VERSION }
  | {
      type: "PROGRESS";
      requestId: number;
      operation: "import" | "replay";
      phase: ImportPhase | ReplayPhase;
      /** Bounded, human-readable and content-free. */
      detail?: string;
    }
  | { type: "IMPORT_OK"; requestId: number; record: ImportRecord; replacedExisting: boolean }
  | {
      type: "REPLAY_OK";
      requestId: number;
      result: ExecutionReplayResultV1;
      /** Aggregate activity buckets for the timeline; no identities. */
      timeline: TimelinePoint[];
    }
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
