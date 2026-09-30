import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compileExecutionPlan } from "./execution-compiler.js";
import { loadDefaultCatalog } from "./load.js";
import { createModelIdentityIndex } from "./resolve.js";
import { modelReleaseDateV1Schema, modelV1Schema } from "./schema.js";

interface Decision {
  key: string;
  names: string[];
  plans: string[];
  classification: string;
  modelId?: string;
  variant?: string;
  sources: string[];
}
interface Lineup {
  groups: { models: { name: string; modelId?: string; variant?: string; note?: string }[] }[];
}
const ledger = JSON.parse(
  readFileSync(new URL("../../../docs/catalog-coverage-decisions.json", import.meta.url), "utf8"),
) as { decisions: Decision[] };
const access = JSON.parse(
  readFileSync(
    new URL("../../../apps/web/lib/subscription-access-data.json", import.meta.url),
    "utf8",
  ),
) as Record<string, Lineup | Lineup[]>;
const catalog = loadDefaultCatalog();
const identity = createModelIdentityIndex(catalog);
const source = { url: "https://example.invalid/model", title: "Fixture", checkedAt: "2026-09-30" };

describe("reviewed coverage cohort", () => {
  it("classifies all 51 original rows with exact plan references and evidence", () => {
    expect(ledger.decisions).toHaveLength(51);
    expect(new Set(ledger.decisions.map((row) => row.key)).size).toBe(51);
    const counts: Record<string, number> = {};
    for (const row of ledger.decisions) {
      counts[row.classification] = (counts[row.classification] ?? 0) + 1;
      expect(row.names.length).toBeGreaterThan(0);
      expect(row.sources.length).toBeGreaterThan(0);
      expect(
        row.sources.every((url) => url.startsWith("https://") && !url.includes("openrouter.ai")),
      ).toBe(true);
      for (const plan of row.plans) {
        const stored = access[plan];
        expect(stored, plan).toBeDefined();
        const snapshots = Array.isArray(stored) ? stored : [stored];
        const entries = snapshots.flatMap(
          (snapshot) => snapshot?.groups.flatMap((group) => group.models) ?? [],
        );
        const matches = entries.filter((entry) => row.names.includes(entry.name));
        expect(matches.length, `${plan}: ${row.key}`).toBeGreaterThan(0);
        for (const entry of matches) {
          expect(entry.modelId, row.key).toBe(row.modelId);
          expect(entry.variant, row.key).toBe(row.variant);
          if (row.classification === "mode") expect(entry.note).toBeTruthy();
        }
      }
      if (row.modelId) expect(catalog.models[row.modelId], row.key).toBeDefined();
      else
        for (const name of row.names)
          expect(identity.resolve(name).canonicalId, name).toBeUndefined();
    }
    expect(counts).toEqual({
      release: 27,
      family: 1,
      route: 6,
      mode: 2,
      alias: 1,
      preview: 5,
      stealth: 3,
      out_of_scope: 3,
      deferred: 3,
    });
  });

  it("keeps family, modes, equivalent names and dated upgrades distinct", () => {
    expect(catalog.models["gemma-4"]?.kind).toBe("family");
    expect(catalog.models["gemma-4"]?.specifications).toBeUndefined();
    expect(identity.resolve("Hy3").canonicalId).toBe("hy3");
    expect(identity.resolve("Tencent Hy3").canonicalId).toBe("hy3");
    expect(identity.resolve("qwen3.8-max-2026-09-02").canonicalId).toBe("qwen-3-8-max-0902");
    expect(identity.resolve("qwen-3-8-max").canonicalId).toBe("qwen-3-8-max");
    expect(catalog.models["claude-opus-4-6-thinking"]).toBeUndefined();
    expect(
      identity.resolve("poolside/laguna-s-2.1-free", { harness: "command-code" }).canonicalId,
    ).toBeUndefined();
  });

  it("retains provider variants beside the base identity and only in their declared harness", () => {
    const cases = [
      [
        "deepseek/deepseek-v4-flash-fast",
        "command-code",
        "deepseek-v4-flash",
        "fast",
        "command-code",
      ],
      ["zai-org/GLM-5.2-Fast", "command-code", "glm-5-2", "fast", "command-code"],
      [
        "moonshotai/Kimi-K2.7-Code-Highspeed",
        "command-code",
        "kimi-k2-7-code",
        "highspeed",
        "command-code",
      ],
      ["mimo-v2.6-pro-ultraspeed", "mimo-api", "mimo-v2-6-pro", "ultraspeed", "xiaomi"],
      [
        "xiaomi/mimo-v2.6-pro-ultraspeed",
        "command-code",
        "mimo-v2-6-pro",
        "ultraspeed",
        "command-code",
      ],
      ["muse-spark-1.3-contributor", "meta-api", "muse-spark-1-3", "contributor", "meta"],
      [
        "meta/muse-spark-1.2-contributor",
        "command-code",
        "muse-spark-1-2",
        "contributor",
        "command-code",
      ],
    ] as const;
    for (const [alias, harness, modelId, variantId, providerId] of cases) {
      expect(identity.resolve(alias, { harness: harness })).toMatchObject({
        canonicalId: modelId,
        variant: { id: variantId, providerId },
      });
      expect(identity.resolve(alias).canonicalId, alias).toBeUndefined();
      expect(identity.resolve(alias, { harness: "unrelated" }).canonicalId, alias).toBeUndefined();
      expect(catalog.models[`${modelId}-${variantId}`]).toBeUndefined();
    }
  });
});

