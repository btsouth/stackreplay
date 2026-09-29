# D3: Real billing-period review

D3 prices the actual Claude model mix with exact direct API routes and exposes a
complete review state when local billing and history facts support it. The real
review remains partial: no exact paid cycle or history declaration was supplied.
No personal billing amount, raw history or account identity is committed.

## Initial gap and targeted admission

The original export has 66,117 records. The requested UTC interval is
`[2026-08-24, 2026-09-24)`: 65,758 records and 21,924,000,623 known processed tokens,
with 359 records outside. All five models resolve exactly under the current catalog.
The old export lacks a canonical ID on 6,254 Opus 5.5 records; their raw identifier
is already an exact canonical ID, so no alias or substitution was added.

All records originate from Claude Code. The export's Cursor/GitHub provider labels
are inferred catalog associations, not evidence of the paying account. They cannot
establish which subscription funded a call.

Every row initially lacked an admitted exact execution route. Legacy list-price
records did not establish accepted execution pricing. All rows require input,
cache reads, cache creation and output; reasoning is an inclusive output breakdown.
Cache-write duration remains unobserved in the normalized export.

| Exact model / API ID | Calls | Uncached input | Cache read | Cache creation | Output including reasoning | Reasoning subset | Cumulative priceable calls |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude-fable-5-1 | 19,865 | 1,653,954 | 6,617,921,969 | 142,491,608 | 28,176,833 | 10,033,919 | 19,865 |
| claude-opus-5 | 15,749 | 31,504 | 4,802,734,332 | 70,737,623 | 13,710,251 | 6,867,220 | 35,614 |
| claude-fable-5 | 13,192 | 26,384 | 3,462,602,431 | 44,400,521 | 12,226,599 | 5,401,638 | 48,806 |
| claude-opus-4-8 | 10,698 | 22,921 | 4,241,471,787 | 44,968,636 | 12,344,055 | 7,302,714 | 59,504 |
| claude-opus-5-5 | 6,254 | 12,646 | 2,408,205,948 | 15,916,395 | 4,344,226 | 1,631,184 | 65,758 |

