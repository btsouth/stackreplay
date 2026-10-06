import { expect, test } from "@playwright/test";

/** App pages that no longer exist. Their old URLs redirect, but nothing should link to them. */
const REMOVED = [
  "/app/plans",
  "/app/stack",
  "/app/replay",
  "/app/compare",
  "/app/workload",
  "/app/import",
];

const PAGES = [
  "/",
  "/catalog",
  "/models",
  "/providers",
  "/benchmarks",
  "/plans",
  "/compare",
  "/changelog",
  "/methodology",
  "/app/recap",
  "/app/stats",
  "/app/settings",
  "/app/scan",
];

function pathOf(href: string): string {
  return new URL(href, "http://stackreplay.test").pathname.replace(/\/$/u, "") || "/";
}

for (const route of PAGES) {
  test(`navigation and footer links on ${route} reach live pages`, async ({ page, request }) => {
    await page.goto(route);
    await expect(page.locator("main, [role=main], body").first()).toBeVisible();
    const hrefs = await page
      .locator("header a[href], nav a[href], footer a[href]")
      .evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).getAttribute("href") ?? ""),
      );
    const internal = [
      ...new Set(hrefs.filter((href) => href.startsWith("/") && !href.startsWith("//"))),
    ];
    expect(internal.length, `links found on ${route}`).toBeGreaterThan(2);
    for (const href of internal) {
      expect(REMOVED, `${route} links to a removed page: ${href}`).not.toContain(pathOf(href));
      const response = await request.get(href);
      expect(response.status(), `${route} -> ${href}`).toBeLessThan(400);
      expect(REMOVED, `${route} -> ${href} lands on a removed page`).not.toContain(
        pathOf(response.url()),
      );
    }
  });
}

test("old links to removed pages land on a page that stays", async ({ request }) => {
  const landings: Record<string, string> = {
    "/app/plans?period=90": "/app/settings",
    "/app/stack": "/app/settings",
    "/app/replay": "/app/stats",
    "/app/compare": "/app/stats",
    "/app/workload": "/app/stats",
    "/app/import": "/app/scan",
  };
  for (const [from, to] of Object.entries(landings)) {
    const response = await request.get(from);
    expect(response.status(), from).toBeLessThan(400);
    expect(pathOf(response.url()), from).toBe(to);
  }
});
