import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { ExecutionTargetV1, UsageEventV1 } from "@stackreplay/schema";
import {
  buildArchetypeExport,
  WORKLOAD_ARCHETYPE_IDS,
  type WorkloadArchetypeId,
} from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  coverageShare,
  type SuggestedRoute,
  suggestRoutes,
  type TargetCoverage,
  targetCoverages,
  workloadSlices,
} from "./routes";
import { runScopedReplay } from "./scoped-replay";
import { verdictOfOutcome } from "./verdict-facts";
import { buildWorkloadProfile } from "./workload-profile";

/**
 * Phase 3 acceptance: a suggested route answers for the work it is scoped to,
 * and a coverage figure shown before a replay is the replay's own count.
 */

const catalog = loadBundledCatalog();
const identity = bundledModelIdentity();
const RULES = "2026-09-24";
const ZONE = "America/New_York";
const MEANINGFUL =
  /\$[\d,]+|\b[A-Z][a-z]{2} \d{1,2}\b|\d[\d,]* (?:[A-Z][\w ]+ )?calls?\b|\d+(?:\.\d+)?%/u;
const ENGINE_STATES =
  /full coverage ruled out|capacity not quantified|not determinable|not established|would have fit|^unknown/iu;

function workload(archetype: WorkloadArchetypeId) {
  const exported = buildArchetypeExport(archetype);
  const profile = buildWorkloadProfile(exported.events, { identity, catalog, timeZone: ZONE });
  const names = new Map(exported.detectedSources.map((source) => [source.adapterId, source.name]));
  return { events: exported.events, names, slices: workloadSlices(profile.sources, names) };
}

function targetOf(coverage: TargetCoverage): ExecutionTargetV1 {
  return coverage.kind === "api"
    ? { type: "api", providerId: coverage.id }
    : { type: "subscription", planId: coverage.id };
}

function replayRoute(
  events: readonly UsageEventV1[],
  names: ReadonlyMap<string, string>,
  target: ExecutionTargetV1,
  sources: readonly string[],
) {
  const outcome = runScopedReplay({
    events,
    target,
    catalog,
    identity,
    rulesAsOf: RULES,
    timeZone: ZONE,
    sources,
    sourceNames: names,
  });
  return { outcome, composed: verdictOfOutcome(outcome, "Target", { timeZone: ZONE, catalog }) };
}

describe("target coverage", () => {
  // Each case replays every public target over every tool slice: well under a
  // second locally, several on a shared CI runner, so it declares its budget.
  it.each(WORKLOAD_ARCHETYPE_IDS)(
    "%s: every count is the engine's own",
    { timeout: 60_000 },
    (archetype) => {
      const { events, names, slices } = workload(archetype);
      for (const slice of slices)
        for (const coverage of targetCoverages(slice, RULES, { synthetic: false })) {
          const { outcome } = replayRoute(events, names, targetOf(coverage), slice.sources);
          const count = (key: string) =>
            outcome.projection.outcomes.find((entry) => entry.key === key)?.count ?? 0;
          expect(
            count("included") + count("overage") + count("blocked"),
            `${archetype} / ${slice.label} / ${coverage.name}`,
          ).toBe(coverage.runnable);
          expect(outcome.projection.workload.eventCount).toBe(coverage.events);
        }
    },
  );

  it("orders targets by how much of the work they run, and never offers demo targets", () => {
    const { slices } = workload("mixed");
    const whole = slices[0];
    if (whole === undefined) throw new Error("no slice");
    const coverages = targetCoverages(whole, RULES, { synthetic: false });
    expect(coverages.every((coverage) => !coverage.id.startsWith("example-"))).toBe(true);
    for (let index = 1; index < coverages.length; index += 1)
      expect(coverages[index - 1]?.runnable ?? 0).toBeGreaterThanOrEqual(
        coverages[index]?.runnable ?? 0,
      );
    expect(coverages[0]?.name).toBe("Copilot Pro+");
  });
});

