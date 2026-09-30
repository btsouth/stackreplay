# Benchmark comparison product

Design proposal following the September 30 implementation brief and supplied mockup.
The data foundation is in progress. The broader comparison flow below is pending product review.

## One comparison builder

`/benchmarks` is one public surface. Visitors can choose any accepted model releases,
up to six at once, and filter by capability category. A Frontier preset supplies a
useful initial selection; it never calculates a ranking. Presets contain model IDs,
not copied scores or manually assembled pair charts.

The intended Frontier selection includes Gemini 4 Argon, GPT-6 Astra, GPT-6.1 Sol,
Claude Opus 5.5 and Claude Fable 5.1. This is an editorial selection, not a claim that
these are the top five models. DeepSeek V4.1 Flash, Sonnet 5.5 and other accepted
releases remain searchable in the same picker.

## Comparability and coverage

For a selected group, query each reviewed source snapshot independently:

1. Find observations for the selected exact model IDs in that snapshot.
2. Keep only exact benchmark/version/variant rows with an observation for every
   selected model under that source's declared comparison context.
3. Validate the resulting model × benchmark matrix before rendering.
4. Offer matching source snapshots, showing their date, evidence class and shared
   row count. Keep the chosen snapshot pinned in the URL.

This generates comparisons from data. No chart needs to be authored separately for
DeepSeek versus Sonnet. Availability still depends on evidence: two models having
a score under the same benchmark name does not establish a shared comparison.

Do not silently reduce the selection to models a source happens to cover. When no
snapshot covers the full group, say so and offer explicitly labelled subsets or
individual evidence. These are separate results, with no cross-source cell
highlighting, subtraction, average or implied direct comparison.

## GPT-6.1 Sol and the initial sheet

Google's September 30 Argon table has four models and 17 complete rows. GPT-6.1 Sol
is absent. The default Frontier selection can include Sol, but the Google table
cannot gain a Sol score column without breaking provenance and completeness.

Before a five-model matrix can ship, identify a licensed, verified source snapshot
with a shared benchmark subset covering all five. It may have fewer than 17 rows.
No such snapshot has been established in this work yet. Official Sol API model
documentation inspected on September 30 contains specifications and pricing but
no numerical benchmark comparison matrix.

If the five-model shared source is unavailable, show explicit coverage:
Google's four-model/17-row sheet, plus Sol's separately sourced evidence when it
has been verified. Do not show 17 missing Sol cells or borrow values from Sol's
launch materials into Google's columns.

## Source snapshot lifecycle

Each reporting set is a dated, reviewed snapshot with benchmark definitions,
observations, publication, original evidence, methodology and redistribution basis.
The same model/benchmark pair can have several observations across snapshots.
Separate harness or effort variants within a publication require separate source
set IDs rather than overwriting a cell.

New releases add snapshots. Existing share links remain reproducible. An unpinned
default may advance to the newest reviewed snapshot with sufficient coverage;
the page always displays the snapshot date. A newer benchmark version creates a
new definition and never overwrites an older version.

For v1, updates are manual review and checked-in data. Automatic ingestion and
benchmark watching remain out of scope. A later monitor could propose changes
for review, subject to source permissions, but must never publish scores directly.

## Presentation

Keep the mockup's hierarchy: kicker, clear headline, quiet source summary,
category controls, then an uninterrupted score table. Add a compact model picker
above the sheet. Source switching appears only when relevant choices exist.

Desktop uses a semantic table with model/developer headers, exact benchmark names
and category labels, readable tabular scores and subtle source-local extremes.
Equal scores receive equal treatment. A textual accessible label explains the
highlight. A row disclosure supplies its short description, exact version or
unreported version, unit, direction and per-model configuration.

Phone uses a sticky benchmark column and internal horizontal scrolling, keeping
model headers visible. The page itself must not overflow. Category controls wrap,
and the scroll region is keyboard focusable with clear instructions.

Model pages use one Benchmarks section, grouped by source then category, with a
compact initial set of rows and an expandable remainder. Methodology stays in a
disclosure. Links into `/benchmarks` carry the exact model and source selection.

## Required checks

Retain the original brief's schema, complete-matrix, provenance, accessibility,
theme/mobile, representative-value, licensing and catalog/Replay isolation checks.
Add comparison-builder checks for selected-model intersections, no silent model
dropping, no common source, partial coverage, pinned URL state and version changes.
Use targeted devbox checks and one hosted CI cycle for the benchmark PR.
