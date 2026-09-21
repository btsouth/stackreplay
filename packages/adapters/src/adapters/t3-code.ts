import { joinPath } from "../platform.js";
import { openReadOnly, type SqliteRow, toSafeCount, toText } from "../sqlite.js";
import {
  type AdapterId,
  type AttributionAdapter,
  type AttributionIndex,
  attributionKey,
  type CollectOptions,
  emptyStats,
  type HarnessAttribution,
  type PathProbe,
  type SourceEnvironment,
} from "../types.js";
import { WarningCollector } from "../warnings.js";
import { claudeCodeRoots } from "./claude-code.js";
import { codexRoots } from "./codex.js";
import { openCodeRoots } from "./opencode.js";

/**
 * T3 Code attribution adapter (spec point 16).
 *
 * T3 Code is a harness: it orchestrates other agents and keeps its own
 * bookkeeping about which provider session belongs to which of its threads.
 * Re-ingesting provider usage from T3 would double count, so this adapter
 * emits no usage at all. It produces two things instead:
 *
 * 1. An attribution index mapping provider sessions to T3 threads. T3 records
 *    that mapping in two places, and both are read, because installed versions
 *    only populate one of them: `projection_thread_sessions`
 *    (`provider_name`, `provider_session_id`), and the runtime bookkeeping in
 *    `provider_session_runtime` (`resume_cursor_json.sessionId`), which is
 *    where the provider session id lives when the projection column is empty.
 *    Canonical events from the provider adapters are then attributed to T3 as
 *    the harness, and the underlying provider session is not counted twice.
 * 2. Additional provider-history roots that T3 itself manages, discovered from
 *    its usage scan cache (`~/.t3/commandcode/claude/projects` and similar), so
 *    provider histories that only exist inside T3 are still scanned once.
 *
 * A thread whose provider session id T3 has not recorded stays unattributed:
 * the adapter never guesses, and it reports how many threads it could not map.
 */

const ADAPTER_ID = "t3-code" as const;

const PROVIDER_TO_ADAPTER: Record<string, AdapterId | undefined> = {
  codex: "codex",
  opencode: "opencode",
  claude: "claude-code",
  "claude-code": "claude-code",
  commandcode: "command-code",
  "command-code": "command-code",
  hermes: "hermes",
};

export function t3CodeRoots(env: SourceEnvironment): string[] {
  return [joinPath(env.platform, env.homeDir, ".t3", "userdata")];
}

/** Default history roots of a provider adapter, used to avoid scanning twice. */
function defaultRootsFor(adapterId: AdapterId, env: SourceEnvironment): string[] {
  if (adapterId === "claude-code") return claudeCodeRoots(env);
  if (adapterId === "codex") return codexRoots(env);
  if (adapterId === "opencode") return openCodeRoots(env);
  return [];
}

interface UsageScanCache {
  version?: unknown;
  sessions?: unknown;
  sources?: unknown;
}

/**
 * Provider session id from T3's resume cursor.
 *
 * The cursor is T3's own record of the provider session its thread is driving;
 * an unreadable or empty cursor yields nothing, because guessing a session id
 * would attach the wrong harness to real usage.
 */
export function sessionIdFromCursor(cursor: string | undefined): string | undefined {
  if (cursor === undefined) return undefined;
  try {
    const parsed = JSON.parse(cursor);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return toText((parsed as Record<string, unknown>).sessionId);
  } catch {
    return undefined;
  }
}

