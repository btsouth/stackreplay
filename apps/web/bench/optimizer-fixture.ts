import type { ExactOptimizationInput } from "@stackreplay/replay-engine";
import {
  quota,
  request,
  scenario,
} from "../../../packages/replay-engine/src/fixtures/exact-optimizer";
export function fixture(count: number, plans: number): ExactOptimizationInput {
  return scenario(
    Array.from({ length: count }, (_, i) =>
      request(
        String(i).padStart(7, "0"),
        10000 + ((i * 7919) % 50000),
        i % 2 ? "fixture-small" : "fixture-medium",
        new Date(Date.UTC(2026, 8, 1) + Math.floor((i * 30 * 86400000) / count)).toISOString(),
      ),
    ),
    Array.from({ length: plans }, (_, i) => ({
      id: `plan-${i}`,
      price: String(20 + i * 25),
      limits: [quota(Math.floor(count / 100) * (i + 1))],
    })),
  );
}
