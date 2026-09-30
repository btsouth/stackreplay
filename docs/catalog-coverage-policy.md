# Catalog coverage policy

Reviewed 2026-09-30 against the 51 missing-model candidates at `ebf9f9e`.

## Admission

A model gets a release record when its developer publishes a distinct, stable text/chat or coding model and a catalogued plan lists it, or it is a current flagship/coding release from a tracked developer. Historical releases still named by tracked plans are useful identities. Lifecycle and API retirement are recorded only when published; neither is inferred from age. A newly admitted identity does not by itself establish a price, executable plan rule or historical availability.

Developer docs, announcements and developer-owned model cards establish identity. A route owner's documented API or announcement may establish its exact route identifier and mapping to an already verified developer release. OpenRouter's documented model API is discovery evidence only. OpenRouter site pages, community posts, benchmarks and registry creation timestamps do not establish accepted facts.

| Classification | Representation |
| --- | --- |
| release | One canonical record for distinct developer-published weights/release |
| family | Searchable family identity when the published name leaves size/quantization unresolved; no aggregate specifications or release date |
| alias | An exact, sourced alternate name for an existing identity; no duplicate model |
| route | Harness-scoped alias plus provider-owned variant when speed, pricing or data-use terms differ; default economics are never inherited |
| mode | Published lineup link and mode note on the underlying release; no invented API identifier |
| preview | Excluded until the developer publishes a stable identity |
| stealth | Excluded while the developer/underlying identity is undisclosed |
| out_of_scope | Excluded from this text/coding cohort: orchestration services, probability-only decision APIs and video-generation/editing products |
| deferred | Unlinked until first-party evidence establishes the exact identity |

Temporary free/promotional offerings do not get model records or speculative aliases. Laguna S 2.1 has its own stable developer release, so it is admitted independently of Command Code's temporary `-free` route. Gemma 4 is a family, not a guessed parameter size. Tencent Hy3 and Hy3 share one model. Claude's thinking labels are modes. Fast, HighSpeed, UltraSpeed and Contributor routes retain the underlying model with a separate variant. Contributor data-use terms and Standard-only reasoning are not interchangeable.

Qwen 3.8 Max 0902 is a separately published post-training upgrade. Its dated alias belongs to that record. The unsuffixed older Qwen 3.8 Max record is not globally remapped when a provider moves a latest pointer. DeepSeek V4 `(latest)` labels stay unresolved for the same reason: a moving route name alone does not establish a date-specific mapping to a historical release. Ling 3.0 Flash Sante is not substituted with the base Ling model without developer evidence for that exact fine-tune.

## Release dates

`releaseDate: { date: YYYY-MM-DD, sources: [...] }` records the developer's published release day for that identity. It is optional, source-bearing and validated as a real calendar day. Families have no release date. Preview announcements, model-id date suffixes, API-route launch dates, registry creation dates, retrieval dates and `lastVerifiedAt` are not substitutes. Gemini Flash Lite uses the published stable release day, not its earlier preview day. Missing or ambiguous dates stay missing.

This cohort supplies dates for 24 of the 27 new releases and backfills 29 existing releases from developer announcements/tables and already reviewed public release facts. Qwen 3.7 Flash and Qwen 3.8 Omni Flash have regional/snapshot date ambiguity; Step 3.5 Flash lacks a clear published release day in the reviewed model card. They remain undated. Other existing records are not exhaustively backfilled in this slice. The existing MiniMax M3 API-launch wording is retained as a public decision fact; it does not settle the earlier developer announcement day, so its structured release date is not inferred.

`/models` offers Release date sorting, newest first by default, with undated records last in either direction and deterministic ties. The table and model detail show the accepted day and the detail's sources include its provenance. Release dates are discovery metadata and never establish a Replay effective date.

## Reviewed cohort

All 51 original rows are classified in [the decision ledger](catalog-coverage-decisions.json), which retains exact audit keys, published names, affected plan IDs, reasons and evidence URLs. Counts: 27 releases, one family, six routes, two modes, one alias, five previews, three stealth names, three out-of-scope services and three deferred identities. No original row is unreviewed. The remaining 14 unlinked rows are the 11 exclusions and three deferrals; the raw audit keeps reporting them as research leads rather than suppressing them.

The public lineup links are reviewed identity annotations on already recorded provider snapshots. They do not create executable subscription rules or token prices. First-party sources added here are explicitly enrolled in the existing W1 allowlist, including narrowly scoped developer-owned Hugging Face paths. W1/W2 remain detection-only; no W3 automation is added.

