import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { collectInventory, fingerprint, sourceOwner } from "./inventory.mjs";
import { boundedDiff, markdownText, normalize } from "./normalize.mjs";
import {
  coalesceOutbox,
  emptyState,
  renderCoverageIssue,
  transitionCoverage,
  transitionSource,
  validateState,
} from "./state.mjs";

const before = readFileSync(new URL("./fixtures/previous.html", import.meta.url), "utf8");
const after = readFileSync(new URL("./fixtures/changed.html", import.meta.url), "utf8");
const text = normalize(before, "text/html");
const policy = { hosts: { "developers.openai.com": "openai" }, paths: {} };
const source = {
  id: "source-fixture",
  url: "https://developers.openai.com/api/docs/pricing",
  providerId: "openai",
  kind: "provider_pricing",
  affected: ["model: gpt-x", "pricing: openai-gpt-x-standard", "plan: openai-pro"],
};
const now = "2026-09-29T07:23:00Z";
const observation = { text, httpStatus: 200, contentType: "text/html", finalUrl: source.url };
const baseline = () => transitionSource(source, null, observation, "2026-09-28T07:23:00Z").current;
test("inventory deduplicates fragments, includes nested exact refs and respects authority", () => {
  const data = [
    {
      record: "model: gpt-x",
      data: {
        sources: [{ url: source.url }],
        specifications: { sources: [{ url: `${source.url}#price` }] },
      },
    },
    { record: "pricing: x", data: { sourceUrl: source.url } },
    {
      record: "lineup: plan-a",
      data: {
        groups: [{ sourceUrl: source.url, models: [{ modelId: "gpt-x" }] }],
        sourceUrls: ["https://openrouter.ai/openai/gpt-x", "https://web.archive.org/example"],
      },
    },
  ];
  const inventory = collectInventory(data, policy);
  assert.equal(inventory.sources.length, 1);
  assert.deepEqual(inventory.sources[0].affected, ["lineup: plan-a", "model: gpt-x", "pricing: x"]);
  assert.equal(inventory.excluded.length, 2);
  assert.equal(
    collectInventory(data, policy, [{ url: source.url, authority: "community", status: "active" }])
      .sources.length,
    0,
  );
  assert.equal(sourceOwner("https://developers.openai.com/issues/12", policy), null);
  assert.throws(() => sourceOwner("http://developers.openai.com/a", policy));
});
test("normalization ignores HTML churn while retaining prices and dates", () => {
  assert.equal(
    text,
    normalize(
      before.replace("color:red", "color:green").replace('churn("1")', 'churn("9")'),
      "text/html",
    ),
  );
  assert.match(text, /\$4/);
  assert.match(text, /November 21, 2026/);
  assert.doesNotMatch(text, /churn|color|Ignore hidden/);
  assert.notEqual(fingerprint(text), fingerprint(normalize(after, "text/html")));
  assert.equal(normalize(" A\r\n\r\nB  C ", "text/plain"), "A\nB C");
});
test("first success baselines, unchanged creates no intent, subsequent change traces exact IDs", () => {
  const first = baseline();
  assert.equal(first.health.state, "healthy");
  assert.equal(transitionSource(source, null, observation, now).intent, null);
  assert.equal(transitionSource(source, first, observation, now).intent, null);
  const changed = transitionSource(
    source,
    first,
    { ...observation, text: normalize(after, "text/html") },
    now,
  );
  assert.equal(changed.changed, true);
  assert.equal(changed.intent.kind, "source");
  assert.match(changed.intent.body, /pricing: openai-gpt-x-standard/);
  assert.match(changed.intent.body, /Added: GPT-X input: \$3/);
  assert.match(changed.intent.body, /Removed: GPT-X input: \$4/);
  assert.match(changed.intent.body, /Detection only. No accepted catalog data changed./);
  assert.equal(
    transitionSource(source, changed.current, { ...observation, text: changed.current.text }, now)
      .intent,
    null,
  );
  assert.equal(
    transitionSource(source, first, { ...observation, text: changed.current.text }, now, {
      rebaseline: true,
    }).intent,
    null,
  );
});
test("failures preserve successful fingerprint, alert third daily failure, report recovery", () => {
  let prior = baseline();
  for (let i = 1; i <= 3; i++) {
    const next = transitionSource(
      source,
      prior,
      { failure: "Fetch timed out" },
      `2026-10-0${i}T07:23:00Z`,
    );
    assert.equal(Boolean(next.intent), i === 3);
    assert.equal(next.current.health.fingerprint.sha256, fingerprint(text));
    prior = next.current;
  }
  assert.equal(
    transitionSource(source, prior, { failure: "Fetch timed out" }, "2026-10-04T07:23:00Z").intent,
    null,
  );
  const recovery = transitionSource(source, prior, observation, "2026-10-05T07:23:00Z");
  assert.equal(recovery.intent.allowCreate, false);
  assert.equal(recovery.current.health.state, "healthy");
  assert.equal(
    transitionSource(source, baseline(), { failure: "HTTP 404", httpStatus: 404 }, now).intent
      .allowCreate,
    true,
  );
  const unavailable = transitionSource(
    source,
    null,
    { failure: "HTTP 410", httpStatus: 410 },
    now,
  ).current;
  assert.equal(
    transitionSource(source, unavailable, observation, "2026-09-30T07:23:00Z").changed,
    false,
  );
});
test("long failures become stale without changing accepted records", () => {
  assert.equal(
    transitionSource(
      source,
      baseline(),
      { failure: "HTTP 503", httpStatus: 503 },
      "2026-10-09T07:23:00Z",
    ).current.health.state,
    "stale",
  );
});
test("diff and untrusted markdown are bounded and inert", () => {
  assert.ok(boundedDiff("old\n".repeat(10000), "new\n".repeat(10000)).length < 3500);
  const rendered = markdownText(
    "@owner <script> [link](https://evil.test) `command` <!-- marker -->",
  );
  assert.doesNotMatch(rendered, /@|<|`|\[|\]/);
});
const candidate = {
  key: "gptx",
  names: ["GPT-X"],
  plans: ["plan-a"],
  openRouter: { slug: "openai/gpt-x", name: "GPT-X", created: Date.parse(now) },
};
const audit = {
  candidates: [candidate],
  recent: [{ slug: "openai/gpt-x", name: "GPT-X", created: Date.parse(now), plans: ["plan-a"] }],
};
test("W2 new/unchanged/disappeared/returned leads retain first-seen machine history", () => {
  const first = transitionCoverage(emptyState().coverage, audit, now);
  assert.equal(first.newly, 2);
  assert.equal(first.missing, 1);
  assert.equal(first.recent, 1);
  assert.match(first.intent.body, /Official developer sources are required/);
  const same = transitionCoverage(first.current, audit, "2026-09-30T07:23:00Z");
  assert.equal(same.intent, null);
  const gone = transitionCoverage(
    same.current,
    { candidates: [], recent: [] },
    "2026-10-01T07:23:00Z",
  );
  assert.equal(gone.current.candidates["missing:gptx"].active, false);
  assert.match(gone.intent.body, /No longer appearing/);
  const returned = transitionCoverage(gone.current, audit, "2026-10-02T07:23:00Z");
  assert.equal(returned.newly, 2);
  assert.equal(returned.current.candidates["missing:gptx"].firstSeen, now);
});
test("W2 outage retains recent leads, records failure and does not infer disappearance", () => {
  const first = transitionCoverage(emptyState().coverage, audit, now).current;
  const failed = transitionCoverage(
    first,
    { candidates: [candidate], recent: [] },
    "2026-09-30T07:23:00Z",
    { apiError: "HTTP 503" },
  );
  assert.equal(failed.intent, null);
  assert.equal(failed.recent, 1);
  assert.equal(failed.current.lastSuccessAt, now);
  assert.equal(failed.current.candidates["recent:openai/gpt-x"].lastSeen, now);
  assert.equal(transitionCoverage(first, audit, now, { rebaseline: true }).intent, null);
});
test("unsupported state versions fail closed", () => {
  assert.throws(() => validateState({ ...emptyState(), version: 2 }));
});

test("pending source episodes survive retries while rolling issue delivery keeps the latest candidate set", () => {
  const source = { kind: "source", eventId: "s" };
  const old = { kind: "coverage", eventId: "a", body: "old" };
  const gone = { kind: "coverage", eventId: "b", body: "gone" };
  const returned = { kind: "coverage", eventId: "a", body: "latest" };
  assert.deepEqual(coalesceOutbox([source, old, gone, source, returned]), [source, returned]);
});

test("large W2 sets and malicious display names cannot exceed GitHub body limits or create mentions", () => {
  const row = {
    key: "missing:x",
    category: "missing_model",
    names: ["@owner<ScRiPt>".repeat(1000)],
    plans: Array.from({ length: 50 }, (_, i) => `exact-plan-${i}`),
    openRouter: null,
    reason: "research",
    firstSeen: now,
  };
  const rows = Array.from({ length: 400 }, () => row);
  const body = renderCoverageIssue(rows, rows, rows, null, now);
  assert.ok(body.length < 60000);
  assert.doesNotMatch(body, /@owner|<script>/i);
  assert.match(body, /additional rows omitted/);
});