describe("suggested routes", () => {
  const routesFor = (archetype: WorkloadArchetypeId) => {
    const data = workload(archetype);
    return { ...data, routes: suggestRoutes(data.slices, RULES, { synthetic: false }) };
  };

  it.each(WORKLOAD_ARCHETYPE_IDS)(
    "%s: every route answers with a meaningful known fact",
    (archetype) => {
      const { events, names, routes } = routesFor(archetype);
      expect(routes.length).toBeGreaterThan(0);
      for (const route of routes) {
        if (!route.translated) expect(coverageShare(route.target)).toBeGreaterThanOrEqual(0.5);
        const { composed } = replayRoute(
          events,
          names,
          targetOf(route.target),
          route.slice.sources,
        );
        const first = composed?.verdict.headline.split(/(?<=\.)\s/u)[0] ?? "";
        expect(first, `${archetype} / ${route.id}`).toMatch(MEANINGFUL);
        expect(first).not.toMatch(ENGINE_STATES);
        if (route.answer === "dollars") expect(composed?.verdict.figure.kind).toBe("money");
      }
    },
  );

  const byId = (routes: SuggestedRoute[], id: SuggestedRoute["id"]) =>
    routes.find((route) => route.id === id);

  it("a mixed workload prices its largest single-provider slice and runs the plan that serves it", () => {
    const { routes } = routesFor("mixed");
    const api = byId(routes, "api-value");
    expect(api?.target.name).toBe("Anthropic API");
    expect(api?.slice.label).toBe("Claude Code");
    const numeric = byId(routes, "numeric-limits");
    expect(numeric?.target.name).toBe("Copilot Pro+");
    expect(numeric?.slice.sources).toEqual([]);
    expect(byId(routes, "switch-provider")?.target.name).toBe("Claude Max 20x");
  });

  it("a single-provider workload is priced whole and offered the other provider", () => {
    const { routes } = routesFor("codex-only");
    expect(byId(routes, "api-value")?.target.name).toBe("OpenAI API");
    expect(byId(routes, "api-value")?.slice.sources).toEqual([]);
    expect(byId(routes, "switch-provider")?.target.name).toBe("Claude Max 20x");
    expect(byId(routes, "switch-provider")?.translated).toBe(true);
  });

  it("never points the numeric route at a plan that runs under half the work", () => {
    for (const archetype of WORKLOAD_ARCHETYPE_IDS) {
      const numeric = byId(routesFor(archetype).routes, "numeric-limits");
      if (numeric !== undefined) expect(coverageShare(numeric.target)).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe("tool slices", () => {
  it("a Claude Code slice of a combined workload reproduces the Claude-only result", () => {
    const claude = buildArchetypeExport("claude-only");
    const codex = buildArchetypeExport("codex-only");
    const combined = [...claude.events, ...codex.events];
    const names = new Map([
      ["claude-code", "Claude Code"],
      ["codex", "Codex"],
    ]);
    for (const target of [
      { type: "subscription", planId: "github-copilot-pro-plus" },
      { type: "subscription", planId: "anthropic-claude-max-20x" },
      { type: "api", providerId: "anthropic" },
    ] satisfies ExecutionTargetV1[]) {
      const alone = replayRoute(claude.events, names, target, []);
      const sliced = replayRoute(combined, names, target, ["claude-code"]);
      expect(sliced.outcome.result.economics).toEqual(alone.outcome.result.economics);
      expect(sliced.outcome.projection.outcomes).toEqual(alone.outcome.projection.outcomes);
      expect(sliced.outcome.projection.crossings).toEqual(alone.outcome.projection.crossings);
      expect(sliced.outcome.scope?.source).toEqual({
        ids: ["claude-code"],
        label: "Claude Code",
        events: claude.events.length,
      });
      // The verdict states the slice, then says the same thing about it.
      const scoped = sliced.composed?.verdict;
      expect(scoped?.headline).toMatch(
        /^(?:For your Claude Code work, |Your Claude Code work )|your [\d,]+ Claude Code calls/u,
      );
      expect(scoped?.support.join(" ")).toMatch(
        new RegExp(
          `Scope: your Claude Code work, 3,200 of ${combined.length.toLocaleString("en-US")} calls`,
          "u",
        ),
      );
      expect(sliced.composed?.facts.calls).toEqual(alone.composed?.facts.calls);
      expect(sliced.composed?.facts.money).toEqual(alone.composed?.facts.money);
    }
  });
});