| Published candidate | Classification | Catalog identity | Reason / evidence |
| --- | --- | --- | --- |
| Muse Spark 1.3 Contributor | route | `muse-spark-1-3` / `contributor` | Contributor permits training on prompts/completions; Standard rates and max reasoning are not inherited. [Source](https://dev.meta.ai/docs/models) |
| Muse Spark 1.2 Contributor | route | `muse-spark-1-2` / `contributor` | Contributor has separate rates and data-use terms. [Source](https://dev.meta.ai/docs/models) |
| MiniMax M2.5 | release | `minimax-m2-5` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://platform.minimax.io/docs/guides/text-generation) |
| DeepSeek V4 Flash Fast | route | `deepseek-v4-flash` / `fast` | Low-latency V4 Flash deployment; default route prices are not inherited. [Source](https://commandcode.ai/blog/deepseek-v4-flash-fast-is-available-in-command-code) |
| DeepSeek V4 Flash (latest) | deferred | Unlinked | Moving latest route cannot be pinned to a retired/historical release from its display name. Keep unlinked until the route owner establishes the exact identity and date. [Source](https://commandcode.ai/models) |
| DeepSeek V4 Pro (latest) | deferred | Unlinked | Moving latest route cannot be pinned to a retired/historical release from its display name. Keep unlinked until the route owner establishes the exact identity and date. [Source](https://commandcode.ai/models) |
| GLM-5.2 Fast | route | `glm-5-2` / `fast` | High-throughput build of GLM-5.2; default route prices are not inherited. [Source](https://commandcode.ai/blog/glm-5-2-fast-is-live-in-command-code) |
| GPT-OSS 120B | release | `gpt-oss-120b` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://developers.openai.com/api/docs/models/gpt-oss-120b) |
| Inkling | release | `inkling` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://thinkingmachines.ai/news/introducing-inkling/) |
| Inkling Small | release | `inkling-small` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://thinkingmachines.ai/news/inkling-small/) |
| Kimi K2.5 | release | `kimi-k2-5` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://huggingface.co/moonshotai/Kimi-K2.5) |
| Kimi K2.7 Code HighSpeed | route | `kimi-k2-7-code` / `highspeed` | High-speed mode of Kimi K2.7 Code; default route prices are not inherited. [Source](https://commandcode.ai/blog/kimi-k2-7-code-highspeed-is-in-command-code) |
| Laguna S 2.1 | release | `laguna-s-2-1` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://poolside.ai/blog/introducing-laguna-s-2-1) |
| Ling 3.0 Flash Sante | deferred | Unlinked | Provider documents a health-tuned third-party free offering, but developer-owned evidence for this exact Sante release was not found. Defer; do not substitute base Ling weights. [Source](https://commandcode.ai/docs/resources/pricing-limits) |
| Pixel Canary | stealth | Unlinked | Opaque or temporary discovery name; developer and durable release identity are unestablished. No admission or alias. [Source](https://commandcode.ai/models) |
| Qwen 3.6 Max Preview | preview | Unlinked | Preview or temporary free-preview route; excluded from stable coverage. Revisit only after a first-party stable release. [Source](https://commandcode.ai/models) |
| Qwen 3.6 Plus | release | `qwen-3-6-plus` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-6-plus) |
| Qwen 3.7 Flash | release | `qwen-3-7-flash` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://www.alibabacloud.com/help/en/model-studio/qwen3-7-flash) |
| Qwen 3.8 Max 0902 | release | `qwen-3-8-max-0902` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://www.qwencloud.com/models/qwen3.8-max-0902) |
| Qwen 3.8 Omni Flash | release | `qwen-3-8-omni-flash` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://www.alibabacloud.com/help/en/model-studio/model-list-omni/) |
| Space Bunny Alpha | stealth | Unlinked | Opaque or temporary discovery name; developer and durable release identity are unestablished. No admission or alias. [Source](https://commandcode.ai/models) |
| Step 3.5 Flash | release | `step-3-5-flash` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://huggingface.co/stepfun-ai/Step-3.5-Flash) |
| Step 3.7 Flash | release | `step-3-7-flash` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://static.stepfun.com/blog/step-3.7-flash/) |
| Step 5 Preview | preview | Unlinked | Preview or temporary free-preview route; excluded from stable coverage. Revisit only after a first-party stable release. [Source](https://commandcode.ai/models) |
| Tencent Hy3 | release | `hy3` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://www.tencent.com/en-us/articles/2202386.html) |
| Tencent Hy4 Preview | preview | Unlinked | Preview or temporary free-preview route; excluded from stable coverage. Revisit only after a first-party stable release. [Source](https://commandcode.ai/models) |
| Claude Opus 4.5 | release | `claude-opus-4-5` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://platform.claude.com/docs/en/about-claude/model-deprecations) |
| Claude Sonnet 4.5 | release | `claude-sonnet-4-5` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://platform.claude.com/docs/en/about-claude/model-deprecations) |
| Jev | out_of_scope | Unlinked | Probability-returning decision endpoint, not a chat/text generation model; outside coding-model coverage. [Source](https://commandcode.ai/docs/provider) |
| MiMo V2.6 Pro UltraSpeed | route | `mimo-v2-6-pro` / `ultraspeed` | Xiaomi speed route preserves Pro capability with separate rates/access; no cross-provider route identity is inferred. [Source](https://mimo.mi.com/models/en-US/mimo-v2.6-pro-ultraspeed) |
| Muse Spark 1.2 | release | `muse-spark-1-2` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://dev.meta.ai/docs/models) |
| Claude Opus 4.6 (thinking) | mode | `claude-opus-4-6` | Antigravity extended-thinking access to the named Claude release. Thinking is a mode, not a new model or API billing tier. [Source](https://antigravity.google/docs/models) |
| Claude Sonnet 4.6 (thinking) | mode | `claude-sonnet-4-6` | Antigravity extended-thinking access to the named Claude release. Thinking is a mode, not a new model or API billing tier. [Source](https://antigravity.google/docs/models) |
| Gemini 3.1 Flash Lite | release | `gemini-3-1-flash-lite` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://ai.google.dev/gemini-api/docs/deprecations) |
| Gemini 3.5 Flash Lite | release | `gemini-3-5-flash-lite` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://ai.google.dev/gemini-api/docs/deprecations) |
| Gemini Omni Flash | out_of_scope | Unlinked | Conversational video generation/editing model; outside the text/coding coverage cohort. [Source](https://ai.google.dev/gemini-api/docs/changelog) |
| Muse Spark 1.1 | release | `muse-spark-1-1` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://dev.meta.ai/docs/models) |
| Fugu Ultra | out_of_scope | Unlinked | Multi-model orchestration service, not one underlying model. Do not alias the moving service name to a pinned model. [Source](https://sakana.ai/fugu-release/) |
| Gemma 4 | family | `gemma-4` | The bare name spans E2B, E4B, 12B, 26B A4B and 31B; no size is inferred. [Source](https://ai.google.dev/gemma/docs/core/model_card_4) |
| GPT-OSS 20B | release | `gpt-oss-20b` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://developers.openai.com/api/docs/models/gpt-oss-20b) |
| Hy3 | alias | `hy3` | Tencent Hy3 and Hy3 name the same developer-published release. [Source](https://www.tencent.com/en-us/articles/2202386.html) |
| Hy4 preview | preview | Unlinked | Preview or temporary free-preview route; excluded from stable coverage. Revisit only after a first-party stable release. [Source](https://commandcode.ai/models) |
| LongCat 2.5 Preview Free | preview | Unlinked | Preview or temporary free-preview route; excluded from stable coverage. Revisit only after a first-party stable release. [Source](https://commandcode.ai/models) |
| Mistral Large 3 | release | `mistral-large-3` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://docs.mistral.ai/models/mistral-large-3-25-12) |
| Nemotron 3 Nano | release | `nemotron-3-nano` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://catalog.ngc.nvidia.com/orgs/nim/nvidia/models/nemotron-3-nano/hf-52469ad) |
| Nemotron 3 Super | release | `nemotron-3-super` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://blogs.nvidia.com/blog/nemotron-3-super-agentic-ai/) |
| Space Bunny Free | stealth | Unlinked | Opaque or temporary discovery name; developer and durable release identity are unestablished. No admission or alias. [Source](https://opencode.ai/docs/go/) |
| Claude Sonnet 4.0 | release | `claude-sonnet-4` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://platform.claude.com/docs/en/about-claude/model-deprecations) |
| DeepSeek 3.2 | release | `deepseek-v3-2` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://api-docs.deepseek.com/updates/) |
| MiniMax M2.1 | release | `minimax-m2-1` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://platform.minimax.io/docs/guides/text-generation) |
| Qwen3 Coder Next | release | `qwen3-coder-next` | Stable developer-published text/coding release; historical releases remain useful for tracked plan identities. [Source](https://huggingface.co/Qwen/Qwen3-Coder-Next) |
