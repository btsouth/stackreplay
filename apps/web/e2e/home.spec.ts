import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("recap homepage renders, links to scan and keeps the sample public", async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: isMobile ? 844 : 900 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") uploads.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your AI coding,replayed.");
  for (const link of await page.getByRole("link", { name: "Replay my history", exact: true }).all())
    await expect(link).toHaveAttribute("href", "/app/scan");
  await expect(page.getByRole("link", { name: "See a sample recap" })).toHaveAttribute(
    "href",
    "#sample",
  );
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole(isMobile ? "dialog" : "banner").getByRole("link", { name: "Models & plans" }),
  ).toHaveAttribute("href", "/catalog");
  if (isMobile) await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.locator(".replay-card-total").first()).toContainText("41.2B");
  await page.getByRole("link", { name: "See a sample recap" }).click();
  await expect(page).toHaveURL(/#sample$/);
  await expect(page.locator("#sample-heading")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  expect(uploads).toEqual([]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("reduced motion shows completed stats with no animations or tilt", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".replay-card-total").first()).toContainText("41.2B");
  await expect
    .poll(async () =>
      page.locator(".replay-card-position").evaluate((el) => getComputedStyle(el).transform),
    )
    .toBe("none");
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    ),
  ).toBe(0);
  await page.locator("#sample").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((a) => a.playState === "running").length,
    ),
  ).toBe(0);
});
test("sample cards download both real renderer sizes", async ({ page }) => {
  await page.goto("/");
  for (const [name, size] of [
    ["Try landscape", [1200, 630]],
    ["Try portrait", [1080, 1350]],
  ] as const) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name }).click();
    const download = await pending;
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile((await download.path())!);
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual(size);
  }
});
