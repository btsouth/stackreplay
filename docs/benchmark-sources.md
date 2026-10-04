# Benchmark evidence, edition 2026-10-04-v3

These are verified reported facts, not independently reproduced evaluations.
Scores were checked against the live first-party publications on September 30,
2026, and the Epoch AI archive snapshot on October 4, 2026. The checked-in
tests preserve every stored numerical value.

| Reporting publication | Stored observations | Verification and methodology |
| --- | ---: | --- |
| Google DeepMind, Gemini 4 Argon launch, Sep 30 | 68 | [Official performance table](https://deepmind.google/models/gemini/), [announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/), [methodology](https://deepmind.google/models/evals-methodology/gemini-4-argon) |
| DeepSeek, V4.1 Flash release, Sep 10 | 20 | [Official changelog](https://api-docs.deepseek.com/updates/), September 10 section |
| SpaceXAI, Grok 4.7 launch, Sep 21 | 5 | [Official launch table](https://x.ai/news/grok-4-7), including the DeepSWE High-effort footnote |
| OpenAI, GPT-6.1 Sol launch, Sep 29 | 102 | [Official launch charts and configuration notes](https://openai.com/index/introducing-gpt-6-1-sol/), Low / Medium / High / Xhigh / Max kept separately |
| Anthropic, Sonnet 5.5 launch, Sep 28 | 7 | [Official performance table and footnotes](https://www.anthropic.com/claude-sonnet-5-5), [system card link](https://www.anthropic.com/claude-sonnet-5-5-system-card) |
| Epoch AI, GPQA Diamond archive snapshot, checked Oct 4 | 3 | [Epoch GPQA Diamond methodology](https://epoch.ai/benchmarks/gpqa-diamond), [official benchmark data](https://epoch.ai/data/benchmark_data.zip), [use-this-data terms](https://epoch.ai/benchmarks/use-this-data) |

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

## Epoch GPQA Diamond pilot

Edition `2026-10-04-v3` adds one Science definition and exactly three
`model_observations` source sets from the Epoch AI benchmark archive snapshot
checked October 4, 2026. The records map `claude-sonnet-5-5_max`,
`claude-opus-5-5_max`, and `qwen3.8-max-0902_xhigh` to the existing exact
catalog releases `claude-sonnet-5-5`, `claude-opus-5-5`, and
`qwen-3-8-max-0902`.

This is Epoch-published independent evidence, not a StackReplay reproduction.
The definition uses `version: null` and the variant `Epoch runs; suite revision
unreported`. Public GPQA methodology version 1.0.6 is contextual only and is not
asserted for these runs. Exact scored counts, repetitions, attempts, scaffold
revision, prompts, reasoning budgets, caps, endpoint, tools, seed, error
handling, completion date, and original run publication date remain unknown.
The `max` and `xhigh` labels are Epoch source configuration labels and do not
establish equal effort or comparable setup across providers. For Qwen, Epoch
lists September 1 while the exact 0902 snapshot dates to September 2; the
discrepancy is preserved.

The stored percentages are parsed from the source's exact decimal conversion
strings. Raw accuracy fractions and stderr values remain in each observation's
notes; stderr is not presented as a 95% confidence interval. Published run IDs
and evaluation start timestamps are retained exactly. Observation notes also
retain the checked ZIP and complete CSV member SHA256 fingerprints. The three
partial source sets do not create complete source-sheet links and have no
comparison group.

The comparison table shows these Epoch GPQA cells to one decimal (`95.6%`,
`90.6%`, `92.3%`) so the complete label remains visible beside the sticky
benchmark column on narrow screens. This is a presentation projection only:
stored display strings, exact numeric values, evidence dialogs, observation
alternatives, model-page values and selected-view exports retain their original
source precision. Other benchmark comparison labels are not rounded.

These sets use Epoch AI's licensed dataset terms, not the provider-facts basis.
The narrow basis covers only the selected Epoch-produced numerical records and
linked metadata. The archive README links CC BY 4.0; Epoch's use-this-data
terms separately preserve the original licensing of external data. Attribution
names Epoch AI and "Capabilities & benchmarking", links the original data and
license, identifies the selected Diamond subset and unit
conversion, and implies no endorsement. It does not license the mixed archive,
GPQA questions or answers, logs, provider prose, or artwork.

The original v1 edition retains its 39 definitions, four source sets and 100
observations. The v2 edition retains its 43 definitions, nine source sets and
202 observations. Existing v1 and v2 links reproduce their original scores and
coverage. Google's four-model, 17-row, 68-observation sheet is unchanged in all
editions.

Numeric row highlights include ties and lower-is-better metrics. They identify
reported values in the current view and do not establish matching setups. Shared
rows appear first in model comparisons; source sheets retain their original order.

## Redistribution decision

Existing provider source sets use `official_provider_facts`. We store selected
numerical facts published in first-party announcements and documentation, with
our own concise benchmark descriptions. We do not redistribute chart artwork,
system card text or scraped third-party datasets. The Google publication's
reported Vals/Surge/other results remain developer-reported Google evidence,
with their origin recorded. This does not grant permission to ingest those
underlying independent datasets.

The three Epoch GPQA Diamond records instead use `licensed_dataset`. The
license exception is scoped to those exact Epoch-produced numerical records and
attribution; it is not a license for the full mixed benchmark archive or for
StackReplay's broader evidence export.

Artificial Analysis datasets, OpenRouter rankings and bulk Vals/Epoch ingestion
are excluded. The narrowly reviewed three-record Epoch slice above is the only
Epoch exception; its test checks the exact archive snapshot, values, run IDs,
timestamps, license basis and terms URL. Any future non-provider source requires
exact redistribution terms or permission, recorded in its source metadata before
admission. Public access alone is not a redistribution license. Independent sets
cannot use the provider-facts basis; validation requires a license or permission
basis.

Owner decision 2026-10-03: a pilot using OpenRouter's documented Data API is allowed. The data is licensed CC BY 4.0 (https://openrouter.ai/docs/cookbook/administration/data-api). Use only documented endpoints, carry the citation line each endpoint specifies plus an as-of timestamp, label usage rankings as OpenRouter platform traffic rather than model quality, and do not scrape.

## Maintenance

Source IDs are dated snapshots. Observation identity is
`sourceSetId.benchmarkId.modelId`. Exact versions, metrics and task subsets belong
to definitions. New harness/effort alternatives need distinct source-set IDs.
Never overwrite an existing edition to refresh scores; add a reviewed edition
and retain old edition data for pinned links. The current edition uses manual review and
checked-in data. Automatic ingestion and score-based Replay remain out of scope.

## Selected-view exports

Download JSON preserves stored attribution through each source's evaluator,
title, original URLs, methodology and redistribution record. Publication dates
remain publication dates; observation and redistribution checked dates retain
their separate meanings. Source disclosures link the stored redistribution terms.

The selected rows include their exact observations, configuration notes and
selection reasons. The explicitly labelled fullProvenance appendix retains the
complete selected edition, including alternatives and sources outside the view.
No display rounding is applied to exported values or source metadata, and no
missing-score estimates, newly inferred configuration, blanket independent-data
license or publisher artwork is added. A download does not admit new evidence or
claim StackReplay reproduced any evaluation.


PNG pages carry only the sources of the observations shown in their row/model
slice. Compact attribution retains reporting identity and title, evidence class,
source publication or archive-check date, original source URL, rights-check date
and terms link. Full methodology, limitations and redistribution rationale remain
in the unchanged JSON and linked comparison. Identical compact disclosures can share a
source-reference line. Epoch's attribution retains CC BY 4.0, the conversion
statement, no-endorsement language and the archive-date/original-publication
caveat. Its terms do not become a blanket license for a page or full export.

Image definitions, exact reported score strings, setup labels and missing cells
come from the unchanged JSON export contract. Full observation notes, selection
reasons and immutable-edition provenance remain available through the exact
comparison link and Download JSON. Publisher artwork is never embedded.
