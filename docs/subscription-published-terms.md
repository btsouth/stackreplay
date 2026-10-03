# Published subscription decision details

The public plan pages and Compare use reviewed provider terms alongside model access. These facts describe what a person buys. They do not establish deterministic Replay capacity, add API routes, or change the execution catalog.

`apps/web/lib/subscription-published-terms-data.json` covers every currently listed non-OpenCode subscription plan. OpenCode's two plans have their own data file. Records retain their individual review dates; the Kiro and Cursor Teams additions and refreshed Kiro Pro facts are checked on October 3, 2026. Every term links to a first-party source and exposes compact allowance, billing, privacy, compatible-tool and after-limit summaries.

Useful distinctions retained:

- Command Code's Go, GOAT and Pro model allowances share a weighted plan pool. They are not separate balances to sum. All five plans expose model allowance tables, short windows, purchased-credit rollover and ZDR conditions. Go's September 28 transition preserves existing flat-credit subscriptions until renewal.
- Copilot base and variable flex credits are separate. Usage credits reset on the calendar month, independently of payment dates. Business and Enterprise pool credits and enable additional usage by default unless administrators disable it.
- Ollama's current dollar-credit plans have monthly anniversaries, explicit concurrency limits and purchased overflow. Older session/weekly limits apply until a subscriber migrates.
- ClinePass publishes three usage windows and model reference rates, but its public guide does not state a numeric allowance. Reference rates are not extra subscription charges.
- Cursor publishes two monthly pools and model rates, but neither the individual table nor Teams states numeric pool sizes. Teams seats reset independently, do not transfer usage, enable on-demand billing in arrears by default and charge the $0.25 per million token Cursor Token Rate on third-party usage including Auto and BYOK. Premium's 5x claim is relative to an unpublished Standard amount and is not converted to an absolute pool.
- Kiro publishes monthly provider credits, model multipliers, add-on rollover and expiry, calendar billing and native-interface restrictions. Workflows use the same credit model and existing usage view, with no separate meter. A multiplier is display-only and is not a fixed prompt, token quota or base task debit.
- Claude's five-hour and weekly usage windows remain distinct from billing. Fable is included with a sublimit on Max and paid with credits on Pro. The proposed separate Agent SDK credit was paused, so it is not represented as an active benefit.
- ChatGPT's model message counts are provider estimates. Paid resets, purchased credits and API billing remain distinct. Pro 20x has a visible new-signup pause, while existing subscriptions continue renewing.
- Google Gemini, Flow and coding-tool allowances remain separate. Consumer privacy controls are distinguished from enterprise guarantees.

Tables preserve provider-specific units and missing categories. A missing rate is never converted to zero. Public pricing tables here explain subscription consumption; they are not another workload calculator.

Unresolved facts are named narrowly: exact ClinePass quota amounts and upstream retention guarantees, current numeric Cursor individual and Teams pool sizes, Kiro's base task-credit debit, Cursor Teams annual commitment and minimum-seat terms, and unpublished account-specific usage limits. Command Code's Go page and migration prose say 3/6 credits for five-hour/weekly windows, while its general usage table and FAQ still say 2/5; the page preserves this conflict and points to the account meter. The pages do not describe a fact as unpublished merely because it has not been admitted to Replay.

Devin Free, Pro, Max and Teams and licensed Gemini Code Assist Standard and Enterprise are public directory offers checked October 3, 2026. Their identities and price observations live in the web-only `public-offers-data.json` registry. `loadPublicDirectory()` wraps the accepted public catalog for subscription pages, comparison, public discovery and sitemap only. An observation date does not establish a launch date or a price's historical validity. The existing catalog hash continues to identify the execution catalog.

Devin Teams shows $80/month base plus $40/month per full developer seat, alongside the published up-to-200-user qualification. Enterprise is a sales quote. Licensed Code Assist shows monthly-commitment per-user prices and separately labels the 12-month commitment billed monthly. Prices sort within billing bases; the Teams base is never treated as a comparable total. Its daily counts, like the qualitative Devin allowance, are public disclosures only and do not create executable limits or workload targets.

Consumer Google AI plans disclose the dedicated June 18 CLI/IDE cessation notice and its Standard/Enterprise exemption. The older conflicting CLI quota page is qualified, and API-key/Vertex billing stays separate from eligible extra AI credits. Earlier snapshots remain intact. Terms selection retains effective-date priority and chooses the last appended revision when both review and effective dates tie.
