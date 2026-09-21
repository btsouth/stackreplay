import type { AdapterId } from "@stackreplay/adapters";
import { type CommandContext, EXIT_OK, usageError } from "../command.js";
import { flagValue, flagValues } from "../options.js";
import { formatCount } from "../output.js";
import { checkRangeOrder, parseDateBound } from "../runtime.js";
import { summarizeEvents } from "../summary.js";

/**
 * `stackreplay scan`
 *
 * Reads the local histories and prints what they contain. Nothing is written
 * anywhere: scan is the read-only inspection step before an export.
 */
export async function runScan(context: CommandContext): Promise<number> {
  const { renderer, runtime, args } = context;
  const since = flagValue(args, "since");
  const until = flagValue(args, "until");
  const input = flagValue(args, "input");
  const sources = flagValues(args, "source") as AdapterId[];

  const sinceBound = since === undefined ? { ok: true as const } : parseDateBound(since, "since");
  if (!sinceBound.ok) return usageError(context, sinceBound.error);
  const untilBound = until === undefined ? { ok: true as const } : parseDateBound(until, "until");
  if (!untilBound.ok) return usageError(context, untilBound.error);
  const rangeProblem = checkRangeOrder(sinceBound.value, untilBound.value);
  if (rangeProblem !== undefined) return usageError(context, rangeProblem);

  const result = await runtime.collect({
    ...(sinceBound.value !== undefined ? { since: sinceBound.value } : {}),
    ...(untilBound.value !== undefined ? { until: untilBound.value } : {}),
    ...(sources.length > 0 ? { sources } : {}),
    ...(input !== undefined ? { inputFile: input } : {}),
  });
  const summary = summarizeEvents(result.events);

  if (renderer.json) {
    renderer.jsonOutput({
      range: { from: sinceBound.value, to: untilBound.value },
      sources: result.detectedSources,
      summary,
      dedup: {
        exactDuplicates: result.stats.exactDuplicates,
        overlaps: result.stats.overlaps,
      },
      attribution: {
        sessionsMapped: result.attribution.sessionsMapped,
        rootsAdded: result.attribution.rootsAdded,
      },
      warnings: result.warnings,
    });
    return EXIT_OK;
  }

  renderer.heading("StackReplay scan");
  renderer.line();
  renderer.field("  Events", formatCount(summary.events));
  renderer.field("  Sessions", formatCount(summary.sessions));
  renderer.field("  Projects", formatCount(summary.projects));
  if (summary.firstEventAt !== undefined && summary.lastEventAt !== undefined) {
    renderer.field("  Activity", `${summary.firstEventAt} to ${summary.lastEventAt}`);
  }
  renderer.line();

  renderer.heading("Sources");
  for (const source of result.detectedSources) {
    if (!source.detected || !source.supported) continue;
    const count =
      summary.perSource.find((entry) => entry.adapterId === source.adapterId)?.events ?? 0;
    renderer.field(`  ${source.name}`, `${formatCount(count)} event(s)`);
  }
  if (summary.perSource.length === 0) renderer.line("  No events in the selected range.");
  renderer.line();

  renderer.heading("Token usage (disjoint canonical buckets)");
  renderer.field("  Uncached input", formatCount(summary.tokens.buckets.uncachedInputTokens));
  renderer.field("  Cache read", formatCount(summary.tokens.buckets.cacheReadTokens));
  renderer.field("  Cache write", formatCount(summary.tokens.buckets.cacheWriteTokens));
  renderer.field("  Output", formatCount(summary.tokens.buckets.outputTokens));
  renderer.field("  Reasoning", formatCount(summary.tokens.buckets.reasoningTokens));
  renderer.field("  Total (known events)", formatCount(summary.tokens.known));
  if (summary.tokens.unknownEvents > 0) {
    renderer.line();
    renderer.line(
      `  ${formatCount(summary.tokens.unknownEvents)} event(s) report an incomplete token set:`,
    );
    renderer.line(
      `  their totals are unknown. Reported part of those events: ${formatCount(summary.tokens.lowerBound)} tokens.`,
    );
    if (summary.tokens.reasoningUnknownEvents > 0) {
      renderer.line(
        `  ${formatCount(summary.tokens.reasoningUnknownEvents)} event(s) do not report reasoning at all.`,
      );
    }
  }
  renderer.line();

  if (summary.models.length > 0) {
    renderer.heading("Models");
    for (const model of summary.models.slice(0, 12)) {
      const mapped = model.canonicalId === undefined ? "unmapped" : model.canonicalId;
      renderer.field(
        `  ${model.rawName.slice(0, 20)}`,
        `${formatCount(model.events)} event(s)  ${mapped}`,
      );
    }
    if (summary.models.length > 12) {
      renderer.line(`  ... and ${formatCount(summary.models.length - 12)} more`);
    }
    renderer.line();
  }

  if (result.stats.exactDuplicates > 0 || result.stats.overlaps > 0) {
    renderer.heading("Deduplication");
    renderer.field("  Exact duplicates removed", formatCount(result.stats.exactDuplicates));
    renderer.field("  Overlaps resolved", formatCount(result.stats.overlaps));
    renderer.line();
  }

  if (result.warnings.length > 0) {
    renderer.heading("Warnings");
    for (const warning of result.warnings) renderer.bullet(`${warning.code}: ${warning.message}`);
    renderer.line();
  }

  renderer.line(
    "Nothing was uploaded. Project paths and session ids are hashed locally with a salt",
  );
  renderer.line("that never leaves this machine.");
  return EXIT_OK;
}
