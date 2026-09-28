import type { Metadata } from "next";
import Link from "next/link";
import { MarketFooter, MarketHeader } from "@/components/public/market-header";
import { PlanExplorer } from "@/components/public/plan-explorer";
import { buildCompareFacts } from "@/lib/compare-facts";
import { marketDiscovery, planUsage } from "@/lib/market-discovery";
export const metadata: Metadata = {
  title: "Subscriptions",
  description:
    "Compare AI coding subscriptions by monthly price, included models, compatible tools and published usage terms.",
  alternates: { canonical: "/plans" },
};
export default function PlansPage() {
  const { catalog, tools } = marketDiscovery();
  const facts = Object.fromEntries(
    catalog.plans.map((p) => [p.id, buildCompareFacts(p, catalog.modelById)]),
  );
  return (
    <div>
      <MarketHeader
        eyebrow="Subscriptions / Know what you buy"
        title="Find your next stack."
        description="Model access, monthly prices and the limits that matter. Side by side, with the sources to check them."
      >
        <aside className="market-feature">
          <p className="market-kicker">Open-model subscriptions</p>
          <h2>More ways to run your agents.</h2>
          <p>
            Explore Command Code, OpenCode, ClinePass and Ollama alongside the established coding
            plans.
          </p>
          <Link href="/compare?left=clinepass&right=opencode-go" className="market-link">
            ClinePass vs OpenCode Go ↗
          </Link>
        </aside>
      </MarketHeader>
      <PlanExplorer
        plans={catalog.plans}
        providers={catalog.providers}
        facts={facts}
        tools={tools}
        usage={Object.fromEntries(catalog.plans.map((p) => [p.id, planUsage(p)]))}
      />
      <p className="market-muted mt-6">
        Published subscription price is separate from what you actually paid. Listing a plan does
        not establish that its capacity can be replayed. Each detail page explains what is known.
      </p>
      <MarketFooter />
    </div>
  );
}
