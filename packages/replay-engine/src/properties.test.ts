import type { TextUsageEventV1 } from "@stackreplay/schema";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import { FIXTURE_PLAN_VERSION_ID, makeFixtureCatalog, rollingLimit } from "./fixtures/catalog.js";
import { makeEvent } from "./fixtures/events.js";

/**
 * Property tests (spec point 80). Each property states something that must
 * hold for every workload, not just for the golden fixtures.
 */

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

const BASE_MS = Date.UTC(2026, 8, 1);

function catalogWithCap(capUnits: number) {
  return makeFixtureCatalog({
    limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: `${capUnits}.00` })],
  });
}

const eventSpec = fc.record({
  offsetMinutes: fc.integer({ min: 0, max: 60 * 24 * 3 }),
  inputTokens: fc.integer({ min: 0, max: 3_000_000 }),
  model: fc.constantFrom("fixture-small", "fixture-medium"),
});

function buildEvents(
  specs: ReadonlyArray<{ offsetMinutes: number; inputTokens: number; model: string }>,
): TextUsageEventV1[] {
  return specs.map((spec, index) =>
    makeEvent({
      id: `e${index}`,
      occurredAt: new Date(BASE_MS + spec.offsetMinutes * 60_000).toISOString(),
      usage: { inputTokens: spec.inputTokens },
      model: { rawName: spec.model, canonicalId: spec.model },
    }),
  );
}

describe("property: capacity monotonicity", () => {
  it("increasing plan capacity cannot reduce workload coverage", () => {
    fc.assert(
      fc.property(
        fc.array(eventSpec, { maxLength: 40 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        (specs, capA, capB) => {
          const low = Math.min(capA, capB);
          const high = Math.max(capA, capB);
          const events = buildEvents(specs);
          const lowResult = replay({ events, target, catalog: catalogWithCap(low) });
          const highResult = replay({ events, target, catalog: catalogWithCap(high) });
          expect(highResult.coverage.requests.covered).toBeGreaterThanOrEqual(
            lowResult.coverage.requests.covered,
          );
          expect(highResult.coverage.usage.covered).toBeGreaterThanOrEqual(
            lowResult.coverage.usage.covered,
          );
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe("property: unsupported events", () => {
  it("adding unsupported events cannot increase model coverage", () => {
    fc.assert(
      fc.property(fc.array(eventSpec, { maxLength: 30 }), (specs) => {
        const base = buildEvents(specs);
        const extra: TextUsageEventV1[] = [
          makeEvent({
            id: "ghost-1",
            occurredAt: new Date(BASE_MS).toISOString(),
            usage: { inputTokens: 1000 },
            model: { rawName: "ghost-model" },
          }),
        ];
        const catalog = catalogWithCap(50);
        const baseResult = replay({ events: base, target, catalog });
        const extendedResult = replay({ events: [...base, ...extra], target, catalog });
        expect(extendedResult.coverage.models.percent).toBeLessThanOrEqual(
          baseResult.coverage.models.percent,
        );
      }),
      { numRuns: 60 },
    );
  });
});

describe("property: determinism", () => {
  it("running the same replay twice produces identical results", () => {
    fc.assert(
      fc.property(fc.array(eventSpec, { maxLength: 30 }), (specs) => {
        const events = buildEvents(specs);
        const catalog = catalogWithCap(10);
        const first = replay({ events, target, catalog });
        const second = replay({ events, target, catalog });
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      }),
      { numRuns: 60 },
    );
  });

  it("reordering input events does not change the result", () => {
    fc.assert(
      fc.property(fc.array(eventSpec, { maxLength: 30 }), (specs) => {
        const events = buildEvents(specs);
        const reversed = [...events].reverse();
        const catalog = catalogWithCap(10);
        const forward = replay({ events, target, catalog });
        const backward = replay({ events: reversed, target, catalog });
        expect(JSON.stringify(backward)).toBe(JSON.stringify(forward));
      }),
      { numRuns: 60 },
    );
  });

  it("a zero-event workload cannot produce a limit violation", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (cap) => {
        const result = replay({ events: [], target, catalog: catalogWithCap(cap) });
        expect(result.violations).toEqual([]);
      }),
      { numRuns: 30 },
    );
  });
});

describe("independent audit properties", () => {
  it("arbitrary permutations preserve nanosecond chronology and mixed-category results", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            nanos: fc.integer({ min: 0, max: 9 }),
            input: fc.integer({ min: 0, max: 50 }),
            output: fc.integer({ min: 0, max: 50 }),
            cache: fc.integer({ min: 0, max: 50 }),
            order: fc.integer(),
          }),
          { minLength: 2, maxLength: 30 },
        ),
        (specs) => {
          const events = specs.map((spec, index) =>
            makeEvent({
              id: `e${index}`,
              occurredAt: `2026-09-01T00:00:00.00000000${spec.nanos}Z`,
              usage: {
                inputTokens: spec.input,
                outputTokens: spec.output,
                cacheReadTokens: spec.cache,
              },
            }),
          );
          const permuted = specs
            .map((spec, index) => ({ order: spec.order, event: events[index] }))
            .sort((a, b) => a.order - b.order)
            .map(({ event }) => {
              if (event === undefined) throw new Error("Missing generated event");
              return event;
            });
          const catalog = makeFixtureCatalog({
            limits: [
              rollingLimit({ id: "requests", type: "request_limit", amount: "3" }),
              rollingLimit({ id: "tokens", type: "token_limit", amount: "100" }),
            ],
          });
          expect(replay({ events: permuted, target, catalog })).toEqual(
            replay({ events, target, catalog }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("degrading declared model quality cannot improve confidence", () => {
    fc.assert(
      fc.property(fc.array(eventSpec, { minLength: 1, maxLength: 30 }), (specs) => {
        const events = buildEvents(specs);
        const degraded = events.map((event) => ({
          ...event,
          confidence: { ...event.confidence, model: "unknown" as const },
        }));
        const catalog = catalogWithCap(50);
        const rank = { low: 0, medium: 1, high: 2 };
        const before = replay({ events, target, catalog });
        const after = replay({ events: degraded, target, catalog });
        expect(rank[after.confidence.level]).toBeLessThanOrEqual(rank[before.confidence.level]);
        expect(after.confidence.level).toBe("low");
        expect(after.coverage).toEqual(before.coverage);
      }),
      { numRuns: 60 },
    );
  });
});
