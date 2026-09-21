import { compareStrings } from "./parse.js";
import type { CollectOptions, SourceEnvironment } from "./types.js";

/**
 * File discovery helpers shared by the file-based adapters.
 *
 * Scans are bounded (file count and bytes per file) so a very large history
 * degrades into a reported truncation instead of an unbounded read.
 */

export const DEFAULT_MAX_FILES = 20000;
export const DEFAULT_MAX_FILE_BYTES = 256 * 1024 * 1024;

export function effectiveMaxFiles(options: CollectOptions): number {
  return options.maxFiles ?? DEFAULT_MAX_FILES;
}

export function effectiveMaxFileBytes(options: CollectOptions): number {
  return options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
}

/** Recursively lists files under a root, sorted for deterministic scans. */
export async function listFilesRecursive(
  env: SourceEnvironment,
  root: string,
  options: { maxDepth: number; extension?: string },
): Promise<string[]> {
  const found: string[] = [];
  const visit = async (directory: string, depth: number): Promise<void> => {
    if (depth > options.maxDepth) return;
    const entries = await env.fs.listDir(directory);
    for (const entry of entries) {
      const path = `${directory}${separator(env)}${entry}`;
      const info = await env.fs.stat(path);
      if (info === null) continue;
      if (info.kind === "directory") {
        await visit(path, depth + 1);
        continue;
      }
      if (options.extension === undefined || path.endsWith(options.extension)) found.push(path);
    }
  };
  const info = await env.fs.stat(root);
  if (info === null || info.kind !== "directory") return [];
  await visit(root, 1);
  return found.sort(compareStrings);
}

export function separator(env: SourceEnvironment): string {
  return env.platform === "win32" ? "\\" : "/";
}

export function baseName(env: SourceEnvironment, path: string): string {
  const separatorChar = separator(env);
  const index = path.lastIndexOf(separatorChar);
  return index === -1 ? path : path.slice(index + 1);
}

export function dirName(env: SourceEnvironment, path: string): string {
  const separatorChar = separator(env);
  const index = path.lastIndexOf(separatorChar);
  return index === -1 ? path : path.slice(0, index);
}

/**
 * Whether an event timestamp falls inside the requested window. `since` is
 * inclusive and `until` is exclusive, so adjacent windows never overlap.
 */
export function inWindow(occurredAtMs: number, options: CollectOptions): boolean {
  if (options.since !== undefined) {
    const sinceMs = Date.parse(options.since);
    if (!Number.isNaN(sinceMs) && occurredAtMs < sinceMs) return false;
  }
  if (options.until !== undefined) {
    const untilMs = Date.parse(options.until);
    if (!Number.isNaN(untilMs) && occurredAtMs >= untilMs) return false;
  }
  return true;
}

/**
 * A file whose last modification predates `since` cannot contain events inside
 * the window, so it is skipped without being read.
 */
export function filePredatesWindow(mtimeMs: number, options: CollectOptions): boolean {
  if (options.since === undefined) return false;
  const sinceMs = Date.parse(options.since);
  if (Number.isNaN(sinceMs)) return false;
  return mtimeMs < sinceMs;
}
