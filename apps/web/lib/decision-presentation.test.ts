import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { marketDecisionInputs, optimizeCompiledExactModels } from "@stackreplay/replay-engine";
import { assertNoForbiddenFields, shareSnapshotV2Schema } from "@stackreplay/share";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { expect, it } from "vitest";
import { fixedDifference, marketRange } from "./decision-presentation";
import { summarizeCompiledOptimization } from "./optimizer-runtime";
import { presentShare } from "./share-presentation";
import { workloadShareV2 } from "./share-v2";
import { buildWorkloadProfile } from "./workload-profile";
import { summarizeExport } from "./workload-summary";

const catalog = loadBundledCatalog();
const exported = buildDemoExport("moderate");
const decision = {
  scenarios: marketDecisionInputs(catalog, DECISION_MARKET, exported.events).map((input, i) => ({
    id: DECISION_MARKET.scenarios[i]?.id ?? "missing",
    summary: summarizeCompiledOptimization(optimizeCompiledExactModels(input)),
  })),
};
it("composes the exact same-scope range and signed monthly-minus-recorded difference", () => {
  const range = marketRange(decision);
  if (!range) throw new Error("fixture must be computable");
  expect(range).toEqual({ low: "5.93358645", high: "6.0962667", calls: 900, priced: 900 });
  expect(fixedDifference("120", range)).toEqual({ low: "113.9037333", high: "114.06641355" });
  expect(fixedDifference("0", range)).toEqual({ low: "-6.0962667", high: "-5.93358645" });
  expect(marketRange({ scenarios: [...decision.scenarios].reverse() })).toEqual(range);
});
it("withholds a range for different scopes, incomplete or duplicate scenarios", () => {
  for (const variant of ["scope", "status", "duplicate"] as const) {
    const copy = structuredClone(decision);
    const second = copy.scenarios[1];
    const candidate = second?.summary.candidates[0];
    if (!second || !candidate) throw new Error("fixture must have two candidates");
    if (variant === "scope") second.summary.scope.digest = "other";
    if (variant === "status") candidate.status = "not_computable";
    if (variant === "duplicate") second.id = copy.scenarios[0]?.id ?? "missing";
    expect(marketRange(copy)).toBeUndefined();
  }
  expect(marketRange(undefined)).toBeUndefined();
});
it("shares bounded decision aggregates and renders the same range without local stack or history", () => {
  const identity = bundledModelIdentity();
  const profile = buildWorkloadProfile(exported.events, {
    catalog,
    identity,
    timeZone: "UTC",
    rulesAsOf: "2026-09-27",
  });
  const record = {
    id: "private-id",
    label: "Demo: private label",
    createdAt: "2026-09-27T00:00:00Z",
    eventCount: 900,
    summary: summarizeExport(exported, catalog.catalogVersion, identity),
  };
  const snapshot = workloadShareV2(record, profile, { includePeriod: false }, decision);
  expect(shareSnapshotV2Schema.safeParse(snapshot).success).toBe(true);
  expect(() => assertNoForbiddenFields(snapshot)).not.toThrow();
  expect(snapshot.market).toMatchObject({ low: "5.93358645", high: "6.0962667", priced: 900 });
  expect(presentShare(snapshot).figure?.value).toBe("$5.93 – $6.10");
  expect(presentShare(snapshot).headline).toBe("900 / 900 calls priced.");
  expect(JSON.stringify(snapshot)).not.toMatch(
    /private-id|private label|currentStack|assignments|scenarioHash/,
  );
});

it("shares partial API economics as priced scope without a legacy total", () => {
  const identity = bundledModelIdentity();
  const first = exported.events[0];
  if (!first) throw new Error("fixture missing");
  const extra = { ...first, id: "unknown-extra", model: { rawName: "unknown-unpublished" } };
  const combined = { ...exported, events: [...exported.events, extra] };
  const profile = buildWorkloadProfile(combined.events, {
    catalog,
    identity,
    timeZone: "UTC",
    rulesAsOf: "2026-09-27",
  });
  const record = {
    id: "private",
    label: "local",
    createdAt: "2026-09-27T00:00:00Z",
    eventCount: 901,
    summary: summarizeExport(combined, catalog.catalogVersion, identity),
  };
  const snapshot = workloadShareV2(
    record,
    profile,
    { includePeriod: false },
    { scenarios: [], pricedScope: decision },
  );
  expect(snapshot.workload.calls).toBe(901);
  expect(snapshot.market?.priced).toBe(900);
  expect(snapshot.value).toBeUndefined();
  expect(snapshot.review).toBeUndefined();
  expect(snapshot.facts.some((fact) => fact.id === "cache-value")).toBe(false);
  expect(presentShare(snapshot).figure?.caption).toContain("priced calls only");
  expect(presentShare(snapshot).support.join(" ")).toContain("not the full-workload");
});
