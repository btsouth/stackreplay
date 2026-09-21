import { expect, test } from "@playwright/test";
import { importDemo } from "./helpers";

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
