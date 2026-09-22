/// <reference lib="webworker" />
import {
  BUNDLED_CATALOG_VERSION,
  bundledModelIdentity,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";
import { replay, tokenAccountingOf } from "@stackreplay/replay-engine";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import * as storage from "../lib/idb";
import {
  MAX_IMPORT_BYTES,
  validateExportText,
  validateExportValue,
} from "../lib/import-validation";
import {
  type ImportRecord,
  type SafeError,
  type TimelinePoint,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from "../lib/worker-protocol";
import { summarizeExport } from "../lib/workload-summary";

/**
 * The replay Worker (M3 brief).
 *
 * Everything expensive happens here: reading and parsing the imported file,
 * validating it, preparing the workload summary, persisting it, and running the
 * deterministic replay engine. The main thread receives summaries, progress
 * and results only, so a ~100 MB import never blocks the interface and the
 * event array is never cloned to the UI thread.
 *
 * The engine is imported unchanged: same package, same determinism, no DOM, no
 * filesystem, no network.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function progress(
  requestId: number,
  operation: "import" | "replay",
  phase: "reading" | "validating" | "preparing" | "loading" | "replaying",
  detail?: string,
): void {
  post({
    type: "PROGRESS",
    requestId,
    operation,
    phase,
    ...(detail !== undefined ? { detail } : {}),
  });
}

function toSafeError(error: unknown): SafeError {
  if (typeof error === "object" && error !== null && "code" in error) {
    return error as SafeError;
  }
  return {
    code: "INTERNAL",
    title: "Something went wrong while processing the file.",
    message: error instanceof Error ? sanitizeMessage(error.message) : "Unknown error.",
    hint: "Try again, or import a freshly exported file.",
  };
}

/** Engine and storage errors can mention internal identifiers: keep them out. */
function sanitizeMessage(message: string): string {
  const trimmed = message.length > 240 ? `${message.slice(0, 240)}...` : message;
  return trimmed.replace(/[A-Za-z]:\\[^\s"']+|\/(?:home|Users|var|tmp)\/[^\s"']+/gu, "<path>");
}

async function handleImportFile(
  request: Extract<WorkerRequest, { type: "IMPORT_FILE" }>,
): Promise<void> {
  const { requestId, file, importId, label, now } = request;
  if (file.size > MAX_IMPORT_BYTES) {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "FILE_TOO_LARGE",
        title: "This file is larger than StackReplay imports in the browser.",
        message: `The file is ${formatBytes(file.size)}; the browser limit is ${formatBytes(MAX_IMPORT_BYTES)}.`,
        hint: "Export a narrower date range with `stackreplay export --since <date>`.",
      },
    });
    return;
  }

  progress(requestId, "import", "reading", "Reading the file in this browser");
  let text: string;
  try {
    text = await file.text();
  } catch {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "FILE_UNREADABLE",
        title: "This file could not be read.",
        message: "The browser could not open the selected file.",
        hint: "Check that the file still exists and try again.",
      },
    });
    return;
  }

  progress(requestId, "import", "validating", "Checking the export structure");
  const validated = validateExportText(text);
  if (!validated.ok) {
    post({ type: "ERROR", requestId, error: validated.error });
    return;
  }

  progress(requestId, "import", "preparing", "Preparing the workload");
  const summary = summarizeExport(
    validated.exported,
    BUNDLED_CATALOG_VERSION,
    bundledModelIdentity(),
  );
  const record: ImportRecord = {
    id: importId,
    label,
    createdAt: now,
    eventCount: summary.eventCount,
    summary,
  };
  const existing = await storage.listImports();
  const saved = await storage.saveImport(record, validated.exported);
  if (!saved.ok) {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "STORAGE_UNAVAILABLE",
        title: "This workload could not be stored in this browser.",
        message:
          "Browser storage is unavailable, so the workload cannot be kept between page loads.",
        hint: "Private browsing windows and full storage quotas both block local storage.",
      },
    });
    return;
  }
  post({
    type: "IMPORT_OK",
    requestId,
    record,
    replacedExisting: existing.some((entry) => entry.id === importId),
  });
}

async function handleImportDemo(
  request: Extract<WorkerRequest, { type: "IMPORT_DEMO" }>,
): Promise<void> {
  const { requestId, preset, importId, now } = request;
  progress(requestId, "import", "preparing", "Building the demo workload");
  const exported = buildDemoExport(preset);
  const validated = validateExportValue(exported);
  if (!validated.ok) {
    post({ type: "ERROR", requestId, error: validated.error });
    return;
  }
  const summary = summarizeExport(
    validated.exported,
    BUNDLED_CATALOG_VERSION,
    bundledModelIdentity(),
  );
  const record: ImportRecord = {
    id: importId,
    label: `Demo: ${preset}`,
    createdAt: now,
    eventCount: summary.eventCount,
    summary,
  };
  const saved = await storage.saveImport(record, validated.exported);
  if (!saved.ok) {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "STORAGE_UNAVAILABLE",
        title: "The demo workload could not be stored in this browser.",
        message: "Browser storage is unavailable, so the demo cannot be kept between page loads.",
      },
    });
    return;
  }
  post({ type: "IMPORT_OK", requestId, record, replacedExisting: false });
}

