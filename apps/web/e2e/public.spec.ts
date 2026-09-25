import { expect, test } from "@playwright/test";
import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "@stackreplay/replay-engine";
import { decodeAnyShareToken, encodeShareToken } from "@stackreplay/share";
import { captureRequests, createShareToken, importDemo, runReplay } from "./helpers";

/**
 * Public site and sharing (M4).
 *
 * Two properties matter here and both are asserted end to end:
 *   1. The public site publishes sourced catalog facts and never presents
 *      planned cloud capability as available.
 *   2. A share link is stateless and aggregate-only: the page renders what the
 *      token carries, a tampered token is refused, and creating or opening a
 *      share link sends no workload data anywhere.
 */

const PUBLIC_ROUTES = [
  { path: "/", heading: "Your AI coding history, measured." },
  { path: "/plans", heading: "Plans" },
  { path: "/models", heading: "Models" },
  { path: "/compare", heading: "Compare plans" },
  { path: "/methodology", heading: "Methodology" },
  { path: "/changelog", heading: "Catalog changelog" },
] as const;

test.describe("public site", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.path} renders`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      // The public shell always offers the local application and the repository.
      await expect(page.getByRole("link", { name: "Scan your AI history" }).first()).toBeVisible();
    });
  }

  test("public metadata points at the canonical origin, never at localhost", async ({ page }) => {
    await page.goto("/");
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute("content");
    expect(ogUrl).toBe("https://stackreplay.com");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toContain("stackreplay.com");
    const icon = await page.locator('link[rel="icon"]').first().getAttribute("href");
    expect(icon).toContain("/brand/favicon");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toContain("/brand/open-graph-1200x630.png");
  });

  test("the approved brand lockup is served from the site", async ({ page, request }) => {
    await page.goto("/");
    const logo = page.locator('header img[alt="StackReplay"]').first();
    await expect(logo).toBeVisible();
    const src = await logo.getAttribute("src");
    expect(src).toContain("/brand/navbar-64-");
    const response = await request.get(src ?? "/brand/navbar-64-dark.png");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("robots keeps the local application out of search results", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /app");
    expect(robots).toContain("Sitemap: https://stackreplay.com/sitemap.xml");
  });

  test("the sitemap lists public pages and no application routes", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const route of PUBLIC_ROUTES) {
      expect(sitemap).toContain(
        `<loc>https://stackreplay.com${route.path === "/" ? "/" : route.path}</loc>`,
      );
    }
    expect(sitemap).not.toContain("/app/");
    expect(sitemap).not.toContain("/s/");
    // The synthetic `example-` development catalog is fixtures and demos, never a
    // published claim, so no synthetic plan or model id may reach the sitemap.
    expect(sitemap).not.toMatch(/example-/u);
  });

  test("plan pages publish sources and verification, not bare prices", async ({ page }) => {
    await page.goto("/plans");
    const cards = page.getByTestId("plan-card");
    const count = await cards.count();
    test.skip(count === 0, "no sourced plan is catalogued in this build");
    // A plan page publishes what the provider states: a numeric limit table where
    // there is a number and a window, qualitative statements where there is not.
    // Either way the card shows its sources and its verification state.
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      await card.getByText("Inspect limits and sources").click();
      await expect(card.getByTestId("source-list")).toBeVisible();
      await expect(card.getByText(/verified|estimated|measured|unknown/u).first()).toBeVisible();
      const numeric = await card.getByTestId("limit-table").count();
      const qualitative = await card.getByTestId("qualitative-limits").count();
      expect(numeric + qualitative).toBeGreaterThan(0);
    }
  });

  test("a plan detail page links into a local replay", async ({ page }) => {
    await page.goto("/plans");
    const firstPlan = page.getByTestId("plan-card").first().getByRole("link").first();
    const count = await page.getByTestId("plan-card").count();
    test.skip(count === 0, "no sourced plan is catalogued in this build");
    await firstPlan.click();
    await expect(page).toHaveURL(/\/plans\/[^/]+$/u);
    const replayLink = page.getByRole("link", { name: /^Replay against/u });
    await expect(replayLink).toBeVisible();
    const href = await replayLink.getAttribute("href");
    expect(href).toContain("/app/import?target=");
    await replayLink.click();
    await expect(page.getByTestId("import-dropzone")).toBeVisible();
  });

  test("public pages do not overflow horizontally on a narrow screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    for (const route of PUBLIC_ROUTES) {
      await page.goto(route.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route.path} overflows horizontally`).toBeLessThanOrEqual(1);
    }
  });

  test("catalog facts remain inside the mobile content rail", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    for (const route of ["/models", "/compare", "/plans/github-copilot-business"]) {
      await page.goto(route);
      const facts = page.locator(
        "main article, main table td, main [data-testid='compare-target']",
      );
      await expect(facts.first()).toBeVisible();
      const outside = await facts.evaluateAll((cells) => {
        const main = document.querySelector("main");
        if (main === null) return ["missing content rail"];
        const rail = main.getBoundingClientRect();
        const style = getComputedStyle(main);
        const left = rail.left + Number.parseFloat(style.paddingLeft);
        const right = rail.right - Number.parseFloat(style.paddingRight);
        return cells
          .filter((cell) => {
            const rect = cell.getBoundingClientRect();
            return rect.width > 0 && (rect.left < left - 1 || rect.right > right + 1);
          })
          .map((cell) => cell.textContent?.trim().slice(0, 60) ?? "unknown cell");
      });
      expect(outside, `${route} has facts outside the content rail`).toEqual([]);
    }
  });

  test("catalog target actions and provider groups remain reachable at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/plans", "/compare"]) {
      await page.goto(route);
      const action = page
        .getByRole("link", { name: /Replay (this target|your workload here)/u })
        .first();
      await expect(action).toBeVisible();
      expect(await action.getAttribute("href")).toMatch(/^\/app\/import\?target=/u);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.goto("/compare");
    await expect(page.getByTestId("compare-target")).toHaveCount(2);
    await page.goto("/models");
    await expect(page.getByTestId("model-table").getByRole("link").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

  test("the public compare page speaks plan questions, not catalog vocabulary", async ({
    page,
  }) => {
    await page.goto("/compare");
    await expect(page.getByTestId("compare-target")).toHaveCount(2);
    await expect(page.getByTestId("compare-price").first()).toContainText("/ month");
    await expect(page.getByTestId("compare-row-models")).toContainText("Claude Opus 5.5");
    await expect(page.getByTestId("compare-row-usage")).toContainText(
      "Provider does not publish a numeric allowance.",
    );
    // The primary rows speak plan questions; catalog vocabulary stays under inspect.
    for (const row of [
      "models",
      "coding-tools",
      "usage",
      "simulation",
      "after-limit",
      "evidence",
    ]) {
      await expect(page.getByTestId(`compare-row-${row}`)).not.toContainText(
        /documented routes|qualitative/iu,
      );
    }
    await expect(page.getByTestId("compare-with-workload")).toHaveText(
      "Compare against my workload →",
    );
    await expect(page.getByTestId("compare-with-workload")).toHaveAttribute("href", "/app/compare");
    await page.getByText("Inspect constraints and sources").first().click();
    await expect(
      page.getByTestId("compare-inspect").first().getByTestId("source-list"),
    ).toBeVisible();
  });

  test("the model library leads with releases and keeps family names as identity records", async ({
    page,
  }) => {
    await page.goto("/models");
    const rows = page.getByTestId("model-row");
    await expect(rows.first()).toBeVisible();
    await expect(page.locator("[data-testid='model-row'][data-model-kind='family']")).toHaveCount(
      0,
    );
    await expect(page.getByTestId("model-table")).not.toContainText(/catalogued target plans/u);
    await page.getByTestId("model-view-identity").click();
    await expect(page.getByTestId("model-table")).toContainText("Opus");
    await page.getByLabel("Find a model, family name or exact alias").fill("claude-opus");
    await expect(page.getByTestId("model-table")).toContainText("Family name");
    await page.goto("/models/claude-opus");
    await expect(page.getByTestId("family-explainer")).toBeVisible();
    await expect(page.getByTestId("family-releases")).toContainText("Claude Opus 5.5");
    await expect(page.getByRole("heading", { name: "Aliases, routes and identity" })).toBeVisible();
  });

  test("public navigation identifies the current section on desktop and mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/plans/github-copilot-business");
    const desktopNav = page.getByRole("navigation", { name: "Public" }).first();
    await expect(desktopNav.getByRole("link", { name: "Plans" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(desktopNav.getByRole("link", { name: "Models" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.getByTestId("public-nav-menu");
    await expect(async () => {
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
    }).toPass();
    const mobileNav = page.getByRole("navigation", { name: "Public" }).last();
    await expect(mobileNav.getByRole("link", { name: "Plans" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(mobileNav.getByRole("link", { name: "Models" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("public footer destinations resolve to real sections or routes", async ({ page }) => {
    await page.goto("/plans");
    const privacy = page.getByRole("link", { name: "Privacy model" });
    await expect(privacy).toHaveAttribute("href", "/methodology#privacy");
    await privacy.click();
    await expect(page.locator("#privacy")).toBeVisible();
    const catalog = page.getByRole("link", { name: "Catalog sources" });
    await expect(catalog).toHaveAttribute("href", "/plans");
    await catalog.click();
    await page.getByTestId("plan-card").first().getByText("Inspect limits and sources").click();
    await expect(page.getByTestId("plan-card").first().getByTestId("source-list")).toBeVisible();
  });
});

test.describe("share links", () => {
  test("plan detail action resolves only for a public catalogued target", async ({ page }) => {
    const base = {
      version: 1 as const,
      workload: { eventCount: 10, modelCount: 1, tokenTotals: {}, rangeIncluded: false },
      target: {
        type: "subscription" as const,
        planId: "anthropic-claude-pro",
        planVersionId: "anthropic-claude-pro@2026-09-21",
        planName: "Claude Pro",
        providerId: "anthropic",
        providerName: "Anthropic",
        price: { currency: "USD" as const, amount: "20.00", interval: "month" as const },
        verificationStatus: "verified" as const,
        lastVerifiedAt: "2026-09-21",
        sources: [],
      },
      feasibility: {
        status: "full" as const,
        coveragePercent: 100,
        coverageDimension: "requests" as const,
      },
      coverage: {
        requests: { status: "known" as const, percent: 100, covered: 10, total: 10 },
        usage: { status: "known" as const, percent: 100, covered: 10, total: 10 },
        models: { status: "known" as const, percent: 100, covered: 1, total: 1 },
      },
      constraints: [],
      violations: [],
      confidence: { level: "high" as const, factors: [] },
      versions: {
        engine: ENGINE_VERSION,
        schema: 1 as const,
        catalog: "2026.09.1",
        methodology: REPLAY_METHODOLOGY_VERSION,
        rulesAsOf: "2026-09-21",
        targetReference: "anthropic-claude-pro@2026-09-21",
      },
    };
    const catalogued = await encodeShareToken(base);
    await page.goto(`/s/${catalogued}`);
    const details = page.getByRole("link", { name: "Plan details" });
    await expect(details).toHaveAttribute("href", "/plans/anthropic-claude-pro");
    expect((await page.request.get("/plans/anthropic-claude-pro")).status()).toBe(200);

    for (const planId of ["example-cloud-pro", "unknown-public-target"]) {
      const token = await encodeShareToken({
        ...base,
        target: { ...base.target, planId, planVersionId: `${planId}@2026-09-21`, planName: planId },
        versions: { ...base.versions, targetReference: `${planId}@2026-09-21` },
      });
      await page.goto(`/s/${token}`);
      await expect(page.getByTestId("share-card")).toBeVisible();
      await expect(page.getByRole("link", { name: "Plan details" })).toHaveCount(0);
    }
  });

  test("a stateless link renders the aggregate result it carries", async ({ page }) => {
    const snapshot = {
      version: 1 as const,
      workload: {
        eventCount: 5_000,
        sessionCount: 96,
        modelCount: 3,
        tokenTotals: { inputTokens: 18_402_119, outputTokens: 6_118_240 },
        rangeIncluded: true,
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-31T00:00:00.000Z",
      },
      target: {
        type: "subscription" as const,
        planId: "example-medium-plan",
        planVersionId: "example-medium-plan@2026-09-01",
        planName: "Example Medium",
        providerId: "example-cloud",
        providerName: "Example Cloud",
        price: { currency: "USD" as const, amount: "20.00", interval: "month" as const },
        verificationStatus: "estimated" as const,
        lastVerifiedAt: "2026-09-01",
        sources: [{ url: "https://example.invalid/pricing", title: "Example pricing" }],
      },
      feasibility: {
        status: "partial" as const,
        coveragePercent: 90,
        coverageDimension: "requests" as const,
      },
      coverage: {
        requests: { status: "known" as const, percent: 90, covered: 4_500, total: 5_000 },
        usage: { status: "known" as const, percent: 88, covered: 4_400, total: 5_000 },
        models: { status: "known" as const, percent: 100, covered: 3, total: 3 },
      },
      constraints: [
        {
          id: "example-medium-plan@2026-09-01:request_limit",
          label: "Requests",
          kind: "request_limit" as const,
          unit: "requests" as const,
          window: { kind: "rolling" as const, description: "rolling PT5H" },
          exceed: "latch_until_reset" as const,
          status: "exceeded" as const,
          limitUnits: "600",
          consumedUnits: "600",
          attemptedUnits: "900",
          violationCount: 2,
          rejectedEvents: 300,
        },
      ],
      violations: [
        {
          constraintId: "example-medium-plan@2026-09-01:request_limit",
          type: "rolling_window_exceeded",
          startedOn: "2026-08-11",
          endedOn: "2026-08-11",
          unit: "requests" as const,
          requiredUnits: "900",
          availableUnits: "600",
          acceptedUnits: "600",
          affectedEvents: 300,
        },
      ],
      confidence: {
        level: "medium" as const,
        factors: [{ id: "coverage", level: "medium" as const, description: "Partial coverage." }],
      },
      versions: {
        engine: ENGINE_VERSION,
        schema: 1 as const,
        catalog: "2026.09.1",
        methodology: REPLAY_METHODOLOGY_VERSION,
        rulesAsOf: "2026-09-15",
        targetReference: "example-medium-plan@2026-09-01",
      },
    };
    const token = await encodeShareToken(snapshot);

    await page.goto(`/s/${token}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("5,000 events replayed");
    await expect(page.getByTestId("share-card")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByTestId("share-card-plan")).toHaveText("Example Medium");
    await expect(page.getByRole("link", { name: "Plan details" })).toHaveCount(0);
    await expect(page.getByTestId("share-constraints")).toContainText("600");
    await expect(page.getByTestId("share-constraints")).toContainText("2 window(s) exceeded");
    await page.setViewportSize({ width: 390, height: 900 });
    expect(
      await page
        .getByTestId("share-constraints")
        .locator("table")
        .evaluate((table) => {
          const main = document.querySelector("main");
          if (main === null) return false;
          const rail = main.getBoundingClientRect();
          const right = rail.right - Number.parseFloat(getComputedStyle(main).paddingRight);
          return table.getBoundingClientRect().right <= right + 1;
        }),
    ).toBe(true);
    // The page states the versions a reader would need to audit the result.
    await expect(page.getByText(REPLAY_METHODOLOGY_VERSION).first()).toBeVisible();

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toContain(`/s/${token}`);
  });

  test("a tampered link is refused rather than rendered", async ({ page }) => {
    const token = await encodeShareToken({
      version: 1,
      workload: {
        eventCount: 10,
        modelCount: 1,
        tokenTotals: {},
        rangeIncluded: false,
      },
      target: {
        type: "subscription",
        planId: "example-small-plan",
        planVersionId: "example-small-plan@2026-09-01",
        planName: "Example Small",
        providerId: "example-open",
        providerName: "Example Open",
        price: { currency: "USD", amount: "5.00", interval: "month" },
        verificationStatus: "estimated",
        lastVerifiedAt: "2026-09-01",
        sources: [],
      },
      feasibility: { status: "full", coveragePercent: 100, coverageDimension: "requests" },
      coverage: {
        requests: { status: "known", percent: 100, covered: 10, total: 10 },
        usage: { status: "known", percent: 100, covered: 10, total: 10 },
        models: { status: "known", percent: 100, covered: 1, total: 1 },
      },
      constraints: [],
      violations: [],
      confidence: { level: "high", factors: [] },
      versions: {
        engine: ENGINE_VERSION,
        schema: 1,
        catalog: "2026.09.1",
        methodology: REPLAY_METHODOLOGY_VERSION,
        rulesAsOf: "2026-09-15",
        targetReference: "example-small-plan@2026-09-01",
      },
    });
    const [version, checksum, payload] = token.split(".") as [string, string, string];
    const tampered = `${version}.${checksum}.${payload.slice(0, -4)}AAAA`;

    await page.goto(`/s/${tampered}`);
    await expect(page.getByTestId("share-invalid")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("cannot be read");
    await expect(page.getByTestId("share-card")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/u);
  });

  test("creating a share link uploads only its aggregate token and re-reads in public", async ({
    page,
  }) => {
    const requests = captureRequests(page);
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");

    await expect(page.getByTestId("share-panel")).toBeVisible();
    // The preview comes before any link exists.
    await expect(page.getByTestId("share-preview")).toBeVisible();
    const token = await createShareToken(page);
    expect(token.startsWith("2.")).toBe(true);

    // The token decodes to a valid V2 snapshot with no forbidden field.
    const decoded = await decodeAnyShareToken(token);
    expect(decoded.ok).toBe(true);
    if (decoded.ok && decoded.snapshot.version === 2 && decoded.snapshot.kind === "replay") {
      expect(decoded.snapshot.verdict.calls.total).toBeGreaterThan(0);
      expect(JSON.stringify(decoded.snapshot)).not.toMatch(
        /sessionhash|projecthash|eventhash|repository|filepath|prompt/iu,
      );
    } else throw new Error("expected a V2 replay snapshot");

    // The one upload is the aggregate token itself, to the share store.
    const uploads = requests.filter(
      (request) =>
        request.method !== "GET" && !request.url.includes("_next") && !request.url.includes("/s/"),
    );
    expect(uploads.map((request) => `${request.method} ${new URL(request.url).pathname}`)).toEqual([
      "POST /api/share",
    ]);
    expect(JSON.parse(uploads[0]?.body ?? "{}")).toEqual({ token });

    await page.getByTestId("share-open").click();
    await expect(page.getByTestId("share-card-v2")).toBeVisible();
    // The page leads with the same verdict the app led with.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Example");

    // Regression (benchmark F011): the public read model filters the synthetic
    // `example-` namespace, but a share link carries its target inside the token.
    // A demo target must therefore reach the page as labelled demo data, never as
    // a real-world claim.
    await expect(page.getByTestId("share-synthetic")).toBeVisible();
    await expect(page.getByRole("link", { name: "Plan details" })).toHaveCount(0);
    // Regression (benchmark F004): the plan terms in a link are the sharer's
    // claim, so the page says so instead of borrowing the catalog's "verified"
    // badge language.
    await expect(page.getByTestId("share-provenance")).toContainText(
      /this site has not re-checked the link's claim/u,
    );
  });
});
