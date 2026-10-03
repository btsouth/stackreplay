> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# D0 — First useful real-market decision

After importing the representative workload, Workload now leads with **$5.93–$6.10 at the pinned published API prices**, explains the sole pricing interpretation behind the range, and retains all 900 calls. This is a token-usage counterfactual, not an actual invoice, subscription cancellation recommendation, or globally cheapest stack.

## Representative proof

Input: the existing privacy-safe `buildDemoExport("moderate")`, September 14–20, 2026; 900 recognized calls, four exact models, 10.5M known processed tokens. Nothing is filtered to get a total. Both scenarios use scope fingerprint `scope-fnv64-v1:8ca1257d86eed1c1`, 900 required/priced calls, zero exclusions, and 100% exact-model preservation.

| Direct route | Calls | Five-minute write assumption, USD | One-hour write assumption, USD |
| --- | ---: | ---: | ---: |
| Anthropic / Haiku 4.5 | 249 | 0.68569405 | 0.7360903 |
| Anthropic / Sonnet 5 | 285 | 1.6267854 | 1.7390694 |
| OpenAI / GPT-5.6 Sol | 261 | 3.0343422 | 3.0343422 |
| OpenAI / GPT-6 Sol | 105 | 0.5867648 | 0.5867648 |
| **Total** | **900** | **5.93358645** | **6.0962667** |

Catalog snapshot: `sha256:6e26ff4332ef8b0f225ba72cd514910bb45a1263461b6df7ef83b1de401ad81f`. Rules instant: `2026-09-27T18:30:00Z`; review horizon: `2026-10-27T00:00:00Z`. The admitted API set also includes GPT-5.4 Mini and GLM-5.3 Flash, neither used by this fixture. No other provider was added.

## Promotional pricing

