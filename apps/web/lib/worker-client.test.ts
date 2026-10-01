import type { ExecutionTargetV1 } from "@stackreplay/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeWorkerFailure,
  ReplayWorkerClient,
  SupersededError,
  WorkerFailure,
} from "./worker-client";
import {
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from "./worker-protocol";

/**
 * Worker-client contract (M3 brief, independent audit).
 *
 * The client is the only thing between the interface and a background Worker, so
 * its failure semantics are product behaviour:
 * - a superseded request is dropped, not surfaced as an error;
 * - a Worker that cannot start must fail the request instead of leaving the
 *   interface waiting forever;
 * - a later request must not queue behind a Worker that is already dead.
 */

class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly sent: WorkerRequest[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | undefined;
  onerror: ((event: unknown) => void) | undefined;
  terminated = false;

  constructor(readonly url: string) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: WorkerRequest): void {
    if (this.terminated) throw new Error("InvalidStateError: worker terminated");
    this.sent.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(message: WorkerResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<unknown>);
  }

  announce(): void {
    this.reply({ type: "READY", protocol: WORKER_PROTOCOL_VERSION });
  }

  fail(): void {
    this.onerror?.({} as Event);
  }

  get lastRequestId(): number {
    return this.sent.at(-1)?.requestId ?? 0;
  }
}

const target: ExecutionTargetV1 = { type: "subscription", planId: "example-cloud-pro" };

function replayOk(requestId: number, reference: string): WorkerResponse {
  return {
    type: "REPLAY_OK",
    requestId,
    result: {
      versions: { targetReference: reference },
    } as never,
    timeline: [],
    // The client's job here is to carry the worker's payload unmodified. The
    // projection's own contents are covered by the engine tests and by
    // `demo-artifact.test.ts`, so this fixture only has to be a projection.
    projection: {} as never,
  };
}

