import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { BUNDLED_CATALOG_VERSION, bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { summarizeExport } from "../lib/workload-summary";
import { importDemo } from "./premium-app-helpers";

const pricingDone = async (page: import("@playwright/test").Page) => {
  await expect(page.getByTestId("overview-api-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("project-table")).toBeVisible();
};

test("reload reuses computed pricing instead of starting another evaluator", async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const phases: string[] = [];
    Object.assign(window, { workloadPhases: phases });
    window.Worker = class extends NativeWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        this.addEventListener("message", ({ data }) => {
          if (data?.type === "OPTIMIZER_PHASE") phases.push(data.phase);
        });
      }
    };
  });
  await importDemo(page, "moderate");
  await pricingDone(page);
  await page.reload();
  await pricingDone(page);
  expect(
    await page.evaluate(() => (window as unknown as { workloadPhases: string[] }).workloadPhases),
  ).toEqual([]);
});

test("slow analysis has labeled placeholders without blank or hidden sections", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      override postMessage(message: unknown) {
        if (["ANALYZE_WORKLOAD", "API_MARKET"].includes((message as { type: string }).type))
          setTimeout(() => super.postMessage(message), 3500);
        else super.postMessage(message);
      }
    };
  });
  await importDemo(page, "moderate");
  await expect(page.getByTestId("workload-loading-status")).toContainText(
    "Preparing your workload",
  );
  await expect(page.getByTestId("workload-loading-status")).toContainText(
    "Not rescanning your folders",
  );
  await expect(page.getByTestId("overview-price-loading")).toBeVisible();
  await expect(page.getByTestId("project-loading")).toBeVisible();
  expect(
    await page
      .getByTestId("project-loading")
      .locator(".h-3")
      .first()
      .evaluate((bar) => getComputedStyle(bar).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  await expect(page.getByTestId("analysis-loading")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await pricingDone(page);
  await expect(page.getByTestId("workload-loading-status")).toHaveCount(0);
  await expect(page.getByTestId("project-loading")).toHaveCount(0);
});

test("failed analysis stops placeholders while pricing remains usable", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message, ...args: unknown[]) {
      if (message?.type === "ANALYZE_WORKLOAD") {
        queueMicrotask(() =>
          this.dispatchEvent(
            new MessageEvent("message", {
              data: {
                type: "ERROR",
                requestId: message.requestId,
                error: {
                  code: "STORAGE_UNAVAILABLE",
                  title: "Unavailable",
                  message: "Fixture read failure",
                },
              },
            }),
          ),
        );
        return;
      }
      return original.call(this, message, ...(args as [StructuredSerializeOptions]));
    };
  });
  await importDemo(page, "moderate");
  await expect(page.getByTestId("workload-error")).toBeVisible();
  await expect(page.getByTestId("overview-api-total")).toHaveText("$5.93 – $6.10");
  await expect(page.getByTestId("project-loading")).toHaveCount(0);
  await expect(page.getByTestId("analysis-loading")).toHaveCount(0);
  await expect(page.getByTestId("workload-loading-status")).toHaveCount(0);
});

test("importing another workload preserves cached results for the earlier workload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const phases: string[] = [];
    Object.assign(window, { workloadPhases: phases });
    window.Worker = class extends NativeWorker {
      constructor(...args: ConstructorParameters<typeof Worker>) {
        super(...args);
        this.addEventListener("message", ({ data }) => {
          if (data?.type === "OPTIMIZER_PHASE") phases.push(data.phase);
        });
      }
    };
  });
  await importDemo(page, "moderate");
  await pricingDone(page);
  const original = page.url();
  await importDemo(page, "heavy");
  await expect(page.getByTestId("project-table")).toBeVisible();
  await page.goto(original);
  await pricingDone(page);
  expect(
    await page.evaluate(() => (window as unknown as { workloadPhases: string[] }).workloadPhases),
  ).toEqual([]);
});

const cachedImportIds = async (page: import("@playwright/test").Page) =>
  page.evaluate(async () => {
    const open = indexedDB.open("stackreplay");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const transaction = database.transaction("workload-results", "readonly");
      const request = transaction.objectStore("workload-results").getAll();
      const entries = await new Promise<{ importId: string }[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return [...new Set(entries.map((entry) => entry.importId))].sort();
    } finally {
      database.close();
    }
  });

