"use client";

import { groupByDay, MARKET_EVENT_CATEGORY_LABELS } from "@stackreplay/market-events/feed";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useMarketRelations } from "@/components/home/market-briefing";
import type { HomeCatalogIndex } from "@/lib/home/personal";
import type { MarketEventView } from "@/lib/market/events";

import {
  marketEventHref,
  parseUpdateSelection,
  sameUpdateSelection,
  selectUpdates,
  UPDATE_CATEGORIES,
  type UpdateCategory,
  type UpdateProvider,
  type UpdateSelection,
  updateListHref,
  updateProviderOptions,
} from "@/lib/market/update-selection";

const LONG_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const longDay = (day: string) => LONG_DAY.format(new Date(`${day}T00:00:00Z`));

/** Router data selects before paint; committed browser URLs reconcile restored trees. */
export function UpdatesFeed({
  events,
  index,
  providers,
  initialSelection,
}: {
  events: readonly MarketEventView[];
  index: HomeCatalogIndex;
  providers: readonly UpdateProvider[];
  initialSelection: UpdateSelection;
}) {
  const router = useRouter();
  const routedSearch = useSearchParams().toString();
  const [selection, setSelection] = useState(initialSelection);
  useLayoutEffect(() => {
    setSelection(parseUpdateSelection(new URLSearchParams(routedSearch), providers));
  }, [routedSearch, providers]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Router search changes trigger reconciliation against the committed browser URL.
  useEffect(() => {
    if (window.location.pathname !== "/changelog") return;
    const committed = parseUpdateSelection(new URLSearchParams(window.location.search), providers);
    setSelection((current) => (sameUpdateSelection(current, committed) ? current : committed));
    const next = updateListHref(committed, window.location.search, window.location.hash);
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
      router.replace(next, { scroll: false });
  }, [routedSearch, providers, router]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        UPDATE_CATEGORIES.map((category) => [
          category,
          selectUpdates(events, { ...selection, category }).length,
        ]),
      ) as Record<UpdateCategory, number>,
    [events, selection],
  );
  const days = useMemo(() => groupByDay(selectUpdates(events, selection)), [events, selection]);
  const options = updateProviderOptions(events, providers, selection);
  const { relations } = useMarketRelations(events, index);
  const choose = (next: UpdateSelection) => {
    if (sameUpdateSelection(selection, next)) return;
    setSelection(next);
    router.push(updateListHref(next, window.location.search, window.location.hash), {
      scroll: false,
    });
  };
  const clear = () => choose({ providerId: null, category: "all", providerRecognized: true });
  return (
    <section className="updates" aria-label="AI updates" data-testid="updates-feed">
      <label className="mb-4 flex max-w-sm flex-col gap-2 text-sm">
        Provider
        <select
          className="min-h-11 min-w-0 rounded border border-border bg-background px-3"
          value={selection.providerId ?? "all"}
          onChange={(event) =>
            choose({
              ...selection,
              providerId: event.target.value === "all" ? null : event.target.value,
              providerRecognized: true,
            })
          }
        >
          <option value="all">All providers</option>
          {!selection.providerRecognized && (
            <option value={selection.providerId ?? ""}>Provider not recognized</option>
          )}
          {options.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="updates-filters">
        <legend className="sr-only">Filter updates</legend>
        {UPDATE_CATEGORIES.map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={selection.category === entry}
            onClick={() => choose({ ...selection, category: entry })}
            data-testid={`updates-filter-${entry}`}
          >
            {MARKET_EVENT_CATEGORY_LABELS[entry]}
            <span className="updates-filter-count">{counts[entry]}</span>
          </button>
        ))}
      </fieldset>
      {days.length === 0 ? (
        <div className="market-muted py-8" role="status">
          <p>
            {selection.providerRecognized
              ? "No accepted updates match these filters."
              : "Provider not recognized."}
          </p>
          <button type="button" className="market-link mt-3 min-h-11" onClick={clear}>
            Clear filters
          </button>
        </div>
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
                        <Link href={marketEventHref(event.id)} className="hover:text-accent">
                          {event.title}
                        </Link>
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
                        <div>
                          <p className="market-muted mt-3">Current catalog context</p>
                          <p className="market-muted">
                            These facts are resolved from current catalog and benchmark evidence;
                            they are not a snapshot at the event date.
                          </p>
                          <ul className="updates-event-facts">
                            {event.facts.map((fact) => (
                              <li key={fact}>{fact}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {relation ? (
                        <p className="updates-event-relation">{relation.detail}</p>
                      ) : null}
                      <p className="updates-event-links">
                        <Link href={marketEventHref(event.id)} className="market-link">
                          Event details and sources
                        </Link>
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
