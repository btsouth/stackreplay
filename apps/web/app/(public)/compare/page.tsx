import type { Metadata } from "next";
import { CompareExplorer } from "@/components/public/compare-explorer";
import { buildCompareFacts, type CompareFacts, defaultComparePair } from "@/lib/compare-facts";
import { planTools } from "@/lib/market-discovery";
import { loadPublicCatalog } from "@/lib/public-catalog";

export const metadata: Metadata = {
  title: "Compare plans",
  description:
    "Compare two AI coding plans on price, included models, coding tools, usage limits and what happens after the limit, with sources.",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string; right?: string }>;
}) {
  const query = await searchParams;
  const catalog = loadPublicCatalog();
  const facts: Record<string, CompareFacts> = Object.fromEntries(
    catalog.plans.map((plan) => [
      plan.id,
      { ...buildCompareFacts(plan, catalog.modelById), codingTools: planTools(plan) },
    ]),
  );
  return (
    <div className="flex flex-col gap-7 pb-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium tracking-tight text-foreground">Compare plans</h1>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          How two plans differ on paper: price, models, coding tools, usage limits and what happens
          when you run out. To see how they handle your own work, compare them against your
          workload.
        </p>
      </header>
      {catalog.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sourced plan is listed yet.</p>
      ) : (
        <CompareExplorer
          plans={catalog.plans}
          providers={catalog.providers}
          facts={facts}
          initialPair={(() => {
            const fallback = defaultComparePair(catalog.plans);
            return [
              catalog.planById(query.left ?? "")?.id ?? fallback[0],
              catalog.planById(query.right ?? "")?.id ?? fallback[1],
            ];
          })()}
        />
      )}
    </div>
  );
}
