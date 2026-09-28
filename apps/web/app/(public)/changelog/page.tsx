import type { Metadata } from "next";
import Link from "next/link";
import { MarketFooter, MarketHeader } from "@/components/public/market-header";
import { SourceList } from "@/components/public/provenance";
import { deriveCatalogChanges, loadPublicCatalog, shortCatalogVersion } from "@/lib/public-catalog";
export const metadata: Metadata = {
  title: "Market updates",
  description:
    "Verified model announcements, subscription additions and catalog changes, with sources and clear dates.",
  alternates: { canonical: "/changelog" },
};
export default function UpdatesPage() {
  const catalog = loadPublicCatalog();
  const changes = deriveCatalogChanges();
  const groups = [
    {
      title: "Open coding subscriptions, now easier to compare",
      description:
        "ClinePass, OpenCode Go and Go Plus have joined the public catalog. Compare price, tool support and published usage terms before choosing a plan.",
      ids: ["clinepass", "opencode-go", "opencode-go-plus"],
    },
    {
      title: "More of your current stack, in one place",
      description:
        "Command Code, Ollama Cloud and Kiro are visible alongside the established coding subscriptions. Published credits remain separate from directly modeled capacity.",
      ids: [
        "command-code-goat",
        "command-code-pro",
        "ollama-cloud-pro",
        "ollama-cloud-max",
        "kiro-pro",
      ],
    },
  ];
  return (
    <div>
      <MarketHeader
        eyebrow="The market / In view"
        title="Know what changed."
        description="New models, subscription options and the facts behind them. A short route from the news to a useful comparison."
      >
        <aside className="market-feature">
          <p className="market-kicker">Two different dates</p>
          <h2>Announced. Then verified.</h2>
          <p>
            Provider announcements and StackReplay catalog updates are labeled separately. A checked
            date is not a claim about when commercial terms began.
          </p>
        </aside>
      </MarketHeader>
      <section className="border-y border-border-strong py-8">
        <div className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div>
            <p className="market-kicker">Model announcement</p>
            <p className="market-muted mt-2">Observed September 28, 2026</p>
          </div>
          <div>
            <h2 className="text-3xl tracking-tight">Claude Sonnet 5.5 arrives.</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              Anthropic has announced Sonnet 5.5. The release is listed here; exact API pricing,
              identifiers and subscription access remain under review. Existing workload prices are
              unchanged.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link href="/models/claude-sonnet-5-5" className="market-link">
                Explore the release ↗
              </Link>
              <a href="https://website.anthropic.com/" className="market-link" rel="noreferrer">
                Anthropic announcement ↗
              </a>
            </div>
          </div>
        </div>
      </section>
      {groups.map((group) => (
        <section
          key={group.title}
          className="grid gap-5 border-b border-border py-8 sm:grid-cols-[12rem_minmax(0,1fr)]"
        >
          <div>
            <p className="market-kicker">Catalog addition</p>
            <p className="market-muted mt-2">September 28, 2026</p>
          </div>
          <div>
            <h2 className="text-2xl tracking-tight">{group.title}</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              {group.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6">
              {group.ids.map((id) => {
                const p = catalog.planById(id);
                return p ? (
                  <Link key={id} href={`/plans/${id}`} className="market-link">
                    {p.name} · ${p.price.amount}/{p.price.interval} ↗
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        </section>
      ))}
      <details className="mt-10 border-y border-border-strong py-4">
        <summary className="min-h-11 cursor-pointer text-lg">
          Catalog changelog & source evidence
        </summary>
        <p className="market-muted my-4">
          Catalog {shortCatalogVersion(catalog.catalogVersion)}. These dates describe catalog rule
          versions; newly recorded offers do not establish historical launch dates.
        </p>
        <ol data-testid="changelog-list">
          {changes.map((change) => (
            <li
              key={`${change.planId}-${change.effectiveFrom}-${change.kind}`}
              className="border-t border-border py-5"
            >
              <p className="market-muted">
                {change.effectiveFrom} · {change.kind.replaceAll("_", " ")}
              </p>
              <Link href={`/plans/${change.planId}`} className="market-link">
                {change.planName} ↗
              </Link>
              <p className="text-sm">{change.summary}</p>
              <details className="mt-2">
                <summary className="min-h-11 cursor-pointer text-sm">
                  Sources and changed models
                </summary>
                {change.modelDetails && <p className="market-muted mb-3">{change.modelDetails}</p>}
                <SourceList sources={change.sources} />
              </details>
            </li>
          ))}
        </ol>
      </details>
      <MarketFooter />
    </div>
  );
}
