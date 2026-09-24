# StackReplay

**Replay your real AI coding workload against other subscriptions before you switch.**

*Your workload. Any stack. Replay the difference.*

StackReplay is an early-stage, local-first tool for a question that static plan comparisons cannot
answer: **would another AI coding subscription actually handle the way I work?**

> **Status: release candidate (RC1).** The browser app scans local Claude Code and Codex history,
> analyzes the workload, and replays it against a sourced catalog of real plans and Direct API
> providers, in Exact or user-built Translated mode. There are no accounts and no cloud sync. What
> exists, what is verified and what is still open is tracked in
> [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Why plan comparisons are not enough

Every "which AI coding plan is right for you?" page compares hypothetical usage. Real usage is not
hypothetical. Two developers paying for the same plan get different outcomes because their burst
patterns, model choices, cache behavior and rolling windows differ. A plan that fits one developer
perfectly can throttle another in the first week, and a plan that looks expensive can be the cheap
one at high volume.

## What StackReplay does

StackReplay is designed to read sanitized usage metadata from the coding agents you already run,
normalize it into one versioned event stream, and **replay your actual historical workload against
the real mechanics of a target plan**: rolling windows, weekly caps, model rules, pricing and
promotions. The result is a deterministic report of what would have happened, including:

- historical coverage as separate dimensions (requests, usage, models), never one blended score
- constraint results and the exact windows that would have been exceeded, with affected events
- the models a plan would not have supported
- a confidence level with its reasons, and the catalog versions used

It is not a token dashboard, an observability platform or a coding agent. It is a deterministic
replay engine with a product around it.

## Two replay targets today, more later

The launch experience, **Plan Replay**, answers "what if I switched to this subscription?" The
architecture is deliberately broader than subscriptions:

- **Plan Replay** (subscription targets): simulates a plan's documented mechanics against your
  workload: windows, limits, model rules, overage and hard stops.
- **Direct API Replay** (API targets): prices the same workload at a provider's published API list
  prices, with cache-aware token pricing, no plan and no admission decision. Implemented in the CLI
  and the browser release.
- **Local and hybrid replay** (later): feasibility and economics for running workloads locally, and
  hybrid routes such as subscription-first with API overflow. Not implemented.

The last item is described because the schema, catalog and engine are being built to support it from
the start, not because it works today.

## Privacy architecture

Privacy is a design constraint here, not footer copy. The intended architecture:

- **Prompts, responses, source code and repository contents are never needed.** The data model is
  built around execution facts: timestamps, models, token categories and costs. It has no field
  for conversation content, and adapters are designed to be read-only.
- **Local by default.** The browser app parses imported history in a Web Worker and runs replay
  there; raw session files never leave the browser. Only the normalized workload is saved, in the
  browser's own storage.
- **Cloud sync will be explicit opt-in** (a later milestone) and will store sanitized normalized
  events only, never raw imports.
- **Project identity is hashed** with a locally generated salt before anything could leave a
  machine.

Current reality: the local scan, workload analysis, Replay, Compare and stateless share links are
implemented in the browser, and the CLI detects, scans, exports and replays. Cloud sync is not.
[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) tracks exactly what exists today.

## Project status

- Milestone 0 (foundation: monorepo, design system, application shell, CLI scaffold, CI, tests) is
  complete and was independently audited.
- Milestone 1 (versioned schemas, catalog with validator and loader, deterministic subscription
  replay engine, golden fixtures, property tests, 100,000-event benchmark) was independently
  re-audited and **accepted after corrections**. All seven original blockers are resolved.
  The 100,000-event performance target remains borderline on this machine; see the complete
  benchmark samples and limitations in the implementation status.
- Milestone 2 (local adapters for Command Code, OpenCode, Codex, Claude Code, Hermes, T3 Code
  attribution and ccusage import, plus the working CLI: `detect`, `scan`, `export`, `replay`,
  `plans`, `doctor`) is implemented, offline and read-only, and passed an independent M2 audit;
  the correction log and the re-derived real-machine baseline are in the implementation status. The
  repository is public and hosted CI is green.
- Milestone 3 (browser-local replay: `/app/import` and `/app/replay`, Web Worker execution,
  IndexedDB persistence, deterministic demo workloads, and the replay result surface with its
  timeline) is **implemented, and passed an independent M3 audit after the corrections recorded in
  the implementation status**. Imported data never leaves the browser: a browser test records every
  request during import and replay and fails if any body, URL or header carries workload content.
- Milestone 4 (public site, sourced launch catalog, stateless sharing, Direct API Replay, browser
  intake, Cloudflare Workers deployment) and the RC1 product pass are implemented. The website scans
  a Claude Code or Codex history folder, or accepts selected Codex, Claude Code and Command Code JSONL,
  ccusage JSON, ZIP archives and StackReplay exports. See [workload intake](docs/INGESTION.md) for exact format and privacy
  boundaries.
- RC1 adds workload analysis (projects, chronology, time of day, pressure windows, models, token and
  cache composition, sessions and scan evidence), Translated Replay as an explicit user-built
  scenario, workload-aware Compare, and a homepage that replays an anonymized real workload against
  real catalog targets.
- The bundled catalog carries sourced public facts; synthetic `example-` data is kept for tests and
  demos only. A real workload with an unresolved model identifier stays unmapped. Accounts and
  cloud sync are not implemented.

`docs/IMPLEMENTATION_STATUS.md` is the source of truth for milestone state, verification results
and known issues. `docs/ARCHITECTURE_DECISIONS.md` records the authoritative product and
architecture decisions, and [docs/ADAPTERS.md](docs/ADAPTERS.md) documents every source adapter,
its accounting evidence and its limitations.

## Using the CLI

The CLI reads the agent histories already on your machine. It never uploads anything and never
modifies a source file.

```sh
pnpm --filter @stackreplay/cli build

node apps/cli/dist/bin.js detect                       # what exists locally
node apps/cli/dist/bin.js scan                         # what the workload looks like
node apps/cli/dist/bin.js export --out usage.json      # sanitized, versioned export
node apps/cli/dist/bin.js replay github-copilot-pro-plus --input usage.json
node apps/cli/dist/bin.js replay --target api --provider openai --input usage.json
node apps/cli/dist/bin.js plans                        # bundled catalog
node apps/cli/dist/bin.js plans --providers            # Direct API providers and their list prices
node apps/cli/dist/bin.js doctor                       # diagnose a missing source
```

`--target api --provider <id>` replays against that provider's published list prices instead of a
plan; `--compare <other-provider>` prices the same workload on both. An API replay reports a cost
only when every event is served by the provider and priced from a record in force, and it says
plainly when it could not.

Every command supports `--json` for machine-readable output. `scan` and `export` accept
`--since` / `--until` / `--source`, and `export` accepts `--input <ccusage.json>` to include an
existing ccusage export. See [docs/ADAPTERS.md](docs/ADAPTERS.md) for what each source reports and
what stays unknown.

## Local development

Requirements: Node.js 24 LTS and pnpm 10. The repository pins the toolchain in `.mise.toml`; any
Node 24 installation works.

```sh
pnpm install
pnpm dev             # web application on http://localhost:3000
pnpm test            # unit tests (Vitest)
pnpm build           # all packages and apps
pnpm check           # format, lint and import order (Biome)
pnpm check:contrast  # design-token WCAG contrast verification
pnpm test:e2e        # browser tests (Playwright; builds the web app first)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow and expectations.

## Repository structure

```
apps/
  web/            Next.js application (shell today; replay and public surfaces later)
  cli/            stackreplay CLI: detect, scan, export, replay, plans, doctor
packages/
  replay-engine/  Deterministic replay simulation
  catalog/        Plans, providers, models, pricing, plan versions
  schema/         Versioned shared schemas and types
  adapters/       Local source adapters and the collection pipeline
  db/             Server-side persistence (later milestone)
  ui/             Design system and product components
  config/         Shared TypeScript configuration
  test-fixtures/  Deterministic synthetic demo data (no real user data)
tooling/          Repository scripts (catalog validation, token contrast)
docs/             Decisions, status and the public release checklist
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. The project is spec-driven:
tests come before behavior, fixtures must be synthetic, and catalog data requires sources.

## Security

See [SECURITY.md](SECURITY.md). Never include credentials, personal telemetry or exploitable detail
in public issues.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
