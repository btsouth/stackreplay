import type { CatalogV1 } from "@stackreplay/catalog";
import type { DetectedSourceV1, StackReplayExportV1, UsageEventV1 } from "@stackreplay/schema";
import { createCcusageAdapter } from "./adapters/ccusage.js";
import { createClaudeCodeAdapter } from "./adapters/claude-code.js";
import { createCodexAdapter } from "./adapters/codex.js";
import { createCommandCodeAdapter } from "./adapters/command-code.js";
import { createHermesAdapter } from "./adapters/hermes.js";
import { createOpenCodeAdapter } from "./adapters/opencode.js";
import { createT3CodeAdapter } from "./adapters/t3-code.js";
import { dedupeEvents } from "./dedup.js";
import { ensureSalt } from "./identity.js";
import { createModelMapper } from "./models.js";
import {
  type AdapterId,
  type AdapterWarning,
  type AnyAdapter,
  type AttributionIndex,
  type CollectOptions,
  type CollectStats,
  emptyStats,
  isAttributionAdapter,
  type SourceEnvironment,
} from "./types.js";

/**
 * The collection pipeline (spec points 13, 14, 16, 18).
 *
 * detect -> collect -> attribute -> deduplicate -> order.
 *
 * Nothing here reads the wall clock or the network: the caller supplies the
 * environment, the catalog, the window and the clock. The result is
 * deterministic for identical inputs, which is what makes rescans idempotent.
 */

export interface CollectRunOptions {
  env: SourceEnvironment;
  catalog: CatalogV1;
  /** Inclusive lower bound, ISO-8601 UTC. */
  since?: string;
  /** Exclusive upper bound, ISO-8601 UTC. */
  until?: string;
  /** Restrict collection to these adapters (detection still reports all). */
  sources?: AdapterId[];
  /** Explicit import file for the ccusage adapter. */
  inputFile?: string;
  /** Overrides the local salt (tests only). */
  salt?: string;
  /** Injected clock. */
  now?: Date;
  /** Skip harness attribution (tests only). */
  skipAttribution?: boolean;
  maxFiles?: number;
  maxFileBytes?: number;
}

export interface CollectRunResult {
  detectedSources: DetectedSourceV1[];
  events: UsageEventV1[];
  warnings: AdapterWarning[];
  stats: {
    perAdapter: Partial<Record<AdapterId, CollectStats>>;
    totalEvents: number;
    exactDuplicates: number;
    overlaps: number;
  };
  attribution: {
    enabled: boolean;
    sessionsMapped: number;
    rootsAdded: number;
    warnings: AdapterWarning[];
  };
}

export function defaultAdapters(): AnyAdapter[] {
  return [
    createCommandCodeAdapter(),
    createOpenCodeAdapter(),
    createCodexAdapter(),
    createClaudeCodeAdapter(),
    createHermesAdapter(),
    createT3CodeAdapter(),
    createCcusageAdapter(),
  ];
}

function detectionToSource(
  adapter: AnyAdapter,
  detection: Awaited<ReturnType<AnyAdapter["detect"]>>,
): DetectedSourceV1 {
  const sessionCount = detection.probes
    .map((probe) => probe.sessionCount)
    .filter((value): value is number => value !== undefined)
    .reduce((total, value) => total + value, 0);
  const source: DetectedSourceV1 = {
    adapterId: adapter.id,
    name: adapter.name,
    detected: detection.detected,
    supported: detection.supported,
    role: adapter.kind,
  };
  if (sessionCount > 0) source.sessionCount = sessionCount;
  if (detection.note !== undefined) source.note = detection.note;
  return source;
}

