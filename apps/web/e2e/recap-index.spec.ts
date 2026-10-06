import { expect, type Page, test } from "@playwright/test";
import { importDemo } from "./premium-app-helpers";

async function indexes(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("stackreplay");
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      return await new Promise<
        { revision: string; index: { version: number; catalogVersion: string; timeZone: string } }[]
      >((resolve) => {
        const read = db.transaction("recap-indexes").objectStore("recap-indexes").getAll();
        read.onsuccess = () => resolve(read.result);
      });
    } finally {
      db.close();
    }
  });
}
test("saved indexes serve Recap, Stats and Settings without exporting or opening event payloads", async ({
  page,
}) => {
  await importDemo(page, "moderate");
  const id = new URL(page.url()).searchParams.get("import")!;
  expect(await indexes(page)).toHaveLength(1);
  await page.addInitScript(() => {
    const requests: string[] = [];
    (window as unknown as { localReads: string[] }).localReads = requests;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        requests.push(`worker:${url}`);
      }
    };
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key: IDBValidKey | IDBKeyRange) {
      requests.push(`get:${this.name}`);
      return get.call(this, key);
    };
  });
  for (const [route, ready] of [
    ["recap", "recap-ready"],
    ["stats", "stats-ready"],
    ["settings", "settings-saved"],
  ]) {
    await page.goto(`/app/${route}?import=${id}`);
    await expect(page.getByTestId(ready!)).toBeVisible();
    const reads = await page.evaluate(
      () => (window as unknown as { localReads: string[] }).localReads,
    );
    expect(reads.filter((r) => r.startsWith("worker:") || r === "get:payloads")).toEqual([]);
  }
});
test("a missing or stale index rebuilds lazily, then deletion clears it", async ({ page }) => {
  await importDemo(page, "moderate");
  const id = new URL(page.url()).searchParams.get("import")!;
  const original = (await indexes(page))[0]!;
  await page.evaluate(async () => {
    const open = indexedDB.open("stackreplay");
    const db = await new Promise<IDBDatabase>((resolve) => {
      open.onsuccess = () => resolve(open.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("recap-indexes", "readwrite");
      tx.objectStore("recap-indexes").clear();
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  expect(await indexes(page)).toHaveLength(1);
  await page.evaluate(async () => {
    const open = indexedDB.open("stackreplay");
    const db = await new Promise<IDBDatabase>((resolve) => {
      open.onsuccess = () => resolve(open.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("recap-indexes", "readwrite"),
        store = tx.objectStore("recap-indexes");
      const read = store.getAll();
      read.onsuccess = () => {
        for (const row of read.result) {
          row.index.catalogVersion = "stale";
          store.put(row);
        }
      };
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.goto(`/app/stats?import=${id}`);
  await expect(page.getByTestId("stats-ready")).toBeVisible();
  await expect
    .poll(async () => (await indexes(page))[0]?.index.catalogVersion)
    .toBe(original.index.catalogVersion);
  await page.goto("/app/scan");
  await page.getByTestId("clear-local-data").click();
  await page.getByTestId("clear-local-data-confirm").click();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
  expect(await indexes(page)).toEqual([]);
});
