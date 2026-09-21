import type { TextUsageV1 } from "@stackreplay/schema";
import { buildEvent, eventContext } from "../event-builder.js";
import { decimalStringFromNumber } from "../identity.js";
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
  sessionKey: string;
  /** Provider session id when the layout carries one (session exports). */
  providerSessionId?: string;
  rawModel: string;
  usage: TextUsageV1;
  nativeCost?: string;
  projectKey?: string;
  identity: string;
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

function epochFromIso(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
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
      const occurredAtMs = Date.parse(`${month}-01T00:00:00.000Z`);
      if (Number.isNaN(occurredAtMs)) return;
      const nativeCost = costOf(row);
      rows.push({
        occurredAtMs,
        sessionKey: `monthly:${month}`,
        rawModel,
        usage,
        ...(nativeCost !== undefined ? { nativeCost } : {}),
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
        const occurredAtMs = Date.parse(`${date}T00:00:00.000Z`);
        if (Number.isNaN(occurredAtMs)) return;
        const nativeCost = costOf(row);
        rows.push({
          occurredAtMs,
          sessionKey: `daily:${date}`,
          rawModel,
          usage,
          ...(nativeCost !== undefined ? { nativeCost } : {}),
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
    const base = {
      rawModel,
      usage,
      ...(nativeCost !== undefined ? { nativeCost } : {}),
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
    const occurredAtMs = Date.parse(`${date}T00:00:00.000Z`);
    if (Number.isNaN(occurredAtMs)) return;
    rows.push({
      ...base,
      occurredAtMs,
      sessionKey: `daily:${date}`,
      identity: `${date}#${index}`,
    });
  });
  return { rows, layout: type ?? "daily" };
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
      for (const row of extracted.rows) {
        if (options.since !== undefined && row.occurredAtMs < Date.parse(options.since)) {
          continue;
        }
        if (options.until !== undefined && row.occurredAtMs >= Date.parse(options.until)) continue;
        // Session-level rows carry the provider's own session id, which is what
        // makes an import dedupe against a native scan of the same session.
        const sessionId = row.providerSessionId ?? row.sessionKey;
        events.push(
          buildEvent(
            {
              adapterId: ADAPTER_ID,
              sessionId,
              identity: row.identity,
              occurredAtMs: row.occurredAtMs,
              rawModel: row.rawModel,
              usage: row.usage,
              ...(row.nativeCost !== undefined ? { nativeCost: row.nativeCost } : {}),
              ...(row.projectKey !== undefined ? { projectKey: row.projectKey } : {}),
            },
            eventContext(env, options),
          ),
        );
        stats.eventsEmitted += 1;
      }
      stats.sessionsScanned = new Set(extracted.rows.map((row) => row.sessionKey)).size;
      return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
    },
  };
}
