import type { ModelAliasV1 } from "@stackreplay/catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceList, VerificationBadge } from "@/components/public/provenance";
import { lifecycleText, priceText, verificationText } from "@/lib/catalog-copy";
import { loadPublicCatalog, type PublicModelPlace } from "@/lib/public-catalog";

interface ModelPageProps {
  params: Promise<{ modelId: string }>;
}

export function generateStaticParams() {
  return loadPublicCatalog().models.map((model) => ({ modelId: model.id }));
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
  const { modelId } = await params;
  const model = loadPublicCatalog().modelById(modelId);
  if (model === undefined) return { title: "Model not found" };
  return {
    title: model.name,
    description:
      model.kind === "family"
        ? `${model.name} is a family name that points to specific releases. See the releases it covers and the exact IDs StackReplay recognizes.`
        : `${model.name}: who develops it, whether it is current, where you can use it, and its exact IDs and sources.`,
    alternates: { canonical: `/models/${model.id}` },
  };
}

const ALIAS_KIND_TEXT: Record<ModelAliasV1["kind"], string> = {
  provider_id: "Model ID the provider issues",
  harness_alias: "Spelling a tool or router uses",
  provider_route: "Same model offered through another provider",
};

function groupPlans(places: readonly PublicModelPlace[]) {
  const groups = new Map<string, PublicModelPlace[]>();
  for (const place of places) {
    if (place.kind !== "plan") continue;
    groups.set(place.providerName, [...(groups.get(place.providerName) ?? []), place]);
  }
  return [...groups.entries()];
}

