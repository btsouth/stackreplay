import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiTokenEstimateSection } from "@/components/public/api-token-estimate-section";
import { CopyApiId } from "@/components/public/copy-api-id";
import { MarketFooter } from "@/components/public/market-header";
import { ModelBenchmarks } from "@/components/public/model-benchmarks";
import {
  ModelPricingConditions,
  ModelRateTable,
} from "@/components/public/model-pricing-conditions";
import { ModelServiceTiers } from "@/components/public/model-service-tiers";
import { PromoTag } from "@/components/public/promo-tag";
import { SourceList } from "@/components/public/provenance";
import { apiTokenEstimateForModel } from "@/lib/api-token-estimate-source";
import { basePrice, modelPrices, priceNumber } from "@/lib/market-discovery";
import { MODEL_DECISION_DETAILS } from "@/lib/model-decision-details";
import { modelPlanCount } from "@/lib/model-library";
import { modelCapabilities, modelSpecifications, tokenSize } from "@/lib/model-specifications";
import { loadPublicBenchmarks } from "@/lib/public-benchmarks";
import {
  loadPublicCatalog,
  type PublicModelPlace,
  type PublicPlanSummary,
} from "@/lib/public-catalog";
import { publicPlanPriceText } from "@/lib/public-plan-price";
import { publicPageMetadata } from "@/lib/site";

function PlanAccessPrice({
  plan,
  fallbackPrice,
}: {
  plan: PublicPlanSummary | undefined;
  fallbackPrice?: PublicModelPlace["price"];
}) {
  const price = plan
    ? publicPlanPriceText(plan)
    : fallbackPrice
      ? `$${fallbackPrice.amount} / ${fallbackPrice.interval}`
      : "Price not verified";
  return (
    <div className="w-full shrink-0 sm:w-auto sm:max-w-sm sm:text-right">
      <span className="font-mono text-sm">
        {price} <span className="text-accent">↗</span>
      </span>
      {plan?.publishedTerms?.billingSummary && (
        <p className="market-muted mt-2 sm:ml-auto sm:max-w-sm">
          {plan.publishedTerms.billingSummary}
        </p>
      )}
      {plan?.publishedTerms?.availabilityNote && (
        <p className="mt-2 text-xs text-warning sm:ml-auto sm:max-w-sm">
          {plan.publishedTerms.availabilityNote}
        </p>
      )}
    </div>
  );
}

