// biome-ignore-all lint/style/noNonNullAssertion: deterministic fixture entries.
import { compiledExecutionPlanSchema, compiledExecutionPlanV1Schema } from "@stackreplay/schema";
import { describe, expect, it } from "vitest";
import { ns, replayCompiledResource, resourceReadiness } from "./compiled-capacity.js";
import { optimizeCompiledExactModels } from "./compiled-optimizer.js";
import {
  bindExecutionScenario,
  executionContentHash,
  hashBoundExecutionScenario,
  materializeFixedPartitions,
  purchaseCycleEnd,
} from "./execution-binding.js";
import { boundFixture, partitionPlan, pinPlan } from "./fixtures/bound-execution.js";
import { compiledScenario, syntheticPlan } from "./fixtures/compiled-execution.js";
import { request } from "./fixtures/exact-optimizer.js";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function ready(input: ReturnType<typeof boundFixture>) {
  return resourceReadiness(
    { artifact: input.artifacts[0]!, binding: input.scenario.resources[0]! },
    input.scenario,
  );
}
function replay(input: ReturnType<typeof boundFixture>, dates: string[]) {
  return replayCompiledResource(
    { artifact: input.artifacts[0]!, binding: input.scenario.resources[0]! },
    input.scenario,
    dates.map((at, i) => ({
      at: ns(at),
      event: request(`e${String(i).padStart(6, "0")}`, 1, "fixture-small", at),
      modelId: "fixture-small",
      routeId: "included-route",
    })),
  );
}
function monthly() {
  const p = partitionPlan();
  p.purchase = { kind: "subscription", term: "month", fixedUsd: "20", claimRefs: ["claim"] };
  if (p.computation.kind === "executable")
    p.computation.windows = [{ id: "monthly", kind: "calendar", unit: "month", timezone: "UTC" }];
  return pinPlan(p);
}
function observe(input: ReturnType<typeof boundFixture>) {
  const b = input.scenario.resources[0]!,
    w = b.windowInstances[0]!;
  input.scenario.initial.observations.push({
    resourceInstanceId: b.id,
    artifactHash: b.artifactHash,
    poolId: "included",
    constraintId: "cap",
    window: { id: w.windowInstanceId, start: w.start, end: w.end },
    asOf: input.scenario.period.start,
    consumedUnits: "1",
    latched: false,
    observationRef: "fresh",
  });
}
describe("O3B.1 bound partitions", () => {
  it("one immutable artifact binds two accounts and anchors, with different scenario hashes", () => {
    const p = partitionPlan(),
      before = JSON.stringify(p);
    const a = boundFixture(p),
      b = boundFixture(p, "2026-09-05T10:00:00Z", "UTC", "other");
    expect(JSON.stringify(p)).toBe(before);
    expect(a.artifacts[0]!.artifactHash).toBe(b.artifacts[0]!.artifactHash);
    expect(a.scenario.scenarioHash).not.toBe(b.scenario.scenarioHash);
    expect(a.scenario.resources[0]!.windowInstances[0]!.start).toBe("2026-09-03T10:00:00Z");
    expect(b.scenario.resources[0]!.windowInstances[0]!.start).toBe("2026-09-05T10:00:00Z");
    expect(ready(a).status).toBe("feasible");
    expect(ready(b).status).toBe("feasible");
  });
  it("four ordered half-open slices exactly cover 28 days and have no carry", () => {
    const input = boundFixture(),
      b = input.scenario.resources[0]!,
      windows = b.windowInstances;
    expect(windows).toHaveLength(4);
    expect(windows[0]!.start).toBe(b.cycle!.start);
    expect(windows[3]!.end).toBe(b.cycle!.end);
    for (let i = 0; i < 4; i++) {
      expect(ns(windows[i]!.end) - ns(windows[i]!.start)).toBe(7n * 86400n * 1000000000n);
      if (i) expect(windows[i - 1]!.end).toBe(windows[i]!.start);
    }
    // One unused request in slice one does not increase slice two's allowance of two.
    const result = replay(input, [
      windows[0]!.start,
      windows[0]!.end,
      windows[1]!.start,
      windows[1]!.start,
    ]);
    expect(result.accepted).toBe(3);
    expect(result.status).toBe("infeasible");
  });
  it("initial consumption targets a concrete instance and resets without fake calls or cost", () => {
    const input = boundFixture(),
      b = input.scenario.resources[0]!;
    input.scenario.period.start = "2026-09-04T10:00:00Z";
    observe(input);
    const result = replay(input, [
      input.scenario.period.start,
      input.scenario.period.start,
      b.windowInstances[1]!.start,
      b.windowInstances[1]!.start,
    ]);
    expect(result.accepted).toBe(3);
    expect(result.records).toBe(4);
    expect(result.variableUsd).toBe("0");
    input.scenario.initial.observations[0]!.window.id = "monthly";
    expect(ready(input).status).toBe("not_computable");
  });
  it("previous/reset/account observations never seed another window", () => {
    const input = boundFixture();
    observe(input);
    const next = boundFixture(input.artifacts[0], "2026-10-01T10:00:00Z");
    next.scenario.initial.observations = input.scenario.initial.observations;
    expect(ready(next).status).toBe("not_computable");
    const other = boundFixture(input.artifacts[0], undefined, "UTC", "other");
    other.scenario.initial.observations = clone(input.scenario.initial.observations);
    other.scenario.initial.observations[0]!.resourceInstanceId = "other";
    expect(ready(other).status).toBe("not_computable");
  });
  it("rejects missing anchors, modified partitions, order, gaps and wrong instance identities", () => {
    for (const change of [
      (b: ReturnType<typeof boundFixture>["scenario"]["resources"][number]) => {
        b.windowAnchors = {};
      },
      (b: ReturnType<typeof boundFixture>["scenario"]["resources"][number]) => {
        b.windowInstances.reverse();
      },
      (b: ReturnType<typeof boundFixture>["scenario"]["resources"][number]) => {
        b.windowInstances[0]!.end = "2026-09-09T10:00:00Z";
      },
      (b: ReturnType<typeof boundFixture>["scenario"]["resources"][number]) => {
        b.windowInstances[0]!.windowInstanceId = "forged";
      },
    ]) {
      const input = boundFixture();
      change(input.scenario.resources[0]!);
      expect(ready(input).status).toBe("not_computable");
    }
  });
  it("hashes all bound facts and rejects stale hashes", () => {
    const input = boundFixture(),
      before = input.scenario.scenarioHash;
    for (const change of [
      (s: typeof input.scenario) => {
        s.resources[0]!.billingTimezone = "America/New_York";
      },
      (s: typeof input.scenario) => {
        s.resources[0]!.cycle!.id = "another-cycle";
      },
      (s: typeof input.scenario) => {
        s.resources[0]!.windowAnchors.reset = "2026-09-05T10:00:00Z";
      },
      (s: typeof input.scenario) => {
        s.resources[0]!.windowInstances[0]!.end = "2026-09-09T10:00:00Z";
      },
    ]) {
      const s = clone(input.scenario);
      change(s);
      expect(hashBoundExecutionScenario(s)).not.toBe(before);
    }
    observe(input);
    expect(hashBoundExecutionScenario(input.scenario)).not.toBe(before);
    expect(() => optimizeCompiledExactModels(input)).toThrow("hash mismatch");
  });
  it("workload start does not define the purchase/reset start or create new intervals", () => {
    const input = boundFixture(),
      b = input.scenario.resources[0]!,
      original = JSON.stringify(b);
    input.scenario.period.start = "2026-09-12T00:00:00Z";
    input.scenario.scenarioHash = hashBoundExecutionScenario(input.scenario);
    expect(ready(input).status).toBe("feasible");
    expect(JSON.stringify(b)).toBe(original);
    expect(b.windowInstances[0]!.start).toBe("2026-09-03T10:00:00Z");
  });
  it("rejects artifact-local intervals in v2 while retaining v1 fixture identity", () => {
    const p = partitionPlan();
    if (p.computation.kind !== "executable") throw new Error();
    const wrong = {
      ...p,
      computation: {
        ...p.computation,
        windows: [
          {
            id: "monthly",
            kind: "fixed_partition",
            intervals: [
              { id: "slice", start: "2026-09-01T00:00:00Z", end: "2026-09-08T00:00:00Z" },
            ],
          },
        ],
      },
    };
    expect(compiledExecutionPlanSchema.safeParse(wrong).success).toBe(false);
    const v1 = syntheticPlan();
    expect(compiledExecutionPlanSchema.parse(v1)).toEqual(v1);
    expect(optimizeCompiledExactModels(compiledScenario(1)).methodology).toBe(
      "compiled-offline-v1",
    );
    expect(executionContentHash(p)).toBe(executionContentHash(clone(p)));
  });
  it("calendar and first-use activation preserve v1 boundaries and outcomes", () => {
    for (const kind of ["calendar", "first_use_anchored"] as const) {
      const p = monthly();
      if (p.computation.kind !== "executable") throw new Error();
      if (kind === "first_use_anchored")
        p.computation.windows = [
          {
            id: "monthly",
            kind,
            durationMs: 3600000,
            activationModels: ["fixture-small"],
            trigger: "first_eligible_offer",
          },
        ];
      const input = boundFixture(pinPlan(p), "2026-09-01T00:00:00Z");
      input.scenario.resources[0]!.firstUse.monthly = "inactive";
      const legacy = compiledScenario(0, [
        compiledExecutionPlanV1Schema.parse({ ...input.artifacts[0]!, contractVersion: 1 }),
      ]);
      legacy.scenario.resources[0]!.firstUse.monthly = "inactive";
      const dates = ["2026-09-01T00:30:00Z", "2026-09-01T01:29:59Z", "2026-09-01T01:30:00Z"];
      const old = replayCompiledResource(
        { artifact: legacy.artifacts[0]!, binding: legacy.scenario.resources[0]! },
        legacy.scenario,
        dates.map((at, i) => ({
          at: ns(at),
          event: request(`e${i}`, 1, "fixture-small", at),
          modelId: "fixture-small",
          routeId: "included-route",
        })),
      );
      const current = replay(input, dates);
      expect(current.status).toBe(old.status);
      expect(current.accepted).toBe(old.accepted);
      expect(current.capacity.map((c) => c.window)).toEqual(old.capacity.map((c) => c.window));
    }
  });
  it("binds deterministically and refuses mixed versions and multi-cycle scopes", () => {
    const input = boundFixture();
    expect(boundFixture().scenario).toEqual(input.scenario);
    expect(() => optimizeCompiledExactModels({ ...input, contract: "compiled-v1" })).toThrow(
      "Mixed compiled contract",
    );
    input.scenario.resources[0]!.cycle!.end = "2026-10-29T10:00:00Z";
    expect(ready(input).status).toBe("not_computable");
  });
  it("aggregate normalization retains an accurate effective scenario hash", () => {
    const input = boundFixture();
    const e = request("aggregate", 1, "fixture-small", input.scenario.period.start);
    e.source.adapterId = "ccusage";
    input.events = [e];
    const result = optimizeCompiledExactModels(input);
    expect(result.scenario.version).toBe(2);
    if (result.scenario.version !== 2) throw new Error();
    expect(result.scenario.chronology).toBe("aggregate");
    expect(result.scenario.scenarioHash).toBe(hashBoundExecutionScenario(result.scenario));
    expect(input.scenario.chronology).toBe("request");
  });
  it("bounded materialization allocates four instances independent of 100k offers", () => {
    const input = boundFixture(),
      b = input.scenario.resources[0]!;
    const initial = b.windowInstances;
    const result = replay(
      input,
      Array.from({ length: 100000 }, () => input.scenario.period.start),
    );
    expect(result.records).toBe(100000);
    expect(b.windowInstances).toBe(initial);
    expect(materializeFixedPartitions(input.artifacts[0]!, b)).toEqual(initial);
    expect(initial).toHaveLength(4);
  });
});
describe("timezone-correct purchase cycles", () => {
  it.each([
    ["2027-03-01T05:00:00Z", "2027-04-01T04:00:00Z"],
    ["2027-11-01T04:00:00Z", "2027-12-01T05:00:00Z"],
    ["2027-10-15T04:00:00Z", "2027-11-15T05:00:00Z"],
    ["2027-01-31T15:30:00Z", "2027-02-28T15:30:00Z"],
    ["2028-01-31T15:30:00Z", "2028-02-29T15:30:00Z"],
  ])("accepts local monthly anchor %s → %s", (start, end) => {
    expect(purchaseCycleEnd("month", start, "America/New_York")).toBe(end);
    const input = boundFixture(monthly(), start, "America/New_York");
    expect(input.scenario.resources[0]!.cycle!.end).toBe(end);
    expect(ready(input).status).toBe("feasible");
    const result = optimizeCompiledExactModels(input);
    expect(result.methodology).toBe("compiled-offline-v2");
  });
  it("rejects the wrong local monthly end rather than applying elapsed tolerance", () => {
    const input = boundFixture(monthly(), "2027-03-01T05:00:00Z", "America/New_York");
    input.scenario.resources[0]!.cycle!.end = "2027-04-01T05:00:00Z";
    expect(ready(input).status).toBe("not_computable");
    expect(() => bindExecutionScenario(input.artifacts, input.scenario)).toThrow(
      "Invalid purchase cycle",
    );
  });
  it.each([undefined, "+05:00", "Not/AZone"])(
    "requires a valid explicit IANA timezone: %s",
    (zone) => {
      expect(() => purchaseCycleEnd("month", "2027-03-01T05:00:00Z", zone)).toThrow();
    },
  );
  it("refuses nonexistent/ambiguous target wall clocks rather than inventing a reset policy", () => {
    expect(() => purchaseCycleEnd("month", "2027-02-14T07:30:00Z", "America/New_York")).toThrow();
    expect(() => purchaseCycleEnd("month", "2027-10-07T05:30:00Z", "America/New_York")).toThrow();
  });
  it("28-day terms remain exact elapsed durations across DST", () => {
    const start = "2027-03-01T05:00:00Z",
      end = purchaseCycleEnd("28_days", start, "America/New_York");
    expect(end).toBe("2027-03-29T05:00:00Z");
    const input = boundFixture(partitionPlan(), start, "America/New_York");
    expect(ready(input).status).toBe("feasible");
    expect(input.scenario.resources[0]!.windowInstances.at(-1)!.end).toBe(end);
  });
  it("v1 remains UTC-month-from-period without requiring a timezone", () => {
    const input = compiledScenario(0);
    expect(
      resourceReadiness(
        { artifact: input.artifacts[0]!, binding: input.scenario.resources[0]! },
        input.scenario,
      ).status,
    ).toBe("feasible");
    const current = boundFixture(monthly());
    delete current.scenario.resources[0]!.billingTimezone;
    expect(ready(current).status).toBe("not_computable");
  });
});
