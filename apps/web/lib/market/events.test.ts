import { benchmarkData, resolveComparison } from "@stackreplay/benchmarks";
import { homepageBriefing, marketFeed } from "@stackreplay/market-events";
import { describe, expect, it } from "vitest";
import { canonicalUsage, type HomeCatalogIndex, marketRelation } from "../home/personal";
import { loadCatalog, loadPublicCatalog } from "../public-catalog";
import { briefingCandidates, loadMarketFeed, marketEventViews, recentEvents } from "./events";

const TODAY = "2026-09-30";
const catalog = loadPublicCatalog(TODAY);
const raw = loadCatalog();
const views = marketEventViews(catalog);

describe("the canonical market feed at the public boundary", () => {
  it("validates every provider, model, plan and benchmark id against the catalog and evidence", () => {
    expect(() => loadMarketFeed()).not.toThrow();
    expect(views.length).toBe(marketFeed.events.length);
  });

  it("is ordered globally by occurrence, newest first", () => {
    for (let index = 1; index < views.length; index += 1)
      expect(
        (views[index - 1] as { day: string }).day >= (views[index] as { day: string }).day,
      ).toBe(true);
  });

  it("never dates an event by the day the catalog admitted it", () => {
    // Catalog admission shows up as lastVerifiedAt / checkedAt; occurrence must come from the provider.
    for (const event of marketFeed.events) {
      expect(event.dateBasis).toMatch(/^provider_/u);
      for (const modelId of event.modelIds) {
        const model = raw.models[modelId];
        const release = model?.releaseDate?.date;
        if (event.type === "model_release" && release !== undefined && event.modelIds.length === 1)
          expect(event.occurredAt.slice(0, 10), event.id).toBe(release);
      }
    }
    // GPT-6 Astra was released Sep 3; the catalog recorded it on Sep 23.
    const astra = views.find((view) => view.id === "gpt-6-astra-released");
    expect(astra?.day).toBe("2026-09-03");
    expect(raw.models["gpt-6-astra"]?.lastVerifiedAt).not.toBe(astra?.day);
  });

  it("includes the qualifying recent releases", () => {
    const ids = views.map((view) => view.id);
    for (const id of [
      "gemini-4-argon-announced",
      "gpt-6-1-sol-released",
      "claude-sonnet-5-5-released",
      "claude-opus-5-5-released",
      "deepseek-v4-1-flash-released",
      "chatgpt-pro-500-launched",
    ])
      expect(ids).toContain(id);
  });

  it("reads benchmark facts from the canonical evidence, never from the feed", () => {
    const argon = views.find((view) => view.id === "gemini-4-argon-announced");
    const primary = resolveComparison(benchmarkData, ["gemini-4-argon"], { coverage: "all" }).find(
      (row) => row.definition.id === "deep-swe-v1-1",
    )?.cells[0]?.observation;
    expect(primary).toBeDefined();
    expect(argon?.facts.join(" ")).toContain(`DeepSWE v1.1 ${primary?.displayValue}`);
    for (const event of marketFeed.events.filter((entry) => entry.type.startsWith("benchmark_"))) {
      expect(event.benchmark?.sourceSetIds.length, event.id).toBeGreaterThan(0);
      for (const setId of event.benchmark?.sourceSetIds ?? [])
        expect(
          benchmarkData.sourceSets.some((set) => set.id === setId),
          event.id,
        ).toBe(true);
    }
  });

  it("states an announced model's API status from the catalog, not an invented price", () => {
    const argon = views.find((view) => view.id === "gemini-4-argon-announced");
    expect(argon?.status).toBe("announced");
    expect(argon?.facts).toContain("API pricing not yet published");
    const sol = views.find((view) => view.id === "gpt-6-1-sol-released");
    expect(sol?.facts[0]).toBe("API $2.00 in · $10.00 out per 1M tokens");
  });

  it("splits the same facts into figures, read from the catalog and evidence", () => {
    const argon = views.find((view) => view.id === "gemini-4-argon-announced");
    const primary = resolveComparison(benchmarkData, ["gemini-4-argon"], { coverage: "all" }).find(
      (row) => row.definition.id === "deep-swe-v1-1",
    )?.cells[0]?.observation;
    expect(argon?.highlights[0]).toMatchObject({
      kind: "benchmark",
      value: primary?.displayValue,
    });
    expect(argon?.highlights[0]?.label).toContain(`reported by ${primary?.evaluator}`);
    // The count is the distinct benchmarks the referenced source set reports for the model.
    const reported = new Set(
      benchmarkData.sourceSets
        .filter((set) => set.id === "google-deepmind-argon-2026-09-30")
        .flatMap((set) => set.observations)
        .filter((observation) => observation.modelId === "gemini-4-argon")
        .map((observation) => observation.benchmarkId),
    );
    expect(argon?.highlights.find((h) => h.kind === "benchmark-count")?.value).toBe(
      String(reported.size),
    );
    // An announced model says it is not in the API; it never gets a price figure.
    expect(argon?.highlights.some((h) => h.kind === "price")).toBe(false);
    expect(argon?.highlights.find((h) => h.kind === "api")?.value).toBe("Not in API");
    expect(argon?.benchmarksHref).toContain("models=gemini-4-argon");

    const sol = views.find((view) => view.id === "gpt-6-1-sol-released");
    expect(sol?.highlights.find((h) => h.kind === "price")?.value).toBe("$2.00 / $10.00");

    // A plan event shows the plan's published price, never a model's.
    const pro500 = views.find((view) => view.id === "chatgpt-pro-500-launched");
    const plan = catalog.planById("openai-chatgpt-pro-500");
    expect(pro500?.highlights).toEqual([
      expect.objectContaining({ kind: "plan-price", value: `$${Number(plan?.price.amount)}/mo` }),
    ]);
    // A new service tier is not a release: no standard-tier rates beside it.
    const ultrafast = views.find((view) => view.id === "gpt-6-astra-ultrafast");
    expect(ultrafast?.highlights.some((h) => h.kind === "price" || h.kind === "plan-price")).toBe(
      false,
    );
  });

  it("links every event to a first-party source", () => {
    for (const view of views) expect(view.source.url).toMatch(/^https:\/\//u);
  });
});

describe("homepage briefing over the real feed", () => {
  const candidates = briefingCandidates(views, TODAY);
  const shown = homepageBriefing(candidates, { today: TODAY, limit: 6 });

  it("shows only major and notable events no older than thirty days", () => {
    for (const view of candidates) {
      expect(view.importance).not.toBe("minor");
      expect(view.day >= "2026-08-31").toBe(true);
    }
  });

  it("leads with the newest events, including Argon, Sol, Sonnet 5.5 and Opus 5.5", () => {
    expect(shown[0]?.id).toBe("gemini-4-argon-announced");
    const ids = shown.map((view) => view.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "gemini-4-argon-announced",
        "gpt-6-1-sol-released",
        "claude-sonnet-5-5-released",
      ]),
    );
    expect(
      homepageBriefing(candidates, { today: TODAY, limit: 9 }).map((view) => view.id),
    ).toContain("claude-opus-5-5-released");
  });

  it("drops events as they age past thirty days on the reader's clock", () => {
    const later = homepageBriefing(candidates, { today: "2026-10-25", limit: 7 });
    for (const view of later) expect(view.day >= "2026-09-25").toBe(true);
    expect(homepageBriefing(candidates, { today: "2026-12-01" })).toEqual([]);
  });

  it("counts only thirty-day events for personal relevance", () => {
    for (const view of recentEvents(views, TODAY)) expect(view.day >= "2026-08-31").toBe(true);
  });
});

