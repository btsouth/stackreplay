import type { CompiledOptimizationInput, ExactOptimizationInput } from "@stackreplay/replay-engine";
import { OptimizerRuntime } from "../lib/optimizer-runtime";
import { compiledFixture } from "./optimizer-compiled-fixture";
import { fixture } from "./optimizer-fixture";

let transfers: number[] = [];
const runtime = new OptimizerRuntime<CompiledOptimizationInput | ExactOptimizationInput>(() => {
  transfers = [];
  const worker = new Worker("/child.js", { type: "module" });
  const send = worker.postMessage.bind(worker);
  worker.postMessage = (message: unknown) => {
    const start = performance.now();
    send(message);
    transfers.push(performance.now() - start);
  };
  return worker;
});
let input: CompiledOptimizationInput | ExactOptimizationInput;
self.onmessage = async ({ data }) => {
  if (data.type === "load")
    input = data.compiled
      ? compiledFixture(data.count, data.plans)
      : fixture(data.count, data.plans);
  const start = performance.now();
  try {
    if (data.type === "run") {
      const result = await runtime.run(async () => input, {
        onPhase: (phase) => self.postMessage({ type: "phase", phase }),
      });
      self.postMessage({
        type: "run",
        ms: performance.now() - start,
        candidates: result.search.candidateCount,
        transferMs: transfers.reduce((a, b) => a + b, 0),
        maxTransferMs: Math.max(...transfers),
        summaryBytes: JSON.stringify(result).length,
        total:
          "contract" in result ? result.candidates[0]?.totalUsd : result.candidates[0]?.totalCost,
        status: result.status,
        winnerId: result.winnerId,
      });
      return;
    }
    if (data.type === "release" || data.type === "cancel") runtime.cancel();
    if (data.type === "scope")
      input = { ...input, events: input.events.slice(0, Math.floor(input.events.length / 2)) };
    if (data.type === "plans")
      input =
        "contract" in input
          ? { ...input, scenario: { ...input.scenario, maxSubscriptions: 1 } }
          : { ...input, resources: input.resources.slice(0, 3) };
    self.postMessage({ type: data.type, ms: performance.now() - start });
  } catch {
    self.postMessage({ type: "cancelled", ms: performance.now() - start });
  }
};
