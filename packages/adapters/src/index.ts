/**
 * @stackreplay/adapters
 *
 * Local source adapters and the collection pipeline (spec points 13, 14, 16,
 * 17, 18). Adapters read agent histories that already exist on the machine and
 * normalize them into canonical usage events; the pipeline detects sources,
 * collects, attributes harnesses, deduplicates and orders.
 *
 * Guarantees:
 * - No network access, ever. Sources are local files and local databases.
 * - No source file is modified: database connections are read-only.
 * - Unknown data stays unknown. A category a source does not report is never
 *   invented as zero (docs/ADAPTERS.md records the per-source reasoning).
 * - Project paths, session ids and event identities leave the machine only as
 *   salted hashes; prompts, responses, file contents and repository names are
 *   never read.
 * - Identical inputs produce identical events, so rescans are idempotent.
 */

export { ccusageRows, createCcusageAdapter } from "./adapters/ccusage.js";
export { claudeCodeRoots, createClaudeCodeAdapter } from "./adapters/claude-code.js";
export { codexRoots, createCodexAdapter } from "./adapters/codex.js";
export { commandCodeRoots, createCommandCodeAdapter } from "./adapters/command-code.js";
export { createHermesAdapter, hermesRoots } from "./adapters/hermes.js";
export { createOpenCodeAdapter, openCodeRoots } from "./adapters/opencode.js";
export { createT3CodeAdapter, t3CodeRoots } from "./adapters/t3-code.js";
export {
  type CollectRunOptions,
  type CollectRunResult,
  collectUsage,
  createExport,
  defaultAdapters,
} from "./collect.js";
export { type DedupResult, dedupeEvents } from "./dedup.js";
export {
  buildEvent,
  type EventContext,
  type EventDraft,
  eventContext,
  HARNESS_IDS,
  providerIdForModel,
} from "./event-builder.js";
export {
  baseName,
  dirName,
  effectiveMaxFileBytes,
  effectiveMaxFiles,
  filePredatesWindow,
  inWindow,
  listFilesRecursive,
} from "./files.js";
export {
  canonicalEventId,
  decimalStringFromNumber,
  ensureSalt,
  epochMsFromIso,
  generateSalt,
  isoUtcFromMs,
  nativeEventHash,
  nativeSessionHash,
  normalizeProjectKey,
  projectHash,
  readSalt,
  saltFilePath,
} from "./identity.js";
export { createModelMapper, type ModelMapper } from "./models.js";
export {
  asArray,
  asRecord,
  isRealCalendarDate,
  parseJsonLine,
  readCount,
  readNumber,
  readString,
} from "./parse.js";
export {
  configHome,
  createNodeFileSystem,
  dataHome,
  joinPath,
  stackReplayStateDir,
  toPlatformId,
} from "./platform.js";
export { openReadOnly, toFiniteNumber, toSafeCount, toText } from "./sqlite.js";
export {
  type AdapterId,
  type AdapterKind,
  type AdapterWarning,
  type AnyAdapter,
  type AttributionAdapter,
  type AttributionIndex,
  attributionKey,
  type CollectOptions,
  type CollectResult,
  type CollectStats,
  type DetectionResult,
  emptyStats,
  type FileSystem,
  type HarnessAttribution,
  isAttributionAdapter,
  isUsageAdapter,
  type LocalSourceAdapter,
  type PathProbe,
  type PlatformId,
  type SourceEnvironment,
  type WarningCode,
} from "./types.js";
export { WarningCollector } from "./warnings.js";
