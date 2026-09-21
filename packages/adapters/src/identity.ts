import { createHash, createHmac, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { isRealCalendarDate } from "./parse.js";
import { joinPath, stackReplayStateDir } from "./platform.js";
import type { AdapterId, SourceEnvironment } from "./types.js";

/**
 * Identity and hashing (spec points 17, 18, 29).
 *
 * Project identity is a salted hash: the salt never leaves the machine, so an
 * exported project hash cannot be reversed or matched against a dictionary of
 * repository names. Native session and event identities are hashed the same
 * way, which keeps deduplication stable across rescans without exporting raw
 * session identifiers.
 */

const SALT_BYTES = 32;
const HASH_HEX_LENGTH = 32;

export function generateSalt(): string {
  return randomBytes(SALT_BYTES).toString("hex");
}

export function saltFilePath(env: SourceEnvironment): string {
  return joinPath(env.platform, stackReplayStateDir(env), "salt");
}

/** Reads the local salt. Returns undefined when none has been created yet. */
export async function readSalt(env: SourceEnvironment): Promise<string | undefined> {
  try {
    const value = (await readFile(saltFilePath(env), "utf8")).trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the local salt, creating it on first use. The file is written with
 * owner-only permissions; it is local state and is never part of an export.
 */
export async function ensureSalt(env: SourceEnvironment): Promise<string> {
  const existing = await readSalt(env);
  if (existing !== undefined) return existing;
  const directory = stackReplayStateDir(env);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const salt = generateSalt();
  const path = saltFilePath(env);
  await writeFile(path, `${salt}\n`, { mode: 0o600 });
  await chmod(path, 0o600).catch(() => undefined);
  return salt;
}

function hmac(salt: string, purpose: string, value: string): string {
  return createHmac("sha256", salt)
    .update(purpose)
    .update("\u0000")
    .update(value)
    .digest("hex")
    .slice(0, HASH_HEX_LENGTH);
}

/**
 * Normalizes a project path for hashing. Windows paths are case-insensitive
 * and both separators are accepted; trailing separators are dropped so that
 * `~/code/app` and `~/code/app/` hash identically.
 */
export function normalizeProjectKey(raw: string, platform: SourceEnvironment["platform"]): string {
  let value = raw.trim();
  if (value.length === 0) return value;
  value = value.replace(/[\\/]+$/u, "");
  if (value.length === 0) value = raw.trim();
  if (platform === "win32") value = value.replace(/\//gu, "\\").toLowerCase();
  return value;
}

export function projectHash(salt: string, projectKey: string): string {
  return `ph_${hmac(salt, "project", projectKey)}`;
}

export function nativeSessionHash(salt: string, sessionId: string): string {
  return `ns_${hmac(salt, "session", sessionId)}`;
}

export function nativeEventHash(salt: string, adapterId: AdapterId, identity: string): string {
  return `ne_${hmac(salt, `event:${adapterId}`, identity)}`;
}

/** Stable canonical event id derived from the adapter and native identity. */
export function canonicalEventId(adapterId: AdapterId, nativeHash: string): string {
  return `ev_${createHash("sha256").update(adapterId).update("\u0000").update(nativeHash).digest("hex").slice(0, 24)}`;
}

/** Canonical ISO-8601 UTC timestamp with millisecond precision. */
export function isoUtcFromMs(ms: number): string {
  if (!Number.isFinite(ms)) throw new RangeError("timestamp is not finite");
  const date = new Date(ms);
  if (Number.isNaN(date.getTime()))
    throw new RangeError("timestamp is outside the supported range");
  return date.toISOString();
}

/**
 * Parses an ISO timestamp to epoch milliseconds; undefined when unusable.
 *
 * A timestamp whose calendar date does not exist (`2026-02-30`) is rejected
 * rather than rolled forward by `Date.parse`, so a damaged record is reported
 * as invalid instead of being admitted as a different, plausible instant
 * (decision 11).
 */
export function epochMsFromIso(value: string): number | undefined {
  if (!isRealCalendarDate(value)) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Formats a JavaScript number as a decimal string without exponential
 * notation. Source files store costs as JSON numbers, and the canonical
 * schemas require decimal strings.
 *
 * The shortest round-tripping form is used (`String(value)`), so a value that
 * the source wrote as 0.42 becomes "0.42" and not an artefact of binary
 * floating point. Exponential forms are expanded into plain digits, and a
 * value with more than 18 fractional digits is clamped to the schema's
 * fractional envelope.
 */
export function decimalStringFromNumber(value: number): string | undefined {
  if (!Number.isFinite(value) || value < 0) return undefined;
  const shortest = String(value);
  let digits: string;
  if (/e/iu.test(shortest)) {
    digits = expandExponential(shortest);
  } else {
    digits = shortest;
  }
  const dot = digits.indexOf(".");
  if (dot !== -1 && digits.length - dot - 1 > MAX_FRACTIONAL_DIGITS) {
    digits = value.toFixed(MAX_FRACTIONAL_DIGITS);
    digits = digits.replace(/0+$/u, "");
    if (digits.endsWith(".")) digits = digits.slice(0, -1);
  }
  return digits.length === 0 ? "0" : digits;
}

const MAX_FRACTIONAL_DIGITS = 18;

/** Expands "1e-7" and similar forms into plain decimal digits. */
function expandExponential(text: string): string {
  const match = /^(\d+)(?:\.(\d+))?e([+-]?\d+)$/u.exec(text);
  if (match === null) return text;
  const [, whole = "", fraction = "", exponentText = "0"] = match;
  const exponent = Number.parseInt(exponentText, 10);
  const combined = `${whole}${fraction}`;
  const pointIndex = whole.length + exponent;
  if (pointIndex <= 0) {
    return `0.${"0".repeat(-pointIndex)}${combined}`;
  }
  if (pointIndex >= combined.length) {
    return `${combined}${"0".repeat(pointIndex - combined.length)}`;
  }
  return `${combined.slice(0, pointIndex)}.${combined.slice(pointIndex)}`;
}
