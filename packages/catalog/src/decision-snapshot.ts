import { hashCanonicalContent } from "./content-hash.js";
import type { DecisionMarket } from "./decision-market.js";

/** Execution identities only. Full catalog identity remains separate provenance. */
export function decisionSnapshotHash(
  market: Pick<DecisionMarket, "rulesAt" | "reviewUntil" | "scenarios" | "plans">,
): string {
  const artifacts = (rows: DecisionMarket["scenarios"][number]["artifacts"]) =>
    rows
      .map((a) => ({ planId: a.planId, artifactHash: a.artifactHash }))
      .sort((a, b) =>
        a.planId < b.planId
          ? -1
          : a.planId > b.planId
            ? 1
            : a.artifactHash < b.artifactHash
              ? -1
              : a.artifactHash > b.artifactHash
                ? 1
                : 0,
      );
  return hashCanonicalContent({
    contract: "decision-snapshot-v1",
    rulesAt: market.rulesAt,
    reviewUntil: market.reviewUntil,
    scenarios: market.scenarios
      .map((s) => ({ id: s.id, artifacts: artifacts(s.artifacts) }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    plans: market.plans
      .map((p) => ({ id: p.id, artifactHash: p.artifact.artifactHash }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  });
}
