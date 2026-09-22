import type { TextUsageV1 } from "@stackreplay/schema";
import { buildEvent, eventContext } from "../event-builder.js";
import { decimalStringFromNumber, epochMsFromIso } from "../identity.js";
import { asArray, asRecord, readNumber, readString } from "../parse.js";
import {
  type CollectOptions,
  type CollectResult,
  emptyStats,
  type LocalSourceAdapter,
  type PathProbe,
  type SourceEnvironment,
} from "../types.js";
import { WarningCollector } from "../warnings.js";

/**
 * ccusage import adapter.
 *
 * ccusage (`ccusage daily|session|blocks|monthly --json`) is a widely used
 * local usage reporter. StackReplay imports its JSON when the user points at a
 * file explicitly (`--input`); it is never auto-detected as a source of truth
 * for the machine, because the same underlying history would otherwise be
 * counted twice alongside a native scan.
 *
 * Accounting (docs/ADAPTERS.md; verified against the documented field
 * semantics and against the arithmetic in ccusage's own published examples):
 * `totalTokens` is documented as the sum of input, output, cache creation and
 * cache read, so the two cache categories are additional to `inputTokens`.
 *
 * Reasoning is deliberately left unknown. ccusage aggregates several agents
 * (Claude Code, Codex, OpenCode and others) that disagree about whether
 * reasoning tokens are a subset of output tokens or an additional category, and
 * ccusage itself reports no reasoning field. StackReplay therefore keeps the
 * stricter accounting semantics it promised in Milestone 1 and reports token
 * totals as unknown for imported rows instead of silently understating them.
 */

const ADAPTER_ID = "ccusage" as const;

interface CcusageRow {
  occurredAtMs: number;
  /**
   * Bucket this row covers (`daily:2026-09-19`, `block:…`, `monthly:…`). It is
   * NOT a session id and is never hashed as one.
   */
  sessionKey: string;
  /** Provider session id when the layout carries one (session exports). */
  providerSessionId?: string;
  rawModel: string;
  usage: TextUsageV1;
  nativeCost?: string;
  projectKey?: string;
  identity: string;
  /**
   * The record's own published total (`totalTokens`), kept as the per-record
   * oracle the accounting policy requires: the reported categories must add up
   * to it.
   */
  reportedTotalTokens?: number;
}

function usageFromRow(row: Record<string, unknown>): TextUsageV1 | undefined {
  const inputTokens = readNumber(row, "inputTokens");
  const outputTokens = readNumber(row, "outputTokens");
  const cacheReadTokens = readNumber(row, "cacheReadTokens");
  const cacheWriteTokens = readNumber(row, "cacheCreationTokens");
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    cacheReadTokens === undefined &&
    cacheWriteTokens === undefined
  ) {
    return undefined;
  }
  const usage: TextUsageV1 = {
    accounting: {
      cacheReadIncludedInInput: false,
      cacheWriteIncludedInInput: false,
    },
  };
  const asCount = (value: number | undefined): number | undefined =>
    value !== undefined && Number.isInteger(value) && value >= 0 ? value : undefined;
  const input = asCount(inputTokens);
  const output = asCount(outputTokens);
  const cacheRead = asCount(cacheReadTokens);
  const cacheWrite = asCount(cacheWriteTokens);
  if (input !== undefined) usage.inputTokens = input;
  if (output !== undefined) usage.outputTokens = output;
  if (cacheRead !== undefined) usage.cacheReadTokens = cacheRead;
  if (cacheWrite !== undefined) usage.cacheWriteTokens = cacheWrite;
  return usage;
}

function modelLabel(row: Record<string, unknown>): string | undefined {
  const models = asArray(row.models) ?? asArray(row.modelsUsed);
  if (models === undefined || models.length === 0) {
    const single = readString(row, "model");
    return single;
  }
  const names = models.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (names.length === 0) return undefined;
  if (names.length === 1) return names[0];
  return names.join(", ");
}

