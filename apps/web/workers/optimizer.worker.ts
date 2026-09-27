/// <reference lib="webworker" />
import {
  type CompiledOptimizationInput,
  type CompiledOptimizationResult,
  type ExactOptimizationInput,
  type ExactOptimizationResult,
  optimizeCompiledExactModels,
  optimizeExactModels,
} from "@stackreplay/replay-engine";
import {
  compiledOptimizationDetail,
  optimizationDetail,
  summarizeCompiledOptimization,
  summarizeOptimization,
} from "../lib/optimizer-runtime";

const scope = self as unknown as DedicatedWorkerGlobalScope;
type Configuration =
  | Omit<ExactOptimizationInput, "events">
  | Omit<CompiledOptimizationInput, "events">;
let result: ExactOptimizationResult | CompiledOptimizationResult | undefined;
let buffered:
  | (Configuration & {
      events: ExactOptimizationInput["events"][number][];
    })
  | undefined;
type Request =
  | { type: "begin"; configuration: Configuration }
  | { type: "events"; events: ExactOptimizationInput["events"] }
  | { type: "run" }
  | { type: "detail"; id: number; offset: number; limit: number };
scope.onmessage = ({ data }: MessageEvent<Request>) => {
  try {
    if (data.type === "begin") {
      result = undefined;
      buffered = { ...data.configuration, events: [] };
    } else if (data.type === "events") {
      if (!buffered || data.events.length > 5000) throw new Error("Invalid optimizer batch");
      buffered.events.push(...data.events);
    } else if (data.type === "run") {
      if (!buffered) throw new Error("Missing optimizer input");
      const input = buffered;
      buffered = undefined;
      const runtime = { onPhase: (phase: string) => scope.postMessage({ type: "phase", phase }) };
      result =
        "contract" in input
          ? optimizeCompiledExactModels(input as CompiledOptimizationInput, runtime)
          : optimizeExactModels(input as ExactOptimizationInput, runtime);
      scope.postMessage({
        type: "done",
        summary:
          "contract" in result
            ? summarizeCompiledOptimization(result)
            : summarizeOptimization(result),
      });
    } else if (result) {
      scope.postMessage({
        type: "detail",
        id: data.id,
        detail:
          "contract" in result
            ? compiledOptimizationDetail(result, data.offset, data.limit)
            : optimizationDetail(result, data.offset, data.limit),
      });
    } else scope.postMessage({ type: "error" });
  } catch {
    buffered = undefined;
    result = undefined;
    scope.postMessage({ type: "error" });
  }
};
