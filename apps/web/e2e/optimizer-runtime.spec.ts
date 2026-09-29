import { expect, test } from "@playwright/test";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import type { WorkerRequest, WorkerResponse } from "../lib/worker-protocol";

test("optimizer uses the imported Worker workload, cancels stale generations, and pages details", async ({
  page,
}) => {
  test.setTimeout(120000);
  const exported = buildArchetypeExport("claude-only");
  await page.goto("/");
  const result = await page.evaluate(async (exported) => {
    const worker = new Worker("/stackreplay-worker.js", { type: "module" });
    const pending = new Map<number, (message: WorkerResponse) => void>();
    const messages: WorkerResponse[] = [];
    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      messages.push(data);
      if ("requestId" in data && !["PROGRESS", "OPTIMIZER_PHASE"].includes(data.type)) {
        pending.get(data.requestId)?.(data);
        pending.delete(data.requestId);
      }
    };
    let id = 0;
    const send = (request: Omit<WorkerRequest, "requestId" | "protocol">) =>
      new Promise<WorkerResponse>((resolve) => {
        const requestId = ++id;
        pending.set(requestId, resolve);
        worker.postMessage({ ...request, requestId, protocol: 1 });
      });
    try {
      const imported = await send({
        type: "IMPORT_FILE",
        importId: "abcdefabcdefabcdefabcdefabcdefab",
        label: "fixture",
        file: new File([JSON.stringify(exported)], "fixture.json"),
        now: "2026-09-27T00:00:00Z",
        saveLocal: false,
      } as Omit<WorkerRequest, "requestId" | "protocol">);
      if (imported.type !== "IMPORT_OK") throw new Error(JSON.stringify(imported));
      const timestamps = exported.events.map((e) => Date.parse(e.occurredAt));
      const configuration = {
        period: {
          start: new Date(Math.max(...timestamps) + 1 - 30 * 86400000).toISOString(),
          end: new Date(Math.max(...timestamps) + 1).toISOString(),
        },
        context: { rulesAsOf: "2026-09-27" },
        resources: [{ target: { type: "api", providerId: "anthropic" } }],
        initialAllowance: { kind: "fresh" },
        chronology: { default: "request", evidence: "Deterministic request fixture" },
      };
      const request = { type: "OPTIMIZE", importId: imported.record.id, configuration } as Omit<
        WorkerRequest,
        "requestId" | "protocol"
      >;
      const stale = send(request);
      const next = send(request);
      const [old, completed] = await Promise.all([stale, next]);
      if (completed.type !== "OPTIMIZER_OK") throw new Error(JSON.stringify(completed));
      const detail = await send({
        type: "OPTIMIZER_DETAIL",
        generation: completed.requestId,
        offset: 0,
        limit: 10,
      } as Omit<WorkerRequest, "requestId" | "protocol">);
      const repeated = await send(request);
      const cancelled = send(request);
      await send({ type: "CANCEL_OPTIMIZER" });
      const terminal = await cancelled;
      const again = await send(request);
      await send({ type: "CLEAR_LOCAL_DATA" });
      const afterClear = await send({
        type: "OPTIMIZER_DETAIL",
        generation: completed.requestId,
        offset: 0,
        limit: 10,
      } as Omit<WorkerRequest, "requestId" | "protocol">);
      return {
        old,
        completed,
        detail,
        repeated,
        terminal,
        again,
        afterClear,
        staleSuccess: messages.some((m) => m.type === "OPTIMIZER_OK" && m.requestId === 2),
      };
    } finally {
      worker.terminate();
    }
  }, exported);
  expect(result.old.type).toBe("CANCELLED");
  expect(result.terminal.type).toBe("CANCELLED");
  expect(result.staleSuccess).toBe(false);
  expect(result.afterClear.type).toBe("CANCELLED");
  if (
    result.completed.type === "OPTIMIZER_OK" &&
    result.repeated.type === "OPTIMIZER_OK" &&
    result.again.type === "OPTIMIZER_OK"
  ) {
    expect(result.completed.summary.status).toBe("optimal");
    expect(result.completed.summary).toEqual(result.repeated.summary);
    expect(result.completed.summary).toEqual(result.again.summary);
    expect(result.completed.summary.scope).not.toHaveProperty("events");
    expect(result.completed.summary.explanation).not.toHaveProperty("assignments");
  }
  expect(result.detail.type).toBe("OPTIMIZER_DETAIL_OK");
  if (result.detail.type === "OPTIMIZER_DETAIL_OK")
    expect(result.detail.detail.assignments).toHaveLength(10);
});
