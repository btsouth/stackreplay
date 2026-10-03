import type { Metadata } from "next";
import { UpdatesFeed } from "@/components/market/updates-feed";
import { MarketFooter, MarketHeader } from "@/components/public/market-header";
import { SourceList } from "@/components/public/provenance";
import { homeCatalogIndex } from "@/lib/home/catalog-index";
import { marketEventViews } from "@/lib/market/events";
import { deriveCatalogChanges, loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";
import { publicPageMetadata } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "AI updates",
  description:
    "Material AI model releases, benchmark results, API price changes and subscription changes from the major labs, dated by when they happened, each with its first-party source.",
  path: "/changelog",
});

/**
 * AI Updates: the canonical market feed, the same one the homepage briefing
 * reads. The internal catalog changelog stays as a secondary technical
 * disclosure at the end; it records catalog rule versions, not market news.
 */
export default function UpdatesPage() {
  const catalog = loadPublicCatalog();
  const events = marketEventViews(catalog);
  const changes = deriveCatalogChanges();
  return (
    <div>
      <MarketHeader
        eyebrow="AI updates"
        title="What changed in the AI market."
        description="Model releases, benchmark results, API prices and subscription changes from the major labs, dated by when they happened and linked to the provider's own source."
      />
      <UpdatesFeed events={events} index={homeCatalogIndex(catalog)} />
      <details className="mt-12 border-y border-border-strong py-4" data-testid="catalog-changelog">
        <summary className="min-h-11 cursor-pointer text-lg">
          Technical: catalog rule versions
        </summary>
        <p className="market-muted my-4">
          Catalog {shortCatalogVersion(catalog.catalogVersion)}. These dates describe when
          StackReplay&rsquo;s catalog recorded a plan rule version. They are not market event dates.
        </p>
        <ol data-testid="changelog-list">
          {changes.map((change) => (
            <li
              key={`${change.planId}-${change.effectiveFrom}-${change.kind}`}
              className="border-t border-border py-5"
            >
              <p className="market-muted">
                {change.effectiveFrom} · {change.kind.replaceAll("_", " ")}
                {change.effectiveFrom > catalog.asOf ? " · scheduled, not yet in effect" : ""}
              </p>
              <p className="text-sm">
                {change.planName}: {change.summary}
              </p>
              <details className="mt-2">
                <summary className="min-h-11 cursor-pointer text-sm">
                  Sources and changed models
                </summary>
                {change.modelDetails && <p className="market-muted mb-3">{change.modelDetails}</p>}
                <SourceList sources={change.sources} />
              </details>
            </li>
          ))}
        </ol>
      </details>
      <MarketFooter />
    </div>
  );
}
