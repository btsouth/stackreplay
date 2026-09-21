import type { CatalogV1 } from "@stackreplay/catalog";
import { executionReplayResultV1Schema } from "@stackreplay/schema";
import { Decimal as ExternalDecimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { replay } from "./engine.js";
import {
  calendarLimit,
  FIXTURE_PLAN_VERSION_ID,
  makeFixtureCatalog,
  rollingLimit,
} from "./fixtures/catalog.js";
import { makeEvent } from "./fixtures/events.js";
import { calendarBucketEnd, calendarBucketStart, parseInstant } from "./time.js";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture entry");
  return value;
}

const target = { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID } as const;
const event = (id: string, occurredAt: string, tokens = 1) =>
  makeEvent({ id, occurredAt, usage: { inputTokens: tokens } });
const requestCatalog = () =>
  makeFixtureCatalog({
    limits: [rollingLimit({ id: "requests", type: "request_limit", amount: "1" })],
  });

function run(catalog: CatalogV1, events: ReturnType<typeof event>[]) {
  return replay({ catalog, target, events });
}

describe("independent audit: exact chronology", () => {
  it("orders sub-millisecond events by instant before id", () => {
    const result = run(requestCatalog(), [
      event("a", "2026-09-01T00:00:00.000002Z", 1),
      event("z", "2026-09-01T00:00:00.000001Z", 100),
    ]);
    expect(result.coverage.usage.covered).toBe(100);
    expect(result.workload.from).toBe("2026-09-01T00:00:00.000001Z");
    expect(result.violations[0]?.endedAt).toBe("2026-09-01T05:00:00.000001Z");
  });
  it("preserves nanosecond rolling reset boundaries", () => {
    const catalog = requestCatalog();
    const events = [
      event("a", "2026-09-01T00:00:00.000002Z"),
      event("b", "2026-09-01T05:00:00.000001Z"),
      event("c", "2026-09-01T05:00:00.000002Z"),
    ];
    expect(run(catalog, events).coverage.requests.covered).toBe(2);
    expect(run(catalog, events.reverse())).toEqual(run(catalog, [...events].reverse()));
  });
  it("uses id as a deterministic tie breaker only for equal instants", () => {
    const events = [
      event("z", "2026-09-01T00:00:00.1Z", 100),
      event("a", "2026-09-01T00:00:00.100000000Z", 1),
    ];
    expect(run(requestCatalog(), events).coverage.usage.covered).toBe(1);
    expect(run(requestCatalog(), events)).toEqual(run(requestCatalog(), events.reverse()));
  });
  it.each(["PT5H", "P7D"])("keeps %s boundaries half-open at +/-1ms", (duration) => {
    const span = duration === "PT5H" ? 18_000_000 : 604_800_000;
    const base = Date.UTC(2026, 8, 1);
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "r",
          type: "request_limit",
          amount: "2",
          window: { type: "rolling", duration, anchor: "first_use" },
        }),
      ],
    });
    const events = [0, span - 1, span, span + 1].map((offset, i) =>
      event(`${i}`, new Date(base + offset).toISOString()),
    );
    expect(run(catalog, events).violations).toEqual([]);
    expect(run(catalog, events).coverage.requests.covered).toBe(4);
  });
  it.each([
    ["2024-02-29T12:00:00Z", "month", "UTC", "2024-02-01T00:00:00Z", "2024-03-01T00:00:00Z"],
    [
      "2018-11-04T12:00:00Z",
      "day",
      "America/Sao_Paulo",
      "2018-11-04T03:00:00Z",
      "2018-11-05T02:00:00Z",
    ],
    [
      "2018-11-04T12:00:00Z",
      "week",
      "America/Sao_Paulo",
      "2018-10-29T03:00:00Z",
      "2018-11-05T02:00:00Z",
    ],
    [
      "2026-11-01T12:00:00Z",
      "day",
      "America/New_York",
      "2026-11-01T04:00:00Z",
      "2026-11-02T05:00:00Z",
    ],
    [
      "2026-09-30T18:30:00Z",
      "month",
      "Asia/Kolkata",
      "2026-09-30T18:30:00Z",
      "2026-10-31T18:30:00Z",
    ],
  ] as const)("resolves %s %s in %s", (at, unit, zone, start, end) => {
    expect(calendarBucketStart(parseInstant(at), unit, zone).toString()).toBe(start);
    expect(calendarBucketEnd(parseInstant(at), unit, zone).toString()).toBe(end);
  });
  it("does not reuse a UTC-date cache across a local reset", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        calendarLimit({
          id: "d",
          type: "request_limit",
          amount: "1",
          window: { type: "calendar", unit: "day", timezone: "Asia/Kolkata" },
        }),
      ],
    });
    const result = run(catalog, [
      event("a", "2026-09-01T18:29:59.999Z"),
      event("b", "2026-09-01T18:30:00Z"),
    ]);
    expect(result.violations).toEqual([]);
  });
});

