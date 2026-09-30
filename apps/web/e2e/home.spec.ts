import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { loadBundledCatalog } from "@stackreplay/catalog/bundled";
import type { StackReplayExportV1 } from "@stackreplay/schema";
import { copyDefects } from "../lib/copy-lint";
import { canonicalUsage } from "../lib/home/personal";
import type { ImportRecord } from "../lib/worker-protocol";
import { stackWorkloadFile } from "./fixtures/stack-workload";
import { captureRequests, gotoImport, importDemo, waitForWorkload } from "./helpers";

/**
 * The homepage: public market intelligence that needs no scan, and a personal
 * layer read from what this browser already stores. Nothing on it may start a
 * scan, open the replay Worker, or match a model by its name.
 */

const STACK_KEY = "stackreplay.current-stack";
const STACK = [
  "plan:anthropic-claude-max-20x",
  "plan:openai-chatgpt-pro",
  "plan:command-code-pro",
  "plan:opencode-go",
];
const shots = process.env.STACKREPLAY_SCREENSHOT_DIR;

async function shoot(page: Page, name: string) {
  if (shots === undefined) return;
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: true });
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

/** The ordinary multi-tool fixture plus calls whose model names only look like catalog models. */
function workloadWithLookalikes(): StackReplayExportV1 {
  const file = stackWorkloadFile();
  const template = file.events[0];
  if (template === undefined) throw new Error("fixture has no events");
  const lookalikes = ["claude-opus-5-5-preview", "Claude Opus 5.5 (beta)"].map(
    (rawName, index) => ({
      ...template,
      id: `${template.id}_lookalike_${index}`,
      model: { rawName },
      ...("confidence" in template && template.confidence !== undefined
        ? { confidence: { ...template.confidence, model: "unknown" as const } }
        : {}),
      source: { ...template.source, nativeEventHash: `lookalike_${index}` },
    }),
  );
  return { ...file, events: [...file.events, ...lookalikes] };
}

async function saveWorkload(page: Page, file: StackReplayExportV1): Promise<string> {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name: "history.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await waitForWorkload(page);
  return new URL(page.url()).searchParams.get("import") ?? "";
}

async function storedRecord(page: Page, id: string): Promise<ImportRecord> {
  return page.evaluate(
    (importId) =>
      new Promise<ImportRecord>((resolve, reject) => {
        const request = indexedDB.open("stackreplay");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const get = request.result
            .transaction("imports", "readonly")
            .objectStore("imports")
            .get(importId);
          get.onsuccess = () => resolve(get.result as ImportRecord);
          get.onerror = () => reject(get.error);
        };
      }),
    id,
  );
}

