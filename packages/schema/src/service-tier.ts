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
 * What an absent tier means depends on who left it out, and the two are kept
 * apart:
 *
 * - a catalog price record without a tier is a Standard price, because every
 *   record written before tiers existed transcribed a Standard list price;
 * - a Direct API replay target without a tier asks for Standard on purpose
 *   (`replayServiceTierOf`);
 * - an observed or imported call without a recorded tier has an unknown tier
 *   (`observedServiceTierOf`), unless the source's own contract guarantees
 *   Standard. Guessing Standard there would put false precision into an
 *   actual-cost reconstruction.
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

/** A replay target's tier: omitted means Standard, as the caller's explicit default. */
export function replayServiceTierOf(target: {
  serviceTier?: ServiceTierV1 | undefined;
}): ServiceTierV1 {
  return target.serviceTier ?? "standard";
}

export type ObservedServiceTierV1 = ServiceTierV1 | "unknown";

/**
 * The billed tier of an observed or imported call. The resolved tier when the
 * source records one; Standard only when the source's contract says an absent
 * tier is Standard; unknown otherwise. The requested tier alone is never used.
 */
export function observedServiceTierOf(
  observation: ServiceTierObservationV1 | undefined,
  source: { absentTierMeans?: "standard" | undefined } = {},
): ObservedServiceTierV1 {
  const resolved = billedServiceTierOf(observation);
  if (resolved !== undefined) return resolved;
  if (observation?.requested === undefined && source.absentTierMeans === "standard")
    return "standard";
  return "unknown";
}