beforeEach(() => {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("replay worker client", () => {
  it("treats cancelled workload analysis as superseded", async () => {
    const client = new ReplayWorkerClient();
    const pending = client.analyzeWorkload("import-1", "UTC");
    const outcome = pending.catch((error: unknown) => error);
    const worker = FakeWorker.instances[0];
    worker?.announce();
    worker?.reply({ type: "CANCELLED", requestId: worker.lastRequestId });
    expect(await outcome).toBeInstanceOf(SupersededError);
    client.dispose();
  });
  it("drops a superseded replay instead of surfacing it", async () => {
    const client = new ReplayWorkerClient();
    const first = client.runReplay("import-1", target, "2026-09-15");
    const firstOutcome = first.catch((error: unknown) => error);
    const second = client.runReplay("import-2", target, "2026-09-15");

    const worker = FakeWorker.instances[0];
    expect(worker).toBeDefined();
    worker?.announce();
    expect(worker?.sent).toHaveLength(2);

    // The newer request answers first; the older one answers afterwards.
    worker?.reply(replayOk(2, "newer"));
    await expect(second).resolves.toMatchObject({
      result: { versions: { targetReference: "newer" } },
    });

    worker?.reply(replayOk(1, "older"));
    await expect(firstOutcome).resolves.toBeInstanceOf(SupersededError);
    // A superseded request is not a user-facing failure.
    expect(describeWorkerFailure(new SupersededError()).title).not.toMatch(/stopped|failed/i);
  });

  it("drops a superseded import instead of surfacing it", async () => {
    const client = new ReplayWorkerClient();
    const first = client.importDemo("moderate", { importId: "a", now: "2026-09-21T00:00:00.000Z" });
    const firstOutcome = first.catch((error: unknown) => error);
    const second = client.importDemo("heavy", { importId: "b", now: "2026-09-21T00:00:00.000Z" });
    const worker = FakeWorker.instances[0];
    worker?.announce();

    worker?.reply({
      type: "IMPORT_OK",
      requestId: 2,
      record: { id: "b" } as never,
      replacedExisting: false,
    });
    await expect(second).resolves.toMatchObject({ id: "b" });

    worker?.reply({
      type: "IMPORT_OK",
      requestId: 1,
      record: { id: "a" } as never,
      replacedExisting: false,
    });
    await expect(firstOutcome).resolves.toBeInstanceOf(SupersededError);
  });

  it("fails the request when the Worker cannot load, and fails the next one too", async () => {
    const client = new ReplayWorkerClient();
    const first = client.importDemo("moderate", {
      importId: "a",
      now: "2026-09-21T00:00:00.000Z",
    });
    expect(FakeWorker.instances).toHaveLength(1);
    FakeWorker.instances[0]?.fail();

    const rejection = await first.catch((error: unknown) => error);
    expect(rejection).toBeInstanceOf(WorkerFailure);
    expect((rejection as WorkerFailure).safe.title).toMatch(/could not be started/i);

    // A dead Worker must not swallow the next request: a fresh one is created and
    // its failure is reported again rather than hanging.
    const second = client.importDemo("moderate", {
      importId: "b",
      now: "2026-09-21T00:00:00.000Z",
    });
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances[1]?.sent).toHaveLength(1);
    const secondOutcome = second.catch((error: unknown) => error);
    FakeWorker.instances[1]?.fail();
    await expect(secondOutcome).resolves.toBeInstanceOf(WorkerFailure);
  });

  it("fails the request when the Worker never announces itself", async () => {
    vi.useFakeTimers();
    const client = new ReplayWorkerClient();
    const pending = client.listImports().catch((error: unknown) => error);
    const worker = FakeWorker.instances[0];
    expect(worker?.sent).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(15_000);
    const rejection = await pending;
    expect(rejection).toBeInstanceOf(WorkerFailure);
    expect((rejection as WorkerFailure).safe.message).not.toBe("");
  });

  it("keeps a started Worker alive across requests", async () => {
    const client = new ReplayWorkerClient();
    const first = client.listImports();
    const worker = FakeWorker.instances[0];
    worker?.announce();
    worker?.reply({ type: "IMPORTS", requestId: 1, imports: [] });
    await expect(first).resolves.toEqual([]);

    const second = client.listImports();
    expect(FakeWorker.instances).toHaveLength(1);
    expect(worker?.terminated).toBe(false);
    worker?.reply({ type: "IMPORTS", requestId: 2, imports: [] });
    await expect(second).resolves.toEqual([]);
  });

  /**
   * Regression (benchmark F006): freshness is decided per channel. A list request
   * used to be compared against the latest *import* request id, so an imports list
   * that answered an earlier request than the newest import was discarded as
   * superseded even though nothing had superseded it.
   */
  it("does not treat a list response as superseded by an import request", async () => {
    const client = new ReplayWorkerClient();
    const imports = client.listImports();
    const worker = FakeWorker.instances[0];
    worker?.announce();
    const listRequestId = worker?.lastRequestId ?? 0;

    // A much larger request id arrives while the list is still open.
    const demo = client.importDemo("moderate", {
      importId: "a",
      now: "2026-09-21T00:00:00.000Z",
    });
    worker?.reply({ type: "IMPORTS", requestId: listRequestId, imports: [] });
    await expect(imports).resolves.toEqual([]);
    worker?.reply({
      type: "IMPORT_OK",
      requestId: worker.lastRequestId,
      record: { id: "a" } as never,
      replacedExisting: false,
    });
    await expect(demo).resolves.toMatchObject({ id: "a" });
  });

  /**
   * Regression (benchmark F006): a superseded request may not move the interface
   * even by reporting progress. Progress used to be dispatched before the
   * freshness check, so a stale request kept painting progress for a request that
   * had already been replaced.
   */
  it("drops progress from a superseded request", async () => {
    const client = new ReplayWorkerClient();
    const onStaleProgress = vi.fn();
    const onFreshProgress = vi.fn();
    const stale = client.runReplay("import-1", target, "2026-09-15", onStaleProgress);
    const staleOutcome = stale.catch((error: unknown) => error);
    const fresh = client.runReplay("import-2", target, "2026-09-15", onFreshProgress);
    const worker = FakeWorker.instances[0];
    worker?.announce();

    worker?.reply({
      type: "PROGRESS",
      requestId: 1,
      operation: "replay",
      phase: "replaying",
      detail: "stale",
    });
    worker?.reply({
      type: "PROGRESS",
      requestId: 2,
      operation: "replay",
      phase: "replaying",
      detail: "fresh",
    });

    expect(onStaleProgress).not.toHaveBeenCalled();
    expect(onFreshProgress).toHaveBeenCalledTimes(1);

    worker?.reply(replayOk(2, "newer"));
    await expect(fresh).resolves.toMatchObject({
      result: { versions: { targetReference: "newer" } },
    });
    worker?.reply(replayOk(1, "older"));
    await expect(staleOutcome).resolves.toBeInstanceOf(SupersededError);
  });

  /**
   * Regression (benchmark F028): a Worker built by another version announces a
   * different protocol. That path was unreachable code before, so a mismatched
   * Worker looked like a Worker that never started.
   */
  it("names a protocol mismatch instead of waiting for a Worker that never starts", async () => {
    const client = new ReplayWorkerClient();
    const pending = client.listImports().catch((error: unknown) => error);
    const worker = FakeWorker.instances[0];
    worker?.reply({ type: "READY", protocol: WORKER_PROTOCOL_VERSION + 1 } as never);

    const failure = await pending;
    expect(failure).toBeInstanceOf(WorkerFailure);
    expect((failure as WorkerFailure).safe.title).toMatch(/different version/i);
    expect(worker?.terminated).toBe(true);
  });

  /**
   * Regression (benchmark F028): a Worker that accepts a request and then goes
   * quiet left the interface waiting forever. A request now fails when it stops
   * making progress, and a request that is still reporting progress is not
   * interrupted.
   */
  it("fails a request that stops reporting progress", async () => {
    vi.useFakeTimers();
    const client = new ReplayWorkerClient();
    const pending = client.listImports().catch((error: unknown) => error);
    const worker = FakeWorker.instances[0];
    worker?.announce();

    // A listing answers in milliseconds when it is reached; silence means hung.
    await vi.advanceTimersByTimeAsync(59_000);
    expect(worker?.terminated).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);

    const failure = await pending;
    expect(failure).toBeInstanceOf(WorkerFailure);
    expect((failure as WorkerFailure).safe.title).toMatch(/stopped responding/i);
  });

  it("keeps a long request alive while it reports progress", async () => {
    vi.useFakeTimers();
    const client = new ReplayWorkerClient();
    const pending = client.runReplay("import-1", target, "2026-09-15");
    const worker = FakeWorker.instances[0];
    worker?.announce();
    const requestId = worker?.lastRequestId ?? 0;

    for (let elapsed = 0; elapsed < 600_000; elapsed += 60_000) {
      worker?.reply({
        type: "PROGRESS",
        requestId,
        operation: "replay",
        phase: "replaying",
        detail: "chunk",
      });
      await vi.advanceTimersByTimeAsync(60_000);
    }
    expect(worker?.terminated).toBe(false);

    worker?.reply(replayOk(requestId, "done"));
    await expect(pending).resolves.toMatchObject({
      result: { versions: { targetReference: "done" } },
    });
  });

  it("resolves a ping instead of waiting for a request that is never answered", async () => {
    const client = new ReplayWorkerClient();
    const pinged = client.ping();
    const worker = FakeWorker.instances[0];
    worker?.announce();
    worker?.reply({
      type: "PONG",
      protocol: WORKER_PROTOCOL_VERSION,
      requestId: worker.lastRequestId,
    });
    await expect(pinged).resolves.toBe(true);
  });

  it("ignores a response that does not match the protocol", async () => {
    const client = new ReplayWorkerClient();
    const pending = client.listImports();
    const worker = FakeWorker.instances[0];
    worker?.announce();
    worker?.reply({ nonsense: true } as never);
    worker?.reply({ type: "IMPORTS", requestId: 99, imports: [] });
    worker?.reply({ type: "IMPORTS", requestId: 1, imports: [] });
    await expect(pending).resolves.toEqual([]);
  });
});

