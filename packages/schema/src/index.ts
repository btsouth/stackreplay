/**
 * @stackreplay/schema
 *
 * Versioned StackReplay schemas and shared TypeScript types.
 *
 * Milestone 0: scaffolding only. No product logic lives here yet.
 *
 * Milestone 1 adds, per the specification and docs/ARCHITECTURE_DECISIONS.md:
 * - UsageEventV1 and StackReplayExportV1
 * - ExecutionReplayResultV1: the generalized replay result with the
 *   ExecutionTarget discriminated union (subscription | api | local | hybrid),
 *   target-specific detail nested beneath it
 * - catalog schemas: provider, model, plan, pricing
 *
 * Nothing in this package may depend on React, the web application, or Node.js
 * runtime APIs; the schemas must run in the CLI, the browser and tests alike.
 */
export {};
