# Catalog watcher (W1/W2)

Detection only. No accepted catalog data changes. Model identity, aliases, plan availability, pricing, effective dates and Replay economics still come from reviewed `packages/catalog/data` YAML. W3 patches, candidate admission, drafted PRs and merging are absent.

## Architecture and inventory

`packages/catalog/scripts/catalog-watcher.mjs` orchestrates separate inventory, HTTP, normalization, transition, rendering and GitHub modules under `scripts/watcher`. `coverage-core.mjs` owns the existing audit matching semantics and exposes structured results; `coverage-audit.mjs` retains its offline/`--online`/`--out` Markdown CLI.

The inventory walks nested source references in all four accepted YAML directories plus `subscription-access-data.json`, `subscription-published-terms-data.json` and `opencode-published-terms-data.json`. It removes URL fragments, preserves queries and paths, sorts deterministically and derives a stable ID from SHA-256 of the canonical URL. Multiple citations produce one source with deduplicated exact model, pricing, provider, plan, lineup and terms IDs. No fuzzy matching traces affected records.

`source-policy.json` is a reviewed provider host/path allowlist, not a crawler seed. It permits only already recorded URLs. Existing intelligence registry authority, lifecycle and HTTP eligibility can veto a URL. Shared GitHub/Hugging Face hosts have narrow official developer paths, with issue/discussion/PR links excluded. Unknown hosts, archives, community sources, X, YouTube, npm evidence and OpenRouter site pages are excluded. No sitemap or page links are followed.

The MiMo deprecation URL recorded in the roadmap is an explicit additional watch reference to the two existing model IDs. It supplies no accepted fact. Other dated follow-ups already appear among accepted source references. New source hosts/paths need a reviewed policy edit. Unknown source kinds remain `provider_page`; explicit registry kinds are retained.

The current inventory contains 184 unique sources across 21 providers: 181 generic provider pages, two registered provider docs and one registered provider changelog. It excludes 42 unique URLs. Counts change as reviewed catalog citations change.

## State storage

A dedicated orphan `watcher-state` branch contains only `state.json`. GitHub's Git Data API creates an initial parentless commit, then ordinary parented commits with `force: false`. It refuses unexpected files, unsupported state versions and blobs above 30 MiB. There is no checkout or execution of state-branch content. No daily fingerprints are committed to `main`, and accepted YAML never appears in the state tree.

Artifacts were considered but rejected: retention expiry and finding the latest successful artifact add recovery and lookup dependencies. Branch state is inspectable, does not expire and needs no Actions-read permission. The repository's production branch is `main`; neither this workflow nor its state updates invoke deployment. CI push triggers also only include `main`.

State stores each source's inventory metadata, last normalized successful text, observation time, failure streak and the existing `sourceHealthV1Schema` health object. This includes attempt/success times, HTTP status, final redirect URL, content type, fingerprint and healthy/failed/stale state. Failed retrievals preserve the last successful fingerprint/text; seven days without success makes a failing source stale. Health never invalidates accepted facts.

W2 stores candidate key, category, first/last seen, active status and discovery details. Disappeared rows remain historical entries. Missing-model keys use the existing audit's normalized key; recent-release keys use exact OpenRouter slugs. Its 60-day window and developer-tracking rules are unchanged. Discovery is not identity proof. OpenRouter outages retain prior recent-release leads and discovery details, rather than treating missing responses as disappearance.

Before GitHub issue writes, the run commits its state and pending outbox. It then delivers issues and commits the cleared outbox. A partial delivery can be retried safely. Source episodes remain queued; rolling coverage updates coalesce to the latest set. Same-UTC-day reruns reuse recorded attempts, including failures. A crash before the checkpoint can require fetching again; no issues have been delivered at that stage.

## Fetching and normalization

Plain HTTPS GET only, default port 443, no credentials or unsafe URL characters. Sources and redirects must remain within approved paths for the same provider. Requests carry `StackReplayCatalogWatcher/1.0 (+https://github.com/btsouth/stackreplay)` and no GitHub credentials. Redirects are manual and limited to three hops. Destination robots rules are checked before fetching. URL response promises are cached, so converging redirects cannot duplicate requests within a run.

Four workers share serialized host queues, with at least 1.5 seconds between requests on a host. A larger robots crawl-delay is honored up to 30 seconds; larger delays are reported as unsupported. Each normal request has one attempt, a 12-second timeout and a streamed 2 MiB decoded-byte cap. Robots has a 512 KiB cap, once per origin. The documented OpenRouter `/api/v1/models` API has an 8 MiB cap and the same timeout, with no site scraping or redirects. No retry loop is used.

Robots disallow prevents page retrieval. Ambiguous robots timeout, 403/5xx, HTML challenge or cross-origin redirect also prevents it. Robots 404/410 means unavailable rules and allows access. Binary types, unsupported encodings and pages with fewer than 80 visible characters are failures. Bot protection is never bypassed.

HTML parsing decodes entities and excludes script/style/noscript/template/head/SVG and explicitly hidden elements. Block boundaries become lines; line endings and whitespace normalize deterministically. Text responses use the same whitespace normalization. Numbers, prices and dates remain intact. SHA-256 hashes the full normalized text, without LLM rewriting. Generic navigation/footer text remains: no provider-specific exclusions were added.

## Issue behavior and recovery

W1's first successful observation establishes a baseline, with no change issue. Later successful fingerprint changes open a bot-owned issue using a hidden stable source marker. Later episodes comment on the same open issue, preserving its review history. Event markers in issue bodies/comments make replay a no-op. After a source issue closes, a new change/failure episode creates a fresh issue; the same already reviewed episode does not reopen it. Recovery comments only on an existing open issue and does not open another.

