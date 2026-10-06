import { expect, test } from "@playwright/test";
import { bannedTerms, languageMatches } from "./app-language";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { gotoImport } from "./helpers";

test("the banned terms cover the removed features' vocabulary", () => {
  for (const term of [
    "workload",
    "replay",
    "scenario",
    "translated",
    "canonical",
    "scope",
    "days it would run out",
    "limit evidence",
  ])
    expect(languageMatches(`some ${term} here`), term).not.toEqual([]);
  // The brand and the tagline are allowed.
  expect(languageMatches("StackReplay. Your AI coding, replayed.")).toEqual([]);
  expect(bannedTerms.length).toBeGreaterThan(20);
});

test("recap, stats, settings, scan and share use plain copy and one API total", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T12:00:00Z") });
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "sample.stackreplay.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(stackWorkloadFile({ scale: 100 }))),
  });
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  const id = new URL(page.url()).searchParams.get("import");
  const amount = await page.getByTestId("recap-value").locator(".v").innerText();
  expect(amount).toMatch(/^\$[\d,]+$/);
  expect(languageMatches(await page.locator("body").innerText()), "recap").toEqual([]);

  // Plans entered in Settings add one figure and no new vocabulary.
  await page.goto("/app/settings#what-you-pay");
  await expect(page.getByTestId("what-you-pay-empty")).toBeVisible();
  expect(languageMatches(await page.locator("body").innerText()), "settings, no plans").toEqual([]);
  await page.getByRole("combobox", { name: "Add a plan" }).click();
  await page.getByRole("option", { name: /^Claude Max 5x ·/u }).click();
  await expect(page.getByTestId("what-you-pay-summary")).toBeVisible();
  expect(languageMatches(await page.locator("body").innerText()), "settings, plans").toEqual([]);

  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-paid")).toBeVisible({ timeout: 60000 });
  expect(languageMatches(await page.locator("body").innerText()), "recap with plans").toEqual([]);

  await page.goto(`/app/stats?import=${id}`);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId("recap-value").locator(".v")).toHaveText(amount);
  await expect(page.getByRole("tab")).toHaveCount(0);
  expect(languageMatches(await page.locator("body").innerText()), "overview").toEqual([]);

  await page.goto(`/app/scan?import=${id}`);
  await expect(page.getByTestId("intake-surface")).toHaveAttribute("data-ready", "true");
  expect(languageMatches(await page.locator("body").innerText()), "scan").toEqual([]);

  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-ready")).toBeVisible();
  await page.getByTestId("recap-share-create").click();
  await page.getByTestId("recap-share-open").click();
  await expect(page.getByTestId("share-card-v2")).toBeVisible();
  expect(languageMatches(await page.locator("body").innerText()), "share").toEqual([]);
  await expect(
    page.getByRole("img", { name: new RegExp(`${amount.replace(/[$]/g, "\\$")} API value`) }),
  ).toBeVisible();
  await expect(page.getByTestId("share-figure")).toHaveCount(0);
});
