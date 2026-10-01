/// <reference lib="webworker" />

import {
  type BrowserCandidate,
  BrowserIntakeBudget,
  BrowserIntakeBudgetError,
  BrowserIntakeCancelledError,
  type CandidateOutcome,
  expandZipCandidate,
  intakeBrowserCandidates,
  safeCandidateName,
  safeIntakeMessage,
  unavailableCandidate,
} from "@stackreplay/adapters/browser";
import {
  BUNDLED_CATALOG_VERSION,
  bundledModelIdentity,
  loadBundledCatalog,
} from "@stackreplay/catalog/bundled";
import { DECISION_MARKET } from "@stackreplay/catalog/market";
import {
  analyzeMarketCoverage,
  type CompiledOptimizationInput,
  marketDecisionInputs,
  parseInstant,
  toTimedEvents,
} from "@stackreplay/replay-engine";
import type { StackReplayExportV1 } from "@stackreplay/schema";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { accountKeyOf, recordsCapacity } from "../lib/accounts";
import { type ActivityPoint, activityPoint, composeCapacityBurden } from "../lib/capacity-episodes";
import * as storage from "../lib/idb";
import {
  importSizeAdvice,
  validateExportText,
  validateExportValue,
} from "../lib/import-validation";
import type { MarketDecision } from "../lib/market-decision";
import { summarizeCapacity } from "../lib/observed-capacity";
import { OptimizerCancelledError, OptimizerRuntime } from "../lib/optimizer-runtime";
import { recordedEventsInPeriod, reviewWorkload } from "../lib/review-workload";
import { runScopedReplay } from "../lib/scoped-replay";
import { buildTimeline } from "../lib/timeline";
import {
  type ImportRecord,
  isSafeErrorCode,
  type SafeError,
  type ScanProgress,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from "../lib/worker-protocol";
import { buildWorkloadProfile, inspectWindow } from "../lib/workload-profile";
import { cachedWorkloadResult } from "../lib/workload-result-cache";
import { selectSources } from "../lib/workload-scope";
import { summarizeExport } from "../lib/workload-summary";

/**
 * The replay Worker (M3 brief).
 *
 * Everything expensive happens here: reading and parsing the imported file,
 * validating it, preparing the workload summary, persisting it, and running the
 * deterministic replay engine. The main thread receives summaries, progress
 * and results only, so a ~100 MB import never blocks the interface and the
 * event array is never cloned to the UI thread.
 *
 * The engine is imported unchanged: same package, same determinism, no DOM, no
 * filesystem, no network.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;
const sessionWorkloads = new Map<string, { record: ImportRecord; exported: StackReplayExportV1 }>();
const optimizer = new OptimizerRuntime();
const marketOptimizer = new OptimizerRuntime<CompiledOptimizationInput>();
let optimizerGeneration = 0;
function cancelOptimizer(): void {
  optimizerGeneration = 0;
  optimizer.cancel();
  marketOptimizer.cancel();
}
async function handleCapacityEpisodes(
  request: Extract<WorkerRequest, { type: "CAPACITY_EPISODES" }>,
): Promise<void> {
  const loaded = await loadWorkloadEvents(request.importId);
  if (!loaded.ok) {
    post({ type: "ERROR", requestId: request.requestId, error: loaded.error });
    return;
  }
  const scoped = {
    events: recordedEventsInPeriod(
      loaded.exported.events,
      request.period,
      request.resourceInstanceId,
    ),
  };
  const source = scoped.events[0]?.source.adapterId ?? "unknown";
  const context: ActivityPoint[] = [];
  const unavailable: string[] = [];
  const warnings = new Set<string>();
  let excluded = 0;
  const from = Date.parse(`${request.period.start}T00:00:00Z`),
    to = Date.parse(`${request.period.end}T00:00:00Z`);
  const points = (exported: StackReplayExportV1, external: boolean) => {
    for (const warning of exported.collectionWarnings ?? [])
      if (
        [
          "RECORD_MALFORMED",
          "USAGE_MISSING",
          "SOURCE_TRUNCATED",
          "SOURCE_UNREADABLE",
          "TIMESTAMP_INVALID",
        ].includes(warning.code)
      )
        warnings.add(warning.code);
    for (const event of exported.events) {
      if (Date.parse(event.occurredAt) < from || Date.parse(event.occurredAt) >= to) continue;
      // A separate copy of this source cannot establish another local account.
      if (external && event.source.adapterId === source) continue;
      if (!external && event.source.resourceInstanceId === request.resourceInstanceId) continue;
      const point = activityPoint(event);
      if (point) context.push(point);
      else excluded++;
    }
  };
  points(loaded.exported, false);
  for (const id of [...new Set(request.contextImportIds)]
    .filter((id) => id !== request.importId)
    .slice(0, 10)) {
    const session = sessionWorkloads.get(id)?.exported;
    const saved = session ? { ok: true as const, value: session } : await storage.loadImport(id);
    if (saved.ok) points(saved.value, true);
    else unavailable.push(id);
  }
  const mainActivity = scoped.events.flatMap((e) => {
    const point = activityPoint(e);
    return point ? [point] : [];
  });
  const burden = composeCapacityBurden({
    capacity: summarizeCapacity(
      loaded.exported.capacityObservations,
      scoped.events,
      request.period,
      request.resourceInstanceId,
      new Map((loaded.record?.localProjects ?? []).map((p) => [p.hash, p.label])),
    ),
    mainActivity,
    contextActivity: context,
    resourceInstanceId: request.resourceInstanceId,
    planId: request.planId,
    period: request.period,
    mainSource: source,
    excludedActivityRecords: excluded,
    contextUnavailable: unavailable,
    contextWarnings: [...warnings],
  });
  post({ type: "CAPACITY_EPISODES_OK", requestId: request.requestId, burden });
}

async function handleMarket(
  request: Extract<WorkerRequest, { type: "API_MARKET" }>,
): Promise<void> {
  cancelOptimizer();
  optimizerGeneration = request.requestId;
  const current = () => optimizerGeneration === request.requestId;
  try {
    const loaded = await loadWorkloadEvents(request.importId, current);
    if (!loaded.ok) throw new Error("Workload unavailable");
    if (!current()) throw new OptimizerCancelledError();
    const compute = async (): Promise<MarketDecision> => {
      const sources = request.sources?.length ? new Set(request.sources) : undefined;
      const accountScope = request.accounts?.length ? new Set(request.accounts) : undefined;
      const sourceEvents =
        sources || accountScope
          ? loaded.exported.events.filter(
              (event) =>
                (!sources || sources.has(event.source.adapterId)) &&
                (!accountScope || accountScope.has(accountKeyOf(event.source))),
            )
          : loaded.exported.events;
      // Capacity evidence belongs to the local accounts in scope, and only to
      // accounts whose history records limit events at all: an account of a tool
      // that never records them (Codex) has "not recorded", never "none".
      const accountTools = new Map<string, string>();
      for (const event of sourceEvents)
        accountTools.set(accountKeyOf(event.source), event.source.adapterId);
      const scopedAccounts = accountScope
        ? [...accountScope]
        : sources
          ? sourceEvents.flatMap((event) => event.source.resourceInstanceId ?? [])
          : undefined;
      const sourceAccounts = scopedAccounts
        ? new Set(scopedAccounts.filter((key) => recordsCapacity(key, accountTools.get(key))))
        : undefined;
      const observations =
        loaded.exported.capacityObservations && sourceAccounts
          ? sourceAccounts.size > 0
            ? {
                ...loaded.exported.capacityObservations,
                events: loaded.exported.capacityObservations.events.filter((event) =>
                  sourceAccounts.has(event.resourceInstanceId),
                ),
              }
            : undefined
          : loaded.exported.capacityObservations;
      const scoped = reviewWorkload(sourceEvents, request.period, request.resourceInstanceId);
      const gapCodes = new Set([
        "SOURCE_UNREADABLE",
        "SOURCE_TRUNCATED",
        "RECORD_MALFORMED",
        "TIMESTAMP_INVALID",
        "USAGE_MISSING",
        "ACCOUNTING_UNESTABLISHED",
      ]);
      const scanGapCodes = [
        ...new Set(
          (loaded.exported.collectionWarnings ?? [])
            .filter((w) => gapCodes.has(w.code))
            .map((w) => w.code),
        ),
      ];
      if (scanGapCodes.length) scoped.history.scanGapCodes = scanGapCodes;
      const inputs = marketDecisionInputs(loadBundledCatalog(), DECISION_MARKET, scoped.events);
      const decision: MarketDecision = {
        snapshot: {
          rulesAt: DECISION_MARKET.rulesAt,
          catalogHash: DECISION_MARKET.catalogHash,
          decisionSnapshotHash: DECISION_MARKET.decisionSnapshotHash,
        },
        scenarios: [],
        history: scoped.history,
        capacity: summarizeCapacity(
          observations,
          scoped.events,
          request.period,
          request.resourceInstanceId,
        ),
      };
      const capacityEvents = (observations?.events ?? []).filter((event) => {
        const day = event.timestamp.slice(0, 10);
        return (
          (!request.resourceInstanceId ||
            event.resourceInstanceId === request.resourceInstanceId) &&
          (request.period
            ? day >= request.period.start && day < request.period.end
            : !!scoped.history.firstDate &&
              !!scoped.history.lastDate &&
              day >= scoped.history.firstDate &&
              day <= scoped.history.lastDate)
        );
      });
      const blocked = capacityEvents.filter((event) => event.eventType === "hard_limit_reached");
      if (observations)
        decision.capacitySignal = {
          blockedAttempts: blocked.length,
          warnings: capacityEvents.filter((event) => event.eventType === "usage_warning").length,
          days: new Set(blocked.map((event) => event.timestamp.slice(0, 10))).size,
          accounts: new Set(blocked.map((event) => event.resourceInstanceId)).size,
          resourceInstanceIds: [...new Set(blocked.map((event) => event.resourceInstanceId))],
        };
      const analysis = analyzeMarketCoverage(inputs);
      decision.coverage = analysis.coverage;
      for (const [i, input] of inputs.entries()) {
        if (!current()) throw new OptimizerCancelledError();
        const summary = await marketOptimizer.run(async () => input, {
          operation: "api-repricing",
          onPhase: (phase) => {
            if (current()) post({ type: "OPTIMIZER_PHASE", requestId: request.requestId, phase });
          },
        });
        if (!current()) throw new OptimizerCancelledError();
        decision.scenarios.push({ id: DECISION_MARKET.scenarios[i]?.id ?? "unknown", summary });
        marketOptimizer.cancel(); // Keep only durable aggregate receipts between interpretations.
      }
      if (analysis.coverage.priced > 0 && analysis.coverage.priced < analysis.coverage.recorded) {
        const subset = marketDecisionInputs(
          loadBundledCatalog(),
          DECISION_MARKET,
          analysis.pricedEvents,
        );
        decision.pricedScope = { scenarios: [] };
        for (const [i, input] of subset.entries()) {
          if (!current()) throw new OptimizerCancelledError();
          const summary = await marketOptimizer.run(async () => input, {
            operation: "api-repricing",
          });
          if (!current()) throw new OptimizerCancelledError();
          decision.pricedScope.scenarios.push({
            id: DECISION_MARKET.scenarios[i]?.id ?? "unknown",
            summary,
          });
          marketOptimizer.cancel();
        }
      }
      return decision;
    };
    const decision = await cachedWorkloadResult(
      loaded.exported,
      loaded.record,
      "api-market",
      [
        DECISION_MARKET.decisionSnapshotHash,
        request.period,
        request.resourceInstanceId,
        request.sources,
        request.accounts,
      ],
      compute,
      current,
    );
    if (current()) post({ type: "API_MARKET_OK", requestId: request.requestId, decision });
    else post({ type: "CANCELLED", requestId: request.requestId });
  } catch (error) {
    if (!current() || error instanceof OptimizerCancelledError)
      post({ type: "CANCELLED", requestId: request.requestId });
    else
      post({
        type: "ERROR",
        requestId: request.requestId,
        error: {
          code: "REPLAY_FAILED",
          title: "The market calculation could not complete.",
          message:
            "Keep the workload and retry. Unsupported scope or missing pricing remains unknown.",
        },
      });
  } finally {
    if (current()) marketOptimizer.cancel();
  }
}
async function handleOptimize(
  request: Extract<WorkerRequest, { type: "OPTIMIZE" }>,
): Promise<void> {
  cancelOptimizer();
  optimizerGeneration = request.requestId;
  try {
    const summary = await optimizer.run(
      async () => {
        const loaded = await loadWorkloadEvents(
          request.importId,
          () => optimizerGeneration === request.requestId,
        );
        if (!loaded.ok) throw new Error("Workload unavailable");
        const start = parseInstant(request.configuration.period.start).epochNanoseconds;
        const end = parseInstant(request.configuration.period.end).epochNanoseconds;
        const events = toTimedEvents(selectSources(loaded.exported.events, request.sources))
          .filter((t) => {
            const at = BigInt(t.atMs) * 1000000n + BigInt(t.subMs);
            return at >= start && at < end;
          })
          .map((t) => t.event);
        return { ...request.configuration, events, catalog: loadBundledCatalog() };
      },
      {
        onPhase: (phase) => post({ type: "OPTIMIZER_PHASE", requestId: request.requestId, phase }),
      },
    );
    if (optimizerGeneration === request.requestId)
      post({ type: "OPTIMIZER_OK", requestId: request.requestId, summary });
  } catch (error) {
    if (error instanceof OptimizerCancelledError)
      post({ type: "CANCELLED", requestId: request.requestId });
    else
      post({
        type: "ERROR",
        requestId: request.requestId,
        error: {
          code: "REPLAY_FAILED",
          title: "Optimization did not complete.",
          message:
            "The supplied workload or execution options could not be evaluated within this browser's runtime budget.",
        },
      });
  }
}
let currentImportRequestId = 0;
let currentImportController: AbortController | undefined;

function beginImport(
  requestId: number,
  supersessionMessage = "A newer import selection replaced it.",
): AbortSignal {
  if (currentImportController !== undefined && !currentImportController.signal.aborted) {
    post({
      type: "ERROR",
      requestId: currentImportRequestId,
      error: {
        code: "IMPORT_CANCELLED",
        title: "This import was superseded.",
        message: supersessionMessage,
      },
    });
  }
  currentImportController?.abort();
  currentImportRequestId = requestId;
  currentImportController = new AbortController();
  return currentImportController.signal;
}

function invalidateCurrentImport(requestId: number, supersessionMessage?: string): void {
  beginImport(requestId, supersessionMessage);
  currentImportController?.abort();
}

function importIsCurrent(requestId: number, signal: AbortSignal): boolean {
  return currentImportRequestId === requestId && !signal.aborted;
}

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function progress(
  requestId: number,
  operation: "import" | "replay",
  phase: "reading" | "validating" | "preparing" | "loading" | "replaying",
  detail?: string,
  scan?: ScanProgress,
): void {
  post({
    type: "PROGRESS",
    requestId,
    operation,
    phase,
    ...(detail !== undefined ? { detail } : {}),
    ...(scan !== undefined ? { scan } : {}),
  });
}

/** The scan instrument's reading of the intake's running totals. */
function scanProgressOf(
  done: number,
  total: number,
  metrics: {
    identifiedSessions: number;
    reconstructedEvents: number;
    skippedFiles: number;
    examinedBytes: number;
    modelEvents: Record<string, number>;
    projectCount: number;
    topProjects: { label: string; events: number }[];
    groups?: { group: string; done: number; total: number; events: number }[];
  },
): ScanProgress {
  const catalog = loadBundledCatalog();
  return {
    ...(metrics.groups === undefined
      ? {}
      : {
          histories: metrics.groups.map((entry) => ({
            id: entry.group,
            filesDone: entry.done,
            filesTotal: entry.total,
            events: entry.events,
          })),
        }),
    filesDone: done,
    filesTotal: total,
    sessions: metrics.identifiedSessions,
    events: metrics.reconstructedEvents,
    skipped: metrics.skippedFiles,
    examinedBytes: metrics.examinedBytes,
    projects: metrics.projectCount,
    models: Object.entries(metrics.modelEvents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, events]) => ({ name: catalog.models[id]?.name ?? id, events })),
    topProjects: metrics.topProjects,
  };
}

