import { type CommandContext, EXIT_OK } from "../command.js";
import { flagValue } from "../options.js";
import { formatCount } from "../output.js";

/**
 * `stackreplay detect`
 *
 * Reports which local agent histories exist, whether StackReplay can read
 * them, and what it would read. Read-only: detection never modifies a source
 * and never creates local state.
 */
export async function runDetect(context: CommandContext): Promise<number> {
  const { renderer, runtime, args } = context;
  const only = flagValue(args, "source");
  const sources = await runtime.detect();
  const filtered =
    only === undefined ? sources : sources.filter((source) => source.adapterId === only);

  if (renderer.json) {
    renderer.jsonOutput({
      platform: runtime.env.platform,
      sources: filtered,
    });
    return EXIT_OK;
  }

  renderer.heading("StackReplay source detection");
  renderer.line();
  for (const source of filtered) {
    const state = source.detected
      ? source.supported
        ? "detected"
        : "detected, unsupported"
      : "not found";
    const detail = source.note ?? "";
    renderer.field(`  ${source.name}`, `${state.padEnd(22, " ")}${detail}`);
  }
  const detected = filtered.filter((source) => source.detected && source.supported);
  renderer.line();
  renderer.line(
    `${formatCount(detected.length)} readable source(s). Detection is read-only and uses no network.`,
  );
  if (detected.length === 0) {
    renderer.line();
    renderer.line("Nothing to scan yet. Run an agent (Claude Code, Codex, OpenCode, Command Code");
    renderer.line("or Hermes) once, or import an existing ccusage export with --input <file>.");
  }
  return EXIT_OK;
}
