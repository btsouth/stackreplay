"use client";

import { useEffect, useState } from "react";
import { AppSelect } from "@/components/plans/app-select";
import {
  type BillingFact,
  daysInPeriod,
  periodLabel,
  periodSchema,
  type ReviewChoice,
  type ReviewComposition,
  type ReviewPeriod,
  resolveReviewPeriod,
} from "@/lib/review-period";

export function ReviewSetup({
  choice,
  recordedPeriod,
  billing,
  onChange,
  names,
  needsPeriod,
}: {
  choice: ReviewChoice;
  recordedPeriod: ReviewPeriod | undefined;
  billing: Record<string, BillingFact>;
  onChange: (choice: ReviewChoice) => void;
  names: Record<string, string>;
  needsPeriod: boolean;
}) {
  const applied = resolveReviewPeriod(choice, billing) ?? recordedPeriod;
  const [start, setStart] = useState(applied?.start ?? "");
  const [end, setEnd] = useState(applied?.end ?? "");
  const [error, setError] = useState<string>();
  useEffect(() => {
    setStart(applied?.start ?? "");
    setEnd(applied?.end ?? "");
    setError(undefined);
  }, [applied?.start, applied?.end]);
  const account = {
    ...(choice.resourceInstanceId ? { resourceInstanceId: choice.resourceInstanceId } : {}),
    ...(choice.accountLabel ? { accountLabel: choice.accountLabel } : {}),
  };
  const recordedValid = periodSchema.safeParse(recordedPeriod).success;
  const cycles = Object.keys(billing).filter(
    (key) =>
      billing[key]?.resourceInstanceId === choice.resourceInstanceId &&
      periodSchema.safeParse(billing[key]?.cycle).success,
  );
  return (
    <section
      id="review-setup"
      aria-label="Review period controls"
      className="space-y-3 border-b border-border pb-5"
      data-testid="review-setup"
    >
      <h2 id="api-market-heading" className="text-2xl font-medium tracking-tight">
        {needsPeriod ? "Choose a review period" : "Review period"}
      </h2>
      {recordedPeriod ? (
        <p className="text-sm" data-testid="imported-history-span">
          Your imported history spans {periodLabel(recordedPeriod)} ({daysInPeriod(recordedPeriod)}{" "}
          days). StackReplay reviews one period of up to 31 days at a time.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Dates use UTC. Start is included; end is the next renewal date and is excluded. No usage is
        extrapolated.
      </p>
      <div className="flex max-w-xl flex-col gap-1 text-sm">
        Review period source
        <AppSelect
          label="History period"
          aria-label="Review period source"
          className="min-h-11 w-full border border-border bg-background px-3"
          value={
            choice.mode === "cycle"
              ? (choice.subscription ?? "")
              : choice.mode === "history" && !recordedValid
                ? ""
                : choice.mode
          }
          onChange={(e) => {
            setError(undefined);
            const value = e.target.value;
            if (value === "history") onChange({ ...account, mode: "history" });
            else if (value === "custom")
              onChange({
                ...account,
                mode: "custom",
                ...(recordedValid && applied ? { period: applied } : {}),
              });
            else onChange({ ...account, mode: "cycle", subscription: value });
          }}
        >
          <option value="" disabled>
            Choose dates or a billing cycle
          </option>
          <option value="history" disabled={!recordedValid}>
            Use recorded history span{!recordedValid ? " (exceeds 31 days)" : ""}
          </option>
          <option value="custom">Choose a custom period</option>
          {cycles.map((key) => (
            <option key={key} value={key}>
              Use {names[key] ?? "subscription"} billing cycle
            </option>
          ))}
        </AppSelect>
      </div>
      {cycles.length ? (
        <div className="flex flex-wrap gap-2">
          {cycles.map((key) => (
            <button
              key={key}
              type="button"
              className="min-h-11 border border-border px-3 py-2 text-left text-sm text-accent"
              onClick={() => onChange({ ...account, mode: "cycle", subscription: key })}
            >
              Use billing cycle · {names[key] ?? "Subscription"} · {billing[key]?.cycle?.start} →{" "}
              {billing[key]?.cycle?.end}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="grid gap-3 text-sm sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = periodSchema.safeParse({ start, end });
          if (!parsed.success) {
            setError("Choose valid dates for a period of 1 to 31 days. The end date is excluded.");
            return;
          }
          setError(undefined);
          onChange({ ...account, mode: "custom", period: parsed.data });
        }}
      >
        <label className="min-w-0">
          Review period start
          <input
            aria-label="Review start date"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="min-h-11 w-full min-w-0 border border-border bg-background px-3"
          />
        </label>
        <label className="min-w-0">
          Review period end (excluded)
          <input
            aria-label="Review end date"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="min-h-11 w-full min-w-0 border border-border bg-background px-3"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 self-end bg-accent-solid px-3 text-accent-foreground"
        >
          Apply review period
        </button>
        {error ? (
          <p role="alert" className="text-warning sm:col-span-3">
            {error}
          </p>
        ) : null}
      </form>
    </section>
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
          (!!review.history.accounts?.length && !choice.resourceInstanceId) ||
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
                    ...(choice.resourceInstanceId
                      ? { resourceInstanceId: choice.resourceInstanceId }
                      : {}),
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
        {choice.resourceInstanceId
          ? `I believe the available ${choice.accountLabel || "selected account"} history covers this billing cycle.`
          : "I have imported the history for this whole review period, including all the sources I want to compare."}{" "}
        <span className="mt-1 block text-xs text-muted-foreground">
          Your local assertion, not independently verified. Days without calls may be idle days.
        </span>
      </span>
    </label>
  );
}
