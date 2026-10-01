import type { Metadata } from "next";
import { HomeHero } from "@/components/home/home-hero";
import { MarketRelevanceSummary } from "@/components/home/market-briefing";
import { ModelComparisonSection } from "@/components/home/model-comparison";
import { PersonalIntelligence } from "@/components/home/personal-intelligence";
import { PlanIntelligenceSection } from "@/components/home/plan-intelligence";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { familyLadders, homeCatalogIndex } from "@/lib/home/catalog-index";
import { exampleWorkload } from "@/lib/home/example";
import { benchmarkSheetHref, featuredModelComparison } from "@/lib/home/featured-models";
import { featuredPlanCards } from "@/lib/home/featured-plans";
import { briefingCandidates, marketEventViews, recentEvents } from "@/lib/market/events";
import { basePrice, modelPrices } from "@/lib/market-discovery";
import { modelsInView } from "@/lib/model-library";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { siteName, socialMetadata } from "@/lib/site";

const title = `${siteName}: what is happening in the AI model and subscription market`;
const description =
  "Dated, sourced AI model releases, benchmark results, API prices and subscription changes. Then see which of them matter to your own AI coding history, analyzed privately in your browser.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  ...socialMetadata({ title, description }),
};

function Chapter({
  id,
  index,
  title,
  note,
}: {
  id: string;
  index: string;
  title: string;
  note: string;
}) {
  return (
    <div id={id} className="home-chapter" data-testid={`home-chapter-${index}`}>
      <p className="home-micro">
        <span className="text-accent">{index}</span> / {title}
      </p>
      <p className="home-chapter-note">{note}</p>
    </div>
  );
}

export default function HomePage() {
  const catalog = loadPublicCatalog();
  const today = catalog.asOf;
  const events = marketEventViews(catalog);
  const comparison = featuredModelComparison(catalog, { benchmarkData: loadPublicBenchmarks() });
  const index = homeCatalogIndex(catalog);
  const cards = featuredPlanCards(
    catalog.plans,
    catalog.models.map((model) => model.id),
    {
      releasedOn: (id) =>
        id === undefined ? "" : (catalog.modelById(id)?.releaseDate?.date ?? ""),
    },
  );
  const listed = modelsInView(catalog.models, "models");
  const checkedThrough = [
    ...catalog.models.map((model) => model.lastVerifiedAt),
    ...catalog.plans.map((plan) => plan.publishedTerms?.checkedAt ?? plan.lastVerifiedAt),
  ]
    .filter((date) => date <= catalog.asOf)
    .sort()
    .at(-1);
  const coverage = {
    models: listed.length,
    pricedModels: listed.filter((model) => basePrice(modelPrices(model.id, catalog.asOf))).length,
    plans: catalog.plans.length,
    checkedThrough: formatCatalogDate(checkedThrough ?? catalog.asOf),
  };

  return (
    <div className="home" data-testid="home">
      <HomeHero
        coverage={coverage}
        briefing={briefingCandidates(events, today)}
        recent={recentEvents(events, today)}
        builtOn={today}
        index={index}
      />

      {comparison === undefined ? null : (
        <ModelComparisonSection
          comparison={comparison}
          index={index}
          sheetHref={benchmarkSheetHref(comparison.columns.map((column) => column.id))}
        />
      )}

      <Chapter
        id="public-intelligence"
        index="01"
        title="Subscriptions"
        note="What each plan costs, which models it includes and what its usage terms establish."
      />
      <PlanIntelligenceSection cards={cards} />

      <section
        className="dark home-personal"
        aria-labelledby="personal-heading"
        data-testid="home-personal"
      >
        <Chapter
          id="personal-intelligence"
          index="02"
          title="Personal intelligence"
          note="The same market, applied to the AI work you actually did."
        />
        <div className="home-personal-intro">
          <h2 id="personal-heading" className="home-h2">
            Which of this matters to you?
          </h2>
          <p className="home-lede">
            StackReplay reads your local AI history against the same models, prices and plans above.
            It can tell you which market changes touch models you use and plans you pay for, and
            what your subscriptions actually carried.
          </p>
        </div>
        <MarketRelevanceSummary
          events={recentEvents(events, today)}
          builtOn={today}
          index={index}
        />
        <PersonalIntelligence
          index={index}
          ladders={familyLadders(catalog)}
          example={exampleWorkload()}
        />
      </section>
    </div>
  );
}
