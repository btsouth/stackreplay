import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { eventsInCategory, marketFeed } from "@stackreplay/market-events";
import { describe, expect, it } from "vitest";
import { loadPublicProviderDirectory } from "../public-providers";
import {
  marketEventHref,
  parseUpdateSelection,
  selectUpdates,
  updateListHref,
  updateProviderOptions,
  updateSearch,
} from "./update-selection";

const providers = loadPublicProviderDirectory().providers;
const events = marketFeed.events;
const parsed = (search: string) => parseUpdateSelection(new URLSearchParams(search), providers);
describe("public update selection", () => {
  it("keeps the 25 admitted records and original bytes", () => {
    const bytes = readFileSync(
      new URL("../../../../packages/market-events/src/data/market-events.json", import.meta.url),
    );
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "baacafc07502ed24584aa0f756e2b0069e8de841b93c72b18337cf40e0043924",
    );
    expect(events).toHaveLength(25);
    expect(selectUpdates(events, parsed(""))).toEqual(eventsInCategory(events, "all"));
    expect(new Set(selectUpdates(events, parsed("")).map((event) => event.id))).toEqual(
      new Set(events.map((event) => event.id)),
    );
  });
  it("uses exact ownership, intersection, existing ordering and dual membership", () => {
    const google = selectUpdates(events, parsed("provider=google&type=benchmarks"));
    expect(google.length).toBeGreaterThan(0);
    expect(google.every((event) => event.providerId === "google")).toBe(true);
    expect(google).toEqual(
      eventsInCategory(
        events.filter((event) => event.providerId === "google"),
        "benchmarks",
      ),
    );
    const comparison = google.find((event) => event.modelIds.some((id) => id.startsWith("gpt-")));
    expect(comparison).toBeDefined();
    expect(
      selectUpdates(events, parsed("provider=openai&type=benchmarks")).map((event) => event.id),
    ).not.toContain(comparison?.id);
    const fixture = {
      ...events[0],
      id: "dual",
      type: "plan_price_change" as const,
      providerId: "google",
    } as (typeof events)[number];
    for (const category of ["subscriptions", "pricing"])
      expect(selectUpdates([fixture], parsed(`provider=google&type=${category}`))).toEqual([
        fixture,
      ]);
  });
  it("shares first-value/default rules for SSR and browser params", () => {
    const query = "provider=google&provider=openai&type=pricing&type=models";
    expect(parsed(query)).toEqual(
      parseUpdateSelection(
        { provider: ["google", "openai"], type: ["pricing", "models"] },
        providers,
      ),
    );
    expect(updateSearch(parsed(query))).toBe("?provider=google&type=pricing");
    for (const query of ["", "provider=all&type=all", "type=invalid", "type="])
      expect(updateSearch(parsed(query))).toBe("");
    expect(
      updateListHref(
        parsed("provider=google&type=benchmarks"),
        "utm=x&utm=y&type=all&provider=all",
        "#gemini-4-argon-announced",
      ),
    ).toBe("/changelog?provider=google&type=benchmarks&utm=x&utm=y#gemini-4-argon-announced");
  });
  it("represents valid empty owners and never broadens unknown owners", () => {
    const empty = providers.find(
      (provider) => !events.some((event) => event.providerId === provider.id),
    );
    expect(empty).toBeDefined();
    const selected = parsed(`provider=${empty?.id}`);
    expect(selected.providerRecognized).toBe(true);
    expect(selectUpdates(events, selected)).toEqual([]);
    const options = updateProviderOptions(events, providers, selected);
    expect(options).toContainEqual(expect.objectContaining({ id: empty?.id }));
    expect(options.map((provider) => provider.name)).toEqual(
      options.map((provider) => provider.name).sort((a, b) => a.localeCompare(b)),
    );
    expect(
      updateProviderOptions(events, providers, parsed(""))
        .map((provider) => provider.id)
        .sort(),
    ).toEqual([...new Set(events.map((event) => event.providerId))].sort());
    expect(parsed("provider=unrecognized").providerRecognized).toBe(false);
    expect(selectUpdates(events, parsed("provider=unrecognized"))).toEqual([]);
    expect(updateSearch(parsed("provider=unrecognized"))).toBe("?provider=unrecognized");
  });
  it("keeps event identity independent of titles and filters", () => {
    for (const event of events) expect(marketEventHref(event.id)).toBe(`/changelog/${event.id}`);
  });
});
