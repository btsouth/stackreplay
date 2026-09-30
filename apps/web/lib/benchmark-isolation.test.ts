import { readFileSync } from "node:fs";
import { benchmarkData, resolveComparison, validateBenchmarkData } from "@stackreplay/benchmarks";
import { stableStringify } from "@stackreplay/catalog";
import { compileExecutionPlan } from "@stackreplay/catalog/execution";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { replay } from "@stackreplay/replay-engine";
import { describe, expect, it } from "vitest";
import { completeUsage, makeEvent } from "../../../packages/replay-engine/src/fixtures/events";

describe("benchmark evidence cannot change accepted execution truth", () => {
  it("leaves catalog output, hashes, compiled artifacts, pricing, capacity and actual Replay identical", () => {
    const catalog = loadDefaultCatalog();
    const events = [
      makeEvent({
        id: "benchmark-isolation",
        occurredAt: "2026-09-25T12:00:00Z",
        model: { rawName: "gpt-6-astra", canonicalId: "gpt-6-astra" },
        usage: completeUsage({ uncachedInputTokens: 1000, outputTokens: 100 }),
      }),
    ];
    const snapshot = () => {
      const currentCatalog = loadDefaultCatalog();
      return {
        accepted: stableStringify(currentCatalog),
        catalogHash: currentCatalog.catalogVersion,
        decisionSnapshotHash: DECISION_MARKET.decisionSnapshotHash,
        compiledArtifactHashes: DECISION_MARKET.plans.map(
          (p) =>
            compileExecutionPlan(
              currentCatalog,
              p.id,
              p.artifact.planVersionId,
              p.artifact.appliedOverlayIds,
              DECISION_MARKET.rulesAt,
            ).artifact.artifactHash,
        ),
        pricing: stableStringify(currentCatalog.pricing),
        capacity: stableStringify(currentCatalog.planVersions),
        replay: stableStringify(
          replay({
            events,
            target: { type: "api", providerId: "openai" },
            catalog: currentCatalog,
            context: { rulesAsOf: "2026-09-25" },
          }),
        ),
        generated: ["bundled-catalog.ts", "decision-market.generated.ts"].map((name) =>
          readFileSync(new URL(`../../../packages/catalog/src/${name}`, import.meta.url), "utf8"),
        ),
      };
    };
    const before = snapshot();
    const savedEvidence = structuredClone(benchmarkData);
    const evidence = benchmarkData;
    try {
      const o = evidence.sourceSets[0]?.observations[0];
      if (!o) throw new Error("Missing observation");
      o.value = 1.2;
      o.displayValue = "1.2%";
      o.notes = "Changed informational evidence";
      const d = evidence.definitions[0];
      if (!d) throw new Error("Missing definition");
      d.description = "Changed benchmark explanation";
      const parsed = validateBenchmarkData(evidence, catalog.models);
      expect(resolveComparison(parsed, ["gemini-4-argon"])[0]?.cells[0]?.observation?.value).toBe(
        1.2,
      );
      expect(snapshot()).toEqual(before);
    } finally {
      Object.assign(benchmarkData, savedEvidence);
    }
    // Enforce the import boundary, including compiled browser/Worker inputs.
    for (const file of [
      "../../../packages/catalog/package.json",
      "../../../packages/replay-engine/package.json",
      "../../../packages/schema/package.json",
      "../../../apps/web/scripts/build-worker.mjs",
    ]) {
      expect(readFileSync(new URL(file, import.meta.url), "utf8")).not.toContain(
        "@stackreplay/benchmarks",
      );
    }
  });
});
