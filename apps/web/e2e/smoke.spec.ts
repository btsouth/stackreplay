import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the app entry opens Scan on a first visit, with working navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/scan$/);
  await expect(page.getByRole("heading", { name: "Scan your history", exact: true })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("link", { name: "StackReplay home" }),
  ).toBeVisible();

  if (testInfo.project.name === "desktop") {
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(nav.getByRole("link", { name: "Scan history" })).toHaveAttribute(
      "href",
      "/app/scan",
    );
  }
});

test("public and workspace content keep safe gutters", async ({ page }, testInfo) => {
  for (const route of ["/", "/methodology", "/app/scan", "/app/settings"]) {
    await page.goto(route);
    // The recap homepage owns section gutters; catalog and app shells own main gutters.
    const rail = route === "/" ? page.locator(".replay-hero") : page.getByRole("main");
    const gutter = await rail.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return Math.min(
        rect.left + Number.parseFloat(style.paddingLeft),
        innerWidth - rect.right + Number.parseFloat(style.paddingRight),
      );
    });
    expect(gutter).toBeGreaterThanOrEqual(testInfo.project.name === "mobile" ? 20 : 32);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("Import and Settings provide a route back into Replay", async ({ page }, testInfo) => {
  for (const route of ["/app/scan", "/app/settings"]) {
    await page.goto(route);
    await expect(
      page.getByRole("banner").getByRole("link", { name: "StackReplay home" }),
    ).toHaveAttribute("href", "/");
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("dialog").getByRole("link", { name: "Plans", exact: true }).click();
    } else {
      await page
        .getByRole("navigation", { name: "Primary" })
        .getByRole("link", { name: "Plans" })
        .click();
    }
    await expect(page).toHaveURL(/\/app\/plans$/);
  }
});

test("skip link becomes visible on focus", async ({ page }) => {
  await page.goto("/app/scan");
  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("theme defaults to the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/app/scan");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("theme toggle switches and persists across reloads", async ({ page }) => {
  await page.goto("/app/scan");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});

test("mobile drawer navigation works and closes on navigate", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile viewport only");
  await page.goto("/app/scan");

  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("link", { name: "Plans", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/plans$/);
  await expect(page.getByRole("heading", { name: "Your plans" })).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Reopen: the drawer marks the current section.
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Plans", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("desktop keeps the workspace navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop viewport only");
  await page.goto("/app/plans?section=replay&mode=custom");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
});

test("internal design surface does not claim a navigation section", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop viewport only");
  await page.goto("/design");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Stats" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

for (const theme of ["light", "dark"] as const) {
  for (const route of ["/app/scan", "/design"]) {
    test(`${route} has no axe violations or horizontal overflow in ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(route);
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
}

test("system theme survives unavailable or invalid storage", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await page.goto("/app/scan");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("invalid stored theme falls back to system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("stackreplay-theme", "invalid"));
  await page.goto("/app/scan");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("all workspace routes have a matching heading and navigation state", async ({
  page,
}, info) => {
  for (const [path, label, heading] of [
    ["/app/stats", "Stats", "Your stats"],
    ["/app/plans", "Plans", "Your plans"],
    ["/app/settings", "Settings", "Settings"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Open menu" }).click();
    const nav =
      info.project.name === "mobile"
        ? page.getByRole("dialog").getByRole("navigation", { name: "Primary" })
        : page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("mobile drawer traps focus, dismisses, and adapts to desktop", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile viewport only");
  await page.goto("/app/scan");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "StackReplay home" })).toBeVisible();
  for (const route of ["Recap", "Stats", "Plans", "Settings", "Scan history"])
    await expect(dialog.getByRole("link", { name: route, exact: true })).toBeVisible();
  // Base UI transfers focus through an offscreen guard asynchronously.
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.reload();
    await trigger.click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(trigger).toBeFocused();
  }
  await trigger.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
});

test("mobile controls have touch-sized targets and narrow layouts fit", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "touch viewport only");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/design");
  for (const control of await page
    .locator("button:visible, input:visible:not([aria-hidden=true]):not([type=hidden])")
    .all()) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.setViewportSize({ width: 568, height: 320 });
  const settings = page.getByRole("dialog").getByRole("link", { name: "Settings" });
  await settings.click();
  await expect(page).toHaveURL(/\/app\/settings$/);
});

test("input labels, error description, keyboard focus and reduced motion work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design");
  const input = page.getByRole("textbox", { name: "Plan slug" });
  await input.fill("example-plan");
  await expect(input).toHaveValue("example-plan");
  await page.keyboard.press("Tab");
  const invalid = page.getByRole("textbox", { name: "Invalid", exact: true });
  await expect(invalid).toBeFocused();
  await expect(invalid).toHaveAccessibleDescription("No plan matches this slug.");
  expect(await invalid.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
  expect(
    await input.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
  ).toBeLessThan(0.001);
});
