"use client";

import { Button, Select } from "@stackreplay/ui";
import { useEffect, useMemo, useState } from "react";
import {
  MAX_QUANTITY,
  newSubscriptionId,
  readStackSubscriptions,
  type StackSubscription,
  subscribeCurrentStack,
  subscriptionQuantity,
  type TargetKey,
  writeStackSubscriptions,
} from "@/lib/current-stack";
import {
  accountsText,
  monthlyText,
  type PaidPlan,
  paidPlanLabel,
  payablePlans,
  usdText,
  whatYouPay,
} from "@/lib/what-you-pay";

/** One row per plan: the saved rows of a plan collapse into a single quantity. */
function withQuantity(
  subscriptions: readonly StackSubscription[],
  key: TargetKey,
  quantity: number,
): StackSubscription[] {
  const taken = subscriptions.map((entry) => entry.id);
  const next: StackSubscription[] = [];
  const seen = new Set<TargetKey>();
  for (const entry of subscriptions) {
    if (!entry.plan.startsWith("plan:") || seen.has(entry.plan)) continue;
    seen.add(entry.plan);
    const total =
      entry.plan === key
        ? quantity
        : subscriptions
            .filter((other) => other.plan === entry.plan)
            .reduce((sum, other) => sum + subscriptionQuantity(other), 0);
    if (total >= 1)
      next.push({ id: entry.id, plan: entry.plan, ...(total > 1 ? { quantity: total } : {}) });
  }
  if (!seen.has(key) && quantity >= 1)
    next.push({
      id: newSubscriptionId(taken),
      plan: key,
      ...(quantity > 1 ? { quantity } : {}),
    });
  return next;
}

/**
 * The optional "What you pay" input: the subscriptions a person has, with
 * quantities. It feeds one figure, "Nx what you paid". Nothing is shown anywhere
 * else until a plan is entered. Kept in this browser only.
 */
export function WhatYouPayEditor() {
  const [subscriptions, setSubscriptions] = useState<StackSubscription[]>();
  const [saveFailed, setSaveFailed] = useState(false);
  const [adding, setAdding] = useState("");
  const choices = useMemo(() => payablePlans(new Date().toISOString().slice(0, 10)), []);
  useEffect(() => {
    const refresh = () => setSubscriptions(readStackSubscriptions());
    refresh();
    return subscribeCurrentStack(refresh);
  }, []);
  const pay = whatYouPay(subscriptions ?? [], choices);
  const chosen = new Set(pay?.plans.map((plan) => plan.id));
  const addable = choices.filter((plan) => !chosen.has(plan.id));
  const save = (next: StackSubscription[]) => setSaveFailed(!writeStackSubscriptions(next));
  const setQuantity = (plan: PaidPlan, quantity: number) =>
    save(withQuantity(readStackSubscriptions(), plan.key, quantity));
  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="what-you-pay">
      {subscriptions === undefined ? (
        <p className="text-sm text-muted-foreground">Reading your saved plans…</p>
      ) : pay ? (
        <>
          <div className="flex flex-col gap-1" aria-live="polite">
            <p className="text-sm text-foreground" data-testid="what-you-pay-summary">
              {pay.plans.map(paidPlanLabel).join(" · ")}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="what-you-pay-total">
              {accountsText(pay.accounts)}
              {pay.monthlyUsd ? ` · ${monthlyText(pay.monthlyUsd)}` : null}
            </p>
            {pay.monthlyUsd ? null : (
              <p className="text-xs text-muted-foreground">
                A plan here has no published monthly price in dollars, so there is no total.
              </p>
            )}
          </div>
          <ul className="grid min-w-0 border-t border-border">
            {pay.plans.map((plan) => (
              <li
                key={plan.key}
                className="flex min-h-14 min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border py-2"
                data-testid={`what-you-pay-plan-${plan.id}`}
              >
                <span className="min-w-0 flex-1 basis-40 break-words text-sm">
                  {plan.name}
                  {plan.monthly ? (
                    <small className="block text-xs text-muted-foreground">
                      {usdText(plan.monthly)}/month each
                    </small>
                  ) : null}
                </span>
                <fieldset className="m-0 inline-flex min-w-0 items-center gap-1 border-0 p-0">
                  <legend className="sr-only">{plan.name} accounts</legend>
                  <Button
                    variant="outline"
                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                    aria-label={`Fewer ${plan.name} accounts`}
                    disabled={plan.quantity <= 1}
                    onClick={() => setQuantity(plan, plan.quantity - 1)}
                  >
                    −
                  </Button>
                  <output
                    className="min-w-8 text-center text-sm tabular-nums"
                    data-testid={`what-you-pay-quantity-${plan.id}`}
                  >
                    {plan.quantity}
                  </output>
                  <Button
                    variant="outline"
                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
                    aria-label={`More ${plan.name} accounts`}
                    disabled={plan.quantity >= MAX_QUANTITY}
                    onClick={() => setQuantity(plan, plan.quantity + 1)}
                  >
                    +
                  </Button>
                </fieldset>
                <Button
                  variant="ghost"
                  className="min-h-11 sm:min-h-9"
                  aria-label={`Remove ${plan.name}`}
                  onClick={() => setQuantity(plan, 0)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="what-you-pay-empty">
          Nothing entered. This is optional.
        </p>
      )}
      <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-sm">
        <span className="text-xs text-muted-foreground">Add a plan</span>
        <Select
          label="Add a plan"
          placeholder="Choose a plan"
          options={addable.map((plan) => ({
            value: plan.id,
            label: `${plan.name} · ${usdText(plan.price.amount)}/${plan.price.interval}`,
          }))}
          value={adding}
          disabled={subscriptions === undefined || addable.length === 0}
          onValueChange={(id) => {
            setAdding("");
            if (id) save(withQuantity(readStackSubscriptions(), `plan:${id}`, 1));
          }}
        />
      </div>
      {saveFailed ? (
        <p role="alert" className="text-sm text-warning">
          Could not save this selection. Browser storage is unavailable.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Kept in this browser. Published list prices, not your actual bill.
      </p>
    </div>
  );
}
