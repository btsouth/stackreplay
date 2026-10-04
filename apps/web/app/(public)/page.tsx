import { VisualHome } from "@/components/visual/visual-home";
import { marketEventViews } from "@/lib/market/events";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { publicPageMetadata } from "@/lib/site";
import { visualModelData } from "@/lib/visual-model-data";

export const metadata = publicPageMetadata({
  title: "StackReplay: explore AI models, providers and plans",
  absoluteTitle: true,
  description:
    "Explore model capability, API prices, context windows and coding plans in one clear comparison.",
  path: "/",
});
export default function HomePage() {
  const catalog = loadPublicCatalog();
  const data = visualModelData(catalog, loadPublicBenchmarks());
  const events = marketEventViews(catalog)
    .filter((event) => event.day <= catalog.asOf)
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 4)
    .map(({ id, title, day, href }) => ({ id, title, day, href }));
  return <VisualHome data={data} events={events} />;
}
