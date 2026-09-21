import { createRequire } from "node:module";
import { type CommandContext, describeError, EXIT_FAILED, EXIT_OK, EXIT_USAGE } from "./command.js";
import { runDetect } from "./commands/detect.js";
import { runDoctor } from "./commands/doctor.js";
import { runExport } from "./commands/export.js";
import { runPlans } from "./commands/plans.js";
import { runReplayCommand } from "./commands/replay.js";
import { runScan } from "./commands/scan.js";
import { flagValue, hasFlag, type ParsedArgs, parseArgs } from "./options.js";
import { type CliIo, Renderer, resolveRenderOptions } from "./output.js";
import { type CliRuntime, createRuntime } from "./runtime.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

export const CLI_NAME = "stackreplay";
export const CLI_DESCRIPTION =
  "Replay your real AI coding workload against other execution targets.";

export const HELP_TEXT = `${CLI_NAME} ${pkg.version}

${CLI_DESCRIPTION}

Usage
  ${CLI_NAME} <command> [options]

Commands
  detect            Find local agent histories and report what is readable
  scan              Read them and summarize the workload (read-only)
  export            Write a sanitized, versioned export file
  replay <plan>     Replay the workload against a plan's real mechanics
  plans             List plans in the bundled catalog
  doctor            Diagnose sources, catalog and local state

Options
  --json            Machine-readable output on stdout
  --since <date>    Inclusive lower bound (YYYY-MM-DD or ISO timestamp)
  --until <date>    Upper bound (times are exclusive; a bare date includes that day)
  --source <id>     Restrict to one source (repeatable)
  --input <file>    Replay or import a file (export JSON, or ccusage JSON)
  --as-of <date>    Rules instant for replay (default: today)
  --compare <plan>  Replay the same workload against a second plan
  --out <file>      Export destination ("-" writes to stdout)
  --no-color        Disable color
  -h, --help        Show help
  -v, --version     Show the CLI version

Exit codes
  0 success   1 usage error   2 operation failed

Privacy
  Scanning is local and offline. Prompts, responses, file contents, file paths
  and repository names are never read or exported; project and session
  identifiers leave this machine only as salted hashes.
`;

const COMMAND_HELP: Record<string, string> = {
  detect: `Usage: ${CLI_NAME} detect [--source <id>] [--json]

Lists every local source StackReplay knows about: whether it was found,
whether its layout is readable, and how many sessions it holds.
Read-only. Creates no local state.`,
  scan: `Usage: ${CLI_NAME} scan [--since <date>] [--until <date>] [--source <id>]... [--input <file>] [--json]

Reads the local histories and summarizes the workload: events, sessions,
projects, disjoint token buckets, models and warnings. Writes nothing.
Events whose token set is incomplete are reported as unknown, never estimated.`,
  export: `Usage: ${CLI_NAME} export [--out <file>] [--since <date>] [--until <date>] [--source <id>]... [--input <file>] [--json]

Writes the sanitized StackReplay export (format version 1) including the
redaction report. The file contains token counts, model names, timestamps,
salted project and session hashes, and nothing else.`,
  replay: `Usage: ${CLI_NAME} replay <plan-id|plan-id@effective-from> [--input <export.json>] [--as-of <date>] [--compare <plan>] [--json]

Replays the workload against the plan's actual mechanics: windows, limits,
model rules, promotions and overage. Without --input the workload comes from
a fresh local scan. --as-of selects the rule snapshot (default: today).`,
  plans: `Usage: ${CLI_NAME} plans [--plan <id>] [--as-of <date>] [--json]

Lists plans in the bundled catalog with prices, limits, model rules and
verification status for the version effective at the rules instant.`,
  doctor: `Usage: ${CLI_NAME} doctor [--json]

Checks the runtime, the bundled catalog, the local salt and every source,
and explains what to do about anything that is missing. Read-only.`,
};

