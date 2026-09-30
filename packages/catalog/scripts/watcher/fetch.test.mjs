import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSourceFetcher, requestText } from "./fetch.mjs";

const rules = readFileSync(new URL("./fixtures/robots.txt", import.meta.url), "utf8");
const page = readFileSync(new URL("./fixtures/previous.html", import.meta.url), "utf8");
const policy = {
  hosts: { "developers.openai.com": "openai", "help.openai.com": "openai" },
  paths: {},
};
const source = {
  id: "source-test",
  providerId: "openai",
  url: "https://developers.openai.com/api/docs/pricing",
};
function fake(routes) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const route = routes[url];
      if (!route) throw new Error(`Unexpected URL ${url}`);
      return typeof route === "function"
        ? route(url, options)
        : new Response(route.body ?? "", {
            status: route.status ?? 200,
            headers: route.headers ?? { "content-type": "text/plain" },
          });
    },
  };
}
const robotsUrl = "https://developers.openai.com/robots.txt";
test("robots and source requests are deduplicated even across concurrent consumers", async () => {
  const f = fake({
    [robotsUrl]: { body: rules },
    [source.url]: { body: page, headers: { "content-type": "text/html" } },
  });
  const delays = [];
  const watcher = createSourceFetcher(policy, { ...f, sleep: async (ms) => delays.push(ms) });
  const results = await Promise.all([watcher.fetchSource(source), watcher.fetchSource(source)]);
  assert.equal(results[0].text, results[1].text);
  assert.equal(f.calls.length, 2);
  assert.ok(delays[0] > 1500);
  assert.equal(watcher.stats.sourceRequests, 1);
  assert.equal(f.calls[1].options.redirect, "manual");
  assert.match(f.calls[1].options.headers["User-Agent"], /StackReplay/);
  assert.equal(f.calls[1].options.headers.Authorization, undefined);
});
test("robots disallow stops before page fetch and longest allow wins", async () => {
  const f = fake({
    [robotsUrl]: { body: rules },
    "https://developers.openai.com/blocked/public": {
      body: page,
      headers: { "content-type": "text/html" },
    },
  });
  const watcher = createSourceFetcher(policy, { ...f, sleep: async () => {} });
  assert.match(
    (await watcher.fetchSource({ ...source, url: "https://developers.openai.com/blocked" }))
      .failure,
    /Robots disallow/,
  );
  assert.equal(f.calls.length, 1);
  assert.equal(
    (await watcher.fetchSource({ ...source, url: "https://developers.openai.com/blocked/public" }))
      .httpStatus,
    200,
  );
});
test("ambiguous robots 503/403/HTML prevents page fetch; robots 404 permits it", async () => {
  for (const route of [
    { status: 503 },
    { status: 403 },
    { body: "<html>challenge</html>", headers: { "content-type": "text/html" } },
  ]) {
    const f = fake({ [robotsUrl]: route });
    assert.match(
      (await createSourceFetcher(policy, { ...f }).fetchSource(source)).failure,
      /Robots/,
    );
    assert.equal(f.calls.length, 1);
  }
  const f = fake({
    [robotsUrl]: { status: 404 },
    [source.url]: { body: page, headers: { "content-type": "text/html" } },
  });
  assert.equal(
    (await createSourceFetcher(policy, { ...f, sleep: async () => {} }).fetchSource(source))
      .httpStatus,
    200,
  );
});
test("allowed redirects check destination robots and record final URL", async () => {
  const target = "https://help.openai.com/en/articles/pricing";
  const f = fake({
    [robotsUrl]: { body: "" },
    [source.url]: { status: 301, headers: { location: target } },
    "https://help.openai.com/robots.txt": { body: "" },
    [target]: { body: page, headers: { "content-type": "text/html" } },
  });
  const result = await createSourceFetcher(policy, { ...f, sleep: async () => {} }).fetchSource(
    source,
  );
  assert.equal(result.finalUrl, target);
  assert.equal(f.calls.length, 4);
});
test("unsafe/unapproved redirects and loops stop without fetching arbitrary hosts", async () => {
  for (const location of [
    "http://help.openai.com/page",
    "https://evil.test/page",
    "https://user:pass@help.openai.com/page",
    source.url,
  ]) {
    const f = fake({
      [robotsUrl]: { body: "" },
      [source.url]: { status: 302, headers: { location } },
    });
    const result = await createSourceFetcher(policy, { ...f, sleep: async () => {} }).fetchSource(
      source,
    );
    assert.ok(result.failure);
    assert.equal(result.finalUrl, source.url);
    assert.equal(f.calls.length, 2);
  }
});
test("page 404 is reported once, not retried", async () => {
  const f = fake({ [robotsUrl]: { body: "" }, [source.url]: { status: 404 } });
  const result = await createSourceFetcher(policy, { ...f, sleep: async () => {} }).fetchSource(
    source,
  );
  assert.equal(result.httpStatus, 404);
  assert.match(result.failure, /HTTP 404/);
  assert.equal(f.calls.length, 2);
});
test("timeout, byte limits and binary types are bounded", async () => {
  const blocking = async (_url, { signal }) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(new Error("aborted"))),
    );
  await assert.rejects(
    requestText(source.url, { fetchImpl: blocking, timeoutMs: 10 }),
    /timed out/,
  );
  for (const headers of [
    { "content-type": "text/plain" },
    { "content-type": "text/plain", "content-length": "500" },
  ]) {
    const f = fake({ [source.url]: { body: "abc".repeat(100), headers } });
    await assert.rejects(requestText(source.url, { ...f, maxBytes: 100 }), /byte limit/);
  }
  const f = fake({
    [source.url]: { body: "binary", headers: { "content-type": "application/pdf" } },
  });
  await assert.rejects(requestText(source.url, { ...f }), /non-text/);
  await assert.rejects(requestText("ftp://developers.openai.com/a", { ...f }), /HTTPS/);
});
test("JS-only shells and unsupported charset are reported without a browser", async () => {
  for (const route of [
    { body: "<html><script>app()</script></html>", headers: { "content-type": "text/html" } },
    { body: page, headers: { "content-type": "text/html;charset=iso-8859-1" } },
  ]) {
    const f = fake({ [robotsUrl]: { body: "" }, [source.url]: route });
    assert.ok(
      (await createSourceFetcher(policy, { ...f, sleep: async () => {} }).fetchSource(source))
        .failure,
    );
  }
});