/**
 * Turns anything thrown into a display-safe error.
 *
 * A thrown object used to be forwarded across the boundary as soon as it had a
 * `code` property, which is not a type: the engine's own errors carry internal
 * codes and identifiers, and an arbitrary thrown value could carry anything at
 * all into the interface. A value is now rebuilt field by field, only for a code
 * this boundary declares, with every string bounded and sanitized (benchmark
 * finding F029).
 */
function toSafeError(error: unknown): SafeError {
  if (error instanceof BrowserIntakeBudgetError) {
    const isSizeLimit =
      error.bound === "selectedBytes" ||
      error.bound === "readBytes" ||
      error.bound === "expandedBytes";
    return {
      code: "INTAKE_BUDGET_EXCEEDED",
      title: isSizeLimit
        ? "This folder is too large to scan at once."
        : "Too many files to scan at once.",
      message: isSizeLimit
        ? `The browser limit for this selection is ${error.limit >= 1024 * 1024 * 1024 ? `${error.limit / (1024 * 1024 * 1024)} GB` : `${error.limit / (1024 * 1024)} MB`}.`
        : "The selected history contains more files than this browser scan can process at once.",
      hint: "Choose a smaller date folder or select a smaller batch of files. Codex sessions are organized by year and month.",
    };
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as Partial<SafeError>;
    if (isSafeErrorCode(candidate.code) && typeof candidate.message === "string") {
      return {
        code: candidate.code,
        title:
          typeof candidate.title === "string"
            ? sanitizeMessage(candidate.title)
            : "Something went wrong while processing the file.",
        message: sanitizeMessage(candidate.message),
        ...(typeof candidate.hint === "string" ? { hint: sanitizeMessage(candidate.hint) } : {}),
        ...(Array.isArray(candidate.details)
          ? {
              details: candidate.details
                .filter((detail): detail is string => typeof detail === "string")
                .slice(0, 8)
                .map(sanitizeMessage),
            }
          : {}),
      };
    }
  }
  // A browser that runs out of memory while holding a large workload throws a
  // RangeError, which used to surface as a generic failure (benchmark finding F008).
  if (isMemoryExhaustion(error)) return memoryExhaustedError();
  return {
    code: "INTERNAL",
    title: "Something went wrong while processing the file.",
    message: error instanceof Error ? sanitizeMessage(error.message) : "Unknown error.",
    hint: "Try again, or import a freshly exported file.",
  };
}