describe("independent audit: trust boundaries", () => {
  it.each([
    null,
    {},
    { type: "subscription", planVersionId: FIXTURE_PLAN_VERSION_ID, extra: true },
  ])("rejects malformed targets: %j", (target) => {
    expect(() =>
      replay({ catalog: requestCatalog(), events: [], target: target as never }),
    ).toThrow(/IMPORT_SCHEMA_INVALID/);
  });
  it("rejects malformed event collections", () =>
    expect(() => replay({ catalog: requestCatalog(), target, events: null as never })).toThrow(
      /IMPORT_SCHEMA_INVALID/,
    ));
  it("rejects hybrid behavior explicitly", () =>
    expect(() =>
      replay({
        catalog: requestCatalog(),
        events: [],
        target: { type: "hybrid", routes: [{ priority: 0, target }] },
      }),
    ).toThrow(/TARGET_NOT_IMPLEMENTED/));
  it("validates loaded catalog indexes instead of accepting forged rules", () => {
    const catalog = requestCatalog();
    required(required(catalog.planVersions[FIXTURE_PLAN_VERSION_ID]).limits[0]).amount = "2";
    // Shared fixture references: break the index deliberately after cloning.
    required(catalog.plans["fixture-plan"]).versions[0] = {
      ...required(required(catalog.plans["fixture-plan"]).versions[0]),
      limits: [rollingLimit({ id: "requests", type: "request_limit", amount: "1" })],
    };
    expect(() => run(catalog, [])).toThrow(/CATALOG_INVALID/);
  });
  it("rejects invalid windows even on the serialized catalog boundary", () => {
    const catalog = makeFixtureCatalog({
      limits: [
        rollingLimit({
          id: "zero",
          type: "request_limit",
          amount: "1",
          window: { type: "rolling", duration: "PT0S", anchor: "first_use" },
        }),
      ],
    });
    expect(() => run(catalog, [])).toThrow(/CATALOG_INVALID/);
  });
  it("rejects unsafe aggregate counters before Number loses precision", () => {
    expect(() =>
      run(requestCatalog(), [
        event("a", "2026-09-01T00:00:00Z", Number.MAX_SAFE_INTEGER),
        event("b", "2026-09-01T00:00:01Z", 1),
      ]),
    ).toThrow(/safe-integer/);
  });
  it("ambiguous model names never depend on catalog insertion order", () => {
    const catalog: CatalogV1 = JSON.parse(JSON.stringify(requestCatalog()));
    for (const model of Object.values(catalog.models)) model.name = "Ambiguous";
    const events = [
      makeEvent({ id: "a", occurredAt: "2026-09-01T00:00:00Z", model: { rawName: "Ambiguous" } }),
    ];
    const first = run(catalog, events);
    catalog.models = Object.fromEntries(Object.entries(catalog.models).reverse());
    expect(run(catalog, events)).toEqual(first);
    expect(first.unsupportedModels[0]?.reason).toBe("unresolved");
  });
  it("declared unknown model confidence cannot become high from a canonical id", () => {
    const result = run(requestCatalog(), [
      makeEvent({
        id: "a",
        occurredAt: "2026-09-01T00:00:00Z",
        usage: { inputTokens: 1 },
        confidence: { usage: "exact", model: "unknown" },
      }),
    ]);
    expect(result.confidence.level).toBe("low");
  });
  it("explicit zero counts are distinct from missing data", () => {
    const result = run(requestCatalog(), [event("a", "2026-09-01T00:00:00Z", 0)]);
    expect(result.warnings.some((w) => w.code === "EVENT_MISSING_TOKEN_DATA")).toBe(false);
  });
  it("preserves sub-cent violations rather than printing equal rounded demand and capacity", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "tiny", type: "credit_pool", amount: "0.0000005" })],
    });
    const result = run(catalog, [event("a", "2026-09-01T00:00:00Z", 1)]);
    expect(result.violations[0]).toMatchObject({
      requiredUnits: "0.000001",
      availableUnits: "0.0000005",
    });
  });
  it("is unaffected by another consumer configuring decimal.js", () => {
    const catalog = makeFixtureCatalog({
      limits: [rollingLimit({ id: "c", type: "credit_pool", amount: "100" })],
    });
    const events = [event("a", "2026-09-01T00:00:00Z", 1234567)];
    const before = run(catalog, events);
    const precision = ExternalDecimal.precision;
    try {
      ExternalDecimal.set({ precision: 2 });
      expect(run(catalog, events)).toEqual(before);
    } finally {
      ExternalDecimal.set({ precision });
    }
    expect(executionReplayResultV1Schema.safeParse(before).success).toBe(true);
  });
});
