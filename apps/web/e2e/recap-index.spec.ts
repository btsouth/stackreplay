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
    ["stats", "recap-ready"],
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
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  await expect
    .poll(async () => (await indexes(page))[0]?.index.catalogVersion)
    .toBe(original.index.catalogVersion);
  await page.goto("/app/scan");
  await page.getByTestId("clear-local-data").click();
  await page.getByTestId("clear-local-data-confirm").click();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
  expect(await indexes(page)).toEqual([]);
});

for (const route of ["recap", "stats"] as const)
  test(`${route} keeps the previous result visible until its worker replaces the stale index`, async ({
    page,
  }) => {
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
        const store = tx.objectStore("recap-indexes");
        const read = store.getAll();
        read.onsuccess = () => {
          for (const row of read.result) {
            row.index.catalogVersion = "stale";
            // An intentionally different previous result proves the UI is replaced too.
            for (const day of row.index.days) {
              day.total = 1;
              day.output = 1;
              for (const model of day.models) {
                model.total = 1;
                model.output = 1;
              }
            }
            store.put(row);
          }
        };
        tx.oncomplete = () => resolve();
      });
      db.close();
    });
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/stackreplay-recap-worker.js", async (request) => {
      await held;
      await request.continue();
    });
    await page.goto(`/app/${route}?import=${id}&period=all`);
    const ready = page.getByTestId("recap-ready");
    await expect(ready).toBeVisible();
    expect((await indexes(page))[0]!.index.catalogVersion).toBe("stale");
    const previous = await ready.textContent();
    release();
    await expect
      .poll(async () => (await indexes(page))[0]?.index.catalogVersion)
      .toBe(original.index.catalogVersion);
    await expect.poll(() => ready.textContent()).not.toBe(previous);
    await expect(ready).toBeVisible();
  });

test("a new import replaces the cached selection and persists its own index", async ({ page }) => {
  await importDemo(page, "moderate");
  const previousId = new URL(page.url()).searchParams.get("import")!;
  const previous = await page.getByTestId("recap-ready").textContent();
  await importDemo(page, "heavy");
  const id = new URL(page.url()).searchParams.get("import")!;
  expect(id).not.toBe(previousId);
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  expect(await page.getByTestId("recap-ready").textContent()).not.toBe(previous);
  expect(await indexes(page)).toHaveLength(2);
  await page.goto(`/app/recap?import=${id}&period=all`);
  await expect(page.getByTestId("recap-ready")).toBeVisible();
});

test("cold scan routes load metadata validation without module errors", async ({
  browser,
  baseURL,
}) => {
  for (let visit = 0; visit < 5; visit++) {
    const context = await browser.newContext(baseURL ? { baseURL } : {});
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/app/scan");
    await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
    await page.getByText("Use files or an export instead", { exact: true }).click();
    await expect(page.getByTestId("source-file-input")).toBeEnabled();
    expect(errors).toEqual([]);
    await context.close();
  }
});
