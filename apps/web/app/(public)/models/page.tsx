import "@/components/terminal/terminal.css";
import "@/components/public/public-terminal.css";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketFooter, MarketHeader } from "@/components/public/market-header";
import { ModelExplorer } from "@/components/public/model-explorer";
import { marketDiscovery } from "@/lib/market-discovery";
import { modelPlanCounts } from "@/lib/model-library";
import { publicPageMetadata } from "@/lib/site";
export const metadata: Metadata = publicPageMetadata({
  title: "Models",
  description:
    "Explore current AI models, compare published API rates, find subscription access and test alternatives against your own workload.",
  path: "/models",
});
// The page stays static: the ?view=table layout is read in the browser (see ModelExplorer).
export default function ModelsPage() {
  const { catalog, prices } = marketDiscovery();
  return (
    <div className="terminal public-terminal models-discovery-page">
      <MarketHeader
        compact
        eyebrow="The model field guide"
        title="Know your models."
        description="Find a model by developer, capability or exact identity. Compare published API prices and see which coding plans include it."
      />
      <ModelExplorer
        spotlight={
          <aside className="market-feature">
            <p className="market-kicker">Release spotlight · September 28, 2026</p>
            <h2>Claude Sonnet 5.5</h2>
            <p>
              Published API rates: $2 input, $10 output and $0.20 cache reads per million tokens.
              Inspect pricing and cache-write options.
            </p>
            <Link className="market-link" href="/models/claude-sonnet-5-5">
              Explore the release ↗
            </Link>
          </aside>
        }
        models={catalog.models}
        prices={prices}
        planCounts={modelPlanCounts(catalog.models)}
      />
      <MarketFooter />
    </div>
  );
}
