import { expect, test } from "@playwright/test";
import { captureRequests, importDemo, PRIVATE_MARKERS, runReplay } from "./helpers";

/**
 * Network privacy (M3 brief).
 *
 * This asserts observable browser behaviour rather than the absence of an API
 * route: every request made during import and replay is recorded, and no
 * request body may carry imported events, token history, or any project or
 * session hash. Next.js asset and navigation traffic is expected and is
 * distinguished by carrying none of those markers.
 */

test("no imported data is uploaded during import or replay", async ({ page }) => {
  const requests = captureRequests(page);

  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");

  const offenders = requests.filter((request) => {
    if (request.body === null || request.body.length === 0) return false;
    return PRIVATE_MARKERS.some((marker) => request.body?.includes(marker));
  });
  expect(offenders.map((request) => `${request.method} ${request.url}`)).toEqual([]);

  // No request may target an import/upload endpoint at all.
  const uploadLike = requests.filter((request) =>
    /\/api\/(import|upload|events|usage)/u.test(request.url),
  );
  expect(uploadLike.map((request) => request.url)).toEqual([]);

  // Every request must stay on our own origin.
  const foreign = requests.filter((request) => !request.url.startsWith("http://localhost:3100"));
  expect(foreign.map((request) => request.url)).toEqual([]);

  // The Worker is a same-origin asset; it must have been loaded and used.
  const workerLoaded = requests.some((request) => request.url.includes("stackreplay-worker.js"));
  expect(workerLoaded).toBe(true);
});

test("the privacy claim survives a large import", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "one large-import privacy run is enough");
  test.setTimeout(180_000);

  const { path } = await import("./fixtures/large-export").then((module) =>
    module.ensureLargeExport(),
  );
  const requests = captureRequests(page);

  await page.goto("/app/import");
  await page.getByTestId("import-file-input").setInputFiles(path);
  await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 150_000 });

  const offenders = requests.filter((request) => {
    if (request.body === null || request.body.length === 0) return false;
    return (
      request.body.includes("nativeSessionHash") ||
      request.body.includes("nativeEventHash") ||
      request.body.includes('"events":[')
    );
  });
  expect(offenders.map((request) => `${request.method} ${request.url}`)).toEqual([]);
});
