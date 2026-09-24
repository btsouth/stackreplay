"use client";

import type { ProjectedReplayV1 } from "@stackreplay/replay-engine";
import type { ExecutionReplayResultV1, ExecutionTargetV1 } from "@stackreplay/schema";
import type { DemoWorkloadPresetId } from "@stackreplay/test-fixtures";
import {
  type ImportPhase,
  type ImportRecord,
  isSafeError,
  isWorkerResponse,
  protocolMismatch,
  type ReplayPhase,
  type SafeError,
  type ScanProgress,
  type TimelinePoint,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from "./worker-protocol";
import type { WindowFact, WorkloadProfile } from "./workload-profile";

/** What a completed replay returns: the result plus aggregate timeline buckets. */
export interface ReplayOutcome {
  result: ExecutionReplayResultV1;
  timeline: TimelinePoint[];
  /** The display contract for the same result (M4D). */
  projection: ProjectedReplayV1;
  /** Present when the replay ran under an explicit, user-chosen scope. */
  scope?: { excludedUnresolvedEvents: number; recordedEvents: number } | undefined;
}

/**
 * Main-thread client for the replay Worker.
 *
 * Responsibilities that matter for correctness:
 * - one terminal response per request, matched by requestId;
 * - stale responses are dropped, so importing a second file can never be
 *   overwritten by the first one finishing late;
 * - the event array never crosses this boundary: only summaries, progress and
 *   replay results do.
 */

export class SupersededError extends Error {
  constructor() {
    super("superseded by a newer request");
    this.name = "SupersededError";
  }
}

export class WorkerFailure extends Error {
  readonly safe: SafeError;

  constructor(safe: SafeError) {
    super(safe.message);
    this.name = "WorkerFailure";
    this.safe = safe;
  }
}

type ProgressHandler = (
  phase: ImportPhase | ReplayPhase,
  detail?: string,
  scan?: ScanProgress,
) => void;

/**
 * A request's channel. Supersession is decided per channel: a newer import must
 * not cancel a listing, and a listing must not be cancelled by anything
 * (benchmark finding F006). The predicate used to be "does the response type
 * start with IMPORT", which is true of the list response `IMPORTS` as well, so a
 * perfectly valid listing was dropped whenever an import was running.
 */
type Channel = "import" | "replay" | "list" | "mutation" | "analyze" | "inspect";

interface Pending {
  resolve: (response: WorkerResponse) => void;
  reject: (error: unknown) => void;
  channel: Channel;
  onProgress?: ProgressHandler;
  /** Cleared when the request settles; re-armed while progress keeps arriving. */
  idleTimer?: ReturnType<typeof setTimeout>;
}

/**
 * How long a request may go without a word before it is treated as hung.
 *
 * Imports and replays report progress as they work, so silence means something is
 * wrong; the budget is wide because a large file really can take minutes between
 * phases. A listing answers immediately once it is reached. A deletion or clear is
 * *queued behind* earlier storage work by design, so its budget has to cover the
 * work in front of it: the chain is bounded because that work is itself bounded.
 */
const IDLE_TIMEOUT_MS: Record<Channel, number> = {
  import: 300_000,
  replay: 300_000,
  list: 60_000,
  mutation: 900_000,
  analyze: 300_000,
  inspect: 120_000,
};

export class ReplayWorkerClient {
  private worker: Worker | undefined;
  private nextRequestId = 1;
  private readonly pending = new Map<number, Pending>();
  /** Newest request id per channel: an older request on that channel is stale. */
  private readonly latestByChannel: Partial<Record<Channel, number>> = {};
  /** True once the Worker has announced itself; false while it is starting. */
  private workerReady = false;
  private readyTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * A Worker that never starts (the asset is blocked, missing or fails to parse)
   * fires an error event, and a Worker that hangs while starting fires nothing at
   * all. Both must end in a visible error rather than an interface that waits
   * forever, so a worker that has not announced itself inside this window is
   * treated as failed.
   */
  private static readonly WORKER_START_TIMEOUT_MS = 15_000;

  private static workerFailure(): SafeError {
    return {
      code: "INTERNAL",
      title: "The replay Worker could not be started.",
      message: "This browser did not load the local replay Worker.",
      hint: "Reload the page. If it keeps happening, an extension, policy or proxy may be blocking same-origin Workers.",
    };
  }

  private clearReadyTimer(): void {
    if (this.readyTimer !== undefined) {
      clearTimeout(this.readyTimer);
      this.readyTimer = undefined;
    }
  }

  /** Environment announcements (READY/PONG) also prove the Worker is alive. */
  private markReady(): void {
    this.workerReady = true;
    this.clearReadyTimer();
  }

  /**
   * Drops a Worker that cannot be used and fails every request waiting on it, so
   * the next request starts a fresh Worker instead of queueing behind a dead one.
   */
  private failWorker(error: SafeError): void {
    this.clearReadyTimer();
    const worker = this.worker;
    this.worker = undefined;
    this.workerReady = false;
    worker?.terminate();
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const entry of waiting) {
      if (entry.idleTimer !== undefined) clearTimeout(entry.idleTimer);
      entry.reject(new WorkerFailure(error));
    }
  }

  /**
   * A request that stops making progress is failed rather than awaited forever:
   * without this, a hung Worker left the interface waiting with no way out
   * (benchmark finding F028). The timer re-arms on every progress message, so a
   * long import that is still working never times out.
   */
  private armIdleTimer(requestId: number, entry: Pending): void {
    if (entry.idleTimer !== undefined) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      if (!this.pending.has(requestId)) return;
      this.failWorker({
        code: "INTERNAL",
        title: "The replay Worker stopped responding.",
        message: "The operation was still running but stopped reporting progress.",
        hint: "Reload the page and try again. A very large workload may need a narrower export.",
      });
    }, IDLE_TIMEOUT_MS[entry.channel]);
  }

  private ensureWorker(): Worker {
    if (this.worker !== undefined) return this.worker;
    // The Worker is pre-bundled into /public by scripts/build-worker.mjs, so the
    // app bundler never has to understand worker syntax and dev and production
    // load the identical artifact.
    const worker = new Worker("/stackreplay-worker.js", {
      type: "module",
      name: "stackreplay-replay",
    });
    worker.onmessage = (event: MessageEvent<unknown>) => this.receive(event.data);
    worker.onerror = () => this.failWorker(ReplayWorkerClient.workerFailure());
    this.worker = worker;
    this.workerReady = false;
    this.clearReadyTimer();
    this.readyTimer = setTimeout(() => {
      if (!this.workerReady) this.failWorker(ReplayWorkerClient.workerFailure());
    }, ReplayWorkerClient.WORKER_START_TIMEOUT_MS);
    return worker;
  }

  private receive(data: unknown): void {
    // A Worker built by a different version announces a protocol this page does
    // not speak. That check used to be unreachable: the response guard dropped
    // the announcement first, so a version mismatch looked like a Worker that
    // never started (benchmark finding F028).
    if (this.announcementMismatch(data)) {
      this.failWorker({
        code: "INTERNAL",
        title: "The replay Worker is a different version than this page.",
        message: "The Worker asset does not speak this page's protocol.",
        hint: "Hard-reload the page (Shift+Reload) so both come from the same build.",
      });
      return;
    }
    if (!isWorkerResponse(data)) return;
    const response = data;
    if (response.type === "READY" || response.type === "PONG") {
      this.markReady();
      // PONG answers a PING: settle that request instead of swallowing it, which
      // left ping() pending forever (benchmark finding F028).
      if (response.type === "PONG") this.settle(response.requestId, response);
      return;
    }
    const entry = this.pending.get(response.requestId);
    if (entry === undefined) return;

    // Staleness is decided from the request's own channel, before any response
    // shape is dispatched: a superseded request may not move the interface, not
    // even by reporting progress.
    const stale = response.requestId < (this.latestByChannel[entry.channel] ?? 0);

    if (response.type === "PROGRESS") {
      if (stale) return;
      this.armIdleTimer(response.requestId, entry);
      entry.onProgress?.(response.phase, response.detail, response.scan);
      return;
    }

    this.pending.delete(response.requestId);
    if (entry.idleTimer !== undefined) clearTimeout(entry.idleTimer);
    if (stale) {
      entry.reject(new SupersededError());
      return;
    }
    if (response.type === "ERROR") {
      // The Worker is the other side of a boundary, not a trusted caller: an
      // error payload that is not a display-safe error is replaced rather than
      // forwarded (benchmark finding F029).
      entry.reject(
        new WorkerFailure(
          isSafeError(response.error)
            ? response.error
            : {
                code: "INTERNAL",
                title: "Something went wrong.",
                message: "The replay Worker reported a failure it could not describe.",
                hint: "Try again; if it repeats, reload the page.",
              },
        ),
      );
      return;
    }
    entry.resolve(response);
  }

  /** Resolves a pending request from an announcement that answers it (PONG). */
  private settle(requestId: number, response: WorkerResponse): void {
    const entry = this.pending.get(requestId);
    if (entry === undefined) return;
    this.pending.delete(requestId);
    if (entry.idleTimer !== undefined) clearTimeout(entry.idleTimer);
    entry.resolve(response);
  }

  /** True when a READY/PONG announcement declares a different protocol version. */
  private announcementMismatch(data: unknown): boolean {
    if (typeof data !== "object" || data === null) return false;
    const record = data as { type?: unknown; protocol?: unknown };
    if (record.type !== "READY" && record.type !== "PONG") return false;
    if (typeof record.protocol !== "number") return false;
    return protocolMismatch(record as WorkerResponse);
  }

  private send(
    build: (requestId: number) => WorkerRequest,
    onProgress?: ProgressHandler,
    channel: Channel = "mutation",
  ): Promise<WorkerResponse> {
    const worker = this.ensureWorker();
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;
    if (
      channel === "import" ||
      channel === "replay" ||
      channel === "list" ||
      channel === "analyze" ||
      channel === "inspect"
    ) {
      this.latestByChannel[channel] = requestId;
    }
    const request = build(requestId);
    return new Promise<WorkerResponse>((resolve, reject) => {
      const entry: Pending = { resolve, reject, channel, ...(onProgress ? { onProgress } : {}) };
      this.pending.set(requestId, entry);
      this.armIdleTimer(requestId, entry);
      try {
        worker.postMessage(request);
      } catch {
        // A worker that died between requests would otherwise swallow the request.
        this.failWorker(ReplayWorkerClient.workerFailure());
      }
    });
  }

  async ping(): Promise<boolean> {
    const response = await this.send((requestId) => ({
      protocol: WORKER_PROTOCOL_VERSION,
      type: "PING",
      requestId,
    }));
    return response.type === "PONG" && response.protocol === WORKER_PROTOCOL_VERSION;
  }

  async cancelImport(): Promise<void> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "CANCEL_IMPORT",
        requestId,
      }),
      undefined,
      "import",
    );
    if (response.type !== "CANCELLED") throw new Error("unexpected worker response");
  }

  async importFile(
    file: File,
    options: {
      importId: string;
      label: string;
      now: string;
      saveLocal?: boolean;
      onProgress?: ProgressHandler;
    },
  ): Promise<ImportRecord> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "IMPORT_FILE",
        requestId,
        importId: options.importId,
        label: options.label,
        file,
        now: options.now,
        ...(options.saveLocal !== undefined ? { saveLocal: options.saveLocal } : {}),
      }),
      options.onProgress,
      "import",
    );
    if (response.type !== "IMPORT_OK") throw new Error("unexpected worker response");
    return response.record;
  }

  async importSources(
    files: { file: File; path: string; group?: string }[],
    options: {
      importId: string;
      now: string;
      saveLocal: boolean;
      label?: string;
      onProgress?: ProgressHandler;
    },
  ): Promise<ImportRecord> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "IMPORT_SOURCES",
        requestId,
        importId: options.importId,
        files,
        now: options.now,
        saveLocal: options.saveLocal,
        ...(options.label === undefined ? {} : { label: options.label }),
      }),
      options.onProgress,
      "import",
    );
    if (response.type !== "IMPORT_OK") throw new Error("unexpected worker response");
    return response.record;
  }

  async exportImport(importId: string): Promise<Uint8Array> {
    const response = await this.send((requestId) => ({
      protocol: WORKER_PROTOCOL_VERSION,
      type: "EXPORT_LOCAL_IMPORT",
      requestId,
      importId,
    }));
    if (response.type !== "EXPORTED") throw new Error("unexpected worker response");
    return response.bytes;
  }

  async importDemo(
    preset: DemoWorkloadPresetId,
    options: { importId: string; now: string; onProgress?: ProgressHandler },
  ): Promise<ImportRecord> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "IMPORT_DEMO",
        requestId,
        importId: options.importId,
        preset,
        now: options.now,
      }),
      options.onProgress,
      "import",
    );
    if (response.type !== "IMPORT_OK") throw new Error("unexpected worker response");
    return response.record;
  }

  async runReplay(
    importId: string,
    target: ExecutionTargetV1,
    rulesAsOf: string,
    onProgress?: ProgressHandler,
    options: { excludeUnresolved?: boolean } = {},
  ): Promise<ReplayOutcome> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "RUN_REPLAY",
        requestId,
        importId,
        target,
        rulesAsOf,
        ...(options.excludeUnresolved === true ? { excludeUnresolved: true } : {}),
      }),
      onProgress,
      "replay",
    );
    if (response.type !== "REPLAY_OK") throw new Error("unexpected worker response");
    return {
      result: response.result,
      timeline: response.timeline,
      projection: response.projection,
      ...(response.scope === undefined ? {} : { scope: response.scope }),
    };
  }

  /** The workload profile, computed locally in the Worker from the stored events. */
  async analyzeWorkload(importId: string, timeZone: string): Promise<WorkloadProfile> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "ANALYZE_WORKLOAD",
        requestId,
        importId,
        timeZone,
      }),
      undefined,
      "analyze",
    );
    if (response.type !== "PROFILE_OK") throw new Error("unexpected worker response");
    return response.profile;
  }

  /** What recorded demand fell inside one window, [startMs, endMs). */
  async inspectWindow(
    importId: string,
    startMs: number,
    endMs: number,
    timeZone: string,
  ): Promise<WindowFact> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "INSPECT_WINDOW",
        requestId,
        importId,
        startMs,
        endMs,
        timeZone,
      }),
      undefined,
      "inspect",
    );
    if (response.type !== "WINDOW_OK") throw new Error("unexpected worker response");
    return response.window;
  }

  async listImports(): Promise<ImportRecord[]> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "LIST_LOCAL_IMPORTS",
        requestId,
      }),
      undefined,
      "list",
    );
    if (response.type !== "IMPORTS") throw new Error("unexpected worker response");
    return response.imports;
  }

  async deleteImport(importId: string): Promise<void> {
    const response = await this.send((requestId) => ({
      protocol: WORKER_PROTOCOL_VERSION,
      type: "DELETE_LOCAL_IMPORT",
      requestId,
      importId,
    }));
    if (response.type !== "DELETED") throw new Error("unexpected worker response");
  }

  async clearLocalData(): Promise<void> {
    const response = await this.send((requestId) => ({
      protocol: WORKER_PROTOCOL_VERSION,
      type: "CLEAR_LOCAL_DATA",
      requestId,
    }));
    if (response.type !== "CLEARED") throw new Error("unexpected worker response");
  }
}

let sharedClient: ReplayWorkerClient | undefined;

/** One Worker per page, shared by every surface that needs it. */
export function getWorkerClient(): ReplayWorkerClient {
  sharedClient ??= new ReplayWorkerClient();
  return sharedClient;
}

export function describeWorkerFailure(error: unknown): SafeError {
  if (error instanceof WorkerFailure) return error.safe;
  if (error instanceof SupersededError) {
    return {
      code: "INTERNAL",
      title: "A newer request replaced this one.",
      message: "The earlier operation was cancelled.",
    };
  }
  return {
    code: "INTERNAL",
    title: "Something went wrong.",
    message: error instanceof Error ? error.message : "Unknown error.",
  };
}
