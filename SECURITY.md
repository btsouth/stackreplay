# Security Policy

## Reporting a vulnerability

This project does not publish a security email address. Once the repository is public, use GitHub's
private vulnerability reporting (Security tab, "Report a vulnerability"). If that is not yet
available, open a minimal issue asking for a private contact channel, and do not include any
sensitive detail.

Public issues must not contain credentials, personal telemetry, private usage data or exploitable
detail.

## Security-sensitive areas

Areas of this project that are, or will become, security-sensitive:

- telemetry privacy: what usage data may leave a user's machine
- authentication (later milestone)
- cloud data isolation between users (later milestone)
- secrets and configuration handling
- import handling and arbitrary file parsing (adapter milestone)
- provider credential handling (later milestones)

Most of these mechanisms are not implemented yet. [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md)
tracks what exists; do not assume that a mechanism described in the specification is deployed.

## Supply chain

Dependencies are installed from the public npm registry with a committed lockfile. The repository
intentionally contains no production credentials and no private user data; synthetic deterministic
fixtures are the only data checked in.