function isMemoryExhaustion(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error instanceof RangeError) return true;
  return /out of memory|array buffer allocation|invalid string length/iu.test(error.message);
}

/**
 * Reported when the browser cannot hold the workload in memory. Distinct from
 * "too large" on purpose: the file passed the size guard, and the honest advice
 * is a narrower export, not a different file.
 */
function memoryExhaustedError(): SafeError {
  return {
    code: "MEMORY_EXHAUSTED",
    title: "This browser ran out of memory reading the workload.",
    message:
      "The file is within the import limit, but holding it plus its parsed events exceeded what this browser could allocate.",
    hint: "Export a narrower date range with `stackreplay export --since <date>`, or use a browser with more available memory.",
  };
}

/** Engine and storage errors can mention internal identifiers: keep them out. */
function sanitizeMessage(message: string): string {
  const trimmed = message.length > 240 ? `${message.slice(0, 240)}...` : message;
  return trimmed.replace(/[A-Za-z]:\\[^\s"']+|\/(?:home|Users|var|tmp)\/[^\s"']+/gu, "<path>");
}

async function handleImportFile(
  request: Extract<WorkerRequest, { type: "IMPORT_FILE" }>,
  signal: AbortSignal,
  preReadText?: string,
): Promise<void> {
  const { requestId, file, importId, label, now } = request;
  const saveLocal = request.saveLocal ?? true;
  // One rule, shared with the interface: the refusal point and the wording come
  // from `importSizeAdvice` so the two surfaces cannot describe the same file
  // differently (benchmark finding F008).
  const advice = importSizeAdvice(file.size);
  if (advice.level === "refused") {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "FILE_TOO_LARGE",
        title: "This file is larger than StackReplay imports in the browser.",
        message: advice.message,
        hint: "Export a narrower date range with `stackreplay export --since <date>`.",
      },
    });
    return;
  }

  progress(requestId, "import", "reading", "Reading the file in this browser");
  // The generation of the local store when this import began: a delete or clear
  // that lands while this import is running invalidates it, instead of letting the
  // import finish and resurrect what the user removed (benchmark finding F007).
  const storeWhenStarted = storage.localStoreGeneration();
  let text: string;
  try {
    text = preReadText ?? (await file.text());
  } catch (error) {
    post({
      type: "ERROR",
      requestId,
      error: isMemoryExhaustion(error)
        ? memoryExhaustedError()
        : {
            code: "FILE_UNREADABLE",
            title: "This file could not be read.",
            message: "The browser could not open the selected file.",
            hint: "Check that the file still exists and try again.",
          },
    });
    return;
  }

  progress(requestId, "import", "validating", "Checking the export structure");
  let validated: ReturnType<typeof validateExportText>;
  try {
    validated = validateExportText(text);
  } catch (error) {
    // Parsing a large document is where the browser usually runs out of memory.
    post({ type: "ERROR", requestId, error: toSafeError(error) });
    return;
  }
  if (!validated.ok) {
    post({ type: "ERROR", requestId, error: validated.error });
    return;
  }

  progress(requestId, "import", "preparing", "Preparing the workload");
  let summary: ReturnType<typeof summarizeExport>;
  try {
    summary = summarizeExport(validated.exported, BUNDLED_CATALOG_VERSION, bundledModelIdentity());
  } catch (error) {
    post({ type: "ERROR", requestId, error: toSafeError(error) });
    return;
  }
  const record: ImportRecord = {
    id: importId,
    label: safeCandidateName(label),
    createdAt: now,
    eventCount: summary.eventCount,
    summary,
    savedLocally: saveLocal,
  };
  if (!importIsCurrent(requestId, signal)) return;
  const existing = saveLocal ? await storage.listImports() : [];
  if (!importIsCurrent(requestId, signal)) return;
  const saved = saveLocal
    ? await storage.saveImport(record, validated.exported, { observed: storeWhenStarted, signal })
    : { ok: true as const, value: record };
  if (!importIsCurrent(requestId, signal)) return;
  if (!saved.ok) {
    if (saved.code === "IMPORT_CANCELLED") {
      post({
        type: "ERROR",
        requestId,
        error: {
          code: "IMPORT_CANCELLED",
          title: "This import was cancelled.",
          message:
            "Local data was deleted or cleared while this file was being imported, so nothing was stored.",
          hint: "Import the file again if you still want it.",
        },
      });
      return;
    }
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "STORAGE_UNAVAILABLE",
        title: "This workload could not be stored in this browser.",
        message:
          "Browser storage is unavailable, so the workload cannot be kept between page loads.",
        hint: "Private browsing windows and full storage quotas both block local storage.",
      },
    });
    return;
  }
  if (!saveLocal) sessionWorkloads.set(importId, { record, exported: validated.exported });
  post({
    type: "IMPORT_OK",
    requestId,
    record,
    replacedExisting: existing.some((entry) => entry.id === importId),
  });
}

