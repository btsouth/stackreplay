"use client";
import { useEffect, useState } from "react";
import { type BillingFact, billingFactSchema } from "@/lib/review-period";

const inputClass =
  "min-h-11 w-full min-w-0 border border-border bg-background px-3 font-mono text-sm";
export function BillingEditor({
  name,
  fact,
  onSave,
  synthetic,
}: {
  name: string;
  fact?: BillingFact | undefined;
  onSave: (fact: BillingFact) => void;
  synthetic: boolean;
}) {
  const [start, setStart] = useState(fact?.cycle?.start ?? "");
  const [end, setEnd] = useState(fact?.cycle?.end ?? "");
  const [paid, setPaid] = useState(fact?.paid ?? "");
  const savedStart = fact?.cycle?.start ?? "",
    savedEnd = fact?.cycle?.end ?? "",
    savedPaid = fact?.paid ?? "";
  useEffect(() => {
    setStart(savedStart);
    setEnd(savedEnd);
    setPaid(savedPaid);
  }, [savedStart, savedEnd, savedPaid]);
  const [error, setError] = useState<string>();
  return (
    <form
      className="my-3 border-l border-border pl-4"
      aria-label={`${name} billing facts`}
      onSubmit={(e) => {
        e.preventDefault();
        const result = billingFactSchema.safeParse({
          ...(start || end ? { cycle: { start, end } } : {}),
          ...(paid !== "" ? { paid } : {}),
          provenance: synthetic ? "synthetic" : "local-user",
        });
        if (!result.success) {
          setError(
            "Enter valid cycle dates (1–31 days) and a non-negative USD amount with at most two decimals. Both dates are required for a cycle.",
          );
          return;
        }
        setError(undefined);
        onSave(result.data);
      }}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {synthetic ? "Synthetic sample billing" : "Optional local billing facts"}. Published catalog
        price stays unchanged.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="min-w-0 text-xs">
          Cycle start (UTC)
          <input
            aria-label={`${name} cycle start`}
            type="date"
            className={inputClass}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="min-w-0 text-xs">
          Renewal / end, excluded (UTC)
          <input
            aria-label={`${name} cycle end`}
            type="date"
            className={inputClass}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label className="min-w-0 text-xs">
          Amount you paid (USD, optional)
          <input
            aria-label={`${name} amount paid`}
            inputMode="decimal"
            placeholder="Not confirmed"
            className={inputClass}
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
          />
        </label>
      </div>
      <button className="min-h-11 text-accent underline" type="submit">
        Save local billing facts
      </button>
      {error ? (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      ) : null}
      {fact ? (
        <p className="text-xs text-muted-foreground">
          {fact.provenance === "synthetic"
            ? "Synthetic sample"
            : "User-entered locally, not verified"}
          {fact.paid !== undefined
            ? ` · confirmed paid $${fact.paid}`
            : " · paid amount not supplied"}
          {fact.cycle
            ? ` · cycle ${fact.cycle.start} → ${fact.cycle.end} (end excluded)`
            : " · cycle not supplied"}
        </p>
      ) : null}
    </form>
  );
}
