import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { importDemo, setRulesAsOf, visitReplay } from "./premium-app-helpers";

/**
 * Plan terms and history (OpenAI DevDay, Sep 29, 2026).
 *
 * The ChatGPT Pro 200 change has to be visible where a person looks at or
 * compares the plan, without opening methodology. Its state follows the day:
 * an official scheduled change on Sep 29, the current terms from Sep 30, with
 * no catalog edit in between. The browser clock stands in for the day, because
 * public pages resolve plan terms on the viewer's calendar day after hydration.
 */

const PRO_200 = "/plans/openai-chatgpt-pro-20x";

async function expectNoSeriousViolations(page: Page) {
  await expect(page).toHaveTitle(/StackReplay/u);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious.map((violation) => `${violation.id}: ${violation.nodes.length} node(s)`)).toEqual(
    [],
  );
}

test.describe("ChatGPT Pro 200 plan page", () => {
  test("leads with the revised market offer on Sep 29, with grandfathering as a visible exception", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-09-29T16:00:00Z"));
    await page.goto(PRO_200);
    const notice = page.getByTestId("plan-terms-notice");
    await expect(notice).toContainText("Revised usage allowance since Sep 29, 2026");
    await expect(notice).toContainText("New and non-grandfathered subscriptions");
    await expect(notice).toContainText(
      "described by OpenAI staff as ≈50% of the previous API-equivalent spend",
    );
    await expect(notice.getByTestId("plan-terms-exception")).toContainText(
      "Already on ChatGPT Pro 200? Eligible existing subscribers keep their previous allowance through Oct 29, 2026.",
    );
    await expect(notice).toBeInViewport();

    const history = page.getByTestId("plan-history");
    await expect(history).toBeVisible();
    await expect(history.getByRole("heading", { name: /Plan history/u })).toBeVisible();
    const steps = history.getByTestId("plan-timeline-step");
    await expect(steps).toHaveCount(4);
    await expect(steps.nth(0)).toContainText("Previous terms");
    await expect(steps.nth(0)).toContainText("Start date not published");
    await expect(steps.nth(1)).toContainText("New subscriptions paused");
    await expect(steps.nth(1)).toContainText("Existing subscribers not affected");
    await expect(steps.nth(2)).toHaveAttribute("aria-current", "step");
    await expect(steps.nth(2)).toContainText("Available to new subscribers again");
    await expect(steps.nth(2).getByTestId("plan-timeline-note")).toContainText(
      "Eligible existing subscribers keep their previous allowance through Oct 29, 2026.",
    );
    await expect(steps.nth(3)).toHaveAttribute("data-state", "scheduled");
    await expect(steps.nth(3)).toContainText("Grandfathered allowance ends");
    await expect(steps.nth(3).locator("time")).toHaveAttribute("datetime", "2026-10-30");

    const text = (await page.locator("main").innerText()).toLowerCase();
    expect(text).not.toMatch(/fewer tokens|half the tokens/u);
    expect(text).not.toMatch(/pro \$200 (is )?(disabled|shut down)/u);
    expect(text).not.toMatch(/all (existing )?subscribers (lose|lost)/u);
  });

  test("shows no revision on Sep 28, before it was announced", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-28T16:00:00Z"));
    await page.goto(PRO_200);
    await expect(page.getByTestId("plan-history").getByTestId("plan-timeline-step")).toHaveCount(1);
    await expect(page.getByTestId("plan-terms-notice")).toHaveCount(0);
  });

  test("drops the grandfathering exception from Oct 30, with no catalog edit", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-30T16:00:00Z"));
    await page.goto(PRO_200);
    const notice = page.getByTestId("plan-terms-notice");
    await expect(notice).toContainText("Revised usage allowance since Sep 29, 2026");
    await expect(notice.getByTestId("plan-terms-exception")).toHaveCount(0);
    const steps = page.getByTestId("plan-history").getByTestId("plan-timeline-step");
    await expect(steps.nth(3)).toHaveAttribute("data-state", "past");
    // Old and new terms are never both marked current.
    await expect(
      page.locator('[data-testid="plan-timeline-step"][aria-current="step"]'),
    ).toHaveCount(1);
  });

  test("keeps sources one step down, and lays the timeline out for the width", async ({
    page,
  }, testInfo) => {
    await page.goto(PRO_200);
    const steps = page.getByTestId("plan-history").getByTestId("plan-timeline-step");
    await expect(steps).toHaveCount(4);
    const source = steps.nth(1).locator("details");
    await expect(source.locator("q")).toBeHidden();
    await source.locator("summary").click();
    await expect(source.locator("q")).toContainText("temporarily pausing new sign-ups");
    const first = await steps.nth(0).boundingBox();
    const second = await steps.nth(1).boundingBox();
    if (first === null || second === null) throw new Error("timeline steps not laid out");
    if (testInfo.project.name === "mobile") expect(second.y).toBeGreaterThan(first.y);
    else expect(Math.abs(second.y - first.y)).toBeLessThan(2);
    const width = page.viewportSize()?.width ?? 0;
    for (const index of [0, 1, 2, 3]) {
      const box = await steps.nth(index).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
    }
  });

  for (const theme of ["light", "dark"] as const) {
    test(`passes axe in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(PRO_200);
      await expect(page.getByTestId("plan-history")).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }

  test("adds no history to a plan that has never changed", async ({ page }) => {
    await page.goto("/plans/openai-chatgpt-plus");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("plan-history")).toHaveCount(0);
    await expect(page.getByTestId("plan-terms-notice")).toHaveCount(0);
  });
});

test.describe("plan changes where plans are compared", () => {
  test("Compare and the plan list carry the change and link to its history", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-29T16:00:00Z"));
    await page.goto("/compare?left=openai-chatgpt-pro-20x&right=openai-chatgpt-pro-500");
    const notice = page.getByTestId("compare-target").first().getByTestId("plan-terms-notice");
    await expect(notice).toContainText("Revised usage allowance since Sep 29, 2026");
    await expect(notice.getByTestId("plan-terms-exception")).toContainText("through Oct 29, 2026");
    await expect(notice.getByRole("link", { name: /View plan history/u })).toHaveAttribute(
      "href",
      "/plans/openai-chatgpt-pro-20x#history",
    );
    const pro500 = page.getByTestId("compare-target").nth(1);
    await expect(pro500).toContainText("ChatGPT Pro 500");
    await expect(pro500.getByTestId("plan-terms-notice")).toHaveCount(0);
    await page.goto("/plans");
    await page.getByPlaceholder("Plan, provider or model…").fill("Pro 200");
    await expect(
      page
        .getByTestId("plan-card")
        .filter({ hasText: "ChatGPT Pro 200" })
        .getByTestId("plan-terms-notice"),
    ).toHaveText("Revised usage allowance since Sep 29, 2026 →");
  });
});

test.describe("Replay binds a subscription result to the plan terms it used", () => {
  test("uses market terms by default, and grandfathered terms only when asked", async ({
    page,
  }) => {
    await importDemo(page, "moderate");
    await visitReplay(page);
    await setRulesAsOf(page, "2026-09-28");
    await page.getByTestId("plan-openai-chatgpt-pro-20x").click();
    const terms = page.getByTestId("replay-plan-terms");
    await expect(terms.locator(":scope > summary")).toContainText("Current terms");
    await expect(page.getByTestId("replay-plan-cohort")).toHaveCount(0);
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("result-plan-terms")).toHaveText(
      " · terms before the Sep 29, 2026 revision",
    );

    await setRulesAsOf(page, "2026-10-01");
    await expect(terms.locator(":scope > summary")).toContainText(
      "Current market terms, revised Sep 29, 2026 · ≈50% of the previous API-equivalent spend",
    );
    await terms.locator(":scope > summary").click();
    await expect(terms.getByTestId("plan-timeline-step")).toHaveCount(4);
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("result-plan-terms")).toHaveText(
      " · terms effective Sep 29, 2026",
      { timeout: 60_000 },
    );

    const cohort = page.getByTestId("replay-plan-cohort");
    await expect(cohort).toContainText("Existing subscriber?");
    await cohort.locator("input").check();
    await expect(terms.locator(":scope > summary")).toContainText(
      "Eligible existing subscribers: previous allowance through Oct 29, 2026",
    );
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("result-plan-terms")).toHaveText(
      " · eligible existing subscribers' previous allowance through Oct 29, 2026",
      { timeout: 60_000 },
    );

    await setRulesAsOf(page, "2026-10-30");
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("result-plan-terms")).toHaveText(
      " · terms effective Sep 29, 2026",
      { timeout: 60_000 },
    );
  });

  test("prices a Direct API replay at a chosen processing tier, never a coming-soon one", async ({
    page,
  }) => {
    await importDemo(page, "moderate");
    await visitReplay(page);
    await setRulesAsOf(page, "2026-09-29");
    await page.getByTestId("target-kind-api").click();
    await page.getByTestId("provider-openai").click();
    const picker = page.getByTestId("service-tier-picker");
    await expect(picker).toContainText("Ultrafast coming soon for GPT-6.1 Sol");
    await expect(page.getByTestId("service-tier-standard")).toBeChecked();
    await page.getByTestId("service-tier-fast").check();
    await expect(page.getByTestId("service-tier-note")).toContainText(
      "the Standard price is not used instead",
    );
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("replay-result")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("result-service-tier")).toContainText("Fast processing");
  });
});

test.describe("processing tiers on a model page", () => {
  test("GPT-6.1 Sol lists its tiers at their own prices, and Ultrafast as coming soon", async ({
    page,
  }) => {
    await page.goto("/models/gpt-6-1-sol");
    await expect(page.getByTestId("model-rate-table")).toContainText("$2.00");
    const tiers = page.getByTestId("model-service-tiers");
    await expect(tiers.getByTestId("service-tier-row-batch")).toContainText("$1.00");
    await expect(tiers.getByTestId("service-tier-row-fast")).toContainText("$20.00");
    const ultrafast = tiers.getByTestId("service-tier-row-ultrafast");
    await expect(ultrafast).toContainText("Coming soon");
    await expect(ultrafast).toContainText("No price");
    await expect(ultrafast).not.toContainText("$");
    // GPT-6 Sol stays its own model with its own cached-input price.
    await page.goto("/models/gpt-6-sol");
    await expect(page.getByTestId("model-rate-table")).toContainText("$0.20");
    await expect(page.getByTestId("model-service-tiers")).toHaveCount(0);
  });
});

test.describe("ChatGPT Pro 500", () => {
  test("states 25x Plus usage as a multiple, with Ultrafast and no speed figure as economics", async ({
    page,
  }) => {
    await page.goto("/plans/openai-chatgpt-pro-500");
    const allowance = page.getByTestId("plan-relative-allowance");
    await expect(allowance).toContainText("25× ChatGPT Plus usage");
    await expect(allowance).toContainText("A multiple, not a published quota");
    const main = page.locator("main");
    await expect(main).toContainText("Astra Ultrafast");
    const text = await main.innerText();
    expect(text).not.toMatch(/25x (tokens|messages)|25× (tokens|messages)/iu);
    expect(text).not.toMatch(/8x faster usage|consumes 8x speed/iu);
  });
});
