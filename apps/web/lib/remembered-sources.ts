/** Earlier builds kept user-authorized directory handles in their own
 * browser-local database so a scan could refresh without choosing the folder
 * again. Source folders are now chosen fresh each time, so the only remaining
 * job is removing that database when local data is cleared. */
const NAME = "stackreplay-authorized-sources";

export function forgetSources(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
