# Contributing to StackReplay

Thanks for considering a contribution. StackReplay is spec-driven: the product and engineering
specification (summarized authoritatively in [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md))
defines what is in scope, and changes that contradict it are rejected regardless of quality.

## Development prerequisites

- Node.js 24 LTS (the repository pins it in `.mise.toml`)
- pnpm 10 (`packageManager` in `package.json`)
- Optional later: Docker for a local PostgreSQL once the database milestone lands

## Workflow

```sh
pnpm install
pnpm dev          # Next.js dev server plus package watchers
pnpm check        # format + lint + import order (Biome)
pnpm typecheck
pnpm test         # unit tests (Vitest)
pnpm build
pnpm test:e2e     # Playwright browser tests (builds the web app first)
```

All of these must pass before a pull request is ready; CI runs the same commands. Browser tests
cover Chromium desktop and an emulated Android viewport; manual screen-reader and Safari testing is
still welcome when you touch UI.

## Expectations

- **Milestone discipline.** Do not implement behavior from a later milestone opportunistically.
  Milestone scope is defined by the specification; if something belongs later, say so instead of
  building it.
- **Tests before behavior.** Replay rules, window semantics, catalog validation and schema changes
  each require tests. Golden fixtures that change require explicit justification in the pull
  request.
- **Synthetic fixtures only.** Fixtures must contain no real prompts, no real usernames, no real
  repository names, no API keys, no source code and no personal exports. Deterministic synthetic
  data is required.
- **Never commit real secrets.** No provider credentials, API keys, database connection strings,
  Stripe secrets or personal StackReplay exports, ever. See [SECURITY.md](SECURITY.md).
- **Catalog claims require sources.** Every plan, limit, promotion and price needs a source URL, a
  verification status and a last-verified date. Do not invent provider limits or pricing, and never
  attach invented values to real provider names. Test and demo data must be clearly fictional.
- **Money is a decimal string.** Never use floating-point arithmetic for money anywhere, including
  fixtures.
- **Accessibility is part of "done".** Keyboard support, visible focus, contrast and reduced-motion
  behavior are requirements, not polish.
- **Design system first.** New UI is composed from `packages/ui` and its semantic tokens; do not
  ship stock component styling or hard-coded colors.
- **No speculative scope expansion.** Prefer small, verifiable changes that map to a milestone
  requirement.

## Licensing of contributions

Contributions are accepted under the repository license, AGPL-3.0-or-later. There is no CLA.
