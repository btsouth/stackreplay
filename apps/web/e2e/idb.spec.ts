import { rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { BUNDLED_CATALOG_VERSION, bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { summarizeExport } from "../lib/workload-summary";
import { gotoImport, importDemo } from "./premium-app-helpers";

/** How many records and payloads the browser's own database holds. */
async function readStoreCounts(page: import("@playwright/test").Page): Promise<{
  imports: number;
  payloads: number;
}> {
  return await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    if (!databases.some((entry) => entry.name === "stackreplay"))
      return { imports: 0, payloads: 0 };
    return await new Promise<{ imports: number; payloads: number }>((resolve) => {
      const request = indexedDB.open("stackreplay");
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(["imports", "payloads"], "readonly");
        const imports = transaction.objectStore("imports").count();
        const payloads = transaction.objectStore("payloads").count();
        transaction.oncomplete = () =>
          resolve({ imports: imports.result, payloads: payloads.result });
        transaction.onerror = () => resolve({ imports: -1, payloads: -1 });
      };
      request.onerror = () => resolve({ imports: -1, payloads: -1 });
    });
  });
}

/**
 * Browser-local persistence (M3 brief).
 *
 * IndexedDB only: a reload restores the workspace, deletion really deletes, two
 * imports coexist, and a corrupted stored entry fails safely instead of
 * crashing the page.
 */

test("an imported workload survives a reload", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/scan");
  await expect(page.getByTestId("stored-imports")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("stored-imports")).toBeVisible();
  await expect(page.getByTestId("no-stored-imports")).toHaveCount(0);

  await page
    .getByTestId("stored-imports")
    .getByRole("link", { name: /^Open my recap/u })
    .click();
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
});

test("a delayed storage lookup never appears empty or sends the recap through Scan", async ({
  page,
}) => {
  await importDemo(page, "moderate");
  await page.goto("/app/scan");
  const workloadHref = await page
    .locator("[data-testid^='open-import-']")
    .first()
    .getAttribute("href");
  expect(workloadHref).toBeTruthy();

  // Delay only metadata requests. This reproduces the gap between the page
  // painting and IndexedDB answering without constructing a large payload.
  await page.addInitScript(() => {
    const getAll = IDBObjectStore.prototype.getAll;
    IDBObjectStore.prototype.getAll = function (...args: Parameters<typeof getAll>) {
      const request = getAll.apply(this, args);
      if (this.name === "imports") {
        const native = Object.getOwnPropertyDescriptor(IDBRequest.prototype, "onsuccess")!;
        Object.defineProperty(request, "onsuccess", {
          get: () => native.get?.call(request),
          set: (callback: (event: Event) => void) =>
            native.set?.call(request, (event: Event) =>
              setTimeout(() => callback.call(request, event), 900),
            ),
        });
      }
      return request;
    };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      override postMessage(message: unknown) {
        if ((message as { type?: string })?.type === "LIST_LOCAL_IMPORTS") {
          setTimeout(() => super.postMessage(message), 900);
        } else {
          super.postMessage(message);
        }
      }
    };
  });

  await page.goto("/app/scan");
  await expect(page.getByTestId("stored-imports-loading")).toBeVisible();
  await expect(page.getByTestId("no-stored-imports")).toHaveCount(0);
  await expect(page.getByTestId("stored-imports")).toBeVisible();

  await page.goto((workloadHref ?? "/app/recap").replace("/app/recap", "/app/stats"));
  await expect(page.getByTestId("workload-restoring")).toBeVisible();
  await expect(page.getByTestId("workload-empty")).toHaveCount(0);
  await expect(page.getByTestId("stats-ready")).toBeVisible({ timeout: 60_000 });
});

