import { describe, expect, it } from "vitest";
import { loadBundledCatalog } from "./bundled.js";
import type { CatalogV1 } from "./catalog.js";
import { createModelIdentityIndex } from "./resolve.js";

const IDS = [
  "amazon-nova-2-lite",
  "cohere-command-a-plus",
  "cohere-north-mini-code",
  "llama-4-maverick",
  "llama-4-scout",
] as const;

const ID_SET: ReadonlySet<string> = new Set(IDS);

const catalog = loadBundledCatalog();

function model(id: (typeof IDS)[number]) {
  const value = catalog.models[id];
  if (value === undefined) throw new Error(`missing ${id}`);
  return value;
}

function executionModelIds(plan: CatalogV1["plans"][string]): string[] {
  return (plan.executionVersions ?? []).flatMap((version) =>
    version.routes.flatMap((route) => (route.models.kind === "exact" ? route.models.modelIds : [])),
  );
}

describe("P3 expanded model coverage", () => {
  it("adds five representative releases with the correct developers and no Llama provider", () => {
    expect(catalog.providers.amazon?.name).toBe("Amazon");
    expect(catalog.providers.cohere?.name).toBe("Cohere");
    expect(catalog.providers.llama).toBeUndefined();

    expect(model("amazon-nova-2-lite")).toMatchObject({
      developerId: "amazon",
      providerIds: ["amazon"],
      apiAvailability: "available",
    });
    expect(model("cohere-command-a-plus")).toMatchObject({
      developerId: "cohere",
      providerIds: ["cohere"],
      apiAvailability: "available",
    });
    expect(model("cohere-north-mini-code")).toMatchObject({
      developerId: "cohere",
      providerIds: ["cohere"],
      apiAvailability: "available",
    });
    for (const id of ["llama-4-maverick", "llama-4-scout"] as const) {
      const release = model(id);
      expect(release.developerId).toBe("meta");
      expect(release.providerIds ?? []).toEqual([]);
      expect(release.apiAvailability).toBeUndefined();
      expect(release.kind).toBeUndefined();
      expect(release.familyId).toBeUndefined();
    }
  });

  it("records exact release evidence and provider-published identifiers", () => {
    expect(model("amazon-nova-2-lite")).toMatchObject({
      releaseDate: {
        date: "2025-12-02",
        sources: [
          expect.objectContaining({
            url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-lite.md",
          }),
        ],
      },
      aliases: [
        expect.objectContaining({
          alias: "amazon.nova-2-lite-v1:0",
          kind: "provider_id",
        }),
      ],
    });
    expect(model("cohere-command-a-plus")).toMatchObject({
      releaseDate: {
        date: "2026-05-20",
      },
      aliases: [
        expect.objectContaining({
          alias: "command-a-plus-05-2026",
          kind: "provider_id",
        }),
      ],
    });
    expect(model("cohere-north-mini-code")).toMatchObject({
      releaseDate: {
        date: "2026-06-09",
      },
      aliases: [
        expect.objectContaining({
          alias: "north-mini-code-1-0",
          kind: "provider_id",
        }),
      ],
    });
    expect(model("llama-4-maverick")).toMatchObject({
      releaseDate: {
        date: "2025-04-05",
      },
      aliases: [
        expect.objectContaining({
          alias: "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
          kind: "provider_id",
        }),
      ],
    });
    expect(model("llama-4-scout")).toMatchObject({
      releaseDate: {
        date: "2025-04-05",
      },
      aliases: [
        expect.objectContaining({
          alias: "meta-llama/Llama-4-Scout-17B-16E-Instruct",
          kind: "provider_id",
        }),
      ],
    });
  });

  it("preserves shorthand limits, capability evidence and license caveats", () => {
    const nova = model("amazon-nova-2-lite");
    expect(nova.specifications).toMatchObject({
      inputModalities: ["text", "image", "video"],
      outputModalities: ["text"],
      toolCalling: true,
      knowledgeCutoff: "October 2025",
    });
    expect(nova.specifications?.contextTokens).toBeUndefined();
    expect(nova.specifications?.maxOutputTokens).toBeUndefined();
    expect(nova.specifications?.structuredOutput).toBeUndefined();
    expect(nova.specifications?.notes?.join(" ")).toContain("1M-token context");
    expect(nova.specifications?.notes?.join(" ")).toContain("64K maximum output");
    expect(nova.specifications?.notes?.join(" ")).toContain("tool schemas");
    expect(nova.pricingNote).toContain("region, service tier and inference mode");

    const commandA = model("cohere-command-a-plus");
    expect(commandA.specifications).toMatchObject({
      contextTokens: 128000,
      maxOutputTokens: 64000,
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
      knowledgeCutoff: "April 1, 2025",
    });
    expect(commandA.specifications?.notes?.join(" ")).toContain("Apache 2.0");
    expect(commandA.pricingNote).toContain("free API access until rate limits");

    const north = model("cohere-north-mini-code");
    expect(north.specifications).toMatchObject({
      inputModalities: ["text"],
      outputModalities: ["text"],
      reasoning: true,
      toolCalling: true,
      structuredOutput: true,
    });
    expect(north.specifications?.contextTokens).toBeUndefined();
    expect(north.specifications?.maxOutputTokens).toBeUndefined();
    expect(north.specifications?.notes?.join(" ")).toContain("256K context window");
    expect(north.specifications?.notes?.join(" ")).toContain("64K maximum output");
    expect(north.pricingNote).toContain("Model Vault");

    for (const id of ["llama-4-maverick", "llama-4-scout"] as const) {
      const llama = model(id);
      expect(llama.specifications).toMatchObject({
        inputModalities: ["text", "image"],
        outputModalities: ["text"],
        knowledgeCutoff: "August 2024",
      });
      expect(llama.specifications?.contextTokens).toBeUndefined();
      expect(llama.specifications?.maxOutputTokens).toBeUndefined();
      expect(llama.specifications?.reasoning).toBeUndefined();
      expect(llama.specifications?.toolCalling).toBeUndefined();
      expect(llama.specifications?.structuredOutput).toBeUndefined();
      expect(llama.specifications?.notes?.join(" ")).toContain("up to five images");
      expect(llama.specifications?.notes?.join(" ")).toContain("not a hard universal maximum");
      expect(llama.specifications?.notes?.join(" ")).toContain(
        "Llama 4 Community License, not Apache 2.0",
      );
      expect(llama.pricingNote).toContain("not a free hosted API");
    }
    expect(model("llama-4-scout").specifications?.notes?.join(" ")).toContain("10M-token context");
  });

  it("does not add pricing records, execution offers or unrelated plan membership", () => {
    expect(Object.values(catalog.pricing).filter((price) => ID_SET.has(price.modelId))).toEqual([]);

    const legacyReferences = Object.values(catalog.planVersions).flatMap((version) =>
      version.modelRules.map((rule) => rule.model),
    );
    const executionReferences = Object.values(catalog.plans).flatMap(executionModelIds);
    const referenced = new Set([...legacyReferences, ...executionReferences]);
    for (const id of IDS) expect(referenced.has(id), id).toBe(false);
  });

  it("resolves exact newly published identifiers through the normal identity index", () => {
    const identity = createModelIdentityIndex(catalog);
    for (const [alias, id] of [
      ["amazon.nova-2-lite-v1:0", "amazon-nova-2-lite"],
      ["command-a-plus-05-2026", "cohere-command-a-plus"],
      ["north-mini-code-1-0", "cohere-north-mini-code"],
      ["meta-llama/Llama-4-Maverick-17B-128E-Instruct", "llama-4-maverick"],
      ["meta-llama/Llama-4-Scout-17B-16E-Instruct", "llama-4-scout"],
    ] as const) {
      expect(identity.resolve(alias), alias).toMatchObject({
        canonicalId: id,
        basis: "alias",
        aliasKind: "provider_id",
      });
    }
  });
});
