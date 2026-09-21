import { describe, expect, it } from "vitest";
import { OPENCODE_FIXTURE_SQL } from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  createSqliteFixture,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { createOpenCodeAdapter } from "./opencode.js";

const adapter = createOpenCodeAdapter();

async function collectFrom(databaseStatements: string[] = OPENCODE_FIXTURE_SQL) {
  return withTempDir(async (directory) => {
    const databasePath = `${directory}/.local/share/opencode/opencode.db`;
    await createSqliteFixture(databasePath, databaseStatements);
    const env = createFixtureEnvironment({
      homeDir: directory,
      env: { XDG_DATA_HOME: `${directory}/.local/share` },
    });
    return adapter.collect(env, {
      now: fixtureNow(),
      salt: FIXTURE_SALT,
      mapper: createModelMapper(syntheticCatalog()),
      roots: [`${directory}/.local/share/opencode`],
    });
  });
}

describe("opencode adapter", () => {
  it("reads assistant messages and ignores other roles", async () => {
    const result = await collectFrom();
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.occurredAt).toBe(new Date(1789601516670).toISOString());
    expect(result.events[1]?.occurredAt).toBe(new Date(1789601700000).toISOString());
  });

  it("treats every token category as additional, matching OpenCode's own totals", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.usage).toEqual({
      inputTokens: 2000,
      outputTokens: 300,
      cacheReadTokens: 9000,
      cacheWriteTokens: 1000,
      reasoningTokens: 45,
      accounting: {
        cacheReadIncludedInInput: false,
        cacheWriteIncludedInInput: false,
        reasoningIncludedInOutput: false,
      },
    });
  });

  it("keeps a missing reasoning category unknown instead of zero", async () => {
    const result = await collectFrom();
    expect(result.events[1]?.usage.reasoningTokens).toBeUndefined();
    expect(result.events[1]?.usage.cacheReadTokens).toBe(0);
  });

  it("carries cost and the session directory as a project hash", async () => {
    const result = await collectFrom();
    expect(result.events[0]?.nativeCost).toEqual({ amount: "0.42", currency: "USD" });
    expect(result.events[0]?.projectHash).toMatch(/^ph_[0-9a-f]{32}$/u);
    expect(JSON.stringify(result.events)).not.toContain("demo-app");
  });

  it("honours the requested window on message timestamps", async () => {
    const result = await collectFrom();
    void result;
    const filtered = await withTempDir(async (directory) => {
      const databasePath = `${directory}/.local/share/opencode/opencode.db`;
      await createSqliteFixture(databasePath, OPENCODE_FIXTURE_SQL);
      const env = createFixtureEnvironment({
        homeDir: directory,
        env: { XDG_DATA_HOME: `${directory}/.local/share` },
      });
      return adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.local/share/opencode`],
        since: new Date(1789601600000).toISOString(),
      });
    });
    expect(filtered.events).toHaveLength(1);
    expect(filtered.events[0]?.occurredAt).toBe(new Date(1789601700000).toISOString());
  });

  it("is idempotent for identical inputs", async () => {
    const first = await collectFrom();
    const second = await collectFrom();
    expect(second.events).toEqual(first.events);
  });

  it("detects the database and reports session counts", async () => {
    await withTempDir(async (directory) => {
      await createSqliteFixture(
        `${directory}/.local/share/opencode/opencode.db`,
        OPENCODE_FIXTURE_SQL,
      );
      const env = createFixtureEnvironment({
        homeDir: directory,
        env: { XDG_DATA_HOME: `${directory}/.local/share` },
      });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.note).toContain("session");
    });
  });

  it("reports the legacy JSON layout as detected but unsupported", async () => {
    await withTempDir(async (directory) => {
      const { mkdir, writeFile } = await import("node:fs/promises");
      await mkdir(`${directory}/.local/share/opencode/storage/session`, { recursive: true });
      await writeFile(`${directory}/.local/share/opencode/storage/session/placeholder.json`, "{}");
      const env = createFixtureEnvironment({
        homeDir: directory,
        env: { XDG_DATA_HOME: `${directory}/.local/share` },
      });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(true);
      expect(detection.supported).toBe(false);
      expect(detection.note).toContain("legacy JSON storage layout");
    });
  });

  it("reports an unreadable database instead of failing the scan", async () => {
    const result = await withTempDir(async (directory) => {
      const { mkdir, writeFile } = await import("node:fs/promises");
      await mkdir(`${directory}/.local/share/opencode`, { recursive: true });
      await writeFile(`${directory}/.local/share/opencode/opencode.db`, "not a database");
      const env = createFixtureEnvironment({
        homeDir: directory,
        env: { XDG_DATA_HOME: `${directory}/.local/share` },
      });
      return adapter.collect(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.local/share/opencode`],
      });
    });
    expect(result.events).toHaveLength(0);
    expect(result.warnings.map((warning) => warning.code)).toContain("SOURCE_UNREADABLE");
  });
});