function costOf(row: Record<string, unknown>): string | undefined {
  const value = readNumber(row, "costUSD") ?? readNumber(row, "totalCost");
  return value === undefined ? undefined : decimalStringFromNumber(value);
}

/** The record's own published total, when the layout carries one. */
function totalOf(row: Record<string, unknown>): number | undefined {
  const value = readNumber(row, "totalTokens");
  return value !== undefined && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/**
 * Parses a ccusage date or month into epoch milliseconds through the shared
 * calendar-date guard, so `2026-02-30` is reported as unusable instead of being
 * rolled forward by `Date.parse` (decision 11), exactly as every other adapter
 * does.
 */
function dateAtMidnight(value: string): number | undefined {
  return epochMsFromIso(`${value}T00:00:00.000Z`);
}

function epochFromIso(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  return epochMsFromIso(value);
}

/** Converts one ccusage JSON payload into candidate rows. */
export function ccusageRows(payload: unknown): { rows: CcusageRow[]; layout: string } | undefined {
  const payloadRecord = asRecord(payload);
  const monthly = asArray(payload);
  if (monthly !== undefined) {
    const rows: CcusageRow[] = [];
    monthly.forEach((entry, index) => {
      const row = asRecord(entry);
      if (row === undefined) return;
      const month = readString(row, "month");
      const usage = usageFromRow(row);
      if (month === undefined || usage === undefined) return;
      const rawModel = modelLabel(row);
      if (rawModel === undefined) return;
      const occurredAtMs = dateAtMidnight(`${month}-01`);
      if (occurredAtMs === undefined) return;
      const nativeCost = costOf(row);
      const reportedTotalTokens = totalOf(row);
      rows.push({
        occurredAtMs,
        sessionKey: `monthly:${month}`,
        rawModel,
        usage,
        ...(nativeCost !== undefined ? { nativeCost } : {}),
        ...(reportedTotalTokens !== undefined ? { reportedTotalTokens } : {}),
        identity: `${month}#${index}`,
      });
    });
    return { rows, layout: "monthly" };
  }
  if (payloadRecord === undefined) return undefined;

  const projects = asRecord(payloadRecord.projects);
  if (projects !== undefined) {
    const rows: CcusageRow[] = [];
    for (const [project, entries] of Object.entries(projects)) {
      const list = asArray(entries) ?? [];
      list.forEach((entry, index) => {
        const row = asRecord(entry);
        if (row === undefined) return;
        const date = readString(row, "date");
        const usage = usageFromRow(row);
        const rawModel = modelLabel(row);
        if (date === undefined || usage === undefined || rawModel === undefined) return;
        const occurredAtMs = dateAtMidnight(date);
        if (occurredAtMs === undefined) return;
        const nativeCost = costOf(row);
        const reportedTotalTokens = totalOf(row);
        rows.push({
          occurredAtMs,
          sessionKey: `daily:${date}`,
          rawModel,
          usage,
          ...(nativeCost !== undefined ? { nativeCost } : {}),
          ...(reportedTotalTokens !== undefined ? { reportedTotalTokens } : {}),
          projectKey: project,
          identity: `${project}#${date}#${index}`,
        });
      });
    }
    return { rows, layout: "projects" };
  }

  const type = readString(payloadRecord, "type");
  const data = asArray(payloadRecord.data) ?? asArray(payloadRecord.sessions);
  if (data === undefined) return undefined;

  const rows: CcusageRow[] = [];
  data.forEach((entry, index) => {
    const row = asRecord(entry);
    if (row === undefined) return;
    const usage = usageFromRow(row);
    if (usage === undefined) return;
    const rawModel = modelLabel(row);
    if (rawModel === undefined) return;
    const nativeCost = costOf(row);
    const reportedTotalTokens = totalOf(row);
    const base = {
      rawModel,
      usage,
      ...(nativeCost !== undefined ? { nativeCost } : {}),
      ...(reportedTotalTokens !== undefined ? { reportedTotalTokens } : {}),
    };

    if (type === "session" || readString(row, "sessionId") !== undefined) {
      const sessionId = readString(row, "sessionId");
      const lastActivity = epochFromIso(readString(row, "lastActivity"));
      const firstActivity = epochFromIso(readString(row, "firstActivity"));
      const occurredAtMs = lastActivity ?? firstActivity;
      if (sessionId === undefined || occurredAtMs === undefined) return;
      rows.push({
        ...base,
        occurredAtMs,
        sessionKey: `session:${sessionId}`,
        providerSessionId: sessionId,
        identity: `${sessionId}#${index}`,
      });
      return;
    }
    if (type === "blocks") {
      const blockEnd = epochFromIso(readString(row, "blockEnd"));
      const blockStart = readString(row, "blockStart");
      if (blockEnd === undefined) return;
      rows.push({
        ...base,
        occurredAtMs: blockEnd,
        sessionKey: `block:${blockStart ?? String(blockEnd)}`,
        identity: `${blockStart ?? blockEnd}#${index}`,
      });
      return;
    }
    const date = readString(row, "date");
    if (date === undefined) return;
    const occurredAtMs = dateAtMidnight(date);
    if (occurredAtMs === undefined) return;
    rows.push({
      ...base,
      occurredAtMs,
      sessionKey: `daily:${date}`,
      identity: `${date}#${index}`,
    });
  });
  return { rows, layout: type ?? "daily" };
}

/**
 * Checks a row's reported categories against the record's own published total.
 *
 * ccusage documents `totalTokens` as input + output + cache creation + cache
 * read, and its own published examples satisfy that identity, so a record that
 * publishes a total and reports all four categories is a per-record oracle. A
 * record that contradicts its own total cannot have its cache categories
 * trusted as additional, so those degrade to unknown (the reported input and
 * output stay) exactly as the OpenCode adapter handles an unreconcilable
 * `tokens.total`.
 */
function reconcileAgainstReportedTotal(row: CcusageRow): {
  usage: TextUsageV1;
  cacheCategoriesDropped: boolean;
} {
  const total = row.reportedTotalTokens;
  const everyCategoryReported =
    row.usage.inputTokens !== undefined &&
    row.usage.outputTokens !== undefined &&
    row.usage.cacheReadTokens !== undefined &&
    row.usage.cacheWriteTokens !== undefined;
  if (total === undefined || !everyCategoryReported) {
    return { usage: row.usage, cacheCategoriesDropped: false };
  }
  const sum =
    (row.usage.inputTokens ?? 0) +
    (row.usage.outputTokens ?? 0) +
    (row.usage.cacheReadTokens ?? 0) +
    (row.usage.cacheWriteTokens ?? 0);
  if (sum === total) return { usage: row.usage, cacheCategoriesDropped: false };
  return {
    usage: {
      accounting: {},
      ...(row.usage.inputTokens !== undefined ? { inputTokens: row.usage.inputTokens } : {}),
      ...(row.usage.outputTokens !== undefined ? { outputTokens: row.usage.outputTokens } : {}),
    },
    cacheCategoriesDropped: true,
  };
}

export function createCcusageAdapter(): LocalSourceAdapter {
  return {
    id: ADAPTER_ID,
    name: "ccusage import",
    kind: "import",

    defaultRoots() {
      return [];
    },

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      const inputFile = env.inputFile;
      if (inputFile === undefined) {
        return {
          adapterId: ADAPTER_ID,
          name: "ccusage import",
          kind: "import" as const,
          detected: false,
          supported: true,
          probes,
          note: "import only: pass --input <ccusage.json> to include ccusage output",
        };
      }
      const info = await env.fs.stat(inputFile);
      const exists = info !== null;
      probes.push({
        path: inputFile,
        exists,
        readable: exists && info.kind === "file",
        ...(info !== null ? { kind: info.kind } : {}),
      });
      return {
        adapterId: ADAPTER_ID,
        name: "ccusage import",
        kind: "import" as const,
        detected: exists,
        supported: true,
        probes,
        note: exists ? "import file found" : `import file not found: ${inputFile}`,
      };
    },

    async collect(env: SourceEnvironment, options: CollectOptions): Promise<CollectResult> {
      const warnings = new WarningCollector();
      const stats = emptyStats();
      const events: CollectResult["events"] = [];
      const inputFile = options.inputFile ?? env.inputFile;
      if (inputFile === undefined) {
        return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
      }
      const info = await env.fs.stat(inputFile);
      if (info === null || info.kind !== "file") {
        warnings.add("SOURCE_UNREADABLE", "import file is missing or not a file", inputFile);
        return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(await env.fs.readTextFile(inputFile, options.maxFileBytes));
      } catch {
        warnings.add("RECORD_MALFORMED", "import file is not valid JSON", inputFile);
        return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
      }
      const extracted = ccusageRows(parsed);
      if (extracted === undefined) {
        warnings.add(
          "SOURCE_LAYOUT_UNSUPPORTED",
          "import file does not match a known ccusage JSON layout",
          inputFile,
        );
        return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
      }
      stats.filesScanned = 1;
      stats.recordsRead = extracted.rows.length;
      warnings.add(
        "ACCOUNTING_UNESTABLISHED",
        "ccusage reports no reasoning category and mixes agents; reasoning stays unknown, so token totals are unknown",
        inputFile,
      );
      let unreconciledRows = 0;
      let sessionLessRows = 0;
      for (const row of extracted.rows) {
        if (options.since !== undefined && row.occurredAtMs < Date.parse(options.since)) {
          continue;
        }
        if (options.until !== undefined && row.occurredAtMs >= Date.parse(options.until)) continue;
        // The row's own published total is a per-record oracle: the categories
        // it reports must add up to it. When they do not, the cache categories
        // are the ones that may or may not be additional, so they degrade to
        // unknown (a reported number the source itself contradicts is never
        // published) and the row is reported.
        const usage = reconcileAgainstReportedTotal(row);
        if (row.reportedTotalTokens !== undefined && usage.cacheCategoriesDropped) {
          unreconciledRows += 1;
        }
        // Only a layout that names the provider's own session id carries a
        // session. A daily, monthly or block row aggregates a bucket of work:
        // hashing the bucket name as a session identity would fabricate a
        // session that does not exist and hide the fact that the row cannot be
        // matched against a native scan of the same work.
        const sessionId = row.providerSessionId;
        if (sessionId === undefined) sessionLessRows += 1;
        events.push(
          buildEvent(
            {
              adapterId: ADAPTER_ID,
              ...(sessionId !== undefined ? { sessionId } : {}),
              identity: row.identity,
              occurredAtMs: row.occurredAtMs,
              rawModel: row.rawModel,
              usage: usage.usage,
              ...(row.nativeCost !== undefined ? { nativeCost: row.nativeCost } : {}),
              ...(row.projectKey !== undefined ? { projectKey: row.projectKey } : {}),
              // An imported row is an aggregate of many calls whatever its
              // layout, so its per-call usage is never an exact counter.
              usageConfidence: "estimated" as const,
            },
            eventContext(env, options),
          ),
        );
        stats.eventsEmitted += 1;
      }
      if (unreconciledRows > 0) {
        warnings.add(
          "ACCOUNTING_UNRECONCILED",
          `${unreconciledRows} imported row(s) report categories that do not add up to the record's own totalTokens; their cache categories are reported as unknown`,
          inputFile,
        );
      }
      if (sessionLessRows > 0) {
        warnings.add(
          "AGGREGATE_NO_SESSION",
          `${sessionLessRows} imported row(s) aggregate a day, month or block and name no session, so they cannot be matched against a native scan of the same work`,
          inputFile,
        );
      }
      stats.sessionsScanned = new Set(extracted.rows.map((row) => row.sessionKey)).size;
      return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
    },
  };
}
