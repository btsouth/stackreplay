import { joinPath } from "../platform.js";
import { openReadOnly, type SqliteRow, toText } from "../sqlite.js";
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
 * 1. An attribution index mapping provider sessions to T3 threads, read from
 *    `projection_thread_sessions` (`provider_name`, `provider_session_id`).
 *    Canonical events from the provider adapters are then attributed to T3 as
 *    the harness, and the underlying provider session is not counted twice.
 * 2. Additional provider-history roots that T3 itself manages, discovered from
 *    its usage scan cache (`~/.t3/commandcode/claude/projects` and similar), so
 *    provider histories that only exist inside T3 are still scanned once.
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

export function createT3CodeAdapter(): AttributionAdapter {
  return {
    id: ADAPTER_ID,
    name: "T3 Code",
    kind: "attribution",

    defaultRoots: t3CodeRoots,

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      let threadSessions = 0;
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
                const rows = db.all("select count(*) as n from projection_thread_sessions");
                threadSessions = Number(rows[0]?.n ?? 0);
              } catch {
                threadSessions = 0;
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
      return {
        adapterId: ADAPTER_ID,
        name: "T3 Code",
        kind: "attribution" as const,
        detected,
        supported,
        probes,
        ...(detected
          ? supported
            ? {
                note: `${threadSessions} thread/session mapping(s); ${scannedSessions ?? 0} provider session(s) in the scan cache`,
              }
            : { note: "T3 data found but no thread/session mappings are recorded yet" }
          : { note: "no T3 Code data found" }),
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
