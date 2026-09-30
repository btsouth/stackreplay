import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceHealthV1Schema } from "../dist/intelligence/index.js";
import { analyzeCoverage, loadLineups, loadModels, parseOpenRouter } from "./coverage-core.mjs";
import { createSourceFetcher, mapLimit, requestText } from "./watcher/fetch.mjs";
import { createGitHub } from "./watcher/github.mjs";
import { loadInventory } from "./watcher/inventory.mjs";
import {
  coalesceOutbox,
  day,
  emptyState,
  transitionCoverage,
  transitionSource,
  validateState,
} from "./watcher/state.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const flags = new Set([
  "--dry-run",
  "--apply",
  "--rebaseline",
  "--remote-state",
  "--state",
  "--out",
  "--fixtures",
  "--source-limit",
]);
for (let i = 0; i < args.length; i++) {
  if (!flags.has(args[i])) throw new Error(`Unknown option: ${args[i]}`);
  if (["--state", "--out", "--fixtures", "--source-limit"].includes(args[i])) {
    if (!args[++i] || args[i].startsWith("--")) throw new Error("Option requires a value");
  }
}
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const apply = args.includes("--apply");
const rebaseline = args.includes("--rebaseline");
if (
  apply &&
  (args.includes("--dry-run") ||
    args.includes("--state") ||
    args.includes("--fixtures") ||
    args.includes("--source-limit"))
)
  throw new Error("Apply cannot use dry-run/local state/fixtures/source limit");
if (
  apply &&
  (process.env.GITHUB_ACTIONS !== "true" ||
    process.env.GITHUB_REPOSITORY !== "btsouth/stackreplay" ||
    process.env.GITHUB_REF !== "refs/heads/main")
)
  throw new Error(
    "Remote writes are restricted to the main-branch GitHub Action in btsouth/stackreplay",
  );
const github =
  apply || args.includes("--remote-state")
    ? createGitHub({ token: process.env.GITHUB_TOKEN, repository: "btsouth/stackreplay" })
    : null;
if (github && !process.env.GITHUB_TOKEN)
  throw new Error("GITHUB_TOKEN required for remote state access");
let previous = github
  ? await github.readState({ reset: rebaseline })
  : !rebaseline && option("--state")
    ? validateState(JSON.parse(readFileSync(option("--state"), "utf8")))
    : emptyState();
if (rebaseline) previous = emptyState();
for (const source of Object.values(previous.sources)) sourceHealthV1Schema.parse(source.health);
const fixture = option("--fixtures")
  ? JSON.parse(readFileSync(option("--fixtures"), "utf8"))
  : null;
const now = fixture?.now ?? new Date().toISOString();
const inventory = fixture?.inventory ?? loadInventory(root);
let sources = inventory.sources;
if (option("--source-limit")) {
  const limit = Number(option("--source-limit"));
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Positive source limit required");
  // Sample across providers before taking a second source from the same host.
  const groups = Map.groupBy(sources, (source) => new URL(source.url).host);
  const selected = [];
  while (selected.length < limit && [...groups.values()].some((group) => group.length)) {
    for (const group of groups.values()) {
      if (group.length && selected.length < limit) selected.push(group.shift());
    }
  }
  sources = selected;
}
const fetcher = fixture ? null : createSourceFetcher(inventory.policy);
const state = structuredClone(previous);
const summary = {
  mode: apply ? "apply" : "dry-run",
  uniqueSources: inventory.sources.length,
  selectedSources: sources.length,
  fetched: 0,
  cachedToday: 0,
  unchanged: 0,
  changed: 0,
  baseline: 0,
  failedSkipped: 0,
  excluded: inventory.excluded?.length ?? 0,
};
await mapLimit(sources, 4, async (source) => {
  const prior = previous.sources[source.id];
  if (day(prior?.health.lastAttemptAt) === day(now)) {
    summary.cachedToday++;
    if (prior.health.failure) summary.failedSkipped++;
    else summary.unchanged++;
    return;
  }
  const observation = fixture ? fixture.observations[source.id] : await fetcher.fetchSource(source);
  if (!observation) throw new Error(`Fixture missing observation ${source.id}`);
  const result = transitionSource(source, prior, observation, now, { rebaseline });
  sourceHealthV1Schema.parse(result.current.health);
  state.sources[source.id] = result.current;
  summary.fetched += observation.httpStatus ? 1 : 0;
  if (observation.failure) summary.failedSkipped++;
  else if (!prior?.health.fingerprint) summary.baseline++;
  else if (result.changed) summary.changed++;
  else summary.unchanged++;
  if (result.intent) state.outbox.push(result.intent);
});
let w2;
let coverageAudit;
if (day(previous.coverage.lastAttemptAt) === day(now)) {
  const active = Object.values(previous.coverage.candidates).filter((c) => c.active);
  w2 = {
    missing: active.filter((c) => c.category === "missing_model").length,
    recent: active.filter((c) => c.category === "recent_release").length,
    newly: 0,
    cachedToday: true,
  };
} else {
  let router = null;
  let apiError = null;
  try {
    router = fixture
      ? parseOpenRouter(fixture.openRouter)
      : parseOpenRouter(
          JSON.parse(
            (
              await requestText("https://openrouter.ai/api/v1/models", {
                maxBytes: 8 * 1024 * 1024,
              })
            ).text,
          ),
        );
  } catch (error) {
    apiError = error.message;
  }
  const audit = analyzeCoverage({
    models: fixture?.models ?? loadModels(root),
    lineups: fixture?.lineups ?? loadLineups(root),
    openRouter: router,
    now: Date.parse(now),
  });
  coverageAudit = audit;
  const result = transitionCoverage(previous.coverage, audit, now, { apiError, rebaseline });
  state.coverage = result.current;
  if (result.intent) state.outbox.push(result.intent);
  w2 = {
    missing: result.missing,
    recent: result.recent,
    newly: result.newly,
    ...(apiError ? { apiError } : {}),
  };
}
// Durable outbox checkpoint precedes side effects. A rerun can finish delivery without re-fetching.
state.outbox = coalesceOutbox(state.outbox);
const report = {
  w1: { ...summary, ...(fetcher ? { network: fetcher.stats } : {}) },
  w2,
  coverageAudit,
  wouldSyncIssues: state.outbox.length,
  issues: state.outbox,
  state,
};
if (option("--out")) {
  const path = option("--out");
  const resolvedParent = realpathSync(dirname(resolve(path)));
  if (!`${resolvedParent}/${path.split("/").at(-1)}`.startsWith(`${realpathSync(root)}/`) && !apply)
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  else throw new Error("--out must be outside the repository and used in dry-run only");
}
console.log(
  JSON.stringify({ w1: report.w1, w2, wouldSyncIssues: report.wouldSyncIssues }, null, 2),
);
if (!apply)
  for (const intent of state.outbox.slice(0, 3))
    console.log(`\nWOULD SYNC: ${intent.title}\n${intent.body}`);
else {
  await github.saveState(state);
  while (state.outbox.length) {
    const intent = state.outbox[0];
    console.log(`${await github.syncIssue(intent)}: ${intent.title}`);
    state.outbox.shift();
  }
  await github.saveState(state);
}
