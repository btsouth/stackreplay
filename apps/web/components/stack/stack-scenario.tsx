"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { Decimal } from "@stackreplay/replay-engine";
import { isSyntheticCatalogId } from "@stackreplay/share";
import { useMemo, useState } from "react";
import { AppSelect } from "@/components/plans/app-select";
import { newSubscriptionId, type StackSubscription } from "@/lib/current-stack";
import { catalogPlansAt, loadPublicCatalog } from "@/lib/public-catalog";
import type { TargetKey } from "@/lib/routes";
import { familyOfPlan, priceMoney, rangeText, type ScenarioResult } from "@/lib/stack-analysis";
import { EvidenceList } from "./evidence";

const isPlan = (entry: StackSubscription) => entry.plan.startsWith("plan:");

function monthly(price: { amount: string; currency: string; interval: string } | undefined) {
  return price?.currency === "USD" && price.interval === "month" ? price.amount : undefined;
}

export function deltaText(delta: string | undefined): string {
  if (delta === undefined) return "Not comparable";
  const value = new Decimal(delta);
  if (value.isZero()) return "$0/mo";
  return `${value.isNegative() ? "−" : "+"}${priceMoney(value.abs().toString())}/mo`;
}

/** The DOM-safe reference of each subscription: its plan id, then `-2`, `-3` for repeats. */
function refs(subscriptions: readonly StackSubscription[]): Map<string, string> {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const sub of subscriptions) {
    const id = sub.plan.slice(5);
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    out.set(sub.id, n === 1 ? id : `${id}-${n}`);
  }
  return out;
}

/**
 * The proposed stack beside the current one, one row per subscription.
 * Controlled: the caller owns both lists, so My Stack and Replay's stack
 * scenario edit the same shape. A tier change keeps the subscription's account
 * link. Nothing here writes Current Stack.
 */
