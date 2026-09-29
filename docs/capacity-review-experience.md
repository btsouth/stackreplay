# Interruption review and simpler billing setup

Workload now opens **Review interruptions** directly. No subscription, payment,
history assertion or billing cycle is required to inspect recorded capacity events.

The interruption view selects one local account and initially covers the full imported
UTC date span. Optional dates filter chronology without the billing review's 31-day
restriction. Billing comparisons retain that restriction. Both paths use the same
inclusive-start, exclusive-end event filter and preserve original event references.

The view leads with episodes, attempts, affected days and continuity elsewhere.
Day filters narrow the episode list without rerunning analysis. Each episode shows
recorded retries, the reported reset schedule and subsequent recorded responses.
Timing distributions, preceding workload and grouping evidence remain inspectable.
Other saved histories can be included as continuity context. Their tokens never
increase the selected account's workload or capacity.

Plan identity is optional metadata for capacity inspection. Existing plan-bound
reviews and annotations remain intact. Episode impact stays local and is bound to
account, dates, workload/evidence and selected context. No grouping, quota, pricing
or attribution rules changed. Scheduled resets and subsequent responses still do
not establish downtime, restored capacity or lost productivity.

**Compare against what I paid** now uses one form: account, subscription, amount,
cycle start and next renewal. The same cycle selects the workload. Saved cycles
can be reused. A focused plan is stored separately from Current Stack, so reviewing
one subscription does not remove other selections. Custom and multi-subscription
controls remain available as an advanced path. History confirmation remains an
explicit local assertion tied to the exact account, import and period; date/account
changes invalidate it. Editing only the amount reuses cached pricing.

The published-rate shortlist also adds Grok 4.7, Gemini 3.8 Flash, GLM 5.3 Flash and
Kimi K3 using existing catalog rates. The Claude/OpenAI pairs and common price scale
remain unchanged. This is editorial browsing, not a universal popularity ranking.

Validation covers long imports without billing setup, account separation, chronology
filters, continuity sources, local impact persistence, keyboard access, dark/light
mobile layouts, saved billing cycles and history invalidation. Synthetic fixtures
contain no owner billing details or private history. A private full import was also
exercised locally with outgoing mutation requests blocked.
