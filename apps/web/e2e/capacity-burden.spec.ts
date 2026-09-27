import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { buildDemoExport } from "../../../packages/test-fixtures/src/demo-workload";
import { gotoImport } from "./helpers";

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
      localStorage.setItem(
        "stackreplay.current-stack",
        JSON.stringify(["plan:anthropic-claude-max-5x"]),
      );
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
          source: { adapterId: "codex", resourceInstanceId: "other" },
        },
      ],
    };
    await upload(page, context, "d6-context.json");
    file.events = [16, 17, 18].map((day) => ({
      ...base,
      id: `main-${day}`,
      occurredAt: `2026-09-${day}T13:00:00Z`,
      source: { ...base.source, adapterId: "claude-code", resourceInstanceId: "main" },
    }));
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
    await page.getByTestId("open-workload").click();
    await page.getByLabel("Local source account").selectOption("main");
    const burden = page.getByTestId("capacity-burden");
    await expect(page.getByTestId("burden-conclusion")).toContainText(
      "2 conservative capacity episode groups containing 3 blocked attempts",
    );
    const counts = () =>
      page.evaluate(() => ({
        market: (window as unknown as { market: number }).market,
        capacity: (window as unknown as { capacity: number }).capacity,
      }));
    const initial = await counts();
    const price = await page.getByTestId("market-total").innerText();
    await burden.getByText("Continuity history and methodology", { exact: true }).click();
    await burden.getByRole("checkbox", { name: /d6-context/ }).check();
    await expect(page.getByTestId("continuity-conclusion")).toContainText("1 of 2 episodes");
    expect((await counts()).market).toBe(initial.market);
    await expect(page.getByTestId("market-total")).toHaveText(price);
    await burden.getByText("Inspect episode timeline and timing", { exact: true }).focus();
    await page.keyboard.press("Enter");
    const episode = burden.getByTestId("capacity-episode").first();
    await episode.locator(":scope > summary").click();
    await expect(episode).toContainText("codex");
    await expect(episode).toContainText("Blocked attempt 2");
    const beforeImpact = await counts();
    await episode.getByLabel("Your impact (optional)").selectOption("Worked around it");
    await episode.getByLabel("Episode note (local only)").fill("Private synthetic episode note");
    await episode.getByRole("button", { name: "Save episode impact locally" }).click();
    await expect(burden.getByTestId("impact-summary")).toContainText("Worked around it: 1");
    expect(await counts()).toEqual(beforeImpact);
    await expect(page.getByTestId("share-preview")).not.toContainText(
      "Private synthetic episode note",
    );
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="observed-capacity"]').analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByTestId("workload-compare-cta").click();
    await expect(page).toHaveURL(/\/app\/compare/u);
    await expect(page.getByTestId("continuity-conclusion")).toContainText("1 of 2 episodes");
    await expect(burden.getByTestId("impact-summary")).toContainText("Worked around it: 1");
    expect(await counts()).toEqual(beforeImpact);
    await page.reload();
    await expect(burden.getByTestId("impact-summary")).toContainText("Worked around it: 1");
    await expect(page.getByTestId("continuity-conclusion")).toContainText("1 of 2 episodes");
    await burden.getByText("Continuity history and methodology", { exact: true }).click();
    await burden.getByRole("checkbox", { name: /d6-context/ }).uncheck();
    await expect(page.getByTestId("continuity-conclusion")).toContainText("0 of 2 episodes");
    await expect(burden.getByTestId("impact-summary")).toHaveCount(0);
  });
