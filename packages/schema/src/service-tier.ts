import { z } from "zod";

/**
 * API processing tiers, as a pricing dimension of their own.
 *
 * A provider can sell the same model at several processing tiers (OpenAI's
 * Standard, Batch, Flex, Fast and Ultrafast), each with its own rates and its
 * own availability per model. A tier is never a model: the canonical model id
 * stays the same whichever tier processes the request, and a tier is never a
 * speed multiplier for replay. Marketing speed claims ("up to 8x faster") are
 * display text at most; StackReplay replays recorded demand and does not model
 * completion time.
 *
 * `standard` is the default tier. A price record without a tier is a Standard
 * record, which is what every record written before this dimension existed
 * priced.
 */
export const serviceTierV1Schema = z.enum(["standard", "batch", "flex", "fast", "ultrafast"]);
export type ServiceTierV1 = z.infer<typeof serviceTierV1Schema>;

export const SERVICE_TIERS_V1: readonly ServiceTierV1[] = serviceTierV1Schema.options;

/**
 * Whether a provider offers a tier for one model.
 *
 * `available` is the only state a replay may price against. `preview` is
 * limited access (select customers), `coming_soon` is announced but not
 * offered, and `unavailable` is a documented absence. A tier the catalog does
 * not list for a model is unknown, which is a different fact from any of these.
 */
export const serviceTierAvailabilityV1Schema = z.enum([
  "available",
  "preview",
  "coming_soon",
  "unavailable",
]);
export type ServiceTierAvailabilityV1 = z.infer<typeof serviceTierAvailabilityV1Schema>;

/**
 * The tier a request asked for and the tier the provider says processed it.
 *
 * OpenAI documents that a Fast request can be processed and billed at Standard
 * rates when traffic ramps too quickly, and the response then reports
 * `service_tier: "default"`. The two can therefore differ, and only the
 * resolved tier describes what was billed. No importer reads either value yet,
 * so this shape exists for the rule below rather than for storage.
 */
export interface ServiceTierObservationV1 {
  requested?: ServiceTierV1 | undefined;
  resolved?: ServiceTierV1 | undefined;
}

/**
 * The tier a cost reconstruction may use: the resolved tier, or nothing.
 * The requested tier is never promoted to a billed fact.
 */
export function billedServiceTierOf(
  observation: ServiceTierObservationV1 | undefined,
): ServiceTierV1 | undefined {
  return observation?.resolved;
}
