# Benchmark evidence, edition 2026-09-30-v1

These are verified reported facts, not independently reproduced evaluations.
Scores were checked against the live first-party publications on September 30,
2026. The checked-in tests preserve every stored numerical value.

| Reporting publication | Stored observations | Verification and methodology |
| --- | ---: | --- |
| Google DeepMind, Gemini 4 Argon launch, Sep 30 | 68 | [Official performance table](https://deepmind.google/models/gemini/), [announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/), [methodology](https://deepmind.google/models/evals-methodology/gemini-4-argon) |
| DeepSeek, V4.1 Flash release, Sep 10 | 20 | [Official changelog](https://api-docs.deepseek.com/updates/), September 10 section |
| SpaceXAI, Grok 4.7 launch, Sep 21 | 5 | [Official launch table](https://x.ai/news/grok-4-7), including the DeepSWE High-effort footnote |
| Anthropic, Sonnet 5.5 launch, Sep 28 | 7 | [Official performance table and footnotes](https://www.anthropic.com/claude-sonnet-5-5), [system card link](https://www.anthropic.com/claude-sonnet-5-5-system-card) |

Google's complete source sheet has four exact canonical model IDs:
`gemini-4-argon`, `gpt-6-astra`, `claude-fable-5-1`, `claude-opus-5-5`.
Its 17 declared benchmarks require exactly 68 distinct observations. The DOM
transcription is `google-deepmind-argon-2026-09-30.verified-table.json`; every
cell is compared to that independent transcription in the tests. Google's
Agent's Last Exam and OSWorld-2.0 incomplete rows are excluded from this sheet.

Google's methodology combines self-computed evaluations and republished
leaderboard/system-card results. Each observation preserves its reported origin.
The document describes some results as October 2026 while the publication and
approach are September 2026; the source-set limitations preserve that discrepancy.
A common reporting organization does not establish matching evaluation setups.

DeepSeek's changelog reports three Terminal-Bench versions separately and three
HLE configurations/subsets separately. No older DeepSeek release's harness notes
are assumed to apply to this release. Its Automation-Bench result has a separate
definition because equivalence with Google's private AutomationBench subset is
not established. Chartography tool access stays explicit in observation metadata.

Anthropic reports Sonnet FrontierCode Main at Max, with a separate Xhigh result
in the table. This edition preserves the main-table Max result and documents that
it is not the highest reported score. OSWorld 2.1 is explicitly partial and has a
separate definition. The source's Opus Terminal-Bench and Chartography values
coexist with Google's observations. The UI offers alternatives and pins explicit
choices in URLs; default selection retains the reviewed Google launch snapshot
where available, rather than choosing the largest number.

## Sol coverage

The exact release `gpt-6-1-sol` remains in the default Frontier selection.
[Official model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[release notes](https://developers.openai.com/api/docs/changelog),
[model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection)
and the September 29 ChatGPT Learn release entry were checked. These materials
establish the model but did not provide numerical benchmark results. GPT-6 Sol
and GPT-5.6 Sol results are not substituted. The page explains this edition's
coverage, without claiming the model has never been evaluated.

## Redistribution decision

All four source sets use `official_provider_facts`. We store selected numerical
facts published in first-party announcements and documentation, with our own
concise benchmark descriptions. We do not redistribute chart artwork, system
card text or scraped third-party datasets. The Google publication's reported
Vals/Surge/other results remain developer-reported Google evidence, with their
origin recorded. This does not grant permission to ingest those underlying
independent datasets.

Artificial Analysis datasets, OpenRouter rankings and bulk Vals/Epoch ingestion
are excluded. Any future non-provider source requires exact redistribution terms
or permission, recorded in its source metadata before admission. Public access
alone is not a redistribution license. Independent sets cannot use the provider
facts basis; validation requires a license or permission basis.

## Maintenance

Source IDs are dated snapshots. Observation identity is
`sourceSetId.benchmarkId.modelId`. Exact versions, metrics and task subsets belong
to definitions. New harness/effort alternatives need distinct source-set IDs.
Never overwrite an existing edition to refresh scores; add a reviewed edition
and retain old edition data for pinned links. Current v1 uses manual review and
checked-in data. Automatic ingestion and score-based Replay remain out of scope.
