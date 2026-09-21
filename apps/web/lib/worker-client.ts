"use client";

import type { ExecutionReplayResultV1, ExecutionTargetV1 } from "@stackreplay/schema";
import type { DemoWorkloadPresetId } from "@stackreplay/test-fixtures";
import {
  type ImportPhase,
  type ImportRecord,
  isWorkerResponse,
  type ReplayPhase,
  type SafeError,
  type TimelinePoint,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from "./worker-protocol";

/** What a completed replay returns: the result plus aggregate timeline buckets. */
export interface ReplayOutcome {
  result: ExecutionReplayResultV1;
  timeline: TimelinePoint[];
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

type ProgressHandler = (phase: ImportPhase | ReplayPhase, detail?: string) => void;

interface Pending {
  resolve: (response: WorkerResponse) => void;
  reject: (error: unknown) => void;
  onProgress?: ProgressHandler;
}

export class ReplayWorkerClient {
  private worker: Worker | undefined;
  private nextRequestId = 1;
  private readonly pending = new Map<number, Pending>();
  /** Request id of the newest import: older import responses are stale. */
  private latestImportRequest = 0;
  private latestReplayRequest = 0;
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
    for (const entry of waiting) entry.reject(new WorkerFailure(error));
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
    if (!isWorkerResponse(data)) return;
    const response = data;
    if (response.type === "READY" || response.type === "PONG") {
      this.markReady();
      return;
    }
    const entry = this.pending.get(response.requestId);
    if (entry === undefined) return;

    if (response.type === "PROGRESS") {
      entry.onProgress?.(response.phase, response.detail);
      return;
    }

    // Stale protection: a terminal response for a superseded request is dropped.
    const superseded =
      (response.type.startsWith("IMPORT") && response.requestId < this.latestImportRequest) ||
      (response.type.startsWith("REPLAY") && response.requestId < this.latestReplayRequest);
    this.pending.delete(response.requestId);
    if (superseded) {
      entry.reject(new SupersededError());
      return;
    }
    if (response.type === "ERROR") {
      entry.reject(new WorkerFailure(response.error));
      return;
    }
    entry.resolve(response);
  }

  private send(
    build: (requestId: number) => WorkerRequest,
    onProgress?: ProgressHandler,
    channel: "import" | "replay" | "other" = "other",
  ): Promise<WorkerResponse> {
    const worker = this.ensureWorker();
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;
    if (channel === "import") this.latestImportRequest = requestId;
    if (channel === "replay") this.latestReplayRequest = requestId;
    const request = build(requestId);
    return new Promise<WorkerResponse>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, ...(onProgress ? { onProgress } : {}) });
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

  async importFile(
    file: File,
    options: { importId: string; label: string; now: string; onProgress?: ProgressHandler },
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
      }),
      options.onProgress,
      "import",
    );
    if (response.type !== "IMPORT_OK") throw new Error("unexpected worker response");
    return response.record;
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
  ): Promise<ReplayOutcome> {
    const response = await this.send(
      (requestId) => ({
        protocol: WORKER_PROTOCOL_VERSION,
        type: "RUN_REPLAY",
        requestId,
        importId,
        target,
        rulesAsOf,
      }),
      onProgress,
      "replay",
    );
    if (response.type !== "REPLAY_OK") throw new Error("unexpected worker response");
    return { result: response.result, timeline: response.timeline };
  }

  async listImports(): Promise<ImportRecord[]> {
    const response = await this.send((requestId) => ({
      protocol: WORKER_PROTOCOL_VERSION,
      type: "LIST_LOCAL_IMPORTS",
      requestId,
    }));
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
