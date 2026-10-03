import type { Metadata } from "next";
import Link from "next/link";
import { HomeHero } from "@/components/home/home-hero";
import { MarketRelevanceSummary } from "@/components/home/market-briefing";
import { ModelComparisonSection } from "@/components/home/model-comparison";
import { ForYou, PersonalIntelligence } from "@/components/home/personal-intelligence";
import { SubscriptionWatch } from "@/components/home/subscription-watch";
import { familyLadders, homeCatalogIndex } from "@/lib/home/catalog-index";
import { exampleWorkload } from "@/lib/home/example";
import { benchmarkSheetHref, featuredModelComparison } from "@/lib/home/featured-models";
import { isSubscriptionEvent, watchPlans } from "@/lib/home/subscription-watch";
import { briefingCandidates, marketEventViews, recentEvents } from "@/lib/market/events";
import { basePrice, modelPrices } from "@/lib/market-discovery";
import { modelsInView } from "@/lib/model-library";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { publicFreshness } from "@/lib/public-freshness";
import { publicPageMetadata, siteName } from "@/lib/site";

const title = `${siteName}: what is happening in the AI model and subscription market`;
const description =
  "Dated, sourced AI model releases, benchmark results, API prices and subscription changes. Then see which of them matter to your own AI coding history, analyzed privately in your browser.";

export const metadata: Metadata = publicPageMetadata({
  title,
  description,
  path: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  const catalog = loadPublicCatalog();
  const today = catalog.asOf;
  const events = marketEventViews(catalog);
  const recent = recentEvents(events, today);
  const subscriptionEvents = recent.filter(isSubscriptionEvent);
  const comparison = featuredModelComparison(catalog, { benchmarkData: loadPublicBenchmarks() });
  const index = homeCatalogIndex(catalog);
  const listed = modelsInView(catalog.models, "models");
  const freshness = publicFreshness(catalog);
  const pricedModels = listed.filter((model) =>
    basePrice(modelPrices(model.id, catalog.asOf)),
  ).length;

  return (
    <div className="home" data-testid="home">
      <HomeHero
        briefing={briefingCandidates(events, today)}
        recent={recent}
        builtOn={today}
        index={index}
      />

      <ForYou events={recent} builtOn={today} index={index} />

      {comparison === undefined ? null : (
        <ModelComparisonSection
          comparison={comparison}
          index={index}
          sheetHref={benchmarkSheetHref(comparison.columns.map((column) => column.id))}
        />
      )}

      <SubscriptionWatch
        events={subscriptionEvents}
        plans={watchPlans(catalog, subscriptionEvents)}
        builtOn={today}
        index={index}
      />

      <p className="home-coverage" data-testid="home-coverage">
        Catalog: {listed.length} models, {pricedModels} with API list prices, {catalog.plans.length}{" "}
        subscription plans. {freshness}.{" "}
        <Link href="/methodology" className="home-inline-link">
          Methodology
        </Link>
      </p>

      <section
        className="dark home-personal"
        aria-labelledby="personal-heading"
        data-testid="home-personal"
      >
        <header id="personal-intelligence" className="home-personal-intro">
          <p className="home-kicker home-kicker-accent">Your workload</p>
          <h2 id="personal-heading" className="home-h2">
            Which of this matters to you?
          </h2>
          <p className="home-lede">
            The same models, prices and plans, read against the AI work you actually did.
          </p>
        </header>
        <MarketRelevanceSummary events={recent} builtOn={today} index={index} />
        <PersonalIntelligence
          events={recent}
          builtOn={today}
          index={index}
          ladders={familyLadders(catalog)}
          example={exampleWorkload()}
        />
      </section>
    </div>
  );
}
