import { benchmarkData, benchmarkEdition, validateBenchmarkData } from "@stackreplay/benchmarks";
import { loadPublicCatalog } from "./public-catalog";

export function loadPublicBenchmarks(edition = benchmarkEdition) {
  if (edition !== benchmarkEdition) throw new Error("This benchmark edition is unavailable");
  const models = loadPublicCatalog().models;
  return validateBenchmarkData(benchmarkData, Object.fromEntries(models.map((m) => [m.id, m])));
}
