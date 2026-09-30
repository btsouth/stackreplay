import { formatCatalogDate } from "../catalog-copy";
import { formatMoney, loadHeroWorkload } from "../hero-workload";
import type { ExampleWorkload } from "./personal";

/**
 * The labelled example in the personal chapter: the homepage's anonymized real
 * workload (`generated/hero-workload.json`, written by the production engine,
 * aggregates only). Only the API figure the engine established is shown; a
 * subscription result whose capacity is unpublished is not turned into one.
 */
export function exampleWorkload(): ExampleWorkload | undefined {
  const hero = loadHeroWorkload();
  const api = hero.targets.find(
    (target) =>
      target.kind === "api" &&
      target.result.class === "published-rate" &&
      target.result.established &&
      target.undecided === 0 &&
      target.unavailable === 0,
  );
  return {
    label: hero.label.toLowerCase().startsWith("anonymized")
      ? hero.label
      : `Anonymized ${hero.label}`,
    source: hero.source,
    from: hero.workload.from,
    to: hero.workload.to,
    rangeDays: hero.workload.rangeDays,
    calls: hero.workload.recordedEvents,
    knownTokens: hero.workload.knownTokens,
    models: hero.workload.modelMix.length,
    api:
      api === undefined || api.result.class !== "published-rate"
        ? undefined
        : {
            name: api.label,
            cost: formatMoney(api.result.cost),
            pricedCalls: api.served,
            rulesAsOf: formatCatalogDate(hero.rulesAsOf),
          },
  };
}
