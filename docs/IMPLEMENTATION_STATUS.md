# StackReplay Implementation Status

## Current milestone

**Milestone 1 — implemented, independently audited, NOT ACCEPTED.**

Milestone 0 is complete and was independently audited. Milestone 2 has not started.
Do not publish the repository or begin M2 until the remaining M1 correctness gates below
are resolved. A green suite is not evidence that unspecified simulation semantics are correct.

## Implemented scope

- Strict, versioned UsageEventV1, StackReplayExportV1, ExecutionTargetV1 and generalized
  ExecutionReplayResultV1 schemas. Events contain execution facts, not subscription ownership.
  Text token categories are typed; modality and workload category are separate. API/local/hybrid
  targets are schema shells and fail with TARGET_NOT_IMPLEMENTED.
- Provider/model/plan/pricing schemas, semantic validation, a browser-safe catalog entry point,
  and a separate Node-only YAML loader. All bundled data is fictional, marked estimated, and
  uses example.invalid provenance. No real provider prices or limits are implemented.
- Pure subscription simulation: model resolution, dollar-denominated credit pools at explicit
  model rates, token/request limits, model multipliers, promotions, first-use rolling windows,
  calendar windows, violations, separate coverage dimensions, confidence and metadata.
- Calendar day/week/month buckets use the declared IANA timezone, not universally UTC.
  Billing anchors and true sliding lookback windows are not represented. Windows are [start,end);
  catalog effective-date ranges are inclusive dates. Calendar weeks begin Monday.
- Economics currently returns the fixed plan sticker price, labeled fixed_plan_price. It does
  not compute a multi-period workload bill, proration, or overage cost.
- Thirteen golden scenarios, property tests and a real deterministic 100,000-event benchmark.
  The web app and CLI remain M0 foundations. No adapters or later product behavior exists.

## Independent audit corrections (2026-09-21)

- Preserved all nine timestamp fractional digits using a millisecond component and nanosecond
  remainder. Equal instants sort by event id. Fixed rolling boundaries at sub-millisecond precision.
- Fixed calendar day/week ends after historical midnight DST gaps (São Paulo 2018). The prior
  implementation incorrectly carried a 01:00 start into the following boundary.
- Added actual calendar-date validation to schema dates/timestamps, including optional fields.
- Validated execution targets, event collections, loaded catalog semantics and redundant indexes.
  Rejected zero-duration windows, duplicate rule/limit/promotion identifiers, mismatched model
  pricing, invalid date ranges and out-of-range model multipliers with decimal-exact comparison.
- Made ambiguous name resolution deterministic and unsupported instead of last-entry-wins.
- Rejected unsafe aggregate token totals before Number loses integer precision. Isolated decimal.js
  configuration from other consumers and preserved computed sub-cent units without display rounding.
- Honored declared unknown/mapped model confidence and reduced confidence for fallback category
  pricing. Explicit zero token counts are no longer mistaken for entirely missing data.
- Normalized plan-version array order before hashing; buildCatalog now validates before indexing.
  Catalog tarballs now include their required synthetic YAML data. File renaming/reordering,
  reversed object keys and equivalent JSON-style YAML were also checked against the same hash.
  Other arrays retain declared order (constraint presentation, promotion evaluation and provenance);
  this is content hashing, not full semantic equivalence across all possible catalog rewrites.
- Added 41 tests, including adversarial chronology, DST/cache boundaries, validation, tiny amounts,
  shared-library configuration, arbitrary permutations and declared-confidence degradation.
- Corrected benchmark even-sample median calculation, per-target warmup and parameter validation;
  reports all measured samples and peak process RSS.
- Corrected README/status/release claims, documented dependency license obligations and made the
  upstream Geist OFL/copyright text available with the web application.

The existing mixed-model golden snapshot changed only its engine-version metadata (0.0.0 to
0.0.1). Its arithmetic expectations were not regenerated. New regression expectations were
calculated from explicit instants and small synthetic counters.

## Remaining M1 blockers

