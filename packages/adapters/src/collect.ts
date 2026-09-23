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
import { ensureSalt } from "./identity-node.js";
import { createModelMapper } from "./models.js";
import {
  type AdapterId,
  type AdapterWarning,
  type AnyAdapter,
  type AttributionIndex,
  type CollectOptions,
  type CollectResult,
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

/** One-line description of a failure, without a stack or a file path dump. */
function describeError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return "unknown error";
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
  const warnings: AdapterWarning[] = [];
  for (const adapter of adapters) {
    // One damaged or unreadable source must not end the whole collection: the
    // source is reported as failed and the rest of the machine is still read.
    let detection: Awaited<ReturnType<AnyAdapter["detect"]>>;
    try {
      detection = await adapter.detect(env);
    } catch (error) {
      detection = {
        adapterId: adapter.id,
        name: adapter.name,
        kind: adapter.kind,
        detected: false,
        supported: false,
        probes: [],
        note: "detection failed; this source was skipped",
      };
      warnings.push({
        code: "SOURCE_UNREADABLE",
        message: `${adapter.name} could not be inspected and was skipped: ${describeError(error)}`,
      });
    }
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
      let index: AttributionIndex;
      try {
        index = await adapter.collectAttribution(env, collectOptions);
      } catch (error) {
        // Attribution is an enhancement: a broken harness store must not stop
        // the usage scan it was going to enrich.
        attributionWarnings.push({
          code: "SOURCE_UNREADABLE",
          message: `${adapter.name} attribution could not be read and was skipped: ${describeError(error)}`,
        });
        continue;
      }
      attribution = index;
      attributionWarnings.push(...index.warnings);
      sessionsMapped += index.byProviderSession.size;
      rootsAdded += index.additionalRoots.length;
    }
  }

  // 2. Collect from every selected, detected, supported usage source.
  const allEvents: UsageEventV1[] = [];
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
    let result: CollectResult;
    try {
      result = await adapter.collect(env, {
        ...collectOptions,
        roots: isImport ? [] : roots,
        ...(attribution !== undefined ? { attribution } : {}),
      });
    } catch (error) {
      // A damaged source is reported and skipped, never fatal: one broken
      // SQLite file must not stop the other sources from being collected.
      warnings.push({
        code: "SOURCE_UNREADABLE",
        message: `${adapter.name} could not be read and was skipped: ${describeError(error)}`,
      });
      perAdapter[adapter.id] = emptyStats();
      continue;
    }
    allEvents.push(...result.events);
    warnings.push(...result.warnings);
    perAdapter[adapter.id] = result.stats;
  }

  // 3. Deduplicate and order.
  const deduped = dedupeEvents(allEvents);
  warnings.push(...deduped.warnings);
  warnings.push(...attributionWarnings);

  // 4. Report an import that cannot be deduplicated. A daily, monthly or block
  //    import row names no session, so session identity cannot recognise it as
  //    the same work a native scan already read (decision 24). Keeping it is
  //    right, but keeping it silently is how the same tokens get counted twice:
  //    the collection says so instead.
  const nativeAdapters = new Set(
    adapters.filter((adapter) => adapter.kind === "usage").map((adapter) => adapter.id as string),
  );
  const importAdapters = new Set(
    adapters.filter((adapter) => adapter.kind === "import").map((adapter) => adapter.id as string),
  );
  const nativeEvents = deduped.events.filter((event) =>
    nativeAdapters.has(event.source.adapterId),
  ).length;
  const sessionLessImportEvents = deduped.events.filter(
    (event) =>
      importAdapters.has(event.source.adapterId) && event.source.nativeSessionHash === undefined,
  );
  if (nativeEvents > 0 && sessionLessImportEvents.length > 0) {
    const adaptersInvolved = [
      ...new Set(sessionLessImportEvents.map((event) => event.source.adapterId)),
    ].sort();
    warnings.push({
      code: "DOUBLE_COUNT_RISK",
      message: `${sessionLessImportEvents.length} imported event(s) from ${adaptersInvolved.join(", ")} aggregate work without naming a session, and ${nativeEvents} native event(s) were collected in the same run: the imported rows cannot be matched against them, so their tokens are counted in addition`,
    });
  }

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

/**
 * A local filesystem location, recognised by its shape rather than by a list of
 * directory names.
 *
 * Enumerating roots (`/home`, `/Users`, `/var`, `/tmp`, `/mnt`, `/opt`,
 * `/private`) left every other absolute path — `/root`, `/data`, `/srv`,
 * `/etc`, any other mount point — and every relative path inside the artifact,
 * while the export's own redaction report claims it carries no file path at all.
 * The shapes a path can take are matched instead:
 *
 * - a `file://` URL,
 * - a Windows UNC share (`\\server\share\…`),
 * - a Windows drive path (`C:\Users\…`, `C:/Users/…`),
 * - a Unix absolute path (`/root/…`, `/data/…`, `/srv/…`, `/etc/…`),
 * - a relative path written from the current directory (`./store`, `../store`),
 * - a relative path that names a file (`src/adapters/collect.ts`).
 *
 * Ordinary prose that merely contains a slash (`read/write`, `24/7`,
 * `input/output tokens`, a URL) matches none of those and stays readable. A path
 * containing a space is redacted up to the space; warnings name store
 * directories, which do not.
 */
const LOCAL_PATH_PATTERN = new RegExp(
  [
    // file:// URL.
    String.raw`file:\/\/[^\s"']+`,
    // Windows UNC share.
    String.raw`\\\\[^\s\\/"']+\\[^\s"']*`,
    // Windows drive path, but not the tail of a URL scheme (`https://`).
    String.raw`(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s"']*`,
    // Unix absolute path with a directory component: /root/…, /data/…, /srv/….
    String.raw`(?<![:\w\/])\/(?:[^\s\/"']+\/)+[^\s\/"']*`,
    // Unix absolute path without one: /srv, /etc.
    String.raw`(?<![:\w\/])\/[^\s\/"']+`,
    // Relative path written from the current directory.
    String.raw`\.{1,2}[\\/][^\s"']*`,
    // Relative path naming a file, e.g. src/adapters/collect.ts.
    String.raw`(?<![\/\w:])(?:[^\s\/"'\\]+\/)+[^\s\/"'\\]*\.[A-Za-z][A-Za-z0-9]{0,7}`,
  ].join("|"),
  "gu",
);

/**
 * Replaces every path-like substring with a placeholder. Deterministic: the same
 * message always redacts to the same text, so two runs of the same collection
 * produce byte-identical exports.
 */
export function redactExportPaths(message: string): string {
  return message.replace(LOCAL_PATH_PATTERN, "<path>");
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
    // A detection note is a diagnostic too, and it is part of the artifact: the
    // import adapter names the file the user pointed at, which is a raw local
    // path. The same redaction applies, so the export carries none.
    detectedSources: result.detectedSources.map((source) =>
      source.note === undefined ? source : { ...source, note: redactExportPaths(source.note) },
    ),
    events: result.events,
    redactionReport: {
      promptsIncluded: false,
      responsesIncluded: false,
      sourceCodeIncluded: false,
      filePathsIncluded: false,
      repositoryNamesIncluded: false,
    },
    // A truncated or partially decoded history must be visible in the artifact,
    // not only on the terminal that produced it: dropping these was how a
    // damaged store exported as a clean-looking file (benchmark finding F020).
    ...(result.warnings.length === 0
      ? {}
      : {
          collectionWarnings: result.warnings.map((warning) => ({
            code: warning.code,
            message: redactExportPaths(warning.message),
          })),
        }),
  };
}
