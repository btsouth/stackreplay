import { describe, expect, it } from "vitest";
import { executionReplayResultV1Schema } from "./replay-result.js";
import { usageEventV1Schema } from "./usage-event.js";

const validEvent = {
  schemaVersion: 1,
  id: "evt-1",
  occurredAt: "2026-09-01T10:00:00Z",
  source: { adapterId: "example-adapter" },
  model: { rawName: "example-medium", canonicalId: "example-medium" },
  modality: "text",
  workloadCategory: "coding",
  usage: { inputTokens: 1200, outputTokens: 300, cacheReadTokens: 8000 },
  confidence: { usage: "exact", model: "exact" },
};

describe("usageEventV1Schema", () => {
  it("accepts a canonical text event", () => {
    const parsed = usageEventV1Schema.parse(validEvent);
    expect(parsed.id).toBe("evt-1");
    expect(parsed.usage.inputTokens).toBe(1200);
  });

  it("accepts an event with missing token categories", () => {
    const parsed = usageEventV1Schema.parse({ ...validEvent, usage: {} });
    expect(parsed.usage.inputTokens).toBeUndefined();
  });

  it("rejects non-UTC timestamps", () => {
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, occurredAt: "2026-09-01T10:00:00+02:00" }),
    ).toThrow();
  });

  it("rejects a metric-bag style usage shape", () => {
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, usage: { metrics: { tokens: 5 } } }),
    ).toThrow();
  });

  it("rejects unknown fields instead of silently accepting them", () => {
    expect(() => usageEventV1Schema.parse({ ...validEvent, plan: "sneaky" })).toThrow();
  });

  it("rejects negative token counts and non-integer counts", () => {
    expect(() => usageEventV1Schema.parse({ ...validEvent, usage: { inputTokens: -1 } })).toThrow();
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, usage: { inputTokens: 1.5 } }),
    ).toThrow();
  });

  it("rejects float money and accepts decimal-string money", () => {
    expect(() =>
      usageEventV1Schema.parse({ ...validEvent, nativeCost: { amount: 12.5, currency: "USD" } }),
    ).toThrow();
    const parsed = usageEventV1Schema.parse({
      ...validEvent,
      nativeCost: { amount: "12.50", currency: "USD" },
    });
    expect(parsed.nativeCost?.amount).toBe("12.50");
  });
});

describe("executionReplayResultV1Schema", () => {
  it("has no generic savings field", () => {
    const shape = executionReplayResultV1Schema.shape;
    expect("savings" in shape).toBe(false);
    expect("economics" in shape).toBe(true);
  });
});

describe("independent audit: timestamps", () => {
  it.each([
    "2026-02-30T00:00:00Z",
    "2026-01-01T24:00:00Z",
    "2026-01-01T00:60:00Z",
    "2026-01-01T00:00:60Z",
  ])("rejects impossible instant %s", (occurredAt) => {
    expect(usageEventV1Schema.safeParse({ ...validEvent, occurredAt }).success).toBe(false);
  });
  it("validates optional request timestamps too", () => {
    expect(
      usageEventV1Schema.safeParse({ ...validEvent, requestStartedAt: "2026-02-30T00:00:00Z" })
        .success,
    ).toBe(false);
  });
  it("retains nine-digit fractional precision", () => {
    const at = "2026-09-01T00:00:00.123456789Z";
    expect(usageEventV1Schema.parse({ ...validEvent, occurredAt: at }).occurredAt).toBe(at);
  });
});