These are audit findings, not approved provider behavior. None is deferred to M2.

1. **P1 — rejected-event accounting and hard-stop semantics.** Each constraint evaluates all
   offered demand independently, even when another constraint rejects an event. After the first
   crossing, every later event in that window is rejected, including one that could fit the unused
   capacity. A 10-token cap with events of 11 then 1 tokens reports 0/2 served and 12 consumed.
   A zero-token model-specific cap plus a global one-request cap can reject a second, otherwise
   eligible model because the first rejected event consumed the global demand prefix. The schema
   does not distinguish attempted demand from accepted consumption, atomic admission from
   independent hypothetical checks, or latched from per-request rejection. Specify the supported
   synthetic rule contract and test simultaneous pools before describing this as requests served.
2. **P1 — canonical token accounting.** input/output/cache/reasoning fields have no disjointness
   contract. Summing them can double-count subsets: input=100 and cacheRead=100 yields 200 usage
   units whether or not those cache tokens were already included in input. The same ambiguity
   affects credit conversion. Define the canonical category semantics before building adapters;
   do not invent provider-specific normalization during M1.
3. **P1 — unknown consumption and coverage.** An event with usage={} under a token cap currently
   passes with 0 consumed, 100% request coverage and full feasibility. Low confidence is insufficient
   to qualify that conclusion. Partial counts can still receive high confidence when plan/pricing
   metadata is verified. Coverage has no unknown-count representation; its 0/0 convention is 100%.
   Define missing/inapplicable/zero semantics, propagate uncertainty and add meaningful regressions.
4. **P1 — current-rule resolution.** Targets require an exact planVersionId; no deterministic
   current-rule selection contract is supplied. Promotions are selected using each historical
   event's date. A September 15 half-price promotion does not apply to a September 1 workload
   replayed against the September 15 version. This conflicts with decision 2. Supply an explicit
   rule reference date/snapshot contract and pricing/promotional resolution without reading a clock.
5. **P1 — monetary precision envelope.** Decimal arithmetic avoids binary floating point, but
   precision is fixed at 40 significant digits while schemas accept unbounded decimal strings and
   promotion products. For one input token priced at
   1000000.0000000000000000000000000000000001 per million, a credit cap of 1 incorrectly passes
   because consumption rounds to 1. Define and enforce a supported numeric envelope or use exact
   arithmetic. Fixing display rounding and shared Decimal configuration does not solve this case.
6. **P2 — overage and economics.** Overage returns UNKNOWN (correctly avoids inventing pricing),
   yet coverage still says 100% served and targetCost remains the base subscription price. The
   pricing/schema contract cannot compute actual overage. Complete the agreed M1 subscription
   behavior, or explicitly constrain and qualify the supported result without claiming a full bill.
7. **P2 — result/export contract and reproducibility.** Result units are merely nonempty strings;
   costDifference uses nonnegative Money despite a potentially signed difference. Versions requires
   a subscription planVersionId even in the generalized result and omits explicit pricing/methodology
   versions. Export range ordering is not checked. Catalog identity is a supplied label at the engine
   boundary, not a verified hash. Define and validate these contracts before treating serialized
   results as a durable public API. IANA results also depend on runtime timezone data.

## Validation after audit corrections

Environment: Node 24.19.0, pnpm 10.18.1. A fresh copy containing only source/config/docs was
installed from the frozen lockfile; no node_modules, .turbo, dist or .next output was copied.
Hosted GitHub Actions remains pending the first push.

| Gate | Actual clean-copy result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS |
| pnpm check | PASS, 117 files, no warnings |
| pnpm check:contrast | PASS, 44 token pairs across dark/light |
| pnpm typecheck | PASS, 11 tasks |
| pnpm test | PASS, 131 tests |
| pnpm build | PASS, 7 tasks |
| pnpm --filter @stackreplay/web test:e2e | PASS, 29 passed / 5 viewport-specific skips |
| pnpm --filter @stackreplay/replay-engine bench | PASS; medians below 1s, one Pro sample 1000.8ms |

