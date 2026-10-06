import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { buildRecap } from "../lib/recap";
import { recapShareV2, terminalShareV2 } from "../lib/share-v2";

/**
 * Every link has its own image drawn from its own aggregate data, and the
 * public page leads with the recap numbers.
 */

const recap = buildRecap(
  buildArchetypeExport("mixed").events,
  "all",
  "2026-09-24T12:00:00Z",
  "America/New_York",
);

async function token(): Promise<string> {
  return await encodeShareTokenV2(recapShareV2(recap));
}

test("each link has its own image, and the page names it", async ({ page, request }) => {
  const shared = await token();
  const image = await request.get(`/s/${shared}/image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect((await image.body()).byteLength).toBeGreaterThan(10_000);

  await page.goto(`/s/${shared}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("AI coding, in numbers.");
  await expect(page.locator(".public-terminal-card")).toHaveAttribute(
    "alt",
    /tokens, \$[\d,]+ API value/u,
  );
  await expect(page.locator(".share-summary")).toHaveCount(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    new RegExp(`/s/${shared.replaceAll(".", "\\.")}/image$`, "u"),
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.getByRole("link", { name: "Download this card" })).toHaveAttribute(
    "href",
    new RegExp(`/s/${shared.replaceAll(".", "\\.")}/image$`, "u"),
  );
});

test("an unreadable link still gets an image, not an error", async ({ request }) => {
  const image = await request.get("/s/2.not-a-token.x/image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

for (const theme of ["dark", "light"] as const) {
  test(`public share card remains readable in ${theme}`, async ({ page }) => {
    const shared = await token();
    await page.addInitScript((theme) => localStorage.setItem("stackreplay-theme", theme), theme);
    await page.goto(`/s/${shared}`);
    await expect(page.getByTestId("share-card-v2")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("old terminal speed links and ranked boards keep a volume hero", async ({ page, request }) => {
  for (const speedFields of [
    { speed: { id: "claude-opus-5-5", median: 87.1, replies: 100 } },
    {
      speeds: [
        { id: "claude-opus-5-5", median: 87.1 },
        { id: "gpt-5-4", median: 75.2 },
      ],
    },
  ]) {
    const shared = await encodeShareTokenV2(
      terminalShareV2({
        theme: "dark",
        start: "2026-09-01",
        end: "2026-10-01",
        totalTokens: 50_600_000_000,
        ...speedFields,
      }),
    );
    const image = await request.get(`/s/${shared}/image`);
    expect(image.status()).toBe(200);
    expect((await image.body()).byteLength).toBeGreaterThan(10_000);
    await page.goto(`/s/${shared}`);
    await expect(page.getByTestId("share-card-v2")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator(".public-terminal-card")
          .evaluate((n) => n instanceof HTMLImageElement && n.complete && n.naturalWidth === 1200),
      )
      .toBe(true);
    await expect(page.locator(".public-terminal-card")).toHaveAttribute("alt", /50.6B tokens/);
  }
});
