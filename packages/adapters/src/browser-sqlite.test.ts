import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { createOpenCodeAdapter } from "./adapters/opencode.js";
import { type BrowserCandidate, expandZipCandidate, intakeBrowserCandidates } from "./browser.js";
import { openBrowserOpenCode } from "./browser-sqlite.js";
import { COMMAND_CODE_SESSION, OPENCODE_FIXTURE_SQL } from "./fixtures/content.js";
import {
  createFixtureEnvironment,
  createSqliteFixture,
  FIXTURE_SALT,
  fixtureNow,
  syntheticCatalog,
  withTempDir,
} from "./fixtures/helpers.js";
import { createModelMapper } from "./models.js";
import { MAX_BROWSER_DATABASE_BYTES, sqliteSnapshot } from "./sqlite-snapshot.js";

const now = "2026-09-21T12:00:00.000Z";
const options = { now, salt: FIXTURE_SALT };
function candidate(path: string, bytes: Uint8Array): BrowserCandidate {
  return {
    path,
    size: bytes.length,
    lastModified: Date.parse(now),
    text: vi.fn(async () => {
      throw new Error("Database must never be decoded as text");
    }),
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) as ArrayBuffer,
  };
}
async function withDatabase<T>(run: (path: string, bytes: Uint8Array) => Promise<T>) {
  return withTempDir(async (root) => {
    const path = `${root}/opencode.db`;
    await createSqliteFixture(path, [
      ...OPENCODE_FIXTURE_SQL,
      "CREATE TABLE part (text); INSERT INTO part VALUES ('PRIVATE_PROMPT_CANARY');",
      "CREATE TABLE credential (secret); INSERT INTO credential VALUES ('PRIVATE_TOKEN_CANARY');",
    ]);
    return run(path, new Uint8Array(await readFile(path)));
  });
}

describe("OpenCode browser collection parity", () => {
  it("uses the same adapter as native collection, with no billing context or content", async () => {
    await withDatabase(async (path, bytes) => {
      const browser = await intakeBrowserCandidates(
        [candidate("opencode.db", bytes)],
        syntheticCatalog(),
        options,
      );
      const native = await createOpenCodeAdapter().collect(
        createFixtureEnvironment({ homeDir: path.replace(/\/opencode.db$/, "") }),
        {
          now: fixtureNow(),
          salt: FIXTURE_SALT,
          mapper: createModelMapper(syntheticCatalog()),
          roots: [path.replace(/\/opencode.db$/, "")],
        },
      );
      expect(browser.exported?.events).toHaveLength(2);
      const facts = (events: typeof native.events) =>
        events.map(({ occurredAt, model, usage, source, billing }) => ({
          occurredAt,
          model,
          usage,
          adapter: source.adapterId,
          billing,
        }));
      expect(facts(browser.exported?.events ?? [])).toEqual(facts(native.events));
      expect(browser.outcomes[0]).toMatchObject({
        status: "imported",
        source: "OpenCode",
        events: 2,
      });
      expect(JSON.stringify(browser)).not.toMatch(
        /PRIVATE_PROMPT_CANARY|PRIVATE_TOKEN_CANARY|session_id|\/home\/example/u,
      );
    });
  });
  it("reads committed WAL usage, independent of selection order, and includes log bytes in progress", async () => {
    await withDatabase(async (path) => {
      const db = new DatabaseSync(path);
      try {
        db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;");
        db.exec(
          "INSERT INTO message SELECT 'msg_wal', session_id, time_created + 10000, time_updated, data FROM message WHERE id = 'msg_alpha_2';",
        );
        const bytes = new Uint8Array(await readFile(path));
        const wal = new Uint8Array(await readFile(`${path}-wal`));
        const reports: number[] = [];
        const result = await intakeBrowserCandidates(
          [candidate("cli/opencode.db-wal", wal), candidate("cli/opencode.db", bytes)],
          syntheticCatalog(),
          {
            ...options,
            onProgress: (_done, _total, progress) => reports.push(progress.examinedBytes),
          },
        );
        expect(result.exported?.events).toHaveLength(3);
        expect(reports.at(-1)).toBe(bytes.length + wal.length);
        expect(result.outcomes[0]?.status).toBe("companion");
        const mainOnly = await intakeBrowserCandidates(
          [candidate("opencode.db", bytes)],
          syntheticCatalog(),
          options,
        );
        expect(mainOnly.exported?.events).toHaveLength(2);
        expect(mainOnly.warnings.some((warning) => warning.code === "SESSION_PARTIAL")).toBe(true);
        expect(await readFile(path)).toEqual(Buffer.from(bytes));
        expect(await readFile(`${path}-wal`)).toEqual(Buffer.from(wal));
      } finally {
        db.close();
      }
    });
  });
  it("handles a WAL-only schema and ignores uncommitted rows", async () => {
    await withTempDir(async (root) => {
      const path = `${root}/opencode.db`;
      const db = new DatabaseSync(path);
      try {
        db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;");
        for (const statement of OPENCODE_FIXTURE_SQL) db.exec(statement);
        db.exec(
          "PRAGMA cache_size=1; BEGIN; DELETE FROM message; CREATE TABLE pending (payload); INSERT INTO pending VALUES (zeroblob(32768));",
        );
        const result = await intakeBrowserCandidates(
          [
            candidate("opencode.db", await readFile(path)),
            candidate("opencode.db-wal", await readFile(`${path}-wal`)),
          ],
          syntheticCatalog(),
          options,
        );
        expect(result.exported?.events).toHaveLength(2);
      } finally {
        db.close();
      }
    });
  });
  it("supports ZIP and exact duplicate database selections", async () => {
    await withDatabase(async (_path, bytes) => {
      const zip = zipSync({
        "history/opencode.db": bytes,
        "history/auth.json": new TextEncoder().encode("PRIVATE_TOKEN_CANARY"),
      });
      const expanded = await expandZipCandidate(candidate("history.zip", zip));
      const result = await intakeBrowserCandidates(
        [...expanded.candidates, candidate("history/opencode.db", bytes)],
        syntheticCatalog(),
        options,
      );
      expect(result.exported?.events).toHaveLength(2);
      expect(result.outcomes.some((outcome) => outcome.status === "duplicate")).toBe(true);
      expect(JSON.stringify(result)).not.toContain("PRIVATE_TOKEN_CANARY");
    });
  });
  it("reports corrupt or unrelated databases without preventing another tool's scan", async () => {
    const bad = candidate("opencode.db", new TextEncoder().encode("not sqlite"));
    const text = new TextEncoder().encode(COMMAND_CODE_SESSION);
    const result = await intakeBrowserCandidates(
      [bad, { ...candidate("command.jsonl", text), text: async () => COMMAND_CODE_SESSION }],
      syntheticCatalog(),
      options,
    );
    expect(result.outcomes[0]).toMatchObject({
      status: "unreadable",
      source: "OpenCode",
      events: 0,
    });
    expect(
      result.exported?.events.every((event) => event.source.adapterId === "command-code"),
    ).toBe(true);
    await withDatabase(async (_path, bytes) => {
      const db = await openBrowserOpenCode(bytes);
      expect(() => db.all("DELETE FROM message")).toThrow();
      db.close();
    });
  });
  it("refuses oversized inputs before reading, and does not pair WALs from other locations", async () => {
    const big = {
      ...candidate("opencode.db", new Uint8Array()),
      size: MAX_BROWSER_DATABASE_BYTES + 1,
    };
    const read = vi.fn(big.arrayBuffer);
    const result = await intakeBrowserCandidates(
      [{ ...big, arrayBuffer: read }],
      syntheticCatalog(),
      options,
    );
    expect(result.outcomes[0]?.reason).toContain("128 MB");
    expect(read).not.toHaveBeenCalled();
    await withDatabase(async (_path, bytes) => {
      const other = candidate("other/opencode.db-wal", new Uint8Array(1));
      const result = await intakeBrowserCandidates(
        [candidate("first/opencode.db", bytes), other],
        syntheticCatalog(),
        options,
      );
      expect(result.exported?.events).toHaveLength(2);
      expect(result.outcomes[1]?.reason).toContain("together");
    });
  });
});

