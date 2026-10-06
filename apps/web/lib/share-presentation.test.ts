import { encodeShareTokenV2 } from "@stackreplay/share";
import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "../app/(public)/s/[token]/page";
import robots from "../app/robots";
import { shareCopy, xIntentUrl } from "./share-presentation";
import { terminalShareV2 } from "./share-v2";

const host = vi.hoisted(() => ({ value: "stackreplay.com" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: host.value }) }));
const snapshot = terminalShareV2({
  theme: "dark",
  start: "2026-09-07",
  end: "2026-10-06",
  totalTokens: 36_900_000_000,
  github: 4495,
  aiDays: { active: 30, total: 30 },
  headline: "47 days in a row with AI, and counting",
});

describe("share crawler and posting contracts", () => {
  it("uses selected figures in short copy and a correctly encoded X intent", () => {
    const copy = shareCopy(snapshot);
    expect(copy.title).toBe("36.9B tokens of AI coding in 30 days · stackreplay.com");
    expect(copy.description).toContain(snapshot.card!.headline);
    expect(copy.post).toBe("36.9B tokens of AI coding in 30 days. 4,495 GitHub contributions.");
    const link = "https://stackreplay.com/s/abc";
    const url = new URL(xIntentUrl(copy.post, link));
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe(copy.post);
    expect(url.searchParams.get("url")).toBe(link);
    expect(copy.post).not.toMatch(/[–—#]/u);
    expect(
      shareCopy(terminalShareV2({ theme: "dark", start: "2026-09-07", end: "2026-10-06" })).post,
    ).toBe("AI coding in 30 days.");
  });
  it("serves explicit absolute social metadata with crawling allowed", async () => {
    const token = await encodeShareTokenV2(snapshot);
    const metadata = await generateMetadata({ params: Promise.resolve({ token }) });
    expect(metadata.title).toEqual({
      absolute: "36.9B tokens of AI coding in 30 days · StackReplay",
    });
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      "max-image-preview": "large",
    });
    expect(metadata.openGraph).toMatchObject({
      title: shareCopy(snapshot).title,
      description: shareCopy(snapshot).description,
      images: [{ url: `https://stackreplay.com/s/${token}/image?v=2`, width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [{ url: `https://stackreplay.com/s/${token}/image?v=2` }],
    });
    expect(robots().rules).toEqual([
      { userAgent: "*", allow: ["/", "/s/"], disallow: ["/app", "/app/", "/design", "/api/"] },
    ]);
    host.value = "abc-stackreplay.btsouth.workers.dev";
    try {
      expect(
        (await generateMetadata({ params: Promise.resolve({ token }) })).openGraph,
      ).toMatchObject({ images: [{ url: `https://${host.value}/s/${token}/image?v=2` }] });
    } finally {
      host.value = "stackreplay.com";
    }
  });
});
