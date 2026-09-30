import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCoverage, parseOpenRouter, renderCoverage } from "./coverage-core.mjs";

const now = Date.parse("2026-09-29T07:23:00Z");
const models = [{ id: "qwen-3-8-max", name: "Qwen 3.8 Max", keys: new Set(["qwen38max"]) }];
const lineups = [
  { planId: "plan-b", name: "Qwen 3.8 Max", modelId: null },
  { planId: "plan-a", name: "Qwen 3.9 Max", modelId: null },
  { planId: "plan-b", name: "qwen3.9 max", modelId: null },
  { planId: "linked", name: "Ignore linked", modelId: "explicit" },
];
const openRouter = parseOpenRouter({
  data: [
    { id: "qwen/qwen3.8-max-20260803", name: "Qwen 3.8 Max", created: now / 1000 },
    { id: "qwen/qwen3.9-max", name: "Qwen 3.9 Max", created: now / 1000 },
    { id: "qwen/qwen4-coder", name: "Qwen 4 Coder", created: now / 1000 },
    { id: "qwen/old", name: "Old", created: 1 },
    { id: "untracked/new", name: "New", created: now / 1000 },
    { id: "stealth/hidden", name: "Hidden", created: now / 1000 },
    { id: "qwen/new:free", name: "Free", created: now / 1000 },
  ],
});
test("audit retains existing matching, vendor tracking, recent window and explicit-link semantics", () => {
  const result = analyzeCoverage({ models, lineups, openRouter, now });
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].plans, ["plan-a", "plan-b"]);
  assert.equal(result.candidates[0].openRouter.slug, "qwen/qwen3.9-max");
  assert.equal(result.linkable[0].match, "qwen-3-8-max");
  assert.deepEqual(
    result.recent.map((c) => c.slug),
    ["qwen/qwen3.9-max", "qwen/qwen4-coder"],
  );
  assert.deepEqual(result.recent[0].plans, ["plan-a", "plan-b"]);
  assert.doesNotThrow(() => JSON.stringify(result));
  assert.match(renderCoverage(result, { openRouter, online: true, now }), /2 \(plan-a, plan-b\)/);
});
test("offline report remains useful and API errors remain explicit", () => {
  const result = analyzeCoverage({ models, lineups, now });
  assert.equal(result.candidates[0].openRouter, null);
  assert.equal(result.recent.length, 0);
  assert.match(
    renderCoverage(result, { online: true, openRouterError: "HTTP 503", now }),
    /HTTP 503/,
  );
});
test("malformed API fails instead of interpreting a missing list as disappearance", () => {
  assert.throws(() => parseOpenRouter({}), /Invalid/);
});
