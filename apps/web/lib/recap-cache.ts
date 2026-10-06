import { BUNDLED_CATALOG_VERSION } from "@stackreplay/catalog/bundled";
import { historyGeneration, sessionHistoryRecord, subscribeHistory } from "./local-history";
import { localCalendar } from "./recap-calendar";
import type { Recap, RecapPeriod } from "./recap";
import type { RecapIndex } from "./recap-index";
import { buildRecapFromIndex } from "./recap-index-read";
import { getWorkerClient } from "./worker-client";
import { readRecapIndex, recapPayloadRevision } from "./idb";

// Bounded to the currently opened histories. Each entry holds three small Recaps,
// while persisted daily aggregates survive full reloads and worker termination.
interface Entry {
  revision: string;
  index: RecapIndex;
  recaps: Map<string, Recap>;
}
const entries = new Map<string, Entry>();
const pending = new Map<string, Promise<Entry>>();
const workers = new Map<Worker, () => void>();
subscribeHistory(() => {
  entries.clear();
  pending.clear();
  for (const cancel of workers.values()) cancel();
  workers.clear();
});
function remember(id: string, revision: string, index: RecapIndex) {
  const entry = { revision, index, recaps: new Map<string, Recap>() };
  entries.delete(id);
  entries.set(id, entry);
  while (entries.size > 3) entries.delete(entries.keys().next().value!);
  return entry;
}
const currentKey = (index: RecapIndex, now: string) =>
  JSON.stringify([localCalendar(index.timeZone)(now).date, now.slice(0, 10)]);
function fresh(index: RecapIndex, now: string, timeZone: string) {
  return (
    index.version === 1 &&
    index.catalogVersion === BUNDLED_CATALOG_VERSION &&
    index.timeZone === timeZone &&
    index.date === localCalendar(timeZone)(now).date &&
    (!index.validUntil || Date.parse(now) < Date.parse(index.validUntil)) &&
    Date.parse(now) >= Date.parse(index.asOf)
  );
}
function result(entry: Entry, period: RecapPeriod, now: string) {
  const key = `${period}:${currentKey(entry.index, now)}`;
  let recap = entry.recaps.get(key);
  if (!recap) {
    recap = buildRecapFromIndex(entry.index, period, now);
    entry.recaps.set(key, recap);
  }
  return recap;
}
function rebuild(id: string, now: string, timeZone: string) {
  const key = JSON.stringify([
    id,
    localCalendar(timeZone)(now).date,
    timeZone,
    historyGeneration(),
  ]);
  const old = pending.get(key);
  if (old) return old;
  const generation = historyGeneration();
  const promise = new Promise<Entry>((resolve, reject) => {
    const worker = new Worker("/stackreplay-recap-worker.js", {
      type: "module",
      name: "stackreplay-recap-index",
    });
    const timeout = setTimeout(
      () => finish(new Error("Could not read this history. Reload to try again.")),
      120000,
    );
    const finish = (error?: Error, entry?: Entry) => {
      clearTimeout(timeout);
      workers.delete(worker);
      worker.terminate();
      error ? reject(error) : resolve(entry!);
    };
    workers.set(worker, () => finish(new Error("This history changed. Open it again.")));
    worker.onmessage = (
      message: MessageEvent<{ index?: RecapIndex; revision?: string; error?: string }>,
    ) => {
      if (message.data.error || !message.data.index || generation !== historyGeneration())
        finish(new Error(message.data.error ?? "This history changed. Open it again."));
      else finish(undefined, remember(id, message.data.revision ?? "session", message.data.index));
    };
    worker.onerror = () => finish(new Error("Could not read this history. Reload to try again."));
    if (sessionHistoryRecord(id))
      getWorkerClient()
        .exportImport(id)
        .then((bytes) => worker.postMessage({ importId: id, bytes, now, timeZone }, [bytes.buffer]))
        .catch(() => finish(new Error("This history is no longer available.")));
    else worker.postMessage({ importId: id, now, timeZone });
  }).finally(() => {
    if (pending.get(key) === promise) pending.delete(key);
  });
  pending.set(key, promise);
  return promise;
}
/** Paint a previous result while a stale index refreshes; period changes reuse the same index. */
export async function loadCachedRecap(
  id: string,
  period: RecapPeriod,
  now: string,
  timeZone: string,
  onPrevious?: (recap: Recap) => void,
): Promise<Recap> {
  const generation = historyGeneration();
  let entry = entries.get(id);
  if (entry && fresh(entry.index, now, timeZone)) return result(entry, period, now);
  const stored = sessionHistoryRecord(id) ? undefined : await readRecapIndex(id);
  if (generation !== historyGeneration()) throw new Error("This history changed. Open it again.");
  if (!stored && !sessionHistoryRecord(id))
    throw new Error("This history is no longer stored here. Scan your files again.");
  const revision = stored ? recapPayloadRevision(stored.record) : "session";
  if (entry?.revision !== revision) entry = undefined;
  const saved = stored?.rows.find(
    (row) => row.revision === revision && fresh(row.index, now, timeZone),
  );
  if (saved) return result(remember(id, revision, saved.index), period, now);
  const stale = stored?.rows.find((row) => row.index?.version === 1);
  if (!entry && stale) entry = remember(id, stale.revision, stale.index);
  if (entry) {
    try {
      onPrevious?.(result(entry, period, entry.index.asOf));
    } catch {}
  }
  return result(await rebuild(id, now, timeZone), period, now);
}
