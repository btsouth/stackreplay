"use client";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import { useEffect, useState } from "react";
import {
  billingFactSchema,
  periodSchema,
  type ReviewHistory,
  resolveReviewPeriod,
} from "@/lib/review-period";
import type { TargetKey } from "@/lib/routes";
import type { useReview } from "@/lib/use-review";

const plans = DECISION_MARKET.plans.filter((p) => p.artifact.purchase.kind === "subscription");
const field = "mt-1 min-h-11 w-full min-w-0 border border-border bg-background px-3 text-sm";

export function BillingSetup({
  local,
  accounts,
  onSaved,
}: {
  local: ReturnType<typeof useReview>;
  accounts: ReviewHistory["accounts"];
  onSaved: () => void;
}) {
  const { choice, billing, selected } = local;
  const [plan, setPlan] = useState<TargetKey | "">(
    (choice.focusedSubscription as TargetKey | undefined) ??
      (selected.length === 1 ? (selected[0] ?? "") : ""),
  );
  const applied = resolveReviewPeriod(choice, billing);
  const fact = plan ? billing[plan] : undefined;
  const [start, setStart] = useState(fact?.cycle?.start ?? applied?.start ?? "");
  const [end, setEnd] = useState(fact?.cycle?.end ?? applied?.end ?? "");
  const [paid, setPaid] = useState(fact?.paid ?? "");
  const [error, setError] = useState("");
  useEffect(() => {
    setStart(fact?.cycle?.start ?? applied?.start ?? "");
    setEnd(fact?.cycle?.end ?? applied?.end ?? "");
    setPaid(fact?.paid ?? "");
    setError("");
  }, [fact?.cycle?.start, fact?.cycle?.end, fact?.paid, applied?.start, applied?.end]);
  const chooseAccount = (value: string) => {
    const {
      historyConfirmation: _confirmation,
      historyConfirmed: _legacy,
      accountLabel: _label,
      resourceInstanceId: _account,
      ...rest
    } = choice;
    local.setChoice({ ...rest, ...(value ? { resourceInstanceId: value } : {}) });
  };
  const save = (key: TargetKey, cycle: { start: string; end: string }, amount: string) => {
    const parsed = billingFactSchema.safeParse({
      cycle,
      ...(amount.trim() ? { paid: amount.trim() } : {}),
      provenance: local.synthetic ? "synthetic" : "local-user",
    });
    if (!parsed.success) {
      setError(
        "Enter a billing cycle of 1 to 31 days and a valid USD amount (up to two decimal places).",
      );
      return;
    }
    const same = applied?.start === cycle.start && applied?.end === cycle.end;
    const {
      historyConfirmation: _confirmation,
      historyConfirmed: _legacy,
      ...unconfirmed
    } = choice;
    local.saveSetup(
      {
        ...(same ? choice : unconfirmed),
        mode: "cycle",
        subscription: key,
        focusedSubscription: key,
      },
      key,
      parsed.data,
    );
    if (!selected.includes(key)) local.setSelected([...selected, key]);
    setError("");
    onSaved();
  };
  return (
    <div data-testid="billing-setup" className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Enter the dates covered by your payment once. We use that same cycle to select your recorded
        workload. Nothing is prorated.
      </p>
      <form
        aria-label="Billing cycle comparison"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (accounts?.length && !choice.resourceInstanceId) {
            setError("Choose the local account this subscription paid for.");
            return;
          }
          if (!plan) {
            setError("Choose the subscription you paid for.");
            return;
          }
          if (!periodSchema.safeParse({ start, end }).success) {
            setError("Choose a billing cycle of 1 to 31 days. The renewal date is excluded.");
            return;
          }
          save(plan, { start, end }, paid);
        }}
      >
        <label className="min-w-0 text-sm">
          Account
          <select
            aria-label="Billing account"
            className={field}
            value={choice.resourceInstanceId ?? ""}
            onChange={(e) => chooseAccount(e.target.value)}
          >
            <option value="">
              {accounts?.length ? "Choose your local account" : "Imported workload"}
            </option>
            {accounts?.map((a, i) => (
              <option key={a.resourceInstanceId} value={a.resourceInstanceId}>
                {a.source === "claude-code" ? "Claude Code" : a.source}
                {accounts.filter((v) => v.source === a.source).length > 1
                  ? ` · account ${i + 1}`
                  : ""}{" "}
                · {a.calls.toLocaleString()} responses
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm">
          Subscription
          <select
            aria-label="Billing subscription"
            className={field}
            value={plan}
            onChange={(e) => {
              const key = e.target.value as TargetKey;
              setPlan(key);
              setPaid(billing[key]?.paid ?? "");
              setStart(billing[key]?.cycle?.start ?? applied?.start ?? "");
              setEnd(billing[key]?.cycle?.end ?? applied?.end ?? "");
            }}
          >
            <option value="">Choose a plan</option>
            {plans.map((p) => (
              <option key={p.id} value={`plan:${p.id}`}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-sm">
          Amount you paid · USD
          <input
            aria-label="Amount you paid"
            inputMode="decimal"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            placeholder="From your receipt"
            className={field}
          />
        </label>
        <label className="min-w-0 text-sm">
          Cycle starts
          <input
            aria-label="Billing cycle start"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={field}
          />
        </label>
        <label className="min-w-0 text-sm">
          Next renewal
          <input
            aria-label="Billing cycle end"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={field}
          />
        </label>
        <button
          type="submit"
          className="min-h-11 self-end bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
        >
          Compare this billing cycle →
        </button>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>Dates use UTC. The renewal date starts the next cycle and is excluded.</span>
        <span>Saved only in this browser.</span>
      </div>
      {plan
        ? (() => {
            const p = plans.find((p) => `plan:${p.id}` === plan);
            const purchase = p?.artifact.purchase;
            return purchase?.kind === "subscription" && purchase.fixedUsd !== null ? (
              <p className="text-xs text-muted-foreground">
                Published plan price: ${purchase.fixedUsd} /{" "}
                {purchase.term === "month" ? "month" : purchase.term}. Your paid amount can differ,
                including tax.
              </p>
            ) : null;
          })()
        : null}
      {Object.entries(billing)
        .filter(
          ([key, f]) =>
            plans.some((p) => `plan:${p.id}` === key) &&
            f.cycle &&
            f.resourceInstanceId === choice.resourceInstanceId,
        )
        .map(([key, f]) => (
          <button
            key={key}
            type="button"
            className="mr-3 min-h-11 text-left text-sm text-accent"
            onClick={() => {
              setPlan(key as TargetKey);
              if (f.cycle) save(key as TargetKey, f.cycle, f.paid ?? "");
            }}
          >
            Use saved cycle · {plans.find((p) => `plan:${p.id}` === key)?.name} · {f.cycle?.start} →{" "}
            {f.cycle?.end}
          </button>
        ))}
      {error ? (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      ) : null}
    </div>
  );
}
