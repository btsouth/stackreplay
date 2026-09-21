import type { TextUsageV1 } from "@stackreplay/schema";
import { buildEvent, eventContext, HARNESS_IDS, providerIdForModel } from "../event-builder.js";
import { inWindow } from "../files.js";
import { decimalStringFromNumber } from "../identity.js";
import { joinPath } from "../platform.js";
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
 * Hermes adapter.
 *
 * Source: the Hermes profile directory (`~/.hermes/state.db`). Usage lives in
 * `session_model_usage`, one row per session and model, with the token
 * categories, call count and cost that Hermes itself recorded, plus
 * `sessions.cwd` for project attribution.
 *
 * Granularity: Hermes exposes session-and-model aggregates, not per-call
 * records. StackReplay emits exactly one canonical event per row, timestamped
 * at the end of the row's activity window (`last_seen`), and carries the
 * window as `requestStartedAt`/`requestEndedAt`/`durationMs`. Request counts
 * are therefore approximate for this source: one event represents a window of
 * calls, never a fabricated sequence of calls.
 *
 * Accounting (docs/ADAPTERS.md; verified against 350+ local rows): cache read
 * and cache write are additional to `input_tokens` (locally, cache reads
 * exceed `input_tokens` in most rows, which is impossible if they were a
 * subset), and `reasoning_tokens` is a subset of `output_tokens`.
 */

const ADAPTER_ID = "hermes" as const;
const MAX_ROWS = 200000;

export function hermesRoots(env: SourceEnvironment): string[] {
  return [joinPath(env.platform, env.homeDir, ".hermes")];
}

function hermesStateDatabase(env: SourceEnvironment): string {
  return joinPath(env.platform, env.homeDir, ".hermes", "state.db");
}

/** Hermes stores activity timestamps in epoch seconds; accept milliseconds too. */
export function hermesEpochMs(value: unknown): number | undefined {
  const numeric = toFiniteNumber(value);
  if (numeric === undefined) return undefined;
  if (numeric <= 0) return undefined;
  return numeric > 1e12 ? Math.round(numeric) : Math.round(numeric * 1000);
}

