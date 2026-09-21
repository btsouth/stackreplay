import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

export const CLI_NAME = "stackreplay";
export const CLI_DESCRIPTION =
  "Replay your real AI coding workload against other execution targets.";

export const HELP_TEXT = `${CLI_NAME} ${pkg.version}

${CLI_DESCRIPTION}

Usage
  ${CLI_NAME} [command] [options]

Options
  -h, --help      Show this help
  -v, --version   Show the CLI version

Not yet implemented: detect, scan, export, replay, plans, doctor.`;

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

/** Pure argument handling so it can be tested without spawning a process. */
export function runCli(argv: readonly string[], io: CliIo): number {
  const [first] = argv;

  if (argv.length > 1) {
    io.stderr(`Unexpected arguments: ${argv.slice(1).join(" ")}\n\n${HELP_TEXT}`);
    return 1;
  }

  if (first === undefined || first === "--help" || first === "-h" || first === "help") {
    io.stdout(HELP_TEXT);
    return 0;
  }

  if (first === "--version" || first === "-v" || first === "version") {
    io.stdout(pkg.version);
    return 0;
  }

  io.stderr(`Unknown command: ${first}\n\n${HELP_TEXT}`);
  return 1;
}
