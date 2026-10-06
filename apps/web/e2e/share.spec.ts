import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { encodeShareTokenV2 } from "@stackreplay/share";
import { buildArchetypeExport } from "@stackreplay/test-fixtures";
import { buildRecap } from "../lib/recap";
import { recapShareV2 } from "../lib/share-v2";

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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A chapter in AI coding");
  await expect(page.getByTestId("share-figure")).toHaveText(/^\$[\d,]+$/u);
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
