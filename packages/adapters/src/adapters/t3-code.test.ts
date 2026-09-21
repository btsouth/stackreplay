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
      expect(detection.note).toContain("3 thread/session mapping(s)");
    });
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
