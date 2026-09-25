import { expect, test } from "@playwright/test";
import {
  captureRequests,
  importDemo,
  PRIVATE_MARKERS,
  runReplay,
  WORKLOAD_MARKERS,
} from "./helpers";

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

  // A bodyless review is not enough: a leak could ride in the URL, its query
  // string or a request header instead of a body.
  const markerInUrl = requests.filter((request) =>
    WORKLOAD_MARKERS.some((marker) => request.url.includes(marker)),
  );
  expect(markerInUrl.map((request) => request.url)).toEqual([]);

  const markerInHeaders = requests.filter((request) =>
    WORKLOAD_MARKERS.some((marker) =>
      Object.entries(request.headers).some(
        ([key, value]) => key.includes(marker) || value.includes(marker),
      ),
    ),
  );
  expect(markerInHeaders.map((request) => request.url)).toEqual([]);

  // Nothing is posted anywhere: import and replay send no request bodies at all.
  const withBody = requests.filter((request) => (request.body ?? "").length > 0);
  expect(withBody.map((request) => `${request.method} ${request.url}`)).toEqual([]);

  // No request may target an import/upload endpoint at all.
  const uploadLike = requests.filter((request) =>
    /\/api\/(import|upload|events|usage)/u.test(request.url),
  );
  expect(uploadLike.map((request) => request.url)).toEqual([]);

  // Every request must stay on our own origin.
  const origin = new URL(page.url()).origin;
  const foreign = requests.filter((request) => !request.url.startsWith(origin));
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
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
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

/**
 * Regression (benchmark F032): "your workload never leaves the browser" was a
 * behavioural property with no runtime control behind it. The policy is what
 * stops a future change, an injected script or a dependency from opening a
 * connection, so it is asserted here as a page property.
 */
test("every page is served under a policy that blocks outbound connections", async ({
  request,
}) => {
  for (const path of ["/", "/app", "/app/replay", "/s/not-a-token"]) {
    const response = await request.get(path);
    const headers = response.headers();
    const policy = headers["content-security-policy"] ?? "";
    expect(policy, `no policy on ${path}`).toContain("default-src 'self'");
    // connect-src 'self' is the control that keeps imported data in the browser:
    // no fetch, XHR, WebSocket or beacon may target another origin.
    expect(policy, `connect-src on ${path}`).toContain("connect-src 'self'");
    expect(policy, `worker-src on ${path}`).toContain("worker-src 'self'");
    expect(policy, `object-src on ${path}`).toContain("object-src 'none'");
    expect(policy, `frame-ancestors on ${path}`).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeDefined();
  }
});
