import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { FileSystem, PlatformId, SourceEnvironment } from "./types.js";

/**
 * Platform path resolution (spec point 76).
 *
 * Every path an adapter reads is derived from an injectable environment, so the
 * Linux, macOS and Windows layouts are unit-testable on any host.
 */

export function toPlatformId(value: string): PlatformId {
  if (value === "darwin" || value === "win32") return value;
  return "linux";
}

function nonEmpty(value: string | undefined): string | undefined {
  return value !== undefined && value.length > 0 ? value : undefined;
}

/** XDG config directory: `~/.config` on Linux, `~/Library/Application Support` on macOS, `%APPDATA%` on Windows. */
export function configHome(env: SourceEnvironment): string {
  const explicit = nonEmpty(env.env.XDG_CONFIG_HOME);
  if (env.platform === "win32") {
    return nonEmpty(env.env.APPDATA) ?? joinPath(env.platform, env.homeDir, "AppData", "Roaming");
  }
  if (env.platform === "darwin") {
    return joinPath(env.platform, env.homeDir, "Library", "Application Support");
  }
  return explicit ?? joinPath(env.platform, env.homeDir, ".config");
}

/** XDG data directory: `~/.local/share` on Linux, `~/Library/Application Support` on macOS, `%LOCALAPPDATA%` on Windows. */
export function dataHome(env: SourceEnvironment): string {
  const explicit = nonEmpty(env.env.XDG_DATA_HOME);
  if (env.platform === "win32") {
    return (
      nonEmpty(env.env.LOCALAPPDATA) ?? joinPath(env.platform, env.homeDir, "AppData", "Local")
    );
  }
  if (env.platform === "darwin") {
    return joinPath(env.platform, env.homeDir, "Library", "Application Support");
  }
  return explicit ?? joinPath(env.platform, env.homeDir, ".local", "share");
}

export function joinPath(platform: PlatformId, ...parts: string[]): string {
  const separator = platform === "win32" ? "\\" : "/";
  const cleaned = parts.filter((part) => part.length > 0);
  return cleaned
    .map((part, index) => {
      const trimmed = part.replace(/[\\/]+$/u, "");
      if (index === 0) return trimmed;
      return trimmed.replace(/^[\\/]+/u, "");
    })
    .join(separator);
}

/** Per-user StackReplay state directory (salt, local caches). */
export function stackReplayStateDir(env: SourceEnvironment): string {
  return joinPath(env.platform, configHome(env), "stackreplay");
}

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
