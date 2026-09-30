# Benchmark evidence, edition 2026-09-30-v2

These are verified reported facts, not independently reproduced evaluations.
Scores were checked against the live first-party publications on September 30,
2026. The checked-in tests preserve every stored numerical value.

| Reporting publication | Stored observations | Verification and methodology |
| --- | ---: | --- |
| Google DeepMind, Gemini 4 Argon launch, Sep 30 | 68 | [Official performance table](https://deepmind.google/models/gemini/), [announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/), [methodology](https://deepmind.google/models/evals-methodology/gemini-4-argon) |
| DeepSeek, V4.1 Flash release, Sep 10 | 20 | [Official changelog](https://api-docs.deepseek.com/updates/), September 10 section |
| SpaceXAI, Grok 4.7 launch, Sep 21 | 5 | [Official launch table](https://x.ai/news/grok-4-7), including the DeepSWE High-effort footnote |
| OpenAI, GPT-6.1 Sol launch, Sep 29 | 102 | [Official launch charts and configuration notes](https://openai.com/index/introducing-gpt-6-1-sol/), Low / Medium / High / Xhigh / Max kept separately |
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

## OpenAI launch evidence

The initial search covered API documentation and missed the official launch charts.
Edition `2026-09-30-v2` adds all 102 numerical observations from six capability
charts, including 30 for the exact release `gpt-6-1-sol`. The independently
extracted numerical chart specifications are stored in
`openai-sol-2026-09-29.verified-charts.json`. Tests compare every observation to
this transcription. Fractions are converted to percentages without estimating
from plotted positions. No chart artwork or cost series is redistributed.

Separate dated source IDs preserve Low, Medium, High, Xhigh and Max effort.
The comparison defaults consistently to Max, not the highest numerical score.
DeepSWE is 71.9% at Max and 75.22% at High; both remain selectable. Terminal-Bench
Science is 57.02% at Max. Google remains primary where its reviewed observation
already exists. Alternatives include the reporting source and effort and can be
pinned in a URL. Model pages show the primary six Sol results together; alternative
configurations remain available through their benchmark sheet links.

AutomationBench 1.0.6 is separate from Google's unversioned result. OSWorld 2.0
preserves the offline v2026.08.08 subset and partial-reward metric. GDP.pdf preserves
Opus 5 / Opus 4.8 fallbacks. OpenAI's difficult-prompt factuality evaluation is
lower-is-better and does not represent everyday error rates. GPT results were
computed in OpenAI research environments or its API; competitor results are
explicitly republished from public reports. Neither sharing a publisher nor
using the same effort proves matching harnesses.

The original v1 edition retains its 39 definitions, four source sets and 100
observations. Existing v1 links reproduce the original scores and coverage.
Google's four-model, 17-row, 68-observation sheet is unchanged in both editions.

Numeric row highlights include ties and lower-is-better metrics. They identify
reported values in the current view and do not establish matching setups. Shared
rows appear first in model comparisons; source sheets retain their original order.

## Redistribution decision

All source sets use `official_provider_facts`. We store selected numerical
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
and retain old edition data for pinned links. The current edition uses manual review and
checked-in data. Automatic ingestion and score-based Replay remain out of scope.