for (const removal of ["delete", "corrupt"] as const) {
  test(`${removal} removes only the affected workload's cached results`, async ({ page }) => {
    await importDemo(page, "moderate");
    await pricingDone(page);
    const original = page.url();
    const survivor = new URL(original).searchParams.get("import");
    await importDemo(page, "heavy");
    await expect(page.getByTestId("workload-loading-status")).toHaveCount(0);
    const affectedUrl = page.url();
    const affected = new URL(affectedUrl).searchParams.get("import");
    if (!survivor || !affected) throw new Error("Fixtures need two stored workloads");
    await expect.poll(() => cachedImportIds(page)).toEqual([survivor, affected].sort());

    if (removal === "delete") {
      await page.goto("/app/scan");
      await page.getByTestId(`delete-menu-${affected}`).locator("summary").click();
      await page.getByTestId(`delete-import-${affected}`).click();
      await expect(page.getByTestId(`delete-import-${affected}`)).toHaveCount(0);
    } else {
      await page.evaluate(async (id) => {
        const open = indexedDB.open("stackreplay");
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        try {
          await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction("payloads", "readwrite");
            transaction.objectStore("payloads").put({
              id,
              exported: { version: 99, events: "not-an-array" },
            });
            transaction.oncomplete = () => resolve();
            transaction.onabort = () => reject(transaction.error);
            transaction.onerror = () => reject(transaction.error);
          });
        } finally {
          database.close();
        }
      }, affected);
      await page.goto(affectedUrl);
      await expect(page.getByTestId("workload-error")).toBeVisible();
    }

    await expect.poll(() => cachedImportIds(page)).toEqual([survivor]);
    await page.goto(original);
    await pricingDone(page);
    await page.goto("/app/scan");
    await page.getByTestId("clear-local-data").click();
    await page.getByTestId("clear-local-data-confirm").click();
    await expect(page.getByTestId("no-stored-imports")).toBeVisible();
    await expect.poll(() => cachedImportIds(page)).toEqual([]);
  });
}

/** Opens the local database in the page and reports its version and stores. */
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

/** How many derived result entries the browser's bounded store holds. */
const cachedResultCount = (page: import("@playwright/test").Page) =>
  page.evaluate(async () => {
    const open = indexedDB.open("stackreplay");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const transaction = database.transaction("workload-results", "readonly");
      const request = transaction.objectStore("workload-results").count();
      return await new Promise<number>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
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
  // ask for version 3 and the migration, not a fresh install, is what runs.
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

  // The app opens version 3 for the first time here; it must migrate, not reset.
  await page.goto("/app/scan");
  await expect(page.getByTestId("stored-imports")).toBeVisible();
  await expect(page.getByTestId("stored-imports")).toContainText(record.label);

  const upgraded = await localDatabaseShape(page);
  expect(upgraded.version).toBe(3);
  expect(upgraded.stores).toContain("workload-results");

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

test("real worker writes never leave more than eight cached results", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one full sequence is enough");
  test.setTimeout(120_000);

  // Waits until the real worker has finished both the analysis (profile) and the
  // market pricing (decision) for the current import. Each cached computation is
  // written before its result is posted, so an idle page means the write landed.
  const settled = async () => {
    await expect(page.getByTestId("workload-loading-status")).toHaveCount(0);
    await expect(page.getByTestId("analysis-loading")).toHaveCount(0);
    await expect(page.getByTestId("project-loading")).toHaveCount(0);
    await expect(page.getByTestId("overview-price-loading")).toHaveCount(0);
    await expect(page.getByTestId("project-table")).toBeVisible();
  };

  const presets = ["moderate", "heavy", "multistack"] as const;
  const sequence = [...presets, ...presets, ...presets];
  // Each import is a fresh local id, so every analysis writes distinct result
  // keys through the real worker. Nine imports guarantee more than the eight
  // entries the store may hold, whichever cached computations each one runs.
  for (const preset of sequence) {
    await importDemo(page, preset);
    await settled();
  }
  // Reaching the cap proves the eviction actually ran; the bound is the guarantee.
  await expect.poll(() => cachedResultCount(page)).toBe(8);
  expect(await cachedResultCount(page)).toBeLessThanOrEqual(8);
});
