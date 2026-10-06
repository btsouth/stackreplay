import {
  GITHUB_LOGIN_PATTERN,
  type GitHubCalendar,
  parseContributionsHtml,
} from "@/lib/github-activity";

/**
 * `GET /api/github/contributions?login=<login>` reads one public GitHub
 * contribution calendar for the signed-out GitHub profile.
 *
 * GitHub needs no token for this page and the result is public, so it is
 * cached at the edge for an hour. `?year=YYYY` asks for a year other than the
 * default trailing twelve months.
 */

const UPSTREAM = "https://github.com/users";
const CACHE_SECONDS = 3600;
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "StackReplay/0.1 (+https://stackreplay.com) contribution calendar";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

interface CacheStorage {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/**
 * The Workers Cache API. Available on Cloudflare and absent in local dev and
 * tests, where requests simply go to GitHub.
 */
function workersCache(): CacheStorage | undefined {
  const cache = (globalThis as { caches?: { default?: CacheStorage } }).caches?.default;
  return cache !== undefined && typeof cache.match === "function" ? cache : undefined;
}

function cachedResponse(calendar: GitHubCalendar): Response {
  return new Response(JSON.stringify(calendar), {
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const login = url.searchParams.get("login")?.trim() ?? "";
  if (!GITHUB_LOGIN_PATTERN.test(login)) {
    return json(400, { error: "Enter a GitHub username." });
  }
  const year = url.searchParams.get("year");
  const query = year !== null && /^\d{4}$/.test(year) ? `?from=${year}-01-01&to=${year}-12-31` : "";
  const upstream = `${UPSTREAM}/${encodeURIComponent(login)}/contributions${query}`;
  const cacheKey = new Request(`https://stackreplay.github-cache/${login.toLowerCase()}${query}`);

  const cache = workersCache();
  if (cache !== undefined) {
    const hit = await cache.match(cacheKey);
    if (hit !== undefined) {
      const body = (await hit.json()) as GitHubCalendar;
      return cachedResponse(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(upstream, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return json(502, { error: "GitHub didn't answer. Try again in a minute." });
  }

  if (response.status === 404) {
    return json(404, { error: `No GitHub user named ${login}.` });
  }
  if (!response.ok) {
    return json(502, { error: "GitHub didn't answer. Try again in a minute." });
  }

  let days: Record<string, number>;
  try {
    days = parseContributionsHtml(await response.text());
  } catch {
    return json(502, { error: "GitHub's contribution calendar couldn't be read." });
  }

  const calendar: GitHubCalendar = {
    login,
    fetchedAt: new Date().toISOString(),
    days,
    total: Object.values(days).reduce((sum, value) => sum + value, 0),
  };
  const result = cachedResponse(calendar);
  if (cache !== undefined) {
    try {
      await cache.put(cacheKey, result.clone());
    } catch {
      // A cache miss is not a reason to fail the response.
    }
  }
  return result;
}