The E2E skips are explicit desktop/mobile applicability checks, not suppressed failures.
They cover dark/light axe checks, narrow overflow, navigation, touch targets and dialog behavior.

Current local results: 131 unit/golden/property tests pass (schema 14, catalog 24,
engine 71, UI 14, CLI 8). Engine tests include 13 goldens and 7 property tests; the new permutation
property generates equal/nanosecond timestamps, three token categories and two simultaneous limits.
These establish repeatability, not correctness of the unresolved admission/accounting policy.

A standalone browser bundle (520,759 unminified bytes) ran inside a Chromium module Worker and
matched the Node result exactly for a synthetic nanosecond-timestamp workload. No filesystem or
Node polyfill was needed. Packed schema/catalog/engine tarballs installed and ran in an isolated
project, including loadDefaultCatalog. This verifies package boundaries, not npm release readiness.

## Benchmark evidence

Setup and catalog loading are outside timing; every sample performs validation, sorting and replay.
Each target receives one 2,000-event warmup, then five complete 100,000-event runs. Results are used
and reported; no result cache exists. Per-rate Decimal conversion caching persists within a process.
The deterministic workload spans 30 days and three models with several token categories. Starter
supports only two models; Pro exercises three simultaneous constraints and a promotion.

| Run | Starter min / median / max (ms) | Pro min / median / max (ms) | Process peak RSS |
| --- | --- | --- | --- |
| Original HEAD, independent reproduction | 618.1 / 682.9 / 759.6 | 820.2 / 887.3 / 945.0 | not recorded |
| Corrected run 1 | 643.3 / 706.7 / 797.8 | 799.9 / 875.9 / 962.0 | 635.2 MiB |
| Corrected run 2 | 652.9 / 693.1 / 851.9 | 853.3 / 922.2 / 974.8 | 645.8 MiB |
| Clean-copy run | 765.4 / 826.4 / 883.0 | 878.7 / 934.8 / 1000.8 | 648.7 MiB |

Sub-second medians reproduced on this desktop; not every sample stayed under one second. This is not a universal guarantee,
and roughly 0.6 GiB peak process memory warrants attention before large imports on mobile. The
original millisecond-only optimization did change accepted timestamp semantics; unchanged goldens
were insufficient evidence otherwise. The corrected representation retains the precision contract.

## Public repository / dependency audit

- Reviewed the four original main commits: 15d36d9 (audited M0), 423afd7 (strategy), 4abca5d
  (public preparation), 168c1f0 (M1). Initial working tree was clean; no M2 work or remote existed.
- Scanned all six commits reachable before audit, including two local checkpoint refs: 181 distinct
  blobs / 145 paths. Local patterns covered private keys, credential prefixes, connection strings,
  personal paths and emails; no sensitive file-content matches were found. Also reviewed changed
  content, tracked filenames and fixture provenance. A pattern scan is not a proof of absence.
- The final source/config/docs scan covered 146 files and found no credential/private-path patterns.
- Existing author name/email remain in Git commit metadata and will become public with history.
  No specifications, personal exports, credentials, screenshots or generated artifacts are tracked.
- LICENSE matches the GNU AGPL v3 text; workspace metadata says AGPL-3.0-or-later. No incompatible
  dependency was identified. `pnpm audit` reported zero known vulnerabilities at audit time.
- Reviewed MIT Base UI, LGPL libvips/native component notices, MPL axe/Lightning CSS, CC-BY caniuse
  data and OFL Geist fonts. See [third-party notices](../THIRD_PARTY_NOTICES.md) for actual distribution
  obligations. Source publication is distinct from distributing a built server/container/npm package.
- README and release checklist now report failed M1 acceptance honestly. No secret/license blocker
  was discovered, but the explicit policy requiring M1 audit acceptance still blocks publication.

## Next action

Resolve the remaining M1 contracts, add independent numerical and multi-constraint oracles, rerun
all gates and obtain acceptance. Do not start M2, create a remote, or push as part of this audit.
