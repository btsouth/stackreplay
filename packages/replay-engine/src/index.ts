/**
 * @stackreplay/replay-engine
 *
 * Pure deterministic replay simulation. This is the heart of StackReplay.
 *
 * Guarantees (spec point 4, docs/ARCHITECTURE_DECISIONS.md):
 * - No dependency on Next.js, React, PostgreSQL, Vercel, Stripe,
 *   authentication, browser APIs or filesystem APIs.
 * - Given the same usage events, execution target, catalog version, explicit
 *   rules context and simulation options, replay always returns the same
 *   result. The engine never reads a clock.
 * - The same package runs in the Node CLI, the browser Web Worker, the server
 *   and tests.
 * - Money is computed with decimal-safe arithmetic and serialized as decimal
 *   strings; never JavaScript floating point.
 *
 * Milestone 1 implements subscription targets end to end over the generalized
 * ExecutionReplayResult. API, local and hybrid targets are schema-only.
 */
export { type ReplayInput, type ReplayOptions, replay } from "./engine.js";
export { ReplayEngineError } from "./errors.js";
export { Decimal, ONE, parseAmount, toUnitString, ZERO } from "./money.js";
export { instantToIso, parseInstant, Temporal } from "./time.js";
export {
  type DisjointBuckets,
  hasAnyReportedTokens,
  reportedTokenCount,
  type TokenAccounting,
  tokenAccountingOf,
} from "./units.js";
export { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "./version.js";
