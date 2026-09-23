import type { ConstraintResultV1 } from "@stackreplay/schema";

/**
 * What a constraint's `exceed` value means on screen.
 *
 * One rule governs this module: the words follow the rule's declared behaviour
 * and nothing else. A quantity above capacity is a measurement, and a
 * record-only rule measures one without billing or refusing anything, so a
 * number can never be the reason a surface says something was charged. An
 * absent behaviour is reported as absent rather than defaulted to any of the
 * four real ones, and every consumer classifies by `behaviourKind` so that no
 * surface can quietly treat a missing rule as a record-only one.
 */

export type ExceedBehaviour = ConstraintResultV1["exceed"] | undefined;

/**
 * The five things a crossing can be: the four declared behaviours, plus the
 * absence of one. `unestablished` is a kind of its own, never a fallback to
 * `recorded`.
 */
export type BehaviourKind = "billed" | "refused" | "latched" | "recorded" | "unestablished";

export function behaviourKind(exceed: ExceedBehaviour): BehaviourKind {
  switch (exceed) {
    case "allow_overage":
      return "billed";
    case "reject_request":
      return "refused";
    case "latch_until_reset":
      return "latched";
    case "record_only":
      return "recorded";
    default:
      return "unestablished";
  }
}

/** The rule's declared behaviour, in the interface's own vocabulary. */
export function behaviourPhrase(exceed: ExceedBehaviour): string {
  switch (behaviourKind(exceed)) {
    case "billed":
      return "served and billed as overage";
    case "refused":
      return "individual requests rejected";
    case "latched":
      return "latched until the window reset";
    case "recorded":
      return "recorded only";
    default:
      return "not established";
  }
}

/** What the rule did with the demand above its included capacity. */
export function dispositionPhrase(exceed: ExceedBehaviour): string {
  switch (behaviourKind(exceed)) {
    case "billed":
      return "served and billed at the rule's declared rate";
    case "refused":
      return "requests refused because they exceeded the constraint";
    case "latched":
      return "further requests blocked until the window resets";
    case "recorded":
      return "recorded: this rule admits and refuses nothing";
    default:
      return "not established: this result does not carry the rule";
  }
}

/** True only when the rule's declared behaviour charges for the excess. */
export function billsExcess(exceed: ExceedBehaviour): boolean {
  return behaviourKind(exceed) === "billed";
}

/** True when the rule's declared behaviour refuses or blocks the excess. */
export function refusesExcess(exceed: ExceedBehaviour): boolean {
  const kind = behaviourKind(exceed);
  return kind === "refused" || kind === "latched";
}

/**
 * Every behaviour a set of crossings can fall into, one crossing each.
 *
 * Consumers that summarise crossings used to test `overageUnits` (a quantity,
 * not a behaviour) and treat an unmatched rule as record-only. Classifying here
 * means the one place that decides is also the one place that is tested, and an
 * unmatched rule lands in `unestablished` rather than in a real behaviour's
 * bucket.
 */
export interface BehaviourGroups<T> {
  billed: T[];
  refused: T[];
  latched: T[];
  recorded: T[];
  unestablished: T[];
}

export function groupByBehaviour<T>(
  items: readonly T[],
  behaviourOf: (item: T) => ExceedBehaviour,
): BehaviourGroups<T> {
  const groups: BehaviourGroups<T> = {
    billed: [],
    refused: [],
    latched: [],
    recorded: [],
    unestablished: [],
  };
  for (const item of items) {
    groups[behaviourKind(behaviourOf(item))].push(item);
  }
  return groups;
}
