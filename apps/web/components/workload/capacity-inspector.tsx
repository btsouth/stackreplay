"use client";

import { useState } from "react";
import { AppSelect } from "@/components/plans/app-select";
import {
  dateSchema,
  nextDate,
  periodLabel,
  type ReviewHistory,
  type ReviewPeriod,
} from "@/lib/review-period";
import type { ImportRecord } from "@/lib/worker-protocol";
import { CapacityBurdenSurface } from "./capacity-burden";

const field = "mt-1 min-h-11 w-full min-w-0 border border-border bg-background px-3 text-sm";
const sourceName = (source: string) => (source === "claude-code" ? "Claude Code" : source);

/** Capacity chronology is available without a subscription or a billing-period assertion. */
export function CapacityInspector({
  record,
  history,
  initialAccount,
  onClose,
}: {
  record: ImportRecord;
  history: ReviewHistory;
  initialAccount: string | undefined;
  onClose: () => void;
}) {
  const accounts = history.accounts ?? [];
  const [account, setAccount] = useState(
    initialAccount && accounts.some((a) => a.resourceInstanceId === initialAccount)
      ? initialAccount
      : (accounts[0]?.resourceInstanceId ?? ""),
  );
  const full = {
    start: record.summary.firstEventAt?.slice(0, 10) ?? "",
    end: record.summary.lastEventAt ? nextDate(record.summary.lastEventAt.slice(0, 10)) : "",
  };
  const [period, setPeriod] = useState<ReviewPeriod>(full);
  const [start, setStart] = useState(full.start);
  const [end, setEnd] = useState(full.end);
  const [error, setError] = useState("");
  return (
    <section
      aria-label="Interruption review"
      data-testid="capacity-inspector"
      className="space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Observed capacity
          </p>
          <h2 className="mt-2 text-3xl font-medium tracking-tight">When you hit a limit</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            See related retries, reported resets and where recorded work continued.
          </p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 text-sm text-accent">
          Close interruption review
        </button>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
        <div className="min-w-0 grow text-sm sm:max-w-sm">
          Account
          <AppSelect
            label="Capacity evidence"
            aria-label="Capacity account"
            className={field}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            {accounts.map((a, i) => (
              <option key={a.resourceInstanceId} value={a.resourceInstanceId}>
                {sourceName(a.source)}
                {accounts.filter((v) => v.source === a.source).length > 1
                  ? ` · account ${i + 1}`
                  : ""}{" "}
                · {a.calls.toLocaleString()} responses
              </option>
            ))}
          </AppSelect>
        </div>
        <details className="max-w-full text-sm" data-testid="capacity-date-filter">
          <summary className="min-h-11 cursor-pointer content-center text-accent">
            {periodLabel(period)} · Change dates
          </summary>
          <form
            className="grid gap-3 pt-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !dateSchema.safeParse(start).success ||
                !dateSchema.safeParse(end).success ||
                end <= start
              ) {
                setError("Choose a valid start date and a later end date.");
                return;
              }
              setError("");
              setPeriod({ start, end });
            }}
          >
            <label>
              From
              <input
                aria-label="Capacity start date"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={field}
              />
            </label>
            <label>
              Until (excluded)
              <input
                aria-label="Capacity end date"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={field}
              />
            </label>
            <button
              className="min-h-11 self-end bg-accent px-4 text-accent-foreground"
              type="submit"
            >
              Apply dates
            </button>
            <button
              className="min-h-11 text-left text-accent"
              type="button"
              onClick={() => {
                setPeriod(full);
                setStart(full.start);
                setEnd(full.end);
                setError("");
              }}
            >
              Use all imported history
            </button>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              UTC dates. Capacity inspection can cover your entire import. No billing setup is
              needed.
            </p>
          </form>
          {error ? (
            <p role="alert" className="text-sm text-warning">
              {error}
            </p>
          ) : null}
        </details>
      </div>
      {account ? (
        <CapacityBurdenSurface
          key={account}
          importId={record.id}
          resourceInstanceId={account}
          planId={undefined}
          period={period}
          workloadDigest={record.id}
          expanded
        >
          {({ summary, evidence }) => (
            <>
              {summary}
              <details className="border-t border-border pt-2">
                <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
                  Methodology &amp; capacity evidence
                </summary>
                <div className="space-y-4 py-3">{evidence}</div>
              </details>
            </>
          )}
        </CapacityBurdenSurface>
      ) : (
        <p className="text-sm">
          This import has no separate local account identity. Reimport native history to inspect
          account-specific interruptions.
        </p>
      )}
    </section>
  );
}
