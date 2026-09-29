/**
 * GENERATED FILE - do not edit by hand.
 *
 * Regenerate with `pnpm --filter @stackreplay/catalog build`.
 * Source of truth: packages/catalog/data/**.yaml
 * Guarded by bundled.test.ts, which fails when this snapshot drifts.
 */

import type { CatalogV1 } from "./catalog.js";

export const BUNDLED_CATALOG_VERSION = "sha256:6ee69c120fcfeca7bece617912aa7169657ae937138f2738b20eb6d8d7806d24";

export const BUNDLED_CATALOG: CatalogV1 = {
  "catalogVersion": "sha256:6ee69c120fcfeca7bece617912aa7169657ae937138f2738b20eb6d8d7806d24",
  "providers": {
    "alibaba": {
      "id": "alibaba",
      "role": "provider",
      "name": "Alibaba Cloud (Qwen)",
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
          "title": "Alibaba Cloud Model Studio model inference pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "anthropic": {
      "id": "anthropic",
      "role": "provider",
      "name": "Anthropic",
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Anthropic current API models and token prices",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "cline": {
      "id": "cline",
      "role": "provider",
      "name": "Cline",
      "sources": [
        {
          "url": "https://docs.cline.bot/getting-started/clinepass",
          "title": "Official subscription documentation",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "command-code": {
      "id": "command-code",
      "role": "provider",
      "name": "Command Code",
      "sources": [
        {
          "url": "https://commandcode.ai/docs/resources/pricing-limits",
          "title": "Official current pricing and plans",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "cursor": {
      "id": "cursor",
      "role": "provider",
      "name": "Cursor",
      "sources": [
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "deepseek": {
      "id": "deepseek",
      "role": "provider",
      "name": "DeepSeek",
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek API pricing",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "example-cloud": {
      "id": "example-cloud",
      "role": "provider",
      "name": "Example Cloud",
      "sources": [
        {
          "url": "https://example.invalid/docs/example-cloud",
          "title": "Example Cloud documentation (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "example-open": {
      "id": "example-open",
      "role": "provider",
      "name": "Example Open",
      "sources": [
        {
          "url": "https://example.invalid/docs/example-open",
          "title": "Example Open documentation (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "github": {
      "id": "github",
      "role": "provider",
      "name": "GitHub",
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "google": {
      "id": "google",
      "role": "provider",
      "name": "Google",
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Google Gemini API models and token prices",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "kiro": {
      "id": "kiro",
      "role": "provider",
      "name": "Kiro",
      "sources": [
        {
          "url": "https://kiro.dev/pricing/",
          "title": "Kiro official pricing",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "meta": {
      "id": "meta",
      "role": "provider",
      "name": "Meta",
      "sources": [
        {
          "url": "https://research.meta.ai/blog/introducing-muse-spark-1-3",
          "title": "Official model developer",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "microsoft": {
      "id": "microsoft",
      "role": "provider",
      "name": "Microsoft AI",
      "sources": [
        {
          "url": "https://github.com/microsoft/MAI-Code",
          "title": "Official model developer",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "minimax": {
      "id": "minimax",
      "role": "provider",
      "name": "MiniMax",
      "sources": [
        {
          "url": "https://platform.minimax.io/docs/guides/pricing-paygo",
          "title": "MiniMax pay-as-you-go API pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "moonshot": {
      "id": "moonshot",
      "role": "provider",
      "name": "Moonshot AI",
      "sources": [
        {
          "url": "https://platform.kimi.ai/docs/guide/kimi-k3-quickstart",
          "title": "Official model developer",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "ollama": {
      "id": "ollama",
      "role": "provider",
      "name": "Ollama",
      "sources": [
        {
          "url": "https://ollama.com/pricing",
          "title": "Official current pricing and plans",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "openai": {
      "id": "openai",
      "role": "provider",
      "name": "OpenAI",
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "OpenAI API models and token prices",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "opencode": {
      "id": "opencode",
      "role": "provider",
      "name": "OpenCode",
      "sources": [
        {
          "url": "https://opencode.ai/v2/docs/console/go",
          "title": "Official subscription documentation",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "x-ai": {
      "id": "x-ai",
      "role": "provider",
      "name": "xAI",
      "sources": [
        {
          "url": "https://docs.x.ai/developers/models",
          "title": "xAI model and pricing documentation",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "xiaomi": {
      "id": "xiaomi",
      "role": "provider",
      "name": "Xiaomi",
      "sources": [
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Xiaomi MiMo API pay-as-you-go pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "z-ai": {
      "id": "z-ai",
      "role": "provider",
      "name": "Z.AI (Zhipu)",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.AI (Zhipu) API pricing",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    }
  },
  "models": {
    "claude-fable-5-1": {
      "id": "claude-fable-5-1",
      "role": "model",
      "name": "Claude Fable 5.1",
      "familyId": "claude-fable",
      "lifecycle": "current",
      "developerId": "anthropic",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "sources": [
          {
            "url": "https://platform.claude.com/docs/en/models/overview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "cursor",
        "github",
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-fable-5-1-router-anthropic-claude-fable-5-1",
          "alias": "anthropic/claude-fable-5.1",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/anthropic/claude-fable-5.1",
              "title": "OpenRouter model record `anthropic/claude-fable-5.1` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Fable 5.1 in the current lineup, Claude API ID `claude-fable-5-1`",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-fable-5": {
      "id": "claude-fable-5",
      "role": "model",
      "name": "Claude Fable 5",
      "familyId": "claude-fable",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "providerIds": [
        "github",
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-fable-5-router-anthropic-claude-fable-5",
          "alias": "anthropic/claude-fable-5",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/anthropic/claude-fable-5",
              "title": "OpenRouter model record `anthropic/claude-fable-5` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Fable 5 listed under legacy models (still available)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/model-deprecations",
          "title": "Anthropic model deprecations: `claude-fable-5` active on the Claude API, retirement not sooner than June 9, 2027",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified"
    },
    "claude-fable": {
      "id": "claude-fable",
      "role": "model",
      "name": "Fable",
      "kind": "family",
      "developerId": "anthropic",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude models are developed by Anthropic; each release has its own pinned model ID",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://code.claude.com/docs/en/model-config",
          "title": "Claude Code model configuration: the `fable` alias resolves to a Fable release that depends on the provider and date",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified"
    },
    "claude-haiku-4-5": {
      "id": "claude-haiku-4-5",
      "role": "model",
      "name": "Claude Haiku 4.5",
      "familyId": "claude-haiku",
      "lifecycle": "current",
      "developerId": "anthropic",
      "specifications": {
        "contextTokens": 200000,
        "maxOutputTokens": 64000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "sources": [
          {
            "url": "https://platform.claude.com/docs/en/models/overview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github",
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-haiku-4-5-observed-claude-haiku-4-5-20251001",
          "alias": "claude-haiku-4-5-20251001",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://platform.claude.com/docs/en/models/haiku-4-5/overview",
              "title": "Claude Haiku 4.5 API model id",
              "checkedAt": "2026-09-27"
            }
          ],
          "lastVerifiedAt": "2026-09-27",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/haiku-4-5/overview",
          "title": "Claude Haiku 4.5 model page: Claude API ID `claude-haiku-4-5-20251001`, alias `claude-haiku-4-5`",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Haiku 4.5 in the current lineup",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-haiku": {
      "id": "claude-haiku",
      "role": "model",
      "name": "Haiku",
      "kind": "family",
      "developerId": "anthropic",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude models are developed by Anthropic; each release has its own pinned model ID",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://code.claude.com/docs/en/model-config",
          "title": "Claude Code model configuration: the `haiku` alias resolves to a Haiku release that depends on the provider and date",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified"
    },
    "claude-opus-4-6": {
      "id": "claude-opus-4-6",
      "role": "model",
      "name": "Claude Opus 4.6",
      "familyId": "claude-opus",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "knowledgeCutoff": "May 2025",
        "sources": [
          {
            "url": "https://platform.claude.com/docs/en/models/opus-4-6/overview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-opus-4-6-api-id",
          "alias": "claude-opus-4-6",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://platform.claude.com/docs/en/models/opus-4-6/overview",
              "title": "Exact API identifier, model specifications and availability",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "claude-opus-4-6-router-anthropic-claude-opus-4-6",
          "alias": "anthropic/claude-opus-4.6",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/anthropic/claude-opus-4.6",
              "title": "OpenRouter model record `anthropic/claude-opus-4.6` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-4-6/overview",
          "title": "Exact API identifier, model specifications and availability",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "claude-opus-4-7": {
      "id": "claude-opus-4-7",
      "role": "model",
      "name": "Claude Opus 4.7",
      "familyId": "claude-opus",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "pricingNote": "Cache writes cost 1.25 times input for five-minute storage or twice input for one hour. Batch and regional rates differ.",
      "providerIds": [
        "github",
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Opus 4.7 listed under legacy models (still available)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/model-deprecations",
          "title": "Anthropic model deprecations: `claude-opus-4-7` active on the Claude API, retirement not sooner than April 16, 2027",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-opus-4-8-fast-mode": {
      "id": "claude-opus-4-8-fast-mode",
      "role": "model",
      "name": "Claude Opus 4.8 (fast mode) (preview)",
      "familyId": "claude-opus",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "pricingNote": "A separately recorded fast-preview identity. Current standard Opus rates are not substituted for this preview without exact route and pricing evidence.",
      "apiAvailability": "not_established",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Opus 4.8, the model this fast-mode route serves, listed under legacy models (still available)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Current API identity and pricing review",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-opus-4-8": {
      "id": "claude-opus-4-8",
      "role": "model",
      "name": "Claude Opus 4.8",
      "familyId": "claude-opus",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "providerIds": [
        "github",
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-opus-4-8-router-anthropic-claude-opus-4-8",
          "alias": "anthropic/claude-opus-4.8",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/anthropic/claude-opus-4.8",
              "title": "OpenRouter model record `anthropic/claude-opus-4.8` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Opus 4.8 listed under legacy models (still available)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/model-deprecations",
          "title": "Anthropic model deprecations: `claude-opus-4-8` active on the Claude API, retirement not sooner than May 28, 2027",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified"
    },
    "claude-opus-5-5": {
      "id": "claude-opus-5-5",
      "role": "model",
      "name": "Claude Opus 5.5",
      "familyId": "claude-opus",
      "lifecycle": "current",
      "developerId": "anthropic",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "sources": [
          {
            "url": "https://platform.claude.com/docs/en/models/overview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-opus-5-5-api-id",
          "alias": "claude-opus-5-5",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
              "title": "Claude Opus 5.5 model ID, 1M context, and API availability",
              "checkedAt": "2026-09-24"
            }
          ],
          "lastVerifiedAt": "2026-09-24",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
          "title": "Claude Opus 5.5 model specifications and availability",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Opus 5.5 in the current lineup, Claude API ID `claude-opus-5-5`",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-opus-5": {
      "id": "claude-opus-5",
      "role": "model",
      "name": "Claude Opus 5",
      "familyId": "claude-opus",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "providerIds": [
        "cursor",
        "github",
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-opus-5-router-anthropic-claude-opus-5",
          "alias": "anthropic/claude-opus-5",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/anthropic/claude-opus-5",
              "title": "OpenRouter model record `anthropic/claude-opus-5` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Opus 5 listed under legacy models (still available)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/model-deprecations",
          "title": "Anthropic model deprecations: `claude-opus-5` active on the Claude API, retirement not sooner than July 24, 2027",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified"
    },
    "claude-opus": {
      "id": "claude-opus",
      "role": "model",
      "name": "Opus",
      "kind": "family",
      "developerId": "anthropic",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude models are developed by Anthropic; each release has its own pinned model ID",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://code.claude.com/docs/en/model-config",
          "title": "Claude Code model configuration: the `opus` alias resolves to an Opus release that depends on the provider and date",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified"
    },
    "claude-sonnet-4-6": {
      "id": "claude-sonnet-4-6",
      "role": "model",
      "name": "Claude Sonnet 4.6",
      "familyId": "claude-sonnet",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "pricingNote": "Cache writes cost 1.25 times input for five-minute storage or twice input for one hour. Batch and regional rates differ.",
      "providerIds": [
        "github",
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Sonnet 4.6 listed under legacy models (still available)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/model-deprecations",
          "title": "Anthropic model deprecations: `claude-sonnet-4-6` active on the Claude API, retirement not sooner than February 17, 2027",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-sonnet-5-5": {
      "id": "claude-sonnet-5-5",
      "role": "model",
      "name": "Claude Sonnet 5.5",
      "familyId": "claude-sonnet",
      "lifecycle": "current",
      "developerId": "anthropic",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "sources": [
          {
            "url": "https://platform.claude.com/docs/en/models/overview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "anthropic"
      ],
      "aliases": [
        {
          "id": "claude-sonnet-5-5-api-id",
          "alias": "claude-sonnet-5-5",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://platform.claude.com/docs/en/models/sonnet-5-5/overview",
              "title": "Exact API identifier, model specifications and availability",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/sonnet-5-5/overview",
          "title": "Exact API identifier, model specifications and availability",
          "checkedAt": "2026-09-28"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Sonnet 5.5 standard and cache token rates",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-sonnet-5": {
      "id": "claude-sonnet-5",
      "role": "model",
      "name": "Claude Sonnet 5",
      "familyId": "claude-sonnet",
      "lifecycle": "legacy",
      "developerId": "anthropic",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "knowledgeCutoff": "January 2026",
        "sources": [
          {
            "url": "https://platform.claude.com/docs/en/models/sonnet-5/overview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "anthropic",
        "cursor",
        "github"
      ],
      "aliases": [
        {
          "id": "claude-sonnet-5-router-anthropic-claude-sonnet-5",
          "alias": "anthropic/claude-sonnet-5",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/anthropic/claude-sonnet-5",
              "title": "OpenRouter model record `anthropic/claude-sonnet-5` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/sonnet-5/overview",
          "title": "Claude Sonnet 5 model page: Claude API model ID `claude-sonnet-5`; platforms list the Claude API",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude Sonnet 5 in the current lineup, Claude API ID `claude-sonnet-5`",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/sonnet-5/overview",
          "title": "Active legacy release; Sonnet 5.5 is the current generation",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-sonnet": {
      "id": "claude-sonnet",
      "role": "model",
      "name": "Sonnet",
      "kind": "family",
      "developerId": "anthropic",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.claude.com/docs/en/models/overview",
          "title": "Anthropic models overview: Claude models are developed by Anthropic; each release has its own pinned model ID",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://code.claude.com/docs/en/model-config",
          "title": "Claude Code model configuration: the `sonnet` alias resolves to a Sonnet release that depends on the provider and date",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified"
    },
    "composer-2-5": {
      "id": "composer-2-5",
      "role": "model",
      "name": "Composer 2.5",
      "developerId": "cursor",
      "specifications": {
        "contextTokens": 200000,
        "toolCalling": true,
        "notes": [
          "Designed for coding with Cursor agent tools. Fast is the default product variant."
        ],
        "sources": [
          {
            "url": "https://cursor.com/docs/models/cursor-composer-2-5",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Cursor on-demand rates per million tokens: standard $0.50 input, $0.20 cached input and $2.50 output; Fast $3 input, $0.50 cached input and $15 output. These are Cursor product rates, not a separately established direct API route.",
      "apiAvailability": "not_established",
      "providerIds": [
        "cursor"
      ],
      "sources": [
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "deepseek-v4-1-flash": {
      "id": "deepseek-v4-1-flash",
      "role": "model",
      "name": "DeepSeek-V4.1-Flash",
      "developerId": "deepseek",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 384000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Thinking and non-thinking modes. Prices vary between peak and off-peak hours."
        ],
        "sources": [
          {
            "url": "https://api-docs.deepseek.com/quick_start/pricing/",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "deepseek"
      ],
      "aliases": [
        {
          "id": "deepseek-v4-1-flash-router-deepseek-deepseek-v4-1-flash",
          "alias": "deepseek/deepseek-v4.1-flash",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/deepseek/deepseek-v4.1-flash",
              "title": "OpenRouter model record `deepseek/deepseek-v4.1-flash` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "deepseek-v4-1-flash-router-deepseek-v4-1-flash-t3-code",
          "alias": "deepseek-v4.1-flash",
          "kind": "harness_alias",
          "harness": "t3-code",
          "sources": [
            {
              "url": "https://openrouter.ai/deepseek/deepseek-v4.1-flash",
              "title": "OpenRouter publishes the prefixed id `deepseek/deepseek-v4.1-flash`; this bare spelling is observed in the `t3-code` harness and is scoped to it",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "estimated"
        },
        {
          "id": "deepseek-v4-1-flash-router-deepseek-v4-1-flash-opencode",
          "alias": "deepseek-v4.1-flash",
          "kind": "harness_alias",
          "harness": "opencode",
          "sources": [
            {
              "url": "https://openrouter.ai/deepseek/deepseek-v4.1-flash",
              "title": "OpenRouter publishes the prefixed id `deepseek/deepseek-v4.1-flash`; this bare spelling is observed in the `opencode` harness and is scoped to it",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "estimated"
        },
        {
          "id": "deepseek-v4-1-flash-router-deepseek-v4-1-flash-hermes",
          "alias": "deepseek-v4.1-flash",
          "kind": "harness_alias",
          "harness": "hermes",
          "sources": [
            {
              "url": "https://openrouter.ai/deepseek/deepseek-v4.1-flash",
              "title": "OpenRouter publishes the prefixed id `deepseek/deepseek-v4.1-flash`; this bare spelling is observed in the `hermes` harness and is scoped to it",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "estimated"
        },
        {
          "id": "deepseek-v4-1-flash-observed-deepseek-flash",
          "alias": "deepseek-flash",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://api-docs.deepseek.com/quick_start/pricing",
              "title": "DeepSeek-V4.1-Flash API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek-V4.1-Flash model documentation",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing/",
          "title": "DeepSeek current API model and alias table; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "deepseek-v4-flash-vision-exp": {
      "id": "deepseek-v4-flash-vision-exp",
      "role": "model",
      "name": "DeepSeek-V4-Flash-Vision-Exp (legacy name, model retired)",
      "lifecycle": "legacy",
      "developerId": "deepseek",
      "providerIds": [
        "deepseek"
      ],
      "aliases": [
        {
          "id": "deepseek-v4-flash-vision-exp-router-deepseek-deepseek-v4-flash-vision-exp",
          "alias": "deepseek/deepseek-v4-flash-vision-exp",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/deepseek/deepseek-v4-flash-vision-exp",
              "title": "OpenRouter model record `deepseek/deepseek-v4-flash-vision-exp` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek-V4-Flash-Vision-Exp (legacy name, model retired) model documentation",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing/",
          "title": "DeepSeek current API model and alias table; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "deepseek-v4-flash": {
      "id": "deepseek-v4-flash",
      "role": "model",
      "name": "DeepSeek-V4-Flash (legacy name, model retired)",
      "lifecycle": "legacy",
      "developerId": "deepseek",
      "providerIds": [
        "deepseek"
      ],
      "aliases": [
        {
          "id": "deepseek-v4-flash-router-deepseek-deepseek-v4-flash",
          "alias": "deepseek/deepseek-v4-flash",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/deepseek/deepseek-v4-flash",
              "title": "OpenRouter model record `deepseek/deepseek-v4-flash` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek-V4-Flash (legacy name, model retired) model documentation",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing/",
          "title": "DeepSeek current API model and alias table; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "deepseek-v4-pro": {
      "id": "deepseek-v4-pro",
      "role": "model",
      "name": "DeepSeek-V4-Pro-0813",
      "developerId": "deepseek",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 384000,
        "inputModalities": [
          "text"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Current provider model version: DeepSeek-V4-Pro-0813. Thinking and non-thinking modes. Peak and off-peak prices differ."
        ],
        "sources": [
          {
            "url": "https://api-docs.deepseek.com/quick_start/pricing/",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "deepseek"
      ],
      "aliases": [
        {
          "id": "deepseek-v4-pro-api-id",
          "alias": "deepseek-v4-pro",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://api-docs.deepseek.com/quick_start/pricing",
              "title": "DeepSeek current API model ID and served version",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek current model, context, and availability",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/updates/",
          "title": "DeepSeek continues V4 Pro API service after September 14",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing/",
          "title": "DeepSeek current API model and alias table; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "example-large": {
      "id": "example-large",
      "role": "model",
      "name": "Example Large",
      "providerIds": [
        "example-cloud"
      ],
      "sources": [
        {
          "url": "https://example.invalid/models/example-large",
          "title": "Example Large model card (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "example-medium": {
      "id": "example-medium",
      "role": "model",
      "name": "Example Medium",
      "providerIds": [
        "example-cloud",
        "example-open"
      ],
      "sources": [
        {
          "url": "https://example.invalid/models/example-medium",
          "title": "Example Medium model card (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "example-small": {
      "id": "example-small",
      "role": "model",
      "name": "Example Small",
      "providerIds": [
        "example-cloud"
      ],
      "sources": [
        {
          "url": "https://example.invalid/models/example-small",
          "title": "Example Small model card (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "gemini-3-1-pro": {
      "id": "gemini-3-1-pro",
      "role": "model",
      "name": "Gemini 3.1 Pro",
      "developerId": "google",
      "specifications": {
        "contextTokens": 1048576,
        "maxInputTokens": 1048576,
        "maxOutputTokens": 65536,
        "inputModalities": [
          "text",
          "image",
          "audio",
          "video",
          "pdf"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "cursor",
        "google"
      ],
      "aliases": [
        {
          "id": "gemini-3-1-pro-observed-gemini-3-1-pro-preview",
          "alias": "gemini-3.1-pro-preview",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://ai.google.dev/gemini-api/docs/pricing",
              "title": "Gemini 3.1 Pro API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "gemini-3-1-pro-observed-gemini-3-1-pro-preview-customtools",
          "alias": "gemini-3.1-pro-preview-customtools",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://ai.google.dev/gemini-api/docs/pricing",
              "title": "Gemini 3.1 Pro API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models",
          "title": "Google Gemini API model list; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-5-flash": {
      "id": "gemini-3-5-flash",
      "role": "model",
      "name": "Gemini 3.5 Flash",
      "developerId": "google",
      "specifications": {
        "contextTokens": 1048576,
        "maxOutputTokens": 65536,
        "inputModalities": [
          "text",
          "image",
          "audio",
          "video",
          "pdf"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-6-flash": {
      "id": "gemini-3-6-flash",
      "role": "model",
      "name": "Gemini 3.6 Flash",
      "developerId": "google",
      "specifications": {
        "contextTokens": 1048576,
        "maxOutputTokens": 65536,
        "inputModalities": [
          "text",
          "image",
          "audio",
          "video",
          "pdf"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Promotional standard rates through December 31, 2026. Published January 1 rates: $1.50 input, $7.50 output and $0.15 cached input per million tokens. Cache storage and tools have separate charges.",
      "providerIds": [
        "github",
        "google"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://gemini.google/us/subscriptions/",
          "title": "Google US subscriptions: Gemini app access to 3.6 Flash (official)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models",
          "title": "Gemini API models: `gemini-3.6-flash` listed as stable (official)",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-7-flash": {
      "id": "gemini-3-7-flash",
      "role": "model",
      "name": "Gemini 3.7 Flash",
      "developerId": "google",
      "specifications": {
        "contextTokens": 1048576,
        "maxOutputTokens": 65536,
        "inputModalities": [
          "text",
          "image",
          "audio",
          "video",
          "pdf"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Promotional standard rates through December 31, 2026. Published January 1 rates: $1.50 input, $7.50 output and $0.15 cached input per million tokens. Cache storage and tools have separate charges.",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-8-flash": {
      "id": "gemini-3-8-flash",
      "role": "model",
      "name": "Gemini 3.8 Flash",
      "developerId": "google",
      "specifications": {
        "contextTokens": 1048576,
        "maxOutputTokens": 65536,
        "inputModalities": [
          "text",
          "image",
          "audio",
          "video",
          "pdf"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Promotional standard rates through December 31, 2026. Published January 1 rates: $1.50 input, $7.50 output and $0.15 cached input per million tokens. Cache storage and tools have separate charges.",
      "providerIds": [
        "cursor",
        "github"
      ],
      "aliases": [
        {
          "id": "gemini-3-8-flash-router-google-gemini-3-8-flash",
          "alias": "google/gemini-3.8-flash",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/google/gemini-3.8-flash",
              "title": "OpenRouter model record `google/gemini-3.8-flash` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "gemini-3-8-flash-observed-gemini-3-8-flash",
          "alias": "gemini-3.8-flash",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://ai.google.dev/gemini-api/docs/pricing",
              "title": "Gemini 3.8 Flash API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-flash-lite": {
      "id": "gemini-3-flash-lite",
      "role": "model",
      "name": "Gemini 3 Flash-Lite",
      "developerId": "google",
      "pricingNote": "This subscription label is not automatically equated with the separately named Gemini 3.1 Flash-Lite API model. An exact API identity is needed before applying its rates.",
      "apiAvailability": "not_established",
      "providerIds": [
        "google"
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models",
          "title": "Google Gemini API model list; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models",
          "title": "Current API identity and pricing review",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-flash": {
      "id": "gemini-3-flash",
      "role": "model",
      "name": "Gemini 3 Flash",
      "developerId": "google",
      "specifications": {
        "contextTokens": 1048576,
        "maxInputTokens": 1048576,
        "maxOutputTokens": 65536,
        "inputModalities": [
          "text",
          "image",
          "audio",
          "video",
          "pdf"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "google"
      ],
      "aliases": [
        {
          "id": "gemini-3-flash-observed-gemini-3-flash-preview",
          "alias": "gemini-3-flash-preview",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://ai.google.dev/gemini-api/docs/pricing",
              "title": "Gemini 3 Flash API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models",
          "title": "Google Gemini API model list; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-pro": {
      "id": "gemini-3-pro",
      "role": "model",
      "name": "Gemini 3 Pro",
      "developerId": "google",
      "pricingNote": "The Gemini 3 Pro Preview API was shut down on March 9, 2026. Subscription access is listed separately; a replacement API model is not silently substituted.",
      "apiAvailability": "retired",
      "providerIds": [
        "google"
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models",
          "title": "Google Gemini API model list; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://gemini.google/us/subscriptions/",
          "title": "Subscription model label checked for the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-preview",
          "title": "Current API identity and pricing review",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "glm-5-1": {
      "id": "glm-5-1",
      "role": "model",
      "name": "GLM 5.1",
      "developerId": "z-ai",
      "specifications": {
        "contextTokens": 200000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Thinking is on by default and can be turned off."
        ],
        "sources": [
          {
            "url": "https://docs.z.ai/guides/llm/glm-5.1",
            "title": "Official model specifications",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://docs.z.ai/guides/capabilities/thinking-mode",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "z-ai"
      ],
      "aliases": [
        {
          "id": "glm-5-1-api-id",
          "alias": "glm-5.1",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.z.ai/guides/llm/glm-5.1",
              "title": "GLM 5.1 API model code glm-5.1",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-1-router-z-ai-glm-5-1",
          "alias": "z-ai/glm-5.1",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.1",
              "title": "OpenRouter model record `z-ai/glm-5.1` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://docs.z.ai/guides/llm/glm-5.1",
          "title": "GLM 5.1 model documentation",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.AI API list pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "glm-5-2": {
      "id": "glm-5-2",
      "role": "model",
      "name": "GLM 5.2",
      "developerId": "z-ai",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Thinking is on by default and can be turned off."
        ],
        "sources": [
          {
            "url": "https://docs.z.ai/guides/llm/glm-5.2",
            "title": "Official model specifications",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://docs.z.ai/guides/capabilities/thinking-mode",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "z-ai"
      ],
      "aliases": [
        {
          "id": "glm-5-2-api-id",
          "alias": "glm-5.2",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.z.ai/guides/llm/glm-5.2",
              "title": "GLM 5.2 API model code glm-5.2",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-2-router-z-ai-glm-5-2",
          "alias": "z-ai/glm-5.2",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.2",
              "title": "OpenRouter model record `z-ai/glm-5.2` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://docs.z.ai/guides/llm/glm-5.2",
          "title": "GLM 5.2 model documentation",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.AI API list pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "glm-5-3-flash": {
      "id": "glm-5-3-flash",
      "role": "model",
      "name": "GLM 5.3 Flash",
      "developerId": "z-ai",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Reasoning is always enabled. File input is also supported."
        ],
        "sources": [
          {
            "url": "https://docs.z.ai/guides/vlm/glm-5.3-flash",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "z-ai",
        "command-code",
        "ollama"
      ],
      "aliases": [
        {
          "id": "glm-5-3-flash-ollama-cloud-model-code",
          "alias": "glm-5.3-flash:cloud",
          "kind": "harness_alias",
          "harness": "ollama",
          "sources": [
            {
              "url": "https://registry.ollama.com/library/glm-5.3-flash",
              "title": "Ollama Cloud exact model code glm-5.3-flash:cloud",
              "checkedAt": "2026-09-27"
            }
          ],
          "lastVerifiedAt": "2026-09-27",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-3-flash-command-code-model-code",
          "alias": "z-ai/glm-5.3-flash",
          "kind": "harness_alias",
          "harness": "command-code",
          "sources": [
            {
              "url": "https://commandcode.ai/models/glm-5-3-flash",
              "title": "Command Code exact model code z-ai/glm-5.3-flash",
              "checkedAt": "2026-09-27"
            }
          ],
          "lastVerifiedAt": "2026-09-27",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-3-flash-z-ai-api-model-code",
          "alias": "glm-5.3-flash",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.z.ai/guides/vlm/glm-5.3-flash",
              "title": "Z.AI Model API code glm-5.3-flash",
              "checkedAt": "2026-09-27"
            }
          ],
          "lastVerifiedAt": "2026-09-27",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-3-flash-router-z-ai-glm-5-3-flash",
          "alias": "z-ai/glm-5.3-flash",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.3-flash",
              "title": "OpenRouter model record `z-ai/glm-5.3-flash` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-3-flash-router-glm-5-3-flash-opencode",
          "alias": "glm-5.3-flash",
          "kind": "harness_alias",
          "harness": "opencode",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.3-flash",
              "title": "OpenRouter publishes the prefixed id `z-ai/glm-5.3-flash`; this bare spelling is observed in the `opencode` harness and is scoped to it",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "estimated"
        },
        {
          "id": "glm-5-3-flash-router-glm-5-3-flash-t3-code",
          "alias": "glm-5.3-flash",
          "kind": "harness_alias",
          "harness": "t3-code",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.3-flash",
              "title": "OpenRouter publishes the prefixed id `z-ai/glm-5.3-flash`; this bare spelling is observed in the `t3-code` harness and is scoped to it",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "estimated"
        },
        {
          "id": "glm-5-3-flash-router-glm-5-3-flash-hermes",
          "alias": "glm-5.3-flash",
          "kind": "harness_alias",
          "harness": "hermes",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.3-flash",
              "title": "OpenRouter publishes the prefixed id `z-ai/glm-5.3-flash`; this bare spelling is observed in the `hermes` harness and is scoped to it",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "estimated"
        },
        {
          "id": "glm-5-3-flash-observed-glm-5-3-flash",
          "alias": "GLM-5.3-Flash",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.z.ai/guides/vlm/glm-5.3-flash",
              "title": "GLM 5.3 Flash API model code glm-5.3-flash",
              "checkedAt": "2026-09-27"
            }
          ],
          "lastVerifiedAt": "2026-09-27",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://docs.z.ai/guides/vlm/glm-5.3-flash",
          "title": "GLM 5.3 Flash model page: API model code glm-5.3-flash",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "GLM 5.3 Flash model documentation",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "glm-5-3-flashx": {
      "id": "glm-5-3-flashx",
      "role": "model",
      "name": "GLM 5.3 FlashX",
      "developerId": "z-ai",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Reasoning is always enabled. File input is also supported. FlashX is not included in the GLM Coding Plan."
        ],
        "sources": [
          {
            "url": "https://docs.z.ai/guides/vlm/glm-5.3-flash",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "z-ai"
      ],
      "aliases": [
        {
          "id": "glm-5-3-flashx-router-z-ai-glm-5-3-flashx",
          "alias": "z-ai/glm-5.3-flashx",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.3-flashx",
              "title": "OpenRouter model record `z-ai/glm-5.3-flashx` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-3-flashx-observed-glm-5-3-flashx",
          "alias": "GLM-5.3-FlashX",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.z.ai/guides/overview/pricing",
              "title": "GLM 5.3 FlashX API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "GLM 5.3 FlashX model documentation",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "glm-5-3": {
      "id": "glm-5-3",
      "role": "model",
      "name": "GLM 5.3",
      "developerId": "z-ai",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Reasoning is always on. Supported effort levels: low, high and max."
        ],
        "sources": [
          {
            "url": "https://docs.z.ai/guides/llm/glm-5.3",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "z-ai"
      ],
      "aliases": [
        {
          "id": "glm-5-3-router-z-ai-glm-5-3",
          "alias": "z-ai/glm-5.3",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5.3",
              "title": "OpenRouter model record `z-ai/glm-5.3` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-3-observed-glm-5-3",
          "alias": "GLM-5.3",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.z.ai/guides/overview/pricing",
              "title": "GLM 5.3 API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "GLM 5.3 model documentation",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "glm-5": {
      "id": "glm-5",
      "role": "model",
      "name": "GLM 5",
      "developerId": "z-ai",
      "specifications": {
        "contextTokens": 200000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Thinking is on by default and can be turned off."
        ],
        "sources": [
          {
            "url": "https://docs.z.ai/guides/llm/glm-5",
            "title": "Official model specifications",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://docs.z.ai/guides/capabilities/thinking-mode",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "z-ai"
      ],
      "aliases": [
        {
          "id": "glm-5-api-id",
          "alias": "glm-5",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.z.ai/guides/llm/glm-5",
              "title": "GLM 5 API model code glm-5",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "glm-5-router-z-ai-glm-5",
          "alias": "z-ai/glm-5",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/z-ai/glm-5",
              "title": "OpenRouter model record `z-ai/glm-5` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://docs.z.ai/guides/llm/glm-5",
          "title": "GLM 5 model documentation",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.AI API list pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "gpt-5-3-codex": {
      "id": "gpt-5-3-codex",
      "role": "model",
      "name": "GPT-5.3-Codex",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 400000,
        "maxInputTokens": 272000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Aug 31, 2025",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.3-codex",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github"
      ],
      "aliases": [
        {
          "id": "gpt-5-3-codex-observed-gpt-5-3-codex",
          "alias": "gpt-5.3-codex",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5.3-Codex API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-4-mini": {
      "id": "gpt-5-4-mini",
      "role": "model",
      "name": "GPT-5.4 mini",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 400000,
        "maxInputTokens": 272000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Aug 31, 2025",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github",
        "openai"
      ],
      "aliases": [
        {
          "id": "gpt-5-4-mini-observed-gpt-5-4-mini",
          "alias": "gpt-5.4-mini",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
              "title": "GPT-5.4 mini API model id",
              "checkedAt": "2026-09-27"
            }
          ],
          "lastVerifiedAt": "2026-09-27",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
          "title": "OpenAI direct API model ID, token rates, and Responses endpoint",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-4-nano": {
      "id": "gpt-5-4-nano",
      "role": "model",
      "name": "GPT-5.4 nano",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 400000,
        "maxInputTokens": 272000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Aug 31, 2025",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.4-nano",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-4": {
      "id": "gpt-5-4",
      "role": "model",
      "name": "GPT-5.4",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Aug 31, 2025",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.4",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github"
      ],
      "aliases": [
        {
          "id": "gpt-5-4-observed-gpt-5-4",
          "alias": "gpt-5.4",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5.4 API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-5": {
      "id": "gpt-5-5",
      "role": "model",
      "name": "GPT-5.5",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Dec 01, 2025",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.5",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github"
      ],
      "aliases": [
        {
          "id": "gpt-5-5-observed-gpt-5-5",
          "alias": "gpt-5.5",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5.5 API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-6-luna": {
      "id": "gpt-5-6-luna",
      "role": "model",
      "name": "GPT-5.6 Luna",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxInputTokens": 922000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Feb 16, 2026",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "cursor",
        "github",
        "openai"
      ],
      "aliases": [
        {
          "id": "gpt-5-6-luna-observed-gpt-5-6-luna",
          "alias": "gpt-5.6-luna",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5.6 Luna API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models",
          "title": "OpenAI API model catalog; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-6-sol-pro": {
      "id": "gpt-5-6-sol-pro",
      "role": "model",
      "name": "GPT-5.6 Sol Pro",
      "developerId": "openai",
      "pricingNote": "ChatGPT Pro model option. OpenAI lists Sol, Terra and Luna as API models, but does not establish a separate Sol Pro API rate in the reviewed API catalog. Sol API pricing is not substituted.",
      "apiAvailability": "not_established",
      "providerIds": [
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models",
          "title": "OpenAI API model catalog; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://chatgpt.com/pricing/",
          "title": "Subscription model label checked for the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://openai.com/index/gpt-5-6/",
          "title": "Current API identity and pricing review",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-6-sol": {
      "id": "gpt-5-6-sol",
      "role": "model",
      "name": "GPT-5.6 Sol",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxInputTokens": 922000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Feb 16, 2026",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "cursor",
        "github",
        "openai"
      ],
      "aliases": [
        {
          "id": "gpt-5-6-sol-router-openai-gpt-5-6-sol",
          "alias": "openai/gpt-5.6-sol",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/openai/gpt-5.6-sol",
              "title": "OpenRouter model record `openai/gpt-5.6-sol` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "gpt-5-6-sol-observed-gpt-5-6-sol",
          "alias": "gpt-5.6-sol",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5.6 Sol API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "gpt-5-6-sol-observed-gpt-5-6",
          "alias": "gpt-5.6",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5.6 Sol API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models",
          "title": "OpenAI API model catalog; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-6-terra": {
      "id": "gpt-5-6-terra",
      "role": "model",
      "name": "GPT-5.6 Terra",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxInputTokens": 922000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Feb 16, 2026",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "cursor",
        "github",
        "openai"
      ],
      "aliases": [
        {
          "id": "gpt-5-6-terra-router-openai-gpt-5-6-terra",
          "alias": "openai/gpt-5.6-terra",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/openai/gpt-5.6-terra",
              "title": "OpenRouter model record `openai/gpt-5.6-terra` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "id": "gpt-5-6-terra-observed-gpt-5-6-terra",
          "alias": "gpt-5.6-terra",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5.6 Terra API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models",
          "title": "OpenAI API model catalog; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-mini": {
      "id": "gpt-5-mini",
      "role": "model",
      "name": "GPT-5 mini",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 400000,
        "maxInputTokens": 272000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "May 31, 2024",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-5-mini",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github"
      ],
      "aliases": [
        {
          "id": "gpt-5-mini-observed-gpt-5-mini-2025-08-07",
          "alias": "gpt-5-mini-2025-08-07",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/pricing",
              "title": "GPT-5 mini API model id",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-thinking-mini": {
      "id": "gpt-5-thinking-mini",
      "role": "model",
      "name": "GPT-5 Thinking Mini",
      "developerId": "openai",
      "pricingNote": "A ChatGPT model label. A separate direct API identifier and price for this exact label are not established. GPT-5 mini is listed separately.",
      "apiAvailability": "not_established",
      "providerIds": [
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models",
          "title": "OpenAI API model catalog; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://chatgpt.com/pricing/",
          "title": "Subscription model label checked for the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models",
          "title": "Current API identity and pricing review",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-6-astra": {
      "id": "gpt-6-astra",
      "role": "model",
      "name": "GPT-6 Astra",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxInputTokens": 922000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Apr 30, 2026",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-6-astra",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github",
        "openai"
      ],
      "aliases": [
        {
          "id": "gpt-6-astra-router-openai-gpt-6-astra",
          "alias": "openai/gpt-6-astra",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/openai/gpt-6-astra",
              "title": "OpenRouter model record `openai/gpt-6-astra` (exact id as published in the model list)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models",
          "title": "OpenAI API model catalog; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-6-luna": {
      "id": "gpt-6-luna",
      "role": "model",
      "name": "GPT-6 Luna",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxInputTokens": 922000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "May 18, 2026",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-6-luna",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "openai"
      ],
      "aliases": [
        {
          "id": "gpt-6-luna-api-id",
          "alias": "gpt-6-luna",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/models/gpt-6-luna",
              "title": "GPT-6 Luna canonical API ID",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-6-luna",
          "title": "GPT-6 Luna model specifications and API availability",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-6-sol": {
      "id": "gpt-6-sol",
      "role": "model",
      "name": "GPT-6 Sol",
      "developerId": "openai",
      "specifications": {
        "contextTokens": 1050000,
        "maxInputTokens": 922000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "knowledgeCutoff": "Apr 20, 2026",
        "sources": [
          {
            "url": "https://developers.openai.com/api/docs/models/gpt-6-sol",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "openai"
      ],
      "aliases": [
        {
          "id": "gpt-6-sol-api-id",
          "alias": "gpt-6-sol",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://developers.openai.com/api/docs/models/gpt-6-sol",
              "title": "GPT-6 Sol canonical API ID",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-6-sol",
          "title": "GPT-6 Sol model specifications and API availability",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "grok-4-5": {
      "id": "grok-4-5",
      "role": "model",
      "name": "Grok 4.5",
      "developerId": "x-ai",
      "specifications": {
        "contextTokens": 500000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://docs.x.ai/developers/models/grok-4.5",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Higher rates apply to long prompts around the 200K threshold. The pricing table specifies at least 200K; model documentation says above 200K. Global rates shown; regional processing, priority and server-side tools cost extra.",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.x.ai/developers/pricing",
          "title": "Official global pricing and long-context conditions",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "grok-4-6": {
      "id": "grok-4-6",
      "role": "model",
      "name": "Grok 4.6",
      "developerId": "x-ai",
      "specifications": {
        "contextTokens": 500000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://docs.x.ai/developers/models/grok-4.6",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Higher rates apply to long prompts around the 200K threshold. The pricing table specifies at least 200K; model documentation says above 200K. Global rates shown; regional processing, priority and server-side tools cost extra.",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.x.ai/developers/pricing",
          "title": "Official global pricing and long-context conditions",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "grok-4-7": {
      "id": "grok-4-7",
      "role": "model",
      "name": "Grok 4.7",
      "developerId": "x-ai",
      "specifications": {
        "contextTokens": 500000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "sources": [
          {
            "url": "https://docs.x.ai/developers/models/grok-4.7",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Higher rates apply to long prompts around the 200K threshold. The pricing table specifies at least 200K; model documentation says above 200K. Global rates shown; regional processing, priority and server-side tools cost extra.",
      "providerIds": [
        "cursor",
        "github",
        "x-ai"
      ],
      "aliases": [
        {
          "id": "grok-4-7-api-id",
          "alias": "grok-4.7",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://docs.x.ai/developers/release-notes",
              "title": "xAI Grok 4.7 canonical API ID",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.x.ai/developers/release-notes",
          "title": "xAI Grok 4.7 API availability, context, reasoning, and prices",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.x.ai/developers/pricing",
          "title": "Official global pricing and long-context conditions",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "kimi-k2-6": {
      "id": "kimi-k2-6",
      "role": "model",
      "name": "Kimi K2.6",
      "developerId": "moonshot",
      "specifications": {
        "contextTokens": 262144,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "notes": [
          "Thinking is on by default and can be turned off per request."
        ],
        "sources": [
          {
            "url": "https://platform.kimi.ai/docs/guide/kimi-k2-6-quickstart",
            "title": "Official model specifications",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://platform.kimi.ai/docs/pricing/chat",
            "title": "Context window",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "moonshot"
      ],
      "aliases": [
        {
          "id": "kimi-k2-6-api-id",
          "alias": "kimi-k2.6",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://platform.kimi.ai/docs/guide/kimi-k2-6-quickstart",
              "title": "Kimi K2.6 API model id kimi-k2.6",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "kimi-k2-6-router-moonshotai-kimi-k2-6",
          "alias": "moonshotai/kimi-k2.6",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/moonshotai/kimi-k2.6",
              "title": "OpenRouter model record `moonshotai/kimi-k2.6` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://platform.kimi.ai/docs/guide/kimi-k2-6-quickstart",
          "title": "Kimi K2.6 model documentation",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://platform.kimi.ai/docs/pricing/chat",
          "title": "Kimi API token prices and context window",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "kimi-k2-7-code": {
      "id": "kimi-k2-7-code",
      "role": "model",
      "name": "Kimi K2.7 Code",
      "developerId": "moonshot",
      "specifications": {
        "contextTokens": 256000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "sources": [
          {
            "url": "https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "kimi-k3": {
      "id": "kimi-k3",
      "role": "model",
      "name": "Kimi K3",
      "developerId": "moonshot",
      "specifications": {
        "contextTokens": 1000000,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "notes": [
          "Reasoning is always enabled. Cache writes use explicit five-minute or one-hour durations."
        ],
        "sources": [
          {
            "url": "https://platform.kimi.ai/docs/guide/kimi-k3-quickstart",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Official platform lists cache writes at $3 per million tokens. Five-minute and one-hour storage are supported; duration-specific write pricing is not resolved here. No write duration is assumed.",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://platform.kimi.ai/",
          "title": "Published token rates",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "mai-code-1-1-flash": {
      "id": "mai-code-1-1-flash",
      "role": "model",
      "name": "MAI-Code-1.1-Flash",
      "developerId": "microsoft",
      "specifications": {
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text"
        ],
        "notes": [
          "Coding model available in GitHub Copilot. Provider reports support for image understanding."
        ],
        "sources": [
          {
            "url": "https://github.com/microsoft/MAI-Code",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Available through GitHub Copilot. Microsoft describes a lower product cost, but the reviewed announcement does not publish an absolute direct API token price.",
      "apiAvailability": "not_established",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub supported model and retirement tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://microsoft.ai/news/mai-code-1-1-flash-br-better-faster-at-a-quarter-of-the-cost/",
          "title": "Current API identity and pricing review",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "mimo-v2-5-pro": {
      "id": "mimo-v2-5-pro",
      "role": "model",
      "name": "MiMo V2.5 Pro",
      "lifecycle": "legacy",
      "developerId": "xiaomi",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Deep thinking is on by default and can be turned off with thinking.type set to disabled."
        ],
        "sources": [
          {
            "url": "https://mimo.mi.com/models/en-US/mimo-v2.5-pro",
            "title": "Official model specs",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://mimo.mi.com/docs/en-US/quick-start/usage-guide/text-generation/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "xiaomi"
      ],
      "aliases": [
        {
          "id": "mimo-v2-5-pro-api-id",
          "alias": "mimo-v2.5-pro",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://mimo.mi.com/docs/en-US/quick-start/summary/model",
              "title": "MiMo V2.5 Pro API model id mimo-v2.5-pro",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "mimo-v2-5-pro-router-xiaomi-mimo-v2-5-pro",
          "alias": "xiaomi/mimo-v2.5-pro",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/xiaomi/mimo-v2.5-pro",
              "title": "OpenRouter model record `xiaomi/mimo-v2.5-pro` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.5-pro",
          "title": "MiMo V2.5 Pro model page",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Xiaomi MiMo API pay-as-you-go pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "mimo-v2-5": {
      "id": "mimo-v2-5",
      "role": "model",
      "name": "MiMo V2.5",
      "lifecycle": "legacy",
      "developerId": "xiaomi",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image",
          "video",
          "audio"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Deep thinking is on by default and can be turned off with thinking.type set to disabled."
        ],
        "sources": [
          {
            "url": "https://mimo.mi.com/models/en-US/mimo-v2.5",
            "title": "Official model specs",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://mimo.mi.com/docs/en-US/quick-start/usage-guide/text-generation/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "xiaomi"
      ],
      "aliases": [
        {
          "id": "mimo-v2-5-api-id",
          "alias": "mimo-v2.5",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://mimo.mi.com/docs/en-US/quick-start/summary/model",
              "title": "MiMo V2.5 API model id mimo-v2.5",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "mimo-v2-5-router-xiaomi-mimo-v2-5",
          "alias": "xiaomi/mimo-v2.5",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/xiaomi/mimo-v2.5",
              "title": "OpenRouter model record `xiaomi/mimo-v2.5` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.5",
          "title": "MiMo V2.5 model page",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Xiaomi MiMo API pay-as-you-go pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "mimo-v2-6-flash": {
      "id": "mimo-v2-6-flash",
      "role": "model",
      "name": "MiMo V2.6 Flash",
      "developerId": "xiaomi",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image",
          "video",
          "audio"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Deep thinking is on by default and can be turned off with thinking.type set to disabled."
        ],
        "sources": [
          {
            "url": "https://mimo.mi.com/models/en-US/mimo-v2.6-flash",
            "title": "Official model specs",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://mimo.mi.com/docs/en-US/quick-start/usage-guide/text-generation/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "xiaomi"
      ],
      "aliases": [
        {
          "id": "mimo-v2-6-flash-api-id",
          "alias": "mimo-v2.6-flash",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://mimo.mi.com/docs/en-US/quick-start/summary/model",
              "title": "MiMo V2.6 Flash API model id mimo-v2.6-flash",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "mimo-v2-6-flash-router-xiaomi-mimo-v2-6-flash",
          "alias": "xiaomi/mimo-v2.6-flash",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/xiaomi/mimo-v2.6-flash",
              "title": "OpenRouter model record `xiaomi/mimo-v2.6-flash` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.6-flash",
          "title": "MiMo V2.6 Flash model page",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Xiaomi MiMo API pay-as-you-go pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "mimo-v2-6-pro": {
      "id": "mimo-v2-6-pro",
      "role": "model",
      "name": "MiMo V2.6 Pro",
      "developerId": "xiaomi",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 128000,
        "inputModalities": [
          "text",
          "image",
          "video",
          "audio"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Deep thinking is on by default and can be turned off with thinking.type set to disabled."
        ],
        "sources": [
          {
            "url": "https://mimo.mi.com/models/en-US/mimo-v2.6-pro",
            "title": "Official model specs",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://mimo.mi.com/docs/en-US/quick-start/usage-guide/text-generation/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "xiaomi"
      ],
      "aliases": [
        {
          "id": "mimo-v2-6-pro-api-id",
          "alias": "mimo-v2.6-pro",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://mimo.mi.com/docs/en-US/quick-start/summary/model",
              "title": "MiMo V2.6 Pro API model id mimo-v2.6-pro",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "mimo-v2-6-pro-router-xiaomi-mimo-v2-6-pro",
          "alias": "xiaomi/mimo-v2.6-pro",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/xiaomi/mimo-v2.6-pro",
              "title": "OpenRouter model record `xiaomi/mimo-v2.6-pro` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.6-pro",
          "title": "MiMo V2.6 Pro model page",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Xiaomi MiMo API pay-as-you-go pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "minimax-m2-7": {
      "id": "minimax-m2-7",
      "role": "model",
      "name": "MiniMax M2.7",
      "developerId": "minimax",
      "specifications": {
        "contextTokens": 204800,
        "maxOutputTokens": 204800,
        "reasoning": true,
        "toolCalling": true,
        "notes": [
          "Thinking is always on; a disabled thinking setting is accepted but ignored."
        ],
        "sources": [
          {
            "url": "https://platform.minimax.io/docs/guides/text-generation",
            "title": "Official context window",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://platform.minimax.io/docs/api-reference/text-chat-openai",
            "title": "Maximum max_completion_tokens",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://platform.minimax.io/docs/api-reference/text-anthropic-api",
            "title": "Thinking control by model",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://platform.minimax.io/docs/guides/local-deploy-m2-7",
            "title": "Reasoning and tool calls",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "providerIds": [
        "minimax"
      ],
      "aliases": [
        {
          "id": "minimax-m2-7-api-id",
          "alias": "MiniMax-M2.7",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://platform.minimax.io/docs/guides/text-generation",
              "title": "MiniMax-M2.7 API model name",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "minimax-m2-7-router-minimax-minimax-m2-7",
          "alias": "minimax/minimax-m2.7",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/minimax/minimax-m2.7",
              "title": "OpenRouter model record `minimax/minimax-m2.7` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://platform.minimax.io/docs/guides/text-generation",
          "title": "MiniMax-M2.7 model documentation",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://platform.minimax.io/docs/guides/pricing-paygo",
          "title": "MiniMax pay-as-you-go API pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "minimax-m3": {
      "id": "minimax-m3",
      "role": "model",
      "name": "MiniMax M3",
      "developerId": "minimax",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 524288,
        "reasoning": true,
        "toolCalling": true,
        "notes": [
          "Thinking is off unless requested with thinking type adaptive.",
          "MiniMax describes M3 as natively multimodal but does not list its exact input types on the reviewed pages."
        ],
        "sources": [
          {
            "url": "https://platform.minimax.io/docs/guides/text-generation",
            "title": "Official context window",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://platform.minimax.io/docs/api-reference/text-chat-openai",
            "title": "Maximum max_completion_tokens",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://platform.minimax.io/docs/api-reference/text-anthropic-api",
            "title": "Thinking control by model",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://platform.minimax.io/docs/guides/text-m3-function-call",
            "title": "Tool use and interleaved thinking",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "pricingNote": "MiniMax lists M3 at $0.60 input, $2.40 output and $0.12 cache read per million tokens up to 512K input tokens, shown with a permanent 50% discount. The catalog records the discounted rates MiniMax charges. Priority service tier costs 1.5x standard. No cache-write rate is published for M3.",
      "providerIds": [
        "minimax"
      ],
      "aliases": [
        {
          "id": "minimax-m3-api-id",
          "alias": "MiniMax-M3",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://platform.minimax.io/docs/guides/text-generation",
              "title": "MiniMax-M3 API model name",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "minimax-m3-router-minimax-minimax-m3",
          "alias": "minimax/minimax-m3",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/minimax/minimax-m3",
              "title": "OpenRouter model record `minimax/minimax-m3` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://platform.minimax.io/docs/guides/text-generation",
          "title": "MiniMax-M3 model documentation",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://platform.minimax.io/docs/guides/pricing-paygo",
          "title": "MiniMax pay-as-you-go API pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "muse-spark-1-3": {
      "id": "muse-spark-1-3",
      "role": "model",
      "name": "Muse Spark 1.3",
      "developerId": "meta",
      "specifications": {
        "contextTokens": 1000000,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "sources": [
          {
            "url": "https://developer.meta.com/ai/models/muse-spark/",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Standard Muse Spark 1.3 rates. The separate contributor model has lower prices and permits use of data to improve Meta products; it is not silently substituted here.",
      "providerIds": [
        "cursor"
      ],
      "sources": [
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor current model and rate tables; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "nano-banana-pro": {
      "id": "nano-banana-pro",
      "role": "model",
      "name": "Nano Banana Pro",
      "developerId": "google",
      "specifications": {
        "maxInputTokens": 65536,
        "maxOutputTokens": 32768,
        "inputModalities": [
          "text",
          "image"
        ],
        "outputModalities": [
          "text",
          "image"
        ],
        "reasoning": true,
        "toolCalling": false,
        "structuredOutput": false,
        "sources": [
          {
            "url": "https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image",
            "title": "Official model specifications",
            "checkedAt": "2026-09-28"
          }
        ]
      },
      "pricingNote": "Gemini 3 Pro Image pricing is modality-specific: $2 per million input tokens; $12 per million text/thinking output tokens; $120 per million image output tokens. A 1K/2K image is $0.134 and a 4K image $0.24. These cannot be collapsed into one output-token rate.",
      "providerIds": [
        "google"
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/models",
          "title": "Google Gemini API model list; reviewed in the Sep 23 launch audit",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Current API identity and pricing review",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "qwen-3-7-max": {
      "id": "qwen-3-7-max",
      "role": "model",
      "name": "Qwen 3.7 Max",
      "lifecycle": "legacy",
      "developerId": "alibaba",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 131072,
        "inputModalities": [
          "text"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Hybrid thinking mode; thinking is on by default and can be turned off with enable_thinking."
        ],
        "sources": [
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max",
            "title": "Official model capabilities and context limits (Singapore, International)",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "pricingNote": "Rates are the Singapore (International) list prices. Other Model Studio regions list different rates, and limited-time promotions are excluded. Explicit cache creation and explicit cache reads are billed at separate published rates.",
      "providerIds": [
        "alibaba"
      ],
      "aliases": [
        {
          "id": "qwen-3-7-max-api-id",
          "alias": "qwen3.7-max",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max",
              "title": "Qwen 3.7 Max API model id qwen3.7-max",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "qwen-3-7-max-router-qwen-qwen3-7-max",
          "alias": "qwen/qwen3.7-max",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/qwen/qwen3.7-max",
              "title": "OpenRouter model record `qwen/qwen3.7-max` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max",
          "title": "Qwen 3.7 Max model page on Alibaba Cloud Model Studio",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-7-plus": {
      "id": "qwen-3-7-plus",
      "role": "model",
      "name": "Qwen 3.7 Plus",
      "developerId": "alibaba",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 131072,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Hybrid thinking mode; thinking is on by default and can be turned off with enable_thinking."
        ],
        "sources": [
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus",
            "title": "Official model capabilities and context limits (Singapore, International)",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "pricingNote": "Rates are the Singapore (International) list prices. Other Model Studio regions list different rates, and limited-time promotions are excluded. Explicit cache creation and explicit cache reads are billed at separate published rates.",
      "providerIds": [
        "alibaba"
      ],
      "aliases": [
        {
          "id": "qwen-3-7-plus-api-id",
          "alias": "qwen3.7-plus",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus",
              "title": "Qwen 3.7 Plus API model id qwen3.7-plus",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "qwen-3-7-plus-router-qwen-qwen3-7-plus",
          "alias": "qwen/qwen3.7-plus",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/qwen/qwen3.7-plus",
              "title": "OpenRouter model record `qwen/qwen3.7-plus` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus",
          "title": "Qwen 3.7 Plus model page on Alibaba Cloud Model Studio",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-8-27b": {
      "id": "qwen-3-8-27b",
      "role": "model",
      "name": "Qwen 3.8 27B",
      "developerId": "alibaba",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 131072,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Hybrid thinking mode; thinking is on by default and can be turned off with enable_thinking."
        ],
        "sources": [
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b",
            "title": "Official model capabilities and context limits (Singapore, International)",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "pricingNote": "Rates are the Singapore (International) list prices. Other Model Studio regions list different rates, and limited-time promotions are excluded. Explicit cache creation and explicit cache reads are billed at separate published rates.",
      "providerIds": [
        "alibaba"
      ],
      "aliases": [
        {
          "id": "qwen-3-8-27b-api-id",
          "alias": "qwen3.8-27b",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b",
              "title": "Qwen 3.8 27B API model id qwen3.8-27b",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "qwen-3-8-27b-router-qwen-qwen3-8-27b",
          "alias": "qwen/qwen3.8-27b",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/qwen/qwen3.8-27b",
              "title": "OpenRouter model record `qwen/qwen3.8-27b` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b",
          "title": "Qwen 3.8 27B model page on Alibaba Cloud Model Studio",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-8-flash": {
      "id": "qwen-3-8-flash",
      "role": "model",
      "name": "Qwen 3.8 Flash",
      "developerId": "alibaba",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 131072,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Hybrid thinking mode; thinking is on by default and can be turned off with enable_thinking."
        ],
        "sources": [
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash",
            "title": "Official model capabilities and context limits (Singapore, International)",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "pricingNote": "Rates are the Singapore (International) list prices. Other Model Studio regions list different rates, and limited-time promotions are excluded. Explicit cache creation and explicit cache reads are billed at separate published rates.",
      "providerIds": [
        "alibaba"
      ],
      "aliases": [
        {
          "id": "qwen-3-8-flash-api-id",
          "alias": "qwen3.8-flash",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash",
              "title": "Qwen 3.8 Flash API model id qwen3.8-flash",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        },
        {
          "id": "qwen-3-8-flash-router-qwen-qwen3-8-flash",
          "alias": "qwen/qwen3.8-flash",
          "kind": "harness_alias",
          "sources": [
            {
              "url": "https://openrouter.ai/qwen/qwen3.8-flash",
              "title": "OpenRouter model record `qwen/qwen3.8-flash` (exact id as published in the model list)",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash",
          "title": "Qwen 3.8 Flash model page on Alibaba Cloud Model Studio",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-8-max": {
      "id": "qwen-3-8-max",
      "role": "model",
      "name": "Qwen 3.8 Max",
      "developerId": "alibaba",
      "specifications": {
        "contextTokens": 1000000,
        "maxOutputTokens": 131072,
        "inputModalities": [
          "text",
          "image",
          "video"
        ],
        "outputModalities": [
          "text"
        ],
        "reasoning": true,
        "toolCalling": true,
        "structuredOutput": true,
        "notes": [
          "Hybrid thinking mode; thinking is on by default and can be turned off with enable_thinking."
        ],
        "sources": [
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max",
            "title": "Official model capabilities and context limits (Singapore, International)",
            "checkedAt": "2026-09-29"
          },
          {
            "url": "https://www.alibabacloud.com/help/en/model-studio/deep-thinking",
            "title": "Default thinking behavior",
            "checkedAt": "2026-09-29"
          }
        ]
      },
      "pricingNote": "Rates are the Singapore (International) list prices. Other Model Studio regions list different rates, and limited-time promotions are excluded. Explicit cache creation and explicit cache reads are billed at separate published rates.",
      "providerIds": [
        "alibaba"
      ],
      "aliases": [
        {
          "id": "qwen-3-8-max-api-id",
          "alias": "qwen3.8-max",
          "kind": "provider_id",
          "sources": [
            {
              "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max",
              "title": "Qwen 3.8 Max API model id qwen3.8-max",
              "checkedAt": "2026-09-29"
            }
          ],
          "lastVerifiedAt": "2026-09-29",
          "verificationStatus": "verified"
        }
      ],
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max",
          "title": "Qwen 3.8 Max model page on Alibaba Cloud Model Studio",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    }
  },
  "plans": {
    "anthropic-api-fable-5-1": {
      "id": "anthropic-api-fable-5-1",
      "role": "plan",
      "name": "Anthropic API: Claude Fable 5.1",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-fable-5-1-current-20260927-d3",
          "validity": {
            "start": "2026-09-27T20:39:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T20:39:00Z",
            "reviewedAt": "2026-09-27T20:39:00Z",
            "catalogActivatedAt": "2026-09-27T20:39:00Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5-1/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs; Availability",
              "excerpt": "claude-fable-5-1 is an active Claude API model at review. Current-market admission only; no historical effective-date claim.",
              "normalizedClaimHash": "sha256:cdc05b6fbcbea667b10557aa0c3be84233b85bee4f7649caae6590ce5144de63",
              "evidencePackageHash": "sha256:80c08c60631e760dd97f338ceece2447e06a7970ec1800ecdc5a1c4d94933b56",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5-1/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs / Claude API",
              "excerpt": "Exact Claude API identifier claude-fable-5-1; standard direct global API execution; paid API credentials required.",
              "normalizedClaimHash": "sha256:902f2d5993aa4369f1a5d8c72d6ec70e72e2e59d1d0b268b144deef68c2c69ba",
              "evidencePackageHash": "sha256:aa452cbbf903de39f6f2935c846fbf08cedbc2e1048e6d38e0b675672584dda2",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "endpoint",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/api/messages/create",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Create a Message: HTTP method and path",
              "excerpt": "POST https://api.anthropic.com/v1/messages uses the Anthropic Messages protocol.",
              "normalizedClaimHash": "sha256:df8c609e5b2eb59775cb359006d9dbc42815ca5e3e9519d613ea139199036ad2",
              "evidencePackageHash": "sha256:ea2a8d9da5e8a31b2817aac22d4f9ac1991c2ff0c1bfca75ee03507e18fa61a0",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5-1/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing",
              "excerpt": "USD per million: input 10, output 50, cache read 0.25; cache writes require an explicit duration.",
              "normalizedClaimHash": "sha256:7c3c735ad4c61cce9d23593035f2c5d67e5554e7b5181d2468ca6f20d8e1b939",
              "evidencePackageHash": "sha256:3d0dc130d56bd5c4fa669eac0c63615c4189c095dcff99a2312645949da97d40",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5-1/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing / 5m cache write and 1h cache write",
              "excerpt": "USD per million cache write: five minutes 12.5; one hour 20. Imported duration is not observed.",
              "normalizedClaimHash": "sha256:f2553ea82c88bdc65e9483b158f7f8547e9a73afdfc334617e0a8b41ee36a248",
              "evidencePackageHash": "sha256:f88a5b1c3923d74925703447e0c37b146005d53ab5dbd5e4e62c0b67d8bd3d5b",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "thinking-output-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pricing / output_tokens remains inclusive",
              "excerpt": "Thinking is billed as output. Inclusive output telemetry already includes reasoning, which must not be added again.",
              "normalizedClaimHash": "sha256:4a179770dd6703a0de4d6e11ee5509e0f7ed629d7e0ed5790d113d54f70af89d",
              "evidencePackageHash": "sha256:22abc203efbae839f43c818beff77a018b1077cde20967885bca11c1081fed8e",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "context",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Long context pricing",
              "excerpt": "Claude 4.6 and later use standard per-token pricing across the full 1M context window; no long-context premium for this route.",
              "normalizedClaimHash": "sha256:842c08f3ee38110ca54949c94f516a73dc20c85d08e07d117fef0bba65003e5a",
              "evidencePackageHash": "sha256:f1cb4c34fb8e913cf3761553a4290dc0c89451bf3dd973de16074495d38a5cdd",
              "reviewer": "Codex D3 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-fable-5-1-current-rate-d3",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260927-d3",
              "denomination": "USD",
              "claimRefs": [
                "rate",
                "thinking-output-d0",
                "context"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-fable-5-1"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route",
                "endpoint"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-fable-5-1-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-fable-5-1-cache-5m-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-fable-5-1-cache-5m-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-fable-5-1-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-fable-5-1-cache-1h-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-fable-5-1-cache-1h-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-api-fable-5": {
      "id": "anthropic-api-fable-5",
      "role": "plan",
      "name": "Anthropic API: Claude Fable 5",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-fable-5-current-20260927-d3",
          "validity": {
            "start": "2026-09-27T20:39:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T20:39:00Z",
            "reviewedAt": "2026-09-27T20:39:00Z",
            "catalogActivatedAt": "2026-09-27T20:39:00Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs; Availability",
              "excerpt": "claude-fable-5 is an active Claude API model at review. Current-market admission only; no historical effective-date claim.",
              "normalizedClaimHash": "sha256:3a7ec897aac70f33cd03adfbd747381c4313e6f92c933534e20d4d2d3e13f507",
              "evidencePackageHash": "sha256:5ab9316393239d7fe7409beaab230d2ccb41ae5e79a32638a0b8acae5a002aaa",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs / Claude API",
              "excerpt": "Exact Claude API identifier claude-fable-5; standard direct global API execution; paid API credentials required.",
              "normalizedClaimHash": "sha256:6c5b6583d00fbf4057136df8d4205cb9b2b07c791be32360183c91e1cce85494",
              "evidencePackageHash": "sha256:c451bdb634966db08faea8928d4571a4fb8f8233224110bc8aca1633fbbfd051",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "endpoint",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/api/messages/create",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Create a Message: HTTP method and path",
              "excerpt": "POST https://api.anthropic.com/v1/messages uses the Anthropic Messages protocol.",
              "normalizedClaimHash": "sha256:459adf3efdb1e6153c2a4afa8ca69129b9e56e9922b13f6d0409e951d3aac0cf",
              "evidencePackageHash": "sha256:19a835e7351e3e9d8b6a66af04669b6a050f04e11ae265284d83e9734598b509",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing",
              "excerpt": "USD per million: input 10, output 50, cache read 1; cache writes require an explicit duration.",
              "normalizedClaimHash": "sha256:3c8ca3aa11d29767d1b2e3cfe50e0b20b15d473fe0a249ad0f4d70e24b0999b4",
              "evidencePackageHash": "sha256:1d2c01bdf491514c011d02597e69df41ce88498ba2295896e10b4e702696e39d",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/fable-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing / 5m cache write and 1h cache write",
              "excerpt": "USD per million cache write: five minutes 12.5; one hour 20. Imported duration is not observed.",
              "normalizedClaimHash": "sha256:35fb43f08fadf3c8e6ab3fc8fc9bfa42a9b45825bba54570a1ceec2bb0488468",
              "evidencePackageHash": "sha256:a620fa2faa38c3db4aaba34c26bd8c18e4107610a811bd02c7ded6a799fbcc58",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "thinking-output-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pricing / output_tokens remains inclusive",
              "excerpt": "Thinking is billed as output. Inclusive output telemetry already includes reasoning, which must not be added again.",
              "normalizedClaimHash": "sha256:5bfb0bd9881e778a80e63e47f91f90aa6ecfb24ed644d47b996fd2ec2969bd32",
              "evidencePackageHash": "sha256:dbcb0b81f86331de4bf359cb6f3eb2a82d368512b0ee4aca7ec591b17ec5cd03",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "context",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Long context pricing",
              "excerpt": "Claude 4.6 and later use standard per-token pricing across the full 1M context window; no long-context premium for this route.",
              "normalizedClaimHash": "sha256:9231f14bad63fdb7941a97eb0897d69d281838cf45738c4576d7fcf8ab4745c1",
              "evidencePackageHash": "sha256:6697a10ace3f8cbec33f96cf9e7f9257ae6ba0271634fadba0e923ac9a380f20",
              "reviewer": "Codex D3 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-fable-5-current-rate-d3",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260927-d3",
              "denomination": "USD",
              "claimRefs": [
                "rate",
                "thinking-output-d0",
                "context"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-fable-5"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route",
                "endpoint"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-fable-5-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-fable-5-cache-5m-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-fable-5-cache-5m-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-fable-5-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-fable-5-cache-1h-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-fable-5-cache-1h-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-api-haiku-4-5": {
      "id": "anthropic-api-haiku-4-5",
      "role": "plan",
      "name": "Anthropic API: Claude Haiku 4.5",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-haiku-4-5-current-20260927",
          "validity": {
            "start": "2026-09-27T14:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T14:38:00Z",
            "reviewedAt": "2026-09-27T14:38:00Z",
            "catalogActivatedAt": "2026-09-27T14:38:00Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/haiku-4-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "current model or pricing listing",
              "excerpt": "Model and listed rates were current at review; provider effective date was not established.",
              "normalizedClaimHash": "sha256:d222a76ab3060b09b5009ad3790fdd732233c7cf842eba8b6bb9e7f877f50813",
              "evidencePackageHash": "sha256:c0e4c76df456d619b2da5c920eb807a2c9832da6b8471a393621fa65c00664ce",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/api/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "API endpoint and model request",
              "excerpt": "Exact claude-haiku-4-5 on anthropic-messages-global through anthropic-messages.",
              "normalizedClaimHash": "sha256:9bf789622d1884af74e2d24aabd90e527bb21770f572057436d000d0e8a1281d",
              "evidencePackageHash": "sha256:e21342a3d0e2c8003fc143b18bbe9d9d6ee19e9b2de26e20a60d8109c6aee0b5",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "model price row",
              "excerpt": "USD per 1M base input, output and cache-read tokens; standard global Claude API. Cache writes need duration and are unresolved here.",
              "normalizedClaimHash": "sha256:924080d2ac9cbbf9a199902222292b6b513af75546b29131f763892126ce3d75",
              "evidencePackageHash": "sha256:6f3d0f70d561478115114c120ca2b7342c994d88b1a80e6acfa8b7be343fb89d",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:20:00Z",
              "reviewedAt": "2026-09-27T18:20:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Cache writes: five minutes at 1.25 times input; one hour at 2 times input. Imported undifferentiated writes do not establish which duration applied.",
              "normalizedClaimHash": "sha256:dfb53162630812395c274d842d8fca05eab8e36a9fd89603fe0fae588aa23b6d",
              "evidencePackageHash": "sha256:e6e68c2287486a2ca9befa78359ba5a5e40ee118eda45a602a49c4d4d55f9ec5",
              "reviewer": "Codex D0 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-haiku-4-5-current-rate",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260927",
              "denomination": "USD",
              "claimRefs": [
                "rate"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-haiku-4-5"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-27T18:20:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-haiku-4-5-current-20260927"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-haiku-4-5-cache-5m-d0",
              "claimRefs": [
                "cache-duration-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-27T18:20:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-haiku-4-5-current-20260927"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-haiku-4-5-cache-1h-d0",
              "claimRefs": [
                "cache-duration-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-api-opus-4-8": {
      "id": "anthropic-api-opus-4-8",
      "role": "plan",
      "name": "Anthropic API: Claude Opus 4.8",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-opus-4-8-current-20260927-d3",
          "validity": {
            "start": "2026-09-27T20:39:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T20:39:00Z",
            "reviewedAt": "2026-09-27T20:39:00Z",
            "catalogActivatedAt": "2026-09-27T20:39:00Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-4-8/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs; Availability",
              "excerpt": "claude-opus-4-8 is an active Claude API model at review. Current-market admission only; no historical effective-date claim.",
              "normalizedClaimHash": "sha256:c417fc323c06847411308447c12197a3d1b05ac8fe1a37908f49057a49873ddc",
              "evidencePackageHash": "sha256:5aa2f41f1332a285d647f22b14192193d284c86730eb6bd470e6ad8c050914d2",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-4-8/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs / Claude API",
              "excerpt": "Exact Claude API identifier claude-opus-4-8; standard direct global API execution; paid API credentials required.",
              "normalizedClaimHash": "sha256:1d019a7213cb80cfa72e005678db0b1fa72c9f4600c4119352f0d8672ecf9b59",
              "evidencePackageHash": "sha256:626c2c0dee22a5053e33eeb015b11c6303b4ca5f7a5a2ff7976ee401c9faf9a7",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "endpoint",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/api/messages/create",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Create a Message: HTTP method and path",
              "excerpt": "POST https://api.anthropic.com/v1/messages uses the Anthropic Messages protocol.",
              "normalizedClaimHash": "sha256:177fbf2b2380f81785e740689cb85cbc214645cd1a09b226c52bb9d71f29583f",
              "evidencePackageHash": "sha256:d66c37b9688b3d5e956e197d7127039d9a969d8bfd1ffcb4cc8893f22653394e",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-4-8/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing",
              "excerpt": "USD per million: input 5, output 25, cache read 0.5; cache writes require an explicit duration.",
              "normalizedClaimHash": "sha256:c3f594b311fc6131bef6edeb2c2f656b5cfb2ef9e9c08fdcbbb360f2398029de",
              "evidencePackageHash": "sha256:550b3ce995d9e24d493576dd3bee4295784cdaba588eb3df1ca04d9483842966",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-4-8/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing / 5m cache write and 1h cache write",
              "excerpt": "USD per million cache write: five minutes 6.25; one hour 10. Imported duration is not observed.",
              "normalizedClaimHash": "sha256:28c4f76825645987c3efe42bb94ff6bac12ecf2e3ecd9ec07158c62b52ef71e1",
              "evidencePackageHash": "sha256:2cb079d8c68cb4f73039831c1a574ce1f6f0848a063afed782e831959b0241a1",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "thinking-output-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pricing / output_tokens remains inclusive",
              "excerpt": "Thinking is billed as output. Inclusive output telemetry already includes reasoning, which must not be added again.",
              "normalizedClaimHash": "sha256:d360a7e8e2ec7fb4b52308a150e7a9e6c974ed2e8d24934ce9fa7c7c2b9ecfd7",
              "evidencePackageHash": "sha256:ad9ceb46c21deec14b2a750cc5a2282036d0c932c4e52867c9f67cb0f818e531",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "context",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Long context pricing",
              "excerpt": "Claude 4.6 and later use standard per-token pricing across the full 1M context window; no long-context premium for this route.",
              "normalizedClaimHash": "sha256:39acb4e7ba352be2ea8e58e1767d472181f8315021fd83360c00ad70db2b5975",
              "evidencePackageHash": "sha256:c0aeb644140234482bcb57df2e2ee430de5ba136a93673021b71c2ec0d3833d2",
              "reviewer": "Codex D3 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-opus-4-8-current-rate-d3",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260927-d3",
              "denomination": "USD",
              "claimRefs": [
                "rate",
                "thinking-output-d0",
                "context"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-opus-4-8"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route",
                "endpoint"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-opus-4-8-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-opus-4-8-cache-5m-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-opus-4-8-cache-5m-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-opus-4-8-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-opus-4-8-cache-1h-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-opus-4-8-cache-1h-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-api-opus-5-5": {
      "id": "anthropic-api-opus-5-5",
      "role": "plan",
      "name": "Anthropic API: Claude Opus 5.5",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-opus-5-5-current-20260927-d3",
          "validity": {
            "start": "2026-09-27T20:39:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T20:39:00Z",
            "reviewedAt": "2026-09-27T20:39:00Z",
            "catalogActivatedAt": "2026-09-27T20:39:00Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs; Availability",
              "excerpt": "claude-opus-5-5 is an active Claude API model at review. Current-market admission only; no historical effective-date claim.",
              "normalizedClaimHash": "sha256:e5ece12faa90d96ea4bfb1a27d2fd4b90ad7251616272fda6a865b15e45b3600",
              "evidencePackageHash": "sha256:2e68c622e9b6f6e6f4402430c189d8f76757fe83fda8e1bfed7c995f032af851",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs / Claude API",
              "excerpt": "Exact Claude API identifier claude-opus-5-5; standard direct global API execution; paid API credentials required.",
              "normalizedClaimHash": "sha256:e7ea5c79f27b3417d95fd2c99e479ea12d765b7765bd180e861fcc7c567e85d2",
              "evidencePackageHash": "sha256:444951a1abbc88ed664b2db12ff80c7c8c83158921776386e06ad8e539c97191",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "endpoint",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/api/messages/create",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Create a Message: HTTP method and path",
              "excerpt": "POST https://api.anthropic.com/v1/messages uses the Anthropic Messages protocol.",
              "normalizedClaimHash": "sha256:ac3ae5db5714a0140297b674a2b4c7a23256fa31fe77f83c93038b6bf79361cc",
              "evidencePackageHash": "sha256:60f5da92587ddcecb70ea513a86764ecbebf26afdd15b770f0c78cab69d456cd",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing",
              "excerpt": "USD per million: input 4, output 20, cache read 0.2; cache writes require an explicit duration.",
              "normalizedClaimHash": "sha256:228a374038bebe46c1e46499d200e8e66e72cd076f8e54306c9b8ac8e71ebbe5",
              "evidencePackageHash": "sha256:6010ebdb80a7f6443956adf22e96e6028d6d05513586d1d1d74494567f857315",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing / 5m cache write and 1h cache write",
              "excerpt": "USD per million cache write: five minutes 5; one hour 8. Imported duration is not observed.",
              "normalizedClaimHash": "sha256:f2611abcc207cf806f9202ee75c9a7fc2f6d02e187bf29535c7ecab6ab2e6743",
              "evidencePackageHash": "sha256:a1d26d6b85e4f7aa76092aab93f9d49308d556ccb96d629ce6bce26fddd6a110",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "thinking-output-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pricing / output_tokens remains inclusive",
              "excerpt": "Thinking is billed as output. Inclusive output telemetry already includes reasoning, which must not be added again.",
              "normalizedClaimHash": "sha256:df822a69fd06745cd7fbeabe932ad8bbb19888093101cfb658bd9eed4bf22eba",
              "evidencePackageHash": "sha256:8eacf5b9a142d7606eeeb654dea6cfe965b08676f82544d4b40dba4690e5189f",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "context",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Long context pricing",
              "excerpt": "Claude 4.6 and later use standard per-token pricing across the full 1M context window; no long-context premium for this route.",
              "normalizedClaimHash": "sha256:dc9998b9d4a7901bb93ac5a6420113dd7d12e028973964f03f5b8c49ad9bfba3",
              "evidencePackageHash": "sha256:904d9fa22fd78fb75bbe6e862977ff6abb86670b3f579e59f9890b921faf9da6",
              "reviewer": "Codex D3 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-opus-5-5-current-rate-d3",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260927-d3",
              "denomination": "USD",
              "claimRefs": [
                "rate",
                "thinking-output-d0",
                "context"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-opus-5-5"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route",
                "endpoint"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-opus-5-5-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-opus-5-5-cache-5m-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-opus-5-5-cache-5m-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-opus-5-5-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-opus-5-5-cache-1h-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-opus-5-5-cache-1h-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-api-opus-5": {
      "id": "anthropic-api-opus-5",
      "role": "plan",
      "name": "Anthropic API: Claude Opus 5",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-opus-5-current-20260927-d3",
          "validity": {
            "start": "2026-09-27T20:39:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T20:39:00Z",
            "reviewedAt": "2026-09-27T20:39:00Z",
            "catalogActivatedAt": "2026-09-27T20:39:00Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs; Availability",
              "excerpt": "claude-opus-5 is an active Claude API model at review. Current-market admission only; no historical effective-date claim.",
              "normalizedClaimHash": "sha256:00a0f423d579ddadd7d96028d427d50399ad8d641567afdec955b8931a988136",
              "evidencePackageHash": "sha256:32f2c1ce7c197417667be3a479baee2ee92d5612e62ae365b311cf39a7b394b8",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs / Claude API",
              "excerpt": "Exact Claude API identifier claude-opus-5; standard direct global API execution; paid API credentials required.",
              "normalizedClaimHash": "sha256:b307c6cadc1a9ab996cff5894434861a1d58417ceb5a20dfbd5cad53a667f0c4",
              "evidencePackageHash": "sha256:913b9f3bea33dfe85469577a634ee3f8167b0028dfc62880f5168bdb0e141057",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "endpoint",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/api/messages/create",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Create a Message: HTTP method and path",
              "excerpt": "POST https://api.anthropic.com/v1/messages uses the Anthropic Messages protocol.",
              "normalizedClaimHash": "sha256:854979d0253748e48219f67e347afe173be09d6e64c26f1a65bf6bbe9cc82e68",
              "evidencePackageHash": "sha256:29c27092f142a88614b42676d43fd8945ed124c66bccb9531fae99c45f061635",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing",
              "excerpt": "USD per million: input 5, output 25, cache read 0.5; cache writes require an explicit duration.",
              "normalizedClaimHash": "sha256:6d45178faa3686e2c5fe3309becc3cdb277abcdad6dafac199e8998cc3cd04d9",
              "evidencePackageHash": "sha256:2855384de878fdd8d694bcfb1d6402cb0b2959552d456466b575a75e46065cd5",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/opus-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Pricing / 5m cache write and 1h cache write",
              "excerpt": "USD per million cache write: five minutes 6.25; one hour 10. Imported duration is not observed.",
              "normalizedClaimHash": "sha256:a1bf8e567410bfb9c1a470dfb013eed05527949e578a673fb0da5b44cef030b7",
              "evidencePackageHash": "sha256:e2fa2b4d5384bdf9b14e1517139b2a3768e9591b17f87205b41b0a3ca69d22cf",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "thinking-output-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pricing / output_tokens remains inclusive",
              "excerpt": "Thinking is billed as output. Inclusive output telemetry already includes reasoning, which must not be added again.",
              "normalizedClaimHash": "sha256:c79f80ce8f7600fba2cffe3141c83baafb6c2c74b1184e6acb38b55557e08e8e",
              "evidencePackageHash": "sha256:7b044efe5fdd1a240b5d04c55277cb71a58bc5f34a3e5c6cdae18bd68ecf74e1",
              "reviewer": "Codex D3 manual first-party review"
            },
            {
              "id": "context",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T20:39:00Z",
              "reviewedAt": "2026-09-27T20:39:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Long context pricing",
              "excerpt": "Claude 4.6 and later use standard per-token pricing across the full 1M context window; no long-context premium for this route.",
              "normalizedClaimHash": "sha256:5a49c073266034ee5bb76f5e5cfe618dac613b5a6fcea46da2fbd8c6baebf3ba",
              "evidencePackageHash": "sha256:2e1b5b463d5068ecb045ec1b1d77dfa2b77632e4ce149a46fad1c5ea3fdc9ab7",
              "reviewer": "Codex D3 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-opus-5-current-rate-d3",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260927-d3",
              "denomination": "USD",
              "claimRefs": [
                "rate",
                "thinking-output-d0",
                "context"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-opus-5"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route",
                "endpoint"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-opus-5-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-opus-5-cache-5m-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-opus-5-cache-5m-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-27T20:39:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-opus-5-current-20260927-d3"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-opus-5-cache-1h-d3",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-opus-5-cache-1h-d3",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-api-sonnet-5-5": {
      "id": "anthropic-api-sonnet-5-5",
      "role": "plan",
      "name": "Anthropic API: Claude Sonnet 5.5",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-sonnet-5-5-current-20260928-sonnet55",
          "validity": {
            "start": "2026-09-28T19:51:32Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-28T19:51:32Z",
            "reviewedAt": "2026-09-28T19:51:32Z",
            "catalogActivatedAt": "2026-09-28T19:51:32Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/sonnet-5-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-28T19:51:32Z",
              "reviewedAt": "2026-09-28T19:51:32Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs; Availability",
              "excerpt": "claude-sonnet-5-5 is an active Claude API model at review. Current-market admission only; no historical effective-date claim.",
              "normalizedClaimHash": "sha256:c414fff3722d09b33da7fdbe2b429527412f962cc07b20390684171e3f647de2",
              "evidencePackageHash": "sha256:538ba2c2524fcb0b8eb14337de1e6bfa33ec3d76222da8ace23db9140c9953d4",
              "reviewer": "Codex manual first-party Sonnet 5.5 pricing review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/sonnet-5-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-28T19:51:32Z",
              "reviewedAt": "2026-09-28T19:51:32Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Specifications: Model IDs / Claude API",
              "excerpt": "Exact Claude API identifier claude-sonnet-5-5; standard direct global API execution; paid API credentials required.",
              "normalizedClaimHash": "sha256:f70365b79939e4cbd80a67287cb9b5d3818b8efb66e437d6af83b911cfb010b5",
              "evidencePackageHash": "sha256:7f989ed3170756aff6350dd7c97e6dc26ea51b53d506a849ee87a8175470bb86",
              "reviewer": "Codex manual first-party Sonnet 5.5 pricing review"
            },
            {
              "id": "endpoint",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/api/messages/create",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-28T19:51:32Z",
              "reviewedAt": "2026-09-28T19:51:32Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Create a Message: HTTP method and path",
              "excerpt": "POST https://api.anthropic.com/v1/messages uses the Anthropic Messages protocol.",
              "normalizedClaimHash": "sha256:de0f225f79406bad42dbf73dd1ba84d0acf4f1d52dc225c694b9cad56926bdce",
              "evidencePackageHash": "sha256:05ed482d773ae78e0192f6cbbbd7ac7d993ec241f4db98b69cabd29aa5571d7a",
              "reviewer": "Codex manual first-party Sonnet 5.5 pricing review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-28T19:51:32Z",
              "reviewedAt": "2026-09-28T19:51:32Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Model pricing / Claude Sonnet 5.5",
              "excerpt": "USD per million tokens: input 2, output 10, cache read 0.2. Cache-write prices depend on duration.",
              "normalizedClaimHash": "sha256:a3efc5fcbddde737cc53583ad23e7b96a6b3f31b797418e20b765abccf3a9d61",
              "evidencePackageHash": "sha256:533c21d3706dbc0cba88f27804ef9ab29066e38d21fd06b7344b1f5e5cc793f0",
              "reviewer": "Codex manual first-party Sonnet 5.5 pricing review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-28T19:51:32Z",
              "reviewedAt": "2026-09-28T19:51:32Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Model pricing / Claude Sonnet 5.5 / 5m writes and 1h writes",
              "excerpt": "Sonnet 5.5 cache writes cost USD 2.5 per million for five minutes or USD 4 per million for one hour. Imported duration is not assumed.",
              "normalizedClaimHash": "sha256:ac5118075763aca853c939f7932cd7af90be5b43a88d546e4a6ad3ace9ffcb29",
              "evidencePackageHash": "sha256:a6c0ff0dfc4dfb1ba2b15ef065a8b3ebfe71fc6fcc2d538c89179c83d6f8b174",
              "reviewer": "Codex manual first-party Sonnet 5.5 pricing review"
            },
            {
              "id": "thinking-output-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-28T19:51:32Z",
              "reviewedAt": "2026-09-28T19:51:32Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pricing / output_tokens remains inclusive",
              "excerpt": "Thinking is billed as output. Inclusive output telemetry already includes reasoning, which must not be added again.",
              "normalizedClaimHash": "sha256:842c039047f7fa6881f157e5e39be9b17d669d3050e7a95cdeb3b4425a32c497",
              "evidencePackageHash": "sha256:f7739214c0968a93d7f65fe8d8ce90e57ef985ba5b87f5d8c9f19684e62ac4f9",
              "reviewer": "Codex manual first-party Sonnet 5.5 pricing review"
            },
            {
              "id": "context",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-28T19:51:32Z",
              "reviewedAt": "2026-09-28T19:51:32Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Long context pricing",
              "excerpt": "Claude 4.6 and later use standard per-token pricing across the full 1M context window; no long-context premium for this route.",
              "normalizedClaimHash": "sha256:2c0362d16eac1dbc98a5b0ba90cf285c88446a2f2fa84f8b589563d751f5598e",
              "evidencePackageHash": "sha256:f92b6547b70799c772e89ed658dcb44922303366d92116a3527526cde8950e7a",
              "reviewer": "Codex manual first-party Sonnet 5.5 pricing review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-sonnet-5-5-current-rate-sonnet55",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260928-sonnet55",
              "denomination": "USD",
              "claimRefs": [
                "rate",
                "thinking-output-d0",
                "context"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-sonnet-5-5"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route",
                "endpoint"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-28T19:51:32Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-sonnet-5-5-current-20260928-sonnet55"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-sonnet-5-5-cache-5m-sonnet55",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-sonnet-5-5-cache-5m-sonnet55",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-28T19:51:32Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-sonnet-5-5-current-20260928-sonnet55"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-sonnet-5-5-cache-1h-sonnet55",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-sonnet-5-5-cache-1h-sonnet55",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-api-sonnet-5": {
      "id": "anthropic-api-sonnet-5",
      "role": "plan",
      "name": "Anthropic API: Claude Sonnet 5",
      "providerId": "anthropic",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-api-sonnet-5-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "anthropic-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/sonnet-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current model listing",
              "excerpt": "Anthropic API: Claude Sonnet 5 current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:8b8d053abbce04740ef770ff20474cfd90360c6000879842e121480667638b7b",
              "evidencePackageHash": "sha256:044ed2f7043f01946b576f0491771b00fbc9a18176c2979a4e2078e2a4eda65d",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/models/sonnet-5/overview",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "API model and endpoint",
              "excerpt": "Exact claude-sonnet-5 served through anthropic-messages-global using anthropic-messages; separate paid API credentials required.",
              "normalizedClaimHash": "sha256:b537c273eb1364304034f1b4ecfd4e423ea378c5be3e9a985524133fe5e98a13",
              "evidencePackageHash": "sha256:ec8560c62d8f6f728ee41dc65810b1f430cf1c21ea37c71973ad8774e4d668ff",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "rate",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Standard text pricing",
              "excerpt": "USD per 1M token categories {\"cacheRead\": \"0.20\", \"input\": \"2\", \"output\": \"10\"}; any separate categories or modes remain outside this route.",
              "normalizedClaimHash": "sha256:b8a7721c939e75663ed36fa99bfb0d939dc0a333b9ec398fdc5ea317d8da69e5",
              "evidencePackageHash": "sha256:0805cdb05e5cc19380a81219a3003877caf7cbd14565fb38172b4945df26d7db",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "cache-duration-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:20:00Z",
              "reviewedAt": "2026-09-27T18:20:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Cache writes: five minutes at 1.25 times input; one hour at 2 times input. Imported undifferentiated writes do not establish which duration applied.",
              "normalizedClaimHash": "sha256:dfb53162630812395c274d842d8fca05eab8e36a9fd89603fe0fae588aa23b6d",
              "evidencePackageHash": "sha256:e6e68c2287486a2ca9befa78359ba5a5e40ee118eda45a602a49c4d4d55f9ec5",
              "reviewer": "Codex D0 manual first-party review"
            },
            {
              "id": "thinking-output-d0",
              "sourceId": "platform.claude.com",
              "sourceUrl": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:30:00Z",
              "reviewedAt": "2026-09-27T18:30:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Thinking tokens are billed at output token rates; normalized inclusive output accounting remains authoritative.",
              "excerpt": "Thinking tokens are billed at output token rates; normalized inclusive output accounting remains authoritative.",
              "normalizedClaimHash": "sha256:783abc998e4d96262f18efb3024d8335631509df22ce84f7381d04fbeaabb2eb",
              "evidencePackageHash": "sha256:aa181a71ff7beee238e6bfef9034bf5b76c7e8e2b29869d029d11d14aa97121b",
              "reviewer": "Codex D0 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "anthropic-api-sonnet-5-current-rate",
              "basis": "api_list_price",
              "endpointId": "anthropic-messages-global",
              "rateVersion": "current-20260927",
              "denomination": "USD",
              "claimRefs": [
                "rate"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "anthropic-messages-global",
              "protocol": "anthropic-messages",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-sonnet-5"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "cache-write-5m-d0",
          "validFrom": "2026-09-27T18:30:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-sonnet-5-current-20260927"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-sonnet-5-cache-5m-d0",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-sonnet-5-cache-5m-d0",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        },
        {
          "id": "cache-write-1h-d0",
          "validFrom": "2026-09-27T18:30:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "anthropic-api-sonnet-5-current-20260927"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "cache-duration-d0",
            "thinking-output-d0"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "anthropic-api-sonnet-5-cache-1h-d0",
              "claimRefs": [
                "cache-duration-d0"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "anthropic-api-sonnet-5-cache-1h-d0",
              "claimRefs": [
                "thinking-output-d0"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-claude-max-20x": {
      "id": "anthropic-claude-max-20x",
      "role": "plan",
      "name": "Claude Max 20x",
      "providerId": "anthropic",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "200",
            "interval": "month"
          },
          "billingMechanics": "Official pricing: 'Max 20x : $200 per month'.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "per-session-usage-allowance-multiple-of-pro",
              "label": "Per-session usage allowance (multiple of Pro)",
              "statement": "Max 20x includes 20 times the Pro plan's per-session usage allowance. This tier is ideal for daily users who collaborate often with Claude for most tasks.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "session-usage-limit-reset",
              "label": "Session usage limit reset",
              "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "weekly-usage-limit-across-all-models",
              "label": "Weekly usage limit across all models",
              "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "fable-model-share-of-weekly-usage-limits",
              "label": "Fable model share of weekly usage limits",
              "statement": "You can use up to 50% of your weekly usage limits on Fable models at no extra cost.",
              "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
            },
            {
              "id": "discretionary-weekly-monthly-caps-and-model-or-f",
              "label": "Discretionary weekly/monthly caps and model or feature usage limits",
              "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "usage-credits-opt-in-pay-as-you-go-overage",
              "label": "Usage credits (opt-in pay-as-you-go overage)",
              "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "topic": "after_limit"
            },
            {
              "id": "usage-credit-daily-redemption-limit",
              "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
              "statement": "There is a daily redemption limit of $2000.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
              "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
              "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Same as Max 5x: no absolute numeric allowance published; only the 20x multiple relative to Pro, whose own allowance is unquantified.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://claude.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable",
              "excluded": true
            },
            {
              "model": "claude-haiku"
            },
            {
              "model": "claude-opus"
            },
            {
              "model": "claude-sonnet"
            }
          ],
          "sources": [
            {
              "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "200",
            "interval": "month"
          },
          "billingMechanics": "Official pricing: 'Max 20x : $200 per month'.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "20× Pro’s per-session allowance, with five-hour and weekly limits. Claude Code included.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "per-session-usage-allowance-multiple-of-pro",
              "label": "Per-session usage allowance (multiple of Pro)",
              "statement": "Max 20x includes 20 times the Pro plan's per-session usage allowance. This tier is ideal for daily users who collaborate often with Claude for most tasks.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "session-usage-limit-reset",
              "label": "Session usage limit reset",
              "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "weekly-usage-limit-across-all-models",
              "label": "Weekly usage limit across all models",
              "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "fable-model-share-of-weekly-usage-limits",
              "label": "Fable model share of weekly usage limits",
              "statement": "You can use up to 50% of your weekly usage limits on Fable models at no extra cost.",
              "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
            },
            {
              "id": "discretionary-weekly-monthly-caps-and-model-or-f",
              "label": "Discretionary weekly/monthly caps and model or feature usage limits",
              "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "usage-credits-opt-in-pay-as-you-go-overage",
              "label": "Usage credits (opt-in pay-as-you-go overage)",
              "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "topic": "after_limit"
            },
            {
              "id": "usage-credit-daily-redemption-limit",
              "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
              "statement": "There is a daily redemption limit of $2000.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
              "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
              "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Same as Max 5x: no absolute numeric allowance published; only the 20x multiple relative to Pro, whose own allowance is unquantified.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://claude.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-pricing"
            },
            {
              "model": "claude-fable-5"
            },
            {
              "model": "claude-fable-5-1"
            },
            {
              "model": "claude-haiku-4-5"
            },
            {
              "model": "claude-opus-4-7"
            },
            {
              "model": "claude-opus-4-8"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6"
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "claude-fable",
              "excluded": true
            },
            {
              "model": "claude-haiku"
            },
            {
              "model": "claude-opus"
            },
            {
              "model": "claude-sonnet"
            }
          ],
          "sources": [
            {
              "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://claude.com/blog/what-a-task-costs-on-opus-5-5",
              "title": "Anthropic Opus 5.5 availability on Pro and Max",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/11940350-claude-code-model-configuration",
              "title": "Anthropic Claude Code supported model IDs",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-claude-max-20x-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "claude-max",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "200",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "Claude Max 20x current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:ce3605c0e2b85748a82f407f93502dd1642de3a3e8e5f210224c25b68a318864",
              "evidencePackageHash": "sha256:74a678adbdcadc1357629084feb8d99e528e86600adf52610f4149d49168e254",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "Claude Max 20x web individual subscription is USD 200 per month.",
              "normalizedClaimHash": "sha256:3609fbc1188f5bca65e713f2f21a475d1396549a6488d27f15681f2f9c33226f",
              "evidencePackageHash": "sha256:197654340ae10da9c23251b0d5f20b30c2058f518504e4781f8ce133c07dd0e1",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active Claude Max 20x includes claude-code-subscription access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:02e569a824de45bed7bbb8ec014d50380efdb653081b5b40768d1d203eae9a50",
              "evidencePackageHash": "sha256:7aaf6f40441c295450835241561d10986e31fef06c40558904cd52f3d7d82fd6",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11940350-claude-code-model-configuration",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for claude-code-subscription: claude-haiku-4-5, claude-sonnet-5.",
              "normalizedClaimHash": "sha256:2eb766f30b5a69d67cda11ed10e052b372da23690320367b57786407e0f3a9e9",
              "evidencePackageHash": "sha256:36f4a63534ce7233af15748a048531f79b3fdd730253242b3c92b3d092150112",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_relative_limit",
              "locator": "Usage or capacity mechanics",
              "excerpt": "Twenty times Pro session usage is relative; weekly and discretionary limits lack deterministic values.",
              "normalizedClaimHash": "sha256:0ba0cdab13e25bed7832cba93104c6bd7d35253420f2ff640a65ea26559ca94f",
              "evidencePackageHash": "sha256:4ba5d29b424c9834b9c5628e681e7feb26c910d5b0b9265cd64b9d3b09a3f971",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for Claude Max 20x depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:177dcda2601d522771059a25f56c8aeece46659d56bd92f89fade2c8fb27f5e7",
              "evidencePackageHash": "sha256:0d5c58c4a1acb8b4bccbdfec88e3ba4e25085bbdf143d0e35be414d4ea511ba4",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-anthropic-claude-max-20x-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "claude-code-subscription",
              "protocol": "claude-code-login",
              "harnessIds": [
                "claude-code"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-haiku-4-5",
                  "claude-sonnet-5"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "relative-session-and-weekly-capacity",
              "claimRefs": [
                "capacity"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-claude-max-5x": {
      "id": "anthropic-claude-max-5x",
      "role": "plan",
      "name": "Claude Max 5x",
      "providerId": "anthropic",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "Official pricing: 'Max 5x : $100 per month'.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "per-session-usage-allowance-multiple-of-pro",
              "label": "Per-session usage allowance (multiple of Pro)",
              "statement": "Max 5x includes five times the Pro plan's per-session usage allowance. This tier is ideal for frequent users who work with Claude on a variety of tasks. Max 20x includes 20 times the Pro plan's per-session usage allowance.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "session-usage-limit-reset",
              "label": "Session usage limit reset",
              "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "weekly-usage-limit-across-all-models",
              "label": "Weekly usage limit across all models",
              "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "fable-model-share-of-weekly-usage-limits",
              "label": "Fable model share of weekly usage limits",
              "statement": "Max plans, premium seats on Team plans, and premium seats on seat-based Enterprise plans: Fable 5 and Fable 5.1 are included as a standard part of your plan. You can use up to 50% of your weekly usage limits on Fable models at no extra cost. They draw from your plan's regular weekly usage limits and use them faster than other Claude models. When you reach your Fable limit, you can keep using Fable models with usage credits, or switch to another model to stay within your plan's usage limits.",
              "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
            },
            {
              "id": "discretionary-weekly-monthly-caps-and-model-or-f",
              "label": "Discretionary weekly/monthly caps and model or feature usage limits",
              "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "usage-credits-opt-in-pay-as-you-go-overage",
              "label": "Usage credits (opt-in pay-as-you-go overage)",
              "statement": "Max plan users - If you're on the Max 5x plan, consider upgrading to the Max 20x plan if you consistently hit limits. - Enable usage credits to continue using Claude with your Max plan after hitting the included usage limit.",
              "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "topic": "after_limit"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
              "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
              "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
            },
            {
              "id": "usage-credit-daily-redemption-limit",
              "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
              "statement": "There is a daily redemption limit of $2000.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "No numeric session or weekly allowance is published; usage is expressed only as a multiple of Pro ('five times the Pro plan's per-session usage allowance') and Pro's own allowance is unquantified.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://claude.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable",
              "excluded": true
            },
            {
              "model": "claude-haiku"
            },
            {
              "model": "claude-opus"
            },
            {
              "model": "claude-sonnet"
            }
          ],
          "sources": [
            {
              "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "Official pricing: 'Max 5x : $100 per month'.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "5× Pro’s per-session allowance, with five-hour and weekly limits. Claude Code included.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "per-session-usage-allowance-multiple-of-pro",
              "label": "Per-session usage allowance (multiple of Pro)",
              "statement": "Max 5x includes five times the Pro plan's per-session usage allowance. This tier is ideal for frequent users who work with Claude on a variety of tasks. Max 20x includes 20 times the Pro plan's per-session usage allowance.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "session-usage-limit-reset",
              "label": "Session usage limit reset",
              "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "weekly-usage-limit-across-all-models",
              "label": "Weekly usage limit across all models",
              "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "fable-model-share-of-weekly-usage-limits",
              "label": "Fable model share of weekly usage limits",
              "statement": "Max plans, premium seats on Team plans, and premium seats on seat-based Enterprise plans: Fable 5 and Fable 5.1 are included as a standard part of your plan. You can use up to 50% of your weekly usage limits on Fable models at no extra cost. They draw from your plan's regular weekly usage limits and use them faster than other Claude models. When you reach your Fable limit, you can keep using Fable models with usage credits, or switch to another model to stay within your plan's usage limits.",
              "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
            },
            {
              "id": "discretionary-weekly-monthly-caps-and-model-or-f",
              "label": "Discretionary weekly/monthly caps and model or feature usage limits",
              "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "usage-credits-opt-in-pay-as-you-go-overage",
              "label": "Usage credits (opt-in pay-as-you-go overage)",
              "statement": "Max plan users - If you're on the Max 5x plan, consider upgrading to the Max 20x plan if you consistently hit limits. - Enable usage credits to continue using Claude with your Max plan after hitting the included usage limit.",
              "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "topic": "after_limit"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
              "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
              "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
            },
            {
              "id": "usage-credit-daily-redemption-limit",
              "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
              "statement": "There is a daily redemption limit of $2000.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "No numeric session or weekly allowance is published; usage is expressed only as a multiple of Pro ('five times the Pro plan's per-session usage allowance') and Pro's own allowance is unquantified.",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://claude.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-pricing"
            },
            {
              "model": "claude-fable-5"
            },
            {
              "model": "claude-fable-5-1"
            },
            {
              "model": "claude-haiku-4-5"
            },
            {
              "model": "claude-opus-4-7"
            },
            {
              "model": "claude-opus-4-8"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6"
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "claude-fable",
              "excluded": true
            },
            {
              "model": "claude-haiku"
            },
            {
              "model": "claude-opus"
            },
            {
              "model": "claude-sonnet"
            }
          ],
          "sources": [
            {
              "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://claude.com/blog/what-a-task-costs-on-opus-5-5",
              "title": "Anthropic Opus 5.5 availability on Pro and Max",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/11940350-claude-code-model-configuration",
              "title": "Anthropic Claude Code supported model IDs",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-claude-max-5x-current-20260927",
          "validity": {
            "start": "2026-09-27T14:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T14:38:00Z",
            "reviewedAt": "2026-09-27T14:38:00Z",
            "catalogActivatedAt": "2026-09-27T14:38:00Z"
          },
          "productId": "claude-max",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "100",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Max pricing and usage",
              "excerpt": "Max 5x is current at review; no provider effective date for this rule was established.",
              "normalizedClaimHash": "sha256:fb103f11639da8136806f5feea47ab6b5555ed625ed2706613002ec510dabc52",
              "evidencePackageHash": "sha256:483808eeb1e1ffada91b6552444e38e0dc4a1d3f181292b25276dd8d742c63b7",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pricing tiers and billing",
              "excerpt": "Max 5x web subscription is USD 100 per month; mobile pricing may differ.",
              "normalizedClaimHash": "sha256:b51ff9be3486393dee73439d9b2b678e2f57743c567d41a542cdc6ee11ba00b4",
              "evidencePackageHash": "sha256:3a6b0e2c59343eeffbf663cd40bf6db1fd8ccdb857fb94c0955b3b1bbf5e8bfc",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pro and Max Claude Code access",
              "excerpt": "Active Max subscribers can use Claude Code with subscription credentials, separately from API-key billing.",
              "normalizedClaimHash": "sha256:337049b441e198f100127b5757a70bd0bf747ec4f8cff925c0a6ff8e7518724d",
              "evidencePackageHash": "sha256:0ef042f090998055c48300b1fc7f98bf3651cbf8aa7364776f55227d23725e4a",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11940350-claude-code-model-configuration",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported models",
              "excerpt": "Claude Code lists exact Sonnet 5 and Haiku 4.5 model IDs.",
              "normalizedClaimHash": "sha256:ac8a3946f283e729660eb9968fbaa206e9f033dfc3d3d944a390444503f807a1",
              "evidencePackageHash": "sha256:dd16a095b466aeff481800bac5f82b4295f5125ffb9bffcafb5185dbce2853bc",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_relative_limit",
              "locator": "Usage limits",
              "excerpt": "Max 5x has five times Pro per-session usage, five-hour session resets, account-assigned weekly limits and discretionary limits.",
              "normalizedClaimHash": "sha256:744122e4fbd4ab7d3e768cff04a06633cead45bf5b59072c37510a9837b55c17",
              "evidencePackageHash": "sha256:35a93868893ede243b81321e7d9ac48ccc86d5979a199e5bc424ef39d75746d5",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "provider_dynamic",
              "locator": "After limits",
              "excerpt": "Usage credits are optional after the included limit; API credits are separate from subscription usage.",
              "normalizedClaimHash": "sha256:3d6289eb8a82a681ed33f18b1c2a9ba42891ae36f8c65bd7aa5da19744465719",
              "evidencePackageHash": "sha256:a9d67db0e40047eba803a7e3d93535ad85b9c0a90c216949f4a982f802db3aba",
              "reviewer": "Codex C2A manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-max-web",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-max-web-subscription",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "claude-code-included",
              "endpointId": "claude-code-subscription",
              "protocol": "claude-code-login",
              "harnessIds": [
                "claude-code"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-haiku-4-5",
                  "claude-sonnet-5"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "relative-session-and-weekly-limits",
              "claimRefs": [
                "capacity"
              ]
            }
          ]
        }
      ]
    },
    "anthropic-claude-pro": {
      "id": "anthropic-claude-pro",
      "role": "plan",
      "name": "Claude Pro",
      "providerId": "anthropic",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "Claude Pro costs $20 per month. Annual billing is available at $200 upfront.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "5-hour-session-usage-limit-rolling",
              "label": "5-hour session usage limit (rolling)",
              "statement": "Your session-based usage limit will reset every five hours.",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
            },
            {
              "id": "weekly-usage-limit-across-all-models",
              "label": "Weekly usage limit across all models",
              "statement": "Pro plans also have a weekly usage limit that applies across all models. Weekly limits reset at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle. You can see your next reset time in Settings > Usage .",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
            },
            {
              "id": "pro-usage-relative-to-free-per-5-hour-session",
              "label": "Pro usage relative to Free (per 5-hour session)",
              "statement": "Free covers everyday questions. Pro gives you at least 5x more usage per 5-hour session than Free. Max gives you 5x or 20x more usage per 5-hour session than Pro.",
              "sourceUrl": "https://claude.com/pricing"
            },
            {
              "id": "discretionary-weekly-monthly-caps-and-model-or-f",
              "label": "Discretionary weekly/monthly caps and model or feature usage limits",
              "statement": "To manage capacity and make sure all users have fair access, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion. When you reach a limit, you can wait for it to reset, move to a higher plan, or, on paid plans, turn on usage credits to keep working at standard API rates. You can see where you stand anytime in Settings > Usage .",
              "sourceUrl": "https://claude.com/pricing"
            },
            {
              "id": "usage-credits-opt-in-pay-as-you-go-overage",
              "label": "Usage credits (opt-in pay-as-you-go overage)",
              "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits. Instead of being blocked when you hit your session limits, you can switch to consumption-based pricing at standard API rates and continue your work without interruption.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "topic": "after_limit"
            },
            {
              "id": "usage-credit-daily-redemption-limit",
              "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
              "statement": "There is a daily redemption limit of $2000.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
              "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
              "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Anthropic does not publish numeric session/weekly allowances for Pro; only relative multiples ('at least 5x more usage per 5-hour session than Free') and the 5-hour/weekly window structure. Limits are measured as compute-weighted 'usage', not literal request counts ('there's no fixed message count').",
              "sourceUrl": "https://claude.com/pricing"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://claude.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable",
              "excluded": true
            },
            {
              "model": "claude-haiku"
            },
            {
              "model": "claude-opus"
            },
            {
              "model": "claude-sonnet"
            }
          ],
          "sources": [
            {
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "Claude Pro costs $20 per month. Annual billing is available at $200 upfront.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "Claude and Claude Code access with five-hour and weekly usage limits. Optional paid usage credits after included usage.",
              "sourceUrl": "https://claude.com/pricing"
            },
            {
              "id": "5-hour-session-usage-limit-rolling",
              "label": "5-hour session usage limit (rolling)",
              "statement": "Your session-based usage limit will reset every five hours.",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
            },
            {
              "id": "weekly-usage-limit-across-all-models",
              "label": "Weekly usage limit across all models",
              "statement": "Pro plans also have a weekly usage limit that applies across all models. Weekly limits reset at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle. You can see your next reset time in Settings > Usage .",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
            },
            {
              "id": "pro-usage-relative-to-free-per-5-hour-session",
              "label": "Pro usage relative to Free (per 5-hour session)",
              "statement": "Free covers everyday questions. Pro gives you at least 5x more usage per 5-hour session than Free. Max gives you 5x or 20x more usage per 5-hour session than Pro.",
              "sourceUrl": "https://claude.com/pricing"
            },
            {
              "id": "discretionary-weekly-monthly-caps-and-model-or-f",
              "label": "Discretionary weekly/monthly caps and model or feature usage limits",
              "statement": "To manage capacity and make sure all users have fair access, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion. When you reach a limit, you can wait for it to reset, move to a higher plan, or, on paid plans, turn on usage credits to keep working at standard API rates. You can see where you stand anytime in Settings > Usage .",
              "sourceUrl": "https://claude.com/pricing"
            },
            {
              "id": "usage-credits-opt-in-pay-as-you-go-overage",
              "label": "Usage credits (opt-in pay-as-you-go overage)",
              "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits. Instead of being blocked when you hit your session limits, you can switch to consumption-based pricing at standard API rates and continue your work without interruption.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "topic": "after_limit"
            },
            {
              "id": "usage-credit-daily-redemption-limit",
              "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
              "statement": "There is a daily redemption limit of $2000.",
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
              "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
              "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Anthropic does not publish numeric session/weekly allowances for Pro; only relative multiples ('at least 5x more usage per 5-hour session than Free') and the 5-hour/weekly window structure. Limits are measured as compute-weighted 'usage', not literal request counts ('there's no fixed message count').",
              "sourceUrl": "https://claude.com/pricing"
            },
            {
              "id": "fable-models-usage-credits-only",
              "label": "Fable models: usage credits only",
              "statement": "Fable 5 and Fable 5.1 aren't included in your plan's usage limits. You can use them with usage credits, which let you pay for usage beyond what your plan includes.",
              "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://claude.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-pricing"
            },
            {
              "model": "claude-haiku-4-5"
            },
            {
              "model": "claude-opus-4-7"
            },
            {
              "model": "claude-opus-4-8"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6"
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "claude-fable-5",
              "excluded": true,
              "access": "usage_credits"
            },
            {
              "model": "claude-fable-5-1",
              "excluded": true,
              "access": "usage_credits"
            },
            {
              "model": "claude-fable",
              "excluded": true,
              "access": "usage_credits"
            },
            {
              "model": "claude-haiku"
            },
            {
              "model": "claude-opus"
            },
            {
              "model": "claude-sonnet"
            }
          ],
          "sources": [
            {
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing: Pro lists Opus, Sonnet and Haiku, and Fable through usage credits (official)",
              "checkedAt": "2026-09-24"
            },
            {
              "url": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
              "title": "Anthropic plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://claude.com/blog/what-a-task-costs-on-opus-5-5",
              "title": "Anthropic Opus 5.5 availability on Pro and Max",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "title": "Use Claude Code with your Pro or Max plan (official)",
              "checkedAt": "2026-09-24"
            },
            {
              "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
              "title": "Claude Fable models on your plan: Pro uses usage credits (official)",
              "checkedAt": "2026-09-24"
            }
          ],
          "lastVerifiedAt": "2026-09-24",
          "verificationStatus": "verified"
        }
      ],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "anthropic-claude-pro-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "claude-pro",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "20",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "Claude Pro current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:125aec231f013036bb3f8b018609928fe32021e17c221309fd92e6288b85a8c2",
              "evidencePackageHash": "sha256:24e4d12cf9357570cb5b0d8274cf37afba1b921c85d31f16e02e7540930a312f",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "Claude Pro web individual subscription is USD 20 per month.",
              "normalizedClaimHash": "sha256:fdecf994e9a28a2ad8979644c4cbd6fdc1acea30774541c679a186846daf602d",
              "evidencePackageHash": "sha256:43c6040f62147c8e1340f2a7c3a56065e39eb7fec53e05ff1d234ada6970a32c",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active Claude Pro includes claude-code-subscription access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:fb5d9f3f659785a7f03105b318dc2ab739e363f2dd5895e8c8aded94e428a19c",
              "evidencePackageHash": "sha256:c080717438a5645ebabd74038c38c19159ac9af6ab96dd143eaab001c7c4e0ab",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/11940350-claude-code-model-configuration",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for claude-code-subscription: claude-haiku-4-5, claude-sonnet-5.",
              "normalizedClaimHash": "sha256:2eb766f30b5a69d67cda11ed10e052b372da23690320367b57786407e0f3a9e9",
              "evidencePackageHash": "sha256:36f4a63534ce7233af15748a048531f79b3fdd730253242b3c92b3d092150112",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "provider_dynamic",
              "locator": "Usage or capacity mechanics",
              "excerpt": "Five-hour and account-assigned weekly usage limits vary by model and usage; no deterministic allowance is published.",
              "normalizedClaimHash": "sha256:dd0654333d7e5e97cde342168756e5bdf614dc9dc0c36f175dbf23f20e54d18c",
              "evidencePackageHash": "sha256:1b254a8b572dff6f16049eb96d2222d891c107f1c1f083cc572b2d5ce09d11fd",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "support.claude.com",
              "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for Claude Pro depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:1a4241bff97dbed4c1788b15cd747d4cd2499235df7f1fc72169717333b8e604",
              "evidencePackageHash": "sha256:4dd3a38c69585bb9ac3fb388290d7fadaaa9fcc28a8ea7b899d125164cadd6a8",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-anthropic-claude-pro-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "claude-code-subscription",
              "protocol": "claude-code-login",
              "harnessIds": [
                "claude-code"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-haiku-4-5",
                  "claude-sonnet-5"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "dynamic-session-and-weekly-capacity",
              "claimRefs": [
                "capacity"
              ]
            }
          ]
        }
      ]
    },
    "clinepass": {
      "id": "clinepass",
      "role": "plan",
      "name": "ClinePass",
      "providerId": "cline",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "9.99",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "Selected open coding models. Five-hour, weekly and monthly usage windows; no deterministic allowance admitted.",
              "sourceUrl": "https://docs.cline.bot/getting-started/clinepass"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "Cline · OpenAI-compatible clients",
              "sourceUrl": "https://docs.cline.bot/getting-started/clinepass"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Subscription quota and pay-as-you-go Cline are separate providers.",
              "sourceUrl": "https://docs.cline.bot/getting-started/clinepass",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "glm-5-3"
            },
            {
              "model": "glm-5-3-flash"
            },
            {
              "model": "kimi-k3"
            },
            {
              "model": "deepseek-v4-1-flash"
            }
          ],
          "sources": [
            {
              "url": "https://docs.cline.bot/getting-started/clinepass",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "command-code-go": {
      "id": "command-code-go",
      "role": "plan",
      "name": "Command Code Go",
      "providerId": "command-code",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "1",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "$10 monthly credits. Five-hour and weekly limits also apply.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "Command Code",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Optional on-demand credits continue usage separately from subscription limits.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna"
            }
          ],
          "sources": [
            {
              "url": "https://commandcode.ai/docs/resources/pricing-limits",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "command-code-goat": {
      "id": "command-code-goat",
      "role": "plan",
      "name": "Command Code GOAT",
      "providerId": "command-code",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "command-code-goat-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "command-code-goat",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "10",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "commandcode.ai",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "Command Code GOAT current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:cf984cb10e7f7851e98fe255fb7066608026e446a24e4df60131e95a59058315",
              "evidencePackageHash": "sha256:e4aa74e748f68c92e198ff51332f1c50618836582335b6ab58b1ee06962ca944",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "commandcode.ai",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "Command Code GOAT web individual subscription is USD 10 per month.",
              "normalizedClaimHash": "sha256:cb30d6e23e590bff6c48b766d06bd955d7ff6bbe2f7aec2fb14cfb607918e220",
              "evidencePackageHash": "sha256:d5932348c3e799a280825a7a97cda5442126189dda4d0a1ac4829ae7e6e4a86f",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "commandcode.ai",
              "sourceUrl": "https://commandcode.ai/models/glm-5-3-flash",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active Command Code GOAT includes command-code-goat access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:25a2ac77731a1ff3aff4f5eeed506d6e8b7a070e4b4cb004898c70866ba2a023",
              "evidencePackageHash": "sha256:5182cf9e2f744324558bfde5df067d0ce74d8defb879a4ac124b86f6f605f63c",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "commandcode.ai",
              "sourceUrl": "https://commandcode.ai/docs/plans/goat",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for command-code-goat: glm-5-3-flash.",
              "normalizedClaimHash": "sha256:ed74f3a341ed206d8b9a3bf5c88b5db62c634ba9f499a3f2a35e7a6596487441",
              "evidencePackageHash": "sha256:1ac7aae290feb2e8e36f051d8763ed043859918a2c32f97ddafec9c0b3a49f27",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "commandcode.ai",
              "sourceUrl": "https://commandcode.ai/docs/resources/usage-limits",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Usage or capacity mechanics",
              "excerpt": "GOAT publishes USD 70 monthly usage value, USD 14 five-hour and USD 35 weekly slices, model-specific allowances, and first-use-anchored windows.",
              "normalizedClaimHash": "sha256:2ac4b3a5a61a31397d5bb8d822a7655a5e1df0b246480ee27f916b0e816bbe79",
              "evidencePackageHash": "sha256:214de24d3588198c35b5546655b5ccffae52327da51794fd6b3bc5269a1b3759",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "commandcode.ai",
              "sourceUrl": "https://commandcode.ai/docs/resources/usage-limits",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for Command Code GOAT depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:8984b28d7a1f5e5ada34136a8612f4ae9616496381531cd9fb42b4ac9e3869d2",
              "evidencePackageHash": "sha256:6d5e9b0c6c41467ee98a22a36b612ab4023c31c1a56bfd04bf445f7a4c7a4d27",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "allowance",
              "sourceId": "commandcode.ai",
              "sourceUrl": "https://commandcode.ai/docs/plans/goat",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "GOAT model allowance",
              "excerpt": "GLM-5.3 Flash has a USD 40 model-specific monthly allowance within GOAT; token rates are USD 0.15 input, 0.50 output, and 0.03 cache read per million.",
              "normalizedClaimHash": "sha256:638e073eb32dfc711a6dc912988ad8144c3f4df4376da4717dbff86a1c5e48bf",
              "evidencePackageHash": "sha256:d077d9c0d10f5c3ddf0bc248743c1c4fe2b391729f1260e6941fe32415b0b062",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-command-code-goat-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "command-code-goat",
              "protocol": "command-code-cli",
              "harnessIds": [
                "command-code"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "glm-5-3-flash"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "first-use-model-ceilings-and-purchased-continuation",
              "claimRefs": [
                "capacity",
                "allowance"
              ]
            }
          ]
        }
      ]
    },
    "command-code-max-10x": {
      "id": "command-code-max-10x",
      "role": "plan",
      "name": "Command Code Max 10×",
      "providerId": "command-code",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "$150 standard and $100 premium monthly usage pools. Five-hour and weekly limits also apply.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "Command Code",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Optional on-demand credits continue usage separately from subscription limits.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            }
          ],
          "sources": [
            {
              "url": "https://commandcode.ai/docs/resources/pricing-limits",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "command-code-max-20x": {
      "id": "command-code-max-20x",
      "role": "plan",
      "name": "Command Code Max 20×",
      "providerId": "command-code",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "200",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "$300 standard and $200 premium monthly usage pools. Five-hour and weekly limits also apply.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "Command Code",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Optional on-demand credits continue usage separately from subscription limits.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            }
          ],
          "sources": [
            {
              "url": "https://commandcode.ai/docs/resources/pricing-limits",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "command-code-pro": {
      "id": "command-code-pro",
      "role": "plan",
      "name": "Command Code Pro",
      "providerId": "command-code",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "Up to $80 monthly usage value; model-dependent allowances. Five-hour and weekly limits also apply.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "Command Code",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Optional on-demand credits continue usage separately from subscription limits.",
              "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            }
          ],
          "sources": [
            {
              "url": "https://commandcode.ai/docs/resources/pricing-limits",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "cursor-hobby": {
      "id": "cursor-hobby",
      "role": "plan",
      "name": "Cursor Hobby",
      "providerId": "cursor",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "0",
            "interval": "month"
          },
          "billingMechanics": "Pricing page card: 'Hobby / For the tinkerer / Free / Includes: No credit card required / Limited Agent requests / Access to Composer'.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "Free access to Composer with limited Agent requests. No published numeric allowance.",
              "sourceUrl": "https://cursor.com/help/account-and-billing/pricing"
            },
            {
              "id": "after-limit-not-published",
              "label": "After the limit",
              "statement": "The pricing page does not state a numeric Hobby allowance or an automatic paid-overage rule. Check the upgrade options in your account when a limit is reached.",
              "sourceUrl": "https://cursor.com/pricing",
              "topic": "after_limit"
            },
            {
              "id": "hobby-auto-only",
              "label": "Auto model only",
              "statement": "Hobby offers limited Agent, Chat, and Tab usage with the Auto model. Named model selection is not established for this plan, so StackReplay cannot attribute a deterministic target model.",
              "sourceUrl": "https://cursor.com/help/account-and-billing/pricing"
            },
            {
              "id": "agent-requests-on-hobby-unquantified",
              "label": "Agent requests on Hobby (unquantified)",
              "statement": "Hobby ... Free ... Includes: No credit card required / Limited Agent requests / Access to Composer",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "usage-pools-pro-pro-plus-and-ultra-hobby-is-not-",
              "label": "Usage pools (Pro, Pro Plus and Ultra; Hobby is not listed in the docs plan table)",
              "statement": "There are two separate usage pools, each resetting with your monthly billing cycle: - Cursor Models : Significantly more included usage for Grok 4.7, Grok 4.6, Grok 4.5, and Composer 2.5. - Other Models : The pool for third-party models, charged at the model's API price. Pro, Pro Plus, and Ultra include this pool, with the option to pay for additional usage as needed.",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Cursor describes limited Hobby usage but does not publish a numeric Agent allowance, reset window, or exact Auto routing. Those values remain unknown for Replay.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1",
              "excluded": true
            },
            {
              "model": "claude-opus-5",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "excluded": true
            },
            {
              "model": "composer-2-5",
              "excluded": true
            },
            {
              "model": "gemini-3-1-pro",
              "excluded": true
            },
            {
              "model": "gemini-3-8-flash",
              "excluded": true
            },
            {
              "model": "gpt-5-6-luna",
              "excluded": true
            },
            {
              "model": "gpt-5-6-sol",
              "excluded": true
            },
            {
              "model": "gpt-5-6-terra",
              "excluded": true
            },
            {
              "model": "grok-4-5",
              "excluded": true
            },
            {
              "model": "grok-4-6",
              "excluded": true
            },
            {
              "model": "grok-4-7",
              "excluded": true
            },
            {
              "model": "muse-spark-1-3",
              "excluded": true
            }
          ],
          "sources": [
            {
              "url": "https://cursor.com/help/account-and-billing/pricing",
              "title": "Cursor Hobby Auto-only model selection",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "cursor-pro-plus": {
      "id": "cursor-pro-plus",
      "role": "plan",
      "name": "Cursor Pro+",
      "providerId": "cursor",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "60",
            "interval": "month"
          },
          "billingMechanics": "Monthly $60/mo; yearly view shows $48/mo ('Save 20% with yearly billing').",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "3× Pro Agent limits, unlimited Tab, Bugbot and Cloud Agents. Optional on-demand billing.",
              "sourceUrl": "https://cursor.com/docs/models-and-pricing"
            },
            {
              "id": "grok-route-pricing-unknown",
              "label": "Grok 4.7 route pricing depends on speed and context",
              "statement": "Cursor documents standard and Fast rates plus a long-context tier. Fast is the paid-plan default, but this catalog cannot establish a specific speed route for a recorded workload, so it does not assign one token rate.",
              "sourceUrl": "https://cursor.com/docs/models/grok-4-7"
            },
            {
              "id": "agent-limits-relative-to-pro",
              "label": "Agent limits relative to Pro",
              "statement": "Everything in Pro, plus: 3x Pro limits on Agent",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "usage-pools-included",
              "label": "Usage pools included",
              "statement": "Pro Plus | $60/mo | Included | Included",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "what-happens-when-included-monthly-usage-is-exce",
              "label": "What happens when included monthly usage is exceeded",
              "statement": "When you exceed your included monthly usage, you can either: - Add on-demand usage : Continue at the same API rates with pay-as-you-go billing - Upgrade your plan : Move to a higher tier for more included usage.",
              "sourceUrl": "https://cursor.com/docs/account/pricing",
              "topic": "after_limit"
            },
            {
              "id": "tab-completions-unlimited",
              "label": "Tab completions (unlimited)",
              "statement": "Pro, Pro Plus, and Ultra include unlimited tab completions, extended agent usage limits on all models, access to Bugbot, and access to Cloud Agents.",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "The '3x Pro limits on Agent' multiple has no published absolute base; Pro's own agent limit is unquantified.",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Cursor says paid individual plans unlock all supported named models, subject to regional and organization controls.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-pricing"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-pricing"
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-pricing"
            },
            {
              "model": "composer-2-5"
            },
            {
              "model": "gemini-3-1-pro",
              "pricingRef": "gemini-3-1-pro-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "grok-4-5"
            },
            {
              "model": "grok-4-6"
            },
            {
              "model": "grok-4-7"
            },
            {
              "model": "muse-spark-1-3"
            }
          ],
          "sources": [
            {
              "url": "https://cursor.com/docs/models-and-pricing",
              "title": "Cursor paid-plan pools and current model prices",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "cursor-pro": {
      "id": "cursor-pro",
      "role": "plan",
      "name": "Cursor Pro",
      "providerId": "cursor",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "Monthly price $20/mo; yearly view shows $16/mo with the banner 'Save 20% with yearly billing' (read from the live Monthly/Yearly toggle on 2026-09-21).",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "Included Cursor-model and third-party-model usage pools, unlimited Tab, Bugbot and Cloud Agents. Optional on-demand billing.",
              "sourceUrl": "https://cursor.com/docs/models-and-pricing"
            },
            {
              "id": "grok-route-pricing-unknown",
              "label": "Grok 4.7 route pricing depends on speed and context",
              "statement": "Cursor documents standard and Fast rates plus a long-context tier. Fast is the paid-plan default, but this catalog cannot establish a specific speed route for a recorded workload, so it does not assign one token rate.",
              "sourceUrl": "https://cursor.com/docs/models/grok-4-7"
            },
            {
              "id": "cursor-models-pool-included-usage-unquantified",
              "label": "Cursor Models pool (included usage, unquantified)",
              "statement": "Cursor Models : Significantly more included usage for Grok 4.7, Grok 4.6, Grok 4.5, and Composer 2.5.",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "other-models-pool-third-party-models-at-api-pric",
              "label": "Other Models pool (third-party models at API price)",
              "statement": "Other Models : The pool for third-party models, charged at the model's API price. Pro, Pro Plus, and Ultra include this pool, with the option to pay for additional usage as needed.",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "what-happens-when-included-monthly-usage-is-exce",
              "label": "What happens when included monthly usage is exceeded",
              "statement": "When you exceed your included monthly usage, you can either: - Add on-demand usage : Continue at the same API rates with pay-as-you-go billing - Upgrade your plan : Move to a higher tier for more included usage. On-demand usage is billed monthly at the same rates. Requests are never downgraded in quality or speed.",
              "sourceUrl": "https://cursor.com/docs/account/pricing",
              "topic": "after_limit"
            },
            {
              "id": "agent-limits-extended-vs-hobby-unquantified",
              "label": "Agent limits (extended vs Hobby, unquantified)",
              "statement": "Everything in Hobby, plus: Extended limits on Agent / Generous limits for Grok",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "tab-completions-unlimited",
              "label": "Tab completions (unlimited)",
              "statement": "Pro, Pro Plus, and Ultra include unlimited tab completions, extended agent usage limits on all models, access to Bugbot, and access to Cloud Agents.",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "on-demand-usage-toggle-usage-based-pricing",
              "label": "On-demand usage toggle (usage-based pricing)",
              "statement": "Every plan includes a set amount of model usage. On-demand usage allows you to continue using models after your included amount is consumed, billed in arrears.",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Cursor does not publish the size of either usage pool in dollars or tokens for Pro; the docs say only 'Significantly more included usage' for the Cursor Models pool and that the Other Models pool is 'charged at the model's API price'. The docs' 'How much usage do I need?' section gives indicative spend ranges ('Daily Agent users : Typically $60-$100/mo total usage'), which are guidance, not limits.",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Cursor says paid individual plans unlock all supported named models, subject to regional and organization controls.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-pricing"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-pricing"
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-pricing"
            },
            {
              "model": "composer-2-5"
            },
            {
              "model": "gemini-3-1-pro",
              "pricingRef": "gemini-3-1-pro-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "grok-4-5"
            },
            {
              "model": "grok-4-6"
            },
            {
              "model": "grok-4-7"
            },
            {
              "model": "muse-spark-1-3"
            }
          ],
          "sources": [
            {
              "url": "https://cursor.com/docs/models-and-pricing",
              "title": "Cursor paid-plan pools and current model prices",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "cursor-pro-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "cursor-pro",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "20",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "cursor.com",
              "sourceUrl": "https://cursor.com/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "Cursor Pro current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:ae50426ab2ee54ec4cf29046caf8f46292646c4fa0a79f2afba38aeaaac7b86b",
              "evidencePackageHash": "sha256:284f0ef1bb947d6ab09a203c81da0f49c47b432575e532618d055321c71494db",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "cursor.com",
              "sourceUrl": "https://cursor.com/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "Cursor Pro web individual subscription is USD 20 per month.",
              "normalizedClaimHash": "sha256:cafefeb045041467d2199262915a5966bd2f36f9ce4875ff6fd802777afb24a0",
              "evidencePackageHash": "sha256:ed3fbd4db207dc026b5dfaedfabab70cb7738c55688e2e3e08078607664d9fe1",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "cursor.com",
              "sourceUrl": "https://cursor.com/docs/models-and-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active Cursor Pro includes cursor-pro-agent access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:4af7c30cbe5de2beea990555dbbb8fe06c26645d20df3f82300336be745bee76",
              "evidencePackageHash": "sha256:f34db090b013be8913396d5adbed53c4e5205417e376c031cbcc398a1304ed23",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "cursor.com",
              "sourceUrl": "https://cursor.com/docs/models-and-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for cursor-pro-agent: claude-sonnet-5.",
              "normalizedClaimHash": "sha256:6bd59a5c691759f4ddd45e7433abcc091175c0e2bcd4b481390ba1022bce934a",
              "evidencePackageHash": "sha256:3f914aaeb7131c2f7b026a61ac81753f4fefc7a0d7bf496aa15b4db7877917ab",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "cursor.com",
              "sourceUrl": "https://cursor.com/docs/models-and-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "provider_dynamic",
              "locator": "Usage or capacity mechanics",
              "excerpt": "Pro has separate Cursor Models and Other Models pools, but current official documentation does not publish a fixed dollar amount for each pool. On-demand usage is optional.",
              "normalizedClaimHash": "sha256:06f19f53616a608c815b57ae3623d9dc6e132be2eb0011f25acbe13397a3707c",
              "evidencePackageHash": "sha256:d2877ce637c644d01ac704830472a295c1b6cc821c37df1f00e1db31fd225abb",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "cursor.com",
              "sourceUrl": "https://cursor.com/docs/models-and-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for Cursor Pro depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:0d49f0d6ac394c75ef39f6bec7fd83b8089930bc14565ef6980d2ce6d7050988",
              "evidencePackageHash": "sha256:4e90cbe93b0257eec3847fe9d3f08a15a5192bea708141dddb33193ec85880ba",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-cursor-pro-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "cursor-pro-agent",
              "protocol": "cursor-agent",
              "harnessIds": [
                "cursor"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-sonnet-5"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "unpublished-named-pool-amounts",
              "claimRefs": [
                "capacity"
              ]
            }
          ]
        }
      ]
    },
    "cursor-ultra": {
      "id": "cursor-ultra",
      "role": "plan",
      "name": "Cursor Ultra",
      "providerId": "cursor",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "200",
            "interval": "month"
          },
          "billingMechanics": "Monthly $200/mo; yearly view shows $160/mo ('Save 20% with yearly billing').",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "20× Pro Agent limits, unlimited Tab, Bugbot and Cloud Agents. Optional on-demand billing.",
              "sourceUrl": "https://cursor.com/docs/models-and-pricing"
            },
            {
              "id": "grok-route-pricing-unknown",
              "label": "Grok 4.7 route pricing depends on speed and context",
              "statement": "Cursor documents standard and Fast rates plus a long-context tier. Fast is the paid-plan default, but this catalog cannot establish a specific speed route for a recorded workload, so it does not assign one token rate.",
              "sourceUrl": "https://cursor.com/docs/models/grok-4-7"
            },
            {
              "id": "agent-limits-relative-to-pro",
              "label": "Agent limits relative to Pro",
              "statement": "Everything in Pro, plus: 20x Pro limits on Agent",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "usage-pools-included",
              "label": "Usage pools included",
              "statement": "Ultra | $200/mo | Included | Included",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "what-happens-when-included-monthly-usage-is-exce",
              "label": "What happens when included monthly usage is exceeded",
              "statement": "When you exceed your included monthly usage, you can either: - Add on-demand usage : Continue at the same API rates with pay-as-you-go billing - Upgrade your plan : Move to a higher tier for more included usage.",
              "sourceUrl": "https://cursor.com/docs/account/pricing",
              "topic": "after_limit"
            },
            {
              "id": "tab-completions-unlimited",
              "label": "Tab completions (unlimited)",
              "statement": "Pro, Pro Plus, and Ultra include unlimited tab completions, extended agent usage limits on all models, access to Bugbot, and access to Cloud Agents.",
              "sourceUrl": "https://cursor.com/docs/account/pricing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "The '20x Pro limits on Agent' multiple has no published absolute base. Cursor's docs also note 'On Teams and Enterprise plans, Cursor Router picks the model for each Auto request based on your optimization mode' and a Cursor Token Rate of $0.25 per million tokens applies on Teams/Enterprise, not on individual plans.",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Cursor says paid individual plans unlock all supported named models, subject to regional and organization controls.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-pricing"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-pricing"
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-pricing"
            },
            {
              "model": "composer-2-5"
            },
            {
              "model": "gemini-3-1-pro",
              "pricingRef": "gemini-3-1-pro-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "grok-4-5"
            },
            {
              "model": "grok-4-6"
            },
            {
              "model": "grok-4-7"
            },
            {
              "model": "muse-spark-1-3"
            }
          ],
          "sources": [
            {
              "url": "https://cursor.com/docs/models-and-pricing",
              "title": "Cursor paid-plan pools and current model prices",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "example-cloud-pro": {
      "id": "example-cloud-pro",
      "role": "plan",
      "name": "Example Cloud Pro",
      "providerId": "example-cloud",
      "versions": [
        {
          "effectiveFrom": "2026-08-01",
          "price": {
            "currency": "USD",
            "amount": "50.00",
            "interval": "month"
          },
          "billingMechanics": "Token allowance per calendar month; request windows throttle burst usage.",
          "limits": [
            {
              "id": "monthly-tokens",
              "label": "Monthly token allowance",
              "type": "token_limit",
              "amount": "200000000",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "reject_request"
            },
            {
              "id": "rolling-5h-requests",
              "label": "5-hour request window",
              "type": "request_limit",
              "amount": "600",
              "window": {
                "type": "rolling",
                "duration": "PT5H",
                "anchor": "first_use"
              },
              "exceed": "latch_until_reset"
            },
            {
              "id": "large-model-credits",
              "label": "Large model credit pool",
              "type": "credit_pool",
              "amount": "100.00",
              "models": [
                "example-large"
              ],
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "modelRules": [
            {
              "model": "example-small",
              "pricingRef": "example-small-pricing"
            },
            {
              "model": "example-medium",
              "pricingRef": "example-medium-pricing"
            },
            {
              "model": "example-large",
              "pricingRef": "example-large-pricing",
              "multiplier": "0.5"
            }
          ],
          "promotions": [
            {
              "id": "medium-launch-promo",
              "label": "Medium model launch promotion",
              "models": [
                "example-medium"
              ],
              "multiplier": "0.5",
              "effectiveFrom": "2026-09-01",
              "effectiveTo": "2026-09-30"
            }
          ],
          "sources": [
            {
              "url": "https://example.invalid/plans/example-cloud-pro",
              "title": "Example Cloud Pro plan page (synthetic demo data)",
              "checkedAt": "2026-08-01"
            }
          ],
          "lastVerifiedAt": "2026-08-01",
          "verificationStatus": "estimated"
        }
      ]
    },
    "example-cloud-starter": {
      "id": "example-cloud-starter",
      "role": "plan",
      "name": "Example Cloud Starter",
      "providerId": "example-cloud",
      "versions": [
        {
          "effectiveFrom": "2026-08-01",
          "effectiveTo": "2026-09-14",
          "price": {
            "currency": "USD",
            "amount": "20.00",
            "interval": "month"
          },
          "billingMechanics": "Credit pool consumed at model list rates; unused credits do not roll over.",
          "limits": [
            {
              "id": "rolling-5h-credits",
              "label": "5-hour credit pool",
              "type": "credit_pool",
              "amount": "20.00",
              "window": {
                "type": "rolling",
                "duration": "PT5H",
                "anchor": "first_use"
              },
              "exceed": "reject_request"
            },
            {
              "id": "rolling-7d-credits",
              "label": "Weekly credit pool",
              "type": "credit_pool",
              "amount": "75.00",
              "window": {
                "type": "rolling",
                "duration": "P7D",
                "anchor": "first_use"
              },
              "exceed": "latch_until_reset"
            }
          ],
          "modelRules": [
            {
              "model": "example-small",
              "pricingRef": "example-small-pricing"
            },
            {
              "model": "example-medium",
              "pricingRef": "example-medium-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://example.invalid/plans/example-cloud-starter",
              "title": "Example Cloud Starter plan page (synthetic demo data)",
              "checkedAt": "2026-08-01"
            }
          ],
          "lastVerifiedAt": "2026-08-01",
          "verificationStatus": "estimated"
        },
        {
          "effectiveFrom": "2026-09-15",
          "price": {
            "currency": "USD",
            "amount": "20.00",
            "interval": "month"
          },
          "billingMechanics": "Credit pool consumed at model list rates; unused credits do not roll over.",
          "limits": [
            {
              "id": "rolling-5h-credits",
              "label": "5-hour credit pool",
              "type": "credit_pool",
              "amount": "25.00",
              "window": {
                "type": "rolling",
                "duration": "PT5H",
                "anchor": "first_use"
              },
              "exceed": "reject_request"
            },
            {
              "id": "rolling-7d-credits",
              "label": "Weekly credit pool",
              "type": "credit_pool",
              "amount": "75.00",
              "window": {
                "type": "rolling",
                "duration": "P7D",
                "anchor": "first_use"
              },
              "exceed": "latch_until_reset"
            }
          ],
          "modelRules": [
            {
              "model": "example-small",
              "pricingRef": "example-small-pricing"
            },
            {
              "model": "example-medium",
              "pricingRef": "example-medium-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://example.invalid/plans/example-cloud-starter",
              "title": "Example Cloud Starter plan page (synthetic demo data)",
              "checkedAt": "2026-09-15"
            }
          ],
          "lastVerifiedAt": "2026-09-15",
          "verificationStatus": "estimated"
        }
      ]
    },
    "example-open-basic": {
      "id": "example-open-basic",
      "role": "plan",
      "name": "Example Open Basic",
      "providerId": "example-open",
      "versions": [
        {
          "effectiveFrom": "2026-08-01",
          "price": {
            "currency": "USD",
            "amount": "10.00",
            "interval": "month"
          },
          "billingMechanics": "Request windows only; the large model is not available on this plan.",
          "limits": [
            {
              "id": "rolling-5h-requests",
              "label": "5-hour request window",
              "type": "request_limit",
              "amount": "300",
              "window": {
                "type": "rolling",
                "duration": "PT5H",
                "anchor": "first_use"
              },
              "exceed": "record_only"
            }
          ],
          "modelRules": [
            {
              "model": "example-small",
              "pricingRef": "example-small-pricing"
            },
            {
              "model": "example-medium",
              "pricingRef": "example-medium-pricing"
            },
            {
              "model": "example-large",
              "excluded": true
            }
          ],
          "sources": [
            {
              "url": "https://example.invalid/plans/example-open-basic",
              "title": "Example Open Basic plan page (synthetic demo data)",
              "checkedAt": "2026-08-01"
            }
          ],
          "lastVerifiedAt": "2026-08-01",
          "verificationStatus": "estimated"
        }
      ]
    },
    "github-copilot-business": {
      "id": "github-copilot-business",
      "role": "plan",
      "name": "Copilot Business",
      "providerId": "github",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "19",
            "interval": "month"
          },
          "billingMechanics": "Price is 'per granted seat per month': 'Copilot Business | $19 USD | 1,900'.",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits per seat (1,900 credits = $19.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "19.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "additional-usage-beyond-the-pool",
              "label": "Additional usage beyond the pool",
              "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "policy-dependent-behaviour-when-pooled-credits-a",
              "label": "Policy-dependent behaviour when pooled credits are exhausted",
              "statement": "When your pooled AI credits are exhausted, what happens next depends on how you have configured policies for additional usage. - Additional usage allowed : Usage continues at published per-credit rates. The spend is charged to your organization or enterprise. Note that additional usage may be capped : if you hit the cap, you'll need to pay off any additional usage you've already consumed in order to continue. - Additional usage not allowed : Usage is blocked until the next billing cycle when monthly amounts are refreshed. ... Additional usage is enabled by default for organizations and enterprises.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
              "topic": "after_limit"
            },
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
            {
              "id": "rate-limits-unquantified",
              "label": "Rate limits (unquantified)",
              "statement": "If you receive a limit error when using Copilot, you should: - Wait and try again. Rate limits are temporary. Often, waiting a short period and trying again resolves the issue.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "The billing interval for Copilot Business seats is not stated as monthly or annual on the plans page; the price is quoted 'per granted seat per month'. The reset date for included credits is fixed to the calendar month and not the billing date.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://github.com/features/copilot/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "19",
            "interval": "month"
          },
          "billingMechanics": "$19 per granted seat per month, contributing 1,900 monthly AI credits per user to the organization pool.",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits per seat (1,900 credits = $19.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "19.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "additional-usage-beyond-the-pool",
              "label": "Additional usage beyond the pool",
              "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "policy-dependent-behaviour-when-pooled-credits-a",
              "label": "Policy-dependent behaviour when pooled credits are exhausted",
              "statement": "When your pooled AI credits are exhausted, what happens next depends on how you have configured policies for additional usage. - Additional usage allowed : Usage continues at published per-credit rates. The spend is charged to your organization or enterprise. Note that additional usage may be capped : if you hit the cap, you'll need to pay off any additional usage you've already consumed in order to continue. - Additional usage not allowed : Usage is blocked until the next billing cycle when monthly amounts are refreshed. ... Additional usage is enabled by default for organizations and enterprises.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
              "topic": "after_limit"
            },
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
            {
              "id": "rate-limits-unquantified",
              "label": "Rate limits (unquantified)",
              "statement": "If you receive a limit error when using Copilot, you should: - Wait and try again. Rate limits are temporary. Often, waiting a short period and trying again resolves the issue.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "The billing interval for Copilot Business seats is not stated as monthly or annual on the plans page; the price is quoted 'per granted seat per month'. The reset date for included credits is fixed to the calendar month and not the billing date.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability by plan",
              "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7",
              "pricingRef": "claude-opus-4-7-github-pricing"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode",
              "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash",
              "pricingRef": "gemini-3-7-flash-github-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash",
              "pricingRef": "mai-code-1-1-flash-github-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-github-pricing"
            },
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-github-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-github-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
              "title": "GitHub model availability (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "github-copilot-enterprise": {
      "id": "github-copilot-enterprise",
      "role": "plan",
      "name": "Copilot Enterprise",
      "providerId": "github",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "39",
            "interval": "month"
          },
          "billingMechanics": "Price is 'per granted seat per month': 'Copilot Enterprise | $39 USD | 3,900'.",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits per seat (3,900 credits = $39.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "39.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "additional-usage-beyond-the-pool",
              "label": "Additional usage beyond the pool",
              "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans",
              "topic": "after_limit"
            },
            {
              "id": "budget-controls-user-cost-center-enterprise-spen",
              "label": "Budget controls (user, cost-center, enterprise spending limits)",
              "statement": "If you have set a user-level budget and a user exhausts it, that user's access to Copilot is halted, regardless of whether the organization's pool still has capacity. A user can also be blocked by an enterprise spending limit before they reach their individual user-level budget, if the spending limit runs out first. There is no automatic fallback to lower-cost models when a budget is exhausted.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Same as Copilot Business: billing interval not stated as monthly/annual on the plans page; credits reset on the calendar month, not the billing date.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://github.com/features/copilot/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "39",
            "interval": "month"
          },
          "billingMechanics": "$39 per granted seat per month, contributing 3,900 monthly AI credits per user to the organization pool.",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits per seat (3,900 credits = $39.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "39.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "additional-usage-beyond-the-pool",
              "label": "Additional usage beyond the pool",
              "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans",
              "topic": "after_limit"
            },
            {
              "id": "budget-controls-user-cost-center-enterprise-spen",
              "label": "Budget controls (user, cost-center, enterprise spending limits)",
              "statement": "If you have set a user-level budget and a user exhausts it, that user's access to Copilot is halted, regardless of whether the organization's pool still has capacity. A user can also be blocked by an enterprise spending limit before they reach their individual user-level budget, if the spending limit runs out first. There is no automatic fallback to lower-cost models when a budget is exhausted.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Same as Copilot Business: billing interval not stated as monthly/annual on the plans page; credits reset on the calendar month, not the billing date.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability by plan",
              "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7",
              "pricingRef": "claude-opus-4-7-github-pricing"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode",
              "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash",
              "pricingRef": "gemini-3-7-flash-github-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash",
              "pricingRef": "mai-code-1-1-flash-github-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-github-pricing"
            },
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-github-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-github-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
              "title": "GitHub model availability (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "github-copilot-free": {
      "id": "github-copilot-free",
      "role": "plan",
      "name": "Copilot Free",
      "providerId": "github",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "0",
            "interval": "month"
          },
          "billingMechanics": "No subscription charge. GitHub documents 2,000 monthly inline suggestions and an AI credit allowance whose amount is not published. Model access uses Auto selection only.",
          "limits": [
            {
              "id": "inline-suggestions",
              "label": "Inline suggestion completions",
              "type": "request_limit",
              "amount": "2000",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "reject_request"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "github-ai-credits-allowance-amount-not-published",
              "label": "GitHub AI Credits allowance (amount not published)",
              "statement": "Copilot Free and Copilot Student both have an allowance of AI credits.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-access-restricted-to-auto-model-selection",
              "label": "Model access restricted to auto model selection",
              "statement": "On Copilot Free and Copilot Student plans, access to models is available through auto model selection only.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "rate-limits-unquantified-apply-to-copilot-genera",
              "label": "Rate limits (unquantified, apply to Copilot generally)",
              "statement": "Rate limiting is a mechanism used to control the number of requests a user or application can make in a given time period. GitHub uses rate limits to ensure everyone has fair access to GitHub Copilot and to protect against abuse.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "The size of Copilot Free's GitHub AI Credits allowance is not published as a number. No billing interval applies (no charge).",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Copilot Free offers model access through Auto selection only. A named model is not a selectable Replay target on this plan.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "excluded": true
            },
            {
              "model": "claude-fable-5-1",
              "excluded": true
            },
            {
              "model": "claude-haiku-4-5",
              "excluded": true
            },
            {
              "model": "claude-opus-4-7",
              "excluded": true
            },
            {
              "model": "claude-opus-4-8",
              "excluded": true
            },
            {
              "model": "claude-opus-4-8-fast-mode",
              "excluded": true
            },
            {
              "model": "claude-opus-5",
              "excluded": true
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "excluded": true
            },
            {
              "model": "gemini-3-5-flash",
              "excluded": true
            },
            {
              "model": "gemini-3-6-flash",
              "excluded": true
            },
            {
              "model": "gemini-3-7-flash",
              "excluded": true
            },
            {
              "model": "gemini-3-8-flash",
              "excluded": true
            },
            {
              "model": "gpt-5-3-codex",
              "excluded": true
            },
            {
              "model": "gpt-5-4",
              "excluded": true
            },
            {
              "model": "gpt-5-4-mini",
              "excluded": true
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "excluded": true
            },
            {
              "model": "gpt-5-6-luna",
              "excluded": true
            },
            {
              "model": "gpt-5-6-sol",
              "excluded": true
            },
            {
              "model": "gpt-5-6-terra",
              "excluded": true
            },
            {
              "model": "gpt-5-mini",
              "excluded": true
            },
            {
              "model": "gpt-6-astra",
              "excluded": true
            },
            {
              "model": "grok-4-5",
              "excluded": true
            },
            {
              "model": "grok-4-6",
              "excluded": true
            },
            {
              "model": "grok-4-7",
              "excluded": true
            },
            {
              "model": "kimi-k2-7-code",
              "excluded": true
            },
            {
              "model": "kimi-k3",
              "excluded": true
            },
            {
              "model": "mai-code-1-1-flash",
              "excluded": true
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "github-copilot-max": {
      "id": "github-copilot-max",
      "role": "plan",
      "name": "Copilot Max",
      "providerId": "github",
      "versions": [
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "Copilot Max costs $100 USD per month and includes 20,000 monthly AI credits (10,000 base and 10,000 flex).",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits (20,000 credits = $200.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "200.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "credit-reset-behaviour-no-carryover",
              "label": "Credit reset behaviour (no carryover)",
              "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "what-happens-when-included-credits-are-exhausted",
              "label": "What happens when included credits are exhausted",
              "statement": "If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "topic": "after_limit"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability by plan",
              "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "priority-premium-models",
              "label": "Priority premium model access",
              "statement": "GitHub describes Copilot Max as providing priority access to premium models; no numeric priority guarantee is published.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7",
              "pricingRef": "claude-opus-4-7-github-pricing"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode",
              "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash",
              "pricingRef": "gemini-3-7-flash-github-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "pricingRef": "gpt-5-4-nano-github-pricing"
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash",
              "pricingRef": "mai-code-1-1-flash-github-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-github-pricing"
            },
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-github-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-github-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
              "title": "GitHub model availability (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "github-copilot-pro-plus": {
      "id": "github-copilot-pro-plus",
      "role": "plan",
      "name": "Copilot Pro+",
      "providerId": "github",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "39",
            "interval": "month"
          },
          "billingMechanics": "Plan table: 'Copilot Pro+ - $39 USD per month.",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits (7,000 credits = $70.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "70.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "credit-reset-behaviour-no-carryover",
              "label": "Credit reset behaviour (no carryover)",
              "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "what-happens-when-included-credits-are-exhausted",
              "label": "What happens when included credits are exhausted",
              "statement": "If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "topic": "after_limit"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "None specific to Pro+ beyond the general absence of published numeric rate limits.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://github.com/features/copilot/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "39",
            "interval": "month"
          },
          "billingMechanics": "$39 per month, including 7,000 monthly AI credits (3,900 base and 3,100 flex).",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits (7,000 credits = $70.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "70.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "credit-reset-behaviour-no-carryover",
              "label": "Credit reset behaviour (no carryover)",
              "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "what-happens-when-included-credits-are-exhausted",
              "label": "What happens when included credits are exhausted",
              "statement": "If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "topic": "after_limit"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "None specific to Pro+ beyond the general absence of published numeric rate limits.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability by plan",
              "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "annual-sonnet-4-6-exception",
              "label": "Claude Sonnet 4.6 annual-plan exception",
              "statement": "Claude Sonnet 4.6 is retired for monthly Copilot Pro and Pro+ subscribers but remains available to individual subscribers on annual billing. This monthly-priced target excludes it.",
              "sourceUrl": "https://docs.github.com/en/copilot/reference/ai-models/supported-models"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7",
              "pricingRef": "claude-opus-4-7-github-pricing"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode",
              "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash",
              "pricingRef": "gemini-3-7-flash-github-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "pricingRef": "gpt-5-4-nano-github-pricing"
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash",
              "pricingRef": "mai-code-1-1-flash-github-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "pricingRef": "claude-opus-5-5-github-pricing"
            },
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-github-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-github-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
              "title": "GitHub model availability (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "github-copilot-pro": {
      "id": "github-copilot-pro",
      "role": "plan",
      "name": "Copilot Pro",
      "providerId": "github",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "10",
            "interval": "month"
          },
          "billingMechanics": "Plan table: 'Copilot Pro - $10 USD per month (free for some users)'; GitHub AI Credits 'Base: 1,000'.",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits (1,500 credits = $15.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "15.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "credit-reset-behaviour-no-carryover",
              "label": "Credit reset behaviour (no carryover)",
              "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month. This reset date is fixed and does not change based on your subscription billing date.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "what-happens-when-included-credits-are-exhausted",
              "label": "What happens when included credits are exhausted",
              "statement": "When your AI credits are exhausted, you can: - Upgrade your plan. ... - Stay on your existing plan and pay for more usage. If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue. - Alternatively, wait until the next monthly cycle when your included usage resets.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "topic": "after_limit"
            },
            {
              "id": "additional-usage-budget-usd-fixed-conversion-rat",
              "label": "Additional usage budget (USD, fixed conversion rate)",
              "statement": "Your additional usage budget is set in US dollars, and your usage is shown in GitHub AI Credits. GitHub AI Credits draw down your budget at a fixed rate: 1 AI credits = $0.01 USD, so a $10 budget covers 1,000 AI credits.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Copilot Pro is 'free for some users' (verified teachers, popular open-source maintainers) - the $10 USD/month is the standard price. The flex allotment is described as variable by GitHub.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://github.com/features/copilot/plans"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "pricingRef": "claude-fable-5-github-pricing"
            },
            {
              "model": "claude-fable-5-1",
              "pricingRef": "claude-fable-5-1-github-pricing"
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7"
            },
            {
              "model": "claude-opus-4-8",
              "pricingRef": "claude-opus-4-8-github-pricing"
            },
            {
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5",
              "pricingRef": "claude-opus-5-github-pricing"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "pricingRef": "gpt-5-5-github-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-github-pricing"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-github-pricing"
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash"
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "10",
            "interval": "month"
          },
          "billingMechanics": "$10 per month, including 1,500 monthly AI credits (1,000 base and 500 flex).",
          "limits": [
            {
              "id": "monthly-ai-credits",
              "label": "Monthly AI credits (1,500 credits = $15.00 at the documented $0.01 per credit)",
              "type": "credit_pool",
              "amount": "15.00",
              "window": {
                "type": "calendar",
                "unit": "month",
                "timezone": "UTC"
              },
              "exceed": "allow_overage"
            }
          ],
          "qualitativeLimits": [
            {
              "id": "credit-reset-behaviour-no-carryover",
              "label": "Credit reset behaviour (no carryover)",
              "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month. This reset date is fixed and does not change based on your subscription billing date.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "code-completions-and-next-edit-suggestions-unlim",
              "label": "Code completions and next edit suggestions (unlimited)",
              "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "what-happens-when-included-credits-are-exhausted",
              "label": "What happens when included credits are exhausted",
              "statement": "When your AI credits are exhausted, you can: - Upgrade your plan. ... - Stay on your existing plan and pay for more usage. If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue. - Alternatively, wait until the next monthly cycle when your included usage resets.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "topic": "after_limit"
            },
            {
              "id": "additional-usage-budget-usd-fixed-conversion-rat",
              "label": "Additional usage budget (USD, fixed conversion rate)",
              "statement": "Your additional usage budget is set in US dollars, and your usage is shown in GitHub AI Credits. GitHub AI Credits draw down your budget at a fixed rate: 1 AI credits = $0.01 USD, so a $10 budget covers 1,000 AI credits.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Copilot Pro is 'free for some users' (verified teachers, popular open-source maintainers) - the $10 USD/month is the standard price. The flex allotment is described as variable by GitHub.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability by plan",
              "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
            },
            {
              "id": "annual-sonnet-4-6-exception",
              "label": "Claude Sonnet 4.6 annual-plan exception",
              "statement": "Claude Sonnet 4.6 is retired for monthly Copilot Pro and Pro+ subscribers but remains available to individual subscribers on annual billing. This monthly-priced target excludes it.",
              "sourceUrl": "https://docs.github.com/en/copilot/reference/ai-models/supported-models"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5",
              "excluded": true
            },
            {
              "model": "claude-fable-5-1",
              "excluded": true
            },
            {
              "model": "claude-haiku-4-5",
              "pricingRef": "claude-haiku-4-5-github-pricing"
            },
            {
              "model": "claude-opus-4-7",
              "excluded": true
            },
            {
              "model": "claude-opus-4-8",
              "excluded": true
            },
            {
              "model": "claude-opus-4-8-fast-mode",
              "excluded": true
            },
            {
              "model": "claude-opus-5",
              "excluded": true
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5",
              "pricingRef": "claude-sonnet-5-github-pricing"
            },
            {
              "model": "gemini-3-5-flash",
              "pricingRef": "gemini-3-5-flash-github-pricing"
            },
            {
              "model": "gemini-3-6-flash",
              "pricingRef": "gemini-3-6-flash-github-pricing"
            },
            {
              "model": "gemini-3-7-flash",
              "pricingRef": "gemini-3-7-flash-github-pricing"
            },
            {
              "model": "gemini-3-8-flash",
              "pricingRef": "gemini-3-8-flash-github-pricing"
            },
            {
              "model": "gpt-5-3-codex",
              "pricingRef": "gpt-5-3-codex-github-pricing"
            },
            {
              "model": "gpt-5-4",
              "pricingRef": "gpt-5-4-github-pricing"
            },
            {
              "model": "gpt-5-4-mini",
              "pricingRef": "gpt-5-4-mini-github-pricing"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5",
              "excluded": true
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-github-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "excluded": true
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-github-pricing"
            },
            {
              "model": "gpt-5-mini",
              "pricingRef": "gpt-5-mini-github-pricing"
            },
            {
              "model": "gpt-6-astra",
              "excluded": true
            },
            {
              "model": "grok-4-5",
              "pricingRef": "grok-4-5-github-pricing"
            },
            {
              "model": "grok-4-6",
              "pricingRef": "grok-4-6-github-pricing"
            },
            {
              "model": "grok-4-7",
              "pricingRef": "grok-4-7-github-pricing"
            },
            {
              "model": "kimi-k2-7-code",
              "pricingRef": "kimi-k2-7-code-github-pricing"
            },
            {
              "model": "kimi-k3",
              "pricingRef": "kimi-k3-github-pricing"
            },
            {
              "model": "mai-code-1-1-flash",
              "pricingRef": "mai-code-1-1-flash-github-pricing"
            },
            {
              "model": "claude-opus-5-5",
              "excluded": true
            },
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-github-pricing"
            },
            {
              "model": "gpt-6-sol",
              "excluded": true
            }
          ],
          "sources": [
            {
              "url": "https://docs.github.com/en/copilot/get-started/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "title": "GitHub plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://github.com/features/copilot/plans",
              "title": "GitHub pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
              "title": "GitHub model availability (official)",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "github-copilot-pro-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "github-copilot-pro",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "10",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "docs.github.com",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "GitHub Copilot Pro current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:e6978503ea77558c4930eb5689e242a0b392f8ee8e1824f08b35326b27c39f44",
              "evidencePackageHash": "sha256:0f47c9772899dd0a365ddd416e6590be99af04d61caaa3aa4c6bc34215aba690",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "docs.github.com",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "GitHub Copilot Pro web individual subscription is USD 10 per month.",
              "normalizedClaimHash": "sha256:2c32c1e9022e7de78cac3fb1397ad8da14cb5479fa9eb1c0e524700262c8cd82",
              "evidencePackageHash": "sha256:21ea2128767dca2a7b9ce8d76689ca178d2aea41d4faf6c6ce452da3d22c7cd7",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "docs.github.com",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active GitHub Copilot Pro includes github-copilot-individual access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:66d834e04cde925ee0e7699924f5515376e29bdb36727790e0ecebb7d8ce78c8",
              "evidencePackageHash": "sha256:22b80c3ac72d0844f31f99047fe46fb21364a05c685d404982d799b4b30a6ded",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "raw.githubusercontent.com",
              "sourceUrl": "https://raw.githubusercontent.com/github/docs/main/data/tables/copilot/model-supported-plans.yml",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for github-copilot-individual: claude-sonnet-5.",
              "normalizedClaimHash": "sha256:17d29791005ff95c16a529c7afa84a5856c87bbbbe9fe4a83c31abc4b3599181",
              "evidencePackageHash": "sha256:411f9ed689995fc6e52f10130a5eff14e6c3c64a05f25f6e3045bab001d292a3",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "docs.github.com",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "provider_dynamic",
              "locator": "Usage or capacity mechanics",
              "excerpt": "Current Pro has 1000 base and 500 flex GitHub AI Credits per month, reset on the first UTC; the flex allotment is variable, feature charges differ, and purchased overage is separate.",
              "normalizedClaimHash": "sha256:8f1f6569d3874f17500d05aeb2304e544ff52dc493e16ca9130032a19d75fb9d",
              "evidencePackageHash": "sha256:7c88984df06d2c3e768e9b1e6ce0d6dedb61d878cd31734482b82f056df4195a",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "docs.github.com",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for GitHub Copilot Pro depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:88895bcecff7a64648e14b6442738a23b5c93e1079d583a8901547cd6003e28f",
              "evidencePackageHash": "sha256:77977fd41a2eedd063efefcd3372f2c4cec15a42b4bf516de23af7cec4f57c1f",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "credits",
              "sourceId": "docs.github.com",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "AI Credits allowance",
              "excerpt": "Current Pro states 1000 base plus 500 flexible GitHub AI Credits per calendar month; 1 credit = USD 0.01.",
              "normalizedClaimHash": "sha256:ffa77b75d359c1400ef0a4d89f99eedaab72d5d017546d3d7f5263ac6d43dd54",
              "evidencePackageHash": "sha256:435a15dc22d2ae92ea8924d7fa8664016355b29b1a2e9ff2cc34566e824b811a",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-github-copilot-pro-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "github-copilot-individual",
              "protocol": "copilot-cli",
              "harnessIds": [
                "copilot-cli"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-sonnet-5"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "variable-flex-and-feature-debit",
              "claimRefs": [
                "capacity",
                "credits"
              ]
            }
          ]
        }
      ]
    },
    "google-ai-pro": {
      "id": "google-ai-pro",
      "role": "plan",
      "name": "Google AI Pro",
      "providerId": "google",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "19.99",
            "interval": "month"
          },
          "billingMechanics": "Google AI Pro costs $19.99 per month in the US. Google describes its usage as 4x the Free tier; it does not publish an absolute allowance.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "4× standard Gemini Apps usage, with five-hour and weekly limits. Separate allowances apply in other Google AI products.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "gemini-apps-compute-based-usage-limit-relative-t",
              "label": "Gemini Apps compute-based usage limit (relative to no-plan users)",
              "statement": "Gemini Apps have compute-based usage limits that determine how much you can interact with Gemini tools and features. These limits factor in the complexity of your prompt, the models and features you use, and the length of your chat. Your limit refreshes every 5 hours until you reach your weekly limit. ... AI Pro | 4x higher than standard limits | AI Ultra | 5x or 20x higher than AI Pro limits depending on your subscription",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
            },
            {
              "id": "context-window-gemini-apps",
              "label": "Context window (Gemini Apps)",
              "statement": "Plan Context window ... AI Pro & AI Ultra 1 million tokens",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
            },
            {
              "id": "what-happens-when-you-reach-a-usage-limit",
              "label": "What happens when you reach a usage limit",
              "statement": "If you have a Google AI subscription and reach your limit, you can continue your conversation with Flash-Lite. If you reach your five hour or weekly usage limits you can upgrade to a Google AI subscription with higher limits or wait until your model limit is refreshed.",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805",
              "topic": "after_limit"
            },
            {
              "id": "ai-credits-for-extra-usage-flow-antigravity-othe",
              "label": "AI credits for extra usage (Flow, Antigravity, other products)",
              "statement": "Each product has its own AI usage limits. Your usage limits depend on which features you are using and your Google AI plan. If you reach your plan's limit, Google AI Pro and Google AI Ultra members can purchase AI credits to get extra usage in Google Flow and Google Antigravity.",
              "sourceUrl": "https://support.google.com/googleone/answer/14534406"
            },
            {
              "id": "limits-may-change-without-notice",
              "label": "Limits may change without notice",
              "statement": "Limits may change without notice, including due to capacity constraints. When there's a large increase in activity in Gemini Apps, we may change limits to maintain a high standard of quality.",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
            },
            {
              "id": "antigravity-jules-limits-relative-unquantified",
              "label": "Antigravity / Jules limits (relative, unquantified)",
              "statement": "Jules 9 - Higher limits to our asynchronous coding agent for software developers. Google Antigravity - Entry rate limits to agent model in Google Antigravity, our agentic development platform.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Google describes Gemini Apps limits in relative terms only ('4x higher than standard limits'), with no absolute counts. Context window is the only absolute number published (1 million tokens for AI Pro and AI Ultra). The Google One plans page describes a 'Google AI Plus (2 TB)' plan at $9.99/mo while gemini.google/subscriptions describes 'Google AI Plus' at $4.99/month with 400 GB storage - the two official pages describe different Google AI Plus entitlements, so the Plus tier is not recorded here.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Google publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            }
          ],
          "modelRules": [
            {
              "model": "gemini-3-1-pro",
              "pricingRef": "gemini-3-1-pro-pricing"
            },
            {
              "model": "gemini-3-flash",
              "pricingRef": "gemini-3-flash-pricing"
            },
            {
              "model": "gemini-3-flash-lite"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-pro"
            },
            {
              "model": "nano-banana-pro"
            }
          ],
          "sources": [
            {
              "url": "https://gemini.google/subscriptions/",
              "title": "Google official page",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.google.com/gemini/answer/16275805",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.google.com/googleone/answer/14534406",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://gemini.google/us/subscriptions/",
              "title": "Google US subscription prices, relative limits and model lineup (3.6 Flash in Free, which paid plans include)",
              "checkedAt": "2026-09-24"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "google-ai-ultra-20x": {
      "id": "google-ai-ultra-20x",
      "role": "plan",
      "name": "Google AI Ultra (20x tier)",
      "providerId": "google",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "199.99",
            "interval": "month"
          },
          "billingMechanics": "Google AI Ultra has a $199.99 per month tier with 20x the AI Pro usage limits.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "20× AI Pro usage in Gemini and Antigravity. Separate creative-tool and model limits apply.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "gemini-apps-usage-limit-relative-to-google-ai-pr",
              "label": "Gemini Apps usage limit relative to Google AI Pro (20x tier)",
              "statement": "$199.99 / month: 20x higher usage limits vs. AI Pro",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "usage-quota-vs-google-ai-pro-google-one-help",
              "label": "Usage quota vs Google AI Pro (Google One help)",
              "statement": "Based on your specific Google AI Ultra plan, you get 5x or 20x usage quota in Gemini and Google Antigravity compared to the Google AI Pro plan.",
              "sourceUrl": "https://support.google.com/googleone/answer/16286513"
            },
            {
              "id": "context-window-gemini-apps",
              "label": "Context window (Gemini Apps)",
              "statement": "Plan Context window ... AI Pro & AI Ultra 1 million tokens",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
            },
            {
              "id": "google-flow-credits-included",
              "label": "Google Flow credits included",
              "statement": "Google Flow 3 - Get 10,000 or 25,000 Google Flow Credits to use across our AI creative studio.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "antigravity-agent-rate-limits-highest-tier",
              "label": "Antigravity agent rate limits (highest tier)",
              "statement": "Ultra 20x: Highest rate limits to agent model in Google Antigravity, our agentic development platform.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "ai-credits-for-extra-usage",
              "label": "AI credits for extra usage",
              "statement": "If you reach your plan's limit, Google AI Pro and Google AI Ultra members can purchase AI credits to get extra usage in Google Flow and Google Antigravity.",
              "sourceUrl": "https://support.google.com/googleone/answer/16286513",
              "topic": "after_limit"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Google does not publish absolute quotas for either Ultra tier; the tiers differ only by the relative multiple (5x vs 20x of AI Pro). Google does not label these tiers with distinct product names on the pricing page beyond the price and multiple.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Google publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            }
          ],
          "modelRules": [
            {
              "model": "gemini-3-1-pro",
              "pricingRef": "gemini-3-1-pro-pricing"
            },
            {
              "model": "gemini-3-flash",
              "pricingRef": "gemini-3-flash-pricing"
            },
            {
              "model": "gemini-3-flash-lite"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-pro"
            },
            {
              "model": "nano-banana-pro"
            }
          ],
          "sources": [
            {
              "url": "https://gemini.google/subscriptions/",
              "title": "Google official page",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.google.com/googleone/answer/16286513",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.google.com/gemini/answer/16275805",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://gemini.google/us/subscriptions/",
              "title": "Google US subscription prices, relative limits and model lineup (3.6 Flash in Free, which paid plans include)",
              "checkedAt": "2026-09-24"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "google-ai-ultra": {
      "id": "google-ai-ultra",
      "role": "plan",
      "name": "Google AI Ultra (5x tier)",
      "providerId": "google",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "99.99",
            "interval": "month"
          },
          "billingMechanics": "Google AI Ultra has a $99.99 per month tier with 5x the AI Pro usage limits. Google also offers a separate $199.99 tier.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "5× AI Pro usage in Gemini and Antigravity. Deep Think access and separate creative-tool allowances.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "gemini-apps-usage-limit-relative-to-google-ai-pr",
              "label": "Gemini Apps usage limit relative to Google AI Pro (5x tier)",
              "statement": "AI Ultra | 5x or 20x higher than AI Pro limits depending on your subscription",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
            },
            {
              "id": "usage-quota-vs-google-ai-pro-google-one-help",
              "label": "Usage quota vs Google AI Pro (Google One help)",
              "statement": "With a Google AI Ultra plan, you get the highest access to Google AI. Based on your specific Google AI Ultra plan, you get 5x or 20x usage quota in Gemini and Google Antigravity compared to the Google AI Pro plan.",
              "sourceUrl": "https://support.google.com/googleone/answer/16286513"
            },
            {
              "id": "context-window-gemini-apps",
              "label": "Context window (Gemini Apps)",
              "statement": "Plan Context window ... AI Pro & AI Ultra 1 million tokens",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
            },
            {
              "id": "deep-think-ai-ultra-only",
              "label": "Deep Think (AI Ultra only)",
              "statement": "Deep think (AI Ultra only) provides maximum parallel reasoning. Deep Think queries generally can take a few minutes before seeing a response. Deep think requires the Pro model.",
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
            },
            {
              "id": "google-flow-credits-included",
              "label": "Google Flow credits included",
              "statement": "Google Flow 3 - Get 10,000 or 25,000 Google Flow Credits to use across our AI creative studio to create cinematic scenes and stories with access to Gemini Omni Flash and custom tool creation.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "ai-credits-for-extra-usage-flow-antigravity-othe",
              "label": "AI credits for extra usage (Flow, Antigravity, other products)",
              "statement": "You can also purchase AI credits with the Google AI Ultra plan, which can be used to extend your usage in Google Flow, Google Antigravity, and other products where AI credits are supported.",
              "sourceUrl": "https://support.google.com/googleone/answer/16286513",
              "topic": "after_limit"
            },
            {
              "id": "jules-and-antigravity-limits-relative-unquantifi",
              "label": "Jules and Antigravity limits (relative, unquantified)",
              "statement": "Jules 9 - Highest limits to our asynchronous coding agent for software developers ... Google Antigravity - Ultra 5x: Higher rate limits to agent model in Google Antigravity, our agentic development platform.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "Ultra's limits are stated only relative to Google AI Pro (5x or 20x), and AI Pro's own limit is stated only relative to the no-plan standard ('4x higher than standard limits'), so no absolute Ultra allowance is published. Deep Think is listed as available only on AI Ultra.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Google publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://gemini.google/subscriptions/"
            }
          ],
          "modelRules": [
            {
              "model": "gemini-3-1-pro",
              "pricingRef": "gemini-3-1-pro-pricing"
            },
            {
              "model": "gemini-3-flash",
              "pricingRef": "gemini-3-flash-pricing"
            },
            {
              "model": "gemini-3-flash-lite"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-pro"
            },
            {
              "model": "nano-banana-pro"
            }
          ],
          "sources": [
            {
              "url": "https://gemini.google/subscriptions/",
              "title": "Google official page",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.google.com/gemini/answer/16275805",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://support.google.com/googleone/answer/16286513",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://gemini.google/us/subscriptions/",
              "title": "Google US subscription prices, relative limits and model lineup (3.6 Flash in Free, which paid plans include)",
              "checkedAt": "2026-09-24"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "kiro-pro": {
      "id": "kiro-pro",
      "role": "plan",
      "name": "Kiro Pro",
      "providerId": "kiro",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "kiro-pro-current-20260927",
          "validity": {
            "start": "2026-09-27T14:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T14:38:00Z",
            "reviewedAt": "2026-09-27T14:38:00Z",
            "catalogActivatedAt": "2026-09-27T14:38:00Z"
          },
          "productId": "kiro-cloud",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "20",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "kiro.dev",
              "sourceUrl": "https://kiro.dev/pricing/",
              "sourceType": "provider_page",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Kiro Pro card",
              "excerpt": "Kiro Pro is offered at review; provider effective date for these terms was not established.",
              "normalizedClaimHash": "sha256:ae85b425cd3bd42ecf34d7add80c2026914633c608557ed08484190acf584666",
              "evidencePackageHash": "sha256:84b5382b654d694144dcb82e280d9f7a61efdb99d9db86d8b2e29e0eddefb5c4",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "kiro.dev",
              "sourceUrl": "https://kiro.dev/pricing/",
              "sourceType": "provider_page",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Kiro Pro price and billing",
              "excerpt": "Kiro Pro costs USD 20 per user per month, excluding applicable taxes.",
              "normalizedClaimHash": "sha256:ff15cc7348f51814ccfa32d00724f6b02dca62a44f9add33bae0400f62afef91",
              "evidencePackageHash": "sha256:2b1bbd5a1961c1b4f3ba69d060782af0920af1190cab116af16c7d5f85598323",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "credits",
              "sourceId": "kiro.dev",
              "sourceUrl": "https://kiro.dev/pricing/",
              "sourceType": "provider_page",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Kiro Pro included credits",
              "excerpt": "Kiro Pro includes 1000 provider credits per month.",
              "normalizedClaimHash": "sha256:8ff314a96382bf25f867edda207d835ca6b828a78c507036bcfa9550689becca",
              "evidencePackageHash": "sha256:12df64cef9b9ef33230a443e7064988a2335a6e208e94363e8266154c970ee96",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "model-access",
              "sourceId": "kiro.dev",
              "sourceUrl": "https://kiro.dev/docs/models/",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Pro column, Claude rows",
              "excerpt": "Kiro Pro offers Claude Sonnet 5 and Claude Haiku 4.5 in US and EU regions.",
              "normalizedClaimHash": "sha256:999962b7cd68a1cc35574769439fa1eede559d9dfefb059870b889a5b12255be",
              "evidencePackageHash": "sha256:0c4ebb4f12d7430d7739e6c37fa7bbc698c9edd93a7ed6dea11f1c0e1295dc04",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "debit",
              "sourceId": "kiro.dev",
              "sourceUrl": "https://kiro.dev/pricing/",
              "sourceType": "provider_page",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "provider_dynamic",
              "locator": "What is a credit",
              "excerpt": "Task credits vary with complexity and model; model multiplier alone does not establish a model-call debit.",
              "normalizedClaimHash": "sha256:b2400897d81305c4004a67c6f6ba0c85cc78af4a95c8f7f61a69646d6551400e",
              "evidencePackageHash": "sha256:178ea737a38d727c412c41102e94074f43ffd8863e8b397d594b730deb8c4fb6",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "kiro.dev",
              "sourceUrl": "https://kiro.dev/pricing/",
              "sourceType": "provider_page",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Add-on credits",
              "excerpt": "Individual paid users can purchase add-on credits at USD 0.04 each; purchased packs are distinct from the base allowance.",
              "normalizedClaimHash": "sha256:cf93780db1dea1564f74616c4a2121e7694c5dc7aa661d4093d238c0d60f5c2f",
              "evidencePackageHash": "sha256:499e8d589c404c0f0c8be9f9b7b6301cf11fb082ea402ffaeaa82fe66f4619e8",
              "reviewer": "Codex C2A manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "supported-region",
              "scope": "plan",
              "kind": "region",
              "value": "US-or-EU",
              "claimRefs": [
                "model-access"
              ]
            },
            {
              "id": "active-kiro-pro",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-subscription",
              "claimRefs": [
                "price"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "kiro-native-included",
              "endpointId": "kiro-native",
              "protocol": "kiro-native",
              "harnessIds": [
                "kiro-ide",
                "kiro-cli"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "claude-haiku-4-5",
                  "claude-sonnet-5"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "model-access"
              ]
            }
          ],
          "continuation": {
            "kind": "purchased_balance",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "included-1000-provider-credits-per-month",
              "claimRefs": [
                "credits"
              ]
            },
            {
              "code": "unknown_debit",
              "subject": "task-credit-debit",
              "claimRefs": [
                "debit"
              ]
            }
          ]
        }
      ]
    },
    "ollama-cloud-max": {
      "id": "ollama-cloud-max",
      "role": "plan",
      "name": "Ollama Cloud Max",
      "providerId": "ollama",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "$300 monthly usage credits at Ollama rates; 10 concurrent requests.",
              "sourceUrl": "https://ollama.com/pricing"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "Ollama",
              "sourceUrl": "https://ollama.com/pricing"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Purchased usage credits fund additional usage. Current credit-based plan; older subscriptions have separate terms.",
              "sourceUrl": "https://ollama.com/pricing",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "glm-5-3"
            },
            {
              "model": "glm-5-3-flash"
            },
            {
              "model": "kimi-k3"
            },
            {
              "model": "kimi-k2-7-code"
            },
            {
              "model": "deepseek-v4-1-flash"
            }
          ],
          "sources": [
            {
              "url": "https://ollama.com/pricing",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "ollama-cloud-pro": {
      "id": "ollama-cloud-pro",
      "role": "plan",
      "name": "Ollama Cloud Pro",
      "providerId": "ollama",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "ollama-cloud-pro-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "ollama-cloud-pro",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "20",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "ollama.com",
              "sourceUrl": "https://ollama.com/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "Ollama Cloud Pro current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:85223b7ea28f637bd413d4279e4124da0e568adff965fc74a3a3170fb7eaf19e",
              "evidencePackageHash": "sha256:7264dc2885a945d9b978af6b7aecdf37c391eb192924a8f00837683e276b28ff",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "ollama.com",
              "sourceUrl": "https://ollama.com/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "Ollama Cloud Pro web individual subscription is USD 20 per month.",
              "normalizedClaimHash": "sha256:ffc7acd5778302820ddc293bb781f4922e6b22db301fd889c0d8038fd1185d79",
              "evidencePackageHash": "sha256:df7dcc2ae5bf5df0efe6eca6439bd4727919b6fcdfc82d40cbf4c76e3b916581",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "ollama.com",
              "sourceUrl": "https://ollama.com/blog/transparent-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active Ollama Cloud Pro includes ollama-cloud-subscription access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:b4dd6467643e49e0aad33e1a385d9bb1feb64518ec18efe1f6a97c032124886b",
              "evidencePackageHash": "sha256:cd5598aa12d60e03fed0ef115eec3c47b9d85270deb80502ae48fed4e15a7745",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "registry.ollama.com",
              "sourceUrl": "https://registry.ollama.com/library/glm-5.3-flash",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for ollama-cloud-subscription: glm-5-3-flash.",
              "normalizedClaimHash": "sha256:a1b9fcff050528f5528d83b1cb32ba848c9839f7338a7d35978c26f5f491876f",
              "evidencePackageHash": "sha256:8b2a7ab30c46c404ba29a12608524f441fdd683ac8d85b9f93aea1da2fcd3ea7",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "ollama.com",
              "sourceUrl": "https://ollama.com/blog/transparent-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Usage or capacity mechanics",
              "excerpt": "New Pro has USD 60 monthly included usage credits at per-token rates with billing-date resets; subscribers can continue after the allowance at the same rate.",
              "normalizedClaimHash": "sha256:4a65788c77a9d443cdd4b89ebc1117c4e9e326c9c1a9a71eb0f250aed76ae6b0",
              "evidencePackageHash": "sha256:917ebe96e49d09fee53e4fb214dd4e4b0dec2f722e99af5c05b9613be15fc90e",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "ollama.com",
              "sourceUrl": "https://ollama.com/blog/transparent-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for Ollama Cloud Pro depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:4a096d404a279bdebda35e0082cf7cead5a606194159ce2fcb17b1bc230a9b58",
              "evidencePackageHash": "sha256:a1c9fae3aab12e3f2bd31ed38c92956d2838d2575433b556dc4444c977bb7ba8",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "cohort",
              "sourceId": "ollama.com",
              "sourceUrl": "https://ollama.com/blog/transparent-pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "New versus legacy plans",
              "excerpt": "New signups use the August 31 2026 token-priced plan; legacy subscribers can remain on prior terms.",
              "normalizedClaimHash": "sha256:9830113830db5858c7655bdd1a549f4b1ab73a7e8184ca51aa0554ab2763b729",
              "evidencePackageHash": "sha256:34a326ff5ad5374abf096754c6c0324a8ed813abe8938497fc38ccd347f1eb54",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-ollama-cloud-pro-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "ollama-cloud-subscription",
              "protocol": "ollama-cloud",
              "harnessIds": [
                "ollama"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "glm-5-3-flash"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "purchased-usage-credit-continuation",
              "claimRefs": [
                "capacity",
                "cohort"
              ]
            }
          ]
        }
      ]
    },
    "openai-api-gpt-5-4-mini": {
      "id": "openai-api-gpt-5-4-mini",
      "role": "plan",
      "name": "OpenAI API: GPT-5.4 Mini",
      "providerId": "openai",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "openai-api-gpt-5-4-mini-current-20260927",
          "validity": {
            "start": "2026-09-27T14:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T14:38:00Z",
            "reviewedAt": "2026-09-27T14:38:00Z",
            "catalogActivatedAt": "2026-09-27T14:38:00Z"
          },
          "productId": "openai-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "current model or pricing listing",
              "excerpt": "Model and listed rates were current at review; provider effective date was not established.",
              "normalizedClaimHash": "sha256:d222a76ab3060b09b5009ad3790fdd732233c7cf842eba8b6bb9e7f877f50813",
              "evidencePackageHash": "sha256:26d35a659591140e12fc1464422992b50640e485d190e91c2854e9aa5011927e",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "API endpoint and model request",
              "excerpt": "Exact gpt-5-4-mini on openai-responses-standard through openai-responses.",
              "normalizedClaimHash": "sha256:58f69830e1db77c77ae50137bdcdfea54d00a62f3291899094d35f683cf5d20e",
              "evidencePackageHash": "sha256:3675003e87541caab7b44f74643d827f2f387fd6959e52816e48e03e6785ebf3",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "rate",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "model price row",
              "excerpt": "USD per 1M standard text input, output and cached-input tokens; regional, batch, fast and tool charges are outside this route.",
              "normalizedClaimHash": "sha256:dfe69957ae09137ca7240a7eac483ff0f65dd5f119c7393a3ceac39302c92d04",
              "evidencePackageHash": "sha256:a591ecc8fe567dd711889202779fd4fb29db1cd5a61ae8b38832c68bdeaedc25",
              "reviewer": "Codex C2A manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "openai-api-gpt-5-4-mini-current-rate",
              "basis": "api_list_price",
              "endpointId": "openai-responses-standard",
              "rateVersion": "current-20260927",
              "denomination": "USD",
              "claimRefs": [
                "rate"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "openai-responses-standard",
              "protocol": "openai-responses",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "gpt-5-4-mini"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ]
    },
    "openai-api-gpt-5-6-sol": {
      "id": "openai-api-gpt-5-6-sol",
      "role": "plan",
      "name": "OpenAI API: GPT-5.6 Sol",
      "providerId": "openai",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "openai-api-gpt-5-6-sol-d0-20260927",
          "validity": {
            "start": "2026-09-27T18:20:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T18:20:00Z",
            "reviewedAt": "2026-09-27T18:20:00Z",
            "catalogActivatedAt": "2026-09-27T18:20:00Z"
          },
          "productId": "openai-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:20:00Z",
              "reviewedAt": "2026-09-27T18:20:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current GPT-5.6 Sol exact model; Responses and Chat Completions endpoints.",
              "normalizedClaimHash": "sha256:a0c142f6204e8dee0a586602a5123f65b3dae0f82477f17f67f6838757324c0f",
              "evidencePackageHash": "sha256:4d02af7f096b1cb323953863f6276d451cdc33790f170d44f1698b6d756adaf9",
              "reviewer": "Codex D0 manual first-party review"
            },
            {
              "id": "route",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:20:00Z",
              "reviewedAt": "2026-09-27T18:20:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Exact gpt-5.6-sol through standard Responses using a separately paid API account.",
              "normalizedClaimHash": "sha256:7d2a263f0bb9d4a7317d608de582a58d47a13039367befb29fe515c45d9b5cc1",
              "evidencePackageHash": "sha256:683ce4ff68540ffcfb95f50ee10068cdfe39a5278f1c79780a37b4ec25fdc9f1",
              "reviewer": "Codex D0 manual first-party review"
            },
            {
              "id": "rate",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:20:00Z",
              "reviewedAt": "2026-09-27T18:20:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Permanent post-promotion prices are not established by this admission; the base rate is explicitly unresolved.",
              "normalizedClaimHash": "sha256:d349d4a0d16784ae22c575bbdd1c4c3e9795cb486ca701612ff51948f3315d1a",
              "evidencePackageHash": "sha256:4415f64144f5cf0bf0dea49fecca950d7a95671f88cc2a328ee279ff043ac47d",
              "reviewer": "Codex D0 manual first-party review"
            },
            {
              "id": "promotion",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:20:00Z",
              "reviewedAt": "2026-09-27T18:20:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Promotional USD/1M input 4, cached input 0.4, writes 5, output 20; full-request above 272K: 8, 0.8, 10, 30. Available at least through 2026-11-21. Catalog review horizon is 2026-10-27, not promotion expiry.",
              "normalizedClaimHash": "sha256:b94058f0ff0255acf2d6af80f1b87de9b202aa2fa39703ce47bd85bb00d7fbff",
              "evidencePackageHash": "sha256:41e0b9e24d5e937e74d26ec61bf97eb915478b09a1f1fef2fde858a975b4be87",
              "reviewer": "Codex D0 manual first-party review"
            },
            {
              "id": "reasoning",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/guides/reasoning",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T18:20:00Z",
              "reviewedAt": "2026-09-27T18:20:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Reasoning tokens are billed as output tokens.",
              "normalizedClaimHash": "sha256:f18a5d67d10bcbc90e9bc33bc9431e7221e2a1b7eafb8e23cc4fc6b303f9ce55",
              "evidencePackageHash": "sha256:2a0eb127136c7241b1c8de1f1ee67393ba95ab5c7174264abee39f8147126afb",
              "reviewer": "Codex D0 manual first-party review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": null,
              "basis": "api_list_price",
              "endpointId": "openai-responses-standard",
              "rateVersion": "current-20260927",
              "denomination": "USD",
              "claimRefs": [
                "rate"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "openai-responses-standard",
              "protocol": "openai-responses",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "gpt-5-6-sol"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ],
      "executionOverlays": [
        {
          "id": "gpt-5-6-sol-promotion-d0",
          "validFrom": "2026-09-27T18:20:00Z",
          "validUntil": "2026-10-27T00:00:00Z",
          "planVersionIds": [
            "openai-api-gpt-5-6-sol-d0-20260927"
          ],
          "requirementIds": [],
          "precedence": 0,
          "claimRefs": [
            "promotion"
          ],
          "modifications": [
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "input",
              "pricingRef": "openai-api-gpt-5-6-sol-promotion-rate",
              "claimRefs": [
                "promotion"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "output",
              "pricingRef": "openai-api-gpt-5-6-sol-promotion-rate",
              "claimRefs": [
                "promotion"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheRead",
              "pricingRef": "openai-api-gpt-5-6-sol-promotion-rate",
              "claimRefs": [
                "promotion"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "cacheWrite",
              "pricingRef": "openai-api-gpt-5-6-sol-promotion-rate",
              "claimRefs": [
                "promotion"
              ]
            },
            {
              "kind": "cash_category_override",
              "rateId": "standard-token-rate",
              "category": "reasoning",
              "pricingRef": "openai-api-gpt-5-6-sol-promotion-rate",
              "claimRefs": [
                "reasoning"
              ]
            }
          ]
        }
      ]
    },
    "openai-api-gpt-6-sol": {
      "id": "openai-api-gpt-6-sol",
      "role": "plan",
      "name": "OpenAI API: GPT-6 Sol",
      "providerId": "openai",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "openai-api-gpt-6-sol-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "openai-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-6-sol",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current model listing",
              "excerpt": "OpenAI API: GPT-6 Sol current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:5c3d7993d6dda2806b52a783dfcb4e1dbdd931871c3cbef05a91bbda2de975e4",
              "evidencePackageHash": "sha256:aeed2093878e5e6a6fded5a2ac1d6f1e671be13fb71f7b5b76bca170c6c70396",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-6-sol",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "API model and endpoint",
              "excerpt": "Exact gpt-6-sol served through openai-responses-standard using openai-responses; separate paid API credentials required.",
              "normalizedClaimHash": "sha256:ac065df3a874a3f6a6df0752256ed855bf192d42fcf26920366d8f3e4412401f",
              "evidencePackageHash": "sha256:c049e65f482a877b254f87ee35f852e97e17c07c3d295945d37b812b15e5602b",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "rate",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-6-sol",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Standard text pricing",
              "excerpt": "USD per 1M token categories {\"cacheRead\": \"0.20\", \"cacheWrite\": \"2.50\", \"input\": \"2\", \"output\": \"10\", \"reasoning\": {\"billedAs\": \"output\"}}; any separate categories or modes remain outside this route.",
              "normalizedClaimHash": "sha256:1ee840f22086e7cbfe91b3a8a5f7b8fa050659ec3d5a2037ecebada78f5ec42f",
              "evidencePackageHash": "sha256:cb287db38a5aaac5365114f7c66e39547f55179c4474bf28b549570dc472982f",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "tier",
              "sourceId": "developers.openai.com",
              "sourceUrl": "https://developers.openai.com/api/docs/models/gpt-6-sol",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Long-context pricing",
              "excerpt": "Above 272000 input tokens, the published long-context rate applies to the whole request.",
              "normalizedClaimHash": "sha256:8070861d733e6901a5fb1064b58738d37508450e215caa9e541ff11a3901b778",
              "evidencePackageHash": "sha256:395b4e1738dd9aa1554831d2a496aa6f66c9ed361104c8fa292962cd7dff01c0",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "openai-api-gpt-6-sol-current-rate",
              "basis": "api_list_price",
              "endpointId": "openai-responses-standard",
              "rateVersion": "current-20260927",
              "denomination": "USD",
              "claimRefs": [
                "rate",
                "tier"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "openai-responses-standard",
              "protocol": "openai-responses",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "gpt-6-sol"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ]
    },
    "openai-chatgpt-business": {
      "id": "openai-chatgpt-business",
      "role": "plan",
      "name": "ChatGPT Business (Standard seat)",
      "providerId": "openai",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "25",
            "interval": "month"
          },
          "billingMechanics": "Price is per seat.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "standard-seat-included-usage-unquantified-5-hour",
              "label": "Standard seat included usage (unquantified) + 5-hour usage limit",
              "statement": "Premium seats cost $100 per user per month when billed annually, or $125 per user per month when billed monthly. Premium includes 5x more usage than Standard seats, no 5-hour usage limit, and the flexibility to mix, assign, and reassign seat types - all within one secure, centrally managed workspace.",
              "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
            },
            {
              "id": "workspace-credits-for-usage-beyond-included-rate",
              "label": "Workspace credits for usage beyond included rate limits",
              "statement": "A ChatGPT Business workspace consists of Standard and Premium seats, which include usage for features such as Codex, reasoning models, and agentic features. When that included usage is exhausted, workspace credits can cover additional eligible usage, subject to your workspace's spend controls.",
              "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
              "topic": "after_limit"
            },
            {
              "id": "monthly-credit-usage-limits-per-seat-type-spend-",
              "label": "Monthly credit usage limits per seat type (spend controls)",
              "statement": "Workspace owners and admins can manage monthly credit usage limits by seat type and per-user overrides. ... Set monthly credit usage limits for Standard and Premium seats to manage additional usage beyond each member's included allowance. ... By default, all seats and users have no limits specified.",
              "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business"
            },
            {
              "id": "maximum-paid-seats-per-business-subscription",
              "label": "Maximum paid seats per Business subscription",
              "statement": "Starting on Aug 24, 2026, the maximum is 200 paid Standard and Premium seats total per ChatGPT Business subscription. Our support team is unable to change your maximum seat limit. If you need a larger number of seats, consider ChatGPT Enterprise.",
              "sourceUrl": "https://help.openai.com/en/articles/8801848"
            },
            {
              "id": "minimum-paid-seats",
              "label": "Minimum paid seats",
              "statement": "A workspace requires at least two paid seats, which can be any combination of Standard and Premium seats.",
              "sourceUrl": "https://help.openai.com/en/articles/8801848"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "OpenAI does not quantify the 'included usage' or 'included rate limits' for Business seats, and states there is 'no single credit or dollar equivalent for Premium's included usage'. The Premium seat is a second price point on the same plan; the Standard-seat price is recorded here as priceAmount and the Premium price is documented in notes/limits.",
              "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/8792828-chatgpt-business",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://help.openai.com/en/articles/8801848",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "25",
            "interval": "month"
          },
          "billingMechanics": "Price is per seat.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "Managed workspace with Standard and Premium seats, included agentic usage and optional workspace credits. Two paid seats minimum.",
              "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
            },
            {
              "id": "standard-seat-included-usage-unquantified-5-hour",
              "label": "Standard seat included usage (unquantified) + 5-hour usage limit",
              "statement": "Premium seats cost $100 per user per month when billed annually, or $125 per user per month when billed monthly. Premium includes 5x more usage than Standard seats, no 5-hour usage limit, and the flexibility to mix, assign, and reassign seat types - all within one secure, centrally managed workspace.",
              "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
            },
            {
              "id": "workspace-credits-for-usage-beyond-included-rate",
              "label": "Workspace credits for usage beyond included rate limits",
              "statement": "A ChatGPT Business workspace consists of Standard and Premium seats, which include usage for features such as Codex, reasoning models, and agentic features. When that included usage is exhausted, workspace credits can cover additional eligible usage, subject to your workspace's spend controls.",
              "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
              "topic": "after_limit"
            },
            {
              "id": "monthly-credit-usage-limits-per-seat-type-spend-",
              "label": "Monthly credit usage limits per seat type (spend controls)",
              "statement": "Workspace owners and admins can manage monthly credit usage limits by seat type and per-user overrides. ... Set monthly credit usage limits for Standard and Premium seats to manage additional usage beyond each member's included allowance. ... By default, all seats and users have no limits specified.",
              "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business"
            },
            {
              "id": "maximum-paid-seats-per-business-subscription",
              "label": "Maximum paid seats per Business subscription",
              "statement": "Starting on Aug 24, 2026, the maximum is 200 paid Standard and Premium seats total per ChatGPT Business subscription. Our support team is unable to change your maximum seat limit. If you need a larger number of seats, consider ChatGPT Enterprise.",
              "sourceUrl": "https://help.openai.com/en/articles/8801848"
            },
            {
              "id": "minimum-paid-seats",
              "label": "Minimum paid seats",
              "statement": "A workspace requires at least two paid seats, which can be any combination of Standard and Premium seats.",
              "sourceUrl": "https://help.openai.com/en/articles/8801848"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "OpenAI does not quantify the 'included usage' or 'included rate limits' for Business seats, and states there is 'no single credit or dollar equivalent for Premium's included usage'. The Premium seat is a second price point on the same plan; the Standard-seat price is recorded here as priceAmount and the Premium price is documented in notes/limits.",
              "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/8792828-chatgpt-business",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://help.openai.com/en/articles/8801848",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
              "title": "OpenAI model launch and paid plan availability",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://chatgpt.com/pricing/",
              "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "openai-chatgpt-plus": {
      "id": "openai-chatgpt-plus",
      "role": "plan",
      "name": "ChatGPT Plus",
      "providerId": "openai",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "ChatGPT Plus costs $20 per month, billed monthly. OpenAI does not offer annual billing for this plan.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "message-caps-on-plus-unquantified",
              "label": "Message caps on Plus (unquantified)",
              "statement": "To ensure a smooth experience for all users, Plus subscriptions may include usage limits such as message caps, especially during high demand. These limits may vary based on system conditions.",
              "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
            },
            {
              "id": "higher-model-limits-than-free",
              "label": "Higher model limits than Free",
              "statement": "Higher model limits: Use more messages and broader model options than on the Free plan. Model availability changes during rollouts; use the model picker for current access.",
              "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
            },
            {
              "id": "shared-work-codex-5-hour-and-weekly-allowances",
              "label": "Shared Work/Codex 5-hour and weekly allowances",
              "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage.",
              "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
            },
            {
              "id": "usage-credits-pay-as-you-go-overage-for-codex-wo",
              "label": "Usage credits (pay-as-you-go overage for Codex/Work)",
              "statement": "Credits let you continue using eligible features after reaching your plan's included limits. Supported features include Codex, ChatGPT Work, Word, Excel, and PowerPoint, depending on your plan and account. Your plan's included usage is used first. After you hit plan limits, usage draws from your credit balance.",
              "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
              "topic": "after_limit"
            },
            {
              "id": "support-cannot-reset-limits",
              "label": "Support cannot reset limits",
              "statement": "No. OpenAI Support does not reset ChatGPT or Codex usage limits. If you reach a limit, wait until it resets or use another available option shown in your account.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "OpenAI does not publish numeric message caps for Plus. The help center says only that limits 'may vary based on system conditions'. The Codex/Work allowance is described as shared across features but is not quantified on any official page I could read; the pricing page's price and limit widgets did not render values in my browser session (client-side gated), so all OpenAI prices here come from help.openai.com articles.",
              "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "ChatGPT Plus costs $20 per month, billed monthly. OpenAI does not offer annual billing for this plan.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "ChatGPT, Codex and Work. Shared agentic usage with five-hour and weekly limits; optional paid credits.",
              "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
            },
            {
              "id": "message-caps-on-plus-unquantified",
              "label": "Message caps on Plus (unquantified)",
              "statement": "To ensure a smooth experience for all users, Plus subscriptions may include usage limits such as message caps, especially during high demand. These limits may vary based on system conditions.",
              "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
            },
            {
              "id": "higher-model-limits-than-free",
              "label": "Higher model limits than Free",
              "statement": "Higher model limits: Use more messages and broader model options than on the Free plan. Model availability changes during rollouts; use the model picker for current access.",
              "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
            },
            {
              "id": "shared-work-codex-5-hour-and-weekly-allowances",
              "label": "Shared Work/Codex 5-hour and weekly allowances",
              "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage.",
              "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
            },
            {
              "id": "usage-credits-pay-as-you-go-overage-for-codex-wo",
              "label": "Usage credits (pay-as-you-go overage for Codex/Work)",
              "statement": "Credits let you continue using eligible features after reaching your plan's included limits. Supported features include Codex, ChatGPT Work, Word, Excel, and PowerPoint, depending on your plan and account. Your plan's included usage is used first. After you hit plan limits, usage draws from your credit balance.",
              "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
              "topic": "after_limit"
            },
            {
              "id": "support-cannot-reset-limits",
              "label": "Support cannot reset limits",
              "statement": "No. OpenAI Support does not reset ChatGPT or Codex usage limits. If you reach a limit, wait until it resets or use another available option shown in your account.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "OpenAI does not publish numeric message caps for Plus. The help center says only that limits 'may vary based on system conditions'. The Codex/Work allowance is described as shared across features but is not quantified on any official page I could read; the pricing page's price and limit widgets did not render values in my browser session (client-side gated), so all OpenAI prices here come from help.openai.com articles.",
              "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
              "title": "OpenAI model launch and paid plan availability",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://chatgpt.com/pricing/",
              "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "openai-chatgpt-plus-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "chatgpt-plus",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "20",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "ChatGPT Plus with Codex current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:d4ba2ddc4d874a05f3520a0ee43bc961b513aa5b0e273c3f4c22fc1d73546a13",
              "evidencePackageHash": "sha256:163255f739327e177b8e75c137eda3aecb08fad3f36f17167c1bb22e6cfd8b2a",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "ChatGPT Plus with Codex web individual subscription is USD 20 per month.",
              "normalizedClaimHash": "sha256:b2d5331a91be8cb8a21b05a4fb0ff47b00ed9e8497ea84a95215c90bfcfdc753",
              "evidencePackageHash": "sha256:0a485266aec45e286411092ce065fefb5a2e4d13fc9201b3d3f1f5ab57a964e2",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active ChatGPT Plus with Codex includes openai-codex-subscription access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:ddebe2f76cb16f24b0f1bbecb1c6d5806c064b7be93924e902406111cd367315",
              "evidencePackageHash": "sha256:8b0875c2f4a297ce16e23549f5578610190b6ec43b98d348a3af38f240cfbf52",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for openai-codex-subscription: gpt-6-sol, gpt-6-luna.",
              "normalizedClaimHash": "sha256:8a019b1efbc6cf20af83ee93af2d3d14f0b5c35656466bb0c8de313172f9ed0f",
              "evidencePackageHash": "sha256:d66e8b2bedef134080c991c05867856f6cfe3717414e40db739d0a0b7e806652",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "provider_dynamic",
              "locator": "Usage or capacity mechanics",
              "excerpt": "Codex and ChatGPT Work share usage; task size and model selection alter usage, with no published deterministic model-call allowance.",
              "normalizedClaimHash": "sha256:732d33357a8e6e869c494aa92da1bdea67e3aaedd8b79934dc34643d29551242",
              "evidencePackageHash": "sha256:d8d01f20e418553c0f586875acf3012def7a14f62ab1146afcaa6657523e53b1",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for ChatGPT Plus with Codex depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:49366acc48780ab4b8755f440e4dbdb6b62c7eb8f1a17491504fe3d93b1b0b2b",
              "evidencePackageHash": "sha256:d61c070e0449083b7b595f49929c0ab0843947d164c55db1a62eea52f7e7c939",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-openai-chatgpt-plus-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "openai-codex-subscription",
              "protocol": "codex-login",
              "harnessIds": [
                "codex"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "gpt-6-sol",
                  "gpt-6-luna"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "shared-dynamic-codex-allowance",
              "claimRefs": [
                "capacity"
              ]
            }
          ]
        }
      ]
    },
    "openai-chatgpt-pro-20x": {
      "id": "openai-chatgpt-pro-20x",
      "role": "plan",
      "name": "ChatGPT Pro $200 (Pro 20x tier)",
      "providerId": "openai",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "200",
            "interval": "month"
          },
          "billingMechanics": "Included as a separate entry because ChatGPT Pro has two official price points and usage allowances under one plan name.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "pro-200-usage-relative-to-plus",
              "label": "Pro $200 usage relative to Plus",
              "statement": "Pro $200 unlocks 20x usage than Plus.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "per-model-usage-allowances-temporary-model-unava",
              "label": "Per-model usage allowances (temporary model unavailability)",
              "statement": "When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "topic": "after_limit"
            },
            {
              "id": "new-sign-ups-and-upgrades-paused",
              "label": "New sign-ups and upgrades paused",
              "statement": "New sign-ups and upgrades to the ChatGPT Pro $200 plan are temporarily paused. Existing Pro $200 subscriptions will continue to renew as usual.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "The $200 tier cannot currently be purchased by new customers (pause since 2026-09-10), so its price is documented but not generally purchasable today. No numeric allowance published; 20x is relative to Plus, whose allowance is unquantified.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "200",
            "interval": "month"
          },
          "billingMechanics": "Included as a separate entry because ChatGPT Pro has two official price points and usage allowances under one plan name.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "20× Plus usage. Existing subscriptions renew; new sign-ups and upgrades are currently paused.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "ChatGPT · Codex · ChatGPT Work",
              "sourceUrl": "https://openai.com/index/gpt-5-6/"
            },
            {
              "id": "pro-200-usage-relative-to-plus",
              "label": "Pro $200 usage relative to Plus",
              "statement": "Pro $200 unlocks 20x usage than Plus.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "per-model-usage-allowances-temporary-model-unava",
              "label": "Per-model usage allowances (temporary model unavailability)",
              "statement": "When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "topic": "after_limit"
            },
            {
              "id": "new-sign-ups-and-upgrades-paused",
              "label": "New sign-ups and upgrades paused",
              "statement": "New sign-ups and upgrades to the ChatGPT Pro $200 plan are temporarily paused. Existing Pro $200 subscriptions will continue to renew as usual.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "The $200 tier cannot currently be purchased by new customers (pause since 2026-09-10), so its price is documented but not generally purchasable today. No numeric allowance published; 20x is relative to Plus, whose allowance is unquantified.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
              "title": "OpenAI model launch and paid plan availability",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://chatgpt.com/pricing/",
              "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ]
    },
    "openai-chatgpt-pro": {
      "id": "openai-chatgpt-pro",
      "role": "plan",
      "name": "ChatGPT Pro ($100 / Pro 5x tier)",
      "providerId": "openai",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "effectiveTo": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "ChatGPT Pro has two price tiers. The $100 tier offers 5x the Plus usage allowance; the $200 tier offers 20x.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "pro-100-usage-relative-to-plus",
              "label": "Pro $100 usage relative to Plus",
              "statement": "Both Pro tiers include the same core capabilities. The main difference is usage allowance: Pro $100 unlocks 5x higher usage than Plus, while Pro $200 unlocks 20x usage than Plus.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "per-model-usage-allowances-temporary-model-unava",
              "label": "Per-model usage allowances (temporary model unavailability)",
              "statement": "Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier. The $100 Pro tier includes lower usage allowances than the $200 Pro tier. When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available. Reaching a model's allowance does not by itself mean that your account was restricted or that your subscription ended. You can use another available model or wait until the displayed reset time. There is no setting to increase or bypass a model's usage allowance.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "topic": "after_limit"
            },
            {
              "id": "5-hour-and-weekly-codex-work-allowances",
              "label": "5-hour and weekly Codex/Work allowances",
              "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage. It pulls your normal weekly allowance forward rather than adding a separate usage entitlement.",
              "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
            },
            {
              "id": "paid-instant-weekly-reset-plus-and-pro-only",
              "label": "Paid instant weekly reset (Plus and Pro only)",
              "statement": "Buying a reset is available to eligible ChatGPT Plus and Pro personal accounts on ChatGPT web and the Codex desktop app. It is not available on Free, Go, Business, Enterprise, or Edu plans.",
              "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
            },
            {
              "id": "usage-credits-pay-as-you-go-overage",
              "label": "Usage credits (pay-as-you-go overage)",
              "statement": "For Plus and Pro, Codex, ChatGPT Work, Excel, and PowerPoint can share the same agentic usage allowance when those features are available on your plan.",
              "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans"
            },
            {
              "id": "pro-200-new-signup-pause-as-of-2026-09-10",
              "label": "Pro $200 new-signup pause (as of 2026-09-10)",
              "statement": "As of September 10, 2026, we're temporarily pausing new sign-ups and upgrades to the ChatGPT Pro $200 plan (Pro 20X). This includes sign-ups and upgrades from Free, Go, Plus, or Pro $100. Existing ChatGPT Pro $200 subscriptions and new or existing ChatGPT Pro $100 subscriptions are not affected by this pause.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "OpenAI publishes no numeric allowance for Pro; usage is given only as a multiple of Plus ('5x higher usage than Plus'), and Plus's own allowance is unquantified. 'Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier.'",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        },
        {
          "effectiveFrom": "2026-09-22",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "ChatGPT Pro has two price tiers. The $100 tier offers 5x the Plus usage allowance; the $200 tier offers 20x.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage-summary",
              "label": "Included usage",
              "statement": "5× Plus usage. ChatGPT, Codex and Work, with model-specific allowances and optional paid credits.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "pro-100-usage-relative-to-plus",
              "label": "Pro $100 usage relative to Plus",
              "statement": "Both Pro tiers include the same core capabilities. The main difference is usage allowance: Pro $100 unlocks 5x higher usage than Plus, while Pro $200 unlocks 20x usage than Plus.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "per-model-usage-allowances-temporary-model-unava",
              "label": "Per-model usage allowances (temporary model unavailability)",
              "statement": "Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier. The $100 Pro tier includes lower usage allowances than the $200 Pro tier. When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available. Reaching a model's allowance does not by itself mean that your account was restricted or that your subscription ended. You can use another available model or wait until the displayed reset time. There is no setting to increase or bypass a model's usage allowance.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "topic": "after_limit"
            },
            {
              "id": "5-hour-and-weekly-codex-work-allowances",
              "label": "5-hour and weekly Codex/Work allowances",
              "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage. It pulls your normal weekly allowance forward rather than adding a separate usage entitlement.",
              "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
            },
            {
              "id": "paid-instant-weekly-reset-plus-and-pro-only",
              "label": "Paid instant weekly reset (Plus and Pro only)",
              "statement": "Buying a reset is available to eligible ChatGPT Plus and Pro personal accounts on ChatGPT web and the Codex desktop app. It is not available on Free, Go, Business, Enterprise, or Edu plans.",
              "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
            },
            {
              "id": "usage-credits-pay-as-you-go-overage",
              "label": "Usage credits (pay-as-you-go overage)",
              "statement": "For Plus and Pro, Codex, ChatGPT Work, Excel, and PowerPoint can share the same agentic usage allowance when those features are available on your plan.",
              "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans"
            },
            {
              "id": "pro-200-new-signup-pause-as-of-2026-09-10",
              "label": "Pro $200 new-signup pause (as of 2026-09-10)",
              "statement": "As of September 10, 2026, we're temporarily pausing new sign-ups and upgrades to the ChatGPT Pro $200 plan (Pro 20X). This includes sign-ups and upgrades from Free, Go, Plus, or Pro $100. Existing ChatGPT Pro $200 subscriptions and new or existing ChatGPT Pro $100 subscriptions are not affected by this pause.",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "what-the-provider-does-not-publish",
              "label": "What the provider does not publish",
              "statement": "OpenAI publishes no numeric allowance for Pro; usage is given only as a multiple of Plus ('5x higher usage than Plus'), and Plus's own allowance is unquantified. 'Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier.'",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://openai.com/chatgpt/pricing/"
            }
          ],
          "modelRules": [
            {
              "model": "gpt-6-luna",
              "pricingRef": "gpt-6-luna-pricing"
            },
            {
              "model": "gpt-6-sol",
              "pricingRef": "gpt-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-luna",
              "pricingRef": "gpt-5-6-luna-pricing"
            },
            {
              "model": "gpt-5-6-sol",
              "pricingRef": "gpt-5-6-sol-pricing"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra",
              "pricingRef": "gpt-5-6-terra-pricing"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra",
              "pricingRef": "gpt-6-astra-pricing"
            }
          ],
          "sources": [
            {
              "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
              "title": "OpenAI plan documentation (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://openai.com/chatgpt/pricing/",
              "title": "OpenAI pricing (official)",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
              "title": "OpenAI model launch and paid plan availability",
              "checkedAt": "2026-09-23"
            },
            {
              "url": "https://chatgpt.com/pricing/",
              "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
              "checkedAt": "2026-09-23"
            }
          ],
          "lastVerifiedAt": "2026-09-23",
          "verificationStatus": "verified"
        }
      ],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "openai-chatgpt-pro-current-20260927",
          "validity": {
            "start": "2026-09-27T17:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T17:38:00Z",
            "reviewedAt": "2026-09-27T17:38:00Z",
            "catalogActivatedAt": "2026-09-27T17:38:00Z"
          },
          "productId": "chatgpt-pro-100",
          "purchase": {
            "kind": "subscription",
            "term": "month",
            "fixedUsd": "100",
            "claimRefs": [
              "price"
            ]
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "help.openai.com",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro/",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Current plan listing",
              "excerpt": "ChatGPT Pro $100 with Codex current at review; historical effective date not established.",
              "normalizedClaimHash": "sha256:07739df8ba3f026061f6773b633a953d8142cc648895aa6faa6ab496bbb09e97",
              "evidencePackageHash": "sha256:0d0f77ba99eacdb9fe54aecaadf163b9fb7406a9ab3b62efb2d935352fef4965",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "price",
              "sourceId": "help.openai.com",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro/",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Monthly price",
              "excerpt": "ChatGPT Pro $100 with Codex web individual subscription is USD 100 per month.",
              "normalizedClaimHash": "sha256:9a54ba717c3090ff9c434ce473a368f55647589a78f16d7ea9dd6c88bcc856a3",
              "evidencePackageHash": "sha256:1dde50cc56f632376958b1abebe321068f9c8b0f1188b3a9cb2941646d9f68b4",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Execution entitlement",
              "excerpt": "Active ChatGPT Pro $100 with Codex includes openai-codex-subscription access; this is not a direct API entitlement.",
              "normalizedClaimHash": "sha256:00b6b9bd6ee8b751722264238ad6fcde9fad8a6c65f8a731a45d75142e00560b",
              "evidencePackageHash": "sha256:3ca32021642fe5ebb02ff225cfd9de25f0144f4d70d5aff77ca945cf0a21f4ba",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "models",
              "sourceId": "learn.chatgpt.com",
              "sourceUrl": "https://learn.chatgpt.com/docs/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "Supported model access",
              "excerpt": "Exact canonical models established for openai-codex-subscription: gpt-6-sol, gpt-6-luna.",
              "normalizedClaimHash": "sha256:8a019b1efbc6cf20af83ee93af2d3d14f0b5c35656466bb0c8de313172f9ed0f",
              "evidencePackageHash": "sha256:d66e8b2bedef134080c991c05867856f6cfe3717414e40db739d0a0b7e806652",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "capacity",
              "sourceId": "help.openai.com",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro/",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_relative_limit",
              "locator": "Usage or capacity mechanics",
              "excerpt": "Pro $100 is currently purchasable and offers five times Plus usage, but per-model and shared Codex limits are dynamic and unquantified.",
              "normalizedClaimHash": "sha256:a99148908ae697852ae4ae1b8b370f87aed0dd1dac3b019265b125ce717e8d21",
              "evidencePackageHash": "sha256:f25ccdf22c057273f05deab776a113544a8268e2b37a79af5968881aeec9026e",
              "reviewer": "Codex C2B manual official-source review"
            },
            {
              "id": "continuation",
              "sourceId": "help.openai.com",
              "sourceUrl": "https://help.openai.com/en/articles/9793128-what-is-chatgpt-pro/",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T17:38:00Z",
              "reviewedAt": "2026-09-27T17:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "reviewer",
              "certainty": "inferred",
              "locator": "After allowance",
              "excerpt": "Continuation for ChatGPT Pro $100 with Codex depends on optional purchase, changing limits, or account state and is not established for deterministic replay.",
              "normalizedClaimHash": "sha256:9570d6d358312c320e1732da8c1b71ea8e349bbcb6f4c6e4412af8811001213e",
              "evidencePackageHash": "sha256:21e43bb56fbefed6d5da3b651ab4548e6baa3d077740d876f12dde58418c4794",
              "reviewer": "Codex C2B manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "active-subscription",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-openai-chatgpt-pro-monthly-web",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "included-access",
              "endpointId": "openai-codex-subscription",
              "protocol": "codex-login",
              "harnessIds": [
                "codex"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "gpt-6-sol",
                  "gpt-6-luna"
                ]
              },
              "debitIds": [],
              "requirementIds": [],
              "claimRefs": [
                "route",
                "models"
              ]
            }
          ],
          "continuation": {
            "kind": "unknown",
            "claimRefs": [
              "continuation"
            ]
          },
          "capabilities": [
            {
              "code": "opaque_capacity",
              "subject": "relative-shared-codex-allowance",
              "claimRefs": [
                "capacity"
              ]
            }
          ]
        }
      ]
    },
    "opencode-go-plus": {
      "id": "opencode-go-plus",
      "role": "plan",
      "name": "OpenCode Go Plus",
      "providerId": "opencode",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "40",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "Model-dependent monthly allowances, with five-hour and weekly limits.",
              "sourceUrl": "https://opencode.ai/v2/docs/console/go"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "OpenCode · Claude Code · Codex · Hermes",
              "sourceUrl": "https://opencode.ai/v2/docs/console/go"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Optional Zen balance can fund usage after the included limit; free models remain available.",
              "sourceUrl": "https://opencode.ai/v2/docs/console/go",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "glm-5-3"
            },
            {
              "model": "glm-5-3-flash"
            },
            {
              "model": "kimi-k3"
            },
            {
              "model": "kimi-k2-7-code"
            },
            {
              "model": "deepseek-v4-1-flash"
            },
            {
              "model": "gpt-6-luna"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "grok-4-6"
            },
            {
              "model": "grok-4-7"
            }
          ],
          "sources": [
            {
              "url": "https://opencode.ai/v2/docs/console/go",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "opencode-go": {
      "id": "opencode-go",
      "role": "plan",
      "name": "OpenCode Go",
      "providerId": "opencode",
      "versions": [
        {
          "effectiveFrom": "2026-09-28",
          "price": {
            "currency": "USD",
            "amount": "10",
            "interval": "month"
          },
          "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-usage",
              "label": "Included usage",
              "statement": "Model-dependent monthly allowances, with five-hour and weekly limits.",
              "sourceUrl": "https://opencode.ai/v2/docs/console/go"
            },
            {
              "id": "compatible-tools",
              "label": "Compatible tools",
              "statement": "OpenCode · Claude Code · Codex · Hermes",
              "sourceUrl": "https://opencode.ai/v2/docs/console/go"
            },
            {
              "id": "after-limit",
              "label": "After the limit",
              "statement": "Optional Zen balance can fund usage after the included limit; free models remain available.",
              "sourceUrl": "https://opencode.ai/v2/docs/console/go",
              "topic": "after_limit"
            }
          ],
          "modelRules": [
            {
              "model": "glm-5-3"
            },
            {
              "model": "glm-5-3-flash"
            },
            {
              "model": "kimi-k3"
            },
            {
              "model": "kimi-k2-7-code"
            },
            {
              "model": "deepseek-v4-1-flash"
            },
            {
              "model": "gpt-6-luna"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "grok-4-6"
            },
            {
              "model": "grok-4-7"
            }
          ],
          "sources": [
            {
              "url": "https://opencode.ai/v2/docs/console/go",
              "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
              "checkedAt": "2026-09-28"
            }
          ],
          "lastVerifiedAt": "2026-09-28",
          "verificationStatus": "verified"
        }
      ]
    },
    "z-ai-api-glm-5-3-flash": {
      "id": "z-ai-api-glm-5-3-flash",
      "role": "plan",
      "name": "Z.AI API: GLM-5.3-Flash",
      "providerId": "z-ai",
      "versions": [],
      "executionVersions": [
        {
          "schemaVersion": 1,
          "id": "z-ai-api-glm-5-3-flash-current-20260927",
          "validity": {
            "start": "2026-09-27T14:38:00Z",
            "end": "2026-10-27T00:00:00Z",
            "basis": "current-market",
            "claimRefs": [
              "current"
            ]
          },
          "publication": {
            "observedAt": "2026-09-27T14:38:00Z",
            "reviewedAt": "2026-09-27T14:38:00Z",
            "catalogActivatedAt": "2026-09-27T14:38:00Z"
          },
          "productId": "z-ai-direct-api",
          "purchase": {
            "kind": "api"
          },
          "claims": [
            {
              "id": "current",
              "sourceId": "docs.z.ai",
              "sourceUrl": "https://docs.z.ai/guides/overview/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "current model or pricing listing",
              "excerpt": "Model and listed rates were current at review; provider effective date was not established.",
              "normalizedClaimHash": "sha256:d222a76ab3060b09b5009ad3790fdd732233c7cf842eba8b6bb9e7f877f50813",
              "evidencePackageHash": "sha256:b6d0176a7ff970a9f39c4d9a985aa8ac2c74caaf7b32f86e49072cfe99ccafda",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "route",
              "sourceId": "docs.z.ai",
              "sourceUrl": "https://docs.z.ai/guides/develop/http/introduction",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "API endpoint and model request",
              "excerpt": "Exact glm-5-3-flash on z-ai-chat-completions through openai-chat-completions-compatible.",
              "normalizedClaimHash": "sha256:084ac72c6e105de0345bdde49c18ca7c9fbaaa907ec5985be49535c1e26e25a9",
              "evidencePackageHash": "sha256:f05d09cf0d6ca918b5d985fc1f8311f5827e57300cf420115e697d8ebacca691",
              "reviewer": "Codex C2A manual official-source review"
            },
            {
              "id": "rate",
              "sourceId": "docs.z.ai",
              "sourceUrl": "https://docs.z.ai/guides/overview/pricing",
              "sourceType": "provider_docs",
              "observedAt": "2026-09-27T14:38:00Z",
              "reviewedAt": "2026-09-27T14:38:00Z",
              "effectiveDateBasis": "catalog_activation",
              "authority": "provider",
              "certainty": "published_deterministic",
              "locator": "model price row",
              "excerpt": "USD per 1M uncached input, output and cached-input tokens. Cached-input storage promotion is omitted; cache-write and reasoning billing are unresolved.",
              "normalizedClaimHash": "sha256:8a5c6f6929cc6ef5ed372157a6d75062acfe3d4d2fb7d844d7b8ba8da6f89e2b",
              "evidencePackageHash": "sha256:ee4ac294e9b0bf37792ddd3b7846341e2bbf78974f337db95611d92af172231f",
              "reviewer": "Codex C2A manual official-source review"
            }
          ],
          "requirements": [
            {
              "id": "paid-api-account",
              "scope": "plan",
              "kind": "purchase_state",
              "value": "active-paid-api-credentials",
              "claimRefs": [
                "route"
              ]
            }
          ],
          "groups": [],
          "rates": [
            {
              "id": "standard-token-rate",
              "pricingRef": "z-ai-api-glm-5-3-flash-current-rate",
              "basis": "api_list_price",
              "endpointId": "z-ai-chat-completions",
              "rateVersion": "current-20260927",
              "denomination": "USD",
              "claimRefs": [
                "rate"
              ]
            }
          ],
          "meters": [],
          "pools": [],
          "debits": [],
          "windows": [],
          "constraints": [],
          "routes": [
            {
              "id": "direct-standard",
              "endpointId": "z-ai-chat-completions",
              "protocol": "openai-chat-completions-compatible",
              "harnessIds": [
                "direct-http"
              ],
              "models": {
                "kind": "exact",
                "modelIds": [
                  "glm-5-3-flash"
                ]
              },
              "debitIds": [],
              "cash": {
                "rateId": "standard-token-rate",
                "cashRateFactor": "1"
              },
              "requirementIds": [],
              "claimRefs": [
                "route"
              ]
            }
          ],
          "continuation": {
            "kind": "hard_stop",
            "claimRefs": [
              "route"
            ]
          },
          "capabilities": []
        }
      ]
    }
  },
  "planVersions": {
    "anthropic-claude-max-20x@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "200",
        "interval": "month"
      },
      "billingMechanics": "Official pricing: 'Max 20x : $200 per month'.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "per-session-usage-allowance-multiple-of-pro",
          "label": "Per-session usage allowance (multiple of Pro)",
          "statement": "Max 20x includes 20 times the Pro plan's per-session usage allowance. This tier is ideal for daily users who collaborate often with Claude for most tasks.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "session-usage-limit-reset",
          "label": "Session usage limit reset",
          "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "weekly-usage-limit-across-all-models",
          "label": "Weekly usage limit across all models",
          "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "fable-model-share-of-weekly-usage-limits",
          "label": "Fable model share of weekly usage limits",
          "statement": "You can use up to 50% of your weekly usage limits on Fable models at no extra cost.",
          "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
        },
        {
          "id": "discretionary-weekly-monthly-caps-and-model-or-f",
          "label": "Discretionary weekly/monthly caps and model or feature usage limits",
          "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "usage-credits-opt-in-pay-as-you-go-overage",
          "label": "Usage credits (opt-in pay-as-you-go overage)",
          "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "topic": "after_limit"
        },
        {
          "id": "usage-credit-daily-redemption-limit",
          "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
          "statement": "There is a daily redemption limit of $2000.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
          "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
          "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Same as Max 5x: no absolute numeric allowance published; only the 20x multiple relative to Pro, whose own allowance is unquantified.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://claude.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable",
          "excluded": true
        },
        {
          "model": "claude-haiku"
        },
        {
          "model": "claude-opus"
        },
        {
          "model": "claude-sonnet"
        }
      ],
      "sources": [
        {
          "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "anthropic-claude-max-20x@2026-09-21",
      "planId": "anthropic-claude-max-20x",
      "planName": "Claude Max 20x",
      "providerId": "anthropic"
    },
    "anthropic-claude-max-20x@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "200",
        "interval": "month"
      },
      "billingMechanics": "Official pricing: 'Max 20x : $200 per month'.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "20× Pro’s per-session allowance, with five-hour and weekly limits. Claude Code included.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "per-session-usage-allowance-multiple-of-pro",
          "label": "Per-session usage allowance (multiple of Pro)",
          "statement": "Max 20x includes 20 times the Pro plan's per-session usage allowance. This tier is ideal for daily users who collaborate often with Claude for most tasks.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "session-usage-limit-reset",
          "label": "Session usage limit reset",
          "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "weekly-usage-limit-across-all-models",
          "label": "Weekly usage limit across all models",
          "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "fable-model-share-of-weekly-usage-limits",
          "label": "Fable model share of weekly usage limits",
          "statement": "You can use up to 50% of your weekly usage limits on Fable models at no extra cost.",
          "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
        },
        {
          "id": "discretionary-weekly-monthly-caps-and-model-or-f",
          "label": "Discretionary weekly/monthly caps and model or feature usage limits",
          "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "usage-credits-opt-in-pay-as-you-go-overage",
          "label": "Usage credits (opt-in pay-as-you-go overage)",
          "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "topic": "after_limit"
        },
        {
          "id": "usage-credit-daily-redemption-limit",
          "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
          "statement": "There is a daily redemption limit of $2000.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
          "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
          "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Same as Max 5x: no absolute numeric allowance published; only the 20x multiple relative to Pro, whose own allowance is unquantified.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://claude.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-pricing"
        },
        {
          "model": "claude-fable-5"
        },
        {
          "model": "claude-fable-5-1"
        },
        {
          "model": "claude-haiku-4-5"
        },
        {
          "model": "claude-opus-4-7"
        },
        {
          "model": "claude-opus-4-8"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6"
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "claude-fable",
          "excluded": true
        },
        {
          "model": "claude-haiku"
        },
        {
          "model": "claude-opus"
        },
        {
          "model": "claude-sonnet"
        }
      ],
      "sources": [
        {
          "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://claude.com/blog/what-a-task-costs-on-opus-5-5",
          "title": "Anthropic Opus 5.5 availability on Pro and Max",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/11940350-claude-code-model-configuration",
          "title": "Anthropic Claude Code supported model IDs",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "anthropic-claude-max-20x@2026-09-22",
      "planId": "anthropic-claude-max-20x",
      "planName": "Claude Max 20x",
      "providerId": "anthropic"
    },
    "anthropic-claude-max-5x@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "Official pricing: 'Max 5x : $100 per month'.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "per-session-usage-allowance-multiple-of-pro",
          "label": "Per-session usage allowance (multiple of Pro)",
          "statement": "Max 5x includes five times the Pro plan's per-session usage allowance. This tier is ideal for frequent users who work with Claude on a variety of tasks. Max 20x includes 20 times the Pro plan's per-session usage allowance.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "session-usage-limit-reset",
          "label": "Session usage limit reset",
          "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "weekly-usage-limit-across-all-models",
          "label": "Weekly usage limit across all models",
          "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "fable-model-share-of-weekly-usage-limits",
          "label": "Fable model share of weekly usage limits",
          "statement": "Max plans, premium seats on Team plans, and premium seats on seat-based Enterprise plans: Fable 5 and Fable 5.1 are included as a standard part of your plan. You can use up to 50% of your weekly usage limits on Fable models at no extra cost. They draw from your plan's regular weekly usage limits and use them faster than other Claude models. When you reach your Fable limit, you can keep using Fable models with usage credits, or switch to another model to stay within your plan's usage limits.",
          "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
        },
        {
          "id": "discretionary-weekly-monthly-caps-and-model-or-f",
          "label": "Discretionary weekly/monthly caps and model or feature usage limits",
          "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "usage-credits-opt-in-pay-as-you-go-overage",
          "label": "Usage credits (opt-in pay-as-you-go overage)",
          "statement": "Max plan users - If you're on the Max 5x plan, consider upgrading to the Max 20x plan if you consistently hit limits. - Enable usage credits to continue using Claude with your Max plan after hitting the included usage limit.",
          "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
          "topic": "after_limit"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
          "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
          "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
        },
        {
          "id": "usage-credit-daily-redemption-limit",
          "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
          "statement": "There is a daily redemption limit of $2000.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "No numeric session or weekly allowance is published; usage is expressed only as a multiple of Pro ('five times the Pro plan's per-session usage allowance') and Pro's own allowance is unquantified.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://claude.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable",
          "excluded": true
        },
        {
          "model": "claude-haiku"
        },
        {
          "model": "claude-opus"
        },
        {
          "model": "claude-sonnet"
        }
      ],
      "sources": [
        {
          "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "anthropic-claude-max-5x@2026-09-21",
      "planId": "anthropic-claude-max-5x",
      "planName": "Claude Max 5x",
      "providerId": "anthropic"
    },
    "anthropic-claude-max-5x@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "Official pricing: 'Max 5x : $100 per month'.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "5× Pro’s per-session allowance, with five-hour and weekly limits. Claude Code included.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "per-session-usage-allowance-multiple-of-pro",
          "label": "Per-session usage allowance (multiple of Pro)",
          "statement": "Max 5x includes five times the Pro plan's per-session usage allowance. This tier is ideal for frequent users who work with Claude on a variety of tasks. Max 20x includes 20 times the Pro plan's per-session usage allowance.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "session-usage-limit-reset",
          "label": "Session usage limit reset",
          "statement": "Your session-based usage limit will reset every five hours. Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "weekly-usage-limit-across-all-models",
          "label": "Weekly usage limit across all models",
          "statement": "Max plans also have a weekly usage limit that applies across all models. The weekly limit resets at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "fable-model-share-of-weekly-usage-limits",
          "label": "Fable model share of weekly usage limits",
          "statement": "Max plans, premium seats on Team plans, and premium seats on seat-based Enterprise plans: Fable 5 and Fable 5.1 are included as a standard part of your plan. You can use up to 50% of your weekly usage limits on Fable models at no extra cost. They draw from your plan's regular weekly usage limits and use them faster than other Claude models. When you reach your Fable limit, you can keep using Fable models with usage credits, or switch to another model to stay within your plan's usage limits.",
          "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
        },
        {
          "id": "discretionary-weekly-monthly-caps-and-model-or-f",
          "label": "Discretionary weekly/monthly caps and model or feature usage limits",
          "statement": "In addition, to manage capacity and ensure fair access to all users, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "usage-credits-opt-in-pay-as-you-go-overage",
          "label": "Usage credits (opt-in pay-as-you-go overage)",
          "statement": "Max plan users - If you're on the Max 5x plan, consider upgrading to the Max 20x plan if you consistently hit limits. - Enable usage credits to continue using Claude with your Max plan after hitting the included usage limit.",
          "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
          "topic": "after_limit"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
          "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
          "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
        },
        {
          "id": "usage-credit-daily-redemption-limit",
          "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
          "statement": "There is a daily redemption limit of $2000.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "No numeric session or weekly allowance is published; usage is expressed only as a multiple of Pro ('five times the Pro plan's per-session usage allowance') and Pro's own allowance is unquantified.",
          "sourceUrl": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://claude.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-pricing"
        },
        {
          "model": "claude-fable-5"
        },
        {
          "model": "claude-fable-5-1"
        },
        {
          "model": "claude-haiku-4-5"
        },
        {
          "model": "claude-opus-4-7"
        },
        {
          "model": "claude-opus-4-8"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6"
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "claude-fable",
          "excluded": true
        },
        {
          "model": "claude-haiku"
        },
        {
          "model": "claude-opus"
        },
        {
          "model": "claude-sonnet"
        }
      ],
      "sources": [
        {
          "url": "https://support.claude.com/en/articles/11049741-what-is-the-max-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://claude.com/blog/what-a-task-costs-on-opus-5-5",
          "title": "Anthropic Opus 5.5 availability on Pro and Max",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/11940350-claude-code-model-configuration",
          "title": "Anthropic Claude Code supported model IDs",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "anthropic-claude-max-5x@2026-09-22",
      "planId": "anthropic-claude-max-5x",
      "planName": "Claude Max 5x",
      "providerId": "anthropic"
    },
    "anthropic-claude-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "Claude Pro costs $20 per month. Annual billing is available at $200 upfront.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "5-hour-session-usage-limit-rolling",
          "label": "5-hour session usage limit (rolling)",
          "statement": "Your session-based usage limit will reset every five hours.",
          "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
        },
        {
          "id": "weekly-usage-limit-across-all-models",
          "label": "Weekly usage limit across all models",
          "statement": "Pro plans also have a weekly usage limit that applies across all models. Weekly limits reset at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle. You can see your next reset time in Settings > Usage .",
          "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
        },
        {
          "id": "pro-usage-relative-to-free-per-5-hour-session",
          "label": "Pro usage relative to Free (per 5-hour session)",
          "statement": "Free covers everyday questions. Pro gives you at least 5x more usage per 5-hour session than Free. Max gives you 5x or 20x more usage per 5-hour session than Pro.",
          "sourceUrl": "https://claude.com/pricing"
        },
        {
          "id": "discretionary-weekly-monthly-caps-and-model-or-f",
          "label": "Discretionary weekly/monthly caps and model or feature usage limits",
          "statement": "To manage capacity and make sure all users have fair access, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion. When you reach a limit, you can wait for it to reset, move to a higher plan, or, on paid plans, turn on usage credits to keep working at standard API rates. You can see where you stand anytime in Settings > Usage .",
          "sourceUrl": "https://claude.com/pricing"
        },
        {
          "id": "usage-credits-opt-in-pay-as-you-go-overage",
          "label": "Usage credits (opt-in pay-as-you-go overage)",
          "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits. Instead of being blocked when you hit your session limits, you can switch to consumption-based pricing at standard API rates and continue your work without interruption.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "topic": "after_limit"
        },
        {
          "id": "usage-credit-daily-redemption-limit",
          "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
          "statement": "There is a daily redemption limit of $2000.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
          "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
          "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Anthropic does not publish numeric session/weekly allowances for Pro; only relative multiples ('at least 5x more usage per 5-hour session than Free') and the 5-hour/weekly window structure. Limits are measured as compute-weighted 'usage', not literal request counts ('there's no fixed message count').",
          "sourceUrl": "https://claude.com/pricing"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://claude.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable",
          "excluded": true
        },
        {
          "model": "claude-haiku"
        },
        {
          "model": "claude-opus"
        },
        {
          "model": "claude-sonnet"
        }
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "anthropic-claude-pro@2026-09-21",
      "planId": "anthropic-claude-pro",
      "planName": "Claude Pro",
      "providerId": "anthropic"
    },
    "anthropic-claude-pro@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "Claude Pro costs $20 per month. Annual billing is available at $200 upfront.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "Claude and Claude Code access with five-hour and weekly usage limits. Optional paid usage credits after included usage.",
          "sourceUrl": "https://claude.com/pricing"
        },
        {
          "id": "5-hour-session-usage-limit-rolling",
          "label": "5-hour session usage limit (rolling)",
          "statement": "Your session-based usage limit will reset every five hours.",
          "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
        },
        {
          "id": "weekly-usage-limit-across-all-models",
          "label": "Weekly usage limit across all models",
          "statement": "Pro plans also have a weekly usage limit that applies across all models. Weekly limits reset at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude or when your subscription begins, and you receive your full weekly allowance each cycle. You can see your next reset time in Settings > Usage .",
          "sourceUrl": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan"
        },
        {
          "id": "pro-usage-relative-to-free-per-5-hour-session",
          "label": "Pro usage relative to Free (per 5-hour session)",
          "statement": "Free covers everyday questions. Pro gives you at least 5x more usage per 5-hour session than Free. Max gives you 5x or 20x more usage per 5-hour session than Pro.",
          "sourceUrl": "https://claude.com/pricing"
        },
        {
          "id": "discretionary-weekly-monthly-caps-and-model-or-f",
          "label": "Discretionary weekly/monthly caps and model or feature usage limits",
          "statement": "To manage capacity and make sure all users have fair access, we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion. When you reach a limit, you can wait for it to reset, move to a higher plan, or, on paid plans, turn on usage credits to keep working at standard API rates. You can see where you stand anytime in Settings > Usage .",
          "sourceUrl": "https://claude.com/pricing"
        },
        {
          "id": "usage-credits-opt-in-pay-as-you-go-overage",
          "label": "Usage credits (opt-in pay-as-you-go overage)",
          "statement": "Usage credits allow individuals subscribed to paid Claude plans (Pro, Max 5x, and Max 20x) to continue using Claude seamlessly after reaching their included usage limits. Instead of being blocked when you hit your session limits, you can switch to consumption-based pricing at standard API rates and continue your work without interruption.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "topic": "after_limit"
        },
        {
          "id": "usage-credit-daily-redemption-limit",
          "label": "Usage-credit funding: daily redemption limit (funding rule, not simulated workload capacity)",
          "statement": "There is a daily redemption limit of $2000.",
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (billing rule, not simulated workload capacity)",
          "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
          "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Anthropic does not publish numeric session/weekly allowances for Pro; only relative multiples ('at least 5x more usage per 5-hour session than Free') and the 5-hour/weekly window structure. Limits are measured as compute-weighted 'usage', not literal request counts ('there's no fixed message count').",
          "sourceUrl": "https://claude.com/pricing"
        },
        {
          "id": "fable-models-usage-credits-only",
          "label": "Fable models: usage credits only",
          "statement": "Fable 5 and Fable 5.1 aren't included in your plan's usage limits. You can use them with usage credits, which let you pay for usage beyond what your plan includes.",
          "sourceUrl": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Anthropic publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://claude.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-pricing"
        },
        {
          "model": "claude-haiku-4-5"
        },
        {
          "model": "claude-opus-4-7"
        },
        {
          "model": "claude-opus-4-8"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6"
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "claude-fable-5",
          "excluded": true,
          "access": "usage_credits"
        },
        {
          "model": "claude-fable-5-1",
          "excluded": true,
          "access": "usage_credits"
        },
        {
          "model": "claude-fable",
          "excluded": true,
          "access": "usage_credits"
        },
        {
          "model": "claude-haiku"
        },
        {
          "model": "claude-opus"
        },
        {
          "model": "claude-sonnet"
        }
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing: Pro lists Opus, Sonnet and Haiku, and Fable through usage credits (official)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://support.claude.com/en/articles/8325606-what-is-the-pro-plan",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/14246112-buy-usage-bundles",
          "title": "Anthropic plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://claude.com/blog/what-a-task-costs-on-opus-5-5",
          "title": "Anthropic Opus 5.5 availability on Pro and Max",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan",
          "title": "Use Claude Code with your Pro or Max plan (official)",
          "checkedAt": "2026-09-24"
        },
        {
          "url": "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan",
          "title": "Claude Fable models on your plan: Pro uses usage credits (official)",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-24",
      "verificationStatus": "verified",
      "versionId": "anthropic-claude-pro@2026-09-22",
      "planId": "anthropic-claude-pro",
      "planName": "Claude Pro",
      "providerId": "anthropic"
    },
    "clinepass@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "9.99",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "Selected open coding models. Five-hour, weekly and monthly usage windows; no deterministic allowance admitted.",
          "sourceUrl": "https://docs.cline.bot/getting-started/clinepass"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "Cline · OpenAI-compatible clients",
          "sourceUrl": "https://docs.cline.bot/getting-started/clinepass"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Subscription quota and pay-as-you-go Cline are separate providers.",
          "sourceUrl": "https://docs.cline.bot/getting-started/clinepass",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "glm-5-3"
        },
        {
          "model": "glm-5-3-flash"
        },
        {
          "model": "kimi-k3"
        },
        {
          "model": "deepseek-v4-1-flash"
        }
      ],
      "sources": [
        {
          "url": "https://docs.cline.bot/getting-started/clinepass",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "clinepass@2026-09-28",
      "planId": "clinepass",
      "planName": "ClinePass",
      "providerId": "cline"
    },
    "command-code-go@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "1",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "$10 monthly credits. Five-hour and weekly limits also apply.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "Command Code",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Optional on-demand credits continue usage separately from subscription limits.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna"
        }
      ],
      "sources": [
        {
          "url": "https://commandcode.ai/docs/resources/pricing-limits",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "command-code-go@2026-09-28",
      "planId": "command-code-go",
      "planName": "Command Code Go",
      "providerId": "command-code"
    },
    "command-code-max-10x@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "$150 standard and $100 premium monthly usage pools. Five-hour and weekly limits also apply.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "Command Code",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Optional on-demand credits continue usage separately from subscription limits.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        }
      ],
      "sources": [
        {
          "url": "https://commandcode.ai/docs/resources/pricing-limits",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "command-code-max-10x@2026-09-28",
      "planId": "command-code-max-10x",
      "planName": "Command Code Max 10×",
      "providerId": "command-code"
    },
    "command-code-max-20x@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "200",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "$300 standard and $200 premium monthly usage pools. Five-hour and weekly limits also apply.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "Command Code",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Optional on-demand credits continue usage separately from subscription limits.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        }
      ],
      "sources": [
        {
          "url": "https://commandcode.ai/docs/resources/pricing-limits",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "command-code-max-20x@2026-09-28",
      "planId": "command-code-max-20x",
      "planName": "Command Code Max 20×",
      "providerId": "command-code"
    },
    "command-code-pro@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "Up to $80 monthly usage value; model-dependent allowances. Five-hour and weekly limits also apply.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "Command Code",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Optional on-demand credits continue usage separately from subscription limits.",
          "sourceUrl": "https://commandcode.ai/docs/resources/pricing-limits",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        }
      ],
      "sources": [
        {
          "url": "https://commandcode.ai/docs/resources/pricing-limits",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "command-code-pro@2026-09-28",
      "planId": "command-code-pro",
      "planName": "Command Code Pro",
      "providerId": "command-code"
    },
    "cursor-hobby@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "0",
        "interval": "month"
      },
      "billingMechanics": "Pricing page card: 'Hobby / For the tinkerer / Free / Includes: No credit card required / Limited Agent requests / Access to Composer'.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "Free access to Composer with limited Agent requests. No published numeric allowance.",
          "sourceUrl": "https://cursor.com/help/account-and-billing/pricing"
        },
        {
          "id": "after-limit-not-published",
          "label": "After the limit",
          "statement": "The pricing page does not state a numeric Hobby allowance or an automatic paid-overage rule. Check the upgrade options in your account when a limit is reached.",
          "sourceUrl": "https://cursor.com/pricing",
          "topic": "after_limit"
        },
        {
          "id": "hobby-auto-only",
          "label": "Auto model only",
          "statement": "Hobby offers limited Agent, Chat, and Tab usage with the Auto model. Named model selection is not established for this plan, so StackReplay cannot attribute a deterministic target model.",
          "sourceUrl": "https://cursor.com/help/account-and-billing/pricing"
        },
        {
          "id": "agent-requests-on-hobby-unquantified",
          "label": "Agent requests on Hobby (unquantified)",
          "statement": "Hobby ... Free ... Includes: No credit card required / Limited Agent requests / Access to Composer",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "usage-pools-pro-pro-plus-and-ultra-hobby-is-not-",
          "label": "Usage pools (Pro, Pro Plus and Ultra; Hobby is not listed in the docs plan table)",
          "statement": "There are two separate usage pools, each resetting with your monthly billing cycle: - Cursor Models : Significantly more included usage for Grok 4.7, Grok 4.6, Grok 4.5, and Composer 2.5. - Other Models : The pool for third-party models, charged at the model's API price. Pro, Pro Plus, and Ultra include this pool, with the option to pay for additional usage as needed.",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Cursor describes limited Hobby usage but does not publish a numeric Agent allowance, reset window, or exact Auto routing. Those values remain unknown for Replay.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1",
          "excluded": true
        },
        {
          "model": "claude-opus-5",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "excluded": true
        },
        {
          "model": "composer-2-5",
          "excluded": true
        },
        {
          "model": "gemini-3-1-pro",
          "excluded": true
        },
        {
          "model": "gemini-3-8-flash",
          "excluded": true
        },
        {
          "model": "gpt-5-6-luna",
          "excluded": true
        },
        {
          "model": "gpt-5-6-sol",
          "excluded": true
        },
        {
          "model": "gpt-5-6-terra",
          "excluded": true
        },
        {
          "model": "grok-4-5",
          "excluded": true
        },
        {
          "model": "grok-4-6",
          "excluded": true
        },
        {
          "model": "grok-4-7",
          "excluded": true
        },
        {
          "model": "muse-spark-1-3",
          "excluded": true
        }
      ],
      "sources": [
        {
          "url": "https://cursor.com/help/account-and-billing/pricing",
          "title": "Cursor Hobby Auto-only model selection",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "cursor-hobby@2026-09-21",
      "planId": "cursor-hobby",
      "planName": "Cursor Hobby",
      "providerId": "cursor"
    },
    "cursor-pro-plus@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "60",
        "interval": "month"
      },
      "billingMechanics": "Monthly $60/mo; yearly view shows $48/mo ('Save 20% with yearly billing').",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "3× Pro Agent limits, unlimited Tab, Bugbot and Cloud Agents. Optional on-demand billing.",
          "sourceUrl": "https://cursor.com/docs/models-and-pricing"
        },
        {
          "id": "grok-route-pricing-unknown",
          "label": "Grok 4.7 route pricing depends on speed and context",
          "statement": "Cursor documents standard and Fast rates plus a long-context tier. Fast is the paid-plan default, but this catalog cannot establish a specific speed route for a recorded workload, so it does not assign one token rate.",
          "sourceUrl": "https://cursor.com/docs/models/grok-4-7"
        },
        {
          "id": "agent-limits-relative-to-pro",
          "label": "Agent limits relative to Pro",
          "statement": "Everything in Pro, plus: 3x Pro limits on Agent",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "usage-pools-included",
          "label": "Usage pools included",
          "statement": "Pro Plus | $60/mo | Included | Included",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "what-happens-when-included-monthly-usage-is-exce",
          "label": "What happens when included monthly usage is exceeded",
          "statement": "When you exceed your included monthly usage, you can either: - Add on-demand usage : Continue at the same API rates with pay-as-you-go billing - Upgrade your plan : Move to a higher tier for more included usage.",
          "sourceUrl": "https://cursor.com/docs/account/pricing",
          "topic": "after_limit"
        },
        {
          "id": "tab-completions-unlimited",
          "label": "Tab completions (unlimited)",
          "statement": "Pro, Pro Plus, and Ultra include unlimited tab completions, extended agent usage limits on all models, access to Bugbot, and access to Cloud Agents.",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "The '3x Pro limits on Agent' multiple has no published absolute base; Pro's own agent limit is unquantified.",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Cursor says paid individual plans unlock all supported named models, subject to regional and organization controls.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-pricing"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-pricing"
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-pricing"
        },
        {
          "model": "composer-2-5"
        },
        {
          "model": "gemini-3-1-pro",
          "pricingRef": "gemini-3-1-pro-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "grok-4-5"
        },
        {
          "model": "grok-4-6"
        },
        {
          "model": "grok-4-7"
        },
        {
          "model": "muse-spark-1-3"
        }
      ],
      "sources": [
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor paid-plan pools and current model prices",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "cursor-pro-plus@2026-09-21",
      "planId": "cursor-pro-plus",
      "planName": "Cursor Pro+",
      "providerId": "cursor"
    },
    "cursor-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "Monthly price $20/mo; yearly view shows $16/mo with the banner 'Save 20% with yearly billing' (read from the live Monthly/Yearly toggle on 2026-09-21).",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "Included Cursor-model and third-party-model usage pools, unlimited Tab, Bugbot and Cloud Agents. Optional on-demand billing.",
          "sourceUrl": "https://cursor.com/docs/models-and-pricing"
        },
        {
          "id": "grok-route-pricing-unknown",
          "label": "Grok 4.7 route pricing depends on speed and context",
          "statement": "Cursor documents standard and Fast rates plus a long-context tier. Fast is the paid-plan default, but this catalog cannot establish a specific speed route for a recorded workload, so it does not assign one token rate.",
          "sourceUrl": "https://cursor.com/docs/models/grok-4-7"
        },
        {
          "id": "cursor-models-pool-included-usage-unquantified",
          "label": "Cursor Models pool (included usage, unquantified)",
          "statement": "Cursor Models : Significantly more included usage for Grok 4.7, Grok 4.6, Grok 4.5, and Composer 2.5.",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "other-models-pool-third-party-models-at-api-pric",
          "label": "Other Models pool (third-party models at API price)",
          "statement": "Other Models : The pool for third-party models, charged at the model's API price. Pro, Pro Plus, and Ultra include this pool, with the option to pay for additional usage as needed.",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "what-happens-when-included-monthly-usage-is-exce",
          "label": "What happens when included monthly usage is exceeded",
          "statement": "When you exceed your included monthly usage, you can either: - Add on-demand usage : Continue at the same API rates with pay-as-you-go billing - Upgrade your plan : Move to a higher tier for more included usage. On-demand usage is billed monthly at the same rates. Requests are never downgraded in quality or speed.",
          "sourceUrl": "https://cursor.com/docs/account/pricing",
          "topic": "after_limit"
        },
        {
          "id": "agent-limits-extended-vs-hobby-unquantified",
          "label": "Agent limits (extended vs Hobby, unquantified)",
          "statement": "Everything in Hobby, plus: Extended limits on Agent / Generous limits for Grok",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "tab-completions-unlimited",
          "label": "Tab completions (unlimited)",
          "statement": "Pro, Pro Plus, and Ultra include unlimited tab completions, extended agent usage limits on all models, access to Bugbot, and access to Cloud Agents.",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "on-demand-usage-toggle-usage-based-pricing",
          "label": "On-demand usage toggle (usage-based pricing)",
          "statement": "Every plan includes a set amount of model usage. On-demand usage allows you to continue using models after your included amount is consumed, billed in arrears.",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Cursor does not publish the size of either usage pool in dollars or tokens for Pro; the docs say only 'Significantly more included usage' for the Cursor Models pool and that the Other Models pool is 'charged at the model's API price'. The docs' 'How much usage do I need?' section gives indicative spend ranges ('Daily Agent users : Typically $60-$100/mo total usage'), which are guidance, not limits.",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Cursor says paid individual plans unlock all supported named models, subject to regional and organization controls.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-pricing"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-pricing"
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-pricing"
        },
        {
          "model": "composer-2-5"
        },
        {
          "model": "gemini-3-1-pro",
          "pricingRef": "gemini-3-1-pro-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "grok-4-5"
        },
        {
          "model": "grok-4-6"
        },
        {
          "model": "grok-4-7"
        },
        {
          "model": "muse-spark-1-3"
        }
      ],
      "sources": [
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor paid-plan pools and current model prices",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "cursor-pro@2026-09-21",
      "planId": "cursor-pro",
      "planName": "Cursor Pro",
      "providerId": "cursor"
    },
    "cursor-ultra@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "200",
        "interval": "month"
      },
      "billingMechanics": "Monthly $200/mo; yearly view shows $160/mo ('Save 20% with yearly billing').",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "20× Pro Agent limits, unlimited Tab, Bugbot and Cloud Agents. Optional on-demand billing.",
          "sourceUrl": "https://cursor.com/docs/models-and-pricing"
        },
        {
          "id": "grok-route-pricing-unknown",
          "label": "Grok 4.7 route pricing depends on speed and context",
          "statement": "Cursor documents standard and Fast rates plus a long-context tier. Fast is the paid-plan default, but this catalog cannot establish a specific speed route for a recorded workload, so it does not assign one token rate.",
          "sourceUrl": "https://cursor.com/docs/models/grok-4-7"
        },
        {
          "id": "agent-limits-relative-to-pro",
          "label": "Agent limits relative to Pro",
          "statement": "Everything in Pro, plus: 20x Pro limits on Agent",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "usage-pools-included",
          "label": "Usage pools included",
          "statement": "Ultra | $200/mo | Included | Included",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "what-happens-when-included-monthly-usage-is-exce",
          "label": "What happens when included monthly usage is exceeded",
          "statement": "When you exceed your included monthly usage, you can either: - Add on-demand usage : Continue at the same API rates with pay-as-you-go billing - Upgrade your plan : Move to a higher tier for more included usage.",
          "sourceUrl": "https://cursor.com/docs/account/pricing",
          "topic": "after_limit"
        },
        {
          "id": "tab-completions-unlimited",
          "label": "Tab completions (unlimited)",
          "statement": "Pro, Pro Plus, and Ultra include unlimited tab completions, extended agent usage limits on all models, access to Bugbot, and access to Cloud Agents.",
          "sourceUrl": "https://cursor.com/docs/account/pricing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "The '20x Pro limits on Agent' multiple has no published absolute base. Cursor's docs also note 'On Teams and Enterprise plans, Cursor Router picks the model for each Auto request based on your optimization mode' and a Cursor Token Rate of $0.25 per million tokens applies on Teams/Enterprise, not on individual plans.",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Cursor says paid individual plans unlock all supported named models, subject to regional and organization controls.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-pricing"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-pricing"
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-pricing"
        },
        {
          "model": "composer-2-5"
        },
        {
          "model": "gemini-3-1-pro",
          "pricingRef": "gemini-3-1-pro-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "grok-4-5"
        },
        {
          "model": "grok-4-6"
        },
        {
          "model": "grok-4-7"
        },
        {
          "model": "muse-spark-1-3"
        }
      ],
      "sources": [
        {
          "url": "https://cursor.com/docs/models-and-pricing",
          "title": "Cursor paid-plan pools and current model prices",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "cursor-ultra@2026-09-21",
      "planId": "cursor-ultra",
      "planName": "Cursor Ultra",
      "providerId": "cursor"
    },
    "example-cloud-pro@2026-08-01": {
      "effectiveFrom": "2026-08-01",
      "price": {
        "currency": "USD",
        "amount": "50.00",
        "interval": "month"
      },
      "billingMechanics": "Token allowance per calendar month; request windows throttle burst usage.",
      "limits": [
        {
          "id": "monthly-tokens",
          "label": "Monthly token allowance",
          "type": "token_limit",
          "amount": "200000000",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "reject_request"
        },
        {
          "id": "rolling-5h-requests",
          "label": "5-hour request window",
          "type": "request_limit",
          "amount": "600",
          "window": {
            "type": "rolling",
            "duration": "PT5H",
            "anchor": "first_use"
          },
          "exceed": "latch_until_reset"
        },
        {
          "id": "large-model-credits",
          "label": "Large model credit pool",
          "type": "credit_pool",
          "amount": "100.00",
          "models": [
            "example-large"
          ],
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "modelRules": [
        {
          "model": "example-small",
          "pricingRef": "example-small-pricing"
        },
        {
          "model": "example-medium",
          "pricingRef": "example-medium-pricing"
        },
        {
          "model": "example-large",
          "pricingRef": "example-large-pricing",
          "multiplier": "0.5"
        }
      ],
      "promotions": [
        {
          "id": "medium-launch-promo",
          "label": "Medium model launch promotion",
          "models": [
            "example-medium"
          ],
          "multiplier": "0.5",
          "effectiveFrom": "2026-09-01",
          "effectiveTo": "2026-09-30"
        }
      ],
      "sources": [
        {
          "url": "https://example.invalid/plans/example-cloud-pro",
          "title": "Example Cloud Pro plan page (synthetic demo data)",
          "checkedAt": "2026-08-01"
        }
      ],
      "lastVerifiedAt": "2026-08-01",
      "verificationStatus": "estimated",
      "versionId": "example-cloud-pro@2026-08-01",
      "planId": "example-cloud-pro",
      "planName": "Example Cloud Pro",
      "providerId": "example-cloud"
    },
    "example-cloud-starter@2026-08-01": {
      "effectiveFrom": "2026-08-01",
      "effectiveTo": "2026-09-14",
      "price": {
        "currency": "USD",
        "amount": "20.00",
        "interval": "month"
      },
      "billingMechanics": "Credit pool consumed at model list rates; unused credits do not roll over.",
      "limits": [
        {
          "id": "rolling-5h-credits",
          "label": "5-hour credit pool",
          "type": "credit_pool",
          "amount": "20.00",
          "window": {
            "type": "rolling",
            "duration": "PT5H",
            "anchor": "first_use"
          },
          "exceed": "reject_request"
        },
        {
          "id": "rolling-7d-credits",
          "label": "Weekly credit pool",
          "type": "credit_pool",
          "amount": "75.00",
          "window": {
            "type": "rolling",
            "duration": "P7D",
            "anchor": "first_use"
          },
          "exceed": "latch_until_reset"
        }
      ],
      "modelRules": [
        {
          "model": "example-small",
          "pricingRef": "example-small-pricing"
        },
        {
          "model": "example-medium",
          "pricingRef": "example-medium-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://example.invalid/plans/example-cloud-starter",
          "title": "Example Cloud Starter plan page (synthetic demo data)",
          "checkedAt": "2026-08-01"
        }
      ],
      "lastVerifiedAt": "2026-08-01",
      "verificationStatus": "estimated",
      "versionId": "example-cloud-starter@2026-08-01",
      "planId": "example-cloud-starter",
      "planName": "Example Cloud Starter",
      "providerId": "example-cloud"
    },
    "example-cloud-starter@2026-09-15": {
      "effectiveFrom": "2026-09-15",
      "price": {
        "currency": "USD",
        "amount": "20.00",
        "interval": "month"
      },
      "billingMechanics": "Credit pool consumed at model list rates; unused credits do not roll over.",
      "limits": [
        {
          "id": "rolling-5h-credits",
          "label": "5-hour credit pool",
          "type": "credit_pool",
          "amount": "25.00",
          "window": {
            "type": "rolling",
            "duration": "PT5H",
            "anchor": "first_use"
          },
          "exceed": "reject_request"
        },
        {
          "id": "rolling-7d-credits",
          "label": "Weekly credit pool",
          "type": "credit_pool",
          "amount": "75.00",
          "window": {
            "type": "rolling",
            "duration": "P7D",
            "anchor": "first_use"
          },
          "exceed": "latch_until_reset"
        }
      ],
      "modelRules": [
        {
          "model": "example-small",
          "pricingRef": "example-small-pricing"
        },
        {
          "model": "example-medium",
          "pricingRef": "example-medium-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://example.invalid/plans/example-cloud-starter",
          "title": "Example Cloud Starter plan page (synthetic demo data)",
          "checkedAt": "2026-09-15"
        }
      ],
      "lastVerifiedAt": "2026-09-15",
      "verificationStatus": "estimated",
      "versionId": "example-cloud-starter@2026-09-15",
      "planId": "example-cloud-starter",
      "planName": "Example Cloud Starter",
      "providerId": "example-cloud"
    },
    "example-open-basic@2026-08-01": {
      "effectiveFrom": "2026-08-01",
      "price": {
        "currency": "USD",
        "amount": "10.00",
        "interval": "month"
      },
      "billingMechanics": "Request windows only; the large model is not available on this plan.",
      "limits": [
        {
          "id": "rolling-5h-requests",
          "label": "5-hour request window",
          "type": "request_limit",
          "amount": "300",
          "window": {
            "type": "rolling",
            "duration": "PT5H",
            "anchor": "first_use"
          },
          "exceed": "record_only"
        }
      ],
      "modelRules": [
        {
          "model": "example-small",
          "pricingRef": "example-small-pricing"
        },
        {
          "model": "example-medium",
          "pricingRef": "example-medium-pricing"
        },
        {
          "model": "example-large",
          "excluded": true
        }
      ],
      "sources": [
        {
          "url": "https://example.invalid/plans/example-open-basic",
          "title": "Example Open Basic plan page (synthetic demo data)",
          "checkedAt": "2026-08-01"
        }
      ],
      "lastVerifiedAt": "2026-08-01",
      "verificationStatus": "estimated",
      "versionId": "example-open-basic@2026-08-01",
      "planId": "example-open-basic",
      "planName": "Example Open Basic",
      "providerId": "example-open"
    },
    "github-copilot-business@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "19",
        "interval": "month"
      },
      "billingMechanics": "Price is 'per granted seat per month': 'Copilot Business | $19 USD | 1,900'.",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits per seat (1,900 credits = $19.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "19.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "additional-usage-beyond-the-pool",
          "label": "Additional usage beyond the pool",
          "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "policy-dependent-behaviour-when-pooled-credits-a",
          "label": "Policy-dependent behaviour when pooled credits are exhausted",
          "statement": "When your pooled AI credits are exhausted, what happens next depends on how you have configured policies for additional usage. - Additional usage allowed : Usage continues at published per-credit rates. The spend is charged to your organization or enterprise. Note that additional usage may be capped : if you hit the cap, you'll need to pay off any additional usage you've already consumed in order to continue. - Additional usage not allowed : Usage is blocked until the next billing cycle when monthly amounts are refreshed. ... Additional usage is enabled by default for organizations and enterprises.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
          "topic": "after_limit"
        },
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
        {
          "id": "rate-limits-unquantified",
          "label": "Rate limits (unquantified)",
          "statement": "If you receive a limit error when using Copilot, you should: - Wait and try again. Rate limits are temporary. Often, waiting a short period and trying again resolves the issue.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "The billing interval for Copilot Business seats is not stated as monthly or annual on the plans page; the price is quoted 'per granted seat per month'. The reset date for included credits is fixed to the calendar month and not the billing date.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://github.com/features/copilot/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "github-copilot-business@2026-09-21",
      "planId": "github-copilot-business",
      "planName": "Copilot Business",
      "providerId": "github"
    },
    "github-copilot-business@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "19",
        "interval": "month"
      },
      "billingMechanics": "$19 per granted seat per month, contributing 1,900 monthly AI credits per user to the organization pool.",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits per seat (1,900 credits = $19.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "19.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "additional-usage-beyond-the-pool",
          "label": "Additional usage beyond the pool",
          "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "policy-dependent-behaviour-when-pooled-credits-a",
          "label": "Policy-dependent behaviour when pooled credits are exhausted",
          "statement": "When your pooled AI credits are exhausted, what happens next depends on how you have configured policies for additional usage. - Additional usage allowed : Usage continues at published per-credit rates. The spend is charged to your organization or enterprise. Note that additional usage may be capped : if you hit the cap, you'll need to pay off any additional usage you've already consumed in order to continue. - Additional usage not allowed : Usage is blocked until the next billing cycle when monthly amounts are refreshed. ... Additional usage is enabled by default for organizations and enterprises.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
          "topic": "after_limit"
        },
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
        {
          "id": "rate-limits-unquantified",
          "label": "Rate limits (unquantified)",
          "statement": "If you receive a limit error when using Copilot, you should: - Wait and try again. Rate limits are temporary. Often, waiting a short period and trying again resolves the issue.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "The billing interval for Copilot Business seats is not stated as monthly or annual on the plans page; the price is quoted 'per granted seat per month'. The reset date for included credits is fixed to the calendar month and not the billing date.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability by plan",
          "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7",
          "pricingRef": "claude-opus-4-7-github-pricing"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode",
          "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash",
          "pricingRef": "gemini-3-7-flash-github-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash",
          "pricingRef": "mai-code-1-1-flash-github-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-github-pricing"
        },
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-github-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-github-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub model availability (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "github-copilot-business@2026-09-22",
      "planId": "github-copilot-business",
      "planName": "Copilot Business",
      "providerId": "github"
    },
    "github-copilot-enterprise@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "39",
        "interval": "month"
      },
      "billingMechanics": "Price is 'per granted seat per month': 'Copilot Enterprise | $39 USD | 3,900'.",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits per seat (3,900 credits = $39.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "39.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "additional-usage-beyond-the-pool",
          "label": "Additional usage beyond the pool",
          "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans",
          "topic": "after_limit"
        },
        {
          "id": "budget-controls-user-cost-center-enterprise-spen",
          "label": "Budget controls (user, cost-center, enterprise spending limits)",
          "statement": "If you have set a user-level budget and a user exhausts it, that user's access to Copilot is halted, regardless of whether the organization's pool still has capacity. A user can also be blocked by an enterprise spending limit before they reach their individual user-level budget, if the spending limit runs out first. There is no automatic fallback to lower-cost models when a budget is exhausted.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Same as Copilot Business: billing interval not stated as monthly/annual on the plans page; credits reset on the calendar month, not the billing date.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://github.com/features/copilot/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "github-copilot-enterprise@2026-09-21",
      "planId": "github-copilot-enterprise",
      "planName": "Copilot Enterprise",
      "providerId": "github"
    },
    "github-copilot-enterprise@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "39",
        "interval": "month"
      },
      "billingMechanics": "$39 per granted seat per month, contributing 3,900 monthly AI credits per user to the organization pool.",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits per seat (3,900 credits = $39.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "39.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "additional-usage-beyond-the-pool",
          "label": "Additional usage beyond the pool",
          "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans",
          "topic": "after_limit"
        },
        {
          "id": "budget-controls-user-cost-center-enterprise-spen",
          "label": "Budget controls (user, cost-center, enterprise spending limits)",
          "statement": "If you have set a user-level budget and a user exhausts it, that user's access to Copilot is halted, regardless of whether the organization's pool still has capacity. A user can also be blocked by an enterprise spending limit before they reach their individual user-level budget, if the spending limit runs out first. There is no automatic fallback to lower-cost models when a budget is exhausted.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits. They remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Same as Copilot Business: billing interval not stated as monthly/annual on the plans page; credits reset on the calendar month, not the billing date.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability by plan",
          "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7",
          "pricingRef": "claude-opus-4-7-github-pricing"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode",
          "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash",
          "pricingRef": "gemini-3-7-flash-github-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash",
          "pricingRef": "mai-code-1-1-flash-github-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-github-pricing"
        },
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-github-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-github-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub model availability (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "github-copilot-enterprise@2026-09-22",
      "planId": "github-copilot-enterprise",
      "planName": "Copilot Enterprise",
      "providerId": "github"
    },
    "github-copilot-free@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "0",
        "interval": "month"
      },
      "billingMechanics": "No subscription charge. GitHub documents 2,000 monthly inline suggestions and an AI credit allowance whose amount is not published. Model access uses Auto selection only.",
      "limits": [
        {
          "id": "inline-suggestions",
          "label": "Inline suggestion completions",
          "type": "request_limit",
          "amount": "2000",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "reject_request"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "github-ai-credits-allowance-amount-not-published",
          "label": "GitHub AI Credits allowance (amount not published)",
          "statement": "Copilot Free and Copilot Student both have an allowance of AI credits.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-access-restricted-to-auto-model-selection",
          "label": "Model access restricted to auto model selection",
          "statement": "On Copilot Free and Copilot Student plans, access to models is available through auto model selection only.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "rate-limits-unquantified-apply-to-copilot-genera",
          "label": "Rate limits (unquantified, apply to Copilot generally)",
          "statement": "Rate limiting is a mechanism used to control the number of requests a user or application can make in a given time period. GitHub uses rate limits to ensure everyone has fair access to GitHub Copilot and to protect against abuse.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "The size of Copilot Free's GitHub AI Credits allowance is not published as a number. No billing interval applies (no charge).",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Copilot Free offers model access through Auto selection only. A named model is not a selectable Replay target on this plan.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "excluded": true
        },
        {
          "model": "claude-fable-5-1",
          "excluded": true
        },
        {
          "model": "claude-haiku-4-5",
          "excluded": true
        },
        {
          "model": "claude-opus-4-7",
          "excluded": true
        },
        {
          "model": "claude-opus-4-8",
          "excluded": true
        },
        {
          "model": "claude-opus-4-8-fast-mode",
          "excluded": true
        },
        {
          "model": "claude-opus-5",
          "excluded": true
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "excluded": true
        },
        {
          "model": "gemini-3-5-flash",
          "excluded": true
        },
        {
          "model": "gemini-3-6-flash",
          "excluded": true
        },
        {
          "model": "gemini-3-7-flash",
          "excluded": true
        },
        {
          "model": "gemini-3-8-flash",
          "excluded": true
        },
        {
          "model": "gpt-5-3-codex",
          "excluded": true
        },
        {
          "model": "gpt-5-4",
          "excluded": true
        },
        {
          "model": "gpt-5-4-mini",
          "excluded": true
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "excluded": true
        },
        {
          "model": "gpt-5-6-luna",
          "excluded": true
        },
        {
          "model": "gpt-5-6-sol",
          "excluded": true
        },
        {
          "model": "gpt-5-6-terra",
          "excluded": true
        },
        {
          "model": "gpt-5-mini",
          "excluded": true
        },
        {
          "model": "gpt-6-astra",
          "excluded": true
        },
        {
          "model": "grok-4-5",
          "excluded": true
        },
        {
          "model": "grok-4-6",
          "excluded": true
        },
        {
          "model": "grok-4-7",
          "excluded": true
        },
        {
          "model": "kimi-k2-7-code",
          "excluded": true
        },
        {
          "model": "kimi-k3",
          "excluded": true
        },
        {
          "model": "mai-code-1-1-flash",
          "excluded": true
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/usage-limits",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "github-copilot-free@2026-09-21",
      "planId": "github-copilot-free",
      "planName": "Copilot Free",
      "providerId": "github"
    },
    "github-copilot-max@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "Copilot Max costs $100 USD per month and includes 20,000 monthly AI credits (10,000 base and 10,000 flex).",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits (20,000 credits = $200.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "200.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "credit-reset-behaviour-no-carryover",
          "label": "Credit reset behaviour (no carryover)",
          "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "what-happens-when-included-credits-are-exhausted",
          "label": "What happens when included credits are exhausted",
          "statement": "If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "topic": "after_limit"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability by plan",
          "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "priority-premium-models",
          "label": "Priority premium model access",
          "statement": "GitHub describes Copilot Max as providing priority access to premium models; no numeric priority guarantee is published.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7",
          "pricingRef": "claude-opus-4-7-github-pricing"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode",
          "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash",
          "pricingRef": "gemini-3-7-flash-github-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "pricingRef": "gpt-5-4-nano-github-pricing"
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash",
          "pricingRef": "mai-code-1-1-flash-github-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-github-pricing"
        },
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-github-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-github-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub model availability (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "github-copilot-max@2026-09-22",
      "planId": "github-copilot-max",
      "planName": "Copilot Max",
      "providerId": "github"
    },
    "github-copilot-pro-plus@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "39",
        "interval": "month"
      },
      "billingMechanics": "Plan table: 'Copilot Pro+ - $39 USD per month.",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits (7,000 credits = $70.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "70.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "credit-reset-behaviour-no-carryover",
          "label": "Credit reset behaviour (no carryover)",
          "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "what-happens-when-included-credits-are-exhausted",
          "label": "What happens when included credits are exhausted",
          "statement": "If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "topic": "after_limit"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "None specific to Pro+ beyond the general absence of published numeric rate limits.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://github.com/features/copilot/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "github-copilot-pro-plus@2026-09-21",
      "planId": "github-copilot-pro-plus",
      "planName": "Copilot Pro+",
      "providerId": "github"
    },
    "github-copilot-pro-plus@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "39",
        "interval": "month"
      },
      "billingMechanics": "$39 per month, including 7,000 monthly AI credits (3,900 base and 3,100 flex).",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits (7,000 credits = $70.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "70.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "credit-reset-behaviour-no-carryover",
          "label": "Credit reset behaviour (no carryover)",
          "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "what-happens-when-included-credits-are-exhausted",
          "label": "What happens when included credits are exhausted",
          "statement": "If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "topic": "after_limit"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "None specific to Pro+ beyond the general absence of published numeric rate limits.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability by plan",
          "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "annual-sonnet-4-6-exception",
          "label": "Claude Sonnet 4.6 annual-plan exception",
          "statement": "Claude Sonnet 4.6 is retired for monthly Copilot Pro and Pro+ subscribers but remains available to individual subscribers on annual billing. This monthly-priced target excludes it.",
          "sourceUrl": "https://docs.github.com/en/copilot/reference/ai-models/supported-models"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7",
          "pricingRef": "claude-opus-4-7-github-pricing"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode",
          "pricingRef": "claude-opus-4-8-fast-mode-github-pricing"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash",
          "pricingRef": "gemini-3-7-flash-github-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "pricingRef": "gpt-5-4-nano-github-pricing"
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash",
          "pricingRef": "mai-code-1-1-flash-github-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "pricingRef": "claude-opus-5-5-github-pricing"
        },
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-github-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-github-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub model availability (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "github-copilot-pro-plus@2026-09-22",
      "planId": "github-copilot-pro-plus",
      "planName": "Copilot Pro+",
      "providerId": "github"
    },
    "github-copilot-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "10",
        "interval": "month"
      },
      "billingMechanics": "Plan table: 'Copilot Pro - $10 USD per month (free for some users)'; GitHub AI Credits 'Base: 1,000'.",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits (1,500 credits = $15.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "15.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "credit-reset-behaviour-no-carryover",
          "label": "Credit reset behaviour (no carryover)",
          "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month. This reset date is fixed and does not change based on your subscription billing date.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "what-happens-when-included-credits-are-exhausted",
          "label": "What happens when included credits are exhausted",
          "statement": "When your AI credits are exhausted, you can: - Upgrade your plan. ... - Stay on your existing plan and pay for more usage. If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue. - Alternatively, wait until the next monthly cycle when your included usage resets.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "topic": "after_limit"
        },
        {
          "id": "additional-usage-budget-usd-fixed-conversion-rat",
          "label": "Additional usage budget (USD, fixed conversion rate)",
          "statement": "Your additional usage budget is set in US dollars, and your usage is shown in GitHub AI Credits. GitHub AI Credits draw down your budget at a fixed rate: 1 AI credits = $0.01 USD, so a $10 budget covers 1,000 AI credits.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Copilot Pro is 'free for some users' (verified teachers, popular open-source maintainers) - the $10 USD/month is the standard price. The flex allotment is described as variable by GitHub.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://github.com/features/copilot/plans"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "pricingRef": "claude-fable-5-github-pricing"
        },
        {
          "model": "claude-fable-5-1",
          "pricingRef": "claude-fable-5-1-github-pricing"
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7"
        },
        {
          "model": "claude-opus-4-8",
          "pricingRef": "claude-opus-4-8-github-pricing"
        },
        {
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5",
          "pricingRef": "claude-opus-5-github-pricing"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "pricingRef": "gpt-5-5-github-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-github-pricing"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-github-pricing"
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash"
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "github-copilot-pro@2026-09-21",
      "planId": "github-copilot-pro",
      "planName": "Copilot Pro",
      "providerId": "github"
    },
    "github-copilot-pro@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "10",
        "interval": "month"
      },
      "billingMechanics": "$10 per month, including 1,500 monthly AI credits (1,000 base and 500 flex).",
      "limits": [
        {
          "id": "monthly-ai-credits",
          "label": "Monthly AI credits (1,500 credits = $15.00 at the documented $0.01 per credit)",
          "type": "credit_pool",
          "amount": "15.00",
          "window": {
            "type": "calendar",
            "unit": "month",
            "timezone": "UTC"
          },
          "exceed": "allow_overage"
        }
      ],
      "qualitativeLimits": [
        {
          "id": "credit-reset-behaviour-no-carryover",
          "label": "Credit reset behaviour (no carryover)",
          "statement": "Included AI credits do not carry over between months. Unused credits are forfeited, and your allowance resets to the full monthly amount at 00:00:00 UTC on the first day of each calendar month. This reset date is fixed and does not change based on your subscription billing date.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "code-completions-and-next-edit-suggestions-unlim",
          "label": "Code completions and next edit suggestions (unlimited)",
          "statement": "Code completions and next edit suggestions are not billed in AI credits and remain unlimited for all paid plans.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "what-happens-when-included-credits-are-exhausted",
          "label": "What happens when included credits are exhausted",
          "statement": "When your AI credits are exhausted, you can: - Upgrade your plan. ... - Stay on your existing plan and pay for more usage. If your included credits are exhausted, you can continue working by setting a budget for additional usage . Note that additional usage may be capped , so to keep working, you'll need to pay off any additional usage you've already consumed in order to continue. - Alternatively, wait until the next monthly cycle when your included usage resets.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "topic": "after_limit"
        },
        {
          "id": "additional-usage-budget-usd-fixed-conversion-rat",
          "label": "Additional usage budget (USD, fixed conversion rate)",
          "statement": "Your additional usage budget is set in US dollars, and your usage is shown in GitHub AI Credits. GitHub AI Credits draw down your budget at a fixed rate: 1 AI credits = $0.01 USD, so a $10 budget covers 1,000 AI credits.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Copilot Pro is 'free for some users' (verified teachers, popular open-source maintainers) - the $10 USD/month is the standard price. The flex allotment is described as variable by GitHub.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability by plan",
          "statement": "Model access follows the published per-plan model table. Availability can also depend on organization policy and client support.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
        },
        {
          "id": "annual-sonnet-4-6-exception",
          "label": "Claude Sonnet 4.6 annual-plan exception",
          "statement": "Claude Sonnet 4.6 is retired for monthly Copilot Pro and Pro+ subscribers but remains available to individual subscribers on annual billing. This monthly-priced target excludes it.",
          "sourceUrl": "https://docs.github.com/en/copilot/reference/ai-models/supported-models"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5",
          "excluded": true
        },
        {
          "model": "claude-fable-5-1",
          "excluded": true
        },
        {
          "model": "claude-haiku-4-5",
          "pricingRef": "claude-haiku-4-5-github-pricing"
        },
        {
          "model": "claude-opus-4-7",
          "excluded": true
        },
        {
          "model": "claude-opus-4-8",
          "excluded": true
        },
        {
          "model": "claude-opus-4-8-fast-mode",
          "excluded": true
        },
        {
          "model": "claude-opus-5",
          "excluded": true
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5",
          "pricingRef": "claude-sonnet-5-github-pricing"
        },
        {
          "model": "gemini-3-5-flash",
          "pricingRef": "gemini-3-5-flash-github-pricing"
        },
        {
          "model": "gemini-3-6-flash",
          "pricingRef": "gemini-3-6-flash-github-pricing"
        },
        {
          "model": "gemini-3-7-flash",
          "pricingRef": "gemini-3-7-flash-github-pricing"
        },
        {
          "model": "gemini-3-8-flash",
          "pricingRef": "gemini-3-8-flash-github-pricing"
        },
        {
          "model": "gpt-5-3-codex",
          "pricingRef": "gpt-5-3-codex-github-pricing"
        },
        {
          "model": "gpt-5-4",
          "pricingRef": "gpt-5-4-github-pricing"
        },
        {
          "model": "gpt-5-4-mini",
          "pricingRef": "gpt-5-4-mini-github-pricing"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5",
          "excluded": true
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-github-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "excluded": true
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-github-pricing"
        },
        {
          "model": "gpt-5-mini",
          "pricingRef": "gpt-5-mini-github-pricing"
        },
        {
          "model": "gpt-6-astra",
          "excluded": true
        },
        {
          "model": "grok-4-5",
          "pricingRef": "grok-4-5-github-pricing"
        },
        {
          "model": "grok-4-6",
          "pricingRef": "grok-4-6-github-pricing"
        },
        {
          "model": "grok-4-7",
          "pricingRef": "grok-4-7-github-pricing"
        },
        {
          "model": "kimi-k2-7-code",
          "pricingRef": "kimi-k2-7-code-github-pricing"
        },
        {
          "model": "kimi-k3",
          "pricingRef": "kimi-k3-github-pricing"
        },
        {
          "model": "mai-code-1-1-flash",
          "pricingRef": "mai-code-1-1-flash-github-pricing"
        },
        {
          "model": "claude-opus-5-5",
          "excluded": true
        },
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-github-pricing"
        },
        {
          "model": "gpt-6-sol",
          "excluded": true
        }
      ],
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/get-started/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing",
          "title": "GitHub plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/ai-models/supported-models",
          "title": "GitHub model availability (official)",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "github-copilot-pro@2026-09-22",
      "planId": "github-copilot-pro",
      "planName": "Copilot Pro",
      "providerId": "github"
    },
    "google-ai-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "19.99",
        "interval": "month"
      },
      "billingMechanics": "Google AI Pro costs $19.99 per month in the US. Google describes its usage as 4x the Free tier; it does not publish an absolute allowance.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "4× standard Gemini Apps usage, with five-hour and weekly limits. Separate allowances apply in other Google AI products.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "gemini-apps-compute-based-usage-limit-relative-t",
          "label": "Gemini Apps compute-based usage limit (relative to no-plan users)",
          "statement": "Gemini Apps have compute-based usage limits that determine how much you can interact with Gemini tools and features. These limits factor in the complexity of your prompt, the models and features you use, and the length of your chat. Your limit refreshes every 5 hours until you reach your weekly limit. ... AI Pro | 4x higher than standard limits | AI Ultra | 5x or 20x higher than AI Pro limits depending on your subscription",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
        },
        {
          "id": "context-window-gemini-apps",
          "label": "Context window (Gemini Apps)",
          "statement": "Plan Context window ... AI Pro & AI Ultra 1 million tokens",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
        },
        {
          "id": "what-happens-when-you-reach-a-usage-limit",
          "label": "What happens when you reach a usage limit",
          "statement": "If you have a Google AI subscription and reach your limit, you can continue your conversation with Flash-Lite. If you reach your five hour or weekly usage limits you can upgrade to a Google AI subscription with higher limits or wait until your model limit is refreshed.",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805",
          "topic": "after_limit"
        },
        {
          "id": "ai-credits-for-extra-usage-flow-antigravity-othe",
          "label": "AI credits for extra usage (Flow, Antigravity, other products)",
          "statement": "Each product has its own AI usage limits. Your usage limits depend on which features you are using and your Google AI plan. If you reach your plan's limit, Google AI Pro and Google AI Ultra members can purchase AI credits to get extra usage in Google Flow and Google Antigravity.",
          "sourceUrl": "https://support.google.com/googleone/answer/14534406"
        },
        {
          "id": "limits-may-change-without-notice",
          "label": "Limits may change without notice",
          "statement": "Limits may change without notice, including due to capacity constraints. When there's a large increase in activity in Gemini Apps, we may change limits to maintain a high standard of quality.",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
        },
        {
          "id": "antigravity-jules-limits-relative-unquantified",
          "label": "Antigravity / Jules limits (relative, unquantified)",
          "statement": "Jules 9 - Higher limits to our asynchronous coding agent for software developers. Google Antigravity - Entry rate limits to agent model in Google Antigravity, our agentic development platform.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Google describes Gemini Apps limits in relative terms only ('4x higher than standard limits'), with no absolute counts. Context window is the only absolute number published (1 million tokens for AI Pro and AI Ultra). The Google One plans page describes a 'Google AI Plus (2 TB)' plan at $9.99/mo while gemini.google/subscriptions describes 'Google AI Plus' at $4.99/month with 400 GB storage - the two official pages describe different Google AI Plus entitlements, so the Plus tier is not recorded here.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Google publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        }
      ],
      "modelRules": [
        {
          "model": "gemini-3-1-pro",
          "pricingRef": "gemini-3-1-pro-pricing"
        },
        {
          "model": "gemini-3-flash",
          "pricingRef": "gemini-3-flash-pricing"
        },
        {
          "model": "gemini-3-flash-lite"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-pro"
        },
        {
          "model": "nano-banana-pro"
        }
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.google.com/gemini/answer/16275805",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.google.com/googleone/answer/14534406",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://gemini.google/us/subscriptions/",
          "title": "Google US subscription prices, relative limits and model lineup (3.6 Flash in Free, which paid plans include)",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "google-ai-pro@2026-09-21",
      "planId": "google-ai-pro",
      "planName": "Google AI Pro",
      "providerId": "google"
    },
    "google-ai-ultra-20x@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "199.99",
        "interval": "month"
      },
      "billingMechanics": "Google AI Ultra has a $199.99 per month tier with 20x the AI Pro usage limits.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "20× AI Pro usage in Gemini and Antigravity. Separate creative-tool and model limits apply.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "gemini-apps-usage-limit-relative-to-google-ai-pr",
          "label": "Gemini Apps usage limit relative to Google AI Pro (20x tier)",
          "statement": "$199.99 / month: 20x higher usage limits vs. AI Pro",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "usage-quota-vs-google-ai-pro-google-one-help",
          "label": "Usage quota vs Google AI Pro (Google One help)",
          "statement": "Based on your specific Google AI Ultra plan, you get 5x or 20x usage quota in Gemini and Google Antigravity compared to the Google AI Pro plan.",
          "sourceUrl": "https://support.google.com/googleone/answer/16286513"
        },
        {
          "id": "context-window-gemini-apps",
          "label": "Context window (Gemini Apps)",
          "statement": "Plan Context window ... AI Pro & AI Ultra 1 million tokens",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
        },
        {
          "id": "google-flow-credits-included",
          "label": "Google Flow credits included",
          "statement": "Google Flow 3 - Get 10,000 or 25,000 Google Flow Credits to use across our AI creative studio.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "antigravity-agent-rate-limits-highest-tier",
          "label": "Antigravity agent rate limits (highest tier)",
          "statement": "Ultra 20x: Highest rate limits to agent model in Google Antigravity, our agentic development platform.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "ai-credits-for-extra-usage",
          "label": "AI credits for extra usage",
          "statement": "If you reach your plan's limit, Google AI Pro and Google AI Ultra members can purchase AI credits to get extra usage in Google Flow and Google Antigravity.",
          "sourceUrl": "https://support.google.com/googleone/answer/16286513",
          "topic": "after_limit"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Google does not publish absolute quotas for either Ultra tier; the tiers differ only by the relative multiple (5x vs 20x of AI Pro). Google does not label these tiers with distinct product names on the pricing page beyond the price and multiple.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Google publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        }
      ],
      "modelRules": [
        {
          "model": "gemini-3-1-pro",
          "pricingRef": "gemini-3-1-pro-pricing"
        },
        {
          "model": "gemini-3-flash",
          "pricingRef": "gemini-3-flash-pricing"
        },
        {
          "model": "gemini-3-flash-lite"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-pro"
        },
        {
          "model": "nano-banana-pro"
        }
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.google.com/googleone/answer/16286513",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.google.com/gemini/answer/16275805",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://gemini.google/us/subscriptions/",
          "title": "Google US subscription prices, relative limits and model lineup (3.6 Flash in Free, which paid plans include)",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "google-ai-ultra-20x@2026-09-21",
      "planId": "google-ai-ultra-20x",
      "planName": "Google AI Ultra (20x tier)",
      "providerId": "google"
    },
    "google-ai-ultra@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "99.99",
        "interval": "month"
      },
      "billingMechanics": "Google AI Ultra has a $99.99 per month tier with 5x the AI Pro usage limits. Google also offers a separate $199.99 tier.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "5× AI Pro usage in Gemini and Antigravity. Deep Think access and separate creative-tool allowances.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "gemini-apps-usage-limit-relative-to-google-ai-pr",
          "label": "Gemini Apps usage limit relative to Google AI Pro (5x tier)",
          "statement": "AI Ultra | 5x or 20x higher than AI Pro limits depending on your subscription",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
        },
        {
          "id": "usage-quota-vs-google-ai-pro-google-one-help",
          "label": "Usage quota vs Google AI Pro (Google One help)",
          "statement": "With a Google AI Ultra plan, you get the highest access to Google AI. Based on your specific Google AI Ultra plan, you get 5x or 20x usage quota in Gemini and Google Antigravity compared to the Google AI Pro plan.",
          "sourceUrl": "https://support.google.com/googleone/answer/16286513"
        },
        {
          "id": "context-window-gemini-apps",
          "label": "Context window (Gemini Apps)",
          "statement": "Plan Context window ... AI Pro & AI Ultra 1 million tokens",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
        },
        {
          "id": "deep-think-ai-ultra-only",
          "label": "Deep Think (AI Ultra only)",
          "statement": "Deep think (AI Ultra only) provides maximum parallel reasoning. Deep Think queries generally can take a few minutes before seeing a response. Deep think requires the Pro model.",
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
        },
        {
          "id": "google-flow-credits-included",
          "label": "Google Flow credits included",
          "statement": "Google Flow 3 - Get 10,000 or 25,000 Google Flow Credits to use across our AI creative studio to create cinematic scenes and stories with access to Gemini Omni Flash and custom tool creation.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "ai-credits-for-extra-usage-flow-antigravity-othe",
          "label": "AI credits for extra usage (Flow, Antigravity, other products)",
          "statement": "You can also purchase AI credits with the Google AI Ultra plan, which can be used to extend your usage in Google Flow, Google Antigravity, and other products where AI credits are supported.",
          "sourceUrl": "https://support.google.com/googleone/answer/16286513",
          "topic": "after_limit"
        },
        {
          "id": "jules-and-antigravity-limits-relative-unquantifi",
          "label": "Jules and Antigravity limits (relative, unquantified)",
          "statement": "Jules 9 - Highest limits to our asynchronous coding agent for software developers ... Google Antigravity - Ultra 5x: Higher rate limits to agent model in Google Antigravity, our agentic development platform.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "Ultra's limits are stated only relative to Google AI Pro (5x or 20x), and AI Pro's own limit is stated only relative to the no-plan standard ('4x higher than standard limits'), so no absolute Ultra allowance is published. Deep Think is listed as available only on AI Ultra.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Google publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://gemini.google/subscriptions/"
        }
      ],
      "modelRules": [
        {
          "model": "gemini-3-1-pro",
          "pricingRef": "gemini-3-1-pro-pricing"
        },
        {
          "model": "gemini-3-flash",
          "pricingRef": "gemini-3-flash-pricing"
        },
        {
          "model": "gemini-3-flash-lite"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-pro"
        },
        {
          "model": "nano-banana-pro"
        }
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.google.com/gemini/answer/16275805",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://support.google.com/googleone/answer/16286513",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://gemini.google/us/subscriptions/",
          "title": "Google US subscription prices, relative limits and model lineup (3.6 Flash in Free, which paid plans include)",
          "checkedAt": "2026-09-24"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "google-ai-ultra@2026-09-21",
      "planId": "google-ai-ultra",
      "planName": "Google AI Ultra (5x tier)",
      "providerId": "google"
    },
    "ollama-cloud-max@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "$300 monthly usage credits at Ollama rates; 10 concurrent requests.",
          "sourceUrl": "https://ollama.com/pricing"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "Ollama",
          "sourceUrl": "https://ollama.com/pricing"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Purchased usage credits fund additional usage. Current credit-based plan; older subscriptions have separate terms.",
          "sourceUrl": "https://ollama.com/pricing",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "glm-5-3"
        },
        {
          "model": "glm-5-3-flash"
        },
        {
          "model": "kimi-k3"
        },
        {
          "model": "kimi-k2-7-code"
        },
        {
          "model": "deepseek-v4-1-flash"
        }
      ],
      "sources": [
        {
          "url": "https://ollama.com/pricing",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "ollama-cloud-max@2026-09-28",
      "planId": "ollama-cloud-max",
      "planName": "Ollama Cloud Max",
      "providerId": "ollama"
    },
    "openai-chatgpt-business@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "25",
        "interval": "month"
      },
      "billingMechanics": "Price is per seat.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "standard-seat-included-usage-unquantified-5-hour",
          "label": "Standard seat included usage (unquantified) + 5-hour usage limit",
          "statement": "Premium seats cost $100 per user per month when billed annually, or $125 per user per month when billed monthly. Premium includes 5x more usage than Standard seats, no 5-hour usage limit, and the flexibility to mix, assign, and reassign seat types - all within one secure, centrally managed workspace.",
          "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
        },
        {
          "id": "workspace-credits-for-usage-beyond-included-rate",
          "label": "Workspace credits for usage beyond included rate limits",
          "statement": "A ChatGPT Business workspace consists of Standard and Premium seats, which include usage for features such as Codex, reasoning models, and agentic features. When that included usage is exhausted, workspace credits can cover additional eligible usage, subject to your workspace's spend controls.",
          "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
          "topic": "after_limit"
        },
        {
          "id": "monthly-credit-usage-limits-per-seat-type-spend-",
          "label": "Monthly credit usage limits per seat type (spend controls)",
          "statement": "Workspace owners and admins can manage monthly credit usage limits by seat type and per-user overrides. ... Set monthly credit usage limits for Standard and Premium seats to manage additional usage beyond each member's included allowance. ... By default, all seats and users have no limits specified.",
          "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business"
        },
        {
          "id": "maximum-paid-seats-per-business-subscription",
          "label": "Maximum paid seats per Business subscription",
          "statement": "Starting on Aug 24, 2026, the maximum is 200 paid Standard and Premium seats total per ChatGPT Business subscription. Our support team is unable to change your maximum seat limit. If you need a larger number of seats, consider ChatGPT Enterprise.",
          "sourceUrl": "https://help.openai.com/en/articles/8801848"
        },
        {
          "id": "minimum-paid-seats",
          "label": "Minimum paid seats",
          "statement": "A workspace requires at least two paid seats, which can be any combination of Standard and Premium seats.",
          "sourceUrl": "https://help.openai.com/en/articles/8801848"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "OpenAI does not quantify the 'included usage' or 'included rate limits' for Business seats, and states there is 'no single credit or dollar equivalent for Premium's included usage'. The Premium seat is a second price point on the same plan; the Standard-seat price is recorded here as priceAmount and the Premium price is documented in notes/limits.",
          "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/8792828-chatgpt-business",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://help.openai.com/en/articles/8801848",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-business@2026-09-21",
      "planId": "openai-chatgpt-business",
      "planName": "ChatGPT Business (Standard seat)",
      "providerId": "openai"
    },
    "openai-chatgpt-business@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "25",
        "interval": "month"
      },
      "billingMechanics": "Price is per seat.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "Managed workspace with Standard and Premium seats, included agentic usage and optional workspace credits. Two paid seats minimum.",
          "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
        },
        {
          "id": "standard-seat-included-usage-unquantified-5-hour",
          "label": "Standard seat included usage (unquantified) + 5-hour usage limit",
          "statement": "Premium seats cost $100 per user per month when billed annually, or $125 per user per month when billed monthly. Premium includes 5x more usage than Standard seats, no 5-hour usage limit, and the flexibility to mix, assign, and reassign seat types - all within one secure, centrally managed workspace.",
          "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
        },
        {
          "id": "workspace-credits-for-usage-beyond-included-rate",
          "label": "Workspace credits for usage beyond included rate limits",
          "statement": "A ChatGPT Business workspace consists of Standard and Premium seats, which include usage for features such as Codex, reasoning models, and agentic features. When that included usage is exhausted, workspace credits can cover additional eligible usage, subject to your workspace's spend controls.",
          "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
          "topic": "after_limit"
        },
        {
          "id": "monthly-credit-usage-limits-per-seat-type-spend-",
          "label": "Monthly credit usage limits per seat type (spend controls)",
          "statement": "Workspace owners and admins can manage monthly credit usage limits by seat type and per-user overrides. ... Set monthly credit usage limits for Standard and Premium seats to manage additional usage beyond each member's included allowance. ... By default, all seats and users have no limits specified.",
          "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business"
        },
        {
          "id": "maximum-paid-seats-per-business-subscription",
          "label": "Maximum paid seats per Business subscription",
          "statement": "Starting on Aug 24, 2026, the maximum is 200 paid Standard and Premium seats total per ChatGPT Business subscription. Our support team is unable to change your maximum seat limit. If you need a larger number of seats, consider ChatGPT Enterprise.",
          "sourceUrl": "https://help.openai.com/en/articles/8801848"
        },
        {
          "id": "minimum-paid-seats",
          "label": "Minimum paid seats",
          "statement": "A workspace requires at least two paid seats, which can be any combination of Standard and Premium seats.",
          "sourceUrl": "https://help.openai.com/en/articles/8801848"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "OpenAI does not quantify the 'included usage' or 'included rate limits' for Business seats, and states there is 'no single credit or dollar equivalent for Premium's included usage'. The Premium seat is a second price point on the same plan; the Standard-seat price is recorded here as priceAmount and the Premium price is documented in notes/limits.",
          "sourceUrl": "https://help.openai.com/en/articles/8792828-chatgpt-business"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/8792828-chatgpt-business",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://help.openai.com/en/articles/8801848",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
          "title": "OpenAI model launch and paid plan availability",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://chatgpt.com/pricing/",
          "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-business@2026-09-22",
      "planId": "openai-chatgpt-business",
      "planName": "ChatGPT Business (Standard seat)",
      "providerId": "openai"
    },
    "openai-chatgpt-plus@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "ChatGPT Plus costs $20 per month, billed monthly. OpenAI does not offer annual billing for this plan.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "message-caps-on-plus-unquantified",
          "label": "Message caps on Plus (unquantified)",
          "statement": "To ensure a smooth experience for all users, Plus subscriptions may include usage limits such as message caps, especially during high demand. These limits may vary based on system conditions.",
          "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
        },
        {
          "id": "higher-model-limits-than-free",
          "label": "Higher model limits than Free",
          "statement": "Higher model limits: Use more messages and broader model options than on the Free plan. Model availability changes during rollouts; use the model picker for current access.",
          "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
        },
        {
          "id": "shared-work-codex-5-hour-and-weekly-allowances",
          "label": "Shared Work/Codex 5-hour and weekly allowances",
          "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage.",
          "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
        },
        {
          "id": "usage-credits-pay-as-you-go-overage-for-codex-wo",
          "label": "Usage credits (pay-as-you-go overage for Codex/Work)",
          "statement": "Credits let you continue using eligible features after reaching your plan's included limits. Supported features include Codex, ChatGPT Work, Word, Excel, and PowerPoint, depending on your plan and account. Your plan's included usage is used first. After you hit plan limits, usage draws from your credit balance.",
          "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
          "topic": "after_limit"
        },
        {
          "id": "support-cannot-reset-limits",
          "label": "Support cannot reset limits",
          "statement": "No. OpenAI Support does not reset ChatGPT or Codex usage limits. If you reach a limit, wait until it resets or use another available option shown in your account.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "OpenAI does not publish numeric message caps for Plus. The help center says only that limits 'may vary based on system conditions'. The Codex/Work allowance is described as shared across features but is not quantified on any official page I could read; the pricing page's price and limit widgets did not render values in my browser session (client-side gated), so all OpenAI prices here come from help.openai.com articles.",
          "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-plus@2026-09-21",
      "planId": "openai-chatgpt-plus",
      "planName": "ChatGPT Plus",
      "providerId": "openai"
    },
    "openai-chatgpt-plus@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "ChatGPT Plus costs $20 per month, billed monthly. OpenAI does not offer annual billing for this plan.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "ChatGPT, Codex and Work. Shared agentic usage with five-hour and weekly limits; optional paid credits.",
          "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
        },
        {
          "id": "message-caps-on-plus-unquantified",
          "label": "Message caps on Plus (unquantified)",
          "statement": "To ensure a smooth experience for all users, Plus subscriptions may include usage limits such as message caps, especially during high demand. These limits may vary based on system conditions.",
          "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
        },
        {
          "id": "higher-model-limits-than-free",
          "label": "Higher model limits than Free",
          "statement": "Higher model limits: Use more messages and broader model options than on the Free plan. Model availability changes during rollouts; use the model picker for current access.",
          "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
        },
        {
          "id": "shared-work-codex-5-hour-and-weekly-allowances",
          "label": "Shared Work/Codex 5-hour and weekly allowances",
          "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage.",
          "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
        },
        {
          "id": "usage-credits-pay-as-you-go-overage-for-codex-wo",
          "label": "Usage credits (pay-as-you-go overage for Codex/Work)",
          "statement": "Credits let you continue using eligible features after reaching your plan's included limits. Supported features include Codex, ChatGPT Work, Word, Excel, and PowerPoint, depending on your plan and account. Your plan's included usage is used first. After you hit plan limits, usage draws from your credit balance.",
          "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
          "topic": "after_limit"
        },
        {
          "id": "support-cannot-reset-limits",
          "label": "Support cannot reset limits",
          "statement": "No. OpenAI Support does not reset ChatGPT or Codex usage limits. If you reach a limit, wait until it resets or use another available option shown in your account.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "OpenAI does not publish numeric message caps for Plus. The help center says only that limits 'may vary based on system conditions'. The Codex/Work allowance is described as shared across features but is not quantified on any official page I could read; the pricing page's price and limit widgets did not render values in my browser session (client-side gated), so all OpenAI prices here come from help.openai.com articles.",
          "sourceUrl": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
          "title": "OpenAI model launch and paid plan availability",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://chatgpt.com/pricing/",
          "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-plus@2026-09-22",
      "planId": "openai-chatgpt-plus",
      "planName": "ChatGPT Plus",
      "providerId": "openai"
    },
    "openai-chatgpt-pro-20x@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "200",
        "interval": "month"
      },
      "billingMechanics": "Included as a separate entry because ChatGPT Pro has two official price points and usage allowances under one plan name.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "pro-200-usage-relative-to-plus",
          "label": "Pro $200 usage relative to Plus",
          "statement": "Pro $200 unlocks 20x usage than Plus.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "per-model-usage-allowances-temporary-model-unava",
          "label": "Per-model usage allowances (temporary model unavailability)",
          "statement": "When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "topic": "after_limit"
        },
        {
          "id": "new-sign-ups-and-upgrades-paused",
          "label": "New sign-ups and upgrades paused",
          "statement": "New sign-ups and upgrades to the ChatGPT Pro $200 plan are temporarily paused. Existing Pro $200 subscriptions will continue to renew as usual.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "The $200 tier cannot currently be purchased by new customers (pause since 2026-09-10), so its price is documented but not generally purchasable today. No numeric allowance published; 20x is relative to Plus, whose allowance is unquantified.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-pro-20x@2026-09-21",
      "planId": "openai-chatgpt-pro-20x",
      "planName": "ChatGPT Pro $200 (Pro 20x tier)",
      "providerId": "openai"
    },
    "openai-chatgpt-pro-20x@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "200",
        "interval": "month"
      },
      "billingMechanics": "Included as a separate entry because ChatGPT Pro has two official price points and usage allowances under one plan name.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "20× Plus usage. Existing subscriptions renew; new sign-ups and upgrades are currently paused.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "ChatGPT · Codex · ChatGPT Work",
          "sourceUrl": "https://openai.com/index/gpt-5-6/"
        },
        {
          "id": "pro-200-usage-relative-to-plus",
          "label": "Pro $200 usage relative to Plus",
          "statement": "Pro $200 unlocks 20x usage than Plus.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "per-model-usage-allowances-temporary-model-unava",
          "label": "Per-model usage allowances (temporary model unavailability)",
          "statement": "When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "topic": "after_limit"
        },
        {
          "id": "new-sign-ups-and-upgrades-paused",
          "label": "New sign-ups and upgrades paused",
          "statement": "New sign-ups and upgrades to the ChatGPT Pro $200 plan are temporarily paused. Existing Pro $200 subscriptions will continue to renew as usual.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "The $200 tier cannot currently be purchased by new customers (pause since 2026-09-10), so its price is documented but not generally purchasable today. No numeric allowance published; 20x is relative to Plus, whose allowance is unquantified.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
          "title": "OpenAI model launch and paid plan availability",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://chatgpt.com/pricing/",
          "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-pro-20x@2026-09-22",
      "planId": "openai-chatgpt-pro-20x",
      "planName": "ChatGPT Pro $200 (Pro 20x tier)",
      "providerId": "openai"
    },
    "openai-chatgpt-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "ChatGPT Pro has two price tiers. The $100 tier offers 5x the Plus usage allowance; the $200 tier offers 20x.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "pro-100-usage-relative-to-plus",
          "label": "Pro $100 usage relative to Plus",
          "statement": "Both Pro tiers include the same core capabilities. The main difference is usage allowance: Pro $100 unlocks 5x higher usage than Plus, while Pro $200 unlocks 20x usage than Plus.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "per-model-usage-allowances-temporary-model-unava",
          "label": "Per-model usage allowances (temporary model unavailability)",
          "statement": "Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier. The $100 Pro tier includes lower usage allowances than the $200 Pro tier. When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available. Reaching a model's allowance does not by itself mean that your account was restricted or that your subscription ended. You can use another available model or wait until the displayed reset time. There is no setting to increase or bypass a model's usage allowance.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "topic": "after_limit"
        },
        {
          "id": "5-hour-and-weekly-codex-work-allowances",
          "label": "5-hour and weekly Codex/Work allowances",
          "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage. It pulls your normal weekly allowance forward rather than adding a separate usage entitlement.",
          "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
        },
        {
          "id": "paid-instant-weekly-reset-plus-and-pro-only",
          "label": "Paid instant weekly reset (Plus and Pro only)",
          "statement": "Buying a reset is available to eligible ChatGPT Plus and Pro personal accounts on ChatGPT web and the Codex desktop app. It is not available on Free, Go, Business, Enterprise, or Edu plans.",
          "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
        },
        {
          "id": "usage-credits-pay-as-you-go-overage",
          "label": "Usage credits (pay-as-you-go overage)",
          "statement": "For Plus and Pro, Codex, ChatGPT Work, Excel, and PowerPoint can share the same agentic usage allowance when those features are available on your plan.",
          "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans"
        },
        {
          "id": "pro-200-new-signup-pause-as-of-2026-09-10",
          "label": "Pro $200 new-signup pause (as of 2026-09-10)",
          "statement": "As of September 10, 2026, we're temporarily pausing new sign-ups and upgrades to the ChatGPT Pro $200 plan (Pro 20X). This includes sign-ups and upgrades from Free, Go, Plus, or Pro $100. Existing ChatGPT Pro $200 subscriptions and new or existing ChatGPT Pro $100 subscriptions are not affected by this pause.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "OpenAI publishes no numeric allowance for Pro; usage is given only as a multiple of Plus ('5x higher usage than Plus'), and Plus's own allowance is unquantified. 'Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier.'",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-pro@2026-09-21",
      "planId": "openai-chatgpt-pro",
      "planName": "ChatGPT Pro ($100 / Pro 5x tier)",
      "providerId": "openai"
    },
    "openai-chatgpt-pro@2026-09-22": {
      "effectiveFrom": "2026-09-22",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "ChatGPT Pro has two price tiers. The $100 tier offers 5x the Plus usage allowance; the $200 tier offers 20x.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage-summary",
          "label": "Included usage",
          "statement": "5× Plus usage. ChatGPT, Codex and Work, with model-specific allowances and optional paid credits.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "pro-100-usage-relative-to-plus",
          "label": "Pro $100 usage relative to Plus",
          "statement": "Both Pro tiers include the same core capabilities. The main difference is usage allowance: Pro $100 unlocks 5x higher usage than Plus, while Pro $200 unlocks 20x usage than Plus.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "per-model-usage-allowances-temporary-model-unava",
          "label": "Per-model usage allowances (temporary model unavailability)",
          "statement": "Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier. The $100 Pro tier includes lower usage allowances than the $200 Pro tier. When you reach a model's allowance, that model may be temporarily unavailable until the allowance resets. ChatGPT displays the reset time when available. Reaching a model's allowance does not by itself mean that your account was restricted or that your subscription ended. You can use another available model or wait until the displayed reset time. There is no setting to increase or bypass a model's usage allowance.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "topic": "after_limit"
        },
        {
          "id": "5-hour-and-weekly-codex-work-allowances",
          "label": "5-hour and weekly Codex/Work allowances",
          "statement": "Customers on ChatGPT Plus and Pro plans can buy an instant reset from Usage settings in ChatGPT Desktop before reaching a limit, or from an in-app offer after reaching the weekly limit. A completed purchase immediately restores both 5-hour and weekly usage. It pulls your normal weekly allowance forward rather than adding a separate usage entitlement.",
          "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
        },
        {
          "id": "paid-instant-weekly-reset-plus-and-pro-only",
          "label": "Paid instant weekly reset (Plus and Pro only)",
          "statement": "Buying a reset is available to eligible ChatGPT Plus and Pro personal accounts on ChatGPT web and the Codex desktop app. It is not available on Free, Go, Business, Enterprise, or Edu plans.",
          "sourceUrl": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets"
        },
        {
          "id": "usage-credits-pay-as-you-go-overage",
          "label": "Usage credits (pay-as-you-go overage)",
          "statement": "For Plus and Pro, Codex, ChatGPT Work, Excel, and PowerPoint can share the same agentic usage allowance when those features are available on your plan.",
          "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans"
        },
        {
          "id": "pro-200-new-signup-pause-as-of-2026-09-10",
          "label": "Pro $200 new-signup pause (as of 2026-09-10)",
          "statement": "As of September 10, 2026, we're temporarily pausing new sign-ups and upgrades to the ChatGPT Pro $200 plan (Pro 20X). This includes sign-ups and upgrades from Free, Go, Plus, or Pro $100. Existing ChatGPT Pro $200 subscriptions and new or existing ChatGPT Pro $100 subscriptions are not affected by this pause.",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "what-the-provider-does-not-publish",
          "label": "What the provider does not publish",
          "statement": "OpenAI publishes no numeric allowance for Pro; usage is given only as a multiple of Plus ('5x higher usage than Plus'), and Plus's own allowance is unquantified. 'Some models have separate usage allowances on ChatGPT Pro, and allowances can differ by Pro tier.'",
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "OpenAI publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://openai.com/chatgpt/pricing/"
        }
      ],
      "modelRules": [
        {
          "model": "gpt-6-luna",
          "pricingRef": "gpt-6-luna-pricing"
        },
        {
          "model": "gpt-6-sol",
          "pricingRef": "gpt-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-luna",
          "pricingRef": "gpt-5-6-luna-pricing"
        },
        {
          "model": "gpt-5-6-sol",
          "pricingRef": "gpt-5-6-sol-pricing"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra",
          "pricingRef": "gpt-5-6-terra-pricing"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra",
          "pricingRef": "gpt-6-astra-pricing"
        }
      ],
      "sources": [
        {
          "url": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets",
          "title": "OpenAI plan documentation (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://community.openai.com/t/announcing-gpt-6-sol-and-gpt-6-luna/1399925",
          "title": "OpenAI model launch and paid plan availability",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://chatgpt.com/pricing/",
          "title": "OpenAI current ChatGPT subscription lineup; Sep 23 manual audit",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified",
      "versionId": "openai-chatgpt-pro@2026-09-22",
      "planId": "openai-chatgpt-pro",
      "planName": "ChatGPT Pro ($100 / Pro 5x tier)",
      "providerId": "openai"
    },
    "opencode-go-plus@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "40",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "Model-dependent monthly allowances, with five-hour and weekly limits.",
          "sourceUrl": "https://opencode.ai/v2/docs/console/go"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "OpenCode · Claude Code · Codex · Hermes",
          "sourceUrl": "https://opencode.ai/v2/docs/console/go"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Optional Zen balance can fund usage after the included limit; free models remain available.",
          "sourceUrl": "https://opencode.ai/v2/docs/console/go",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "glm-5-3"
        },
        {
          "model": "glm-5-3-flash"
        },
        {
          "model": "kimi-k3"
        },
        {
          "model": "kimi-k2-7-code"
        },
        {
          "model": "deepseek-v4-1-flash"
        },
        {
          "model": "gpt-6-luna"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "grok-4-6"
        },
        {
          "model": "grok-4-7"
        }
      ],
      "sources": [
        {
          "url": "https://opencode.ai/v2/docs/console/go",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "opencode-go-plus@2026-09-28",
      "planId": "opencode-go-plus",
      "planName": "OpenCode Go Plus",
      "providerId": "opencode"
    },
    "opencode-go@2026-09-28": {
      "effectiveFrom": "2026-09-28",
      "price": {
        "currency": "USD",
        "amount": "10",
        "interval": "month"
      },
      "billingMechanics": "Current monthly offer recorded on September 28, 2026. Provider usage credits follow provider-specific rates; they are not direct API dollars. Exact subscription capacity is not admitted for replay.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-usage",
          "label": "Included usage",
          "statement": "Model-dependent monthly allowances, with five-hour and weekly limits.",
          "sourceUrl": "https://opencode.ai/v2/docs/console/go"
        },
        {
          "id": "compatible-tools",
          "label": "Compatible tools",
          "statement": "OpenCode · Claude Code · Codex · Hermes",
          "sourceUrl": "https://opencode.ai/v2/docs/console/go"
        },
        {
          "id": "after-limit",
          "label": "After the limit",
          "statement": "Optional Zen balance can fund usage after the included limit; free models remain available.",
          "sourceUrl": "https://opencode.ai/v2/docs/console/go",
          "topic": "after_limit"
        }
      ],
      "modelRules": [
        {
          "model": "glm-5-3"
        },
        {
          "model": "glm-5-3-flash"
        },
        {
          "model": "kimi-k3"
        },
        {
          "model": "kimi-k2-7-code"
        },
        {
          "model": "deepseek-v4-1-flash"
        },
        {
          "model": "gpt-6-luna"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "grok-4-6"
        },
        {
          "model": "grok-4-7"
        }
      ],
      "sources": [
        {
          "url": "https://opencode.ai/v2/docs/console/go",
          "title": "Official current price, access and usage terms; catalog admission date, not a historical launch date",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified",
      "versionId": "opencode-go@2026-09-28",
      "planId": "opencode-go",
      "planName": "OpenCode Go",
      "providerId": "opencode"
    }
  },
  "pricing": {
    "anthropic-api-fable-5-1-cache-1h-d3": {
      "id": "anthropic-api-fable-5-1-cache-1h-d3",
      "role": "pricing",
      "modelId": "claude-fable-5-1",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "10",
        "output": "50",
        "cacheRead": "0.25",
        "cacheWrite": "20",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/fable-5-1/overview",
          "title": "Exact claude-fable-5-1 identity and standard token/category prices; explicit 1h write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-fable-5-1-cache-5m-d3": {
      "id": "anthropic-api-fable-5-1-cache-5m-d3",
      "role": "pricing",
      "modelId": "claude-fable-5-1",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "10",
        "output": "50",
        "cacheRead": "0.25",
        "cacheWrite": "12.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/fable-5-1/overview",
          "title": "Exact claude-fable-5-1 identity and standard token/category prices; explicit 5m write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-fable-5-1-current-rate-d3": {
      "id": "anthropic-api-fable-5-1-current-rate-d3",
      "role": "pricing",
      "modelId": "claude-fable-5-1",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "rates": {
        "input": "10",
        "output": "50",
        "cacheRead": "0.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/fable-5-1/overview",
          "title": "Exact claude-fable-5-1 identity and standard token/category prices; undifferentiated writes remain unknown",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-fable-5-cache-1h-d3": {
      "id": "anthropic-api-fable-5-cache-1h-d3",
      "role": "pricing",
      "modelId": "claude-fable-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "10",
        "output": "50",
        "cacheRead": "1",
        "cacheWrite": "20",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/fable-5/overview",
          "title": "Exact claude-fable-5 identity and standard token/category prices; explicit 1h write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-fable-5-cache-5m-d3": {
      "id": "anthropic-api-fable-5-cache-5m-d3",
      "role": "pricing",
      "modelId": "claude-fable-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "10",
        "output": "50",
        "cacheRead": "1",
        "cacheWrite": "12.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/fable-5/overview",
          "title": "Exact claude-fable-5 identity and standard token/category prices; explicit 5m write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-fable-5-current-rate-d3": {
      "id": "anthropic-api-fable-5-current-rate-d3",
      "role": "pricing",
      "modelId": "claude-fable-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "rates": {
        "input": "10",
        "output": "50",
        "cacheRead": "1",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/fable-5/overview",
          "title": "Exact claude-fable-5 identity and standard token/category prices; undifferentiated writes remain unknown",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-haiku-4-5-cache-1h-d0": {
      "id": "anthropic-api-haiku-4-5-cache-1h-d0",
      "role": "pricing",
      "modelId": "claude-haiku-4-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "1",
        "output": "5",
        "cacheRead": "0.10",
        "cacheWrite": "2"
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T18:20:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Explicit 1h cache-write interpretation; no inference from imported timestamps",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-haiku-4-5-cache-5m-d0": {
      "id": "anthropic-api-haiku-4-5-cache-5m-d0",
      "role": "pricing",
      "modelId": "claude-haiku-4-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "1",
        "output": "5",
        "cacheRead": "0.10",
        "cacheWrite": "1.25"
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T18:20:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Explicit 5m cache-write interpretation; no inference from imported timestamps",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-haiku-4-5-current-rate": {
      "id": "anthropic-api-haiku-4-5-current-rate",
      "role": "pricing",
      "modelId": "claude-haiku-4-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927",
      "rates": {
        "input": "1",
        "output": "5",
        "cacheRead": "0.10"
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T14:38:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "USD per 1M base input, output and cache-read tokens; standard global Claude API. Cache writes need duration and are unresolved here.",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-4-8-cache-1h-d3": {
      "id": "anthropic-api-opus-4-8-cache-1h-d3",
      "role": "pricing",
      "modelId": "claude-opus-4-8",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "10",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-4-8/overview",
          "title": "Exact claude-opus-4-8 identity and standard token/category prices; explicit 1h write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-4-8-cache-5m-d3": {
      "id": "anthropic-api-opus-4-8-cache-5m-d3",
      "role": "pricing",
      "modelId": "claude-opus-4-8",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-4-8/overview",
          "title": "Exact claude-opus-4-8 identity and standard token/category prices; explicit 5m write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-4-8-current-rate-d3": {
      "id": "anthropic-api-opus-4-8-current-rate-d3",
      "role": "pricing",
      "modelId": "claude-opus-4-8",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-4-8/overview",
          "title": "Exact claude-opus-4-8 identity and standard token/category prices; undifferentiated writes remain unknown",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-5-5-cache-1h-d3": {
      "id": "anthropic-api-opus-5-5-cache-1h-d3",
      "role": "pricing",
      "modelId": "claude-opus-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "4",
        "output": "20",
        "cacheRead": "0.2",
        "cacheWrite": "8",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
          "title": "Exact claude-opus-5-5 identity and standard token/category prices; explicit 1h write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-5-5-cache-5m-d3": {
      "id": "anthropic-api-opus-5-5-cache-5m-d3",
      "role": "pricing",
      "modelId": "claude-opus-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "4",
        "output": "20",
        "cacheRead": "0.2",
        "cacheWrite": "5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
          "title": "Exact claude-opus-5-5 identity and standard token/category prices; explicit 5m write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-5-5-current-rate-d3": {
      "id": "anthropic-api-opus-5-5-current-rate-d3",
      "role": "pricing",
      "modelId": "claude-opus-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "rates": {
        "input": "4",
        "output": "20",
        "cacheRead": "0.2",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
          "title": "Exact claude-opus-5-5 identity and standard token/category prices; undifferentiated writes remain unknown",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-5-cache-1h-d3": {
      "id": "anthropic-api-opus-5-cache-1h-d3",
      "role": "pricing",
      "modelId": "claude-opus-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "10",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5/overview",
          "title": "Exact claude-opus-5 identity and standard token/category prices; explicit 1h write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-5-cache-5m-d3": {
      "id": "anthropic-api-opus-5-cache-5m-d3",
      "role": "pricing",
      "modelId": "claude-opus-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5/overview",
          "title": "Exact claude-opus-5 identity and standard token/category prices; explicit 5m write scenario",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-opus-5-current-rate-d3": {
      "id": "anthropic-api-opus-5-current-rate-d3",
      "role": "pricing",
      "modelId": "claude-opus-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927-d3",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T20:39:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5/overview",
          "title": "Exact claude-opus-5 identity and standard token/category prices; undifferentiated writes remain unknown",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-sonnet-5-5-cache-1h-sonnet55": {
      "id": "anthropic-api-sonnet-5-5-cache-1h-sonnet55",
      "role": "pricing",
      "modelId": "claude-sonnet-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260928-sonnet55",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "2",
        "output": "10",
        "cacheRead": "0.2",
        "cacheWrite": "4",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-28T19:51:32Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Sonnet 5.5 input, output, cache reads and explicit 5m/1h cache-write prices",
          "checkedAt": "2026-09-28"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-28"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "anthropic-api-sonnet-5-5-cache-5m-sonnet55": {
      "id": "anthropic-api-sonnet-5-5-cache-5m-sonnet55",
      "role": "pricing",
      "modelId": "claude-sonnet-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260928-sonnet55",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "2",
        "output": "10",
        "cacheRead": "0.2",
        "cacheWrite": "2.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-28T19:51:32Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Sonnet 5.5 input, output, cache reads and explicit 5m/1h cache-write prices",
          "checkedAt": "2026-09-28"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-28"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "anthropic-api-sonnet-5-5-current-rate-sonnet55": {
      "id": "anthropic-api-sonnet-5-5-current-rate-sonnet55",
      "role": "pricing",
      "modelId": "claude-sonnet-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260928-sonnet55",
      "rates": {
        "input": "2",
        "output": "10",
        "cacheRead": "0.2",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-28T19:51:32Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Sonnet 5.5 input, output, cache reads and explicit 5m/1h cache-write prices",
          "checkedAt": "2026-09-28"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking billed as inclusive output",
          "checkedAt": "2026-09-28"
        },
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Standard pricing across 1M context",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "anthropic-api-sonnet-5-cache-1h-d0": {
      "id": "anthropic-api-sonnet-5-cache-1h-d0",
      "role": "pricing",
      "modelId": "claude-sonnet-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "2",
        "output": "10",
        "cacheRead": "0.20",
        "cacheWrite": "4",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T18:20:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Explicit 1h cache-write interpretation; no inference from imported timestamps",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-sonnet-5-cache-5m-d0": {
      "id": "anthropic-api-sonnet-5-cache-5m-d0",
      "role": "pricing",
      "modelId": "claude-sonnet-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "2",
        "output": "10",
        "cacheRead": "0.20",
        "cacheWrite": "2.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T18:20:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Explicit 5m cache-write interpretation; no inference from imported timestamps",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "anthropic-api-sonnet-5-current-rate": {
      "id": "anthropic-api-sonnet-5-current-rate",
      "role": "pricing",
      "modelId": "claude-sonnet-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "anthropic-messages-global",
      "rateVersion": "current-20260927",
      "rates": {
        "input": "2",
        "output": "10",
        "cacheRead": "0.20"
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T17:38:00Z",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Current standard text token prices and exact model route",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "claude-fable-5-1-github-pricing": {
      "id": "claude-fable-5-1-github-pricing",
      "role": "pricing",
      "modelId": "claude-fable-5-1",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "10.00",
        "output": "50.00",
        "cacheRead": "0.25",
        "cacheWrite": "12.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for Claude Fable 5.1 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-fable-5-1-pricing": {
      "id": "claude-fable-5-1-pricing",
      "role": "pricing",
      "modelId": "claude-fable-5-1",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "10.00",
        "output": "50.00",
        "cacheRead": "0.25",
        "cacheWrite": "12.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.claude.com/en/docs/about-claude/pricing",
          "title": "Claude fable 5 1 API list pricing (table row; cache write is the published 5-minute cache-write rate, 1.25x base input; the published 1-hour cache-write rate is not modeled). Cache reads are a separately published rate, not a discount off a merged input rate.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.claude.com/en/docs/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking-token billing relationship: \"Tokens Claude uses while thinking (billed as output tokens)\"; \"output_tokens\" remains the inclusive, authoritative total used for billing.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-fable-5-github-pricing": {
      "id": "claude-fable-5-github-pricing",
      "role": "pricing",
      "modelId": "claude-fable-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "10.00",
        "output": "50.00",
        "cacheRead": "1.00",
        "cacheWrite": "12.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for Claude Fable 5 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-fable-5-pricing": {
      "id": "claude-fable-5-pricing",
      "role": "pricing",
      "modelId": "claude-fable-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "10.00",
        "output": "50.00",
        "cacheRead": "1.00",
        "cacheWrite": "12.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.claude.com/en/docs/about-claude/pricing",
          "title": "Claude fable 5 API list pricing (table row; cache write is the published 5-minute cache-write rate, 1.25x base input; the published 1-hour cache-write rate is not modeled). Cache reads are a separately published rate, not a discount off a merged input rate.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.claude.com/en/docs/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking-token billing relationship: \"Tokens Claude uses while thinking (billed as output tokens)\"; \"output_tokens\" remains the inclusive, authoritative total used for billing.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-haiku-4-5-github-pricing": {
      "id": "claude-haiku-4-5-github-pricing",
      "role": "pricing",
      "modelId": "claude-haiku-4-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "1.00",
        "output": "5.00",
        "cacheRead": "0.10",
        "cacheWrite": "1.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for Claude Haiku 4.5 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-haiku-4-5-pricing": {
      "id": "claude-haiku-4-5-pricing",
      "role": "pricing",
      "modelId": "claude-haiku-4-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.00",
        "output": "5.00",
        "cacheRead": "0.10",
        "cacheWrite": "1.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.claude.com/en/docs/about-claude/pricing",
          "title": "Claude haiku 4 5 API list pricing (table row; cache write is the published 5-minute cache-write rate, 1.25x base input; the published 1-hour cache-write rate is not modeled). Cache reads are a separately published rate, not a discount off a merged input rate.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.claude.com/en/docs/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking-token billing relationship: \"Tokens Claude uses while thinking (billed as output tokens)\"; \"output_tokens\" remains the inclusive, authoritative total used for billing.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-4-6-api-reference-20260929-1h": {
      "id": "claude-opus-4-6-api-reference-20260929-1h",
      "role": "pricing",
      "modelId": "claude-opus-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "10",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-4-6/overview",
          "title": "Official one-hour cache-write rate; checked September 29, 2026",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "claude-opus-4-6-api-reference-20260929-5m": {
      "id": "claude-opus-4-6-api-reference-20260929-5m",
      "role": "pricing",
      "modelId": "claude-opus-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-4-6/overview",
          "title": "Official five-minute cache-write rate; checked September 29, 2026",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "claude-opus-4-6-api-reference-20260929": {
      "id": "claude-opus-4-6-api-reference-20260929",
      "role": "pricing",
      "modelId": "claude-opus-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-4-6/overview",
          "title": "Official standard token prices and cache rates; checked September 29, 2026",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking tokens are billed as output tokens",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "claude-opus-4-7-api-reference-20260928-1h": {
      "id": "claude-opus-4-7-api-reference-20260928-1h",
      "role": "pricing",
      "modelId": "claude-opus-4-7",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "10.0",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-opus-4-7-api-reference-20260928-5m": {
      "id": "claude-opus-4-7-api-reference-20260928-5m",
      "role": "pricing",
      "modelId": "claude-opus-4-7",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-opus-4-7-api-reference-20260928": {
      "id": "claude-opus-4-7-api-reference-20260928",
      "role": "pricing",
      "modelId": "claude-opus-4-7",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "5",
        "output": "25",
        "cacheRead": "0.5",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-opus-4-7-github-pricing": {
      "id": "claude-opus-4-7-github-pricing",
      "role": "pricing",
      "modelId": "claude-opus-4-7",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "5.00",
        "output": "25.00",
        "cacheRead": "0.50",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-4-8-fast-mode-github-pricing": {
      "id": "claude-opus-4-8-fast-mode-github-pricing",
      "role": "pricing",
      "modelId": "claude-opus-4-8-fast-mode",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "10.00",
        "output": "50.00",
        "cacheRead": "1.00",
        "cacheWrite": "12.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-4-8-github-pricing": {
      "id": "claude-opus-4-8-github-pricing",
      "role": "pricing",
      "modelId": "claude-opus-4-8",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "5.00",
        "output": "25.00",
        "cacheRead": "0.50",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for Claude Opus 4.8 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-4-8-pricing": {
      "id": "claude-opus-4-8-pricing",
      "role": "pricing",
      "modelId": "claude-opus-4-8",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "5.00",
        "output": "25.00",
        "cacheRead": "0.50",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.claude.com/en/docs/about-claude/pricing",
          "title": "Claude opus 4 8 API list pricing (table row; cache write is the published 5-minute cache-write rate, 1.25x base input; the published 1-hour cache-write rate is not modeled). Cache reads are a separately published rate, not a discount off a merged input rate.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.claude.com/en/docs/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking-token billing relationship: \"Tokens Claude uses while thinking (billed as output tokens)\"; \"output_tokens\" remains the inclusive, authoritative total used for billing.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-5-5-github-pricing": {
      "id": "claude-opus-5-5-github-pricing",
      "role": "pricing",
      "modelId": "claude-opus-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "4.00",
        "output": "20.00",
        "cacheRead": "0.20",
        "cacheWrite": "5.00",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-5-5-pricing": {
      "id": "claude-opus-5-5-pricing",
      "role": "pricing",
      "modelId": "claude-opus-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "4.00",
        "output": "20.00",
        "cacheRead": "0.20",
        "cacheWrite": "5.00",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-22",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/models/opus-5-5/overview",
          "title": "Claude Opus 5.5 API pricing; cache write is the 5-minute rate, not the 1-hour rate",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-5-github-pricing": {
      "id": "claude-opus-5-github-pricing",
      "role": "pricing",
      "modelId": "claude-opus-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "5.00",
        "output": "25.00",
        "cacheRead": "0.50",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for Claude Opus 5 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-opus-5-pricing": {
      "id": "claude-opus-5-pricing",
      "role": "pricing",
      "modelId": "claude-opus-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "5.00",
        "output": "25.00",
        "cacheRead": "0.50",
        "cacheWrite": "6.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.claude.com/en/docs/about-claude/pricing",
          "title": "Claude opus 5 API list pricing (table row; cache write is the published 5-minute cache-write rate, 1.25x base input; the published 1-hour cache-write rate is not modeled). Cache reads are a separately published rate, not a discount off a merged input rate.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.claude.com/en/docs/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking-token billing relationship: \"Tokens Claude uses while thinking (billed as output tokens)\"; \"output_tokens\" remains the inclusive, authoritative total used for billing.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-sonnet-4-6-api-reference-20260928-1h": {
      "id": "claude-sonnet-4-6-api-reference-20260928-1h",
      "role": "pricing",
      "modelId": "claude-sonnet-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "variantId": "cache-write-1h",
      "rates": {
        "input": "3",
        "output": "15",
        "cacheRead": "0.3",
        "cacheWrite": "6.0",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-sonnet-4-6-api-reference-20260928-5m": {
      "id": "claude-sonnet-4-6-api-reference-20260928-5m",
      "role": "pricing",
      "modelId": "claude-sonnet-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "variantId": "cache-write-5m",
      "rates": {
        "input": "3",
        "output": "15",
        "cacheRead": "0.3",
        "cacheWrite": "3.75",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-sonnet-4-6-api-reference-20260928": {
      "id": "claude-sonnet-4-6-api-reference-20260928",
      "role": "pricing",
      "modelId": "claude-sonnet-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "3",
        "output": "15",
        "cacheRead": "0.3",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.claude.com/docs/en/about-claude/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "claude-sonnet-5-github-pricing": {
      "id": "claude-sonnet-5-github-pricing",
      "role": "pricing",
      "modelId": "claude-sonnet-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "2.00",
        "output": "10.00",
        "cacheRead": "0.20",
        "cacheWrite": "2.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for Claude Sonnet 5 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "claude-sonnet-5-pricing": {
      "id": "claude-sonnet-5-pricing",
      "role": "pricing",
      "modelId": "claude-sonnet-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.00",
        "output": "10.00",
        "cacheRead": "0.20",
        "cacheWrite": "2.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.claude.com/en/docs/about-claude/pricing",
          "title": "Claude sonnet 5 API list pricing (table row; cache write is the published 5-minute cache-write rate, 1.25x base input; the published 1-hour cache-write rate is not modeled). Cache reads are a separately published rate, not a discount off a merged input rate.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.claude.com/en/docs/build-with-claude/thinking-steering-and-cost",
          "title": "Thinking-token billing relationship: \"Tokens Claude uses while thinking (billed as output tokens)\"; \"output_tokens\" remains the inclusive, authoritative total used for billing.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "deepseek-v4-1-flash-pricing": {
      "id": "deepseek-v4-1-flash-pricing",
      "role": "pricing",
      "modelId": "deepseek-v4-1-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.15",
        "output": "0.6",
        "cacheRead": "0.003"
      },
      "tiers": [
        {
          "id": "peak-hours",
          "label": "Peak: 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday",
          "when": {
            "utcWindows": [
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "01:00",
                "end": "04:00"
              },
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "06:00",
                "end": "10:00"
              }
            ]
          },
          "rates": {
            "input": "0.3",
            "output": "1.2",
            "cacheRead": "0.006"
          }
        }
      ],
      "effectiveFrom": "2026-09-10",
      "effectiveFromInstant": "2026-09-10T04:00:00Z",
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek-V4.1-Flash peak/off-peak schedule: \"Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).\" Base rates are the documented off-peak rates; the tier is the documented peak window.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "Rate rows: cache hit \"OFF-PEAK | $0.003\" / \"PEAK | $0.006\"; cache miss \"OFF-PEAK | $0.15\" / \"PEAK | $0.3\"; output \"OFF-PEAK | $0.6\" / \"PEAK | $1.2\" (the page prints one decimal). DeepSeek publishes no separate cache-write rate and no reasoning-token billing relationship.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/news/news260910/",
          "title": "V4.1 Flash pricing effective September 10 at 04:00 UTC",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "deepseek-v4-flash-pricing": {
      "id": "deepseek-v4-flash-pricing",
      "role": "pricing",
      "modelId": "deepseek-v4-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.15",
        "output": "0.6",
        "cacheRead": "0.003"
      },
      "tiers": [
        {
          "id": "peak-hours",
          "label": "Peak: 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday",
          "when": {
            "utcWindows": [
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "01:00",
                "end": "04:00"
              },
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "06:00",
                "end": "10:00"
              }
            ]
          },
          "rates": {
            "input": "0.3",
            "output": "1.2",
            "cacheRead": "0.006"
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "Legacy name: \"Use deepseek-flash as the model name. The legacy names deepseek-v4-flash and deepseek-v4-flash-vision-exp are still accepted, but the corresponding models have been retired, their requests are served by the DeepSeek-V4.1-Flash model and billed at the Flash price.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek-V4.1-Flash peak/off-peak schedule: \"Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).\" Base rates are the documented off-peak rates; the tier is the documented peak window.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "Rate rows: cache hit \"OFF-PEAK | $0.003\" / \"PEAK | $0.006\"; cache miss \"OFF-PEAK | $0.15\" / \"PEAK | $0.3\"; output \"OFF-PEAK | $0.6\" / \"PEAK | $1.2\" (the page prints one decimal). DeepSeek publishes no separate cache-write rate and no reasoning-token billing relationship.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/news/news260910/",
          "title": "Legacy V4 Flash name currently routes to V4.1 Flash; exact historical switch instant not published",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "deepseek-v4-flash-vision-exp-pricing": {
      "id": "deepseek-v4-flash-vision-exp-pricing",
      "role": "pricing",
      "modelId": "deepseek-v4-flash-vision-exp",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.15",
        "output": "0.6",
        "cacheRead": "0.003"
      },
      "tiers": [
        {
          "id": "peak-hours",
          "label": "Peak: 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday",
          "when": {
            "utcWindows": [
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "01:00",
                "end": "04:00"
              },
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "06:00",
                "end": "10:00"
              }
            ]
          },
          "rates": {
            "input": "0.3",
            "output": "1.2",
            "cacheRead": "0.006"
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "Legacy name: \"Use deepseek-flash as the model name. The legacy names deepseek-v4-flash and deepseek-v4-flash-vision-exp are still accepted, but the corresponding models have been retired, their requests are served by the DeepSeek-V4.1-Flash model and billed at the Flash price.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek-V4.1-Flash peak/off-peak schedule: \"Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).\" Base rates are the documented off-peak rates; the tier is the documented peak window.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "Rate rows: cache hit \"OFF-PEAK | $0.003\" / \"PEAK | $0.006\"; cache miss \"OFF-PEAK | $0.15\" / \"PEAK | $0.3\"; output \"OFF-PEAK | $0.6\" / \"PEAK | $1.2\" (the page prints one decimal). DeepSeek publishes no separate cache-write rate and no reasoning-token billing relationship.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/news/news260910/",
          "title": "Legacy V4 Flash name currently routes to V4.1 Flash; exact historical switch instant not published",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "deepseek-v4-pro-pricing": {
      "id": "deepseek-v4-pro-pricing",
      "role": "pricing",
      "modelId": "deepseek-v4-pro",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.66",
        "output": "1.98",
        "cacheRead": "0.022"
      },
      "tiers": [
        {
          "id": "peak-hours",
          "label": "Peak: 01:00-04:00 and 06:00-10:00 UTC, Monday to Friday",
          "when": {
            "utcWindows": [
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "01:00",
                "end": "04:00"
              },
              {
                "days": [
                  "mon",
                  "tue",
                  "wed",
                  "thu",
                  "fri"
                ],
                "start": "06:00",
                "end": "10:00"
              }
            ]
          },
          "rates": {
            "input": "1.32",
            "output": "3.96",
            "cacheRead": "0.044"
          }
        }
      ],
      "effectiveFrom": "2026-08-16",
      "effectiveFromInstant": "2026-08-16T16:00:00Z",
      "sources": [
        {
          "url": "https://api-docs.deepseek.com/quick_start/pricing",
          "title": "DeepSeek V4 Pro cache hit, cache miss, output and time of day prices",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://api-docs.deepseek.com/news/news260813/",
          "title": "DeepSeek V4 Pro price effective August 16",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "example-large-pricing": {
      "id": "example-large-pricing",
      "role": "pricing",
      "modelId": "example-large",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.00",
        "output": "6.00",
        "cacheRead": "0.20",
        "cacheWrite": "2.40",
        "reasoning": "8.00"
      },
      "effectiveFrom": "2026-01-01",
      "sources": [
        {
          "url": "https://example.invalid/pricing/example-large",
          "title": "Example Large pricing (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "example-medium-pricing": {
      "id": "example-medium-pricing",
      "role": "pricing",
      "modelId": "example-medium",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.50",
        "output": "1.50",
        "cacheRead": "0.05",
        "cacheWrite": "0.60",
        "reasoning": "2.00"
      },
      "effectiveFrom": "2026-01-01",
      "sources": [
        {
          "url": "https://example.invalid/pricing/example-medium",
          "title": "Example Medium pricing (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "example-small-pricing": {
      "id": "example-small-pricing",
      "role": "pricing",
      "modelId": "example-small",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.10",
        "output": "0.40",
        "cacheRead": "0.01",
        "cacheWrite": "0.12",
        "reasoning": "0.50"
      },
      "effectiveFrom": "2026-01-01",
      "sources": [
        {
          "url": "https://example.invalid/pricing/example-small",
          "title": "Example Small pricing (synthetic demo data)",
          "checkedAt": "2026-09-01"
        }
      ],
      "lastVerifiedAt": "2026-09-01",
      "verificationStatus": "estimated"
    },
    "gemini-3-1-pro-pricing": {
      "id": "gemini-3-1-pro-pricing",
      "role": "pricing",
      "modelId": "gemini-3-1-pro",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.00",
        "output": "12.00",
        "cacheRead": "0.20",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "over-200k",
          "label": "Prompts > 200k tokens",
          "when": {
            "inputTokensAbove": 200000
          },
          "rates": {
            "input": "4.00",
            "output": "18.00",
            "cacheRead": "0.40",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Gemini 3.1 Pro API list pricing (prompts <= 200k tier). No cache-write rate is published; context caching is a read rate plus a per-hour storage price.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Thinking-token billing relationship: \"Output price (including thinking tokens)\".",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Long-context tier rows: \"$2.00, prompts <= 200k tokens\" / \"$4.00, prompts > 200k tokens\" (input) and \"$12.00, prompts <= 200k tokens$18.00, prompts > 200k\" (output).",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gemini-3-5-flash-api-reference-20260928": {
      "id": "gemini-3-5-flash-api-reference-20260928",
      "role": "pricing",
      "modelId": "gemini-3-5-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.5",
        "output": "9",
        "cacheRead": "0.15",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-5-flash-github-pricing": {
      "id": "gemini-3-5-flash-github-pricing",
      "role": "pricing",
      "modelId": "gemini-3-5-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "1.50",
        "output": "9.00",
        "cacheRead": "0.15",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gemini-3-6-flash-api-reference-20260928": {
      "id": "gemini-3-6-flash-api-reference-20260928",
      "role": "pricing",
      "modelId": "gemini-3-6-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.75",
        "output": "3.75",
        "cacheRead": "0.075",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "effectiveTo": "2026-12-31",
      "sources": [
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-6-flash-github-pricing": {
      "id": "gemini-3-6-flash-github-pricing",
      "role": "pricing",
      "modelId": "gemini-3-6-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.75",
        "output": "3.75",
        "cacheRead": "0.075",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-23",
      "effectiveTo": "2026-12-31",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gemini-3-7-flash-api-reference-20260928": {
      "id": "gemini-3-7-flash-api-reference-20260928",
      "role": "pricing",
      "modelId": "gemini-3-7-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.75",
        "output": "3.75",
        "cacheRead": "0.075",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "effectiveTo": "2026-12-31",
      "sources": [
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gemini-3-7-flash-github-pricing": {
      "id": "gemini-3-7-flash-github-pricing",
      "role": "pricing",
      "modelId": "gemini-3-7-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.75",
        "output": "3.75",
        "cacheRead": "0.075",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-23",
      "effectiveTo": "2026-12-31",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gemini-3-8-flash-github-pricing": {
      "id": "gemini-3-8-flash-github-pricing",
      "role": "pricing",
      "modelId": "gemini-3-8-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.75",
        "output": "3.75",
        "cacheRead": "0.075",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-12-31",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for Gemini 3.8 Flash: \"Gemini 3.6 Flash, Gemini 3.7 Flash, and Gemini 3.8 Flash are available at the promotional pricing of $0.75 per 1M input tokens, $0.075 per 1M cached input tokens, and $3.75 per 1M output tokens through December 31, 2026.\" No cache-write column is published for Google models. GitHub publishes no rate for this model after that date.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gemini-3-8-flash-pricing-2027": {
      "id": "gemini-3-8-flash-pricing-2027",
      "role": "pricing",
      "modelId": "gemini-3-8-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.50",
        "output": "7.50",
        "cacheRead": "0.15",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2027-01-01",
      "sources": [
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Gemini 3.8 Flash API list pricing \"starting January 1, 2027\": input \"$1.50\", output (including thinking tokens) \"$7.50\", context caching \"$0.15\".",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Thinking-token billing relationship: \"Output price (including thinking tokens)\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gemini-3-8-flash-pricing": {
      "id": "gemini-3-8-flash-pricing",
      "role": "pricing",
      "modelId": "gemini-3-8-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.75",
        "output": "3.75",
        "cacheRead": "0.075",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "effectiveTo": "2026-12-31",
      "sources": [
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Gemini 3.8 Flash promotional API list pricing, valid \"through December 31, 2026\": input \"$0.75\", output (including thinking tokens) \"$3.75\", context caching \"$0.075\" (exactly three decimal places). Higher rates apply starting January 1, 2027 (see gemini-3-8-flash-pricing-2027).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Thinking-token billing relationship: \"Output price (including thinking tokens)\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gemini-3-flash-pricing": {
      "id": "gemini-3-flash-pricing",
      "role": "pricing",
      "modelId": "gemini-3-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.50",
        "output": "3.00",
        "cacheRead": "0.05",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Gemini 3 Flash API list pricing (text / image / video modality rates; no request-size tiers).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://ai.google.dev/gemini-api/docs/pricing",
          "title": "Thinking-token billing relationship: \"Output price (including thinking tokens)\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "glm-5-1-pricing": {
      "id": "glm-5-1-pricing",
      "role": "pricing",
      "modelId": "glm-5-1",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.4",
        "output": "4.4",
        "cacheRead": "0.26"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.AI API list pricing (GLM-5.1 row); no cache-write rate and no reasoning-token billing relationship is published.",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "glm-5-2-pricing": {
      "id": "glm-5-2-pricing",
      "role": "pricing",
      "modelId": "glm-5-2",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.4",
        "output": "4.4",
        "cacheRead": "0.26"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.AI API list pricing (GLM-5.2 row); no cache-write rate and no reasoning-token billing relationship is published.",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "glm-5-3-flash-pricing": {
      "id": "glm-5-3-flash-pricing",
      "role": "pricing",
      "modelId": "glm-5-3-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.15",
        "output": "0.50",
        "cacheRead": "0.03"
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.ai API list pricing (Model row for glm-5-3-flash); no cache-write rate and no reasoning-token billing relationship is published.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "glm-5-3-flashx-pricing": {
      "id": "glm-5-3-flashx-pricing",
      "role": "pricing",
      "modelId": "glm-5-3-flashx",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.37",
        "output": "1.25",
        "cacheRead": "0.075"
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.ai API list pricing (Model row for glm-5-3-flashx); no cache-write rate and no reasoning-token billing relationship is published.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "glm-5-3-pricing": {
      "id": "glm-5-3-pricing",
      "role": "pricing",
      "modelId": "glm-5-3",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.4",
        "output": "4.4",
        "cacheRead": "0.26"
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.ai API list pricing (Model row for glm-5-3); no cache-write rate and no reasoning-token billing relationship is published.",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "glm-5-pricing": {
      "id": "glm-5-pricing",
      "role": "pricing",
      "modelId": "glm-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1",
        "output": "3.2",
        "cacheRead": "0.2"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "Z.AI API list pricing (GLM-5 row); no cache-write rate and no reasoning-token billing relationship is published.",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "gpt-5-3-codex-github-pricing": {
      "id": "gpt-5-3-codex-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-3-codex",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "1.75",
        "output": "14.00",
        "cacheRead": "0.175",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5.3-Codex (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Cache-write billing relationship: \"the quoted table row shows Not applicable in the Cache write column\" (no separate write rate; stored tokens are \"input tokens (what's sent to the model)\").",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-3-codex-pricing": {
      "id": "gpt-5-3-codex-pricing",
      "role": "pricing",
      "modelId": "gpt-5-3-codex",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.75",
        "output": "14.00",
        "cacheRead": "0.175",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5.3-Codex API list pricing (row \"Codex | gpt-5.3-codex | $1.75 | $0.175 | $14.00\"); published cache-read rate is exactly \"$0.175\". \"Maximum input tokens: 272,000\" (no long-context tier).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/prompt-caching",
          "title": "Cache-write billing relationship: \"Cache-write pricing is not an additive fee: input tokens use the uncached-input, cached-input, or cache-write rate.\" Earlier models: \"No additional cache-write charge\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-4-github-pricing": {
      "id": "gpt-5-4-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-4",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "2.50",
        "output": "15.00",
        "cacheRead": "0.25",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (GitHub long-context tier)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "5.00",
            "output": "22.50",
            "cacheRead": "0.50",
            "cacheWrite": {
              "billedAs": "input"
            },
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5.4 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Cache-write billing relationship: \"the quoted table row shows Not applicable in the Cache write column\" (no separate write rate; stored tokens are \"input tokens (what's sent to the model)\").",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing long-context row (verbatim): GPT-5.4 | GA | Versatile | Long context | > 272K | $5.00 | $0.50 | Not applicable | $22.50",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-4-mini-github-pricing": {
      "id": "gpt-5-4-mini-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-4-mini",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.75",
        "output": "4.50",
        "cacheRead": "0.075",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5.4 mini (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Cache-write billing relationship: \"the quoted table row shows Not applicable in the Cache write column\" (no separate write rate; stored tokens are \"input tokens (what's sent to the model)\").",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-4-mini-pricing": {
      "id": "gpt-5-4-mini-pricing",
      "role": "pricing",
      "modelId": "gpt-5-4-mini",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.75",
        "output": "4.50",
        "cacheRead": "0.075",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5.4 mini API list pricing; published cache-read rate is exactly \"$0.075\". \"Maximum input tokens: 272,000\" (no long-context tier).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/prompt-caching",
          "title": "Cache-write billing relationship: \"Cache-write pricing is not an additive fee: input tokens use the uncached-input, cached-input, or cache-write rate.\" Earlier models: \"No additional cache-write charge\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-4-nano-api-reference-20260928": {
      "id": "gpt-5-4-nano-api-reference-20260928",
      "role": "pricing",
      "modelId": "gpt-5-4-nano",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.2",
        "output": "1.25",
        "cacheRead": "0.02",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.4-nano",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "gpt-5-4-nano-github-pricing": {
      "id": "gpt-5-4-nano-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-4-nano",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.20",
        "output": "1.25",
        "cacheRead": "0.02",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-4-pricing": {
      "id": "gpt-5-4-pricing",
      "role": "pricing",
      "modelId": "gpt-5-4",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.50",
        "output": "15.00",
        "cacheRead": "0.25",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (priced at 2x input and cache rates, 1.5x output, for the full request)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "5.00",
            "output": "22.50",
            "cacheRead": "0.50",
            "cacheWrite": {
              "billedAs": "input"
            },
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5.4 API list pricing (row \"gpt-5.4 (<272K context length)\").",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.4",
          "title": "Long-context relationship: \"For models with a 1.05M context window (GPT-5.4 and GPT-5.4 Pro), prompts with >272K input tokens are priced at 2x input and 1.5x output for the full session for standard, batch, and flex.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/prompt-caching",
          "title": "Cache-write billing relationship: \"Cache-write pricing is not an additive fee: input tokens use the uncached-input, cached-input, or cache-write rate.\" Earlier models: \"No additional cache-write charge\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-5-github-pricing": {
      "id": "gpt-5-5-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "5.00",
        "output": "30.00",
        "cacheRead": "0.50",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (GitHub long-context tier)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "10.00",
            "output": "45.00",
            "cacheRead": "1.00",
            "cacheWrite": {
              "billedAs": "input"
            },
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5.5 (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Cache-write billing relationship: \"the quoted table row shows Not applicable in the Cache write column\" (no separate write rate; stored tokens are \"input tokens (what's sent to the model)\").",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing long-context row (verbatim): GPT-5.5 | GA | Powerful | Long context | > 272K | $10.00 | $1.00 | Not applicable | $45.00",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-5-pricing": {
      "id": "gpt-5-5-pricing",
      "role": "pricing",
      "modelId": "gpt-5-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "5.00",
        "output": "30.00",
        "cacheRead": "0.50",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (priced at 2x input and cache rates, 1.5x output, for the full request)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "10.00",
            "output": "45.00",
            "cacheRead": "1.00",
            "cacheWrite": {
              "billedAs": "input"
            },
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5.5 API list pricing (row \"gpt-5.5 (<272K context length)\").",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.5",
          "title": "Long-context relationship: \"For GPT-5.5, prompts with >272K input tokens are priced at 2x input and 1.5x output for the full session for standard, batch, and flex.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/prompt-caching",
          "title": "Cache-write billing relationship: \"Cache-write pricing is not an additive fee: input tokens use the uncached-input, cached-input, or cache-write rate.\" Earlier models: \"No additional cache-write charge\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-6-luna-github-pricing": {
      "id": "gpt-5-6-luna-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-6-luna",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.20",
        "output": "1.20",
        "cacheRead": "0.02",
        "cacheWrite": "0.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 200K input tokens (GitHub long-context tier)",
          "when": {
            "inputTokensAbove": 200000
          },
          "rates": {
            "input": "0.40",
            "output": "1.80",
            "cacheRead": "0.04",
            "cacheWrite": "0.50",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5.6 Luna (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing long-context row (verbatim): GPT-5.6 Luna | GA | Lightweight | Long context | > 200K | $0.40 | $0.04 | $0.50 | $1.80",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-6-luna-pricing": {
      "id": "gpt-5-6-luna-pricing",
      "role": "pricing",
      "modelId": "gpt-5-6-luna",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.20",
        "output": "1.20",
        "cacheRead": "0.02",
        "cacheWrite": "0.25",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (priced at 2x input and cache rates, 1.5x output, for the full request)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "0.40",
            "output": "1.80",
            "cacheRead": "0.04",
            "cacheWrite": "0.50",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5.6 Luna API list pricing (short-context row).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.6-luna",
          "title": "Long-context relationship: \"Prompts with >272K input tokens are priced at 2x input and 1.5x output for the full request.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-6-sol-github-pricing": {
      "id": "gpt-5-6-sol-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-6-sol",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "4.00",
        "output": "20.00",
        "cacheRead": "0.40",
        "cacheWrite": "5.00",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (GitHub long-context tier)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "8.00",
            "output": "30.00",
            "cacheRead": "0.80",
            "cacheWrite": "10.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5.6 Sol (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing long-context row (verbatim): GPT-5.6 Sol | GA | Powerful | Long context | > 272K | $8.00 | $0.80 | $10.00 | $30.00",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-6-sol-pricing": {
      "id": "gpt-5-6-sol-pricing",
      "role": "pricing",
      "modelId": "gpt-5-6-sol",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "4.00",
        "output": "20.00",
        "cacheRead": "0.40",
        "cacheWrite": "5.00",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (priced at 2x input and cache rates, 1.5x output, for the full request)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "8.00",
            "output": "30.00",
            "cacheRead": "0.80",
            "cacheWrite": "10.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5.6 Sol API list pricing (short-context row). Promotional pricing note: \"GPT-5.6 Sol’s promotional pricing is available at least through November 21, 2026.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "Long-context rates row: \"gpt-5.6-sol | $4.00 | $0.40 | $5.00 | $20.00 | $8.00 | $0.80 | $10.00 | $30.00\" (short input | cached input | cache writes | output | long input | long cached | long writes | long output).",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-6-terra-github-pricing": {
      "id": "gpt-5-6-terra-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-6-terra",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "2.00",
        "output": "12.00",
        "cacheRead": "0.20",
        "cacheWrite": "2.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (GitHub long-context tier)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "4.00",
            "output": "18.00",
            "cacheRead": "0.40",
            "cacheWrite": "5.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5.6 Terra (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing long-context row (verbatim): GPT-5.6 Terra | GA | Versatile | Long context | > 272K | $4.00 | $0.40 | $5.00 | $18.00",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-6-terra-pricing": {
      "id": "gpt-5-6-terra-pricing",
      "role": "pricing",
      "modelId": "gpt-5-6-terra",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.00",
        "output": "12.00",
        "cacheRead": "0.20",
        "cacheWrite": "2.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (priced at 2x input and cache rates, 1.5x output, for the full request)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "4.00",
            "output": "18.00",
            "cacheRead": "0.40",
            "cacheWrite": "5.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5.6 Terra API list pricing (short-context row).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
          "title": "Long-context relationship: \"Prompts with >272K input tokens are priced at 2x input and 1.5x output for the full request.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-mini-github-pricing": {
      "id": "gpt-5-mini-github-pricing",
      "role": "pricing",
      "modelId": "gpt-5-mini",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.25",
        "output": "2.00",
        "cacheRead": "0.025",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-5 mini (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Cache-write billing relationship: \"the quoted table row shows Not applicable in the Cache write column\" (no separate write rate; stored tokens are \"input tokens (what's sent to the model)\").",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-5-mini-pricing": {
      "id": "gpt-5-mini-pricing",
      "role": "pricing",
      "modelId": "gpt-5-mini",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.25",
        "output": "2.00",
        "cacheRead": "0.025",
        "cacheWrite": {
          "billedAs": "input"
        },
        "reasoning": {
          "billedAs": "output"
        }
      },
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-5 mini API list pricing; published cache-read rate is exactly \"$0.025\". \"Maximum input tokens: 272,000\" (no long-context tier).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/prompt-caching",
          "title": "Cache-write billing relationship: \"Cache-write pricing is not an additive fee: input tokens use the uncached-input, cached-input, or cache-write rate.\" Earlier models: \"No additional cache-write charge\".",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-6-astra-github-pricing": {
      "id": "gpt-6-astra-github-pricing",
      "role": "pricing",
      "modelId": "gpt-6-astra",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "10.00",
        "output": "50.00",
        "cacheRead": "1.00",
        "cacheWrite": "12.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (GitHub long-context tier)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "20.00",
            "output": "75.00",
            "cacheRead": "2.00",
            "cacheWrite": "25.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot target billing: \"additional usage is billed in GitHub AI Credits at the per-token rates shown in the pricing tables below (1 AI credit = $0.01 USD).\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing table row for GPT-6 Astra (per 1M tokens).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "Thinking-token billing relationship: GitHub bills \"output tokens (what the model generates)\" at the published Output rate and publishes no separate reasoning category.",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot billing long-context row (verbatim): GPT-6 Astra | GA | Powerful | Long context | > 272K | $20.00 | $2.00 | $25.00 | $75.00",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-6-astra-pricing": {
      "id": "gpt-6-astra-pricing",
      "role": "pricing",
      "modelId": "gpt-6-astra",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "10.00",
        "output": "50.00",
        "cacheRead": "1.00",
        "cacheWrite": "12.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (priced at 2x input and cache rates, 1.5x output, for the full request)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "20.00",
            "output": "75.00",
            "cacheRead": "2.00",
            "cacheWrite": "25.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-6 Astra API list pricing (short-context row).",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-6-astra",
          "title": "Long-context relationship: \"Prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.\"",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Thinking-token billing relationship: \"While reasoning tokens are not visible via the API, they still occupy space in the model's context window and are billed as output tokens.\"",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-6-luna-github-pricing": {
      "id": "gpt-6-luna-github-pricing",
      "role": "pricing",
      "modelId": "gpt-6-luna",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.10",
        "output": "0.50",
        "cacheRead": "0.01",
        "cacheWrite": "0.125",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Input-side tokens above 272,000",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "0.20",
            "output": "0.75",
            "cacheRead": "0.02",
            "cacheWrite": "0.25",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-6-luna-pricing": {
      "id": "gpt-6-luna-pricing",
      "role": "pricing",
      "modelId": "gpt-6-luna",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.10",
        "output": "0.50",
        "cacheRead": "0.01",
        "cacheWrite": "0.125",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens; higher rates apply to the full request",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "0.20",
            "output": "0.75",
            "cacheRead": "0.02",
            "cacheWrite": "0.25",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-22",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-6 Luna standard short and long context API list prices",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-6-luna",
          "title": "Long context threshold and reasoning behavior",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-6-sol-github-pricing": {
      "id": "gpt-6-sol-github-pricing",
      "role": "pricing",
      "modelId": "gpt-6-sol",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "2.00",
        "output": "10.00",
        "cacheRead": "0.20",
        "cacheWrite": "2.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Input-side tokens above 272,000",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "4.00",
            "output": "15.00",
            "cacheRead": "0.40",
            "cacheWrite": "5.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "gpt-6-sol-pricing": {
      "id": "gpt-6-sol-pricing",
      "role": "pricing",
      "modelId": "gpt-6-sol",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.00",
        "output": "10.00",
        "cacheRead": "0.20",
        "cacheWrite": "2.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens; higher rates apply to the full request",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "4.00",
            "output": "15.00",
            "cacheRead": "0.40",
            "cacheWrite": "5.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-22",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/pricing",
          "title": "GPT-6 Sol standard short and long context API list prices",
          "checkedAt": "2026-09-23"
        },
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-6-sol",
          "title": "Long context threshold and reasoning behavior",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "grok-4-5-api-reference-20260928": {
      "id": "grok-4-5-api-reference-20260928",
      "role": "pricing",
      "modelId": "grok-4-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2",
        "output": "6",
        "cacheRead": "0.3"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "At least 200K prompt tokens",
          "when": {
            "inputTokensAbove": 199999
          },
          "rates": {
            "input": "4",
            "output": "12",
            "cacheRead": "0.6"
          }
        }
      ],
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://docs.x.ai/developers/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "grok-4-5-github-pricing": {
      "id": "grok-4-5-github-pricing",
      "role": "pricing",
      "modelId": "grok-4-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "2.00",
        "output": "6.00",
        "cacheRead": "0.50"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Input-side tokens above 200,000",
          "when": {
            "inputTokensAbove": 200000
          },
          "rates": {
            "input": "4.00",
            "output": "12.00",
            "cacheRead": "1.00"
          }
        }
      ],
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "grok-4-6-api-reference-20260928": {
      "id": "grok-4-6-api-reference-20260928",
      "role": "pricing",
      "modelId": "grok-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2",
        "output": "6",
        "cacheRead": "0.5"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "At least 200K prompt tokens",
          "when": {
            "inputTokensAbove": 199999
          },
          "rates": {
            "input": "4",
            "output": "12",
            "cacheRead": "1.0"
          }
        }
      ],
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://docs.x.ai/developers/pricing",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "grok-4-6-github-pricing": {
      "id": "grok-4-6-github-pricing",
      "role": "pricing",
      "modelId": "grok-4-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "2.00",
        "output": "6.00",
        "cacheRead": "0.50"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Input-side tokens above 200,000",
          "when": {
            "inputTokensAbove": 200000
          },
          "rates": {
            "input": "4.00",
            "output": "12.00",
            "cacheRead": "1.00"
          }
        }
      ],
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "grok-4-7-github-pricing": {
      "id": "grok-4-7-github-pricing",
      "role": "pricing",
      "modelId": "grok-4-7",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "2.00",
        "output": "6.00",
        "cacheRead": "0.50"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Input-side tokens above 200,000",
          "when": {
            "inputTokensAbove": 200000
          },
          "rates": {
            "input": "4.00",
            "output": "12.00",
            "cacheRead": "1.00"
          }
        }
      ],
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "grok-4-7-pricing": {
      "id": "grok-4-7-pricing",
      "role": "pricing",
      "modelId": "grok-4-7",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.00",
        "output": "6.00",
        "cacheRead": "0.50"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 200K prompt tokens",
          "when": {
            "inputTokensAbove": 200000
          },
          "rates": {
            "input": "4.00",
            "output": "12.00",
            "cacheRead": "1.00"
          }
        }
      ],
      "effectiveFrom": "2026-09-21",
      "sources": [
        {
          "url": "https://docs.x.ai/developers/release-notes",
          "title": "Grok 4.7 API price tiers; cache-write and reasoning billing not established",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "kimi-k2-6-api-reference-20260929": {
      "id": "kimi-k2-6-api-reference-20260929",
      "role": "pricing",
      "modelId": "kimi-k2-6",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.95",
        "output": "4",
        "cacheRead": "0.16"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://platform.kimi.ai/docs/pricing/chat",
          "title": "Official K2 series token prices; checked September 29, 2026",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "kimi-k2-7-code-api-reference-20260928": {
      "id": "kimi-k2-7-code-api-reference-20260928",
      "role": "pricing",
      "modelId": "kimi-k2-7-code",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.95",
        "output": "4",
        "cacheRead": "0.19"
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.kimi.ai/",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "kimi-k2-7-code-github-pricing": {
      "id": "kimi-k2-7-code-github-pricing",
      "role": "pricing",
      "modelId": "kimi-k2-7-code",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.95",
        "output": "4.00",
        "cacheRead": "0.19"
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "kimi-k3-api-reference-20260928": {
      "id": "kimi-k3-api-reference-20260928",
      "role": "pricing",
      "modelId": "kimi-k3",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "3",
        "output": "15",
        "cacheRead": "0.3"
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://platform.kimi.ai/",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "kimi-k3-github-pricing": {
      "id": "kimi-k3-github-pricing",
      "role": "pricing",
      "modelId": "kimi-k3",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "3.00",
        "output": "15.00",
        "cacheRead": "0.30"
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "mai-code-1-1-flash-github-pricing": {
      "id": "mai-code-1-1-flash-github-pricing",
      "role": "pricing",
      "modelId": "mai-code-1-1-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "target_billing_rate",
      "rates": {
        "input": "0.20",
        "output": "1.20",
        "cacheRead": "0.02"
      },
      "effectiveFrom": "2026-09-23",
      "sources": [
        {
          "url": "https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing",
          "title": "GitHub Copilot current per-model AI-credit token rates, including any long-context tier",
          "checkedAt": "2026-09-23"
        }
      ],
      "lastVerifiedAt": "2026-09-23",
      "verificationStatus": "verified"
    },
    "mimo-v2-5-pricing": {
      "id": "mimo-v2-5-pricing",
      "role": "pricing",
      "modelId": "mimo-v2-5",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.14",
        "output": "0.28",
        "cacheRead": "0.0028"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Overseas pricing, real-time API row for mimo-v2.5 (USD); cache writes are listed as limited-time free and are not recorded as a rate.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.5",
          "title": "Model page USD pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "mimo-v2-5-pro-pricing": {
      "id": "mimo-v2-5-pro-pricing",
      "role": "pricing",
      "modelId": "mimo-v2-5-pro",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.435",
        "output": "0.87",
        "cacheRead": "0.0036"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Overseas pricing, real-time API row for mimo-v2.5-pro (USD); cache writes are listed as limited-time free and are not recorded as a rate.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.5-pro",
          "title": "Model page USD pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "mimo-v2-6-flash-pricing": {
      "id": "mimo-v2-6-flash-pricing",
      "role": "pricing",
      "modelId": "mimo-v2-6-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.14",
        "output": "0.28",
        "cacheRead": "0.0028"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Overseas pricing, real-time API row for mimo-v2.6-flash (USD); cache writes are listed as limited-time free and are not recorded as a rate.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.6-flash",
          "title": "Model page USD pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "mimo-v2-6-pro-pricing": {
      "id": "mimo-v2-6-pro-pricing",
      "role": "pricing",
      "modelId": "mimo-v2-6-pro",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.435",
        "output": "0.87",
        "cacheRead": "0.0036"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://mimo.mi.com/docs/en-US/price/pay-as-you-go",
          "title": "Overseas pricing, real-time API row for mimo-v2.6-pro (USD); cache writes are listed as limited-time free and are not recorded as a rate.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://mimo.mi.com/models/en-US/mimo-v2.6-pro",
          "title": "Model page USD pricing",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "minimax-m2-7-pricing": {
      "id": "minimax-m2-7-pricing",
      "role": "pricing",
      "modelId": "minimax-m2-7",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.3",
        "output": "1.2",
        "cacheRead": "0.06",
        "cacheWrite": "0.375"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://platform.minimax.io/docs/guides/pricing-paygo",
          "title": "MiniMax pay-as-you-go LLM table, MiniMax-M2.7 row",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "minimax-m3-pricing": {
      "id": "minimax-m3-pricing",
      "role": "pricing",
      "modelId": "minimax-m3",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.30",
        "output": "1.20",
        "cacheRead": "0.06"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 512K input tokens",
          "when": {
            "inputTokensAbove": 512000
          },
          "rates": {
            "input": "0.60",
            "output": "2.40",
            "cacheRead": "0.12"
          }
        }
      ],
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://platform.minimax.io/docs/guides/pricing-paygo",
          "title": "MiniMax pay-as-you-go Standard tab, MiniMax-M3 rows \"≤ 512k input tokens\" and \"> 512k input tokens\" (permanent 50% off prices); no cache-write rate is published.",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "muse-spark-1-3-api-reference-20260928": {
      "id": "muse-spark-1-3-api-reference-20260928",
      "role": "pricing",
      "modelId": "muse-spark-1-3",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "1.25",
        "output": "4.25",
        "cacheRead": "0.15"
      },
      "effectiveFrom": "2026-09-28",
      "sources": [
        {
          "url": "https://developer.meta.com/ai/models/muse-spark/",
          "title": "Official standard token prices; checked September 28, 2026",
          "checkedAt": "2026-09-28"
        }
      ],
      "lastVerifiedAt": "2026-09-28",
      "verificationStatus": "verified"
    },
    "openai-api-gpt-5-4-mini-current-rate": {
      "id": "openai-api-gpt-5-4-mini-current-rate",
      "role": "pricing",
      "modelId": "gpt-5-4-mini",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "openai-responses-standard",
      "rateVersion": "current-20260927",
      "rates": {
        "input": "0.75",
        "output": "4.50",
        "cacheRead": "0.075"
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T14:38:00Z",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.4-mini",
          "title": "USD per 1M standard text input, output and cached-input tokens; regional, batch, fast and tool charges are outside this route.",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "openai-api-gpt-5-6-sol-promotion-rate": {
      "id": "openai-api-gpt-5-6-sol-promotion-rate",
      "role": "pricing",
      "modelId": "gpt-5-6-sol",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "openai-responses-standard",
      "rateVersion": "current-20260927",
      "variantId": "promotion-d0",
      "rates": {
        "input": "4.00",
        "output": "20.00",
        "cacheRead": "0.40",
        "cacheWrite": "5.00",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens (priced at 2x input and cache rates, 1.5x output, for the full request)",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "8.00",
            "output": "30.00",
            "cacheRead": "0.80",
            "cacheWrite": "10.00",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T18:20:00Z",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
          "title": "Current temporary standard rates, full-request context tier, explicit cache-write rate; promotion at least through November 21",
          "checkedAt": "2026-09-27"
        },
        {
          "url": "https://developers.openai.com/api/docs/guides/reasoning",
          "title": "Reasoning billed as output",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "openai-api-gpt-6-sol-current-rate": {
      "id": "openai-api-gpt-6-sol-current-rate",
      "role": "pricing",
      "modelId": "gpt-6-sol",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "openai-responses-standard",
      "rateVersion": "current-20260927",
      "rates": {
        "input": "2",
        "output": "10",
        "cacheRead": "0.20",
        "cacheWrite": "2.50",
        "reasoning": {
          "billedAs": "output"
        }
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 272K input tokens; higher rates apply to the full request",
          "when": {
            "inputTokensAbove": 272000
          },
          "rates": {
            "input": "4",
            "output": "15",
            "cacheRead": "0.40",
            "cacheWrite": "5",
            "reasoning": {
              "billedAs": "output"
            }
          }
        }
      ],
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T17:38:00Z",
      "sources": [
        {
          "url": "https://developers.openai.com/api/docs/models/gpt-6-sol",
          "title": "Current standard text token prices and exact model route",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    },
    "qwen-3-7-max-pricing": {
      "id": "qwen-3-7-max-pricing",
      "role": "pricing",
      "modelId": "qwen-3-7-max",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2.5",
        "output": "7.5",
        "cacheRead": "0.5"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max",
          "title": "Model page pricing, Singapore (Scope: International); cacheRead is the Input(Implicit Cache) rate. Explicit cache prices are listed separately.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
          "title": "Model Studio pricing (standard prices; tier rule applies to all tokens in the request)",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-7-plus-pricing": {
      "id": "qwen-3-7-plus-pricing",
      "role": "pricing",
      "modelId": "qwen-3-7-plus",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.4",
        "output": "1.6",
        "cacheRead": "0.08"
      },
      "tiers": [
        {
          "id": "long-context",
          "label": "Above 256K input tokens (all tokens in the request)",
          "when": {
            "inputTokensAbove": 256000
          },
          "rates": {
            "input": "1.2",
            "output": "4.8",
            "cacheRead": "0.24"
          }
        }
      ],
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus",
          "title": "Model page pricing, Singapore (Scope: International); cacheRead is the Input(Implicit Cache) rate. Explicit cache prices are listed separately.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
          "title": "Model Studio pricing (standard prices; tier rule applies to all tokens in the request)",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-8-27b-pricing": {
      "id": "qwen-3-8-27b-pricing",
      "role": "pricing",
      "modelId": "qwen-3-8-27b",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.5",
        "output": "3",
        "cacheRead": "0.1"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b",
          "title": "Model page pricing, Singapore (Scope: International); cacheRead is the Input(Implicit Cache) rate. Explicit cache prices are listed separately.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
          "title": "Model Studio pricing (standard prices; tier rule applies to all tokens in the request)",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-8-flash-pricing": {
      "id": "qwen-3-8-flash-pricing",
      "role": "pricing",
      "modelId": "qwen-3-8-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "0.15",
        "output": "0.47",
        "cacheRead": "0.016"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash",
          "title": "Model page pricing, Singapore (Scope: International); cacheRead is the Input(Implicit Cache) rate. Explicit cache prices are listed separately.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
          "title": "Model Studio pricing (standard prices; tier rule applies to all tokens in the request)",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "qwen-3-8-max-pricing": {
      "id": "qwen-3-8-max-pricing",
      "role": "pricing",
      "modelId": "qwen-3-8-max",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "rates": {
        "input": "2",
        "output": "6",
        "cacheRead": "0.25"
      },
      "effectiveFrom": "2026-09-29",
      "sources": [
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max",
          "title": "Model page pricing, Singapore (Scope: International); cacheRead is the Input(Implicit Cache) rate. Explicit cache prices are listed separately.",
          "checkedAt": "2026-09-29"
        },
        {
          "url": "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
          "title": "Model Studio pricing (standard prices; tier rule applies to all tokens in the request)",
          "checkedAt": "2026-09-29"
        }
      ],
      "lastVerifiedAt": "2026-09-29",
      "verificationStatus": "verified"
    },
    "z-ai-api-glm-5-3-flash-current-rate": {
      "id": "z-ai-api-glm-5-3-flash-current-rate",
      "role": "pricing",
      "modelId": "glm-5-3-flash",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "basis": "api_list_price",
      "endpointId": "z-ai-chat-completions",
      "rateVersion": "current-20260927",
      "rates": {
        "input": "0.15",
        "output": "0.50",
        "cacheRead": "0.03"
      },
      "effectiveFrom": "2026-09-27",
      "effectiveTo": "2026-10-27",
      "effectiveFromInstant": "2026-09-27T14:38:00Z",
      "sources": [
        {
          "url": "https://docs.z.ai/guides/overview/pricing",
          "title": "USD per 1M uncached input, output and cached-input tokens. Cached-input storage promotion is omitted; cache-write and reasoning billing are unresolved.",
          "checkedAt": "2026-09-27"
        }
      ],
      "lastVerifiedAt": "2026-09-27",
      "verificationStatus": "verified"
    }
  }
};
