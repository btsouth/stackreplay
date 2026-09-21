import type { ReplayConfidenceV1, VerificationStatusV1 } from "@stackreplay/schema";

/**
 * Confidence calculation (spec point 26). Confidence is the worst of its
 * contributing factors, so uncertainty is never averaged away. Each factor
 * carries a description that a user-facing surface can show directly.
 */

export type ConfidenceLevel = "high" | "medium" | "low";
export type ConfidenceFactor = ReplayConfidenceV1["factors"][number];

const LEVEL_ORDER: Record<ConfidenceLevel, number> = { high: 0, medium: 1, low: 2 };

export function worstLevel(levels: readonly ConfidenceLevel[]): ConfidenceLevel {
  let worst: ConfidenceLevel = "high";
  for (const level of levels) {
    if (LEVEL_ORDER[level] > LEVEL_ORDER[worst]) worst = level;
  }
  return worst;
}

export function levelFromVerification(status: VerificationStatusV1): ConfidenceLevel {
  switch (status) {
    case "verified":
      return "high";
    case "estimated":
    case "measured":
      return "medium";
    case "unknown":
      return "low";
  }
}
