import { bundledModelIdentity, bundledPlanModelsAt } from "@stackreplay/catalog/bundled";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { buildCompareFacts, PUBLIC_OFFER_REPLAY_UNAVAILABLE } from "./compare-facts";
import { marketDiscovery } from "./market-discovery";
import { catalogPlansAt, loadCatalog, loadPublicCatalog } from "./public-catalog";
import { loadPublicDirectory } from "./public-directory";
import { publicOfferObservations, validatePublicOffers } from "./public-offers";
import data from "./public-offers-data.json";
import { comparePublicPlanPrices, publicPlanPriceText } from "./public-plan-price";
import { targetCoverages, type WorkloadSlice } from "./routes";
import { runScopedReplay } from "./scoped-replay";
import { subscriptionPublishedTerms } from "./subscription-published-terms";

const date = "2026-10-03";
const ids = data.map((offer) => offer.id);
const current = loadPublicDirectory(date);
interface MutableObservation {
  checkedAt: string;
  price: { amount?: string; basis?: string };
  sources: { url: string; checkedAt: string }[];
}
interface MutableOffer {
  providerId: string;
  observations: [MutableObservation, ...MutableObservation[]];
}
const slice: WorkloadSlice = {
  sources: [],
  label: "Test workload",
  events: 1,
  unresolvedEvents: 0,
  models: new Map([["claude-sonnet-5-5", 1]]),
};

describe("public-only offer registry", () => {
  it("enumerates six sourced identities only from their first observation", () => {
    expect(ids).toHaveLength(6);
    for (const id of ids) {
      expect(loadPublicDirectory("2026-10-02").planById(id), id).toBeUndefined();
      const plan = current.planById(id);
      expect(plan?.kind, id).toBe("public_offer");
      expect(
        current.providers.find((provider) => provider.id === plan?.providerId)?.planIds,
      ).toContain(id);
      expect(plan?.sources.length).toBeGreaterThan(0);
      for (const key of [
        "versionId",
        "effectiveFrom",
        "modelRules",
        "limits",
        "timeline",
        "executionVersions",
      ])
        expect(plan, id).not.toHaveProperty(key);
      expect(plan?.modelAccess?.groups).toEqual([]);
    }
    expect(current.providers.filter((provider) => provider.id === "google")).toHaveLength(1);
    expect(
      loadPublicDirectory("2026-10-02").providers.some((provider) => provider.id === "devin"),
    ).toBe(false);
  });
  it("selects later observations without rewriting an earlier date or inventing an end", () => {
    const records = validatePublicOffers(data);
    const record = records[0];
    if (!record) throw new Error("Missing offer");
    const first = record.observations[0];
    if (!first) throw new Error("Missing observation");
    record.observations.push({
      ...first,
      checkedAt: "2026-10-10",
      price: { kind: "fixed", currency: "USD", interval: "month", amount: "5" },
    });
    expect(publicOfferObservations(date, records)[0]?.observation.price).toEqual(first.price);
    expect(publicOfferObservations("2026-10-10", records)[0]?.observation.price).toMatchObject({
      amount: "5",
    });
    expect(publicOfferObservations("2027-01-01", records)[0]?.observation.checkedAt).toBe(
      "2026-10-10",
    );
  });
  it("rejects duplicate, synthetic and any core identity, even an inactive one", () => {
    expect(() => validatePublicOffers([...data, data[0]])).toThrow();
    const mutate = (id: string) => [{ ...data[0], id }];
    expect(() => validatePublicOffers(mutate("example-offer"))).toThrow(/collision/);
    const core = loadCatalog();
    for (const id of Object.keys(core.plans))
      expect(() => validatePublicOffers(mutate(id))).toThrow(/collision/);
  });
  it.each([
    [
      "invalid decimal",
      (offer: MutableOffer) => {
        offer.observations[0].price.amount = "1e2";
      },
    ],
    [
      "invalid date",
      (offer: MutableOffer) => {
        offer.observations[0].checkedAt = "2026-02-30";
      },
    ],
    [
      "missing source",
      (offer: MutableOffer) => {
        offer.observations[0].sources = [];
      },
    ],
    [
      "unreviewed source",
      (offer: MutableOffer) => {
        offer.observations[0].sources = [
          { url: "https://devin.ai/pricing", checkedAt: "2026-10-04" },
        ];
      },
    ],
    [
      "external source",
      (offer: MutableOffer) => {
        offer.observations[0].sources = [{ url: "https://example.com/pricing", checkedAt: date }];
      },
    ],
    [
      "unknown basis",
      (offer: MutableOffer) => {
        offer.observations[0].price.basis = "seat";
      },
    ],
    [
      "provider mismatch",
      (offer: MutableOffer) => {
        offer.providerId = "google";
      },
    ],
    [
      "duplicate review",
      (offer: MutableOffer) => {
        offer.observations.push(offer.observations[0]);
      },
    ],
  ])("rejects %s", (_, change) => {
    const record: MutableOffer = JSON.parse(JSON.stringify(data[0]));
    change(record);
    expect(() => validatePublicOffers([record])).toThrow();
  });
  it("rejects unsupported price bases and incomplete fee formulas", () => {
    const first = data[0];
    if (!first) throw new Error("Missing offer");
    const observation = first.observations[0];
    if (!observation) throw new Error("Missing observation");
    for (const price of [
      { kind: "per_user", currency: "USD", amount: "22.80", interval: "month" },
      { kind: "per_user", currency: "USD", amount: "22.80", interval: "month", basis: "user" },
      {
        kind: "base_seat",
        currency: "USD",
        baseAmount: "80",
        interval: "month",
        basis: "full_developer_seat",
      },
      {
        kind: "base_seat",
        currency: "USD",
        baseAmount: "-80",
        seatAmount: "40",
        interval: "month",
        basis: "full_developer_seat",
      },
    ])
      expect(() =>
        validatePublicOffers([{ ...first, observations: [{ ...observation, price }] }]),
      ).toThrow();
  });
});

