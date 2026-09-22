import { canonicalStringify } from "./canonical.js";
import {
  assertNoForbiddenFields,
  findForbiddenFields,
  SHARE_SNAPSHOT_VERSION,
  type ShareReplaySnapshotV1,
  shareReplaySnapshotV1Schema,
} from "./schema.js";

/**
 * Stateless share tokens (M4, decision 32).
 *
 * A share link is `/s/<token>` and the token carries the snapshot itself:
 *
 *   <version>.<checksum>.<payload>
 *
 * where payload is base64url(DEFLATE-RAW(canonical JSON)) and checksum is a
 * truncated SHA-256 of the canonical bytes. No database, no account, no server
 * storage, and nothing that is not already public by design.
 *
 * Encoding is not encryption. The snapshot is the only thing that ever enters a
 * token, and decoding treats a token as hostile input: version, checksum, byte
 * length, decompressed size, JSON depth, string lengths and list sizes are all
 * bounded before anything is rendered.
 */

export const SHARE_TOKEN_VERSION = `${SHARE_SNAPSHOT_VERSION}` as const;
export const MAX_SHARE_TOKEN_LENGTH = 8192;
export const MAX_SHARE_DECOMPRESSED_BYTES = 65536;
export const MAX_SHARE_JSON_DEPTH = 10;
export const MAX_SHARE_STRING_LENGTH = 512;
export const MAX_SHARE_ARRAY_LENGTH = 64;
export const SHARE_CHECKSUM_BYTES = 9;

export type ShareTokenErrorCode =
  | "SHARE_TOKEN_MALFORMED"
  | "SHARE_TOKEN_UNSUPPORTED_VERSION"
  | "SHARE_TOKEN_TOO_LONG"
  | "SHARE_TOKEN_TOO_LARGE"
  | "SHARE_TOKEN_CHECKSUM_MISMATCH"
  | "SHARE_TOKEN_INVALID_SNAPSHOT"
  | "SHARE_TOKEN_FORBIDDEN_FIELD"
  | "SHARE_TOKEN_COMPRESSION_UNAVAILABLE";

export class ShareTokenError extends Error {
  readonly code: ShareTokenErrorCode;

  constructor(code: ShareTokenErrorCode, message: string) {
    super(message);
    this.name = "ShareTokenError";
    this.code = code;
  }
}

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Base64url without padding, implemented directly so every runtime agrees. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += BASE64URL_ALPHABET[first >> 2];
    output += BASE64URL_ALPHABET[((first & 0b11) << 4) | ((second ?? 0) >> 4)];
    if (second === undefined) break;
    output += BASE64URL_ALPHABET[((second & 0b1111) << 2) | ((third ?? 0) >> 6)];
    if (third === undefined) break;
    output += BASE64URL_ALPHABET[third & 0b111111];
  }
  return output;
}

export function base64UrlDecode(text: string): Uint8Array {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of text) {
    const value = BASE64URL_ALPHABET.indexOf(character);
    if (value === -1) {
      throw new ShareTokenError("SHARE_TOKEN_MALFORMED", "Share token is not valid base64url.");
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw new ShareTokenError(
      "SHARE_TOKEN_COMPRESSION_UNAVAILABLE",
      "SHA-256 is unavailable in this runtime.",
    );
  }
  const digest = await subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return new Uint8Array(digest);
}

async function checksumOf(canonicalBytes: Uint8Array): Promise<string> {
  const digest = await sha256(canonicalBytes);
  return base64UrlEncode(digest.slice(0, SHARE_CHECKSUM_BYTES));
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    throw new ShareTokenError(
      "SHARE_TOKEN_COMPRESSION_UNAVAILABLE",
      "This runtime has no CompressionStream.",
    );
  }
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Bounded decompression: a crafted token cannot become a decompression bomb. */
async function inflateBounded(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new ShareTokenError(
      "SHARE_TOKEN_COMPRESSION_UNAVAILABLE",
      "This runtime has no DecompressionStream.",
    );
  }
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done === true) break;
      if (value === undefined) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new ShareTokenError(
          "SHARE_TOKEN_TOO_LARGE",
          "Share token expands beyond the supported size.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function assertBoundedShape(value: unknown, depth = 0, path = "$"): void {
  if (depth > MAX_SHARE_JSON_DEPTH) {
    throw new ShareTokenError("SHARE_TOKEN_INVALID_SNAPSHOT", `Share token is too deeply nested.`);
  }
  if (typeof value === "string") {
    if (value.length > MAX_SHARE_STRING_LENGTH) {
      throw new ShareTokenError(
        "SHARE_TOKEN_INVALID_SNAPSHOT",
        `Share token string at ${path} is too long.`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_SHARE_ARRAY_LENGTH) {
      throw new ShareTokenError(
        "SHARE_TOKEN_INVALID_SNAPSHOT",
        `Share token list at ${path} is too long.`,
      );
    }
    value.forEach((entry, index) => {
      assertBoundedShape(entry, depth + 1, `${path}[${index}]`);
    });
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertBoundedShape(entry, depth + 1, `${path}.${key}`);
    }
  }
}

