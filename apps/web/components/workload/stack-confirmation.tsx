"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { formatUsd } from "@stackreplay/share";
import { useEffect, useMemo, useRef, useState } from "react";
import { readCurrentStack, subscribeCurrentStack } from "@/lib/current-stack";
import type { TargetKey } from "@/lib/routes";
import {
  type DiscoveryAnswer,
  type DiscoveryGroup,
  type DiscoveryGroupId,
  discoverStack,
  discoveryPlansAt,
} from "@/lib/stack-discovery";
import {
  confirmDiscovery,
  type DiscoveryPreferences,
  discoveryNamespace,
  dismissDiscovery,
  readDiscoveryPreferences,
  shouldPromptDiscovery,
  writeDiscoveryPreferences,
} from "@/lib/stack-discovery-storage";
import type { ImportRecord } from "@/lib/worker-protocol";
import { isSyntheticWorkload } from "@/lib/workload-kind";
import type { WorkloadProfile } from "@/lib/workload-profile";

const NON_PLAN_CHOICES = [
  { value: "work", label: "Work / organization account" },
  { value: "api-other", label: "API / other billing" },
  { value: "none", label: "I don't pay for this" },
  { value: "not-sure", label: "Not sure" },
] as const;

type Answers = Partial<Record<DiscoveryGroupId, DiscoveryAnswer>>;

function initialAnswers(
  groups: readonly DiscoveryGroup[],
  preferences: DiscoveryPreferences,
): Answers {
  const next: Answers = {};
  for (const group of groups) {
    const current = group.currentTargets;
    const first = current[0];
    const response = preferences.groups[group.groupId]?.response;
    if (
      current.length === 1 &&
      first !== undefined &&
      group.candidates.some((plan) => `plan:${plan.planId}` === first)
    )
      next[group.groupId] = first;
    else if (current.length > 0) next[group.groupId] = "keep-current";
    else if (response) next[group.groupId] = response;
  }
  return next;
}