export function createT3CodeAdapter(): AttributionAdapter {
  return {
    id: ADAPTER_ID,
    name: "T3 Code",
    kind: "attribution",

    defaultRoots: t3CodeRoots,

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      let threadSessions = 0;
      let projectionMappings = 0;
      let runtimeRecords = 0;
      let scannedSessions: number | undefined;
      for (const root of t3CodeRoots(env)) {
        const info = await env.fs.stat(root);
        const exists = info !== null;
        const readable = exists && info.kind === "directory";
        if (readable) {
          const databasePath = joinPath(env.platform, root, "state.sqlite");
          const database = await env.fs.stat(databasePath);
          if (database !== null && database.kind === "file") {
            const db = await openReadOnly(databasePath);
            if (db !== undefined) {
              try {
                const rows = db.all(
                  `select count(*) as n,
                          sum(case when provider_session_id is not null then 1 else 0 end) as mapped
                   from projection_thread_sessions`,
                );
                threadSessions = Number(rows[0]?.n ?? 0);
                projectionMappings = Number(rows[0]?.mapped ?? 0);
              } catch {
                threadSessions = 0;
              }
              try {
                const rows = db.all("select count(*) as n from provider_session_runtime");
                runtimeRecords = Number(rows[0]?.n ?? 0);
              } catch {
                runtimeRecords = 0;
              }
              db.close();
            }
          }
          const cachePath = joinPath(env.platform, root, "usage-scan-cache.json");
          const cache = await env.fs.stat(cachePath);
          if (cache !== null && cache.kind === "file") {
            try {
              const parsed = JSON.parse(
                await env.fs.readTextFile(cachePath, 8 * 1024 * 1024),
              ) as UsageScanCache;
              if (Array.isArray(parsed.sessions)) scannedSessions = parsed.sessions.length;
            } catch {
              scannedSessions = undefined;
            }
          }
        }
        probes.push({
          path: root,
          exists,
          readable,
          ...(info !== null ? { kind: info.kind } : {}),
        });
      }
      const detected = probes.some((probe) => probe.exists);
      const supported = threadSessions > 0 || scannedSessions !== undefined;
      const note = ((): string => {
        if (!detected) return "no T3 Code data found";
        if (!supported) return "T3 data found but no thread/session mappings are recorded yet";
        const mapping =
          projectionMappings > 0
            ? `${projectionMappings} of ${threadSessions} thread row(s) carry a provider session id`
            : runtimeRecords > 0
              ? `${threadSessions} thread row(s); T3 has recorded no provider session id in the projection, so ${runtimeRecords} runtime record(s) are read for the mapping`
              : `${threadSessions} thread row(s); T3 has recorded no provider session id yet, so no session can be attributed`;
        return `${mapping}; ${scannedSessions ?? 0} provider session(s) in the scan cache`;
      })();
      return {
        adapterId: ADAPTER_ID,
        name: "T3 Code",
        kind: "attribution" as const,
        detected,
        supported,
        probes,
        note,
      };
    },

    async collectAttribution(
      env: SourceEnvironment,
      options: CollectOptions,
    ): Promise<AttributionIndex> {
      const warnings = new WarningCollector();
      const stats = emptyStats();
      const byProviderSession = new Map<string, HarnessAttribution>();
      const additionalRoots: AttributionIndex["additionalRoots"] = [];
      const roots = options.roots ?? t3CodeRoots(env);

      for (const root of roots) {
        const databasePath = joinPath(env.platform, root, "state.sqlite");
        const database = await env.fs.stat(databasePath);
        if (database !== null && database.kind === "file") {
          const db = await openReadOnly(databasePath);
          if (db === undefined) {
            warnings.add(
              "SOURCE_UNREADABLE",
              "could not open state.sqlite read-only",
              databasePath,
            );
          } else {
            let rows: SqliteRow[] = [];
            try {
              rows = db.all(
                `select thread_id, provider_name, provider_session_id, runtime_mode
                 from projection_thread_sessions
                 where provider_session_id is not null
                 order by thread_id asc`,
              );
            } catch {
              warnings.add("SOURCE_UNREADABLE", "state.sqlite query failed", databasePath);
            }
            // Total thread rows, including the ones T3 has not mapped yet: the
            // difference is what "no session could be attributed" means.
            let threadRowCount = rows.length;
            try {
              const counted = db.all("select count(*) as n from projection_thread_sessions");
              threadRowCount = toSafeCount(counted[0]?.n) ?? rows.length;
            } catch {
              threadRowCount = rows.length;
            }
            // Second mapping source: T3's own runtime bookkeeping. Installed
            // versions leave `projection_thread_sessions.provider_session_id`
            // empty and record the provider session id in the resume cursor
            // instead, so reading only the projection would silently attribute
            // nothing at all.
            let runtimeRows: SqliteRow[] = [];
            try {
              runtimeRows = db.all(
                `select thread_id, provider_name, resume_cursor_json
                 from provider_session_runtime
                 order by thread_id asc`,
              );
            } catch {
              // Older T3 versions have no runtime table: the projection is then
              // the only mapping source that exists.
              runtimeRows = [];
            }
            db.close();
            for (const row of rows) {
              const providerName = toText(row.provider_name);
              const providerSessionId = toText(row.provider_session_id);
              const threadId = toText(row.thread_id);
              if (
                providerName === undefined ||
                providerSessionId === undefined ||
                threadId === undefined
              ) {
                continue;
              }
              const providerAdapter = PROVIDER_TO_ADAPTER[providerName.toLowerCase()];
              if (providerAdapter === undefined) {
                warnings.add(
                  "RECORD_UNSUPPORTED",
                  `T3 thread references provider "${providerName}", which StackReplay does not read`,
                  databasePath,
                );
                stats.recordsUnsupported += 1;
                continue;
              }
              byProviderSession.set(attributionKey(providerAdapter, providerSessionId), {
                harnessId: "t3-code",
                harnessSessionId: threadId,
                attribution: "exact",
              });
              stats.recordsRead += 1;
              stats.sessionsScanned += 1;
            }

            // Second mapping source: T3's own runtime bookkeeping, already read
            // above: the resume cursor carries the provider session id when the
            // projection column is empty. A thread whose id T3 has not recorded
            // stays unattributed rather than being guessed at.
            let unmappedThreads = 0;
            for (const row of runtimeRows) {
              const providerName = toText(row.provider_name);
              const threadId = toText(row.thread_id);
              const cursor = toText(row.resume_cursor_json);
              if (providerName === undefined || threadId === undefined) continue;
              const providerAdapter = PROVIDER_TO_ADAPTER[providerName.toLowerCase()];
              if (providerAdapter === undefined) continue;
              const providerSessionId = sessionIdFromCursor(cursor);
              if (providerSessionId === undefined) {
                unmappedThreads += 1;
                continue;
              }
              const key = attributionKey(providerAdapter, providerSessionId);
              if (byProviderSession.has(key)) continue;
              byProviderSession.set(key, {
                harnessId: "t3-code",
                harnessSessionId: threadId,
                attribution: "exact",
              });
              stats.recordsRead += 1;
              stats.sessionsScanned += 1;
            }
            if (byProviderSession.size === 0 && (threadRowCount > 0 || runtimeRows.length > 0)) {
              warnings.add(
                "RECORD_INCOMPLETE",
                `${threadRowCount + runtimeRows.length} T3 thread record(s) carry no provider session id, so no session could be attributed to T3`,
                databasePath,
              );
            }
            if (byProviderSession.size > 0 && unmappedThreads > 0) {
              warnings.add(
                "RECORD_INCOMPLETE",
                `${unmappedThreads} T3 runtime record(s) hold no provider session id; those threads stay unattributed`,
                databasePath,
              );
            }
          }
        }

        const cachePath = joinPath(env.platform, root, "usage-scan-cache.json");
        const cacheInfo = await env.fs.stat(cachePath);
        if (cacheInfo !== null && cacheInfo.kind === "file") {
          try {
            const parsed = JSON.parse(
              await env.fs.readTextFile(cachePath, 16 * 1024 * 1024),
            ) as UsageScanCache;
            const sources = parsed.sources;
            if (typeof sources === "object" && sources !== null && !Array.isArray(sources)) {
              for (const [key, value] of Object.entries(sources as Record<string, unknown>)) {
                const [providerName] = key.split("\u0000");
                const directory =
                  typeof value === "object" && value !== null && !Array.isArray(value)
                    ? toText((value as Record<string, unknown>).dir)
                    : undefined;
                if (providerName === undefined || directory === undefined) continue;
                const providerAdapter = PROVIDER_TO_ADAPTER[providerName.toLowerCase()];
                if (providerAdapter === undefined) continue;
                // Skip roots the provider adapter already scans by default, so a
                // harness-managed copy never causes the same history to be read twice.
                if (defaultRootsFor(providerAdapter, env).includes(directory)) continue;
                if (additionalRoots.some((entry) => entry.path === directory)) continue;
                additionalRoots.push({ adapterId: providerAdapter, path: directory });
              }
            }
          } catch {
            warnings.add("RECORD_MALFORMED", "usage scan cache is not valid JSON", cachePath);
          }
        }
      }

      return {
        byProviderSession,
        additionalRoots: additionalRoots.sort((a, b) =>
          a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
        ),
        warnings: warnings.toArray(),
        stats,
      };
    },
  };
}
