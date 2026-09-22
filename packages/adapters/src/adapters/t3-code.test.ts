import { describe, expect, it } from "vitest";
import { T3_FIXTURE_SQL, t3UsageScanCacheJson } from "../fixtures/content.js";
import {
  createFixtureEnvironment,
  createSqliteFixture,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
  writeFixture,
} from "../fixtures/helpers.js";
import { createModelMapper } from "../models.js";
import { claudeCodeRoots } from "./claude-code.js";
import { codexRoots } from "./codex.js";
import { commandCodeRoots } from "./command-code.js";
import { hermesRoots } from "./hermes.js";
import { openCodeRoots } from "./opencode.js";
import { createT3CodeAdapter } from "./t3-code.js";

const adapter = createT3CodeAdapter();

async function collectFrom() {
  return withTempDir(async (directory) => {
    await createSqliteFixture(`${directory}/.t3/userdata/state.sqlite`, T3_FIXTURE_SQL);
    await writeFixture(
      `${directory}/.t3/userdata/usage-scan-cache.json`,
      t3UsageScanCacheJson(directory),
    );
    const env = createFixtureEnvironment({ homeDir: directory });
    return adapter.collectAttribution(env, {
      now: fixtureNow(),
      salt: FIXTURE_SALT,
      mapper: createModelMapper(syntheticCatalog()),
      roots: [`${directory}/.t3/userdata`],
    });
  });
}

