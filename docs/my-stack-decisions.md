# My Stack as a decision surface

My Stack answers one question: given the workload I actually ran and the subscriptions I actually
pay for, am I buying the right AI subscriptions? Selecting a subscription is configuration; the page
is what StackReplay can determine after that.

Recorded workload + confirmed subscriptions + accepted catalog facts + a billing period → findings,
each with its evidence.

## Page

1. **Summary.** Three answers side by side: what the stack costs at published prices, what workload
   is loaded (recorded calls or responses, the period, and the API-equivalent value), and analysis
   coverage, which lists every subscription with whether this workload carries its tool's history.
   When only some histories are loaded, a sentence names the subscriptions that are not evaluated and
   their published spend. The period and its confirmation state follow on one line.
2. **What to investigate.** At most three findings, leading with a cheaper-tier review for the
   subscription carrying the most recorded work: current plan and price, recorded activity, recorded
   capacity pressure (blocked attempts and the days they fell on), lower-tier model coverage, the
   published spend change and whether an exact fit can be calculated. "Cannot be proven" stays a
   value until a provider publishes a quota the engine can replay; recorded limit events make more
   interruptions likely on a smaller allowance, never a certain failure. Removals the recorded work
   supports and subscriptions the workload cannot see follow. Nothing is added to fill the section.
3. **Subscription reports.** One ledger row per subscription: price, associated recorded calls and
   share, API-equivalent value, recorded limit events, active days, models, and an evidence
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
by import, period, account, tools and accounts; the client keeps sixteen bounded summaries, so
Workload's overview, a billing review, one period's tool slices and its account scopes do not evict
each other. Capacity evidence in a slice is limited to that slice's local accounts.

Several accounts on one provider are first-class (decision 69). The stack is a list of
subscriptions, each optionally linked to a local account, and the same plan can appear twice. A
linked subscription is read against its own account only; unlinked subscriptions of a family share
the accounts no subscription is linked to; an account no subscription is read against is listed as work outside
the stack. When a tool has several accounts, My Stack lists them ("Which subscription is each account
read against?") with calls and limit events per account, a local label and its linked plan.

`lib/stack-analysis.ts` is pure arithmetic over those results and reviewed catalog facts:
`workloadFacts` reads a market result (per-model values reuse `marketModelCosts`), `analyzeStack`
builds reports, leverage and opportunities, and `analyzeScenario` compares two stacks. Money is
decimal throughout. Replay reads a proposed stack from `?stack=<plan ids>` (catalog ids, each optionally `@` a salted local account key) and
renders the same editor and outcome; a saved assessment stores bounded finding lines for Compare.
`lib/stack-investigations.ts` turns an analysis into the first screen: `stackCoverage` (which
subscriptions this workload can evaluate) and `investigations` (at most three findings, each a set of
labelled evidence rows with an evidence word and one action).

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
qualifying work keep their price in the denominator. It is never called savings. Leverage is not a
headline: a ratio whose meaning needs a paragraph of caveats does not answer the page's question, so
it appears only inside each subscription's evidence disclosure as recorded value per published
dollar.

## Limits and next steps

- An unlinked subscription is read with every account of its tool that nothing else is linked to;
  link each subscription to its account to read them apart.
- Accounts are history locations, not provider accounts: one provider account used from two
  machines is two accounts here until linked to the same plan.
- Published allowances are relative ("5× Pro"); no quota replay is attempted. Command Code and
  OpenCode publish dollar-denominated usage; modeling their credit pricing is a candidate next step.
- Concentration of work in five-hour windows is in Workload's full-import analysis, not yet per tool
  and period here.
- Scenarios are not persisted on My Stack; Replay links carry them, and Compare keeps saved
  assessments.
