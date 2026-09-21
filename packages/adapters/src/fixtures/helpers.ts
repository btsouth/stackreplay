import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { CatalogV1 } from "@stackreplay/catalog";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import { createNodeFileSystem, type SourceEnvironment } from "../index.js";
import type { FileSystem, PlatformId } from "../types.js";

/**
 * Test helpers.
 *
 * Fixtures are synthetic and structurally identical to the real sources, but
 * every value in them is invented: no user data, paths or session ids from a
 * real machine appear in a fixture or in a test expectation.
 */

export const FIXTURE_SALT = "0000000000000000000000000000000000000000000000000000000000000001";

export async function withTempDir<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "stackreplay-adapters-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function writeFixture(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export function createFixtureEnvironment(options: {
  homeDir: string;
  platform?: PlatformId;
  env?: Record<string, string | undefined>;
  inputFile?: string;
  fs?: FileSystem;
}): SourceEnvironment {
  return {
    platform: options.platform ?? "linux",
    homeDir: options.homeDir,
    env: options.env ?? {},
    fs: options.fs ?? createNodeFileSystem(),
    ...(options.inputFile !== undefined ? { inputFile: options.inputFile } : {}),
  };
}

/** In-memory filesystem for platform-path tests, where no real files exist. */
export function createMemoryFileSystem(
  files: Record<string, string> = {},
): FileSystem & { files: Map<string, string> } {
  const store = new Map<string, string>(Object.entries(files));
  const directories = new Set<string>();
  for (const path of store.keys()) {
    const parts = path.split(/[\\/]/u);
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }
  const normalize = (path: string): string => path.replace(/\\/gu, "/").replace(/\/+$/u, "");
  return {
    files: store,
    async exists(path: string): Promise<boolean> {
      const key = normalize(path);
      return store.has(key) || directories.has(key);
    },
    async stat(path: string) {
      const key = normalize(path);
      if (store.has(key)) {
        return { kind: "file" as const, size: store.get(key)?.length ?? 0, mtimeMs: 0 };
      }
      if (directories.has(key)) return { kind: "directory" as const, size: 0, mtimeMs: 0 };
      return null;
    },
    async listDir(path: string): Promise<string[]> {
      const key = normalize(path);
      const names = new Set<string>();
      for (const candidate of [...store.keys(), ...directories]) {
        const normalized = normalize(candidate);
        if (!normalized.startsWith(`${key}/`)) continue;
        const rest = normalized.slice(key.length + 1);
        const [first] = rest.split("/");
        if (first !== undefined && first.length > 0) names.add(first);
      }
      return [...names].sort();
    },
    async readTextFile(path: string): Promise<string> {
      return store.get(normalize(path)) ?? "";
    },
    async *readLines(path: string): AsyncIterable<string> {
      const content = store.get(normalize(path)) ?? "";
      for (const line of content.split("\n")) {
        if (line.trim().length > 0) yield line;
      }
    },
  };
}

let cachedCatalog: CatalogV1 | undefined;

/** The bundled synthetic catalog, shared across tests. */
export function syntheticCatalog(): CatalogV1 {
  cachedCatalog ??= loadDefaultCatalog();
  return cachedCatalog;
}

export function fixtureNow(): Date {
  return new Date("2026-09-21T12:00:00.000Z");
}

/** Creates a SQLite fixture database from raw statements. */
export async function createSqliteFixture(path: string, statements: string[]): Promise<void> {
  const { DatabaseSync } = (await import("node:sqlite")) as unknown as {
    DatabaseSync: new (
      path: string,
    ) => {
      exec(sql: string): void;
      close(): void;
    };
  };
  await mkdir(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  for (const statement of statements) db.exec(statement);
  db.close();
}
