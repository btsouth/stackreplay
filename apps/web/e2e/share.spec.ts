import { expect, test } from "@playwright/test";
import { encodeShareTokenV2, type ShareReplayV2 } from "@stackreplay/share";
import { createShareToken, importDemo, runReplay } from "./helpers";

/**
 * Phase 5: every link has its own image drawn from its own aggregate data, the
 * panel leads with a preview and offers the image and a post, and the public
 * page leads with the verdict.
 */

const replay: ShareReplayV2 = {
  version: 2,
  kind: "replay",
  verdict: {
    version: 1,
    target: {
      kind: "subscription",
      name: "Copilot Pro+",
      providerName: "GitHub",
      price: { amount: "39", interval: "month" },
      capacity: "numeric",
    },
    mode: "exact",
    substitutions: [],
    scope: { kind: "all", recordedCalls: 5_000 },
    calls: {
      total: 5_000,
      withinAllowance: 1_127,
      overage: 3_718,
      blocked: 0,
      unavailable: 150,
      undecided: 5,
      unrecognized: 5,
    },
    servedMakers: ["Anthropic", "OpenAI"],
    unavailableMakers: ["DeepSeek", "Z.AI"],
    namedBy: "maker",
    periodDays: 35,
    runOut: {
      limit: "credits",
      behaviour: "overage",
      dates: [
        { date: "2026-08-25", day: 6, undecidedBefore: 0 },
        { date: "2026-09-05", day: 17, undecidedBefore: 0 },
      ],
      windows: 2,
    },
    money: { planPrice: "39", overage: "473.48" },
  },
  target: {
    type: "subscription",
    id: "github-copilot-pro-plus",
    versionId: "github-copilot-pro-plus@2026-09-21",
    verificationStatus: "verified",
    lastVerifiedAt: "2026-09-21",
    sources: [],
  },
  versions: { engine: "0.0.4", catalog: "catalog", methodology: "m1", rulesAsOf: "2026-09-24" },
};

test("each link has its own image, and the page names it", async ({ page, request }) => {
  const token = await encodeShareTokenV2(replay);
  const image = await request.get(`/s/${token}/image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect((await image.body()).byteLength).toBeGreaterThan(10_000);

  await page.goto(`/s/${token}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Copilot Pro+ credits would have run out on Aug 25 (day 6)",
  );
  await expect(page.getByTestId("share-figure")).toHaveText("Aug 25");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    new RegExp(`/s/${token.replaceAll(".", "\\.")}/image$`, "u"),
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
});

test("an unreadable link still gets an image, not an error", async ({ request }) => {
  const image = await request.get("/s/2.not-a-token.x/image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
});

test("the panel offers the image and a suggested post once a link exists", async ({ page }) => {
  await importDemo(page, "moderate");
  await page.goto("/app/replay");
  await runReplay(page, "example-cloud-pro");
  await createShareToken(page);
  const download = page.waitForEvent("download");
  await page.getByTestId("share-download").click();
  expect((await download).suggestedFilename()).toBe("stackreplay-replay.png");
  await expect(page.getByTestId("share-post-text")).toContainText(
    "StackReplay replayed my recorded AI coding work against",
  );
  await expect(page.getByTestId("share-post-text")).toContainText(/\/s\/[A-Za-z0-9_-]{22}\b/u);
});
