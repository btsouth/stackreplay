import { shareLinkRuntime } from "@/lib/share-link-store";
import { createShareLink, MAX_SHARE_REQUEST_BYTES } from "@/lib/share-links";

/**
 * Creates a short share link: `POST /api/share` with `{ "token": "<V2 token>" }`.
 *
 * The one upload in StackReplay. The browser sends the aggregate share token it
 * already shows in the preview, only when the person chooses Create share
 * link; `createShareLink` re-validates it with the strict share reader and
 * stores its canonical encoding under a random id. Requests from other sites
 * are refused, so this is not a general-purpose store.
 */

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function drain(request: Request): Promise<void> {
  const reader = request.body?.getReader();
  if (reader === undefined) return;
  let read = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      read += value?.byteLength ?? 0;
      if (read > MAX_SHARE_REQUEST_BYTES * 4) {
        await reader.cancel();
        return;
      }
    }
  } catch {
    // The client went away; there is nothing left to keep clean.
  }
}

/** A browser always sends Origin on a POST; it must be this site. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin === null || host === null) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  // An early answer still reads the body (bounded), so the connection is left
  // in a clean state for the client's next request.
  const refuse = async (status: number, error: string) => {
    await drain(request);
    return json(status, { error });
  };
  if (!sameOrigin(request)) return refuse(403, "Share links can only be created from StackReplay.");
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json"))
    return refuse(415, "The share request must be JSON.");
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_SHARE_REQUEST_BYTES) return refuse(413, "The share request is too large.");

  const runtime = await shareLinkRuntime();
  if (runtime.kind === "unavailable") return refuse(503, "Short links are unavailable right now.");
  // Per client address, which Cloudflare's edge always supplies. Loopback is
  // never a real visitor's address; it is a local development server.
  const client = request.headers.get("cf-connecting-ip");
  if (runtime.rateLimit !== undefined && client !== null && !LOOPBACK.has(client)) {
    const { success } = await runtime.rateLimit.limit({ key: client });
    if (!success) return refuse(429, "Too many share links; try again in a minute.");
  }

  const result = await createShareLink(await request.text(), runtime.store);
  if (!result.ok) return json(result.status, { error: result.error });
  return json(201, { id: result.id, path: `/s/${result.id}` });
}
