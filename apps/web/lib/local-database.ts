/**
 * Names of the browser-local IndexedDB store, shared by the storage layer
 * (`idb.ts`) and the homepage's presence probe (`local-workload.ts`). Kept in a
 * module with no imports so reading them never loads the storage schemas.
 */
export const LOCAL_DATABASE_NAME = "stackreplay";
export const LOCAL_DATABASE_VERSION = 2;
export const WORKLOAD_RESULTS_STORE = "workload-results";
export const IMPORTS_STORE = "imports";
export const PAYLOADS_STORE = "payloads";
