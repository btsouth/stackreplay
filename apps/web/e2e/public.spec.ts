import { expect, test } from "@playwright/test";
import { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "@stackreplay/replay-engine";
import { decodeShareToken, encodeShareToken } from "@stackreplay/share";
import { captureRequests, importDemo, runReplay } from "./helpers";

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
  { path: "/", heading: "Your workload. Any stack. Replay the difference." },
  { path: "/plans", heading: "Catalogued plans" },
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
      await expect(page.getByRole("link", { name: "Try Replay" }).first()).toBeVisible();
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
});

test.describe("share links", () => {
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
    await expect(page.getByTestId("share-card-plan")).toHaveText("Example Medium");
    await expect(page.getByTestId("share-constraints")).toContainText("600");
    await expect(page.getByTestId("share-constraints")).toContainText("2 window(s) exceeded");
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

  test("creating a share link in the app uploads nothing and re-reads in public", async ({
    page,
  }) => {
    const requests = captureRequests(page);
    await importDemo(page, "moderate");
    await page.goto("/app/replay");
    await runReplay(page, "example-cloud-pro");

    await expect(page.getByTestId("share-panel")).toBeVisible();
    await page.getByTestId("share-create").click();
    const url = await page.getByTestId("share-url").textContent();
    expect(url).toContain("/s/1.");

    // The token decodes to a valid snapshot with no forbidden field.
    const token = (url ?? "").split("/s/")[1]?.trim() ?? "";
    const decoded = await decodeShareToken(token);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.snapshot.workload.eventCount).toBeGreaterThan(0);
      expect(JSON.stringify(decoded.snapshot)).not.toMatch(
        /sessionhash|projecthash|eventhash|repository|filepath|prompt/u,
      );
    }

    const uploads = requests.filter(
      (request) =>
        request.method !== "GET" && !request.url.includes("_next") && !request.url.includes("/s/"),
    );
    expect(uploads, "creating a share link must not send a request").toEqual([]);

    await page.getByTestId("share-open").click();
    await expect(page.getByTestId("share-card")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("events replayed");
    await expect(page.getByTestId("share-card-plan")).toBeVisible();
  });
});
