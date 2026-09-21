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
import { decimalStringFromNumber, epochMsFromIso } from "../identity.js";
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
 * Command Code adapter.
 *
 * Source: `~/.commandcode/projects/<project>/<session>.jsonl` plus a sibling
 * `.meta.json`. Records are `session`, `message` and `model_change` lines;
 * assistant `message` records carry a `usage` object:
 * `{ inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, costUsd }`.
 *
 * Accounting (docs/ADAPTERS.md; read from the installed client, version
 * 1.58.0, `dist/cli.mjs`): the client derives the uncached input as
 * `inputTokens - cacheReadTokens - cacheWriteTokens`, which means both cache
 * categories are subsets of `inputTokens`. The same cost routine bills
 * `outputTokens` at a single rate with no separate reasoning charge, and
 * `cacheWriteTokens1h` is a subset of `cacheWriteTokens`, so it is not added
 * again. Reasoning is therefore a known absence of a separate category.
 */

const ADAPTER_ID = "command-code" as const;

export function commandCodeRoots(env: SourceEnvironment): string[] {
  return [joinPath(env.platform, env.homeDir, ".commandcode", "projects")];
}

function commandCodeUsage(usage: Record<string, unknown>): {
  usage: TextUsageV1 | undefined;
  cacheEstablished: boolean;
} {
  const inputTokens = readCount(usage, "inputTokens");
  const outputTokens = readCount(usage, "outputTokens");
  const cacheReadTokens = readCount(usage, "cacheReadTokens");
  const cacheWriteTokens = readCount(usage, "cacheWriteTokens");
  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    cacheReadTokens === undefined &&
    cacheWriteTokens === undefined
  ) {
    return { usage: undefined, cacheEstablished: true };
  }
  const result: TextUsageV1 = {
    reasoningTokens: 0,
    accounting: {
      reasoningIncludedInOutput: false,
    },
  };
  const cacheTotal = (cacheReadTokens ?? 0) + (cacheWriteTokens ?? 0);
  const cacheEstablished = inputTokens !== undefined ? cacheTotal <= inputTokens : cacheTotal === 0;
  // A declaration is attached only to a category the record actually reports:
  // `true` means "already included in input", which is impossible to state for
  // an absent quantity (decision 22), and the canonical schema rejects it.
  // When the subset relationship does not hold, the cache categories are
  // reported as unknown rather than publishing an impossible accounting.
  if (cacheEstablished && cacheReadTokens !== undefined) {
    result.accounting = { ...result.accounting, cacheReadIncludedInInput: true };
    result.cacheReadTokens = cacheReadTokens;
  }
  if (cacheEstablished && cacheWriteTokens !== undefined) {
    result.accounting = { ...result.accounting, cacheWriteIncludedInInput: true };
    result.cacheWriteTokens = cacheWriteTokens;
  }
  if (inputTokens !== undefined) result.inputTokens = inputTokens;
  if (outputTokens !== undefined) result.outputTokens = outputTokens;
  return { usage: result, cacheEstablished };
}

export function createCommandCodeAdapter(): LocalSourceAdapter {
  return {
    id: ADAPTER_ID,
    name: "Command Code",
    kind: "usage",

    defaultRoots: commandCodeRoots,

    async detect(env: SourceEnvironment) {
      const probes: PathProbe[] = [];
      let sessionCount = 0;
      let supported = true;
      for (const root of commandCodeRoots(env)) {
        const info = await env.fs.stat(root);
        const exists = info !== null;
        const readable = exists && info.kind === "directory";
        let rootSessionCount: number | undefined;
        if (readable) {
          const files = (
            await listFilesRecursive(env, root, { maxDepth: 2, extension: ".jsonl" })
          ).filter((file) => !file.endsWith(".checkpoints.jsonl"));
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
        name: "Command Code",
        kind: "usage" as const,
        detected,
        supported,
        probes,
        ...(detected
          ? supported
            ? { note: `${sessionCount} session file(s) found` }
            : { note: "history directory exists but contains no session files" }
          : { note: "no Command Code history found" }),
      };
    },

    async collect(env: SourceEnvironment, options: CollectOptions): Promise<CollectResult> {
      const warnings = new WarningCollector();
      const stats = emptyStats();
      const events: CollectResult["events"] = [];
      const roots = options.roots ?? commandCodeRoots(env);
      const maxFiles = effectiveMaxFiles(options);
      const maxBytes = effectiveMaxFileBytes(options);
      let truncated = false;

      for (const root of roots) {
        const files = (
          await listFilesRecursive(env, root, { maxDepth: 2, extension: ".jsonl" })
        ).filter((file) => !file.endsWith(".checkpoints.jsonl"));
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
          let projectKey: string | undefined = projectSlug;
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
            if (type === "session") {
              sessionId = readString(record, "id") ?? sessionId;
              const cwd = readString(record, "cwd");
              if (cwd !== undefined) projectKey = cwd;
              continue;
            }
            if (type !== "message") continue;
            const message = asRecord(record.message);
            if (message === undefined) continue;
            if (readString(message, "role") !== "assistant") continue;
            const usageRecord = asRecord(record.usage);
            if (usageRecord === undefined) continue;
            const rawModel = readString(record, "model");
            if (rawModel === undefined) {
              warnings.add("MODEL_UNKNOWN", "assistant record reports no model", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            const { usage, cacheEstablished } = commandCodeUsage(usageRecord);
            if (usage === undefined) {
              warnings.add("USAGE_MISSING", "assistant record reports no token usage", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            if (!cacheEstablished) {
              warnings.add(
                "ACCOUNTING_UNESTABLISHED",
                "cache categories exceed inputTokens in this record; cache reported as unknown",
                file,
              );
            }
            const timestamp = readString(record, "timestamp");
            const occurredAtMs = timestamp === undefined ? undefined : epochMsFromIso(timestamp);
            if (occurredAtMs === undefined) {
              warnings.add("TIMESTAMP_INVALID", "assistant record has no usable timestamp", file);
              stats.recordsUnsupported += 1;
              continue;
            }
            if (!inWindow(occurredAtMs, options)) continue;
            const identity = readString(record, "id") ?? `${occurredAtMs}#${lineIndex}`;
            const costUsd = readCount(usageRecord, "costUsd") ?? undefined;
            const rawCost =
              typeof usageRecord.costUsd === "number" ? usageRecord.costUsd : undefined;
            const nativeCost = rawCost !== undefined ? decimalStringFromNumber(rawCost) : undefined;
            void costUsd;
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
                  projectKey,
                  harnessId: HARNESS_IDS["command-code"],
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