One timeout/403/5xx remains state-only. Three failed daily attempts produce a health episode; 404/410 produces one immediately. The same continuing failure is not reported daily. A materially different failure reason can update the episode. Recovery is reported and clears the streak. Source issues include exact affected IDs, before/after observation timestamps and fingerprints, fetch health and at most 12 snippets of 240 characters within a 3,000-character diff budget. Large edit computations are capped. Text is escaped to avoid Markdown markup, mentions and embedded instructions.

W2 opens one rolling `Catalog watcher: model coverage candidates` issue, using its own hidden marker. It groups new rows, current missing-model/recent-release leads and rows no longer appearing. Rows include names, slug/date when available, exact plans/count, first-seen time and reason. Rendering caps display strings, shown plans, rows and the total candidate text at 48,000 characters; full discovery details stay in state. Unchanged sets cause no issue writes. A changed set updates the body and can reopen this same rolling issue. The body represents its last set-change observation; daily last-seen history lives in state. A persistent API outage is reported at three attempts, and recovery is reported. It explicitly requires official developer sources before catalog admission.

Missing state is safe: sources baseline, and W2 may open/update its single initial research queue. For a deliberate reset, dispatch the workflow on `main` with `rebaseline: true`. Keep `dry_run: true` to inspect first; set it false to replace the branch baseline without source/model detection issues. Old issues are left for human review. Reset discards pending detection history but preserves state-branch commit history, does not force-push and can repair malformed state JSON. Unexpected branch files still require operator investigation.

## Schedule, permissions and commands

`catalog-watcher.yml` runs daily at 07:23 UTC and supports `workflow_dispatch`. Manual runs default to dry run. A single concurrency group prevents overlapping runs; timeout is 30 minutes. Only the upstream repository's `main` ref can run the job or apply effects. Node 24, pnpm and install caching match CI. Permissions are `contents: write` for branch state and `issues: write`; there are no deployment permissions. Checkout does not persist credentials. GitHub tokens go only to the fixed GitHub API origin.

Build the validators, then run locally:

```sh
pnpm --filter '@stackreplay/catalog...' build
node packages/catalog/scripts/catalog-watcher.mjs --dry-run
```

Bound a live review across hosts and save a **new** output file outside the repository:

```sh
node packages/catalog/scripts/catalog-watcher.mjs --dry-run --source-limit 12 --out /tmp/watcher-review.json
```

Dry runs never write GitHub or remote state. `--remote-state` optionally reads the existing branch with `GITHUB_TOKEN`; otherwise the run starts empty. `--state FILE` accepts prior state JSON locally. The JSON report's `state` field can be supplied for a subsequent comparison. `--out` requires a new file outside the repository and refuses existing files/symlinks to prevent overwriting catalog data. `--rebaseline` resets a local comparison without manual state-file deletion. `--apply` is restricted to the main-branch GitHub Action and cannot use fixtures, local state or sampling.

Deterministic offline review and tests:

```sh
node packages/catalog/scripts/catalog-watcher.mjs --dry-run \
  --fixtures packages/catalog/scripts/watcher/fixtures/run.json \
  --state packages/catalog/scripts/watcher/fixtures/state.json
pnpm --filter @stackreplay/catalog test:watcher
```

Tests use no live sites or GitHub. They cover baseline/change/unchanged, reverse-reference deduplication, HTML churn, robots, redirects, timeout, 404, byte limits, non-text/JS-only sources, failures/recovery, new/disappeared/returning candidates, API outages, CLI safeguards, outbox coalescing and issue/state idempotency. The existing audit's offline Markdown output also matched the pre-refactor CLI byte for byte.

## Pre-release live review and limitations (2026-09-29)

The bounded 2026-09-29 review inventoried 184 sources and selected 12 across hosts: 10 received source HTTP responses, seven established baselines, five failed/skipped, zero unchanged/changed and zero duplicate URL requests. Thirteen source requests included redirects; twelve robots requests made 25 HTTP requests in total. W2 found 51 missing-model and 22 recent-release rows, all 73 initial research leads, producing one proposed rolling issue. No GitHub issue/state writes occurred.

Observed limitations: DeepSeek returned HTML for robots, a Claude blog host's robots returned 502, ChatGPT pricing returned 403, and two Meta pages supplied insufficient visible text. Google redirected a model listing to a locale query, so locale churn may be noisy. NVIDIA and other rendered app shells may include meaningful-looking UI text; a successful fingerprint does not prove completeness. Short-page detection is a conservative heuristic, not a general JS-content detector. Generic navigation/date/UI changes may produce noise. These need observed signal review, not browser crawling or broad text removal.

That pre-release review sampled sources rather than fetching all 184. W1/W2 subsequently merged in PR #20. The September 30 and October 1 scheduled runs succeeded and delivered state/issues; network availability and GitHub branch restrictions can still fail later runs. Fixtures verify delivery logic, not production activation. State growth is bounded by the blob cap; very large future catalogs may need per-source state files. W3 remains deferred until signal quality is observed.

## Human triage

[October 1 review](catalog-watcher-triage.md) compared the complete stored source
snapshots behind all 63 open detections. Twenty-nine noise episodes were closed;
34 remained open with labels separating catalog review, incomplete source review,
source health and coverage research. Dates and labels describe this review only.

A bounded issue excerpt can hide meaningful changes. Before closing a detection,
read its full before/after snapshots; identical line inventories also need an order
check when headings and values may have moved. Close only the reviewed episode,
record its reason, and retain unclear or substantial changes for source verification.
Closing an issue does not suppress future episodes from that source. No watcher
normalization, state reset, auto-admission or W3 activation was part of this triage.
