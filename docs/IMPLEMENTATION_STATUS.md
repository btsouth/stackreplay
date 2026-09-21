# StackReplay Implementation Status

**Current milestone: Milestone 0 — Foundation (locally verified after independent audit; hosted CI pending).**
Milestone 1 has not been started.

Recorded 2026-09-21. Toolchain: Node.js 24.19.0 (pinned in `.mise.toml`), pnpm 10.18.1,
TypeScript 7.0.2, Turborepo 2.11.2, Next.js 16.3.5, React 19.3.0, Tailwind CSS 4.3.3,
Biome 2.5.14, Vitest 5.0.1, Playwright 1.63.0.

## Completed requirements (spec point 98)

| Requirement | Status | Notes |
| --- | --- | --- |
| Turborepo | done | `turbo.json` with build/dev/typecheck/test/test:e2e/clean tasks |
| pnpm workspace | done | `pnpm-workspace.yaml`, `packageManager` pinned to pnpm 10.18.1 |
| Next.js web | done | `apps/web`, App Router, RSC-first, `/api/v1` reserved for later milestones |
| CLI package | done | `apps/cli` with a `stackreplay` bin; `--help` and `--version` only |
| Shared TypeScript config | done | `packages/config` (base/react/node), strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes |
| Biome | done | format, lint, import ordering; Tailwind v4 directives enabled |
| Vitest | done | unit tests in `packages/ui` and `apps/cli` |
| Playwright | done | `apps/web/e2e` smoke + axe accessibility, desktop and mobile projects |
| Tailwind | done | Tailwind v4 via `@tailwindcss/postcss`; design tokens bridged with `@theme inline` |
| shadcn/Base UI | done | shadcn-style primitives layer (cva + cn); Base UI Dialog powers the mobile drawer |
| StackReplay tokens | done | OKLCH semantic tokens in `packages/ui/src/styles/tokens.css`, contrast-verified |
| dark/light theme | done | class-based, system-preference default, persisted, no first-paint flash |
| demo fixtures | done | `packages/test-fixtures` (heavy / moderate / multistack), no real user data |
| CI | done | `.github/workflows/ci.yml`: check, contrast, typecheck, tests, build, E2E smoke |
| Button, Input, Badge, Card, Metric, ConfidenceBadge, ConstraintStatus, ApplicationShell | done | in `packages/ui`, exercised on the internal `/design` surface |

### Acceptance criteria (spec point 98)

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| Clean clone installs with one command | pass | `node_modules` removed, `pnpm install --frozen-lockfile` restores the workspace |
| `pnpm dev` works | pass | Next dev server used for all E2E and screenshot verification |
| `pnpm test` works | pass | 22 tests across 6 files, including the built CLI process |
| Dark and light themes work | pass | theme E2E tests, screenshots in both themes, verified contrast pairs |
| Responsive shell exists | pass | desktop sidebar + mobile drawer (Base UI Dialog), E2E in both viewports |
| CI green | partial | clean-workspace checks and CI-mode E2E pass locally; no hosted Actions run exists |
| No product logic yet | pass | scaffold packages are comment-only modules; CLI is help/version only; web pages are placeholders |

## Tests executed and results

Independent audit on 2026-09-21 read both full specifications and the actual source files.
No commits were made; the repository still has an unborn `main` branch and no remote.

- `pnpm check` and `pnpm lint` — 84 files, passing.
- `pnpm check:contrast` — 22 token pairs per theme (44 total), passing. Includes input boundaries,
  focus rings and surface-2 text in addition to the original text pairs. Tinted badges are also
  exercised by browser axe scans; this script alone is not a complete accessibility audit.
- `pnpm typecheck` — 9/9 tasks passing.
- `pnpm test` — 6 files, 22 tests passing (UI 14, CLI 8). CLI tests include built entry-point
  output, exit codes, package-version consistency and rejected trailing arguments.
- `pnpm build` — 7/7 tasks passing; all nine application routes plus `/_not-found` prerendered.
- `pnpm test:e2e` — 29 passed, 5 skipped solely for inapplicable desktop/mobile cases.
  Local and CI runs both use the production server. Local retries are disabled. Tests cover both
  themes on `/app` and `/design`, all six placeholder routes, skip-link activation, persistence,
  unavailable/invalid storage, drawer focus trapping/return/dismissal, resizing to desktop,
  landscape scrolling, 320px overflow, 44px touch controls, input labels/errors and reduced motion.
  Axe scans assert zero violations, including both themes with the mobile drawer open.
- Clean installation — copied source to an isolated temporary workspace without node_modules,
  dist, .next, .turbo or TypeScript caches; `pnpm install --frozen-lockfile` passed. Typecheck,
  tests, build and CI-mode E2E also passed there without services or secrets.
- CLI packaging — packed the clean build, inspected the archive (no emitted test files), and ran
  help/version from the extracted package without node_modules.
- `pnpm dev` — Next dev server and six TypeScript watchers started successfully on Node 24.19.0.
- `pnpm audit --json` — no reported advisories. This is the registry audit result, not a guarantee
  that dependencies contain no vulnerabilities.
