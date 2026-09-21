# Public Release Checklist

Status as of 2026-09-21. Public release is **BLOCKED pending the M1 re-audit**.

## Gates

- [x] Milestone 0 independent audit complete
- [x] Milestone 1 independent audit performed; corrections and findings recorded
- [x] M1 remediation implemented: all seven recorded blockers resolved against decisions 13-20,
      with re-derived golden fixtures, an adversarial regression suite and a recorded benchmark
- [ ] Milestone 1 re-audit accepted — BLOCKED; see [implementation status](IMPLEMENTATION_STATUS.md)

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
- [x] README states pre-release status, that the audit findings were addressed, and that the
      corrected engine awaits re-audit
- [x] CONTRIBUTING and SECURITY present; no invented security contact address
- [x] CI configuration present; local remediation validation results in IMPLEMENTATION_STATUS.md
- [x] Audit corrections recorded in one commit; remediation recorded in one further commit; final
      working tree verified clean

## Pending external steps

- [ ] Hosted GitHub Actions — PENDING first push; local success cannot satisfy this item
- [ ] GitHub private vulnerability reporting — PENDING repository creation
- [ ] Repository description/topics — PENDING repository creation
- [ ] First public tag/release — optional, PENDING

No remote was created and nothing was pushed during this audit or remediation. Content/license
checks did not identify a separate publication blocker, but policy requires M1 acceptance before
publication. Private workspace package tarballs were smoke-tested, not prepared for public npm
distribution. Local remediation validation (format, lint, contrast, typecheck, 196 tests, build,
end-to-end smoke, 100,000-event benchmark with peak RSS) is recorded in IMPLEMENTATION_STATUS.md;
local validation is not a substitute for the re-audit.
