import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketFooter } from "@/components/public/market-header";
import { SourceList } from "@/components/public/provenance";
import { basePrice, modelPrices, priceNumber } from "@/lib/market-discovery";
import { modelCapabilities, tokenSize } from "@/lib/model-specifications";
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
  const familyPlans =
    plans.length || !model.familyId
      ? []
      : catalog.plans.filter((plan) =>
          plan.modelRules.some((rule) => rule.model === model.familyId && rule.excluded !== true),
        );
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
                : `${model.developerName ?? "Model"} · ${model.lifecycle === "legacy" ? "Legacy release" : model.lifecycle === "current" ? "Current release" : "Model release"}`}
          </p>
          <p className="market-muted mt-3">Catalog checked {model.lastVerifiedAt}</p>
        </div>
        <aside className="market-model-profile">
          <p className="market-kicker">
            {model.specifications?.contextTokens
              ? "Context window"
              : model.specifications?.maxInputTokens
                ? "Maximum input"
                : "Subscription access"}
          </p>
          <p className="market-profile-number">
            {model.specifications?.contextTokens || model.specifications?.maxInputTokens
              ? tokenSize(model.specifications.contextTokens ?? model.specifications.maxInputTokens)
              : `${plans.length} plans`}
          </p>
          <p className="market-muted">
            {model.specifications?.contextTokens || model.specifications?.maxInputTokens
              ? "tokens · provider specification"
              : "Documented access in this guide"}
          </p>
          <div className="market-capabilities mt-5">
            {modelCapabilities(model).map((capability) => (
              <span key={capability}>{capability}</span>
            ))}
          </div>
        </aside>
      </header>
      {model.kind === "release" && (
        <>
          <div className="market-section-title">
            <span>01 / Standard API price</span>
            <span>USD / 1M tokens</span>
          </div>
          {base && (
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
          )}
          {model.pricingNote && (
            <p className="market-price-note" data-testid="pricing-note">
              {model.pricingNote}
            </p>
          )}
          {base ? (
            <p className="market-muted mb-8">
              Current published base rates. Context tiers, cache-write duration and other conditions
              may change the rate for a request. These are not a reconstructed historical invoice.
            </p>
          ) : !model.pricingNote ? (
            <p className="market-price-note">
              A direct API price for this exact release is not recorded. See its published access
              and sources below.
            </p>
          ) : null}
        </>
      )}
      {model.specifications && (
        <section className="market-specifications" aria-label="Model specifications">
          <div className="market-section-title">
            <span>02 / Capabilities & limits</span>
            <span>Provider specifications</span>
          </div>
          <dl className="market-fact-list">
            {[
              ["Context window", model.specifications.contextTokens?.toLocaleString("en-US")],
              ["Maximum input", model.specifications.maxInputTokens?.toLocaleString("en-US")],
              ["Maximum output", model.specifications.maxOutputTokens?.toLocaleString("en-US")],
              ["Input", model.specifications.inputModalities?.join(" · ")],
              ["Output", model.specifications.outputModalities?.join(" · ")],
              ["Knowledge cutoff", model.specifications.knowledgeCutoff],
              [
                "Tool calling",
                model.specifications.toolCalling === undefined
                  ? undefined
                  : model.specifications.toolCalling
                    ? "Supported"
                    : "Not supported",
              ],
              [
                "Structured output",
                model.specifications.structuredOutput === undefined
                  ? undefined
                  : model.specifications.structuredOutput
                    ? "Supported"
                    : "Not supported",
              ],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          {model.specifications.notes?.map((note) => (
            <p key={note} className="market-muted mt-4 max-w-3xl">
              {note}
            </p>
          ))}
        </section>
      )}
      <div className="market-section-title">
        <span>
          {model.kind === "family" ? "01" : model.specifications ? "03" : "02"} / Where you can use
          it
        </span>
        <span>
          {apis.length
            ? `${apis.length} API ${apis.length === 1 ? "route" : "routes"}`
            : "Published access"}
          {plans.length ? ` · ${plans.length} subscriptions` : ""}
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
      {familyPlans.length > 0 && (
        <section className="my-6">
          <h2 className="text-base font-medium">Plans with {model.familyName} family access</h2>
          <p className="market-muted mt-2 max-w-3xl">
            The provider lists family access for these plans. Availability of this exact release can
            depend on rollout and the model picker.
          </p>
          {familyPlans.map((plan) => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="flex justify-between gap-4 border-b border-border py-4 hover:text-accent"
            >
              <span>{plan.name}</span>
              <span className="font-mono text-sm">
                ${plan.price.amount} / {plan.price.interval} ↗
              </span>
            </Link>
          ))}
        </section>
      )}
      {!model.places.length && !familyPlans.length && (
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
          {model.specifications && <SourceList sources={model.specifications.sources} />}
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