export function createHermesAdapter(): LocalSourceAdapter {
  return {
    id: ADAPTER_ID,
    name: "Hermes",
    kind: "usage",

    defaultRoots: hermesRoots,

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      let sessionCount: number | undefined;
      let supported = true;
      let note: string | undefined;
      for (const root of hermesRoots(env)) {
        const info = await env.fs.stat(root);
        const exists = info !== null;
        const readable = exists && info.kind === "directory";
        const databasePath = hermesStateDatabase(env);
        const database = readable ? await env.fs.stat(databasePath) : null;
        if (database !== null && database.kind === "file") {
          const db = await openReadOnly(databasePath);
          if (db === undefined) {
            supported = false;
            note = "state.db exists but could not be opened read-only";
          } else {
            const rows = db.all(
              "select count(*) as n, count(distinct session_id) as sessions from session_model_usage",
            );
            sessionCount = toSafeCount(rows[0]?.sessions);
            const records = toSafeCount(rows[0]?.n) ?? 0;
            if (records === 0) {
              supported = false;
              note = "state.db exists but records no session usage yet";
            } else {
              note = `${records} session/model usage record(s) found`;
            }
            db.close();
          }
        } else if (readable) {
          supported = false;
          note = "Hermes profile found but state.db is missing";
        }
        probes.push({
          path: root,
          exists,
          readable,
          ...(info !== null ? { kind: info.kind } : {}),
          ...(sessionCount !== undefined ? { sessionCount } : {}),
        });
      }
      const detected = probes.some((probe) => probe.exists);
      return {
        adapterId: ADAPTER_ID,
        name: "Hermes",
        kind: "usage" as const,
        detected,
        supported,
        probes,
        ...(note !== undefined ? { note } : { note: "no Hermes profile found" }),
      };
    },

    async collect(env: SourceEnvironment, options: CollectOptions): Promise<CollectResult> {
      const warnings = new WarningCollector();
      const stats = emptyStats();
      const events: CollectResult["events"] = [];
      const roots = options.roots ?? hermesRoots(env);

      for (const root of roots) {
        const databasePath = joinPath(env.platform, root, "state.db");
        const info = await env.fs.stat(databasePath);
        if (info === null || info.kind !== "file") continue;
        const db = await openReadOnly(databasePath);
        if (db === undefined) {
          warnings.add("SOURCE_UNREADABLE", "could not open state.db read-only", databasePath);
          continue;
        }
        let rows: SqliteRow[] = [];
        try {
          rows = db.all(
            `select u.session_id as session_id,
                    u.model as model,
                    u.api_call_count as api_call_count,
                    u.input_tokens as input_tokens,
                    u.output_tokens as output_tokens,
                    u.cache_read_tokens as cache_read_tokens,
                    u.cache_write_tokens as cache_write_tokens,
                    u.reasoning_tokens as reasoning_tokens,
                    u.estimated_cost_usd as estimated_cost_usd,
                    u.actual_cost_usd as actual_cost_usd,
                    u.billing_provider as billing_provider,
                    u.first_seen as first_seen,
                    u.last_seen as last_seen,
                    s.cwd as cwd,
                    s.git_repo_root as git_repo_root
             from session_model_usage u
             left join sessions s on s.id = u.session_id
             order by u.last_seen asc, u.session_id asc, u.model asc
             limit ?`,
            [MAX_ROWS + 1],
          );
        } catch {
          warnings.add("SOURCE_UNREADABLE", "state.db query failed", databasePath);
          db.close();
          continue;
        }
        db.close();
        let truncated = false;
        if (rows.length > MAX_ROWS) {
          truncated = true;
          rows = rows.slice(0, MAX_ROWS);
        }

        for (const row of rows) {
          stats.recordsRead += 1;
          const rawModel = toText(row.model);
          if (rawModel === undefined) {
            warnings.add("MODEL_UNKNOWN", "usage record reports no model", databasePath);
            stats.recordsUnsupported += 1;
            continue;
          }
          const inputTokens = toSafeCount(row.input_tokens);
          const outputTokens = toSafeCount(row.output_tokens);
          const cacheReadTokens = toSafeCount(row.cache_read_tokens);
          const cacheWriteTokens = toSafeCount(row.cache_write_tokens);
          const reasoningTokens = toSafeCount(row.reasoning_tokens);
          if (
            inputTokens === undefined &&
            outputTokens === undefined &&
            cacheReadTokens === undefined &&
            cacheWriteTokens === undefined &&
            reasoningTokens === undefined
          ) {
            warnings.add("USAGE_MISSING", "usage record reports no token counts", databasePath);
            stats.recordsUnsupported += 1;
            continue;
          }
          const usage: TextUsageV1 = {
            accounting: {
              cacheReadIncludedInInput: false,
              cacheWriteIncludedInInput: false,
              reasoningIncludedInOutput: true,
            },
          };
          if (inputTokens !== undefined) usage.inputTokens = inputTokens;
          if (outputTokens !== undefined) usage.outputTokens = outputTokens;
          if (cacheReadTokens !== undefined) usage.cacheReadTokens = cacheReadTokens;
          if (cacheWriteTokens !== undefined) usage.cacheWriteTokens = cacheWriteTokens;
          const reasoningEstablished =
            reasoningTokens === undefined ||
            (outputTokens !== undefined && reasoningTokens <= outputTokens);
          if (reasoningEstablished) {
            if (reasoningTokens !== undefined) usage.reasoningTokens = reasoningTokens;
          } else {
            usage.accounting = {
              cacheReadIncludedInInput: false,
              cacheWriteIncludedInInput: false,
            };
            warnings.add(
              "ACCOUNTING_UNESTABLISHED",
              "reasoning tokens exceed output tokens in this record; reasoning reported as unknown",
              databasePath,
            );
          }

          const lastSeenMs = hermesEpochMs(row.last_seen);
          if (lastSeenMs === undefined) {
            warnings.add("TIMESTAMP_INVALID", "usage record has no usable timestamp", databasePath);
            stats.recordsUnsupported += 1;
            continue;
          }
          // The row is an aggregate; its end timestamp is what places it in a
          // replay window, consistently with how the event is timestamped.
          if (!inWindow(lastSeenMs, options)) continue;
          const firstSeenMs = hermesEpochMs(row.first_seen);
          const sessionId = toText(row.session_id) ?? "unknown-session";
          const identity = `${sessionId}#${rawModel}`;
          const actualCost = toFiniteNumber(row.actual_cost_usd);
          const estimatedCost = toFiniteNumber(row.estimated_cost_usd);
          const cost = actualCost ?? estimatedCost;
          const nativeCost = cost !== undefined ? decimalStringFromNumber(cost) : undefined;
          const billingProvider = toText(row.billing_provider);
          const mappedProvider = providerIdForModel(options.mapper, rawModel);
          const projectKey = toText(row.cwd) ?? toText(row.git_repo_root);
          const callCount = toSafeCount(row.api_call_count);
          const durationMs =
            firstSeenMs !== undefined && lastSeenMs >= firstSeenMs
              ? Math.round(lastSeenMs - firstSeenMs)
              : undefined;

          events.push(
            buildEvent(
              {
                adapterId: ADAPTER_ID,
                sessionId,
                identity,
                occurredAtMs: lastSeenMs,
                rawModel,
                usage,
                ...(nativeCost !== undefined ? { nativeCost } : {}),
                ...(projectKey !== undefined ? { projectKey } : {}),
                harnessId: HARNESS_IDS.hermes,
                ...(mappedProvider !== undefined
                  ? { providerId: mappedProvider }
                  : billingProvider !== undefined
                    ? { providerId: billingProvider, providerAttribution: "exact" as const }
                    : {}),
                workloadCategory: "agent",
                ...(firstSeenMs !== undefined ? { requestStartedAtMs: firstSeenMs } : {}),
                requestEndedAtMs: lastSeenMs,
                ...(durationMs !== undefined ? { durationMs } : {}),
              },
              eventContext(env, options),
            ),
          );
          stats.eventsEmitted += 1;
          if (callCount !== undefined && callCount > 1) {
            warnings.add(
              "RECORD_INCOMPLETE",
              "usage rows aggregate several API calls; request counts are approximate",
              databasePath,
            );
          }
        }
        stats.sessionsScanned += new Set(rows.map((row) => toText(row.session_id) ?? "")).size;
        if (truncated) warnings.add("SOURCE_TRUNCATED", `stopped after ${MAX_ROWS} usage rows`);
      }

      return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
    },
  };
}
