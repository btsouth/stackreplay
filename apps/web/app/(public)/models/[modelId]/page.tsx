import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketFooter } from "@/components/public/market-header";
import { SourceList } from "@/components/public/provenance";
import { basePrice, modelPrices, priceNumber } from "@/lib/market-discovery";
import { loadPublicCatalog } from "@/lib/public-catalog";

interface Props {
  params: Promise<{ modelId: string }>;
}
export function generateStaticParams() {
  return loadPublicCatalog().models.map((m) => ({ modelId: m.id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modelId } = await params;
  const model = loadPublicCatalog().modelById(modelId);
  return {
    title: model?.name ?? "Model not found",
    description: `${model?.name ?? "Model"}: published API pricing, subscription access and exact identity.`,
    alternates: { canonical: `/models/${modelId}` },
  };
}
export default async function ModelPage({ params }: Props) {
  const { modelId } = await params;
  const catalog = loadPublicCatalog();
  const model = catalog.modelById(modelId);
  if (!model) notFound();
  const prices = modelPrices(modelId, catalog.asOf);
  const base = basePrice(prices);
  const plans = model.places.filter((p) => p.kind === "plan");
  const apis = model.places.filter((p) => p.kind === "api");
  const related = catalog.models.filter(
    (m) =>
      m.kind === "release" &&
      m.id !== model.id &&
      m.familyId === (model.kind === "family" ? model.id : model.familyId) &&
      m.familyId !== undefined,
  );
  return (
    <div>
      <header className="market-header">
        <div>
          <Link href="/models" className="market-kicker">
            Models / {model.developerName ?? "Identity"}
          </Link>
          <h1>{model.name}</h1>
          <p className="market-description" data-testid="model-summary">
            {model.kind === "family"
              ? "A family of model releases."
              : model.verificationStatus === "unknown"
                ? "Newly announced. API identity, pricing and subscription access are under review."
                : `${model.developerName} · ${model.lifecycle === "legacy" ? "Legacy release" : model.lifecycle === "current" ? "Current release" : "Model release"}`}
          </p>
          <p className="market-muted mt-3">Catalog checked {model.lastVerifiedAt}</p>
        </div>
        <aside className="market-feature">
          <p className="market-kicker">Your work / Another possibility</p>
          <h2>Put the model in context.</h2>
          <p>
            See the models you use today, then inspect explicit alternatives in Replay. Translation
            is a scenario you approve, not a quality-equivalence claim.
          </p>
          <Link className="market-link" href="/app/replay">
            Explore workload replays ↗
          </Link>
        </aside>
      </header>
      {model.kind === "release" && (
        <>
          <div className="market-section-title">
            <span>01 / Standard API price</span>
            <span>USD / 1M tokens</span>
          </div>
          <div className="market-detail-stats">
            {(["input", "output", "cacheRead"] as const).map((key, i) => (
              <div key={key}>
                <p className="market-muted mb-2">{["Input", "Output", "Cache read"][i]}</p>
                <p className={base ? "market-stat" : "text-base"}>
                  {priceNumber(base?.rates[key])}
                </p>
              </div>
            ))}
          </div>
          {base ? (
            <p className="market-muted mb-8">
              Current published base rates. Context tiers, cache-write duration and other conditions
              may change the rate for a request. These are not a reconstructed historical invoice.
            </p>
          ) : (
            <p className="market-muted mb-8">
              No single verified current API rate is available here. Missing prices stay unknown.
            </p>
          )}
        </>
      )}
      <div className="market-section-title">
        <span>{model.kind === "family" ? "01" : "02"} / Where you can use it</span>
        <span>
          {apis.length} API routes · {plans.length} subscriptions
        </span>
      </div>
      {apis.map((p) => (
        <div
          key={p.providerId}
          className="flex items-center justify-between border-b border-border py-4"
        >
          <span>{p.label}</span>
          <span className="market-muted">Direct API</span>
        </div>
      ))}
      <div data-testid="model-plan-list">
        {plans.map((p) => (
          <Link
            key={p.planId}
            href={`/plans/${p.planId}`}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 hover:text-accent"
          >
            <span>{p.label}</span>
            <span className="font-mono text-sm">
              {p.price ? `$${p.price.amount} / ${p.price.interval}` : "Price not verified"}{" "}
              <span className="ml-4 text-accent">↗</span>
            </span>
          </Link>
        ))}
      </div>
      {!model.places.length && (
        <p className="market-muted py-5">
          No catalogued plan or API offers this model yet. Access is not inferred from another
          release.
        </p>
      )}
      {related.length > 0 && (
        <section className="mt-10">
          <div className="market-section-title">
            <span>Related releases</span>
            <span>{model.familyName ?? model.name}</span>
          </div>
          {related.map((m) => (
            <Link
              key={m.id}
              href={`/models/${m.id}`}
              className="flex justify-between gap-4 border-b border-border py-4 hover:text-accent"
            >
              <span>{m.name}</span>
              <span className="market-muted">{m.lifecycle ?? "Release"} ↗</span>
            </Link>
          ))}
        </section>
      )}
      <details className="mt-10 border-y border-border-strong py-4">
        <summary className="min-h-11 cursor-pointer text-lg">
          Pricing, assumptions & evidence
        </summary>
        <div className="space-y-6 py-5">
          {prices.map((price) => (
            <section key={price.id}>
              <h2 className="text-base font-medium">
                {price.variantId ?? "Published base rate"}
                {price.endpointId ? ` · ${price.endpointId}` : ""}
              </h2>
              <p className="market-muted mt-2">
                Input {priceNumber(price.rates.input)} · Output {priceNumber(price.rates.output)} ·
                Cache read {priceNumber(price.rates.cacheRead)} · Cache write{" "}
                {price.rates.cacheWrite === undefined &&
                prices.some((p) => p.variantId && p.rates.cacheWrite !== undefined)
                  ? "See duration-specific rates below"
                  : priceNumber(price.rates.cacheWrite)}
              </p>
              {price.tiers?.map((tier) => (
                <p className="market-muted mt-2" key={tier.id}>
                  {tier.label}: input {priceNumber(tier.rates.input)}, output{" "}
                  {priceNumber(tier.rates.output)}, cache read {priceNumber(tier.rates.cacheRead)}.
                </p>
              ))}
              <div className="mt-3">
                <SourceList sources={price.sources} />
              </div>
            </section>
          ))}
          <SourceList sources={model.sources} />
          <p className="market-muted">
            Missing token-category prices are not zero. Workload pricing applies exact recorded
            categories and admitted routes. No benchmark score or quality ranking is inferred from
            prices.
          </p>
        </div>
      </details>
      <details className="border-b border-border-strong py-4" id="identity">
        <summary className="min-h-11 cursor-pointer text-lg">Aliases, routes and identity</summary>
        <div className="space-y-3 pb-4 text-sm">
          <p>
            Catalog ID <code className="break-all">{model.id}</code>
          </p>
          <p>
            {model.kind === "family"
              ? "Family identity record (kind: family)"
              : "Model release (kind: release)"}
          </p>
          <p>Developer: {model.developerName ?? "Not recorded"}</p>
          {model.aliases.length ? (
            model.aliases.map((alias) => (
              <div key={alias.id} className="border-t border-border py-3">
                <code className="break-all">{alias.alias}</code>
                <p className="market-muted">{alias.kind}</p>
                <SourceList sources={alias.sources} />
              </div>
            ))
          ) : (
            <p className="market-muted">No additional exact aliases recorded.</p>
          )}
        </div>
      </details>
      <MarketFooter />
    </div>
  );
}
