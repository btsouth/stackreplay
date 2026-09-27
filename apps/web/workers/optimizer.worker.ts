/// <reference lib="webworker" />
import {
  type ExactOptimizationInput,
  type ExactOptimizationResult,
  optimizeExactModels,
} from "@stackreplay/replay-engine";
import { optimizationDetail, summarizeOptimization } from "../lib/optimizer-runtime";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let result: ExactOptimizationResult | undefined;
let buffered:
  | (Omit<ExactOptimizationInput, "events"> & {
      events: ExactOptimizationInput["events"][number][];
    })
  | undefined;
type Request =
  | { type: "begin"; configuration: Omit<ExactOptimizationInput, "events"> }
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
      result = optimizeExactModels(input, {
        onPhase: (phase) => scope.postMessage({ type: "phase", phase }),
      });
      scope.postMessage({ type: "done", summary: summarizeOptimization(result) });
    } else if (result) {
      scope.postMessage({
        type: "detail",
        id: data.id,
        detail: optimizationDetail(result, data.offset, data.limit),
      });
    } else scope.postMessage({ type: "error" });
  } catch {
    buffered = undefined;
    result = undefined;
    scope.postMessage({ type: "error" });
  }
};
