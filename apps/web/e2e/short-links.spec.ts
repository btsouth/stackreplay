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
  await scanMarkedHistory(page);
  const id = new URL(page.url()).searchParams.get("import");
  await page.goto(`/app/recap?import=${id}`);
  await expect(page.getByTestId("recap-ready")).toBeVisible({ timeout: 60_000 });
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
  const shortId = path.replace("/s/", "");
  expect(shortId).toMatch(/^[A-Za-z0-9_-]{22}$/u);

  // The public page renders from the stored token, with nothing private.
  const response = await request.get(`/s/${shortId}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expectNoMarkers(html);
  const ogImage = /<meta property="og:image" content="([^"]+)"/u.exec(html)?.[1];
  expect(ogImage).toBe(`https://stackreplay.com/s/${shortId}/image`);
  await page.goto(`/s/${shortId}`);
  await expect(page.getByTestId("share-card-v2")).toBeVisible();
  expectNoMarkers(await page.locator("main").innerText());
  const shortTokens = await page.getByTestId("share-tokens").innerText();

  const image = await request.get(`/s/${shortId}/image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  // The same result as a self-contained link reads exactly the same.
  await page.goto(`/s/${token}`);
  await expect(page.getByTestId("share-tokens")).toHaveText(shortTokens);
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
