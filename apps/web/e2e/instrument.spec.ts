import { expect, type Page, test } from "@playwright/test";
import { importDemo, runReplay } from "./helpers";

/**
 * The Replay Instrument (M4D). These are the behaviours a visitor or a user
 * depends on and that no unit test can hold: that the composition is operable
 * from the keyboard alone, that a result always belongs to the target currently
 * selected, that reduced motion still reaches the settled state, and that the
 * page does not scroll sideways on a phone.
 */

const HERO = '[data-testid="replay-hero"]';

/**
 * Opens the homepage and brings the execution object on screen. The first run
 * starts when the object is visible, so on a phone it waits for the scroll.
 */
async function openHero(page: Page) {
  await page.goto("/");
  const hero = page.locator(HERO);
  await hero.locator(".sr-canvas").scrollIntoViewIfNeeded();
  return hero;
}

test.describe("the homepage replay instrument", () => {
  test("keeps the replay narrative in DOM order", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const hero = await openHero(page);
    await expect(hero).toHaveAttribute("data-run", "resolved");
    const ids = await hero
      .locator(".sr-section-id, .sr-micro")
      .evaluateAll((items) =>
        items.map((item) => item.textContent ?? "").filter((text) => /^0\d \//u.test(text)),
      );
    expect(ids).toEqual([
      "01 / Observed workload",
      "02 / Target execution",
      "03 / Counterfactual result",
      "04 / Recorded demand",
      "05 / Replay readout",
    ]);

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

  test("replays an anonymized real workload against a real target and resolves last", async ({
    page,
  }) => {
    const hero = await openHero(page);
    await expect(hero.getByTestId("hero-sample-label")).toHaveText("Anonymized real workload");
    await expect(hero).toHaveAttribute("data-run", "resolved", { timeout: 15_000 });
    await expect(hero.getByTestId("hero-result-status")).toHaveText("Allowance exhausted");
    await expect(hero.getByTestId("hero-result-figure")).toContainText("$");
    await expect(hero.getByTestId("hero-result-sentence")).toContainText("First crossing");
    await expect(page.getByTestId("hero-status")).toContainText("allowance exhausted");
    // Nothing on the public hero is a synthetic provider.
    await expect(page.locator("main")).not.toContainText(/Example Cloud|synthetic example/iu);
  });

  test("is operable with the keyboard alone and reruns on target change", async ({ page }) => {
    const hero = await openHero(page);
    await expect(hero).toHaveAttribute("data-run", "resolved", { timeout: 15_000 });
    const first = hero.getByTestId("hero-target-copilot-pro-plus");
    await expect
      .poll(async () => {
        await first.focus();
        await page.keyboard.press("ArrowRight");
        return hero.getAttribute("data-target");
      })
      .toBe("chatgpt-pro");
    await expect(hero.getByTestId("hero-target-chatgpt-pro")).toBeFocused();
    await expect(hero.getByTestId("hero-target-chatgpt-pro")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(hero).toHaveAttribute("data-run", "resolved", { timeout: 15_000 });
    await expect(hero.getByTestId("hero-result-status")).toContainText("Models offered");
    await expect(hero.getByTestId("hero-result-status")).toContainText("Capacity not published");
  });

  test("always shows the result of the target selected last", async ({ page }) => {
    const hero = await openHero(page);
    await expect(hero).toHaveAttribute("data-run", "resolved", { timeout: 15_000 });
    // Change the target several times without waiting for a run to finish.
    await hero.getByTestId("hero-target-claude-max").click();
    await hero.getByTestId("hero-target-openai-api").click();
    await hero.getByTestId("hero-target-chatgpt-pro").click();
    await hero.getByTestId("hero-target-openai-api").click();
    await expect(hero).toHaveAttribute("data-target", "openai-api");
    await expect(hero).toHaveAttribute("data-run", "resolved", { timeout: 15_000 });
    await expect(hero.getByTestId("hero-result-status")).toHaveText("Published-rate equivalent");
    await expect(hero.getByTestId("hero-target-name")).toHaveText("OpenAI API");
  });

  test("runs once and stops, and the rows below load the same instrument", async ({ page }) => {
    const hero = await openHero(page);
    await expect(hero).toHaveAttribute("data-run", "resolved", { timeout: 15_000 });
    // No ambient animation remains once the run has settled.
    const running = await hero.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    );
    expect(running).toBe(0);
    await page.getByTestId("load-target-claude-max").click();
    await expect(hero).toHaveAttribute("data-target", "claude-max");
    await expect(page.getByTestId("load-target-claude-max")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(hero).toHaveAttribute("data-run", "resolved", { timeout: 15_000 });
    await expect(hero.getByTestId("hero-mapping")).toContainText("Translated replay");
  });

  test("reaches the settled state immediately under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const hero = await openHero(page);
    // No waiting and no timing tolerance: the state is correct on first paint.
    await expect(hero).toHaveAttribute("data-run", "resolved");
    await hero.getByTestId("hero-target-openai-api").click();
    await expect(hero).toHaveAttribute("data-run", "resolved");
    await expect(hero.getByTestId("hero-result-status")).toHaveText("Published-rate equivalent");
  });

  test("draws the counterfactual result rule as one straight element", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const rule = page.getByTestId("hero-result-rule");
    await expect(rule).toHaveCount(1);
    const shape = await rule.evaluate((node) => {
      const style = getComputedStyle(node);
      const before = getComputedStyle(node, "::before").content;
      const after = getComputedStyle(node, "::after").content;
      const column = node.closest(".sr-result")?.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return {
        height: style.height,
        pseudo: [before, after].filter((value) => value !== "none" && value !== "normal"),
        transform: style.transform,
        spansColumn: column !== undefined && Math.abs(box.width - column.width) < 1,
      };
    });
    expect(shape).toEqual({ height: "1px", pseudo: [], transform: "none", spansColumn: true });
  });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(HERO)).toBeVisible();
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
