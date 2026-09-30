"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import { isSyntheticCatalogId } from "@stackreplay/share";
import { useMemo } from "react";
import { catalogPlansAt, loadPublicCatalog } from "@/lib/public-catalog";
import type { TargetKey } from "@/lib/routes";
import { familyOfPlan, priceMoney, rangeText, type ScenarioResult } from "@/lib/stack-analysis";
import { EvidenceList } from "./evidence";

const isPlan = (key: TargetKey) => key.startsWith("plan:");

function monthly(price: { amount: string; currency: string; interval: string } | undefined) {
  return price?.currency === "USD" && price.interval === "month" ? price.amount : undefined;
}

export function deltaText(delta: string | undefined): string {
  if (delta === undefined) return "Not comparable";
  const value = new Decimal(delta);
  if (value.isZero()) return "$0/mo";
  return `${value.isNegative() ? "−" : "+"}${priceMoney(value.abs().toString())}/mo`;
}

/**
 * The proposed stack beside the current one. Controlled: the caller owns both
 * lists, so My Stack and Replay's stack scenario edit the same shape. Nothing
 * here writes Current Stack.
 */
export function ScenarioEditor({
  current,
  proposed,
  onChange,
  idPrefix = "scenario",
}: {
  current: readonly TargetKey[];
  proposed: readonly TargetKey[];
  onChange: (next: TargetKey[]) => void;
  idPrefix?: string;
}) {
  const plans = useMemo(
    () => catalogPlansAt(DECISION_MARKET.rulesAt).filter((plan) => !isSyntheticCatalogId(plan.id)),
    [],
  );
  const planOf = (key: TargetKey) => plans.find((plan) => `plan:${plan.id}` === key);
  const name = (key: TargetKey) => planOf(key)?.name ?? key.slice(5);
  const currentPlans = current.filter(isPlan);
  const proposedPlans = proposed.filter(isPlan);
  const familyKey = (key: TargetKey) => familyOfPlan(key.slice(5))?.groupId;
  /** A tier change: the one other plan of this plan's family now proposed in its place. */
  const replacementFor = (key: TargetKey): TargetKey | undefined => {
    const family = familyKey(key);
    if (!family || currentPlans.filter((k) => familyKey(k) === family).length > 1) return undefined;
    return proposedPlans.find(
      (k) => k !== key && familyKey(k) === family && !currentPlans.includes(k),
    );
  };
  const replacements = new Set(
    currentPlans.map(replacementFor).filter((key): key is TargetKey => key !== undefined),
  );
  const added = proposedPlans.filter(
    (key) => !currentPlans.includes(key) && !replacements.has(key),
  );
  const setRow = (key: TargetKey, choice: TargetKey | "remove") => {
    const replacement = replacementFor(key);
    const drop = new Set<TargetKey>([key, ...(replacement ? [replacement] : [])]);
    const index = proposed.findIndex((k) => drop.has(k));
    const next = proposed.filter((k) => !drop.has(k));
    if (choice !== "remove")
      next.splice(index < 0 ? next.length : Math.min(index, next.length), 0, choice);
    onChange([...new Set(next)]);
  };
  const tierChoices = (key: TargetKey) => {
    const family = familyOfPlan(key.slice(5));
    const siblings = family ? currentPlans.filter((k) => familyKey(k) === family.groupId) : [];
    const ids =
      family && siblings.length <= 1
        ? [...new Set([key.slice(5), ...(family.planIds as readonly string[])])]
        : [key.slice(5)];
    return ids
      .map((id) => plans.find((plan) => plan.id === id))
      .filter((plan) => plan !== undefined)
      .sort((a, b) => new Decimal(monthly(a.price) ?? "0").cmp(monthly(b.price) ?? "0"));
  };
  const addable = plans
    .filter((plan) => !proposedPlans.includes(`plan:${plan.id}`))
    .sort((a, b) => a.providerId.localeCompare(b.providerId) || a.name.localeCompare(b.name));
  const providers = [...new Set(addable.map((plan) => plan.providerId))];
  const providerNames = useMemo(
    () =>
      new Map(
        loadPublicCatalog(DECISION_MARKET.rulesAt.slice(0, 10)).providers.map((provider) => [
          provider.id,
          provider.name,
        ]),
      ),
    [],
  );
  const priceOf = (key: TargetKey) => {
    const amount = monthly(planOf(key)?.price);
    return amount ? `${priceMoney(amount)}/mo` : "Price unavailable";
  };

  return (
    <div className="stack-scenario-editor" data-testid={`${idPrefix}-editor`}>
      <div className="stack-scenario-column">
        <p className="stack-eyebrow">Current stack</p>
        <ul>
          {currentPlans.map((key) => (
            <li key={key}>
              <span>{name(key)}</span>
              <span className="stack-mono">{priceOf(key)}</span>
            </li>
          ))}
          {currentPlans.length === 0 ? <li className="stack-caption">No subscriptions</li> : null}
        </ul>
      </div>
      <div className="stack-scenario-column stack-scenario-proposed">
        <p className="stack-eyebrow">Proposed stack</p>
        <ul>
          {currentPlans.map((key) => {
            const replacement = replacementFor(key);
            const kept = proposedPlans.includes(key);
            const value = kept ? key : (replacement ?? "remove");
            const changed = value !== key;
            return (
              <li
                key={key}
                data-state={value === "remove" ? "removed" : changed ? "changed" : "kept"}
              >
                <label className="stack-scenario-choice">
                  <span className="sr-only">Proposed plan in place of {name(key)}</span>
                  <select
                    value={value}
                    data-testid={`${idPrefix}-plan-${key.slice(5)}`}
                    onChange={(event) => setRow(key, event.target.value as TargetKey | "remove")}
                  >
                    {tierChoices(key).map((plan) => (
                      <option key={plan.id} value={`plan:${plan.id}`}>
                        {plan.name} · {priceOf(`plan:${plan.id}`)}
                      </option>
                    ))}
                    <option value="remove">Remove {name(key)}</option>
                  </select>
                </label>
                {changed ? (
                  <button
                    type="button"
                    className="stack-link"
                    onClick={() => setRow(key, key)}
                    aria-label={`Restore ${name(key)}`}
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    className="stack-quiet-action"
                    onClick={() => setRow(key, "remove")}
                    aria-label={`Remove ${name(key)} from the proposed stack`}
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
          {added.map((key) => (
            <li key={key} data-state="added">
              <span>
                {name(key)} <span className="stack-caption">added</span>
              </span>
              <span className="stack-scenario-added-actions">
                <span className="stack-mono">{priceOf(key)}</span>
                <button
                  type="button"
                  className="stack-quiet-action"
                  onClick={() => onChange(proposed.filter((k) => k !== key))}
                  aria-label={`Remove ${name(key)} from the proposed stack`}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        <label className="stack-scenario-add">
          <span>Add a subscription</span>
          <select
            value=""
            data-testid={`${idPrefix}-add`}
            onChange={(event) => {
              const key = event.target.value as TargetKey;
              if (key) onChange([...new Set([...proposed, key])]);
            }}
          >
            <option value="">Choose a catalog plan…</option>
            {providers.map((provider) => (
              <optgroup key={provider} label={providerNames.get(provider) ?? provider}>
                {addable
                  .filter((plan) => plan.providerId === provider)
                  .map((plan) => (
                    <option key={plan.id} value={`plan:${plan.id}`}>
                      {plan.name} · {priceOf(`plan:${plan.id}`)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/** What StackReplay can and cannot determine about the proposed change. */
export function ScenarioOutcome({
  result,
  testId = "scenario-outcome",
}: {
  result: ScenarioResult;
  testId?: string;
}) {
  if (result.unchanged)
    return (
      <p className="stack-caption" data-testid={testId}>
        Change a tier, remove a subscription or add one to see what it means for this workload.
      </p>
    );
  return (
    <div className="stack-scenario-outcome" data-testid={testId} aria-live="polite">
      <div className="stack-scenario-totals">
        <p>
          <span className="stack-eyebrow">Current</span>
          <strong>
            {result.currentMonthly ? `${priceMoney(result.currentMonthly)}/mo` : "Unpriced"}
          </strong>
        </p>
        <p>
          <span className="stack-eyebrow">Proposed</span>
          <strong>
            {result.proposedMonthly ? `${priceMoney(result.proposedMonthly)}/mo` : "Unpriced"}
          </strong>
        </p>
        <p className="stack-scenario-delta" data-testid={`${testId}-delta`}>
          <strong>{deltaText(result.monthlyDelta)}</strong>
          <span>published subscription spend</span>
        </p>
      </div>
      <ol className="stack-scenario-changes">
        {result.changes.map((change) => (
          <li key={change.id}>
            <div className="stack-scenario-change-heading">
              <h4>{change.title}</h4>
              <span className="stack-mono">{deltaText(change.monthlyDelta)}</span>
            </div>
            <EvidenceList items={change.findings} />
          </li>
        ))}
      </ol>
      {result.uncovered ? (
        <p className="stack-scenario-uncovered" data-testid={`${testId}-uncovered`}>
          Recorded work left without an associated subscription:{" "}
          <strong>{result.uncovered.calls.toLocaleString("en-US")} calls</strong> from{" "}
          {result.uncovered.tools.join(" and ")}
          {result.uncovered.value
            ? ` · ${rangeText(result.uncovered.value)} at current direct API rates${
                result.uncovered.pricedCalls < result.uncovered.calls
                  ? ` for ${result.uncovered.pricedCalls.toLocaleString("en-US")} priced calls`
                  : ""
              }. That values the same recorded tokens; it is not a bill or a quota.`
            : ". Its API-equivalent could not be priced."}
        </p>
      ) : null}
    </div>
  );
}
