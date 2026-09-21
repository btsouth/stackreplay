/**
 * GENERATED FILE - do not edit by hand.
 *
 * Regenerate with `pnpm --filter @stackreplay/catalog build`.
 * Source of truth: packages/catalog/data/**.yaml
 * Guarded by bundled.test.ts, which fails when this snapshot drifts.
 */

import type { CatalogV1 } from "./catalog.js";

export const BUNDLED_CATALOG_VERSION =
  "sha256:c56f518baed3155b475ad1a810cc89f82c241dd2aef669656f73770f90a48640";

export const BUNDLED_CATALOG: CatalogV1 = {
  catalogVersion: "sha256:c56f518baed3155b475ad1a810cc89f82c241dd2aef669656f73770f90a48640",
  providers: {
    "example-cloud": {
      id: "example-cloud",
      role: "provider",
      name: "Example Cloud",
      sources: [
        {
          url: "https://example.invalid/docs/example-cloud",
          title: "Example Cloud documentation (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
    "example-open": {
      id: "example-open",
      role: "provider",
      name: "Example Open",
      sources: [
        {
          url: "https://example.invalid/docs/example-open",
          title: "Example Open documentation (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
  },
  models: {
    "example-large": {
      id: "example-large",
      role: "model",
      name: "Example Large",
      providerIds: ["example-cloud"],
      sources: [
        {
          url: "https://example.invalid/models/example-large",
          title: "Example Large model card (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
    "example-medium": {
      id: "example-medium",
      role: "model",
      name: "Example Medium",
      providerIds: ["example-cloud", "example-open"],
      sources: [
        {
          url: "https://example.invalid/models/example-medium",
          title: "Example Medium model card (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
    "example-small": {
      id: "example-small",
      role: "model",
      name: "Example Small",
      providerIds: ["example-cloud"],
      sources: [
        {
          url: "https://example.invalid/models/example-small",
          title: "Example Small model card (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
  },
  plans: {
    "example-cloud-pro": {
      id: "example-cloud-pro",
      role: "plan",
      name: "Example Cloud Pro",
      providerId: "example-cloud",
      versions: [
        {
          effectiveFrom: "2026-08-01",
          price: {
            currency: "USD",
            amount: "50.00",
            interval: "month",
          },
          billingMechanics:
            "Token allowance per calendar month; request windows throttle burst usage.",
          limits: [
            {
              id: "monthly-tokens",
              label: "Monthly token allowance",
              type: "token_limit",
              amount: "200000000",
              window: {
                type: "calendar",
                unit: "month",
                timezone: "UTC",
              },
              exceed: "reject_request",
            },
            {
              id: "rolling-5h-requests",
              label: "5-hour request window",
              type: "request_limit",
              amount: "600",
              window: {
                type: "rolling",
                duration: "PT5H",
                anchor: "first_use",
              },
              exceed: "latch_until_reset",
            },
            {
              id: "large-model-credits",
              label: "Large model credit pool",
              type: "credit_pool",
              amount: "100.00",
              models: ["example-large"],
              window: {
                type: "calendar",
                unit: "month",
                timezone: "UTC",
              },
              exceed: "allow_overage",
            },
          ],
          modelRules: [
            {
              model: "example-small",
              pricingRef: "example-small-pricing",
            },
            {
              model: "example-medium",
              pricingRef: "example-medium-pricing",
            },
            {
              model: "example-large",
              pricingRef: "example-large-pricing",
              multiplier: "0.5",
            },
          ],
          promotions: [
            {
              id: "medium-launch-promo",
              label: "Medium model launch promotion",
              models: ["example-medium"],
              multiplier: "0.5",
              effectiveFrom: "2026-09-01",
              effectiveTo: "2026-09-30",
            },
          ],
          sources: [
            {
              url: "https://example.invalid/plans/example-cloud-pro",
              title: "Example Cloud Pro plan page (synthetic demo data)",
              checkedAt: "2026-08-01",
            },
          ],
          lastVerifiedAt: "2026-08-01",
          verificationStatus: "estimated",
        },
      ],
    },
    "example-cloud-starter": {
      id: "example-cloud-starter",
      role: "plan",
      name: "Example Cloud Starter",
      providerId: "example-cloud",
      versions: [
        {
          effectiveFrom: "2026-08-01",
          effectiveTo: "2026-09-14",
          price: {
            currency: "USD",
            amount: "20.00",
            interval: "month",
          },
          billingMechanics:
            "Credit pool consumed at model list rates; unused credits do not roll over.",
          limits: [
            {
              id: "rolling-5h-credits",
              label: "5-hour credit pool",
              type: "credit_pool",
              amount: "20.00",
              window: {
                type: "rolling",
                duration: "PT5H",
                anchor: "first_use",
              },
              exceed: "reject_request",
            },
            {
              id: "rolling-7d-credits",
              label: "Weekly credit pool",
              type: "credit_pool",
              amount: "75.00",
              window: {
                type: "rolling",
                duration: "P7D",
                anchor: "first_use",
              },
              exceed: "latch_until_reset",
            },
          ],
          modelRules: [
            {
              model: "example-small",
              pricingRef: "example-small-pricing",
            },
            {
              model: "example-medium",
              pricingRef: "example-medium-pricing",
            },
          ],
          sources: [
            {
              url: "https://example.invalid/plans/example-cloud-starter",
              title: "Example Cloud Starter plan page (synthetic demo data)",
              checkedAt: "2026-08-01",
            },
          ],
          lastVerifiedAt: "2026-08-01",
          verificationStatus: "estimated",
        },
        {
          effectiveFrom: "2026-09-15",
          price: {
            currency: "USD",
            amount: "20.00",
            interval: "month",
          },
          billingMechanics:
            "Credit pool consumed at model list rates; unused credits do not roll over.",
          limits: [
            {
              id: "rolling-5h-credits",
              label: "5-hour credit pool",
              type: "credit_pool",
              amount: "25.00",
              window: {
                type: "rolling",
                duration: "PT5H",
                anchor: "first_use",
              },
              exceed: "reject_request",
            },
            {
              id: "rolling-7d-credits",
              label: "Weekly credit pool",
              type: "credit_pool",
              amount: "75.00",
              window: {
                type: "rolling",
                duration: "P7D",
                anchor: "first_use",
              },
              exceed: "latch_until_reset",
            },
          ],
          modelRules: [
            {
              model: "example-small",
              pricingRef: "example-small-pricing",
            },
            {
              model: "example-medium",
              pricingRef: "example-medium-pricing",
            },
          ],
          sources: [
            {
              url: "https://example.invalid/plans/example-cloud-starter",
              title: "Example Cloud Starter plan page (synthetic demo data)",
              checkedAt: "2026-09-15",
            },
          ],
          lastVerifiedAt: "2026-09-15",
          verificationStatus: "estimated",
        },
      ],
    },
    "example-open-basic": {
      id: "example-open-basic",
      role: "plan",
      name: "Example Open Basic",
      providerId: "example-open",
      versions: [
        {
          effectiveFrom: "2026-08-01",
          price: {
            currency: "USD",
            amount: "10.00",
            interval: "month",
          },
          billingMechanics: "Request windows only; the large model is not available on this plan.",
          limits: [
            {
              id: "rolling-5h-requests",
              label: "5-hour request window",
              type: "request_limit",
              amount: "300",
              window: {
                type: "rolling",
                duration: "PT5H",
                anchor: "first_use",
              },
              exceed: "record_only",
            },
          ],
          modelRules: [
            {
              model: "example-small",
              pricingRef: "example-small-pricing",
            },
            {
              model: "example-medium",
              pricingRef: "example-medium-pricing",
            },
            {
              model: "example-large",
              excluded: true,
            },
          ],
          sources: [
            {
              url: "https://example.invalid/plans/example-open-basic",
              title: "Example Open Basic plan page (synthetic demo data)",
              checkedAt: "2026-08-01",
            },
          ],
          lastVerifiedAt: "2026-08-01",
          verificationStatus: "estimated",
        },
      ],
    },
  },
  planVersions: {
    "example-cloud-pro@2026-08-01": {
      effectiveFrom: "2026-08-01",
      price: {
        currency: "USD",
        amount: "50.00",
        interval: "month",
      },
      billingMechanics: "Token allowance per calendar month; request windows throttle burst usage.",
      limits: [
        {
          id: "monthly-tokens",
          label: "Monthly token allowance",
          type: "token_limit",
          amount: "200000000",
          window: {
            type: "calendar",
            unit: "month",
            timezone: "UTC",
          },
          exceed: "reject_request",
        },
        {
          id: "rolling-5h-requests",
          label: "5-hour request window",
          type: "request_limit",
          amount: "600",
          window: {
            type: "rolling",
            duration: "PT5H",
            anchor: "first_use",
          },
          exceed: "latch_until_reset",
        },
        {
          id: "large-model-credits",
          label: "Large model credit pool",
          type: "credit_pool",
          amount: "100.00",
          models: ["example-large"],
          window: {
            type: "calendar",
            unit: "month",
            timezone: "UTC",
          },
          exceed: "allow_overage",
        },
      ],
      modelRules: [
        {
          model: "example-small",
          pricingRef: "example-small-pricing",
        },
        {
          model: "example-medium",
          pricingRef: "example-medium-pricing",
        },
        {
          model: "example-large",
          pricingRef: "example-large-pricing",
          multiplier: "0.5",
        },
      ],
      promotions: [
        {
          id: "medium-launch-promo",
          label: "Medium model launch promotion",
          models: ["example-medium"],
          multiplier: "0.5",
          effectiveFrom: "2026-09-01",
          effectiveTo: "2026-09-30",
        },
      ],
      sources: [
        {
          url: "https://example.invalid/plans/example-cloud-pro",
          title: "Example Cloud Pro plan page (synthetic demo data)",
          checkedAt: "2026-08-01",
        },
      ],
      lastVerifiedAt: "2026-08-01",
      verificationStatus: "estimated",
      versionId: "example-cloud-pro@2026-08-01",
      planId: "example-cloud-pro",
      planName: "Example Cloud Pro",
      providerId: "example-cloud",
    },
    "example-cloud-starter@2026-08-01": {
      effectiveFrom: "2026-08-01",
      effectiveTo: "2026-09-14",
      price: {
        currency: "USD",
        amount: "20.00",
        interval: "month",
      },
      billingMechanics:
        "Credit pool consumed at model list rates; unused credits do not roll over.",
      limits: [
        {
          id: "rolling-5h-credits",
          label: "5-hour credit pool",
          type: "credit_pool",
          amount: "20.00",
          window: {
            type: "rolling",
            duration: "PT5H",
            anchor: "first_use",
          },
          exceed: "reject_request",
        },
        {
          id: "rolling-7d-credits",
          label: "Weekly credit pool",
          type: "credit_pool",
          amount: "75.00",
          window: {
            type: "rolling",
            duration: "P7D",
            anchor: "first_use",
          },
          exceed: "latch_until_reset",
        },
      ],
      modelRules: [
        {
          model: "example-small",
          pricingRef: "example-small-pricing",
        },
        {
          model: "example-medium",
          pricingRef: "example-medium-pricing",
        },
      ],
      sources: [
        {
          url: "https://example.invalid/plans/example-cloud-starter",
          title: "Example Cloud Starter plan page (synthetic demo data)",
          checkedAt: "2026-08-01",
        },
      ],
      lastVerifiedAt: "2026-08-01",
      verificationStatus: "estimated",
      versionId: "example-cloud-starter@2026-08-01",
      planId: "example-cloud-starter",
      planName: "Example Cloud Starter",
      providerId: "example-cloud",
    },
    "example-cloud-starter@2026-09-15": {
      effectiveFrom: "2026-09-15",
      price: {
        currency: "USD",
        amount: "20.00",
        interval: "month",
      },
      billingMechanics:
        "Credit pool consumed at model list rates; unused credits do not roll over.",
      limits: [
        {
          id: "rolling-5h-credits",
          label: "5-hour credit pool",
          type: "credit_pool",
          amount: "25.00",
          window: {
            type: "rolling",
            duration: "PT5H",
            anchor: "first_use",
          },
          exceed: "reject_request",
        },
        {
          id: "rolling-7d-credits",
          label: "Weekly credit pool",
          type: "credit_pool",
          amount: "75.00",
          window: {
            type: "rolling",
            duration: "P7D",
            anchor: "first_use",
          },
          exceed: "latch_until_reset",
        },
      ],
      modelRules: [
        {
          model: "example-small",
          pricingRef: "example-small-pricing",
        },
        {
          model: "example-medium",
          pricingRef: "example-medium-pricing",
        },
      ],
      sources: [
        {
          url: "https://example.invalid/plans/example-cloud-starter",
          title: "Example Cloud Starter plan page (synthetic demo data)",
          checkedAt: "2026-09-15",
        },
      ],
      lastVerifiedAt: "2026-09-15",
      verificationStatus: "estimated",
      versionId: "example-cloud-starter@2026-09-15",
      planId: "example-cloud-starter",
      planName: "Example Cloud Starter",
      providerId: "example-cloud",
    },
    "example-open-basic@2026-08-01": {
      effectiveFrom: "2026-08-01",
      price: {
        currency: "USD",
        amount: "10.00",
        interval: "month",
      },
      billingMechanics: "Request windows only; the large model is not available on this plan.",
      limits: [
        {
          id: "rolling-5h-requests",
          label: "5-hour request window",
          type: "request_limit",
          amount: "300",
          window: {
            type: "rolling",
            duration: "PT5H",
            anchor: "first_use",
          },
          exceed: "record_only",
        },
      ],
      modelRules: [
        {
          model: "example-small",
          pricingRef: "example-small-pricing",
        },
        {
          model: "example-medium",
          pricingRef: "example-medium-pricing",
        },
        {
          model: "example-large",
          excluded: true,
        },
      ],
      sources: [
        {
          url: "https://example.invalid/plans/example-open-basic",
          title: "Example Open Basic plan page (synthetic demo data)",
          checkedAt: "2026-08-01",
        },
      ],
      lastVerifiedAt: "2026-08-01",
      verificationStatus: "estimated",
      versionId: "example-open-basic@2026-08-01",
      planId: "example-open-basic",
      planName: "Example Open Basic",
      providerId: "example-open",
    },
  },
  pricing: {
    "example-large-pricing": {
      id: "example-large-pricing",
      role: "pricing",
      modelId: "example-large",
      currency: "USD",
      unit: "per_1m_tokens",
      rates: {
        input: "2.00",
        output: "6.00",
      },
      effectiveFrom: "2026-01-01",
      sources: [
        {
          url: "https://example.invalid/pricing/example-large",
          title: "Example Large pricing (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
    "example-medium-pricing": {
      id: "example-medium-pricing",
      role: "pricing",
      modelId: "example-medium",
      currency: "USD",
      unit: "per_1m_tokens",
      rates: {
        input: "0.50",
        output: "1.50",
        cacheRead: "0.05",
        cacheWrite: "0.60",
      },
      effectiveFrom: "2026-01-01",
      sources: [
        {
          url: "https://example.invalid/pricing/example-medium",
          title: "Example Medium pricing (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
    "example-small-pricing": {
      id: "example-small-pricing",
      role: "pricing",
      modelId: "example-small",
      currency: "USD",
      unit: "per_1m_tokens",
      rates: {
        input: "0.10",
        output: "0.40",
        cacheRead: "0.01",
        cacheWrite: "0.12",
      },
      effectiveFrom: "2026-01-01",
      sources: [
        {
          url: "https://example.invalid/pricing/example-small",
          title: "Example Small pricing (synthetic demo data)",
          checkedAt: "2026-09-01",
        },
      ],
      lastVerifiedAt: "2026-09-01",
      verificationStatus: "estimated",
    },
  },
};
