# Benchmark evidence, edition 2026-10-04-v5

These are verified reported facts, not independently reproduced evaluations.
Scores were checked against the live first-party publications on September 30,
2026, and the Epoch AI archive snapshot and four additional provider publications
on October 4, 2026. The checked-in
tests preserve every stored numerical value.

| Reporting publication | Stored observations | Verification and methodology |
| --- | ---: | --- |
| Google DeepMind, Gemini 4 Argon launch, Sep 30 | 68 | [Official performance table](https://deepmind.google/models/gemini/), [announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/), [methodology](https://deepmind.google/models/evals-methodology/gemini-4-argon) |
| DeepSeek, V4.1 Flash release, Sep 10 | 20 | [Official changelog](https://api-docs.deepseek.com/updates/), September 10 section |
| SpaceXAI, Grok 4.7 launch, Sep 21 | 5 | [Official launch table](https://x.ai/news/grok-4-7), including the DeepSWE High-effort footnote |
| OpenAI, GPT-6.1 Sol launch, Sep 29 | 102 | [Official launch charts and configuration notes](https://openai.com/index/introducing-gpt-6-1-sol/), Low / Medium / High / Xhigh / Max kept separately |
| Anthropic, Sonnet 5.5 launch, Sep 28 | 7 | [Official performance table and footnotes](https://www.anthropic.com/claude-sonnet-5-5), [system card link](https://www.anthropic.com/claude-sonnet-5-5-system-card) |
| Epoch AI, GPQA Diamond archive snapshot, checked Oct 4 | 3 | [Epoch GPQA Diamond methodology](https://epoch.ai/benchmarks/gpqa-diamond), [official benchmark data](https://epoch.ai/data/benchmark_data.zip), [use-this-data terms](https://epoch.ai/benchmarks/use-this-data) |
| QwenCloud, Qwen3.8-Max release, Aug 3 | 1 | [Official table and evaluation notes](https://www.qwencloud.com/news/qwen-3-8-max) |
| Z.ai, GLM-5.3 release, Aug 14 | 1 | [Official table and Terminal-Bench 2.1 methodology](https://z.ai/blog/glm-5.3) |
| MiniMax, M3 release, Jun 1 | 1 | [Official score and evaluation setup](https://www.minimax.io/blog/minimax-m3) |
| Moonshot AI, Kimi K3 article, publication unreported, checked Oct 4 | 1 | [Official own-model score and evaluation notes](https://www.kimi.com/blog/kimi-k3) |

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

## Dated provider Terminal-Bench 2.1 evidence

Edition `2026-10-04-v4` adds exactly three partial source sets using the existing
Terminal-Bench 2.1 definition: `qwen-3-8-max` 86.6%, `glm-5-3` 88.2%, and
`minimax-m3` 66.0%. These are developer-reported, reporter-computed facts under
the existing `official_provider_facts` basis. Only each developer's own model
result is retained. Qwen's unsuffixed release is separate from the 0902 snapshot.
Qwen and GLM give raw strings `86.6` and `88.2` without a unit marker. StackReplay
interprets them on the [official Terminal-Bench 2.1 percent accuracy scale](https://www.tbench.ai/news/terminal-bench-2-1),
retaining their numeric values without arithmetic rescaling. Their display `%`
is this documented metric interpretation; MiniMax explicitly reports `66.0%`.
This does not establish leaderboard admission, exact task counts or matched setups.

Qwen reports Claude Code avg@10, a 5-hour timeout and max_tokens=131,072. GLM
reports Claude Code 2.1.207, temperature=1.0, top_p=1, max_new_tokens=65,536 and a
6-hour timeout. Its Terminal-Bench 3.0 effort, trials and context settings do not
apply to 2.1. MiniMax reports Terminus 2, internal infrastructure, an 8C16G
sandbox, a 2-hour timeout, 128K output and evaluation through its official API;
the exact endpoint/version is unknown. No comparison group or complete source
sheet is declared, and the setups are different or unreported.

Source publication dates remain separate from checks and evaluation dates.
Qwen uses the visible article/news-list date August 3, retaining the conflicting
HTML meta date July 20, 2026 15:56:48. GLM uses the blog root date August 14;
the related documentation's September 18 modification date is not publication.
MiniMax uses the visible June 1 date and retains JSON-LD
2026-05-31T17:31:18.000Z. Run dates, scored task counts, task subsets, suite
revisions beyond 2.1 and other unreported settings remain unknown. Kimi K3 is
outside v4's new evidence because its exact publication date is unknown.

The v4 edition retains 44 definitions, 15 source sets and 208 observations.
The v3 edition retains 44 definitions, 12 source sets and 205 observations,
including all three exact Epoch records. Old edition links, complete source
sheets, primary selections, presets and catalog identities are preserved.

## Unknown publication: Kimi K3

Edition `2026-10-04-v5` adds one first-party Kimi K3 Terminal-Bench 2.1
observation from [Moonshot AI's article](https://www.kimi.com/blog/kimi-k3).
The provider's Kimi K3 (max) column gives raw notation `88.3` without a unit
marker. As with Qwen and GLM, StackReplay interprets this unchanged number on
the [official Terminal-Bench 2.1 percent accuracy scale](https://www.tbench.ai/news/terminal-bench-2-1).
The displayed `88.3%` is StackReplay's metric interpretation, not provider-explicit
notation, arithmetic rescaling or leaderboard admission. Only the developer's
own model result is admitted, under `official_provider_facts`, with attribution;
no dataset grant or license for publisher prose, artwork or foreign scores is claimed.

The reported setup is Kimi Code, max reasoning effort, temperature = 1.0 and
top-p = 1.0. Harness version, trials, scored task counts/subset, run dates,
timeout, maximum output tokens, tools, endpoint/version and other unstated
settings remain unreported. No comparison group or complete source sheet is declared.

The original article publication is unreported: required `publishedAt: null`
in schema 2 records that fact. October 4 observation and redistribution checks
remain required ISO dates. Image asset dates, weights/model release dates and
check dates are never substituted for publication. Source IDs identify checked
snapshots without asserting original publication. All date surfaces display
"Publication date unreported" with check dates separate. Only the three exact
legacy Epoch pilot source IDs display "Archive checked" for their unchanged
stored archive-check dates, with original run publication still unknown.

The current edition has 44 definitions, 16 source sets and 209 observations.
Schema-1 v1–v4 data, bytes, pins, primary selections and exact Epoch precision
remain unchanged. The common validator discriminates strict schemas 1 and 2;
it does not normalize archived objects or inject new fields.

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
title, original URLs, methodology and redistribution record. Known provider
publication dates remain publication dates; explicit null means unreported, and
the three legacy Epoch dates retain their archive-check meaning. Observation and
redistribution checked dates retain their separate meanings. Source disclosures link the stored redistribution terms.

Schema-1 editions retain byte-compatible `exportVersion: 1` JSON. Schema-2
editions use `exportVersion: 2`, based on the full provenance edition even
when Kimi is outside the selected view. Export and schema versions must pair
as 1/1 or 2/2. URL state, catalog and Replay versions are unchanged.

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
