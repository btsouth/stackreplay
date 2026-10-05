"use client";

import { DECISION_MARKET } from "@stackreplay/catalog/market";
import Link from "next/link";
import { AppSelect } from "@/components/plans/app-select";
import { HistoryConfirmation, ReviewSetup } from "@/components/workload/review-setup";
import { catalogPlansAt } from "@/lib/public-catalog";
import { nextDate, type ReviewComposition, type ReviewHistory } from "@/lib/review-period";
import type { StackConfirmation, StackPeriod } from "@/lib/stack-analysis";
import { stackPeriodLabel } from "@/lib/stack-analysis";
import type { useReview } from "@/lib/use-review";
import type { ImportRecord } from "@/lib/worker-protocol";

const TOOL_NAMES: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "command-code": "Command Code",
  opencode: "OpenCode",
  hermes: "Hermes",
};

export function periodStatus(
  period: StackPeriod,
  confirmation: StackConfirmation | undefined,
): { label: string; detail: string; state: "confirmed" | "unconfirmed" | "none" } {
  const label =
    period.kind === "billing"
      ? period.source === "cycle"
        ? "Billing cycle"
        : "Review period"
      : "Recorded history";
  if (period.kind === "unbounded")
    return {
      label,
      detail: "Longer than one billing period. Choose a period of up to 31 days.",
      state: "none",
    };
  if (period.kind === "billing" && !period.ended)
    return { label, detail: "In progress · history cannot be confirmed yet", state: "unconfirmed" };
  if (!confirmation)
    return {
      label,
      detail:
        period.kind === "recorded"
          ? "Not a billing period · history not confirmed"
          : "History not confirmed",
      state: "unconfirmed",
    };
  return {
    label,
    detail:
      confirmation.scope === "all"
        ? "History confirmed by you · all imported tools"
        : `History confirmed by you · ${confirmation.label || TOOL_NAMES[confirmation.sourceId] || confirmation.sourceId} account only`,
    state: "confirmed",
  };
}

export function StackPeriodLine({
  period,
  confirmation,
  open,
  onToggle,
  disabled,
}: {
  period: StackPeriod;
  confirmation: StackConfirmation | undefined;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const status = periodStatus(period, confirmation);
  return (
    <div className="stack-period-line" data-testid="stack-period">
      <p>
        <span className="stack-eyebrow">{status.label}</span>
        <strong data-testid="stack-period-dates">
          {stackPeriodLabel(period)}
          {period.kind !== "unbounded"
            ? ` · ${period.days} ${period.days === 1 ? "day" : "days"} · UTC`
            : ""}
        </strong>
        <span
          className={`stack-period-state stack-period-${status.state}`}
          data-testid="stack-period-state"
        >
          {status.state === "confirmed" ? "✓ " : ""}
          {status.detail}
        </span>
      </p>
      <button
        type="button"
        className="stack-link"
        aria-expanded={open}
        aria-controls="stack-period-panel"
        onClick={onToggle}
        disabled={disabled}
        data-testid="stack-period-edit"
      >
        {open ? "Done" : period.kind === "unbounded" ? "Choose billing period" : "Change period"}
      </button>
    </div>
  );
}

/** The same persisted review choice Workload's billing-period review edits. */
export function StackPeriodPanel({
  record,
  local,
  review,
  accounts,
  scopeDigest,
  partialScan,
  needsPeriod,
}: {
  record: ImportRecord;
  local: ReturnType<typeof useReview>;
  review: ReviewComposition | undefined;
  accounts: ReviewHistory["accounts"];
  scopeDigest: string | undefined;
  partialScan: boolean;
  needsPeriod: boolean;
}) {
  const { choice } = local;
  const recordedPeriod =
    record.summary.firstEventAt && record.summary.lastEventAt
      ? {
          start: record.summary.firstEventAt.slice(0, 10),
          end: nextDate(record.summary.lastEventAt.slice(0, 10)),
        }
      : undefined;
  const names = Object.fromEntries(
    catalogPlansAt(DECISION_MARKET.rulesAt).map((plan) => [`plan:${plan.id}`, plan.name]),
  );
  return (
    <section
      id="stack-period-panel"
      className="stack-period-panel"
      aria-label="Billing period for this stack"
      data-testid="stack-period-panel"
    >
      <p className="stack-section-description">
        My Stack analyzes one billing period at a time. This is the same period Workload's
        billing-period review uses. Nothing is prorated or extrapolated.
      </p>
      {accounts?.length ? (
        <div className="stack-field">
          <span>Local source account for history confirmation</span>
          <AppSelect
            label="Local source account for history confirmation"
            value={choice.resourceInstanceId ?? ""}
            onChange={(event) => {
              const {
                historyConfirmation: _confirmation,
                historyConfirmed: _legacy,
                resourceInstanceId: _account,
                accountLabel: _label,
                ...rest
              } = choice;
              local.setChoice({
                ...rest,
                ...(event.target.value ? { resourceInstanceId: event.target.value } : {}),
              });
            }}
          >
            <option value="">All imported accounts</option>
            {accounts.map((account, index) => (
              <option key={account.resourceInstanceId} value={account.resourceInstanceId}>
                {TOOL_NAMES[account.source] ?? account.source} account {index + 1} ·{" "}
                {account.calls.toLocaleString("en-US")} responses
              </option>
            ))}
          </AppSelect>
        </div>
      ) : null}
      <ReviewSetup
        key={`${choice.mode}:${choice.resourceInstanceId ?? "all"}`}
        choice={choice}
        recordedPeriod={recordedPeriod}
        billing={local.billing}
        onChange={local.setChoice}
        names={names}
        needsPeriod={needsPeriod}
      />
      {!needsPeriod && review ? (
        <div className="stack-period-confirm">
          <HistoryConfirmation
            choice={choice}
            review={review}
            importId={record.id}
            scopeDigest={scopeDigest}
            partialScan={partialScan}
            onChange={local.setChoice}
          />
          {accounts?.length && !choice.resourceInstanceId ? (
            <p className="stack-caption">
              This workload has separate local accounts. Choose one to confirm its history; a
              confirmation covers that account's tool only.
            </p>
          ) : null}
        </div>
      ) : null}
      {local.saveFailed ? (
        <p role="alert" className="stack-save-error">
          This period could not be saved in this browser. It lasts until you leave the page.
        </p>
      ) : null}
      <Link
        className="stack-link"
        href={`/app/stats?import=${encodeURIComponent(record.id)}#api-market`}
      >
        Enter amounts you paid in the billing-period review →
      </Link>
    </section>
  );
}
