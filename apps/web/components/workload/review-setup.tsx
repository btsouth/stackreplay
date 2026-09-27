"use client";
import { useState } from "react";
import {
  type BillingFact,
  periodSchema,
  type ReviewChoice,
  type ReviewComposition,
} from "@/lib/review-period";

export function ReviewSetup({
  choice,
  review,
  billing,
  selected,
  onChange,
  names,
  partialScan,
}: {
  choice: ReviewChoice;
  review?: ReviewComposition | undefined;
  billing: Record<string, BillingFact>;
  selected: readonly string[];
  onChange: (choice: ReviewChoice) => void;
  names: Record<string, string>;
  partialScan: boolean;
}) {
  const [start, setStart] = useState(choice.period?.start ?? review?.period?.start ?? "");
  const [end, setEnd] = useState(choice.period?.end ?? review?.period?.end ?? "");
  const [error, setError] = useState<string>();
  return (
    <details id="review-setup" className="border-y border-border py-2" data-testid="review-setup">
      <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
        Review a complete billing period
      </summary>
      <div className="flex flex-col gap-4 py-3 text-sm">
        <p>
          Choose exact dates, then confirm the history you imported. All review dates use UTC. The
          end date is the next renewal date and is excluded. Maximum 31 days.
        </p>
        <label className="flex flex-col gap-1">
          Review period source
          <select
            aria-label="Review period source"
            className="min-h-11 w-full border border-border bg-background px-3"
            value={choice.mode === "cycle" ? choice.subscription : choice.mode}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "history" || value === "custom")
                onChange({
                  mode: value,
                  ...(value === "custom" && choice.period ? { period: choice.period } : {}),
                });
              else onChange({ mode: "cycle", subscription: value });
            }}
          >
            <option value="history">Use recorded history span</option>
            <option value="custom">Choose a custom period</option>
            {selected
              .filter((key) => billing[key]?.cycle)
              .map((key) => (
                <option key={key} value={key}>
                  Use {names[key] ?? "subscription"} billing cycle
                </option>
              ))}
          </select>
        </label>
        {choice.mode === "custom" ? (
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = periodSchema.safeParse({ start, end });
              if (!parsed.success) {
                setError(
                  "Choose valid dates for a period of 1 to 31 days. The end date is excluded.",
                );
                return;
              }
              setError(undefined);
              onChange({ mode: "custom", period: parsed.data });
            }}
          >
            <label className="min-w-0">
              Start date
              <input
                aria-label="Review start date"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="min-h-11 w-full min-w-0 border border-border bg-background px-3"
              />
            </label>
            <label className="min-w-0">
              End date (excluded)
              <input
                aria-label="Review end date"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="min-h-11 w-full min-w-0 border border-border bg-background px-3"
              />
            </label>
            <button type="submit" className="min-h-11 self-end text-accent underline">
              Apply review period
            </button>
            {error ? (
              <p role="alert" className="text-warning sm:col-span-3">
                {error}
              </p>
            ) : null}
          </form>
        ) : null}
        {partialScan ? (
          <p className="text-warning">
            Resolve the reported scan gaps before confirming history coverage.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          A presence of events never establishes complete logs. Different subscription cycles are
          not prorated; choose one subscription or enter full-cycle facts matching the same dates.
        </p>
        <button
          type="button"
          className="min-h-11 self-start text-accent underline"
          onClick={() => {
            const d = document.getElementById("review-setup") as HTMLDetailsElement | null;
            if (d) {
              d.open = false;
              d.querySelector("summary")?.focus();
            }
          }}
        >
          Skip for now
        </button>
      </div>
    </details>
  );
}

/** Primary local assertion, visible next to history rather than hidden in setup. */
export function HistoryConfirmation({
  choice,
  review,
  importId,
  scopeDigest,
  partialScan,
  onChange,
}: {
  choice: ReviewChoice;
  review: ReviewComposition;
  importId: string;
  scopeDigest: string | undefined;
  partialScan: boolean;
  onChange: (choice: ReviewChoice) => void;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3">
      <input
        className="mt-1"
        type="checkbox"
        aria-label="Confirm history covers this review period"
        disabled={
          !scopeDigest ||
          !review?.period ||
          !periodSchema.safeParse(review.period).success ||
          (!review.synthetic && review.period.end > new Date().toISOString().slice(0, 10)) ||
          partialScan
        }
        checked={review?.historyConfirmed ?? false}
        onChange={(e) => {
          const { historyConfirmed: _old, historyConfirmation: _prior, ...rest } = choice;
          onChange({
            ...rest,
            ...(e.target.checked && review?.period
              ? {
                  historyConfirmation: {
                    importId,
                    scopeDigest: scopeDigest ?? "",
                    period: review.period,
                    confirmedAt: new Date().toISOString(),
                    provenance: review.synthetic ? "synthetic" : "local-user",
                  } as const,
                }
              : {}),
          });
        }}
      />
      <span>
        I have imported the history for this whole review period, including all the sources I want
        to compare. Days without calls may be idle days. This is my local confirmation, not proof
        from StackReplay.
      </span>
    </label>
  );
}