/**
 * Files whose opening read may be in flight together. Measured in Chromium on
 * synthetic and real histories: 2 overlapped most of the per-read latency
 * (up to 29% faster); 4 and 8 added nothing on real histories, and 8 was 20%
 * slower on a 3.5 GB one, where early reads compete with large streamed files.
 */
const READ_AHEAD = 2;

/** A history group is an identifier the page chose, never a path or free text. */
function safeGroup(group: unknown): string | undefined {
  return typeof group === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/u.test(group) ? group : undefined;
}

/** A workload name from the page: bounded, single-line, and never path-shaped. */
function safeLabel(label: unknown): string | undefined {
  if (typeof label !== "string") return undefined;
  const singleLine = Array.from(label, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 32 || code === 127 ? " " : character;
  }).join("");
  const cleaned = safeIntakeMessage(singleLine.trim()).slice(0, 120);
  return cleaned.length > 0 ? cleaned : undefined;
}

async function handleImportSources(
  request: Extract<WorkerRequest, { type: "IMPORT_SOURCES" }>,
  signal: AbortSignal,
): Promise<void> {
  const { requestId, importId, files, now, saveLocal } = request;
  if (files.length === 0) {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "EMPTY_WORKLOAD",
        title: "No files selected.",
        message: "Choose source files or a folder to scan.",
      },
    });
    return;
  }
  const storeWhenStarted = storage.localStoreGeneration();
  const budget = new BrowserIntakeBudget();
  budget.select(files.map(({ file, path }) => ({ size: file.size, path })));
  let preReadFile: File | undefined;
  let preReadText: string | undefined;
  // A portable V1 envelope is identified by content. The filename is only a
  // UI convention, so a CLI export named usage.json follows the same path.
  const onlySelection = files.length === 1 ? files[0] : undefined;
  if (
    onlySelection !== undefined &&
    !/\.zip$/iu.test(onlySelection.file.name) &&
    !/^opencode\.db(?:-wal)?$/iu.test(onlySelection.file.name)
  ) {
    const file = onlySelection.file;
    if (/\.(json|stackreplay)$/iu.test(file.name) && file.size <= 512 * 1024 * 1024) {
      budget.add("readBytes", file.size);
      const text = await file.text();
      let envelope: unknown;
      try {
        envelope = JSON.parse(text);
      } catch {
        /* Raw JSONL is handled below. */
      }
      if (
        typeof envelope === "object" &&
        envelope !== null &&
        (envelope as { format?: unknown }).format === "stackreplay"
      ) {
        await handleImportFile(
          {
            protocol: WORKER_PROTOCOL_VERSION,
            type: "IMPORT_FILE",
            requestId,
            importId,
            label: file.name,
            file,
            now,
            saveLocal,
          },
          signal,
          text,
        );
        return;
      }
      // Reuse the bytes already read for ordinary one-file source intake.
      preReadFile = file;
      preReadText = text;
    }
  }
  progress(
    requestId,
    "import",
    "reading",
    `Scanning ${files.length} selected file${files.length === 1 ? "" : "s"}`,
  );
  const candidates: BrowserCandidate[] = [];
  const archiveOutcomes: CandidateOutcome[] = [];
  for (const { file, path, group, unavailable } of files) {
    if (!importIsCurrent(requestId, signal)) return;
    const history = safeGroup(group);
    if (unavailable !== undefined) {
      // Discovered, but the browser would not hand it over: read as a failure.
      const name = /^[A-Za-z]{1,40}$/u.test(unavailable) ? unavailable : undefined;
      candidates.push(unavailableCandidate(path, history, name));
      continue;
    }
    const selected = {
      path,
      ...(history === undefined ? {} : { group: history }),
      size: file.size,
      lastModified: file.lastModified,
      text: () => (file === preReadFile ? Promise.resolve(preReadText ?? "") : file.text()),
      stream: () => file.stream(),
      peekText: (bytes: number) => file.slice(0, bytes).text(),
      readCost: file === preReadFile ? 0 : file.size,
      arrayBuffer: () => file.arrayBuffer(),
    };
    if (/\.zip$/iu.test(file.name)) {
      try {
        const expanded = await expandZipCandidate(selected, budget);
        candidates.push(...expanded.candidates);
        archiveOutcomes.push(...expanded.outcomes);
      } catch (failure) {
        if (failure instanceof BrowserIntakeBudgetError) throw failure;
        archiveOutcomes.push({
          path: safeCandidateName(file.name),
          status: "malformed",
          events: 0,
          reason:
            failure instanceof Error ? sanitizeMessage(failure.message) : "Archive is malformed",
        });
      }
    } else candidates.push(selected);
  }
  let result: Awaited<ReturnType<typeof intakeBrowserCandidates>>;
  try {
    result = await intakeBrowserCandidates(candidates, loadBundledCatalog(), {
      now,
      ...(request.sourceRootSalt ? { sourceRootSalt: request.sourceRootSalt } : {}),
      budget,
      signal,
      // Real totals, at most ten times a second: a report per small file cost
      // more in messages and renders than the scan itself.
      progressIntervalMs: 100,
      readAhead: READ_AHEAD,
      onProgress: (done, total, metrics) =>
        progress(
          requestId,
          "import",
          "validating",
          `${done} of ${total} files · ${metrics.identifiedSessions} sessions · ${metrics.reconstructedEvents} events · ${metrics.skippedFiles} skipped · ${(metrics.examinedBytes / (1024 * 1024)).toFixed(1)} MB examined`,
          scanProgressOf(done, total, metrics),
        ),
    });
  } catch (failure) {
    // A cancelled scan already told the page; it stops here and saves nothing.
    if (failure instanceof BrowserIntakeCancelledError) return;
    throw failure;
  }
  if (!importIsCurrent(requestId, signal)) return;
  result.outcomes.unshift(...archiveOutcomes);
  if (result.exported === undefined) {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "EMPTY_WORKLOAD",
        title: "No replayable usage found.",
        message: "The selected files did not contain records in a supported source format.",
        details: result.outcomes.slice(0, 8).map((item) => `${item.path}: ${item.reason}`),
      },
    });
    return;
  }
  progress(requestId, "import", "preparing", "Preparing the recognized workload");
  const summary = summarizeExport(result.exported, BUNDLED_CATALOG_VERSION, bundledModelIdentity());
  const record: ImportRecord = {
    id: importId,
    label:
      safeLabel(request.label) ??
      (files.length === 1
        ? safeCandidateName(files[0]?.file.name ?? "Selected workload")
        : `Selected workload (${files.length} files)`),
    createdAt: now,
    eventCount: summary.eventCount,
    summary,
    savedLocally: saveLocal,
    // Local display labels for this browser's own scan. The export beside this
    // record keeps salted hashes only.
    ...(result.localProjects.length > 0 ? { localProjects: result.localProjects } : {}),
    intake: {
      outcomes: result.outcomes.map((item) => ({
        path: safeCandidateName(item.path),
        status: item.status,
        ...(item.source !== undefined ? { source: item.source } : {}),
        reason: safeIntakeMessage(item.reason),
        events: item.events,
      })),
      exactDuplicates: result.exactDuplicates,
      overlaps: result.overlaps,
      warnings: result.warnings.map((warning) => ({
        code: warning.code,
        message: safeIntakeMessage(warning.message),
      })),
    },
  };
  if (!importIsCurrent(requestId, signal)) return;
  if (saveLocal) {
    const saved = await storage.saveImport(record, result.exported, {
      observed: storeWhenStarted,
      signal,
    });
    if (!importIsCurrent(requestId, signal)) return;
    if (!saved.ok && saved.code === "IMPORT_CANCELLED") {
      post({
        type: "ERROR",
        requestId,
        error: {
          code: "IMPORT_CANCELLED",
          title: "This workload was not saved.",
          message: "Local data was cleared during the scan, so nothing was stored.",
          hint: "Scan again if you still want it.",
        },
      });
      return;
    }
    if (!saved.ok) {
      // A finished scan is never thrown away because storage refused it: it is
      // kept for this session and marked unsaved, and the interface says so.
      record.savedLocally = false;
      sessionWorkloads.set(importId, { record, exported: result.exported });
    }
  } else {
    sessionWorkloads.set(importId, { record, exported: result.exported });
  }
  post({ type: "IMPORT_OK", requestId, record, replacedExisting: false });
}

