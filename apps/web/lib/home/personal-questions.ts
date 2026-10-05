import type { TargetKey } from "../routes";
import type { CanonicalUsage, HomeCatalogIndex } from "./personal";

/**
 * The questions a scan lets StackReplay answer, each routed to the part of the
 * application that answers it today. The homepage does not answer them; it
 * says what kind of answer each one gets and opens the right analysis.
 *
 * `evidence` is the honest shape of the answer: an exact figure, a measured
 * reading of recorded calls, or a comparison bounded by published allowances.
 */

export type QuestionId =
  | "downgrade-claude"
  | "api-cheaper"
  | "overlap"
  | "rely-on"
  | "barely-used"
  | "cheaper-plan"
  | "cancel-chatgpt"
  | "other-model";

export interface QuestionDefinition {
  id: QuestionId;
  question: string;
  /** What StackReplay can establish, in one line. */
  evidence: string;
}

export const PERSONAL_QUESTIONS: readonly QuestionDefinition[] = [
  {
    id: "api-cheaper",
    question: "Would API have been cheaper?",
    evidence: "Exact: your recorded tokens at published API list prices.",
  },
  {
    id: "rely-on",
    question: "Which models do I actually rely on?",
    evidence: "Measured: recorded calls per model, by tool and over time.",
  },
  {
    id: "downgrade-claude",
    question: "What if I downgrade Claude?",
    evidence: "Spend change is exact; fit is bounded by relative allowances.",
  },
  {
    id: "cancel-chatgpt",
    question: "What changes if I cancel ChatGPT?",
    evidence: "Which recorded work loses a subscription, and the spend change.",
  },
  {
    id: "overlap",
    question: "Which subscriptions overlap?",
    evidence: "Measured: where your recorded work already runs on another plan.",
  },
  {
    id: "barely-used",
    question: "Am I paying for plans I barely use?",
    evidence: "Recorded activity and share of work per subscription.",
  },
  {
    id: "cheaper-plan",
    question: "Could a cheaper plan handle my workload?",
    evidence: "Lineup coverage is exact; capacity is bounded by published terms.",
  },
  {
    id: "other-model",
    question: "What would this workload cost on another model?",
    evidence: "Replays your calls with the substitutions you choose.",
  },
];

/** Subscription tiers per family, cheapest first, from the reviewed discovery families. */
export interface FamilyLadders {
  claude: readonly string[];
  chatgpt: readonly string[];
}

export interface QuestionState {
  href: string;
  /** A line about this visitor's own data or stack. */
  personal?: string | undefined;
  /** False when the stack does not yet contain what the question is about. */
  ready: boolean;
  /** The stack plans the answer is about (catalog ids), for a compact answer. */
  plans?: { from: string; to?: string | undefined } | undefined;
}

function planIds(stack: readonly TargetKey[]): string[] {
  return stack.filter((key) => key.startsWith("plan:")).map((key) => key.slice(5));
}

function query(importId: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ import: importId, ...extra });
  return `?${params.toString()}`;
}

/** Replay's stack scenario for a proposed set of plans (catalog ids only). */
function proposal(importId: string, plans: readonly string[]): string {
  return `/app/plans?section=replay${query(importId, { stack: plans.join(",") })}`;
}

const percent = (share: number) =>
  share > 0 && share < 0.01 ? "<1%" : `${Math.round(share * 100)}%`;

export function questionStates(input: {
  importId: string;
  stack: readonly TargetKey[];
  usage: CanonicalUsage;
  index: HomeCatalogIndex;
  ladders: FamilyLadders;
}): Record<QuestionId, QuestionState> {
  const { importId, stack, usage, index, ladders } = input;
  const plans = planIds(stack);
  const name = (id: string) => index.plans[id]?.name ?? id;
  const stackPage = `/app/plans${query(importId)}`;
  const confirmFirst = { href: stackPage, ready: false };

  const claude = plans.find((id) => ladders.claude.includes(id));
  const claudeTier = claude === undefined ? -1 : ladders.claude.indexOf(claude);
  const lower = claudeTier > 0 ? ladders.claude[claudeTier - 1] : undefined;
  const chatgpt = plans.find((id) => ladders.chatgpt.includes(id));
  const withoutChatgpt = plans.filter((id) => id !== chatgpt);

  const top = [...usage.byModel].sort((a, b) => b[1] - a[1])[0];

  return {
    "api-cheaper": { href: `/app/plans?section=compare${query(importId, { view: "billing" })}`, ready: true },
    "rely-on": {
      href: `/app/stats${query(importId)}`,
      ready: true,
      personal:
        top === undefined
          ? "No recorded call resolved to a catalog model yet."
          : `${index.models[top[0]]?.name ?? top[0]} carries ${percent(
              usage.total === 0 ? 0 : top[1] / usage.total,
            )} of recorded calls.`,
    },
    "downgrade-claude":
      claude === undefined
        ? { ...confirmFirst, personal: "No Claude plan in your stack yet." }
        : lower === undefined
          ? {
              href: stackPage,
              ready: true,
              personal: `${name(claude)} is the lowest Claude tier; test removing it instead.`,
              plans: { from: claude },
            }
          : {
              href: proposal(
                importId,
                plans.map((id) => (id === claude ? lower : id)),
              ),
              ready: true,
              personal: `${name(claude)} → ${name(lower)}, the rest of your stack unchanged.`,
              plans: { from: claude, to: lower },
            },
    "cancel-chatgpt":
      chatgpt === undefined
        ? { ...confirmFirst, personal: "No ChatGPT plan in your stack yet." }
        : withoutChatgpt.length === 0
          ? {
              href: stackPage,
              ready: true,
              personal: `${name(chatgpt)} is your only subscription; review it in My Stack.`,
              plans: { from: chatgpt },
            }
          : {
              href: proposal(importId, withoutChatgpt),
              ready: true,
              personal: `Your stack without ${name(chatgpt)}.`,
              plans: { from: chatgpt },
            },
    overlap:
      plans.length < 2
        ? { ...confirmFirst, personal: "Needs two or more confirmed subscriptions." }
        : { href: stackPage, ready: true, personal: `${plans.length} subscriptions confirmed.` },
    "barely-used":
      plans.length === 0
        ? { ...confirmFirst, personal: "Confirm the plans you pay for first." }
        : {
            href: stackPage,
            ready: true,
            personal: `Checks each of your ${plans.length === 1 ? "subscription" : `${plans.length} subscriptions`}.`,
          },
    "cheaper-plan":
      plans.length === 0
        ? { ...confirmFirst, personal: "Confirm the plans you pay for first." }
        : { href: stackPage, ready: true },
    "other-model": { href: `/app/plans?section=replay${query(importId)}`, ready: true },
  };
}
