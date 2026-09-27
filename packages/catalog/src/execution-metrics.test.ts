// biome-ignore-all lint/style/noNonNullAssertion: synthetic catalog contains the measured version.
import { describe, expect, it } from "vitest";
import { type SyntheticFamily, syntheticExecutionCatalog } from "../test-fixtures/execution.js";
import { compileExecutionPlan } from "./execution-compiler.js";

describe("C1 representative artifact and catalog measurements", () => {
  it("measures six fixture artifacts and a 500-version catalog", () => {
    const families: SyntheticFamily[] = ["claude", "goat", "token", "cursor", "copilot", "ollama"];
    const catalog = syntheticExecutionCatalog(families);
    const sizes: Record<string, number> = {};
    for (const family of families) {
      const artifact = compileExecutionPlan(
        catalog,
        `fixture-${family}`,
        `${family}-v1`,
        [],
        "2026-09-12T00:00:00Z",
      ).artifact;
      sizes[family] = Buffer.byteLength(JSON.stringify(artifact));
    }
    const samples = [100, 500].map((versions) => {
      const loadStart = performance.now();
      const catalog = syntheticExecutionCatalog(["goat"], versions);
      const loadMs = performance.now() - loadStart;
      const selected = catalog.plans["fixture-goat"]!.executionVersions![versions - 1]!;
      const compileStart = performance.now();
      const artifact = compileExecutionPlan(
        catalog,
        "fixture-goat",
        selected.id,
        [],
        selected.validity.start,
      ).artifact;
      const compileMs = performance.now() - compileStart;
      return {
        versions,
        loadMs: Number(loadMs.toFixed(2)),
        compileMs: Number(compileMs.toFixed(2)),
        artifact,
      };
    });
    console.log(
      `C1 metrics: ${JSON.stringify({
        sizesBytes: sizes,
        samples: samples.map(({ versions, loadMs, compileMs }) => ({
          versions,
          loadMs,
          compileMs,
        })),
      })}`,
    );
    expect(Object.values(sizes).every((size) => size > 0 && size < 16384)).toBe(true);
    expect(samples[1]!.artifact.planVersionId).toBe("goat-v500");
  });
});
