import { expect, type Page, test } from "@playwright/test";
import { decodeAnyShareToken } from "@stackreplay/share";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../packages/adapters/src/fixtures/content";
import { gotoImport, waitForWorkload } from "./premium-app-helpers";

/**
 * Short share links, end to end in a real browser.
 *
 * The history scanned here carries distinctive prompts, responses, code, a
 * home path, a private project folder, session IDs and file names. Creating a
 * link must upload exactly one aggregate share token and nothing else, and
 * neither the upload, the stored link's public page nor its image may carry
 * any of those markers.
 */

const MARKERS = {
  prompt: "zzprompt-quantum-7781",
  response: "zzresponse-9913",
  code: "zzcode_5521",
  user: "zzuser4417",
  project: "zz-private-project-4417",
  claudeSession: "11111111-1111-4111-8111-111111111111",
  codexSession: "22222222-2222-4222-8222-222222222222",
  file: "zz-session-file.jsonl",
};

function markedClaude(): string {
  return CLAUDE_CODE_SESSION.replaceAll('"example-medium"', '"claude-opus-4-8"')
    .replaceAll("/home/example/projects/demo-app", `/home/${MARKERS.user}/code/${MARKERS.project}`)
    .replaceAll('"content":"hello"', `"content":"${MARKERS.prompt}: fix billing"`)
    .replaceAll(
      '"role":"assistant","model"',
      `"role":"assistant","content":[{"type":"text","text":"${MARKERS.response} const ${MARKERS.code} = 1"}],"model"`,
    );
}

function markedCodex(): string {
  return CODEX_ROLLOUT.replaceAll('"example-large"', '"gpt-5.6-sol"').replaceAll(
    "/home/example/projects/demo-app",
    `/home/${MARKERS.user}/code/${MARKERS.project}`,
  );
}

async function scanMarkedHistory(page: Page): Promise<void> {
  await gotoImport(page);
  await page.getByTestId("source-file-input").setInputFiles([
    { name: MARKERS.file, mimeType: "application/jsonl", buffer: Buffer.from(markedClaude()) },
    { name: "rollout-zz.jsonl", mimeType: "application/jsonl", buffer: Buffer.from(markedCodex()) },
  ]);
  await waitForWorkload(page);
}

function expectNoMarkers(text: string): void {
  for (const marker of Object.values(MARKERS)) expect(text).not.toContain(marker);
  expect(text).not.toMatch(/\/home\/|\.jsonl/u);
}

