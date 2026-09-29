# Models and providers roadmap

Written 2026-09-29. This is the working plan for making the model and subscription pages the place people check for every popular coding model, keeping them current without manual watching, and adding benchmarks without cluttering the pages. Each slice is sized to ship as its own branch and PR. Update the status table when a slice lands.

## Status

| Slice | What | Status |
| --- | --- | --- |
| 1 | Coverage audit script and first report | Done |
| 2 | Link lineup entries to existing model pages | Done (`feat/models-batch-a`). OpenCode Go's `DeepSeek V4 Flash` stays unlinked: DeepSeek serves that legacy name with V4.1 Flash, not the retired release |
| 3 | Add missing models, batch A | Done (`feat/models-batch-a`): 18 models. Muse Spark 1.3 Contributor is a tier of Muse Spark 1.3 and is described on that page |
| 4 | Add missing models, batch B, and a coverage policy | Planned |
| 5 | Models page usability pass | In progress (`feat/models-batch-a`): table view, access filters, sorts with a direction control, plan counts, key figures and API ids. Sorting by release date waits on a structured release date field |
| 6 | Watcher W1: source change detection | Planned |
| 7 | Watcher W2: new model detection | Planned |
| 8 | Watcher W3: drafted catalog PRs | Planned |
| 9 | Benchmarks: licensing decision | Needs owner decision |
| 10 | Benchmarks: data and UI | Blocked on 9 |

## Dated follow-ups

