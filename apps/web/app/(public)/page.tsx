import type { Metadata } from "next";
import { HomeHero } from "@/components/home/home-hero";
import { ModelComparisonSection } from "@/components/home/model-comparison";
import { PersonalIntelligence } from "@/components/home/personal-intelligence";
import { PlanIntelligenceSection } from "@/components/home/plan-intelligence";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { familyLadders, homeCatalogIndex } from "@/lib/home/catalog-index";
import { exampleWorkload } from "@/lib/home/example";
import { featuredModelComparison } from "@/lib/home/featured-models";
import { featuredPlanCards } from "@/lib/home/featured-plans";
import { latestChangeDate, marketChanges, selectPulse } from "@/lib/home/market-pulse";
import { basePrice, modelPrices } from "@/lib/market-discovery";
import { modelsInView } from "@/lib/model-library";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { siteName, socialMetadata } from "@/lib/site";

const title = `${siteName}: AI model and subscription intelligence for your workload`;
const description =
  "Current AI models, API prices, context limits and subscription terms, with sources. Then scan your AI coding history locally to see what you use and what your stack costs.";

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
  const changes = marketChanges(catalog);
  const pulse = selectPulse(changes);
  const comparison = featuredModelComparison(catalog);
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
        pulse={pulse}
        latest={latestChangeDate(pulse)}
        benchmarks={(comparison?.benchmarks.length ?? 0) > 0}
      />

      <Chapter
        id="public-intelligence"
        index="01"
        title="Public intelligence"
        note="Useful without scanning anything: models, prices and what subscriptions include."
      />
      {comparison === undefined ? null : (
        <ModelComparisonSection comparison={comparison} index={index} />
      )}
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
          note="The same catalog, applied to the AI work you actually did."
        />
        <div className="home-personal-intro">
          <h2 id="personal-heading" className="home-h2">
            Now make all of this about your workload.
          </h2>
          <p className="home-lede">
            StackReplay maps your local AI history against the same models, prices and subscription
            rules above. That answers questions a public comparison site can&rsquo;t.
          </p>
        </div>
        <PersonalIntelligence
          index={index}
          ladders={familyLadders(catalog)}
          example={exampleWorkload()}
          pulse={pulse.map((item) => ({ planIds: item.planIds, modelIds: item.modelIds }))}
        />
      </section>
    </div>
  );
}
