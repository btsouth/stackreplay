import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import {
  ENGINE_VERSION,
  projectReplay,
  REPLAY_METHODOLOGY_VERSION,
  replay,
} from "@stackreplay/replay-engine";

/**
 * Builds the homepage hero's anonymized real workload.
 *
 * The input is a portable StackReplay export of a real local history (for the
 * committed file, the owner's Codex sessions between Aug 21 and Sep 23 UTC). The
 * export itself never enters the repository. This script replays it with the
 * production engine against real catalog targets and keeps only aggregates:
 * counts, day-level totals, canonical model names and the engine's own result
 * figures. Session hashes, project hashes, raw identifiers, and anything finer
 * than a UTC calendar day are dropped, and `assertAnonymized` refuses to write a
 * file that still carries one.
 *
 *   STACKREPLAY_HERO_SOURCE=/private/path/export.json \
 *     node apps/web/scripts/build-hero-fixture.mjs
 *
 * The output is committed so a review sees the data. `hero-workload.test.ts`
 * checks its shape and its anonymity; it cannot regenerate it, because the
 * source history is private by design.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const outputPath = join(here, "..", "lib", "generated", "hero-workload.json");

/** The instant the targets are replayed at. Fixed, so the result is reproducible. */
const RULES_AS_OF = "2026-09-23";

const source = process.env.STACKREPLAY_HERO_SOURCE;
if (source === undefined || source.length === 0) {
  process.stderr.write("Set STACKREPLAY_HERO_SOURCE to a portable workload export.\n");
  process.exit(1);
}

/**
 * The targets, in the order the hero offers them. Each one demonstrates a
 * different thing StackReplay can determine. `label` is the plan's short public
 * name; every fact beside it (price, provider, rules, result) comes from the
 * catalog and the engine.
 */
const TARGETS = [
  {
    id: "copilot-pro-plus",
    label: "Copilot Pro+",
    target: { type: "subscription", planId: "github-copilot-pro-plus" },
  },
  {
    id: "chatgpt-pro",
    label: "ChatGPT Pro",
    target: { type: "subscription", planId: "openai-chatgpt-pro" },
  },
  {
    id: "claude-max",
    label: "Claude Max 20x",
    // Claude plans do not run GPT models, so this target is a translated
    // replay: an explicit, inspectable substitution chosen for the scenario,
    // never a claim that the models are equivalent.
    target: {
      type: "subscription",
      planId: "anthropic-claude-max-20x",
      modelTranslation: {
        id: "homepage-scenario",
        version: "1",
        name: "Homepage scenario: GPT-5.6 models to Claude Sonnet 5, GPT-6 models to Claude Opus 5.5",
        provenance: "builtin-scenario",
        transform: "token-preserving",
        rules: [
          { sourceModelId: "gpt-5-6-luna", targetModelId: "claude-sonnet-5" },
          { sourceModelId: "gpt-5-6-sol", targetModelId: "claude-sonnet-5" },
          { sourceModelId: "gpt-5-6-terra", targetModelId: "claude-sonnet-5" },
          { sourceModelId: "gpt-6-astra", targetModelId: "claude-opus-5-5" },
          { sourceModelId: "gpt-6-sol", targetModelId: "claude-opus-5-5" },
        ],
      },
    },
  },
  {
    id: "openai-api",
    label: "OpenAI API",
    target: { type: "api", providerId: "openai" },
  },
];

const catalog = loadDefaultCatalog();
const identity = bundledModelIdentity();
const exported = JSON.parse(readFileSync(source, "utf8"));
const allEvents = exported.events;
if (!Array.isArray(allEvents) || allEvents.length === 0) {
  throw new Error("The export has no events.");
}

const modelName = (id) => catalog.models[id]?.name ?? id;
const dayOf = (iso) => iso.slice(0, 10);

// The same identity rule the app's explicit "resolved only" scope applies
// (apps/web/lib/workload-scope.ts): a recorded canonical id the catalog knows,
// otherwise the catalog's own alias resolution for the event's harness.
const known = new Set(identity.modelIds);
const resolvedEvents = allEvents.filter((event) => {
  const recorded = event.model.canonicalId;
  if (recorded !== undefined && known.has(recorded)) return true;
  const harness = event.harness?.id;
  return (
    identity.resolve(event.model.rawName, harness === undefined ? undefined : { harness })
      .canonicalId !== undefined
  );
});

