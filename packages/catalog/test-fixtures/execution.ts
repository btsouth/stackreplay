/** Synthetic accepted catalog records, never production provider facts. */
// biome-ignore-all lint/suspicious/noExplicitAny: varied fixture records are validated by the catalog loader.
import { buildCatalog } from "@stackreplay/catalog/load";

const at = "2026-09-01T00:00:00Z";
const until = "2027-09-01T00:00:00Z";
const source = {
  url: "https://example.invalid/synthetic",
  title: "Synthetic fixture",
  checkedAt: "2026-09-01",
};
const refs = (id: string) => [id];
const claim = (id: string, certainty = "synthetic") => ({
  id,
  sourceId: "fixture-source",
  sourceUrl: source.url,
  sourceType: "synthetic_fixture",
  observedAt: at,
  reviewedAt: at,
  effectiveDateBasis: "catalog_activation",
  authority: "synthetic",
  certainty,
  locator: `fixture/${id}`,
  normalizedClaimHash: `synthetic-normalized-${id}`,
  evidencePackageHash: `synthetic-package-${id}`,
  rawSourceHash: "synthetic-raw-v1",
  reviewer: "fixture-reviewer",
});
const claims = [
  claim("validity"),
  claim("price"),
  claim("capacity"),
  claim("debit"),
  claim("window"),
  claim("entitlement"),
  claim("continuation"),
  claim("availability"),
  claim("rate"),
  claim("overlay"),
];
const exact = (...modelIds: string[]) => ({ kind: "exact", modelIds });
const monthly = {
  id: "month",
  kind: "calendar",
  unit: "month",
  timezone: "UTC",
  claimRefs: refs("window"),
};
const purchase = (fixedUsd = "20", term = "month") => ({
  kind: "subscription",
  term,
  fixedUsd,
  claimRefs: refs("price"),
});
const route = (id: string, model: string, debitId: string, models: unknown = exact(model)) => ({
  id,
  endpointId: "fixture-endpoint",
  protocol: "synthetic-protocol",
  harnessIds: ["fixture-harness"],
  models,
  debitIds: [debitId],
  requirementIds: [],
  claimRefs: refs("entitlement"),
});
const value = { id: "value", kind: "usd_usage_value" };
const base = (id: string) => ({
  schemaVersion: 1,
  id: `${id}-v1`,
  productId: "fixture-product",
  validity: { start: at, end: until, basis: "current-market", claimRefs: refs("validity") },
  publication: { observedAt: at, reviewedAt: at, catalogActivatedAt: at },
  purchase: purchase(),
  claims: claims.map((c) => ({ ...c })),
  requirements: [],
  groups: [],
  rates: [],
  meters: [],
  pools: [],
  debits: [],
  windows: [],
  constraints: [],
  routes: [],
  continuation: { kind: "hard_stop", claimRefs: refs("continuation") },
  capabilities: [],
});

