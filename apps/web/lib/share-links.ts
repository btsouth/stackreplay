import {
  base64UrlEncode,
  decodeAnyShareToken,
  encodeShareTokenV2,
  MAX_SHARE_TOKEN_LENGTH,
  type ShareSnapshotV2,
} from "@stackreplay/share";
import { z } from "zod";

/**
 * Short public share links.
 *
 * A self-contained link (`/s/<token>`) carries the whole snapshot in its URL,
 * which makes it far too long to paste anywhere. A short link (`/s/<id>`)
 * points at a stored copy of the same thing: the canonical V2 share token the
 * browser already builds. Nothing else is stored, and nothing is stored until
 * the person chooses Create share link.
 *
 * The server never trusts what it is sent. A token is decoded with the same
 * bounded, checksummed, strict-schema reader the public page uses, refused if
 * it is not a V2 snapshot, checked for anything that looks like a local path
 * or file, and re-encoded from the parsed snapshot so the stored copy is the
 * canonical encoding and nothing else. Raw history, prompts, responses, code,
 * paths, project names and session or call records have no field in the V2
 * schema, so they cannot pass.
 */

/** 128 random bits: not sequential, not guessable, and not derived from content. */
export const SHARE_ID_BYTES = 16;
export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/u;
export const SHARE_LINK_RECORD_VERSION = 1;
/** A V2 token is about 1 KB; the request carries one token and nothing else. */
export const MAX_SHARE_REQUEST_BYTES = MAX_SHARE_TOKEN_LENGTH + 64;

/** The one thing a short link stores. */
export interface ShareLinkRecordV1 {
  version: typeof SHARE_LINK_RECORD_VERSION;
  /** The canonical V2 share token: the sanitized snapshot, as a self-contained link carries it. */
  token: string;
  createdAt: string;
}

const shareLinkRecordSchema = z.strictObject({
  version: z.literal(SHARE_LINK_RECORD_VERSION),
  token: z.string().min(1).max(MAX_SHARE_TOKEN_LENGTH),
  createdAt: z.iso.datetime(),
});

const createRequestSchema = z.strictObject({
  token: z.string().min(1).max(MAX_SHARE_TOKEN_LENGTH),
});

/** Where short links live: a Workers KV namespace in production. */
export interface ShareLinkStore {
  get(id: string): Promise<string | null>;
  put(id: string, value: string): Promise<void>;
}

export function newShareId(
  random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  return base64UrlEncode(random(new Uint8Array(SHARE_ID_BYTES)));
}

/**
 * A short-link id, as opposed to a self-contained token: tokens always contain
 * dots (`<version>.<checksum>.<payload>`) and are far longer than 22 characters.
 */
export function isShareId(value: string): boolean {
  return SHARE_ID_PATTERN.test(value);
}

const LOCAL_PATH =
  /(^|[\s"'(])(~[/\\]|\.{1,2}[/\\]|\/(home|Users|root|tmp|var|etc|opt|mnt|data|private)\/|[A-Za-z]:\\)|\\Users\\|\/\.claude\/|\/\.codex\//u;
const FILE_NAME =
  /\.(jsonl|json|ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|java|kt|swift|c|cc|cpp|h|md|txt|log|zip|sqlite|db|env|pem|key)$/iu;

/**
 * Defense in depth over the schema: no stored string may look like a local
 * path or a file name. Source links are catalog URLs and are checked as URLs
 * by the schema, so they are the one place a slash-bearing string belongs.
 */
export function privateLookingStrings(snapshot: ShareSnapshotV2): string[] {
  const found: string[] = [];
  const visit = (value: unknown, key: string | undefined, parent: string | undefined) => {
    if (typeof value === "string") {
      const isSourceUrl = key === "url" && parent === "sources";
      if (!isSourceUrl && (LOCAL_PATH.test(value) || FILE_NAME.test(value))) found.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry, undefined, key ?? parent);
      return;
    }
    if (value !== null && typeof value === "object")
      for (const [childKey, entry] of Object.entries(value)) visit(entry, childKey, key ?? parent);
  };
  visit(snapshot, undefined, undefined);
  return found;
}

export type CreateShareLinkResult =
  | { ok: true; id: string; record: ShareLinkRecordV1 }
  | { ok: false; status: 400 | 413 | 422; error: string };

/**
 * Validates a creation request and stores its canonical token under a new id.
 * The request body is `{ "token": "<V2 share token>" }` and nothing more.
 */
export async function createShareLink(
  body: string,
  store: ShareLinkStore,
  options: { now?: Date; newId?: () => string } = {},
): Promise<CreateShareLinkResult> {
  if (body.length > MAX_SHARE_REQUEST_BYTES)
    return { ok: false, status: 413, error: "The share request is too large." };
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, error: "The share request is not valid JSON." };
  }
  const request = createRequestSchema.safeParse(json);
  if (!request.success)
    return { ok: false, status: 400, error: "The share request must carry one share token." };
  const decoded = await decodeAnyShareToken(request.data.token);
  if (!decoded.ok) return { ok: false, status: 422, error: decoded.message };
  if (decoded.snapshot.version !== 2)
    return {
      ok: false,
      status: 422,
      error: "Only current share snapshots can become short links.",
    };
  if (privateLookingStrings(decoded.snapshot).length > 0)
    return { ok: false, status: 422, error: "The share snapshot carries a path or file name." };
  let token: string;
  try {
    // Re-encoded from the parsed snapshot: the stored copy is the canonical
    // encoding of fields the schema allows, whatever bytes were sent.
    token = await encodeShareTokenV2(decoded.snapshot);
  } catch {
    return { ok: false, status: 422, error: "The share snapshot is not valid." };
  }
  const record: ShareLinkRecordV1 = {
    version: SHARE_LINK_RECORD_VERSION,
    token,
    createdAt: (options.now ?? new Date()).toISOString(),
  };
  const nextId = options.newId ?? (() => newShareId());
  // 128 random bits make a collision practically impossible; checking costs one read.
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = nextId();
    if ((await store.get(id)) !== null) continue;
    await store.put(id, JSON.stringify(record));
    return { ok: true, id, record };
  }
  throw new Error("Could not allocate a share id.");
}

/** The stored token for a short-link id, or undefined when there is none. */
export async function resolveShareLink(
  id: string,
  store: ShareLinkStore,
): Promise<string | undefined> {
  if (!isShareId(id)) return undefined;
  const raw = await store.get(id);
  if (raw === null) return undefined;
  try {
    const record = shareLinkRecordSchema.safeParse(JSON.parse(raw));
    return record.success ? record.data.token : undefined;
  } catch {
    return undefined;
  }
}
