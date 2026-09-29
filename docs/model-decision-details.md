# Model decision details

The September 29, 2026 UTC pass reviews all 65 listed model releases against current first-party model documentation. Family aliases remain identity records, not extra models. The public guide supplements the existing accepted catalog; it never changes replay routes, quotas, token accounting or rate selection.

## What changed

- Cache-write prices, duration choices, long-context tiers and reasoning billing are visible beside the base API rates. Price verification dates remain the dates of those rate records.
- Each release has a compact “Before you choose” section for material access, processing, thinking, billing or identity conditions, with its source and check date.
- Google input ceilings are labeled maximum input, not a combined context budget. OpenAI maximum input is not inferred by subtracting maximum output from context.
- Legacy Claude releases now show their documented limits, thinking behavior and availability. Legacy does not mean retired.
- Kimi K3 adds the published completion parameter ceiling, default, video/structured output, top-up requirement and caching conditions.
- Missing exact API identities, provider redirects, unpublished output ceilings and product-only rates stay explicit.

## Review coverage

Existing prices and technical facts were checked against the linked documentation and retained when supported. The table records the decision facts reviewed for every listed release, including older and product-only entries. It is a dated review, not a claim that provider terms never change.

| Model | Decision details reviewed | Source |
| --- | --- | --- |
| Claude Fable 5 | Thinking, API availability, Released, Retirement commitment | [Official documentation](https://platform.claude.com/docs/en/models/fable-5/overview) |
| Claude Fable 5.1 | Thinking, API availability, Released, Retirement commitment | [Official documentation](https://platform.claude.com/docs/en/models/fable-5-1/overview) |
| Claude Haiku 4.5 | Thinking, API availability, Released, Retirement commitment | [Official documentation](https://platform.claude.com/docs/en/models/haiku-4-5/overview) |
| Claude Opus 4.6 | Thinking, API availability, Released, Retirement commitment, Extended output, Prompt caching, Platforms | [Official documentation](https://platform.claude.com/docs/en/models/opus-4-6/overview) |
| Claude Opus 4.7 | Thinking, API availability, Released, Retirement commitment, Extended output | [Official documentation](https://platform.claude.com/docs/en/models/opus-4-7/overview) |
| Claude Opus 4.8 | Thinking, API availability, Released, Retirement commitment, Extended output | [Official documentation](https://platform.claude.com/docs/en/models/opus-4-8/overview) |
| Claude Opus 4.8 (fast mode) (preview) | Processing mode, Billing | [Official documentation](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Opus 5 | Thinking, API availability, Released, Retirement commitment, Extended output, Prompt caching | [Official documentation](https://platform.claude.com/docs/en/models/opus-5/overview) |
| Claude Opus 5.5 | Thinking, API availability, Released, Retirement commitment, Extended output, Prompt caching | [Official documentation](https://platform.claude.com/docs/en/models/opus-5-5/overview) |
| Claude Sonnet 4.6 | Thinking, API availability, Released, Retirement commitment, Extended output | [Official documentation](https://platform.claude.com/docs/en/models/sonnet-4-6/overview) |
| Claude Sonnet 5 | Thinking, API availability, Released, Retirement commitment, Extended output | [Official documentation](https://platform.claude.com/docs/en/models/sonnet-5/overview) |
| Claude Sonnet 5.5 | Thinking, API availability, Released, Retirement commitment, Extended output, Prompt caching | [Official documentation](https://platform.claude.com/docs/en/models/sonnet-5-5/overview) |
| Composer 2.5 | Product access, Standard and Fast, Billing pool, Output limit | [Official documentation](https://cursor.com/docs/models/cursor-composer-2-5) |
| DeepSeek-V4.1-Flash | Thinking, Time-based pricing, API compatibility, Vision | [Official documentation](https://api-docs.deepseek.com/quick_start/pricing/) |
| DeepSeek-V4-Flash (legacy name, model retired) | API availability, Exact-model comparison | [Official documentation](https://api-docs.deepseek.com/quick_start/pricing/) |
| DeepSeek-V4-Flash-Vision-Exp (legacy name, model retired) | API availability, Exact-model comparison | [Official documentation](https://api-docs.deepseek.com/quick_start/pricing/) |
| DeepSeek-V4-Pro-0813 | Thinking, Time-based pricing, API compatibility, Vision | [Official documentation](https://api-docs.deepseek.com/quick_start/pricing/) |
| Gemini 3.1 Pro | API availability, Input limit, Multimodal input, Built-in capabilities, Processing options | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview) |
| Gemini 3.5 Flash | API availability, Input limit, Multimodal input, Built-in capabilities, Processing options | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash) |
| Gemini 3.6 Flash | API availability, Input limit, Multimodal input, Built-in capabilities, Processing options | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) |
| Gemini 3.7 Flash | API availability, Input limit, Multimodal input, Built-in capabilities, Processing options, Thinking | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash) |
| Gemini 3.8 Flash | API availability, Input limit, Multimodal input, Built-in capabilities, Processing options, Thinking | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) |
| Gemini 3 Flash | API availability, Input limit, Multimodal input, Built-in capabilities, Processing options | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview) |
| Gemini 3 Flash-Lite | Identity, Comparison boundary | [Official documentation](https://ai.google.dev/gemini-api/docs/models) |
| Gemini 3 Pro | API availability, Input limit, Multimodal input | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-preview) |
| GLM 5 | Thinking, Input support, API capabilities, Released, Prompt caching, Coding Plan access | [Official documentation](https://docs.z.ai/guides/llm/glm-5) |
| GLM 5.1 | Thinking, Input support, API capabilities, Released, Prompt caching | [Official documentation](https://docs.z.ai/guides/llm/glm-5.1) |
| GLM 5.2 | Thinking, Input support, API capabilities, Released, Prompt caching | [Official documentation](https://docs.z.ai/guides/llm/glm-5.2) |
| GLM 5.3 | Thinking, Input support, API capabilities, Access and billing | [Official documentation](https://docs.z.ai/guides/llm/glm-5.3) |
| GLM 5.3 Flash | Thinking, Input support, API capabilities, Access and billing | [Official documentation](https://docs.z.ai/guides/vlm/glm-5.3-flash) |
| GLM 5.3 FlashX | Thinking, Input support, API capabilities, Access and billing | [Official documentation](https://docs.z.ai/guides/vlm/glm-5.3-flash) |
| GPT-5.3-Codex | Usage limits, Thinking | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.3-codex) |
| GPT-5.4 | Usage limits, Long prompts, Regional processing | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.4) |
| GPT-5.4 mini | Usage limits, Regional processing, Thinking | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini) |
| GPT-5.4 nano | Usage limits, Regional processing, Thinking | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.4-nano) |
| GPT-5.5 | Usage limits, Long prompts, Regional processing | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.5) |
| GPT-5.6 Luna | Usage limits, Long prompts | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna) |
| GPT-5.6 Sol | Usage limits, Long prompts, Promotion | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.6-sol) |
| GPT-5.6 Sol Pro | Identity, Comparison boundary | [Official documentation](https://developers.openai.com/api/docs/models) |
| GPT-5.6 Terra | Usage limits, Long prompts | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5.6-terra) |
| GPT-5 mini | Usage limits | [Official documentation](https://developers.openai.com/api/docs/models/gpt-5-mini) |
| GPT-5 Thinking Mini | Identity, Comparison boundary | [Official documentation](https://developers.openai.com/api/docs/models) |
| GPT-6 Astra | Usage limits, Thinking, Long prompts, Processing options | [Official documentation](https://developers.openai.com/api/docs/models/gpt-6-astra) |
| GPT-6 Luna | Usage limits, Thinking, Long prompts, Processing options, Tool compatibility, Regional processing | [Official documentation](https://developers.openai.com/api/docs/models/gpt-6-luna) |
| GPT-6 Sol | Usage limits, Thinking, Long prompts, Processing options, Tool compatibility, Regional processing | [Official documentation](https://developers.openai.com/api/docs/models/gpt-6-sol) |
| Grok 4.5 | Thinking, Long prompts, Batch, Tools and regions, Output limit | [Official documentation](https://docs.x.ai/developers/models/grok-4.5) |
| Grok 4.6 | Thinking, Long prompts, Batch, Tools and regions, Output limit | [Official documentation](https://docs.x.ai/developers/models/grok-4.6) |
| Grok 4.7 | Thinking, Long prompts, Batch, Tools and regions, Output limit | [Official documentation](https://docs.x.ai/developers/models/grok-4.7) |
| Kimi K2.6 | Thinking, Sampling, Output limit, API identity, Access | [Official documentation](https://platform.kimi.ai/docs/guide/kimi-k2-6-quickstart) |
| Kimi K2.7 Code | Thinking, Variants, Output limit, API identity | [Official documentation](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart) |
| Kimi K3 | Thinking, Output control, Access, Prompt caching, Tools | [Official documentation](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart) |
| MAI-Code-1.1-Flash | Product access, Capabilities | [Official documentation](https://github.com/microsoft/MAI-Code) |
| MiMo V2.5 | Thinking, Released, Deprecation, Batch API, Prompt caching, Web search | [Official documentation](https://mimo.mi.com/models/en-US/mimo-v2.5) |
| MiMo V2.5 Pro | Thinking, Released, Deprecation, Input support, Batch API, Prompt caching, Web search | [Official documentation](https://mimo.mi.com/models/en-US/mimo-v2.5-pro) |
| MiMo V2.6 Flash | Thinking, Released, Batch API, Prompt caching, Web search | [Official documentation](https://mimo.mi.com/models/en-US/mimo-v2.6-flash) |
| MiMo V2.6 Pro | Thinking, Released, Batch API, Variants, Prompt caching, Web search | [Official documentation](https://mimo.mi.com/models/en-US/mimo-v2.6-pro) |
| MiniMax M2.7 | Thinking, Output limit, Prompt caching, Variants | [Official documentation](https://platform.minimax.io/docs/api-reference/text-anthropic-api) |
| MiniMax M3 | Thinking, Context, Output limit, Long-context pricing, Billing, Input support | [Official documentation](https://platform.minimax.io/docs/guides/pricing-paygo) |
| Muse Spark 1.3 | Data choice, Capabilities, Output limit | [Official documentation](https://developer.meta.com/ai/models/muse-spark/) |
| Nano Banana Pro | API identity, Image generation, Tool limits, Processing options | [Official documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image) |
| Qwen 3.7 Max | Thinking, Released on Model Studio, Status, Snapshot and input, Prompt caching, Regions | [Official documentation](https://www.alibabacloud.com/help/en/model-studio/qwen3-7-max) |
| Qwen 3.7 Plus | Thinking, Released on Model Studio, Long-context pricing, Prompt caching, Regions, Snapshot | [Official documentation](https://www.alibabacloud.com/help/en/model-studio/qwen3-7-plus) |
| Qwen 3.8 27B | Thinking, Released on Model Studio, Prompt caching, Regions, Thinking length | [Official documentation](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-27b) |
| Qwen 3.8 Flash | Thinking, Released on Model Studio, Prompt caching, Regions, Thinking length | [Official documentation](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash) |
| Qwen 3.8 Max | Thinking, Released on Model Studio, Prompt caching, Regions, Snapshots, Thinking length | [Official documentation](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-max) |

## Remaining boundaries

Grok 4.5/4.6/4.7, Kimi K2.6, Kimi K2.7 Code, Composer 2.5 and Muse Spark 1.3 do not state a separate maximum output ceiling on the reviewed pages. MAI-Code does not provide exact direct API token pricing or token ceilings in its reviewed release repository. ChatGPT Sol Pro / Thinking Mini and the Gemini 3 Flash-Lite subscription label are not assigned specifications or prices from similarly named API models. Retired DeepSeek names currently redirect to another model, which is not an exact-model replay. Gemini 3 Pro API retirement remains separate from subscription labels.

DeepSeek explicitly excludes Chinese public holidays from peak hours. This public condition is displayed; the existing replay admission boundary is unchanged. Model guide processing choices, regional surcharges, tools and provider-side discounts do not become executable replay options merely by being documented.

Comparison filters and model pages use the same display specification helper. Unit coverage checks the entire model set, negative capabilities, exact-identity gaps and input/context semantics. Browser coverage checks visible cache-write/long-context conditions, source-backed model details and comparison labels.
