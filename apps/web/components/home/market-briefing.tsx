"use client";

import {
  daysBetween,
  homepageBriefing,
  MARKET_EVENT_CATEGORY_LABELS,
  type MarketEventCategory,
  marketEventCategory,
} from "@stackreplay/market-events/feed";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  canonicalUsage,
  type HomeCatalogIndex,
  type MarketRelation,
  marketRelation,
} from "@/lib/home/personal";
import { useLocalWorkload } from "@/lib/local-workload";
import type { MarketEventHighlight, MarketEventView } from "@/lib/market/events";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 30" from an ISO day, without the reader's time zone moving it. */
export function shortDay(day: string): string {
  const [, month = "1", date = "1"] = day.split("-");
  return `${MONTHS[Number(month) - 1] ?? ""} ${Number(date)}`;
}

/** The reader's own calendar day, never earlier than the day the page was built. */
export function useReaderDay(builtOn: string): string {
  const [day, setDay] = useState(builtOn);
  useEffect(() => {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    setDay(local < builtOn ? builtOn : local);
  }, [builtOn]);
  return day;
}

export function relativeDay(day: string, today: string): string {
  const age = daysBetween(day, today);
  return age === 0 ? "Today" : age === 1 ? "Yesterday" : shortDay(day);
}

/** Every accepted event no older than thirty days on the reader's own day. */
export function useRecentEvents(
  events: readonly MarketEventView[],
  builtOn: string,
): readonly MarketEventView[] {
  const today = useReaderDay(builtOn);
  return useMemo(
    () =>
      events.filter((event) => {
        const age = daysBetween(event.day, today);
        return age >= 0 && age <= 30;
      }),
    [events, today],
  );
}

/** Canonical relations between the stored workload or stack and these events. */
export function useMarketRelations(
  events: readonly MarketEventView[],
  index: HomeCatalogIndex,
): { ready: boolean; relations: ReadonlyMap<string, MarketRelation> } {
  const local = useLocalWorkload();
  const record = local.personal.status === "ready" ? local.personal.record : undefined;
  return useMemo(() => {
    const usage = record === undefined ? undefined : canonicalUsage(record.summary);
    const relations = new Map<string, MarketRelation>();
    if (record !== undefined || local.stack.length > 0)
      for (const event of events) {
        const relation = marketRelation(event, local.stack, usage, index);
        if (relation !== undefined) relations.set(event.id, relation);
      }
    return { ready: record !== undefined, relations };
  }, [events, index, record, local.stack]);
}

/** "In your stack", "Used by you", "Relevant to you": a word and a dot, never color alone. */
export function RelationMark({
  relation,
  size = "sm",
}: {
  relation: MarketRelation | undefined;
  size?: "sm" | "lg";
}) {
  if (relation === undefined) return null;
  return (
    <span
      className="home-mark"
      data-size={size}
      data-testid="personal-mark"
      data-relation={relation.kind}
      title={relation.detail}
    >
      <span aria-hidden="true" className="home-mark-dot" />
      {relation.label}
    </span>
  );
}

/** Only states the event type does not already say ("Model announced" covers announced). */
const STATUS_WORD: Partial<Record<MarketEventView["status"], string>> = {
  scheduled: "Scheduled",
  paused: "Paused for new subscribers",
  retired: "Retired",
};

function SourceLink({ event, className }: { event: MarketEventView; className: string }) {
  return (
    <a
      href={event.source.url}
      target="_blank"
      rel="noreferrer"
      className={className}
      title={event.source.title}
      aria-label={`Source, ${event.source.title} (opens in a new tab)`}
    >
      Source<span aria-hidden="true"> ↗</span>
    </a>
  );
}

