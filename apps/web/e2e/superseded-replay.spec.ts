import { expect, test } from "@playwright/test";
import { importDemo } from "./helpers";

/**
 * Superseded requests (M3 brief, independent audit).
 *
 * Every request carries a monotonic id and the client drops responses for
 * superseded requests. Dropping a response must not reach the user as a
 * failure: pressing Enter twice in the plan list starts two replays, the first
 * response is superseded, and the surface belongs to the newer run.
 */

test("a superseded replay is never reported as a failure", async ({ page }) => {
  await importDemo(page, "heavy");
  await page.goto("/app/replay");
  await expect(page.getByTestId("workload-strip")).toBeVisible();
  await page.getByTestId("plan-example-cloud-pro").click();
  await page.getByTestId("rules-as-of").fill("2026-09-15");

  // Both replays start in the same tick, so the first response is superseded.
  await page.evaluate(() => {
    const option = document.querySelector('[data-testid="plan-example-cloud-pro"]');
    if (option === null) throw new Error("plan option missing");
    for (let index = 0; index < 2; index += 1) {
      option.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
  });

  const failures: string[] = [];
  for (let index = 0; index < 40; index += 1) {
    // count() never waits, so an absent error card is a fast negative.
    if ((await page.getByTestId("replay-error").count()) > 0) {
      failures.push(
        await page
          .getByTestId("replay-error")
          .innerText({ timeout: 1_000 })
          .catch(() => ""),
      );
    }
    await page.waitForTimeout(100);
  }

  expect(failures).toEqual([]);
  await expect(page.getByTestId("replay-result")).toBeVisible();
  await expect(page.getByTestId("replay-error")).toHaveCount(0);
});
