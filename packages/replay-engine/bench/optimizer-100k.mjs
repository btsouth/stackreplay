/** Synthetic combination benchmark: pnpm build, then node bench/optimizer-100k.mjs. */
import { performance } from "node:perf_hooks";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import { evaluateStackCandidate } from "@stackreplay/replay-engine";

const catalog = structuredClone(loadDefaultCatalog());
const versionId = "example-cloud-pro@2026-08-01";
const version = catalog.planVersions[versionId];
if (!version) throw new Error("Missing synthetic plan");
// Explicit benchmark-only quota; never a real provider assumption.
const limits = [
  {
    id: "bench-five-hour",
    label: "Synthetic requests",
    type: "request_limit",
    amount: "10000",
    window: { type: "rolling", duration: "PT5H", anchor: "first_use" },
    exceed: "reject_request",
  },
];
version.limits = limits;
version.price = { currency: "USD", amount: "20", interval: "month" };
delete version.qualitativeLimits;
const raw = catalog.plans[version.planId].versions.find(
  (entry) => entry.effectiveFrom === version.effectiveFrom,
);
Object.assign(raw, { limits, price: version.price });
delete raw.qualitativeLimits;
const events = Array.from({ length: 100_000 }, (_, i) => ({
  schemaVersion: 1,
  id: `bench-${String(i).padStart(6, "0")}`,
  occurredAt: new Date(Date.UTC(2026, 8, 1) + i * 1000).toISOString(),
  source: { adapterId: "synthetic-benchmark" },
  model: { rawName: "example-small", canonicalId: "example-small" },
  modality: "text",
  confidence: { usage: "exact", model: "exact" },
  usage: {
    inputTokens: 1000,
    outputTokens: 200,
    cacheReadTokens: 500,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    accounting: {
      cacheReadIncludedInInput: false,
      cacheWriteIncludedInInput: false,
      reasoningIncludedInOutput: false,
    },
  },
}));
const input = {
  events,
  catalog,
  context: { rulesAsOf: "2026-09-20" },
  period: { start: "2026-09-01T00:00:00Z", end: "2026-10-01T00:00:00Z" },
  target: {
    type: "hybrid",
    routes: [
      { priority: 0, target: { type: "subscription", planVersionId: versionId } },
      { priority: 1, target: { type: "api", providerId: "example-cloud" } },
    ],
  },
  capacityEvidence: {
    0: {
      kind: "synthetic",
      sources: version.sources,
      lastVerifiedAt: "2026-09-20",
      notes: "Benchmark-only 10k request quota.",
    },
  },
};
evaluateStackCandidate({ ...input, events: events.slice(0, 2000) });
const samples = [];
let result;
for (let i = 0; i < 3; i++) {
  const start = performance.now();
  result = evaluateStackCandidate(input);
  samples.push(Math.round(performance.now() - start));
}
if (
  result.status !== "complete" ||
  result.routes[0].callsAssigned !== 60_000 ||
  result.routes[1].callsAssigned !== 40_000
)
  throw new Error("Incorrect benchmark assignment");
console.log(
  JSON.stringify(
    {
      node: process.version,
      events: events.length,
      runsMs: samples,
      callsByRoute: result.routes.map((route) => route.callsAssigned),
      costs: result.costs,
      maxRssMiB: Math.round(process.resourceUsage().maxRSS / 1024),
    },
    null,
    2,
  ),
);
