import { StatTile } from "@stackreplay/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketFooter, MarketHeader } from "@/components/public/market-header";
import { SourceList, VerificationBadge } from "@/components/public/provenance";
import { formatCatalogDate } from "@/lib/catalog-copy";
import { marketEventHref, updateListHref } from "@/lib/market/update-selection";
import { planTools, planUsage } from "@/lib/market-discovery";
import { modelCapabilities, modelContext, tokenSize } from "@/lib/model-specifications";
import type { PublicModelSummary } from "@/lib/public-catalog";
import { publicPlanPriceText } from "@/lib/public-plan-price";
import { loadPublicProviderDirectory } from "@/lib/public-providers";
import { publicPageMetadata } from "@/lib/site";

interface Props {
  params: Promise<{ providerId: string }>;
}
export function generateStaticParams() {
  return loadPublicProviderDirectory().providers.map((provider) => ({ providerId: provider.id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { providerId } = await params;
  const provider = loadPublicProviderDirectory().providerById(providerId);
  if (!provider) notFound();
  return publicPageMetadata({
    title: provider.name,
    description: `${provider.name}: developed models, recorded API access, published plans and sourced updates.`,
    path: `/providers/${providerId}`,
  });
}
function ModelRows({ models, empty }: { models: readonly PublicModelSummary[]; empty: string }) {
  if (!models.length) return <p className="market-muted py-5">{empty}</p>;
  return (
    <div className="provider-model-grid">
      {models.map((model) => {
        const context = model.kind === "family" ? undefined : modelContext(model);
        return (
          <article key={model.id} className="provider-story-card" data-testid="provider-model">
            <h3 className="text-lg">
              <Link href={`/models/${model.id}`} className="hover:text-accent">
                {model.name} ↗
              </Link>
            </h3>
            <p className="market-muted mt-2">
              {model.kind === "family" ? "Family identity" : "Model release"} ·{" "}
              {model.lifecycle ?? "Lifecycle not recorded"}
            </p>
            {model.kind === "release" && (
              <p className="mt-2 text-sm">
                {context?.value === undefined
                  ? "Context / max input not recorded"
                  : `${tokenSize(context.value)} ${context.label}`}{" "}
                ·{" "}
                {model.releaseDate === undefined
                  ? "Release date not recorded"
                  : `Released ${formatCatalogDate(model.releaseDate.date)}`}
              </p>
            )}
            {model.kind === "release" && modelCapabilities(model).length > 0 && (
              <p className="market-muted mt-2">{modelCapabilities(model).join(" · ")}</p>
            )}
            <p className="market-muted mt-2">
              Identity checked {formatCatalogDate(model.lastVerifiedAt)}. Access and pricing details
              on the model page.
            </p>
          </article>
        );
      })}
    </div>
  );
}
export default async function ProviderPage({ params }: Props) {
  const { providerId } = await params;
  const data = loadPublicProviderDirectory();
  const provider = data.providerById(providerId);
  if (!provider) notFound();
  const models = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const model = data.directory.modelById(id);
      return model ? [model] : [];
    });
  const developed = models(provider.developedModelIds);
  const plans = provider.planIds.flatMap((id) => {
    const plan = data.directory.planById(id);
    return plan ? [plan] : [];
  });
  const apiModels = models(provider.apiModelIds);
  const events = data.events.filter((event) => provider.eventIds.includes(event.id));
  const sections = [
    {
      id: "developed-models",
      label: "Developed models",
      count: developed.length,
      empty: "No developed models recorded.",
    },
    {
      id: "recorded-api",
      label: "Recorded API access",
      count: apiModels.length,
      empty: "No API access recorded in this public view.",
    },
    {
      id: "published-plans",
      label: "Published plans and offers",
      count: plans.length,
      empty: "No current public plans or offers recorded.",
    },
    {
      id: "provider-updates",
      label: "Updates",
      count: events.length,
      empty: "No accepted provider updates recorded.",
    },
  ];
  const emptySections = sections.filter((section) => section.count === 0);
  return (
    <div className="market-provider-hub">
      <Link href="/providers" className="market-link">
        ← Providers
      </Link>
      <MarketHeader
        compact
        eyebrow="Inside the catalog"
        title={provider.name}
        description="Explore this provider’s models, API access and coding plans. Each section links to the published evidence, including what is still unknown."
      >
        <aside className="provider-coverage-summary">
          <p className="market-kicker">Recorded coverage</p>
          <div className="provider-summary-stats">
            <StatTile
              label="Developed releases"
              value={developed.filter((m) => m.kind === "release").length}
              hint="Current and legacy releases"
            />
            <StatTile
              label="Published plans & offers"
              value={plans.length}
              hint="Sourced subscription records"
            />
          </div>
          <p className="market-muted">
            Coverage in this catalog, not a complete inventory of the provider.
          </p>
        </aside>
      </MarketHeader>
      <nav aria-label="Provider sections" className="market-section-jumps">
        {[...sections.filter((section) => section.count > 0), ...emptySections].map((section) => (
          <a key={section.id} href={`#${section.id}`} className="market-link">
            {section.label} ↓
          </a>
        ))}
        <a href="#provider-sources" className="market-link">
          Sources ↓
        </a>
      </nav>
      {developed.length > 0 && (
        <section aria-labelledby="developed-models" className="mt-8">
          <h2 id="developed-models" className="market-section-title">
            Developed models
          </h2>
          <p className="market-muted">
            {developed.filter((model) => model.kind === "release").length} releases ·{" "}
            {
              developed.filter((model) => model.kind === "release" && model.lifecycle === "legacy")
                .length
            }{" "}
            legacy releases · {developed.filter((model) => model.kind === "family").length} family
            records
          </p>
          <ModelRows models={developed} empty="No developed models recorded." />
        </section>
      )}
      {apiModels.length > 0 && (
        <section aria-labelledby="recorded-api" className="mt-10">
          <h2 id="recorded-api" className="market-section-title">
            Recorded API access
          </h2>
          <p className="market-muted">
            This public view records some API access routes. It is not a complete endpoint
            inventory. Pricing belongs to the access route shown on each model page.
          </p>
          <ModelRows models={apiModels} empty="No API access recorded in this public view." />
        </section>
      )}
      {plans.length > 0 && (
        <section aria-labelledby="published-plans" className="mt-10">
          <h2 id="published-plans" className="market-section-title">
            Published plans and offers
          </h2>
          {plans.map((plan) => (
            <article key={plan.id} className="provider-story-card" data-testid="provider-plan">
              <h3 className="text-lg">
                <Link href={`/plans/${plan.id}`} className="hover:text-accent">
                  {plan.name} ↗
                </Link>
              </h3>
              <p className="mt-2 text-lg break-words">{publicPlanPriceText(plan)}</p>
              {plan.publishedTerms?.billingSummary && (
                <p className="mt-2 text-sm">{plan.publishedTerms.billingSummary}</p>
              )}
              <p className="market-muted mt-2">
                {planTools(plan).length
                  ? `Works with ${planTools(plan).join(" · ")}`
                  : "Tool compatibility not recorded."}
              </p>
              <p className="mt-2 text-sm">{planUsage(plan)}</p>
              {plan.publishedTerms?.availabilityNote && (
                <p className="mt-2 text-sm text-warning">{plan.publishedTerms.availabilityNote}</p>
              )}
              {plan.kind === "public_offer" && (
                <p className="market-muted mt-2">
                  Informational offer · Workload Replay unavailable.
                </p>
              )}
              <p className="market-muted mt-2">
                {plan.kind === "public_offer" ? "Offer observed" : "Plan checked"}{" "}
                {formatCatalogDate(plan.lastVerifiedAt)}
              </p>
              <div className="mt-3">
                <SourceList sources={plan.sources} />
              </div>
            </article>
          ))}
        </section>
      )}
      <p className="mt-8">
        <Link
          className="market-link"
          href={updateListHref({
            providerId: provider.id,
            category: "all",
            providerRecognized: true,
          })}
        >
          All updates from {provider.name}
        </Link>
      </p>
      {events.length > 0 && (
        <section aria-labelledby="provider-updates" className="mt-10">
          <h2 id="provider-updates" className="market-section-title">
            Updates
          </h2>
          <p className="market-muted">
            Accepted updates from this provider, ordered by when they occurred.
          </p>
          {events.map((event) => (
            <article key={event.id} className="provider-story-card" data-testid="provider-update">
              <p className="market-kicker">
                {formatCatalogDate(event.day)} · {event.typeLabel} · {event.status}
              </p>
              <h3 className="mt-2 text-lg">
                <Link className="hover:text-accent" href={marketEventHref(event.id)}>
                  {event.title} ↗
                </Link>
              </h3>
              <p className="mt-2 text-sm">{event.summary}</p>
              {event.effectiveAt && (
                <p className="market-muted mt-2">
                  {event.status === "scheduled" ? "Scheduled for" : "Effective"}{" "}
                  {formatCatalogDate(event.effectiveAt.slice(0, 10))}
                </p>
              )}
              <p className="market-muted mt-2">
                Event checked {formatCatalogDate(event.verifiedAt.slice(0, 10))} ·{" "}
                <a
                  className="market-link"
                  href={event.source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {event.source.title} ↗
                </a>
              </p>
            </article>
          ))}
        </section>
      )}
      {emptySections.length > 0 && (
        <aside className="market-provider-empty" aria-labelledby="no-provider-records">
          <h2 id="no-provider-records" className="market-kicker">
            No records in this public view
          </h2>
          <p className="market-muted market-provider-empty-note">
            Recorded absence is not evidence of absence from the market.
          </p>
          {emptySections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h3 id={section.id}>{section.label}</h3>
              <p className="market-muted">{section.empty}</p>
            </section>
          ))}
        </aside>
      )}
      <section aria-labelledby="provider-sources" className="mt-10">
        <h2 id="provider-sources" className="market-section-title">
          {provider.evidence.kind === "provider_record"
            ? "Provider identity sources"
            : "Publisher offer sources"}
        </h2>
        {provider.evidence.kind === "provider_record" ? (
          <div className="my-4">
            <VerificationBadge
              status={provider.evidence.verificationStatus}
              lastVerifiedAt={provider.evidence.lastVerifiedAt}
            />
            <p className="market-muted mt-2">
              This check covers the provider identity. Models, plans and events carry their own
              sources and dates.
            </p>
          </div>
        ) : (
          <p className="market-muted my-4">
            Publisher identity comes from the sourced public offers below. No separate provider
            identity check is recorded.
          </p>
        )}
        <SourceList sources={provider.evidence.sources} />
      </section>
      <MarketFooter />
    </div>
  );
}
