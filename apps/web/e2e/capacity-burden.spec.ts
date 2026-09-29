import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import { gotoImport, waitForWorkload } from "./helpers";

async function upload(page: Page, file: ReturnType<typeof buildDemoExport>, name: string) {
  await gotoImport(page);
  await page.getByTestId("import-file-input").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByTestId("import-summary")).toBeVisible();
}
for (const theme of ["dark", "light"] as const)
  test(`D6 episodes, continuity and local impact in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await page.addInitScript((theme) => {
      localStorage.setItem("stackreplay-theme", theme);

      const original = Worker.prototype.postMessage;
      (window as unknown as { market: number; capacity: number }).market = 0;
      (window as unknown as { capacity: number }).capacity = 0;
      Worker.prototype.postMessage = function (message, ...args: unknown[]) {
        if (message?.type === "API_MARKET") (window as unknown as { market: number }).market++;
        if (message?.type === "CAPACITY_EPISODES")
          (window as unknown as { capacity: number }).capacity++;
        return original.call(this, message, ...(args as [StructuredSerializeOptions]));
      };
    }, theme);
    const file = buildDemoExport("moderate");
    file.detectedSources = file.detectedSources.map(({ note: _note, ...s }) => s);
    file.collectorVersion = "synthetic-d6";
    const base = file.events.find((e) => e.model.rawName.startsWith("claude"));
    if (!base) throw Error("fixture missing");
    const context = {
      ...file,
      events: [
        {
          ...base,
          id: "other-response",
          occurredAt: "2026-09-16T12:01:00Z",
          source: {
            adapterId: "codex",
            resourceInstanceId: "other",
            nativeEventHash: "other-response",
          },
        },
      ],
    };
    await upload(page, context, "d6-context.json");
    file.events = [16, 17, 18].map((day) => ({
      ...base,
      id: `main-${day}`,
      projectHash: "synthetic-project",
      occurredAt: `2026-09-${day}T13:00:00Z`,
      source: {
        ...base.source,
        adapterId: "claude-code",
        resourceInstanceId: "main",
        nativeEventHash: `main-${day}`,
        nativeSessionHash: "first",
      },
    }));
    file.events.push(
      ...["2026-08-24", "2026-09-28"].map((date) => ({
        ...base,
        id: date,
        occurredAt: `${date}T12:00:00Z`,
        source: {
          ...base.source,
          adapterId: "claude-code",
          resourceInstanceId: "main",
          nativeEventHash: date,
        },
      })),
    );
    file.events.unshift({
      ...base,
      id: "secondary-response",
      occurredAt: "2026-09-18T12:00:00Z",
      source: { ...base.source, adapterId: "claude-code", resourceInstanceId: "secondary" },
    });
    const event = {
      id: "limit",
      resourceInstanceId: "main",
      timestamp: "2026-09-16T12:00:00Z",
      eventType: "hard_limit_reached" as const,
      windowType: "five_hour" as const,
      resetAt: "2026-09-16T14:00:00Z",
      sessionId: "first",
      evidence: "native-client" as const,
      code: "quota_rejected" as const,
      duplicateRows: 0,
    };
    const { resetAt: _reset, ...modelEvent } = event;
    file.capacityObservations = {
      methodology: "claude-native-capacity-v1",
      events: [
        event,
        { ...event, id: "retry", timestamp: "2026-09-16T12:05:00Z", sessionId: "second" },
        {
          ...modelEvent,
          id: "model",
          timestamp: "2026-09-17T12:00:00Z",
          windowType: "model",
          code: "model_limit",
          modelLabel: "Fable",
        },
      ],
    };
    await upload(page, file, "d6-main.json");
    await waitForWorkload(page);
    await page.getByRole("button", { name: "Review interruptions →" }).click();
    const inspector = page.getByTestId("capacity-inspector");
    const burden = inspector.getByTestId("capacity-burden");
    await expect(inspector.getByTestId("capacity-episode")).toHaveCount(2);
    await expect(
      inspector.getByTestId("capacity-episode").first().getByTestId("episode-projects"),
    ).toContainText("Project at block not recorded");
    await expect(page.getByTestId("billing-panel")).not.toBeVisible();
    await expect(inspector.getByLabel("Capacity account")).toHaveValue("main");
    const counts = () =>
      page.evaluate(() => ({
        market: (window as unknown as { market: number }).market,
        capacity: (window as unknown as { capacity: number }).capacity,
      }));
    const initial = await counts();
    const price = await page.getByTestId("overview-api-total").innerText();
    await inspector.getByText("Other AI histories", { exact: true }).click();
    const contextImport = inspector.getByRole("checkbox", { name: /d6-context/ });
    await contextImport.check();
    await expect(inspector.getByTestId("capacity-compact")).toContainText("1Continued elsewhere");
    // Recalculating keeps the picker open with focus on the choice just made.
    await expect(contextImport).toBeVisible();
    await expect(contextImport).toBeChecked();
    await expect(contextImport).toBeFocused();
    expect((await counts()).market).toBe(initial.market);
    await expect(page.getByTestId("overview-api-total")).toHaveText(price);
    const episode = burden.getByTestId("capacity-episode").first();
    await episode.locator(":scope > summary").focus();
    await page.keyboard.press("Enter");
    await expect(episode).toContainText("codex");
    await expect(episode).toContainText("Blocked attempt 2");
    await expect(episode).toContainText("Sep 16, 2026, 12:00:00 PM UTC");
    await expect(
      episode.getByRole("region", { name: "Work sessions at this interruption" }),
    ).toContainText("Session first");
    await expect(episode).toContainText("no matching workload response is available");
    const beforeImpact = await counts();
    await episode.getByLabel("Your impact (optional)").selectOption("Worked around it");
    await episode.getByLabel("Episode note (local only)").fill("Private synthetic episode note");
    await episode.getByRole("button", { name: "Save episode impact locally" }).click();
    await expect(burden.getByTestId("impact-summary")).toContainText("Worked around it: 1");
    expect(await counts()).toEqual(beforeImpact);
    await burden.getByRole("button", { name: "Sep 17", exact: true }).click();
    await expect(burden.getByTestId("capacity-episode")).toHaveCount(1);
    await expect(burden.getByTestId("capacity-episode")).toContainText("Model limit");
    await burden.getByRole("button", { name: "All days", exact: true }).click();
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="capacity-inspector"]').analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await page.getByRole("button", { name: "Review interruptions →" }).click();
    await expect(burden.getByTestId("impact-summary")).toContainText("Worked around it: 1");
    await inspector.getByLabel("Capacity account").selectOption("secondary");
    await expect(burden).toContainText("No directly observable capacity-limit episodes");
    await inspector.getByLabel("Capacity account").selectOption("main");
    await expect(burden.getByTestId("capacity-episode")).toHaveCount(2);
    await inspector.getByTestId("capacity-date-filter").locator(":scope > summary").click();
    await inspector.getByLabel("Capacity start date").fill("2026-09-17");
    await inspector.getByRole("button", { name: "Apply dates", exact: true }).click();
    await expect(burden.getByTestId("capacity-episode")).toHaveCount(1);
    await expect(burden.getByTestId("impact-summary")).toHaveCount(0);
    await inspector.getByRole("button", { name: "Use all imported history" }).click();
    await expect(burden.getByTestId("impact-summary")).toContainText("Worked around it: 1");
    await inspector.getByRole("button", { name: "Close interruption review" }).click();
    await expect(page.getByRole("button", { name: "Review interruptions →" })).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem("stackreplay.current-stack"))).toBeNull();
  });
