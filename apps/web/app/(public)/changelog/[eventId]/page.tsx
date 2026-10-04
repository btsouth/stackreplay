import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketEventDetail } from "@/components/market/event-detail";
import { MarketFooter } from "@/components/public/market-header";
import { loadMarketFeed, presentMarketEvent } from "@/lib/market/events";
import { marketEventHref } from "@/lib/market/update-selection";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { publicPageMetadata } from "@/lib/site";

type Props = { params: Promise<{ eventId: string }> };
function acceptedEvent(id: string) {
  const event = loadMarketFeed().events.find((entry) => entry.id === id);
  if (!event) notFound();
  return event;
}
export function generateStaticParams() {
  return loadMarketFeed().events.map((event) => ({ eventId: event.id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = acceptedEvent((await params).eventId);
  return publicPageMetadata({
    title: event.title,
    description: event.summary,
    path: marketEventHref(event.id),
  });
}
export default async function EventPage({ params }: Props) {
  const event = acceptedEvent((await params).eventId);
  const view = presentMarketEvent(event, loadPublicCatalog(), loadPublicBenchmarks());
  return (
    <div>
      <MarketEventDetail
        event={event}
        providerName={view.providerName}
        links={view.links}
        benchmarksHref={view.benchmarksHref}
      />
      <MarketFooter />
    </div>
  );
}
