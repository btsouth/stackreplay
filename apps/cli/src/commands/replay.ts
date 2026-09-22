import { readFile } from "node:fs/promises";
import type { AdapterId } from "@stackreplay/adapters";
import {
  type CoverageDimensionV1,
  stackReplayExportV1Schema,
  type UsageEventV1,
} from "@stackreplay/schema";
import { type CommandContext, EXIT_FAILED, EXIT_OK, usageError } from "../command.js";
import { flagValue, flagValues } from "../options.js";
import { formatCount } from "../output.js";
import { resolveTarget, runReplay } from "../replay-target.js";
import { checkRangeOrder, parseDateBound, utcDate } from "../runtime.js";

/**
 * `stackreplay replay <plan>`
 *
 * Replays a workload against a plan's actual mechanics. The workload comes
 * either from an existing export (`--input`) or from a fresh local scan, and
 * the rules instant is always explicit (`--as-of`, default today).
 */
export async function runReplayCommand(context: CommandContext): Promise<number> {
  const { renderer, runtime, args } = context;
  const reference = args.positionals[0];
  if (reference === undefined) {
    return usageError(
      context,
      "replay needs a plan",
      "Example: stackreplay replay example-cloud-starter --as-of 2026-09-21",
    );
  }
  const input = flagValue(args, "input");
  const compare = flagValue(args, "compare");
  const asOf = flagValue(args, "as-of");
  const asOfBound = asOf === undefined ? { ok: true as const } : parseDateBound(asOf, "since");
  if (!asOfBound.ok) return usageError(context, asOfBound.error);
  const rulesAsOf = (asOfBound.value ?? runtime.now.toISOString()).slice(0, 10);

  let events: readonly UsageEventV1[];
  let workloadSource: string;
  let range = { from: "1970-01-01T00:00:00.000Z", to: "9999-12-31T23:59:59.999Z" };
  let dedup = { exactDuplicates: 0, overlaps: 0 };
  let filteredOut = 0;
  let filtersApplied = false;

  if (input !== undefined) {
    // The advertised window and source filters apply to an imported workload
    // exactly as they do to a fresh scan; they used to be ignored silently
    // (benchmark finding F022).
    const since = flagValue(args, "since");
    const until = flagValue(args, "until");
    const sourceFilters = flagValues(args, "source") as AdapterId[];
    const sinceBound = since === undefined ? { ok: true as const } : parseDateBound(since, "since");
    if (!sinceBound.ok) return usageError(context, sinceBound.error);
    const untilBound = until === undefined ? { ok: true as const } : parseDateBound(until, "until");
    if (!untilBound.ok) return usageError(context, untilBound.error);
    const rangeProblem = checkRangeOrder(sinceBound.value, untilBound.value);
    if (rangeProblem !== undefined) return usageError(context, rangeProblem);

    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(input, "utf8"));
    } catch (error) {
      return failureWith(
        context,
        `could not read ${input}`,
        error instanceof Error ? error.message : undefined,
      );
    }
    const validated = stackReplayExportV1Schema.safeParse(parsed);
    if (!validated.success) {
      return failureWith(
        context,
        `${input} is not a valid StackReplay export`,
        validated.error.issues[0]?.message,
      );
    }
    const loaded = validated.data.events;
    const sinceMs = sinceBound.value === undefined ? undefined : Date.parse(sinceBound.value);
    const untilMs = untilBound.value === undefined ? undefined : Date.parse(untilBound.value);
    const selected = loaded.filter((event) => {
      const at = Date.parse(event.occurredAt);
      if (sinceMs !== undefined && at < sinceMs) return false;
      if (untilMs !== undefined && at >= untilMs) return false;
      if (sourceFilters.length > 0 && !sourceFilters.includes(event.source.adapterId as AdapterId))
        return false;
      return true;
    });
    filteredOut = loaded.length - selected.length;
    filtersApplied = sinceMs !== undefined || untilMs !== undefined || sourceFilters.length > 0;
    events = selected;
    workloadSource = input;
    range = validated.data.range;
    if (sinceBound.value !== undefined) range.from = sinceBound.value;
    if (untilBound.value !== undefined) range.to = untilBound.value;
  } else {
    const since = flagValue(args, "since");
    const until = flagValue(args, "until");
    const sinceBound = since === undefined ? { ok: true as const } : parseDateBound(since, "since");
    if (!sinceBound.ok) return usageError(context, sinceBound.error);
    const untilBound = until === undefined ? { ok: true as const } : parseDateBound(until, "until");
    if (!untilBound.ok) return usageError(context, untilBound.error);
    const rangeProblem = checkRangeOrder(sinceBound.value, untilBound.value);
    if (rangeProblem !== undefined) return usageError(context, rangeProblem);
    const collected = await runtime.collect({
      ...(sinceBound.value !== undefined ? { since: sinceBound.value } : {}),
      ...(untilBound.value !== undefined ? { until: untilBound.value } : {}),
      ...(flagValues(args, "source").length > 0
        ? { sources: flagValues(args, "source") as AdapterId[] }
        : {}),
    });
    events = collected.events;
    workloadSource = "local scan";
    if (sinceBound.value !== undefined) range.from = sinceBound.value;
    if (untilBound.value !== undefined) range.to = untilBound.value;
    dedup = {
      exactDuplicates: collected.stats.exactDuplicates,
      overlaps: collected.stats.overlaps,
    };
  }

  if (events.length === 0) {
    renderer.error("Error: the workload is empty, so there is nothing to replay.");
    renderer.error("Run `stackreplay detect` to see which local sources exist.");
    return EXIT_FAILED;
  }

  let result: ReturnType<typeof runReplay>;
  try {
    result = runReplay({
      events,
      target: resolveTarget(reference),
      catalog: runtime.catalog,
      context: { rulesAsOf },
    });
  } catch (error) {
    return failureWith(context, error instanceof Error ? error.message : String(error));
  }

  let comparison: ReturnType<typeof runReplay> | undefined;
  if (compare !== undefined) {
    try {
      comparison = runReplay({
        events,
        target: resolveTarget(compare),
        catalog: runtime.catalog,
        context: { rulesAsOf },
      });
    } catch (error) {
      return failureWith(context, error instanceof Error ? error.message : String(error));
    }
  }

  if (renderer.json) {
    renderer.jsonOutput({
      workloadSource,
      range,
      dedup,
      rulesAsOf,
      ...(filtersApplied ? { filteredOut } : {}),
      result,
      ...(comparison !== undefined ? { comparison } : {}),
    });
    return EXIT_OK;
  }

  const label = result.subscription?.name ?? result.versions.targetReference;
  renderer.heading(`StackReplay replay: ${label}`);
  renderer.line();
  renderer.field(
    "  Workload",
    `${formatCount(result.workload.eventCount)} event(s) from ${workloadSource}`,
  );
  if (filtersApplied) {
    renderer.field(
      "  Filters",
      `${formatCount(filteredOut)} event(s) excluded by the selected window or sources`,
    );
  }
  renderer.field("  Rules as of", rulesAsOf);
  renderer.field("  Plan version", result.versions.targetReference);
  if (result.workload.from !== undefined && result.workload.to !== undefined) {
    renderer.field("  Activity", `${result.workload.from} to ${result.workload.to}`);
  }
  renderer.line();

  renderer.heading("Feasibility");
  renderer.field("  Status", result.feasibility.status);
  if (result.feasibility.coveragePercent !== undefined) {
    renderer.field(
      `  Coverage (${result.feasibility.coverageDimension})`,
      `${result.feasibility.coveragePercent}%`,
    );
  } else if (result.feasibility.reason !== undefined) {
    renderer.field("  Coverage", `unknown (${result.feasibility.reason})`);
  }
  renderer.line();

  renderer.heading("Coverage dimensions");
  const dimensions: [string, CoverageDimensionV1][] = [
    ["requests", result.coverage.requests],
    ["usage", result.coverage.usage],
    ["models", result.coverage.models],
  ];
  for (const [name, dimension] of dimensions) {
    if (dimension.status === "known") {
      renderer.field(
        `  ${name}`,
        `${dimension.percent}% (${formatCount(dimension.covered ?? 0)} of ${formatCount(dimension.total ?? 0)})`,
      );
    } else {
      renderer.field(
        `  ${name}`,
        `unknown${dimension.unknownCount !== undefined ? ` (${formatCount(dimension.unknownCount)} indeterminate)` : ""}`,
      );
    }
  }
  renderer.line();

  if (result.constraints.length > 0) {
    renderer.heading("Constraints");
    for (const constraint of result.constraints) {
      renderer.line(`  ${constraint.label} [${constraint.kind}, ${constraint.window.description}]`);
      renderer.field(
        "    Consumption",
        `${constraint.consumedUnits} of ${constraint.limitUnits} ${constraint.unit} (${constraint.status})`,
      );
      renderer.field("    Attempted", `${constraint.attemptedUnits} ${constraint.unit}`);
      if (constraint.rejectedEvents > 0) {
        renderer.field("    Rejected events", formatCount(constraint.rejectedEvents));
      }
      if (constraint.indeterminateEvents > 0) {
        renderer.field("    Indeterminate", formatCount(constraint.indeterminateEvents));
      }
      if (constraint.overageUnits !== undefined) {
        renderer.field("    Overage", `${constraint.overageUnits} ${constraint.unit}`);
      }
    }
    renderer.line();
  }

  if (result.economics !== undefined) {
    renderer.heading("Cost");
    renderer.field("  Basis", result.economics.costBasis);
    if (result.economics.basePlanCost !== undefined) {
      renderer.field("  Plan cost", `$${result.economics.basePlanCost.amount}`);
    }
    if (result.economics.overageCost !== undefined) {
      renderer.field("  Overage cost", `$${result.economics.overageCost.amount}`);
    }
    renderer.field("  Target cost", `$${result.economics.targetCost.amount}`);
    if (result.economics.costDifference !== undefined) {
      renderer.field("  Difference", `$${result.economics.costDifference.amount}`);
    }
    renderer.line();
  }

  if (result.violations.length > 0) {
    renderer.heading("Violations");
    for (const violation of result.violations) {
      renderer.bullet(
        `${violation.type} in ${violation.constraintId}: ${violation.requiredUnits} required, ${violation.acceptedUnits} accepted ${violation.unit} (${formatCount(violation.affectedEvents)} event(s) affected)`,
      );
    }
    renderer.line();
  }

  if (result.unsupportedModels.length > 0) {
    renderer.heading("Models the target does not serve");
    for (const model of result.unsupportedModels.slice(0, 10)) {
      renderer.bullet(
        `${model.rawName} (${formatCount(model.eventCount)} event(s), ${model.reason})`,
      );
    }
    if (result.unsupportedModels.length > 10) {
      renderer.line(`  ... and ${formatCount(result.unsupportedModels.length - 10)} more`);
    }
    renderer.line();
  }

  if (comparison !== undefined) {
    renderer.heading("Comparison");
    renderer.field("  This target", `$${result.economics?.targetCost.amount ?? "-"}`);
    renderer.field(
      `  ${comparison.subscription?.name ?? comparison.versions.targetReference}`,
      `$${comparison.economics?.targetCost.amount ?? "-"}`,
    );
    renderer.line();
  }

  renderer.heading("Confidence");
  renderer.field("  Level", result.confidence.level);
  for (const factor of result.confidence.factors) {
    renderer.bullet(`${factor.id} (${factor.level}): ${factor.description}`);
  }
  renderer.line();

  if (result.warnings.length > 0) {
    renderer.heading("Warnings");
    for (const warning of result.warnings) {
      renderer.bullet(
        `${warning.code}: ${warning.message}${warning.eventCount !== undefined ? ` (${formatCount(warning.eventCount)} event(s))` : ""}`,
      );
    }
    renderer.line();
  }

  if (result.assumptions.length > 0) {
    renderer.heading("Assumptions");
    for (const assumption of result.assumptions) renderer.bullet(assumption.description);
    renderer.line();
  }

  renderer.line(`Replayed ${formatCount(result.workload.eventCount)} events against ${label}.`);
  renderer.line(
    `Engine ${result.versions.engine}, methodology ${result.versions.methodology}, catalog ${result.versions.catalog}.`,
  );
  return EXIT_OK;
}

function failureWith(context: CommandContext, message: string, hint?: string): number {
  context.renderer.error(`Error: ${message}`);
  if (hint !== undefined) context.renderer.error(hint);
  return EXIT_FAILED;
}

/** Exposed for `--as-of` defaults in tests. */
export function defaultRulesAsOf(now: Date): string {
  return utcDate(now);
}
