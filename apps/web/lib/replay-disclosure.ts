import type { ReplaySemanticsV1 } from "@stackreplay/schema";
import { isApiReplayTargetStackV1 } from "@stackreplay/schema";

/**
 * M4B/M4C public disclosure copy, kept in one place so it can be asserted.
 *
 * The replay mode states exactly one thing: whether a cross-model substitution
 * was applied. It is not a claim that every recorded request could be served,
 * that the workload was fully covered, or that nothing remained undecided. Those
 * belong to the dispositions and the evidence dimensions, and a disclosure note
 * that restates them as achieved turns a partial replay into a promise the
 * result does not support.
 *
 * The copy is target-kind aware (M4C). A Direct API target has no allowance, no
 * admission and no reset, so wording that talks about included capacity, billed
 * overage or a reset phase would describe a plan the replay never ran against.
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

const SUBSCRIPTION_DISPOSITION_ROWS: readonly DispositionRowV1[] = [
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

const API_DISPOSITION_ROWS: readonly DispositionRowV1[] = [
  {
    key: "included",
    label: "Served",
    note: "the provider's published API list price applies",
  },
  {
    key: "overage",
    label: "Overage",
    note: "not applicable: a Direct API target has no allowance to exceed",
  },
  {
    key: "blocked",
    label: "Blocked",
    note: "not applicable: a Direct API target rejects nothing at the allowance level",
  },
  {
    key: "unavailable",
    label: "Unavailable",
    note: "the selected provider is not recorded as offering the model",
  },
  { key: "unknown", label: "Unknown", note: "evidence insufficient to decide" },
];

/**
 * The outcome rows for a result's own target kind. A Direct API replay cannot
 * produce overage or blocked events, and saying so beside a zero is more honest
 * than reusing a plan's wording for it.
 */
export function dispositionRows(semantics: ReplaySemanticsV1): readonly DispositionRowV1[] {
  return isApiReplayTargetStackV1(semantics.targetStack)
    ? API_DISPOSITION_ROWS
    : SUBSCRIPTION_DISPOSITION_ROWS;
}

/**
 * The reset sentence for the target stack. When the reset behaviour is not
 * established, the engine's own reason is shown rather than a generic phrase:
 * a target that mixes rolling and calendar windows is not the same situation as
 * a scenario that left the phase undeclared.
 */
export function resetNote(semantics: ReplaySemanticsV1): string {
  const stack = semantics.targetStack;
  if (isApiReplayTargetStackV1(stack))
    return "Not applicable: a Direct API target has no allowance window to reset";
  const reset = stack.reset;
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

/**
 * What the replay was applied to, in the result's own terms: a plan version for a
 * subscription target, a provider for a Direct API target. Read from the result,
 * never from the surface's current selection, so the sentence describes the
 * replay that ran.
 */
/**
 * The target stack's reference label as a labelled field rather than as a
 * sentence fragment, so a details row reads "Plan version" / "Direct API
 * provider" while the prose keeps the lower-case form.
 */
export function referenceFieldLabel(note: TargetStackNoteV1): string {
  return note.referenceLabel.charAt(0).toUpperCase() + note.referenceLabel.slice(1);
}

export interface TargetStackNoteV1 {
  /** Short label, for example the plan name or the provider id. */
  label: string;
  /** The identifying reference, shown in a monospace slot. */
  reference: string;
  /** What the reference is: "plan version" or "Direct API provider". */
  referenceLabel: string;
}

export function targetStackNote(semantics: ReplaySemanticsV1): TargetStackNoteV1 {
  const stack = semantics.targetStack;
  if (isApiReplayTargetStackV1(stack))
    return {
      label: stack.providerId,
      reference: stack.providerId,
      referenceLabel: "Direct API provider",
    };
  return {
    label: stack.planId,
    reference: stack.planVersionId,
    referenceLabel: "plan version",
  };
}
