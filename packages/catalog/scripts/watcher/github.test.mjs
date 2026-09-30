import assert from "node:assert/strict";
import test from "node:test";
import { createGitHub } from "./github.mjs";
import { emptyState } from "./state.mjs";

const bot = { login: "github-actions[bot]" };
function service() {
  const issues = [];
  const comments = new Map();
  const writes = [];
  let serialized = null;
  let ref = null;
  let commit = 0;
  return {
    issues,
    comments,
    writes,
    fetchImpl: async (url, options) => {
      assert.ok(url.startsWith("https://api.github.com/repos/btsouth/stackreplay/"));
      assert.equal(options.redirect, "error");
      const path = new URL(url).pathname.replace("/repos/btsouth/stackreplay", "");
      const body = options.body ? JSON.parse(options.body) : null;
      if (options.method !== "GET") writes.push({ path, method: options.method, body });
      let result;
      let status = 200;
      if (path === "/issues" && options.method === "GET") result = issues;
      else if (path === "/issues" && options.method === "POST") {
        result = { number: issues.length + 1, user: bot, state: "open", ...body };
        issues.unshift(result);
      } else if (/^\/issues\/\d+\/comments$/.test(path)) {
        const id = Number(path.split("/")[2]);
        const rows = comments.get(id) ?? [];
        if (options.method === "POST") {
          result = { user: bot, ...body };
          rows.push(result);
          comments.set(id, rows);
        } else result = rows;
      } else if (/^\/issues\/\d+$/.test(path)) {
        result = issues.find((i) => i.number === Number(path.split("/")[2]));
        Object.assign(result, body);
      } else if (path === "/git/ref/heads/watcher-state") {
        if (!ref) status = 404;
        else result = { object: { sha: ref } };
      } else if (path === "/git/blobs" && options.method === "POST") {
        serialized = body.content;
        result = { sha: "blob" };
      } else if (path === "/git/blobs/blob")
        result = {
          encoding: "base64",
          size: serialized.length,
          content: Buffer.from(serialized).toString("base64"),
        };
      else if (path === "/git/trees" && options.method === "POST") {
        assert.deepEqual(
          body.tree.map((e) => e.path),
          ["state.json"],
        );
        result = { sha: "tree" };
      } else if (path === "/git/trees/tree")
        result = { tree: [{ path: "state.json", type: "blob", sha: "blob" }] };
      else if (path === "/git/commits" && options.method === "POST") {
        assert.deepEqual(body.parents, ref ? [ref] : []);
        result = { sha: `commit-${++commit}` };
      } else if (path.startsWith("/git/commits/")) result = { tree: { sha: "tree" } };
      else if (path === "/git/refs" || path === "/git/refs/heads/watcher-state") {
        assert.notEqual(body.force, true);
        ref = body.sha;
        result = {};
      } else throw new Error(`Unexpected ${options.method} ${path}`);
      return new Response(JSON.stringify(result ?? {}), {
        status,
        headers: { "content-type": "application/json" },
      });
    },
  };
}
const intent = (event = "a") => ({
  kind: "source",
  marker: "<!-- stackreplay-watcher:source:source-fixture -->",
  eventId: event,
  title: "Provider source changed",
  body: `<!-- stackreplay-watcher:source:source-fixture -->\n<!-- stackreplay-watcher:event:${event} -->\nDetection only.`,
  allowCreate: true,
});
const client = (s) =>
  createGitHub({
    token: "fixture-secret",
    repository: "btsouth/stackreplay",
    fetchImpl: s.fetchImpl,
  });
test("W1 marker and event markers prevent duplicate issues/comments on retry", async () => {
  const s = service();
  const github = client(s);
  assert.equal(await github.syncIssue(intent()), "created");
  assert.equal(await github.syncIssue(intent()), "unchanged");
  assert.equal(await github.syncIssue(intent("b")), "commented");
  assert.equal(await github.syncIssue(intent("b")), "unchanged");
  assert.equal(s.issues.length, 1);
  assert.equal(s.comments.get(1).length, 1);
  s.issues[0].state = "closed";
  assert.equal(await github.syncIssue(intent("b")), "unchanged");
  assert.equal(await github.syncIssue(intent("c")), "created");
  assert.equal(s.issues.length, 2);
});
test("recovery creates no issue when a health episode was closed", async () => {
  const s = service();
  const github = client(s);
  await github.syncIssue(intent());
  s.issues[0].state = "closed";
  assert.equal(
    await github.syncIssue({ ...intent("recovery"), allowCreate: false }),
    "no open issue",
  );
});
test("W2 updates/reopens one rolling issue and identical render is a no-op", async () => {
  const s = service();
  const github = client(s);
  const rolling = {
    kind: "coverage",
    marker: "<!-- stackreplay-watcher:coverage:v1 -->",
    eventId: "a",
    title: "Model coverage candidates",
    body: "<!-- stackreplay-watcher:coverage:v1 -->\nCandidate A",
    allowCreate: true,
  };
  assert.equal(await github.syncIssue(rolling), "created");
  assert.equal(await github.syncIssue(rolling), "unchanged");
  s.issues[0].state = "closed";
  assert.equal(
    await github.syncIssue({ ...rolling, body: `${rolling.body}\nCandidate B` }),
    "updated",
  );
  assert.equal(s.issues.length, 1);
  assert.equal(s.issues[0].state, "open");
});
test("user-authored markers cannot hijack machine-owned issues", async () => {
  const s = service();
  s.issues.push({ ...intent(), number: 123, user: { login: "someone" }, state: "open" });
  await client(s).syncIssue(intent());
  assert.equal(s.issues.length, 2);
});
test("state is a parented non-force branch commit with only machine JSON and no-op writes", async () => {
  const s = service();
  const github = client(s);
  assert.deepEqual(await github.readState(), emptyState());
  await github.saveState(emptyState());
  const count = s.writes.length;
  assert.equal(await github.saveState(emptyState()), false);
  assert.equal(s.writes.length, count);
  const state = emptyState();
  state.outbox.push(intent());
  await github.saveState(state);
  assert.deepEqual(await client(s).readState(), state);
  assert.ok(s.writes.some((w) => w.method === "PATCH" && w.body.force === false));
  assert.deepEqual(await client(s).readState({ reset: true }), emptyState());
});
