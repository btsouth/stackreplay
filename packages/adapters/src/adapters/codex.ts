import type { TextUsageV1 } from "@stackreplay/schema";
import { buildEvent, eventContext, HARNESS_IDS, providerIdForModel } from "../event-builder.js";
import {
  baseName,
  effectiveMaxFileBytes,
  effectiveMaxFiles,
  filePredatesWindow,
  inWindow,
  listFilesRecursive,
} from "../files.js";
import { epochMsFromIso } from "../identity.js";
import { asRecord, parseJsonLine, readCount, readNumber, readString } from "../parse.js";
import { joinPath } from "../platform.js";
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
 * Codex adapter.
 *
 * Source: `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<timestamp>-<uuid>.jsonl`.
 * Records are `session_meta`, `turn_context`, `response_item`, `event_msg` and
 * `world_state` lines. Usage arrives as `event_msg` records of payload type
 * `token_count`, which carry both the session cumulative
 * (`info.total_token_usage`) and the delta for the most recent turn
 * (`info.last_token_usage`). StackReplay emits one canonical event per
 * `last_token_usage` delta, so a turn is never counted twice.
 *
 * Accounting (docs/ADAPTERS.md; verified arithmetically on local rollout
 * files): `cached_input_tokens` and `cache_write_input_tokens` are subsets of
 * `input_tokens`, and `reasoning_output_tokens` is a subset of `output_tokens`.
 * Records that violate those relationships are reported instead of published:
 * the affected categories become unknown.
 */

const ADAPTER_ID = "codex" as const;

export function codexRoots(env: SourceEnvironment): string[] {
  return [joinPath(env.platform, env.homeDir, ".codex", "sessions")];
}

