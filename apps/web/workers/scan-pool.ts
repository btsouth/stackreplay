import {
  type BrowserCandidate,
  BrowserIntakeCancelledError,
  type CandidateScan,
  type CandidateScanIo,
  type CandidateScanPlan,
} from "@stackreplay/adapters/browser";
import type { ScanFile } from "./scan-candidate";

export interface ScanRequest {
  selected: ScanFile;
  companion?: ScanFile;
  plan: CandidateScanPlan;
}

export type ScanResponse =
  | { type: "examined"; bytes: number }
  | { type: "done"; scan: CandidateScan }
  | { type: "error"; message: string };

interface Job {
  request: ScanRequest;
  size: number;
  io: CandidateScanIo;
  resolve(scan: CandidateScan): void;
  reject(error: Error): void;
}

/** Workers pull largest files first; intake alone folds in selection order. */
export function createScanPool(files: Map<BrowserCandidate, ScanFile>, signal: AbortSignal) {
  if (typeof Worker === "undefined" || files.size < 2) return undefined;
  // Each Worker holds a catalog plus streaming buffers. Twelve caps memory on
  // many-core machines; two keeps small machines responsive while parsing.
  const cores = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2;
  const size = Math.min(files.size, Math.max(2, Math.min(12, cores)));
  const slots: { worker: Worker; job: Job | undefined }[] = [];
  let queue: Job[] = [];
  let stopped: Error | undefined;
  let scheduled = false;

  function close(error = new Error("History scan finished.")): void {
    if (stopped) return;
    stopped = error;
    signal.removeEventListener("abort", abort);
    for (const slot of slots) {
      slot.worker.terminate();
      slot.job?.reject(error);
      slot.job = undefined;
    }
    for (const job of queue) job.reject(error);
    queue = [];
  }
  function abort(): void {
    close(new BrowserIntakeCancelledError());
  }
  function pump(): void {
    scheduled = false;
    if (stopped) return;
    // Dispatch is synchronous in intake. Deferring the first pull lets all
    // eligible files enter the queue before choosing the largest ones.
    queue.sort((a, b) => b.size - a.size);
    for (const slot of slots) {
      if (slot.job) continue;
      const job = queue.shift();
      if (!job) break;
      slot.job = job;
      try {
        slot.worker.postMessage(job.request);
      } catch (error) {
        close(error instanceof Error ? error : new Error("Could not start history scan."));
        return;
      }
    }
  }

  try {
    for (let i = 0; i < size; i += 1) {
      const slot: (typeof slots)[number] = {
        job: undefined,
        worker: new Worker(new URL("stackreplay-scan-worker.js", self.location.href), {
          type: "module",
        }),
      };
      slots.push(slot);
      slot.worker.onmessage = (event: MessageEvent<ScanResponse>) => {
        const job = slot.job;
        if (!job || stopped) return;
        const message = event.data;
        if (message.type === "error") {
          close(new Error(message.message));
          return;
        }
        if (message.type === "examined") {
          try {
            job.io.onExamined?.(message.bytes);
          } catch (error) {
            close(error instanceof Error ? error : new Error("Could not report scan progress."));
          }
          return;
        }
        slot.job = undefined;
        job.resolve(message.scan);
        pump();
      };
      slot.worker.onerror = (event) => {
        event.preventDefault();
        close(new Error(event.message || "History scan Worker failed."));
      };
      slot.worker.onmessageerror = () => close(new Error("History scan Worker response failed."));
    }
  } catch {
    // Some browsers expose Worker but do not allow nesting it. Use the existing
    // local scanner when construction itself is unavailable.
    close();
    return undefined;
  }
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  return {
    scan(candidate: BrowserCandidate, plan: CandidateScanPlan, io: CandidateScanIo) {
      const selected = files.get(candidate);
      const companion = io.companion === undefined ? undefined : files.get(io.companion);
      // ZIP members and pre-read text have no registered File. A database must
      // travel with its WAL, or both are left to the local scanner.
      if (!selected || (io.companion !== undefined && companion === undefined)) return undefined;
      return new Promise<CandidateScan>((resolve, reject) => {
        if (stopped) {
          reject(stopped);
          return;
        }
        queue.push({
          request: { selected, plan, ...(companion === undefined ? {} : { companion }) },
          size: candidate.size + (companion?.file.size ?? 0),
          io,
          resolve,
          reject,
        });
        if (!scheduled) {
          scheduled = true;
          queueMicrotask(pump);
        }
      });
    },
    close,
  };
}
