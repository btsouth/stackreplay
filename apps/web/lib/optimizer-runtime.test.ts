// biome-ignore-all lint/style/noNonNullAssertion: Each fixture Worker is asserted after creation.
import type { ExactOptimizationInput } from "@stackreplay/replay-engine";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OptimizerCancelledError,
  type OptimizerChildResponse,
  OptimizerRuntime,
} from "./optimizer-runtime";

class FakeWorker {
  onmessage: ((event: { data: OptimizerChildResponse }) => void) | undefined;
  onerror: (() => void) | undefined;
  onmessageerror: (() => void) | undefined;
  terminated = false;
  sent: unknown[] = [];
  postMessage(data: unknown) {
    this.sent.push(data);
  }
  terminate() {
    this.terminated = true;
  }
  reply(data: OptimizerChildResponse) {
    this.onmessage?.({ data });
  }
}
const input = { events: [] } as unknown as ExactOptimizationInput;
const done = { type: "done", summary: { status: "optimal" } } as OptimizerChildResponse;
function setup() {
  const workers: FakeWorker[] = [];
  const runtime = new OptimizerRuntime(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker as unknown as Worker;
  }, 1000);
  return { runtime, workers };
}
afterEach(() => vi.useRealTimers());
describe("optimizer ownership and cancellation", () => {
  it("pre-aborted requests neither load nor spawn", async () => {
    const { runtime, workers } = setup();
    const signal = AbortSignal.abort();
    const load = vi.fn(async () => input);
    await expect(runtime.run(load, { signal })).rejects.toBeInstanceOf(OptimizerCancelledError);
    expect(load).not.toHaveBeenCalled();
    expect(workers).toHaveLength(0);
  });
  it("cancels a pending workload load before structured clone", async () => {
    const { runtime, workers } = setup();
    let release!: (value: ExactOptimizationInput) => void;
    const result = runtime.run(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const rejected = expect(result).rejects.toBeInstanceOf(OptimizerCancelledError);
    runtime.cancel();
    release(input);
    await rejected;
    await Promise.resolve();
    expect(workers).toHaveLength(0);
  });
  it.each(["preparing", "enumerating", "assigning", "receipts"] as const)(
    "terminates during %s and ignores queued success",
    async (phase) => {
      const { runtime, workers } = setup();
      let progress = 0;
      const result = runtime.run(async () => input, { onPhase: () => progress++ });
      const rejected = expect(result).rejects.toBeInstanceOf(OptimizerCancelledError);
      await Promise.resolve();
      const worker = workers[0]!;
      worker.reply({ type: "phase", phase });
      runtime.cancel();
      worker.reply(done);
      await rejected;
      expect(worker.terminated).toBe(true);
      expect(progress).toBe(2);
    },
  );
  it("superseding a generation cannot publish its late result or error", async () => {
    const { runtime, workers } = setup();
    const old = runtime.run(async () => input);
    const rejected = expect(old).rejects.toBeInstanceOf(OptimizerCancelledError);
    await Promise.resolve();
    const next = runtime.run(async () => input);
    await Promise.resolve();
    workers[0]!.reply(done);
    workers[0]!.onerror?.();
    workers[1]!.reply(done);
    await rejected;
    await expect(next).resolves.toMatchObject({ status: "optimal" });
    expect(workers[1]!.terminated).toBe(false);
    runtime.cancel();
  });
  it("cancels retained detail state, then runs successfully again", async () => {
    const { runtime, workers } = setup();
    const signal = new AbortController();
    const result = runtime.run(async () => input, { signal: signal.signal });
    await Promise.resolve();
    workers[0]!.reply(done);
    await result;
    const page = runtime.detail(0);
    const rejected = expect(page).rejects.toBeInstanceOf(OptimizerCancelledError);
    signal.abort();
    await rejected;
    expect(workers[0]!.terminated).toBe(true);
    await expect(runtime.detail(0)).rejects.toThrow(/No completed/);
    const next = runtime.run(async () => input);
    await Promise.resolve();
    workers[1]!.reply(done);
    await next;
    runtime.cancel();
  });
  it("enforces runtime budget and can recover after errors", async () => {
    vi.useFakeTimers();
    const { runtime, workers } = setup();
    const result = runtime.run(async () => input);
    const rejected = expect(result).rejects.toThrow(/budget/);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1001);
    await rejected;
    expect(workers[0]!.terminated).toBe(true);
  });
  it("bounds detail payloads and retains no full assignments on the caller", async () => {
    const { runtime, workers } = setup();
    const result = runtime.run(async () => input);
    await Promise.resolve();
    workers[0]!.reply(done);
    await result;
    await expect(runtime.detail(0, 1001)).rejects.toThrow(/Invalid/);
    runtime.cancel();
  });
});

it("yields between transfer batches and stops serializing after cancellation", async () => {
  vi.useFakeTimers();
  const { runtime, workers } = setup();
  const demand = {
    ...input,
    events: Array.from({ length: 12000 }, () => ({})),
  } as unknown as ExactOptimizationInput;
  const result = runtime.run(async () => demand);
  const rejected = expect(result).rejects.toBeInstanceOf(OptimizerCancelledError);
  await Promise.resolve();
  const worker = workers[0]!;
  expect(worker.sent.map((message) => (message as { type: string }).type)).toEqual([
    "begin",
    "events",
  ]);
  runtime.cancel();
  await vi.runAllTimersAsync();
  await rejected;
  expect(worker.sent).toHaveLength(2);
  expect(worker.terminated).toBe(true);
});
