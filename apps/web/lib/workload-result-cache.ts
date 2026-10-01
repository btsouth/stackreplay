import type { StackReplayExportV1 } from "@stackreplay/schema";
import * as storage from "./idb";
import { importRecordSchema } from "./local-record-schema";
import type { ImportRecord } from "./worker-protocol";

// Injected from producer sources and built dependencies, not a hand-maintained
// version. Changing the engine, catalog, worker or analysis invalidates results.
declare const __WORKLOAD_CACHE_BUILD__: string;
const build = typeof __WORKLOAD_CACHE_BUILD__ === "string" ? __WORKLOAD_CACHE_BUILD__ : "test";
export const RESULT_CACHE_MAX_BYTES = 4 * 1024 * 1024;
const fingerprints = new WeakMap<StackReplayExportV1, Promise<string>>();

async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Integrity check for accidental storage damage, not authentication. */
export async function encodeCachedResult(key: string, value: unknown) {
  const json = JSON.stringify(value);
  if (json === undefined || json.length > RESULT_CACHE_MAX_BYTES) return undefined;
  return { json, digest: await digest(`${key}\u0000${json}`) };
}

export async function decodeCachedResult<T>(key: string, value: unknown): Promise<T | undefined> {
  if (typeof value !== "object" || value === null) return undefined;
  const envelope = value as { json?: unknown; digest?: unknown };
  if (
    typeof envelope.json !== "string" ||
    envelope.json.length > RESULT_CACHE_MAX_BYTES ||
    typeof envelope.digest !== "string" ||
    !/^[0-9a-f]{64}$/u.test(envelope.digest)
  )
    return undefined;
  try {
    if ((await digest(`${key}\u0000${envelope.json}`)) !== envelope.digest) return undefined;
    return JSON.parse(envelope.json) as T;
  } catch {
    return undefined;
  }
}

/** Only called AFTER the canonical payload has been loaded and validated. */
export async function cachedWorkloadResult<T>(
  exported: StackReplayExportV1,
  record: ImportRecord | undefined,
  kind: string,
  options: unknown,
  compute: () => T | Promise<T>,
  current: () => boolean = () => true,
): Promise<T> {
  let key: string | undefined;
  const generation = storage.localStoreGeneration();
  try {
    if (record && record.savedLocally !== false) {
      let fingerprint = fingerprints.get(exported);
      if (!fingerprint) {
        fingerprint = digest(JSON.stringify(exported));
        fingerprints.set(exported, fingerprint);
        fingerprint.catch(() => fingerprints.delete(exported));
      }
      key = await digest(
        JSON.stringify([build, await fingerprint, importRecordSchema.parse(record), kind, options]),
      );
      const cached = await decodeCachedResult<T>(key, await storage.loadWorkloadResult(key));
      if (cached !== undefined && current()) return cached;
    }
  } catch {
    // This is an optional acceleration. Unavailable/quota-limited storage or
    // WebCrypto never makes the workload itself unavailable.
  }
  const value = await compute();
  if (key && record && current()) {
    try {
      const encoded = await encodeCachedResult(key, value);
      if (encoded && current()) await storage.saveWorkloadResult(key, record, encoded, generation);
    } catch {
      // Keep the freshly computed value, even when caching is unavailable.
    }
  }
  return value;
}
