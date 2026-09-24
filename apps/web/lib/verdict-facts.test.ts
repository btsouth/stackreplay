import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { projectReplay, replay } from "@stackreplay/replay-engine";
import type { ExecutionTargetV1 } from "@stackreplay/schema";
import { buildArchetypeExport, type WorkloadArchetypeId } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { verdictOf, verdictOfOutcome } from "./verdict-facts";
import { splitByIdentity } from "./workload-scope";

/**
 * Phase 2 acceptance: for each scenario the first sentence of the verdict
 * carries a date, a dollar amount, a count or a bounded share, and is never
 * only an engine state. Verdicts are composed from real engine replays of the
 * archetype workloads, not from hand-written facts.
 */

const catalog = loadBundledCatalog();
const MEANINGFUL = /\$[\d,]+|\b[A-Z][a-z]{2} \d{1,2}\b|\d[\d,]* calls?\b|\d+(?:\.\d+)?%/u;
const ENGINE_STATES =
  /full coverage ruled out|capacity not quantified|not determinable|not established|would have fit|^unknown/iu;

function verdictFor(archetype: WorkloadArchetypeId, target: ExecutionTargetV1, name: string) {
  const events = buildArchetypeExport(archetype).events;
  const result = replay({ events, target, catalog, context: { rulesAsOf: "2026-09-23" } });
  const projection = projectReplay(result, catalog, { timeZone: "America/New_York" });
  const composed = verdictOf({
    projection,
    result,
    targetName: name,
    scope: { kind: "all", recordedCalls: events.length },
    timeZone: "America/New_York",
    catalog,
  });
  if (composed === undefined) throw new Error("no verdict");
  return composed;
}

const scenarios: [string, WorkloadArchetypeId, ExecutionTargetV1, string][] = [
  [
    "Exact, same models",
    "claude-only",
    { type: "subscription", planId: "anthropic-claude-max-20x" },
    "Claude Max 20x",
  ],
  [
    "numeric subscription",
    "mixed",
    { type: "subscription", planId: "github-copilot-pro-plus" },
    "Copilot Pro+",
  ],
  [
    "qualitative subscription, mixed",
    "mixed",
    { type: "subscription", planId: "anthropic-claude-max-20x" },
    "Claude Max 20x",
  ],
  ["Direct API", "claude-only", { type: "api", providerId: "anthropic" }, "Anthropic API"],
  [
    "Translated",
    "codex-only",
    {
      type: "subscription",
      planId: "anthropic-claude-max-20x",
      modelTranslation: {
        id: "user-model-substitution",
        version: "1",
        name: "test",
        provenance: "user",
        transform: "token-preserving",
        rules: [
          { sourceModelId: "gpt-5-6-sol", targetModelId: "claude-opus-5-5" },
          { sourceModelId: "gpt-6-astra", targetModelId: "claude-sonnet-5" },
          { sourceModelId: "gpt-6-sol", targetModelId: "claude-opus-5-5" },
        ],
      },
    },
    "Claude Max 20x",
  ],
  ["unresolved subset", "heavy-unresolved", { type: "api", providerId: "openai" }, "OpenAI API"],
];

describe("decision-first verdicts from real replays", () => {
  it.each(scenarios)("%s leads with a meaningful fact", (_name, archetype, target, name) => {
    const { verdict } = verdictFor(archetype, target, name);
    const first = verdict.headline.split(/(?<=\.)\s/u)[0] ?? "";
    expect(first).toMatch(MEANINGFUL);
    expect(first).not.toMatch(ENGINE_STATES);
  });

  it("numeric plan names the run-out date and overage", () => {
    const { verdict, facts } = verdictFor(
      "mixed",
      { type: "subscription", planId: "github-copilot-pro-plus" },
      "Copilot Pro+",
    );
    expect(facts.runOut?.behaviour).toBe("overage");
    expect(verdict.headline).toMatch(
      /^Copilot Pro\+ credits would have run out on [A-Z][a-z]{2} \d+ \(day \d+\)/u,
    );
    expect(verdict.headline).toMatch(/about \$[\d,]+ in modeled overage over \d+ days/u);
  });

  it("an unresolved subset becomes a bounded share, not UNKNOWN", () => {
    const { verdict } = verdictFor(
      "heavy-unresolved",
      { type: "api", providerId: "openai" },
      "OpenAI API",
    );
    expect(verdict.bound).toBeDefined();
    expect(verdict.headline).toMatch(/\d+\.\d–\d+\.\d%/u);
  });

  it("translated verdicts say so and name the substitution", () => {
    const { verdict } = verdictFor(
      "codex-only",
      scenarios[4]?.[2] as ExecutionTargetV1,
      "Claude Max 20x",
    );
    expect(verdict.modeLabel).toBe("Translated replay");
    expect(verdict.headline).toMatch(/^Under your model substitution/u);
    expect(verdict.support.join(" ")).toMatch(/GPT-5\.6 Sol → Claude Opus 5\.5/u);
  });

  it("the Direct API figure is the engine's own total", () => {
    const events = buildArchetypeExport("claude-only").events;
    const result = replay({
      events,
      target: { type: "api", providerId: "anthropic" },
      catalog,
      context: { rulesAsOf: "2026-09-23" },
    });
    const { facts } = verdictFor(
      "claude-only",
      { type: "api", providerId: "anthropic" },
      "Anthropic API",
    );
    expect(facts.money.apiCost).toBe(result.economics?.targetCost.amount);
  });
});

