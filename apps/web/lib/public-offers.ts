import { z } from "zod";
import { isSyntheticCatalogId, loadCatalog } from "./public-catalog";
import data from "./public-offers-data.json";

const date = z.iso.date();
const decimal = z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/u);
const source = z.strictObject({
  url: z.url().refine((url) => url.startsWith("https://")),
  title: z.string().trim().min(1),
  checkedAt: date,
});
const money = { currency: z.literal("USD"), interval: z.literal("month") };
const price = z.discriminatedUnion("kind", [
  z.strictObject({ ...money, kind: z.literal("fixed"), amount: decimal }),
  z.strictObject({
    ...money,
    kind: z.literal("per_user"),
    amount: decimal,
    basis: z.literal("licensed_user"),
  }),
  z.strictObject({
    ...money,
    kind: z.literal("base_seat"),
    baseAmount: decimal,
    seatAmount: decimal,
    basis: z.literal("full_developer_seat"),
  }),
]);
const offer = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  name: z.string().trim().min(1),
  providerId: z.string().trim().min(1),
  providerName: z.string().trim().min(1),
  observations: z
    .array(z.strictObject({ checkedAt: date, price, sources: z.array(source).min(1) }))
    .min(1),
});
export type PublicOfferRecord = z.infer<typeof offer>;

/** Web-only validation includes inactive core IDs, not just the public subset. */
export function validatePublicOffers(input: unknown, catalog = loadCatalog()): PublicOfferRecord[] {
  const offers = z.array(offer).parse(input);
  const ids = new Set<string>();
  const names = new Map<string, string>();
  for (const record of offers) {
    if (ids.has(record.id) || isSyntheticCatalogId(record.id) || record.id in catalog.plans)
      throw new Error(`Public offer ID collision: ${record.id}`);
    ids.add(record.id);
    if (
      isSyntheticCatalogId(record.providerId) ||
      (catalog.providers[record.providerId] &&
        catalog.providers[record.providerId]?.name !== record.providerName) ||
      (names.has(record.providerId) && names.get(record.providerId) !== record.providerName)
    )
      throw new Error(`Public offer provider mismatch: ${record.providerId}`);
    names.set(record.providerId, record.providerName);
    const dates = new Set<string>();
    for (const observation of record.observations) {
      if (dates.has(observation.checkedAt)) throw new Error(`Duplicate offer review: ${record.id}`);
      dates.add(observation.checkedAt);
      const domains =
        record.providerId === "google"
          ? ["cloud.google.com", "docs.cloud.google.com", "developers.google.com", "geminicli.com"]
          : record.providerId === "devin"
            ? ["devin.ai", "docs.devin.ai"]
            : [];
      if (
        observation.sources.some(
          (entry) =>
            entry.checkedAt > observation.checkedAt ||
            !domains.includes(new URL(entry.url).hostname),
        )
      )
        throw new Error(`Invalid offer source: ${record.id}`);
    }
  }
  return offers;
}

const records = validatePublicOffers(data);
export function publicOfferObservations(
  asOf: string,
  offers: readonly PublicOfferRecord[] = records,
) {
  date.parse(asOf);
  return offers.flatMap((record) => {
    const observation = record.observations
      .filter((entry) => entry.checkedAt <= asOf)
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
    return observation ? [{ record, observation }] : [];
  });
}
