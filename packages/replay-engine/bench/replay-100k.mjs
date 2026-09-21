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
      usage: { inputTokens, outputTokens, cacheReadTokens, reasoningTokens },
      confidence: { usage: "exact", model: "exact" },
    });
  }
  return events;
}

const events = buildEvents();
const catalog = loadDefaultCatalog();

const cases = [
  {
    label: "example-cloud-starter@2026-09-15",
    target: { type: "subscription", planVersionId: "example-cloud-starter@2026-09-15" },
  },
  {
    label: "example-cloud-pro@2026-08-01",
    target: { type: "subscription", planVersionId: "example-cloud-pro@2026-08-01" },
  },
];

for (const benchmarkCase of cases) {
  if (catalog.planVersions[benchmarkCase.target.planVersionId] === undefined) {
    throw new Error(`benchmark target missing from catalog: ${benchmarkCase.target.planVersionId}`);
  }
}

// Warm-up: JIT, module init and the Temporal polyfill's first calls.
replay({ events: events.slice(0, 2_000), target: cases[0].target, catalog });

const lines = [];
lines.push(`catalog version: ${catalog.catalogVersion}`);
lines.push(`node: ${process.version}`);
lines.push(
  `workload: ${EVENT_COUNT} events across ${WINDOW_DAYS} days, ${MODELS.length} models, deterministic seed 20260921`,
);
lines.push(`runs per target: ${RUNS}`);
lines.push("");

for (const benchmarkCase of cases) {
  const samples = [];
  let result;
  for (let run = 0; run < RUNS; run += 1) {
    const startedAt = performance.now();
    result = replay({ events, target: benchmarkCase.target, catalog });
    samples.push(performance.now() - startedAt);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const median = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];
  const throughput = Math.round((EVENT_COUNT / median) * 1000);

  lines.push(`target: ${benchmarkCase.label}`);
  lines.push(
    `  min ${min.toFixed(1)} ms | median ${median.toFixed(1)} ms | max ${max.toFixed(1)} ms`,
  );
  lines.push(`  throughput at median: ${throughput} events/second`);
  lines.push(
    `  constraints: ${result.constraints.map((constraint) => `${constraint.id}=${constraint.status}`).join(", ")}`,
  );
  lines.push(
    `  coverage: requests ${result.coverage.requests.percent}% | usage ${result.coverage.usage.percent}% | models ${result.coverage.models.percent}%`,
  );
  lines.push(
    `  violations: ${result.violations.length} | unsupported models: ${result.unsupportedModels.length} | warnings: ${result.warnings.length} | confidence: ${result.confidence.level}`,
  );
  lines.push("");
}

console.log(lines.join("\n"));
