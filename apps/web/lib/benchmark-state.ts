import { benchmarkCategories, benchmarkEdition, frontierModelIds } from "@stackreplay/benchmarks";

export interface BenchmarkState {
  modelIds: string[];
  category: string;
  coverage: "all" | "shared";
  sourceSetId?: string | undefined;
  observationIds: string[];
  edition: string;
  error?: string | undefined;
}
export function parseBenchmarkState(
  params: URLSearchParams,
  knownModelIds: readonly string[],
): BenchmarkState {
  const requested = params.get("models")?.split(",").filter(Boolean) ?? frontierModelIds;
  const valid =
    requested.length > 0 &&
    requested.length <= 6 &&
    new Set(requested).size === requested.length &&
    requested.every((id) => knownModelIds.includes(id));
  const category = params.get("category") ?? "all";
  return {
    modelIds: valid ? requested : [...frontierModelIds],
    category: benchmarkCategories.some((c) => c.id === category) ? category : "all",
    coverage: params.get("coverage") === "shared" ? "shared" : "all",
    sourceSetId: params.get("source") ?? undefined,
    observationIds: params.getAll("observation"),
    edition: params.get("edition") ?? benchmarkEdition,
    error: valid ? undefined : "Invalid model selection. Showing the Frontier preset.",
  };
}
export function benchmarkUrl(state: BenchmarkState): string {
  const p = new URLSearchParams({
    models: state.modelIds.join(","),
    edition: state.edition,
    coverage: state.coverage,
  });
  if (state.category !== "all") p.set("category", state.category);
  if (state.sourceSetId) p.set("source", state.sourceSetId);
  for (const id of state.observationIds) p.append("observation", id);
  return `/benchmarks?${p}`;
}
