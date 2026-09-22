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

export {
  type BacktestAmountV1,
  type BacktestCaseInputV1,
  type BacktestComparisonV1,
  type BacktestExpectationV1,
  compareToExpectation,
  crossingsExpectation,
  crossingsOf,
  dispositionsExpectation,
  dispositionsOf,
  evaluateBacktestCase,
  type ListPriceEventV1,
  type ListPriceReconstructionV1,
  type MeterObservationV1,
  modeExpectation,
  modeOf,
  observationDelta,
  reconstructListPrice,
  resolutionExpectation,
} from "./backtest.js";
export { type ReplayInput, type ReplayOptions, replay } from "./engine.js";
export { ReplayEngineError } from "./errors.js";
export { Decimal, ONE, parseAmount, toUnitString, ZERO } from "./money.js";
export {
  deriveOverageMode,
  deriveResetAssumption,
  hasMixedWindowKinds,
  hasNumericLimits,
  type ReplayDispositionKindV1,
  SemanticsAccumulator,
  workloadScopeStatement,
} from "./semantics.js";
export { instantToIso, parseInstant, Temporal } from "./time.js";
export {
  prepareTranslation,
  substituteFor,
  TranslationApplication,
  type TranslationPlan,
} from "./translation.js";
export {
  type DisjointBuckets,
  hasAnyReportedTokens,
  type MoneyConversionOutcome,
  moneyUnitsForUsage,
  type PricingCategory,
  type PricingSelectionContext,
  type RateSetSelection,
  reportedTokenCount,
  selectRateSet,
  type TokenAccounting,
  tokenAccountingOf,
} from "./units.js";
export { ENGINE_VERSION, REPLAY_METHODOLOGY_VERSION } from "./version.js";
