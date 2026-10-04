import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo, test } from "@playwright/test";

const epochPin =
  "epoch-gpqa-sonnet-5-5-max-2026-10-04.epoch-gpqa-diamond-revision-unreported.claude-sonnet-5-5";
const six =
  "claude-sonnet-5-5,claude-opus-5-5,qwen-3-8-max-0902,gpt-6-1-sol,gemini-4-argon,grok-4-7";
async function openImages(page: Page) {
  const before = await page.evaluate(() => ({
    href: location.href,
    length: history.length,
    theme: localStorage.getItem("stackreplay-theme"),
  }));
  await page.getByRole("button", { name: "Export images", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export benchmark images" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Download PNG/ })).toBeVisible();
  expect(
    await page.evaluate(() => ({
      href: location.href,
      length: history.length,
      theme: localStorage.getItem("stackreplay-theme"),
    })),
  ).toEqual(before);
  return dialog;
}
async function downloadPng(page: Page, testInfo: TestInfo, label: string) {
  const dialog = page.getByRole("dialog", { name: "Export benchmark images" });
  const link = dialog.getByRole("link", { name: /Download PNG/ });
  await expect(link).toBeVisible();
  const preview = dialog.locator("img");
  await expect(preview).toBeVisible();
  await expect
    .poll(() =>
      preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  const expected = await preview.evaluate((image: HTMLImageElement) => ({
    width: image.naturalWidth,
    height: image.naturalHeight,
  }));
  const downloaded = page.waitForEvent("download");
  await link.click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^stackreplay-benchmarks-.*-page-\d+-of-\d+\.png$/);
  const path = testInfo.outputPath(`${label}.png`);
  await download.saveAs(path);
  const bytes = await readFile(path);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(bytes.subarray(12, 16).toString()).toBe("IHDR");
  const dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  expect(dimensions).toEqual(expected);
  expect(dimensions.width).toBe(1600);
  expect(dimensions.height).toBeGreaterThan(400);
  expect(dimensions.height).toBeLessThanOrEqual(16384);
  await testInfo.attach(`${label}-metadata`, {
    body: JSON.stringify({
      filename: download.suggestedFilename(),
      bytes: bytes.length,
      ...dimensions,
    }),
    contentType: "application/json",
  });
  await testInfo.attach(`${label}-page-text`, {
    body: (await dialog.locator(".bench-image-text").textContent()) ?? "",
    contentType: "text/plain",
  });
  return dimensions;
}

// The accepted default fixture proves density without capping future catalog views.
const acceptedDefault =
  "edition=2026-10-04-v3&models=gemini-4-argon,gpt-6-astra,gpt-6-1-sol,claude-opus-5-5,claude-fable-5-1";

for (const theme of ["light", "dark"] as const) {
  test(`PNG default ${theme}: long view, explicit downloads, keyboard, wrapping and accessible dialog`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript((value) => localStorage.setItem("stackreplay-theme", value), theme);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto(`/benchmarks?${acceptedDefault}`);
    const dialog = await openImages(page);
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    const count = Number(
      (await dialog.locator(".bench-image-page-count").innerText()).match(/of (\d+)/)?.[1],
    );
    expect(count).toBeGreaterThan(1);
    expect(count).toBeLessThanOrEqual(6);
    await expect(dialog.locator(".bench-image-text")).toContainText(
      "This page shows only this slice",
    );
    await downloadPng(page, testInfo, `default-${theme}-first`);
    await page.screenshot({ path: testInfo.outputPath(`dialog-${theme}.png`), fullPage: true });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      const controls = await dialog.locator(".bench-image-control").evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            width: rect.width,
            clipped: element.scrollWidth > element.clientWidth,
          };
        }),
      );
      for (const control of controls) {
        expect(control.left).toBeGreaterThanOrEqual(0);
        expect(control.right).toBeLessThanOrEqual(width);
        expect(control.clipped).toBe(false);
      }
      await page.screenshot({
        path: testInfo.outputPath(`dialog-${theme}-${width}.png`),
        fullPage: true,
      });
    }
    const next = dialog.getByRole("button", { name: "Next page" });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(dialog.locator(".bench-image-page-count")).toHaveText(`Page 2 of ${count}`);
    await expect(dialog.getByRole("link", { name: /Download PNG/ })).toHaveAttribute(
      "download",
      new RegExp(`page-2-of-${count}`),
    );
    // Visit the final row/model slice. Every combination is independently proved in pure tests.
    for (let index = 2; index < count; index++) await next.click();
    await expect(dialog.locator(".bench-image-page-count")).toHaveText(`Page ${count} of ${count}`);
    await expect(next).toBeDisabled();
    await downloadPng(page, testInfo, `default-${theme}-last`);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Export images", exact: true })).toBeFocused();
  });
}

