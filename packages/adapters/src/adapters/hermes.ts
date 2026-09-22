import type { TextUsageV1 } from "@stackreplay/schema";
import { buildEvent, eventContext, HARNESS_IDS, providerIdForModel } from "../event-builder.js";
import { inWindow } from "../files.js";
import { decimalStringFromNumber } from "../identity.js";
import { joinPath } from "../platform.js";
import {
  MAX_EPOCH_MS,
  openReadOnly,
  type SqliteRow,
  toFiniteNumber,
  toSafeCount,
  toText,
} from "../sqlite.js";
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

/**
 * Hermes stores activity timestamps in epoch seconds; accept milliseconds too.
 *
 * The seconds-to-milliseconds conversion is where an absurd value becomes a
 * `RangeError` out of the event builder, so the result is clamped to the
 * representable date range: one corrupt row is reported as an invalid
 * timestamp, not a collection that dies.
 */
export function hermesEpochMs(value: unknown): number | undefined {
  const numeric = toFiniteNumber(value);
  if (numeric === undefined) return undefined;
  if (numeric <= 0) return undefined;
  const ms = numeric > 1e12 ? Math.round(numeric) : Math.round(numeric * 1000);
  return Number.isFinite(ms) && Math.abs(ms) <= MAX_EPOCH_MS ? ms : undefined;
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
            try {
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
            } catch {
              // A damaged database is reported as detected-but-unsupported
              // rather than thrown out of detection (the collection pipeline
              // also isolates a failing source, this keeps the note specific).
              supported = false;
              note = "state.db could not be queried for usage records";
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
          // One row per primary key. `session_model_usage` is keyed by
          // (session_id, model, billing_provider, billing_base_url,
          // billing_mode, task), so every key column is selected: a session and
          // model can legitimately appear more than once with different billing
          // routes or tasks, and those rows carry separate token counts.
          rows = db.all(
            `select u.session_id as session_id,
                    u.model as model,
                    u.billing_provider as billing_provider,
                    u.billing_base_url as billing_base_url,
                    u.billing_mode as billing_mode,
                    u.task as task,
                    u.api_call_count as api_call_count,
                    u.input_tokens as input_tokens,
                    u.output_tokens as output_tokens,
                    u.cache_read_tokens as cache_read_tokens,
                    u.cache_write_tokens as cache_write_tokens,
                    u.reasoning_tokens as reasoning_tokens,
                    u.estimated_cost_usd as estimated_cost_usd,
                    u.actual_cost_usd as actual_cost_usd,
                    u.first_seen as first_seen,
                    u.last_seen as last_seen,
                    s.cwd as cwd,
                    s.git_repo_root as git_repo_root
             from session_model_usage u
             left join sessions s on s.id = u.session_id
             order by u.last_seen asc, u.session_id asc, u.model asc,
                      u.billing_provider asc, u.billing_base_url asc,
                      u.billing_mode asc, u.task asc
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
          // Cache is established as additional from the data invariant; the
          // reasoning declaration is attached only when the record actually
          // reports reasoning (an included quantity must be reported,
          // decision 22), so a row without the reasoning column keeps that
          // category unknown instead of carrying an impossible declaration.
          const reasoningEstablished =
            reasoningTokens === undefined ||
            (outputTokens !== undefined && reasoningTokens <= outputTokens);
          const usage: TextUsageV1 = {
            accounting: {
              cacheReadIncludedInInput: false,
              cacheWriteIncludedInInput: false,
              ...(reasoningEstablished && reasoningTokens !== undefined
                ? { reasoningIncludedInOutput: true }
                : {}),
            },
          };
          if (inputTokens !== undefined) usage.inputTokens = inputTokens;
          if (outputTokens !== undefined) usage.outputTokens = outputTokens;
          if (cacheReadTokens !== undefined) usage.cacheReadTokens = cacheReadTokens;
          if (cacheWriteTokens !== undefined) usage.cacheWriteTokens = cacheWriteTokens;
          if (reasoningEstablished) {
            if (reasoningTokens !== undefined) usage.reasoningTokens = reasoningTokens;
          } else {
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
          const billingProvider = toText(row.billing_provider);
          const billingBaseUrl = toText(row.billing_base_url) ?? "";
          const billingMode = toText(row.billing_mode) ?? "";
          const task = toText(row.task) ?? "";
          // Event identity mirrors the source's own primary key. Keying on
          // `sessionId#model` alone made every extra row for a (session, model)
          // pair look like an exact duplicate of the first, so dedup discarded
          // its tokens silently: on a real store that dropped 85.1% of Hermes
          // tokens (404 rows, 223 distinct session#model pairs).
          const identity = [
            sessionId,
            rawModel,
            billingProvider ?? "",
            billingBaseUrl,
            billingMode,
            task,
          ].join("#");
          const actualCost = toFiniteNumber(row.actual_cost_usd);
          const estimatedCost = toFiniteNumber(row.estimated_cost_usd);
          const cost = actualCost ?? estimatedCost;
          const nativeCost = cost !== undefined ? decimalStringFromNumber(cost) : undefined;
          const mappedProvider = providerIdForModel(options.mapper, rawModel);
          const projectKey = toText(row.cwd) ?? toText(row.git_repo_root);
          const callCount = toSafeCount(row.api_call_count);
          // Usage confidence follows the call count, and only a row that says it
          // stands for exactly one call may claim an exact request count. A row
          // that covers several calls is an aggregate, and a row that reports no
          // count at all may cover any number of them: marking the latter
          // `exact` asserted a certainty the record does not support.
          const usageConfidence = callCount === 1 ? ("exact" as const) : ("estimated" as const);
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
                // A row that covers several API calls is not an exact per-call
                // counter, and neither is a row that reports no count: the
                // engine's source-data confidence factor counts these, and a
                // request figure built from them can only be a lower bound.
                usageConfidence,
                ...(firstSeenMs !== undefined ? { requestStartedAtMs: firstSeenMs } : {}),
                requestEndedAtMs: lastSeenMs,
                ...(durationMs !== undefined ? { durationMs } : {}),
              },
              eventContext(env, options),
            ),
          );
          stats.eventsEmitted += 1;
          if (usageConfidence !== "exact") {
            // One message for every row that is not an exact counter, because
            // the collector reports one sample per warning code: naming only the
            // multi-call case would hide the rows whose count is absent behind
            // whichever row happened to be read first.
            warnings.add(
              "RECORD_INCOMPLETE",
              "usage rows cover a session's calls rather than one call each, and a row may report no call count at all, so request counts are approximate",
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
