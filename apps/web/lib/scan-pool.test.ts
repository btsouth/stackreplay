import type { CandidateScan, CandidateScanPlan } from "@stackreplay/adapters/browser";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { type ScanFile, scanCandidate } from "../workers/scan-candidate";
import { createScanPool, type ScanRequest, type ScanResponse } from "../workers/scan-pool";

class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage?: (event: { data: ScanResponse }) => void;
  onerror?: (event: { message: string; preventDefault(): void }) => void;
  onmessageerror?: () => void;
  requests: ScanRequest[] = [];
  terminate = vi.fn();
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(request: ScanRequest) {
    this.requests.push(request);
  }
  reply(response: ScanResponse) {
    this.onmessage?.({ data: response });
  }
}

const plan: CandidateScanPlan = {
  now: "2026-10-07T12:00:00.000Z",
  salt: "fixture",
  display: "fixture",
  signed: false,
};
const scan: CandidateScan = {
  kind: "unreadable",
  outcome: { path: "fixture", status: "unreadable", events: 0 },
};

function selection(count = 4) {
  const selected = Array.from(
    { length: count },
    (_, index): ScanFile => ({
      path: `root/${index}.jsonl`,
      group: "codex",
      readCost: index + 1,
      file: new File(["x".repeat(index + 1)], `${index}.jsonl`, { lastModified: 123 }),
    }),
  );
  const files = new Map(selected.map((file) => [scanCandidate(file), file]));
  return { files, candidates: [...files.keys()] };
}

beforeEach(() => {
  FakeWorker.all = [];
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("navigator", { hardwareConcurrency: 2 });
  vi.stubGlobal("self", { location: { href: "https://example.test/stackreplay-worker.js" } });
});
afterEach(() => vi.unstubAllGlobals());

it("pulls largest first, returns each result to its own caller and forwards progress", async () => {
  const { files, candidates } = selection();
  const pool = createScanPool(files, new AbortController().signal);
  if (!pool) throw new Error("Missing pool");
  const examined = candidates.map(() => vi.fn());
  const promises = candidates.map((file, index) =>
    pool.scan(file, plan, { onExamined: examined[index] }),
  );
  expect(FakeWorker.all.flatMap((worker) => worker.requests)).toEqual([]);
  await Promise.resolve();
  const [a, b] = FakeWorker.all;
  if (!a || !b) throw new Error("Missing workers");
  expect([a.requests[0]?.selected.path, b.requests[0]?.selected.path]).toEqual([
    "root/3.jsonl",
    "root/2.jsonl",
  ]);
  a.reply({ type: "examined", bytes: 42 });
  expect(examined[3]).toHaveBeenCalledWith(42);
  b.reply({ type: "done", scan });
  expect(b.requests[1]?.selected.path).toBe("root/1.jsonl");
  a.reply({ type: "done", scan });
  expect(a.requests[1]?.selected.path).toBe("root/0.jsonl");
  b.reply({ type: "done", scan });
  a.reply({ type: "done", scan });
  expect(await Promise.all(promises)).toEqual([scan, scan, scan, scan]);
  pool.close();
  expect(FakeWorker.all.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
});

it.each(["abort", "error", "messageerror", "scanerror", "close"])(
  "rejects active and queued work on %s",
  async (failure) => {
    const { files, candidates } = selection();
    const controller = new AbortController();
    const pool = createScanPool(files, controller.signal);
    if (!pool) throw new Error("Missing pool");
    const promises = candidates.map((file) => pool.scan(file, plan, {}));
    const settled = Promise.allSettled(promises);
    await Promise.resolve();
    const worker = FakeWorker.all[0];
    if (!worker) throw new Error("Missing worker");
    if (failure === "abort") controller.abort();
    else if (failure === "error") worker.onerror?.({ message: "broken", preventDefault() {} });
    else if (failure === "messageerror") worker.onmessageerror?.();
    else if (failure === "scanerror") worker.reply({ type: "error", message: "broken" });
    else pool.close();
    for (const result of await settled) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.reason).toBeInstanceOf(Error);
    }
    expect(FakeWorker.all.every((item) => item.terminate.mock.calls.length === 1)).toBe(true);
    expect(FakeWorker.all.flatMap((item) => item.requests)).toHaveLength(2);
  },
);

it("leaves unregistered candidates local and posts companion WAL metadata", async () => {
  const { files, candidates } = selection();
  const pool = createScanPool(files, new AbortController().signal);
  const [database, companion] = candidates;
  if (!pool || !database || !companion) throw new Error("Missing files");
  const local = scanCandidate({ file: new File(["zip"], "member.jsonl"), path: "member.jsonl" });
  expect(pool.scan(local, plan, {})).toBeUndefined();
  expect(pool.scan(database, plan, { companion: local })).toBeUndefined();
  const result = pool.scan(database, plan, { companion });
  await Promise.resolve();
  const worker = FakeWorker.all[0];
  expect(worker?.requests[0]?.companion).toEqual(files.get(companion));
  expect(worker?.requests[0]?.selected).toEqual(files.get(database));
  worker?.reply({ type: "done", scan });
  await result;
  pool.close();
});

it("falls back when nested Worker construction is unavailable and terminates partial setup", () => {
  class UnsupportedWorker extends FakeWorker {
    constructor() {
      if (FakeWorker.all.length === 1) throw new Error("Nested Workers unavailable");
      super();
    }
  }
  vi.stubGlobal("Worker", UnsupportedWorker);
  expect(createScanPool(selection().files, new AbortController().signal)).toBeUndefined();
  expect(FakeWorker.all[0]?.terminate).toHaveBeenCalledOnce();
});

it("caps workers at twelve and does not create a pool for a single file", () => {
  vi.stubGlobal("navigator", { hardwareConcurrency: 64 });
  expect(createScanPool(selection(1).files, new AbortController().signal)).toBeUndefined();
  const pool = createScanPool(selection(20).files, new AbortController().signal);
  expect(FakeWorker.all).toHaveLength(12);
  pool?.close();
});

it("recreates all File readers and metadata, including pre-read text", async () => {
  const selected: ScanFile = {
    file: new File(["raw"], "session.jsonl", { lastModified: 123 }),
    path: "root/session.jsonl",
    group: "codex",
    readCost: 0,
  };
  const candidate = scanCandidate(selected, "already read");
  expect(candidate).toMatchObject({
    path: selected.path,
    group: selected.group,
    size: 3,
    lastModified: 123,
    readCost: 0,
  });
  expect(await candidate.text()).toBe("already read");
  expect(await candidate.peekText?.(2)).toBe("ra");
  expect(new TextDecoder().decode(await candidate.arrayBuffer?.())).toBe("raw");
  expect(await new Response(candidate.stream?.()).text()).toBe("raw");
});
