import { bundledModelIdentity, loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { ExecutionTargetV1, UsageEventV1 } from "@stackreplay/schema";
import { composeValueScope, decodeAnyShareToken, encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport, type WorkloadArchetypeId } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { runScopedReplay } from "./scoped-replay";
import { presentShare } from "./share-presentation";
import { replayShareV2 } from "./share-v2";
import { verdictOfOutcome } from "./verdict-facts";
import { workloadValue } from "./workload-value";

/**
 * Unresolved demand qualifies only what it can change (independent audit P0
 * and P1). A 3,200-call workload whose one unresolved call carries a billion
 * input tokens: the recognized calls' run-out and overage stay visible, but
 * are not presented as the whole scope's, and the workload's price scope
 * shows how much known demand it leaves out. Replay and Compare read
 * `verdictOfOutcome`; a public link carries the same facts.
 */

const catalog = loadBundledCatalog();
const identity = bundledModelIdentity();
const RULES = "2026-09-24";
const ZONE = "America/New_York";
const COPILOT: ExecutionTargetV1 = { type: "subscription", planId: "github-copilot-pro-plus" };
const MEANINGFUL = /\$[\d,]+|\b[A-Z][a-z]{2} \d{1,2}\b|\d[\d,]* calls?\b|\d+(?:\.\d+)?%/u;
const ENGINE_STATES =
  /full coverage ruled out|capacity not quantified|not determinable|not established|^unknown/iu;

/** A claude-only workload with one call, the earliest or the latest, made giant. */
function giantWorkload(which: "earliest" | "latest", resolved: boolean): UsageEventV1[] {
  const events = [...buildArchetypeExport("claude-only").events];
  const order = events
    .map((event, index) => ({ at: Date.parse(event.occurredAt), index }))
    .sort((a, b) => a.at - b.at);
  const index = (which === "earliest" ? order[0] : order.at(-1))?.index ?? 0;
  const event = events[index] as UsageEventV1 & { modality: "text" };
  events[index] = {
    ...event,
    model: resolved ? { rawName: "claude-opus-4-8" } : { rawName: "AUDIT_UNKNOWN_GIANT_MODEL" },
    confidence: { ...event.confidence, model: resolved ? "exact" : "unknown" },
    usage: { ...event.usage, inputTokens: 1_000_000_000 },
  } as UsageEventV1;
  return events;
}

function replayed(events: readonly UsageEventV1[], target: ExecutionTargetV1, name: string) {
  const outcome = runScopedReplay({
    events,
    target,
    catalog,
    identity,
    rulesAsOf: RULES,
    timeZone: ZONE,
  });
  const composed = verdictOfOutcome(outcome, name, { timeZone: ZONE, catalog });
  if (composed === undefined) throw new Error("no verdict");
  return { outcome, ...composed };
}

/** What a stranger reads on the public page for the same replay. */
async function publicVerdict(result: ReturnType<typeof replayed>) {
  const snapshot = replayShareV2(
    {
      facts: result.facts,
      projection: result.outcome.projection,
      target: { verificationStatus: "verified", sources: [] },
      catalog,
    },
    { includePeriod: false },
  );
  const decoded = await decodeAnyShareToken(await encodeShareTokenV2(snapshot));
  if (!decoded.ok || decoded.snapshot.version !== 2) throw new Error("no V2 snapshot");
  return presentShare(decoded.snapshot);
}

describe("Case A: a giant unresolved call early in the workload", () => {
  const events = giantWorkload("earliest", false);
  const result = replayed(events, COPILOT, "Copilot Pro+");

  it("keeps the recognized run-out visible but not as the whole scope's exact date", () => {
    const { verdict, facts } = result;
    expect(facts.runOut?.dates[0]).toMatchObject({ date: "2026-08-29", undecidedBefore: 1 });
    expect(verdict.headline).toMatch(
      /^Recognized calls alone would exhaust Copilot Pro\+ credits by Aug 29 \(day 10\)/u,
    );
    expect(verdict.headline).not.toMatch(/would have run out on Aug 29/u);
    expect(verdict.headline).toMatch(/about \$178 in modeled overage/u);
    expect(verdict.support[0]).toBe(
      "1 unresolved call, recorded before Aug 29, could move the run-out earlier and add to the overage.",
    );
    expect(verdict.figure).toMatchObject({
      value: "Aug 29",
      caption: "recognized calls · credits run out by day 10",
    });
    expect(verdict.secondary?.caption).toMatch(/^modeled overage from recognized calls/u);
    expect(verdict.short).toBe("Runs out by Aug 29 (day 10) · at least $178 overage");
  });

  it("a later run-out in its own window stays exact", () => {
    expect(result.facts.runOut?.dates[1]).toMatchObject({ date: "2026-09-10", undecidedBefore: 0 });
    expect(result.verdict.headline).toMatch(/and again on Sep 10\./u);
  });

  it("Compare and a public link state the same thing", async () => {
    // Compare builds its column from the same outcome with the same function.
    const column = verdictOfOutcome(result.outcome, "Copilot Pro+", { timeZone: ZONE, catalog });
    expect(column?.verdict).toEqual(result.verdict);
    const shared = await publicVerdict(result);
    expect(shared.headline).toBe(result.verdict.headline);
    expect(shared.support[0]).toBe(result.verdict.support[0]);
    expect(shared.figure?.caption).toBe(result.verdict.figure.caption);
  });

  it("the workload price scope never reads complete, and shows the demand left out", async () => {
    const value = workloadValue(events, { catalog, identity, rulesAsOf: RULES });
    expect(value.pricedCalls).toBe(3_199);
    const scope = composeValueScope(value);
    expect(scope.calls).toBe("3,199 of 3,200 calls (99.97%)");
    expect(scope.calls).not.toMatch(/100\.0%/u);
    expect(scope.tokens).toMatch(
      /^The priced calls carry 35\.\d% of known processed tokens; the 1 left out carries 64\.\d%\.$/u,
    );
    expect(value.knownTokens.priced / value.knownTokens.total).toBeLessThan(0.4);
  });
});

describe("Case B: the same call, resolved", () => {
  const events = giantWorkload("earliest", true);
  const result = replayed(events, COPILOT, "Copilot Pro+");
  const unresolved = replayed(giantWorkload("earliest", false), COPILOT, "Copilot Pro+");

  it("becomes exact: an earlier run-out, a larger overage, no qualifier", () => {
    const { verdict, facts } = result;
    expect(facts.calls.undecided).toBe(0);
    expect(verdict.headline).toBe(
      "Copilot Pro+ credits would have run out on Aug 20 (day 1) and again on Sep 10. This workload would have generated about $5,178 in modeled overage over 35 days on top of the $39/month subscription.",
    );
    expect(verdict.support.join(" ")).not.toMatch(/unresolved|undecided|recognized/iu);
    expect(Number(facts.money.overage)).toBeGreaterThan(Number(unresolved.facts.money.overage));
    expect(facts.runOut?.dates[0]?.date).toBe("2026-08-20");
    expect(unresolved.facts.runOut?.dates[0]?.date).toBe("2026-08-29");
  });

  it("prices the whole workload", () => {
    const value = workloadValue(events, { catalog, identity, rulesAsOf: RULES });
    expect(composeValueScope(value)).toEqual({ complete: true, calls: "All 3,200 calls" });
    expect(value.knownTokens.priced).toBe(value.knownTokens.total);
    expect(Number(value.total)).toBeGreaterThan(5_000);
  });
});

describe("Case C: a tiny unresolved subset", () => {
  it("still leads with a date and dollars on a numeric plan, never UNKNOWN", () => {
    const { verdict, facts } = replayed(
      buildArchetypeExport("mixed").events,
      COPILOT,
      "Copilot Pro+",
    );
    expect(facts.calls.undecided).toBe(5);
    const first = verdict.headline.split(/(?<=\.)\s/u)[0] ?? "";
    expect(first).toMatch(MEANINGFUL);
    expect(first).not.toMatch(ENGINE_STATES);
    expect(verdict.figure.kind).toBe("date");
    expect(verdict.headline).toMatch(/about \$[\d,]+ in modeled overage/u);
  });

  it("keeps the bounded share on a qualitative plan", () => {
    const { verdict } = replayed(
      buildArchetypeExport("mixed").events,
      { type: "subscription", planId: "anthropic-claude-max-20x" },
      "Claude Max 20x",
    );
    expect(verdict.headline).toMatch(
      /^Claude Max 20x can run 2,648 of your 5,000 calls \(53\.0–53\.1%\)/u,
    );
  });

  it("says only the recognized calls fit when a numeric plan is never crossed", () => {
    const events = [...buildArchetypeExport("tiny").events];
    const first = events[0] as UsageEventV1;
    events[0] = { ...first, model: { rawName: "AUDIT_UNKNOWN_SMALL_MODEL" } } as UsageEventV1;
    const { verdict } = replayed(events, COPILOT, "Copilot Pro+");
    expect(verdict.headline).toMatch(
      /^Recognized calls stay within Copilot Pro\+'s published limits/u,
    );
    expect(verdict.support[0]).toBe(
      "1 unresolved call could still use the allowance, so whether the full workload fits can't be determined.",
    );
    expect(verdict.support.join(" ")).not.toMatch(/covers this recorded demand/u);
  });
});

describe("Case D: unresolved demand after the run-out", () => {
  const result = replayed(giantWorkload("latest", false), COPILOT, "Copilot Pro+");

  it("keeps the established date exact and qualifies only the overage", () => {
    const { verdict, facts } = result;
    expect(facts.runOut?.dates[0]).toMatchObject({ date: "2026-08-29", undecidedBefore: 0 });
    expect(verdict.headline).toBe(
      "Copilot Pro+ credits would have run out on Aug 29 (day 10) and again on Sep 10. Recognized calls alone would have generated about $178 in modeled overage over 35 days on top of the $39/month subscription.",
    );
    expect(verdict.support[0]).toBe(
      "1 unresolved call, recorded after Aug 29, could add to the overage but not move that run-out.",
    );
    expect(verdict.figure.caption).toBe("credits run out · day 10");
  });
});

it.each<WorkloadArchetypeId>(["claude-only", "codex-only"])(
  "%s with nothing undecided reads exactly as before",
  (archetype) => {
    const { verdict } = replayed(buildArchetypeExport(archetype).events, COPILOT, "Copilot Pro+");
    expect(verdict.headline).toMatch(/^Copilot Pro\+ credits would have run out on /u);
    expect(verdict.headline).not.toMatch(/Recognized calls|unresolved/u);
  },
);
