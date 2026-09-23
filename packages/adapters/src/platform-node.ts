import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { FileSystem } from "./types.js";

export function createNodeFileSystem(): FileSystem {
  return {
    async exists(path: string): Promise<boolean> {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
    async stat(path: string) {
      try {
        const info = await stat(path);
        if (info.isDirectory())
          return { kind: "directory" as const, size: 0, mtimeMs: info.mtimeMs };
        if (info.isFile()) return { kind: "file" as const, size: info.size, mtimeMs: info.mtimeMs };
        return null;
      } catch {
        return null;
      }
    },
    async listDir(path: string): Promise<string[]> {
      try {
        const entries = await readdir(path, { withFileTypes: true });
        return entries.map((entry) => entry.name).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      } catch {
        return [];
      }
    },
    async readTextFile(path: string, maxBytes?: number): Promise<string> {
      const buffer = await readFile(path);
      const limited =
        maxBytes !== undefined && buffer.byteLength > maxBytes
          ? buffer.subarray(0, maxBytes)
          : buffer;
      return limited.toString("utf8");
    },
    async *readLines(path: string, maxBytes?: number): AsyncIterable<string> {
      const stream = createReadStream(path, maxBytes !== undefined ? { end: maxBytes - 1 } : {});
      const lines = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });
      try {
        for await (const line of lines) {
          if (line.trim().length > 0) yield line;
        }
      } finally {
        lines.close();
        stream.close();
      }
    },
  };
}
