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
import type { MarketEventView } from "@/lib/market/events";

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

function RelationMark({ relation }: { relation: MarketRelation | undefined }) {
  if (relation === undefined) return null;
  return (
    <span
      className="home-mark"
      data-testid="personal-mark"
      data-relation={relation.kind}
      title={relation.detail}
    >
      <span aria-hidden="true" className="home-mark-dot" />
      {relation.label}
    </span>
  );
}

/**
 * The live AI market briefing: the newest major and notable events from the
 * canonical feed, newest first by when they happened. Prefers the last seven
 * days, widens toward thirty only when needed, never shows anything older,
 * and shows fewer rows rather than filler.
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
  const related = shown.filter((event) => relations.has(event.id)).length;
  return (
    <section
      id="market-pulse"
      aria-labelledby="market-pulse-heading"
      className="dark home-panel home-briefing"
      data-testid="market-pulse"
      data-today={today}
    >
      <header className="home-panel-head">
        <h2 id="market-pulse-heading" className="home-micro text-foreground">
          <span aria-hidden="true" className="home-panel-mark" />
          AI market · <time dateTime={today}>{shortDay(today)}</time>
        </h2>
        <p className="home-micro" data-testid="market-pulse-updated">
          {shown.length} {shown.length === 1 ? "change" : "changes"} ·{" "}
          {related > 0 ? (
            <a href="#market-relevance" className="home-briefing-related">
              {related} {related === 1 ? "relates" : "relate"} to you
            </a>
          ) : shown.length > 0 && daysBetween(shown.at(-1)?.day ?? today, today) <= 7 ? (
            "last 7 days"
          ) : (
            "last 30 days"
          )}
        </p>
      </header>
      {shown.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground" data-testid="market-pulse-empty">
          No material model, pricing or subscription change in the last 30 days.
        </p>
      ) : (
        <ol className="home-pulse-list">
          {shown.map((event) => (
            <li
              key={event.id}
              className="home-pulse-item"
              data-testid="market-pulse-item"
              data-pulse-id={event.id}
              data-day={event.day}
              data-type={event.type}
              data-importance={event.importance}
            >
              <p className="home-pulse-when">
                <time dateTime={event.occurredAt} className="home-pulse-day">
                  {relativeDay(event.day, today)}
                </time>
              </p>
              <div className="min-w-0">
                <p className="home-pulse-kicker">
                  {event.providerName} · {event.typeLabel}
                </p>
                <h3 className="home-pulse-subject">
                  <Link href={event.href} className="home-subject-link">
                    {event.title}
                  </Link>
                  <RelationMark relation={relations.get(event.id)} />
                </h3>
                <p className="home-pulse-change">{event.summary}</p>
                {event.facts.length > 0 ? (
                  <p className="home-pulse-facts">{event.facts.slice(0, 2).join(" · ")}</p>
                ) : null}
                <p className="home-pulse-meta">
                  <a
                    href={event.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="home-source-link"
                    title={event.source.title}
                    aria-label={`Source, ${event.source.title} (opens in a new tab)`}
                  >
                    Source<span aria-hidden="true"> ↗</span>
                  </a>
                  <Link href={`/changelog#${event.id}`} className="home-source-link">
                    Details<span className="sr-only"> for {event.title}</span>
                  </Link>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <footer className="home-panel-foot">
        <Link href="/changelog" className="home-inline-link">
          View all AI updates <span aria-hidden="true">→</span>
        </Link>
      </footer>
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
 * The last seven days at a glance, beside the hero copy: how many accepted
 * events of each kind, from which developers, and (with a saved workload) how
 * many relate to it. Counts every accepted event, minor ones included, once
 * each under its primary category. Ages on the reader's clock like the briefing.
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
  if (week.length === 0) return null;
  const counts = WEEK_CATEGORIES.map((category) => ({
    category,
    count: week.filter((event) => marketEventCategory(event.type) === category).length,
  })).filter((entry) => entry.count > 0);
  const developers = [...new Set(week.map((event) => event.providerName))];
  const related = week.filter((event) => relations.has(event.id)).length;
  return (
    <section className="home-week" aria-labelledby="home-week-heading" data-testid="market-week">
      <h2 id="home-week-heading" className="home-micro">
        Last 7 days
      </h2>
      <dl className="home-week-counts">
        <div>
          <dt>Market changes</dt>
          <dd>{week.length}</dd>
        </div>
        {counts.map((entry) => (
          <div key={entry.category} data-category={entry.category}>
            <dt>{MARKET_EVENT_CATEGORY_LABELS[entry.category]}</dt>
            <dd>{entry.count}</dd>
          </div>
        ))}
      </dl>
      <p className="home-week-note">
        From {developers.join(", ")}.{" "}
        {related > 0 ? (
          <a
            href="#market-relevance"
            className="home-inline-link"
            data-testid="market-week-related"
          >
            {related} {related === 1 ? "relates" : "relate"} to your workload or stack
          </a>
        ) : (
          <Link href="/changelog" className="home-inline-link">
            All AI updates
          </Link>
        )}
      </p>
    </section>
  );
}

const RELEVANCE_ROWS = 6;

/**
 * The bridge into personal intelligence: how many recent market changes relate
 * to the stored workload or stack, by canonical identity. Renders nothing
 * until a saved non-demo workload or a Current Stack exists.
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
  const today = useReaderDay(builtOn);
  const recent = useMemo(
    () =>
      events.filter((event) => {
        const age = daysBetween(event.day, today);
        return age >= 0 && age <= 30;
      }),
    [events, today],
  );
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
      <h2 id="market-relevance-heading" className="home-relevance-title">
        {related.length === 0
          ? "None of the last 30 days' market changes involve a model you used or a plan in your stack."
          : `${related.length} recent market ${related.length === 1 ? "change relates" : "changes relate"} to your workload or stack`}
      </h2>
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