describe("the verdict for a worker outcome", () => {
  // Claude-only demand with every hundredth call on an ID no catalog source
  // resolves: unrecognized IDs are then the only gap in a Direct API price.
  const events = buildArchetypeExport("claude-only").events.map((event, index) =>
    index % 100 === 0
      ? {
          ...event,
          model: { rawName: "orchid-alpha-preview" },
          confidence: { ...event.confidence, model: "unknown" as const },
        }
      : event,
  );
  const target: ExecutionTargetV1 = { type: "api", providerId: "anthropic" };
  const context = { rulesAsOf: "2026-09-23" };
  const options = { timeZone: "America/New_York", catalog };
  const full = replay({ events, target, catalog, context });
  const split = splitByIdentity(events, bundledModelIdentity());
  const scoped = replay({ events: split.resolved, target, catalog, context });

  it("leads with the resolved-only price and states what it leaves out", () => {
    expect(full.economics).toBeUndefined();
    expect(split.unresolved).toBe(32);
    const composed = verdictOfOutcome(
      {
        projection: projectReplay(full, catalog, { timeZone: options.timeZone }),
        result: full,
        resolvedScope: {
          projection: projectReplay(scoped, catalog, { timeZone: options.timeZone }),
          result: scoped,
          recordedEvents: events.length,
        },
      },
      "Anthropic API",
      options,
    );
    if (composed === undefined) throw new Error("no verdict");
    const { facts, verdict } = composed;
    expect(facts.scope).toEqual({ kind: "resolved", recordedCalls: 3_200 });
    expect(facts.calls.total).toBe(3_168);
    expect(facts.money.apiCost).toBe(scoped.economics?.targetCost.amount);
    expect(verdict.headline).toMatch(
      /^Your 3,168 calls with recognized models are worth \$[\d,]+\.\d\d at Anthropic's published API rates/u,
    );
    expect(verdict.support).toContain("That's a list-price equivalent, not what you paid.");
    expect(verdict.support.join(" ")).toMatch(
      /32 calls with unrecognized model IDs are left out and not priced/u,
    );
  });

  it("without the resolved-only replay, states the served share and no price", () => {
    const composed = verdictOfOutcome(
      { projection: projectReplay(full, catalog, { timeZone: options.timeZone }), result: full },
      "Anthropic API",
      options,
    );
    if (composed === undefined) throw new Error("no verdict");
    expect(composed.facts.scope.kind).toBe("all");
    expect(composed.facts.money.apiCost).toBeUndefined();
    expect(composed.verdict.figure.kind).toBe("share");
    expect(composed.verdict.headline).not.toMatch(/\$/u);
  });

  it("a scope the person chose is stated the same way", () => {
    const composed = verdictOfOutcome(
      {
        projection: projectReplay(scoped, catalog, { timeZone: options.timeZone }),
        result: scoped,
        scope: { excludedUnresolvedEvents: 32, recordedEvents: 3_200 },
      },
      "Anthropic API",
      options,
    );
    expect(composed?.facts.scope).toEqual({ kind: "resolved", recordedCalls: 3_200 });
    expect(composed?.verdict.headline).toMatch(/^Your 3,168 calls with recognized models/u);
  });
});