describe("personal relevance over the real feed", () => {
  const index: HomeCatalogIndex = {
    models: Object.fromEntries(
      catalog.models.map((model) => [
        model.id,
        { name: model.name, ...(model.familyId ? { familyId: model.familyId } : {}) },
      ]),
    ),
    plans: {
      "anthropic-claude-max-5x": {
        name: "Claude Max 5x",
        providerName: "Anthropic",
        price: { amount: "100", currency: "USD", interval: "month" },
        family: "claude",
      },
      "openai-chatgpt-pro-20x": {
        name: "ChatGPT Pro 200",
        providerName: "OpenAI",
        price: { amount: "200", currency: "USD", interval: "month" },
        family: "chatgpt",
      },
      "openai-chatgpt-pro-500": {
        name: "ChatGPT Pro 500",
        providerName: "OpenAI",
        price: { amount: "500", currency: "USD", interval: "month" },
        family: "chatgpt",
      },
    },
    apiProviders: {},
  };
  const usage = canonicalUsage({
    eventCount: 1000,
    models: [
      { rawName: "claude-opus-5-5", canonicalId: "claude-opus-5-5", mapped: true, events: 700 },
      { rawName: "claude-sonnet-5", canonicalId: "claude-sonnet-5", mapped: true, events: 200 },
      { rawName: "gpt-6.1-sol-preview", mapped: false, events: 100 },
    ],
  } as never);
  const stack = ["plan:anthropic-claude-max-5x", "plan:openai-chatgpt-pro-20x"] as const;
  const relation = (id: string) => {
    const view = views.find((entry) => entry.id === id);
    return view === undefined ? undefined : marketRelation(view, stack, usage, index);
  };

  it("matches by canonical id, catalog family and reviewed plan family only", () => {
    expect(relation("claude-opus-5-5-released")?.kind).toBe("used");
    expect(relation("claude-sonnet-5-5-released")?.kind).toBe("related");
    expect(relation("chatgpt-pro-200-reopened-lower-allowance")?.kind).toBe("stack");
    expect(relation("claude-five-hour-limits-raised")?.kind).toBe("stack");
    expect(relation("chatgpt-pro-500-launched")?.kind).toBe("related");
  });

  it("never relates an unresolved lookalike name to the release it resembles", () => {
    expect(relation("gpt-6-1-sol-released")).toBeUndefined();
    expect(relation("grok-4-7-released")).toBeUndefined();
  });
});
