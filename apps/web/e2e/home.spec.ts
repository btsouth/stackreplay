import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { homepageBriefing, marketEventCategory, marketFeed } from "@stackreplay/market-events";
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
    // The briefing ages on the reader's clock but never reads a day earlier than the build.
    // Pinning the clock to the feed's review day makes the page's day the build day, so the
    // expectations below come from the feed at that day and never depend on when CI runs.
    await page.clock.setFixedTime(new Date(`${marketFeed.asOf}T12:00:00`));
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Know the AI market. Know what fits your workload.",
      }),
    ).toBeVisible();
    await expect(page.getByTestId("home-trust")).toContainText("never uploaded");

    // The AI market briefing reads the canonical feed: newest first, nothing older than 30 days.
    const feedIds = new Set(marketFeed.events.map((event) => event.id));
    const briefing = page.getByTestId("market-pulse");
    await expect(briefing).toContainText("AI market");
    const items = page.getByTestId("market-pulse-item");
    const today = (await briefing.getAttribute("data-today")) ?? "";
    expect(today >= marketFeed.asOf).toBe(true);
    // Exactly what the shared selection gives for that day: same ids, same order.
    const expected = homepageBriefing(marketFeed.events, { today, limit: 5 }).map((e) => e.id);
    await expect(items).toHaveCount(expected.length);
    const rows = await items.evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute("data-pulse-id") ?? "",
        day: node.getAttribute("data-day") ?? "",
        importance: node.getAttribute("data-importance") ?? "",
      })),
    );
    for (const row of rows) {
      expect(feedIds.has(row.id), row.id).toBe(true);
      expect(row.importance).not.toBe("minor");
      const age =
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${row.day}T00:00:00Z`)) / 86_400_000;
      expect(age, row.id).toBeGreaterThanOrEqual(0);
      expect(age, row.id).toBeLessThanOrEqual(30);
    }
    expect(rows.map((row) => row.day)).toEqual([...rows.map((row) => row.day)].sort().reverse());
    expect(rows.map((row) => row.id)).toEqual(expected);
    // The newest event is the lead story, with its facts as figures; the rest are compact rows.
    if (expected.length > 0) {
      await expect(items.first()).toHaveAttribute("data-lead", "");
      await expect(briefing.locator("[data-lead]")).toHaveCount(1);
      await expect(
        briefing.getByRole("heading", {
          level: 3,
          name: marketFeed.events.find((e) => e.id === expected[0])?.title ?? "",
        }),
      ).toBeVisible();
    }
    // Above the briefing: the last seven days by kind in one line, counted from the same feed.
    const week = page.getByTestId("market-week");
    const inWeek = marketFeed.events.filter((event) => {
      const age =
        (Date.parse(`${today}T00:00:00Z`) -
          Date.parse(`${event.occurredAt.slice(0, 10)}T00:00:00Z`)) /
        86_400_000;
      return age >= 0 && age <= 7;
    });
    if (inWeek.length === 0) await expect(week).toHaveCount(0);
    else await expect(week.locator("dd").first()).toHaveText(String(inWeek.length));
    await expect(page.getByTestId("market-week-related")).toHaveCount(0);
    await expect(briefing.getByRole("link", { name: /View all AI updates/u })).toHaveAttribute(
      "href",
      "/changelog",
    );

    // Models that matter right now: five releases with at most three verified benchmark rows.
    const frontier = page.getByTestId("home-model-comparison");
    await expect(frontier.getByRole("heading", { level: 2 })).toHaveText(
      "Models that matter right now",
    );
    await expect(frontier.locator("th[scope=col]")).toHaveCount(5);
    const benchmarkRows = page.getByTestId("home-benchmark-rows").locator("tr[data-row]");
    expect(await benchmarkRows.count()).toBeGreaterThan(0);
    expect(await benchmarkRows.count()).toBeLessThanOrEqual(3);
    // A score bar is the reported percent on its own 0-100% scale, never rescaled to the row.
    for (const cell of await page
      .getByTestId("home-benchmark-rows")
      .locator("td[data-score]")
      .all()) {
      const text = (await cell.locator(".home-cell-value").innerText()).trim();
      const bar = cell.locator(".home-bar > span");
      if (!text.endsWith("%")) {
        await expect(bar).toHaveCount(0);
        continue;
      }
      const width = await bar.evaluate((node) => (node as HTMLElement).style.width);
      expect(Number.parseFloat(width), text).toBeCloseTo(Number.parseFloat(text), 1);
    }
    await expect(page.getByTestId("benchmark-sheet-link")).toHaveAttribute(
      "href",
      /\/benchmarks\?models=/u,
    );
    await expect(page.getByTestId("model-usage-row")).toHaveAttribute("data-state", "public");
    await expect(page.getByTestId("benchmark-note")).toBeVisible();
    // Subscription watch: the feed's own subscription events, newest per plan, at most three.
    const watch = page.getByTestId("subscription-watch-item");
    const watchCount = await watch.count();
    expect(watchCount).toBeLessThanOrEqual(3);
    for (const id of await watch.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-event-id") ?? ""),
    )) {
      const event = marketFeed.events.find((entry) => entry.id === id);
      expect(event, id).toBeDefined();
      expect(event?.planIds.length, id).toBeGreaterThan(0);
      expect(marketEventCategory(event?.type ?? "model_release"), id).toBe("subscriptions");
      const age =
        (Date.parse(`${today}T00:00:00Z`) -
          Date.parse(`${event?.occurredAt.slice(0, 10)}T00:00:00Z`)) /
        86_400_000;
      expect(age, id).toBeLessThanOrEqual(30);
    }
    // Catalog coverage is one line of trust metadata, not a hero counter.
    await expect(page.getByTestId("home-hero")).not.toContainText("Models tracked");
    await expect(page.getByTestId("home-coverage")).toContainText("subscription plans");
    // Without saved data, the strip under the market invites a scan.
    await expect(page.getByTestId("home-for-you")).toHaveAttribute("data-state", "invite");
    await expect(
      page.getByTestId("home-for-you").getByRole("link", { name: "Scan my AI history" }),
    ).toHaveAttribute("href", "/app/import");
    await expect(page.getByTestId("personal-mark")).toHaveCount(0);
    await expect(page.getByTestId("market-relevance")).toHaveCount(0);
    await expect(page.getByTestId("personal-intelligence")).toHaveAttribute(
      "data-personal",
      "public",
    );
    await expect(page.getByTestId("personal-question")).toHaveCount(4);
    await expect(page.getByTestId("personal-question").locator("a")).toHaveCount(0);
    await expect(page.getByTestId("personal-example")).toContainText("not yours");
    // The old engine-first positioning is gone from the homepage.
    await expect(page.locator("main")).not.toContainText(/Replay the difference|Any stack/u);

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

  test("subscription watch pairs each feed event with the plan's published facts", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(`${marketFeed.asOf}T12:00:00`));
    await page.goto("/");
    await expect(page.getByText(/^\s*not published\s*$/iu)).toHaveCount(0);
    const items = page.getByTestId("subscription-watch-item");
    expect(await items.count()).toBeGreaterThan(0);
    const seenPlans = new Set<string>();
    for (const item of await items.all()) {
      const id = (await item.getAttribute("data-event-id")) ?? "";
      const event = marketFeed.events.find((entry) => entry.id === id);
      expect(event, id).toBeDefined();
      // Newest per plan: a later event about the same plans replaces an earlier one.
      expect(
        event?.planIds.every((plan) => seenPlans.has(plan)),
        id,
      ).toBe(false);
      for (const plan of event?.planIds ?? []) seenPlans.add(plan);
      await expect(item).toContainText(event?.title ?? "");
      // The price shown is the catalog's published price, linked to the plan page.
      await expect(item).toContainText(/\$\d[\d,.]*\/mo/u);
      await expect(item.getByRole("link", { name: /^Source/u })).toHaveAttribute(
        "href",
        event?.sources[0]?.url ?? "",
      );
    }
    // Pro 200 reopening supersedes Pro 200 pausing.
    await expect(page.locator('[data-event-id="chatgpt-pro-200-paused"]')).toHaveCount(0);
  });

  test("lays out each section for its width without page overflow", async ({ page }, testInfo) => {
    await page.clock.setFixedTime(new Date(`${marketFeed.asOf}T12:00:00`));
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    const lead = page.locator("[data-lead]");
    const box = async (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return {
            top: rect.top + scrollY,
            bottom: rect.bottom + scrollY,
            left: rect.left,
            right: rect.right,
          };
        });
    if (testInfo.project.name === "mobile") {
      // The lead story comes before the longer pitch, so it starts on the first screen.
      const leadBox = await box("[data-lead]");
      expect(leadBox.top).toBeLessThan(page.viewportSize()?.height ?? 0);
      expect((await box(".home-intro-side")).top).toBeGreaterThan(leadBox.bottom);
      const region = page.getByTestId("model-table-region");
      expect(await region.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
      await region.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    } else {
      for (const width of [1600, 1440, 1280]) {
        await page.setViewportSize({ width, height: width === 1280 ? 800 : 900 });
        // The lead story and the compact rows sit side by side, all five in the first screen.
        const leadBox = await box("[data-lead]");
        const rows = await page
          .locator(".home-brief")
          .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()));
        for (const row of rows) expect(row.left).toBeGreaterThan(leadBox.right);
        const last = rows.at(-1);
        if (last !== undefined)
          expect(last.bottom + (await page.evaluate(() => scrollY))).toBeLessThanOrEqual(
            (page.viewportSize()?.height ?? 0) + 40,
          );
        // Wide screens use the width: the content column is at least 1240px at 1600.
        if (width === 1600) {
          const home = await box('[data-testid="home"]');
          expect(home.right - home.left).toBeGreaterThanOrEqual(1240);
        }
      }
      await expect(lead).toBeVisible();
      // The subscription watch columns share row tracks: titles start on one line.
      await page.setViewportSize({ width: 1440, height: 900 });
      const tops = await page
        .locator(".home-watch-title")
        .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
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
        [
          "Models",
          "Benchmarks",
          "Compare",
          "Plans",
          "Updates",
          "Workload",
          "My Stack",
          "Scan my history",
        ],
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
    expect(order.slice(1, 9)).toEqual([
      "Models",
      "Benchmarks",
      "Compare",
      "Plans",
      "Updates",
      "Workload",
      "My Stack",
      "Scan my history",
    ]);
    expect(order).toContain("Compare leading models");
    await expect(page.getByTestId("model-table-region")).toHaveAttribute("tabindex", "0");
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

    // A subscription change to a plan in the Current Stack is marked; others are not.
    const watchMark = (eventId: string) =>
      page.locator(`[data-event-id="${eventId}"] [data-testid="personal-mark"]`);
    await expect(watchMark("claude-five-hour-limits-raised")).toHaveText("In your stack");
    await expect(page.getByTestId("plan-lineup-note").first()).toContainText(
      "of your recorded calls",
    );

    // The strip under the market previews the strongest relations, without a scan.
    const forYou = page.getByTestId("home-for-you");
    await expect(forYou).toHaveAttribute("data-state", "personal");
    expect(Number(await forYou.getAttribute("data-count"))).toBeGreaterThan(0);
    const forYouItems = page.getByTestId("for-you-item");
    expect(await forYouItems.count()).toBeGreaterThan(0);
    expect(await forYouItems.count()).toBeLessThanOrEqual(4);
    for (const item of await forYouItems.all())
      expect(["stack", "used", "related"]).toContain(await item.getAttribute("data-relation"));

    // At most three answers, each opening the analysis that takes it further.
    const answers = page.getByTestId("personal-question");
    expect(await answers.count()).toBeLessThanOrEqual(3);
    const answer = (answerId: string) => page.locator(`[data-question-id="${answerId}"] a`);
    const top = [...usage.byModel].sort((a, b) => b[1] - a[1])[0];
    if (top !== undefined) {
      await expect(answer("rely-on")).toHaveAttribute("href", `/app/workload?import=${id}`);
      await expect(answer("rely-on")).toContainText(`${top[1].toLocaleString("en-US")} calls`);
    }
    await expect(answer("downgrade-claude")).toHaveAttribute(
      "href",
      `/app/replay?import=${id}&stack=${encodeURIComponent(
        "anthropic-claude-max-5x,openai-chatgpt-pro,command-code-pro,opencode-go",
      )}`,
    );
    await expect(answer("downgrade-claude")).toContainText("$200/mo → $100/mo");
    // The bridge into personal intelligence counts market changes related by canonical identity.
    const relevance = page.getByTestId("market-relevance");
    await expect(relevance).toBeVisible();
    const related = Number(await relevance.getAttribute("data-count"));
    expect(related).toBeGreaterThan(0);
    await expect(relevance).toContainText(
      `${related} market ${related === 1 ? "change" : "changes"} in the last 30 days ${related === 1 ? "relates" : "relate"} to your workload or stack`,
    );
    for (const item of await page.getByTestId("market-relevance-item").all())
      expect(["stack", "used", "related"]).toContain(await item.getAttribute("data-relation"));
    // Claude's five-hour limit change names Claude Max 20x, which is in this stack.
    await expect(
      page.locator(
        '[data-pulse-id="claude-five-hour-limits-raised"] [data-testid="personal-mark"]',
      ),
    ).toHaveCount(await page.locator('[data-pulse-id="claude-five-hour-limits-raised"]').count());
    // A lookalike raw name never relates the Opus 5.5 release to this workload.
    await expect(
      page.locator('[data-pulse-id="claude-opus-5-5-released"] [data-relation="used"]'),
    ).toHaveCount(0);
    expect(copyDefects(await page.locator("main").innerText())).toEqual([]);
    await shoot(page, "home-personal-desktop");

    // Reading the saved workload uploaded nothing and did not start the replay Worker.
    expect(requests.filter((request) => (request.body ?? "").length > 0)).toEqual([]);
    expect(requests.some((request) => request.url.includes("stackreplay-worker"))).toBe(false);
    expect(errors).toEqual([]);

    // The downgrade answer lands on Replay's stack scenario for that change.
    await answer("downgrade-claude").click();
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
