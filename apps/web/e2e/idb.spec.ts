import { rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { gotoImport, importDemo } from "./helpers";

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
  await page.goto("/app/import");
  await expect(page.getByTestId("stored-imports")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("stored-imports")).toBeVisible();
  await expect(page.getByTestId("no-stored-imports")).toHaveCount(0);

  await page.goto("/app/replay");
  await expect(page.getByTestId("workload-strip")).toBeVisible();
});

test("deleting a workload removes it from storage, not just from the view", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/import");
  const stored = page.getByTestId("stored-imports");
  await expect(stored).toBeVisible();

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
  await page.goto("/app/import");
  await page.getByTestId("clear-local-data").click();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("no-stored-imports")).toBeVisible();
});

test("two imports coexist without overwriting each other", async ({ page }) => {
  await importDemo(page, "moderate");
  await importDemo(page, "multistack");
  await page.goto("/app/import");

  const rows = page.getByTestId("stored-imports").locator("li");
  await expect(rows).toHaveCount(2);
  await expect(page.getByTestId("stored-imports")).toContainText("Demo: moderate");
  await expect(page.getByTestId("stored-imports")).toContainText("Demo: multistack");
});

test("a corrupted stored workload fails safely", async ({ page }) => {
  await importDemo(page, "moderate");

  // Replace the stored payload with something incompatible, as an older or
  // broken writer would have left behind.
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("stackreplay");
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("payloads", "readwrite");
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

  await page.goto("/app/replay");
  await expect(page.getByTestId("workload-strip")).toBeVisible();
  await page.getByTestId("plan-example-cloud-starter").click();
  await page.getByTestId("run-replay").click();

  const error = page.getByTestId("replay-error");
  await expect(error).toBeVisible({ timeout: 30_000 });
  await expect(error).toContainText(/cannot be read|no longer stored/i);
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

    // The clear takes effect, and the import that was running when the user asked
    // for the store to be cleared is cancelled rather than allowed to write after it.
    const failure = page.getByTestId("import-error");
    await expect(failure).toBeVisible({ timeout: 60_000 });
    await expect(failure).toContainText(/cancelled/i);
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
