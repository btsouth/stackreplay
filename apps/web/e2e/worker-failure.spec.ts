import { expect, test } from "@playwright/test";

/**
 * Worker failure (M3 brief, independent audit).
 *
 * The Worker asset is a same-origin file the page must load; if it cannot start
 * (missing, blocked by policy, or replaced by something that never announces
 * itself) the interface has to say so. Waiting forever behind a "Working…" line
 * is the failure this guards against.
 */

test("a Worker that cannot start reports a safe error instead of waiting forever", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.route("**/stackreplay-worker.js", (route) =>
    route.fulfill({ status: 404, contentType: "text/javascript", body: "// unavailable" }),
  );

  await page.goto("/app/import");
  await page.getByTestId("demo-moderate").click();

  const error = page.getByTestId("import-error");
  await expect(error).toBeVisible({ timeout: 60_000 });
  await expect(error).toContainText("The replay Worker could not be started.");
  await expect(error).toContainText("did not load the local replay Worker");
  // No raw internals, no stack trace, no file content in the message.
  await expect(error).not.toContainText("stackreplay-worker.js");
  await expect(page.getByTestId("import-working")).toHaveCount(0);
});
