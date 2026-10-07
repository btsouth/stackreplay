# StackReplay

**Your AI coding, measured.**

StackReplay reads the logs your AI coding tools already keep and turns them into a recap of how you
actually work: tokens, models, speed, projects, streaks and what it would have cost at API prices.
It all runs in your browser. Your logs never leave your machine.

Live at [stackreplay.com](https://stackreplay.com).

## How it works

1. **Scan.** Drag your home folder onto the page, or choose a tool folder such as `.claude` or
   `.codex`. StackReplay finds the histories it knows and reads them in a Web Worker on your device.
2. **Recap.** One page with every stat: total tokens and cached context, tokens per day, top models,
   busiest projects, coding rhythm, streaks, speed in your real work, and an API list-price value.
3. **Share.** Make a card in landscape, square or story format and download it as an image, or
   create a short share link.

An optional "What you pay" setting adds one figure: how many times what you paid your usage is worth
at API prices.

## Supported tools

| Tool | What is read |
| --- | --- |
| Claude Code | `~/.claude/projects`, plus `.claude2`, `.claude-work` and other `CLAUDE_CONFIG_DIR` folders |
| Codex | `~/.codex/sessions` |
| Command Code | `~/.commandcode/projects` |
| OpenCode | `opencode.db` |
| Hermes | `state.db` |
| T3 Code | Harness attribution only, so usage is never counted twice |

You can also import ccusage JSON, ZIP archives and StackReplay exports. A linked history folder
(for example a `~/.claude/projects` that is a symbolic link) is connected with its Connect button,
because a dragged folder cannot follow a link. [docs/INGESTION.md](docs/INGESTION.md) has the exact
formats and limits, and [docs/ADAPTERS.md](docs/ADAPTERS.md) documents each source.

## Privacy

- **Logs stay in your browser.** History files are parsed on your device. Only the derived numbers
  are saved, in the browser's own storage.
- **No content is ever needed.** The data model holds timestamps, models, token counts and costs. It
  has no field for prompts, responses or source code.
- **Project names stay local.** Project identity is hashed with a locally generated salt, and folder
  names are shown only in your browser.
- **Sharing sends only the card.** Downloading a card image uploads nothing. Creating a share link
  sends only the numbers on the card. Connecting GitHub sends only your username.

The hosted site uses Cloudflare Web Analytics for page visits. The
[methodology page](https://stackreplay.com/methodology) explains what is measured and how.

## The public site

Beyond your own recap, stackreplay.com has a sourced catalog of AI models, providers, benchmarks,
subscription plans and dated market updates.

## CLI

The CLI reads the histories on your machine the same way. It never uploads anything and never
modifies a source file.

```sh
pnpm --filter @stackreplay/cli build

node apps/cli/dist/bin.js detect                    # which histories exist locally
node apps/cli/dist/bin.js scan                      # what your usage looks like
node apps/cli/dist/bin.js export --out usage.json   # sanitized, versioned export
node apps/cli/dist/bin.js doctor                    # diagnose a missing source
```

Every command supports `--json`. `scan` and `export` accept `--since`, `--until` and `--source`. Run
`--help` for the full list.

## Local development

Requirements: Node.js 24 LTS and pnpm 10. The repository pins the toolchain in `.mise.toml`.

```sh
pnpm install
pnpm dev             # web app on http://localhost:3000
pnpm test            # unit tests (Vitest)
pnpm build           # all packages and apps
pnpm check           # format, lint and import order (Biome)
pnpm check:contrast  # design-token WCAG contrast check
pnpm test:e2e        # browser tests (Playwright; builds the web app first)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Repository structure

```
apps/
  web/            Next.js app: scan, recap, share cards and the public site
  cli/            stackreplay CLI
packages/
  adapters/       Local history adapters and the browser scan pipeline
  schema/         Versioned shared schemas and types
  catalog/        Models, providers, prices and plans with sources
  replay-engine/  Prices usage at API list prices for the recap and CLI
  share/          Share card and share link formats
  benchmarks/     Sourced benchmark data
  market-events/  Dated market updates
  ui/             Design system
  db/             Server-side persistence (not used yet)
  config/         Shared TypeScript configuration
  test-fixtures/  Synthetic demo data (no real user data)
tooling/          Repository scripts
docs/             Technical references and decisions
```

[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) tracks what exists and what is open.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Tests come before behavior,
fixtures must be synthetic, and catalog data requires sources.

## Security

See [SECURITY.md](SECURITY.md). Never include credentials, personal telemetry or exploitable detail
in public issues.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
