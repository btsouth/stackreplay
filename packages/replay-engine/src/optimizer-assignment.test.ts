import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { matchRequestPools, type RequestPool } from "./optimizer-assignment.js";

/** An independent exhaustive oracle for small graphs, including crossed windows. */
function brute(choices: number[][], capacity: number[], weights: number[]) {
  let best = -1;
  const used = capacity.map(() => 0);
  const visit = (event: number, score: number) => {
    if (event === choices.length) {
      best = Math.max(best, score);
      return;
    }
    visit(event + 1, score);
    for (const pool of choices[event] ?? []) {
      if ((used[pool] ?? 0) >= (capacity[pool] ?? 0)) continue;
      used[pool] = (used[pool] ?? 0) + 1;
      visit(event + 1, score + (weights[event] ?? 0));
      used[pool] = (used[pool] ?? 0) - 1;
    }
  };
  visit(0, 0);
  return best;
}

describe("exact weighted matching", () => {
  it("agrees with exhaustive enumeration over 250 deterministic random graphs", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            a: fc.integer({ min: -1, max: 1 }),
            b: fc.integer({ min: -1, max: 1 }),
            cost: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 1, maxLength: 8 },
        ),
        fc.tuple(...Array.from({ length: 4 }, () => fc.integer({ min: 0, max: 3 }))),
        (events, caps) => {
          const pools: RequestPool[] = caps.map((capacity, index) => ({
            capacity,
            resource: Math.floor(index / 2),
            resourceId: `s${Math.floor(index / 2)}`,
            limitId: "daily",
            start: "2026-09-01T00:00:00Z",
            end: "2026-09-02T00:00:00Z",
          }));
          const membership = [
            { pools: new Int32Array(events.map((event) => event.a)) },
            { pools: new Int32Array(events.map((event) => (event.b < 0 ? -1 : event.b + 2))) },
          ];
          const order = events
            .map((_, index) => index)
            .sort((a, b) => (events[b]?.cost ?? 0) - (events[a]?.cost ?? 0) || a - b);
          const result = matchRequestPools(events.length, order, [0, 1], membership, pools);
          const score = [...result.placement].reduce(
            (sum, pool, index) => sum + (pool < 0 ? 0 : (events[index]?.cost ?? 0)),
            0,
          );
          const choices = events.map((event) =>
            [event.a, event.b < 0 ? -1 : event.b + 2].filter((pool) => pool >= 0),
          );
          expect(score).toBe(
            brute(
              choices,
              caps,
              events.map((event) => event.cost),
            ),
          );
          for (let index = 0; index < events.length; index++) {
            const pool = result.placement[index] ?? -1;
            if (pool >= 0) expect(choices[index]).toContain(pool);
          }
          expect([...result.used].every((used, index) => used <= (caps[index] ?? 0))).toBe(true);
        },
      ),
      { seed: 20260927, numRuns: 250 },
    );
  });

  it("reassigns an already-selected expensive flexible call for a later scarce call", () => {
    const pools: RequestPool[] = [0, 1].map((resource) => ({
      capacity: 1,
      resource,
      resourceId: String(resource),
      limitId: "daily",
      start: "2026-09-01T00:00:00Z",
      end: "2026-09-02T00:00:00Z",
    }));
    const result = matchRequestPools(
      2,
      [0, 1],
      [0, 1],
      [{ pools: new Int32Array([0, 0]) }, { pools: new Int32Array([1, -1]) }],
      pools,
    );
    expect([...result.placement]).toEqual([1, 0]);
  });
});
