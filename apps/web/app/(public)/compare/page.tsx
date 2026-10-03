import type { Metadata } from "next";
import { CompareExplorer } from "@/components/public/compare-explorer";
import { MarketHeader } from "@/components/public/market-header";
import { buildCompareFacts, type CompareFacts, defaultComparePair } from "@/lib/compare-facts";
import { planTools } from "@/lib/market-discovery";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { publicPageMetadata } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Compare plans",
  description:
    "Compare two or three AI coding plans on price, included models, coding tools, usage limits and what happens after the limit, with sources.",
  path: "/compare",
});

/** Common questions, as ready-made comparisons. Editorial shortcuts, not rankings. */
const QUICK_COMPARISONS = [
  ["anthropic-claude-max-20x", "openai-chatgpt-pro"],
  ["anthropic-claude-pro", "openai-chatgpt-plus"],
  ["clinepass", "opencode-go"],
  ["command-code-pro", "opencode-go-plus"],
] as const;

// The page stays static: the plans in ?left=&right=&third= are read in the browser (see CompareExplorer).
export default function ComparePage() {
  const catalog = loadPublicCatalog();
  const facts: Record<string, CompareFacts> = Object.fromEntries(
    catalog.plans.map((plan) => [
      plan.id,
      { ...buildCompareFacts(plan, catalog.modelById), codingTools: planTools(plan) },
    ]),
  );
  const quick = QUICK_COMPARISONS.flatMap(([left, right]) => {
    const a = catalog.planById(left);
    const b = catalog.planById(right);
    return a && b
      ? [{ href: `/compare?left=${a.id}&right=${b.id}`, label: `${a.name} vs ${b.name}` }]
      : [];
  });
  return (
    <div className="pb-8">
      <MarketHeader
        eyebrow="Compare / Plans side by side"
        title="Compare plans."
        description="How plans differ on paper: price, models, coding tools, usage limits and what happens when you run out. To see how they handle your own work, compare them against your workload."
      >
        {quick.length > 0 && (
          <aside className="market-feature" aria-label="Popular comparisons">
            <p className="market-kicker">Popular comparisons</p>
            <ul className="mt-3 space-y-1">
              {quick.map((item) => (
                <li key={item.href}>
                  {/* A full load, not a client navigation: on /compare itself the explorer
                      stays mounted and only reads the plans from the URL when the page loads. */}
                  <a href={item.href} className="market-link min-h-9 text-sm">
                    {item.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </MarketHeader>
      {catalog.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sourced plan is listed yet.</p>
      ) : (
        <CompareExplorer
          plans={catalog.plans}
          providers={catalog.providers}
          facts={facts}
          defaultPair={defaultComparePair(catalog.plans)}
          asOf={catalog.asOf}
        />
      )}
    </div>
  );
}
