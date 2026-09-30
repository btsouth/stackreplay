"use client";

import { publishedPriceText } from "@/lib/my-stack";
import type { TargetKey } from "@/lib/routes";
import {
  type DiscoveryAnswer,
  type DiscoveryGroup,
  type DiscoveryPlan,
  initialDiscoveryAnswer,
} from "@/lib/stack-discovery";

export const NON_PLAN_CHOICES = [
  { value: "work", label: "Work / organization account" },
  { value: "api-other", label: "API / other billing" },
  { value: "none", label: "I don't pay for this" },
  { value: "not-sure", label: "Not sure" },
] as const;

/** One-click radio confirmation by default; multiple plans is an explicit edit. */
export function FamilyPlanChoices({
  group,
  plans,
  answer,
  onChange,
  prefix = "discovery",
}: {
  group: DiscoveryGroup;
  plans: readonly DiscoveryPlan[];
  answer: DiscoveryAnswer | undefined;
  onChange: (answer: DiscoveryAnswer | undefined) => void;
  prefix?: string;
}) {
  const multiple = typeof answer === "object";
  const choices = [
    ...group.candidates.map((candidate) => ({
      key: `plan:${candidate.planId}` as TargetKey,
      name: candidate.planName,
      price: candidate.publishedPrice,
      evidence:
        candidate.access.checkedAt && candidate.access.observedModelCount > 0
          ? `Lists ${candidate.access.listedModelIds.length} of ${candidate.access.observedModelCount} observed models`
          : "Model access unknown",
    })),
    ...(multiple
      ? group.currentTargets
          .filter(
            (key) => !group.candidates.some((candidate) => `plan:${candidate.planId}` === key),
          )
          .map((key) => {
            const plan = plans.find((plan) => `plan:${plan.id}` === key);
            return {
              key,
              name: plan?.name ?? key,
              price: plan?.price,
              evidence: "Existing selection",
            };
          })
      : []),
  ];
  return (
    <div className="space-y-3">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {choices.map((choice) => {
          const selected = multiple
            ? answer.planTargets.includes(choice.key)
            : answer === choice.key;
          return (
            <label
              key={choice.key}
              className={`flex min-h-20 min-w-0 cursor-pointer items-start gap-3 border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${selected ? "border-accent bg-surface-2" : "border-control-border"}`}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`${prefix}-${group.groupId}`}
                checked={selected}
                onChange={() =>
                  onChange(
                    multiple
                      ? {
                          planTargets: selected
                            ? answer.planTargets.filter((key) => key !== choice.key)
                            : [...answer.planTargets, choice.key],
                        }
                      : choice.key,
                  )
                }
                className="mt-1 h-4 w-4 shrink-0 accent-accent"
                data-testid={`${prefix}-plan-${choice.key.slice(5)}`}
              />
              <span className="min-w-0 space-y-1 break-words">
                <span className="block text-sm font-medium">{choice.name}</span>
                <span className="block font-mono text-xs text-muted-foreground">
                  {choice.price
                    ? `Published price: ${publishedPriceText(choice.price)}`
                    : "Current published price unavailable"}
                </span>
                <span className="block text-xs text-muted-foreground">{choice.evidence}</span>
              </span>
            </label>
          );
        })}
        {!multiple &&
        (answer === "keep-current" ||
          group.currentTargets.length > 1 ||
          group.currentTargets.some(
            (key) => !group.candidates.some((candidate) => `plan:${candidate.planId}` === key),
          )) ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-control-border p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
            <input
              type="radio"
              name={`${prefix}-${group.groupId}`}
              checked={answer === "keep-current"}
              onChange={() => onChange("keep-current")}
              className="h-4 w-4 shrink-0 accent-accent"
            />
            Keep my current selections
          </label>
        ) : null}
      </div>
      <button
        type="button"
        className="min-h-11 text-sm text-accent"
        aria-pressed={multiple}
        onClick={() =>
          onChange(
            multiple
              ? initialDiscoveryAnswer(group)
              : {
                  planTargets:
                    answer === "keep-current"
                      ? group.currentTargets
                      : typeof answer === "string" && answer.startsWith("plan:")
                        ? [answer as TargetKey]
                        : [],
                },
          )
        }
      >
        {multiple ? "Choose one plan" : "I pay for multiple plans"}
      </button>
      {multiple ? (
        <p className="text-xs text-muted-foreground">
          Select each distinct plan you currently pay for. Multiple accounts on the same plan and
          seat quantities are not included.
        </p>
      ) : null}
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {NON_PLAN_CHOICES.map((choice) => (
          <label
            key={choice.value}
            className={`flex min-h-11 min-w-0 cursor-pointer items-center gap-2 border px-3 py-2 text-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${answer === choice.value ? "border-accent bg-surface-2" : "border-control-border"}`}
          >
            <input
              type="radio"
              name={`${prefix}-${group.groupId}`}
              checked={answer === choice.value}
              onChange={() => onChange(choice.value)}
              className="h-4 w-4 shrink-0 accent-accent"
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