export function createCodexAdapter(): LocalSourceAdapter {
  return {
    id: ADAPTER_ID,
    name: "Codex",
    kind: "usage",

    defaultRoots: codexRoots,

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      let sessionCount = 0;
      let supported = true;
      for (const root of codexRoots(env)) {
        const info = await env.fs.stat(root);
        const exists = info !== null;
        const readable = exists && info.kind === "directory";
        let rootSessionCount: number | undefined;
        if (readable) {
          const files = await listFilesRecursive(env, root, { maxDepth: 4, extension: ".jsonl" });
          rootSessionCount = files.length;
          sessionCount += files.length;
          if (files.length === 0) supported = false;
        }
        probes.push({
          path: root,
          exists,
          readable,
          ...(info !== null ? { kind: info.kind } : {}),
          ...(rootSessionCount !== undefined ? { sessionCount: rootSessionCount } : {}),
        });
      }
      const detected = probes.some((probe) => probe.exists);
      return {
        adapterId: ADAPTER_ID,
        name: "Codex",
        kind: "usage" as const,
        detected,
        supported,
        probes,
        ...(detected
          ? supported
            ? { note: `${sessionCount} rollout file(s) found` }
            : { note: "sessions directory exists but contains no rollout files" }
          : { note: "no Codex history found" }),
      };
    },

    async collect(env: SourceEnvironment, options: CollectOptions): Promise<CollectResult> {
      const warnings = new WarningCollector();
      const stats = emptyStats();
      const events: CollectResult["events"] = [];
      const roots = options.roots ?? codexRoots(env);
      const maxFiles = effectiveMaxFiles(options);
      const maxBytes = effectiveMaxFileBytes(options);
      let truncated = false;

      for (const root of roots) {
        const files = await listFilesRecursive(env, root, { maxDepth: 4, extension: ".jsonl" });
        for (const file of files) {
          if (stats.filesScanned >= maxFiles) {
            truncated = true;
            break;
          }
          const info = await env.fs.stat(file);
          if (info === null || info.kind !== "file") continue;
          if (filePredatesWindow(info.mtimeMs, options)) {
            stats.filesSkipped += 1;
            continue;
          }
          stats.filesScanned += 1;
          let sessionId = baseName(env, file).replace(/\.jsonl$/u, "");
          let projectKey: string | undefined;
          let currentModel: string | undefined;
          let lineIndex = 0;
          let fileEvents = 0;

          for await (const line of env.fs.readLines(file, maxBytes)) {
            lineIndex += 1;
            stats.recordsRead += 1;
            const parsed = parseJsonLine(line);
            if (!parsed.ok) {
              warnings.add("RECORD_MALFORMED", "line is not valid JSON", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            const record = asRecord(parsed.value);
            if (record === undefined) continue;
            const type = readString(record, "type");
            const payload = asRecord(record.payload);
            if (payload === undefined) continue;

            if (type === "session_meta") {
              sessionId =
                readString(payload, "id") ?? readString(payload, "session_id") ?? sessionId;
              projectKey = readString(payload, "cwd") ?? projectKey;
              continue;
            }
            if (type === "turn_context") {
              currentModel = readString(payload, "model") ?? currentModel;
              projectKey = readString(payload, "cwd") ?? projectKey;
              continue;
            }
            if (type !== "event_msg") continue;
            if (readString(payload, "type") !== "token_count") continue;

            const info_ = asRecord(payload.info);
            const lastUsage = info_ === undefined ? undefined : asRecord(info_.last_token_usage);
            const totalUsage = info_ === undefined ? undefined : asRecord(info_.total_token_usage);
            if (lastUsage === undefined) {
              warnings.add("USAGE_MISSING", "token_count record has no per-turn usage", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            const totalTokens = readCount(lastUsage, "total_tokens");
            const inputTokens = readCount(lastUsage, "input_tokens");
            const outputTokens = readCount(lastUsage, "output_tokens");
            const cacheReadTokens = readCount(lastUsage, "cached_input_tokens");
            const cacheWriteTokens = readCount(lastUsage, "cache_write_input_tokens");
            const reasoningTokens = readCount(lastUsage, "reasoning_output_tokens");
            const categoryEvidence = [
              inputTokens,
              outputTokens,
              cacheReadTokens,
              cacheWriteTokens,
              reasoningTokens,
            ].some((value) => value !== undefined && value > 0);
            if (totalTokens === 0 && !categoryEvidence) continue;
            if (totalTokens === undefined) {
              warnings.add(
                "RECORD_INCOMPLETE",
                "per-turn total_tokens is absent or invalid; reported categories remain partial evidence",
                file,
              );
              if (!categoryEvidence) {
                stats.recordsUnsupported += 1;
                continue;
              }
            } else if (totalTokens === 0) {
              warnings.add(
                "RECORD_INCOMPLETE",
                "zero per-turn total conflicts with reported categories",
                file,
              );
            }
            if (currentModel === undefined) {
              warnings.add("MODEL_UNKNOWN", "token_count record precedes any model context", file);
              stats.recordsUnsupported += 1;
              continue;
            }

            // Declarations are attached only to categories the record actually
            // reports: an included quantity must be reported (decision 22), so
            // a record that omits a field keeps that category unknown instead
            // of carrying a declaration the schema rejects.
            const usage: TextUsageV1 = {
              accounting: {
                ...(cacheReadTokens !== undefined ? { cacheReadIncludedInInput: true } : {}),
                ...(cacheWriteTokens !== undefined ? { cacheWriteIncludedInInput: true } : {}),
                ...(reasoningTokens !== undefined ? { reasoningIncludedInOutput: true } : {}),
              },
            };
            if (inputTokens !== undefined) usage.inputTokens = inputTokens;
            if (outputTokens !== undefined) usage.outputTokens = outputTokens;

            const cacheTotal = (cacheReadTokens ?? 0) + (cacheWriteTokens ?? 0);
            const cacheEstablished =
              inputTokens !== undefined ? cacheTotal <= inputTokens : cacheTotal === 0;
            if (cacheEstablished) {
              if (cacheReadTokens !== undefined) usage.cacheReadTokens = cacheReadTokens;
              if (cacheWriteTokens !== undefined) usage.cacheWriteTokens = cacheWriteTokens;
            } else {
              // The cache categories degrade to unknown, so the declarations
              // that described them degrade with them: a declaration for an
              // absent category is an impossible accounting (decision 22) and
              // the canonical schema rejects it.
              const {
                cacheReadIncludedInInput: _read,
                cacheWriteIncludedInInput: _write,
                ...rest
              } = usage.accounting ?? {};
              void _read;
              void _write;
              usage.accounting = rest;
              warnings.add(
                "ACCOUNTING_UNESTABLISHED",
                "cache categories exceed inputTokens in this record; cache reported as unknown",
                file,
              );
            }
            const reasoningEstablished =
              reasoningTokens === undefined ||
              (outputTokens !== undefined && reasoningTokens <= outputTokens);
            if (reasoningEstablished) {
              if (reasoningTokens !== undefined) usage.reasoningTokens = reasoningTokens;
            } else {
              const { reasoningIncludedInOutput: _drop, ...rest } = usage.accounting ?? {};
              void _drop;
              usage.accounting = rest;
              warnings.add(
                "ACCOUNTING_UNESTABLISHED",
                "reasoning exceeds outputTokens in this record; reasoning reported as unknown",
                file,
              );
            }

            const timestamp = readString(record, "timestamp");
            const occurredAtMs = timestamp === undefined ? undefined : epochMsFromIso(timestamp);
            if (occurredAtMs === undefined) {
              warnings.add("TIMESTAMP_INVALID", "token_count record has no usable timestamp", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            if (!inWindow(occurredAtMs, options)) continue;
            const ordinal = readNumber(record, "ordinal");
            const cumulative = readCount(totalUsage ?? {}, "total_tokens");
            const identity = `${ordinal ?? lineIndex}#${cumulative ?? totalTokens}`;
            events.push(
              buildEvent(
                {
                  adapterId: ADAPTER_ID,
                  sessionId,
                  identity,
                  occurredAtMs,
                  rawModel: currentModel,
                  usage,
                  ...(projectKey !== undefined ? { projectKey } : {}),
                  harnessId: HARNESS_IDS.codex,
                  ...(providerIdForModel(options.mapper, currentModel) !== undefined
                    ? { providerId: providerIdForModel(options.mapper, currentModel) as string }
                    : {}),
                  workloadCategory: "coding",
                },
                eventContext(env, options),
              ),
            );
            fileEvents += 1;
          }
          stats.sessionsScanned += 1;
          stats.eventsEmitted += fileEvents;
        }
        if (truncated) break;
      }
      if (truncated) {
        warnings.add("SOURCE_TRUNCATED", `stopped after ${maxFiles} session files`);
      }

      return { adapterId: ADAPTER_ID, events, warnings: warnings.toArray(), stats };
    },
  };
}
