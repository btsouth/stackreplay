import { writeFile } from "node:fs/promises";
import { type AdapterId, createExport } from "@stackreplay/adapters";
import { stackReplayExportV1Schema } from "@stackreplay/schema";
import { type CommandContext, EXIT_FAILED, EXIT_OK, usageError } from "../command.js";
import { flagValue, flagValues } from "../options.js";
import { formatCount } from "../output.js";
import { checkRangeOrder, parseDateBound, utcDate } from "../runtime.js";

/**
 * `stackreplay export`
 *
 * Writes the sanitized, versioned export (spec point 10). The export is
 * validated against the schema before it is written, so a malformed artifact
 * can never leave the machine, and the redaction report travels inside it.
 */
export async function runExport(context: CommandContext): Promise<number> {
  const { renderer, runtime, args } = context;
  const since = flagValue(args, "since");
  const until = flagValue(args, "until");
  const input = flagValue(args, "input");
  const sources = flagValues(args, "source") as AdapterId[];
  const out = flagValue(args, "out");

  const sinceBound = since === undefined ? { ok: true as const } : parseDateBound(since, "since");
  if (!sinceBound.ok) return usageError(context, sinceBound.error);
  const untilBound = until === undefined ? { ok: true as const } : parseDateBound(until, "until");
  if (!untilBound.ok) return usageError(context, untilBound.error);
  const rangeProblem = checkRangeOrder(sinceBound.value, untilBound.value);
  if (rangeProblem !== undefined) return usageError(context, rangeProblem);

  // An explicit import that does not exist is a user error, not an empty
  // workload: `export --input missing.json` used to write an empty export and
  // exit 0 (benchmark finding F021).
  if (input !== undefined) {
    const info = await runtime.env.fs.stat(input);
    if (info === null) {
      return usageError(context, `--input ${input} does not exist`);
    }
    if (info.kind !== "file") {
      return usageError(context, `--input ${input} is not a file`);
    }
  }

  const result = await runtime.collect({
    ...(sinceBound.value !== undefined ? { since: sinceBound.value } : {}),
    ...(untilBound.value !== undefined ? { until: untilBound.value } : {}),
    ...(sources.length > 0 ? { sources } : {}),
    ...(input !== undefined ? { inputFile: input } : {}),
  });

  // A readable import that yields nothing is reported rather than exported as
  // an empty workload: either the file could not be read/parsed, or the window
  // excluded every row. Both are silent-data-loss shapes.
  if (input !== undefined) {
    const importedEvents = result.events.filter((event) => event.source.adapterId === "ccusage");
    if (importedEvents.length === 0) {
      const importWarnings = result.warnings.filter(
        (warning) =>
          warning.code === "SOURCE_UNREADABLE" ||
          warning.code === "SOURCE_LAYOUT_UNSUPPORTED" ||
          warning.code === "RECORD_MALFORMED",
      );
      return failureWith(
        context,
        `--input ${input} produced no events, so there is nothing to export`,
        importWarnings.length > 0
          ? importWarnings.map((warning) => `${warning.code}: ${warning.message}`).join("; ")
          : "Every row in the file falls outside the selected window.",
      );
    }
  }

  const range = {
    from: sinceBound.value ?? "1970-01-01T00:00:00.000Z",
    to: untilBound.value ?? "9999-12-31T23:59:59.999Z",
  };
  const exported = createExport(result, {
    range,
    collectorVersion: runtime.collectorVersion,
    generatedAt: runtime.now.toISOString(),
  });

  const parsed = stackReplayExportV1Schema.safeParse(exported);
  if (!parsed.success) {
    return failureWith(
      context,
      "internal error: the export did not validate",
      parsed.error.issues[0]?.message,
    );
  }

  const target = out ?? `./stackreplay-${utcDate(runtime.now)}.stackreplay.json`;
  const serialized = `${JSON.stringify(exported, null, 2)}\n`;
  if (target === "-") {
    renderer.jsonOutput(exported);
    return EXIT_OK;
  }
  try {
    await writeFile(target, serialized, { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    return failureWith(
      context,
      `could not write ${target}`,
      error instanceof Error ? error.message : undefined,
    );
  }

  if (renderer.json) {
    renderer.jsonOutput({
      output: target,
      bytes: Buffer.byteLength(serialized, "utf8"),
      events: exported.events.length,
      range: exported.range,
      detectedSources: exported.detectedSources,
      redactionReport: exported.redactionReport,
      dedup: { exactDuplicates: result.stats.exactDuplicates, overlaps: result.stats.overlaps },
      collectionWarnings: exported.collectionWarnings ?? [],
    });
    return EXIT_OK;
  }

  renderer.heading("StackReplay export");
  renderer.line();
  renderer.field("  File", target);
  renderer.field("  Events", formatCount(exported.events.length));
  renderer.field("  Range", `${exported.range.from} to ${exported.range.to}`);
  renderer.line();

  // Truncated or partially decoded histories used to export with no signal at
  // all (benchmark finding F020). The warnings travel inside the artifact and
  // are printed here.
  if (result.warnings.length > 0) {
    renderer.heading(`Collection warnings (${formatCount(result.warnings.length)})`);
    for (const warning of result.warnings) {
      renderer.bullet(`${warning.code}: ${warning.message}`);
    }
    renderer.line("  These warnings are recorded in the export as collectionWarnings.");
    renderer.line();
  }

  renderer.heading("Redaction report");
  renderer.field("  Prompts included", "no");
  renderer.field("  Responses included", "no");
  renderer.field("  Source code included", "no");
  renderer.field("  File paths included", "no");
  renderer.field("  Repository names included", "no");
  renderer.line();
  renderer.line("The file contains token counts, model names, timestamps and salted hashes only.");
  renderer.line(`Replay it with: stackreplay replay <plan> --input ${target}`);
  return EXIT_OK;
}

function failureWith(context: CommandContext, message: string, hint: string | undefined): number {
  context.renderer.error(`Error: ${message}`);
  if (hint !== undefined) context.renderer.error(hint);
  return EXIT_FAILED;
}
