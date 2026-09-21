# StackReplay Implementation Status

## Current milestone

**Milestone 1 — remediation complete, awaiting independent re-audit. NOT ACCEPTED.**

Milestone 0 is complete and was independently audited. The independent M1 audit
returned NOT READY and recorded seven blockers; all seven are resolved in this
remediation, which was implemented against the authoritative decisions recorded
in [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) (decisions 13-20).
Do not publish the repository or begin M2 until the re-audit passes. A green
suite is still not evidence that unspecified simulation semantics are correct;
the re-audit is the gate.

## Audit blockers and how they were resolved

| # | Finding | Resolution |
| --- | --- | --- |
| P1.1 | Rejected events consumed pools; no attempted-versus-accepted distinction; no explicit latch/overage behavior | Chronological admission with **atomic** rejection (decision 13). Every rule declares its exceed behavior explicitly (decision 14): `reject_request`, `latch_until_reset`, `allow_overage`, `record_only`. Results report accepted consumption, attempted demand, rejected and indeterminate counts separately. |
| P1.2 | Token categories had no disjointness contract; subsets could be double counted | Canonical non-overlapping accounting (decision 15): the event declares whether cache-read, cache-write and reasoning categories are already included in their base, and replay derives disjoint buckets. Impossible declarations are rejected. Pricing converts disjoint buckets only. |
| P1.3 | Unknown consumption could still produce 100 percent coverage and a pass | Unknown semantics (decision 16): a constraint that needs an unknown quantity becomes `unknown`; events whose consumption is unknown are indeterminate and consume nothing; coverage dimensions carry a status and omit a percentage when unknown. `usage: {}` under a token cap is now UNKNOWN with warnings, never a pass. |
| P1.4 | No current-rule resolution contract; promotions keyed off each event's date | Explicit rules context (decision 17): every replay receives `rulesAsOf`; the engine never reads a clock. Plan version selection (pinned or effective at `rulesAsOf`) is deterministic, and promotions resolve from that snapshot rather than from event timestamps. |
| P1.5 | Unbounded decimal inputs against fixed 40-digit precision | Bounded envelope (decision 18): accepted money and rate values are capped at 28 significant digits and 18 fractional digits and rejected outside it; internal precision is 100 significant digits, which the envelope makes exact for every supported operation. Boundary, one-digit-beyond, and tiny-difference tests pin it. |
| P2.6 | Overage returned UNKNOWN while coverage claimed 100 percent served, and economics ignored it | Overage implemented (decision 19): included capacity is consumed first, per-window excess is computed exactly, overage is billed at the rule's declared rate, and economics expose base plan cost, overage cost and total target cost. Rules that cannot be represented faithfully are rejected by catalog validation. |
| P2.7 | Result and export contracts: string units, unsigned cost differences, subscription-only version metadata, unchecked export ranges | Result contract corrections (decision 20): enumerated units (`tokens`, `requests`, `usd`), signed money for differences, generalized version metadata (engine, schema, catalog, methodology, rulesAsOf, target type/reference, pricing references), and export range validation (`from > to` rejected, `from == to` allowed). |

## What the remediation changed

- **Schema.** `TextUsageV1` gained the accounting declaration and its cross-field
  refinements. `ExecutionReplayResultV1` gained coverage status, enumerated
  units, exceed behavior, attempted/accepted/overage fields, rejection and
  indeterminate counts, the economics vocabulary (`basePlanCost`, `overageCost`,
  `targetCost`, `costBasis`, signed `costDifference`), generalized versions, and
  a named feasibility dimension. `StackReplayExportV1` validates range order.
  Scalars now enforce the bounded decimal envelope and provide signed amounts.
- **Catalog.** Limits must declare `exceed` explicitly (no default), and
  `allow_overage` on token or request limits must declare an overage rate with a
  matching unit. The validator rejects missing, mismatched or misplaced rates.
  Bundled synthetic plans state their exceed behavior.
- **Engine.** Replaced independent per-constraint evaluation with a single
  chronological admission pass over shared constraint runtimes. Disjoint token
  accounting replaced the blind category sum. Coverage and confidence follow the
  unknown semantics. Economics compute overage. Versions are generalized. Time
  representation keeps the audited millisecond-plus-nanosecond contract.
- **Tests.** Golden fixtures were re-derived by hand from the documented
  semantics rather than re-snapshotted: 20 golden scenarios, an adversarial
  remediation suite numbered against the audit's required list, updated property
  tests (including confidence monotonicity) and updated schema contract tests.
- **Docs.** Decisions 13-20 recorded before implementation; README, status and
  release checklist corrected to stop claiming acceptance.

## Implemented scope (unchanged from the audited M1)

- Strict, versioned `UsageEventV1`, `StackReplayExportV1`, `ExecutionTargetV1`
  and generalized `ExecutionReplayResultV1`. Events carry execution facts, not
  subscription ownership. API, local and hybrid targets remain schema shells and
  fail with `TARGET_NOT_IMPLEMENTED`.
- Provider/model/plan/pricing schemas, semantic validation, a browser-safe
  catalog entry point and a separate Node-only YAML loader. All bundled data is
  fictional, marked estimated, and uses example.invalid provenance.
