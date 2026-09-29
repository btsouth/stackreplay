# Public market discovery

The public site now connects subscriptions, model economics and recent changes
to local workload analysis. The existing replay, billing and capacity calculations
are unchanged.

## Experience

- Models compare input, output and cache-read prices separately. Select up to four
  releases, filter by developer, search exact aliases, or order by price. Detail
  pages show model access, conditional prices and sources.
- Subscriptions show monthly list prices, supported tools, included usage and
  model access. Tool/provider filters and preselected comparison links reduce
  catalog browsing. Initial lists show twelve entries; search covers the full catalog.
- Updates distinguish provider announcements from StackReplay catalog additions.
  The homepage links directly into these discovery paths.
- Desktop uses full-width rows, fine rules and restrained price bars. Mobile
  preserves the same information order without horizontal tables.

## Bounded catalog additions, checked September 28, 2026

Commercial listings: ClinePass, OpenCode Go/Go Plus, Ollama Cloud Max and
Command Code Go/Pro/Max 10x/Max 20x. Existing accepted GOAT, Ollama Pro and Kiro Pro
records now appear in the public read model. These listings preserve published
prices and evidenced model access without adding executable capacity.

Sources: [ClinePass](https://docs.cline.bot/getting-started/clinepass),
[OpenCode Go](https://opencode.ai/v2/docs/console/go),
[Ollama](https://ollama.com/pricing),
[Command Code](https://commandcode.ai/docs/resources/pricing-limits), and
[Kiro](https://kiro.dev/pricing/). Credits remain provider-specific. Model access
lists are sourced subsets, not claims to represent every offered model. OpenCode
external-tool compatibility depends on the versions and session-header conditions
in its documentation. Older Ollama subscription cohorts can have different terms.

Sonnet 5.5 is admitted from Anthropic's model documentation and pricing table:
USD 2 input, 10 output, 0.20 cache reads, 2.50 five-minute cache writes and 4
one-hour cache writes per million tokens. The exact `claude-sonnet-5-5` Messages
route is priced using the existing two cache-duration scenarios. Inclusive
reasoning remains part of output; standard rates apply across the 1M context.
An initial announcement-only listing was corrected after verifying the detailed
first-party pages. No benchmark ranking or subscription capacity is inferred.

New commercial record dates are catalog admission dates, not reconstructed launch
dates. Existing execution records retain their current-market validity boundary.
The public API-rate view reads accepted catalog pricing and keeps variants,
category aliases and context tiers explicit. The market snapshot now includes the Sonnet 5.5 route at its September 28
catalog activation. Existing route economics are unchanged.

## Boundaries

This release adds no watcher, telemetry, backend store or pricing engine. Public
plan discovery does not automatically add a newly listed commercial offer to local
Current Stack or make it replayable. Imported histories and personal billing facts
are not required or published. Manual catalog review remains the admission gate.
