import type { TextUsageV1 } from "@stackreplay/schema";
import { buildEvent, eventContext, HARNESS_IDS, providerIdForModel } from "../event-builder.js";
import { decimalStringFromNumber } from "../identity.js";
import { dataHome, joinPath } from "../platform.js";
import { openReadOnly, type SqliteRow, toFiniteNumber, toSafeCount, toText } from "../sqlite.js";
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
 * OpenCode adapter.
 *
 * Source: the OpenCode data directory (`opencode.db`). Assistant messages live
 * in the `message` table with a JSON `data` column carrying
 * `{ providerID, modelID, cost, time: { created, completed }, tokens: { input,
 * output, reasoning, total, cache: { read, write } } }`. Sessions carry the
 * working directory in `session.directory`.
 *
 * Accounting (docs/ADAPTERS.md; verified arithmetically across 10,000+ local
 * assistant records): `tokens.total` equals the sum of input, output,
 * reasoning, cache read and cache write, so every category is additional and
 * none may be added twice. Every record is re-checked against its own
 * `tokens.total`; a record whose reported categories exceed that total has its
 * cache and reasoning categories reported as unknown with a warning, because
 * the overlapping categories cannot all be additional.
 *
 * Older OpenCode versions stored a JSON tree under `storage/`. That layout is
 * detected but reported as unsupported rather than guessed at.
 */

const ADAPTER_ID = "opencode" as const;
const MAX_ROWS = 200000;

export function openCodeRoots(env: SourceEnvironment): string[] {
  const candidates = [
    joinPath(env.platform, dataHome(env), "opencode"),
    joinPath(env.platform, env.homeDir, ".local", "share", "opencode"),
  ];
  return [...new Set(candidates)];
}

function openCodeUsage(row: SqliteRow): { usage: TextUsageV1 | undefined; reconciled: boolean } {
  const inputTokens = toSafeCount(row.tokens_input);
  const outputTokens = toSafeCount(row.tokens_output);
  const reasoningTokens = toSafeCount(row.tokens_reasoning);
  const cacheReadTokens = toSafeCount(row.cache_read);
  const cacheWriteTokens = toSafeCount(row.cache_write);
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    reasoningTokens === undefined &&
    cacheReadTokens === undefined &&
    cacheWriteTokens === undefined
  ) {
    return { usage: undefined, reconciled: true };
  }
  const usage: TextUsageV1 = {
    accounting: {
      cacheReadIncludedInInput: false,
      cacheWriteIncludedInInput: false,
      reasoningIncludedInOutput: false,
    },
  };
  if (inputTokens !== undefined) usage.inputTokens = inputTokens;
  if (outputTokens !== undefined) usage.outputTokens = outputTokens;
  if (cacheReadTokens !== undefined) usage.cacheReadTokens = cacheReadTokens;
  if (cacheWriteTokens !== undefined) usage.cacheWriteTokens = cacheWriteTokens;
  if (reasoningTokens !== undefined) usage.reasoningTokens = reasoningTokens;

  // OpenCode publishes its own total for every message, so each record can be
  // checked against the invariant that established the declaration. When the
  // reported categories add up to more than the record's own total they cannot
  // all be additional, and no inclusion arrangement reproduces the total
  // either: the overlapping categories are reported as unknown instead of
  // publishing an accounting the source itself contradicts (decision 22).
  const totalTokens = toSafeCount(row.tokens_total);
  const reportedSum =
    (inputTokens ?? 0) +
    (outputTokens ?? 0) +
    (reasoningTokens ?? 0) +
    (cacheReadTokens ?? 0) +
    (cacheWriteTokens ?? 0);
  if (totalTokens !== undefined && reportedSum > totalTokens) {
    delete usage.cacheReadTokens;
    delete usage.cacheWriteTokens;
    delete usage.reasoningTokens;
    return { usage, reconciled: false };
  }
  return { usage, reconciled: true };
}