test("PNG six models: exact Epoch precision, column slices, gaps and scoped source rights", async ({
  page,
}, testInfo) => {
  await page.goto(`/benchmarks?models=${six}&category=science&observation=${epochPin}`);
  const dialog = await openImages(page);
  const count = Number(
    (await dialog.locator(".bench-image-page-count").innerText()).match(/of (\d+)/)?.[1],
  );
  const scopes: string[] = [];
  let exactFound = false;
  let gapFound = false;
  for (let index = 0; index < count; index++) {
    const text = (await dialog.locator(".bench-image-text").textContent()) ?? "";
    scopes.push(text);
    if (text.includes("95.5808080808080800%")) {
      exactFound = true;
      expect(text).toContain("90.5934343434343400%");
      expect(text).toContain("92.297979797979800%");
      expect(text).toContain("CC BY 4.0");
      expect(text).toContain("https://epoch.ai/benchmarks/use-this-data");
      expect(text).toContain("Original run publication and completion dates are unknown");
      expect(text).toContain("Different or unreported setups");
      expect(text).toContain(epochPin);
      await downloadPng(page, testInfo, "six-epoch-exact");
    }
    if (
      text.includes("Models 4–6 of 6") &&
      text.includes("GPQA") &&
      text.includes("Not reported")
    ) {
      gapFound = true;
      expect(text).not.toContain("CC BY 4.0");
      await downloadPng(page, testInfo, "six-epoch-gaps");
    }
    if (index < count - 1) {
      await dialog.getByRole("button", { name: "Next page" }).click();
      await expect(dialog.getByRole("link", { name: /Download PNG/ })).toHaveAttribute(
        "download",
        new RegExp(`page-${index + 2}-of-${count}`),
      );
    }
  }
  expect(exactFound).toBe(true);
  expect(gapFound).toBe(true);
  expect(scopes.some((text) => text.includes("Models 1–3 of 6"))).toBe(true);
  expect(scopes.some((text) => text.includes("Models 4–6 of 6"))).toBe(true);
});

for (const [label, query, required] of [
  [
    "v1-source",
    "edition=2026-09-30-v1&models=gemini-4-argon,gpt-6-astra&category=security&source=google-deepmind-argon-2026-09-30",
    "Google DeepMind",
  ],
  [
    "v2-pin",
    "edition=2026-09-30-v2&models=gpt-6-1-sol&category=coding&observation=openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol",
    "75.22%",
  ],
  ["empty", `models=${six}&category=science&coverage=shared`, "No reported evidence in this view."],
] as const) {
  test(`PNG ${label}: exact requested view`, async ({ page }, testInfo) => {
    await page.goto(`/benchmarks?${query}`);
    const dialog = await openImages(page);
    await expect(dialog.locator(".bench-image-text")).toContainText(required);
    await downloadPng(page, testInfo, label);
    if (label === "empty") {
      await expect(dialog.locator(".bench-image-text")).not.toContainText(
        "Sources used on this page",
      );
      await expect(dialog.locator(".bench-image-page-count")).toHaveText("Page 1 of 2");
      await dialog.getByRole("button", { name: "Next page" }).click();
      await expect(dialog.locator(".bench-image-text")).toContainText("Models 4–6 of 6");
      await downloadPng(page, testInfo, "empty-second-slice");
    }
  });
}

