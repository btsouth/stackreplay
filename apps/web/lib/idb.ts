import type { StackReplayExportV1 } from "@stackreplay/schema";
import type { ImportRecord } from "./worker-protocol";

/**
 * Browser-local persistence (M3 brief).
 *
 * IndexedDB only, never localStorage, and only inside the browser: there is no
 * server persistence path in this app. What is stored is the canonical
 * sanitized export the app validated, plus the metadata needed to list and
 * reopen it. The original raw file is not kept as a second copy.
 *
 * Every failure mode is explicit: unavailable storage, missing records and
 * corrupted entries are reported as typed results rather than thrown strings.
 */

const DATABASE_NAME = "stackreplay";
const DATABASE_VERSION = 1;
const IMPORTS_STORE = "imports";
const PAYLOADS_STORE = "payloads";
const SUPPORTED_PAYLOAD_VERSION = 1;

export type StorageResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "STORAGE_UNAVAILABLE" | "STORAGE_CORRUPT" | "IMPORT_NOT_FOUND" | "IMPORT_CANCELLED";
    };

/**
 * Generation of the local store, bumped by every delete and clear.
 *
 * Without it, an import that was still running when the user deleted local data
 * finished afterwards and wrote the record back: the deletion looked successful
 * and the workload reappeared on the next page load (benchmark finding F007). A
 * write is refused when the store was cleared, or when the very record being
 * written was deleted, after the moment it started.
 */
let generation = 0;
/**
 * Ids deleted since the store opened, each with the generation that removed it.
 *
 * A coarse "the store changed" flag was enough to stop a deleted workload from
 * being written back by an import that had already started, but it also refused
 * imports that had nothing to do with the deletion. A tombstone names the record
 * that went away, so deleting workload B cannot cancel an unrelated import of A
 * (benchmark finding F007).
 */
const tombstones = new Map<string, number>();
/** Generation of the last full clear, or -1 when nothing has been cleared. */
let clearedGeneration = -1;

/**
 * Registers the intent to delete or clear *now*, before the store work itself is
 * queued.
 *
 * A deletion must stop an import that is already running as soon as the user asks
 * for it, not when the deletion reaches the front of the queue: the queue can be
 * behind a long import, and by then that import would have written the very
 * record the user just removed (benchmark finding F007). Callers that queue
 * storage work call this first; `deleteImport` and `clearLocalData` are the store
 * work itself.
 */
export function invalidateInFlightWrites(importId?: string): void {
  generation += 1;
  if (importId === undefined) {
    clearedGeneration = generation;
    tombstones.clear();
    return;
  }
  tombstones.set(importId, generation);
}

/**
 * The store's state as observed before a long-running write begins. Pass it back
 * to `saveImport` so the write can refuse to undo a delete that happened while it
 * was working.
 */
export function localStoreGeneration(): StoreGeneration {
  return { generation, clearedGeneration, tombstones: new Map(tombstones) };
}

export interface StoreGeneration {
  generation: number;
  clearedGeneration: number;
  tombstones: ReadonlyMap<string, number>;
}

/**
 * True when the store changed under `observed` in a way that makes writing
 * `importId` wrong: it was cleared, or that exact id was deleted.
 */
function writeWouldResurrect(observed: StoreGeneration, importId: string): boolean {
  if (clearedGeneration > observed.clearedGeneration) return true;
  const deletedAt = tombstones.get(importId);
  return deletedAt !== undefined && deletedAt > observed.generation;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMPORTS_STORE)) {
        database.createObjectStore(IMPORTS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(PAYLOADS_STORE)) {
        database.createObjectStore(PAYLOADS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB request failed"));
  });
}

/**
 * Runs `run` inside ONE transaction spanning every listed store, and resolves
 * only once that transaction has committed.
 *
 * A store-at-a-time helper (one transaction per store) made the metadata record
 * and the payload it describes independently durable: a failure between the two
 * left a listing with no payload, or a payload nothing could reach. One
 * transaction makes the pair atomic (benchmark finding F005).
 */
async function withStores<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeNames, mode);
    let committed = false;
    const finished = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        committed = true;
        resolve();
      };
      transaction.onabort = () => reject(transaction.error ?? new Error("transaction aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("transaction failed"));
    });
    let result: T;
    try {
      result = await run(transaction);
    } catch (error) {
      // A request that fails aborts the whole transaction; wait for the abort so
      // the caller's rejection cannot race a later open.
      await finished.catch(() => undefined);
      throw error;
    }
    if (!committed) await finished;
    return result;
  } finally {
    database.close();
  }
}

