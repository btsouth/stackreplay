> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# D4: One real Claude billing cycle

D4 completes an account-scoped economic review using local invoice facts and the
owner's explicit history assertion. Personal invoice amounts, billing dates,
source paths and native histories remain outside source control. The catalog is
unchanged. Automated examples use synthetic billing.

## Root identity and import integrity

Claude native roots are separate local resource instances. A configured
`CLAUDE_CONFIG_DIR` is honored. Native filesystem aliases resolve to the same
physical root; distinct roots stay separate even when response IDs match.
Browser folder imports preserve the originating `projects` hierarchy and connected
location boundary, rather than the adapter's temporary virtual filesystem path.

Events carry the source adapter, salted `resourceInstanceId` and salted
`sessionRoot`. The local collector can observe the raw root-to-ID mapping without
putting paths in a portable export. These are local source identities, not
provider-verified account identities. A browser-local root salt preserves these
identities across rescans while event/project salts can differ between imports.
Clearing all local data clears this salt with the billing facts.

A native response ID is counted once within its root, even across session files
or rows whose request metadata differs. The request ID is a fallback when the
response ID is absent. Completed usage wins over streaming usage; otherwise the
larger final output count wins. Identical text with different IDs stays separate.
Browser ingestion uses the same rule when the rows occur in separate files.
Deduplicated events drive call counts, token counts and the existing API replay.
Per-response duplicate-row counts support a secondary data-integrity disclosure.

## Review workflow

Select one local source account, optionally label it, select the subscription and
enter its actual paid charge and exact cycle. Billing facts are stored by plan
and source instance. Choosing a cycle preserves the selected account. A different
account cannot inherit its billing facts.

The history assertion binds the selected resource instance, import identity,
workload fingerprint, exact period and timestamp. Changing the account, import
or period invalidates it. Recorded history span remains visible separately;
a locally confirmed cycle does not establish that no history was deleted or that
each day has events. An unscoped multi-account import cannot unlock a completed
account review.

The primary result shows completion, the selected subscription and cycle, actual
paid spend, distinct responses, known tokens, current published API equivalent,
signed same-period difference and limitations. Current API prices applied to
historical recorded work are not reconstructed historical invoices. Both cache-write
scenarios remain the answer. No monthly extrapolation or capacity inference occurs.

Compare uses the same cached account/period result. Billing amounts and local
labels do not change the pricing cache key. Shares contain only permitted
aggregates; dates and paid amounts remain opt-in. Root IDs, labels, paths and
history-confirmation metadata are excluded.

## Local acceptance

The primary-root cycle contained 53,716 usage-bearing rows and 23,943 distinct
native responses, with 29,773 duplicates removed. Known processed tokens total
8,273,779,108. All four observed exact models, all responses and all known tokens
are priced. The other two discovered Claude roots contributed no usage to the
selected cycle and were not imported into the primary review.

The completed economic result and personal billing evidence are retained only
in ignored local review artifacts. Full browser acceptance verifies the local
billing workflow, history binding, account isolation, Compare cache reuse,
spend-private sharing and mobile accessibility.

Opaque subscription capacity, interruptions, product experience, unrepresented
services and tax differences remain limitations. D4 does not implement calibration
or answer whether the subscription handled the work well enough for the owner.

## Validation

The complete unit/integration suite passes 1,388 tests. The complete browser suite
passes 415 tests with 49 intentional skips. Typecheck, production build,
repository-wide checks and 44 contrast checks pass. Browser checks cover both themes,
mobile, keyboard, reduced motion, account switching, dated history confirmation,
private billing and aggregate sharing. Accessibility checks wait for streamed page
metadata before auditing the completed page.

The large local replay took 3.16 seconds in the engine, including coverage analysis.
The production browser Worker took 2.07 seconds for the explicit account/cycle and
returned a 36,075-byte summary. Compare reused that result without another pricing
request. Billing-only edits are covered by the same no-replay regression.
