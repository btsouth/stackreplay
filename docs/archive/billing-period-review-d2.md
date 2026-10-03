> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# D2: Guided billing-period review

Workload, Import Ready and Compare now lead with an explicit **Billing-period
review** or **Partial review**. The difference is shown only when local paid facts,
history confirmation and API pricing support the same period. Nothing is
extrapolated, prorated, called savings, or used to infer subscription capacity.

## Period and history

A review is one explicit UTC date interval: start inclusive, end exclusive, at
most 31 days. September 1 through September 30 is stored as September 1 to October
1. The compact setup offers recorded history span, custom dates, or a selected
subscription's locally supplied cycle. No calendar month or rolling 30-day period
is assumed. The original imported overview names its own display timezone.

The Worker filters original event references into the chosen period. Counts and
known processed tokens describe that scope; outside-period calls are counted
separately and retained in the saved import. The existing two-scenario market
calculation prices the selected events, preserving exact models and receipts.

Model coverage and history coverage are independent. "History spans 7 days of
this 30-day review period" never means seven complete days. Events on both period
boundaries do not prove complete logs either. A local history confirmation is
specific to the import and exact dates, explicitly unverified, and unavailable
for known scan gaps or an unfinished real period. Idle days need not contain
invented events. Synthetic examples may demonstrate a period ahead of today's date.

## Billing facts and comparison

Each selected subscription keeps its accepted published price and gains an
optional USD amount actually paid and optional cycle dates. Zero paid is a valid
fact; blank is unknown. Provenance distinguishes local user input from synthetic
sample facts. Neither changes accepted catalog data or establishes eligibility.
All ten accepted subscriptions remain selectable, without a four-plan limit.

Versioned local state keeps billing facts and per-import review choices separately
from the existing selected-stack key. Legacy selections still migrate. Preferences
synchronize across views/tabs, invalid input is rejected, and failed billing saves
are visible. Deleting an import removes its review declaration; clearing local data
also removes billing facts. Synthetic demo preferences use a separate namespace.
No account, invoice upload, telemetry or cloud synchronization was added.

A direct difference requires all of the following:

- A valid, ended review period, recorded calls and an explicit local history confirmation.
- No known partial-scan condition.
- Every selected subscription has the exact same full-cycle dates and a paid amount.
- Both API scenarios price every recorded call in that period.

Different cycles are never prorated. The UI shows unmatched charges separately and
helps the user select one subscription cycle or enter matching full-cycle facts.
Published monthly prices never substitute for actual paid amounts. The signed
range is confirmed fixed spend minus API equivalent, with its meaning stated.
The visible conclusion explains either capacity uncertainty when fixed spend is
lower, or why a higher amount does not establish unnecessary subscriptions or an
equivalent API experience.

Partial reviews retain dates, counts, known tokens, modeled coverage, available
API economics, selected plans, published prices and supplied billing facts. The
difference becomes **Not directly comparable yet**, with a visible reason and
**Review a complete billing period** action. Setup can be skipped.

## Compare, demo and sharing

Compare uses the same instrument, persisted period and cached result as Workload.
Earlier source-scoped replay tools remain secondary and explicitly do not establish
confirmed spend or period completeness.

The new **Complete billing period** demo is wholly synthetic: September 1–30,
3,600 calls, 41,920,800 known tokens, 3,600/3,600 modeled, sample Claude Max 5x and
ChatGPT Plus paid amounts totaling $120. Its real calculated API range is
$23.73–$24.39 and difference $95.61–$96.27. Workload and billing are labeled synthetic.
The original Moderate Week remains byte-identical at 900 calls and $5.93–$6.10;
without matching billing facts it now yields a partial review rather than a
monthly-minus-weekly difference.

Aggregate-only sharing carries the review's counts, model coverage, API range,
status and catalog identity. Dates and paid amounts have separate opt-ins; no paid
amount or difference is included by default. The review snapshot does not combine
legacy valuation with D2 economics. Changing a period or paid fact invalidates a
previous share preview/link. Public page, suggested post and PNG retain period
qualifications and synthetic labeling. Shared facts are not proof of authenticity
or verified invoices. Raw events, prompts and local identities remain excluded.

## Largest privacy-safe local review

The largest available safe export found contains **66,117 calls**, **22,107,086,426
known processed tokens**, August 24 through September 24, 2026 (UTC). It explicitly
excludes prompts, responses, source code, paths and repository names.

Exercised through the production Worker and real Chromium UI inside omabox:

