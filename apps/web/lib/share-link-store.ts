import { isShareId, resolveShareLink, type ShareLinkStore } from "./share-links";

/**
 * Where short share links are stored, by runtime.
 *
 * On Cloudflare Workers (production and branch previews) the store is the
 * `SHARE_LINKS` KV namespace from wrangler.jsonc, reached through the
 * `cloudflare:workers` module. A Workers deployment without that binding
 * reports the store as unavailable instead of pretending to work.
 *
 * Anywhere else (the Node `next start` server the end-to-end suite runs
 * against) there is no KV, so links live in this process's memory and vanish
 * with it. That store exists for local development and tests only; production
 * never runs outside Workers.
 */

interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type ShareLinkRuntime =
  | { kind: "kv" | "memory"; store: ShareLinkStore; rateLimit?: RateLimit | undefined }
  | { kind: "unavailable" };

async function workersEnv(): Promise<Record<string, unknown> | undefined> {
  try {
    const workers = (await import(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ "cloudflare:workers"
    )) as { env?: Record<string, unknown> };
    return workers.env ?? {};
  } catch {
    return undefined;
  }
}

function isKv(value: unknown): value is KvNamespace {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as KvNamespace).get === "function" &&
    typeof (value as KvNamespace).put === "function"
  );
}

function isRateLimit(value: unknown): value is RateLimit {
  return (
    typeof value === "object" && value !== null && typeof (value as RateLimit).limit === "function"
  );
}

const memory = globalThis as { __stackreplayShareLinks?: Map<string, string> };

function memoryStore(): ShareLinkStore {
  memory.__stackreplayShareLinks ??= new Map();
  const links = memory.__stackreplayShareLinks;
  return {
    get: async (id) => links.get(id) ?? null,
    put: async (id, value) => {
      links.set(id, value);
    },
  };
}

export async function shareLinkRuntime(): Promise<ShareLinkRuntime> {
  const env = await workersEnv();
  if (env === undefined) return { kind: "memory", store: memoryStore() };
  const kv = env.SHARE_LINKS;
  if (!isKv(kv)) return { kind: "unavailable" };
  return {
    kind: "kv",
    store: { get: (id) => kv.get(id), put: (id, value) => kv.put(id, value) },
    rateLimit: isRateLimit(env.SHARE_CREATE_LIMIT) ? env.SHARE_CREATE_LIMIT : undefined,
  };
}

/** The stored token for a short-link id, read through whichever store this runtime has. */
export async function shareLinkStore(): Promise<ShareLinkStore | undefined> {
  const runtime = await shareLinkRuntime();
  return runtime.kind === "unavailable" ? undefined : runtime.store;
}

export type ResolvedShare =
  | { kind: "token"; token: string; path: string }
  | { kind: "missing" | "unavailable"; path: string };

/**
 * What `/s/<param>` names: a short-link id (read from the store) or a
 * self-contained token (read as it is, so every link made before short links
 * keeps working). Either way the public page and image then decode a token.
 */
export async function resolveShareParam(param: string): Promise<ResolvedShare> {
  const path = `/s/${param}`;
  if (!isShareId(param)) return { kind: "token", token: param, path };
  const store = await shareLinkStore();
  if (store === undefined) return { kind: "unavailable", path };
  const token = await resolveShareLink(param, store);
  return token === undefined ? { kind: "missing", path } : { kind: "token", token, path };
}
