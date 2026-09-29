import type { Metadata } from "next";
import Link from "next/link";
import { MarketFooter, MarketHeader } from "@/components/public/market-header";
import { ModelExplorer } from "@/components/public/model-explorer";
import { marketDiscovery } from "@/lib/market-discovery";
import { includedPlanCounts } from "@/lib/subscription-access";
export const metadata: Metadata = {
  title: "Models",
  description:
    "Explore current AI models, compare published API rates, find subscription access and test alternatives against your own workload.",
  alternates: { canonical: "/models" },
};
export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const { catalog, prices } = marketDiscovery();
  return (
    <div>
      <MarketHeader
        eyebrow="The model field guide"
        title="Know your models."
        description="Compare the cost. Find the access. Put the alternatives to work on your own history."
      >
        <aside className="market-feature">
          <p className="market-kicker">New / September 28</p>
          <h2>Claude Sonnet 5.5</h2>
          <p>
            Published API rates: $2 input, $10 output and $0.20 cache reads per million tokens.
            Inspect pricing and cache-write options.
          </p>
          <Link className="market-link" href="/models/claude-sonnet-5-5">
            Explore the release ↗
          </Link>
        </aside>
      </MarketHeader>
      <ModelExplorer
        models={catalog.models}
        prices={prices}
        planCounts={includedPlanCounts(catalog.plans)}
        initialLayout={view === "table" ? "table" : "cards"}
      />
      <MarketFooter />
    </div>
  );
}
