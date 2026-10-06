import { marketFeed, occurredDay } from "@stackreplay/market-events";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import EventPage, {
  generateMetadata,
  generateStaticParams,
} from "../../app/(public)/changelog/[eventId]/page";
import UpdatesPage from "../../app/(public)/changelog/page";
import sitemap from "../../app/sitemap";
import { MarketEventDetail } from "../../components/market/event-detail";
import { loadPublicProviderDirectory } from "../public-providers";
import { absoluteUrl, brandAssets } from "../site";
import { parseUpdateSelection, selectUpdates } from "./update-selection";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("404");
  },
  useSearchParams: () => new URLSearchParams("provider=google&type=benchmarks"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
const escaped = (text: string) =>
  renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);
const events = marketFeed.events;
const props = (eventId: string) => ({ params: Promise.resolve({ eventId }) });
describe("permanent update provenance", () => {
  it("renders every admitted source, excerpt and distinct original date", () => {
    for (const event of events) {
      const html = renderToStaticMarkup(
        createElement(MarketEventDetail, { event, providerName: event.providerId, links: [] }),
      );
      for (const source of event.sources) {
        expect(html).toContain(`href="${escaped(source.url)}"`);
        expect(html).toContain(escaped(source.title));
        expect(html).toContain(`dateTime="${source.checkedAt}"`);
        if (source.excerpt) expect(html).toContain(escaped(source.excerpt));
      }
      for (const date of [
        event.occurredAt,
        event.verifiedAt,
        event.discoveredAt,
        event.effectiveAt,
      ].filter(Boolean))
        expect(html).toContain(`dateTime="${date}"`);
      expect(html).toContain("Status recorded with this event");
      expect(html).toContain(event.status);
      expect(html).toContain(
        event.dateBasis === "provider_stated_date"
          ? "Provider-stated date"
          : "Provider publication date",
      );
      expect(html).not.toContain("Current catalog context");
    }
  });
  it("escapes excerpts and retains offset/date-only occurrence and scheduled status beyond effective date", () => {
    const event = {
      ...events[0],
      occurredAt: "2026-09-30T23:30:00-07:00",
      effectiveAt: "2026-10-21",
      status: "scheduled" as const,
      sources: [
        {
          url: "https://example.com/?a=1&b=2",
          title: "Source <title>",
          checkedAt: "2026-09-30",
          authority: "first_party" as const,
          excerpt: '<script>alert("x")</script> & quoted',
        },
      ],
    } as (typeof events)[number];
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2035-01-01"));
    try {
      const html = renderToStaticMarkup(
        createElement(MarketEventDetail, { event, providerName: "Google", links: [] }),
      );
      expect(html).toContain(escaped(event.sources[0]?.excerpt ?? ""));
      expect(html).not.toContain("<script>");
      expect(html).toContain("scheduled");
      expect(html).toContain(event.occurredAt);
      expect(occurredDay(event)).toBe("2026-09-30");
    } finally {
      vi.useRealTimers();
    }
  });
  it("uses all 25 stable paths, self canonicals and the approved social image without invented timestamps", async () => {
    expect(
      generateStaticParams()
        .map(({ eventId }) => eventId)
        .sort(),
    ).toEqual(events.map((event) => event.id).sort());
    for (const event of events) {
      const metadata = await generateMetadata(props(event.id));
      expect(metadata.title).toBe(event.title);
      expect(metadata.description).toBe(event.summary);
      expect(metadata.alternates?.canonical).toBe(`/changelog/${event.id}`);
      expect(metadata.openGraph).toMatchObject({
        url: absoluteUrl(`/changelog/${event.id}`),
        images: [expect.objectContaining({ url: brandAssets.openGraph.src })],
      });
      expect(JSON.stringify(metadata)).not.toMatch(/lastModified|modifiedTime|publishedTime/u);
    }
    await expect(generateMetadata(props("unknown"))).rejects.toThrow("404");
    await expect(EventPage(props("unknown"))).rejects.toThrow("404");
  });
  it("renders direct filtered SSR rows and counts without showing all events first", async () => {
    const html = renderToStaticMarkup(
      await UpdatesPage({
        searchParams: Promise.resolve({ provider: "google", type: "benchmarks" }),
      }),
    );
    const selected = selectUpdates(
      events,
      parseUpdateSelection(
        { provider: "google", type: "benchmarks" },
        loadPublicProviderDirectory().providers,
      ),
    );
    expect(
      [...html.matchAll(/id="([^"]+)" class="updates-event"/gu)].map((match) => match[1]),
    ).toEqual(selected.map((event) => event.id));
    expect(html).toContain('data-selected-value="google"');
    expect(html).toMatch(/role="combobox"[^>]*aria-label="Provider"[^>]*><span>Google<\/span>/u);
    expect(html).toContain('aria-pressed="true" data-testid="updates-filter-benchmarks"');
  });
  it("sitemaps every permalink without filters, feeds or substituted review dates", () => {
    const paths = sitemap().filter((entry) => entry.url.includes("/changelog"));
    expect(paths).toHaveLength(events.length + 1);
    for (const event of events)
      expect(paths).toContainEqual({
        url: absoluteUrl(`/changelog/${event.id}`),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    for (const entry of paths) {
      expect(entry).not.toHaveProperty("lastModified");
      expect(entry.url).not.toMatch(/\?|feed\.(json|xml)/u);
    }
  });
});
