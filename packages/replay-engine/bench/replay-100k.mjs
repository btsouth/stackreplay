/**
 * 100,000 usage event benchmark (spec point 78).
 *
 * Runs the real replay engine over a deterministic synthetic workload and
 * reports measured wall-clock time from this machine. Nothing here is faked:
 * the numbers printed are the numbers observed. Set BENCH_EVENTS or BENCH_RUNS
 * to change the load.
 *
 * Run with: pnpm --filter @stackreplay/replay-engine bench
 */
import { performance } from "node:perf_hooks";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import { replay } from "@stackreplay/replay-engine";

const EVENT_COUNT = Number(process.env.BENCH_EVENTS ?? 100_000);
const RUNS = Number(process.env.BENCH_RUNS ?? 5);
if (
  !Number.isSafeInteger(EVENT_COUNT) ||
  EVENT_COUNT < 1 ||
  !Number.isSafeInteger(RUNS) ||
  RUNS < 1
) {
  throw new Error("BENCH_EVENTS and BENCH_RUNS must be positive safe integers");
}
const WINDOW_DAYS = 30;
const MODELS = ["example-small", "example-medium", "example-large"];

/** Deterministic LCG so the benchmark workload is identical on every run. */
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const rng = makeRng(20260921);
const BASE_MS = Date.UTC(2026, 8, 1);
const SPAN_MS = WINDOW_DAYS * 24 * 60 * 60 * 1000;

function buildEvents() {
  const events = [];
  for (let index = 0; index < EVENT_COUNT; index += 1) {
    const occurredAt = new Date(BASE_MS + Math.floor(rng() * SPAN_MS)).toISOString();
    const model = MODELS[Math.floor(rng() * MODELS.length)];
    const inputTokens = Math.floor(rng() * 40_000);
    const outputTokens = Math.floor(rng() * 8_000);
    const cacheReadTokens = Math.floor(rng() * 120_000);
    const reasoningTokens = rng() < 0.2 ? Math.floor(rng() * 5_000) : 0;
    events.push({
      schemaVersion: 1,
      id: `bench-${index}`,
      occurredAt,
      source: { adapterId: "bench", nativeSessionHash: `session-${index % 750}` },
      model: { rawName: model, canonicalId: model },
      modality: "text",
      workloadCategory: "coding",
      // Every canonical bucket is reported and declared disjoint, so the
      // benchmark measures the full simulation rather than unknown handling.
      usage: {
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens: 0,
        reasoningTokens,
        accounting: {
          cacheReadIncludedInInput: false,
          cacheWriteIncludedInInput: false,
          reasoningIncludedInOutput: false,
        },
      },
      confidence: { usage: "exact", model: "exact" },
    });
  }
  return events;
}

const events = buildEvents();
const catalog = loadDefaultCatalog();
/** Explicit rules instant (decision 17): inside the synthetic promotion window. */
const context = { rulesAsOf: "2026-09-20" };

const cases = [
  {
    label: "example-cloud-starter@2026-09-15",
    target: { type: "subscription", planVersionId: "example-cloud-starter@2026-09-15" },
  },
  {
    label: "example-cloud-pro@2026-08-01",
    target: { type: "subscription", planVersionId: "example-cloud-pro@2026-08-01" },
  },
  {
    // M4C: the same workload priced at a provider's list prices, with no plan
    // simulation at all. It is benchmarked here so the new path carries the same
    // performance evidence the subscription path has.
    label: "example-cloud (Direct API list prices)",
    target: { type: "api", providerId: "example-cloud" },
    api: true,
  },
];

for (const benchmarkCase of cases) {
  const reference =
    benchmarkCase.target.type === "api"
      ? catalog.providers[benchmarkCase.target.providerId]
      : catalog.planVersions[benchmarkCase.target.planVersionId];
  if (reference === undefined) {
    throw new Error(`benchmark target missing from catalog: ${benchmarkCase.label}`);
  }
}

const lines = [];
lines.push(`catalog version: ${catalog.catalogVersion}`);
lines.push(`node: ${process.version}`);
lines.push(
  `workload: ${EVENT_COUNT} events across ${WINDOW_DAYS} days, ${MODELS.length} models, deterministic seed 20260921`,
);
lines.push(`runs per target: ${RUNS}`);
lines.push("");

for (const benchmarkCase of cases) {
  // Warm each target with the same small workload; setup is outside timing.
  replay({ events: events.slice(0, 2_000), target: benchmarkCase.target, catalog, context });
  const samples = [];
  let result;
  for (let run = 0; run < RUNS; run += 1) {
    const startedAt = performance.now();
    result = replay({ events, target: benchmarkCase.target, catalog, context });
    samples.push(performance.now() - startedAt);
  }

  if (
    result.workload.eventCount !== EVENT_COUNT ||
    result.coverage.requests.status !== "known" ||
    result.coverage.usage.status !== "known"
  ) {
    throw new Error("benchmark did not evaluate the full known workload");
  }
  if (benchmarkCase.api && result.economics?.costBasis !== "api_list_price") {
    throw new Error("the Direct API benchmark case did not price the workload");
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const max = sorted[sorted.length - 1];
  const throughput = Math.round((EVENT_COUNT / median) * 1000);
  const coverage = (dimension) =>
    dimension.status === "known" ? `${dimension.percent}%` : "unknown";

  lines.push(`target: ${benchmarkCase.label}`);
  lines.push(
    `  min ${min.toFixed(1)} ms | median ${median.toFixed(1)} ms | max ${max.toFixed(1)} ms`,
  );
  lines.push(`  samples (ms): ${samples.map((sample) => sample.toFixed(1)).join(", ")}`);
  lines.push(`  throughput at median: ${throughput} events/second`);
  lines.push(
    `  constraints: ${
      result.constraints.length === 0
        ? "none (a Direct API target admits everything)"
        : result.constraints.map((constraint) => `${constraint.id}=${constraint.status}`).join(", ")
    }`,
  );
  lines.push(
    `  coverage: requests ${coverage(result.coverage.requests)} | usage ${coverage(result.coverage.usage)} | models ${coverage(result.coverage.models)}`,
  );
  lines.push(
    `  violations: ${result.violations.length} | unsupported models: ${result.unsupportedModels.length} | warnings: ${result.warnings.length} | confidence: ${result.confidence.level}`,
  );
  lines.push(
    `  accepted / attempted: ${
      result.constraints.length === 0
        ? `every event served; target cost ${result.economics?.targetCost.amount ?? "not reported"} USD`
        : result.constraints
            .map((c) => `${c.id} ${c.consumedUnits}/${c.attemptedUnits} ${c.unit}`)
            .join(", ")
    }`,
  );
  lines.push(
    `  ${result.target.type === "api" ? "target cost" : "overage cost"}: ${
      result.target.type === "api"
        ? `${result.economics?.targetCost.amount ?? "not reported"} USD (api_list_price)`
        : `${result.economics?.overageCost?.amount ?? "not applicable"} USD`
    }; rulesAsOf: ${result.versions.rulesAsOf}`,
  );
  lines.push(
    `  peak RSS after this target: ${(process.resourceUsage().maxRSS / 1024).toFixed(1)} MiB`,
  );
  lines.push("");
}

lines.push(`process peak RSS: ${(process.resourceUsage().maxRSS / 1024).toFixed(1)} MiB`);
console.log(lines.join("\n"));
