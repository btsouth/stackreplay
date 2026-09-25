import { expect, type Page, test } from "@playwright/test";
import { decodeAnyShareToken } from "@stackreplay/share";
import {
  CLAUDE_CODE_SESSION,
  CODEX_ROLLOUT,
} from "../../../packages/adapters/src/fixtures/content";
import { captureRequests, createShareLink, gotoImport } from "./helpers";

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
  await expect(page.getByTestId("import-summary")).toContainText("Workload ready", {
    timeout: 60_000,
  });
  await page.getByTestId("open-workload").click();
  await expect(page.getByTestId("workload-opening").getByTestId("workload-value")).toBeVisible({
    timeout: 60_000,
  });
}

function expectNoMarkers(text: string): void {
  for (const marker of Object.values(MARKERS)) expect(text).not.toContain(marker);
  expect(text).not.toMatch(/\/home\/|\.jsonl/u);
}

test("a workload link is short, uploads only its aggregate token and renders from storage", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await scanMarkedHistory(page);
  // The project name is really in this browser's local analysis...
  await expect(page.getByTestId("section-projects")).toContainText(MARKERS.project);

  const requests = captureRequests(page);
  await page.getByTestId("share-workload-link").click();
  await expect(page.getByTestId("share-upload-note")).toHaveText(
    "Only the aggregate result shown in this preview is uploaded when you create a public link. Your raw history stays on this device.",
  );
  const link = await createShareLink(page);

  // ...and none of it leaves: one upload, carrying one aggregate token.
  const uploads = requests.filter((entry) => (entry.body ?? "").length > 0);
  expect(uploads.map((entry) => `${entry.method} ${new URL(entry.url).pathname}`)).toEqual([
    "POST /api/share",
  ]);
  expect(Object.keys(link.body as object)).toEqual(["token"]);
  expectNoMarkers(uploads[0]?.body ?? "");
  const decoded = await decodeAnyShareToken(link.token);
  expect(decoded.ok && decoded.snapshot.version === 2 && decoded.snapshot.kind).toBe("workload");
  expectNoMarkers(decoded.ok ? JSON.stringify(decoded.snapshot) : "");

  // A short, opaque, same-site URL.
  expect(link.url).toMatch(/^http:\/\/localhost:3100\/s\/[A-Za-z0-9_-]{22}$/u);
  expect(link.url.length).toBeLessThan(60);

  // The public page renders from the stored snapshot, with nothing private.
  const response = await request.get(`/s/${link.id}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expectNoMarkers(html);
  const ogImage = /<meta property="og:image" content="([^"]+)"/u.exec(html)?.[1];
  expect(ogImage).toBe(`https://stackreplay.com/s/${link.id}/image`);
  await page.goto(`/s/${link.id}`);
  await expect(page.getByTestId("share-card-v2")).toContainText("not what you paid");
  expectNoMarkers(await page.locator("main").innerText());

  // Its image is drawn from the same stored snapshot.
  const image = await request.get(`/s/${link.id}/image`);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  // The same result as a self-contained link still reads exactly as before.
  await page.goto(`/s/${link.token}`);
  await expect(page.getByTestId("share-card-v2")).toBeVisible();
  const longHeadline = await page.getByTestId("share-headline").innerText();
  await page.goto(`/s/${link.id}`);
  await expect(page.getByTestId("share-headline")).toHaveText(longHeadline);
});

test("an unknown or malformed short id is a friendly page and a fallback image", async ({
  page,
  request,
}) => {
  await page.goto("/s/AAAAAAAAAAAAAAAAAAAAAA");
  await expect(page.getByTestId("share-invalid")).toHaveAttribute("data-reason", "missing");
  await expect(page.getByRole("heading", { name: "This share link does not exist" })).toBeVisible();
  const image = await request.get("/s/AAAAAAAAAAAAAAAAAAAAAA/image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");
  await page.goto("/s/not-a-link");
  await expect(page.getByTestId("share-invalid")).toBeVisible();
});

test("the share store accepts only a same-site request carrying one aggregate token", async ({
  request,
}) => {
  const origin = "http://localhost:3100";
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

test("when the store cannot be reached, a self-contained link is offered instead", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await scanMarkedHistory(page);
  await page.route("**/api/share", (route) =>
    route.fulfill({ status: 503, json: { error: "Short links are unavailable right now." } }),
  );
  await page.getByTestId("share-workload-link").click();
  const panel = page.getByTestId("share-panel");
  await panel.getByTestId("share-create").click();
  await expect(panel.getByRole("alert")).toContainText("A short link could not be created");
  await panel.getByTestId("share-use-long-link").click();
  await expect(panel.getByTestId("share-open")).toBeVisible();
  const url = (await panel.getByTestId("share-url").textContent()) ?? "";
  expect(url).toContain("/s/2.");
  await page.goto(url);
  await expect(page.getByTestId("share-card-v2")).toBeVisible();
});