interface Props {
  params: Promise<{ modelId: string }>;
}
export function generateStaticParams() {
  return loadPublicCatalog().models.map((m) => ({ modelId: m.id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { modelId } = await params;
  const model = loadPublicCatalog().modelById(modelId);
  return publicPageMetadata({
    title: model?.name ?? "Model not found",
    description: `${model?.name ?? "Model"}: published API pricing, subscription access and exact identity.`,
    path: `/models/${modelId}`,
  });
}
export default async function ModelPage({ params }: Props) {
  const { modelId } = await params;
  const catalog = loadPublicCatalog();
  const model = catalog.modelById(modelId);
  if (!model) notFound();
  const specifications = modelSpecifications(model);
  const decisionDetails = MODEL_DECISION_DETAILS[model.id];
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
  const modelIdentifiers = model.aliases.filter((alias) => alias.kind === "provider_id");
  const contextTokens = specifications?.contextTokens ?? specifications?.maxInputTokens;
  // The same records as the sections below; unpublished figures are left out.
  const glance: { label: string; value: string; href?: string; promo?: boolean }[] = [
    { label: "Input $/1M", value: base?.rates.input },
    { label: "Output $/1M", value: base?.rates.output },
  ]
    .filter((item): item is { label: string; value: string } => item.value !== undefined)
    .map((item) => ({ label: item.label, value: priceNumber(item.value), promo: true }));
  if (contextTokens !== undefined)
    glance.push({
      label: specifications?.contextTokens !== undefined ? "Context" : "Max input",
      value: tokenSize(contextTokens),
    });
  if (specifications?.maxOutputTokens !== undefined)
    glance.push({ label: "Max output", value: tokenSize(specifications.maxOutputTokens) });
  if (specifications?.reasoning !== undefined)
    glance.push({ label: "Reasoning", value: specifications.reasoning ? "Yes" : "No" });
  const planCount = modelPlanCount(model);
  if (planCount > 0)
    glance.push({
      label: "Included in",
      value: `${planCount} ${planCount === 1 ? "plan" : "plans"}`,
      href: "#where-to-use",
    });
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
                : `${model.developerName ?? "Model"} · ${model.lifecycle === "legacy" ? "Legacy release" : "Model release"}`}
          </p>
          {model.kind === "release" && (
            <p className="market-muted mt-3">
              Released{" "}
              {model.releaseDate ? (
                <time dateTime={model.releaseDate.date}>{model.releaseDate.date}</time>
              ) : (
                "Not recorded"
              )}
            </p>
          )}
          <p className="market-muted mt-3">Catalog checked {model.lastVerifiedAt}</p>
        </div>
        <aside className="market-model-profile" aria-label="Model identifiers">
          {model.kind === "family" ? (
            <>
              <p className="market-kicker">Releases in this family</p>
              <p className="market-profile-number">{related.length}</p>
              <p className="market-muted">Each release has its own price and access.</p>
            </>
          ) : (
            <>
              <p className="market-kicker">
                {modelIdentifiers.length > 1 ? "Model identifiers" : "Model identifier"}
              </p>
              {modelIdentifiers.length ? (
                <div className="market-api-ids">
                  {modelIdentifiers.map((alias) => (
                    <CopyApiId key={alias.id} value={alias.alias} />
                  ))}
                </div>
              ) : (
                <p className="market-muted mt-3">
                  None recorded for this release.{" "}
                  <a href="#where-to-use" className="market-link">
                    See where to use it
                  </a>
                </p>
              )}
            </>
          )}
          {modelCapabilities(model).length > 0 && (
            <div className="market-capabilities mt-6">
              {modelCapabilities(model).map((capability) => (
                <span key={capability}>{capability}</span>
              ))}
            </div>
          )}
        </aside>
      </header>
      {glance.length > 0 && (
        <dl className="market-glance" aria-label="At a glance" data-testid="model-glance">
          {glance.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>
                {item.href ? <a href={item.href}>{item.value}</a> : item.value}
                {item.promo && <PromoTag promotion={base?.promotion} />}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {model.kind === "release" && (
        <>
          <div className="market-section-title">
            <span>01 / API price</span>
            <span>USD / 1M tokens</span>
          </div>
          {base && (
            <>
              <ModelRateTable prices={prices} />
              <ModelPricingConditions prices={prices} />
            </>
          )}
          <ModelServiceTiers asOf={catalog.asOf} modelId={model.id} />
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
          <ApiTokenEstimateSection estimate={apiTokenEstimateForModel(model.id, catalog.asOf)} />
        </>
      )}
      {specifications && (
        <section className="market-specifications" aria-label="Model specifications">
          <div className="market-section-title">
            <span>02 / Capabilities & limits</span>
            <span>Provider specifications</span>
          </div>
          <dl className="market-fact-list">
            {[
              ["Context window", specifications.contextTokens?.toLocaleString("en-US")],
              ["Maximum input", specifications.maxInputTokens?.toLocaleString("en-US")],
              ["Maximum output", specifications.maxOutputTokens?.toLocaleString("en-US")],
              ["Input", specifications.inputModalities?.join(" · ")],
              ["Output", specifications.outputModalities?.join(" · ")],
              ["Knowledge cutoff", specifications.knowledgeCutoff],
              [
                "Reasoning",
                specifications.reasoning === undefined
                  ? undefined
                  : specifications.reasoning
                    ? "Supported"
                    : "Not supported",
              ],
              [
                "Tool calling",
                specifications.toolCalling === undefined
                  ? undefined
                  : specifications.toolCalling
                    ? "Supported"
                    : "Not supported",
              ],
              [
                "Structured output",
                specifications.structuredOutput === undefined
                  ? undefined
                  : specifications.structuredOutput
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
          {/* A Thinking fact below covers thinking behavior in more detail. */}
          {specifications.notes
            ?.filter(
              (note) =>
                !(
                  decisionDetails?.facts.some((fact) => fact.label === "Thinking") &&
                  /think|reason/iu.test(note)
                ),
            )
            .map((note) => (
              <p key={note} className="market-muted mt-4 max-w-3xl">
                {note}
              </p>
            ))}
        </section>
      )}
      {decisionDetails && (
        <section aria-label="Practical model details" className="my-10">
          <div className="market-section-title">
            <span>Before you choose</span>
            <span>Checked {decisionDetails.checkedAt}</span>
          </div>
          <dl className="market-fact-list market-decision-list">
            {decisionDetails.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <SourceList sources={decisionDetails.sources} />
          </div>
        </section>
      )}
      <ModelBenchmarks data={loadPublicBenchmarks()} modelId={model.id} />
      <div className="market-section-title" id="where-to-use">
        <span>
          {model.kind === "family" ? "01" : specifications ? "03" : "02"} / Where you can use it
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
        {plans.map((p) => {
          const plan = p.planId ? catalog.planById(p.planId) : undefined;
          return (
            <Link
              key={p.planId ?? p.label}
              href={`/plans/${p.planId}`}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 hover:text-accent"
              data-testid="model-plan-row"
              data-plan-id={p.planId}
            >
              <span>{p.label}</span>
              <PlanAccessPrice plan={plan} fallbackPrice={p.price} />
            </Link>
          );
        })}
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
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 hover:text-accent"
              data-testid="family-plan-row"
              data-plan-id={plan.id}
            >
              <span>{plan.name}</span>
              <PlanAccessPrice plan={plan} />
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
              <span className="market-muted">
                {m.lifecycle === "legacy" ? "Legacy" : "Release"} ↗
              </span>
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
          {specifications && <SourceList sources={specifications.sources} />}
          <SourceList sources={[...model.sources, ...(model.releaseDate?.sources ?? [])]} />
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
