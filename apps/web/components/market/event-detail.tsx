import { MARKET_EVENT_TYPE_LABELS, type MarketEvent } from "@stackreplay/market-events";
import Link from "next/link";
import type { MarketEventLink } from "@/lib/market/events";
import { updateListHref } from "@/lib/market/update-selection";

export function MarketEventDetail({
  event,
  providerName,
  links,
  benchmarksHref,
}: {
  event: MarketEvent;
  providerName: string;
  links: readonly MarketEventLink[];
  benchmarksHref?: string | undefined;
}) {
  return (
    <article className="min-w-0" data-testid="event-detail">
      <p className="market-kicker">
        <Link href={`/providers/${event.providerId}`} className="market-link">
          {providerName}
        </Link>{" "}
        · {MARKET_EVENT_TYPE_LABELS[event.type]}
      </p>
      <h1 className="mt-3 text-3xl sm:text-5xl">{event.title}</h1>
      <p className="mt-5 text-lg">{event.summary}</p>
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="market-muted">Occurrence</dt>
          <dd>
            <time dateTime={event.occurredAt}>{event.occurredAt}</time>
          </dd>
        </div>
        <div>
          <dt className="market-muted">Occurrence date basis</dt>
          <dd>
            {event.dateBasis === "provider_publication_date"
              ? "Provider publication date"
              : "Provider-stated date"}
          </dd>
        </div>
        {event.effectiveAt && (
          <div>
            <dt className="market-muted">Effective date</dt>
            <dd>
              <time dateTime={event.effectiveAt}>{event.effectiveAt}</time>
            </dd>
          </div>
        )}
        <div>
          <dt className="market-muted">Status recorded with this event</dt>
          <dd>{event.status}</dd>
        </div>
        <div>
          <dt className="market-muted">Event checked</dt>
          <dd>
            <time dateTime={event.verifiedAt}>{event.verifiedAt}</time>
          </dd>
        </div>
      </dl>
      <section className="mt-10" aria-labelledby="event-sources">
        <h2 id="event-sources" className="market-section-title">
          Original sources
        </h2>
        <ol>
          {event.sources.map((source) => (
            <li key={source.url} className="border-b border-border py-5">
              <a
                className="market-link break-words"
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {source.title}
                <span className="sr-only"> (opens in a new tab)</span> ↗
              </a>
              <p className="market-muted mt-2">
                {source.authority === "first_party" ? "First-party source" : "Third-party source"} ·
                Source checked <time dateTime={source.checkedAt}>{source.checkedAt}</time>
              </p>
              {source.excerpt && (
                <blockquote className="mt-3 border-l-2 border-border pl-4 text-sm">
                  {source.excerpt}
                </blockquote>
              )}
            </li>
          ))}
        </ol>
      </section>
      <details className="mt-5">
        <summary className="min-h-11 cursor-pointer">Recording provenance</summary>
        <p className="market-muted">
          First recorded by StackReplay{" "}
          <time dateTime={event.discoveredAt}>{event.discoveredAt}</time>. This is a discovery date,
          not the occurrence date.
        </p>
        <p className="market-muted">Event ID: {event.id}</p>
      </details>
      {(links.length > 0 || benchmarksHref) && (
        <nav
          aria-label="Related model, plan and benchmark pages"
          className="mt-8 flex flex-wrap gap-4"
        >
          {links.map((link) => (
            <Link className="market-link" key={`${link.kind}:${link.id}`} href={link.href}>
              {link.label}
            </Link>
          ))}
          {benchmarksHref && (
            <Link className="market-link" href={benchmarksHref}>
              Benchmark evidence
            </Link>
          )}
        </nav>
      )}
      <p className="mt-8">
        <Link
          className="market-link"
          href={updateListHref({
            providerId: event.providerId,
            category: "all",
            providerRecognized: true,
          })}
        >
          All updates from {providerName}
        </Link>
      </p>
      <p className="mt-4">
        <Link className="market-link" href="/changelog">
          All AI updates
        </Link>
      </p>
    </article>
  );
}