test.describe("homepage without a saved workload", () => {
  test("publishes market intelligence and invites a scan without starting one", async ({
    page,
  }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const requests = captureRequests(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Know the AI market. Know what fits your workload.",
      }),
    ).toBeVisible();
    await expect(page.getByTestId("home-trust")).toContainText("never uploaded");

    // Market Pulse lists only changes derived from real catalog records.
    const catalog = loadBundledCatalog();
    const items = page.getByTestId("market-pulse-item");
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);
    for (const pulseId of await items.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-pulse-id") ?? ""),
    )) {
      const [category, id = "", date] = pulseId.split(":");
      expect(id.startsWith("example-"), pulseId).toBe(false);
      if (category === "model") expect(catalog.models[id]?.releaseDate, pulseId).toBeDefined();
      else if (category === "plan") expect(catalog.plans[id], pulseId).toBeDefined();
      else if (category === "price")
        expect(
          Object.values(catalog.pricing).some(
            (price) => price.modelId === id && price.effectiveFrom === date,
          ),
          pulseId,
        ).toBe(true);
      else throw new Error(`Unexpected pulse row ${pulseId}`);
    }
    await expect(page.getByTestId("market-pulse")).not.toContainText("Benchmark");

    // Public tables and cards, with no personal claims.
    await expect(page.getByTestId("home-model-comparison").locator("th[scope=col]")).toHaveCount(4);
    await expect(page.getByTestId("model-usage-row")).toHaveAttribute("data-state", "public");
    await expect(page.getByTestId("benchmark-note")).toBeVisible();
    await expect(page.getByTestId("home-plan-card")).toHaveCount(4);
    await expect(page.getByTestId("personal-mark")).toHaveCount(0);
    await expect(page.getByTestId("personal-intelligence")).toHaveAttribute(
      "data-personal",
      "public",
    );
    await expect(page.getByTestId("personal-question")).toHaveCount(8);
    await expect(page.getByTestId("personal-question").locator("a")).toHaveCount(0);
    await expect(page.getByTestId("personal-example")).toContainText("not yours");

    // The personal action points at a scan, and the check created no local database.
    const action = page.getByTestId(
      testInfo.project.name === "mobile" ? "local-action-hero" : "local-action-header",
    );
    await expect(action.first()).toHaveAttribute("data-local", "none");
    await expect(action.first()).toHaveAttribute("href", "/app/import");
    const databases = await page.evaluate(async () =>
      (await indexedDB.databases()).map((database) => database.name),
    );
    expect(databases).not.toContain("stackreplay");

    // No upload, no scan, no replay Worker on the public homepage.
    expect(requests.filter((request) => (request.body ?? "").length > 0)).toEqual([]);
    expect(requests.some((request) => request.url.includes("stackreplay-worker"))).toBe(false);
    expect(copyDefects(await page.locator("main").innerText())).toEqual([]);
    await shoot(page, `home-public-${testInfo.project.name}`);
    expect(errors).toEqual([]);
  });

  test("states known plan facts before any gap, and never ends on 'not published'", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText(/^\s*not published\s*$/iu)).toHaveCount(0);
    for (const card of await page.getByTestId("home-plan-card").all()) {
      await expect(card.locator("dt", { hasText: "Usage" })).toBeVisible();
      const capacity = card.getByTestId("plan-capacity");
      const evidence = await capacity.getAttribute("data-evidence");
      expect(["calculable", "bounded", "access-only"]).toContain(evidence);
      if (evidence === "bounded") {
        await expect(capacity).toContainText("can't be proven");
        await expect(capacity).not.toContainText(/fits your|enough for/iu);
      }
      // The gap is secondary: behind a disclosure, not the card's headline.
      const gap = capacity.locator("details");
      if ((await gap.count()) > 0) await expect(gap).not.toHaveAttribute("open", "");
    }
    await expect(
      page.locator('[data-plan-id="github-copilot-pro-plus"] [data-testid="plan-capacity"]'),
    ).toHaveAttribute("data-evidence", "calculable");
    await expect(
      page.locator('[data-plan-id="anthropic-claude-max-20x"] [data-testid="plan-capacity"]'),
    ).toHaveAttribute("data-evidence", "bounded");
  });

  test("lays out each section for its width without page overflow", async ({ page }, testInfo) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    const tops = await page
      .getByTestId("home-plan-card")
      .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    const lefts = await page
      .getByTestId("home-plan-card")
      .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().left)));
    if (testInfo.project.name === "mobile") {
      // One swipeable row: same top, the later cards start past the viewport.
      expect(new Set(tops).size).toBe(1);
      expect(Math.max(...lefts)).toBeGreaterThan(page.viewportSize()?.width ?? 0);
      const region = page.getByTestId("model-table-region");
      expect(await region.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
      await region.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    } else {
      await page.setViewportSize({ width: 1440, height: 900 });
      const wide = await page
        .getByTestId("home-plan-card")
        .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
      expect(new Set(wide).size).toBe(1);
      // The capacity sections of a row line up.
      const capacity = await page
        .getByTestId("plan-capacity")
        .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
      expect(new Set(capacity).size).toBe(1);
    }
  });

  test("header separates the market from the personal surfaces", async ({ page }, testInfo) => {
    await page.goto("/plans");
    if (testInfo.project.name === "mobile") {
      const menu = page.getByTestId("public-nav-menu");
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      const panel = page.getByRole("navigation", { name: "Public" }).last();
      await expect(panel.getByText("Market", { exact: true })).toBeVisible();
      await expect(panel.getByText("Your workload", { exact: true })).toBeVisible();
      await expect(panel.getByRole("link", { name: "Plans" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await page.keyboard.press("Escape");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await expect(menu).toBeFocused();
      await menu.click();
      await page
        .getByRole("navigation", { name: "Public" })
        .last()
        .getByRole("link", { name: "Models" })
        .click();
      await expect(page).toHaveURL(/\/models$/u);
      await expect(menu).toHaveAttribute("aria-expanded", "false");
    } else {
      const nav = page.getByTestId("public-nav");
      await expect(nav.getByRole("link")).toHaveText(
        ["Models", "Compare", "Plans", "Updates", "Workload", "My Stack", "Scan my history"],
        { useInnerText: true },
      );
      await expect(nav.getByRole("list", { name: "Your workload" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "Plans" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
  });

  test("keyboard users reach the header, the hero actions and the scroll regions", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop keyboard order");
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to content/iu })).toBeFocused();
    const order: string[] = [];
    for (let step = 0; step < 12; step += 1) {
      await page.keyboard.press("Tab");
      order.push(
        await page.evaluate(
          () => (document.activeElement as HTMLElement | null)?.innerText.trim() ?? "",
        ),
      );
    }
    expect(order.slice(1, 8)).toEqual([
      "Models",
      "Compare",
      "Plans",
      "Updates",
      "Workload",
      "My Stack",
      "Scan my history",
    ]);
    expect(order).toContain("Explore models");
    await expect(page.getByTestId("model-table-region")).toHaveAttribute("tabindex", "0");
    await expect(page.getByTestId("home-plan-grid")).toHaveAttribute("tabindex", "0");
  });
});

test.describe("homepage with a saved workload", () => {
  // The fixture month (September 2026) has ended.
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
  });

  test("personalizes public surfaces by canonical identity, without a scan", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "one import per worker is enough");
    const id = await saveWorkload(page, workloadWithLookalikes());
    // A more recent demo must not replace the visitor's own workload in either
    // the snapshot or the header and hero destinations.
    await page.clock.setFixedTime(new Date("2026-10-15T12:01:00Z"));
    await importDemo(page, "moderate");
    await page.evaluate(({ key, stack }) => localStorage.setItem(key, JSON.stringify(stack)), {
      key: STACK_KEY,
      stack: STACK,
    });
    const record = await storedRecord(page, id);
    const usage = canonicalUsage(record.summary);

    const errors = collectConsoleErrors(page);
    const requests = captureRequests(page);
    await page.goto("/");
    const personal = page.getByTestId("personal-intelligence");
    await expect(personal).toHaveAttribute("data-personal", "ready", { timeout: 30_000 });

    // Header and hero switch to the saved workload.
    await expect(page.getByTestId("local-action-header").first()).toHaveAttribute(
      "href",
      `/app/workload?import=${id}`,
    );
    await expect(page.getByTestId("local-action-header").first()).toHaveText("Open my workload", {
      useInnerText: true,
    });
    await expect(page.getByTestId("local-action-hero")).toHaveText("Open my workload", {
      useInnerText: true,
    });
    await expect(page.getByTestId("local-action-hero")).toHaveAttribute(
      "href",
      `/app/workload?import=${id}`,
    );

    // The snapshot reads the stored summary.
    const snapshot = page.getByTestId("personal-snapshot");
    await expect(snapshot).toContainText(record.summary.eventCount.toLocaleString("en-US"));
    await expect(snapshot).toContainText("calls with unresolved model identity");
    await expect(page.getByTestId("personal-stack")).toContainText("Claude Max 20x");
    await expect(page.getByTestId("personal-stack")).toContainText("$330/month");

    // Model rows count exact canonical identities; lookalike names never count.
    expect(usage.unresolved).toBeGreaterThanOrEqual(2);
    for (const cell of await page.locator('[data-testid^="model-usage-"][data-usage]').all()) {
      const modelId = ((await cell.getAttribute("data-testid")) ?? "").replace("model-usage-", "");
      const calls = usage.byModel.get(modelId) ?? 0;
      if (calls > 0) {
        await expect(cell).toHaveAttribute("data-usage", "used");
        await expect(cell).toContainText(`${calls.toLocaleString("en-US")} calls`);
      } else await expect(cell).not.toHaveAttribute("data-usage", "used");
    }
    await expect(page.getByTestId("model-usage-claude-opus-5-5")).not.toHaveAttribute(
      "data-usage",
      "used",
    );

    // Plans in the Current Stack are marked; others are not.
    const inStack = (planId: string) =>
      page.locator(`[data-plan-id="${planId}"] [data-testid="personal-mark"]`);
    await expect(inStack("anthropic-claude-max-20x")).toHaveText("In your stack");
    await expect(inStack("openai-chatgpt-pro")).toHaveText("In your stack");
    await expect(inStack("github-copilot-pro-plus")).toHaveCount(0);
    await expect(page.getByTestId("plan-lineup-note").first()).toContainText(
      "of your recorded calls",
    );

    // Questions open the analyses that answer them.
    const question = (questionId: string) => page.locator(`[data-question-id="${questionId}"] a`);
    await expect(question("downgrade-claude")).toHaveAttribute(
      "href",
      `/app/replay?import=${id}&stack=${encodeURIComponent(
        "anthropic-claude-max-5x,openai-chatgpt-pro,command-code-pro,opencode-go",
      )}`,
    );
    await expect(question("cancel-chatgpt")).toHaveAttribute(
      "href",
      `/app/replay?import=${id}&stack=${encodeURIComponent(
        "anthropic-claude-max-20x,command-code-pro,opencode-go",
      )}`,
    );
    await expect(question("api-cheaper")).toHaveAttribute(
      "href",
      `/app/compare?import=${id}&view=billing`,
    );
    expect(copyDefects(await page.locator("main").innerText())).toEqual([]);
    await shoot(page, "home-personal-desktop");

    // Reading the saved workload uploaded nothing and did not start the replay Worker.
    expect(requests.filter((request) => (request.body ?? "").length > 0)).toEqual([]);
    expect(requests.some((request) => request.url.includes("stackreplay-worker"))).toBe(false);
    expect(errors).toEqual([]);

    // The downgrade question lands on Replay's stack scenario for that change.
    await question("downgrade-claude").click();
    await expect(page.getByTestId("replay-stack-scenario")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("replay-scenario-outcome-delta")).toContainText("−$100/mo", {
      timeout: 60_000,
    });
  });

  test("passes axe once personalized, in both themes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop pass");
    await saveWorkload(page, stackWorkloadFile());
    await page.evaluate(({ key, stack }) => localStorage.setItem(key, JSON.stringify(stack)), {
      key: STACK_KEY,
      stack: STACK,
    });
    for (const theme of ["dark", "light"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/");
      await expect(page.getByTestId("personal-intelligence")).toHaveAttribute(
        "data-personal",
        "ready",
        { timeout: 30_000 },
      );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      );
      expect(serious.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
    }
  });

  test("a demo workload opens the workload but never personalizes the page", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "desktop pass");
    await importDemo(page, "moderate");
    await page.goto("/");
    await expect(page.getByTestId("personal-note")).toContainText("Only a demo workload", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("personal-intelligence")).toHaveAttribute(
      "data-personal",
      "public",
    );
    await expect(page.getByTestId("personal-mark")).toHaveCount(0);
    await expect(page.getByTestId("local-action-header").first()).toHaveText("Open my workload", {
      useInnerText: true,
    });
  });
});