export default async function ModelDetailPage({ params }: ModelPageProps) {
  const { modelId } = await params;
  const catalog = loadPublicCatalog();
  const model = catalog.modelById(modelId);
  if (model === undefined) notFound();
  const isFamily = model.kind === "family";
  const status = lifecycleText(model.lifecycle);
  const apiPlaces = model.places.filter((place) => place.kind === "api");
  const planGroups = groupPlans(model.places);
  const releases = model.releaseIds
    .map((id) => catalog.modelById(id))
    .filter((release): release is NonNullable<typeof release> => release !== undefined);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="flex flex-col gap-3 border-b border-border-strong pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">
          <Link className="underline-offset-2 hover:underline" href="/models">
            Models
          </Link>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{model.name}</h1>
        <p className="text-base text-foreground" data-testid="model-summary">
          {isFamily
            ? `Family name${model.developerName === undefined ? "" : ` · ${model.developerName}`}`
            : `${model.developerName === undefined ? "Developer not recorded" : `Developed by ${model.developerName}`}${status === undefined ? "" : ` · ${status}`}`}
        </p>
        {!isFamily && model.familyId !== undefined && model.familyName !== undefined ? (
          <p className="text-sm text-muted-foreground">
            Part of the{" "}
            <Link
              className="text-accent underline underline-offset-2"
              href={`/models/${model.familyId}`}
            >
              {model.familyName}
            </Link>{" "}
            family.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {verificationText(model.verificationStatus, model.lastVerifiedAt)}
        </p>
      </header>

      {isFamily ? (
        <section className="flex flex-col gap-3" data-testid="family-explainer">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            A family name, not a model release
          </h2>
          <p className="max-w-[68ch] text-base leading-relaxed text-muted-foreground">
            {model.name} is a family name. Tools and plans use it to mean whichever {model.name}{" "}
            release they point to at the time, so the same name can reach different models on
            different surfaces and dates. StackReplay keeps the name so workloads and plans that use
            it still resolve, but it is not listed with the models.
          </p>
          <h3 className="mt-2 text-base font-medium text-foreground">Releases in this family</h3>
          {releases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No release in the catalog names this family yet.
            </p>
          ) : (
            <ul
              className="flex max-w-3xl flex-col border-t border-border text-sm"
              data-testid="family-releases"
            >
              {releases.map((release) => (
                <li
                  key={release.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-border py-3"
                >
                  <Link
                    className="inline-flex min-h-11 items-center text-accent underline underline-offset-2"
                    href={`/models/${release.id}`}
                  >
                    {release.name}
                  </Link>
                  <span className="text-muted-foreground">
                    {lifecycleText(release.lifecycle) ?? "Status not recorded"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          {isFamily ? "Where this name is used" : "Where you can use it"}
        </h2>
        {model.places.length === 0 ? (
          <p className="max-w-[68ch] text-sm text-muted-foreground">
            No catalogued plan or API offers this model yet. A replay reports it as unmapped rather
            than inventing a price.
          </p>
        ) : null}
        {apiPlaces.length > 0 ? (
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Direct API
            </h3>
            <ul className="mt-2 flex max-w-3xl flex-col border-t border-border text-sm">
              {apiPlaces.map((place) => (
                <li key={place.providerId} className="border-b border-border py-3 text-foreground">
                  {place.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {planGroups.length > 0 ? (
          <div className="flex flex-col gap-4" data-testid="model-plan-list">
            {planGroups.map(([providerName, places]) => (
              <div key={providerName}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {providerName} plans
                </h3>
                <ul className="mt-2 flex max-w-3xl flex-col border-t border-border text-sm">
                  {places.map((place) => (
                    <li
                      key={place.planId}
                      className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-border py-1"
                    >
                      <Link
                        className="inline-flex min-h-11 items-center text-accent underline underline-offset-2"
                        href={`/plans/${place.planId}`}
                      >
                        {place.label}
                      </Link>
                      {place.price === undefined ? null : (
                        <span className="text-muted-foreground">{priceText(place.price)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6" id="identity">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Aliases, routes and identity
        </h2>
        <dl className="grid max-w-4xl gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
          <dt className="text-muted-foreground">Catalog ID</dt>
          <dd className="break-all font-mono text-foreground">{model.id}</dd>
          <dt className="text-muted-foreground">Record type</dt>
          <dd className="text-foreground">
            {isFamily ? "Family identity record (kind: family)" : "Model release (kind: release)"}
          </dd>
          <dt className="text-muted-foreground">Developer</dt>
          <dd className="text-foreground">
            {model.developerId === undefined ? (
              "Not recorded. The catalog does not infer a developer from where a model is offered."
            ) : (
              <>
                {model.developerName}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  ({model.developerId})
                </span>
              </>
            )}
          </dd>
          {isFamily ? null : (
            <>
              <dt className="text-muted-foreground">Lifecycle</dt>
              <dd className="text-foreground">{status ?? "Not recorded"}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Offered through</dt>
          <dd className="text-foreground">
            {model.providerIds.length === 0
              ? "No offering route recorded"
              : model.providerIds.map((id, index) => (
                  <span key={id}>
                    {index === 0 ? "" : ", "}
                    {model.providerNames[index]}{" "}
                    <span className="font-mono text-xs text-muted-foreground">({id})</span>
                  </span>
                ))}
          </dd>
          {model.familyId === undefined ? null : (
            <>
              <dt className="text-muted-foreground">Family record</dt>
              <dd className="break-all font-mono text-foreground">{model.familyId}</dd>
            </>
          )}
        </dl>

        <div>
          <h3 className="text-base font-medium text-foreground">Exact aliases</h3>
          {model.aliases.length === 0 ? (
            <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
              No alias is declared. The catalog ID and the name resolve exactly; any other spelling
              stays unresolved in a replay.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {model.aliases.map((alias) => (
                <li
                  key={alias.id}
                  className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <div>
                    <p className="break-all font-mono text-xs text-foreground">{alias.alias}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ALIAS_KIND_TEXT[alias.kind]}
                      {alias.harness === undefined ? "" : ` · ${alias.harness}`}
                    </p>
                  </div>
                  <SourceList sources={alias.sources} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-base font-medium text-foreground">Sources</h3>
          <SourceList sources={model.sources} />
          <VerificationBadge
            status={model.verificationStatus}
            lastVerifiedAt={model.lastVerifiedAt}
          />
        </div>
      </section>
    </div>
  );
}
