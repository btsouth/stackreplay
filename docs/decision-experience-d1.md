# D1 — The decision experience

D1 makes the D0 market calculation the primary answer after import, on Workload,
and in Compare. It does not add catalog records, estimate subscription limits,
change candidate search, or substitute models.

## User journey

Import a supported history or choose **Moderate week**, explicitly labeled synthetic.
The completed import shows the published API answer directly; **See your decision**
opens Workload with calls, known processed tokens, dates and the same answer.
Earlier replay valuation remains available under a labeled disclosure rather than
competing with the two-scenario headline. Replay and detailed workload analysis
remain available.

The decision instrument shows:

1. Published API equivalent, retained/priced call counts, and why two prices exist.
2. Selected fixed subscriptions and the arithmetic difference from recorded work.
3. What is established and what subscription capacity/product equivalence cannot establish.
4. Model-route economics, both assumptions, exact receipts and accepted evidence.
5. An expandable current-stack editor with accepted commercial/access facts.

Compare leads with the identical whole-workload instrument. Earlier source-scoped
replay comparisons are explicitly secondary, labeled with their different pricing
method and analytical prorating; their scope and financial assertions are preserved. The older period-adjusted
spend disclosure is labeled an analytical allocation, not a purchase price.

## Current stack

The editor is derived from the ten accepted subscription records. Selection is
browser-local, with no account or cloud synchronization. The legacy four-plan cap
is removed from persistence and both selectors. Existing single selections and
arrays migrate on read; duplicates are removed. The decision surfaces synchronize selections across tabs through local events
and storage notifications.

Only admitted, known monthly prices enter the monthly subtotal. Unlisted legacy
selections or unavailable/non-monthly prices are disclosed and withhold the
comparison difference. Account/cohort claim text remains visible where supplied.
These are listed prices, not verified personal invoices. There are no user price
overrides or implied eligibility checks.

One monthly fixed bill is compared to the **displayed recorded period**, without
prorating or projecting a month. The signed difference is fixed spend minus the
API range (high endpoint first). It is not labeled savings, waste or a replacement.
API bills, taxes, negotiated rates and other tools are outside fixed subscription spend.

## Representative answer

The synthetic representative workload remains 900 recognized/priced calls, with
zero exclusions, September 14–20, 2026, and 10.5M known processed tokens.

| Exact route | Calls | Displayed API equivalent |
| --- | ---: | ---: |
| Claude Haiku 4.5 | 249 | $0.69–$0.74 |
| Claude Sonnet 5 | 285 | $1.63–$1.74 |
| GPT-5.6 Sol | 261 | $3.03 |
| GPT-6 Sol | 105 | $0.59 |

**$5.93–$6.10 at the pinned published API prices.** Exact totals remain
`5.93358645` and `6.0962667`; presentation never averages or reprices them.
Claude cache-write duration is absent from the source, so both published
possibilities remain visible. Neither becomes historical truth.

Selecting Claude Max 5x and ChatGPT Plus shows **$120/month**, with a
**$113.90–$114.07 difference** versus this seven-day recorded workload, not a
monthly savings claim. Subscription burst survival and equivalent product
experience remain unproven.

## Evidence, sharing and runtime

Both same-scope summaries must be feasible before a range is composed. Scope
identity and counts are checked. Receipts retain full decimals, token categories,
rates, promotions, assumptions, claim references and artifact/catalog identities.
Selecting subscriptions or expanding evidence does not run the optimizer.

The client caches at most three completed bounded market summaries. Imports,
deletions, clearing local data, Worker failure and disposal invalidate this cache.
Pending runs are never cached; existing generation/cancellation protection remains.
A browser test verifies Import → Workload → Compare issues only one market request.
No workload events enter React state or the summary cache.

Aggregate share V2 gains an optional bounded `market` field: two totals, priced
count, price date, catalog hash and the enumerated cache assumption. Old tokens
remain valid. Preview, public page, image title and suggested post use the range.
Sharing waits for calculation completion. Current subscriptions/spend are never
included; raw history, project labels and private identifiers remain excluded.
Synthetic labeling and the existing authenticity boundary remain intact.

## Validation and remaining limits

Focused tests cover current-stack migration, more than four selections, storage
failure, same-scope range composition, signed differences, aggregate-share privacy,
cache retention/invalidation and keyboard selection. Browser tests cover both
themes, mobile, reduced motion, evidence inspection, sharing and cross-page reuse.
The complete existing engine, Worker, import, replay and browser suites remain
required; no correctness assertion was removed.

The runtime algorithm and transport are unchanged. D1 adds bounded summary reuse
and aggregate presentation; it does not reopen the optimizer profiling milestone.

The principal remaining purchasing limitation is opaque subscription capacity.
Incomplete source histories, missing models/rates, observation scopes beyond the
existing 31-day guard, account-specific terms and non-token product benefits also
prevent a universal purchasing recommendation. Published prices remain pinned to
D0's accepted September 27 snapshot and review window, not live monitored prices.

### Measured regression run

Existing production-Worker benchmark, run within the full browser suite (four
concurrent test workers). These are observed runs, not a claimed engine speedup.

| Calls | First dual-scenario run | Repeated run | Cancellation | Summary bytes |
| ---: | ---: | ---: | ---: | ---: |
| 10,000 | 0.89 s | 1.08 s | 30.2 ms | 34,814 |
| 50,000 | 4.71 s | 5.20 s | 45.1 ms | 34,920 |
| 100,000 | 7.58 s | 6.52 s | 47.3 ms | 34,961 |

Repeated summaries were identical, cancelled runs emitted no stale success, and
no assignment arrays reached the page. See `benchmarks/decision-experience-d1.json`.
The browser UI separately proves completed-summary reuse across the three decision
surfaces; this does not bypass the engine benchmark's repeated executions.

Partial-scan warnings remain visible before the market answer on Import, Workload
and Compare. Workload analysis is keyed by import ID and timezone, so switching
saved histories cannot reuse the previous history's metadata in a new share.

### Completed validation

- 1,359 unit/integration tests passed across all packages (317 web tests).
- Complete production browser suite: 393 passed, 49 existing intentional skips.
- Accessibility: browser axe coverage in both themes, keyboard/reduced-motion
  checks, and all 44 token contrast checks passed.
- Typecheck (15 tasks), production build, and `pnpm check` passed. Check reports
  only the eight pre-existing informational suggestions in pricing-remediation tests.
- Real visual review: dark desktop, light desktop and 390px mobile. A catalog-hash
  overflow in the new share preview was fixed; the final mobile page does not
  scroll horizontally. Primary numbers, evidence and local selection survive navigation.