async function handleImportDemo(
  request: Extract<WorkerRequest, { type: "IMPORT_DEMO" }>,
  signal: AbortSignal,
): Promise<void> {
  const { requestId, preset, importId, now } = request;
  progress(requestId, "import", "preparing", "Building the demo workload");
  const storeWhenStarted = storage.localStoreGeneration();
  const exported = buildDemoExport(preset);
  const validated = validateExportValue(exported);
  if (!validated.ok) {
    post({ type: "ERROR", requestId, error: validated.error });
    return;
  }
  const summary = summarizeExport(
    validated.exported,
    BUNDLED_CATALOG_VERSION,
    bundledModelIdentity(),
  );
  const record: ImportRecord = {
    id: importId,
    label: `Demo: ${preset}`,
    createdAt: now,
    eventCount: summary.eventCount,
    summary,
  };
  if (!importIsCurrent(requestId, signal)) return;
  const saved = await storage.saveImport(record, validated.exported, {
    observed: storeWhenStarted,
    signal,
  });
  if (!importIsCurrent(requestId, signal)) return;
  if (!saved.ok) {
    post({
      type: "ERROR",
      requestId,
      error:
        saved.code === "IMPORT_CANCELLED"
          ? {
              code: "IMPORT_CANCELLED",
              title: "This import was cancelled.",
              message:
                "Local data was deleted or cleared while the demo was being prepared, so nothing was stored.",
              hint: "Load the demo again if you still want it.",
            }
          : {
              code: "STORAGE_UNAVAILABLE",
              title: "The demo workload could not be stored in this browser.",
              message:
                "Browser storage is unavailable, so the demo cannot be kept between page loads.",
            },
    });
    return;
  }
  post({ type: "IMPORT_OK", requestId, record, replacedExisting: false });
}

