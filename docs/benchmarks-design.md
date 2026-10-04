# Benchmark comparison product

Accepted product direction following the September 30 implementation brief,
supplied mockup and discussion of cross-source coverage. The data foundation is
implemented, including the builder and public/model-page UI.

## One comparison builder

`/benchmarks` is one public surface. Visitors can choose any accepted model releases,
up to six at once, and filter by capability category. A Frontier preset supplies a
useful initial selection; it never calculates a ranking. Presets contain model IDs,
not copied scores or manually assembled pair charts.

The intended Frontier selection includes Gemini 4 Argon, GPT-6 Astra, GPT-6.1 Sol,
Claude Opus 5.5 and Claude Fable 5.1. This is an editorial selection, not a claim that
these are the top five models. DeepSeek V4.1 Flash, Sonnet 5.5 and other accepted
releases remain searchable in the same picker.

## Verified results and comparability

The main builder may combine verified observations from different publishers.
Verification means checking the reported score against its original evidence;
it does not mean StackReplay independently reproduced the evaluation.

A comparison row preserves the exact benchmark, version, metric, unit and task
subset. Pass@1 and pass@4 are separate rows. Different benchmark versions never
merge. An unreported version stays explicitly unreported and does not establish
equivalence with a known version.

Different harnesses, efforts, tools, fallbacks or deployments may appear in the
same row when its benchmark identity and metric match. The row says "Different
evaluation setups" and each score opens its evaluator, reporter, configuration,
date and original evidence. Missing configuration is labelled as unreported.
Numeric comparisons remain readable without suggesting that these setups match.

Each cell retains one exact observation, with a quiet source marker. When several
verified results exist, expose the alternatives and document why the primary
observation was selected. Never select the largest score automatically. Pin
model IDs and observation IDs in share links so later data updates cannot change
an existing comparison silently.

The default "All reported results" view shows supported results and explicit
"Not reported" cells. "Shared benchmarks" contains rows with supported results
for every selected model, including results from different sources. Missing data
never becomes zero, an empty score or a fabricated estimate. Never silently drop
a selected model. If there are no shared rows, explain coverage and offer the
all-results view without changing the selection.

This generates comparisons from data. No chart needs to be authored separately
for DeepSeek versus Sonnet. Category filters only organize the evidence; they do
not make the measures interchangeable.

Highlight each row's highest reported score, including ties, or its lowest value
when lower is better. Keep setup differences explicit. Highlighting helps read the
numbers; it does not establish matching configurations or an overall ranking.
Do not calculate
averages, normalized scores, win counts or an overall model ranking.

## Reproducible source sheets

Keep provider launch sheets and other reviewed source snapshots as secondary
views. A source sheet is not the only route to comparing models. Each declared
complete source set still validates its entire model × benchmark matrix, with no
missing cells or duplicate observations. An individual observation set can hold
partial coverage without pretending to be a complete comparison sheet.

Google's table is a developer-reported publication containing both Google's own
evaluations and externally reported results. The reporting organization and the
actual evaluation origin are distinct. Show those distinctions in the sheet and
cell disclosures rather than implying that every number used the same harness.

## GPT-6.1 Sol and the initial sheet

Google's September 30 Argon table has four models and 17 complete rows. GPT-6.1 Sol
is absent. The default Frontier selection can include Sol, but the Google table
cannot gain a Sol score column without breaking provenance and completeness.

Sol can enter the main Frontier comparison using separately sourced, verified
observations. A five-model shared publisher matrix is not required. Google's
original four-model sheet remains unchanged and reproducible.

Edition v2 includes OpenAI's official September 29 launch evidence for Sol:
DeepSWE v1.1, Terminal-Bench Science 0.1, GDP.pdf, AutomationBench 1.0.6,
OSWorld 2.0's offline v2026.08.08 partial reward, and difficult-prompt factuality.
All five efforts are retained. Max is the fixed default; High and other settings
can be pinned per cell. Model pages initially show primary observations rather
than repeating five effort blocks. The original v1 edition remains available.
Never present a Sol observation as part of Google's launch evaluation.

## Source snapshot lifecycle

Each reporting set is a dated, reviewed snapshot with benchmark definitions,
observations, publication, original evidence, methodology and redistribution basis.
The same model/benchmark pair can have several observations across snapshots.
Separate harness or effort variants within a publication require separate source
set IDs rather than overwriting a cell. Stable observation IDs, explicit
metric/subset fields and reviewed primary-selection metadata make the builder's
choices reproducible.

