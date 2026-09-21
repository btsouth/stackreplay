/**
 * @stackreplay/replay-engine
 *
 * Pure deterministic replay simulation. This is the heart of StackReplay.
 *
 * Milestone 0: scaffolding only. No simulation logic lives here yet.
 *
 * Constraints that hold from Milestone 1 onward (spec point 4 and
 * docs/ARCHITECTURE_DECISIONS.md):
 * - No dependency on Next.js, React, PostgreSQL, Vercel, Stripe,
 *   authentication, browser APIs or filesystem APIs.
 * - Given the same usage events, execution target, catalog version and
 *   simulation options, replay always returns the same result.
 * - The same package runs in the Node CLI, the browser Web Worker, the server
 *   and tests.
 * - Money is computed with decimal-safe arithmetic and serialized as decimal
 *   strings; never JavaScript floating point.
 *
 * Milestone 1 adds the replay function over the generalized
 * ExecutionReplayResult, with subscription execution working end to end.
 */
export {};