function storeOf(transaction: IDBTransaction, storeName: string): IDBObjectStore {
  return transaction.objectStore(storeName);
}

export async function storageAvailable(): Promise<boolean> {
  try {
    const database = await openDatabase();
    database.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Stores the validated export plus its listing metadata, as one unit.
 *
 * `options.observed` is `localStoreGeneration()` as read when the import started.
 * If the store was cleared, or this record was deleted, in the meantime, the write
 * is refused (`IMPORT_CANCELLED`) instead of resurrecting what the user removed.
 */
export async function saveImport(
  record: ImportRecord,
  exported: StackReplayExportV1,
  options: { observed?: StoreGeneration } = {},
): Promise<StorageResult<ImportRecord>> {
  const observed = options.observed;
  if (observed !== undefined && writeWouldResurrect(observed, record.id)) {
    return { ok: false, code: "IMPORT_CANCELLED" };
  }
  try {
    // Both stores are written in one transaction: a reader can never see the
    // listing without its payload, which is what two transactions allowed
    // (benchmark finding F005).
    return await withStores([IMPORTS_STORE, PAYLOADS_STORE], "readwrite", async (transaction) => {
      if (observed !== undefined && writeWouldResurrect(observed, record.id)) {
        // Checked inside the transaction too: the delete can land between the
        // first check and the write.
        transaction.abort();
        throw new Error("import cancelled");
      }
      await requestToPromise(storeOf(transaction, PAYLOADS_STORE).put({ id: record.id, exported }));
      await requestToPromise(storeOf(transaction, IMPORTS_STORE).put(record));
      return { ok: true as const, value: record };
    });
  } catch {
    if (observed !== undefined && writeWouldResurrect(observed, record.id)) {
      return { ok: false, code: "IMPORT_CANCELLED" };
    }
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/** Lists stored imports, newest first. Corrupted entries are dropped, not shown. */
export async function listImports(): Promise<ImportRecord[]> {
  try {
    const records = await withStores(IMPORTS_STORE, "readonly", (transaction) =>
      requestToPromise(storeOf(transaction, IMPORTS_STORE).getAll() as IDBRequest<unknown[]>),
    );
    return records
      .filter((value): value is ImportRecord => isImportRecord(value))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  } catch {
    return [];
  }
}

/** Loads a stored export. Unknown or incompatible payloads fail safely. */
export async function loadImport(importId: string): Promise<StorageResult<StackReplayExportV1>> {
  try {
    const stored = await withStores(PAYLOADS_STORE, "readonly", (transaction) =>
      requestToPromise(storeOf(transaction, PAYLOADS_STORE).get(importId) as IDBRequest<unknown>),
    );
    if (stored === undefined) return { ok: false, code: "IMPORT_NOT_FOUND" };
    const payload = stored as { exported?: unknown };
    const exported = payload.exported as { version?: unknown; events?: unknown } | undefined;
    if (
      exported === undefined ||
      exported.version !== SUPPORTED_PAYLOAD_VERSION ||
      !Array.isArray(exported.events)
    ) {
      return { ok: false, code: "STORAGE_CORRUPT" };
    }
    return { ok: true, value: exported as StackReplayExportV1 };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/**
 * Removes an import and its payload together, and invalidates imports still
 * running: after this returns, nothing that began earlier can write the record
 * back.
 */
export async function deleteImport(importId: string): Promise<StorageResult<true>> {
  try {
    await withStores([IMPORTS_STORE, PAYLOADS_STORE], "readwrite", async (transaction) => {
      await requestToPromise(storeOf(transaction, PAYLOADS_STORE).delete(importId));
      await requestToPromise(storeOf(transaction, IMPORTS_STORE).delete(importId));
      return true as const;
    });
    return { ok: true, value: true };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/**
 * Removes every locally stored workload. Deletion is real, not a flag, and it is
 * itself atomic across both stores: a half-cleared database used to be possible
 * (benchmark findings F005 and F007).
 */
export async function clearLocalData(): Promise<StorageResult<true>> {
  try {
    await withStores([IMPORTS_STORE, PAYLOADS_STORE], "readwrite", async (transaction) => {
      await requestToPromise(storeOf(transaction, PAYLOADS_STORE).clear());
      await requestToPromise(storeOf(transaction, IMPORTS_STORE).clear());
      return true as const;
    });
    return { ok: true, value: true };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

function isImportRecord(value: unknown): value is ImportRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<ImportRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.label === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.eventCount === "number" &&
    typeof record.summary === "object" &&
    record.summary !== null
  );
}

/** Opaque local identifier: never derived from workload content. */
export function createLocalImportId(random: () => number = Math.random): string {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