describe("sourced release dates", () => {
  it("does not let release metadata change an executable plan's effective dates or economics", () => {
    const model = catalog.models["gpt-6-1-sol"];
    if (!model) throw new Error("Missing Sol");
    const changed = {
      ...catalog,
      models: {
        ...catalog.models,
        [model.id]: { ...model, releaseDate: { date: "2030-01-01", sources: [source] } },
      },
    };
    const compile = (data: typeof catalog) =>
      compileExecutionPlan(
        data,
        "openai-api-gpt-6-1-sol",
        "openai-api-gpt-6-1-sol-effective-20260929",
        [],
        "2026-09-29T23:59:59Z",
      );
    expect(compile(changed)).toEqual(compile(catalog));
  });
  it("requires a real calendar date and at least one source", () => {
    expect(
      modelReleaseDateV1Schema.safeParse({ date: "2026-02-30", sources: [source] }).success,
    ).toBe(false);
    expect(modelReleaseDateV1Schema.safeParse({ date: "2026-09-30", sources: [] }).success).toBe(
      false,
    );
    expect(modelReleaseDateV1Schema.parse({ date: "2024-02-29", sources: [source] }).date).toBe(
      "2024-02-29",
    );
  });

  it("keeps old records valid without inferring a release date", () => {
    const model = modelV1Schema.parse({
      id: "fixture",
      role: "model",
      name: "Fixture",
      sources: [source],
      lastVerifiedAt: "2026-09-30",
      verificationStatus: "verified",
    });
    expect(model.releaseDate).toBeUndefined();
  });

  it("uses stable release days independently of snapshot and retrieval dates", () => {
    expect(catalog.models["claude-opus-4-5"]?.releaseDate?.date).toBe("2025-11-24");
    expect(identity.resolve("claude-opus-4-5-20251101").canonicalId).toBe("claude-opus-4-5");
    expect(catalog.models["gemini-3-1-flash-lite"]?.releaseDate?.date).toBe("2026-05-07");
    for (const id of ["qwen-3-7-flash", "qwen-3-8-omni-flash", "step-3-5-flash", "gemma-4"])
      expect(catalog.models[id]?.releaseDate, id).toBeUndefined();
    for (const row of ledger.decisions.filter((row) => row.classification === "release")) {
      if (!row.modelId) throw new Error("Release without identity");
      const model = catalog.models[row.modelId];
      expect(model?.sources.length).toBeGreaterThan(0);
      if (model?.releaseDate) expect(model.releaseDate.sources.length).toBeGreaterThan(0);
    }
  });
});