- After 10:00 Beijing time on 2026-10-21: Xiaomi deprecates `mimo-v2.5` and `mimo-v2.5-pro` with no replacement model (https://mimo.mi.com/docs/en-US/updates/deprecate). Update the `mimo-v2-5` and `mimo-v2-5-pro` lifecycle, end their pricing records, and recheck the plan lineups that still list them.

## Rules every slice follows

- Pushing `main` deploys production through Cloudflare Workers Builds. Work on a branch, open a PR, get every check green, and merge only after the owner approves the production deploy.
- Published facts (prices, limits, availability, dates, specs) come from provider-owned sources with a URL and `checkedAt` date. Third-party data is labeled as third-party and kept out of catalog YAML. The trust contract is in `docs/CATALOG_INTELLIGENCE.md`.
- Nothing automated writes accepted catalog data or merges. Automation may open issues and PRs. A person reviews and merges.
- Use documented APIs only. OpenRouter's terms prohibit scraping its site, including the rankings page. Artificial Analysis's site terms prohibit scraping and its free API is licensed for internal use only (see slice 9). `GET https://openrouter.ai/api/v1/models` is the documented model list and is fine to call.
- Do not create pages for stealth, temporary free, or preview-only models (for example Space Bunny, LongCat 2.5 Preview Free, Pixel Canary). Plan lineups can keep listing them unlinked.
- Missing facts stay missing. Never infer a price, limit or context size. The existing pages already show "not published" states.
- Heavy validation (full unit and Playwright suites) runs on devbox. `review/opencode-terms/HANDOFF.md` has the rsync command and logs layout. Do not rsync `.claude/launch.json`; it is local-only and fails `pnpm check` on devbox.

## Coverage audit

`node packages/catalog/scripts/coverage-audit.mjs [--online] [--out FILE]`

Offline it compares accepted model YAML with the plan lineups in `apps/web/lib/subscription-access-data.json`. `--online` adds OpenRouter slugs and release dates and a list of recent releases from developers we already track. It never edits data. The 2026-09-29 report is `docs/catalog-coverage-audit.md`: 71 models listed by our own plans have no model page, 37 lineup entries name a model we already have but are not linked, and 25 recent OpenRouter releases come from tracked developers.

After batch A (2026-09-29) the report lists 53 candidates, 2 linkable entries (both deliberately unlinked) and 21 recent releases.

Rerun the audit at the start of every coverage slice and commit the refreshed report with the slice.

## Slice 2: link lineup entries to existing models

Lineup entries only link to a model page through an explicit `modelId`; there is no fuzzy matching at runtime (`apps/web/lib/subscription-access.ts`). The audit's "match an existing model but are not linked" table lists 37 entries.

- Clear cases: `Claude Sonnet 5.5` (Anthropic, Copilot, Cursor, Command Code plans), `GLM-5.3 FlashX`, `DeepSeek V4 Flash Vision (exp)`, `Gemini 3 Flash-lite`. Confirm each plan's source page names that exact release, then add `modelId`.
- Needs checking: `DeepSeek V4 Pro` (our record is `DeepSeek-V4-Pro-0813`; confirm the plan serves that snapshot) and `DeepSeek V4 Flash` (our record is marked retired; the plan may mean the successor).
- Linking changes what Compare treats as the same model (`includedAccessModels` keys on `modelId ?? name`). Check `apps/web/lib/compare-facts.test.ts` and the Compare e2e specs after linking.
- Done when the audit's linkable table only contains entries you deliberately left unlinked, with the reason recorded in the slice's commit or doc.

## Slices 3 and 4: add missing models

Batch A is ordered by how many catalogued plans list the model, then by relevance to coding use:

1. MiniMax M3 (10 plans), MiniMax M2.7 (9)
2. GLM-5.2 (9), GLM-5.1 (5), GLM-5 (6)
3. Kimi K2.6 (9)
4. Qwen 3.8 Max (8), Qwen 3.8 Flash (7), Qwen 3.7 Plus (8), Qwen 3.7 Max (6), Qwen 3.8 27B (5)
5. MiMo V2.6 Pro and Flash (7), MiMo V2.5 and V2.5 Pro (8)
6. Claude Opus 4.6 (6), which is still offered in Claude and Kiro plans
7. Muse Spark 1.3 Contributor (8), Nemotron 3 Ultra (7), LongCat 2.0 (7)

New developer records needed for batch A: MiniMax, Qwen (Alibaba Cloud), Xiaomi, NVIDIA, Meituan. Tencent, StepFun and others follow in batch B.

Batch B is the rest of the audit list, excluding stealth, temporary and preview entries. Speed variants ("Fast", "HighSpeed", "UltraSpeed") and "(latest)" pointers are usually processing modes or aliases of an existing release. Record them as aliases or decision facts on the base model instead of new pages, unless the developer publishes them as a separate model with its own price. Slice 4 also writes the coverage policy into this doc: which models get a page (listed by a catalogued plan, or a current flagship or coding model from a tracked developer) and which do not.

### Checklist for adding one model

Use `claude-sonnet-5-5` (commit a128628) and `kimi-k3` as references.

1. Developer: add `packages/catalog/data/providers/<id>.yaml` if new, with an official source.
2. Model: `packages/catalog/data/models/<id>.yaml` with `name`, `developerId`, `providerIds`, `sources`, `lastVerifiedAt`, `verificationStatus`, `specifications` (with their own sources), and aliases for the provider API id and the OpenRouter slug (`kind: harness_alias`).
3. Pricing: `packages/catalog/data/pricing/<id>-pricing.yaml` (`basis: api_list_price`) only if the developer publishes API rates. Add cache and long-context records where published. Leave rates out rather than guessing.
4. Decision details: add an entry to `MODEL_DECISION_DETAILS` in `apps/web/lib/model-decision-details.ts` and a row in `docs/model-decision-details.md`.
5. Lineups: add `modelId` to each matching entry in `apps/web/lib/subscription-access-data.json`.
6. Rebuild generated catalog files: `pnpm --filter @stackreplay/catalog build`, and commit `bundled-catalog.ts` and `decision-market.generated.ts`.
7. Update count and coverage assertions (`apps/web/lib/model-decision-details.test.ts`, `apps/web/lib/market-discovery.test.ts`, `apps/web/e2e/market-discovery.spec.ts`).
8. An API plan (Replay target, like `anthropic-api-sonnet-5-5.yaml`) is optional and separate. Add one only when the model should be a Replay or Compare target, and add a pricing test in `packages/replay-engine/src/market-coverage.test.ts`.
9. Validate: `pnpm test --concurrency=1`, `pnpm typecheck`, `pnpm build`, `pnpm check`, `pnpm check:contrast`, and the Playwright suite on devbox. Smoke the branch preview with `node apps/web/scripts/check-deployment.mjs <preview-url>`.

## Slice 5: models page usability pass

After batch A, the model list roughly doubles. Before batch B, make it easy to scan:

- Filter by developer and by "included in a subscription I can buy".
- Show on each card how many catalogued plans include the model, linking to them.
- Sort by input price, output price, context size and release date. Models with unpublished values sort last and say so.
- Keep one card design. Desktop tables become labeled rows on mobile, as the plan pages already do.
- Check dark, light and mobile with the omabox skill, and keep axe and contrast checks green.

## Slices 6 to 8: the watcher

The watcher finds changes and prepares them for review. It never publishes. It runs as scheduled GitHub Actions on this repo.

**W1, source change detection.** A daily job fetches every provider-owned source URL recorded in catalog YAML and the lineup and terms data files. It stores a normalized-text fingerprint per URL on a dedicated `watcher-state` branch or as an Actions artifact, never in `main`. When a fingerprint changes, it opens or updates one GitHub issue per source with the URL, what changed (a short text diff), and which plans and models cite that source. Fetch politely: one request per URL per day, honor robots.txt, and stop and report on 4xx or 5xx responses instead of retrying hard. `CATALOG_INTELLIGENCE.md` already defines the source health shape to reuse.

**W2, new model detection.** A daily job runs the coverage audit with `--online` and opens an issue when a new row appears in either the missing-models table or the recent-releases table. Reuse a single rolling issue so it does not spam.

**W3, drafted PRs.** For a W1 or W2 issue, a job (or an agent run by the owner) drafts the catalog edit following the checklist above, with the source excerpt in the PR description, and opens a PR against `main`. Drafting may be LLM-assisted, but the PR must cite the exact source text for every changed value, and CI must pass. The owner reviews and merges. Merging deploys.

Start W1 and W2 before W3. Detection alone removes most of the need to watch pages by hand.

## Slices 9 and 10: benchmarks

### Slice 9: licensing decision (owner)

Checked 2026-09-29:

- Artificial Analysis free API: "Internal use only with attribution." Showing its scores on StackReplay needs the Commercial API ("Commercial redistribution with attribution", package-based quote via sales). Source: https://artificialanalysis.ai/data-api. Their site terms also prohibit scraping and building competing products.
- OpenRouter: rankings and the scores it embeds cannot be scraped (terms, section 7).

Options, which can be combined:

1. Buy an Artificial Analysis Commercial API package. One source covers the intelligence index, coding index, speed and time to first token, with consistent methodology.
2. Use openly licensed benchmark data. Candidates to verify before use: SWE-bench leaderboard, Terminal-Bench leaderboard, Epoch AI Benchmarking Hub. Check each one's data license and attribution terms and record them here before building.
3. Show developer-reported scores from official model cards and announcements, labeled "reported by the developer" with the source and date. These are published facts, but they are not comparable across developers, so do not rank by them.

### Slice 10: data and UI (after slice 9)

- Store benchmark data separately from catalog YAML (for example `apps/web/lib/benchmarks-data.json` with source, license, retrieved date and methodology link per score). It must never feed Replay, Compare pricing or capacity.
- Model page: one compact strip with at most three figures (overall, coding, speed), each with its source, as-of date and a link to the methodology. Label it as third-party measurement. No radar charts and no long score tables.
- Models list: one optional sort by the headline score. No extra columns by default.
- Missing scores show nothing rather than a zero or a dash row.
- A scheduled job refreshes the data file through a PR, the same way W3 works.
