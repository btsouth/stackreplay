import { createHash } from "node:crypto";
import { marketFeed, sortByOccurrence } from "@stackreplay/market-events";
import { describe, expect, it } from "vitest";
import { loadPublicProviderDirectory } from "../public-providers";
import { matchesFeedEtag } from "./update-feed-response";
import { projectUpdateFeed, serializeUpdateRss } from "./update-feeds";
import { parseUpdateSelection, updateFeedHref } from "./update-selection";

const parse = (query: string) =>
  parseUpdateSelection(new URLSearchParams(query), loadPublicProviderDirectory().providers);
describe("public update projections", () => {
  it("exports exactly the v1 envelope and full raw admitted events in canonical order", () => {
    const projection = projectUpdateFeed(marketFeed, parse(""));
    expect(Object.keys(projection).sort()).toEqual([
      "exportVersion",
      "feedAsOf",
      "feedUrl",
      "items",
      "selection",
      "sourceSchemaVersion",
    ]);
    expect(projection).toMatchObject({
      exportVersion: 1,
      sourceSchemaVersion: 1,
      feedAsOf: "2026-09-30",
      selection: { providerId: null, category: "all" },
      feedUrl: "https://stackreplay.com/changelog/feed.json",
    });
    expect(projection.items).toHaveLength(25);
    expect(projection.items.map((item) => item.event)).toEqual(sortByOccurrence(marketFeed.events));
    for (const item of projection.items) {
      expect(Object.keys(item).sort()).toEqual(["categories", "event", "url"]);
      expect(item.url).toBe(`https://stackreplay.com/changelog/${item.event.id}`);
      expect(item.event).toEqual(marketFeed.events.find((event) => event.id === item.event.id));
    }
  });
  it("retains exact ownership, normalized filters, valid emptiness and dual membership", () => {
    const selection = parse(
      "type=benchmarks&type=models&provider=google&provider=openai&utm=discard",
    );
    const projection = projectUpdateFeed(marketFeed, selection);
    expect(projection.feedUrl).toBe(
      "https://stackreplay.com/changelog/feed.json?provider=google&type=benchmarks",
    );
    expect(projection.items.length).toBeGreaterThan(0);
    expect(projection.items.every((item) => item.event.providerId === "google")).toBe(true);
    expect(projectUpdateFeed(marketFeed, parse("provider=mistral&type=pricing")).items).toEqual([]);
    expect(updateFeedHref(parse("provider=unknown"), "xml")).toBeNull();
    expect(() => projectUpdateFeed(marketFeed, parse("provider=unknown"))).toThrow(
      "Provider not recognized",
    );
    expect(updateFeedHref(parse("provider=all&type=invalid&utm=x"), "json")).toBe(
      "/changelog/feed.json",
    );
    const original = marketFeed.events[0];
    if (!original) throw new Error("Missing fixture");
    const fixture = {
      ...marketFeed,
      events: [{ ...original, type: "plan_price_change" as const }],
    };
    for (const category of ["subscriptions", "pricing"]) {
      const result = projectUpdateFeed(fixture, parse(`type=${category}`));
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.categories).toEqual(["subscriptions", "pricing"]);
    }
  });
  it("corrections change serialized content while retaining IDs and permanent URLs", () => {
    const original = marketFeed.events[0];
    if (!original) throw new Error("Missing fixture");
    const corrected = {
      ...marketFeed,
      events: marketFeed.events.map((event) =>
        event.id === original.id ? { ...event, title: "Corrected accepted title" } : event,
      ),
    };
    for (const serialize of [
      (feed: typeof marketFeed) => JSON.stringify(projectUpdateFeed(feed, parse(""))),
      (feed: typeof marketFeed) => serializeUpdateRss(feed, parse("")),
    ]) {
      const hash = (body: string) => createHash("sha256").update(body).digest("hex");
      expect(hash(serialize(corrected))).not.toBe(hash(serialize(marketFeed)));
    }
    expect(projectUpdateFeed(corrected, parse("")).items.map(({ url }) => url)).toEqual(
      projectUpdateFeed(marketFeed, parse("")).items.map(({ url }) => url),
    );
  });
  it("uses GET/HEAD weak conditional comparison, lists, quoted commas and wildcard", () => {
    for (const condition of ['"tag"', 'W/"tag"', '"other", W/"tag"', ' W/"other,tag", "tag" ', "*"])
      expect(matchesFeedEtag(condition, '"tag"')).toBe(true);
    for (const condition of [null, "", '"other"', 'W/"TAG"', '"other,tag"'])
      expect(matchesFeedEtag(condition, '"tag"')).toBe(false);
  });
});
