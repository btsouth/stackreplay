import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { UsageEventV1 } from "@stackreplay/schema";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { presentShare } from "./share-presentation";
import { workloadShareV2 } from "./share-v2";
import type { ImportRecord } from "./worker-protocol";
import { buildWorkloadProfile } from "./workload-profile";
import { summarizeExport } from "./workload-summary";

const catalog = loadBundledCatalog();
const identity = bundledModelIdentity();

function giantWorkloadPresentation(resolved: boolean) {
  const exported = buildArchetypeExport("claude-only");
  const first =
    exported.events
      .map((event, index) => ({ at: Date.parse(event.occurredAt), index }))
      .sort((a, b) => a.at - b.at)[0]?.index ?? 0;
  const event = exported.events[first] as UsageEventV1 & { modality: "text" };
  exported.events[first] = {
    ...event,
    model: resolved ? { rawName: "claude-opus-4-8" } : { rawName: "AUDIT_UNKNOWN_GIANT_MODEL" },
    confidence: { ...event.confidence, model: resolved ? "exact" : "unknown" },
    usage: {
      ...event.usage,
      inputTokens: 1_000_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      reasoningTokens: 0,
    },
  } as UsageEventV1;
  const record: ImportRecord = {
    id: "giant-scope-test",
    label: "giant-scope-test",
    createdAt: "2026-09-24T12:00:00.000Z",
    eventCount: exported.events.length,
    summary: summarizeExport(exported, catalog.catalogVersion, identity),
  };
  const profile = buildWorkloadProfile(exported.events, {
    identity,
    catalog,
    timeZone: "America/New_York",
    rulesAsOf: "2026-09-24",
  });
  return presentShare(workloadShareV2(record, profile, { includePeriod: false }));
}

describe("workload share image scope", () => {
  it("carries partial calls and known-token scope beside the list-price figure", () => {
    const presentation = giantWorkloadPresentation(false);
    expect(`${presentation.figure?.value}${presentation.figure?.minor}`).toBe("$317.66");
    expect(presentation.figure?.caption).toContain("not what you paid");
    expect(presentation.valueScope).toMatchObject({
      complete: false,
      calls: "3,199 of 3,200 calls (99.97%)",
      pricedTokenPercent: "35.8%",
    });
    expect(presentation.valueScope?.calls).not.toContain("100%");
    expect(presentation.valueScope?.tokens).toContain(
      "The priced calls carry 35.8% of known processed tokens",
    );
  });

  it("keeps the resolved image free of partial scope and exclusions", () => {
    const presentation = giantWorkloadPresentation(true);
    expect(`${presentation.figure?.value}${presentation.figure?.minor}`).toBe("$5,317.66");
    expect(presentation.valueScope).toEqual({ complete: true, calls: "All 3,200 calls" });
    expect(presentation.support.join(" ")).not.toMatch(/35\.8%|left out|unrecognized/iu);
  });
});