/** An optional enrichment of a completed scan; never a billing-period assignment. */
export function StackConfirmation({
  record,
  profile,
}: {
  record: ImportRecord;
  profile: WorkloadProfile;
}) {
  const namespace = discoveryNamespace(record);
  const synthetic = isSyntheticWorkload(record);
  const plans = useMemo(() => discoveryPlansAt(DECISION_MARKET.rulesAt), []);
  const [stack, setStack] = useState<TargetKey[]>();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const action = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const presented = useRef(false);
  const groups = useMemo(
    () =>
      discoverStack({
        recordedCalls: profile.overview.events,
        sources: profile.sources,
        sourceNames: record.summary.usageSources,
        rulesAsOf: DECISION_MARKET.rulesAt,
        currentStack: stack ?? [],
        plans,
      }),
    [profile, record.summary.usageSources, plans, stack],
  );
  const useful = groups.filter((group) => group.candidates.length > 0);

  useEffect(() => {
    const saved = readCurrentStack(namespace);
    setStack(saved);
    const discovered = discoverStack({
      recordedCalls: profile.overview.events,
      sources: profile.sources,
      sourceNames: record.summary.usageSources,
      rulesAsOf: DECISION_MARKET.rulesAt,
      currentStack: saved,
      plans,
    });
    const preferences = readDiscoveryPreferences(namespace);
    if (
      !presented.current &&
      (window.location.hash === "#current-stack-review" ||
        shouldPromptDiscovery(discovered, preferences, Date.now(), synthetic))
    ) {
      setAnswers(initialAnswers(discovered, preferences));
      setOpen(true);
    }
    presented.current = true;
    return subscribeCurrentStack(() => setStack(readCurrentStack(namespace)));
  }, [namespace, profile, record.summary.usageSources, plans, synthetic]);

  useEffect(() => {
    if (open) heading.current?.focus({ preventScroll: true });
  }, [open]);

  const close = () => {
    setOpen(false);
    action.current?.focus({ preventScroll: true });
  };
  const dismiss = () => {
    const saved = writeDiscoveryPreferences(
      dismissDiscovery(groups, readDiscoveryPreferences(namespace), Date.now()),
      namespace,
    );
    setNotice(
      saved
        ? "You can review your stack whenever you're ready."
        : "Dismissed for this visit. Browser storage is unavailable.",
    );
    close();
  };
  const confirm = () => {
    const saved = confirmDiscovery(record, groups, answers, Date.now());
    if (!saved.stackSaved || !saved.preferencesSaved) {
      setSaveFailed(true);
      return;
    }
    setSaveFailed(false);
    setStack(readCurrentStack(namespace));
    setNotice("Stack choices saved in this browser.");
    close();
  };
  if (stack === undefined || useful.length === 0 || synthetic) return null;

  return (
    <section
      id="current-stack-review"
      className="min-w-0 scroll-mt-20 border-y border-border py-4"
      aria-label="Your current stack"
      data-testid="stack-discovery"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-muted-foreground">
          Current Stack · {useful.filter((group) => group.currentTargets.length > 0).length} of{" "}
          {useful.length} services confirmed
        </p>
        <button
          ref={action}
          type="button"
          onClick={() => {
            setSaveFailed(false);
            setAnswers(initialAnswers(groups, readDiscoveryPreferences(namespace)));
            setOpen(true);
          }}
          className="min-h-11 text-sm text-accent"
          aria-expanded={open}
          aria-controls="stack-confirmation-panel"
        >
          Review discovered stack →
        </button>
      </div>
      {notice ? (
        <p role="status" className="text-xs text-muted-foreground">
          {notice}
        </p>
      ) : null}
      {open ? (
        <fieldset
          aria-labelledby="stack-confirmation-heading"
          id="stack-confirmation-panel"
          data-testid="stack-confirmation-panel"
          className="mt-4 space-y-5"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              dismiss();
            }
          }}
        >
          <div className="max-w-2xl space-y-2">
            <h2
              id="stack-confirmation-heading"
              ref={heading}
              tabIndex={-1}
              className="text-2xl font-medium tracking-tight outline-none"
            >
              We found your AI stack
            </h2>
            <p className="text-sm text-muted-foreground">
              Your history shows activity from {useful.length}{" "}
              {useful.length === 1 ? "service" : "services"}. Confirming your plans lets StackReplay
              compare the stack you use today with other ways to buy the same work.
            </p>
            <p className="text-xs text-muted-foreground">
              Activity does not establish a subscription or how these calls were paid. Choices use
              the accepted catalog from {DECISION_MARKET.rulesAt.slice(0, 10)}. Prices are published
              prices, not your actual bill.
            </p>
          </div>
          <div className="space-y-6">
            {useful.map((group) => {
              const currentNames = group.currentTargets.map(
                (key) => plans.find((plan) => `plan:${plan.id}` === key)?.name ?? key,
              );
              const choose = (answer: DiscoveryAnswer) =>
                setAnswers((old) => ({ ...old, [group.groupId]: answer }));
              return (
                <fieldset
                  key={group.groupId}
                  className="min-w-0 space-y-3 border-t border-border pt-4"
                  data-testid={`discovery-group-${group.groupId}`}
                >
                  <legend className="sr-only">{group.question}</legend>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">{group.sourceNames.join(" + ")}</h3>
                    <p className="font-mono text-xs text-muted-foreground">
                      {group.recordedCalls.toLocaleString("en-US")} calls ·{" "}
                      {(group.shareOfWorkload * 100).toFixed(0)}% of recorded calls
                    </p>
                  </div>
                  <p className="text-sm">
                    We found {group.sourceNames.join(" + ")} activity. {group.question}
                  </p>
                  {group.groupId === "opencode" ? (
                    <p className="text-xs text-muted-foreground">
                      OpenCode can also use ChatGPT sign-in, API keys, other bundles or local
                      models. OpenCode activity does not establish an OpenCode subscription.
                    </p>
                  ) : null}
                  {currentNames.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      In Current Stack: {currentNames.join(" + ")}. Kept unless you change this
                      answer.
                    </p>
                  ) : null}
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.candidates.map((candidate) => {
                      const value: TargetKey = `plan:${candidate.planId}`;
                      const selected = answers[group.groupId] === value;
                      return (
                        <label
                          key={value}
                          className={`flex min-h-20 min-w-0 cursor-pointer items-start gap-3 border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${selected ? "border-accent bg-surface-2" : "border-control-border"}`}
                        >
                          <input
                            type="radio"
                            name={`discovery-${group.groupId}`}
                            value={value}
                            checked={selected}
                            onChange={() => choose(value)}
                            className="mt-1 h-4 w-4 shrink-0 accent-accent"
                            data-testid={`discovery-plan-${candidate.planId}`}
                          />
                          <span className="min-w-0 space-y-1 break-words">
                            <span className="block text-sm font-medium">{candidate.planName}</span>
                            <span className="block font-mono text-xs text-muted-foreground">
                              Published price:{" "}
                              {candidate.publishedPrice.currency === "USD"
                                ? formatUsd(candidate.publishedPrice.amount)
                                : `${candidate.publishedPrice.amount} ${candidate.publishedPrice.currency}`}
                              /{candidate.publishedPrice.interval}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {candidate.access.checkedAt && candidate.access.observedModelCount > 0
                                ? `Lists ${candidate.access.listedModelIds.length} of ${candidate.access.observedModelCount} observed models`
                                : "Model access unknown"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {answers[group.groupId] === "keep-current" ||
                    group.currentTargets.length > 1 ||
                    group.currentTargets.some(
                      (key) =>
                        !group.candidates.some((candidate) => `plan:${candidate.planId}` === key),
                    ) ? (
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-control-border p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
                        <input
                          type="radio"
                          name={`discovery-${group.groupId}`}
                          checked={answers[group.groupId] === "keep-current"}
                          onChange={() => choose("keep-current")}
                          className="h-4 w-4 shrink-0 accent-accent"
                        />
                        Keep my current selections
                      </label>
                    ) : null}
                  </div>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {NON_PLAN_CHOICES.map((choice) => (
                      <label
                        key={choice.value}
                        className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-2 border px-3 py-2 text-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${answers[group.groupId] === choice.value ? "border-accent bg-surface-2" : "border-control-border"}`}
                      >
                        <input
                          type="radio"
                          name={`discovery-${group.groupId}`}
                          checked={answers[group.groupId] === choice.value}
                          onChange={() => choose(choice.value)}
                          className="h-4 w-4 shrink-0 accent-accent"
                        />
                        <span>{choice.label}</span>
                      </label>
                    ))}
                  </div>
                  {group.unresolvedCalls > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {group.unresolvedCalls.toLocaleString("en-US")} calls have unresolved model
                      identities. They are not assigned to a plan.
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
          {saveFailed ? (
            <p role="alert" className="text-sm text-warning">
              Could not save all choices in this browser. Your choices remain here; retry or
              continue to Workload.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={confirm}
              disabled={Object.keys(answers).length === 0}
              className="min-h-11 border border-accent bg-accent px-5 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm stack
            </button>
            <button type="button" onClick={dismiss} className="min-h-11 px-3 text-sm text-accent">
              Not now
            </button>
            <p className="text-xs text-muted-foreground">Optional · kept in this browser</p>
          </div>
        </fieldset>
      ) : null}
    </section>
  );
}