test("PNG invalid editions and pins remain disabled with JSON", async ({ page }) => {
  for (const query of [
    "edition=unknown",
    "observation=unknown",
    "edition=2026-09-30-v1&models=gpt-6-1-sol&observation=openai-sol-2026-09-29-high.deep-swe-v1-1.gpt-6-1-sol",
    "models=gpt-6-1-sol&source=google-deepmind-argon-2026-09-30",
  ]) {
    await page.goto(`/benchmarks?${query}`);
    await expect(page.locator("#benchmark-selection-error")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export images", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Download JSON", exact: true })).toBeDisabled();
  }
});

test("PNG async: obsolete pages and selections cannot publish stale downloads or errors", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const urls = new Set<string>();
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      urls.add(url);
      document.documentElement.dataset.activePngUrls = String(urls.size);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      urls.delete(url);
      document.documentElement.dataset.activePngUrls = String(urls.size);
      revoke(url);
    };
    const native = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      native(handler, timeout === 16 ? 300 : timeout, ...args)) as typeof window.setTimeout;
  });
  await page.goto("/benchmarks");
  const dialog = await openImages(page);
  await dialog.getByRole("button", { name: "Next page" }).click();
  await expect(dialog.getByRole("link", { name: /Download PNG/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Next page" }).click();
  await expect(dialog.getByRole("link", { name: /Download PNG/ })).toHaveAttribute(
    "download",
    /page-3-of-/,
  );
  await downloadPng(page, testInfo, "async-current-page-3");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.activePngUrls))
    .toBe("1");
  await dialog.getByRole("button", { name: "Next page" }).click();
  await page.evaluate(() => {
    history.pushState(null, "", "/benchmarks?models=gpt-6-1-sol&category=security");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.activePngUrls))
    .toBe("0");
  const fresh = await openImages(page);
  await expect(fresh.locator(".bench-image-text")).toContainText(
    "No reported evidence in this view.",
  );
  await expect(fresh.locator(".bench-image-text")).toContainText("Models 1–1 of 1");
  await downloadPng(page, testInfo, "async-fresh-empty-selection");
  await expect(fresh.getByRole("alert")).toHaveCount(0);
  await fresh.getByRole("button", { name: "Close", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.activePngUrls))
    .toBe("0");
});

