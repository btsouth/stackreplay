import { isSyntheticCatalogId } from "@stackreplay/share";
import type { ImportRecord } from "./worker-protocol";

/**
 * Whether a stored workload is synthetic demo data.
 *
 * The synthetic `example-` models exist only in StackReplay's own demo
 * fixtures, so a workload that records any of them is a demo, whatever else it
 * contains, and a real history never does. Demo targets are offered to demo
 * workloads only: beside a real history they would read as real plans.
 */
export function isSyntheticWorkload(record: Pick<ImportRecord, "summary">): boolean {
  return record.summary.models.some(
    (model) =>
      isSyntheticCatalogId(model.rawName) ||
      (model.canonicalId !== undefined && isSyntheticCatalogId(model.canonicalId)),
  );
}
