import { type StackReplayExportV1, stackReplayExportV1Schema } from "@stackreplay/schema";
import type { SafeError } from "./worker-protocol";

/**
 * Import validation (M3 brief).
 *
 * The filename is a hint, never a security boundary: a valid export with an
 * odd name is accepted, and a file named `.stackreplay.json` that is not one is
 * rejected. Validation is structural, and every failure becomes a display-safe
 * error: no raw JSON, no file content, no local paths, no parser excerpts.
 */

/**
 * Practical upper bound, documented rather than arbitrary: the observed real
 * workload is ~100 MB / ~97k events, so the limit sits comfortably above it
 * (5x) and still refuses a file no browser can hold in memory.
 */
export const MAX_IMPORT_BYTES = 512 * 1024 * 1024;

/**
 * Where a working browser starts to struggle, as opposed to where the import is
 * refused (benchmark finding F008).
 *
 * The refusal point above cannot bound *memory*: the file is read as text and
 * then parsed, so peak usage is a multiple of the file size, and the browser
 * usually throws a `RangeError` before a file near the ceiling is fully parsed.
 * That is why there are two thresholds: above this one the interface says what is
 * about to happen, and a browser that nevertheless runs out of memory reports
 * exactly that instead of a generic failure.
 */
export const IMPORT_COMFORT_BYTES = 128 * 1024 * 1024;

export const MAX_REPORTED_ISSUES = 8;

export type ImportSizeAdvice =
  | { level: "ok" }
  | { level: "large"; message: string }
  | { level: "refused"; message: string; readableSize: string; readableLimit: string };

function readableBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** What to say about a file of this size, before any work is attempted. */
export function importSizeAdvice(size: number): ImportSizeAdvice {
  if (size > MAX_IMPORT_BYTES) {
    return {
      level: "refused",
      message: `The file is ${readableBytes(size)}; the browser limit is ${readableBytes(MAX_IMPORT_BYTES)}.`,
      readableSize: readableBytes(size),
      readableLimit: readableBytes(MAX_IMPORT_BYTES),
    };
  }
  if (size > IMPORT_COMFORT_BYTES) {
    return {
      level: "large",
      message: `This file is ${readableBytes(size)}. It is within the import limit, but a browser needs several times that size in free memory to read and parse it, so this may fail on a busy machine. A narrower export is safer.`,
    };
  }
  return { level: "ok" };
}

export type ValidationResult =
  | { ok: true; exported: StackReplayExportV1 }
  | { ok: false; error: SafeError };

function error(
  code: SafeError["code"],
  title: string,
  message: string,
  hint?: string,
  details?: string[],
): ValidationResult {
  return {
    ok: false,
    error: {
      code,
      title,
      message,
      ...(hint !== undefined ? { hint } : {}),
      ...(details !== undefined ? { details } : {}),
    },
  };
}

/** Reads the format and version fields without trusting anything else. */
function peekEnvelope(value: unknown): { format?: unknown; version?: unknown } {
  if (typeof value !== "object" || value === null) return {};
  const record = value as { format?: unknown; version?: unknown };
  return { format: record.format, version: record.version };
}

/**
 * Validates already-parsed JSON. Kept separate from parsing so it can be unit
 * tested without a File or a browser.
 */
export function validateExportValue(value: unknown, supportedVersion = 1): ValidationResult {
  const envelope = peekEnvelope(value);
  if (envelope.format !== "stackreplay") {
    return error(
      "NOT_STACKREPLAY",
      "This file is not a valid StackReplay export.",
      "The file is valid JSON but it is not a StackReplay export.",
      "Create one with `stackreplay export --out usage.json` in the CLI, or try the demo workload.",
    );
  }
  if (typeof envelope.version === "number" && envelope.version > supportedVersion) {
    return error(
      "UNSUPPORTED_VERSION",
      `StackReplay export version ${envelope.version} is newer than this app supports.`,
      `This app reads export format version ${supportedVersion}.`,
      "Update StackReplay, or re-export with a version this app understands.",
    );
  }

  const redaction = (value as { redactionReport?: Record<string, unknown> }).redactionReport;
  if (redaction !== undefined) {
    const claimed = Object.entries(redaction).filter(([, included]) => included === true);
    if (claimed.length > 0) {
      return error(
        "REDACTION_VIOLATION",
        "This file claims to contain more than usage metadata.",
        `The export's redaction report marks ${claimed.map(([key]) => key).join(", ")} as included.`,
        "StackReplay only imports sanitized usage exports. Do not import a file that contains prompts, responses or code.",
      );
    }
  }

  const parsed = stackReplayExportV1Schema.safeParse(value);
  if (!parsed.success) {
    const details = parsed.error.issues.slice(0, MAX_REPORTED_ISSUES).map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "document";
      return `${path}: ${describeIssue(issue.code)}`;
    });
    const total = parsed.error.issues.length;
    return error(
      "SCHEMA_INVALID",
      "This file is not a valid StackReplay export.",
      `${total} structural problem${total === 1 ? "" : "s"} found.`,
      "Re-export the workload with a matching StackReplay version.",
      details,
    );
  }

  if (parsed.data.events.length === 0) {
    return error(
      "EMPTY_WORKLOAD",
      "This export contains no events.",
      "There is nothing to replay in this file.",
      "Re-export with a wider date range, or try the demo workload.",
    );
  }
  return { ok: true, exported: parsed.data };
}

/** Content-free description of a structural problem. */
function describeIssue(code: string): string {
  switch (code) {
    case "invalid_type":
      return "unexpected value type";
    case "invalid_literal":
    case "invalid_value":
      return "unexpected value";
    case "unrecognized_keys":
      return "unexpected extra field";
    case "too_small":
      return "value below the allowed minimum";
    case "too_big":
      return "value above the allowed maximum";
    case "invalid_format":
    case "invalid_string":
      return "malformed value";
    default:
      return "failed validation";
  }
}

/** Full text path: parse, then validate. */
export function validateExportText(text: string, supportedVersion = 1): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return error(
      "NOT_JSON",
      "This file is not a valid StackReplay export.",
      "The file is not valid JSON.",
      "Pick the `.stackreplay.json` file produced by `stackreplay export`.",
    );
  }
  return validateExportValue(parsed, supportedVersion);
}
