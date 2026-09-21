# StackReplay

Replay your real AI coding workload against other execution targets before you switch.

StackReplay reads sanitized usage metadata from the coding agents you already run, normalizes it
into a canonical event stream, and replays that actual historical workload against a target's real
mechanics: rolling windows, weekly caps, model rules, pricing and promotions. No prompts, no source
code, no conversations.

Status: Milestone 0 (foundation). No product logic is implemented yet. See
`docs/IMPLEMENTATION_STATUS.md` for the current state and `docs/ARCHITECTURE_DECISIONS.md` for the
authoritative architectural decisions that sit beside the two specification documents.

## Requirements

- Node.js 24 LTS (pinned in `.mise.toml`, `engines` in `package.json`)
- pnpm 10 (`packageManager` in `package.json`)

## Quickstart

```sh
pnpm install
pnpm dev
```

The web application starts on http://localhost:3000. `pnpm dev` runs the Next.js dev server and
package watchers through Turborepo.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Run every workspace `dev` task (web + package watchers) |
| `pnpm build` | Build every workspace package and app |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:e2e` | Run the browser smoke tests (Playwright) |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |
| `pnpm check` | Biome format + lint + import ordering, in check mode |
| `pnpm check:contrast` | Verify WCAG contrast of the design tokens |
| `pnpm clean` | Remove build output caches |

## Repository layout

```
apps/
  web/        Next.js application (shell, replay UI, public surfaces)
  cli/        stackreplay CLI (scan, export, local replay; M2+)
packages/
  replay-engine/   Deterministic replay simulation (M1+)
  catalog/         Plans, providers, models, pricing, versions (M1+)
  schema/          Versioned shared schemas and types (M1+)
  adapters/        Local source adapters (M2+)
  db/              Server-side persistence (M5+)
  ui/              StackReplay design system and product components
  config/          Shared TypeScript configuration
  test-fixtures/   Deterministic demo data (no real user data)
tooling/
  scripts/         Repository scripts (token contrast check, later: catalog validator)
docs/              Specification, decisions, implementation status
```

## Docs

- `docs/ARCHITECTURE_DECISIONS.md` — authoritative architectural decisions
- `docs/IMPLEMENTATION_STATUS.md` — milestone progress and verification results
- `Initial plan.docx`, `adendum stackreply.docx` — the product and engineering specifications