/** The newest event, set as the page's main story. */
function LeadStory({
  event,
  today,
  relation,
}: {
  event: MarketEventView;
  today: string;
  relation: MarketRelation | undefined;
}) {
  const status = STATUS_WORD[event.status];
  const model = event.links.find((link) => link.kind === "model");
  const plan = event.links.find((link) => link.kind === "plan");
  return (
    <article
      className="home-lead"
      aria-labelledby="home-lead-title"
      data-testid="market-pulse-item"
      data-lead=""
      data-pulse-id={event.id}
      data-day={event.day}
      data-type={event.type}
      data-importance={event.importance}
    >
      <p className="home-lead-kicker">
        <time dateTime={event.occurredAt} className="home-lead-day">
          {relativeDay(event.day, today)}
        </time>
        <span className="home-lead-provider">{event.providerName}</span>
        <span>{event.typeLabel}</span>
      </p>
      <h3 id="home-lead-title" className="home-lead-title">
        <Link href={event.href} className="home-subject-link">
          {event.title}
        </Link>
      </h3>
      {relation === undefined ? null : (
        <p className="home-lead-relation" data-testid="lead-relation">
          <RelationMark relation={relation} size="lg" />
          <span>{relation.detail}</span>
        </p>
      )}
      <p className="home-lead-summary">{event.summary}</p>
      {event.highlights.length > 0 ? (
        <dl className="home-lead-figures" data-testid="lead-figures">
          {event.highlights.slice(0, 3).map((highlight) => (
            <div key={highlight.kind} className="home-lead-figure" data-kind={highlight.kind}>
              <dt>{highlight.label}</dt>
              <dd>{highlight.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="home-lead-foot">
        {status === undefined ? null : <p className="home-lead-status">{status}</p>}
        <p className="home-lead-actions">
          {event.benchmarksHref === undefined ? null : (
            <Link
              href={event.benchmarksHref}
              className="home-lead-action"
              aria-label={`Benchmarks, ${event.title}`}
            >
              Benchmarks <span aria-hidden="true">→</span>
            </Link>
          )}
          {model === undefined ? null : (
            <Link
              href={model.href}
              className="home-lead-action"
              aria-label={`Model details, ${model.label}`}
            >
              Model details <span aria-hidden="true">→</span>
            </Link>
          )}
          {plan === undefined ? null : (
            <Link
              href={plan.href}
              className="home-lead-action"
              aria-label={`Plan details, ${plan.label}`}
            >
              Plan details <span aria-hidden="true">→</span>
            </Link>
          )}
          <SourceLink event={event} className="home-lead-action home-lead-source" />
        </p>
      </div>
    </article>
  );
}

const ROW_FIGURE_ORDER: readonly MarketEventHighlight["kind"][] = [
  "plan-price",
  "price",
  "benchmark",
  "api",
  "benchmark-count",
];

/** The one figure a compact row leads with: a plan price, a list price or a score. */
function rowFigure(event: MarketEventView): MarketEventHighlight | undefined {
  for (const kind of ROW_FIGURE_ORDER) {
    const found = event.highlights.find((highlight) => highlight.kind === kind);
    if (found !== undefined) return found;
  }
  return undefined;
}

function SecondaryStory({
  event,
  today,
  relation,
}: {
  event: MarketEventView;
  today: string;
  relation: MarketRelation | undefined;
}) {
  const figure = rowFigure(event);
  return (
    <li
      className="home-brief"
      data-testid="market-pulse-item"
      data-pulse-id={event.id}
      data-day={event.day}
      data-type={event.type}
      data-importance={event.importance}
    >
      <time dateTime={event.occurredAt} className="home-brief-day">
        {relativeDay(event.day, today)}
      </time>
      <div className="home-brief-body">
        <h3 className="home-brief-title">
          <Link href={event.href} className="home-subject-link">
            {event.title}
          </Link>
        </h3>
        <p className="home-brief-meta">
          <span>
            {event.providerName} · {event.typeLabel}
          </span>
          <SourceLink event={event} className="home-source-link" />
          <RelationMark relation={relation} />
        </p>
      </div>
      {figure === undefined ? null : (
        <p className="home-brief-figure" data-kind={figure.kind}>
          <span className="home-brief-value">{figure.value}</span>
          <span className="home-brief-label">
            {figure.kind === "benchmark" ? figure.label : figure.short}
          </span>
        </p>
      )}
    </li>
  );
}

/**
 * The live AI market briefing: the newest major and notable events from the
 * canonical feed, newest first by when they happened. The newest is the lead
 * story; the next ones are compact rows. Prefers the last seven days, widens
 * toward thirty only when needed, never shows anything older, and shows fewer
 * rows rather than filler.
 */
export function MarketBriefing({
  events,
  builtOn,
  index,
  limit = 5,
}: {
  /** Major and notable candidates no older than thirty days on the build day. */
  events: readonly MarketEventView[];
  builtOn: string;
  index: HomeCatalogIndex;
  limit?: number;
}) {
  const today = useReaderDay(builtOn);
  const shown = useMemo(() => homepageBriefing(events, { today, limit }), [events, today, limit]);
  const { relations } = useMarketRelations(shown, index);
  const [lead, ...rest] = shown;
  return (
    <section
      id="market-pulse"
      aria-labelledby="market-pulse-heading"
      className="home-briefing"
      data-testid="market-pulse"
      data-today={today}
    >
      <h2 id="market-pulse-heading" className="sr-only">
        AI market, {shortDay(today)}
      </h2>
      {lead === undefined ? (
        <p className="home-briefing-empty" data-testid="market-pulse-empty">
          No material model, pricing or subscription change in the last 30 days.{" "}
          <Link href="/changelog" className="home-inline-link">
            View all AI updates
          </Link>
        </p>
      ) : (
        <div className="home-briefing-grid">
          <LeadStory event={lead} today={today} relation={relations.get(lead.id)} />
          <div className="home-briefs">
            {rest.length === 0 ? null : (
              <ol className="home-brief-list" aria-label="Also in the AI market">
                {rest.map((event) => (
                  <SecondaryStory
                    key={event.id}
                    event={event}
                    today={today}
                    relation={relations.get(event.id)}
                  />
                ))}
              </ol>
            )}
            <Link href="/changelog" className="home-briefs-more">
              View all AI updates <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

const WEEK_CATEGORIES: readonly MarketEventCategory[] = [
  "models",
  "subscriptions",
  "pricing",
  "benchmarks",
];

/**
 * The last seven days in one restrained line above the briefing: how many
 * accepted events of each kind, and (with a saved workload or stack) how many
 * relate to it. Counts every accepted event, minor ones included, once each
 * under its primary category. Ages on the reader's clock like the briefing.
 */
export function MarketWeek({
  events,
  builtOn,
  index,
}: {
  /** Every accepted event no older than thirty days on the build day. */
  events: readonly MarketEventView[];
  builtOn: string;
  index: HomeCatalogIndex;
}) {
  const today = useReaderDay(builtOn);
  const week = useMemo(
    () =>
      events.filter((event) => {
        const age = daysBetween(event.day, today);
        return age >= 0 && age <= 7;
      }),
    [events, today],
  );
  const { relations } = useMarketRelations(week, index);
  const counts = WEEK_CATEGORIES.map((category) => ({
    category,
    count: week.filter((event) => marketEventCategory(event.type) === category).length,
  })).filter((entry) => entry.count > 0);
  const related = week.filter((event) => relations.has(event.id)).length;
  return (
    <div className="home-pulse-line">
      <p className="home-pulse-line-head" data-testid="market-pulse-updated">
        <span aria-hidden="true" className="home-live-dot" />
        AI market · <time dateTime={today}>{shortDay(today)}</time>
      </p>
      {week.length === 0 ? (
        <p className="home-pulse-line-body">No material change in the last 7 days.</p>
      ) : (
        <section
          className="home-pulse-line-body"
          aria-labelledby="home-week-heading"
          data-testid="market-week"
        >
          <h2 id="home-week-heading" className="home-pulse-line-label">
            Last 7 days
          </h2>
          <dl className="home-week-counts">
            <div data-category="all">
              <dt>{week.length === 1 ? "change" : "changes"}</dt>
              <dd>{week.length}</dd>
            </div>
            {counts.map((entry) => (
              <div key={entry.category} data-category={entry.category}>
                <dt>{MARKET_EVENT_CATEGORY_LABELS[entry.category].toLowerCase()}</dt>
                <dd>{entry.count}</dd>
              </div>
            ))}
          </dl>
          {related > 0 ? (
            <a
              href="#for-you"
              className="home-pulse-line-related"
              data-testid="market-week-related"
            >
              <span aria-hidden="true" className="home-mark-dot" />
              {related} {related === 1 ? "relates" : "relate"} to you
            </a>
          ) : null}
        </section>
      )}
    </div>
  );
}

const RELEVANCE_ROWS = 6;

/**
 * The full list of recent market changes that relate to the stored workload
 * or stack, by canonical identity. Renders nothing until a saved non-demo
 * workload or a Current Stack exists.
 */
export function MarketRelevanceSummary({
  events,
  builtOn,
  index,
}: {
  /** Every accepted event no older than thirty days on the build day. */
  events: readonly MarketEventView[];
  builtOn: string;
  index: HomeCatalogIndex;
}) {
  const recent = useRecentEvents(events, builtOn);
  const local = useLocalWorkload();
  const { ready, relations } = useMarketRelations(recent, index);
  if (!ready && local.stack.length === 0) return null;
  const related = recent.filter((event) => relations.has(event.id));
  return (
    <section
      id="market-relevance"
      className="home-relevance"
      aria-labelledby="market-relevance-heading"
      data-testid="market-relevance"
      data-count={related.length}
    >
      <h3 id="market-relevance-heading" className="home-relevance-title">
        {related.length === 0
          ? ready
            ? "None of the last 30 days' market changes involve a model you used or a plan in your stack."
            : "None of the last 30 days' market changes involve a plan in your stack."
          : `${related.length} market ${related.length === 1 ? "change" : "changes"} in the last 30 days ${related.length === 1 ? "relates" : "relate"} to ${ready ? "your workload or stack" : "your stack"}`}
      </h3>
      {related.length > 0 ? (
        <ul className="home-relevance-list">
          {related.slice(0, RELEVANCE_ROWS).map((event) => {
            const relation = relations.get(event.id);
            return (
              <li key={event.id} data-testid="market-relevance-item" data-relation={relation?.kind}>
                <span className="home-relevance-day">{shortDay(event.day)}</span>
                <Link href={`/changelog#${event.id}`} className="home-subject-link">
                  {event.title}
                </Link>
                <span className="home-relevance-why">
                  <RelationMark relation={relation} />
                  <span>{relation?.detail}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {related.length > RELEVANCE_ROWS ? (
        <p className="home-relevance-more">
          <Link href="/changelog" className="home-inline-link">
            {related.length - RELEVANCE_ROWS} more on AI updates <span aria-hidden="true">→</span>
          </Link>
        </p>
      ) : null}
    </section>
  );
}
