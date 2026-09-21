import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { stackReplayExportV1Schema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { collectUsage, createExport } from "./collect.js";
import {
  CLAUDE_CODE_FILE,
  CLAUDE_CODE_PROJECT_DIR,
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
  CODEX_ROLLOUT_PATH,
  COMMAND_CODE_FILE,
  COMMAND_CODE_PROJECT_DIR,
  COMMAND_CODE_SESSION,
  HERMES_FIXTURE_SQL,
  T3_FIXTURE_SQL,
  t3UsageScanCacheJson,
} from "./fixtures/content.js";
import {
  createFixtureEnvironment,
  createSqliteFixture,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
  writeFixture,
} from "./fixtures/helpers.js";

/** A home directory with a native history, a harness-managed copy and T3 data. */
async function withFixtureHome<T>(run: (directory: string) => Promise<T>): Promise<T> {
  return withTempDir(async (directory) => {
    await writeFixture(
      `${directory}/.claude/projects/${CLAUDE_CODE_PROJECT_DIR}/${CLAUDE_CODE_FILE}`,
      CLAUDE_CODE_SESSION,
    );
    // The same session reachable through a harness-managed root: must dedupe.
    await writeFixture(
      `${directory}/.t3/commandcode/claude/projects/${CLAUDE_CODE_PROJECT_DIR}/${CLAUDE_CODE_FILE}`,
      CLAUDE_CODE_SESSION,
    );
    await writeFixture(`${directory}/.codex/sessions/${CODEX_ROLLOUT_PATH}`, CODEX_ROLLOUT);
    await writeFixture(
      `${directory}/.commandcode/projects/${COMMAND_CODE_PROJECT_DIR}/${COMMAND_CODE_FILE}`,
      COMMAND_CODE_SESSION,
    );
    await createSqliteFixture(`${directory}/.hermes/state.db`, HERMES_FIXTURE_SQL);
    await createSqliteFixture(`${directory}/.t3/userdata/state.sqlite`, T3_FIXTURE_SQL);
    await writeFixture(
      `${directory}/.t3/userdata/usage-scan-cache.json`,
      t3UsageScanCacheJson(directory),
    );
    return run(directory);
  });
}

async function runCollect(directory: string, extra: Record<string, unknown> = {}) {
  const env = createFixtureEnvironment({ homeDir: directory });
  return collectUsage({
    env,
    catalog: syntheticCatalog(),
    salt: FIXTURE_SALT,
    now: fixtureNow(),
    ...extra,
  });
}

describe("collection pipeline", () => {
  it("detects every source that exists and reports the ones that do not", async () => {
    await withFixtureHome(async (directory) => {
      const result = await runCollect(directory);
      const byId = new Map(result.detectedSources.map((source) => [source.adapterId, source]));
      expect(byId.get("claude-code")?.detected).toBe(true);
      expect(byId.get("codex")?.detected).toBe(true);
      expect(byId.get("command-code")?.detected).toBe(true);
      expect(byId.get("hermes")?.detected).toBe(true);
      expect(byId.get("t3-code")?.detected).toBe(true);
      expect(byId.get("opencode")?.detected).toBe(false);
      expect(byId.get("ccusage")?.detected).toBe(false);
      expect(byId.get("ccusage")?.note).toContain("--input");
    });
  });

  it("collects from every detected source without double counting", async () => {
    await withFixtureHome(async (directory) => {
      const result = await runCollect(directory);
      // 2 Claude Code records + 2 Codex records + 3 Command Code records + 2 Hermes rows
      expect(result.stats.totalEvents).toBe(9);
      // The harness-managed copy of the Claude Code session is an exact duplicate.
      expect(result.stats.exactDuplicates).toBe(2);
      expect(
        result.events.filter((event) => event.source.adapterId === "claude-code"),
      ).toHaveLength(2);
    });
  });

  it("attributes provider sessions that a harness orchestrated", async () => {
    await withFixtureHome(async (directory) => {
      const result = await runCollect(directory);
      const codexEvents = result.events.filter((event) => event.source.adapterId === "codex");
      expect(codexEvents).toHaveLength(2);
      expect(codexEvents.every((event) => event.harness?.id === "t3-code")).toBe(true);
      const claudeEvents = result.events.filter(
        (event) => event.source.adapterId === "claude-code",
      );
      expect(claudeEvents.every((event) => event.harness?.id === "claude-code")).toBe(true);
      expect(result.attribution.sessionsMapped).toBe(2);
      expect(result.attribution.rootsAdded).toBe(1);
    });
  });

  it("produces an export that validates and carries no personal data", async () => {
    await withFixtureHome(async (directory) => {
      const result = await runCollect(directory);
      const exported = createExport(result, {
        range: { from: "2026-09-01T00:00:00.000Z", to: "2026-10-01T00:00:00.000Z" },
        collectorVersion: "0.0.0-test",
        generatedAt: fixtureNow().toISOString(),
      });
      const parsed = stackReplayExportV1Schema.safeParse(exported);
      expect(parsed.success).toBe(true);
      expect(exported.redactionReport).toEqual({
        promptsIncluded: false,
        responsesIncluded: false,
        sourceCodeIncluded: false,
        filePathsIncluded: false,
        repositoryNamesIncluded: false,
      });
      const serialized = JSON.stringify(exported);
      expect(serialized).not.toContain("/home/");
      expect(serialized).not.toContain("demo-app");
      expect(serialized).not.toContain("hello");
    });
  });

  it("is deterministic for identical inputs", async () => {
    await withFixtureHome(async (directory) => {
      const first = await runCollect(directory);
      const second = await runCollect(directory);
      expect(second.events).toEqual(first.events);
      expect(second.stats).toEqual(first.stats);
    });
  });

  it("honours a window that excludes every event", async () => {
    await withFixtureHome(async (directory) => {
      const result = await runCollect(directory, {
        since: "2026-01-01T00:00:00.000Z",
        until: "2026-01-02T00:00:00.000Z",
      });
      expect(result.events).toHaveLength(0);
    });
  });

  it("restricts collection to selected sources", async () => {
    await withFixtureHome(async (directory) => {
      const result = await runCollect(directory, { sources: ["codex"] });
      expect(result.events.every((event) => event.source.adapterId === "codex")).toBe(true);
      expect(result.detectedSources.length).toBeGreaterThan(1);
    });
  });

  it("drops import rows that a native source already describes", async () => {
    await withFixtureHome(async (directory) => {
      const importFile = `${directory}/ccusage.json`;
      await writeFixture(
        importFile,
        JSON.stringify({
          sessions: [
            {
              sessionId: "11111111-1111-4111-8111-111111111111",
              inputTokens: 300,
              outputTokens: 120,
              totalTokens: 420,
              totalCost: 0.01,
              firstActivity: "2026-09-19T10:01:00.000Z",
              lastActivity: "2026-09-19T10:01:00.000Z",
              modelsUsed: ["example-medium"],
            },
          ],
        }),
      );
      const result = await runCollect(directory, { inputFile: importFile });
      const imported = result.events.filter((event) => event.source.adapterId === "ccusage");
      expect(imported).toHaveLength(0);
      expect(result.stats.overlaps).toBe(1);
    });
  });

  it("keeps import rows when nothing else describes them", async () => {
    await withFixtureHome(async (directory) => {
      const importFile = `${directory}/ccusage.json`;
      await writeFixture(
        importFile,
        JSON.stringify({
          sessions: [
            {
              sessionId: "99999999-9999-4999-8999-999999999999",
              inputTokens: 300,
              outputTokens: 120,
              totalTokens: 420,
              totalCost: 0.01,
              firstActivity: "2026-09-19T10:01:00.000Z",
              lastActivity: "2026-09-19T10:01:00.000Z",
              modelsUsed: ["example-medium"],
            },
          ],
        }),
      );
      const result = await runCollect(directory, { inputFile: importFile });
      expect(result.events.filter((event) => event.source.adapterId === "ccusage")).toHaveLength(1);
      expect(result.stats.overlaps).toBe(0);
    });
  });

  it("sources make no network calls", async () => {
    const sourceDirectory = new URL(".", import.meta.url).pathname;
    const files: string[] = [];
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await walk(path);
        else if (entry.name.endsWith(".ts")) files.push(path);
      }
    };
    await walk(sourceDirectory);
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      expect(content).not.toMatch(/node:(http|https|net|tls|dgram)/u);
      expect(content).not.toMatch(/\bglobalThis\.fetch\b|\bundici\b/u);
    }
  });
});