New releases add snapshots. Existing share links remain reproducible. Editorial
presets may change through review, and unpinned defaults may adopt newly reviewed
observations according to documented selection decisions. Every score continues
to display its own source date. A newer benchmark version creates a new
definition and never overwrites an older version.

Updates are manual review and checked-in data. Automatic ingestion and
benchmark watching remain out of scope. Verify and record redistribution terms
before storing any non-provider data. Provider-published numerical facts are
stored as developer-reported evidence; publication on a public website alone is
not a redistribution license.

## Presentation

Keep the mockup's hierarchy: kicker, clear headline, quiet source summary,
category controls, then an uninterrupted score table. Add a compact model picker
and the shared/all coverage control above the sheet. Show a source summary for a
single-source view or "Multiple sources" for mixed results. Original source
sheets are available through a secondary view, with switching only when useful.

Desktop uses a semantic table with model/developer headers, exact benchmark names
and category labels, readable tabular scores and restrained source markers.
Equal scores receive equal highlighting. A
textual accessible label explains the highlight. A row disclosure supplies its
short description, exact version or unreported version, metric, unit, direction
and per-model configuration.

Comparison labels normally retain the source's reported display string. The
admitted Epoch GPQA Diamond row is one display-only exception: its three
comparison cells use one decimal because the preserved 18-decimal percentage
strings cannot fit beside the sticky benchmark label on narrow screens. The
stored exact display strings, numeric values, evidence dialogs, observation
alternatives, model pages and JSON exports remain unchanged. A visible note
appears only when that Epoch row is present, and its accessible score labels use
the same rounded text. No other benchmark label is rounded by this exception.

Phone uses a sticky benchmark column and internal horizontal scrolling, keeping
model headers visible. The page itself must not overflow. Category controls wrap,
and the scroll region is keyboard focusable with clear instructions.

Model pages use one Benchmarks section, grouped by source then category, with a
compact initial set of rows and an expandable remainder. Methodology stays in a
disclosure. Links into `/benchmarks` carry the exact model and source selection.

## Required checks

Retain the original brief's schema, complete-matrix, provenance, accessibility,
theme/mobile, representative-value, licensing and catalog/Replay isolation checks.
Add comparison-builder checks for cross-source shared rows, mixed/unknown setup
labels, observation alternatives and documented defaults, no silent model
dropping, explicit partial coverage, pinned URL state and version/metric changes.
Use targeted devbox checks and one hosted CI cycle for the benchmark PR.

## Implementation order

1. Merge the small Argon catalog prerequisite after its existing hosted checks
   pass, then rebase the isolated benchmark branch onto current main.
2. Extend the evidence schema and comparison resolver for the accepted policy.
   Verify Sol and other provider-reported results and record source permissions.
3. Build the model picker, shareable comparison state, shared/all rows and source
   sheets using the approved mockup and existing StackReplay design tokens.
4. Add model-page sections and local methodology/evidence disclosures.
5. Verify the schema, resolver and catalog/Replay isolation; review desktop and
   phone in both themes, accessibility, contrast and page overflow on devbox.
6. Open one benchmark architecture/UI PR after targeted validation, run one
   hosted CI cycle and leave it for review without merging or deploying it.

## Evidence summary and JSON download

The evidence line and source/date/count summary describe only resolved rows in
the selected category and coverage view. Developer-reported results are checked
against original publications, not reproduced by StackReplay. Independent or
mixed labels appear only when those observation classes are actually visible.
Empty views have no claimed class or checked date; invalid selections explain the
error and disable Download JSON rather than presenting fallback evidence.

Download JSON uses the same resolution, category filter and row order as the table.
Version 1 includes the exact edition, absolute comparison link, ordered model IDs
and display names, requested controls and explicit observation pins. Rows retain
exact definitions, numeric and original display values, selected observation IDs,
selection reasons, setup labels and all numeric highlights, including ties and
lower-is-better metrics. Unreported cells have explicit null values.

The fullProvenance appendix contains the complete immutable evidence edition,
including source matrices, alternatives, primary selections, original URLs,
publication and checked dates, limitations and redistribution records. It is
explicitly labelled as full provenance, including evidence outside the selected
view. A valid empty view exports an empty rows array. The browser creates the
JSON download locally; no endpoint, saved selection or external fetch is needed.
