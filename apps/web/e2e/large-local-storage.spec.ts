import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { importDemo } from "./premium-app-helpers";

async function replaceWithBlob(page: Page, id: string, damaged = false) {
  await page.evaluate(
    ({ id, damaged }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("stackreplay");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const transaction = db.transaction("payloads", "readwrite");
          const store = transaction.objectStore("payloads");
          const read = store.get(id);
          read.onsuccess = () =>
            store.put({
              id,
              format: "json-blob-v1",
              revision: crypto.randomUUID(),
              json: new Blob([damaged ? "broken" : JSON.stringify(read.result.exported)], {
                type: "application/json",
              }),
            });
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onabort = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    { id, damaged },
  );
}

async function exportedBytes(page: Page, id: string) {
  await page.goto(`/app/settings?import=${id}`);
  const download = page.waitForEvent("download");
  await page
    .getByTestId(`settings-scan-${id}`)
    .getByRole("button", { name: "Export scan" })
    .click();
  const path = await (await download).path();
  if (!path) throw new Error("export download");
  return readFile(path);
}

test("Blob storage restores the recap and preserves export bytes", async ({ page }) => {
  await importDemo(page, "moderate");
  const id = new URL(page.url()).searchParams.get("import");
  if (!id) throw new Error("fixture id");
  const before = await exportedBytes(page, id);
  await replaceWithBlob(page, id);
  await page.goto(`/app/recap?import=${id}&period=all`);
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  expect(await exportedBytes(page, id)).toEqual(before);
});

test("a damaged Blob is removed without deleting another saved scan", async ({ page }) => {
  await importDemo(page, "moderate");
  const damaged = new URL(page.url()).searchParams.get("import");
  await importDemo(page, "heavy");
  const survivor = new URL(page.url()).searchParams.get("import");
  if (!damaged || !survivor) throw new Error("fixture ids");
  await replaceWithBlob(page, damaged, true);
  await page.goto(`/app/recap?import=${damaged}`);
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.goto("/app/settings");
  await expect(page.getByTestId(`settings-scan-${damaged}`)).toHaveCount(0);
  await expect(page.getByTestId(`settings-scan-${survivor}`)).toBeVisible();
  await page.goto(`/app/recap?import=${survivor}&period=all`);
  await expect(page.getByTestId("recap-ready")).toBeVisible();
});