- Visual review — captured all seven shell/design routes in desktop/mobile and dark/light, and
  both drawer themes. Inspected `/app`, `/design` and representative placeholders after fixes.
  The result is a restrained, coherent foundation, not yet a distinctive launch-quality product.
  Screenshots were kept outside the repository; no committed visual-regression baselines exist.

## Independent audit fixes

- Increased coarse-pointer Button/Input targets to 44px, with 16px touch input text; mobile
  drawer controls and the brand link have appropriate target sizes.
- Added a dedicated contrast-safe input border token and full-strength keyboard focus rings,
  preserving subtle decorative borders elsewhere.
- Made the drawer scroll in short viewports and close when the desktop sidebar appears.
- Corrected theme bootstrap fallback when storage is blocked or contains an invalid preference.
  Theme and drawer triggers remain disabled until their handlers are ready, removing the need
  for tests to inspect React's private fiber properties.
- Replaced invented prices attached to real subscription names with explicitly fictional plans;
  corrected the heavy preset's multi-stack label. Display fixtures remain separate from domain schemas.
- Named the design example's coverage dimension explicitly and supplied the missing icon-button icon.
- Rejected unexpected CLI trailing arguments, declared the CLI's Node 24 baseline and excluded
  unit-test source from production output.
- Strengthened the disabled-button interaction test, CLI process tests and browser tests. The
  focus-trap test waits for the primitive's asynchronous focus transfer instead of sampling its
  temporary focus guard. No domain functionality was added.

## Known issues

- GitHub Actions has not run yet: the repository has no remote and no commits (commits are gated
  on explicit approval). The workflow is validated by running its commands locally.
- E2E covers Chromium desktop and emulated Android mobile. Real iOS/Safari, Firefox and manual
  screen-reader testing have not been performed; axe and keyboard checks do not establish full WCAG conformance.
- `@base-ui-components/react` remains at `1.0.0-rc.0`, isolated to the mobile drawer. Stable
  releases exist under the renamed `@base-ui/react` package, per the
  [official v1.0 release notes](https://base-ui.com/react/overview/releases/v1-0-0).
  Keyboard, dismissal, navigation and axe checks passed; no concrete dependency defect was found
  that justifies changing it during this audit. Reassess before expanding its role.
- `/design` is an internal verification surface. Its production fate (keep internal or remove)
  belongs to Milestone 4.
- `/` redirects to `/app`; the marketing home page arrives with Milestone 4. `/app/*` routes are
  placeholders (heading + description) until their milestones.
- No favicon or app icons yet; brand assets are a Milestone 4 concern.
- Next.js 16 writes `apps/web/AGENTS.md` (and a `CLAUDE.md` reference) on `next dev`; kept in the
  tree per Next's own guidance that committing it keeps the working tree clean.
- The two deferred questions in `docs/ARCHITECTURE_DECISIONS.md` (M4A fallback pricing, M2
  catalog artifact hosting) remain untouched by design.

## Intentional deviations and interpretations

1. **Node 24 pinned via `.mise.toml`.** The machine default is Node 26 (Current); spec point 5
   requires Node 24 LTS. The pin applies inside the repository only.
2. **"shadcn/Base UI" implemented as a primitives layer, not generated stock components.**
   `packages/ui` provides cva + cn composition following the shadcn pattern, styled with
   StackReplay tokens (spec point 32: never ship raw stock shadcn styling). Base UI supplies the
   one headless primitive M0 needs (Dialog for the mobile drawer).
3. **"Rhea-style density" interpreted per the May 2026 shadcn Rhea release:** compact controls
   (28/32/36px heights), tighter spacing, denser surfaces, mapped onto the spec's radius scale
   (6/8/10/12/14px, spec point 36).
4. **Package consumption split.** `ui` and `test-fixtures` ship TypeScript source (consumed by
   Next via `transpilePackages`); `schema`, `catalog`, `adapters`, `replay-engine` and `db` emit
   `dist` builds so the Node CLI and tests can consume them in Milestone 1+.
5. **The application shell lives in `packages/ui`** and uses `next/link`, with `next` as an
   optional peer dependency. Spec point 7 places higher-order product components in `packages/ui`
   and the only consumer is the Next application.
6. **Committed contrast checker.** `tooling/scripts/check-contrast.mjs` (zero dependencies) reads
   `tokens.css`, computes WCAG ratios for the pairs that carry text, and runs in CI. This makes the
   accessibility requirement (spec point 40) verifiable rather than asserted.
7. **`devIndicators: false`** hides the normal development indicator. It does not guarantee that
   Next error/issue overlays are suppressed; final visual review used the production server.

## Next milestone

**Milestone 1 — Schema + Catalog + Replay Engine.** Not started. It adds `UsageEventV1`,
`StackReplayExportV1`, the generalized `ExecutionReplayResultV1` with the `ExecutionTarget`
discriminated union, catalog schemas with a validator and loader, and the deterministic replay
engine with rolling/calendar window handling, golden fixtures, property tests, and the 100k-event
benchmark.
