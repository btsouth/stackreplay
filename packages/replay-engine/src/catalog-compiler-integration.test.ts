// biome-ignore-all lint/style/noNonNullAssertion: each fixture asserts its known synthetic identity.
import { compileExecutionPlan } from "@stackreplay/catalog/execution";
import type { CompiledExecutionPlanV2 } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import {
  type SyntheticFamily,
  syntheticExecutionCatalog,
} from "../../catalog/test-fixtures/execution.js";
import { ns, replayCompiledResource, resourceReadiness } from "./compiled-capacity.js";
import { optimizeCompiledExactModels } from "./compiled-optimizer.js";
import { bindExecutionScenario, purchaseCycleEnd } from "./execution-binding.js";
import { request } from "./fixtures/exact-optimizer.js";

const monthStart = "2026-09-01T00:00:00Z";
const at = "2026-09-12T00:00:00Z";
function fixture(
  family: SyntheticFamily,
  options: {
    api?: boolean;
    start?: string;
    periodStart?: string;
    end?: string;
    timezone?: string;
    fresh?: boolean;
    facts?: Record<string, "true" | "false" | "unknown">;
  } = {},
) {
  const catalog = syntheticExecutionCatalog(options.api ? [family, "api"] : [family]);
  const plan = compileExecutionPlan(catalog, `fixture-${family}`, `${family}-v1`, [], at).artifact;
  const api = options.api
    ? compileExecutionPlan(catalog, "fixture-api", "api-v1", [], at).artifact
    : undefined;
  const artifacts = api ? [plan, api] : [plan];
  const start = options.start ?? monthStart;
  const timezone = options.timezone ?? "UTC";
  const cycleEnd =
    plan.purchase.kind === "subscription"
      ? purchaseCycleEnd(plan.purchase.term === "28_days" ? "28_days" : "month", start, timezone)
      : undefined;
  const period = {
    start: options.periodStart ?? options.start ?? monthStart,
    end: options.end ?? "2026-09-13T00:00:00Z",
  };
  const binding = (artifact: CompiledExecutionPlanV2) => ({
    id: artifact.planId,
    artifactHash: artifact.artifactHash,
    ...(artifact.purchase.kind === "subscription"
      ? { cycle: { id: "cycle", start, end: cycleEnd! }, billingTimezone: timezone }
      : {}),
    windowAnchors: family === "token" && artifact === plan ? { "reset-anchor": start } : {},
    firstUse: family === "goat" && artifact === plan ? { session: "inactive" as const } : {},
    facts: {
      ...(artifact.computation.kind === "executable"
        ? Object.fromEntries(
            artifact.computation.routes.flatMap((r) => [
              [`harness:${r.id}`, "true"],
              [`protocol:${r.id}`, "true"],
            ]),
          )
        : {}),
      ...(options.facts ?? {}),
    } as Record<string, "true" | "false" | "unknown">,
    sharedCapacityIds: [],
  });
  const scenario = bindExecutionScenario(artifacts, {
    version: 2,
    rulesAt: at,
    period,
    resources: artifacts.map(binding),
    initial: {
      unlisted: options.fresh === false ? "unknown" : "fresh",
      observations: [],
      assumptionRef: "fresh-assumption",
    },
    observationEvidence: [
      { id: "fresh-assumption", hash: "synthetic-local-assumption", kind: "assumption" },
      { id: "local-meter", hash: "synthetic-local-meter", kind: "user" },
    ],
    chronology: "request",
    maxSubscriptions: 2,
    maxAssignmentStates: 10000,
  });
  return { catalog, plan, api, artifacts, scenario };
}
type Fixture = ReturnType<typeof fixture>;
function seed(
  input: Fixture,
  poolId: string,
  constraintId: string,
  consumedUnits: string,
  window: { id: string; start: string; end: string },
) {
  input.scenario.initial.observations.push({
    resourceInstanceId: input.scenario.resources[0]!.id,
    artifactHash: input.plan.artifactHash,
    poolId,
    constraintId,
    window,
    asOf: input.scenario.period.start,
    consumedUnits,
    latched: false,
    observationRef: "local-meter",
  });
}
function replay(input: Fixture, offers: { model: string; tokens: number; at: string }[]) {
  return replayCompiledResource(
    { artifact: input.plan, binding: input.scenario.resources[0]! },
    input.scenario,
    offers.map((o, i) => ({
      event: request(`e${String(i).padStart(5, "0")}`, o.tokens, o.model, o.at),
      at: ns(o.at),
      modelId: o.model,
      routeId:
        input.plan.computation.kind === "executable"
          ? input.plan.computation.routes.find((r) => r.models.includes(o.model))!.id
          : "unknown",
    })),
  );
}
function optimize(input: Fixture, offers: { model: string; tokens: number; at: string }[]) {
  return optimizeCompiledExactModels({
    contract: "compiled-v2",
    catalog: input.catalog,
    artifacts: input.artifacts,
    scenario: input.scenario,
    events: offers.map((o, i) =>
      request(`e${String(i).padStart(5, "0")}`, o.tokens, o.model, o.at),
    ),
  });
}
describe("C1 compiler to O3B.1", () => {
  it("Claude-like: known fee and verified relative capacity remain non-computable", () => {
    const input = fixture("claude", { api: true });
    const result = optimize(input, [{ model: "fixture-a", tokens: 1000000, at: monthStart }]);
    expect(result.candidates.find((c) => c.id === "fixture-claude")?.status).toBe("not_computable");
    expect(input.plan.purchase).toMatchObject({ fixedUsd: "100" });
    expect(result.candidates.find((c) => c.id === "api")?.status).toBe("feasible");
  });
  it("GOAT-like: one pool, four simultaneous views and local initial state", () => {
    const input = fixture("goat", { start: monthStart, end: "2026-09-13T00:00:00Z" });
    input.scenario.period.start = at;
    input.scenario.resources[0]!.firstUse.session = {
      id: "active",
      start: "2026-09-11T23:00:00Z",
      end: "2026-09-12T04:00:00Z",
    };
    seed(input, "included", "monthly-cap", "50", {
      id: `month:${monthStart}`,
      start: monthStart,
      end: "2026-10-01T00:00:00Z",
    });
    seed(input, "included", "a-cap", "19", {
      id: `month:${monthStart}`,
      start: monthStart,
      end: "2026-10-01T00:00:00Z",
    });
    seed(input, "included", "weekly-cap", "25", {
      id: "week:2026-09-07T00:00:00Z",
      start: "2026-09-07T00:00:00Z",
      end: "2026-09-14T00:00:00Z",
    });
    seed(input, "included", "session-cap", "10", {
      id: "active",
      start: "2026-09-11T23:00:00Z",
      end: "2026-09-12T04:00:00Z",
    });
    const result = replay(input, [
      { model: "fixture-a", tokens: 2000000, at },
      { model: "fixture-b", tokens: 4000000, at: "2026-09-12T00:01:00Z" },
    ]);
    expect(result.accepted).toBe(1);
    expect(result.debits[0]?.units).toBe("4");
    expect(result.capacity.find((c) => c.constraintId === "a-cap")?.initial).toBe("19");
    expect(result.capacity.find((c) => c.constraintId === "a-cap")?.crossings).toBe(1);
  });
  it("Token-Harbor-like: compiler schedule binds four non-carrying slices", () => {
    const input = fixture("token", { start: monthStart, end: "2026-09-09T00:02:00Z" });
    const windows = input.scenario.resources[0]!.windowInstances;
    expect(windows).toHaveLength(4);
    const result = replay(input, [
      { model: "fixture-a", tokens: 12000000, at: monthStart },
      { model: "fixture-a", tokens: 12000000, at: "2026-09-08T00:00:00Z" },
      { model: "fixture-a", tokens: 12000000, at: "2026-09-08T00:01:00Z" },
    ]);
    expect(result.accepted).toBe(2);
    expect(result.capacity.map((c) => c.accepted)).toEqual(["6", "6"]);
  });
  it("Cursor-like: two pools cannot borrow and separate initial readings", () => {
    const input = fixture("cursor");
    input.scenario.period.start = at;
    seed(input, "cursor-models", "cursor-cap", "8", {
      id: `month:${monthStart}`,
      start: monthStart,
      end: "2026-10-01T00:00:00Z",
    });
    const result = replay(input, [
      { model: "fixture-a", tokens: 1, at },
      { model: "fixture-b", tokens: 1, at: "2026-09-12T00:01:00Z" },
    ]);
    expect(result.accepted).toBe(1);
    expect(result.capacity.map((c) => [c.poolId, c.accepted])).toEqual([
      ["cursor-models", "0"],
      ["other-models", "5"],
    ]);
  });
  it("Copilot-like: scoped credits, unknown cohort and flexible component", () => {
    const input = fixture("copilot");
    expect(input.plan.computation).toMatchObject({ kind: "not_computable" });
    expect(
      resourceReadiness(
        { artifact: input.plan, binding: input.scenario.resources[0]! },
        input.scenario,
      ).status,
    ).toBe("not_computable");
    input.scenario.resources[0]!.facts["legacy-cohort"] = "false";
    expect(
      resourceReadiness(
        { artifact: input.plan, binding: input.scenario.resources[0]! },
        input.scenario,
      ).status,
    ).toBe("unavailable");
  });
  it("resolves route and plan eligibility from explicit facts", () => {
    const absent = fixture("cursor");
    const { scenarioHash: _hash, resources, ...rest } = absent.scenario;
    const draftResources = resources.map(({ windowInstances: _instances, ...resource }) => ({
      ...resource,
      facts: { ...resource.facts },
    }));
    delete draftResources[0]!.facts["harness:included-a"];
    absent.scenario = bindExecutionScenario([absent.plan], { ...rest, resources: draftResources });
    expect(absent.scenario.resources[0]!.facts["harness:included-a"]).toBe("unknown");
    expect(replay(absent, [{ model: "fixture-a", tokens: 1, at: monthStart }]).status).toBe(
      "not_computable",
    );
    const denied = fixture("cursor", { facts: { "harness:included-a": "false" } });
    expect(replay(denied, [{ model: "fixture-a", tokens: 1, at: monthStart }]).status).toBe(
      "unavailable",
    );
  });
  it("binds a DST-crossing purchased month without inferring it from workload start", () => {
    const input = fixture("cursor", {
      start: "2027-03-01T05:00:00Z",
      periodStart: "2027-03-02T05:00:00Z",
      end: "2027-03-03T05:00:00Z",
      timezone: "America/New_York",
    });
    expect(input.scenario.resources[0]!.cycle?.end).toBe("2027-04-01T04:00:00Z");
    expect(input.scenario.resources[0]!.cycle?.start).not.toBe(input.scenario.period.start);
    expect(
      resourceReadiness(
        { artifact: input.plan, binding: input.scenario.resources[0]! },
        input.scenario,
      ).status,
    ).toBe("feasible");
    expect(() => fixture("cursor", { start: monthStart, end: "2026-10-02T00:00:00Z" })).toThrow(
      /crosses/,
    );
  });
  it("reconciles local readings by concrete instance and rejects conflicts", () => {
    const input = fixture("token", { start: monthStart, end: "2026-09-05T00:00:00Z" });
    input.scenario.period.start = "2026-09-04T00:00:00Z";
    const w = input.scenario.resources[0]!.windowInstances[0]!;
    seed(input, "included", "slice-cap", "4", {
      id: w.windowInstanceId,
      start: w.start,
      end: w.end,
    });
    const { scenarioHash: _hash, resources, ...rest } = input.scenario;
    const draft = {
      ...rest,
      resources: resources.map(({ windowInstances: _instances, ...resource }) => resource),
    };
    const bound = bindExecutionScenario([input.plan], {
      ...draft,
      initial: {
        ...draft.initial,
        observations: [
          input.scenario.initial.observations[0]!,
          input.scenario.initial.observations[0]!,
        ],
      },
    });
    expect(bound.initial.observations).toHaveLength(1);
    expect(bound.observationEvidence.find((e) => e.id === "local-meter")?.kind).toBe("user");
    expect(input.plan.claims.some((c) => c.id === "local-meter")).toBe(false);
    expect(() =>
      bindExecutionScenario([input.plan], {
        ...draft,
        initial: {
          ...draft.initial,
          observations: [
            input.scenario.initial.observations[0]!,
            { ...input.scenario.initial.observations[0]!, consumedUnits: "5" },
          ],
        },
      }),
    ).toThrow(/Conflicting/);
  });
  it("Ollama/Kiro-like: deterministic allowance executes, hidden measurement does not", () => {
    const input = fixture("ollama");
    input.scenario.period.start = at;
    seed(input, "included", "cap", "50", {
      id: `month:${monthStart}`,
      start: monthStart,
      end: "2026-10-01T00:00:00Z",
    });
    const result = replay(input, [
      { model: "fixture-a", tokens: 1, at },
      { model: "fixture-a", tokens: 1, at: "2026-09-12T00:01:00Z" },
    ]);
    expect(result.accepted).toBe(1);
    expect(result.variableUsd).toBe("0");
    const v = input.catalog.plans["fixture-ollama"]!.executionVersions![0]!;
    v.capabilities.push({
      code: "measurement_missing",
      subject: "concurrency",
      claimRefs: ["capacity"],
    });
    expect(
      compileExecutionPlan(input.catalog, "fixture-ollama", "ollama-v1", [], at).artifact
        .computation.kind,
    ).toBe("not_computable");
  });
});
