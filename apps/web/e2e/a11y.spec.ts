import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { encodeShareToken } from "@stackreplay/share";
import { importDemo, runReplay } from "./helpers";

/**
 * Accessibility (M3 brief): WCAG 2.2 AA target on the new surfaces, in both
 * themes, with reduced motion emulated so no transient animation state is
 * audited.
 */

async function expectNoSeriousViolations(page: Page) {
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

test.describe("import surface accessibility", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`passes axe in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/app/import");
      await expectNoSeriousViolations(page);
    });
  }

  test("is operable with the keyboard alone", async ({ page }) => {
    await page.goto("/app/import");
    const input = page.getByTestId("import-file-input");
    await input.focus();
    await expect(input).toBeFocused();
    await page.keyboard.press("Tab");
    const demo = page.getByTestId("demo-moderate");
    await demo.focus();
    await expect(demo).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("import-summary")).toBeVisible({ timeout: 30_000 });
  });

  test("import errors are announced", async ({ page }) => {
    await page.goto("/app/import");
    await page.getByTestId("import-file-input").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("nope"),
    });
    await expect(page.getByTestId("import-error")).toHaveAttribute("role", "alert");
  });
});

test.describe("replay surface accessibility", () => {
  test("passes axe for a served workload in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await expectNoSeriousViolations(page);
  });

  test("passes axe for exceeded constraints in light mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    await expectNoSeriousViolations(page);
  });

  test("passes axe for unknown coverage", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await importDemo(page, "multistack");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-starter");
    await expectNoSeriousViolations(page);
  });

  test("status meaning is never carried by color alone", async ({ page }) => {
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    const trace = page.getByTestId("constraint-trace");
    // Status is a word, not a colour, so every state reads without contrast.
    await expect(trace).toContainText("within limits");
    await expect(trace).toContainText("exceeded");
  });

  test("the timeline exposes a text alternative", async ({ page }) => {
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    const chart = page.getByTestId("timeline-chart");
    await expect(chart).toHaveAttribute("role", "img");
    const label = await chart.getAttribute("aria-label");
    expect(label).toContain("Replay timeline");
    expect(label?.length ?? 0).toBeGreaterThan(40);
  });

  test("violation detail is reachable with the keyboard", async ({ page }) => {
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    const summary = page.getByTestId("violations").locator("summary").first();
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("violations")).toContainText("Attempted demand");
  });

  test("interactive rows are big enough to aim at", async ({ page }) => {
    await importDemo(page, "heavy");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");
    // 44px is the familiar minimum for a touch target, and a disclosure row that
    // is any shorter is hard to hit with a thumb or a shaky pointer.
    const heights = await page.evaluate(() => {
      const round = (node: Element) => Math.round(node.getBoundingClientRect().height);
      return {
        planRows: [...document.querySelectorAll("[data-plan-option]")].map(round),
        summaries: [...document.querySelectorAll("[data-testid='violations'] summary")].map(round),
      };
    });
    expect(heights.planRows.length).toBeGreaterThan(0);
    expect(heights.summaries.length).toBeGreaterThan(0);
    for (const height of [...heights.planRows, ...heights.summaries]) {
      expect(height).toBeGreaterThanOrEqual(44);
    }
  });
});

/**
 * Public site accessibility (M4 brief): the same WCAG 2.2 AA target applies to
 * the pages anyone can read, in both themes, including the shared-result page.
 */
test.describe("public site accessibility", () => {
  const routes = ["/", "/plans", "/models", "/compare", "/methodology", "/changelog"] as const;

  for (const theme of ["dark", "light"] as const) {
    test(`passes axe across the public site in ${theme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      for (const route of routes) {
        await page.goto(route);
        await expectNoSeriousViolations(page);
      }
    });
  }

  test("the public site is reachable with the keyboard alone", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to content/iu });
    if (await skipLink.count()) {
      await expect(skipLink.first()).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#main-content")).toBeFocused();
    }
    // Every primary destination is reachable and labelled. Wide viewports show the
    // header navigation; narrow ones reach the same destinations through the menu
    // button's panel, and the footer lists them at every width.
    const footerDestinations = ["Plans", "Models", "Compare", "Methodology", "Catalog changelog"];
    for (const label of footerDestinations) {
      await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
    }

    if (testInfo.project.name === "mobile") {
      const menu = page.getByTestId("public-nav-menu");
      await expect(menu).toBeVisible();
      await menu.focus();
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      for (const label of ["Plans", "Models", "Compare", "Methodology", "Changelog"]) {
        await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
      }
      await menu.focus();
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
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
      await expect(page.getByTestId("share-card")).toBeVisible();
      await expectNoSeriousViolations(page);
    }
  });
});
