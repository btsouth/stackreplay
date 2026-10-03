import type { CatalogSourceV1 } from "@stackreplay/catalog";
import { loadPublicCatalog, type PublicCatalog, type PublicPlanSummary } from "./public-catalog";
import { publicOfferObservations } from "./public-offers";
import { type PublicPlanPrice, publicPlanPrice } from "./public-plan-price";
import { type SubscriptionAccess, subscriptionAccess } from "./subscription-access";
import {
  type SubscriptionPublishedTerms,
  subscriptionPublishedTerms,
} from "./subscription-published-terms";

export type DirectoryCatalogPlan = PublicPlanSummary & {
  kind: "catalog_plan";
  publicPrice: PublicPlanPrice;
};
/** Observation provenance is deliberately separate from catalog validity. */
export interface DirectoryPublicOffer {
  kind: "public_offer";
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  publicPrice: PublicPlanPrice;
  checkedAt: string;
  lastVerifiedAt: string;
  sources: readonly CatalogSourceV1[];
  modelAccess?: SubscriptionAccess;
  publishedTerms?: SubscriptionPublishedTerms;
}
export type PublicDirectoryPlan = DirectoryCatalogPlan | DirectoryPublicOffer;
export interface PublicDirectory extends Omit<PublicCatalog, "plans" | "planById"> {
  plans: readonly PublicDirectoryPlan[];
  planById: (id: string) => PublicDirectoryPlan | undefined;
}

/** Only public directory consumers use this wrapper. The base loader never imports it. */
export function loadPublicDirectory(asOf?: string): PublicDirectory {
  const base = loadPublicCatalog(asOf);
  const offers: DirectoryPublicOffer[] = publicOfferObservations(base.asOf).map(
    ({ record, observation }) => {
      const access = subscriptionAccess(record.id, base.asOf);
      const terms = subscriptionPublishedTerms(record.id, base.asOf);
      return {
        kind: "public_offer",
        id: record.id,
        name: record.name,
        providerId: record.providerId,
        providerName: record.providerName,
        publicPrice: observation.price,
        checkedAt: observation.checkedAt,
        lastVerifiedAt: observation.checkedAt,
        sources: observation.sources,
        ...(access ? { modelAccess: access } : {}),
        ...(terms ? { publishedTerms: terms } : {}),
      };
    },
  );
  const plans: PublicDirectoryPlan[] = [
    ...base.plans.map(
      (plan): DirectoryCatalogPlan => ({
        ...plan,
        kind: "catalog_plan",
        publicPrice: publicPlanPrice(plan),
      }),
    ),
    ...offers,
  ];
  const providers = base.providers.map((provider) => ({
    ...provider,
    planIds: [
      ...provider.planIds,
      ...offers.filter((plan) => plan.providerId === provider.id).map((plan) => plan.id),
    ],
  }));
  for (const offer of offers) {
    if (providers.some((provider) => provider.id === offer.providerId)) continue;
    providers.push({
      id: offer.providerId,
      name: offer.providerName,
      planIds: offers.filter((plan) => plan.providerId === offer.providerId).map((plan) => plan.id),
      verificationStatus: "verified",
      lastVerifiedAt: offer.checkedAt,
      sources: offer.sources,
    });
  }
  return {
    ...base,
    plans,
    providers: providers.sort((a, b) => a.name.localeCompare(b.name)),
    planById: (id) => plans.find((plan) => plan.id === id),
  };
}