describe("WAL snapshots", () => {
  it("stops at checksum-invalid or stale trailing frames after a valid commit", async () => {
    await withDatabase(async (path) => {
      const db = new DatabaseSync(path);
      try {
        db.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;");
        db.exec(
          "INSERT INTO message SELECT 'committed', session_id, time_created, time_updated, data FROM message WHERE id='msg_alpha_2';",
        );
        const bytes = new Uint8Array(await readFile(path));
        const wal = new Uint8Array(await readFile(`${path}-wal`));
        const size = new DataView(wal.buffer, wal.byteOffset, wal.byteLength).getUint32(8);
        // Reused logs commonly keep old frames beyond the valid tail. A
        // torn append likewise cannot invalidate an earlier committed image.
        for (const staleSalt of [false, true]) {
          const tail = new Uint8Array(wal.length + 24 + size);
          tail.set(wal);
          tail.set(wal.subarray(32, 32 + 24 + size), wal.length);
          if (staleSalt) tail[wal.length + 8] = (tail[wal.length + 8] ?? 0) ^ 1;
          const snapshot = sqliteSnapshot(bytes, tail);
          expect(snapshot).toEqual(sqliteSnapshot(bytes, wal));
        }
        const damagedHeader = wal.slice();
        damagedHeader[24] = (damagedHeader[24] ?? 0) ^ 1;
        expect(() => sqliteSnapshot(bytes, damagedHeader)).toThrow("checksum");
        const wrongSize = wal.slice();
        new DataView(wrongSize.buffer).setUint32(8, size * 2);
        expect(() => sqliteSnapshot(bytes, wrongSize)).toThrow("format");
      } finally {
        db.close();
      }
    });
  });
  it("rejects invalid headers, mismatched page sizes and header checksums without changing source bytes", async () => {
    await withDatabase(async (_path, bytes) => {
      const before = bytes.slice();
      expect(() => sqliteSnapshot(bytes, new Uint8Array(4))).toThrow("header");
      expect(() => sqliteSnapshot(bytes, new Uint8Array(32))).toThrow("format");
      expect(sqliteSnapshot(bytes)).not.toBe(bytes);
      expect(bytes).toEqual(before);
    });
  });
});
