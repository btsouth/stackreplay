import type { TextUsageEventV1, TextUsageV1 } from "@stackreplay/schema";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  FIXTURE_PLAN_VERSION_ID,
  fixtureContext,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { completeUsage, makeEvent } from "./fixtures/events.js";

/**
 * Property tests (spec point 80, audit item 22). Each property states something
 * that must hold for every workload, not just for the golden fixtures.
 */

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;

const BASE_MS = Date.UTC(2026, 8, 1);

function catalogWithCap(capUnits: number) {
  return makeFixtureCatalog({
    limits: [rollingLimit({ id: "credits", type: "credit_pool", amount: `${capUnits}.00` })],
  });
}

function catalogWithTokenCap(tokens: number) {
  return makeFixtureCatalog({
    limits: [rollingLimit({ id: "tokens", type: "token_limit", amount: `${tokens}` })],
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
      usage: completeUsage({ uncachedInputTokens: spec.inputTokens }),
      model: { rawName: spec.model, canonicalId: spec.model },
    }),
  );
}

function runWith(
  catalog: ReturnType<typeof makeFixtureCatalog>,
  events: readonly TextUsageEventV1[],
) {
  return replay({ events, target, catalog, context: fixtureContext });
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
          const lowResult = runWith(catalogWithCap(low), events);
          const highResult = runWith(catalogWithCap(high), events);
          expect(highResult.coverage.requests.covered ?? 0).toBeGreaterThanOrEqual(
            lowResult.coverage.requests.covered ?? 0,
          );
          expect(highResult.coverage.usage.covered ?? 0).toBeGreaterThanOrEqual(
            lowResult.coverage.usage.covered ?? 0,
          );
        },
      ),
      { numRuns: 60 },
    );
  });

  it("increasing token capacity cannot reduce served token consumption", () => {
    fc.assert(
      fc.property(
        fc.array(eventSpec, { maxLength: 30 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (specs, capA, capB) => {
          const low = Math.min(capA, capB);
          const high = Math.max(capA, capB);
          const events = buildEvents(specs);
          const lowResult = runWith(catalogWithTokenCap(low * 1_000_000), events);
          const highResult = runWith(catalogWithTokenCap(high * 1_000_000), events);
          expect(Number(highResult.constraints[0]?.consumedUnits ?? "0")).toBeGreaterThanOrEqual(
            Number(lowResult.constraints[0]?.consumedUnits ?? "0"),
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
            usage: completeUsage({ uncachedInputTokens: 1000 }),
            model: { rawName: "ghost-model" },
          }),
        ];
        const catalog = catalogWithCap(50);
        const baseResult = runWith(catalog, base);
        const extendedResult = runWith(catalog, [...base, ...extra]);
        const basePercent = baseResult.coverage.models.percent ?? 0;
        const extendedPercent = extendedResult.coverage.models.percent ?? 0;
        expect(extendedPercent).toBeLessThanOrEqual(basePercent);
      }),
      { numRuns: 60 },
    );
  });

  it("adding events with unknown token accounting cannot increase usage coverage", () => {
    fc.assert(
      fc.property(fc.array(eventSpec, { maxLength: 30 }), (specs) => {
        const base = buildEvents(specs);
        const unknown: TextUsageEventV1[] = [
          makeEvent({
            id: "unknown-1",
            occurredAt: new Date(BASE_MS).toISOString(),
            usage: {} as TextUsageV1,
          }),
        ];
        const catalog = catalogWithTokenCap(1_000_000);
        const baseResult = runWith(catalog, base);
        const extendedResult = runWith(catalog, [...base, ...unknown]);
        // Either the dimension degrades to unknown, or the percentage does not rise.
        if (extendedResult.coverage.usage.status === "known") {
          expect(extendedResult.coverage.usage.percent ?? 0).toBeLessThanOrEqual(
            baseResult.coverage.usage.percent ?? 0,
          );
        } else {
          expect(extendedResult.coverage.usage.percent).toBeUndefined();
        }
      }),
      { numRuns: 60 },
    );
  });
});

describe("property: confidence monotonicity", () => {
  it("degrading input quality never improves confidence", () => {
    const order = { high: 2, medium: 1, low: 0 } as const;
    fc.assert(
      fc.property(fc.array(eventSpec, { maxLength: 30 }), (specs) => {
        const catalog = catalogWithTokenCap(1_000_000);
        const base = buildEvents(specs);
        const degraded: TextUsageEventV1[] = [
          ...base,
          makeEvent({
            id: "degraded",
            occurredAt: new Date(BASE_MS).toISOString(),
            usage: {} as TextUsageV1,
          }),
        ];
        const baseResult = runWith(catalog, base);
        const degradedResult = runWith(catalog, degraded);
        expect(order[degradedResult.confidence.level]).toBeLessThanOrEqual(
          order[baseResult.confidence.level],
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
        const first = runWith(catalog, events);
        const second = runWith(catalog, events);
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
        const forward = runWith(catalog, events);
        const backward = runWith(catalog, reversed);
        expect(JSON.stringify(backward)).toBe(JSON.stringify(forward));
      }),
      { numRuns: 60 },
    );
  });

  it("a zero-event workload cannot produce a limit violation", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (cap) => {
        const result = runWith(catalogWithCap(cap), []);
        expect(result.violations).toEqual([]);
      }),
      { numRuns: 30 },
    );
  });
});
