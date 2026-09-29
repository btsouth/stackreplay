# Published subscription decision details

The public plan pages and Compare use reviewed provider terms alongside model access. These facts describe what a person buys. They do not establish deterministic Replay capacity, add API routes, or change the execution catalog.

`apps/web/lib/subscription-published-terms-data.json` covers all 29 non-OpenCode plans currently listed. OpenCode's two plans have their own data file. Records are checked on September 29, 2026, link every term to a first-party source, and expose compact allowance, billing, privacy, compatible-tool and after-limit summaries.

Useful distinctions retained:

- Command Code's Go, GOAT and Pro model allowances share a weighted plan pool. They are not separate balances to sum. All five plans expose model allowance tables, short windows, purchased-credit rollover and ZDR conditions. Go's September 28 transition preserves existing flat-credit subscriptions until renewal.
- Copilot base and variable flex credits are separate. Usage credits reset on the calendar month, independently of payment dates. Business and Enterprise pool credits and enable additional usage by default unless administrators disable it.
- Ollama's current dollar-credit plans have monthly anniversaries, explicit concurrency limits and purchased overflow. Older session/weekly limits apply until a subscriber migrates.
- ClinePass publishes three usage windows and model reference rates, but its public guide does not state a numeric allowance. Reference rates are not extra subscription charges.
- Cursor publishes two monthly pools and model rates, but the current individual-plan table does not state numeric pool sizes. No old dollar allowance is carried forward as current fact.
- Kiro publishes credits, model multipliers, add-on expiry, calendar billing and native-interface restrictions. A multiplier is not a fixed prompt or token quota.
- Claude's five-hour and weekly usage windows remain distinct from billing. Fable is included with a sublimit on Max and paid with credits on Pro. The proposed separate Agent SDK credit was paused, so it is not represented as an active benefit.
- ChatGPT's model message counts are provider estimates. Paid resets, purchased credits and API billing remain distinct. Pro 20x has a visible new-signup pause, while existing subscriptions continue renewing.
- Google Gemini, Flow and coding-tool allowances remain separate. Consumer privacy controls are distinguished from enterprise guarantees.

Tables preserve provider-specific units and missing categories. A missing rate is never converted to zero. Public pricing tables here explain subscription consumption; they are not another workload calculator.

Unresolved facts are named narrowly: exact ClinePass quota amounts and upstream retention guarantees, current numeric Cursor pool sizes, and unpublished account-specific usage limits. Command Code's Go page and migration prose say 3/6 credits for five-hour/weekly windows, while its general usage table and FAQ still say 2/5; the page preserves this conflict and points to the account meter. The pages no longer describe a fact as unpublished merely because it has not been admitted to Replay.
