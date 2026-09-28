"use client";
import { useEffect, useMemo, useState } from "react";
import { readCurrentStack, subscribeCurrentStack, writeCurrentStack } from "./current-stack";
import type { BillingFact, ReviewChoice } from "./review-period";
import { readReviewState, saveReview, subscribeReview } from "./review-storage";
import type { TargetKey } from "./routes";
import type { ImportRecord } from "./worker-protocol";
import { isSyntheticWorkload } from "./workload-kind";

const sampleCycle = { start: "2026-09-01", end: "2026-10-01" };
const sampleSelected: TargetKey[] = ["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-plus"];
const sampleBilling: Record<string, BillingFact> = Object.fromEntries(
  sampleSelected.map((key, i) => [
    key,
    { cycle: sampleCycle, paid: i === 0 ? "100" : "20", provenance: "synthetic" },
  ]),
);
function hasSavedStack(namespace: string): boolean {
  try {
    return window.localStorage.getItem(`stackreplay.current-stack${namespace}`) !== null;
  } catch {
    return false;
  }
}
export function useReview(record: ImportRecord) {
  const synthetic = isSyntheticWorkload(record);
  const namespace = synthetic ? `.demo.${record.id}` : "";
  const fullDemo = synthetic && record.label === "Demo: billing";
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<ReviewChoice>({ mode: "history" });
  const [billing, setBilling] = useState<Record<string, BillingFact>>({});
  const [selected, setSelected] = useState<TargetKey[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    const refresh = () => {
      const state = readReviewState(namespace);
      const saved = state.reviews[record.id];
      setChoice(
        saved ??
          (fullDemo
            ? { mode: "custom", period: sampleCycle, historyConfirmed: "2026-09-01/2026-10-01" }
            : { mode: "history" }),
      );
      const account = saved?.resourceInstanceId;
      const accountBilling = account
        ? Object.fromEntries(
            Object.entries(state.billing)
              .filter(([, fact]) => fact.resourceInstanceId === account)
              .map(([key, fact]) => [key.slice(0, -(account.length + 1)), fact]),
          )
        : state.billing;
      setBilling(fullDemo ? { ...sampleBilling, ...accountBilling } : accountBilling);
      // The complete demo never borrows or overwrites the user's paid amounts/stack.
      setSelected(
        fullDemo && !hasSavedStack(namespace) ? sampleSelected : readCurrentStack(namespace),
      );
      setReady(true);
    };
    refresh();
    const a = subscribeReview(refresh),
      b = subscribeCurrentStack(refresh);
    return () => {
      a();
      b();
    };
  }, [record.id, namespace, fullDemo]);
  const update = (next: ReviewChoice, fact?: { key: string; fact: BillingFact }) => {
    const storedFact =
      fact && next.resourceInstanceId
        ? {
            key: `${fact.key}@${next.resourceInstanceId}`,
            fact: { ...fact.fact, resourceInstanceId: next.resourceInstanceId },
          }
        : fact;
    const saved = saveReview(record.id, next, storedFact, namespace);
    setChoice(next);
    if (fact) setBilling((old) => ({ ...old, [fact.key]: storedFact?.fact ?? fact.fact }));
    setSaveFailed(!saved);
  };
  const reviewSelected = useMemo(
    () => (choice.focusedSubscription ? [choice.focusedSubscription as TargetKey] : selected),
    [choice.focusedSubscription, selected],
  );
  return {
    ready,
    choice,
    billing,
    selected,
    reviewSelected,
    synthetic,
    saveFailed,
    setChoice: (next: ReviewChoice) => update(next),
    saveSetup: (next: ReviewChoice, key: string, fact: BillingFact) => update(next, { key, fact }),
    saveBilling: (key: string, fact: BillingFact) => {
      const {
        historyConfirmed: _legacy,
        historyConfirmation: _confirmation,
        ...unconfirmed
      } = choice;
      const cycleChanged =
        choice.mode === "cycle" &&
        choice.subscription === key &&
        JSON.stringify(billing[key]?.cycle) !== JSON.stringify(fact.cycle);
      update(cycleChanged ? unconfirmed : choice, { key, fact });
    },
    setSelected: (next: TargetKey[]) => {
      writeCurrentStack(next, namespace);
      // Explicit empty selection must not reset a synthetic default on navigation.
      if (fullDemo && !next.length) {
        try {
          window.localStorage.setItem(`stackreplay.current-stack${namespace}`, "[]");
        } catch {
          setSaveFailed(true);
        }
      }
      setSelected(next);
    },
  };
}