Only these five routes were admitted. All use the existing
`anthropic-messages-global` / `direct-standard` route and
[Messages endpoint](https://platform.claude.com/docs/en/api/messages/create).
The [official pricing table](https://platform.claude.com/docs/en/about-claude/pricing)
and each model's specifications establish these USD per-million rates:

| Model | Input | Output | Cache read | 5m write | 1h write |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview) | 10 | 50 | 0.25 | 12.50 | 20 |
| [Opus 5](https://platform.claude.com/docs/en/models/opus-5/overview) | 5 | 25 | 0.50 | 6.25 | 10 |
| [Fable 5](https://platform.claude.com/docs/en/models/fable-5/overview) | 10 | 50 | 1 | 12.50 | 20 |
| [Opus 4.8](https://platform.claude.com/docs/en/models/opus-4-8/overview) | 5 | 25 | 0.50 | 6.25 | 10 |
| [Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview) | 4 | 20 | 0.20 | 5 | 8 |

Claim-level evidence covers identity, endpoint, rates, cache durations, long context
and [inclusive thinking billing](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost).
The accepted version is `current-20260927-d3`, activated September 27 at 20:39 UTC;
October 27 is the catalog review horizon, not a provider expiry. This is a
current-market counterfactual, not reconstructed August/September invoices.
Standard global execution is assumed; optional fast/batch/regional modes are not inferred.
The source establishes standard pricing across the full 1M context window.

Deterministic compilation reuses the existing independent category overlays for
the two write durations. No midpoint, zero-filled rate or invented promotion is
used. D0 GPT promotion and existing route receipts remain unchanged. No observed
model remains unpriced; no unrelated route or subscription was added.

## Native-source correction

At the user's request, the export was traced back to local session metadata.
Multiple assistant rows describe the same native response. Their old exported
hashes are distinct, so the portable file alone cannot safely deduplicate them.
The original export remains untouched and its calculated $16,035.26–$17,918.60
is a record-level counterfactual, not accepted as a defensible usage total.

A fresh scan used the current adapter's response/request identity and final-output
preference. It read the 346 native files containing usage in the selected period,
including nested subagents, and counted 29,174 responses once. It reported 35,614
repeated assistant rows. Seventy-three synthetic error rows have zero token usage;
no real priced model was substituted for them. Six malformed fragments in later
September 26 history were investigated separately and are outside the selected
files/period. This verifies the available files, not the absence of deleted history.

A bounded collector fix aligns native collection depth with the existing discovery
contract. A nested workflow/subagent regression test covers the fix. Pricing
admission also excludes artifacts whose exact models are absent from the workload,
keeping the existing eight-route evaluator bound without removing any calls or
changing allocation semantics.

| Refreshed native model | Responses | Known processed tokens |
| --- | ---: | ---: |
| Fable 5.1 | 8,262 | 2,906,827,449 |
| Opus 5 | 7,818 | 2,506,540,250 |
| Fable 5 | 5,588 | 1,692,074,809 |
| Opus 4.8 | 4,137 | 1,766,433,751 |
| Opus 5.5 | 3,369 | 1,353,942,888 |
| Total | 29,174 | 10,225,819,147 |

The refreshed review prices **29,174/29,174 calls and 10,225,819,147/10,225,819,147
known tokens**, both 100%. Its API range is **$6,949.70–$7,651.28**
(exact decimals `6949.70000195` and `7651.28322695`). The original 65,758-record
period also reaches 100% pricing coverage, without any excluded records.
Actual cycle dates, locally confirmed period spend and a history declaration are
still absent; therefore the real difference is withheld.

## Product workflow

Choose exact dates or one locally supplied cycle, select only the subscriptions
being reviewed, and enter actual paid amounts in the existing local billing UI.
Published prices remain separate. A history checkbox is visible beside the history
answer. It records import ID, workload scope fingerprint, exact period, timestamp
and local provenance. Changing the workload or period invalidates it; old undated
D2 real confirmations require reconfirmation. Synthetic demo declarations remain
explicitly synthetic. Exported scan-gap warnings also prevent confirmation.

When aligned, the instrument says **Complete billing-period review**. Its conclusion
always preserves product-experience and interruption limitations. Without required
facts it remains **Partial review**, with available pricing visible.

Coverage includes recognized calls, priced calls and priced known tokens. The
Worker computes diagnostics once using the existing quote/eligibility rules. If
some calls cannot be priced, a separately scoped replay supplies an explicitly
labeled priced-workload subtotal. The original full scope and unknown reasons
remain visible. No full difference is unlocked by partial pricing.

Compare reuses the same period and cached result. Shares retain aggregate call/token
coverage and priced-scope qualifications across page, image and suggested post.
Dates and actual paid amounts remain opt-in; local confirmation metadata and raw
history are never shared. Billing edits do not rerun pricing.

## Validation and remaining limits

Complete unit/integration suite: **1,379 passed**. Complete production browser suite:
**413 passed, 49 intentional skips**. Typecheck, production build,
repository-wide `pnpm check` and all **44 contrast checks** pass. Browser validation
includes both themes, mobile, axe, keyboard, reduced motion, persisted dated
confirmations, local billing privacy, partial-scope sharing and large currency ranges.
The large-value share preview was fixed to wrap on narrow screens.
The direct engine review, including coverage, took 3.64 seconds for the original
65,758 records and 1.55 seconds for the refreshed 29,174 responses on devbox.
The production Worker review in omabox took 3.04 seconds initially and 2.88 seconds
for the explicit period, returning a 43,689-byte aggregate. No POST occurred during
import or review; the final real-data mobile screenshot has no horizontal overflow.
See [aggregate timings](benchmarks/real-billing-period-d3.json).

Exact real-review conclusion:

> Not directly comparable yet. History coverage for this period is not confirmed. Event dates alone do not prove complete logs. The published API equivalent describes only the recorded calls, with no extrapolation.

This milestone does not prove invoice authenticity, deleted-source completeness,
subscription capacity or equivalent experience. Taxes, other tools/services,
negotiated rates and unrepresented usage remain outside the API token economics.
It does not infer that any subscription funded these calls from model names.

The smallest remaining step for the first complete real review is an exact completed
billing cycle with its actual paid facts and the owner's informed history declaration.
If its dates differ, reselect that period from the available native history.
No personal calibration or broader catalog phase was started.
