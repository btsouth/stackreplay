# Public Release Checklist

Status as of 2026-09-21. The repository is **public** at
https://github.com/btsouth/stackreplay and hosted CI is green.

## Gates

- [x] Milestone 0 independent audit complete
- [x] Milestone 1 independent audit performed; corrections and findings recorded
- [x] M1 remediation implemented: all seven recorded blockers resolved against decisions 13-20,
      with re-derived golden fixtures, an adversarial regression suite and a recorded benchmark
- [x] Milestone 1 re-audit accepted after additional corrections; see [implementation status](IMPLEMENTATION_STATUS.md)
- [x] Repository created as a public GitHub repository (`btsouth/stackreplay`) from the existing
      local history; no replacement repository with conflicting generated content
- [x] `main` pushed with complete history (seven commits, none rewritten, squashed or amended)
- [x] Hosted GitHub Actions green on the first push (Checks and E2E smoke jobs both succeeded)

## Content safety

- [x] Working-tree source/config/docs inspected; no credentials or personal exports found
- [x] Pre-audit reachable history scanned: four main commits plus two local checkpoint commits,
      181 distinct blobs / 145 paths; no sensitive content matches
- [x] Synthetic fixtures with example.invalid provenance; no invented real-provider facts
- [x] Local specifications excluded; no build artifacts, screenshots or test output tracked
- [x] Existing Git author identity reviewed (name/email remain part of public commit metadata)
- [x] Public tree re-verified after publication: `docs/` contains only the three markdown files,
      no local specification documents, no working images, no usage exports

## Repository content

- [x] Complete AGPL license and consistent workspace license metadata
- [x] Dependency/license audit and distribution obligations recorded in THIRD_PARTY_NOTICES.md
- [x] README states pre-release status, accepted M1 semantics, synthetic-only data and performance limitations
- [x] CONTRIBUTING and SECURITY present; no invented security contact address
- [x] CI configuration present; local remediation validation results in IMPLEMENTATION_STATUS.md
- [x] Previous audit/remediation history preserved; re-audit corrections recorded separately
- [x] Remediation delta inspected for secrets, local paths, usage exports and generated artifacts
- [x] Pre-existing untracked `docs/Images/` excluded from publication content and from the working
      tree via `.gitignore`; never committed

## Repository settings

- [x] Repository description set: "Replay your real AI workload against other subscriptions and
      execution strategies."
- [x] Topics set: ai, ai-coding, cost-analysis, developer-tools, llm, open-source, token-usage,
      typescript
- [x] Homepage set to https://stackreplay.com (metadata only; the domain is not claimed to be
      serving the product)
- [x] GitHub private vulnerability reporting enabled and verified enabled via the repository API

## Pending external steps

- [ ] First public tag or release — optional, not required for publication; no GitHub Release,
      1.0 version, npm publication or container image has been created
- [ ] Domain serving the product — https://stackreplay.com is not yet a live product deployment

Local validation passed: frozen install, check/lint, contrast, typecheck, 220 tests, build and
29 E2E tests (5 viewport-specific skips). Full evidence, benchmark samples and remaining
limitations are recorded in IMPLEMENTATION_STATUS.md. Hosted CI has since run the repository's
intended validation on GitHub's runners and passed.
