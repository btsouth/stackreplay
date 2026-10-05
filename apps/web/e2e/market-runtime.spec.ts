import { expect, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import type { WorkerRequest, WorkerResponse } from "../lib/worker-protocol";

test("D0 owner/child pipeline scales to 100k without event-sized page results", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "One deterministic performance run; mobile UI is covered separately.",
  );
  test.setTimeout(180_000);
  await page.goto("/");
  const measurements = [];
  for (const count of [10000, 50000, 100000]) {
    const demo = buildDemoExport("moderate");
    demo.events = Array.from({ length: count }, (_, i) => {
      const event = demo.events[i % demo.events.length];
      if (!event) throw new Error("fixture");
      return { ...event, id: `market-${i}` };
    });
    // Send the file text, as intake does. Serializing a 100k-event object graph
    // through the browser-control protocol can starve the runner's own timers.
    const result = await page.evaluate(async (json) => {
      const worker = new Worker("/stackreplay-worker.js", { type: "module" });
      const pending = new Map<number, (r: WorkerResponse) => void>();
      let id = 0,
        ticks = 0,
        cancelledId = 0,
        staleSuccess = false;
      const timer = setInterval(() => ticks++, 10);
      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (data.type === "API_MARKET_OK" && data.requestId === cancelledId) staleSuccess = true;
        if ("requestId" in data && !["PROGRESS", "OPTIMIZER_PHASE"].includes(data.type)) {
          pending.get(data.requestId)?.(data);
          pending.delete(data.requestId);
        }
      };
      const send = (request: Omit<WorkerRequest, "requestId" | "protocol">) =>
        new Promise<WorkerResponse>((resolve) => {
          pending.set(++id, resolve);
          worker.postMessage({ ...request, requestId: id, protocol: 1 });
        });
      try {
        const imported = await send({
          type: "IMPORT_FILE",
          importId: "abcdefabcdefabcdefabcdefabcdefab",
          label: "D0 runtime fixture",
          file: new File([json], "fixture.json"),
          now: "2026-09-27T18:30:00Z",
          saveLocal: false,
        } as Omit<WorkerRequest, "requestId" | "protocol">);
        if (imported.type !== "IMPORT_OK") throw new Error(JSON.stringify(imported));
        const request = { type: "API_MARKET", importId: imported.record.id } as Omit<
          WorkerRequest,
          "requestId" | "protocol"
        >;
        const start = performance.now();
        const first = await send(request);
        const ms = performance.now() - start;
        if (first.type !== "API_MARKET_OK") throw new Error(JSON.stringify(first));
        const cancelled = send(request);
        cancelledId = id;
        const cancelStart = performance.now();
        await send({ type: "CANCEL_OPTIMIZER" });
        const terminal = await cancelled;
        const cancelMs = performance.now() - cancelStart;
        const repeatStart = performance.now();
        const repeat = await send(request);
        const repeatMs = performance.now() - repeatStart;
        if (repeat.type !== "API_MARKET_OK") throw new Error(JSON.stringify(repeat));
        return {
          ms,
          repeatMs,
          cancelMs,
          ticks,
          staleSuccess,
          cancelled: terminal.type,
          identical: JSON.stringify(first.decision) === JSON.stringify(repeat.decision),
          summaryBytes: JSON.stringify(first.decision).length,
          cases: first.decision.scenarios.map((s) => ({
            required: s.summary.scope.required,
            modeled: s.summary.candidates[0]?.modeled,
            status: s.summary.candidates[0]?.status,
            assignments: s.summary.detailCounts.assignments,
            hasEvents: !!s.summary.explanation && "assignments" in s.summary.explanation,
          })),
        };
      } finally {
        clearInterval(timer);
        worker.terminate();
      }
    }, JSON.stringify(demo));
    expect(result.cases).toHaveLength(2);
    for (const c of result.cases)
      expect(c).toEqual({
        required: count,
        modeled: count,
        status: "feasible",
        assignments: count,
        hasEvents: false,
      });
    expect(result.identical).toBe(true);
    expect(result.staleSuccess).toBe(false);
    expect(result.cancelled).toBe("CANCELLED");
    expect(result.ticks).toBeGreaterThan(10);
    expect(result.summaryBytes).toBeLessThan(200000);
    measurements.push({ count, ...result });
  }
  console.log("D0 runtime measurements", JSON.stringify(measurements));
  await testInfo.attach("d0-runtime.json", {
    body: JSON.stringify(measurements, null, 2),
    contentType: "application/json",
  });
});
