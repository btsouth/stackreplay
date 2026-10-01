import { bundledPublicApiProviders } from "@stackreplay/catalog/bundled";
import { type PublicCatalog, planDisplayName } from "../public-catalog";
import { DISCOVERY_FAMILIES } from "../stack-discovery";
import type { HomeCatalogIndex } from "./personal";
import type { FamilyLadders } from "./personal-questions";

/**
 * The catalog facts the homepage's personal islands need, as plain data. The
 * server builds this from the accepted catalog so the browser never loads the
 * catalog itself just to name a model or price a plan.
 */
export function homeCatalogIndex(catalog: PublicCatalog): HomeCatalogIndex {
  return {
    models: Object.fromEntries(
      catalog.models.map((model) => [
        model.id,
        {
          name: model.name,
          ...(model.developerName === undefined ? {} : { developer: model.developerName }),
          ...(model.familyId === undefined ? {} : { familyId: model.familyId }),
        },
      ]),
    ),
    plans: Object.fromEntries(
      catalog.plans.map((plan) => {
        const family = DISCOVERY_FAMILIES.find(
          (entry) =>
            (entry.planIds as readonly string[]).includes(plan.id) ||
            (entry.otherPlanIds as readonly string[]).includes(plan.id),
        )?.groupId;
        return [
          plan.id,
          {
            name: planDisplayName(plan),
            providerName: plan.providerName,
            price: plan.price,
            ...(family === undefined ? {} : { family }),
          },
        ];
      }),
    ),
    apiProviders: Object.fromEntries(
      bundledPublicApiProviders(catalog.asOf).map((provider) => [provider.id, provider.name]),
    ),
  };
}

/**
 * Tiers within the reviewed Claude and ChatGPT families, cheapest published
 * monthly price first. A plan the catalog no longer lists drops out.
 */
export function familyLadders(catalog: PublicCatalog): FamilyLadders {
  const ladder = (groupId: string) =>
    (DISCOVERY_FAMILIES.find((family) => family.groupId === groupId)?.planIds ?? [])
      .flatMap((id) => {
        const plan = catalog.planById(id);
        return plan === undefined ? [] : [{ id, amount: Number(plan.price.amount) }];
      })
      .sort((a, b) => a.amount - b.amount)
      .map((plan) => plan.id);
  return { claude: ladder("claude"), chatgpt: ladder("chatgpt") };
}
