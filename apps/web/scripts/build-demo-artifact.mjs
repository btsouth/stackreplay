import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDefaultCatalog } from "@stackreplay/catalog/load";
import {
  ENGINE_VERSION,
  projectReplay,
  REPLAY_METHODOLOGY_VERSION,
  replay,
} from "@stackreplay/replay-engine";
import {
  buildDemoScenarioExport,
  buildDemoUnknownSampleExport,
  DEMO_NAMESPACE,
  DEMO_SCENARIO_TARGETS,
  DEMO_TRANSLATION_POLICY,
  DEMO_UNMAPPED_MODEL,
} from "@stackreplay/test-fixtures/demo-scenario";

/**
 * Builds the engine-backed M4D demonstration artifact.
 *
 * The homepage and the first-run experience are not allowed to show a claimed
 * replay: they show this file, which is the production engine's own output over
 * a deterministic synthetic month (decision 33's synthetic namespace, M4D's
 * "outputs must come from actual engine fixtures" rule).
 *
 * The file carries projections, not raw results: `projectReplay` is the same
 * display contract the app's worker produces, so a surface cannot accidentally
 * read one shape on the homepage and another in the app.
 *
 * Run it from anywhere: the paths are resolved from this file's own location.
 *
 *   pnpm --filter @stackreplay/test-fixtures demo
 *
 * The artifact is committed, so a review sees the data as well as the code, and
 * `demo-artifact.test.ts` fails if a change to the engine or the catalog makes
 * it stale.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const outputPath = join(root, "packages", "test-fixtures", "generated", "m4d-demo.json");

/** The instant the scenario is replayed at. Fixed, so the result is reproducible. */
const RULES_AS_OF = "2026-09-20";

function targetFor(id) {
  switch (id) {
    case "exact-subscription":
      return { type: "subscription", planId: DEMO_NAMESPACE.planExact };
    case "translated-subscription":
      // A translation policy is scenario input and travels on the target itself
      // (M4B): the replay applies exactly the substitutions the policy names.
      return {
        type: "subscription",
        planId: DEMO_NAMESPACE.planConstrained,
        modelTranslation: DEMO_TRANSLATION_POLICY,
      };
    default:
      return { type: "api", providerId: DEMO_NAMESPACE.apiProvider };
  }
}

const catalog = loadDefaultCatalog();
const workload = buildDemoScenarioExport();

const scenario = {
  id: "m4d-demo",
  title: "Synthetic demonstration month",
  description:
    "A deterministic synthetic month of AI coding demand in the catalog's example- namespace, replayed by the production engine against example- targets.",
  translationPolicy: DEMO_TRANSLATION_POLICY,
  eventCount: workload.events.length,
  range: workload.range,
  sources: workload.detectedSources.map((source) => ({
    adapterId: source.adapterId,
    name: source.name,
    role: source.role ?? "usage",
  })),
};

const entries = DEMO_SCENARIO_TARGETS.map((target) => {
  const result = replay({
    events: workload.events,
    target: targetFor(target.id),
    catalog,
    context: { rulesAsOf: RULES_AS_OF },
  });
  return {
    id: target.id,
    label: target.label,
    detail: target.detail,
    kind: target.kind,
    translated: result.semantics?.mode === "translated",
    projection: projectReplay(result, catalog),
  };
});

/**
 * The companion sample: the same targets over a workload that keeps two things
 * unknown. It is what the instrument shows when a reader asks what happens to
 * demand the engine cannot decide, and it is the only place in the artifact
 * where a headline figure is allowed to read as unknown.
 */
const unknownWorkload = buildDemoUnknownSampleExport();
const unknownSample = {
  eventCount: unknownWorkload.events.length,
  unmappedModel: DEMO_UNMAPPED_MODEL,
  projection: projectReplay(
    replay({
      events: unknownWorkload.events,
      target: targetFor("translated-subscription"),
      catalog,
      context: { rulesAsOf: RULES_AS_OF },
    }),
    catalog,
  ),
};

const artifact = {
  artifactVersion: 1,
  generatedBy: "apps/web/scripts/build-demo-artifact.mjs",
  engineVersion: ENGINE_VERSION,
  methodologyVersion: REPLAY_METHODOLOGY_VERSION,
  catalogVersion: catalog.catalogVersion,
  rulesAsOf: RULES_AS_OF,
  scenario,
  targets: entries,
  unknownSample,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

// The artifact is committed and therefore covered by the formatting gate, so the
// generator canonicalises its own output instead of leaving the tree dirty after
// every run. A missing formatter is not a reason to lose the generated file.
try {
  execFileSync(join(root, "node_modules", ".bin", "biome"), ["format", "--write", outputPath], {
    cwd: root,
    stdio: "pipe",
  });
} catch {
  process.stderr.write("biome format skipped: the artifact is unformatted\n");
}

const summary = entries.map((entry) => ({
  id: entry.id,
  mode: entry.projection.mode,
  class: entry.projection.replayability.class,
  headline: entry.projection.headline.statement,
  outcomes: entry.projection.outcomes.map((outcome) => [outcome.key, outcome.count]),
  crossings: entry.projection.crossings.length,
  targetCost: entry.projection.economics.targetCost,
  warnings: entry.projection.warnings.map((warning) => warning.code),
}));
process.stdout.write(
  `${JSON.stringify(
    {
      outputPath,
      events: workload.events.length,
      unknownSampleEvents: unknownWorkload.events.length,
      summary,
    },
    null,
    2,
  )}\n`,
);
