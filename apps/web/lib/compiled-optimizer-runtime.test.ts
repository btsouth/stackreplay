// biome-ignore-all lint/style/noNonNullAssertion: deterministic fixture Worker.

import {
  type CompiledOptimizationInput,
  optimizeCompiledExactModels,
} from "@stackreplay/replay-engine";
import { expect, it } from "vitest";
import {
  compiledScenario,
  syntheticPlan,
} from "../../../packages/replay-engine/src/fixtures/compiled-execution";
import {
  compiledOptimizationDetail,
  OptimizerRuntime,
  summarizeCompiledOptimization,
} from "./optimizer-runtime";

it("retains independently verifiable summary after child teardown without assignments", async () => {
  const input = compiledScenario(2, [syntheticPlan("p", "10", "1")]);
  const result = optimizeCompiledExactModels(input);
  const summary = summarizeCompiledOptimization(result);
  let onmessage: ((e: { data: unknown }) => void) | null = null;
  let terminated = false;
  const worker = {
    set onmessage(value: typeof onmessage) {
      onmessage = value;
    },
    postMessage(message: { type: string }) {
      if (message.type === "run") onmessage?.({ data: { type: "done", summary } });
    },
    terminate() {
      terminated = true;
    },
  };
  const runtime = new OptimizerRuntime<CompiledOptimizationInput>(
    () => worker as unknown as Worker,
  );
  const completed = await runtime.run(async () => input);
  runtime.cancel();
  expect(terminated).toBe(true);
  expect(completed.winnerId).toBe("p");
  expect(completed.explanation?.fixedFees[0]?.usd).toBe("1");
  expect(completed.explanation?.receipts[0]?.debits[0]?.units).toBe("2");
  expect(completed.scenario.initial.unlisted).toBe("fresh");
  expect(completed.artifacts[0]?.claims[0]?.evidencePackageHash).toBe("synthetic-evidence");
  expect(completed.explanation).not.toHaveProperty("assignments");
  await expect(runtime.detail(0)).rejects.toThrow("No completed optimization");
});
it("compiled assignment pages have stable bounds and do not change the durable summary", () => {
  const result = optimizeCompiledExactModels(compiledScenario(10));
  const summary = summarizeCompiledOptimization(result);
  expect(compiledOptimizationDetail(result, 2, 3).assignments).toHaveLength(3);
  expect(() => compiledOptimizationDetail(result, 0, 1001)).toThrow();
  expect(summarizeCompiledOptimization(result)).toEqual(summary);
});