export type SyntheticFamily = "claude" | "goat" | "token" | "cursor" | "copilot" | "ollama" | "api";
export function syntheticExecutionRecord(family: SyntheticFamily): Record<string, any> {
  const v: Record<string, any> = base(family);
  if (family === "claude") {
    v.purchase = purchase("100");
    v.claims = [
      ...claims.filter((c) => c.id !== "capacity"),
      claim("capacity", "published_relative_limit"),
    ];
    v.meters = [{ id: "requests", kind: "request" }];
    v.pools = [{ id: "included", meterId: "requests" }];
    v.debits = [
      {
        id: "debit-a",
        poolId: "included",
        meterId: "requests",
        operation: { kind: "constant", amount: "1" },
        claimRefs: refs("debit"),
      },
    ];
    v.windows = [monthly];
    v.constraints = [
      {
        id: "opaque",
        poolId: "included",
        windowId: "month",
        amount: null,
        exceed: "reject_request",
        claimRefs: refs("capacity"),
      },
    ];
    v.routes = [route("included-a", "fixture-a", "debit-a")];
  } else if (family === "goat" || family === "token") {
    v.purchase = purchase(
      family === "token" ? "20" : "10",
      family === "token" ? "28_days" : "month",
    );
    v.rates = ["a", "b"].map((m) => ({
      id: `rate-${m}`,
      pricingRef: `fixture-${m}-price`,
      basis: "api_list_price",
      endpointId: "fixture-endpoint",
      rateVersion: "fixture-rate-v1",
      denomination: "USD",
      claimRefs: refs("rate"),
    }));
    v.meters = [value];
    v.pools = [{ id: "included", meterId: "value" }];
    v.debits = ["a", "b"].map((m) => ({
      id: `debit-${m}`,
      poolId: "included",
      meterId: "value",
      operation: {
        kind: "rate",
        rateId: `rate-${m}`,
        debitFactor: family === "token" && m === "a" ? "0.5" : "1",
      },
      claimRefs: refs("debit"),
    }));
    if (family === "goat") {
      v.windows = [
        monthly,
        { id: "week", kind: "calendar", unit: "week", timezone: "UTC", claimRefs: refs("window") },
        {
          id: "session",
          kind: "first_use_anchored",
          durationMs: 18000000,
          activation: exact("fixture-a", "fixture-b"),
          trigger: "first_eligible_offer",
          claimRefs: refs("window"),
        },
      ];
      v.constraints = [
        {
          id: "monthly-cap",
          poolId: "included",
          windowId: "month",
          amount: "70",
          exceed: "reject_request",
          claimRefs: refs("capacity"),
        },
        {
          id: "weekly-cap",
          poolId: "included",
          windowId: "week",
          amount: "35",
          exceed: "reject_request",
          claimRefs: refs("capacity"),
        },
        {
          id: "session-cap",
          poolId: "included",
          windowId: "session",
          amount: "14",
          exceed: "reject_request",
          claimRefs: refs("capacity"),
        },
        {
          id: "a-cap",
          poolId: "included",
          windowId: "month",
          models: exact("fixture-a"),
          amount: "20",
          exceed: "reject_request",
          claimRefs: refs("capacity"),
        },
      ];
      v.routes = [
        route("included-a", "fixture-a", "debit-a"),
        route("included-b", "fixture-b", "debit-b"),
      ];
      v.continuation = { kind: "independent_api_fallback", claimRefs: refs("continuation") };
    } else {
      v.requirements = [
        {
          id: "reset-anchor",
          scope: "anchor",
          kind: "account_reset_anchor",
          value: "purchase-cycle-start",
          claimRefs: refs("window"),
        },
      ];
      v.windows = [
        {
          id: "slice",
          kind: "fixed_partition",
          durationMs: 7 * 86400000,
          count: 4,
          parent: "purchase_cycle",
          coverage: "purchase_cycle",
          carry: "none",
          anchorRequirementId: "reset-anchor",
          claimRefs: refs("window"),
        },
      ];
      v.constraints = [
        {
          id: "slice-cap",
          poolId: "included",
          windowId: "slice",
          amount: "10",
          exceed: "reject_request",
          claimRefs: refs("capacity"),
        },
      ];
      const band = (m: string) => ({
        kind: "price_at_or_below",
        pricingRefs: [`fixture-${m}-price`],
        basis: "api_list_price",
        currency: "USD",
        endpointId: "fixture-endpoint",
        category: "input",
        comparison: "lte",
        threshold: "1",
        rateVersion: "fixture-rate-v1",
      });
      v.routes = [
        route("included-a", "fixture-a", "debit-a", band("a")),
        route("included-b", "fixture-b", "debit-b", band("b")),
      ];
    }
  } else if (family === "cursor") {
    v.meters = [{ id: "requests", kind: "request" }];
    v.pools = [
      { id: "cursor-models", meterId: "requests" },
      { id: "other-models", meterId: "requests" },
    ];
    v.debits = [
      {
        id: "debit-a",
        poolId: "cursor-models",
        meterId: "requests",
        operation: { kind: "constant", amount: "3" },
        claimRefs: refs("debit"),
      },
      {
        id: "debit-b",
        poolId: "other-models",
        meterId: "requests",
        operation: { kind: "constant", amount: "5" },
        claimRefs: refs("debit"),
      },
    ];
    v.windows = [monthly];
    v.constraints = [
      {
        id: "cursor-cap",
        poolId: "cursor-models",
        windowId: "month",
        amount: "10",
        exceed: "reject_request",
        claimRefs: refs("capacity"),
      },
      {
        id: "other-cap",
        poolId: "other-models",
        windowId: "month",
        amount: "20",
        exceed: "reject_request",
        claimRefs: refs("capacity"),
      },
    ];
    v.routes = [
      route("included-a", "fixture-a", "debit-a"),
      route("included-b", "fixture-b", "debit-b"),
    ];
  } else if (family === "copilot") {
    v.meters = [{ id: "credits", kind: "provider_credit", unitId: "fixture:ai-credit:v1" }];
    v.pools = [{ id: "base", meterId: "credits" }];
    v.debits = [
      {
        id: "debit-a",
        poolId: "base",
        meterId: "credits",
        operation: { kind: "constant", amount: "2" },
        claimRefs: refs("debit"),
      },
    ];
    v.windows = [monthly];
    v.constraints = [
      {
        id: "base-cap",
        poolId: "base",
        windowId: "month",
        amount: "100",
        exceed: "reject_request",
        claimRefs: refs("capacity"),
      },
    ];
    v.requirements = [
      {
        id: "legacy-cohort",
        scope: "plan",
        kind: "cohort",
        value: "legacy-member",
        claimRefs: refs("availability"),
      },
    ];
    v.capabilities = [
      { code: "unsupported_semantics", subject: "flexible-grant", claimRefs: refs("capacity") },
    ];
    v.routes = [route("included-a", "fixture-a", "debit-a")];
  } else if (family === "ollama") {
    v.purchase = purchase("5");
    v.meters = [value];
    v.pools = [{ id: "included", meterId: "value" }];
    v.debits = [
      {
        id: "debit-a",
        poolId: "included",
        meterId: "value",
        operation: { kind: "constant", amount: "6" },
        claimRefs: refs("debit"),
      },
    ];
    v.windows = [monthly];
    v.constraints = [
      {
        id: "cap",
        poolId: "included",
        windowId: "month",
        amount: "60",
        exceed: "reject_request",
        claimRefs: refs("capacity"),
      },
    ];
    v.routes = [route("included-a", "fixture-a", "debit-a")];
  } else {
    v.purchase = { kind: "api" };
    v.rates = ["a", "b"].map((m) => ({
      id: `rate-${m}`,
      pricingRef: `fixture-${m}-price`,
      basis: "api_list_price",
      endpointId: "fixture-endpoint",
      rateVersion: "fixture-rate-v1",
      denomination: "USD",
      claimRefs: refs("rate"),
    }));
    v.routes = ["a", "b"].map((m) => ({
      ...route(`api-${m}`, `fixture-${m}`, ""),
      debitIds: [],
      cash: { rateId: `rate-${m}`, cashRateFactor: "1" },
    }));
  }
  return {
    id: `fixture-${family}`,
    role: "plan",
    name: `Synthetic ${family}`,
    providerId: "fixture-provider",
    versions: [],
    executionVersions: [v],
    executionOverlays:
      family === "goat"
        ? [
            {
              id: "promo",
              validFrom: at,
              validUntil: until,
              planVersionIds: [v.id],
              requirementIds: [],
              precedence: 1,
              claimRefs: refs("overlay"),
              modifications: [
                {
                  kind: "debit_factor",
                  debitId: "debit-a",
                  factor: "0.5",
                  claimRefs: refs("overlay"),
                },
              ],
            },
          ]
        : [],
  };
}