export interface CliDependencies {
  runtime?: CliRuntime;
  platform?: string;
  homeDir?: string;
  env?: Record<string, string | undefined>;
  now?: Date;
  collectorVersion?: string;
}

const COMMANDS: Record<
  string,
  { run: (context: CommandContext) => Promise<number>; allowPositionals: number }
> = {
  detect: { run: runDetect, allowPositionals: 0 },
  scan: { run: runScan, allowPositionals: 0 },
  export: { run: runExport, allowPositionals: 0 },
  replay: { run: runReplayCommand, allowPositionals: 1 },
  plans: { run: runPlans, allowPositionals: 0 },
  doctor: { run: runDoctor, allowPositionals: 0 },
};

export async function runCli(
  argv: readonly string[],
  io: CliIo,
  dependencies: CliDependencies = {},
): Promise<number> {
  const [first, ...rest] = argv;

  if (first === undefined || first === "help" || first === "-h" || first === "--help") {
    if (rest.length > 0) {
      const topic = COMMAND_HELP[rest[0] ?? ""];
      if (topic !== undefined && rest.length === 1) {
        io.stdout(topic);
        return EXIT_OK;
      }
      io.stderr(`Unexpected arguments: ${rest.join(" ")}\n\n${HELP_TEXT}`);
      return EXIT_USAGE;
    }
    io.stdout(HELP_TEXT);
    return EXIT_OK;
  }

  if (first === "version" || first === "-v" || first === "--version") {
    if (rest.length > 0) {
      io.stderr(`Unexpected arguments: ${rest.join(" ")}\n\n${HELP_TEXT}`);
      return EXIT_USAGE;
    }
    io.stdout(pkg.version);
    return EXIT_OK;
  }

  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    io.stderr(`Error: ${parsed.error}\n\n${HELP_TEXT}`);
    return EXIT_USAGE;
  }
  const args: ParsedArgs = parsed.value;
  const command = COMMANDS[args.command];
  if (command === undefined) {
    io.stderr(`Unknown command: ${args.command}\n\n${HELP_TEXT}`);
    return EXIT_USAGE;
  }

  const wantsHelp = hasFlag(args, "help");
  const renderer = new Renderer(
    io,
    resolveRenderOptions(io, { json: hasFlag(args, "json"), noColor: hasFlag(args, "no-color") }),
  );
  if (wantsHelp) {
    io.stdout(COMMAND_HELP[args.command] ?? HELP_TEXT);
    return EXIT_OK;
  }
  if (args.positionals.length > command.allowPositionals) {
    const extra = args.positionals.slice(command.allowPositionals).join(" ");
    io.stderr(`Unexpected arguments: ${extra}\n\n${COMMAND_HELP[args.command] ?? HELP_TEXT}`);
    return EXIT_USAGE;
  }
  if (flagValue(args, "source") !== undefined) {
    const known = new Set([
      "command-code",
      "opencode",
      "codex",
      "claude-code",
      "hermes",
      "t3-code",
      "ccusage",
    ]);
    for (const source of args.flags.get("source") ?? []) {
      if (!known.has(source)) {
        io.stderr(`Error: unknown source "${source}"\n\nKnown sources: ${[...known].join(", ")}`);
        return EXIT_USAGE;
      }
    }
  }

  try {
    const runtime =
      dependencies.runtime ??
      (await createRuntime({
        ...(dependencies.platform !== undefined ? { platform: dependencies.platform } : {}),
        ...(dependencies.homeDir !== undefined ? { homeDir: dependencies.homeDir } : {}),
        ...(dependencies.env !== undefined ? { env: dependencies.env } : {}),
        ...(dependencies.now !== undefined ? { now: dependencies.now } : {}),
        collectorVersion: dependencies.collectorVersion ?? pkg.version,
      }));
    const exitCode = await command.run({ args, runtime, renderer });
    renderer.flush();
    return exitCode;
  } catch (error) {
    renderer.flush();
    io.stderr(`Error: ${describeError(error)}`);
    return EXIT_FAILED;
  }
}