export async function collectUsage(options: CollectRunOptions): Promise<CollectRunResult> {
  const adapters = defaultAdapters();
  const salt = options.salt ?? (await ensureSalt(options.env));
  const mapper = createModelMapper(options.catalog);
  const now = options.now ?? new Date();
  const env: SourceEnvironment = {
    ...options.env,
    ...(options.inputFile !== undefined ? { inputFile: options.inputFile } : {}),
  };

  const detectedSources: DetectedSourceV1[] = [];
  const detections = new Map<AdapterId, Awaited<ReturnType<AnyAdapter["detect"]>>>();
  for (const adapter of adapters) {
    const detection = await adapter.detect(env);
    detections.set(adapter.id, detection);
    detectedSources.push(detectionToSource(adapter, detection));
  }

  const selected = (adapter: AnyAdapter): boolean =>
    options.sources === undefined || options.sources.includes(adapter.id);

  const collectOptions: CollectOptions = {
    ...(options.since !== undefined ? { since: options.since } : {}),
    ...(options.until !== undefined ? { until: options.until } : {}),
    now,
    salt,
    mapper,
    ...(options.inputFile !== undefined ? { inputFile: options.inputFile } : {}),
    ...(options.maxFiles !== undefined ? { maxFiles: options.maxFiles } : {}),
    ...(options.maxFileBytes !== undefined ? { maxFileBytes: options.maxFileBytes } : {}),
  };

  // 1. Attribution first: it both maps provider sessions to a harness and can
  //    reveal provider histories that only exist inside the harness.
  let attribution: AttributionIndex | undefined;
  const attributionWarnings: AdapterWarning[] = [];
  let sessionsMapped = 0;
  let rootsAdded = 0;
  if (options.skipAttribution !== true) {
    for (const adapter of adapters) {
      if (!isAttributionAdapter(adapter)) continue;
      if (!selected(adapter)) continue;
      const detection = detections.get(adapter.id);
      if (detection === undefined || !detection.detected || !detection.supported) continue;
      const index = await adapter.collectAttribution(env, collectOptions);
      attribution = index;
      attributionWarnings.push(...index.warnings);
      sessionsMapped += index.byProviderSession.size;
      rootsAdded += index.additionalRoots.length;
    }
  }

  // 2. Collect from every selected, detected, supported usage source.
  const allEvents: UsageEventV1[] = [];
  const warnings: AdapterWarning[] = [];
  const perAdapter: Partial<Record<AdapterId, CollectStats>> = {};
  for (const adapter of adapters) {
    if (isAttributionAdapter(adapter)) continue;
    if (!selected(adapter)) continue;
    const detection = detections.get(adapter.id);
    if (detection === undefined) continue;
    const isImport = adapter.kind === "import";
    if (isImport && options.inputFile === undefined) continue;
    if (!detection.detected || !detection.supported) {
      perAdapter[adapter.id] = emptyStats();
      continue;
    }
    const extraRoots = (attribution?.additionalRoots ?? [])
      .filter((entry) => entry.adapterId === adapter.id)
      .map((entry) => entry.path);
    const defaultRoots = adapter.defaultRoots(env);
    const roots = extraRoots.length === 0 ? defaultRoots : [...defaultRoots, ...extraRoots];
    const result = await adapter.collect(env, {
      ...collectOptions,
      roots: isImport ? [] : roots,
      ...(attribution !== undefined ? { attribution } : {}),
    });
    allEvents.push(...result.events);
    warnings.push(...result.warnings);
    perAdapter[adapter.id] = result.stats;
  }

  // 3. Deduplicate and order.
  const deduped = dedupeEvents(allEvents);
  warnings.push(...deduped.warnings);
  warnings.push(...attributionWarnings);

  return {
    detectedSources,
    events: deduped.events,
    warnings,
    stats: {
      perAdapter,
      totalEvents: deduped.events.length,
      exactDuplicates: deduped.exactDuplicates,
      overlaps: deduped.overlaps,
    },
    attribution: {
      enabled: options.skipAttribution !== true,
      sessionsMapped,
      rootsAdded,
      warnings: attributionWarnings,
    },
  };
}

/** Builds the versioned, sanitized export (spec point 10). */
export function createExport(
  result: CollectRunResult,
  options: { range: { from: string; to: string }; collectorVersion: string; generatedAt: string },
): StackReplayExportV1 {
  return {
    format: "stackreplay",
    version: 1,
    generatedAt: options.generatedAt,
    collectorVersion: options.collectorVersion,
    range: options.range,
    detectedSources: result.detectedSources,
    events: result.events,
    redactionReport: {
      promptsIncluded: false,
      responsesIncluded: false,
      sourceCodeIncluded: false,
      filePathsIncluded: false,
      repositoryNamesIncluded: false,
    },
  };
}