export function syntheticExecutionCatalog(
  families: SyntheticFamily[] = ["claude", "goat", "token", "cursor", "copilot", "ollama", "api"],
  goatVersionCount = 1,
) {
  const models = ["a", "b", "c"].map((m) => ({
    id: `fixture-${m}`,
    role: "model",
    name: `Fixture ${m.toUpperCase()}`,
    kind: "release",
    providerIds: ["fixture-provider"],
    sources: [source],
    lastVerifiedAt: "2026-09-01",
    verificationStatus: "verified",
  }));
  const pricing = ["a", "b", "c"].map((m) => ({
    id: `fixture-${m}-price`,
    role: "pricing",
    modelId: `fixture-${m}`,
    currency: "USD",
    unit: "per_1m_tokens",
    basis: "api_list_price",
    endpointId: "fixture-endpoint",
    rateVersion: "fixture-rate-v1",
    rates: {
      input: m === "c" ? "2" : "1",
      output: "2",
      cacheRead: "0.1",
      cacheWrite: "1.25",
      reasoning: { billedAs: "output" },
    },
    effectiveFrom: "2026-01-01",
    sources: [source],
    lastVerifiedAt: "2026-09-01",
    verificationStatus: "verified",
  }));
  return buildCatalog({
    providers: [
      {
        file: "providers/fixture.yaml",
        data: {
          id: "fixture-provider",
          role: "provider",
          name: "Synthetic Provider",
          sources: [source],
          lastVerifiedAt: "2026-09-01",
          verificationStatus: "verified",
        },
      },
    ],
    models: models.map((data) => ({ file: `models/${data.id}.yaml`, data })),
    pricing: pricing.map((data) => ({ file: `pricing/${data.id}.yaml`, data })),
    plans: families.map((family) => {
      const data = syntheticExecutionRecord(family);
      if (family === "goat" && goatVersionCount > 1) {
        const template = data.executionVersions[0];
        data.executionVersions = Array.from({ length: goatVersionCount }, (_, i) => {
          const start = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().replace(".000Z", "Z");
          const end = new Date(Date.UTC(2026, 0, 2 + i)).toISOString().replace(".000Z", "Z");
          return {
            ...template,
            id: `goat-v${i + 1}`,
            validity: { ...template.validity, start, end },
            publication: { ...template.publication, catalogActivatedAt: start },
          };
        });
        data.executionOverlays = [];
      }
      return { file: `plans/fixture-${family}.yaml`, data };
    }),
  });
}
