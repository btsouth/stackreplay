import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findDemoTarget, loadDemoArtifact } from "./demo-artifact";

/**
 * The artifact is generated, committed and read by the surfaces, so it can go
 * stale in a way no type can catch: change the scenario, the catalog or the
 * engine and the file on disk silently describes the old run. This test
 * regenerates it with the same command CI would run and fails if the committed
 * file stops matching the engine's current output.
 *
 * It also locks the demonstration's product-level shape. Those assertions are
 * here rather than in the engine because they are claims about what the demo
 * shows a visitor, not about what the engine computes.
 */

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ARTIFACT_PATH = join(REPO_ROOT, "packages", "test-fixtures", "generated", "m4d-demo.json");

describe("the demonstration artifact", () => {
  it("is the current output of the generator", () => {
    const committed = readFileSync(ARTIFACT_PATH, "utf8");
    execFileSync("node", ["apps/web/scripts/build-demo-artifact.mjs"], {
      cwd: REPO_ROOT,
      stdio: "pipe",
      timeout: 240_000,
    });
    const regenerated = readFileSync(ARTIFACT_PATH, "utf8");

    expect(
      JSON.parse(regenerated),
      "packages/test-fixtures/generated/m4d-demo.json is stale; run `pnpm --filter @stackreplay/test-fixtures demo` and commit the result",
    ).toEqual(JSON.parse(committed));
  }, 260_000);

  it("carries one workload replayed against targets that disagree about it", () => {
    const artifact = loadDemoArtifact();
    const subscription = findDemoTarget(artifact, "exact-subscription");
    const translated = findDemoTarget(artifact, "translated-subscription");
    const api = findDemoTarget(artifact, "direct-api");

    expect(subscription?.projection.mode).toBe("exact");
    expect(translated?.projection.mode).toBe("translated");
    expect(api?.projection.target.kind).toBe("api");

    // The same observed workload in all three, or the comparison is meaningless.
    const eventCounts = new Set(
      artifact.targets.map((target) => target.projection.workload.eventCount),
    );
    expect(eventCounts.size).toBe(1);

    // The exact target meets a window it cannot serve, which is the whole point
    // of showing a crossing rather than a tidy percentage.
    const crossings = subscription?.projection.crossings ?? [];
    expect(crossings.length).toBeGreaterThan(0);
    expect(subscription?.projection.outcomes.some((outcome) => outcome.key === "blocked")).toBe(
      true,
    );
    expect(subscription?.projection.headline.percent).toBeLessThan(100);

    // The API target has no allowance to exceed, so it must not borrow one.
    expect(api?.projection.constraints).toHaveLength(0);
    expect(api?.projection.pricing?.categories.length).toBeGreaterThan(0);
  });

  it("keeps the unknown sample genuinely unknown", () => {
    const sample = loadDemoArtifact().unknownSample.projection;

    expect(sample.workload.complete).toBe(false);
    // Neither the token total nor the consumption-dependent part of the cost is
    // established, and neither is reported as a zero.
    expect(sample.workload.knownTokens).toBeUndefined();
    expect(
      sample.outcomes.some((outcome) => outcome.key === "unknown" && (outcome.count ?? 0) > 0),
    ).toBe(true);
    expect(sample.dimensions.some((dimension) => dimension.status === "unknown")).toBe(true);
    expect(sample.economics.consumptionEstablished).toBe(false);
    // The plan's price is fixed, so it is established even though the demand is
    // not: the sample must not describe a known plan price as a lower bound.
    expect(sample.economics.targetCostEstablished).toBe(true);
    expect(sample.economics.costReading).toMatch(/plan price is fixed/iu);
    expect(sample.economics.reason).toBeUndefined();
  });
});
