import { describe, expect, it } from "vitest";
import { HERMES_FIXTURE_SQL } from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  createSqliteFixture,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { createHermesAdapter, hermesEpochMs } from "./hermes.js";

const adapter = createHermesAdapter();

async function collectFrom() {
  return withTempDir(async (directory) => {
    await createSqliteFixture(`${directory}/.hermes/state.db`, HERMES_FIXTURE_SQL);
    const env = createFixtureEnvironment({ homeDir: directory });
    return adapter.collect(env, {
      now: fixtureNow(),
      salt: FIXTURE_SALT,
      mapper: createModelMapper(syntheticCatalog()),
      roots: [`${directory}/.hermes`],
    });
  });
}

describe("hermes adapter", () => {
  it("emits one aggregate event per session and model", async () => {
    const result = await collectFrom();
    expect(result.events).toHaveLength(2);
    expect(Date.parse(result.events[0]?.occurredAt ?? "")).toBe(1789603516670);
    expect(Date.parse(result.events[1]?.occurredAt ?? "")).toBe(1789605516250);
  });

  it("converts epoch seconds to canonical timestamps", () => {
    expect(hermesEpochMs(1789601516.6703937)).toBe(1789601516670);
    expect(hermesEpochMs(1789601516670)).toBe(1789601516670);
    expect(hermesEpochMs(null)).toBeUndefined();
    expect(hermesEpochMs(0)).toBeUndefined();
  });

  it("treats cache as additional and reasoning as a subset of output", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.usage).toEqual({
      inputTokens: 5000,
      outputTokens: 900,
      cacheReadTokens: 40000,
      cacheWriteTokens: 1200,
      reasoningTokens: 300,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: true,
      },
    });
  });

  it("carries the activity window and prefers actual over estimated cost", async () => {
    const result = await collectFrom();
    const first = result.events[0];
    const second = result.events[1];
    expect(first?.requestStartedAt).toBe(new Date(1789601516670).toISOString());
    expect(first?.requestEndedAt).toBe(new Date(1789603516670).toISOString());
    expect(first?.durationMs).toBe(2000000);
    expect(first?.nativeCost).toEqual({ amount: "0.75", currency: "USD" });
    expect(second?.nativeCost).toEqual({ amount: "0.009", currency: "USD" });
  });

  it("flags aggregated rows so request counts are not overstated", async () => {
    const result = await collectFrom();
    expect(result.warnings.map((warning) => warning.code)).toContain("RECORD_INCOMPLETE");
    expect(result.warnings[0]?.message).toContain("approximate");
  });

  it("hashes the project path instead of exporting it", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.projectHash).toMatch(/^ph_[0-9a-f]{32}$/u);
    expect(JSON.stringify(result.events)).not.toContain("demo-app");
  });

  it("is idempotent for identical inputs", async () => {
    const first = await collectFrom();
    const second = await collectFrom();
    expect(second.events).toEqual(first.events);
  });

  it("detects the profile and counts usage records", async () => {
    await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.hermes/state.db`, HERMES_FIXTURE_SQL);
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.note).toContain("2 session/model usage record(s)");
    });
  });

  it("reports a missing profile without inventing one", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(false);
      expect(detection.note).toContain("no Hermes profile found");
    });
  });
});

describe("hermes adapter: schema validity when the reasoning column is null", () => {
  it("emits a schema-valid event when reasoning is not recorded", async () => {
    const { usageEventV1Schema } = await import("@stackreplay/schema");
    const statements = HERMES_FIXTURE_SQL.map((statement) =>
      statement.replace(", 300, 0.75,", ", null, 0.75,"),
    );
    const result = await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.hermes/state.db`, statements);
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.hermes`],
      });
    });
    expect(result.events.length).toBeGreaterThan(0);
    for (const event of result.events) {
      const parsed = usageEventV1Schema.safeParse(event);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
    expect(result.events[0]?.usage.reasoningTokens).toBeUndefined();
    expect(result.events[0]?.usage.accounting?.reasoningIncludedInOutput).toBeUndefined();
  });
});