describe("directory isolation from accepted plans", () => {
  it("preserves every existing catalog projection and model place", () => {
    const base = loadPublicCatalog(date);
    expect(current.catalogVersion).toBe(base.catalogVersion);
    expect(current.models).toEqual(base.models);
    expect(
      current.plans
        .filter((plan) => plan.kind === "catalog_plan")
        .map(({ kind: _kind, publicPrice: _price, ...plan }) => plan),
    ).toEqual(base.plans);
  });
  it.each(ids)("%s never becomes a picker, coverage or execution target", (id) => {
    expect(loadCatalog().plans[id]).toBeUndefined();
    expect(loadPublicCatalog(date).planById(id)).toBeUndefined();
    expect(catalogPlansAt(date).some((plan) => plan.id === id)).toBe(false);
    expect(
      targetCoverages(slice, date, { synthetic: false }).some((target) => target.id === id),
    ).toBe(false);
    expect(bundledPlanModelsAt(id, date)).toBeUndefined();
    const exported = buildDemoExport("moderate");
    expect(() =>
      runScopedReplay({
        events: exported.events.slice(0, 1),
        target: { type: "subscription", planId: id },
        catalog: loadCatalog(),
        identity: bundledModelIdentity(),
        rulesAsOf: date,
        timeZone: "UTC",
        sources: [],
        sourceNames: new Map(),
      }),
    ).toThrow("No plan version for this plan is in effect");
  });
});

describe("commercial offer facts", () => {
  it("includes inherited Cloud access in every paid Devin tool filter", () => {
    const discovery = marketDiscovery(date);
    for (const id of ["devin-pro", "devin-max", "devin-teams"])
      expect(discovery.tools[id], id).toContain("Devin Cloud");
    expect(discovery.tools["devin-free"]).not.toContain("Devin Cloud");
  });

  it("keeps formulas and licensed prices beside their billing basis", () => {
    const prices = Object.fromEntries(
      current.plans
        .filter((plan) => ids.includes(plan.id))
        .map((plan) => [plan.id, publicPlanPriceText(plan)]),
    );
    expect(prices).toEqual({
      "devin-free": "Free",
      "devin-pro": "$20 / month",
      "devin-max": "$200 / month",
      "devin-teams": "$80/month base + $40/month per full developer seat",
      "google-code-assist-standard": "$22.80 per licensed user / month",
      "google-code-assist-enterprise": "$54 per licensed user / month",
    });
    const sorted = [...current.plans].sort(comparePublicPlanPrices);
    expect(sorted.at(-1)?.id).toBe("devin-teams");
    const discovery = marketDiscovery(date);
    expect(discovery.tools["google-code-assist-standard"]).toContain("Gemini CLI");
    for (const id of ids) {
      const offer = current.planById(id);
      if (!offer) throw new Error("Missing offer");
      const facts = buildCompareFacts(offer, current.modelById);
      expect(facts.price).toBe(prices[id]);
      expect(facts.simulation).toBe(PUBLIC_OFFER_REPLAY_UNAVAILABLE);
      expect(facts.rules).toEqual([]);
      expect(facts.usage.numeric).toBe(false);
      expect(facts.models.featured).toEqual([]);
      expect(facts.effective).toContain("earlier terms and introduction date are not established");
    }
  });
  it("retains fixed and first-slice user price labels", () => {
    expect(
      publicPlanPriceText({ price: { currency: "USD", amount: "20", interval: "month" } }),
    ).toBe("$20 / month");
    expect(
      publicPlanPriceText({
        price: { currency: "USD", amount: "40", interval: "month" },
        publishedTerms: { priceBasis: "user" },
      }),
    ).toBe("$40 per user / month");
    expect(
      publicPlanPriceText({
        price: { currency: "USD", amount: "20", interval: "month" },
        publishedTerms: { priceBasis: "paid_user" },
      }),
    ).toBe("$20 per paid user / month");
  });
  it("qualifies commitments, public quotas, sales restrictions and promotion expiry", () => {
    for (const [id, price, requests] of [
      ["google-code-assist-standard", "19", "1,500"],
      ["google-code-assist-enterprise", "45", "2,000"],
    ]) {
      const terms = subscriptionPublishedTerms(id ?? "", date);
      expect(terms?.billingSummary).toContain(
        `$${price} per licensed user/month with a 12-month commitment, billed monthly`,
      );
      expect(terms?.tables?.[0]?.rows[0]?.[1]).toBe(requests);
      expect(terms?.allowanceSummary).not.toContain(requests ?? "");
      expect(terms?.tables?.[0]?.note).toContain("one prompt can trigger multiple model calls");
      expect(terms?.availabilityNote).toContain("September 4, 2026");
      expect(terms?.availabilityNote).toContain("Existing active subscriptions are unaffected");
    }
    const later = subscriptionPublishedTerms("devin-free", "2026-10-17");
    expect(later?.terms.find((term) => term.label === "SWE-2 promotion")?.value).toContain(
      "checked October 3, 2026 announced",
    );
    expect(later?.terms.find((term) => term.label === "SWE-2 promotion")?.value).toContain(
      "does not establish ongoing free access after its end",
    );
    expect(
      subscriptionPublishedTerms("devin-teams", date)?.terms.find(
        (term) => term.label === "Enterprise",
      )?.value,
    ).toContain("sales quote");
  });
});
