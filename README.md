# StackReplay

**Replay your real AI coding workload against other subscriptions before you switch.**

*Your workload. Any stack. Replay the difference.*

StackReplay is an early-stage, local-first tool for a question that static plan comparisons cannot
answer: **would another AI coding subscription actually handle the way I work?**

> **Status: pre-release.** This project is under active development. Nothing here is a shipped
> product yet: there is no scanning, no importing and no replaying of real usage. The versioned
> schemas, synthetic catalog and subscription replay engine passed independent M1 re-audit
> after additional corrections. The engine is accepted within its documented semantics; the
> bundled catalog is synthetic and cannot substantiate real-provider comparisons. Exactly what
> exists, what is verified and what comes next is tracked in
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

## Plan Replay first, then more execution targets

The launch experience, **Plan Replay**, answers "what if I switched to this subscription?" The
architecture is deliberately broader than subscriptions:

- **Plan Replay** (subscription targets): the first replay experience.
- **Direct API Replay** (next): what the same workload would have cost through the provider's API,
  with cache-aware token pricing. The data model reserves space for versioned API pricing; the
  behavior is not implemented yet.
- **Local and hybrid replay** (later): feasibility and economics for running workloads locally, and
  hybrid routes such as subscription-first with API overflow. Not implemented.

The items after the first are described because the schema, catalog and engine are being built to
support them from the start, not because they work today.

## Privacy architecture

Privacy is a design constraint here, not footer copy. The intended architecture:

- **Prompts, responses, source code and repository contents are never needed.** The data model is
  built around execution facts: timestamps, models, token categories and costs. It has no field
  for conversation content, and adapters are designed to be read-only.
- **Local by default.** The planned browser experience parses imported data in the browser and runs
  replay in a Web Worker; the raw import file never leaves the browser.
- **Cloud sync will be explicit opt-in** (a later milestone) and will store sanitized normalized
  events only, never raw imports.
- **Project identity is hashed** with a locally generated salt before anything could leave a
  machine.

Current reality: this repository contains the versioned schemas, the synthetic catalog, the
deterministic replay engine, the design system, the application shell and the CLI scaffold. The
statements above are architecture intentions;
[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) tracks exactly what exists today.

## Project status

- Milestone 0 (foundation: monorepo, design system, application shell, CLI scaffold, CI, tests) is
  complete and was independently audited.
- Milestone 1 (versioned schemas, catalog with validator and loader, deterministic subscription
  replay engine, golden fixtures, property tests, 100,000-event benchmark) was independently
  re-audited and **accepted after corrections**. All seven original blockers are resolved.
  The 100,000-event performance target remains borderline on this machine; see the complete
  benchmark samples and limitations in the implementation status. M2 has not started.
- No adapters, scanning, import or replay of real usage exist yet; those arrive with the CLI and
  adapter milestones. Nothing has been pushed anywhere: there is no remote.

`docs/IMPLEMENTATION_STATUS.md` is the source of truth for milestone state, verification results
and known issues. `docs/ARCHITECTURE_DECISIONS.md` records the authoritative product and
architecture decisions.

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
  cli/            stackreplay CLI (scaffold today; scan/export/replay in later milestones)
packages/
  replay-engine/  Deterministic replay simulation
  catalog/        Plans, providers, models, pricing, plan versions
  schema/         Versioned shared schemas and types
  adapters/       Local source adapters
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