| Fact | Result |
| --- | --- |
| Explicit review | August 24 to September 24, end excluded: 31 days |
| Recorded history in review | August 24 through September 23 |
| Calls in review | 65,758; all retained in the calculation |
| Outside this review | 359, still retained in the original import |
| Known processed tokens | 21,924,000,623; zero unknown-token calls |
| History span | 31 of 31 calendar days spanned; completeness unconfirmed |
| Model identity | All calls recognized; zero unresolved exclusions |
| Admitted API route coverage | 0 / 65,758 |
| Modeled/priced coverage | 0 / 65,758; both scenarios report unsupported models |
| Selected subscriptions | Claude Max 5x and ChatGPT Plus |
| Published price | $120/month |
| Paid input | $100 + $20, synthetic local test input with matching cycles; no actual invoice supplied |
| API equivalent | Full total unavailable, not zero |
| Direct same-period difference | Withheld |

Its models are recognized Claude Fable/Opus variants outside the admitted D0 API
route set. D2 did not add routes, hide these calls or infer prices. The browser
recorded no POST requests during import, billing edits and period review.

Exact visible conclusion:

> Not directly comparable yet. History coverage for this period is not confirmed. Event dates alone do not prove complete logs. A full published API equivalent is also unavailable for these recorded calls. No missing usage or prices are estimated.

A September 1–30 check also remained partial: 36,424 calls and 12,312,491,918 known
tokens, with history ending September 24 and no admitted API routes. No complete
billing-period history or actual personal spend was manufactured.

## Validation and performance

- Complete unit/integration suite: **1,374 passed**, including 332 web tests.
- Complete production browser suite: **407 passed, 49 intentional skips**.
  The final share/period integration recheck passed all **62** affected browser tests.
- Browser coverage includes both themes, mobile, axe, keyboard, reduced motion,
  ordinary imports, cycle selection, persistence, empty/partial periods, sharing
  and network privacy. All **44 contrast checks** pass.
- Typecheck (15 tasks), production build and repository-wide `pnpm check` pass.
  Check retains eight pre-existing informational suggestions.
- Visual inspection: dark desktop, light desktop and 390px mobile in omabox;
  no horizontal overflow. Real local partial-review UI was also inspected.
- A shared temporary large-export filename collided on devbox. Test fixtures now
  use process-specific filenames, preserving the existing large-import/privacy checks.

Billing amount edits and local metadata changes issue zero additional market
requests in browser tests. The cache keys include import and exact period. D2 adds
one Worker metadata pass, bounded aggregates, and cheap decimal composition over
selected plans. No event arrays enter React state or the summary cache.

| Synthetic calls | First dual run | Repeat | Cancellation | Summary bytes |
| ---: | ---: | ---: | ---: | ---: |
| 10,000 | 1.084 s | 0.835 s | 19.5 ms | 34,989 |
| 50,000 | 4.270 s | 4.607 s | 71.2 ms | 35,095 |
| 100,000 | 6.863 s | 7.024 s | 123 ms | 35,139 |

Measured on devbox under four concurrent browser workers. Repeats were identical;
cancelled runs produced no stale success. D1's recorded measurements used a different
run environment, so these are regression observations, not a claimed speedup.
The 100k payload adds 178 bytes to D1's recorded summary. See the
[aggregate benchmark](../benchmarks/billing-period-review-d2.json).

## Remaining limits

D2 can compare locally confirmed fixed spend and published API economics for a
common period when the necessary facts are supplied. It cannot verify invoices,
source completeness, subscription burst capacity or product equivalence. Dates
are UTC day boundaries; intraday renewals, provider-local timezone rules, multiple
cycles, tax normalization and account-specific commercial terms remain outside
this milestone. No subscription calibration or new catalog phase was started.

The most useful next milestone is one accepted real billing-period result for the
actual model mix, with targeted missing API pricing, complete history and actual
paid facts. Answering whether a subscription was "worth it" still requires
capacity/interruption and product-value evidence beyond this economic comparison.

## Workload period selection correction

Account and review-period controls are always visible before the result. Imports
longer than 31 days lead with “Choose a review period,” exact history dates and the
supported limit. They do not display an unavailable API headline or downstream
differences. Dates can be entered directly, a valid recorded span selected, or a
locally supplied account billing cycle applied with one button. Invalid date ranges
are rejected inline. Applying a period or changing account requires the matching
history confirmation; pricing and D6 episode calculations are unchanged.
