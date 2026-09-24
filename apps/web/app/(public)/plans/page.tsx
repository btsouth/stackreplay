import type { Metadata } from "next";
import Link from "next/link";
import { PlanExplorer } from "@/components/public/plan-explorer";
import { buildCompareFacts, type CompareFacts } from "@/lib/compare-facts";
import { loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";

export const metadata: Metadata = {
  title: "Plans",
  description:
    "AI coding plans by provider: price, included models, usage limits and sources for every fact.",
  alternates: { canonical: "/plans" },
};

export default function PlansPage() {
  const catalog = loadPublicCatalog();
  const facts: Record<string, CompareFacts> = Object.fromEntries(
    catalog.plans.map((plan) => [plan.id, buildCompareFacts(plan, catalog.modelById)]),
  );
  return (
    <div className="flex flex-col gap-7 pb-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium tracking-tight text-foreground">Plans</h1>
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          Find a plan, then check its price, models and limits against the provider&apos;s own
          sources. Replay applies these rules to your own history.
        </p>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Looking for DeepSeek? It is a Direct API target, not a subscription plan here.{" "}
          <Link
            className="text-accent underline underline-offset-4"
            href="/app/replay?api=deepseek"
          >
            Replay against the DeepSeek API
          </Link>
          .
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {catalog.plans.length} plans from {catalog.providers.length} providers · checked by hand
          Sep 23, 2026
        </p>
      </header>
      {catalog.plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sourced plan is listed yet.</p>
      ) : (
        <PlanExplorer plans={catalog.plans} providers={catalog.providers} facts={facts} />
      )}
      <p className="font-mono text-[11px] text-muted-foreground">
        Catalog version {shortCatalogVersion(catalog.catalogVersion)}
      </p>
    </div>
  );
}
