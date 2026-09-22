/**
 * The synthetic catalog namespace.
 *
 * The catalog is version-controlled product data and also carries a clearly
 * synthetic development set used by demo workloads, fixtures and tests. Public
 * surfaces must never present synthetic data as a real-world claim, so the
 * namespace rule lives here, in the package every surface already depends on, and
 * is applied by the public read model and by the share boundary alike. Two
 * copies of a rule this small is how the two drift apart.
 */

export const SYNTHETIC_CATALOG_PREFIX = "example-";

/** True for the synthetic development namespace (`example-*`). */
export function isSyntheticCatalogId(id: string): boolean {
  return id.startsWith(SYNTHETIC_CATALOG_PREFIX);
}
