# Public Release Checklist

Prepared for the transition from private development to a public repository. Status as of
2026-09-21. Items that cannot yet be completed are marked pending rather than assumed to pass.

## Gates

- [x] Milestone 0 independent audit complete (fixes applied, validation rerun)
- [ ] Milestone 1 independent audit complete (required before publication)

## Content safety

- [x] No secrets in the working tree (pattern scan of source, config and docs)
- [x] No secrets in repository history (scanned at this revision; history is two commits)
- [x] Synthetic fixtures only: no real prompts, usernames, repositories, keys or personal exports
- [x] Local specification documents excluded from the repository (`.gitignore`)
- [x] No production credentials, database connection strings or provider credentials anywhere
- [x] No generated build artifacts, caches, screenshots or test output tracked

## Repository content

- [x] License present (AGPL-3.0-or-later; dependency license audit recorded in
      `docs/IMPLEMENTATION_STATUS.md`)
- [x] README accurate: pre-release status stated; no unimplemented feature is claimed
- [x] CONTRIBUTING.md present
- [x] SECURITY.md present
- [x] CI configuration present (`.github/workflows/ci.yml`)
- [x] `git status` clean
- [x] Repository history reviewed (subject-only commits; no credentials)

## Pending external steps

- [ ] Hosted CI executed (pending first push; the same commands pass locally)
- [ ] GitHub private vulnerability reporting enabled (pending repository creation)
- [ ] Repository description and topics configured (pending repository creation)
- [ ] First public tag or release (optional; not required for publication)

## Notes

- The repository must not be published until the Milestone 1 audit passes.
- This checklist is updated as items complete; it is not a substitute for the audit.
