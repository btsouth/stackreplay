import type { ImportRecord } from "./worker-protocol";

const sessionRecords = new Map<string, ImportRecord>();
const listeners = new Set<() => void>();
let generation = 0;
const channel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("stackreplay-history")
    : undefined;
channel?.addEventListener("message", () => {
  generation++;
  for (const listener of listeners) listener();
});
export const historyGeneration = () => generation;
export function subscribeHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function historyChanged(record?: ImportRecord, deletedId?: string) {
  if (record) {
    if (record.savedLocally === false) sessionRecords.set(record.id, record);
    else sessionRecords.delete(record.id);
  } else if (deletedId) sessionRecords.delete(deletedId);
  else sessionRecords.clear();
  generation++;
  channel?.postMessage("changed");
  for (const listener of listeners) listener();
}
/** Settings and recap navigation do not start the import worker or load event payloads. */
export async function listHistoryMetadata() {
  const { listImports } = await import("./idb");
  try {
    return [...sessionRecords.values(), ...(await listImports())];
  } catch (error) {
    if (sessionRecords.size) return [...sessionRecords.values()];
    throw error;
  }
}
export const sessionHistoryRecord = (id: string) => sessionRecords.get(id);
