"use client";

import type { PlanEvidenceAuthorityV1 } from "@stackreplay/catalog";
import { type PlanTimelineInputV1, resolvePlanTimeline } from "@stackreplay/catalog/timeline";
import { useEffect, useId, useMemo, useState } from "react";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { planHistorySteps, planTermsNotice } from "@/lib/plan-terms";
import { defaultRulesDate } from "@/lib/rules-date";

/**
 * A plan's terms notice and history timeline, for any provider's plan.
 *
 * Both read `resolvePlanTimeline` for one day. A surface with its own rules
 * date (Replay) pins that day. A public page passes the day it was rendered and
 * `followToday`, and after hydration the viewer's calendar day (the same
 * default Replay uses) takes over: an announced change becomes current on its
 * date even on a page built before it, and the first client render still
 * matches the server's, so hydration never disagrees.
 */
function usePlanDay(asOf: string, followToday: boolean): string {
  const [day, setDay] = useState(asOf);
  useEffect(() => {
    setDay(followToday ? defaultRulesDate() : asOf);
  }, [asOf, followToday]);
  return day;
}

interface PlanHistoryInput {
  plan: PlanTimelineInputV1;
  /** The day the server resolved, or the surface's own rules date. */
  asOf: string;
  followToday?: boolean;
}

export function PlanTermsNotice({
  plan,
  asOf,
  followToday = false,
  historyHref,
  planName,
  providerName,
  variant = "full",
}: PlanHistoryInput & {
  historyHref?: string;
  planName?: string;
  providerName?: string;
  /**
   * `full` for the plan page; `summary` for Compare (headline and the cohort
   * exception, no detail); `line` for lists (the headline alone, linked).
   */
  variant?: "full" | "summary" | "line";
}) {
  const day = usePlanDay(asOf, followToday);
  const notice = useMemo(
    () =>
      planTermsNotice(resolvePlanTimeline(plan, day), {
        ...(planName !== undefined ? { planName } : {}),
        ...(providerName !== undefined ? { providerName } : {}),
      }),
    [plan, day, planName, providerName],
  );
  if (notice === undefined) return null;
  if (variant === "line")
    return (
      <p className="plan-terms-compact" data-state={notice.state} data-testid="plan-terms-notice">
        {historyHref === undefined ? (
          notice.headline
        ) : (
          <a href={historyHref}>
            {notice.headline} <span aria-hidden="true">→</span>
          </a>
        )}
      </p>
    );
  return (
    <div
      className="plan-terms-notice"
      data-state={notice.state}
      data-testid="plan-terms-notice"
      data-variant={variant}
    >
      <p className="plan-terms-notice-headline">{notice.headline}</p>
      {variant === "full" && notice.detail !== undefined && (
        <p className="plan-terms-notice-detail">{notice.detail}</p>
      )}
      {notice.exception !== undefined && (
        <p className="plan-terms-notice-exception" data-testid="plan-terms-exception">
          <span className="plan-terms-notice-lead">{notice.exception.lead}</span>{" "}
          {notice.exception.text}
        </p>
      )}
      {historyHref !== undefined && (
        <a className="market-link" href={historyHref}>
          View plan history <span aria-hidden="true">{variant === "full" ? "↓" : "→"}</span>
        </a>
      )}
    </div>
  );
}

const AUTHORITY: Record<PlanEvidenceAuthorityV1, string> = {
  provider_docs: "Provider documentation",
  provider_announcement: "Provider announcement",
  provider_keynote: "Provider keynote",
  provider_help_center: "Provider help center",
  provider_staff: "Provider staff post",
};

export function PlanHistory({
  plan,
  asOf,
  followToday = false,
  id,
  title = "Plan history",
  titleAs: Title = "h2",
  layout = "auto",
}: PlanHistoryInput & {
  id?: string;
  title?: string;
  titleAs?: "h2" | "h3";
  /** `stacked` keeps the vertical rail at every width, for narrow panels. */
  layout?: "auto" | "stacked";
}) {
  const headingId = useId();
  const day = usePlanDay(asOf, followToday);
  const steps = useMemo(() => planHistorySteps(resolvePlanTimeline(plan, day)), [plan, day]);
  if (steps.length === 0) return null;
  return (
    <section
      aria-labelledby={headingId}
      className="plan-history scroll-mt-24"
      data-layout={layout}
      data-testid="plan-history"
      id={id}
    >
      <Title className="market-section-title" id={headingId}>
        <span>{title}</span>
        <span className="market-muted normal-case tracking-normal">
          As of {formatCatalogDate(day)}
        </span>
      </Title>
      <ol className="plan-timeline">
        {steps.map((step) => {
          const evidence = [
            ...new Map(
              step.lines
                .flatMap((line) => line.evidence)
                .map((source) => [`${source.url}|${source.excerpt ?? ""}`, source]),
            ).values(),
          ];
          const HeadingTag = Title === "h2" ? "h3" : "h4";
          return (
            <li
              aria-current={step.state === "current" ? "step" : undefined}
              className="plan-timeline-step"
              data-state={step.state}
              data-testid="plan-timeline-step"
              key={step.key}
            >
              <p className="plan-timeline-when">
                {step.date !== undefined ? (
                  <time dateTime={step.date}>{step.dateLabel}</time>
                ) : (
                  <span>{step.dateLabel}</span>
                )}
                <span className="plan-timeline-state">{step.stateLabel}</span>
              </p>
              {step.lines.map((line) => (
                <div className="plan-timeline-line" key={line.key}>
                  <HeadingTag>{line.title}</HeadingTag>
                  {line.details.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                  {line.audience !== undefined && (
                    <p className="plan-timeline-audience">{line.audience}</p>
                  )}
                </div>
              ))}
              {step.audience !== undefined && (
                <p className="plan-timeline-audience">{step.audience}</p>
              )}
              {step.note !== undefined && (
                <p className="plan-timeline-note" data-testid="plan-timeline-note">
                  <span className="plan-timeline-note-label">{step.note.label}</span>
                  {step.note.text}
                </p>
              )}
              {evidence.length > 0 && (
                <details className="plan-timeline-evidence">
                  <summary>
                    {evidence.length === 1 ? "Source" : `Sources (${evidence.length})`}
                  </summary>
                  <ul>
                    {evidence.map((source) => (
                      <li key={`${source.url}|${source.excerpt ?? ""}`}>
                        {source.excerpt !== undefined && <q>{source.excerpt}</q>}
                        <a href={source.url} rel="noopener noreferrer" target="_blank">
                          {source.title}
                        </a>
                        <span className="market-muted">
                          {" "}
                          · {AUTHORITY[source.authority]} · checked{" "}
                          {formatCatalogDate(source.checkedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
