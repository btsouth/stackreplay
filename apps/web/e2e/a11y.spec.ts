import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { encodeShareToken } from "@stackreplay/share";
import { gotoImport, importDemo } from "./helpers";

/**
 * Accessibility (M3 brief): WCAG 2.2 AA target on the new surfaces, in both
 * themes, with reduced motion emulated so no transient animation state is
 * audited.
 */

async function expectNoSeriousViolations(page: Page) {
  // App Router metadata may finish streaming after the result is visible.
  await expect(page).toHaveTitle(/StackReplay/u);
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    serious.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        html: node.html,
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
}

test.describe("import surface accessibility", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`passes axe in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/app/scan");
      await expectNoSeriousViolations(page);
    });
  }

  test("is operable with the keyboard alone", async ({ page }) => {
    await gotoImport(page);
    const input = page.getByTestId("import-file-input");
    await input.focus();
    await expect(input).toBeFocused();
    await page.keyboard.press("Tab");
    const demo = page.getByTestId("demo-moderate");
    await demo.focus();
    await expect(demo).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("radio", { name: "All time", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
    await page.getByRole("link", { name: "SHARE ↗", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("recap-ready")).toBeVisible();
  });

  test("import errors are announced", async ({ page }) => {
    await page.goto("/app/scan");
    await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
    await page.getByTestId("import-file-input").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("nope"),
    });
    await expect(page.getByTestId("import-error")).toHaveAttribute("role", "alert");
  });
});

test.describe("app surface accessibility", () => {
  for (const theme of ["dark", "light"] as const) {
    for (const route of ["recap", "stats", "settings"] as const) {
      test(`${route} passes axe in ${theme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await importDemo(page, "heavy");
        const id = new URL(page.url()).searchParams.get("import");
        await page.goto(`/app/${route}?import=${id}`);
        await expect(
          route === "settings"
            ? page.getByTestId("settings-saved")
            : page.getByTestId("recap-ready"),
        ).toBeVisible({ timeout: 60_000 });
        await expectNoSeriousViolations(page);
      });
    }
  }

  test("what you pay quantities are operable with the keyboard and pass axe", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard path is a desktop path");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/app/settings");
    const trigger = page.getByRole("combobox", { name: "Add a plan" });
    await trigger.click();
    await page
      .getByRole("option", { name: /^Claude Max 5x ·/u })
      .first()
      .click();
    const more = page.getByRole("button", { name: "More Claude Max 5x accounts" });
    await more.focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("what-you-pay-total")).toHaveText(
      "2 accounts · $200/month total",
    );
    await expectNoSeriousViolations(page);
  });

  test("interactive controls are big enough to aim at on a phone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "touch viewport only");
    await page.goto("/app/settings");
    await page.getByRole("combobox", { name: "Add a plan" }).click();
    await page
      .getByRole("option", { name: /^Claude Max 5x ·/u })
      .first()
      .click();
    const heights = await page
      .getByTestId("what-you-pay")
      .locator("button")
      .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
  });
});

/**
 * Public site accessibility (M4 brief): the same WCAG 2.2 AA target applies to
 * the pages anyone can read, in both themes, including the shared-result page.
 */
test.describe("public site accessibility", () => {
  const routes = ["/", "/plans", "/models", "/compare", "/methodology", "/changelog"] as const;

  for (const theme of ["dark", "light"] as const) {
    for (const route of routes) {
      test(`passes axe on ${route} in ${theme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(route);
        await expect(page.getByRole("button", { name: "Toggle theme" })).toBeEnabled();
        await expectNoSeriousViolations(page);
      });
    }
  }

  test("the public site is reachable with the keyboard alone", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to content/iu });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    if (testInfo.project.name === "mobile") {
      const trigger = page.getByRole("button", { name: "Open menu" });
      await expect(trigger).toBeEnabled();
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    const homepageNav =
      testInfo.project.name === "mobile"
        ? page.getByRole("dialog").getByRole("navigation", { name: "Public" })
        : page.getByRole("navigation", { name: "Public" });
    for (const [label, href] of [
      ["Recap", "/app/recap"],
      ["Models", "/models"],
      ["Privacy", "/methodology#privacy"],
    ] as const) {
      const link = homepageNav.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      await link.focus();
      await expect(link).toBeFocused();
    }
    await homepageNav.getByRole("link", { name: "Models", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/models$/u);
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Privacy", exact: true }),
    ).toBeVisible();
    if (testInfo.project.name === "mobile") {
      const trigger = page.getByRole("button", { name: "Open menu" });
      await expect(trigger).toBeEnabled();
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  });

  test("a shared result page passes axe in both themes", async ({ page }) => {
    const token = await encodeShareToken({
      version: 1,
      workload: {
        eventCount: 120,
        modelCount: 2,
        tokenTotals: { outputTokens: 4_000 },
        rangeIncluded: false,
      },
      target: {
        type: "subscription",
        planId: "example-cloud-pro",
        planVersionId: "example-cloud-pro@2026-08-01",
        planName: "Example Cloud Pro",
        providerId: "example-cloud",
        providerName: "Example Cloud",
        price: { currency: "USD", amount: "50.00", interval: "month" },
        verificationStatus: "estimated",
        lastVerifiedAt: "2026-09-01",
        sources: [{ url: "https://example.invalid/pricing", title: "Example pricing" }],
      },
      feasibility: { status: "full", coveragePercent: 100, coverageDimension: "requests" },
      coverage: {
        requests: { status: "known", percent: 100, covered: 120, total: 120 },
        usage: { status: "known", percent: 100, covered: 120, total: 120 },
        models: { status: "known", percent: 100, covered: 2, total: 2 },
      },
      constraints: [
        {
          id: "example-small-plan@2026-09-01:request_limit",
          label: "Requests",
          kind: "request_limit",
          unit: "requests",
          window: { kind: "rolling", description: "rolling PT5H" },
          exceed: "reject_request",
          status: "pass",
          limitUnits: "200",
          consumedUnits: "120",
          attemptedUnits: "120",
          violationCount: 0,
          rejectedEvents: 0,
        },
      ],
      violations: [],
      confidence: { level: "high", factors: [] },
      versions: {
        engine: "0.0.2",
        schema: 1,
        catalog: "2026.09.1",
        methodology: "1.1.0",
        rulesAsOf: "2026-09-15",
        targetReference: "example-small-plan@2026-09-01",
      },
    });
    for (const theme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(`/s/${token}`);
      await expect(page.getByTestId("share-card-v2")).toBeVisible();
      await expectNoSeriousViolations(page);
    }
  });
});
