import { describe, expect, it } from "vitest";
import {
  COMMAND_CODE_FILE,
  COMMAND_CODE_PROJECT_DIR,
  COMMAND_CODE_SESSION,
} from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
  writeFixture,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { createCommandCodeAdapter } from "./command-code.js";

const adapter = createCommandCodeAdapter();

async function collectFrom(session: string = COMMAND_CODE_SESSION) {
  return withTempDir(async (directory) => {
    await writeFixture(
      `${directory}/.commandcode/projects/${COMMAND_CODE_PROJECT_DIR}/${COMMAND_CODE_FILE}`,
      session,
    );
    const env = createFixtureEnvironment({ homeDir: directory });
    return adapter.collect(env, {
      now: fixtureNow(),
      salt: FIXTURE_SALT,
      mapper: createModelMapper(syntheticCatalog()),
      roots: [`${directory}/.commandcode/projects`],
    });
  });
}

describe("command-code adapter", () => {
  it("emits one event per usage-bearing assistant message", async () => {
    const result = await collectFrom();
    expect(result.events).toHaveLength(3);
    expect(result.events[0]?.occurredAt).toBe("2026-09-19T12:00:05.000Z");
    expect(result.events[2]?.occurredAt).toBe("2026-09-19T12:02:00.000Z");
  });

  it("treats cache categories as subsets of input and reasoning as a known absence", async () => {
    const result = await collectFrom();
    const [first] = result.events;
    expect(first?.usage).toEqual({
      inputTokens: 4000,
      outputTokens: 250,
      cacheReadTokens: 3000,
      cacheWriteTokens: 500,
      reasoningTokens: 0,
      accounting: {
        cacheReadIncludedInInput: true,
        cacheWriteIncludedInInput: true,
        reasoningIncludedInOutput: false,
      },
    });
  });

  it("carries the source-reported cost as a decimal string", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.nativeCost).toEqual({ amount: "0.012345", currency: "USD" });
    expect(result.events[1]?.nativeCost).toEqual({ amount: "0.0007", currency: "USD" });
  });

  it("drops the cache categories and warns when the subset relationship breaks", async () => {
    const result = await collectFrom();
    const broken = result.events[2];
    expect(broken?.usage.cacheReadTokens).toBeUndefined();
    expect(broken?.usage.cacheWriteTokens).toBeUndefined();
    expect(broken?.usage.inputTokens).toBe(100);
    expect(result.warnings.map((warning) => warning.code)).toContain("ACCOUNTING_UNESTABLISHED");
  });

  it("hashes the project path instead of exporting it", async () => {
    const result = await collectFrom();
    const serialized = JSON.stringify(result.events);
    expect(serialized).not.toContain("demo-app");
    expect(result.events[0]?.projectHash).toMatch(/^ph_[0-9a-f]{32}$/u);
  });

  it("is idempotent for identical inputs", async () => {
    const first = await collectFrom();
    const second = await collectFrom();
    expect(second.events).toEqual(first.events);
  });

  it("ignores checkpoint files", async () => {
    await withTempDir(async (directory) => {
      const base = `${directory}/.commandcode/projects/${COMMAND_CODE_PROJECT_DIR}`;
      await writeFixture(`${base}/${COMMAND_CODE_FILE}`, COMMAND_CODE_SESSION);
      await writeFixture(`${base}/checkpoints.checkpoints.jsonl`, COMMAND_CODE_SESSION);
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.probes[0]?.sessionCount).toBe(1);
      const result = await adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.commandcode/projects`],
      });
      expect(result.events).toHaveLength(3);
    });
  });

  it("reports a missing source without inventing one", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(false);
      expect(detection.supported).toBe(true);
    });
  });
});

describe("command-code adapter: schema validity when cache fields are absent", () => {
  it("emits a schema-valid event when a record reports no cache categories", async () => {
    const { usageEventV1Schema } = await import("@stackreplay/schema");
    const trimmed = COMMAND_CODE_SESSION.split("\n")
      .map((line) => {
        if (!line.includes('"usage"')) return line;
        const record = JSON.parse(line) as { usage: Record<string, unknown> };
        delete record.usage.cacheReadTokens;
        delete record.usage.cacheWriteTokens;
        return JSON.stringify(record);
      })
      .join("\n");
    const result = await collectFrom(trimmed);
    expect(result.events.length).toBeGreaterThan(0);
    for (const event of result.events) {
      const parsed = usageEventV1Schema.safeParse(event);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
    expect(result.events[0]?.usage.cacheReadTokens).toBeUndefined();
    expect(result.events[0]?.usage.accounting?.cacheReadIncludedInInput).toBeUndefined();
    expect(result.events[0]?.usage.inputTokens).toBe(4000);
  });
});