// Day-level chronology over the whole range, zero days kept, in UTC.
const sortedDays = allEvents.map((event) => dayOf(event.occurredAt)).sort();
const firstDay = sortedDays[0];
const lastDay = sortedDays.at(-1);
const days = [];
for (
  let cursor = new Date(`${firstDay}T00:00:00Z`);
  dayOf(cursor.toISOString()) <= lastDay;
  cursor = new Date(cursor.getTime() + 86_400_000)
) {
  days.push(dayOf(cursor.toISOString()));
}
const dayIndex = new Map(days.map((day, index) => [day, index]));
const eventsPerDay = days.map(() => 0);
for (const event of resolvedEvents) eventsPerDay[dayIndex.get(dayOf(event.occurredAt))] += 1;

// Workload facts come from the engine's own projection, so the hero's token
// arithmetic is the same arithmetic the product shows for a real scan.
const workloadProjection = projectReplay(
  replay({
    events: allEvents,
    target: { type: "api", providerId: "openai" },
    catalog,
    context: { rulesAsOf: RULES_AS_OF },
  }),
  catalog,
).workload;

const sessions = new Set(allEvents.map((event) => event.source.nativeSessionHash)).size;
const projects = new Set(allEvents.map((event) => event.projectHash).filter(Boolean)).size;
const activeDays = new Set(sortedDays).size;
const tokens = workloadProjection.tokens;
const knownTokens = workloadProjection.knownTokens;

const modelMix = [...workloadProjection.modelShare]
  .filter((row) => row.modelId !== undefined && known.has(row.modelId))
  .sort((a, b) => b.eventCount - a.eventCount)
  .map((row) => ({ name: modelName(row.modelId), events: row.eventCount }));

const workload = {
  recordedEvents: allEvents.length,
  replayedEvents: resolvedEvents.length,
  unresolvedEvents: allEvents.length - resolvedEvents.length,
  sessions,
  projects,
  activeDays,
  from: firstDay,
  to: lastDay,
  rangeDays: days.length,
  knownTokens,
  cacheReadTokens: tokens.cacheRead,
  modelMix,
  days: days.map((day, index) => ({ date: day, events: eventsPerDay[index] })),
};

function fixed2(value) {
  return value === undefined ? undefined : Number(value).toFixed(2);
}