describe("t3-code attribution adapter", () => {
  it("maps provider sessions to T3 threads without emitting usage", async () => {
    const index = await collectFrom();
    expect(index.byProviderSession.size).toBe(2);
    expect(index.byProviderSession.get("codex\u000022222222-2222-4222-8222-222222222222")).toEqual({
      harnessId: "t3-code",
      harnessSessionId: "thread_one",
      attribution: "exact",
    });
    expect(index.byProviderSession.get("opencode\u0000ses_alpha")).toEqual({
      harnessId: "t3-code",
      harnessSessionId: "thread_two",
      attribution: "exact",
    });
  });

  it("reports providers it cannot read instead of guessing", async () => {
    const index = await collectFrom();
    const codes = index.warnings.map((warning) => warning.code);
    expect(codes).toContain("RECORD_UNSUPPORTED");
    expect(index.warnings[0]?.message).toContain("grok");
  });

  it("discovers provider history roots that only exist inside T3", async () => {
    const index = await collectFrom();
    const paths = index.additionalRoots.map((root) => root.path);
    expect(paths.some((path) => path.endsWith("/.t3/commandcode/claude/projects"))).toBe(true);
    expect(paths).toHaveLength(1);
    expect(index.additionalRoots.every((root) => root.adapterId === "claude-code")).toBe(true);
  });

  /**
   * Regression (benchmark F017): `defaultRootsFor` listed only three of the five
   * providers this adapter can attribute, so a scan-cache entry naming the
   * default directory of command-code or hermes was added as an "extra" root and
   * the same history was scanned twice in one run.
   *
   * T3's usage scan cache is a list of the provider directories T3 has scanned.
   * A directory that is already that provider adapter's own default root must
   * never be added again; a directory only T3 manages must be.
   */
  it("resolves every attributable provider's own root as a default root", async () => {
    const outcome = await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      const providers = [
        { provider: "claude", adapterId: "claude-code", roots: claudeCodeRoots(env) },
        { provider: "codex", adapterId: "codex", roots: codexRoots(env) },
        { provider: "opencode", adapterId: "opencode", roots: openCodeRoots(env) },
        { provider: "commandcode", adapterId: "command-code", roots: commandCodeRoots(env) },
        { provider: "hermes", adapterId: "hermes", roots: hermesRoots(env) },
      ];
      const sources: Record<string, { dir: string; volumeId: string }> = {};
      let volume = 0;
      for (const entry of providers) {
        for (const root of entry.roots) {
          volume += 1;
          sources[`${entry.provider}\u0000${root}`] = { dir: root, volumeId: `1:${volume}` };
        }
      }
      // A provider history that exists only inside T3: this is the one that has
      // to survive as an extra root.
      const t3Managed = `${directory}/.t3/commandcode/claude/projects`;
      sources[`claude\u0000${t3Managed}`] = { dir: t3Managed, volumeId: "2:1" };

      await createSqliteFixture(`${directory}/.t3/userdata/state.sqlite`, T3_FIXTURE_SQL);
      await writeFixture(
        `${directory}/.t3/userdata/usage-scan-cache.json`,
        JSON.stringify({
          version: 3,
          models: ["example-medium"],
          sessions: ["22222222-2222-4222-8222-222222222222"],
          files: {},
          sources,
        }),
      );
      const index = await adapter.collectAttribution(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.t3/userdata`],
      });
      return {
        additionalRoots: index.additionalRoots,
        providerRoots: providers.flatMap((entry) => entry.roots),
        t3Managed,
      };
    });

    for (const root of outcome.providerRoots) {
      expect(outcome.additionalRoots.map((entry) => entry.path)).not.toContain(root);
    }
    expect(outcome.additionalRoots).toEqual([
      { adapterId: "claude-code", path: outcome.t3Managed },
    ]);
  });

  it("is deterministic across runs", async () => {
    await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.t3/userdata/state.sqlite`, T3_FIXTURE_SQL);
      await writeFixture(
        `${directory}/.t3/userdata/usage-scan-cache.json`,
        t3UsageScanCacheJson(directory),
      );
      const env = createFixtureEnvironment({ homeDir: directory });
      const options = {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.t3/userdata`],
      };
      const first = await adapter.collectAttribution(env, options);
      const second = await adapter.collectAttribution(env, options);
      expect([...second.byProviderSession.entries()]).toEqual([
        ...first.byProviderSession.entries(),
      ]);
      expect(second.additionalRoots).toEqual(first.additionalRoots);
    });
  });

  it("detects T3 data and reports mapping counts", async () => {
    await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.t3/userdata/state.sqlite`, T3_FIXTURE_SQL);
      await writeFixture(
        `${directory}/.t3/userdata/usage-scan-cache.json`,
        t3UsageScanCacheJson(directory),
      );
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(true);
      expect(detection.supported).toBe(true);
      expect(detection.note).toContain("3 of 3 thread row(s) carry a provider session id");
    });
  });

  it("maps sessions from the runtime bookkeeping when the projection has no session id", async () => {
    // Installed T3 versions leave projection_thread_sessions.provider_session_id
    // empty and record the provider session id in the resume cursor of
    // provider_session_runtime instead, so the projection alone maps nothing.
    const index = await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.t3/userdata/state.sqlite`, [
        `create table projection_thread_sessions (
           thread_id text, status text, provider_name text, provider_session_id text,
           provider_thread_id text, active_turn_id text, last_error text, updated_at text,
           runtime_mode text, provider_instance_id text)`,
        `insert into projection_thread_sessions values
           ('thread_one', 'idle', 'codex', null, null, null, null, '2026-09-19T10:00:00.000Z', 'local', null)`,
        `insert into projection_thread_sessions values
           ('thread_two', 'idle', 'opencode', null, null, null, null, '2026-09-19T10:05:00.000Z', 'local', null)`,
        `create table provider_session_runtime (
           thread_id text, provider_name text, adapter_key text, runtime_mode text, status text,
           last_seen_at text, resume_cursor_json text, runtime_payload_json text,
           provider_instance_id text)`,
        `insert into provider_session_runtime values
           ('thread_one', 'codex', 'codex', 'full-access', 'idle', '2026-09-19T10:00:00.000Z',
            '{"schemaVersion":1,"sessionId":"22222222-2222-4222-8222-222222222222"}', '{}', 'inst_1')`,
        `insert into provider_session_runtime values
           ('thread_two', 'opencode', 'opencode', 'full-access', 'idle', '2026-09-19T10:05:00.000Z',
            '{"schemaVersion":1,"threadId":"ses_alpha"}', '{}', 'inst_1')`,
      ]);
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collectAttribution(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.t3/userdata`],
      });
    });
    expect(index.byProviderSession.get("codex\u000022222222-2222-4222-8222-222222222222")).toEqual({
      harnessId: "t3-code",
      harnessSessionId: "thread_one",
      attribution: "exact",
    });
    // A thread whose cursor holds no session id stays unattributed, and says so.
    expect(index.byProviderSession.get("opencode\u0000ses_alpha")).toBeUndefined();
    expect(index.warnings.map((warning) => warning.code)).toContain("RECORD_INCOMPLETE");
  });

  it("reports a harness whose mapping is missing instead of attributing nothing silently", async () => {
    const index = await withTempDir(async (directory) => {
      await createSqliteFixture(`${directory}/.t3/userdata/state.sqlite`, [
        `create table projection_thread_sessions (
           thread_id text, status text, provider_name text, provider_session_id text,
           provider_thread_id text, active_turn_id text, last_error text, updated_at text,
           runtime_mode text, provider_instance_id text)`,
        `insert into projection_thread_sessions values
           ('thread_one', 'idle', 'codex', null, null, null, null, '2026-09-19T10:00:00.000Z', 'local', null)`,
      ]);
      const env = createFixtureEnvironment({ homeDir: directory });
      return adapter.collectAttribution(env, {
        now: fixtureNow(),
        salt: FIXTURE_SALT,
        mapper: createModelMapper(syntheticCatalog()),
        roots: [`${directory}/.t3/userdata`],
      });
    });
    expect(index.byProviderSession.size).toBe(0);
    const incomplete = index.warnings.find((warning) => warning.code === "RECORD_INCOMPLETE");
    expect(incomplete?.message).toContain("no session could be attributed");
  });

  it("reports an absent harness without inventing one", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      const detection = await adapter.detect(env);
      expect(detection.detected).toBe(false);
      expect(detection.note).toContain("no T3 Code data found");
    });
  });
});
