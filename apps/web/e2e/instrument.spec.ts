import { expect, test } from "@playwright/test";
import { importDemo, runReplay } from "./helpers";

/**
 * The Replay Instrument (M4D). These are the behaviours a visitor or a user
 * depends on and that no unit test can hold: that the composition is operable
 * from the keyboard alone, that a result always belongs to the target currently
 * selected, that reduced motion still reaches the settled state, and that the
 * page does not scroll sideways on a phone.
 */

const INSTRUMENT = '[data-testid="replay-instrument"]';
const SELECTED_TARGET = "exact-subscription";

test.describe("the replay instrument", () => {
  test("keeps every numbered section in narrative DOM order", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByTestId("replay-instrument")).toHaveAttribute("data-phase", "settled");
    expect(
      await page
        .getByTestId("replay-instrument")
        .locator("[data-section-index]")
        .evaluateAll((items) => items.map((item) => item.getAttribute("data-section-index"))),
    ).toEqual(["01", "02", "03", "04", "05", "06", "07"]);

    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    expect(
      await page
        .getByTestId("replay-result")
        .locator("[data-section-index]")
        .evaluateAll((items) => items.map((item) => item.getAttribute("data-section-index"))),
    ).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
  });
  test("settles on a result for the selected target", async ({ page }) => {
    await page.goto("/");
    const instrument = page.locator(INSTRUMENT);
    await expect(instrument).toHaveAttribute("data-phase", "settled", { timeout: 15_000 });

    // The headline figure is the engine's own coverage for this target.
    const figure = instrument.getByTestId("result-figure");
    await expect(figure).toContainText("%");
    await expect(instrument.getByTestId("result-statement")).toBeVisible();
    await expect(instrument.getByTestId("constraint-trace")).toBeVisible();
    await expect(instrument.getByTestId("cost-counterfactual")).toBeVisible();
  });

  test("is operable with the keyboard alone", async ({ page }) => {
    await page.goto("/");
    const trigger = page.locator(`${INSTRUMENT} [data-testid="target-selector"]`);
    await trigger.focus();
    await expect(trigger).toBeFocused();

    const list = page.locator('[data-testid="target-selector-list"]');
    // The server renders the control before its client handler is attached.
    // Retry the real key action until hydration makes it operable.
    await expect
      .poll(async () => {
        await trigger.focus();
        await page.keyboard.press("ArrowDown");
        return list.isVisible();
      })
      .toBe(true);
    const option = list.locator('[role="option"][aria-selected="true"]');
    await expect(option).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("always shows the result of the target selected last", async ({ page }) => {
    await page.goto("/");
    const instrument = page.locator(INSTRUMENT);
    await expect(instrument).toHaveAttribute("data-phase", "settled", { timeout: 15_000 });

    // Change the target several times without waiting for a run to finish: the
    // settling state must belong to the newest selection, never to an earlier one.
    await page.getByTestId("load-target-translated-subscription").click();
    await page.getByTestId("load-target-direct-api").click();
    await page.getByTestId("load-target-exact-subscription").click();

    await expect(instrument).toHaveAttribute("data-phase", "settled", { timeout: 15_000 });
    const selected = await instrument
      .locator('[data-testid="target-selector"]')
      .getAttribute("data-value");
    expect(selected).toBe(SELECTED_TARGET);
    await expect(instrument.getByTestId("execution-stack")).toContainText("subscription");
    // The stack belongs to that target: a subscription target shows its plan row.
    await expect(instrument.getByTestId("stack-plan")).toBeVisible();
  });

  test("reaches the settled state immediately under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const instrument = page.locator(INSTRUMENT);
    // No waiting and no timing tolerance: the state is correct on first paint.
    await expect(instrument).toHaveAttribute("data-phase", "settled");
  });

  test("distinguishes a metered target from an allowance target", async ({ page }) => {
    await page.goto("/");
    const instrument = page.locator(INSTRUMENT);
    await expect(instrument).toHaveAttribute("data-phase", "settled", { timeout: 15_000 });
    await expect(instrument.getByTestId("violations")).toBeVisible();

    await page.getByTestId("load-target-direct-api").click();
    await expect(instrument).toHaveAttribute("data-phase", "settled", { timeout: 15_000 });
    // A Direct API target has no allowance to exceed, so it shows no crossings
    // and no subscription vocabulary.
    await expect(instrument.getByTestId("crossings")).toHaveCount(0);
    await expect(instrument.getByTestId("api-total")).toBeVisible();
  });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(INSTRUMENT)).toHaveAttribute("data-phase", "settled", {
      timeout: 15_000,
    });
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("the instrument in the application", () => {
  test("renders the one result composition from a live import", async ({ page }) => {
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");

    const result = page.getByTestId("replay-result");
    await expect(result).toBeVisible({ timeout: 30_000 });
    // One primary result, not two summaries of the same replay.
    await expect(result.getByTestId("result-settlement")).toHaveCount(1);
    await expect(result.getByTestId("headline-status")).toHaveCount(1);
    for (const panel of [
      "workload-specimen",
      "model-lanes",
      "execution-stack",
      "constraint-trace",
      "outcome-ledger",
      "cost-counterfactual",
      "evidence-ledger",
      "coverage-dimensions",
    ])
      await expect(result.getByTestId(panel)).toHaveCount(1);
    // The detail section is secondary and sits below the panels.
    await expect(result.getByTestId("replay-detail")).toBeVisible();
  });
});