async function handleRunReplay(
  request: Extract<WorkerRequest, { type: "RUN_REPLAY" }>,
): Promise<void> {
  const { requestId, importId, target, rulesAsOf } = request;
  progress(requestId, "replay", "loading", "Loading the local workload");
  const loaded = await storage.loadImport(importId);
  if (!loaded.ok) {
    post({
      type: "ERROR",
      requestId,
      error:
        loaded.code === "IMPORT_NOT_FOUND"
          ? {
              code: "IMPORT_NOT_FOUND",
              title: "That workload is no longer stored in this browser.",
              message: "It may have been deleted or cleared.",
              hint: "Import a file again, or start from a demo workload.",
            }
          : {
              code: "STORAGE_CORRUPT",
              title: "The stored workload cannot be read.",
              message:
                "The locally stored copy is incomplete or was written by an incompatible version.",
              hint: "Delete it and import the file again.",
            },
    });
    return;
  }

  progress(requestId, "replay", "replaying", "Replaying the workload against the target");
  try {
    const result = replay({
      events: loaded.value.events,
      target,
      catalog: loadBundledCatalog(),
      context: { rulesAsOf },
    });
    post({
      type: "REPLAY_OK",
      requestId,
      result,
      timeline: buildTimeline(loaded.value.events),
    });
  } catch (error) {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "REPLAY_FAILED",
        title: "The replay could not be completed.",
        message: toSafeError(error).message,
        hint: "Try a different target plan or rules date.",
      },
    });
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

/**
 * Daily activity buckets for the timeline. Aggregate counts only: no session,
 * event or project identity leaves the Worker, so the chart cannot leak private
 * project information.
 */
function buildTimeline(events: readonly { occurredAt: string; usage: unknown }[]): TimelinePoint[] {
  const buckets = new Map<string, { events: number; tokens: number }>();
  for (const event of events) {
    const day = `${event.occurredAt.slice(0, 10)}T00:00:00.000Z`;
    const bucket = buckets.get(day) ?? { events: 0, tokens: 0 };
    bucket.events += 1;
    const accounting = tokenAccountingOf(event.usage as never);
    bucket.tokens += accounting.known ? accounting.total : accounting.knownSubtotal;
    buckets.set(day, bucket);
  }
  return [...buckets.entries()]
    .map(([at, bucket]) => ({ at, ...bucket }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>): Promise<void> => {
  const request = event.data;
  if (request === null || typeof request !== "object") return;
  if (request.protocol !== WORKER_PROTOCOL_VERSION) {
    post({
      type: "ERROR",
      requestId: request.requestId ?? 0,
      error: {
        code: "INTERNAL",
        title: "This page and its Worker disagree about the protocol version.",
        message: "Reload the page to continue.",
      },
    });
    return;
  }

  try {
    switch (request.type) {
      case "PING":
        post({ type: "PONG", requestId: request.requestId, protocol: WORKER_PROTOCOL_VERSION });
        return;
      case "IMPORT_FILE":
        await handleImportFile(request);
        return;
      case "IMPORT_DEMO":
        await handleImportDemo(request);
        return;
      case "RUN_REPLAY":
        await handleRunReplay(request);
        return;
      case "LIST_LOCAL_IMPORTS":
        post({
          type: "IMPORTS",
          requestId: request.requestId,
          imports: await storage.listImports(),
        });
        return;
      case "DELETE_LOCAL_IMPORT": {
        const deleted = await storage.deleteImport(request.importId);
        if (!deleted.ok) {
          post({
            type: "ERROR",
            requestId: request.requestId,
            error: {
              code: "STORAGE_UNAVAILABLE",
              title: "That workload could not be deleted.",
              message: "Browser storage is unavailable.",
            },
          });
          return;
        }
        post({ type: "DELETED", requestId: request.requestId, importId: request.importId });
        return;
      }
      case "CLEAR_LOCAL_DATA": {
        const cleared = await storage.clearLocalData();
        if (!cleared.ok) {
          post({
            type: "ERROR",
            requestId: request.requestId,
            error: {
              code: "STORAGE_UNAVAILABLE",
              title: "Local StackReplay data could not be cleared.",
              message: "Browser storage is unavailable.",
            },
          });
          return;
        }
        post({ type: "CLEARED", requestId: request.requestId });
        return;
      }
      default:
        post({
          type: "ERROR",
          requestId: (request as { requestId: number }).requestId,
          error: {
            code: "INTERNAL",
            title: "Unsupported request.",
            message: "This page asked the Worker to do something it does not implement.",
          },
        });
    }
  } catch (error) {
    post({ type: "ERROR", requestId: request.requestId, error: toSafeError(error) });
  }
};

post({ type: "READY", protocol: WORKER_PROTOCOL_VERSION });
