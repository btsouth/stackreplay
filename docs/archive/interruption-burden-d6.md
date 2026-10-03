> Archived 2026-10-03. Historical milestone note; may not match the current app. See docs/README.md.

# Observed interruption burden (D6)

The completed billing review keeps confirmed spend and current published API
economics first. Observed capacity now leads with episode groups, blocked attempts,
affected sessions and UTC days. Workload and Compare share the same cached result.

## Grouping and timing

An explicit reset groups hard-limit records by resource instance, constraint code,
window type, model label when supplied, and exact reset timestamp. Different native
attempts remain inspectable. A limit without a usable reset identity remains a
separate, unlinked group. These conservative groups do not prove independent outages;
model limits are never silently merged into five-hour limits.

Each timeline distinguishes retry span, scheduled time remaining at the first block,
time to the next recorded main-account response, and time to any recorded AI
response. Reported resets are schedules, not observed restorations. Scheduled-block
exposure unions overlapping intervals and clips them to the cycle. It is detail,
not downtime or lost productivity. Responses between retries remain visible.

Preceding 5-hour, 24-hour and 7-day workload counts each episode onset once, avoiding
retry weighting. These are descriptive main-account statistics restricted to the
cycle, not quota estimates or inferred reset windows.

## Continuity and local impact

Choose existing local imports as chronology context. Exact per-response records
with positive output qualify; aggregate, zero-output and unknown-output records do
not. Native identities are deduplicated within source/account boundaries. Source
timestamps are not guaranteed generation-completion times. Separate imports from
the main harness cannot establish different accounts and are excluded from external
context. Other-harness tokens never enter main-account capacity or economics.

The page reports activity before the next main response without claiming a causal
switch. Missing history and ordinary inactivity remain possible explanations for
no observed activity. Context warnings and unavailable imports stay visible.

Optional episode impact is local user evidence: no real impact, worked around it,
delayed me, or stopped work, with an optional note. There is no score or inferred
judgment. Annotations bind to the import, workload, account, plan, cycle and derived
evidence digest. Changing scope invalidates their presentation; clearing local data
removes them. No classification is required.

## Privacy and performance

A bounded Worker pass composes thin chronology and episode summaries, cached against
import selection, account, plan, cycle and methodology. Import mutations invalidate
the cache. Expanding timelines and editing impact do not replay pricing. Context
selection and impact persist locally. Public sharing remains unchanged: no episode
timestamps, session identities, notes or other-harness chronology are included.

The confirmed real review was exercised with existing Claude, Codex, OpenCode,
Command Code and Hermes adapters. Session aggregates were excluded from precise
chronology, and incomplete records remained disclosed. Main-account usage and its
API range stayed unchanged. Personal results, billing facts and screenshots remain
outside source control; automated tests use synthetic evidence.

## Limits and next question

This establishes recorded blocking patterns and subsequent activity, not continuous
unavailability, productivity lost, universal capacity, future quota, causal fallback,
or the right subscription tier. The next useful question is which episode groups
the user considers materially delaying or stopping work. D6 adds that optional
annotation but does not optimize alternatives.
