# My Stack as a decision surface

My Stack answers one question: given the workload I actually ran and the subscriptions I actually
pay for, am I buying the right AI subscriptions? Selecting a subscription is configuration; the page
is what StackReplay can determine after that.

Recorded workload + confirmed subscriptions + accepted catalog facts + a billing period → findings,
each with its evidence.

## Page

1. **Summary.** Published monthly price of the stack, API-equivalent value of the recorded work in
   the analysis period, and subscription leverage, with the period and its confirmation state on one
   line. "Change period" edits the same review choice Workload's billing-period review uses.
2. **Opportunities.** At most four findings the data supports, each with evidence words and one
   test: no activity in an imported tool, calls that used no model in the plan's reviewed lineup,
   a small share or a value below the price, consolidation into a subscription that already carries
   more of the work, a cheaper tier that lists every recorded model, recorded work outside the stack,
   and one factual leverage highlight. Nothing is added to fill the section.
3. **Subscription reports.** One ledger row per subscription: price, associated recorded calls and
   share, API-equivalent value, leverage, active days, models, recorded limit events, and an evidence
   disclosure with the lineup check, published allowance and searchable model access. Plans whose
   tools StackReplay cannot read say so instead of showing zero.
4. **Test a change.** Change a tier, remove, restore or add a catalog plan. The outcome gives the
   exact published spend change and, per change, what the recorded workload establishes. "Inspect in
   Replay" opens the same scenario in Replay; "Make this my stack" writes Current Stack with Undo.
5. **Setup.** The family editor and manual chooser, open when the stack is empty, secondary after.

The former "Recorded tool activity" section is gone; its call shares, models and unresolved counts
are part of each report and of "Recorded work outside your subscriptions".

## Data flow

`lib/use-stack-workload.ts` resolves the analysis period, then runs the existing `API_MARKET`
calculation sequentially (the Worker runs one market calculation at a time): the whole period, the
confirmed account's scope when a confirmation names one, and each recording tool's calls through a
new optional `sources` filter. With one tool, the whole-period result is reused. Results are cached
by import, period, account and tools; the client now keeps eight bounded summaries instead of
three, so Workload's overview, a billing review and one period's tool slices do not evict each
other. Capacity evidence in a tool slice is limited to that tool's local accounts.

`lib/stack-analysis.ts` is pure arithmetic over those results and reviewed catalog facts:
`workloadFacts` reads a market result (per-model values reuse `marketModelCosts`), `analyzeStack`
builds reports, leverage and opportunities, and `analyzeScenario` compares two stacks. Money is
decimal throughout. Replay reads a proposed stack from `?stack=<plan ids>` (catalog ids only) and
renders the same editor and outcome; a saved assessment stores bounded finding lines for Compare.

## Period

A billing cycle or custom period chosen in the billing-period review wins. Otherwise a recorded
span of up to 31 days is used and labeled as a recorded span. A longer history is never cut to "the
last 30 days": leverage waits for a chosen period. Leverage needs 28 to 31 days. History confirmation
reuses the existing digest-bound local assertion; an account-scoped confirmation covers that
account's tool only, and only when that account holds all of the tool's calls in the period.

## Evidence

| Word | Meaning |
| --- | --- |
| Measured | Arithmetic over recorded calls in a confirmed, ended billing period, at accepted API prices |
| Published | A reviewed provider fact: price, relative allowance, model lineup |
| Likely | Limits were already recorded in the period and the change lowers the published allowance |
| Estimated | Useful, with a stated gap: unconfirmed history, a recorded span, published access only |
| Cannot determine | The provider publishes no fixed token allowance, or StackReplay cannot read the tool |

Deterministic: published spend changes, API-equivalent values and leverage of recorded work (under
the period's evidence word), no activity in an imported tool, lineup coverage. Estimated:
consolidation, anything over an unconfirmed period. Unsupported: whether any subscription would
carry the work. No subscription in the catalog publishes a fixed token quota, so plan fit is never
claimed.

## Association and leverage

Recorded work is associated with a subscription through the reviewed discovery mapping (Claude
Code with Claude plans, Codex with ChatGPT plans, Command Code and OpenCode with their own plans).
That is where the work was recorded, not proof of which account paid. Two plans of one family share
the tool's calls; they are never split.

Leverage is API-equivalent value of the associated work divided by one monthly price (a locally
entered paid amount for exactly this period when present). It counts only calls on models the
plan's reviewed lineup includes and names the rest as excluded. A priced subset gives a floor,
marked "≥". Stack leverage covers the subscriptions StackReplay can read; readable plans with no
qualifying work keep their price in the denominator. It is never called savings.

## Limits and next steps

- Per-tool association cannot tell two accounts of one tool apart unless a history confirmation
  names the account.
- Published allowances are relative ("5× Pro"); no quota replay is attempted. Command Code and
  OpenCode publish dollar-denominated usage; modeling their credit pricing is a candidate next step.
- Concentration of work in five-hour windows is in Workload's full-import analysis, not yet per tool
  and period here.
- Scenarios are not persisted on My Stack; Replay links carry them, and Compare keeps saved
  assessments.
