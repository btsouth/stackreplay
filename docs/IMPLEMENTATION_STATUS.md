# StackReplay Implementation Status

## Current milestone

**Milestone 1 — independently re-audited and ACCEPTED after corrections.**

The initial M1 audit returned NOT READY. Remediation commit b83a5e5 improved the
semantics substantially, but fresh adversarial tests still exposed ten failures.
The re-audit corrected these before acceptance. Subscription replay is trustworthy
within decisions 13-21 and the explicitly supported synthetic rule model.
M2 has not started. No remote was created and nothing was pushed.

## Original blocker verification

| Blocker | Verified resolution |
| --- | --- |
| Rejected-event accounting | Atomic admission; rejected/unsupported events consume no pools. Re-audit fixed early exit that prevented other exceeded latches from triggering. |
| Overlapping token categories | Declared inclusions normalize to disjoint buckets. Re-audit rejects combined included cache subsets exceeding input and fixes disjoint workload summaries. |
| Unknown consumption / false certainty | Missing is distinct from zero. Relevant unknown consumption makes admission indeterminate and coverage unknown. Re-audit omits economics when unknown admission prevents an exact overage bill. |
| Current-rule replay | Explicit rulesAsOf date resolves plan version and promotion eligibility; historical timestamps control ordering and windows only. |
| Decimal precision | External 28-significant / 18-fractional envelope, isolated Decimal precision 100, plus validated multiplier-composition budget (decision 21). Re-audit fixed significant-zero counting and separates derived-result values from external inputs. |
| Overage semantics/economics | Explicit allow_overage bills accepted per-window excess; record_only does not bill. Base + overage = target. |
| Result/export contracts | Validated decimal quantities, kind/unit correspondence, economic identities, coverage consistency, target selection and metadata. Export ranges retain nanosecond ordering and permit empty ranges. |

## Re-audit corrections

- Evaluate every hard rule before an atomic rejection, including every latch.
- Reject impossible combined cache inclusions; expose disjoint summary totals
  only when the workload's normalized quantities are complete.
- Suppress false exact economics for indeterminate overage admission.
- Validate compositional precision, not just individual decimal inputs; allow
  exact computed costs outside the smaller external-input envelope.
- Enforce serialized economic identities, valid non-negative quantities,
  constraint units, coverage arithmetic and generalized target consistency.
- Reject windows extending beyond the four-digit-year serialization contract
  explicitly rather than emitting an invalid result.
- Replace an invalid capacity property: greedy token admission does not
  guarantee monotone served-request counts. Add an independent atomic-admission
  oracle, arbitrary nanosecond permutations, and declared-quality properties.
  Strengthen compatibility and unknown-data properties.
- Record engine 0.0.3 and methodology 1.2.0. Preserve earlier audit fixes.
- Add benchmark checks for full known-workload evaluation and print accepted
  versus attempted consumption, actual overage and rulesAsOf.

## Implemented scope

- Versioned UsageEventV1, StackReplayExportV1, ExecutionTargetV1 and generalized
  ExecutionReplayResultV1. Execution facts do not contain subscription ownership.
- Provider/model/plan/pricing schemas, semantic validation, browser-safe catalog
  entry and isolated Node YAML loader. Bundled data remains entirely synthetic,
  estimated and sourced to example.invalid.
- Subscription replay: compatibility, pricing, first-use rolling windows,
  timezone-aware calendar windows, independent rule quantities with atomic
  admission, explicit exceed behavior, promotions, coverage, confidence,
  violations, economics and reproducibility metadata.
- API, local and hybrid remain reference shells and fail explicitly with
  TARGET_NOT_IMPLEMENTED. No adapters, provider parsers or later product logic.
- Web and CLI remain M0 foundations. No real-usage import or browser replay UI.

## Validation

Node 24.19.0 and pnpm 10.18.1. Generated outputs were cleaned, followed by a
frozen-lockfile install and forced full validation. Relevant checks were rerun
after the final corrections.

| Gate | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS |
| pnpm check | PASS: 119 files, no errors/warnings |
| pnpm check:contrast | PASS |
| pnpm typecheck | PASS: 11 tasks |
| pnpm test | PASS: 220 tests — schema 31, catalog 27, engine 140, UI 14, CLI 8 |
| pnpm build | PASS: 7 tasks |
| Web Playwright E2E | PASS: 29 passed, 5 explicitly viewport-specific skips |
| Browser worker | PASS: 554,160-byte unminified browser bundle, no Node polyfills; representative result identical to Node |
| Packed packages | PASS: schema/catalog/engine installed outside the workspace; bundled YAML loads and representative replay validates |
| Publication delta | PASS: b83a5e5 delta reviewed/scanned; no new secret, local-path or generated-artifact finding |