export function ScenarioEditor({
  current,
  proposed,
  onChange,
  accountNames,
  idPrefix = "scenario",
}: {
  current: readonly StackSubscription[];
  proposed: readonly StackSubscription[];
  onChange: (next: StackSubscription[]) => void;
  /** Display names for linked accounts, by account key. */
  accountNames?: ReadonlyMap<string, string> | undefined;
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
  const currentRefs = refs(currentPlans);
  const added = proposedPlans.filter((entry) => !currentPlans.some((c) => c.id === entry.id));
  const accountOf = (entry: StackSubscription) =>
    entry.account ? (accountNames?.get(entry.account) ?? "Linked account") : undefined;
  const setRow = (sub: StackSubscription, choice: TargetKey | "remove") => {
    const index = proposed.findIndex((entry) => entry.id === sub.id);
    const next = proposed.filter((entry) => entry.id !== sub.id);
    if (choice !== "remove")
      next.splice(index < 0 ? next.length : index, 0, { ...sub, plan: choice });
    onChange(next);
  };
  const tierChoices = (key: TargetKey) => {
    const family = familyOfPlan(key.slice(5));
    const ids = family
      ? [...new Set([key.slice(5), ...(family.planIds as readonly string[])])]
      : [key.slice(5)];
    const known = ids
      .map((id) => plans.find((plan) => plan.id === id))
      .filter((plan) => plan !== undefined)
      .sort((a, b) => new Decimal(monthly(a.price) ?? "0").cmp(monthly(b.price) ?? "0"))
      .map((plan) => ({ id: plan.id, name: plan.name }));
    // A retired or unlisted selection keeps its own option so "kept" reads as kept.
    return known.some((plan) => plan.id === key.slice(5))
      ? known
      : [{ id: key.slice(5), name: name(key) }, ...known];
  };
  const [addChoice, setAddChoice] = useState<TargetKey | "">("");
  // A plan can be added more than once: a second account on the same tier is a second subscription.
  const addable = [...plans].sort(
    (a, b) => a.providerId.localeCompare(b.providerId) || a.name.localeCompare(b.name),
  );
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
  const label = (entry: StackSubscription) => {
    const account = accountOf(entry);
    return account ? `${name(entry.plan)} · ${account}` : name(entry.plan);
  };

  return (
    <div className="stack-scenario-editor" data-testid={`${idPrefix}-editor`}>
      <div className="stack-scenario-column">
        <p className="stack-eyebrow">Current stack</p>
        <ul>
          {currentPlans.map((entry) => (
            <li key={entry.id}>
              <span>{label(entry)}</span>
              <span className="stack-mono">{priceOf(entry.plan)}</span>
            </li>
          ))}
          {currentPlans.length === 0 ? <li className="stack-caption">No subscriptions</li> : null}
        </ul>
      </div>
      <div className="stack-scenario-column stack-scenario-proposed">
        <p className="stack-eyebrow">Proposed stack</p>
        <ul>
          {currentPlans.map((entry) => {
            const now = proposedPlans.find((other) => other.id === entry.id);
            const value = now?.plan ?? "remove";
            const changed = value !== entry.plan;
            const ref = currentRefs.get(entry.id) ?? entry.plan.slice(5);
            return (
              <li
                key={entry.id}
                data-state={value === "remove" ? "removed" : changed ? "changed" : "kept"}
              >
                <div className="stack-scenario-choice">
                  <span className="sr-only">Proposed plan in place of {label(entry)}</span>
                  <AppSelect
                    label="Change this plan"
                    value={value}
                    data-testid={`${idPrefix}-plan-${ref}`}
                    onChange={(event) => setRow(entry, event.target.value as TargetKey | "remove")}
                  >
                    {tierChoices(entry.plan).map((plan) => (
                      <option key={plan.id} value={`plan:${plan.id}`}>
                        {plan.name} · {priceOf(`plan:${plan.id}`)}
                      </option>
                    ))}
                    <option value="remove">Remove {name(entry.plan)}</option>
                  </AppSelect>
                  {accountOf(entry) ? (
                    <span className="stack-caption stack-scenario-account">{accountOf(entry)}</span>
                  ) : null}
                </div>
                {changed ? (
                  <button
                    type="button"
                    className="stack-link"
                    onClick={() => setRow(entry, entry.plan)}
                    aria-label={`Restore ${label(entry)}`}
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    className="stack-quiet-action"
                    onClick={() => setRow(entry, "remove")}
                    aria-label={`Remove ${label(entry)} from the proposed stack`}
                  >
                    Remove
                  </button>
                )}
              </li>
            );
          })}
          {added.map((entry) => (
            <li key={entry.id} data-state="added">
              <span>
                {label(entry)} <span className="stack-caption">added</span>
              </span>
              <span className="stack-scenario-added-actions">
                <span className="stack-mono">{priceOf(entry.plan)}</span>
                <button
                  type="button"
                  className="stack-quiet-action"
                  onClick={() => onChange(proposed.filter((other) => other.id !== entry.id))}
                  aria-label={`Remove ${label(entry)} from the proposed stack`}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        {/* Choosing a plan and adding it are separate steps, so arrowing through the list adds nothing. */}
        <div className="stack-scenario-add">
          <label htmlFor={`${idPrefix}-add`}>Add a subscription</label>
          <div>
            <AppSelect
              label="Add a plan"
              id={`${idPrefix}-add`}
              value={addChoice}
              data-testid={`${idPrefix}-add`}
              onChange={(event) => setAddChoice(event.target.value as TargetKey | "")}
            >
              <option value="">Choose a catalog plan…</option>
              {providers.map((provider) => (
                <optgroup key={provider} label={providerNames.get(provider) ?? provider}>
                  {addable
                    .filter((plan) => plan.providerId === provider)
                    .map((plan) => (
                      <option key={plan.id} value={`plan:${plan.id}`}>
                        {plan.name} · {priceOf(`plan:${plan.id}`)}
                        {proposedPlans.some((entry) => entry.plan === `plan:${plan.id}`)
                          ? " · another one"
                          : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </AppSelect>
            <button
              type="button"
              className="stack-secondary"
              disabled={!addChoice}
              data-testid={`${idPrefix}-add-button`}
              onClick={() => {
                if (!addChoice) return;
                onChange([
                  ...proposed,
                  { id: newSubscriptionId(proposed.map((entry) => entry.id)), plan: addChoice },
                ]);
                setAddChoice("");
              }}
            >
              Add to proposal
            </button>
          </div>
        </div>
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
              <h3>{change.title}</h3>
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