- Subscription simulation: model resolution, credit pools at explicit model
  rates, token and request limits, model multipliers, promotions, first-use
  rolling windows, calendar windows in their declared timezone, violations,
  separate coverage dimensions, confidence and reproducibility metadata.
- Thirteen original golden scenarios plus seven new ones (overage economics,
  disjoint accounting, per-request versus latching rejection, atomic admission,
  explicit zero versus missing, empty versus unknown, snapshot promotions).
- The web app and CLI remain M0 foundations. No adapters or later product
  behavior exists.

## Validation

Environment: Node 24.19.0, pnpm 10.18.1, this desktop. Commands run from a clean
tree with no stale build output.

| Gate | Actual result |
| --- | --- |
| `pnpm check` | PASS, 118 files, no errors or warnings |
| `pnpm check:contrast` | PASS |
| `pnpm typecheck` | PASS, 11 tasks |
| `pnpm test` | PASS, 196 tests (schema 31, catalog 27, replay-engine 116, UI 14, CLI 8) |
| `pnpm build` | PASS, 7 tasks |
| `pnpm --filter @stackreplay/web test:e2e` | PASS, 29 passed / 5 viewport-specific skips |
| `pnpm --filter @stackreplay/replay-engine bench` | PASS, see below |

Engine tests include 20 golden scenarios, 6 property tests (capacity
monotonicity, unsupported and unknown data cannot improve coverage, confidence
monotonicity, determinism, ordering invariance, zero-event workloads) and the
numbered adversarial remediation suite covering the audit's required cases
(rejected-event admission, latching, atomicity, attempted-versus-accepted
reporting, overlap accounting, unknown consumption, explicit zero, snapshot
rules, plan selection, clock independence, decimal envelope boundaries, overage
arithmetic, signed differences, unit enumeration, export ranges, unknown versus
empty coverage, and confidence degradation).

## Benchmark evidence

Setup and catalog loading are outside timing. Each target receives a 2,000-event
warmup, then five complete 100,000-event runs with the same deterministic
workload (30 days, three models, all five token categories reported and declared
disjoint) and an explicit `rulesAsOf` inside the synthetic promotion window.

| Target | Samples (ms) | Median | Throughput | Peak RSS after target |
| --- | --- | --- | --- | --- |
| `example-cloud-starter@2026-09-15` (two rolling credit pools: reject_request, latch_until_reset) | 931.9, 857.8, 982.2, 854.9, 787.7 | 857.8 ms | ~116,600 events/second | 606.2 MiB |
| `example-cloud-pro@2026-08-01` (monthly token limit, rolling request limit, per-model credit pool with allow_overage) | 991.3, 930.8, 1023.7, 1048.4, 972.2 | 991.3 ms | ~100,900 events/second | 610.7 MiB |

Process peak RSS: 610.7 MiB.

Honest reading of these numbers: both medians are inside the specification's
sub-second target for 100,000 events, but individual samples are not always
under one second (the slowest pro sample is 1048.4 ms), and roughly 0.6 GiB of
peak process memory is still significant for large imports. The remediation made
the engine slightly slower than the pre-remediation build (starter median
744.7 ms then, 857.8 ms now) because it now derives disjoint accounting, tracks
attempted and accepted consumption separately, and evaluates admission
atomically. That cost is accepted deliberately: correctness first. Peak RSS came
down from 780.6 MiB during this work to 610.7 MiB after replacing two
per-constraint event-id maps and a per-event outcome map with cursor-based slice
lookup and an outcome field on the prepared event. No large performance rewrite
was performed.

## Known issues and limitations

- Token totals are known only when an event reports every canonical category;
  adapters must emit explicit zeros for categories they know to be absent. This
  is deliberate (an absent category is unknown, not zero) and it is why partial
  telemetry degrades to UNKNOWN rather than a guess.
- Coverage dimensions become unknown rather than reporting a scoped percentage:
  one event with unknown consumption makes request coverage unknown for the
  whole replay. This is the conservative reading of decision 16 and can be
  refined later without changing the contract.
- Calendar month windows are UTC (or the declared timezone) calendar months;
  billing anchors are not represented.
- Overage is computed per window and billed at the declared rate; multi-period
  bills, proration and roll-over credits are not modelled.
- `baselineCost` and `costDifference` exist in the contract with signed
  semantics but are not populated in M1 because no baseline target is replayed
  yet (that arrives with comparison/API replay milestones).
- Catalog identity at the engine boundary remains the supplied `catalogVersion`
  label; the loader derives it from canonical content, but the engine does not
  re-hash it.
- IANA results depend on runtime timezone data.
- The web app still renders M0 placeholder surfaces. No replay UI exists yet.

## Deviations from the specification

- None. API, Local and Hybrid targets exist as type and reference shells and
  raise `TARGET_NOT_IMPLEMENTED`, exactly as decision 7 requires.
- The two explicitly deferred questions remain open and untouched: M4A fallback
  pricing when detailed token categories are unavailable, and M2 catalog
  artifact hosting.

## Next milestone

**Independent re-audit of the remediated Milestone 1.** Milestone 2 (CLI plus
first adapters) is not started and must not begin until the re-audit passes.