async function handleRunReplay(
  request: Extract<WorkerRequest, { type: "RUN_REPLAY" }>,
): Promise<void> {
  const { requestId, importId, target, rulesAsOf, excludeUnresolved, sources, timeZone } = request;
  progress(requestId, "replay", "loading", "Loading the local workload");
  const workload = await loadWorkloadEvents(importId);
  if (!workload.ok) {
    post({ type: "ERROR", requestId, error: workload.error });
    return;
  }

  progress(requestId, "replay", "replaying", "Replaying the workload against the target");
  try {
    const run = runScopedReplay({
      events: workload.exported.events,
      target,
      catalog: loadBundledCatalog(),
      identity: bundledModelIdentity(),
      rulesAsOf,
      timeZone,
      sources,
      sourceNames: new Map(
        workload.exported.detectedSources.map((source) => [source.adapterId, source.name]),
      ),
      excludeUnresolved,
    });
    post({
      type: "REPLAY_OK",
      requestId,
      result: run.result,
      timeline: buildTimeline(run.events, timeZone),
      ...(run.receipt === undefined ? {} : { receipt: run.receipt }),
      ...(run.priceability === undefined ? {} : { priceability: run.priceability }),
      ...(run.resolvedScope === undefined ? {} : { resolvedScope: run.resolvedScope }),
      ...(run.undecidedAtMs === undefined ? {} : { undecidedAtMs: run.undecidedAtMs }),
      // The projection is the display contract the surfaces read (M4D). It is
      // built here, next to the replay itself, so the app and the demonstration
      // cannot describe the same result differently.
      projection: run.projection,
      ...(run.scope === undefined ? {} : { scope: run.scope }),
    });
  } catch (error) {
    post({
      type: "ERROR",
      requestId,
      error: {
        code: "REPLAY_FAILED",
        title: "The replay could not be completed.",
        message: toSafeError(error).message,
        hint: "Try a different target plan or rules date.",
      },
    });
  }
}

