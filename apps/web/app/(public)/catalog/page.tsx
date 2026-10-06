import { buttonVariants, CatalogSubNav, PageHeader, Panel, SectionHeader } from "@stackreplay/ui";
import { ArrowUpRight, BookOpen, Layers3 } from "lucide-react";
import Link from "next/link";
import { FEATURED_MODEL_IDS } from "@/lib/home/featured-models";
import { LocalWorkloadAction } from "@/components/local-workload-action";
import { MarketFooter } from "@/components/public/market-header";
import { marketEventViews } from "@/lib/market/events";
import { loadPublicCatalog } from "@/lib/public-catalog";
import { loadPublicDirectory } from "@/lib/public-directory";
import { publicPlanPriceText } from "@/lib/public-plan-price";
import { publicPageMetadata } from "@/lib/site";
export const metadata = publicPageMetadata({
  title: "Models & plans",
  description: "Explore AI models, coding plans, benchmark evidence and sourced updates.",
  path: "/catalog",
});
const guides = [
  {
    href: "/providers",
    label: "Providers",
    title: "Follow the source",
    detail: "Who builds each model, who offers access and which plans connect them.",
  },
  {
    href: "/benchmarks",
    label: "Benchmarks",
    title: "Read beyond the score",
    detail: "Reported results, exact test versions and the evaluation setups behind them.",
  },
  {
    href: "/compare",
    label: "Compare",
    title: "Find the fit",
    detail: "Put two or three plans side by side. Published facts, with the gaps left visible.",
  },
];
export default function CatalogPage() {
  const catalog = loadPublicCatalog();
  const directory = loadPublicDirectory();
  const latest = marketEventViews(catalog).slice(0, 3);
  const models = FEATURED_MODEL_IDS.flatMap((id) => {
    const model = catalog.models.find((m) => m.id === id);
    return model ? [model] : [];
  });
  const plans = ["anthropic-claude-pro", "openai-chatgpt-plus", "opencode-go"].flatMap((id) => {
    const plan = directory.planById(id);
    return plan ? [plan] : [];
  });
  return (
    <div className="catalog-editorial">
      <CatalogSubNav />
      <PageHeader
        eyebrow="The field guide"
        title={
          <>
            AI models.
            <br />
            <span className="text-accent">Prices. Plans.</span>
          </>
        }
        description="Your recap tells your story. Explore the models and plans around it, with published facts and sources you can check."
        actions={
          <LocalWorkloadAction variant="header" className={buttonVariants({variant:"outline"})} />
        }
      />
      <div className="catalog-leads">
        <Panel className="catalog-lead">
          <BookOpen size={28} aria-hidden="true" />
          <p className="sr-eyebrow">Models</p>
          <h2>
            Find the right
            <br />
            kind of intelligence.
          </h2>
          <p>
            Search by capability, developer or exact model identity. Explore API prices and the
            subscriptions that include them.
          </p>
          <Link className="catalog-cta" href="/models">
            Explore models <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <div className="catalog-shortlist">
            <span>Editorial starting points</span>
            {models.map((m) => (
              <Link key={m.id} href={`/models/${m.id}`}>
                {m.name} <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel className="catalog-lead catalog-lead-plans">
          <Layers3 size={28} aria-hidden="true" />
          <p className="sr-eyebrow">Plans</p>
          <h2>
            Know what
            <br />
            you’re signing up for.
          </h2>
          <p>
            Published prices, included models and meaningful limits. Find the details that matter
            before choosing a subscription.
          </p>
          <Link className="catalog-cta" href="/plans">
            Explore plans <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <div className="catalog-shortlist">
            <span>A few places to begin</span>
            {plans.map((p) => (
              <Link key={p.id} href={`/plans/${p.id}`}>
                <span>{p.name}</span>
                <span>{publicPlanPriceText(p)}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
      <SectionHeader
        eyebrow="On the record"
        title="What’s changed"
        description="Recent recorded changes, dated by when they happened. This is a sourced selection, not a complete news feed."
        actions={
          <Link href="/changelog" className="market-link">
            All updates <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        }
      />
      <div className="catalog-news">
        {latest.map((event) => (
          <article key={event.id}>
            <p className="market-muted">
              <time dateTime={event.occurredAt}>{event.day}</time> · {event.providerName}
            </p>
            <h3>
              <Link href={`/changelog/${event.id}`}>
                {event.title} <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </h3>
            <p>{event.summary}</p>
          </article>
        ))}
      </div>
      <SectionHeader
        title="Make an informed choice"
        description="The evidence and context behind the catalog."
      />
      <div className="catalog-guides">
        {guides.map((g) => (
          <Panel key={g.href}>
            <p className="sr-eyebrow">{g.label}</p>
            <h3>{g.title}</h3>
            <p>{g.detail}</p>
            <Link href={g.href} className="market-link">
              Explore {g.label.toLowerCase()} <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </Panel>
        ))}
      </div>
      <MarketFooter />
    </div>
  );
}