export function createOpenCodeAdapter(): LocalSourceAdapter {
  return {
    id: ADAPTER_ID,
    name: "OpenCode",
    kind: "usage",

    defaultRoots: openCodeRoots,

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      let sessionCount: number | undefined;
      let unsupportedNote: string | undefined;
      let anyDatabase = false;
      for (const root of openCodeRoots(env)) {
        const info = await env.fs.stat(root);
        const exists = info !== null;
        const readable = exists && info.kind === "directory";
        const databasePath = joinPath(env.platform, root, "opencode.db");
        const database = readable ? await env.fs.stat(databasePath) : null;
        if (database !== null && database.kind === "file") {
          anyDatabase = true;
          if (sessionCount === undefined) {
            const db = await openReadOnly(databasePath);
            if (db !== undefined) {
              const rows = db.all("select count(*) as n from session");
              sessionCount = toSafeCount(rows[0]?.n);
              db.close();
            }
          }
        } else if (readable && unsupportedNote === undefined) {
          const legacy = await env.fs.stat(joinPath(env.platform, root, "storage"));
          if (legacy !== null) {
            unsupportedNote =
              "legacy JSON storage layout found; only the SQLite layout (opencode.db) is supported";
          }
        }
        probes.push({
          path: root,
          exists,
          readable,
          ...(info !== null ? { kind: info.kind } : {}),
          ...(sessionCount !== undefined && anyDatabase ? { sessionCount } : {}),
        });
      }
      const detected = probes.some((probe) => probe.exists);
      const supported = anyDatabase;
      return {
        adapterId: ADAPTER_ID,
        name: "OpenCode",
        kind: "usage" as const,
        detected,
        supported,
        probes,
        ...(detected
          ? supported
            ? { note: `${sessionCount ?? "unknown number of"} session(s) found` }
            : { note: unsupportedNote ?? "OpenCode directory exists but no opencode.db was found" }
          : { note: "no OpenCode data directory found" }),
      };
    },

    async collect(env: SourceEnvironment, options: CollectOptions): Promise<CollectResult> {
      const warnings = new WarningCollector();
      const stats = emptyStats();
      const events: CollectResult["events"] = [];
      const roots = options.roots ?? openCodeRoots(env);
      let truncated = false;

      for (const root of roots) {
        const databasePath = joinPath(env.platform, root, "opencode.db");
        const info = await env.fs.stat(databasePath);
        if (info === null || info.kind !== "file") continue;
        const db = await openReadOnly(databasePath);
        if (db === undefined) {
          warnings.add("SOURCE_UNREADABLE", "could not open opencode.db read-only", databasePath);
          continue;
        }
        const since = options.since !== undefined ? Date.parse(options.since) : Number.NaN;
        const until = options.until !== undefined ? Date.parse(options.until) : Number.NaN;
        const lowerBound = Number.isNaN(since) ? 0 : since;
        const upperBound = Number.isNaN(until) ? Number.MAX_SAFE_INTEGER : until;
        let rows: SqliteRow[] = [];
        try {
          rows = db.all(
            `select m.id as id,
                    m.session_id as session_id,
                    m.time_created as time_created,
                    json_extract(m.data, '$.role') as role,
                    json_extract(m.data, '$.modelID') as model_id,
                    json_extract(m.data, '$.providerID') as provider_id,
                    json_extract(m.data, '$.cost') as cost,
                    json_extract(m.data, '$.time.created') as time_created_data,
                    json_extract(m.data, '$.tokens.total') as tokens_total,
                    json_extract(m.data, '$.tokens.input') as tokens_input,
                    json_extract(m.data, '$.tokens.output') as tokens_output,
                    json_extract(m.data, '$.tokens.reasoning') as tokens_reasoning,
                    json_extract(m.data, '$.tokens.cache.read') as cache_read,
                    json_extract(m.data, '$.tokens.cache.write') as cache_write,
                    s.directory as directory
             from message m
             left join session s on s.id = m.session_id
             where json_extract(m.data, '$.role') = 'assistant'
               and json_extract(m.data, '$.tokens') is not null
               and m.time_created >= ? and m.time_created < ?
             order by m.time_created asc, m.id asc
             limit ?`,
            [lowerBound, upperBound, MAX_ROWS + 1],
          );
        } catch {
          warnings.add("SOURCE_UNREADABLE", "opencode.db query failed", databasePath);
          db.close();
          continue;
        }
        db.close();
        if (rows.length > MAX_ROWS) {
          truncated = true;
          rows = rows.slice(0, MAX_ROWS);
        }

        for (const row of rows) {
          stats.recordsRead += 1;
          const rawModel = toText(row.model_id);
          if (rawModel === undefined) {
            warnings.add("MODEL_UNKNOWN", "assistant message reports no model", databasePath);
            stats.recordsUnsupported += 1;
            continue;
          }
          const { usage, reconciled } = openCodeUsage(row);
          if (usage === undefined) {
            warnings.add("USAGE_MISSING", "assistant message reports no token usage", databasePath);
            stats.recordsUnsupported += 1;
            continue;
          }
          if (!reconciled) {
            warnings.add(
              "ACCOUNTING_UNESTABLISHED",
              "reported categories exceed the message's own token total; cache and reasoning reported as unknown",
              databasePath,
            );
          }
          const occurredAtMs =
            toFiniteNumber(row.time_created_data) ?? toFiniteNumber(row.time_created);
          if (occurredAtMs === undefined) {
            warnings.add(
              "TIMESTAMP_INVALID",
              "assistant message has no usable timestamp",
              databasePath,
            );
            stats.recordsUnsupported += 1;
            continue;
          }
          const sessionId = toText(row.session_id) ?? "unknown-session";
          const identity = toText(row.id) ?? `${occurredAtMs}#${stats.recordsRead}`;
          const rawProvider = toText(row.provider_id);
          const mappedProvider = providerIdForModel(options.mapper, rawModel);
          const cost = toFiniteNumber(row.cost);
          const nativeCost = cost !== undefined ? decimalStringFromNumber(cost) : undefined;
          const directory = toText(row.directory);
          events.push(
            buildEvent(
              {
                adapterId: ADAPTER_ID,
                sessionId,
                identity,
                occurredAtMs,
                rawModel,
                usage,
                ...(nativeCost !== undefined ? { nativeCost } : {}),
                ...(directory !== undefined ? { projectKey: directory } : {}),
                harnessId: HARNESS_IDS.opencode,
                ...(mappedProvider !== undefined
                  ? { providerId: mappedProvider }
                  : rawProvider !== undefined
                    ? { providerId: rawProvider, providerAttribution: "exact" as const }
                    : {}),
                workloadCategory: "coding",
              },
              eventContext(env, options),
            ),
          );
          stats.eventsEmitted += 1;
        }
        stats.sessionsScanned += new Set(rows.map((row) => toText(row.session_id) ?? "")).size;
      }
      if (truncated) {
        warnings.add("SOURCE_TRUNCATED", `stopped after ${MAX_ROWS} assistant messages`);
      }

      return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
    },
  };
}
