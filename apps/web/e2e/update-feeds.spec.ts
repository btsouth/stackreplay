import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { marketEventSchema, marketFeed, sortByOccurrence } from "@stackreplay/market-events";
import { escapeXml, projectUpdateFeed, serializeUpdateRss } from "../lib/market/update-feeds";
import { parseUpdateSelection } from "../lib/market/update-selection";

const ordered = sortByOccurrence(marketFeed.events);
const security = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin",
  "cross-origin-opener-policy": "same-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()",
};
const headerKeys = [
  "content-type",
  "cache-control",
  "etag",
  "content-security-policy",
  ...Object.keys(security),
];
for (const format of ["json", "xml"] as const) {
  test(`${format} feed actual HTTP projection, HEAD, conditional revalidation and query isolation`, async ({
    request,
    page,
  }) => {
    const path = `/changelog/feed.${format}`;
    const all = await request.get(path);
    expect(all.status()).toBe(200);
    const body = await all.text();
    const headers = all.headers();
    expect(headers["content-type"]).toBe(
      format === "json" ? "application/json; charset=utf-8" : "application/rss+xml; charset=utf-8",
    );
    expect(headers["cache-control"]).toBe("public, max-age=0, must-revalidate");
    expect(headers.etag).toBe(`"${createHash("sha256").update(body).digest("hex")}"`);
    expect(headers["last-modified"]).toBeUndefined();
    for (const [key, value] of Object.entries(security)) expect(headers[key]).toBe(value);
    expect(headers["content-security-policy"]).toContain("connect-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    const defaults = await request.get(`${path}?provider=all&type=invalid&utm=discard`);
    expect(await defaults.text()).toBe(body);
    expect(defaults.headers().etag).toBe(headers.etag);
    const forwarded = await request.get(path, {
      headers: { "X-Forwarded-Host": "untrusted.example" },
    });
    expect(await forwarded.text()).toBe(body);
    const head = await request.head(path);
    expect(head.status()).toBe(200);
    expect(await head.body()).toHaveLength(0);
    for (const key of headerKeys) expect(head.headers()[key]).toBe(headers[key]);
    for (const condition of [
      headers.etag,
      `W/${headers.etag}`,
      `"other", W/${headers.etag}`,
      "*",
    ]) {
      for (const method of ["GET", "HEAD"]) {
        const response = await request.fetch(path, {
          method,
          headers: { "If-None-Match": condition ?? "" },
        });
        expect(response.status()).toBe(304);
        expect(await response.body()).toHaveLength(0);
        for (const key of headerKeys) expect(response.headers()[key]).toBe(headers[key]);
      }
    }
    expect(
      (await request.get(path, { headers: { "If-None-Match": '"unmatched"' } })).status(),
    ).toBe(200);
    const query = "?type=benchmarks&type=models&provider=google&provider=openai&utm=discard";
    const selected = await request.get(path + query, {
      headers: { "If-None-Match": headers.etag ?? "" },
    });
    expect(selected.status()).toBe(200);
    expect(selected.headers().etag).not.toBe(headers.etag);
    const selectedBody = await selected.text();
    const normalized = await request.get(`${path}?provider=google&type=benchmarks`);
    expect(await normalized.text()).toBe(selectedBody);
    expect(normalized.headers().etag).toBe(selected.headers().etag);
    const again = await request.get(path);
    expect(await again.text()).toBe(body);
    expect(again.headers().etag).toBe(headers.etag);
    const empty = await request.get(`${path}?provider=mistral&type=pricing`);
    expect(empty.status()).toBe(200);
    expect(empty.headers()["cache-control"]).toBe(headers["cache-control"]);
    const unknown = await request.get(`${path}?provider=not-a-provider`, {
      headers: { "If-None-Match": "*" },
    });
    expect(unknown.status()).toBe(400);
    expect(await unknown.text()).toContain("Provider not recognized");
    expect(unknown.headers()["cache-control"]).toBe("no-store");
    expect(unknown.headers().etag).toBeUndefined();
    const unknownHead = await request.head(`${path}?provider=not-a-provider`);
    expect(unknownHead.status()).toBe(400);
    expect(await unknownHead.body()).toHaveLength(0);
    for (const key of headerKeys) expect(unknownHead.headers()[key]).toBe(unknown.headers()[key]);
    const selectedIds = ordered
      .filter((event) => event.providerId === "google" && event.type.startsWith("benchmark"))
      .map((event) => event.id);
    if (format === "json") {
      const projection = JSON.parse(body);
      expect(Object.keys(projection).sort()).toEqual([
        "exportVersion",
        "feedAsOf",
        "feedUrl",
        "items",
        "selection",
        "sourceSchemaVersion",
      ]);
      expect(projection.items.map((item: { event: unknown }) => item.event)).toEqual(ordered);
      expect(projection.items).toHaveLength(25);
      for (const item of projection.items) {
        expect(Object.keys(item).sort()).toEqual(["categories", "event", "url"]);
        expect(item.url).toBe(`https://stackreplay.com/changelog/${item.event.id}`);
      }
      const filtered = JSON.parse(selectedBody);
      expect(filtered.selection).toEqual({ providerId: "google", category: "benchmarks" });
      expect(filtered.items.map((item: { event: { id: string } }) => item.event.id)).toEqual(
        selectedIds,
      );
      expect(filtered.feedUrl).toBe(
        "https://stackreplay.com/changelog/feed.json?provider=google&type=benchmarks",
      );
      const noItems = await empty.json();
      expect(noItems).toMatchObject({
        exportVersion: 1,
        sourceSchemaVersion: 1,
        feedAsOf: marketFeed.asOf,
        items: [],
      });
    } else {
      // Parse actual served XML, preserving decoded text/attribute semantics.
      const parseXml = async (xml: string) =>
        page.evaluate((text) => {
          const doc = new DOMParser().parseFromString(text, "application/xml");
          return {
            errors: doc.querySelectorAll("parsererror").length,
            version: doc.documentElement.getAttribute("version"),
            self: doc
              .getElementsByTagNameNS("http://www.w3.org/2005/Atom", "link")[0]
              ?.getAttribute("href"),
            buildDates: doc.querySelectorAll("lastBuildDate").length,
            items: [...doc.querySelectorAll("item")].map((item) => ({
              title: item.querySelector("title")?.textContent,
              url: item.querySelector("link")?.textContent,
              guid: item.querySelector("guid")?.textContent,
              permanent: item.querySelector("guid")?.getAttribute("isPermaLink"),
              description: item.querySelector("description")?.textContent ?? "",
              pubDate: item.querySelector("pubDate")?.textContent ?? null,
              categories: [...item.querySelectorAll("category")].map((node) => node.textContent),
            })),
          };
        }, xml);
      const parsed = await parseXml(body);
      expect(parsed.errors).toBe(0);
      expect(parsed.version).toBe("2.0");
      expect(parsed.buildDates).toBe(0);
      expect(parsed.items).toHaveLength(25);
      expect(parsed.items.map((item) => item.url)).toEqual(
        ordered.map((event) => `https://stackreplay.com/changelog/${event.id}`),
      );
      for (const [index, item] of parsed.items.entries()) {
        const event = ordered[index];
        if (!event) throw new Error("Missing admitted event");
        expect(item.title).toBe(event.title);
        expect(item.guid).toBe(item.url);
        expect(item.permanent).toBe("true");
        expect(item.description).toContain(event.summary);
        for (const value of [
          event.occurredAt,
          event.dateBasis,
          event.discoveredAt,
          event.verifiedAt,
          event.status,
          ...(event.effectiveAt ? [event.effectiveAt] : []),
        ])
          expect(item.description).toContain(value);
        for (const source of event.sources) {
          for (const value of [
            source.url,
            source.title,
            source.checkedAt,
            ...(source.excerpt ? [source.excerpt] : []),
          ])
            expect(item.description).toContain(value);
        }
        if (event.occurredAt.includes("T"))
          expect(Date.parse(item.pubDate ?? "")).toBe(Date.parse(event.occurredAt));
        else expect(item.pubDate).toBeNull();
      }
      const filtered = await parseXml(selectedBody);
      expect(filtered.errors).toBe(0);
      expect(filtered.self).toBe(
        "https://stackreplay.com/changelog/feed.xml?provider=google&type=benchmarks",
      );
      expect(filtered.items.map((item) => item.url?.split("/").at(-1))).toEqual(selectedIds);
      expect((await parseXml(await empty.text())).items).toEqual([]);
    }
  });
}

test("parsed RSS fixture preserves offset instant, calendar date and malicious text/attribute semantics", async ({
  page,
}) => {
  const original = marketFeed.events[0];
  if (!original) throw new Error("Missing fixture");
  const hostile = `<script x="quoted">& 'single' ]]> café</script>`;
  const source = {
    ...original.sources[0],
    title: hostile,
    url: 'https://example.com/source?a=1&b="two"',
    excerpt: hostile,
    authority: "first_party" as const,
    checkedAt: "2026-09-30",
  };
  const offset = marketEventSchema.parse({
    ...original,
    id: "offset",
    title: hostile,
    summary: hostile,
    occurredAt: "2026-09-29T23:45:06+05:30",
    discoveredAt: "2026-09-30",
    verifiedAt: "2026-09-30",
    sources: [source],
  });
  const calendar = marketEventSchema.parse({
    ...offset,
    id: "calendar",
    occurredAt: "2026-09-29",
    type: "plan_price_change",
    planIds: ["fixture-plan"],
  });
  const selection = parseUpdateSelection(new URLSearchParams("provider=google&type=pricing"), [
    { id: "google", name: "Google" },
  ]);
  offset.providerId = calendar.providerId = "google";
  offset.type = "plan_price_change";
  offset.planIds = ["fixture-plan"];
  const fixture = { ...marketFeed, events: [offset, calendar] };
  const xml = serializeUpdateRss(fixture, selection);
  const attribute = await page.evaluate(
    (text) => {
      const doc = new DOMParser().parseFromString(text, "application/xml");
      return {
        errors: doc.querySelectorAll("parsererror").length,
        value: doc.documentElement.getAttribute("value"),
        attributes: doc.documentElement.attributes.length,
      };
    },
    `<probe value="${escapeXml(hostile)}"/>`,
  );
  expect(attribute).toEqual({ errors: 0, value: hostile, attributes: 1 });
  const parsed = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return {
      errors: doc.querySelectorAll("parsererror").length,
      injected: doc.querySelectorAll("script").length,
      self: doc
        .getElementsByTagNameNS("http://www.w3.org/2005/Atom", "link")[0]
        ?.getAttribute("href"),
      items: [...doc.querySelectorAll("item")].map((item) => ({
        title: item.querySelector("title")?.textContent,
        description: item.querySelector("description")?.textContent,
        pubDate: item.querySelector("pubDate")?.textContent ?? null,
        categories: [...item.querySelectorAll("category")].map((node) => node.textContent),
      })),
    };
  }, xml);
  expect(parsed.errors).toBe(0);
  expect(parsed.injected).toBe(0);
  expect(parsed.self).toBe(
    "https://stackreplay.com/changelog/feed.xml?provider=google&type=pricing",
  );
  for (const item of parsed.items) {
    expect(item.title).toBe(hostile);
    expect(item.description).toContain(hostile);
    expect(item.description).toContain(source.url);
    expect(item.categories).toEqual(["subscriptions", "pricing"]);
  }
  expect(parsed.items).toHaveLength(2);
  expect(parsed.items.filter((item) => item.pubDate === null)).toHaveLength(1);
  expect(Date.parse(parsed.items.find((item) => item.pubDate)?.pubDate ?? "")).toBe(
    Date.parse(offset.occurredAt),
  );
  const before = projectUpdateFeed(fixture, selection).items.map((item) => item.url);
  const corrected = {
    ...fixture,
    events: fixture.events.map((event) => ({ ...event, title: "Correction" })),
  };
  expect(projectUpdateFeed(corrected, selection).items.map((item) => item.url)).toEqual(before);
});
