import { securityHeaders } from "../../next.config";
import { loadPublicProviderDirectory } from "../public-providers";
import { loadMarketFeed } from "./events";
import { projectUpdateFeed, serializeUpdateRss } from "./update-feeds";
import { parseUpdateSelection } from "./update-selection";

/** If-None-Match uses weak comparison for GET/HEAD; quoted tags can contain commas. */
export function matchesFeedEtag(condition: string | null, etag: string): boolean {
  if (condition === null) return false;
  if (condition.trim() === "*") return true;
  const tags = condition.match(/(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"/gu) ?? [];
  return tags.some((tag) => tag.replace(/^W\//u, "") === etag);
}

export async function updateFeedResponse(
  request: Request,
  format: "json" | "xml",
): Promise<Response> {
  // vinext skips config headers for all 3xx statuses, including 304.
  // Reuse the configured policy explicitly so conditional responses retain it.
  const security = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));
  const providers = loadPublicProviderDirectory().providers;
  const selection = parseUpdateSelection(new URL(request.url).searchParams, providers);
  if (!selection.providerRecognized) {
    const body =
      format === "json"
        ? JSON.stringify({ error: "Provider not recognized" })
        : '<?xml version="1.0" encoding="UTF-8"?><error>Provider not recognized</error>';
    return new Response(request.method === "HEAD" ? null : body, {
      status: 400,
      headers: {
        ...security,
        "Content-Type":
          format === "json"
            ? "application/json; charset=utf-8"
            : "application/rss+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  const feed = loadMarketFeed();
  const body =
    format === "json"
      ? JSON.stringify(projectUpdateFeed(feed, selection))
      : serializeUpdateRss(feed, selection);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const etag = `"${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
  const headers = {
    ...security,
    "Content-Type":
      format === "json" ? "application/json; charset=utf-8" : "application/rss+xml; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
    ETag: etag,
  };
  if (matchesFeedEtag(request.headers.get("If-None-Match"), etag))
    return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}
