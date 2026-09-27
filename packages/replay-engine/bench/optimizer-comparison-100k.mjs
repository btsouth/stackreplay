/**
 * Isolated, like-for-like O1/O2 memory benchmark.
 * node bench/optimizer-comparison-100k.mjs [events=100000] [subscriptions=2]
 * Each mode runs once in a fresh Node process with the same fixture. GC is used
 * only outside timing to distinguish retained heap from transient allocation.
 */
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { evaluateStackCandidate, optimizeExactModels } from "@stackreplay/replay-engine";

const mode = process.env.STACKREPLAY_BENCH_MODE;
const count = Number(process.argv[2] ?? 100_000);
const planCount = Number(process.argv[3] ?? 2);
if (
  !Number.isSafeInteger(count) ||
  count < 1 ||
  !Number.isInteger(planCount) ||
  planCount < 1 ||
  planCount > 6
)
  throw new Error("Invalid benchmark size");
if (!mode) {
  const runs = [];
  for (const kind of ["o1", "o2"]) {
    const child = spawnSync(
      process.execPath,
      ["--expose-gc", fileURLToPath(import.meta.url), String(count), String(planCount)],
      {
        env: { ...process.env, STACKREPLAY_BENCH_MODE: kind },
        encoding: "utf8",
      },
    );
    if (child.status !== 0) throw new Error(child.stderr || child.stdout);
    runs.push(JSON.parse(child.stdout));
  }
  console.log(JSON.stringify({ node: process.version, runs }, null, 2));
} else {
  const snapshot = () => {
    const memory = process.memoryUsage();
    return {
      rssMiB: Math.round(memory.rss / 1048576),
      heapUsedMiB: Math.round(memory.heapUsed / 1048576),
      arrayBuffersMiB: Math.round(memory.arrayBuffers / 1048576),
      peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024),
    };
  };
  global.gc?.();
  const baseline = snapshot();
  const source = {
    url: "https://example.invalid/optimizer-benchmark",
    title: "Synthetic benchmark",
    checkedAt: "2026-09-01",
  };
  const provenance = {
    sources: [source],
    lastVerifiedAt: "2026-09-01",
    verificationStatus: "estimated",
  };
  const models = ["bench-small", "bench-large"];
  const catalog = {
    catalogVersion: "fixture:o2-memory-v1",
    providers: {},
    models: {},
    pricing: {},
    plans: {},
    planVersions: {},
  };
  for (let i = 0; i < 2; i++) {
    const provider = `bench-provider-${i}`;
    const model = models[i];
    catalog.providers[provider] = { id: provider, role: "provider", name: provider, ...provenance };
    catalog.models[model] = {
      id: model,
      role: "model",
      name: model,
      providerIds: [provider],
      ...provenance,
    };
    catalog.pricing[`${model}-pricing`] = {
      id: `${model}-pricing`,
      role: "pricing",
      modelId: model,
      basis: "api_list_price",
      currency: "USD",
      unit: "per_1m_tokens",
      effectiveFrom: "2026-01-01",
      rates: {
        input: String(i + 1),
        output: String(2 * (i + 1)),
        cacheRead: "0.1",
        cacheWrite: "1",
        reasoning: "3",
      },
      ...provenance,
    };
  }
  const evidence = {
    kind: "synthetic",
    sources: [source],
    lastVerifiedAt: "2026-09-01",
    notes: "Synthetic request limits; no real subscriptions.",
  };
  const resources = [0, 1].map((i) => ({
    target: { type: "api", providerId: `bench-provider-${i}` },
  }));
  for (let i = 0; i < planCount; i++) {
    const id = `bench-plan-${i}`;
    const version = {
      effectiveFrom: "2026-08-01",
      price: { currency: "USD", amount: String(20 + i * 25), interval: "month" },
      limits: [
        {
          id: "daily",
          label: "Synthetic daily requests",
          type: "request_limit",
          amount: String(Math.max(1, Math.floor(count / 100) * (i + 1))),
          window: { type: "calendar", unit: "day", timezone: "UTC" },
          exceed: "reject_request",
        },
      ],
      modelRules: models.map((model) => ({ model, pricingRef: `${model}-pricing` })),
      ...provenance,
    };
    catalog.plans[id] = {
      id,
      role: "plan",
      name: id,
      providerId: "bench-provider-0",
      versions: [version],
    };
    catalog.planVersions[`${id}@2026-08-01`] = {
      ...version,
      versionId: `${id}@2026-08-01`,
      planId: id,
      planName: id,
      providerId: "bench-provider-0",
    };
    resources.push({ target: { type: "subscription", planId: id }, capacityEvidence: evidence });
  }
  let random = 20260927;
  const events = Array.from({ length: count }, (_, i) => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const model = models[i % 2];
    return {
      schemaVersion: 1,
      id: `event-${String(i).padStart(7, "0")}`,
      occurredAt: new Date(
        Date.UTC(2026, 8, 1) + Math.floor((i * 30 * 86400000) / count),
      ).toISOString(),
      source: { adapterId: "synthetic-benchmark" },
      model: { rawName: model, canonicalId: model },
      modality: "text",
      usage: {
        inputTokens: 10000 + (random % 50000),
        outputTokens: 1000 + (random % 7000),
        cacheReadTokens: random % 10000,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        accounting: {
          cacheReadIncludedInInput: false,
          cacheWriteIncludedInInput: false,
          reasoningIncludedInOutput: false,
        },
      },
      confidence: { usage: "exact", model: "exact" },
    };
  });
  const common = {
    events,
    catalog,
    context: { rulesAsOf: "2026-09-15" },
    period: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" },
  };
  global.gc?.();
  const fixture = snapshot();
  const started = performance.now();
  let result =
    mode === "o1"
      ? evaluateStackCandidate({
          ...common,
          target: {
            type: "hybrid",
            routes: [
              { priority: 0, target: { type: "subscription", planId: "bench-plan-0" } },
              { priority: 1, target: { type: "api", providerId: "bench-provider-0" } },
              { priority: 2, target: { type: "api", providerId: "bench-provider-1" } },
            ],
          },
          capacityEvidence: { 0: evidence },
        })
      : optimizeExactModels({
          ...common,
          resources,
          initialAllowance: { kind: "fresh" },
          chronology: { default: "request", evidence: "Synthetic per-call timestamps" },
        });
  const elapsedMs = Math.round(performance.now() - started);
  const afterEvaluation = snapshot();
  if (mode === "o1" ? result.status !== "complete" : result.status !== "optimal")
    throw new Error("Benchmark did not cover every required call");
  const candidates = mode === "o1" ? 1 : result.search.candidateCount;
  const modeled = mode === "o1" ? result.coverage.covered : result.explanation.assignments.length;
  const retainedAssignmentSets = mode === "o1" ? 1 : result.search.retainedAssignmentSets;
  global.gc?.();
  await new Promise((resolve) => setImmediate(resolve));
  global.gc?.();
  const retained = snapshot();
  result = undefined;
  // Unwind the measurement frame before collecting transient VM stack roots.
  await new Promise((resolve) => setImmediate(resolve));
  global.gc?.();
  await new Promise((resolve) => setImmediate(resolve));
  global.gc?.();
  const released = snapshot();
  if (process.env.STACKREPLAY_BENCH_HEAP) {
    const { writeHeapSnapshot } = await import("node:v8");
    writeHeapSnapshot(process.env.STACKREPLAY_BENCH_HEAP);
  }
  console.log(
    JSON.stringify({
      mode,
      events: count,
      plans: planCount,
      candidates,
      elapsedMs,
      modeled,
      retainedAssignmentSets,
      baseline,
      fixture,
      afterEvaluation,
      retained,
      released,
    }),
  );
}