test("deleting a workload removes it from storage, not just from the view", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/scan");
  const stored = page.getByTestId("stored-imports");
  await expect(stored).toBeVisible();

  await page.locator("[data-testid^='delete-menu-'] summary").first().click();
  const deleteButton = page.locator("[data-testid^='delete-import-']").first();
  await deleteButton.click();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();

  // The IndexedDB payload is gone too, not merely hidden.
  const payloadCount = await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    if (!databases.some((entry) => entry.name === "stackreplay")) return 0;
    return await new Promise<number>((resolve) => {
      const request = indexedDB.open("stackreplay");
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("payloads", "readonly");
        const count = transaction.objectStore("payloads").count();
        count.onsuccess = () => resolve(count.result);
        count.onerror = () => resolve(-1);
      };
      request.onerror = () => resolve(-1);
    });
  });
  expect(payloadCount).toBe(0);
});

test("clear local data removes every workload", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/scan");
  await page.getByTestId("clear-local-data").click();
  await page.getByTestId("clear-local-data-confirm").click();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
});

test("two imports coexist without overwriting each other", async ({ page }) => {
  await importDemo(page, "moderate");
  await importDemo(page, "multistack");
  await page.goto("/app/scan");

  const rows = page.getByTestId("stored-imports").locator(":scope > li");
  await expect(rows).toHaveCount(2);
  await expect(page.getByTestId("stored-imports")).toContainText("Demo: moderate");
  await expect(page.getByTestId("stored-imports")).toContainText("Demo: multistack");
});

test("a corrupted payload is rejected when opened and then removed", async ({ page }) => {
  await importDemo(page, "moderate");
  // Corrupt after the import has finished and the page has read the payload.
  await expect(page.getByTestId("stats-ready")).toBeVisible();

  // Replace the stored payload with something incompatible, as an older or
  // broken writer would have left behind.
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("stackreplay");
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(["payloads", "recap-indexes"], "readwrite");
        // A changed source invalidates its derived index; the lazy open validates it.
        transaction.objectStore("recap-indexes").clear();
        const store = transaction.objectStore("payloads");
        const keys = store.getAllKeys();
        keys.onsuccess = () => {
          for (const key of keys.result) {
            store.put({ id: key, exported: { version: 99, events: "not-an-array" } });
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  });

  await page.goto("/app/scan");
  // Listing reads metadata and payload keys only; the full payload is checked
  // when opened, without cloning every saved workload merely to list them.
  await expect(page.getByTestId("stored-imports")).toBeVisible();
  await page
    .getByTestId("stored-imports")
    .getByRole("link", { name: /^Open my recap/u })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /unavailable|no longer stored|scanning the history/ }),
  ).toBeVisible();
  await page.goto("/app/scan");
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
  const count = () =>
    page.evaluate(async () => {
      const open = indexedDB.open("stackreplay");
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const tx = db.transaction(["imports", "payloads"], "readonly");
      const read = (store: string) =>
        new Promise<number>((resolve, reject) => {
          const request = tx.objectStore(store).count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      const counts = await Promise.all([read("imports"), read("payloads")]);
      db.close();
      return counts;
    });
  await expect.poll(count).toEqual([0, 0]);
});

/**
 * Regression (benchmark F007): clearing while an import is running must not leave
 * a workload behind.
 *
 * The import is deliberately slow (a generated export the browser has to read,
 * parse and validate), so the clear provably lands while the import is still
 * running: an import that read the store before the clear must not write its
 * record afterwards, or a cleared browser silently grows a workload again.
 */
