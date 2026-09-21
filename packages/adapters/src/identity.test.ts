import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createFixtureEnvironment, FIXTURE_SALT, withTempDir } from "./fixtures/helpers.js";
import {
  canonicalEventId,
  decimalStringFromNumber,
  ensureSalt,
  epochMsFromIso,
  generateSalt,
  isoUtcFromMs,
  nativeEventHash,
  normalizeProjectKey,
  projectHash,
  readSalt,
  saltFilePath,
} from "./identity.js";
import { isRealCalendarDate } from "./parse.js";

describe("identity and hashing", () => {
  it("creates a local salt once and reuses it", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      expect(await readSalt(env)).toBeUndefined();
      const created = await ensureSalt(env);
      expect(created).toMatch(/^[0-9a-f]{64}$/u);
      expect(await readSalt(env)).toBe(created);
      expect(await ensureSalt(env)).toBe(created);
      expect(saltFilePath(env)).toBe(`${directory}/.config/stackreplay/salt`);
    });
  });

  it("generates distinct salts", () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });

  it("hashes project paths with the salt and never returns the path", () => {
    const hash = projectHash(FIXTURE_SALT, "/home/example/projects/demo-app");
    expect(hash).toMatch(/^ph_[0-9a-f]{32}$/u);
    expect(hash).toBe(projectHash(FIXTURE_SALT, "/home/example/projects/demo-app"));
    expect(hash).not.toBe(projectHash(FIXTURE_SALT, "/home/example/projects/other-app"));
    expect(hash).not.toBe(projectHash(generateSalt(), "/home/example/projects/demo-app"));
    expect(hash).not.toContain("demo-app");
  });

  it("normalizes trailing separators and Windows case", () => {
    expect(normalizeProjectKey("/home/example/projects/demo-app/", "linux")).toBe(
      "/home/example/projects/demo-app",
    );
    expect(normalizeProjectKey("C:\\Code\\Demo\\", "win32")).toBe("c:\\code\\demo");
    expect(normalizeProjectKey("C:/Code/Demo", "win32")).toBe("c:\\code\\demo");
    expect(normalizeProjectKey("/Home/Example", "darwin")).toBe("/Home/Example");
  });

  it("derives stable native hashes and canonical ids", () => {
    const nativeHash = nativeEventHash(FIXTURE_SALT, "codex", "session#1");
    expect(nativeHash).toMatch(/^ne_[0-9a-f]{32}$/u);
    expect(nativeHash).toBe(nativeEventHash(FIXTURE_SALT, "codex", "session#1"));
    expect(nativeHash).not.toBe(nativeEventHash(FIXTURE_SALT, "codex", "session#2"));
    expect(nativeHash).not.toBe(nativeEventHash(FIXTURE_SALT, "claude-code", "session#1"));
    const id = canonicalEventId("codex", nativeHash);
    expect(id).toMatch(/^ev_[0-9a-f]{24}$/u);
    expect(id).toBe(canonicalEventId("codex", nativeHash));
  });

  it("formats timestamps as canonical ISO UTC", () => {
    expect(isoUtcFromMs(1789601516670)).toBe("2026-09-16T23:31:56.670Z");
    expect(epochMsFromIso("2026-09-16T23:31:56.670Z")).toBe(1789601516670);
    expect(epochMsFromIso("not a timestamp")).toBeUndefined();
    expect(() => isoUtcFromMs(Number.NaN)).toThrow(RangeError);
  });

  it("rejects a timestamp whose calendar date does not exist", () => {
    // Date.parse would roll 2026-02-30 over to 2 March, silently moving a
    // record instead of reporting it as damaged.
    expect(epochMsFromIso("2026-02-30T10:00:00.000Z")).toBeUndefined();
    expect(epochMsFromIso("2026-04-31T00:00:00.000Z")).toBeUndefined();
    expect(epochMsFromIso("2026-13-01T00:00:00.000Z")).toBeUndefined();
    expect(isRealCalendarDate("2026-02-30")).toBe(false);
    expect(isRealCalendarDate("2026-12-31")).toBe(true);
    expect(isRealCalendarDate("2024-02-29")).toBe(true);
    expect(isRealCalendarDate("2026-02-29")).toBe(false);
    // A record whose timestamp is valid is still admitted.
    expect(epochMsFromIso("2026-02-28T10:00:00.000Z")).toBe(Date.parse("2026-02-28T10:00:00.000Z"));
  });

  it("formats source costs as plain decimal strings", () => {
    expect(decimalStringFromNumber(0.42)).toBe("0.42");
    expect(decimalStringFromNumber(0.012345)).toBe("0.012345");
    expect(decimalStringFromNumber(1247.92)).toBe("1247.92");
    expect(decimalStringFromNumber(0)).toBe("0");
    expect(decimalStringFromNumber(1e-7)).toBe("0.0000001");
    expect(decimalStringFromNumber(1e21)).toBe("1000000000000000000000");
    expect(decimalStringFromNumber(0.1 + 0.2)).toBe("0.30000000000000004");
    expect(decimalStringFromNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(decimalStringFromNumber(-1)).toBeUndefined();
  });

  it("clamps fractional digits to the schema envelope", () => {
    const clamped = decimalStringFromNumber(Number.MIN_VALUE);
    expect(clamped).toBeDefined();
    const fraction = clamped?.split(".")[1] ?? "";
    expect(fraction.length).toBeLessThanOrEqual(18);
    expect(decimalStringFromNumber(1e-7)).toBe("0.0000001");
  });

  it("reads an existing salt file that has trailing whitespace", async () => {
    await withTempDir(async (directory) => {
      const env = createFixtureEnvironment({ homeDir: directory });
      await mkdir(`${directory}/.config/stackreplay`, { recursive: true });
      await writeFile(`${directory}/.config/stackreplay/salt`, `${FIXTURE_SALT}\n`);
      expect(await readSalt(env)).toBe(FIXTURE_SALT);
    });
  });
});
