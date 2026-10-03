import type { ProviderV1 } from "@stackreplay/catalog";
import { describe, expect, it } from "vitest";
import type { MarketEventView } from "./market/events";
import {
  isSyntheticCatalogId,
  loadCatalog,
  loadPublicCatalog,
  type PublicModelSummary,
} from "./public-catalog";
import type { DirectoryPublicOffer, PublicDirectory } from "./public-directory";
import { providerDiscoveryRows } from "./public-discovery";
import { publicPlanPriceText } from "./public-plan-price";
import { buildPublicProviderDirectory, loadPublicProviderDirectory } from "./public-providers";

const source = {
  url: "https://example.org/evidence",
  title: "Accepted evidence",
  checkedAt: "2026-09-01",
};
function provider(id: string): ProviderV1 {
  return {
    id,
    name: id,
    role: "provider",
    sources: [source],
    lastVerifiedAt: "2026-09-01",
    verificationStatus: "verified",
  };
}
function model(id: string, kind: "release" | "family" = "release"): PublicModelSummary {
  return {
    id,
    name: id,
    kind,
    lifecycle: "current",
    developerId: "developer",
    developerName: "developer",
    familyId: undefined,
    familyName: undefined,
    releaseIds: [],
    providerIds: ["publisher"],
    providerNames: ["publisher"],
    planIds: ["offer"],
    places: [
      { kind: "api", providerId: "api", providerName: "api", label: "API" },
      { kind: "api", providerId: "api", providerName: "api", label: "Duplicate route" },
      {
        kind: "plan",
        providerId: "publisher",
        providerName: "publisher",
        label: "Plan",
        planId: "offer",
      },
    ],
    aliases: [
      {
        id: "accepted-alias",
        alias: "alias-provider",
        kind: "provider_id",
        sources: [source],
        lastVerifiedAt: "2026-09-01",
        verificationStatus: "verified",
      },
    ],
    verificationStatus: "verified",
    lastVerifiedAt: "2026-09-01",
    sources: [source],
  };
}
function event(id: string, day: string): MarketEventView {
  return {
    id,
    day,
    occurredAt: day,
    verifiedAt: day,
    providerId: "publisher",
    providerName: "publisher",
    modelIds: ["release"],
    planIds: ["offer"],
    type: "model_release",
    typeLabel: "Model release",
    categories: ["models"],
    importance: "major",
    status: "available",
    title: id,
    summary: "Publisher announces another developer's model",
    facts: [],
    highlights: [],
    links: [],
    source,
    href: "/changelog",
  };
}
function fixture() {
  const models = [
    model("release"),
    { ...model("legacy"), lifecycle: "legacy" as const },
    model("family", "family"),
    model("example-model"),
  ];
  const offer: DirectoryPublicOffer = {
    kind: "public_offer",
    id: "offer",
    name: "offer",
    providerId: "publisher",
    providerName: "publisher",
    publicPrice: { kind: "fixed", currency: "USD", amount: "20", interval: "month" },
    checkedAt: "2026-10-03",
    lastVerifiedAt: "2026-10-03",
    sources: [source],
  };
  Object.defineProperty(offer, "price", {
    get() {
      throw new Error("Offer has no catalog price");
    },
  });
  const directory: PublicDirectory = {
    catalogVersion: "test",
    asOf: "2026-10-03",
    providers: [],
    models,
    plans: [offer],
    modelById: (id) => models.find((entry) => entry.id === id),
    planById: (id) => (id === offer.id ? offer : undefined),
    planVersions: () => [],
  };
  return {
    providers: ["developer", "api", "publisher", "empty", "alias-provider", "example-provider"].map(
      provider,
    ),
    directory,
    events: [event("old", "2026-09-01"), event("new", "2026-10-01")],
  };
}
describe("public provider relationships", () => {
  it("separates exact authorship, API places, publisher and event ownership", () => {
    const data = buildPublicProviderDirectory(fixture());
    expect(data.providerById("developer")).toMatchObject({
      developedModelIds: ["family", "release", "legacy"],
      apiModelIds: [],
      planIds: [],
      eventIds: [],
    });
    expect(data.providerById("api")).toMatchObject({
      developedModelIds: [],
      apiModelIds: ["family", "release", "legacy"],
      planIds: [],
      eventIds: [],
    });
    expect(data.providerById("publisher")).toMatchObject({
      developedModelIds: [],
      apiModelIds: [],
      planIds: ["offer"],
      eventIds: ["new", "old"],
    });
    expect(data.providerById("alias-provider")).toMatchObject({
      developedModelIds: [],
      apiModelIds: [],
      planIds: [],
      eventIds: [],
    });
    expect(data.providerById("example-provider")).toBeUndefined();
    expect(data.providerById("unknown")).toBeUndefined();
    expect(data.providerById("empty")).toMatchObject({
      developedModelIds: [],
      apiModelIds: [],
      planIds: [],
      eventIds: [],
    });
    expect(data.providers.map((entry) => entry.id)).toEqual([
      "alias-provider",
      "api",
      "developer",
      "empty",
      "publisher",
    ]);
    const rows = providerDiscoveryRows(data, {});
    expect(rows.find((row) => row.id === "developer")).toMatchObject({
      releases: 2,
      families: 1,
      legacy: 1,
      apiReleases: 0,
    });
    // There is no price-bearing API projection to misattribute or aggregate.
    expect(data.providerById("api")).not.toHaveProperty("price");
    expect(data.providerById("api")).not.toHaveProperty("rates");
  });
  it("rejects dangling real relationships rather than inventing identities", () => {
    const input = fixture();
    input.providers = input.providers.filter((entry) => entry.id !== "developer");
    expect(() => buildPublicProviderDirectory(input)).toThrow("Missing public provider: developer");
  });
  it("adds only validated offer publishers without inventing a provider date", () => {
    const input = fixture();
    input.providers = input.providers.filter((entry) => entry.id !== "publisher");
    expect(() => buildPublicProviderDirectory(input)).toThrow("Missing public offer publisher");
    input.directory.providers = [
      {
        id: "publisher",
        name: "Accepted publisher",
        planIds: ["offer"],
        sources: [source],
        verificationStatus: "verified",
        lastVerifiedAt: "2026-10-03",
      },
    ];
    const data = buildPublicProviderDirectory(input);
    expect(data.providerById("publisher")).toMatchObject({
      name: "Accepted publisher",
      evidence: { kind: "offer_publisher", sources: [source] },
    });
    expect(data.providerById("publisher")?.evidence).not.toHaveProperty("lastVerifiedAt");
  });
});
describe("real public provider snapshot", () => {
  it("preserves all real providers plus Devin and all six offers at the observation cutoff", () => {
    const data = loadPublicProviderDirectory("2026-10-03");
    const raw = Object.values(loadCatalog().providers).filter(
      (entry) => !isSyntheticCatalogId(entry.id),
    );
    expect(data.providers.map((entry) => entry.id).sort()).toEqual(
      [...raw.map((entry) => entry.id), "devin"].sort(),
    );
    expect(data.directory.plans.filter((plan) => plan.kind === "public_offer")).toHaveLength(6);
    expect(data.providerById("devin")).toMatchObject({
      developedModelIds: [],
      apiModelIds: [],
      eventIds: [],
    });
    expect(data.providerById("devin")?.planIds).toHaveLength(4);
    expect(data.providerById("google")?.planIds).toContain("google-code-assist-standard");
    expect(data.providerById("google")?.planIds).toContain("google-code-assist-enterprise");
    expect(data.providerById("google")?.evidence).toMatchObject({
      kind: "provider_record",
      lastVerifiedAt: loadCatalog().providers.google?.lastVerifiedAt,
      sources: loadCatalog().providers.google?.sources,
    });
    expect(data.directory.planById("google-code-assist-standard")?.lastVerifiedAt).toBe(
      "2026-10-03",
    );
    expect(
      data.directory.plans.filter((plan) => plan.kind === "catalog_plan").map((plan) => plan.id),
    ).toEqual(loadPublicCatalog("2026-10-03").plans.map((plan) => plan.id));
    const before = loadPublicProviderDirectory("2026-10-02");
    expect(before.providerById("devin")).toBeUndefined();
    expect(before.directory.plans.filter((plan) => plan.kind === "public_offer")).toEqual([]);
  });
  it("keeps unrecorded access and commercial price units truthful", () => {
    const data = loadPublicProviderDirectory("2026-10-03");
    expect(data.providerById("mistral")).toMatchObject({
      apiModelIds: ["mistral-large-3"],
      planIds: [],
      eventIds: [],
    });
    expect(data.providerById("mistral")?.developedModelIds).toHaveLength(1);
    const modelId = data.providerById("mistral")?.developedModelIds[0];
    const mistral = data.directory.modelById(modelId ?? "");
    expect(mistral?.specifications?.contextTokens).toBeUndefined();
    expect(data.providerById("devin")?.evidence).not.toHaveProperty("lastVerifiedAt");
    const teams = data.directory.planById("devin-teams");
    const licensed = data.directory.planById("google-code-assist-standard");
    if (!teams || !licensed) throw new Error("Missing sourced offers");
    expect(publicPlanPriceText(teams)).toBe("$80/month base + $40/month per full developer seat");
    expect(publicPlanPriceText(licensed)).toContain("per licensed user / month");
  });
});