Reverified first-party [GPT-5.6 Sol documentation](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [pricing](https://developers.openai.com/api/docs/pricing), and [reasoning billing](https://developers.openai.com/api/docs/guides/reasoning).

The generic `cash_category_override` overlay targets a stable rate ID and a bounded token category, referencing a separately verified price record. Input, output, cache reads, cache writes and reasoning can be changed independently. It cannot target a rate shared with allowance debit. No provider-specific conditionals or expression evaluator were added. Existing precedence/collision rules apply per rate/category. Endpoint, revision, model and context-tier compatibility remain validated.

GPT-5.6 Sol's promotional rates per million are input $4, cached input $0.40, cache writes $5, output $20; reasoning bills as output. The documented full-request long-context tier above 272K is $8 / $0.80 / $10 / $30 respectively. Different input/output discounts are represented by their explicitly published amounts, never a uniform factor.

The source establishes availability at least through November 21, not a precise permanent post-promotion rate. We do **not** reverse-engineer a permanent output rate from a rounded discount percentage. Its stable base rate therefore has `pricingRef: null` (unknown, not zero); the promotion supplies the evidenced categories. Removing the overlay returns non-computable pricing. October 27 is our review horizon, **not** an invented promotion expiry. Derived artifact validity is intersected with selected overlay validity; expired rules bindings cannot reuse the promotional artifact.

Compiled contract v2 gains optional `basePricingRef` and category-level `cashOverrides` provenance. New-feature artifacts use `catalog-execution-d0-v2`; old artifacts retain their compiler version and pinned semantic hashes. Historical C2A/B base claim sets and hashes remain tested; D0's optional overlay claims are tested separately.

## Cache-write ambiguity and reasoning

[Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) establishes distinct five-minute and one-hour write prices. Normalized source telemetry lacks duration. D0 compiles two **explicit counterfactuals**, selecting evidenced category overlays before local binding:

- All undifferentiated Claude writes use five-minute pricing.
- All undifferentiated Claude writes use one-hour pricing.

Both reuse the same immutable event array. No timestamps or usage categories are rewritten; no record disappears. Selected artifacts, observation assumption evidence, and scenario hashes distinguish the cases. The baseline without a discriminator remains non-computable. The UI shows both deterministic totals, not their midpoint or a probabilistic estimate. Mixed actual TTLs are not reconstructed.

The full-workload proof also exposed separately recorded Sonnet reasoning. [Claude's thinking billing documentation](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost) establishes output pricing. D0 adds that evidenced category rule to the derived Sonnet artifacts, reusing existing inclusive/exclusive token accounting. This is a published billing rule, not a TTL assumption, and does not mutate historical C2B base prices.

Explicit-only `variantId` price records can coexist for the same model/endpoint. They are never auto-selected by legacy API replay or provider/model discovery; only an explicit compiler reference can select them. Base overlap validation is preserved.

## Product behavior

Import → Open workload → the new published API equivalent instrument. It shows date/scale, dollar range or truthful unavailable state, retained/priced/excluded counts, and used direct routes. Native disclosures expose assumptions, exact decimals, aggregate token × rate × factor receipts, scope/scenario hashes, artifact/overlay IDs, and first-party claims. No per-event assignment arrays are sent to the page.

The previous recorded-provider valuation remains available below, explicitly labeled as a different historical replay pricing method. The shared legacy value figure, including Import Ready, now discloses its catalog-default cache-write assumption whenever its receipts include writes; it cannot silently present the five-minute interpretation as observed duration. Compare links to the full admitted API answer for the same workload; its existing focused comparisons remain intact. The visual system, hero, themes and typography are unchanged.

Ten previously accepted subscriptions remain visible with commercial terms, exact access evidence, and typed non-computability reasons: Claude Pro $20, Max 5x $100, Max 20x $200; ChatGPT Plus $20 and Pro 5x $100; Cursor Pro $20; Copilot Pro $10; Kiro Pro $20; Ollama Cloud Pro $20; Command Code GOAT $10, all per month in this snapshot. These are conditional published facts, not proof of account eligibility or replayable capacity. None participates in the API assignment or poisons its result.

Optional current-plan checkboxes reuse existing browser-local current-stack storage and its four-selection limit. They show fixed sticker-price arithmetic only, not savings. There are no accounts, uploads, telemetry, API calls to providers, or cloud sync.

## Runtime and support envelope

The build compiles a pinned browser-safe market snapshot; the browser does not load Node compiler modules. The owner uses its existing normalized workload and prepares two compact inputs referencing the same events. It runs one existing optimizer child at a time, using existing 5k-event batches. Each child is terminated after its durable aggregate summary returns, before the other starts. Import/replay/clear/delete/navigation and explicit abort invalidate the shared generation; stale completion cannot publish. Detailed assignments are reproducible from pinned inputs, not retained on the page.

A first 100k browser pass found a 2.7s cancellation delay in owner-side Temporal parsing. Preparation now reuses the engine's validated millisecond hot path, sharing the existing nanosecond remainder parser and consulting Temporal only for final half-open boundaries. Tests pin the nanosecond scope. No timing precision was traded for speed.

Browser measurements use the final production owner/child pipeline under concurrent suite load, after import. Each run includes both complete scenario evaluations and transfers:

| Events | First / repeat wall time | Cancellation acknowledgement | Combined page result |
| --- | ---: | ---: | ---: |
| 10,000 | 1.480 / 1.325 s | 31.2 ms | 34,814 bytes |
| 50,000 | 5.521 / 5.145 s | 41.1 ms | 34,920 bytes |
| 100,000 | 9.162 / 9.967 s | 67.0 ms | 34,961 bytes |

Every run priced all calls in both scenarios. Repeats were byte-identical, cancelled runs emitted no final success, and page heartbeat timers continued throughout. Page payload growth is numeric aggregate length, not event-count-sized assignments. Two scenarios deliberately cost two evaluations; this is not a comparison against a one-run O3A benchmark. No new heap/RSS profiling was performed or inferred from these measurements. [Machine-readable results](../benchmarks/market-decision-d0.json).

Validation: complete unit suite **1,350 passed**; complete browser suite **389 passed, 49 intentional platform-specific skips** (438 cases, zero failures); typecheck, production web/dependency build and `pnpm check` passed (eight pre-existing informational lint suggestions). New coverage includes category overlay isolation/expiry/determinism, admission and context tiers, explicit-only variants, missing discriminator, both exact receipt totals, nanosecond scope, repeated evaluation, stale/cancelled requests, dark/light/mobile/reduced-motion and axe checks, long-scope explanation, and the 10k/50k/100k pipeline. Existing O2/O3A/O3B matching, scopes, capacity fixtures, import, persistence, pricing, sharing and cancellation suites remain intact.

## Limits on purchasing conclusions

The API total assumes compatible standard direct API execution and paid API credentials, not observed account access. It includes measured text token usage, not tools, tax, negotiated prices or service throughput. Missing required categories/models remain unknown rather than zero. Unknown identities are consistently reported as exclusions; they never make recognized unpriced work disappear.

Subscription capacity/debit/reset uncertainty remains unresolved. The API-only answer does not certify a cheapest subscription combination or justify cancelling a plan. No candidate-family expansion, quota estimation, sliding windows, purchased balances, substitution, or live routing was introduced. Other workloads can still be non-computable; the existing 31-day observation support limit is unchanged. Longer imports receive an explicit unsupported-scope message with retained call count rather than a retry error or silent clipping. The existing 34-day archetype is covered by the browser regression. Future dates need a refreshed reviewed snapshot, not silent reuse of a promotion as permanent pricing.
