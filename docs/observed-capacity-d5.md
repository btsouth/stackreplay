# Observed subscription capacity (D5)

A billing review now pairs current published API economics with locally observed
capacity interruptions. These observations describe one account, selected plan,
recorded workload and cycle. They never change catalog capacity or predict another
tier.

## Evidence and account scope

Claude native normalization recognizes client-generated synthetic error records
with structured quota rejection and reset fields, explicit model-limit messages,
and generic API rate-limit retries. User messages, tool output, ordinary assistant
prose, pauses and model changes are not capacity evidence. Server overload,
network failures, refusals and administrative access denial are not subscription
exhaustion. Exhausted usage credits and unattributed API retries remain separate
unknown-capacity records.

Hard events count distinct recorded blocked attempts, not independent outages.
Native identities are salted and scoped to the originating account root and
session. Repeated copies count once; different native records stay separate even
when their text or reset time matches. A reported reset timestamp is a schedule,
not proof that a reset or restoration occurred. Exact model identity remains
unknown when the client names only a model family.

## Review experience

Select one local account and one subscription for the cycle. Workload and Compare
use the same cached result. The compact capacity section shows direct hard events,
affected sessions, UTC days, scheduled reset times and evidence limitations.
The timeline retains individual observations, daily response counts and retrospective
5-hour, 24-hour and 7-day workload context, including known tokens and model mix.
Context is restricted to imported history inside the cycle, and is not quota
accounting. No uninterrupted duration or reset start is inferred.

Manual interruption entry records a UTC timestamp, optional displayed reset,
optional local note and assertion timestamp. User assertions are visibly separate
from native evidence, may overlap it, and can be removed. They are bound to import,
resource, selected plan, exact cycle, workload digest, evidence digest and methodology.
Changed scopes do not reuse assertions; different account scopes retain their own
records. Clearing local data removes them.

## Local data and performance

Normalized native observations live with the local import; no raw messages or
paths are retained. Manual assertions live in versioned browser-local state.
Derived context is calculated once in the Worker and cached with the market result.
Expanding the timeline, adding an assertion or editing paid amounts does not replay
pricing. Shared snapshots exclude all capacity observations, local notes and
confirmation metadata. Actual spend remains independently opt-in.

## Validation and limits

The real primary-account history was scanned locally and attached to the existing
confirmed review without changing its normalized usage population or economic
result. Secondary account roots remained excluded. Exact observations, billing
facts, private reports and screenshots stay outside source control. Synthetic
fixtures cover native deduplication, root isolation, false-positive rejection,
cycle boundaries, manual persistence/invalidation, Compare caching and browser
accessibility in both themes and mobile.

Available logs do not prove every interruption was preserved. Zero parsed events
means none were observable, not that no limits were hit. This does not establish
universal Max capacity, future quotas, equivalent API experience or acceptable
interruption levels.

The next useful question is which observed interruptions materially disrupted the
user's work. D5 does not implement lower-tier counterfactuals, overflow allocation
or a synthetic quota for another subscription.