test("PNG async back-navigation: only a fresh live page URL can become ready", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const state = () => document.documentElement.dataset;
    const urls = new Set<string>();
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    let created = 0;
    let encoded = 0;
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      urls.add(url);
      state().activePngUrls = String(urls.size);
      state().createdPngUrls = String(++created);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      urls.delete(url);
      state().activePngUrls = String(urls.size);
      revoke(url);
    };
    const encode = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type, quality) {
      const result = encode.call(this, type, quality);
      state().encodedPngs = String(++encoded);
      return result;
    };
    // Hold the renderer's existing yield until the test explicitly releases it.
    const timer = window.setTimeout.bind(window);
    const pending = new Map<number, () => void>();
    let requested = 0;
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout !== 16 || typeof handler !== "function") return timer(handler, timeout, ...args);
      pending.set(++requested, () => handler(...args));
      state().requestedPngs = String(requested);
      return timer(() => {}, 0);
    }) as typeof window.setTimeout;
    document.addEventListener("release-png-render", (event) => {
      const request = (event as CustomEvent<number>).detail;
      const resume = pending.get(request);
      if (!resume) throw new Error(`Missing PNG render request ${request}`);
      pending.delete(request);
      resume();
    });
  });
  await page.goto(`/benchmarks?${acceptedDefault}`);
  const state = page.locator("html");
  const dialog = page.getByRole("dialog", { name: "Export benchmark images" });
  const link = dialog.getByRole("link", { name: /Download PNG/ });
  const release = (request: number) =>
    page.evaluate((value) => {
      document.dispatchEvent(new CustomEvent("release-png-render", { detail: value }));
    }, request);
  await page.getByRole("button", { name: "Export images", exact: true }).click();
  await expect(state).toHaveAttribute("data-requested-pngs", "1");
  await expect(link).toHaveCount(0);
  await release(1);
  await expect(link).toHaveAttribute("download", /page-1-of-6/);
  const originalUrl = await link.getAttribute("href");
  await expect(state).toHaveAttribute("data-active-png-urls", "1");

  await dialog.getByRole("button", { name: "Next page" }).click();
  await expect(state).toHaveAttribute("data-requested-pngs", "2");
  await expect(state).toHaveAttribute("data-active-png-urls", "0");
  await expect(link).toHaveCount(0);
  await dialog.getByRole("button", { name: "Previous page" }).click();
  await expect(dialog.locator(".bench-image-page-count")).toHaveText("Page 1 of 6");
  await expect(state).toHaveAttribute("data-requested-pngs", "3");
  // Page 1's old URL is revoked; neither it nor its preview may be republished.
  await expect(link).toHaveCount(0);
  await expect(dialog.locator("img")).toHaveCount(0);
  await expect(state).toHaveAttribute("data-created-png-urls", "1");
  await expect(state).toHaveAttribute("data-active-png-urls", "0");

  await release(3);
  await expect(link).toHaveAttribute("download", /page-1-of-6/);
  const freshUrl = await link.getAttribute("href");
  expect(freshUrl).not.toBe(originalUrl);
  await expect(state).toHaveAttribute("data-created-png-urls", "2");
  await expect(state).toHaveAttribute("data-active-png-urls", "1");
  await downloadPng(page, testInfo, "back-navigation-fresh-page-1");

  // Complete cancelled page 2 last, then allow its promise/React work to settle.
  await release(2);
  await expect(state).toHaveAttribute("data-encoded-pngs", "3");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(link).toHaveAttribute("href", freshUrl ?? "");
  await expect(link).toHaveAttribute("download", /page-1-of-6/);
  await expect(state).toHaveAttribute("data-created-png-urls", "2");
  await expect(state).toHaveAttribute("data-active-png-urls", "1");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(state).toHaveAttribute("data-active-png-urls", "0");
});