/**
 * The most recently loaded workload, kept so a profile followed by window
 * inspections does not read the same events out of IndexedDB each time. Any
 * import, delete or clear drops it.
 */
let loadedWorkload: { importId: string; exported: StackReplayExportV1 } | undefined;
let workloadEpoch = 0;
let loadingWorkload:
  | { importId: string; promise: ReturnType<typeof storage.loadImport> }
  | undefined;
function invalidateLoadedWorkload(): void {
  workloadEpoch++;
  loadedWorkload = undefined;
  loadingWorkload = undefined;
}

async function loadWorkloadEvents(
  importId: string,
  isCurrent?: () => boolean,
): Promise<
  | { ok: true; exported: StackReplayExportV1; record: ImportRecord | undefined }
  | { ok: false; error: SafeError }
> {
  const session = sessionWorkloads.get(importId);
  if (session !== undefined)
    return { ok: true, exported: session.exported, record: session.record };
  const epoch = workloadEpoch;
  const record = (await storage.listImports()).find((entry) => entry.id === importId);
  if (epoch !== workloadEpoch || (isCurrent !== undefined && !isCurrent()))
    throw new OptimizerCancelledError();
  if (record && loadedWorkload?.importId === importId)
    return { ok: true, exported: loadedWorkload.exported, record };
  // Analysis and pricing start together. Share the validated read, not a
  // request's cancellation: superseding one consumer must not poison another.
  if (loadingWorkload?.importId !== importId)
    loadingWorkload = { importId, promise: storage.loadImport(importId) };
  const pending = loadingWorkload;
  let loaded: Awaited<ReturnType<typeof storage.loadImport>>;
  try {
    loaded = await pending.promise;
  } finally {
    if (loadingWorkload === pending) loadingWorkload = undefined;
  }
  if (epoch !== workloadEpoch || (isCurrent !== undefined && !isCurrent()))
    throw new OptimizerCancelledError();
  if (!loaded.ok)
    return {
      ok: false,
      error:
        loaded.code === "IMPORT_NOT_FOUND"
          ? {
              code: "IMPORT_NOT_FOUND",
              title: "That workload is no longer stored in this browser.",
              message: "It may have been deleted or cleared.",
              hint: "Scan your history again, or start from a demo workload.",
            }
          : {
              code: "STORAGE_CORRUPT",
              title: "The stored workload cannot be read.",
              message:
                "The locally stored copy is incomplete or was written by an incompatible version.",
              hint: "Delete it and scan again.",
            },
    };
  loadedWorkload = { importId, exported: loaded.value };
  return { ok: true, exported: loaded.value, record };
}

function profileOptions(record: ImportRecord | undefined, timeZone: string) {
  return {
    identity: bundledModelIdentity(),
    catalog: loadBundledCatalog(),
    timeZone,
    projectLabels: new Map((record?.localProjects ?? []).map((entry) => [entry.hash, entry.label])),
  };
}

async function handleAnalyze(
  request: Extract<WorkerRequest, { type: "ANALYZE_WORKLOAD" }>,
): Promise<void> {
  let loaded: Awaited<ReturnType<typeof loadWorkloadEvents>>;
  try {
    loaded = await loadWorkloadEvents(request.importId);
  } catch (error) {
    if (!(error instanceof OptimizerCancelledError)) throw error;
    post({ type: "CANCELLED", requestId: request.requestId });
    return;
  }
  if (!loaded.ok) {
    post({ type: "ERROR", requestId: request.requestId, error: loaded.error });
    return;
  }
  const epoch = workloadEpoch;
  const current = () => epoch === workloadEpoch;
  const profile = await cachedWorkloadResult(
    loaded.exported,
    loaded.record,
    "profile",
    [request.timeZone, request.rulesAsOf],
    () =>
      buildWorkloadProfile(loaded.exported.events, {
        ...profileOptions(loaded.record, request.timeZone),
        ...(request.rulesAsOf === undefined ? {} : { rulesAsOf: request.rulesAsOf }),
      }),
    current,
  );
  if (!current()) {
    post({ type: "CANCELLED", requestId: request.requestId });
    return;
  }
  post({ type: "PROFILE_OK", requestId: request.requestId, profile });
}

async function handleInspect(
  request: Extract<WorkerRequest, { type: "INSPECT_WINDOW" }>,
): Promise<void> {
  const loaded = await loadWorkloadEvents(request.importId);
  if (!loaded.ok) {
    post({ type: "ERROR", requestId: request.requestId, error: loaded.error });
    return;
  }
  const window = inspectWindow(
    loaded.exported.events,
    request.startMs,
    request.endMs,
    profileOptions(loaded.record, request.timeZone),
  );
  post({ type: "WINDOW_OK", requestId: request.requestId, window });
}

/**
 * Storage writes run one at a time.
 *
 * The message handler is async, so without a queue two requests can interleave:
 * an import that had already read the stored listing could write its record after
 * a delete or a clear had removed everything, which is how a cleared browser ends
 * up holding a workload again (benchmark finding F007). Reads are not queued: the
 * client supersedes them, and an old listing that answers late is dropped there.
 *
 * The *intent* to delete or clear is registered before the queue (see the delete
 * and clear cases): a deletion must stop an import that is already running
 * immediately, and cannot wait behind it, or it would be waiting for the very
 * write it is meant to prevent.
 */
let mutationChain: Promise<unknown> = Promise.resolve();

