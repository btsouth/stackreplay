import "@/components/terminal/terminal.css";
import "@/components/public/public-terminal.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketFooter, MarketHeader } from "@/components/public/market-header";
import { ProviderExplorer, RoutedProviderExplorer } from "@/components/public/provider-explorer";
import { planTools } from "@/lib/market-discovery";
import { providerDiscoveryRows } from "@/lib/public-discovery";
import { loadPublicProviderDirectory } from "@/lib/public-providers";
import { publicPageMetadata } from "@/lib/site";
export const metadata: Metadata = publicPageMetadata({
  title: "Providers",
  description:
    "Explore AI model developers, recorded API access and published plans, with sources for each provider.",
  path: "/providers",
});
export default function ProvidersPage() {
  const data = loadPublicProviderDirectory();
  const rows = providerDiscoveryRows(
    data,
    Object.fromEntries(data.directory.plans.map((plan) => [plan.id, planTools(plan)])),
  );
  return (
    <div className="terminal public-terminal">
      <MarketHeader
        compact
        eyebrow="The people behind the tools"
        title="Explore the providers."
        description="See who develops the models, where API access is recorded and who publishes the plans. Coverage reflects sourced records, not the whole market."
      />
      <Suspense fallback={<ProviderExplorer rows={rows} />}>
        <RoutedProviderExplorer rows={rows} />
      </Suspense>
      <MarketFooter />
    </div>
  );
}
