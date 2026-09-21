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
  it("increasing a request-only capacity cannot reduce served request count", () => {
    fc.assert(
      fc.property(
        fc.array(eventSpec, { maxLength: 40 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        (specs, capA, capB) => {
          const low = Math.min(capA, capB);
          const high = Math.max(capA, capB);
          const events = buildEvents(specs);
          const requestCatalog = (amount: number) =>
            makeFixtureCatalog({
              limits: [
                rollingLimit({ id: "requests", type: "request_limit", amount: String(amount) }),
              ],
            });
          const lowResult = runWith(requestCatalog(low), events);
          const highResult = runWith(requestCatalog(high), events);
          expect(highResult.coverage.requests.covered ?? 0).toBeGreaterThanOrEqual(
            lowResult.coverage.requests.covered ?? 0,
          );
        },
      ),
      { numRuns: 60 },
    );
  });

  it("increasing token capacity within one window cannot reduce served tokens", () => {
    fc.assert(
      fc.property(
        fc.array(eventSpec, { maxLength: 30 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (specs, capA, capB) => {
          const low = Math.min(capA, capB);
          const high = Math.max(capA, capB);
          const events = buildEvents(specs.map((spec) => ({ ...spec, offsetMinutes: 0 })));
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
            model: { rawName: "ghost-model", canonicalId: "ghost-model" },
          }),
        ];
        const original = catalogWithCap(50);
        const template = original.models["fixture-small"];
        if (!template) throw new Error("missing model fixture");
        const catalog = {
          ...original,
          models: {
            ...original.models,
            "ghost-model": { ...template, id: "ghost-model", name: "Synthetic unsupported model" },
          },
        };
        const baseResult = runWith(catalog, base);
        const extendedResult = runWith(catalog, [...base, ...extra]);
        expect(baseResult.coverage.models.status).toBe("known");
        expect(extendedResult.coverage.models.status).toBe("known");
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
        expect(baseResult.coverage.usage.status).toBe("known");
        expect(extendedResult.coverage.usage.status).toBe("unknown");
        expect(extendedResult.coverage.usage.percent).toBeUndefined();
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

describe("independent re-audit properties", () => {
  it("matches independent atomic admission across simultaneous token and request pools", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            input: fc.integer({ min: 0, max: 20 }),
            output: fc.integer({ min: 0, max: 20 }),
            supported: fc.boolean(),
          }),
          { maxLength: 35 },
        ),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 20 }),
        (specs, tokenCap, requestCap) => {
          let used = 0;
          let served = 0;
          const events = specs.map((spec, i) => {
            const amount = spec.input + spec.output;
            if (spec.supported && used + amount <= tokenCap && served + 1 <= requestCap) {
              used += amount;
              served++;
            }
            return makeEvent({
              id: String(i).padStart(3, "0"),
              occurredAt: "2026-09-01T00:00:00.000000001Z",
              model: {
                rawName: spec.supported ? "fixture-small" : "fixture-unknown",
                canonicalId: spec.supported ? "fixture-small" : "fixture-unknown",
              },
              usage: completeUsage({ uncachedInputTokens: spec.input, outputTokens: spec.output }),
            });
          });
          const result = runWith(
            makeFixtureCatalog({
              limits: [
                rollingLimit({ id: "tokens", type: "token_limit", amount: String(tokenCap) }),
                rollingLimit({ id: "requests", type: "request_limit", amount: String(requestCap) }),
              ],
            }),
            events,
          );
          expect(result.coverage.requests.covered).toBe(served);
          expect(result.constraints.find((c) => c.id === "tokens")?.consumedUnits).toBe(
            String(used),
          );
          expect(result.constraints.find((c) => c.id === "requests")?.consumedUnits).toBe(
            String(served),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("is invariant to arbitrary input permutations with nanosecond ties and mixed token categories", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            order: fc.integer(),
            nano: fc.integer({ min: 0, max: 5 }),
            input: fc.integer({ min: 0, max: 20 }),
            cache: fc.integer({ min: 0, max: 20 }),
            reasoning: fc.integer({ min: 0, max: 20 }),
            model: fc.constantFrom("fixture-small", "fixture-medium"),
          }),
          { maxLength: 30 },
        ),
        (specs) => {
          const events = specs.map((s, i) =>
            makeEvent({
              id: String(i),
              occurredAt: `2026-09-01T00:00:00.00000000${s.nano}Z`,
              model: { rawName: s.model, canonicalId: s.model },
              usage: completeUsage({
                uncachedInputTokens: s.input,
                cacheReadTokens: s.cache,
                reasoningTokens: s.reasoning,
              }),
            }),
          );
          const shuffled = specs
            .map((s, i) => ({ order: s.order, event: events[i] }))
            .sort((a, b) => a.order - b.order)
            .map((x) => x.event)
            .filter((e): e is TextUsageEventV1 => e !== undefined);
          const catalog = makeFixtureCatalog({
            limits: [
              rollingLimit({ id: "tokens", type: "token_limit", amount: "100" }),
              rollingLimit({ id: "requests", type: "request_limit", amount: "5" }),
            ],
          });
          expect(runWith(catalog, shuffled)).toEqual(runWith(catalog, events));
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("property: declared model quality", () => {
  it("worsening model confidence preserves coverage and cannot improve confidence", () => {
    fc.assert(
      fc.property(fc.array(eventSpec, { minLength: 1, maxLength: 30 }), (specs) => {
        const events = buildEvents(specs);
        const catalog = catalogWithCap(50);
        const rank = { low: 0, medium: 1, high: 2 };
        let previous = runWith(catalog, events);
        for (const quality of ["mapped", "unknown"] as const) {
          const current = runWith(
            catalog,
            events.map((event) => ({
              ...event,
              confidence: { ...event.confidence, model: quality },
            })),
          );
          expect(rank[current.confidence.level]).toBeLessThanOrEqual(
            rank[previous.confidence.level],
          );
          expect(current.coverage).toEqual(previous.coverage);
          previous = current;
        }
        expect(previous.confidence.level).toBe("low");
      }),
      { numRuns: 60 },
    );
  });
});
