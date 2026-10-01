"use client";

import {
  eventsInCategory,
  groupByDay,
  MARKET_EVENT_CATEGORY_LABELS,
  type MarketEventCategory,
} from "@stackreplay/market-events/feed";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMarketRelations } from "@/components/home/market-briefing";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import type { MarketEventView } from "@/lib/market/events";

type Filter = MarketEventCategory | "all";
const FILTERS: readonly Filter[] = ["all", "models", "benchmarks", "subscriptions", "pricing"];

const LONG_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const longDay = (day: string) => LONG_DAY.format(new Date(`${day}T00:00:00Z`));

function readFilter(): Filter {
  if (typeof window === "undefined") return "all";
  const value = new URLSearchParams(window.location.search).get("type");
  return FILTERS.includes(value as Filter) ? (value as Filter) : "all";
}

/**
 * The full Updates feed: every accepted event, grouped by the day it occurred,
 * newest first, filterable by kind. Filters are real buttons that keep the
 * choice in the URL; the list is a server-rendered whole before hydration.
 */
export function UpdatesFeed({
  events,
  index,
}: {
  events: readonly MarketEventView[];
  index: HomeCatalogIndex;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => {
    setFilter(readFilter());
    const pop = () => setFilter(readFilter());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((entry) => [entry, eventsInCategory(events, entry).length]),
      ) as Record<Filter, number>,
    [events],
  );
  const days = useMemo(() => groupByDay(eventsInCategory(events, filter)), [events, filter]);
  const { relations } = useMarketRelations(events, index);
  const choose = (next: Filter) => {
    setFilter(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", next);
    window.history.pushState(null, "", url);
  };
  return (
    <section className="updates" aria-label="AI updates" data-testid="updates-feed">
      <fieldset className="updates-filters">
        <legend className="sr-only">Filter updates</legend>
        {FILTERS.map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={filter === entry}
            onClick={() => choose(entry)}
            data-testid={`updates-filter-${entry}`}
          >
            {MARKET_EVENT_CATEGORY_LABELS[entry]}
            <span className="updates-filter-count">{counts[entry]}</span>
          </button>
        ))}
      </fieldset>
      {days.length === 0 ? (
        <p className="market-muted py-8">No accepted updates in this category yet.</p>
      ) : (
        <ol className="updates-days">
          {days.map((group) => (
            <li key={group.day} className="updates-day" data-day={group.day}>
              <h2 className="updates-day-label">
                <time dateTime={group.day}>{longDay(group.day)}</time>
              </h2>
              <ol className="updates-events">
                {group.events.map((event) => {
                  const relation = relations.get(event.id);
                  return (
                    <li
                      key={event.id}
                      id={event.id}
                      className="updates-event"
                      data-testid="updates-event"
                      data-type={event.type}
                      data-importance={event.importance}
                    >
                      <p className="updates-event-kicker">
                        <span>{event.providerName}</span>
                        <span>{event.typeLabel}</span>
                        {event.status === "announced" ? <span>Not yet available</span> : null}
                        {event.effectiveAt && event.effectiveAt !== event.day ? (
                          <span>Effective {longDay(event.effectiveAt)}</span>
                        ) : null}
                        {event.importance === "major" ? (
                          <span className="updates-major">Major</span>
                        ) : null}
                      </p>
                      <h3 className="updates-event-title">
                        {event.title}
                        {relation ? (
                          <span
                            className="home-mark"
                            data-testid="personal-mark"
                            data-relation={relation.kind}
                            title={relation.detail}
                          >
                            <span aria-hidden="true" className="home-mark-dot" />
                            {relation.label}
                          </span>
                        ) : null}
                      </h3>
                      <p className="updates-event-summary">{event.summary}</p>
                      {event.facts.length > 0 ? (
                        <ul className="updates-event-facts">
                          {event.facts.map((fact) => (
                            <li key={fact}>{fact}</li>
                          ))}
                        </ul>
                      ) : null}
                      {relation ? (
                        <p className="updates-event-relation">{relation.detail}</p>
                      ) : null}
                      <p className="updates-event-links">
                        {event.links.map((link) => (
                          <Link
                            key={`${link.kind}:${link.id}`}
                            href={link.href}
                            className="market-link"
                          >
                            {link.label}
                          </Link>
                        ))}
                        <a
                          href={event.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="market-link updates-source"
                          data-testid="updates-source"
                        >
                          {event.source.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      </p>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
