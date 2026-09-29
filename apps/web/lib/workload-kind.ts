import { isSyntheticCatalogId } from "@stackreplay/share";
import type { ImportRecord } from "./worker-protocol";

/**
 * Whether a stored workload is synthetic demo data.
 *
 * Demo exports mark their detected usage sources with "demo data". This also
 * identifies the priced Moderate week, which uses real catalog model IDs.
 * Older example-model demos remain recognizable after import.
 */
export function isSyntheticWorkload(record: Pick<ImportRecord, "summary">): boolean {
  return (
    (record.summary.usageSources.length > 0 &&
      record.summary.usageSources.every((source) => source.note === "demo data")) ||
    record.summary.models.some(
      (model) =>
        isSyntheticCatalogId(model.rawName) ||
        (model.canonicalId !== undefined && isSyntheticCatalogId(model.canonicalId)),
    )
  );
}