test("clearing local data during an import leaves nothing stored", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one slow run is enough");
  test.setTimeout(180_000);

  await importDemo(page, "moderate");
  await gotoImport(page);
  await page.getByRole("checkbox", { name: "Save this scan in this browser" }).check();

  // A browser-sized export, written to a path of this process's own so a parallel
  // spec cannot be regenerating the same file underneath it.
  const source = buildDemoExport("heavy");
  const bundled = {
    ...source,
    events: Array.from({ length: 12 }, (_, copy) =>
      source.events.map((event, index) => ({
        ...event,
        id: `${event.id}-c${copy}-${index}`,
        occurredAt: new Date(Date.parse(event.occurredAt) + copy * 86_400_000).toISOString(),
      })),
    ).flat(),
  };
  const path = join(tmpdir(), `stackreplay-idb-race-${process.pid}.json`);
  await writeFile(path, JSON.stringify(bundled));
  try {
    // The size is the point: the import has to still be running when the clear
    // lands, or the test would only prove that a finished import gets cleared.
    expect((await stat(path)).size).toBeGreaterThan(10 * 1024 * 1024);

    await page.getByTestId("import-file-input").setInputFiles(path);
    await page.getByTestId("clear-local-data").click();
    await page.getByTestId("clear-local-data-confirm").click();

    // The clear takes effect, and the import that was running when the user asked
    // for the store to be cleared is cancelled rather than allowed to write after it.
    await expect(page.getByTestId("scan-instrument")).toHaveCount(0);
    await expect(page.getByTestId("import-error")).toHaveCount(0);
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/app\/scan$/u);
    await expect(page.getByTestId("no-stored-imports")).toBeVisible();

    const counts = await readStoreCounts(page);
    expect(counts.imports).toBe(0);
    expect(counts.payloads).toBe(0);

    await page.reload();
    await expect(page.getByTestId("no-stored-imports")).toBeVisible();
    await expect(page.getByTestId("stored-imports")).toHaveCount(0);
  } finally {
    // A multi-megabyte file must not outlive the run that wrote it, on the
    // passing path or the failing one. The cleanup error is not swallowed into
    // the test result: `rm` on a file this test just wrote does not fail, and
    // `force` covers the case where the write itself never landed.
    await rm(path, { force: true });
  }
});

const localDatabaseShape = (page: import("@playwright/test").Page) =>
  page.evaluate(async () => {
    const open = indexedDB.open("stackreplay");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      return { version: database.version, stores: [...database.objectStoreNames].sort() };
    } finally {
      database.close();
    }
  });

test("a version 1 local database upgrades in place and keeps the saved workload", async ({
  page,
}) => {
  // A genuine canonical pair, built the same way the importer builds one. The
  // database is seeded at version 1 (imports + payloads only) on a document that
  // does not run the app, so the production open is provably the first writer to
  // ask for version 4 and the migration, not a fresh install, is what runs.
  const exported = buildDemoExport("moderate");
  const record = {
    id: "0123456789abcdef0123456789abcdef",
    label: "v1 demo import",
    createdAt: "2026-09-22T12:00:00.000Z",
    eventCount: exported.events.length,
    summary: summarizeExport(exported, BUNDLED_CATALOG_VERSION, bundledModelIdentity()),
  };

  await page.route("**/__seed__", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>seed</title>" }),
  );
  await page.goto("/__seed__");
  const seeded = await page.evaluate(
    async ({ record, exported }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("stackreplay", 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore("imports", { keyPath: "id" });
          db.createObjectStore("payloads", { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(["imports", "payloads"], "readwrite");
          transaction.objectStore("imports").put(record);
          transaction.objectStore("payloads").put({ id: record.id, exported });
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
        return { version: database.version, stores: [...database.objectStoreNames].sort() };
      } finally {
        database.close();
      }
    },
    { record, exported },
  );
  expect(seeded).toEqual({ version: 1, stores: ["imports", "payloads"] });
  await page.unroute("**/__seed__");

  // The app opens version 4 for the first time here; it must migrate, not reset.
  await page.goto("/app/scan");
  await expect(page.getByTestId("stored-imports")).toBeVisible();
  await expect(page.getByTestId("stored-imports")).toContainText(record.label);

  const upgraded = await localDatabaseShape(page);
  expect(upgraded.version).toBe(4);
  expect(upgraded.stores).toContain("workload-results");
  expect(upgraded.stores).toContain("recap-indexes");

  const preserved = await page.evaluate(async (id) => {
    const open = indexedDB.open("stackreplay");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const transaction = database.transaction(["imports", "payloads"], "readonly");
      const read = (store: string) =>
        new Promise((resolve, reject) => {
          const request = transaction.objectStore(store).get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      const [storedRecord, storedPayload] = await Promise.all([read("imports"), read("payloads")]);
      return { storedRecord, storedPayload };
    } finally {
      database.close();
    }
  }, record.id);
  expect(preserved.storedRecord).toEqual(record);
  expect(preserved.storedPayload).toEqual({ id: record.id, exported });
});
