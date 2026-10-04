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

export function QuantityStepper({
  name,
  quantity,
  onChange,
}: {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <fieldset className="plan-quantity" aria-label={`${name} account quantity`}>
      <span>Accounts</span>
      <button
        type="button"
        aria-label={`Decrease ${name} quantity`}
        disabled={quantity <= 1}
        onClick={() => onChange(quantity - 1)}
      >
        −
      </button>
      <output aria-label={`${name} quantity`}>{quantity}</output>
      <button
        type="button"
        aria-label={`Increase ${name} quantity`}
        disabled={quantity >= 10}
        onClick={() => onChange(quantity + 1)}
      >
        +
      </button>
    </fieldset>
  );
}

/** One-click confirmation, with quantities and an explicit multi-plan edit. */
export function FamilyPlanChoices({
  group,
  plans,
  answer,
  onChange,
  counts = {},
  prefix = "discovery",
}: {
  group: DiscoveryGroup;
  plans: readonly DiscoveryPlan[];
  answer: DiscoveryAnswer | undefined;
  onChange: (answer: DiscoveryAnswer | undefined) => void;
  counts?: Readonly<Record<string, number>>;
  prefix?: string;
}) {
  const object = typeof answer === "object" ? answer : undefined;
  const multiple = !!object && object.multiple !== false;
  const selectedKeys =
    object?.planTargets ??
    (typeof answer === "string" && answer.startsWith("plan:")
      ? [answer as TargetKey]
      : answer === "keep-current"
        ? group.currentTargets
        : []);
  const quantities = { ...counts, ...object?.quantities };
  const choices = [
    ...group.candidates.map((candidate) => ({
      key: `plan:${candidate.planId}` as TargetKey,
      name: candidate.planName,
      price: candidate.publishedPrice,
      evidence:
        candidate.access.publishedModelCount !== undefined
          ? `Published access: ${candidate.access.publishedModelCount} listed models`
          : "No reviewed access summary",
      coverage:
        candidate.access.checkedAt && candidate.access.observedModelCount > 0
          ? `Includes ${candidate.access.listedModelIds.length} of your ${candidate.access.observedModelCount} models`
          : undefined,
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
              coverage: undefined,
            };
          })
      : []),
  ];
  return (
    <div className="family-plan-choices">
      <div className="plan-choice-grid">
        {choices.map((choice) => {
          const selected = selectedKeys.includes(choice.key) && answer !== "keep-current";
          const quantity = quantities[choice.key] ?? 1;
          return (
            <div key={choice.key} className={`plan-choice ${selected ? "is-selected" : ""}`}>
              <label className="plan-choice-label">
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={`${prefix}-${group.groupId}`}
                  checked={selected}
                  onChange={() =>
                    onChange(
                      multiple
                        ? {
                            planTargets: selected
                              ? selectedKeys.filter((key) => key !== choice.key)
                              : [...selectedKeys, choice.key],
                            quantities,
                          }
                        : { planTargets: [choice.key], quantities, multiple: false },
                    )
                  }
                  data-testid={`${prefix}-plan-${choice.key.slice(5)}`}
                />
                <span>
                  <span className="plan-choice-name">{choice.name}</span>
                  <span className="plan-choice-price">
                    {choice.price
                      ? `Published price: ${publishedPriceText(choice.price)}`
                      : "Current published price unavailable"}
                  </span>
                  {choice.coverage ? (
                    <span className="plan-choice-coverage">{choice.coverage}</span>
                  ) : null}
                </span>
              </label>
              {selected ? (
                <QuantityStepper
                  name={choice.name}
                  quantity={quantity}
                  onChange={(value) =>
                    onChange({
                      planTargets: selectedKeys,
                      quantities: { ...quantities, [choice.key]: value },
                      multiple,
                    })
                  }
                />
              ) : null}
              <details className="plan-info">
                <summary aria-label={`About ${choice.name}`}>i</summary>
                <div>
                  {choice.evidence}. Prices are published prices, not your actual bill. Quantities
                  count purchased accounts; they do not assign recorded calls to an account.
                </div>
              </details>
            </div>
          );
        })}
        {!multiple &&
        (answer === "keep-current" ||
          group.currentTargets.length > 1 ||
          group.currentTargets.some(
            (key) => !group.candidates.some((candidate) => `plan:${candidate.planId}` === key),
          )) ? (
          <label className="plan-keep-current">
            <input
              type="radio"
              name={`${prefix}-${group.groupId}`}
              checked={answer === "keep-current"}
              onChange={() => onChange("keep-current")}
            />
            Keep my current selections
          </label>
        ) : null}
      </div>
      <button
        type="button"
        className="plan-multiple"
        aria-pressed={multiple}
        onClick={() =>
          onChange(
            multiple
              ? selectedKeys.length === 1
                ? { planTargets: selectedKeys, quantities, multiple: false }
                : initialDiscoveryAnswer(group)
              : { planTargets: selectedKeys, quantities },
          )
        }
      >
        {multiple ? "Choose one plan" : "I pay for multiple plans"}
      </button>
      <fieldset className="plan-segments" aria-label="Other billing arrangements">
        {NON_PLAN_CHOICES.map((choice) => (
          <label key={choice.value} className={answer === choice.value ? "is-selected" : ""}>
            <input
              type="radio"
              name={`${prefix}-${group.groupId}`}
              checked={answer === choice.value}
              onChange={() => onChange(choice.value)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
