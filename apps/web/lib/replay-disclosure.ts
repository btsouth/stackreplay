import type { ReplaySemanticsV1 } from "@stackreplay/schema";

/**
 * M4B public disclosure copy, kept in one place so it can be asserted.
 *
 * The replay mode states exactly one thing: whether a cross-model substitution
 * was applied. It is not a claim that every recorded request could be served,
 * that the workload was fully covered, or that nothing remained undecided. Those
 * belong to the dispositions and the evidence dimensions, and a disclosure note
 * that restates them as achieved turns a partial replay into a promise the
 * result does not support.
 */

/** The Replay mode disclosure. Conditional by construction. */
export function replayModeNote(semantics: ReplaySemanticsV1): string {
  if (semantics.mode === "translated")
    return "Part of this demand was replayed against a substitute model under an explicit scenario assumption. That is a counterfactual, not a measurement, and it claims nothing about equal capability or equal token consumption.";
  return "No cross-model substitution was applied. Whether every named model is served, and how much demand stayed undecided, is reported under Outcomes and Evidence.";
}

/** Outcome-row label and note shown beside each disposition count. */
export interface DispositionRowV1 {
  key: keyof ReplaySemanticsV1["dispositions"];
  label: string;
  note: string;
}

export const DISPOSITION_ROWS: readonly DispositionRowV1[] = [
  { key: "included", label: "Included", note: "within the target's allowance" },
  { key: "overage", label: "Overage", note: "served, billed above allowance" },
  { key: "blocked", label: "Blocked", note: "rejected or deferred by the rules" },
  {
    key: "unavailable",
    label: "Unavailable",
    note: "effective model is not served by the target",
  },
  { key: "unknown", label: "Unknown", note: "evidence insufficient to decide" },
];

/**
 * The reset sentence for the target stack. When the reset behaviour is not
 * established, the engine's own reason is shown rather than a generic phrase:
 * a target that mixes rolling and calendar windows is not the same situation as
 * a scenario that left the phase undeclared.
 */
export function resetNote(semantics: ReplaySemanticsV1): string {
  const reset = semantics.targetStack.reset;
  if (reset.kind === "rolling") return "Rolling windows, anchored at first use";
  if (reset.kind === "fixed-known") return `Fixed window, ${reset.phase}`;
  if (reset.kind === "fixed-unknown") {
    const reason = semantics.evidence.resetPhase.reason;
    return reason === undefined
      ? "Not established: the reset behaviour is unknown"
      : `Not established: ${reason}`;
  }
  return "No numeric allowance window";
}
