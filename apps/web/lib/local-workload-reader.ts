import { listImports } from "./idb";
import type { ImportRecord } from "./worker-protocol";
import { isSyntheticWorkload } from "./workload-kind";

/**
 * Loaded on demand by `local-workload.ts`: the storage layer and its schemas
 * stay out of the public pages until a saved workload is known to exist.
 *
 * The visitor's own workload is the newest saved one that is not a demo, the
 * same choice My Stack makes. Its stored summary is enough for the homepage;
 * the event payload is never opened here.
 */
export async function readPersonalWorkload(): Promise<{
  record: ImportRecord | undefined;
  demoOnly: boolean;
}> {
  const records = await listImports();
  const own = records.filter(
    (record) => !isSyntheticWorkload(record) && record.savedLocally !== false,
  );
  return { record: own[0], demoOnly: own.length === 0 && records.length > 0 };
}
