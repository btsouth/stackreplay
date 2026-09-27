// biome-ignore-all lint/style/noNonNullAssertion: deterministic synthetic fixture construction.
import type { CompiledOptimizationInput } from "@stackreplay/replay-engine";
import {
  compiledScenario,
  multiConstraintPlan,
  namedPoolsPlan,
  syntheticApi,
  syntheticPlan,
} from "../../../packages/replay-engine/src/fixtures/compiled-execution";
/** The exact supported richer paths, not a replay of legacy O3A semantics. */
export function compiledFixture(
  count: number,
  family: "simple" | "multi" | "pools",
): CompiledOptimizationInput {
  if (family === "simple")
    return compiledScenario(count, [
      ...Array.from({ length: 6 }, (_, i) =>
        syntheticPlan(`p${i}`, String(Math.ceil(count / (i + 1))), String(20 * (i + 1))),
      ),
      syntheticApi(),
    ]);
  const p = family === "multi" ? multiConstraintPlan() : namedPoolsPlan();
  for (const c of p.computation.constraints) c.amount = String(count * 2);
  const input = compiledScenario(count, [p]);
  if (family === "multi") input.scenario.resources[0]!.firstUse.session = "inactive";
  return input;
}
