import Link from "next/link";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { PULSE_CATEGORY_LABELS, type PulseItem } from "@/lib/home/market-pulse";
import { PersonalMark } from "./personal-marks";

/**
 * Market Pulse: the newest real changes in the catalog, one short row each.
 * A dark instrument surface on the paper page (the `.dark` token set, whose
 * contrast pairs are verified), and an elevated surface in the dark theme.
 */
export function MarketPulse({
  items,
  latest,
}: {
  items: readonly PulseItem[];
  latest: string | undefined;
}) {
  return (
    <section
      id="market-pulse"
      aria-labelledby="market-pulse-heading"
      className="dark home-panel"
      data-testid="market-pulse"
    >
      <header className="home-panel-head">
        <h2 id="market-pulse-heading" className="home-micro text-foreground">
          <span aria-hidden="true" className="home-panel-mark" />
          Market pulse
        </h2>
        {latest === undefined ? null : (
          <p className="home-micro" data-testid="market-pulse-updated">
            Latest change <time dateTime={latest}>{formatCatalogDate(latest)}</time>
          </p>
        )}
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No dated market change is recorded in this catalog yet.
        </p>
      ) : (
        <ol className="home-pulse-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="home-pulse-item"
              data-testid="market-pulse-item"
              data-pulse-id={item.id}
              data-category={item.category}
            >
              <p className="home-pulse-when">
                <span className="home-micro text-foreground">
                  {PULSE_CATEGORY_LABELS[item.category]}
                </span>
                <span className="home-pulse-date">
                  <time dateTime={item.date}>{formatCatalogDate(item.date)}</time>
                </span>
              </p>
              <div className="min-w-0">
                <h3 className="home-pulse-subject">
                  <Link href={item.href} className="home-subject-link">
                    {item.subject}
                  </Link>
                  <PersonalMark planIds={item.planIds} modelIds={item.modelIds} />
                </h3>
                <p className="home-pulse-change">{item.change}</p>
                <p className="home-pulse-meta">
                  {item.provider === undefined ? null : <span>{item.provider}</span>}
                  {item.timing === "scheduled" ? <span>Scheduled</span> : null}
                  {item.source === undefined ? null : (
                    <a
                      href={item.source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="home-source-link"
                      title={item.source.title}
                    >
                      Source<span className="sr-only"> (opens in a new tab)</span>
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <footer className="home-panel-foot">
        <Link href="/changelog" className="home-inline-link">
          Market updates <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </section>
  );
}
