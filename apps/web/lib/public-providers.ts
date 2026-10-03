import type { CatalogSourceV1, ProviderV1 } from "@stackreplay/catalog";
import { sortByOccurrence } from "@stackreplay/market-events";
import { type MarketEventView, marketEventViews } from "./market/events";
import {
  isSyntheticCatalogId,
  lifecycleRank,
  loadCatalog,
  loadPublicCatalog,
} from "./public-catalog";
import { loadPublicDirectory, type PublicDirectory } from "./public-directory";
import { comparePublicPlanPrices } from "./public-plan-price";

export type ProviderEvidence =
  | {
      kind: "provider_record";
      verificationStatus: ProviderV1["verificationStatus"];
      lastVerifiedAt: string;
      sources: readonly CatalogSourceV1[];
    }
  | { kind: "offer_publisher"; sources: readonly CatalogSourceV1[] };
export interface PublicProviderHub {
  id: string;
  name: string;
  evidence: ProviderEvidence;
  developedModelIds: readonly string[];
  apiModelIds: readonly string[];
  planIds: readonly string[];
  eventIds: readonly string[];
}
export interface PublicProviderDirectory {
  asOf: string;
  providers: readonly PublicProviderHub[];
  providerById: (id: string) => PublicProviderHub | undefined;
  directory: PublicDirectory;
  events: readonly MarketEventView[];
}

/** Exact public relationships only. No alias, endpoint or source-host inference. */
export function buildPublicProviderDirectory({
  providers: records,
  directory,
  events,
}: {
  providers: readonly ProviderV1[];
  directory: PublicDirectory;
  events: readonly MarketEventView[];
}): PublicProviderDirectory {
  const identities = new Map<string, Pick<PublicProviderHub, "id" | "name" | "evidence">>();
  for (const provider of records) {
    if (isSyntheticCatalogId(provider.id)) continue;
    identities.set(provider.id, {
      id: provider.id,
      name: provider.name,
      evidence: {
        kind: "provider_record",
        verificationStatus: provider.verificationStatus,
        lastVerifiedAt: provider.lastVerifiedAt,
        sources: provider.sources,
      },
    });
  }
  for (const offer of directory.plans) {
    if (
      offer.kind !== "public_offer" ||
      isSyntheticCatalogId(offer.id) ||
      isSyntheticCatalogId(offer.providerId) ||
      identities.has(offer.providerId)
    )
      continue;
    const publisher = directory.providers.find((entry) => entry.id === offer.providerId);
    if (!publisher) throw new Error(`Missing public offer publisher: ${offer.providerId}`);
    const sources = directory.plans
      .filter(
        (plan) =>
          plan.kind === "public_offer" &&
          !isSyntheticCatalogId(plan.id) &&
          plan.providerId === offer.providerId,
      )
      .flatMap((plan) => plan.sources);
    const unique = [
      ...new Map(
        sources.map((source) => [`${source.url}:${source.title}:${source.checkedAt}`, source]),
      ).values(),
    ];
    identities.set(offer.providerId, {
      id: offer.providerId,
      name: publisher.name,
      evidence: { kind: "offer_publisher", sources: unique },
    });
  }
  const models = directory.models
    .filter((model) => !isSyntheticCatalogId(model.id))
    .slice()
    .sort(
      (a, b) =>
        lifecycleRank(a.lifecycle) - lifecycleRank(b.lifecycle) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
  const plans = directory.plans
    .filter((plan) => !isSyntheticCatalogId(plan.id))
    .slice()
    .sort(comparePublicPlanPrices);
  const publicEvents = sortByOccurrence(
    events.filter(
      (event) => !isSyntheticCatalogId(event.id) && !isSyntheticCatalogId(event.providerId),
    ),
  );
  const check = (id: string | undefined) => {
    if (id !== undefined && !isSyntheticCatalogId(id) && !identities.has(id))
      throw new Error(`Missing public provider: ${id}`);
  };
  for (const model of models) {
    check(model.developerId);
    for (const place of model.places) if (place.kind === "api") check(place.providerId);
  }
  for (const plan of plans) check(plan.providerId);
  for (const event of publicEvents) check(event.providerId);
  const ids = (values: readonly { id: string }[]) => [...new Set(values.map((value) => value.id))];
  const providers = [...identities.values()]
    .map(
      (identity): PublicProviderHub => ({
        ...identity,
        developedModelIds: ids(models.filter((model) => model.developerId === identity.id)),
        apiModelIds: ids(
          models.filter((model) =>
            model.places.some((place) => place.kind === "api" && place.providerId === identity.id),
          ),
        ),
        planIds: ids(plans.filter((plan) => plan.providerId === identity.id)),
        eventIds: ids(publicEvents.filter((event) => event.providerId === identity.id)),
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return {
    asOf: directory.asOf,
    providers,
    providerById: (id) => providers.find((provider) => provider.id === id),
    directory,
    events: publicEvents,
  };
}

export function loadPublicProviderDirectory(asOf?: string): PublicProviderDirectory {
  const base = loadPublicCatalog(asOf);
  return buildPublicProviderDirectory({
    providers: Object.values(loadCatalog().providers),
    directory: loadPublicDirectory(base.asOf),
    events: marketEventViews(base),
  });
}
