import type { TextUsageV1 } from "@stackreplay/schema";
import { buildEvent, eventContext, HARNESS_IDS, providerIdForModel } from "../event-builder.js";
import {
  baseName,
  dirName,
  effectiveMaxFileBytes,
  effectiveMaxFiles,
  filePredatesWindow,
  inWindow,
  listFilesRecursive,
} from "../files.js";
import { epochMsFromIso } from "../identity.js";
import { asRecord, parseJsonLine, readCount, readString } from "../parse.js";
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
 * Claude Code adapter (spec point 15).
 *
 * Source: `~/.claude/projects/<project>/<session>.jsonl`. One JSON object per
 * line; assistant lines carry `message.usage` for a single API response.
 *
 * Accounting (docs/ADAPTERS.md; verified against Anthropic's documented usage
 * semantics and against 900+ local assistant records):
 * - `input_tokens` is the uncached input, so `cache_read_input_tokens` and
 *   `cache_creation_input_tokens` are additional to it (locally, cache reads
 *   exceed `input_tokens` in the overwhelming majority of records, which is
 *   only possible if they are not a subset).
 * - Extended thinking tokens are billed as output tokens and are not reported
 *   as a separate category, so the canonical reasoning bucket is an explicit
 *   zero: a known absence of a separate category, not an invented value.
 */

const ADAPTER_ID = "claude-code" as const;

export function claudeCodeRoots(env: SourceEnvironment): string[] {
  return [joinPath(env.platform, env.homeDir, ".claude", "projects")];
}

export function claudeUsage(usage: Record<string, unknown>): TextUsageV1 | undefined {
  const inputTokens = readCount(usage, "input_tokens");
  const outputTokens = readCount(usage, "output_tokens");
  const cacheReadTokens = readCount(usage, "cache_read_input_tokens");
  const cacheWriteTokens = readCount(usage, "cache_creation_input_tokens");
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    cacheReadTokens === undefined &&
    cacheWriteTokens === undefined
  ) {
    return undefined;
  }
  const result: TextUsageV1 = {
    reasoningTokens: 0,
    accounting: {
      cacheReadIncludedInInput: false,
      cacheWriteIncludedInInput: false,
      reasoningIncludedInOutput: false,
    },
  };
  if (inputTokens !== undefined) result.inputTokens = inputTokens;
  if (outputTokens !== undefined) result.outputTokens = outputTokens;
  if (cacheReadTokens !== undefined) result.cacheReadTokens = cacheReadTokens;
  if (cacheWriteTokens !== undefined) result.cacheWriteTokens = cacheWriteTokens;
  return result;
}

export function createClaudeCodeAdapter(): LocalSourceAdapter {
  return {
    id: ADAPTER_ID,
    name: "Claude Code",
    kind: "usage",

    defaultRoots: claudeCodeRoots,

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      let sessionCount = 0;
      let supported = true;
      for (const root of claudeCodeRoots(env)) {
        const info = await env.fs.stat(root);
        const exists = info !== null;
        const readable = exists && info.kind === "directory";
        let rootSessionCount: number | undefined;
        if (readable) {
          const files = await listFilesRecursive(env, root, { maxDepth: 2, extension: ".jsonl" });
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
        name: "Claude Code",
        kind: "usage" as const,
        detected,
        supported,
        probes,
        ...(detected
          ? supported
            ? { note: `${sessionCount} session file(s) found` }
            : { note: "history directory exists but contains no session files" }
          : { note: "no Claude Code history found" }),
      };
    },

    async collect(env: SourceEnvironment, options: CollectOptions): Promise<CollectResult> {
      const warnings = new WarningCollector();
      const stats = emptyStats();
      const events: CollectResult["events"] = [];
      const roots = options.roots ?? claudeCodeRoots(env);
      const maxFiles = effectiveMaxFiles(options);
      const maxBytes = effectiveMaxFileBytes(options);
      let truncated = false;

      for (const root of roots) {
        const files = await listFilesRecursive(env, root, { maxDepth: 2, extension: ".jsonl" });
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
          const projectSlug = baseName(env, dirName(env, file));
          let sessionId = baseName(env, file).replace(/\.jsonl$/u, "");
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
            if (readString(record, "type") !== "assistant") continue;
            const message = asRecord(record.message);
            if (message === undefined) continue;
            const usageRecord = asRecord(message.usage);
            if (usageRecord === undefined) continue;
            const rawModel = readString(message, "model");
            if (rawModel === undefined || rawModel === "<synthetic>") {
              warnings.add("MODEL_UNKNOWN", "assistant record reports no usable model", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            const usage = claudeUsage(usageRecord);
            if (usage === undefined) {
              warnings.add("USAGE_MISSING", "assistant record reports no token usage", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            const timestamp = readString(record, "timestamp");
            const occurredAtMs = timestamp === undefined ? undefined : epochMsFromIso(timestamp);
            if (occurredAtMs === undefined) {
              warnings.add("TIMESTAMP_INVALID", "assistant record has no usable timestamp", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            if (!inWindow(occurredAtMs, options)) continue;
            sessionId = readString(record, "sessionId") ?? sessionId;
            const identity = readString(record, "uuid") ?? `${occurredAtMs}#${lineIndex}`;
            const projectKey = readString(record, "cwd") ?? projectSlug;
            events.push(
              buildEvent(
                {
                  adapterId: ADAPTER_ID,
                  sessionId,
                  identity,
                  occurredAtMs,
                  rawModel,
                  usage,
                  projectKey,
                  harnessId: HARNESS_IDS["claude-code"],
                  ...(providerIdForModel(options.mapper, rawModel) !== undefined
                    ? { providerId: providerIdForModel(options.mapper, rawModel) as string }
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
