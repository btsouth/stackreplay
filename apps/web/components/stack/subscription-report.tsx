"use client";

import Link from "next/link";
import type { buildMyStack } from "@/lib/my-stack";
import { publishedPriceText } from "@/lib/my-stack";
import type { TargetKey } from "@/lib/routes";
import {
  leverageText,
  rangeText,
  type StackPeriod,
  type SubscriptionReport,
  shareText,
  subscriptionPriceText,
} from "@/lib/stack-analysis";
import { EvidenceList, EvidenceWord } from "./evidence";
import { PublishedAccess } from "./published-access";

type Target = ReturnType<typeof buildMyStack>["targets"][number];

function periodDays(period: StackPeriod | undefined): number | undefined {
  return period && period.kind !== "unbounded" ? period.days : undefined;
}

/**
 * One subscription read against the selected workload: what it costs, the
 * recorded work associated with it, what that work is worth at API rates, and
 * what StackReplay cannot know. Configuration actions stay secondary.
 */
export function SubscriptionReportRow({
  report,
  target,
  period,
  disabled,
  onRemove,
  onEdit,
  onTest,
  currentStack,
}: {
  report: SubscriptionReport;
  target: Target;
  period: StackPeriod | undefined;
  disabled: boolean;
  onRemove: () => void;
  onEdit?: ((trigger: HTMLButtonElement) => void) | undefined;
  onTest?: ((proposed: TargetKey[], trigger: HTMLButtonElement) => void) | undefined;
  currentStack: readonly TargetKey[];
}) {
  const activity = report.activity;
  const facts = activity?.facts;
  const days = periodDays(period);
  const tier = report.tiers.filter((tier) => tier.direction === "lower").at(-1);
  const tool = report.family?.tool;
  const line =
    report.visibility === "not-readable"
      ? "StackReplay cannot read this plan's usage history"
      : report.visibility === "not-imported"
        ? `No ${tool} history in this workload`
        : report.visibility === "no-workload"
          ? report.family
            ? `Associated with ${tool} history`
            : "StackReplay cannot read this plan's usage history"
          : facts && facts.calls > 0
            ? [
                tool,
                days
                  ? `active ${facts.activeDays} of ${days} days`
                  : `${facts.activeDays} active days`,
                `${activity?.models.length ?? 0} ${activity?.models.length === 1 ? "model" : "models"}`,
                facts.blocked
                  ? facts.blocked.attempts > 0
                    ? `${facts.blocked.attempts.toLocaleString("en-US")} blocked attempts on ${facts.blocked.days} ${facts.blocked.days === 1 ? "day" : "days"}`
                    : "no limit events recorded"
                  : undefined,
                report.sharedWith.length
                  ? `shared with ${report.sharedWith.join(", ")}`
                  : undefined,
              ]
                .filter(Boolean)
                .join(" · ")
            : `${tool} · no recorded calls in this period`;
  const value = facts?.value ?? facts?.pricedValue;
  return (
    <article
      className="stack-report"
      id={`report-${report.id}`}
      data-testid={`stack-target-${report.id}`}
      data-visibility={report.visibility}
    >
      <div className="stack-report-grid">
        <div className="stack-report-name">
          <h3>{report.name}</h3>
          <p className="stack-caption">{line}</p>
          {!report.available ? (
            <p className="stack-caption">
              Current catalog facts unavailable. Your selection is preserved; update it when you
              know your current plan.
            </p>
          ) : null}
        </div>
        <dl className="stack-report-figures">
          <div className="stack-report-figure">
            <dt>Price</dt>
            <dd>
              {report.monthlyUsd
                ? subscriptionPriceText(report).replace(/\.00\//u, "/")
                : report.price
                  ? publishedPriceText(report.price)
                  : subscriptionPriceText(report)}
            </dd>
          </div>
          <div className="stack-report-figure">
            <dt>Recorded calls</dt>
            <dd>
              {facts ? (
                <>
                  {facts.calls.toLocaleString("en-US")}
                  <span className="stack-report-share">{shareText(activity?.share ?? 0)}</span>
                  <span className="stack-share-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, (activity?.share ?? 0) * 100)}%` }} />
                  </span>
                </>
              ) : (
                <span className="stack-muted-value">Not visible</span>
              )}
            </dd>
          </div>
          <div className="stack-report-figure">
            <dt>
              {facts?.value || !facts?.pricedValue ? "API-equivalent" : "API-equivalent, priced"}
            </dt>
            <dd>
              {value ? (
                rangeText(value)
              ) : (
                <span className="stack-muted-value">
                  {facts ? (facts.calls ? "Not priced" : "$0") : "—"}
                </span>
              )}
            </dd>
          </div>
          <div className="stack-report-figure">
            <dt>Leverage</dt>
            <dd className={report.leverage ? "stack-accent-value" : undefined}>
              {report.leverage ? (
                <>
                  {leverageText(report.leverage)}
                  <span className="stack-report-leverage-note">
                    <EvidenceWord level={report.leverage.level} />
                    {report.leverage.excludedCalls > 0 ? " · listed models only" : ""}
                  </span>
                </>
              ) : (
                <span className="stack-muted-value">—</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
      <div className="stack-report-actions">
        <div>
          {onTest && tier && report.visibility === "visible" ? (
            <button
              type="button"
              className="stack-link"
              onClick={(event) =>
                onTest(
                  currentStack.map((key) => (key === report.key ? tier.key : key)),
                  event.currentTarget,
                )
              }
            >
              Test {tier.name} →
            </button>
          ) : null}
          {onTest ? (
            <button
              type="button"
              className="stack-link"
              onClick={(event) =>
                onTest(
                  currentStack.filter((key) => key !== report.key),
                  event.currentTarget,
                )
              }
            >
              Test removing it →
            </button>
          ) : null}
        </div>
        <div>
          {onEdit ? (
            <button
              type="button"
              disabled={disabled}
              onClick={(event) => onEdit(event.currentTarget)}
              aria-label={`Edit ${report.name}`}
              className="stack-quiet-action"
            >
              Edit plan
            </button>
          ) : (
            <Link
              href="/app/settings#manual-plans"
              aria-label={`Edit ${report.name}`}
              className="stack-quiet-action"
            >
              Edit plan
            </Link>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            aria-label={`Remove ${report.name}`}
            className="stack-quiet-action"
          >
            Remove
          </button>
        </div>
      </div>
      <details className="stack-report-details" data-testid={`report-details-${report.id}`}>
        <summary>Evidence, models and published terms</summary>
        <div className="stack-report-details-body">
          <EvidenceList items={report.evidence} />
          {report.leverage ? (
            <p className="stack-caption">
              Leverage: {rangeText(report.leverage.value)} API-equivalent ÷{" "}
              {rangeText({ low: report.leverage.price, high: report.leverage.price })}{" "}
              {report.leverage.priceBasis === "paid"
                ? "paid for this period"
                : "published monthly price"}
              {report.sharedWith.length
                ? ` of ${[report.name, ...report.sharedWith].join(" + ")}`
                : ""}
              . {report.leverage.note} Not money saved.
            </p>
          ) : report.leverageNote ? (
            <p className="stack-caption">Leverage: {report.leverageNote}</p>
          ) : null}
          {activity && activity.models.length > 0 ? (
            <table className="stack-model-table">
              <caption className="sr-only">Recorded models associated with {report.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Recorded model</th>
                  <th scope="col">Calls</th>
                  <th scope="col">In {report.name}'s published lineup</th>
                </tr>
              </thead>
              <tbody>
                {activity.models.map((model) => (
                  <tr key={model.id}>
                    <th scope="row">{model.name}</th>
                    <td>{model.calls.toLocaleString("en-US")}</td>
                    <td>{model.listed ? "Listed" : "Not listed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {facts && facts.unresolvedCalls > 0 ? (
            <p className="stack-caption">
              {facts.unresolvedCalls.toLocaleString("en-US")} calls have unresolved model
              identities. They are counted as recorded calls but never priced or matched to a
              lineup.
            </p>
          ) : null}
          {report.allowance ? (
            <p className="stack-caption">Published allowance: {report.allowance}.</p>
          ) : null}
          {report.otherApps ? (
            <p className="stack-caption">Other apps: {report.otherApps}</p>
          ) : null}
          {target.access ? (
            <PublishedAccess
              access={target.access}
              planName={report.name}
              testId={`published-access-${report.id}`}
            />
          ) : null}
          {report.available ? (
            <Link href={`/plans/${encodeURIComponent(report.id)}`} className="stack-link">
              View published plan facts →
            </Link>
          ) : null}
        </div>
      </details>
    </article>
  );
}

/** An API target: billed by usage, outside subscription totals. */
export function ApiTargetRow({
  target,
  disabled,
  onRemove,
}: {
  target: Target;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <article className="stack-report stack-report-api" data-testid={`stack-target-${target.id}`}>
      <div className="stack-report-name">
        <h3>{target.name}</h3>
        <p className="stack-caption">
          {target.available
            ? "API target · Billed by usage · not part of subscription totals"
            : "Current catalog facts unavailable"}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Remove ${target.name}`}
        className="stack-quiet-action"
      >
        Remove
      </button>
    </article>
  );
}