function buildTarget(spec) {
  const result = replay({
    events: resolvedEvents,
    target: spec.target,
    catalog,
    context: { rulesAsOf: RULES_AS_OF },
  });
  const projection = projectReplay(result, catalog);
  const outcomes = Object.fromEntries(projection.outcomes.map((row) => [row.key, row.count]));
  const recordedModels = projection.workload.modelShare.length;
  const translation = projection.translation;
  const isApi = projection.target.kind === "api";
  const numeric = projection.constraints.length > 0;

  // Per-day split of served demand into "within allowance" and "billed above
  // it", from the engine's own crossing instants. A monthly credit pool that
  // has run out bills every later event in the same window, so an event is
  // above the allowance exactly when it follows its window's crossing. The
  // split is checked against the engine's own overage count below.
  const overPerDay = days.map(() => 0);
  if (numeric) {
    const windows = projection.crossings.map((crossing) => ({
      start: Date.parse(crossing.startedAt),
      end: Date.parse(crossing.endedAt),
      exceededAt: Date.parse(crossing.exceededAt),
    }));
    for (const event of resolvedEvents) {
      const at = Date.parse(event.occurredAt);
      const window = windows.find((entry) => at >= entry.start && at < entry.end);
      if (window !== undefined && at > window.exceededAt) {
        overPerDay[dayIndex.get(dayOf(event.occurredAt))] += 1;
      }
    }
    const splitTotal = overPerDay.reduce((sum, value) => sum + value, 0);
    const engineOverage = (outcomes.overage ?? 0) + (outcomes.blocked ?? 0);
    if (Math.abs(splitTotal - engineOverage) > windows.length) {
      throw new Error(
        `${spec.id}: day split (${splitTotal}) disagrees with the engine (${engineOverage}).`,
      );
    }
  }

  const constraint = projection.constraints[0];
  const base = {
    id: spec.id,
    label: spec.label,
    catalogName: projection.target.label,
    provider: projection.target.providerName,
    kind: projection.target.kind,
    mode: projection.mode ?? "exact",
    price:
      projection.target.priceAmount === undefined
        ? undefined
        : {
            amount: fixed2(projection.target.priceAmount),
            interval: projection.target.priceInterval,
          },
    reference: projection.target.reference,
    served:
      outcomes.included !== undefined ? outcomes.included + (outcomes.overage ?? 0) : undefined,
    unavailable: outcomes.unavailable ?? 0,
    undecided: outcomes.unknown ?? 0,
    models: {
      recorded: recordedModels,
      translated:
        translation === undefined
          ? []
          : translation.applied.map((row) => ({
              from: modelName(row.sourceModelId),
              to: modelName(row.targetModelId),
              events: row.eventCount,
            })),
    },
  };

  if (isApi) {
    return {
      ...base,
      result: {
        class: "published-rate",
        cost: fixed2(projection.economics.targetCost),
        established: projection.economics.targetCostEstablished,
      },
      overPerDay: undefined,
    };
  }
  if (numeric) {
    return {
      ...base,
      result: {
        class: "allowance-exhausted",
        allowance: {
          label: constraint.label,
          amount: fixed2(constraint.limitUnits),
          unit: constraint.unit,
          window: constraint.window,
        },
        included: outcomes.included,
        above: outcomes.overage,
        blocked: outcomes.blocked,
        overageCost: fixed2(projection.economics.overageCost),
        totalCost: fixed2(projection.economics.targetCost),
        crossings: projection.crossings.map((crossing) => ({
          date: dayOf(crossing.exceededAt),
          demand: fixed2(crossing.observedUnits),
          included: fixed2(crossing.includedUnits),
        })),
      },
      overPerDay,
    };
  }
  return {
    ...base,
    result: {
      class: "capacity-unpublished",
      established: false,
    },
    overPerDay: undefined,
  };
}

const targets = TARGETS.map(buildTarget);

const artifact = {
  fixtureVersion: 1,
  generatedBy: "apps/web/scripts/build-hero-fixture.mjs",
  label: "Anonymized real workload",
  source: "Codex",
  engineVersion: ENGINE_VERSION,
  methodologyVersion: REPLAY_METHODOLOGY_VERSION,
  catalogVersion: catalog.catalogVersion,
  rulesAsOf: RULES_AS_OF,
  workload,
  targets,
};

assertAnonymized(artifact, allEvents);

writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
try {
  execFileSync(join(root, "node_modules", ".bin", "biome"), ["format", "--write", outputPath], {
    cwd: root,
    stdio: "pipe",
  });
} catch {
  process.stderr.write("biome format skipped: the fixture is unformatted\n");
}

process.stdout.write(
  `${JSON.stringify(
    {
      recordedEvents: workload.recordedEvents,
      replayedEvents: workload.replayedEvents,
      sessions,
      projects,
      knownTokens,
      targets: targets.map((target) => ({ id: target.id, result: target.result.class })),
    },
    null,
    2,
  )}\n`,
);

/**
 * Refuses to write a fixture that carries anything finer than an aggregate:
 * an identifier from the source (session, project or event hash, raw model
 * spelling), a path, or a timestamp more precise than a calendar day.
 */
function assertAnonymized(value, events) {
  const text = JSON.stringify(value);
  const forbidden = new Set();
  for (const event of events) {
    forbidden.add(event.id);
    forbidden.add(event.source.nativeSessionHash);
    forbidden.add(event.source.nativeEventHash);
    if (event.projectHash !== undefined) forbidden.add(event.projectHash);
  }
  for (const token of forbidden) {
    if (typeof token === "string" && token.length > 6 && text.includes(token)) {
      throw new Error("The fixture contains a source identifier.");
    }
  }
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u.test(text)) {
    throw new Error("The fixture contains a timestamp finer than a day.");
  }
  if (/(?:^|["\s])(?:\/[\w.-]+){2,}|[A-Za-z]:\\\\/u.test(text)) {
    throw new Error("The fixture contains a path.");
  }
}