The engine has **25 golden test cases**, **11 property tests**, and **21 new
re-audit regressions**, plus the preserved time, original audit and remediation
suites. The earlier documentation's 20 golden / 6 property count was inaccurate
(the remediation actually had 25 / 8). Golden expectations were independently
checked for rejection, latching, overage, overlap, unknowns and snapshot rules.
Only version metadata changed in the stored golden snapshot during this audit.

## Benchmark evidence

Each case builds a deterministic 100,000-event, three-model workload across 30
days outside timing, warms with 2,000 events, then measures five complete replay
calls. Validation, sorting, normalization and admission execute on each call.
No result cache exists. Median calculation handles odd/even sample counts.

Corrected implementation measurements (milliseconds):

| Run / target | Samples | Median | Events/second | Peak RSS after target |
| --- | --- | --- | --- | --- |
| A / Starter | 942.1, 852.8, 839.8, 919.4, 889.0 | 889.0 | 112,491 | 604.8 MiB |
| A / Pro | 1142.8, 975.5, 1045.8, 966.6, 935.9 | 975.5 | 102,508 | 608.3 MiB |
| B / Starter | 1226.2, 898.1, 879.2, 883.0, 813.0 | 883.0 | 113,253 | 608.2 MiB |
| B / Pro | 1050.4, 1008.2, 1134.8, 944.7, 946.0 | 1008.2 | 99,189 | 610.6 MiB |
| Final / Starter | 964.2, 894.4, 949.3, 984.3, 855.7 | 949.3 | 105,340 | 609.2 MiB |
| Final / Pro | 1050.2, 974.7, 1177.9, 980.9, 942.8 | 980.9 | 101,949 | 614.0 MiB |

A/B preceded the final timestamp-range guard; final includes it. Results were
identical in all runs: Starter served 29,496 requests; Pro served 3,547 and billed
USD 10.014443 overage. The promotion snapshot and disjoint normalization are
active. The unchanged remediation baseline measured 985.2 / 1031.1 ms medians.

**The sub-second median target is borderline, not consistently reproduced.**
The final medians pass, but Pro exceeded one second in another full run.
A tested quantity-precomputation optimization was discarded: its Pro median
was 1007.7 ms and peak RSS 691.4 MiB, so it did not justify retaining extra state.
Correctness was not changed to improve benchmark numbers.

The official M1 requirement that a 100k benchmark exists passes; the broader
performance target remains PARTIAL and should be tracked as a performance
limitation, not presented as a stable sub-second guarantee.

## Supported limits and remaining work

- Every canonical token category must be established to know total consumption.
  Explicit inputTokens=0 establishes that category, not missing output/cache/
  reasoning categories. Request-only admission can still be known.
- Any indeterminate admission makes request coverage unknown for the whole
  replay; any incomplete token denominator makes usage coverage unknown.
  Empty workloads retain the documented 100 percent convention.
- Calendar months follow the declared IANA zone; billing anchors, proration,
  rollover credits and multi-period subscription base billing are not modeled.
- rulesAsOf has UTC date granularity; intraday rule changes are unsupported.
- Money is USD-only. Catalog compositions exceeding the exact-arithmetic budget
  fail validation. Baseline comparison fields are validated but not populated.
- Runtime timezone data influences historical IANA results. Windows extending
  outside years 0000-9999 fail explicitly.
- CatalogVersion is recorded as supplied; the loader hashes canonical content,
  while the engine does not independently authenticate that label.
- Peak RSS around 0.6 GiB and borderline Pro latency deserve further work.
- Hosted GitHub Actions, repository settings and vulnerability reporting remain
  pending first publication. Pre-existing untracked docs/Images/ was untouched
  and excluded from the audit commit; it is not approved publication content.
- Existing deferred product questions remain deferred. No M2 work was started.

## M1 acceptance

| Official criterion (spec point 99) | Assessment |
| --- | --- |
| No React dependency in replay-engine | PASS |
| No database dependency | PASS |
| No Node filesystem dependency | PASS; catalog loader stays outside engine/browser entry |
| All golden fixtures pass | PASS: 25 cases |
| Property tests pass | PASS: 11 properties with corrected assumptions |
| 100k-event benchmark exists | PASS; complete samples and memory evidence above |
| Feed a JSON workload into a plan and get a trustworthy result | **PASS**, within documented supported semantics |

M1 is accepted and tracked repository content is ready for public release.
M2 is the next authorized milestone only when separately requested.
