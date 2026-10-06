/**
 * Names of the browser-local IndexedDB store, shared by the storage layer
 * (`idb.ts`) and the homepage's presence probe (`local-workload.ts`). Kept in a
 * module with no imports so reading them never loads the storage schemas.
 */
export const LOCAL_DATABASE_NAME = "stackreplay";
// Version 4 adds recap indexes and fences clients that only understand structured-cloned payloads.
// Older workers must fail to open this DB rather than leave undeleted derived data.
// Existing stores and historical rows remain untouched by the upgrade.
export const LOCAL_DATABASE_VERSION = 4;
export const WORKLOAD_RESULTS_STORE = "workload-results";
export const IMPORTS_STORE = "imports";
export const PAYLOADS_STORE = "payloads";
export const RECAP_INDEXES_STORE = "recap-indexes";
