import { BUNDLED_CATALOG_VERSION, bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cachedWorkloadResult,
  decodeCachedResult,
  encodeCachedResult,
  RESULT_CACHE_MAX_BYTES,
} from "./workload-result-cache";
import { summarizeExport } from "./workload-summary";

const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  failRead: false,
  failWrite: false,
}));
vi.mock("./idb", () => ({
  localStoreGeneration: () => ({ generation: 0, clearedGeneration: 0, tombstones: new Map() }),
  loadWorkloadResult: async (key: string) => {
    if (state.failRead) throw new Error("storage unavailable");
    return state.values.get(key);
  },
  saveWorkloadResult: async (key: string, _record: unknown, value: unknown) => {
    if (state.failWrite) throw new Error("quota exceeded");
    state.values.set(key, value);
  },
}));
const exported = buildDemoExport("moderate");
const record = {
  id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  label: "Demo: moderate",
  createdAt: "2026-10-01T12:00:00Z",
  eventCount: exported.events.length,
  summary: summarizeExport(exported, BUNDLED_CATALOG_VERSION, bundledModelIdentity()),
  savedLocally: true,
};
beforeEach(() => {
  state.values.clear();
  state.failRead = false;
  state.failWrite = false;
});

describe("derived workload results", () => {
  it("reuses a persisted result for identical inputs", async () => {
    const compute = vi.fn(() => ({ calls: 900, total: "5.93" }));
    const first = await cachedWorkloadResult(
      exported,
      record,
      "profile",
      ["UTC", "2026-10-01"],
      compute,
    );
    const second = await cachedWorkloadResult(
      exported,
      record,
      "profile",
      ["UTC", "2026-10-01"],
      compute,
    );
    expect(second).toEqual(first);
    expect(compute).toHaveBeenCalledTimes(1);
  });
  it("separates time zones, rules dates, scope and local labels", async () => {
    const compute = vi.fn(() => ({ calls: 900 }));
    await cachedWorkloadResult(exported, record, "profile", ["UTC", "2026-10-01"], compute);
    await cachedWorkloadResult(
      exported,
      record,
      "profile",
      ["America/New_York", "2026-10-01"],
      compute,
    );
    await cachedWorkloadResult(exported, record, "profile", ["UTC", "2026-10-02"], compute);
    await cachedWorkloadResult(exported, record, "api-market", ["account-a"], compute);
    await cachedWorkloadResult(
      exported,
      { ...record, label: "Changed label" },
      "profile",
      ["UTC", "2026-10-01"],
      compute,
    );
    expect(compute).toHaveBeenCalledTimes(5);
  });
  it("fingerprints payload contents even when the import id and counts stay the same", async () => {
    const compute = vi.fn(() => ({ calls: 900 }));
    await cachedWorkloadResult(exported, record, "profile", [], compute);
    const changed = structuredClone(exported);
    const event = changed.events[0];
    if (!event) throw new Error("Fixture must contain events");
    event.occurredAt = "2026-09-01T00:00:00Z";
    await cachedWorkloadResult(changed, record, "profile", [], compute);
    expect(compute).toHaveBeenCalledTimes(2);
  });
  it("does not persist temporary workloads or a superseded computation", async () => {
    await cachedWorkloadResult(exported, { ...record, savedLocally: false }, "profile", [], () => ({
      calls: 900,
    }));
    await cachedWorkloadResult(
      exported,
      record,
      "profile",
      [],
      () => ({ calls: 900 }),
      () => false,
    );
    expect(state.values.size).toBe(0);
  });
  it("returns computed values when optional storage cannot be read or written", async () => {
    state.failRead = true;
    state.failWrite = true;
    await expect(
      cachedWorkloadResult(exported, record, "profile", [], () => ({ calls: 900 })),
    ).resolves.toEqual({ calls: 900 });
  });
  it("rejects modified envelopes and results bound to another key", async () => {
    const encoded = await encodeCachedResult("correct", { total: "5.93" });
    expect(await decodeCachedResult("correct", encoded)).toEqual({ total: "5.93" });
    expect(await decodeCachedResult("wrong", encoded)).toBeUndefined();
    expect(
      await decodeCachedResult("correct", { ...encoded, json: '{"total":"0"}' }),
    ).toBeUndefined();
    expect(await decodeCachedResult("correct", { json: "{}", digest: "wrong" })).toBeUndefined();
  });
  it("does not cache oversized results", async () => {
    expect(await encodeCachedResult("correct", "x".repeat(RESULT_CACHE_MAX_BYTES))).toBeUndefined();
  });
  it("bounds UTF-8 bytes rather than UTF-16 code units", async () => {
    const value = "é".repeat(RESULT_CACHE_MAX_BYTES / 2);
    expect(JSON.stringify(value).length).toBeLessThan(RESULT_CACHE_MAX_BYTES);
    expect(await encodeCachedResult("correct", value)).toBeUndefined();
    const json = JSON.stringify(value);
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`correct\u0000${json}`)),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    expect(await decodeCachedResult("correct", { json, digest })).toBeUndefined();
  });
});
