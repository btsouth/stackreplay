"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import type { WatchPlan } from "@/lib/home/subscription-watch";
import type { MarketEventView } from "@/lib/market/events";
import { RelationMark, relativeDay, useMarketRelations, useReaderDay } from "./market-briefing";
import { PlanLineupNote } from "./personal-marks";

const WATCH_ROWS = 3;

/**
 * The newest change per plan: a later event about the same plans supersedes
 * an earlier one (Pro 200 reopening replaces Pro 200 pausing).
 */
function newestPerPlan(events: readonly MarketEventView[]): MarketEventView[] {
  const seen = new Set<string>();
  const kept: MarketEventView[] = [];
  for (const event of events) {
    if (event.planIds.length === 0 || event.planIds.every((id) => seen.has(id))) continue;
    for (const id of event.planIds) seen.add(id);
    kept.push(event);
  }
  return kept;
}

/**
 * Subscription watch: what changed in AI subscriptions over the last thirty
 * days, from the canonical market feed, with each plan's published price and
 * allowance from the catalog. Newest first; fewer rows rather than filler.
 */
export function SubscriptionWatch({
  events,
  plans,
  builtOn,
  index,
}: {
  /** Subscription events no older than thirty days on the build day, newest first. */
  events: readonly MarketEventView[];
  plans: Readonly<Record<string, WatchPlan>>;
  builtOn: string;
  index: HomeCatalogIndex;
}) {
  const today = useReaderDay(builtOn);
  const shown = useMemo(
    () =>
      newestPerPlan(
        events.filter((event) => {
          const age = Math.round(
            (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${event.day}T00:00:00Z`)) / 86_400_000,
          );
          return age >= 0 && age <= 30;
        }),
      ).slice(0, WATCH_ROWS),
    [events, today],
  );
  const { relations } = useMarketRelations(shown, index);
  return (
    <section
      id="subscriptions"
      aria-labelledby="subscriptions-heading"
      className="home-section home-watch"
      data-testid="home-subscriptions"
    >
      <header className="home-section-head">
        <div>
          <p className="home-kicker">Subscription watch</p>
          <h2 id="subscriptions-heading" className="home-h2">
            What changed in AI subscriptions
          </h2>
          <p className="home-lede">
            New plans, price changes and allowance changes from the providers&rsquo; own
            announcements, with each plan&rsquo;s published price and, where one plan is named, its
            published terms.
          </p>
        </div>
        <nav className="home-cta-group" aria-label="More on plans">
          <Link href="/compare" className="home-cta-link">
            Compare plans <span aria-hidden="true">→</span>
          </Link>
          <Link href="/plans" className="home-cta-link">
            All plans <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </header>
      {shown.length === 0 ? (
        <p className="home-watch-empty" data-testid="subscription-watch-empty">
          No subscription changes in the last 30 days.{" "}
          <Link href="/plans" className="home-inline-link">
            Browse every plan
          </Link>
        </p>
      ) : (
        <ol className="home-watch-list">
          {shown.map((event) => {
            const named = event.planIds.flatMap((id) => {
              const plan = plans[id];
              return plan === undefined ? [] : [plan];
            });
            const [single] = named;
            const relation = relations.get(event.id);
            return (
              <li
                key={event.id}
                className="home-watch-item"
                data-testid="subscription-watch-item"
                data-event-id={event.id}
                data-type={event.type}
              >
                <div className="home-watch-head">
                  <p className="home-watch-when">
                    <time dateTime={event.occurredAt}>{relativeDay(event.day, today)}</time>
                    <span>
                      {event.providerName} · {event.typeLabel}
                    </span>
                  </p>
                  <h3 className="home-watch-title">
                    <Link href={`/changelog#${event.id}`} className="home-subject-link">
                      {event.title}
                    </Link>
                  </h3>
                </div>
                <div className="home-watch-body">
                  {named.length === 1 && single !== undefined ? (
                    <p className="home-watch-price">
                      <span className="home-watch-price-value">{single.price}</span>
                      <span className="home-watch-price-label">{single.name}, published price</span>
                    </p>
                  ) : (
                    <ul className="home-watch-plans" aria-label="Plans affected">
                      {named.map((plan) => (
                        <li key={plan.id}>
                          <Link href={plan.href} className="home-subject-link">
                            {plan.name}
                          </Link>
                          <span className="home-watch-plans-price">{plan.price}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="home-watch-summary">{event.summary}</p>
                  <div className="home-watch-terms-slot">
                    {named.length === 1 && single !== undefined ? (
                      <p className="home-watch-terms">
                        <span className="home-watch-terms-label">Published terms</span>{" "}
                        {single.usage}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="home-watch-foot">
                  <RelationMark relation={relation} />
                  {named.length === 1 && single !== undefined ? (
                    <PlanLineupNote includedModelIds={single.includedModelIds} />
                  ) : null}
                  <p className="home-watch-links">
                    {named.length === 1 && single !== undefined ? (
                      <Link href={single.href} className="home-inline-link">
                        Plan details<span className="sr-only"> for {single.name}</span>{" "}
                        <span aria-hidden="true">→</span>
                      </Link>
                    ) : null}
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
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