function queueMutation<T>(run: () => Promise<T>): Promise<T> {
  const next = mutationChain.then(run, run);
  mutationChain = next.catch(() => undefined);
  return next;
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>): Promise<void> => {
  const request = event.data;
  if (request === null || typeof request !== "object") return;
  if (request.protocol !== WORKER_PROTOCOL_VERSION) {
    post({
      type: "ERROR",
      requestId: request.requestId ?? 0,
      error: {
        code: "INTERNAL",
        title: "This page and its Worker disagree about the protocol version.",
        message: "Reload the page to continue.",
      },
    });
    return;
  }

  if (
    [
      "IMPORT_FILE",
      "IMPORT_SOURCES",
      "IMPORT_DEMO",
      "CANCEL_IMPORT",
      "CLEAR_LOCAL_DATA",
      "DELETE_LOCAL_IMPORT",
      "RUN_REPLAY",
    ].includes(request.type)
  )
    cancelOptimizer();
  try {
    switch (request.type) {
      case "CAPACITY_EPISODES":
        await handleCapacityEpisodes(request);
        return;
      case "API_MARKET":
        await handleMarket(request);
        return;
      case "OPTIMIZE":
        await handleOptimize(request);
        return;
      case "CANCEL_OPTIMIZER":
        cancelOptimizer();
        post({ type: "CANCELLED", requestId: request.requestId });
        return;
      case "OPTIMIZER_DETAIL": {
        if (optimizerGeneration !== request.generation) {
          post({ type: "CANCELLED", requestId: request.requestId });
          return;
        }
        const detail = await optimizer.detail(request.offset, request.limit);
        if (optimizerGeneration === request.generation)
          post({ type: "OPTIMIZER_DETAIL_OK", requestId: request.requestId, detail });
        else post({ type: "CANCELLED", requestId: request.requestId });
        return;
      }
      case "PING":
        post({ type: "PONG", requestId: request.requestId, protocol: WORKER_PROTOCOL_VERSION });
        return;
      case "CANCEL_IMPORT":
        invalidateCurrentImport(request.requestId);
        post({ type: "CANCELLED", requestId: request.requestId });
        return;
      case "IMPORT_FILE":
        {
          invalidateLoadedWorkload();
          const signal = beginImport(request.requestId);
          await queueMutation(() => handleImportFile(request, signal));
        }
        return;
      case "IMPORT_SOURCES":
        {
          invalidateLoadedWorkload();
          const signal = beginImport(request.requestId);
          await queueMutation(() => handleImportSources(request, signal));
        }
        return;
      case "EXPORT_LOCAL_IMPORT": {
        const sessionWorkload = sessionWorkloads.get(request.importId);
        const loaded =
          sessionWorkload !== undefined
            ? { ok: true as const, value: sessionWorkload.exported }
            : await storage.loadImport(request.importId);
        if (!loaded.ok) {
          post({
            type: "ERROR",
            requestId: request.requestId,
            error: {
              code: "IMPORT_NOT_FOUND",
              title: "Workload unavailable.",
              message: "The local workload could not be opened for export.",
            },
          });
          return;
        }
        const validated = validateExportValue(loaded.value);
        if (!validated.ok) {
          post({ type: "ERROR", requestId: request.requestId, error: validated.error });
          return;
        }
        const bytes = new TextEncoder().encode(JSON.stringify(validated.exported));
        scope.postMessage({ type: "EXPORTED", requestId: request.requestId, bytes }, [
          bytes.buffer,
        ]);
        return;
      }
      case "IMPORT_DEMO":
        {
          const signal = beginImport(request.requestId);
          await queueMutation(() => handleImportDemo(request, signal));
        }
        return;
      case "RUN_REPLAY":
        await handleRunReplay(request);
        return;
      case "ANALYZE_WORKLOAD":
        await handleAnalyze(request);
        return;
      case "INSPECT_WINDOW":
        await handleInspect(request);
        return;
      case "LIST_LOCAL_IMPORTS":
        post({
          type: "IMPORTS",
          requestId: request.requestId,
          imports: [...sessionWorkloads.values()]
            .map((item) => item.record)
            .concat(await storage.listImports()),
        });
        return;
      case "DELETE_LOCAL_IMPORT": {
        sessionWorkloads.delete(request.importId);
        invalidateLoadedWorkload();
        // Registered first: an import running right now must not be able to write
        // this record back after the queue reaches the deletion.
        storage.invalidateInFlightWrites(request.importId);
        const deleted = await queueMutation(() => storage.deleteImport(request.importId));
        if (!deleted.ok) {
          post({
            type: "ERROR",
            requestId: request.requestId,
            error: {
              code: "STORAGE_UNAVAILABLE",
              title: "That workload could not be deleted.",
              message: "Browser storage is unavailable.",
            },
          });
          return;
        }
        post({ type: "DELETED", requestId: request.requestId, importId: request.importId });
        return;
      }
      case "CLEAR_LOCAL_DATA": {
        invalidateCurrentImport(request.requestId, "Clearing local data cancelled this import.");
        sessionWorkloads.clear();
        invalidateLoadedWorkload();
        // Same rule as a delete: clearing invalidates imports that are running now,
        // so nothing lands after the clear.
        storage.invalidateInFlightWrites();
        const cleared = await queueMutation(() => storage.clearLocalData());
        if (!cleared.ok) {
          post({
            type: "ERROR",
            requestId: request.requestId,
            error: {
              code: "STORAGE_UNAVAILABLE",
              title: "Local StackReplay data could not be cleared.",
              message: "Browser storage is unavailable.",
            },
          });
          return;
        }
        post({ type: "CLEARED", requestId: request.requestId });
        return;
      }
      default:
        post({
          type: "ERROR",
          requestId: (request as { requestId: number }).requestId,
          error: {
            code: "INTERNAL",
            title: "Unsupported request.",
            message: "This page asked the Worker to do something it does not implement.",
          },
        });
    }
  } catch (error) {
    post({ type: "ERROR", requestId: request.requestId, error: toSafeError(error) });
  }
};

post({ type: "READY", protocol: WORKER_PROTOCOL_VERSION });