describe("optimizer client generations", () => {
  const config = {
    period: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" },
    context: { rulesAsOf: "2026-09-01" },
    resources: [],
    initialAllowance: { kind: "fresh" },
    chronology: { default: "request", evidence: "fixture" },
  } as const;
  it("supersedes optimizations immediately and drops queued old success", async () => {
    const client = new ReplayWorkerClient();
    const old = client.optimize("a", config);
    const rejected = expect(old).rejects.toBeInstanceOf(SupersededError);
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const oldId = (worker.sent.at(-1) as WorkerRequest).requestId;
    const next = client.optimize("a", config);
    const id = (worker.sent.at(-1) as WorkerRequest).requestId;
    worker.reply({ type: "OPTIMIZER_OK", requestId: oldId, summary: {} } as WorkerResponse);
    worker.reply({
      type: "OPTIMIZER_OK",
      requestId: id,
      summary: { status: "optimal" },
    } as WorkerResponse);
    await rejected;
    expect((await next).generation).toBe(id);
    client.dispose();
  });
  it("clearing or disposing cannot publish an optimizer result", async () => {
    const client = new ReplayWorkerClient();
    const result = client.optimize("a", config);
    const rejected = expect(result).rejects.toBeInstanceOf(SupersededError);
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const clear = client.clearLocalData();
    worker.reply({ type: "CLEARED", requestId: (worker.sent.at(-1) as WorkerRequest).requestId });
    await rejected;
    await clear;
    client.dispose();
    expect(worker.terminated).toBe(true);
  });
  it("rejects detail from an obsolete generation", async () => {
    const client = new ReplayWorkerClient();
    const result = client.optimize("a", config);
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const id = (worker.sent.at(-1) as WorkerRequest).requestId;
    worker.reply({ type: "OPTIMIZER_OK", requestId: id, summary: {} } as WorkerResponse);
    await result;
    const cancel = client.cancelOptimizer();
    worker.reply({ type: "CANCELLED", requestId: (worker.sent.at(-1) as WorkerRequest).requestId });
    await cancel;
    await expect(client.optimizerDetail(id, 0)).rejects.toBeInstanceOf(SupersededError);
    client.dispose();
  });
});

