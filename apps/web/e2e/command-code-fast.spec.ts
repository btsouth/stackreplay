import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import {
  gotoReplayImport,
  openReplayDetails,
  setRulesAsOf,
  visitReplay,
  waitForWorkload,
} from "./helpers";

const regular = "deepseek/deepseek-v4.1-flash";
const fast = `${regular}-fast`;
const session = [
  { type: "session", id: "audit-session", timestamp: "2026-09-29T12:00:00Z" },
  ...[regular, fast].map((model, index) => ({
    type: "message",
    id: `audit-${index}`,
    timestamp: `2026-09-29T12:0${index}:00Z`,
    model,
    message: { role: "assistant", content: "private audit fixture" },
    usage: {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costUsd: 999,
    },
  })),
]
  .map((record) => JSON.stringify(record))
  .join("\n");

for (const archive of [false, true]) {
  test(`Command Code ${archive ? "ZIP" : "JSONL"} preserves Fast through storage and destination replay`, async ({
    page,
  }) => {
    await gotoReplayImport(page);
    await page.getByTestId("source-file-input").setInputFiles({
      name: archive ? "history.zip" : "session.jsonl",
      mimeType: archive ? "application/zip" : "application/jsonl",
      buffer: archive
        ? Buffer.from(zipSync({ "history/session.jsonl": strToU8(session) }))
        : Buffer.from(session),
    });
    await waitForWorkload(page);
    await page.reload();
    await waitForWorkload(page);
    await visitReplay(page);
    await setRulesAsOf(page, "2026-09-29");
    await page.getByTestId("plan-command-code-go").click();
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("replay-result")).toBeVisible();
    await openReplayDetails(page);
    await expect(page.getByTestId("replay-result")).toContainText("Cannot be established");
    await expect(page.getByTestId("unserved-models")).toHaveCount(0);

    await page.getByTestId("target-kind-api").click();
    await page.getByTestId("provider-deepseek").click();
    await page.getByTestId("run-replay").click();
    await expect(page.getByTestId("replay-result")).toContainText("$0.30");
    await openReplayDetails(page);
    await expect(page.getByTestId("replay-result")).toContainText("route variant");
    await expect(page.getByTestId("replay-result")).not.toContainText("$999");
  });
}
