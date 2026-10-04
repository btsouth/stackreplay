import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const workersRuntime = process.env.STACKREPLAY_E2E_RUNTIME === "workers";
const runtime = workersRuntime ? "workers" : "next";
const assetRoot = join(process.cwd(), workersRuntime ? "dist/client" : ".next/static");
// Identify built code, rather than assuming a filename, manifest boundary or import is lazy.
const calculatorAssets = readdirSync(assetRoot, { recursive: true })
  .filter((file): file is string => typeof file === "string" && file.endsWith(".js"))
  .filter((file) => {
    const code = readFileSync(join(assetRoot, file), "utf8");
    return (
      code.includes("api-token-calculator") || code.includes("Use digits only for the token count.")
    );
  })
  .map((file) => `${workersRuntime ? "/" : "/_next/static/"}${file}`);

for (const route of ["/", "/providers", "/compare", "/models/mistral-large-3"]) {
  test(`calculator assets are absent before activation on ${route}`, async ({ page }, testInfo) => {
    expect(calculatorAssets.length).toBeGreaterThan(0);
    const requests: string[] = [];
    page.on("request", (request) => requests.push(new URL(request.url()).pathname));
    await page.goto(route);
    // Includes parser preloads, hydration and automatic link prefetches, not just initial HTML scripts.
    await page.waitForLoadState("networkidle");
    const before = [...requests];
    expect(before.filter((path) => calculatorAssets.includes(path))).toEqual([]);
    const preloads = await page
      .locator('link[rel="preload"],link[rel="modulepreload"]')
      .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
    expect(preloads.filter((url) => calculatorAssets.includes(new URL(url).pathname))).toEqual([]);
    if (route === "/models/mistral-large-3") {
      await expect(page.getByTestId("api-token-calculator")).toHaveCount(0);
      const open = page.getByRole("button", { name: "Open token calculator", exact: true });
      await open.focus();
      await expect(open).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("api-estimate-total")).toContainText("$2.00");
      await expect(page.getByLabel("Uncached text input tokens", { exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("Billed output tokens", { exact: true })).toBeFocused();
      expect(requests.filter((path) => calculatorAssets.includes(path)).length).toBeGreaterThan(0);
    }
    await testInfo.attach("production-calculator-requests", {
      body: JSON.stringify(
        { runtime, route, calculatorAssets, before, after: requests, preloads },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });
}

test("exact scenario, source dates and validation remain adjacent", async ({ page }) => {
  await page.goto("/models/mistral-large-3");
  await page.getByRole("button", { name: "Open token calculator", exact: true }).click();
  const section = page.getByTestId("api-token-estimate-section");
  const total = section.getByTestId("api-estimate-total");
  const input = section.getByLabel("Uncached text input tokens", { exact: true });
  const output = section.getByLabel("Billed output tokens", { exact: true });
  await expect(section).toHaveAttribute("data-pricing-id", "mistral-large-3-api-pricing");
  await expect(total).toContainText("$2.00");
  await expect(section.getByLabel("Token cost breakdown")).toContainText("$0.50 / 1M tokens");
  await expect(section.getByLabel("Token cost breakdown")).toContainText("$1.50 / 1M tokens");
  await expect(section).toContainText(
    "Include any reasoning tokens billed as output. No inferred multiplier.",
  );
  await expect(section).toContainText("A scenario, not an invoice or measured workload.");
  await expect(section).toContainText(
    "Excludes taxes, discounts, caching, media and other charges.",
  );
  await expect(section).toContainText("without a claim about one-request capacity");
  const provenance = section.getByTestId("api-estimate-provenance");
  await expect(provenance).toContainText("Pricing checked Oct 3, 2026");
  await expect(provenance).toContainText("Rate record from Oct 3, 2026");
  await expect(provenance).toContainText("no provider-published price activation date");
  await expect(provenance).toContainText("checked Oct 3, 2026");
  await expect(
    provenance.locator('a[href="https://docs.mistral.ai/inference/pricing"]'),
  ).toBeVisible();
  await expect(provenance).not.toContainText("endpoint");
  await expect(total.locator("..")).toHaveAttribute("aria-live", "polite");

  for (const field of [input, output]) {
    for (const [value, message] of [
      ["-1", "Token count cannot be negative."],
      ["1.5", "Use a whole number of tokens."],
      ["", "Enter a token count."],
      ["Infinity", "Use digits only for the token count."],
      ["1".repeat(31), "Use at most 30 digits."],
    ] as const) {
      await field.fill(value);
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(section.getByRole("alert")).toHaveText(message);
      await expect(total).toHaveCount(0);
      await expect(section).not.toContainText("NaN");
      await field.fill("1000000");
    }
  }
  await input.fill("0");
  await output.fill("0");
  await expect(total).toContainText("$0.00");
  await input.fill("1");
  await output.fill("1");
  await expect(total).toContainText("$0.000002");
  await output.fill("0");
  await input.fill("9".repeat(30));
  await expect(total).toContainText("$499,999,999,999,999,999,999,999.9999995");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open token calculator", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("api-token-calculator")).toHaveCount(0);
});

test("unavailable explanations are in server HTML and preserve existing rate facts", async ({
  page,
  request,
}) => {
  for (const [model, reason] of [
    ["gpt-6-luna", "This model has conditional rates."],
    ["gemini-3-8-flash", "This model has promotional pricing."],
    ["gpt-5-6-sol-pro", "No current Standard API list price is recorded for this exact model."],
  ] as const) {
    const response = await request.get(`/models/${model}`);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain(reason);
    await page.goto(`/models/${model}`);
    await expect(page.getByTestId("api-estimate-unavailable")).toContainText(reason);
    await expect(
      page.getByRole("button", { name: "Open token calculator", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByTestId("api-estimate-total")).toHaveCount(0);
    if (model === "gpt-6-luna")
      await expect(page.getByTestId("model-rate-table")).toContainText("Above 272K");
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`calculator and unavailable state are accessible without overflow in ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: theme === "light" ? 1440 : 390, height: 1100 });
    await page.goto("/models/mistral-large-3");
    await page.getByRole("button", { name: "Open token calculator", exact: true }).click();
    const section = page.getByTestId("api-token-estimate-section");
    await expect(page.getByTestId("api-estimate-total")).toContainText("$2.00");
    await expect(page).toHaveTitle(/StackReplay/u);
    expect(
      (
        await new AxeBuilder({ page })
          .include('[data-testid="api-token-estimate-section"]')
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env.STACKREPLAY_EVIDENCE_DIR && testInfo.project.name === "desktop") {
      await page.screenshot({
        fullPage: true,
        path: join(
          process.env.STACKREPLAY_EVIDENCE_DIR,
          `${runtime}-mistral-detail-${theme === "light" ? "1440-light" : "390-dark"}.png`,
        ),
      });
      await section.screenshot({
        path: join(
          process.env.STACKREPLAY_EVIDENCE_DIR,
          `${runtime}-mistral-${theme === "light" ? "1440-light" : "390-dark"}.png`,
        ),
      });
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await section.getByLabel("Uncached text input tokens", { exact: true }).fill("9".repeat(30));
    await expect(
      section.getByTestId("api-token-calculator").locator(":scope > div").nth(1),
    ).toHaveCSS("border-left-width", "0px");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.goto("/models/gpt-6-luna");
    const unavailable = page.getByTestId("api-token-estimate-section");
    await expect(unavailable).toContainText("This model has conditional rates.");
    expect(
      (
        await new AxeBuilder({ page })
          .include('[data-testid="api-token-estimate-section"]')
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env.STACKREPLAY_EVIDENCE_DIR && testInfo.project.name === "desktop") {
      await page.screenshot({
        fullPage: true,
        path: join(process.env.STACKREPLAY_EVIDENCE_DIR, `${runtime}-luna-detail-320-${theme}.png`),
      });
      await unavailable.screenshot({
        path: join(
          process.env.STACKREPLAY_EVIDENCE_DIR,
          `${runtime}-luna-unavailable-320-${theme}.png`,
        ),
      });
    }
  });
}
