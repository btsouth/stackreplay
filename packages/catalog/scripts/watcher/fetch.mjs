import robotsParser from "robots-parser";
import { canonicalUrl, sourceOwner } from "./inventory.mjs";
import { normalize } from "./normalize.mjs";
export const USER_AGENT = "StackReplayCatalogWatcher/1.0 (+https://github.com/btsouth/stackreplay)";
const TEXT_TYPE = /^(text\/(html|plain|markdown|xml)|application\/(json|xml|xhtml\+xml))(;|$)/i;
export async function requestText(
  raw,
  { fetchImpl = fetch, maxBytes = 2 * 1024 * 1024, timeoutMs = 12000 } = {},
) {
  const url = canonicalUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html, text/plain, application/json;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const meta = {
      httpStatus: response.status,
      finalUrl: url,
      contentType: response.headers.get("content-type") ?? "",
    };
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      return { ...meta, redirect: response.headers.get("location") };
    }
    if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), meta);
    if (!TEXT_TYPE.test(meta.contentType))
      throw Object.assign(new Error("Unsupported non-text content type"), meta);
    const declared = Number(response.headers.get("content-length"));
    if (declared > maxBytes) throw Object.assign(new Error("Response exceeds byte limit"), meta);
    const chunks = [];
    let bytes = 0;
    if (!response.body) throw Object.assign(new Error("Empty response body"), meta);
    const reader = response.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw Object.assign(new Error("Response exceeds byte limit"), meta);
      }
      chunks.push(value);
    }
    return { ...meta, text: Buffer.concat(chunks).toString("utf8") };
  } catch (error) {
    await response?.body?.cancel().catch(() => {});
    if (controller.signal.aborted) throw new Error("Fetch timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export function createSourceFetcher(
  policy,
  {
    fetchImpl = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeoutMs,
    maxBytes,
  } = {},
) {
  const responses = new Map();
  const robots = new Map();
  const hostQueues = new Map();
  const lastHostFetch = new Map();
  const stats = { requests: 0, sourceRequests: 0, robotsRequests: 0, duplicateRequests: 0 };
  function request(url, kind, delay = 1500) {
    if (responses.has(url)) return responses.get(url);
    const host = new URL(url).host;
    const prior = hostQueues.get(host) ?? Promise.resolve();
    const promise = prior
      .catch(() => {})
      .then(async () => {
        const wait = Math.max(0, delay - (Date.now() - (lastHostFetch.get(host) ?? 0)));
        if (wait) await sleep(wait);
        lastHostFetch.set(host, Date.now());
        stats.requests++;
        stats[`${kind}Requests`]++;
        return requestText(url, {
          fetchImpl,
          timeoutMs,
          maxBytes: kind === "robots" ? 512 * 1024 : maxBytes,
        });
      });
    hostQueues.set(host, promise);
    responses.set(url, promise);
    return promise;
  }
  function rules(origin) {
    if (!robots.has(origin))
      robots.set(
        origin,
        (async () => {
          let url = `${origin}/robots.txt`;
          for (let redirects = 0; redirects <= 3; redirects++) {
            let result;
            try {
              result = await request(url, "robots");
            } catch (error) {
              // RFC 9309 unavailable (404/410) permits access; ambiguous failures do not.
              if ([404, 410].includes(error.httpStatus)) return robotsParser(url, "");
              throw new Error(`Robots unavailable: ${error.message}`);
            }
            if (Object.hasOwn(result, "redirect")) {
              if (!result.redirect) throw new Error("Robots redirect missing Location");
              url = canonicalUrl(new URL(result.redirect, url).href);
              if (new URL(url).origin !== origin)
                throw new Error("Cross-origin robots redirect unsupported");
              continue;
            }
            if (/html/i.test(result.contentType) || /^\s*</.test(result.text))
              throw new Error("Robots response is HTML, not rules");
            return robotsParser(url, result.text);
          }
          throw new Error("Robots redirect limit exceeded");
        })(),
      );
    return robots.get(origin);
  }
  async function fetchSource(source) {
    let url = source.url;
    const lastRequestedUrl = source.url;
    try {
      for (let redirects = 0; redirects <= 3; redirects++) {
        url = canonicalUrl(url);
        if (sourceOwner(url, policy) !== source.providerId)
          throw new Error("Redirect outside approved provider hosts/paths");
        const rule = await rules(new URL(url).origin);
        if (rule.isAllowed(url, "StackReplayCatalogWatcher") === false)
          throw new Error("Robots disallow");
        const crawlDelay = rule.getCrawlDelay("StackReplayCatalogWatcher");
        if (crawlDelay > 30) throw new Error("Robots crawl-delay exceeds watcher budget");
        const result = await request(url, "source", Math.max(1500, (crawlDelay ?? 0) * 1000));
        if (Object.hasOwn(result, "redirect")) {
          if (!result.redirect) throw Object.assign(new Error("Redirect missing Location"), result);
          const target = canonicalUrl(new URL(result.redirect, url).href);
          url = target;
          continue;
        }
        if (!/utf-?8|us-ascii/i.test(result.contentType) && /charset=/i.test(result.contentType))
          throw Object.assign(new Error("Unsupported text encoding"), result);
        const text = normalize(result.text, result.contentType);
        if (text.length < 80)
          throw Object.assign(new Error("Insufficient visible text; possibly JS-only"), result);
        return { ...result, text };
      }
      throw new Error("Source redirect limit exceeded");
    } catch (error) {
      return {
        failure: error.message.slice(0, 500),
        finalUrl: lastRequestedUrl,
        ...(error.httpStatus ? { httpStatus: error.httpStatus } : {}),
        ...(error.contentType ? { contentType: error.contentType } : {}),
      };
    }
  }
  return { fetchSource, stats };
}
export async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}
