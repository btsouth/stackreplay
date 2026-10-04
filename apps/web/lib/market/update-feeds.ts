import { type MarketFeed, marketEventCategories } from "@stackreplay/market-events";
import { absoluteUrl } from "../site";
import {
  marketEventHref,
  selectUpdates,
  type UpdateSelection,
  updateFeedHref,
} from "./update-selection";

/** StackReplay's raw-event export, deliberately distinct from JSON Feed. */
export function projectUpdateFeed(feed: MarketFeed, selection: UpdateSelection) {
  const href = updateFeedHref(selection, "json");
  if (href === null) throw new Error("Provider not recognized");
  return {
    exportVersion: 1,
    sourceSchemaVersion: feed.schemaVersion,
    feedAsOf: feed.asOf,
    selection: { providerId: selection.providerId, category: selection.category },
    feedUrl: absoluteUrl(href),
    items: selectUpdates(feed.events, selection).map((event) => ({
      url: absoluteUrl(marketEventHref(event.id)),
      categories: marketEventCategories(event.type),
      event,
    })),
  };
}

/** Escape both XML text and attributes. Never interpolate raw event text or CDATA. */
export function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char] ?? char,
  );
}
const element = (name: string, value: string) => `<${name}>${escapeXml(value)}</${name}>`;

export function serializeUpdateRss(feed: MarketFeed, selection: UpdateSelection): string {
  const href = updateFeedHref(selection, "xml");
  if (href === null) throw new Error("Provider not recognized");
  const projection = projectUpdateFeed(feed, selection);
  const items = projection.items
    .map(({ url, categories, event }) => {
      const description = [
        event.summary,
        `Provider occurrence: ${event.occurredAt}`,
        `Date basis: ${event.dateBasis}`,
        ...(event.effectiveAt ? [`Effective date: ${event.effectiveAt}`] : []),
        `Status recorded with this event: ${event.status}`,
        `Event checked: ${event.verifiedAt}`,
        `Discovered: ${event.discoveredAt}`,
        ...event.sources.flatMap((source) => [
          `Source: ${source.title} (${source.authority})`,
          source.url,
          `Source checked: ${source.checkedAt}`,
          ...(source.excerpt ? [`Excerpt: ${source.excerpt}`] : []),
        ]),
      ].join("\n");
      // A calendar day is not an instant. Checked/discovery days never supply pubDate.
      const pubDate = event.occurredAt.includes("T")
        ? element("pubDate", new Date(event.occurredAt).toUTCString())
        : "";
      return `<item>${element("title", event.title)}${element("link", url)}<guid isPermaLink="true">${escapeXml(url)}</guid>${element("description", description)}${categories.map((category) => element("category", category)).join("")}${pubDate}</item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
${element("title", "StackReplay AI updates")}
${element("link", absoluteUrl("/changelog"))}
${element("description", `Accepted AI market updates. Feed reviewed ${feed.asOf}. Provider and category selection: ${selection.providerId ?? "all"}, ${selection.category}.`)}
<atom:link href="${escapeXml(absoluteUrl(href))}" rel="self" type="application/rss+xml"/>
${items}
</channel></rss>
`;
}
