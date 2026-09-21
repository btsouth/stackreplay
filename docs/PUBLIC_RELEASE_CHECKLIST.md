# Public Release Checklist

Status as of 2026-09-21. Repository content is **ready for public release after the M1 re-audit**. Hosted checks remain pending.

## Gates

- [x] Milestone 0 independent audit complete
- [x] Milestone 1 independent audit performed; corrections and findings recorded
- [x] M1 remediation implemented: all seven recorded blockers resolved against decisions 13-20,
      with re-derived golden fixtures, an adversarial regression suite and a recorded benchmark
- [x] Milestone 1 re-audit accepted after additional corrections; see [implementation status](IMPLEMENTATION_STATUS.md)

## Content safety

- [x] Working-tree source/config/docs inspected; no credentials or personal exports found
- [x] Pre-audit reachable history scanned: four main commits plus two local checkpoint commits,
      181 distinct blobs / 145 paths; no sensitive content matches
- [x] Synthetic fixtures with example.invalid provenance; no invented real-provider facts
- [x] Local specifications excluded; no build artifacts, screenshots or test output tracked
- [x] Existing Git author identity reviewed (name/email remain part of public commit metadata)

## Repository content

- [x] Complete AGPL license and consistent workspace license metadata
- [x] Dependency/license audit and distribution obligations recorded in THIRD_PARTY_NOTICES.md
- [x] README states pre-release status, accepted M1 semantics, synthetic-only data and performance limitations
- [x] CONTRIBUTING and SECURITY present; no invented security contact address
- [x] CI configuration present; local remediation validation results in IMPLEMENTATION_STATUS.md
- [x] Previous audit/remediation history preserved; re-audit corrections recorded separately
- [x] Remediation delta inspected for secrets, local paths, usage exports and generated artifacts
- [x] Pre-existing untracked docs/Images/ left untouched and excluded from audit/publication content

## Pending external steps

- [ ] Hosted GitHub Actions — PENDING first push; local success cannot satisfy this item
- [ ] GitHub private vulnerability reporting — PENDING repository creation
- [ ] Repository description/topics — PENDING repository creation
- [ ] First public tag/release — optional, PENDING

No remote was created and nothing was pushed. No new dependency or license change requires
renewed license research. The content scan covers tracked repository content and the remediation
delta; it does not approve the pre-existing untracked images for publication. Private workspace
tarballs were installed and exercised in an isolated project, and a browser worker matched Node
results without Node polyfills. These packages are not prepared for public npm distribution.

Local validation passed: frozen install, check/lint, contrast, typecheck, 220 tests, build and
29 E2E tests (5 viewport-specific skips). Full evidence, benchmark samples and remaining
limitations are recorded in IMPLEMENTATION_STATUS.md. Hosted CI cannot pass before the first push.
