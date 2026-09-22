/**
 * GENERATED FILE - do not edit by hand.
 *
 * Regenerate with `pnpm --filter @stackreplay/catalog build`.
 * Source of truth: packages/catalog/data/**.yaml
 * Guarded by bundled.test.ts, which fails when this snapshot drifts.
 */

import type { CatalogV1 } from "./catalog.js";

export const BUNDLED_CATALOG_VERSION = "sha256:3b5f461b7807913147513d0ff261261944d7b07468afd0065d4f9b054934cdcf";

export const BUNDLED_CATALOG: CatalogV1 = {
  "catalogVersion": "sha256:3b5f461b7807913147513d0ff261261944d7b07468afd0065d4f9b054934cdcf",
  "providers": {
    "anthropic": {
      "id": "anthropic",
      "role": "provider",
      "name": "Anthropic",
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
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
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
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
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
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
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
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
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    }
  },
  "models": {
    "claude-fable-5-1": {
      "id": "claude-fable-5-1",
      "role": "model",
      "name": "Claude Fable 5.1",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-fable-5": {
      "id": "claude-fable-5",
      "role": "model",
      "name": "Claude Fable 5",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-fable": {
      "id": "claude-fable",
      "role": "model",
      "name": "Fable",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-haiku-4-5": {
      "id": "claude-haiku-4-5",
      "role": "model",
      "name": "Claude Haiku 4.5",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-haiku": {
      "id": "claude-haiku",
      "role": "model",
      "name": "Haiku",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-opus-4-7": {
      "id": "claude-opus-4-7",
      "role": "model",
      "name": "Claude Opus 4.7",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-opus-4-8-fast-mode": {
      "id": "claude-opus-4-8-fast-mode",
      "role": "model",
      "name": "Claude Opus 4.8 (fast mode) (preview)",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-opus-4-8": {
      "id": "claude-opus-4-8",
      "role": "model",
      "name": "Claude Opus 4.8",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-opus-5": {
      "id": "claude-opus-5",
      "role": "model",
      "name": "Claude Opus 5",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-opus": {
      "id": "claude-opus",
      "role": "model",
      "name": "Opus",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-sonnet-4-6": {
      "id": "claude-sonnet-4-6",
      "role": "model",
      "name": "Claude Sonnet 4.6",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-sonnet-5": {
      "id": "claude-sonnet-5",
      "role": "model",
      "name": "Claude Sonnet 5",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "claude-sonnet": {
      "id": "claude-sonnet",
      "role": "model",
      "name": "Sonnet",
      "providerIds": [
        "anthropic"
      ],
      "sources": [
        {
          "url": "https://claude.com/pricing",
          "title": "Anthropic pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "composer-2-5": {
      "id": "composer-2-5",
      "role": "model",
      "name": "Composer 2.5",
      "providerIds": [
        "cursor"
      ],
      "sources": [
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
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
      "providerIds": [
        "cursor",
        "google"
      ],
      "sources": [
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gemini-3-5-flash": {
      "id": "gemini-3-5-flash",
      "role": "model",
      "name": "Gemini 3.5 Flash",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gemini-3-6-flash": {
      "id": "gemini-3-6-flash",
      "role": "model",
      "name": "Gemini 3.6 Flash",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gemini-3-7-flash": {
      "id": "gemini-3-7-flash",
      "role": "model",
      "name": "Gemini 3.7 Flash",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gemini-3-8-flash": {
      "id": "gemini-3-8-flash",
      "role": "model",
      "name": "Gemini 3.8 Flash",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gemini-3-flash-lite": {
      "id": "gemini-3-flash-lite",
      "role": "model",
      "name": "Gemini 3 Flash-Lite",
      "providerIds": [
        "google"
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gemini-3-flash": {
      "id": "gemini-3-flash",
      "role": "model",
      "name": "Gemini 3 Flash",
      "providerIds": [
        "google"
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gemini-3-pro": {
      "id": "gemini-3-pro",
      "role": "model",
      "name": "Gemini 3 Pro",
      "providerIds": [
        "google"
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-3-codex": {
      "id": "gpt-5-3-codex",
      "role": "model",
      "name": "GPT-5.3-Codex",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-4-mini": {
      "id": "gpt-5-4-mini",
      "role": "model",
      "name": "GPT-5.4 mini",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-4-nano": {
      "id": "gpt-5-4-nano",
      "role": "model",
      "name": "GPT-5.4 nano",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-4": {
      "id": "gpt-5-4",
      "role": "model",
      "name": "GPT-5.4",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-5": {
      "id": "gpt-5-5",
      "role": "model",
      "name": "GPT-5.5",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-6-luna": {
      "id": "gpt-5-6-luna",
      "role": "model",
      "name": "GPT-5.6 Luna",
      "providerIds": [
        "cursor",
        "github",
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-6-sol-pro": {
      "id": "gpt-5-6-sol-pro",
      "role": "model",
      "name": "GPT-5.6 Sol Pro",
      "providerIds": [
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-6-sol": {
      "id": "gpt-5-6-sol",
      "role": "model",
      "name": "GPT-5.6 Sol",
      "providerIds": [
        "cursor",
        "github",
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-6-terra": {
      "id": "gpt-5-6-terra",
      "role": "model",
      "name": "GPT-5.6 Terra",
      "providerIds": [
        "cursor",
        "github",
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-mini": {
      "id": "gpt-5-mini",
      "role": "model",
      "name": "GPT-5 mini",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-5-thinking-mini": {
      "id": "gpt-5-thinking-mini",
      "role": "model",
      "name": "GPT-5 Thinking Mini",
      "providerIds": [
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "gpt-6-astra": {
      "id": "gpt-6-astra",
      "role": "model",
      "name": "GPT-6 Astra",
      "providerIds": [
        "github",
        "openai"
      ],
      "sources": [
        {
          "url": "https://openai.com/chatgpt/pricing/",
          "title": "OpenAI pricing (official)",
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
    "grok-4-5": {
      "id": "grok-4-5",
      "role": "model",
      "name": "Grok 4.5",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "grok-4-6": {
      "id": "grok-4-6",
      "role": "model",
      "name": "Grok 4.6",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "grok-4-7": {
      "id": "grok-4-7",
      "role": "model",
      "name": "Grok 4.7",
      "providerIds": [
        "cursor",
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "kimi-k2-7-code": {
      "id": "kimi-k2-7-code",
      "role": "model",
      "name": "Kimi K2.7 Code",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "kimi-k3": {
      "id": "kimi-k3",
      "role": "model",
      "name": "Kimi K3",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "mai-code-1-1-flash": {
      "id": "mai-code-1-1-flash",
      "role": "model",
      "name": "MAI-Code-1.1-Flash",
      "providerIds": [
        "github"
      ],
      "sources": [
        {
          "url": "https://github.com/features/copilot/plans",
          "title": "GitHub pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "muse-spark-1-3": {
      "id": "muse-spark-1-3",
      "role": "model",
      "name": "Muse Spark 1.3",
      "providerIds": [
        "cursor"
      ],
      "sources": [
        {
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    },
    "nano-banana-pro": {
      "id": "nano-banana-pro",
      "role": "model",
      "name": "Nano Banana Pro",
      "providerIds": [
        "google"
      ],
      "sources": [
        {
          "url": "https://gemini.google/subscriptions/",
          "title": "Google official page",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified"
    }
  },
  "plans": {
    "anthropic-claude-max-20x": {
      "id": "anthropic-claude-max-20x",
      "role": "plan",
      "name": "Claude Max 20x",
      "providerId": "anthropic",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "200",
            "interval": "month"
          },
          "billingMechanics": "Official pricing: 'Max 20x : $200 per month'.",
          "limits": [
            {
              "id": "daily-credit-redemption",
              "label": "Daily usage-credit redemption limit",
              "type": "credit_pool",
              "amount": "2000.00",
              "window": {
                "type": "calendar",
                "unit": "day",
                "timezone": "UTC"
              },
              "exceed": "reject_request"
            }
          ],
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
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
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
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
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
              "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (Pro and Max)",
              "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
              "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
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
              "url": "https://claude.com/pricing",
              "title": "Anthropic pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
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
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "Monthly price is $20 (pricing page card: '$17 Per month with annual subscription discount ( $200 billed up front).",
          "limits": [
            {
              "id": "daily-credit-redemption",
              "label": "Daily usage-credit redemption limit",
              "type": "credit_pool",
              "amount": "2000.00",
              "window": {
                "type": "calendar",
                "unit": "day",
                "timezone": "UTC"
              },
              "exceed": "reject_request"
            }
          ],
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
              "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
            },
            {
              "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
              "label": "Discounted usage-bundle purchase cap (Pro and Max)",
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
        }
      ]
    },
    "cursor-hobby": {
      "id": "cursor-hobby",
      "role": "plan",
      "name": "Hobby",
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
              "statement": "Hobby's usage limits are not published anywhere official that I could find: the pricing page says only 'Limited Agent requests' and the docs do not list Hobby in the plan table. No number, window or exceed behaviour is documented. Note that some cursor.com locale/legacy variants of the same page describe Hobby as 'Limited Tab completions' rather than 'Access to Composer'; the live cursor.com/pricing page I read on 2026-09-21 said 'Access to Composer'.",
              "sourceUrl": "https://cursor.com/pricing"
            },
            {
              "id": "model-availability-scope",
              "label": "Model availability scope",
              "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "composer-2-5"
            },
            {
              "model": "gemini-3-1-pro"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
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
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ]
    },
    "cursor-pro-plus": {
      "id": "cursor-pro-plus",
      "role": "plan",
      "name": "Pro+",
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
              "sourceUrl": "https://cursor.com/docs/account/pricing"
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
              "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "composer-2-5"
            },
            {
              "model": "gemini-3-1-pro"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
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
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ]
    },
    "cursor-pro": {
      "id": "cursor-pro",
      "role": "plan",
      "name": "Pro",
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
              "sourceUrl": "https://cursor.com/docs/account/pricing"
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
              "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "composer-2-5"
            },
            {
              "model": "gemini-3-1-pro"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
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
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
        }
      ]
    },
    "cursor-ultra": {
      "id": "cursor-ultra",
      "role": "plan",
      "name": "Ultra",
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
              "sourceUrl": "https://cursor.com/docs/account/pricing"
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
              "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://cursor.com/pricing"
            }
          ],
          "modelRules": [
            {
              "model": "claude-fable-5-1"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "composer-2-5"
            },
            {
              "model": "gemini-3-1-pro"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
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
              "url": "https://cursor.com/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://cursor.com/docs/account/pricing",
              "title": "Cursor pricing (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
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
          "price": {
            "currency": "USD",
            "amount": "19",
            "interval": "month"
          },
          "billingMechanics": "Price is 'per granted seat per month': 'Copilot Business | $19 USD | 1,900'.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-ai-credits-per-user-per-month-pooled",
              "label": "Included AI credits per user per month (pooled)",
              "statement": "Copilot Business 1,900 ... A user's included AI credits are pooled at the billing entity level. For example, an enterprise with 100 Copilot Business users gets a shared pool of 190,000 AI credits rather than 100 individual buckets.",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
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
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
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
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "gemini-3-5-flash"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-3-codex"
            },
            {
              "model": "gpt-5-4"
            },
            {
              "model": "gpt-5-4-mini"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-mini"
            },
            {
              "model": "gpt-6-astra"
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
              "model": "kimi-k2-7-code"
            },
            {
              "model": "kimi-k3"
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
          "price": {
            "currency": "USD",
            "amount": "39",
            "interval": "month"
          },
          "billingMechanics": "Price is 'per granted seat per month': 'Copilot Enterprise | $39 USD | 3,900'.",
          "limits": [],
          "qualitativeLimits": [
            {
              "id": "included-ai-credits-per-user-per-month-pooled",
              "label": "Included AI credits per user per month (pooled)",
              "statement": "Copilot Enterprise 3,900",
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
            },
            {
              "id": "additional-usage-beyond-the-pool",
              "label": "Additional usage beyond the pool",
              "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
              "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
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
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "gemini-3-5-flash"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-3-codex"
            },
            {
              "model": "gpt-5-4"
            },
            {
              "model": "gpt-5-4-mini"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-mini"
            },
            {
              "model": "gpt-6-astra"
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
              "model": "kimi-k2-7-code"
            },
            {
              "model": "kimi-k3"
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
          "billingMechanics": "Docs: 'Copilot Free : ..",
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
              "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
              "sourceUrl": "https://github.com/features/copilot/plans"
            }
          ],
          "modelRules": [
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
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "gemini-3-5-flash"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-3-codex"
            },
            {
              "model": "gpt-5-4"
            },
            {
              "model": "gpt-5-4-mini"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-mini"
            },
            {
              "model": "gpt-6-astra"
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
              "model": "kimi-k2-7-code"
            },
            {
              "model": "kimi-k3"
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
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
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
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "gemini-3-5-flash"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-3-codex"
            },
            {
              "model": "gpt-5-4"
            },
            {
              "model": "gpt-5-4-mini"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-mini"
            },
            {
              "model": "gpt-6-astra"
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
              "model": "kimi-k2-7-code"
            },
            {
              "model": "kimi-k3"
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
              "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
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
              "model": "claude-opus-4-8-fast-mode"
            },
            {
              "model": "claude-opus-5"
            },
            {
              "model": "claude-sonnet-4-6",
              "excluded": true
            },
            {
              "model": "claude-sonnet-5"
            },
            {
              "model": "gemini-3-5-flash"
            },
            {
              "model": "gemini-3-6-flash"
            },
            {
              "model": "gemini-3-7-flash"
            },
            {
              "model": "gemini-3-8-flash"
            },
            {
              "model": "gpt-5-3-codex"
            },
            {
              "model": "gpt-5-4"
            },
            {
              "model": "gpt-5-4-mini"
            },
            {
              "model": "gpt-5-4-nano",
              "excluded": true
            },
            {
              "model": "gpt-5-5"
            },
            {
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-mini"
            },
            {
              "model": "gpt-6-astra"
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
              "model": "kimi-k2-7-code"
            },
            {
              "model": "kimi-k3"
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
          "billingMechanics": "gemini.google/subscriptions lists 'Google AI Pro 1 ..",
          "limits": [],
          "qualitativeLimits": [
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
              "sourceUrl": "https://support.google.com/gemini/answer/16275805"
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
              "model": "gemini-3-1-pro"
            },
            {
              "model": "gemini-3-flash"
            },
            {
              "model": "gemini-3-flash-lite"
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
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.google.com/gemini/answer/16275805",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.google.com/googleone/answer/14534406",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
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
          "billingMechanics": "Second official price point for Google AI Ultra: '$199.99 / month: 20x higher usage limits vs.",
          "limits": [],
          "qualitativeLimits": [
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
              "sourceUrl": "https://support.google.com/googleone/answer/16286513"
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
              "model": "gemini-3-1-pro"
            },
            {
              "model": "gemini-3-flash"
            },
            {
              "model": "gemini-3-flash-lite"
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
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.google.com/googleone/answer/16286513",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.google.com/gemini/answer/16275805",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
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
          "billingMechanics": "The page presents Google AI Ultra with two price points: 'Starting at: $99.99 / month - $99.99 / month: 5x higher usage limits vs.",
          "limits": [],
          "qualitativeLimits": [
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
              "sourceUrl": "https://support.google.com/googleone/answer/16286513"
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
              "model": "gemini-3-1-pro"
            },
            {
              "model": "gemini-3-flash"
            },
            {
              "model": "gemini-3-flash-lite"
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
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.google.com/gemini/answer/16275805",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-21"
            },
            {
              "url": "https://support.google.com/googleone/answer/16286513",
              "title": "Google plan documentation (official)",
              "checkedAt": "2026-09-21"
            }
          ],
          "lastVerifiedAt": "2026-09-21",
          "verificationStatus": "verified"
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
              "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business"
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
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra"
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
          "price": {
            "currency": "USD",
            "amount": "20",
            "interval": "month"
          },
          "billingMechanics": "Official help center: 'ChatGPT Plus is a subscription plan that provides enhanced access to the ChatGPT web app for $20/month.' and 'Price: $20/month (billed monthly).' No annual billing: 'Currently, we do not support annual billing or the option to pay for...",
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
              "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans"
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
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra"
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
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
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
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra"
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
        }
      ]
    },
    "openai-chatgpt-pro": {
      "id": "openai-chatgpt-pro",
      "role": "plan",
      "name": "ChatGPT Pro ($100 / Pro 10x tier)",
      "providerId": "openai",
      "versions": [
        {
          "effectiveFrom": "2026-09-21",
          "price": {
            "currency": "USD",
            "amount": "100",
            "interval": "month"
          },
          "billingMechanics": "ChatGPT Pro is sold as two priced tiers in the same help article: 'The main difference is usage allowance: Pro $100 unlocks 5x higher usage than Plus, while Pro $200 unlocks 20x usage than Plus.' and 'The $100 Pro tier includes lower usage allowances than t...",
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
              "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
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
              "model": "gpt-5-6-luna"
            },
            {
              "model": "gpt-5-6-sol"
            },
            {
              "model": "gpt-5-6-sol-pro"
            },
            {
              "model": "gpt-5-6-terra"
            },
            {
              "model": "gpt-5-thinking-mini"
            },
            {
              "model": "gpt-6-astra"
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
        }
      ]
    }
  },
  "planVersions": {
    "anthropic-claude-max-20x@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "200",
        "interval": "month"
      },
      "billingMechanics": "Official pricing: 'Max 20x : $200 per month'.",
      "limits": [
        {
          "id": "daily-credit-redemption",
          "label": "Daily usage-credit redemption limit",
          "type": "credit_pool",
          "amount": "2000.00",
          "window": {
            "type": "calendar",
            "unit": "day",
            "timezone": "UTC"
          },
          "exceed": "reject_request"
        }
      ],
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
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
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
    "anthropic-claude-max-5x@2026-09-21": {
      "effectiveFrom": "2026-09-21",
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
          "sourceUrl": "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (Pro and Max)",
          "statement": "Individual Pro and Max plan subscribers can purchase up to $2000 worth of discounted bundles per month. Any usage beyond this limit is billed at standard rates.",
          "sourceUrl": "https://support.claude.com/en/articles/14246112-buy-usage-bundles"
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
    "anthropic-claude-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "Monthly price is $20 (pricing page card: '$17 Per month with annual subscription discount ( $200 billed up front).",
      "limits": [
        {
          "id": "daily-credit-redemption",
          "label": "Daily usage-credit redemption limit",
          "type": "credit_pool",
          "amount": "2000.00",
          "window": {
            "type": "calendar",
            "unit": "day",
            "timezone": "UTC"
          },
          "exceed": "reject_request"
        }
      ],
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
          "sourceUrl": "https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans"
        },
        {
          "id": "discounted-usage-bundle-purchase-cap-pro-and-max",
          "label": "Discounted usage-bundle purchase cap (Pro and Max)",
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
          "statement": "Hobby's usage limits are not published anywhere official that I could find: the pricing page says only 'Limited Agent requests' and the docs do not list Hobby in the plan table. No number, window or exceed behaviour is documented. Note that some cursor.com locale/legacy variants of the same page describe Hobby as 'Limited Tab completions' rather than 'Access to Composer'; the live cursor.com/pricing page I read on 2026-09-21 said 'Access to Composer'.",
          "sourceUrl": "https://cursor.com/pricing"
        },
        {
          "id": "model-availability-scope",
          "label": "Model availability scope",
          "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "composer-2-5"
        },
        {
          "model": "gemini-3-1-pro"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
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
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "cursor-hobby@2026-09-21",
      "planId": "cursor-hobby",
      "planName": "Hobby",
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
          "sourceUrl": "https://cursor.com/docs/account/pricing"
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
          "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "composer-2-5"
        },
        {
          "model": "gemini-3-1-pro"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
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
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "cursor-pro-plus@2026-09-21",
      "planId": "cursor-pro-plus",
      "planName": "Pro+",
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
          "sourceUrl": "https://cursor.com/docs/account/pricing"
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
          "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "composer-2-5"
        },
        {
          "model": "gemini-3-1-pro"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
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
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "cursor-pro@2026-09-21",
      "planId": "cursor-pro",
      "planName": "Pro",
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
          "sourceUrl": "https://cursor.com/docs/account/pricing"
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
          "statement": "Cursor publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://cursor.com/pricing"
        }
      ],
      "modelRules": [
        {
          "model": "claude-fable-5-1"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "composer-2-5"
        },
        {
          "model": "gemini-3-1-pro"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
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
          "url": "https://cursor.com/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://cursor.com/docs/account/pricing",
          "title": "Cursor pricing (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "cursor-ultra@2026-09-21",
      "planId": "cursor-ultra",
      "planName": "Ultra",
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
      "price": {
        "currency": "USD",
        "amount": "19",
        "interval": "month"
      },
      "billingMechanics": "Price is 'per granted seat per month': 'Copilot Business | $19 USD | 1,900'.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-ai-credits-per-user-per-month-pooled",
          "label": "Included AI credits per user per month (pooled)",
          "statement": "Copilot Business 1,900 ... A user's included AI credits are pooled at the billing entity level. For example, an enterprise with 100 Copilot Business users gets a shared pool of 190,000 AI credits rather than 100 individual buckets.",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
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
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
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
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "gemini-3-5-flash"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-3-codex"
        },
        {
          "model": "gpt-5-4"
        },
        {
          "model": "gpt-5-4-mini"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-mini"
        },
        {
          "model": "gpt-6-astra"
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
          "model": "kimi-k2-7-code"
        },
        {
          "model": "kimi-k3"
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
    "github-copilot-enterprise@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "39",
        "interval": "month"
      },
      "billingMechanics": "Price is 'per granted seat per month': 'Copilot Enterprise | $39 USD | 3,900'.",
      "limits": [],
      "qualitativeLimits": [
        {
          "id": "included-ai-credits-per-user-per-month-pooled",
          "label": "Included AI credits per user per month (pooled)",
          "statement": "Copilot Enterprise 3,900",
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing"
        },
        {
          "id": "additional-usage-beyond-the-pool",
          "label": "Additional usage beyond the pool",
          "statement": "Each license contributes AI credits to a shared enterprise pool, and usage beyond the pool is charged at $0.01 USD per AI credit.",
          "sourceUrl": "https://docs.github.com/en/copilot/get-started/plans"
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
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "gemini-3-5-flash"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-3-codex"
        },
        {
          "model": "gpt-5-4"
        },
        {
          "model": "gpt-5-4-mini"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-mini"
        },
        {
          "model": "gpt-6-astra"
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
          "model": "kimi-k2-7-code"
        },
        {
          "model": "kimi-k3"
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
    "github-copilot-free@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "0",
        "interval": "month"
      },
      "billingMechanics": "Docs: 'Copilot Free : ..",
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
          "statement": "GitHub publishes which models a subscription can use at provider level rather than per plan; this catalog records that lineup for each of its plans.",
          "sourceUrl": "https://github.com/features/copilot/plans"
        }
      ],
      "modelRules": [
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
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "gemini-3-5-flash"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-3-codex"
        },
        {
          "model": "gpt-5-4"
        },
        {
          "model": "gpt-5-4-mini"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-mini"
        },
        {
          "model": "gpt-6-astra"
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
          "model": "kimi-k2-7-code"
        },
        {
          "model": "kimi-k3"
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
      "versionId": "github-copilot-free@2026-09-21",
      "planId": "github-copilot-free",
      "planName": "Copilot Free",
      "providerId": "github"
    },
    "github-copilot-pro-plus@2026-09-21": {
      "effectiveFrom": "2026-09-21",
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
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
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
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "gemini-3-5-flash"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-3-codex"
        },
        {
          "model": "gpt-5-4"
        },
        {
          "model": "gpt-5-4-mini"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-mini"
        },
        {
          "model": "gpt-6-astra"
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
          "model": "kimi-k2-7-code"
        },
        {
          "model": "kimi-k3"
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
    "github-copilot-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
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
          "sourceUrl": "https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing"
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
          "model": "claude-opus-4-8-fast-mode"
        },
        {
          "model": "claude-opus-5"
        },
        {
          "model": "claude-sonnet-4-6",
          "excluded": true
        },
        {
          "model": "claude-sonnet-5"
        },
        {
          "model": "gemini-3-5-flash"
        },
        {
          "model": "gemini-3-6-flash"
        },
        {
          "model": "gemini-3-7-flash"
        },
        {
          "model": "gemini-3-8-flash"
        },
        {
          "model": "gpt-5-3-codex"
        },
        {
          "model": "gpt-5-4"
        },
        {
          "model": "gpt-5-4-mini"
        },
        {
          "model": "gpt-5-4-nano",
          "excluded": true
        },
        {
          "model": "gpt-5-5"
        },
        {
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-mini"
        },
        {
          "model": "gpt-6-astra"
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
          "model": "kimi-k2-7-code"
        },
        {
          "model": "kimi-k3"
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
    "google-ai-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "19.99",
        "interval": "month"
      },
      "billingMechanics": "gemini.google/subscriptions lists 'Google AI Pro 1 ..",
      "limits": [],
      "qualitativeLimits": [
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
          "sourceUrl": "https://support.google.com/gemini/answer/16275805"
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
          "model": "gemini-3-1-pro"
        },
        {
          "model": "gemini-3-flash"
        },
        {
          "model": "gemini-3-flash-lite"
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
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.google.com/gemini/answer/16275805",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.google.com/googleone/answer/14534406",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
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
      "billingMechanics": "Second official price point for Google AI Ultra: '$199.99 / month: 20x higher usage limits vs.",
      "limits": [],
      "qualitativeLimits": [
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
          "sourceUrl": "https://support.google.com/googleone/answer/16286513"
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
          "model": "gemini-3-1-pro"
        },
        {
          "model": "gemini-3-flash"
        },
        {
          "model": "gemini-3-flash-lite"
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
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.google.com/googleone/answer/16286513",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.google.com/gemini/answer/16275805",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
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
      "billingMechanics": "The page presents Google AI Ultra with two price points: 'Starting at: $99.99 / month - $99.99 / month: 5x higher usage limits vs.",
      "limits": [],
      "qualitativeLimits": [
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
          "sourceUrl": "https://support.google.com/googleone/answer/16286513"
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
          "model": "gemini-3-1-pro"
        },
        {
          "model": "gemini-3-flash"
        },
        {
          "model": "gemini-3-flash-lite"
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
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.google.com/gemini/answer/16275805",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-21"
        },
        {
          "url": "https://support.google.com/googleone/answer/16286513",
          "title": "Google plan documentation (official)",
          "checkedAt": "2026-09-21"
        }
      ],
      "lastVerifiedAt": "2026-09-21",
      "verificationStatus": "verified",
      "versionId": "google-ai-ultra@2026-09-21",
      "planId": "google-ai-ultra",
      "planName": "Google AI Ultra (5x tier)",
      "providerId": "google"
    },
    "openai-chatgpt-business@2026-09-21": {
      "effectiveFrom": "2026-09-21",
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
          "sourceUrl": "https://help.openai.com/en/articles/20001155-managing-credits-and-spend-controls-in-chatgpt-business"
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
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra"
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
    "openai-chatgpt-plus@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "20",
        "interval": "month"
      },
      "billingMechanics": "Official help center: 'ChatGPT Plus is a subscription plan that provides enhanced access to the ChatGPT web app for $20/month.' and 'Price: $20/month (billed monthly).' No annual billing: 'Currently, we do not support annual billing or the option to pay for...",
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
          "sourceUrl": "https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans"
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
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra"
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
    "openai-chatgpt-pro-20x@2026-09-21": {
      "effectiveFrom": "2026-09-21",
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
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
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
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra"
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
    "openai-chatgpt-pro@2026-09-21": {
      "effectiveFrom": "2026-09-21",
      "price": {
        "currency": "USD",
        "amount": "100",
        "interval": "month"
      },
      "billingMechanics": "ChatGPT Pro is sold as two priced tiers in the same help article: 'The main difference is usage allowance: Pro $100 unlocks 5x higher usage than Plus, while Pro $200 unlocks 20x usage than Plus.' and 'The $100 Pro tier includes lower usage allowances than t...",
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
          "sourceUrl": "https://help.openai.com/en/articles/9793128-about-chatgpt-pro-tiers"
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
          "model": "gpt-5-6-luna"
        },
        {
          "model": "gpt-5-6-sol"
        },
        {
          "model": "gpt-5-6-sol-pro"
        },
        {
          "model": "gpt-5-6-terra"
        },
        {
          "model": "gpt-5-thinking-mini"
        },
        {
          "model": "gpt-6-astra"
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
      "planName": "ChatGPT Pro ($100 / Pro 10x tier)",
      "providerId": "openai"
    }
  },
  "pricing": {
    "example-large-pricing": {
      "id": "example-large-pricing",
      "role": "pricing",
      "modelId": "example-large",
      "currency": "USD",
      "unit": "per_1m_tokens",
      "rates": {
        "input": "2.00",
        "output": "6.00"
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
      "rates": {
        "input": "0.50",
        "output": "1.50",
        "cacheRead": "0.05",
        "cacheWrite": "0.60"
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
      "rates": {
        "input": "0.10",
        "output": "0.40",
        "cacheRead": "0.01",
        "cacheWrite": "0.12"
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
    }
  }
};
