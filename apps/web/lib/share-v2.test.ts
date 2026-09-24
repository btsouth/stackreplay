import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import { decodeAnyShareToken, encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { runScopedReplay } from "./scoped-replay";
import { replayShareV2, workloadShareV2 } from "./share-v2";
import { verdictOfOutcome } from "./verdict-facts";
import type { ImportRecord } from "./worker-protocol";
import { buildWorkloadProfile } from "./workload-profile";
import { summarizeExport } from "./workload-summary";

/**
 * Share privacy: every V2 link is decoded here and read back as a stranger
 * would, and nothing private may be in it.
 */

const catalog = loadBundledCatalog();
const identity = bundledModelIdentity();
const RULES = "2026-09-24";
const PRIVATE_LABELS = ["atlas-private-client", "orbit-secret-repo"];

function mixedWorkload(
  mutate: (exported: ReturnType<typeof buildArchetypeExport>) => void = () => {},
) {
  const exported = buildArchetypeExport("mixed");
  mutate(exported);
  const hashes = [...new Set(exported.events.flatMap((event) => event.projectHash ?? []))];
  const projectLabels = new Map(
    hashes.map((hash, index) => [hash, `${PRIVATE_LABELS[index % 2]}-${index}`]),
  );
  const record: ImportRecord = {
    id: "local-test",
    label: "mixed",
    createdAt: "2026-09-24T12:00:00.000Z",
    eventCount: exported.events.length,
    summary: summarizeExport(exported, catalog.catalogVersion, identity),
  };
  const profile = buildWorkloadProfile(exported.events, {
    identity,
    catalog,
    timeZone: "America/New_York",
    projectLabels,
    rulesAsOf: RULES,
  });
  return { exported, record, profile, projectLabels };
}

async function publicJson(snapshot: Parameters<typeof encodeShareTokenV2>[0]): Promise<string> {
  const token = await encodeShareTokenV2(snapshot);
  const decoded = await decodeAnyShareToken(token);
  if (!decoded.ok) throw new Error(decoded.message);
  return JSON.stringify(decoded.snapshot);
}

describe("workload share links", () => {
  it("carry aggregates only: no project names, sessions, paths or times by default", async () => {
    const { exported, record, profile, projectLabels } = mixedWorkload();
    expect(profile.projects.some((project) => project.labelKind === "local")).toBe(true);
    const json = await publicJson(workloadShareV2(record, profile, { includePeriod: false }));
    for (const label of projectLabels.values()) expect(json).not.toContain(label);
    for (const hash of projectLabels.keys()) expect(json).not.toContain(hash);
    const sessions = new Set(exported.events.map((event) => event.source.nativeSessionHash));
    for (const session of sessions) if (session !== undefined) expect(json).not.toContain(session);
    expect(json).not.toMatch(/"at"|"zone"|"period"|"sessions"|AM\b|PM\b|America\//u);
    expect(json).not.toMatch(/projectHash|nativeSessionHash|nativeEventHash|rawName/u);
    expect(json).toContain('"total":"613.4837789"');
  });

  it("publish dates, times and the session count only when chosen", async () => {
    const { record, profile } = mixedWorkload();
    const json = await publicJson(
      workloadShareV2(record, profile, {
        includePeriod: true,
        includeSessions: true,
        includeTimes: true,
      }),
    );
    expect(json).toContain('"period"');
    expect(json).toContain('"sessions"');
    expect(json).toMatch(/"at":"[A-Z][a-z]{2} \d/u);
  });

  it("never name a tool from a hand-edited file, only a known recording tool", async () => {
    const { record, profile } = mixedWorkload((exported) => {
      for (const source of exported.detectedSources)
        if (source.adapterId === "command-code") source.name = "Acme Payroll Rewrite";
      for (const event of exported.events)
        if (event.source.adapterId === "command-code")
          (event.source as { adapterId: string }).adapterId = "acme-internal";
      for (const source of exported.detectedSources)
        if (source.adapterId === "command-code") source.adapterId = "acme-internal";
    });
    const json = await publicJson(workloadShareV2(record, profile, { includePeriod: false }));
    expect(json).not.toContain("Acme");
    expect(json).not.toContain("acme-internal");
    expect(json).toContain('"id":"other"');
  });
});

describe("replay share links", () => {
  it("state a tool slice by its known name and keep only catalog names", async () => {
    const exported = buildArchetypeExport("mixed");
    const names = new Map([["claude-code", "My Secret Label"]]);
    const outcome = runScopedReplay({
      events: exported.events,
      target: { type: "api", providerId: "anthropic" },
      catalog,
      identity,
      rulesAsOf: RULES,
      timeZone: "America/New_York",
      sources: ["claude-code"],
      sourceNames: names,
    });
    const composed = verdictOfOutcome(outcome, "Anthropic API", {
      timeZone: "America/New_York",
      catalog,
    });
    if (composed === undefined) throw new Error("no verdict");
    // Inject a raw identifier where a maker name belongs: it must not survive.
    const facts = { ...composed.facts, unavailableMakers: ["gpt-mystery-preview"] };
    const snapshot = replayShareV2(
      {
        facts,
        projection: outcome.projection,
        sourceIds: ["claude-code"],
        target: { verificationStatus: "verified", sources: [] },
        catalog,
      },
      { includePeriod: false },
    );
    const json = await publicJson(snapshot);
    expect(json).not.toContain("My Secret Label");
    expect(json).not.toContain("gpt-mystery-preview");
    expect(json).toContain('"label":"Claude Code"');
    expect(json).not.toContain('"period"');
    expect(snapshot.verdict.money.apiCost).toBe(
      outcome.resolvedScope?.result.economics?.targetCost.amount,
    );
  });
});
