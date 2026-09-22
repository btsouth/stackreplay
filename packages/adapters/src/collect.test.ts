import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { stackReplayExportV1Schema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { type CollectRunResult, collectUsage, createExport, redactExportPaths } from "./collect.js";
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

  /**
   * Regression (benchmark F012): a date-scoped import row names no session, so
   * no overlap can be recognised when a native scan of the same work is present
   * in the same run. Keeping the row is right; keeping it silently is how the
   * same tokens get counted twice.
   */
  it("reports an aggregate import that cannot be deduplicated against native scans", async () => {
    await withFixtureHome(async (directory) => {
      const importFile = `${directory}/ccusage-daily.json`;
      await writeFixture(
        importFile,
        JSON.stringify({
          type: "daily",
          data: [
            {
              date: "2026-09-19",
              models: ["example-medium"],
              inputTokens: 177,
              outputTokens: 700,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
              costUSD: 7.33,
            },
          ],
        }),
      );
      const result = await runCollect(directory, { inputFile: importFile });
      const imported = result.events.filter((event) => event.source.adapterId === "ccusage");
      expect(imported).toHaveLength(1);
      expect(imported[0]?.source.nativeSessionHash).toBeUndefined();
      const risk = result.warnings.find((warning) => warning.code === "DOUBLE_COUNT_RISK");
      expect(risk).toBeDefined();
      expect(risk?.message).toContain("cannot be matched against them");
      expect(result.warnings.map((warning) => warning.code)).toContain("AGGREGATE_NO_SESSION");
      expect(result.stats.overlaps).toBe(0);
    });
  });

  it("does not warn about an aggregate import when no native scan was collected", async () => {
    await withTempDir(async (directory) => {
      const importFile = `${directory}/ccusage-daily.json`;
      await writeFixture(
        importFile,
        JSON.stringify({
          type: "daily",
          data: [
            {
              date: "2026-09-19",
              models: ["example-medium"],
              inputTokens: 177,
              outputTokens: 700,
              cacheCreationTokens: 0,
              cacheReadTokens: 0,
            },
          ],
        }),
      );
      const result = await runCollect(directory, { inputFile: importFile, sources: ["ccusage"] });
      expect(result.events).toHaveLength(1);
      expect(result.warnings.map((warning) => warning.code)).not.toContain("DOUBLE_COUNT_RISK");
    });
  });

  /**
   * Regression (benchmark F035): one damaged source used to abort the entire
   * collection, including every source that was perfectly readable.
   */
  it("keeps collecting when one source fails", async () => {
    await withFixtureHome(async (directory) => {
      const inner = createFixtureEnvironment({ homeDir: directory }).fs;
      const env = createFixtureEnvironment({
        homeDir: directory,
        fs: {
          ...inner,
          async stat(path: string) {
            if (path.endsWith("/.hermes")) throw new Error("database is locked");
            return inner.stat(path);
          },
        },
      });
      const result = await collectUsage({
        env,
        catalog: syntheticCatalog(),
        salt: FIXTURE_SALT,
        now: fixtureNow(),
      });
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events.some((event) => event.source.adapterId === "claude-code")).toBe(true);
      const failure = result.warnings.find(
        (warning) => warning.code === "SOURCE_UNREADABLE" && warning.message.includes("Hermes"),
      );
      expect(failure).toBeDefined();
      expect(result.detectedSources.find((source) => source.adapterId === "hermes")?.detected).toBe(
        false,
      );
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

/**
 * Export path redaction: an export claims `filePathsIncluded: false`, so no raw
 * local path may survive in any diagnostic it carries. The old rule recognised a
 * handful of roots (`/home`, `/Users`, `/var`, `/tmp`, `/mnt`, `/opt`,
 * `/private`) and nothing else, which is not a property the artifact can claim.
 */
describe("export path redaction", () => {
  it("redacts every Unix absolute path, not only a few known roots", () => {
    for (const path of [
      "/root/.hermes/state.db",
      "/data/stackreplay/export.json",
      "/srv/apps/stackreplay/store.db",
      "/etc/stackreplay.conf",
      "/opt/other/store.db",
    ]) {
      expect(redactExportPaths(`could not open ${path}`)).toBe("could not open <path>");
    }
  });

  it("redacts Windows paths, UNC shares, file URLs and relative locations", () => {
    expect(redactExportPaths(String.raw`could not open C:\Users\example\state.db`)).toBe(
      "could not open <path>",
    );
    expect(redactExportPaths("could not open C:/Users/example/state.db")).toBe(
      "could not open <path>",
    );
    expect(redactExportPaths(String.raw`could not open \\fileserver\share\state.db`)).toBe(
      "could not open <path>",
    );
    expect(redactExportPaths("could not open file:///home/example/state.db")).toBe(
      "could not open <path>",
    );
    expect(redactExportPaths("could not open ./store.db")).toBe("could not open <path>");
    expect(redactExportPaths("could not open ../store.db")).toBe("could not open <path>");
    expect(redactExportPaths("could not read src/adapters/collect.ts")).toBe(
      "could not read <path>",
    );
  });

  it("leaves prose that merely contains a slash readable", () => {
    for (const message of [
      "usage rows aggregate several API calls; request counts are approximate",
      "cache read/write categories are additional to input tokens",
      "the window is measured 24/7 rather than per session",
      "input/output token categories did not reconcile",
      "reported categories exceed the message's own token total",
      "see https://example.invalid/docs for the published rates",
    ]) {
      expect(redactExportPaths(message)).toBe(message);
    }
  });

  it("is deterministic", () => {
    const message = "could not open /root/store.db";
    expect(redactExportPaths(message)).toBe(redactExportPaths(message));
    expect(redactExportPaths(message)).toBe("could not open <path>");
  });

  it("carries no raw local path through warnings or detection notes", () => {
    const result: CollectRunResult = {
      detectedSources: [
        {
          adapterId: "ccusage",
          name: "ccusage import",
          detected: false,
          supported: true,
          role: "import",
          note: "import file not found: /root/private/usage.json",
        },
        {
          adapterId: "hermes",
          name: "Hermes",
          detected: true,
          supported: true,
          role: "usage",
          note: "2 session/model usage record(s) found",
        },
      ],
      events: [],
      warnings: [
        {
          code: "SOURCE_UNREADABLE",
          message:
            "Hermes could not be read and was skipped: ENOENT: no such file or directory, open '/data/stores/.hermes/state.db'",
          path: "/root/.hermes/state.db",
        },
        {
          code: "SOURCE_UNREADABLE",
          message: String.raw`OpenCode could not be read and was skipped: unable to open \\fileserver\share\opencode.db`,
        },
      ],
      stats: { perAdapter: {}, totalEvents: 0, exactDuplicates: 0, overlaps: 0 },
      attribution: { enabled: true, sessionsMapped: 0, rootsAdded: 0, warnings: [] },
    };
    const exported = createExport(result, {
      range: { from: "2026-09-01T00:00:00.000Z", to: "2026-10-01T00:00:00.000Z" },
      collectorVersion: "0.0.0-test",
      generatedAt: fixtureNow().toISOString(),
    });

    expect(exported.redactionReport.filePathsIncluded).toBe(false);
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain("/root/");
    expect(serialized).not.toContain("/data/");
    expect(serialized).not.toContain("fileserver");
    // The readable half of a diagnostic survives redaction.
    expect(serialized).toContain("no such file or directory");
    expect(serialized).toContain("2 session/model usage record(s) found");
    expect(stackReplayExportV1Schema.safeParse(exported).success).toBe(true);
  });
});
