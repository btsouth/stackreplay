# Automatic Workload overview

Workload describes everything imported. It immediately shows the recorded date span,
responses, known processed tokens, API pricing coverage and current API-equivalent
range. Projects, model contributions and workload highlights follow. Capacity stays
compact; methodology, raw evidence and earlier scoped tools are disclosures.

## Pricing and scope

Direct API repricing uses the existing compiled exact-model route evaluation and cash
receipts through an API-only entry point. It accepts longer recorded histories without
purchasing subscription cycles. The subscription optimizer and focused billing review
retain their single-cycle, 31-day constraints. Both cache-write interpretations remain
explicit; unknown models or categories remain unpriced. A priced subset is labeled as
such, including in aggregate shares. Model contributions sum the existing exact-route
receipts, not a second calculator.

## Automatic Stack Discovery + Confirmation

Once a real workload profile is ready, an optional Workload panel asks which
plans the person **currently** pays for. Harness/source != billing source;
model developer != billing source. History narrows a reviewed question, and
explicit user confirmation establishes the person's current plan. Recorded
calls are never retroactively assigned to it. Call share means recorded call
share; displayed amounts are published prices, not personal paid amounts.

`lib/stack-discovery.ts` deterministically joins existing source/model aggregates
to one reviewed mapping: Claude Code → Claude personal, Codex → ChatGPT personal,
Command Code → its individual plans, OpenCode → its two Go offers. Hermes remains
unknown; T3 Code attribution produces no usage/billing group. Exact canonical
model links in reviewed subscription access only order choices and show how many
observed models a plan lists. Volume, tokens, limits and throughput never infer a
tier. Choices use the current accepted market date, independent of historical
workload/replay dates; the catalog supplies date-valid names and sticker prices,
including GOAT's current-market execution-only record.

`stackreplay.current-stack` remains the canonical selected target set. Confirming
replaces only explicitly listed members of the answered family. Other families,
manual unrelated plans and API targets survive. Existing personal/manual/organization
selections suppress automatic prompting and are pre-respected when reopening.
Multiple plans have an explicit keep option and a shared editor for selecting
several distinct plans within a family. No four-plan cap is needed;
the leftover Settings cap is removed. Settings shows the selected summary and
links to Workload, with the full picker under **Advanced / choose manually**.

`stackreplay.stack-discovery.v1` is only onboarding preference: five bounded group
keys with non-plan response/timestamps or dismissal timestamps, never another
selected-plan list. Work, API/other, no payment and Not sure create no plan or API
target and prevent repeated prompting. Not now suppresses presented groups for
seven days across workloads/routes; a new unanswered family can prompt. Unanswered
groups are also snoozed when confirming other groups. A passive review action
always allows edits. This remains optional: Import → Workload → Replay needs no
confirmation. Failed storage leaves choices editable and reports failure;
preferences can suppress prompting in memory for the visit. Clear-local-data also
clears preferences. No prompts, responses, project/session identities, paths, raw
events, telemetry, or actual paid amounts enter this preference record.

Synthetic workloads never show this panel. The confirmation persistence helper
additionally derives `.demo.<importId>` itself, so even a programmatic demo
confirmation cannot alter real selections or preferences.

`DiscoveryBillingEvidence` is a future aggregate extension for explicit
`event.billing` facts. Exact subscription evidence can mark historical billing
as observed; inferred context cannot. Even exact past billing does not establish
a current subscription. No adapter manufactures billing context, and this phase
does not aggregate it in the worker. No recommendations are included.

## My Stack v1

`/app/stack` reads the same Current Stack, with a pure aggregate-only view model
in `lib/my-stack.ts`. Settings and Workload link here; Workload's quick radios
and My Stack use the same family choices, including explicit multiple-plan edits.
Choices show the reviewed published lineup's compact model count even without
resolved workload identities; workload coverage is separate supporting evidence.
Missing workload identities never turn a known published lineup into "unknown".
Unknown or retired selected keys stay visible and are never silently dropped.
The advanced manual catalog chooser remains in Settings. Removing one target
preserves all others and snoozes its family's discovery prompt for seven days.

Published price subtotals use exact decimal arithmetic, grouped by currency and
interval. They include one published price per selected plan, excluding API
targets and unknown prices. These are not actual spend: quantities, multiple
accounts on one plan, taxes and discounts are not represented. Duplicate plan
instances require a future versioned extension of the canonical store.

Tool activity is a separate section for one explicitly selected saved workload;
overlapping imports are never combined. No history is required to edit plans.
Synthetic workloads are excluded, and an explicitly opened demo context is read
only for the real stack. No new storage, billing attribution, actual-paid form,
telemetry or Replay economics is introduced. Links continue to existing Replay,
Compare and billing-period review with the selected workload's scope.

## Optional billing comparison

“Compare against what I paid” opens a focused panel for account, subscription, cycle,
local paid amount and history confirmation. A completed review collapses to an editable
summary. A narrower review never changes the full overview's projects, models or totals.
When the scopes match, confirmed spend and the factual API-equivalent ratio augment the
hero. Otherwise the cycle comparison is separately labeled with its own response count.
Changing account, period or import keeps the existing confirmation invalidation rules.
Compare uses the same cached review. Local billing edits do not reprice the full import.

## Acceptance

The private primary-root import spanning 35 local calendar days prices in full without
setup, with complete pricing coverage. The available history had grown since the
earlier reference export. The separate saved, confirmed cycle retains its established
economics, response population and capacity groups. No personal billing facts or raw history are
included here or in fixtures. Browser checks block uploads of the private validation data.

Dark desktop, light desktop and mobile review verifies the overview before configuration,
compact saved review, editable billing panel, project/model hierarchy, keyboard access,
contrast, evidence disclosures and persistence. Engine tests cover 35-day and 400-day
API repricing, unchanged exact totals and rejection of subscriptions in the API-only path.