test("PNG rendering failure: no stale link, retry succeeds", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const native = HTMLCanvasElement.prototype.toDataURL;
    let fail = true;
    HTMLCanvasElement.prototype.toDataURL = function (type, quality) {
      if (fail) {
        fail = false;
        throw new Error("Simulated encoding failure");
      }
      return native.call(this, type, quality);
    };
  });
  await page.goto("/benchmarks?models=gpt-6-1-sol&category=security");
  await page.getByRole("button", { name: "Export images", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export benchmark images" });
  await expect(dialog.getByRole("alert")).toContainText("Could not create this PNG");
  await expect(dialog.getByRole("link", { name: /Download PNG/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Try again" }).click();
  await downloadPng(page, testInfo, "retry-empty");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});

test("PNG async rejection: an obsolete page error cannot invalidate the current download", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const timer = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      timer(handler, timeout === 16 ? 500 : timeout, ...args)) as typeof window.setTimeout;
    const native = HTMLCanvasElement.prototype.toDataURL;
    let first = true;
    HTMLCanvasElement.prototype.toDataURL = function (type, quality) {
      if (first) {
        first = false;
        document.documentElement.dataset.obsoletePngFailure = "done";
        throw new Error("Obsolete page failed");
      }
      return native.call(this, type, quality);
    };
  });
  await page.goto("/benchmarks");
  await page.getByRole("button", { name: "Export images", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export benchmark images" });
  await expect(dialog.getByRole("button", { name: "Next page" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Next page" }).click();
  await expect(dialog.getByRole("link", { name: /Download PNG/ })).toHaveAttribute(
    "download",
    /page-2-of-/,
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.obsoletePngFailure))
    .toBe("done");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await downloadPng(page, testInfo, "async-obsolete-rejection-current-page-2");
});

test("PNG preparation failure: useful retry prepares a fresh download", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const native = document.fonts.load.bind(document.fonts);
    let fail = true;
    document.fonts.load = (...args) => {
      if (fail) {
        fail = false;
        return Promise.reject(new Error("Simulated font preparation failure"));
      }
      return native(...args);
    };
  });
  await page.goto("/benchmarks?models=gpt-6-1-sol&category=security");
  await page.getByRole("button", { name: "Export images", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export benchmark images" });
  await expect(dialog.getByRole("alert")).toContainText("Could not load app fonts");
  await expect(dialog.getByRole("link", { name: /Download PNG/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await downloadPng(page, testInfo, "preparation-retry");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Export images", exact: true })).toBeFocused();
  const fresh = await openImages(page);
  await expect(fresh.getByRole("alert")).toHaveCount(0);
});

test("PNG dated providers: v4 facts, publication attribution and Kimi missing source scope", async ({
  page,
}, testInfo) => {
  await page.goto(
    "/benchmarks?edition=2026-10-04-v4&models=qwen-3-8-max,glm-5-3,minimax-m3,kimi-k3&category=coding",
  );
  const dialog = await openImages(page);
  const text = dialog.locator(".bench-image-text");
  await expect(text).toContainText("2026-10-04-v4");
  await expect(text).toContainText("86.6%");
  await expect(text).toContainText("88.2%");
  await expect(text).toContainText("66.0%");
  await expect(text).toContainText("Different or unreported setups");
  await expect(text).toContainText("Reporter-run · Effort unreported");
  await expect(text).toContainText("full setup, uncertainty and provenance (JSON)");
  for (const url of [
    "https://www.qwencloud.com/news/qwen-3-8-max",
    "https://z.ai/blog/glm-5.3",
    "https://www.minimax.io/blog/minimax-m3",
  ])
    await expect(text).toContainText(url);
  for (const date of ["2026-08-03", "2026-08-14", "2026-06-01"])
    await expect(text).toContainText(date);
  await expect(text).not.toContainText("CC BY 4.0");
  await downloadPng(page, testInfo, "dated-provider-facts");
  await expect(dialog.locator(".bench-image-page-count")).toHaveText("Page 1 of 2");
  await dialog.getByRole("button", { name: "Next page" }).click();
  await expect(text).toContainText("Kimi K3");
  await expect(text).toContainText("Not reported");
  await expect(text).not.toContainText("Sources used on this page");
  await expect(text).not.toContainText("qwencloud.com");
  await expect(text).not.toContainText("minimax.io");
  await expect(text).not.toContainText("z.ai/blog");
  await downloadPng(page, testInfo, "dated-provider-kimi-missing");
});

test("PNG Kimi unknown publication: exact score, separate checks and source attribution", async ({
  page,
}, testInfo) => {
  await page.goto("/benchmarks?models=kimi-k3");
  const dialog = await openImages(page);
  const text = dialog.locator(".bench-image-text");
  await expect(text).toContainText("88.3%");
  await expect(text).toContainText("Publication date unreported · Rights checked 2026-10-04");
  await expect(text).toContainText("Checked 2026-10-04");
  await expect(text).toContainText("Reporter-run · Effort: max");
  await expect(text).toContainText("Terms: https://www.kimi.com/blog/kimi-k3");
  await expect(text).toContainText("Original source: https://www.kimi.com/blog/kimi-k3");
  await expect(text).not.toContainText("null");
  await expect(text).not.toContainText("Source publication 2026-10-04");
  await expect(text).not.toContainText("CC BY");
  await downloadPng(page, testInfo, "kimi-unknown-publication");
});
