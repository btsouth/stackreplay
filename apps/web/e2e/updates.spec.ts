import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { marketEventCategories, marketFeed, sortByOccurrence } from "@stackreplay/market-events";
import { expectCatalogSelection, selectCatalogOption } from "./public-controls";

const ordered = sortByOccurrence(marketFeed.events);
const ids = (provider: string | null, category: string) =>
  ordered
    .filter(
      (event) =>
        (!provider || event.providerId === provider) &&
        (category === "all" || marketEventCategories(event.type).includes(category as "models")),
    )
    .map((event) => event.id);
async function assertSelection(page: Page, provider: string | null, category: string) {
  const query = new URLSearchParams();
  if (provider) query.set("provider", provider);
  if (category !== "all") query.set("type", category);
  const suffix = query.size ? `?${query}` : "";
  for (const [format, name, mime] of [
    ["xml", "RSS", "application/rss+xml"],
    ["json", "JSON", "application/json"],
  ] as const) {
    const href = `/changelog/feed.${format}${suffix}`;
    await expect(
      page.getByTestId("update-subscriptions").getByRole("link", { name, exact: true }),
    ).toHaveAttribute("href", href);
    await expect(page.locator(`head link[rel="alternate"][type="${mime}"]`)).toHaveCount(1);
    await expect(page.locator(`head link[rel="alternate"][type="${mime}"]`)).toHaveAttribute(
      "href",
      `https://stackreplay.com${href}`,
    );
  }

  await expectCatalogSelection(
    page.getByRole("combobox", { name: "Provider", exact: true }),
    provider ?? "all",
  );
  await expect(page.getByTestId(`updates-filter-${category}`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() => page.getByTestId("updates-event").evaluateAll((rows) => rows.map((row) => row.id)))
    .toEqual(ids(provider, category));
  for (const type of ["all", "models", "benchmarks", "subscriptions", "pricing"])
    await expect(page.getByTestId(`updates-filter-${type}`).locator("span")).toHaveText(
      String(ids(provider, type).length),
    );
}

test("filtered SSR, reload, successive choices and detail history retain committed URL, controls and rows", async ({
  page,
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const serverPage = await context.newPage();
  await serverPage.goto(`${baseURL}/changelog?provider=google&type=benchmarks`);
  await assertSelection(serverPage, "google", "benchmarks");
  await context.close();
  const anchor = "#gemini-4-argon-announced";
  await page.goto(`/changelog?provider=google&type=benchmarks&utm=kept${anchor}`);
  await assertSelection(page, "google", "benchmarks");
  await page.reload();
  await assertSelection(page, "google", "benchmarks");
  await selectCatalogOption(
    page.getByRole("combobox", { name: "Provider", exact: true }),
    "anthropic",
  );
  await expect(page).toHaveURL(`/changelog?provider=anthropic&type=benchmarks&utm=kept${anchor}`);
  await assertSelection(page, "anthropic", "benchmarks");
  await page.getByTestId("updates-filter-models").click();
  await expect(page).toHaveURL(`/changelog?provider=anthropic&type=models&utm=kept${anchor}`);
  await assertSelection(page, "anthropic", "models");
  const length = await page.evaluate(() => history.length);
  await page.getByTestId("updates-filter-models").click();
  await expect(page.getByTestId("updates-filter-models")).toHaveAttribute("aria-pressed", "true");
  await selectCatalogOption(
    page.getByRole("combobox", { name: "Provider", exact: true }),
    "anthropic",
  );
  expect(await page.evaluate(() => history.length)).toBe(length);
  await page.goBack();
  await expect(page).toHaveURL(`/changelog?provider=anthropic&type=benchmarks&utm=kept${anchor}`);
  await assertSelection(page, "anthropic", "benchmarks");
  await page.goForward();
  await assertSelection(page, "anthropic", "models");
  const event = ordered.find(
    (entry) =>
      entry.providerId === "anthropic" && marketEventCategories(entry.type).includes("models"),
  );
  if (!event) throw new Error("Missing owned model event");
  await page.locator(`#${event.id}`).getByRole("link", { name: event.title, exact: true }).click();
  await expect(page).toHaveURL(`/changelog/${event.id}`);
  await expect(page.getByTestId("event-detail")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`/changelog?provider=anthropic&type=models&utm=kept${anchor}`);
  await assertSelection(page, "anthropic", "models");
  await page.goForward();
  await expect(page).toHaveURL(`/changelog/${event.id}`);
  await page.goBack();
  await assertSelection(page, "anthropic", "models");
  await selectCatalogOption(
    page.getByRole("combobox", { name: "Provider", exact: true }),
    "google",
  );
  await expect(page).toHaveURL(`/changelog?provider=google&type=models&utm=kept${anchor}`);
  await assertSelection(page, "google", "models");
  await page.goto(`/changelog${anchor}`);
  await expect(page.locator(anchor)).toBeVisible();
  await page.goto("/changelog?type=pricing#deepseek-api-prices-cut");
  await assertSelection(page, null, "pricing");
  await expect(page.locator("#deepseek-api-prices-cut")).toBeVisible();
});

test("duplicate first values normalize by replacement and Back/Forward retain selection history", async ({
  page,
}) => {
  const anchor = "#gemini-4-argon-announced";
  await page.goto("/changelog?provider=anthropic&type=models");
  await assertSelection(page, "anthropic", "models");
  await page.goto(
    `/changelog?type=benchmarks&type=models&provider=google&provider=openai&utm=kept${anchor}`,
  );
  await expect(page).toHaveURL(`/changelog?provider=google&type=benchmarks&utm=kept${anchor}`);
  await assertSelection(page, "google", "benchmarks");
  await page.goBack();
  await assertSelection(page, "anthropic", "models");
  await page.goForward();
  await assertSelection(page, "google", "benchmarks");
});

test("unknown providers suppress feeds and rows while valid empty and invalid filters recover", async ({
  page,
}) => {
  const anchor = "#gemini-4-argon-announced";
  await page.goto(`/changelog?provider=not-a-provider&type=all&utm=kept${anchor}`);
  await expect(page).toHaveURL(`/changelog?provider=not-a-provider&utm=kept${anchor}`);
  await expect(page.getByRole("status")).toContainText("Provider not recognized.");
  await expect(page.getByTestId("update-subscriptions")).toHaveCount(0);
  await expect(
    page.locator(
      'head link[rel="alternate"][type="application/rss+xml"], head link[rel="alternate"][type="application/json"]',
    ),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("update-subscriptions")).toHaveCount(0);
  await expect(
    page.locator(
      'head link[rel="alternate"][type="application/rss+xml"], head link[rel="alternate"][type="application/json"]',
    ),
  ).toHaveCount(0);
  await expect(page.getByTestId("updates-event")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(`/changelog?utm=kept${anchor}`);
  await assertSelection(page, null, "all");
  await page.goto(`/changelog?provider=mistral&type=invalid&utm=kept${anchor}`);
  await expect(page).toHaveURL(`/changelog?provider=mistral&utm=kept${anchor}`);
  await assertSelection(page, "mistral", "all");
  await expect(page.getByRole("combobox", { name: "Provider", exact: true })).toHaveText(
    "Mistral AI",
  );
  await page.getByTestId("updates-filter-pricing").click();
  await expect(page).toHaveURL(`/changelog?provider=mistral&type=pricing&utm=kept${anchor}`);
  await assertSelection(page, "mistral", "pricing");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await assertSelection(page, null, "all");
});

test("explicit all filters normalize while preserving unrelated query and hash", async ({
  page,
}) => {
  const anchor = "#gemini-4-argon-announced";
  await page.goto(`/changelog?provider=all&type=all&utm=kept${anchor}`);
  await expect(page).toHaveURL(`/changelog?utm=kept${anchor}`);
  await assertSelection(page, null, "all");
});

test("permanent details expose original sources and separate dates, self metadata, 404 and sitemap membership", async ({
  page,
  request,
}) => {
  for (const id of [
    "gemini-4-argon-announced",
    "deepseek-api-prices-cut",
    "claude-sonnet-4-5-deprecated",
  ]) {
    const event = marketFeed.events.find((entry) => entry.id === id);
    if (!event) throw new Error("Missing provenance fixture");
    const response = await page.goto(`/changelog/${id}`);
    expect(response?.status()).toBe(200);
    const detail = page.getByTestId("event-detail");
    await expect(detail.getByRole("heading", { level: 1 })).toHaveText(event.title);
    for (const source of event.sources) {
      await expect(detail.getByRole("link", { name: source.title, exact: false })).toHaveAttribute(
        "href",
        source.url,
      );
      if (source.excerpt)
        await expect(detail.getByText(source.excerpt, { exact: true })).toBeVisible();
    }
    await expect(detail.locator("dl")).toContainText(event.occurredAt);
    await expect(detail.locator("dl")).toContainText("Status recorded with this event");
    await expect(detail.locator("dl")).toContainText(event.status);
    if (event.effectiveAt) await expect(detail.locator("dl")).toContainText(event.effectiveAt);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://stackreplay.com/changelog/${id}`,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://stackreplay.com/brand/open-graph-1200x630.png",
    );
    await expect(
      page.locator(
        'meta[property="article:modified_time"], meta[property="article:published_time"]',
      ),
    ).toHaveCount(0);
    await expect(detail.getByRole("link", { name: /All updates from/u })).toHaveAttribute(
      "href",
      `/changelog?provider=${event.providerId}`,
    );
  }
  expect((await request.get("/changelog/unknown-event")).status()).toBe(404);
  const xml = await (await request.get("/sitemap.xml")).text();
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gu)]
    .map((match) => match[1] ?? "")
    .filter((entry) => entry.includes("/changelog"));
  expect(entries).toHaveLength(26);
  for (const event of marketFeed.events)
    expect(entries.some((entry) => entry.includes(`/changelog/${event.id}</loc>`))).toBe(true);
  for (const entry of entries) expect(entry).not.toMatch(/lastmod|\?|feed\.(json|xml)/u);
});

