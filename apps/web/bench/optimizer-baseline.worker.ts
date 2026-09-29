import { optimizeExactModels } from "../../../packages/replay-engine/src/exact-optimizer";
import { fixture } from "./optimizer-fixture";

let input: ReturnType<typeof fixture>;
let result: ReturnType<typeof optimizeExactModels> | undefined;
self.onmessage = ({ data }) => {
  if (data.type === "load") input = fixture(data.count, data.plans);
  if (data.type === "clone") {
    input = structuredClone(input);
  }
  const start = performance.now();
  if (data.type === "run") result = optimizeExactModels(input);
  if (data.type === "release") result = undefined;
  self.postMessage({
    type: data.type,
    ms: performance.now() - start,
    candidates: result?.search.candidateCount,
  });
};
