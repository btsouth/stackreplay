import { expect, test } from "@playwright/test";
import {
  compiledScenario,
  multiConstraintPlan,
} from "../../../packages/replay-engine/src/fixtures/compiled-execution";
import type { CompiledOptimizerDetail, CompiledOptimizerSummary } from "../lib/optimizer-runtime";

test("compiled child replays overlapping constraints and retains an explanation after termination", async ({
  page,
}) => {
  const plan = multiConstraintPlan();
  for (const constraint of plan.computation.constraints) constraint.amount = "10000";
  const input = compiledScenario(1000, [plan]);
  const binding = input.scenario.resources[0];
  if (!binding) throw new Error("Missing synthetic resource");
  binding.firstUse.session = "inactive";
  await page.goto("/");
  const result = await page.evaluate(async (input) => {
    const worker = new Worker("/stackreplay-optimizer-worker.js", { type: "module" });
    const { events, ...configuration } = input;
    const done = new Promise<CompiledOptimizerSummary>((resolve, reject) => {
      worker.onerror = reject;
      worker.onmessage = ({ data }) => {
        if (data.type === "done") resolve(data.summary);
        else if (data.type === "error") reject(new Error("Compiled Worker failed"));
      };
    });
    worker.postMessage({ type: "begin", configuration });
    worker.postMessage({ type: "events", events });
    worker.postMessage({ type: "run" });
    const summary = await done;
    const detail = await new Promise<CompiledOptimizerDetail>((resolve) => {
      worker.onmessage = ({ data }) => {
        if (data.type === "detail") resolve(data.detail);
      };
      worker.postMessage({ type: "detail", id: 1, offset: 3, limit: 7 });
    });
    worker.terminate();
    return { summary, detail };
  }, input);
  expect(result.summary.winnerId).toBe("multi");
  expect(result.summary.explanation).not.toHaveProperty("assignments");
  expect(result.summary.explanation?.receipts[0]?.capacity).toHaveLength(4);
  expect(result.summary.explanation?.receipts[0]?.debits[0]?.units).toBe("1000");
  expect(result.summary.explanation?.fixedFees[0]?.usd).toBe("20");
  expect(result.detail.assignments).toHaveLength(7);
  expect(result.summary.artifacts[0]?.artifactHash).toBe(plan.artifactHash);
});

test("v2 bound partitions and scenario identity survive child teardown", async ({ page }) => {
  const { boundFixture, partitionPlan, pinPlan } = await import(
    "../../../packages/replay-engine/src/fixtures/bound-execution"
  );
  const { request } = await import("../../../packages/replay-engine/src/fixtures/exact-optimizer");
  const plan = partitionPlan();
  if (plan.computation.kind !== "executable") throw new Error("Expected executable fixture");
  for (const constraint of plan.computation.constraints) constraint.amount = "10000";
  const input = boundFixture(pinPlan(plan), "2027-03-01T05:00:00Z", "America/New_York");
  input.events = Array.from({ length: 1000 }, (_, i) =>
    request(
      `event-${i}`,
      1,
      "fixture-small",
      new Date(Date.parse(input.scenario.period.start) + i * 1000).toISOString(),
    ),
  );
  await page.goto("/");
  const summary = await page.evaluate(async (input) => {
    const worker = new Worker("/stackreplay-optimizer-worker.js", { type: "module" });
    const { events, ...configuration } = input;
    const completed = new Promise<CompiledOptimizerSummary>((resolve, reject) => {
      worker.onerror = reject;
      worker.onmessage = ({ data }) => {
        if (data.type === "done") resolve(data.summary);
        else if (data.type === "error") reject(new Error(JSON.stringify(data)));
      };
    });
    worker.postMessage({ type: "begin", configuration });
    worker.postMessage({ type: "events", events });
    worker.postMessage({ type: "run" });
    try {
      return await completed;
    } finally {
      worker.terminate();
    }
  }, input);
  expect(summary.contract).toBe("compiled-v2");
  expect(summary.winnerId).toBe("account");
  expect(summary.scenario).toEqual(input.scenario);
  expect(summary.explanation).not.toHaveProperty("assignments");
  expect(summary.explanation?.receipts[0]?.capacity[0]?.window.id).toBe(
    input.scenario.resources[0]?.windowInstances[0]?.windowInstanceId,
  );
  expect(summary.explanation?.fixedFees[0]?.usd).toBe("20");
});