test("updates controls and details support keyboard, both themes and 320px without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/changelog?provider=google&type=models");
  await assertSelection(page, "google", "models");
  // Visible SSR controls do not imply that client event handlers have mounted.
  await expect(page.getByTestId("updates-feed")).toHaveAttribute("data-client-ready", "true");
  const select = page.getByRole("combobox", { name: "Provider", exact: true });
  await select.focus();
  await expect(select).toBeFocused();
  await select.press("Tab");
  await expect(page.getByTestId("updates-filter-all")).toBeFocused();
  await page.getByTestId("updates-filter-benchmarks").focus();
  await expect(page.getByTestId("updates-filter-benchmarks")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/changelog?provider=google&type=benchmarks");
  await assertSelection(page, "google", "benchmarks");
  const rss = page
    .getByTestId("update-subscriptions")
    .getByRole("link", { name: "RSS", exact: true });
  await page.getByTestId("updates-filter-pricing").focus();
  await page.keyboard.press("Tab");
  await expect(rss).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByTestId("update-subscriptions").getByRole("link", { name: "JSON", exact: true }),
  ).toBeFocused();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.classList.toggle("dark", value === "dark");
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="updates-feed"]').analyze()).violations,
    ).toEqual([]);
  }
  await page
    .getByTestId("updates-event")
    .first()
    .getByRole("link", { name: "Event details and sources" })
    .click();
  await expect(page).toHaveURL("/changelog/google-argon-launch-results");
  await expect(page.getByTestId("event-detail")).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.classList.toggle("dark", value === "dark");
    }, theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="event-detail"]').analyze()).violations,
    ).toEqual([]);
  }
});