describe("optimizer AbortSignal lifetime", () => {
  it("does not create a Worker for a pre-aborted request", async () => {
    const client = new ReplayWorkerClient();
    const before = FakeWorker.instances.length;
    await expect(
      client.optimize(
        "a",
        {} as import("./worker-protocol").OptimizerConfiguration,
        undefined,
        AbortSignal.abort(),
      ),
    ).rejects.toBeInstanceOf(SupersededError);
    expect(FakeWorker.instances.length).toBe(before);
  });
  it("aborting while optimizing rejects immediately and requests termination", async () => {
    const client = new ReplayWorkerClient();
    const abort = new AbortController();
    const result = client.optimize(
      "a",
      {} as import("./worker-protocol").OptimizerConfiguration,
      undefined,
      abort.signal,
    );
    const rejected = expect(result).rejects.toBeInstanceOf(SupersededError);
    abort.abort();
    await rejected;
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    expect(worker.sent.at(-1)?.type).toBe("CANCEL_OPTIMIZER");
    worker.reply({ type: "CANCELLED", requestId: (worker.sent.at(-1) as WorkerRequest).requestId });
    client.dispose();
  });
});

describe("market decision cancellation and generations", () => {
  it("keys market summaries by exact period and reuses a prior period without another replay", async () => {
    const client = new ReplayWorkerClient();
    const periods = [
      { start: "2026-09-01", end: "2026-10-01" },
      { start: "2026-09-04", end: "2026-10-04" },
    ];
    for (const period of periods) {
      const run = client.apiMarket("same", undefined, period);
      const worker = FakeWorker.instances.at(-1) as FakeWorker;
      expect(worker.sent.at(-1)).toMatchObject({ type: "API_MARKET", period });
      worker.reply({
        type: "API_MARKET_OK",
        requestId: (worker.sent.at(-1) as WorkerRequest).requestId,
        decision: { scenarios: [] },
      });
      await run;
    }
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const count = worker.sent.length;
    await client.apiMarket("same", undefined, periods[0]);
    expect(worker.sent.length).toBe(count);
    client.dispose();
  });

  it("keys market summaries by account and reuses only the matching account", async () => {
    const client = new ReplayWorkerClient();
    const periods = [
      { start: "2026-09-01", end: "2026-10-01" },
      { start: "2026-09-04", end: "2026-10-04" },
    ];
    for (const i of periods.keys()) {
      const run = client.apiMarket("same", undefined, periods[0], `account-${i}`);
      const worker = FakeWorker.instances.at(-1) as FakeWorker;
      expect(worker.sent.at(-1)).toMatchObject({
        type: "API_MARKET",
        period: periods[0],
        resourceInstanceId: `account-${i}`,
      });
      worker.reply({
        type: "API_MARKET_OK",
        requestId: (worker.sent.at(-1) as WorkerRequest).requestId,
        decision: { scenarios: [] },
      });
      await run;
    }
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const count = worker.sent.length;
    await client.apiMarket("same", undefined, periods[0], "account-0");
    expect(worker.sent.length).toBe(count);
    client.dispose();
  });

  it("keys market summaries by recording tools and sends the tool filter", async () => {
    const client = new ReplayWorkerClient();
    const period = { start: "2026-09-01", end: "2026-10-01" };
    for (const sources of [undefined, ["codex"], ["claude-code"]]) {
      const run = client.apiMarket("same", undefined, period, undefined, sources);
      const worker = FakeWorker.instances.at(-1) as FakeWorker;
      const sent = worker.sent.at(-1) as Extract<WorkerRequest, { type: "API_MARKET" }>;
      expect(sent).toMatchObject({ type: "API_MARKET", period });
      expect(sent.sources).toEqual(sources);
      worker.reply({
        type: "API_MARKET_OK",
        requestId: sent.requestId,
        decision: { scenarios: [] },
      });
      await run;
    }
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const count = worker.sent.length;
    await client.apiMarket("same", undefined, period, undefined, ["codex"]);
    await client.apiMarket("same", undefined, period, undefined, []);
    expect(worker.sent.length).toBe(count);
    client.dispose();
  });

  it("reuses only completed summaries and releases them on teardown", async () => {
    const client = new ReplayWorkerClient();
    const run = client.apiMarket("a");
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    worker.reply({
      type: "API_MARKET_OK",
      requestId: (worker.sent.at(-1) as WorkerRequest).requestId,
      decision: { scenarios: [] },
    });
    const result = await run;
    const messages = worker.sent.length;
    expect(await client.apiMarket("a")).toBe(result);
    expect(worker.sent.length).toBe(messages);
    await expect(client.apiMarket("a", AbortSignal.abort())).rejects.toBeInstanceOf(
      SupersededError,
    );
    client.dispose();
    const fresh = client.apiMarket("a");
    const nextWorker = FakeWorker.instances.at(-1) as FakeWorker;
    expect(nextWorker).not.toBe(worker);
    nextWorker.reply({
      type: "API_MARKET_OK",
      requestId: (nextWorker.sent.at(-1) as WorkerRequest).requestId,
      decision: { scenarios: [] },
    });
    await fresh;
    client.dispose();
  });
  it("bounds summary retention and invalidates it when local data is cleared", async () => {
    const client = new ReplayWorkerClient();
    async function finish(id: string) {
      const pending = client.apiMarket(id);
      const worker = FakeWorker.instances.at(-1) as FakeWorker;
      worker.reply({
        type: "API_MARKET_OK",
        requestId: (worker.sent.at(-1) as WorkerRequest).requestId,
        decision: { scenarios: [] },
      });
      await pending;
      return worker;
    }
    // Sixteen completed summaries fit: a whole workload, a billing review, My
    // Stack's per-tool slices of one period and its per-account scopes. The
    // seventeenth evicts the oldest.
    const ids = "abcdefghijklmno".split("");
    for (const id of ids) await finish(id);
    const kept = await finish("p");
    const retained = kept.sent.length;
    await client.apiMarket("a");
    expect(kept.sent.length).toBe(retained);
    const worker = await finish("q");
    const messages = worker.sent.length;
    await finish("a");
    expect(worker.sent.length).toBe(messages + 1);
    const cleared = client.clearLocalData();
    worker.reply({ type: "CLEARED", requestId: (worker.sent.at(-1) as WorkerRequest).requestId });
    await cleared;
    const afterClear = worker.sent.length;
    await finish("a");
    expect(worker.sent.length).toBe(afterClear + 1);
    client.dispose();
  });
  it("never launches a pre-aborted market run", async () => {
    const client = new ReplayWorkerClient();
    const before = FakeWorker.instances.length;
    await expect(client.apiMarket("a", AbortSignal.abort())).rejects.toBeInstanceOf(
      SupersededError,
    );
    expect(FakeWorker.instances.length).toBe(before);
    client.dispose();
  });
  it("rejects replaced market work and drops its late success", async () => {
    const client = new ReplayWorkerClient();
    const old = client.apiMarket("old");
    const rejected = expect(old).rejects.toBeInstanceOf(SupersededError);
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const oldId = (worker.sent.at(-1) as WorkerRequest).requestId;
    const next = client.apiMarket("new");
    const id = (worker.sent.at(-1) as WorkerRequest).requestId;
    worker.reply({ type: "API_MARKET_OK", requestId: oldId, decision: { scenarios: [] } });
    worker.reply({ type: "API_MARKET_OK", requestId: id, decision: { scenarios: [] } });
    await rejected;
    expect(await next).toEqual({ scenarios: [] });
    client.dispose();
  });
  it("aborts a running market child without publishing success", async () => {
    const client = new ReplayWorkerClient(),
      abort = new AbortController();
    const result = client.apiMarket("a", abort.signal);
    const rejected = expect(result).rejects.toBeInstanceOf(SupersededError);
    const worker = FakeWorker.instances.at(-1) as FakeWorker;
    const id = (worker.sent.at(-1) as WorkerRequest).requestId;
    abort.abort();
    await rejected;
    expect(worker.sent.at(-1)?.type).toBe("CANCEL_OPTIMIZER");
    worker.reply({ type: "API_MARKET_OK", requestId: id, decision: { scenarios: [] } });
    worker.reply({ type: "CANCELLED", requestId: (worker.sent.at(-1) as WorkerRequest).requestId });
    client.dispose();
  });
});
