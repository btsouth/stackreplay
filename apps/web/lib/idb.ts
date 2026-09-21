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
  | { ok: false; code: "STORAGE_UNAVAILABLE" | "STORAGE_CORRUPT" | "IMPORT_NOT_FOUND" };

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

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = await run(store);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error("transaction aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("transaction failed"));
    });
    return result;
  } finally {
    database.close();
  }
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

/** Stores the validated export plus its listing metadata. */
export async function saveImport(
  record: ImportRecord,
  exported: StackReplayExportV1,
): Promise<StorageResult<ImportRecord>> {
  try {
    await withStore(PAYLOADS_STORE, "readwrite", (store) =>
      requestToPromise(store.put({ id: record.id, exported })),
    );
    await withStore(IMPORTS_STORE, "readwrite", (store) => requestToPromise(store.put(record)));
    return { ok: true, value: record };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/** Lists stored imports, newest first. Corrupted entries are dropped, not shown. */
export async function listImports(): Promise<ImportRecord[]> {
  try {
    const records = await withStore(IMPORTS_STORE, "readonly", (store) =>
      requestToPromise(store.getAll() as IDBRequest<unknown[]>),
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
    const stored = await withStore(PAYLOADS_STORE, "readonly", (store) =>
      requestToPromise(store.get(importId) as IDBRequest<unknown>),
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

export async function deleteImport(importId: string): Promise<StorageResult<true>> {
  try {
    await withStore(PAYLOADS_STORE, "readwrite", (store) =>
      requestToPromise(store.delete(importId)),
    );
    await withStore(IMPORTS_STORE, "readwrite", (store) =>
      requestToPromise(store.delete(importId)),
    );
    return { ok: true, value: true };
  } catch {
    return { ok: false, code: "STORAGE_UNAVAILABLE" };
  }
}

/** Removes every locally stored workload. Deletion is real, not a flag. */
export async function clearLocalData(): Promise<StorageResult<true>> {
  try {
    await withStore(PAYLOADS_STORE, "readwrite", (store) => requestToPromise(store.clear()));
    await withStore(IMPORTS_STORE, "readwrite", (store) => requestToPromise(store.clear()));
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