/** Encodes a snapshot into a public share token. Deterministic per snapshot. */
export async function encodeShareToken(snapshot: ShareReplaySnapshotV1): Promise<string> {
  assertNoForbiddenFields(snapshot);
  const parsed = shareReplaySnapshotV1Schema.parse(snapshot);
  const canonical = canonicalStringify(parsed as never);
  return encodeShareTokenFromCanonical(canonical);
}

/**
 * Low-level token constructor: wraps an already-canonical JSON document into a
 * versioned, checksummed, compressed token without validating it.
 *
 * Used by tests and tooling to build hostile inputs (an oversized payload, a
 * forbidden field, a corrupted checksum). Callers that handle a real snapshot
 * must use `encodeShareToken`, which validates and guards first.
 */
export async function encodeShareTokenFromCanonical(canonical: string): Promise<string> {
  const canonicalBytes = new TextEncoder().encode(canonical);
  const checksum = await checksumOf(canonicalBytes);
  const payload = base64UrlEncode(await deflate(canonicalBytes));
  const token = `${SHARE_TOKEN_VERSION}.${checksum}.${payload}`;
  if (token.length > MAX_SHARE_TOKEN_LENGTH) {
    throw new ShareTokenError("SHARE_TOKEN_TOO_LONG", "Share token exceeds the supported length.");
  }
  return token;
}

export type ShareTokenResult =
  | { ok: true; snapshot: ShareReplaySnapshotV1; canonical: string }
  | { ok: false; code: ShareTokenErrorCode; message: string };

/** Decodes a share token, validating everything before returning a snapshot. */
export async function decodeShareToken(token: string): Promise<ShareTokenResult> {
  try {
    return { ok: true, ...(await decodeShareTokenOrThrow(token)) };
  } catch (error) {
    if (error instanceof ShareTokenError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return {
      ok: false,
      code: "SHARE_TOKEN_MALFORMED",
      message: "Share token could not be read.",
    };
  }
}

export async function decodeShareTokenOrThrow(
  token: string,
): Promise<{ snapshot: ShareReplaySnapshotV1; canonical: string }> {
  if (token.length > MAX_SHARE_TOKEN_LENGTH) {
    throw new ShareTokenError("SHARE_TOKEN_TOO_LONG", "Share token exceeds the supported length.");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new ShareTokenError("SHARE_TOKEN_MALFORMED", "Share token has an unexpected shape.");
  }
  const [version, checksum, payload] = parts as [string, string, string];
  if (version !== SHARE_TOKEN_VERSION) {
    throw new ShareTokenError(
      "SHARE_TOKEN_UNSUPPORTED_VERSION",
      `Share token version ${version} is not supported.`,
    );
  }
  const compressed = base64UrlDecode(payload);
  const decompressed = await inflateBounded(compressed, MAX_SHARE_DECOMPRESSED_BYTES);
  const canonical = new TextDecoder().decode(decompressed);
  const expected = await checksumOf(new TextEncoder().encode(canonical));
  if (expected !== checksum) {
    throw new ShareTokenError(
      "SHARE_TOKEN_CHECKSUM_MISMATCH",
      "Share token failed its integrity check.",
    );
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(canonical);
  } catch {
    throw new ShareTokenError("SHARE_TOKEN_MALFORMED", "Share token is not valid JSON.");
  }
  assertBoundedShape(parsedJson);
  const forbidden = findForbiddenFields(parsedJson);
  if (forbidden.length > 0) {
    throw new ShareTokenError(
      "SHARE_TOKEN_FORBIDDEN_FIELD",
      "Share token carries a field that must never be public.",
    );
  }
  const parsed = shareReplaySnapshotV1Schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ShareTokenError(
      "SHARE_TOKEN_INVALID_SNAPSHOT",
      "Share token does not describe a valid share snapshot.",
    );
  }
  return { snapshot: parsed.data, canonical };
}

/** Public share path for a token. */
export function sharePath(token: string): string {
  return `/s/${token}`;
}
