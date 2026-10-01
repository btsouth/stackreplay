import {
  benchmarkDataForEdition,
  benchmarkEdition,
  validateBenchmarkData,
} from "@stackreplay/benchmarks";
import { loadPublicCatalog } from "./public-catalog";

export function loadPublicBenchmarks(edition = benchmarkEdition) {
  const data = benchmarkDataForEdition(edition);
  if (!data) throw new Error("This benchmark edition is unavailable");
  const models = loadPublicCatalog().models;
  return validateBenchmarkData(data, Object.fromEntries(models.map((m) => [m.id, m])));
}
