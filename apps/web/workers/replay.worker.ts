/// <reference lib="webworker" />
import {
  BUNDLED_CATALOG_VERSION,
  bundledModelIdentity,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";
import { projectReplay, replay } from "@stackreplay/replay-engine";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import * as storage from "../lib/idb";
import {
  importSizeAdvice,
  validateExportText,
  validateExportValue,
} from "../lib/import-validation";
import { buildTimeline } from "../lib/timeline";
import {
  type ImportRecord,
  isSafeErrorCode,
  type SafeError,
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

/**
 * Turns anything thrown into a display-safe error.
 *
 * A thrown object used to be forwarded across the boundary as soon as it had a
 * `code` property, which is not a type: the engine's own errors carry internal
 * codes and identifiers, and an arbitrary thrown value could carry anything at
 * all into the interface. A value is now rebuilt field by field, only for a code
 * this boundary declares, with every string bounded and sanitized (benchmark
 * finding F029).
 */
function toSafeError(error: unknown): SafeError {
  if (typeof error === "object" && error !== null) {
    const candidate = error as Partial<SafeError>;
    if (isSafeErrorCode(candidate.code) && typeof candidate.message === "string") {
      return {
        code: candidate.code,
        title:
          typeof candidate.title === "string"
            ? sanitizeMessage(candidate.title)
            : "Something went wrong while processing the file.",
        message: sanitizeMessage(candidate.message),
        ...(typeof candidate.hint === "string" ? { hint: sanitizeMessage(candidate.hint) } : {}),
        ...(Array.isArray(candidate.details)
          ? {
              details: candidate.details
                .filter((detail): detail is string => typeof detail === "string")
                .slice(0, 8)
                .map(sanitizeMessage),
            }
          : {}),
      };
    }
  }
  // A browser that runs out of memory while holding a large workload throws a
  // RangeError, which used to surface as a generic failure (benchmark finding F008).
  if (isMemoryExhaustion(error)) return memoryExhaustedError();
  return {
    code: "INTERNAL",
    title: "Something went wrong while processing the file.",
    message: error instanceof Error ? sanitizeMessage(error.message) : "Unknown error.",
    hint: "Try again, or import a freshly exported file.",
  };
}

function isMemoryExhaustion(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error instanceof RangeError) return true;
  return /out of memory|array buffer allocation|invalid string length/iu.test(error.message);
}

/**
 * Reported when the browser cannot hold the workload in memory. Distinct from
 * "too large" on purpose: the file passed the size guard, and the honest advice
 * is a narrower export, not a different file.
 */
function memoryExhaustedError(): SafeError {
  return {
    code: "MEMORY_EXHAUSTED",
    title: "This browser ran out of memory reading the workload.",
    message:
      "The file is within the import limit, but holding it plus its parsed events exceeded what this browser could allocate.",
    hint: "Export a narrower date range with `stackreplay export --since <date>`, or use a browser with more available memory.",
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
  // One rule, shared with the interface: the refusal point and the wording come
  // from `importSizeAdvice` so the two surfaces cannot describe the same file
  // differently (benchmark finding F008).
  const advice = importSizeAdvice(file.size);
  if (advice.level === "refused") {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "FILE_TOO_LARGE",
        title: "This file is larger than StackReplay imports in the browser.",
        message: advice.message,
        hint: "Export a narrower date range with `stackreplay export --since <date>`.",
      },
    });
    return;
  }

  progress(requestId, "import", "reading", "Reading the file in this browser");
  // The generation of the local store when this import began: a delete or clear
  // that lands while this import is running invalidates it, instead of letting the
  // import finish and resurrect what the user removed (benchmark finding F007).
  const storeWhenStarted = storage.localStoreGeneration();
  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    post({
      type: "ERROR",
      requestId,
      error: isMemoryExhaustion(error)
        ? memoryExhaustedError()
        : {
            code: "FILE_UNREADABLE",
            title: "This file could not be read.",
            message: "The browser could not open the selected file.",
            hint: "Check that the file still exists and try again.",
          },
    });
    return;
  }

  progress(requestId, "import", "validating", "Checking the export structure");
  let validated: ReturnType<typeof validateExportText>;
  try {
    validated = validateExportText(text);
  } catch (error) {
    // Parsing a large document is where the browser usually runs out of memory.
    post({ type: "ERROR", requestId, error: toSafeError(error) });
    return;
  }
  if (!validated.ok) {
    post({ type: "ERROR", requestId, error: validated.error });
    return;
  }

  progress(requestId, "import", "preparing", "Preparing the workload");
  let summary: ReturnType<typeof summarizeExport>;
  try {
    summary = summarizeExport(validated.exported, BUNDLED_CATALOG_VERSION, bundledModelIdentity());
  } catch (error) {
    post({ type: "ERROR", requestId, error: toSafeError(error) });
    return;
  }
  const record: ImportRecord = {
    id: importId,
    label,
    createdAt: now,
    eventCount: summary.eventCount,
    summary,
  };
  const existing = await storage.listImports();
  const saved = await storage.saveImport(record, validated.exported, {
    observed: storeWhenStarted,
  });
  if (!saved.ok) {
    if (saved.code === "IMPORT_CANCELLED") {
      post({
        type: "ERROR",
        requestId,
        error: {
          code: "IMPORT_CANCELLED",
          title: "This import was cancelled.",
          message:
            "Local data was deleted or cleared while this file was being imported, so nothing was stored.",
          hint: "Import the file again if you still want it.",
        },
      });
      return;
    }
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
  const storeWhenStarted = storage.localStoreGeneration();
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
  const saved = await storage.saveImport(record, validated.exported, {
    observed: storeWhenStarted,
  });
  if (!saved.ok) {
    post({
      type: "ERROR",
      requestId,
      error:
        saved.code === "IMPORT_CANCELLED"
          ? {
              code: "IMPORT_CANCELLED",
              title: "This import was cancelled.",
              message:
                "Local data was deleted or cleared while the demo was being prepared, so nothing was stored.",
              hint: "Load the demo again if you still want it.",
            }
          : {
              code: "STORAGE_UNAVAILABLE",
              title: "The demo workload could not be stored in this browser.",
              message:
                "Browser storage is unavailable, so the demo cannot be kept between page loads.",
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
    const catalog = loadBundledCatalog();
    const result = replay({
      events: loaded.value.events,
      target,
      catalog,
      context: { rulesAsOf },
    });
    post({
      type: "REPLAY_OK",
      requestId,
      result,
      timeline: buildTimeline(loaded.value.events),
      // The projection is the display contract the surfaces read (M4D). It is
      // built here, next to the replay itself, so the app and the demonstration
      // cannot describe the same result differently.
      projection: projectReplay(result, catalog),
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

/**
 * Storage writes run one at a time.
 *
 * The message handler is async, so without a queue two requests can interleave:
 * an import that had already read the stored listing could write its record after
 * a delete or a clear had removed everything, which is how a cleared browser ends
 * up holding a workload again (benchmark finding F007). Reads are not queued: the
 * client supersedes them, and an old listing that answers late is dropped there.
 *
 * The *intent* to delete or clear is registered before the queue (see the delete
 * and clear cases): a deletion must stop an import that is already running
 * immediately, and cannot wait behind it, or it would be waiting for the very
 * write it is meant to prevent.
 */
let mutationChain: Promise<unknown> = Promise.resolve();

function queueMutation<T>(run: () => Promise<T>): Promise<T> {
  const next = mutationChain.then(run, run);
  mutationChain = next.catch(() => undefined);
  return next;
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
        await queueMutation(() => handleImportFile(request));
        return;
      case "IMPORT_DEMO":
        await queueMutation(() => handleImportDemo(request));
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
        // Registered first: an import running right now must not be able to write
        // this record back after the queue reaches the deletion.
        storage.invalidateInFlightWrites(request.importId);
        const deleted = await queueMutation(() => storage.deleteImport(request.importId));
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
        // Same rule as a delete: clearing invalidates imports that are running now,
        // so nothing lands after the clear.
        storage.invalidateInFlightWrites();
        const cleared = await queueMutation(() => storage.clearLocalData());
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