test("a recap link can be stored as a short link that carries only its aggregate token", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date("2026-10-01T12:00:00Z") });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copiedLink: string }).copiedLink = value;
        },
      },
    });
  });
  await scanMarkedHistory(page);
  const id = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/recap?import=${id}&period=all`);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("recap-ready")).toHaveAttribute("data-period", "all");
  await page.route("**/api/github/contributions?*", (route) =>
    route.fulfill({
      json: {
        login: "btsouth",
        fetchedAt: new Date().toISOString(),
        total: 40,
        days: { "2026-09-19": 40 },
      },
    }),
  );
  await page.getByRole("textbox", { name: "GitHub username" }).fill("btsouth");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("button", { name: "Disconnect", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "GITHUB CONTRIBUTIONS", exact: true }),
  ).toBeEnabled();
  const posted = page.waitForRequest(
    (r) => r.url().endsWith("/api/share") && r.method() === "POST",
  );
  await page.getByTestId("recap-share-create").click();
  const token = JSON.parse((await posted).postData()!).token;
  const decoded = await decodeAnyShareToken(token);
  expect(decoded.ok && decoded.snapshot.version === 2 && decoded.snapshot.kind).toBe("workload");
  expectNoMarkers(decoded.ok ? JSON.stringify(decoded.snapshot) : "");
  await expect(page.getByTestId("recap-share-open")).toBeVisible();
  const path = (await page.getByTestId("recap-share-open").getAttribute("href"))!;
  const shortId = new URL(path).pathname.replace("/s/", "");
  // A parent render recreates the same GitHub map without changing the card.
  await page.getByRole("button", { name: "Refresh GitHub", exact: true }).click();
  await expect(page.getByTestId("recap-share-open")).toHaveAttribute("href", path);
  await expect(page.getByTestId("recap-share-copy")).toHaveText("Copy link");
  const intent = new URL((await page.getByTestId("recap-share-x").getAttribute("href"))!);
  expect(intent.origin + intent.pathname).toBe("https://x.com/intent/post");
  expect(intent.searchParams.get("url")).toBe(path);
  expect(intent.searchParams.get("text")).toMatch(/tokens of AI coding in 13 days/u);
  expect(intent.searchParams.get("text")).not.toMatch(/[–—#]/u);
  await page.getByTestId("recap-share-copy").click();
  await expect(page.getByTestId("recap-share-copy")).toHaveText("Copied");
  expect(await page.evaluate(() => (window as unknown as { copiedLink: string }).copiedLink)).toBe(
    path,
  );
  await page.getByRole("button", { name: "TOTAL TOKENS", exact: true }).click();
  await expect(page.getByTestId("recap-share-x")).toHaveCount(0);
  await expect(page.getByTestId("recap-share-copy")).toHaveCount(0);
  expect(shortId).toMatch(/^[A-Za-z0-9_-]{22}$/u);

  // The public page renders from the stored token, with nothing private.
  const response = await request.get(`/s/${shortId}`, {
    headers: { "user-agent": "Twitterbot/1.0" },
  });
  expect(response.status()).toBe(200);
  const html = await response.text();
  expectNoMarkers(html);
  const head = html.split("</head>")[0]!;
  expect(head).toContain('name="twitter:card" content="summary_large_image"');
  expect(head).not.toMatch(/noindex|nofollow/u);
  expect(head).toMatch(/property="og:title" content="[^"]*tokens of AI coding in 13 days/u);
  expect(head).toMatch(/name="twitter:description" content="[^"]*tokens of AI coding/u);
  const ogImage = /<meta property="og:image" content="([^"]+)"/u.exec(html)?.[1];
  expect(ogImage).toBe(`https://stackreplay.com/s/${shortId}/image?v=2`);
  expect(head).toContain(`name="twitter:image" content="${ogImage}"`);
  const robots = await request.get("/robots.txt", { headers: { "user-agent": "Twitterbot/1.0" } });
  expect(await robots.text()).toContain("Allow: /s/");
  expect(await robots.text()).not.toMatch(/Disallow: \/s/u);
  await page.goto(`/s/${shortId}`);
  await expect(page.getByTestId("share-card-v2")).toBeVisible();
  expectNoMarkers(await page.locator("main").innerText());
  const shortTokens = await page.locator(".public-terminal-card").getAttribute("alt");

  const image = await request.get(`/s/${shortId}/image`, {
    headers: { "user-agent": "Twitterbot/1.0" },
  });
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
  expect(image.headers()["cache-control"]).toContain("public");
  const bytes = await image.body();
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(bytes.length).toBeLessThan(5_000_000);

  // The same result as a self-contained link reads exactly the same.
  await page.goto(`/s/${token}`);
  await expect(page.locator(".public-terminal-card")).toHaveAttribute("alt", shortTokens!);
});

test("an unknown or malformed short id is a friendly page and a fallback image", async ({
  page,
  request,
}) => {
  const missing = await page.goto("/s/AAAAAAAAAAAAAAAAAAAAAA");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("main")).toContainText("not");
  const image = await request.get("/s/AAAAAAAAAAAAAAAAAAAAAA/image");
  expect(image.status()).toBe(404);
  const invalid = await page.goto("/s/not-a-link");
  expect(invalid?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /Scan/i }).first()).toBeVisible();
});

test("the share store accepts only a same-site request carrying one aggregate token", async ({
  request,
}) => {
  const origin = `http://localhost:${process.env.STACKREPLAY_E2E_PORT ?? "3100"}`;
  const json = { "content-type": "application/json" };
  const cross = await request.post("/api/share", {
    headers: { ...json, origin: "https://evil.example" },
    data: { token: "2.x.y" },
  });
  expect(cross.status()).toBe(403);
  const extra = await request.post("/api/share", {
    headers: { ...json, origin },
    data: { token: "2.x.y", projectName: MARKERS.project },
  });
  expect(extra.status()).toBe(400);
  const invalid = await request.post("/api/share", {
    headers: { ...json, origin },
    data: { token: "2.x.y" },
  });
  expect(invalid.status()).toBe(422);
  const form = await request.post("/api/share", {
    headers: { "content-type": "text/plain", origin },
    data: "token=2.x.y",
  });
  expect(form.status()).toBe(415);
});
