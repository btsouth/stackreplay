/**
 * Argument parsing.
 *
 * Deliberately small and dependency-free: StackReplay's CLI must stay usable
 * from a bare `npx` invocation with no install step. Parsing is strict, so a
 * mistyped flag is a usage error rather than a silently ignored argument.
 */

export interface ParsedArgs {
  command: string;
  positionals: string[];
  flags: Map<string, string[]>;
}

export type ParseResult = { ok: true; value: ParsedArgs } | { ok: false; error: string };

const FLAGS_WITH_VALUES = new Set([
  "since",
  "until",
  "source",
  "input",
  "out",
  "as-of",
  "compare",
  "plan",
  "project",
  "format",
]);

const BOOLEAN_FLAGS = new Set(["json", "help", "quiet", "no-color", "all"]);

export function parseArgs(argv: readonly string[]): ParseResult {
  const [command, ...rest] = argv;
  if (command === undefined) return { ok: false, error: "no command" };
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();
  const add = (name: string, value: string): void => {
    const existing = flags.get(name);
    if (existing === undefined) flags.set(name, [value]);
    else existing.push(value);
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === undefined) continue;
    if (token === "--") {
      positionals.push(...rest.slice(index + 1));
      break;
    }
    if (!token.startsWith("--")) {
      if (token.startsWith("-") && token.length > 1) {
        return { ok: false, error: `unknown option ${token}` };
      }
      positionals.push(token);
      continue;
    }
    const withoutPrefix = token.slice(2);
    const equals = withoutPrefix.indexOf("=");
    const name = equals === -1 ? withoutPrefix : withoutPrefix.slice(0, equals);
    const inlineValue = equals === -1 ? undefined : withoutPrefix.slice(equals + 1);
    if (BOOLEAN_FLAGS.has(name)) {
      if (inlineValue !== undefined) return { ok: false, error: `--${name} takes no value` };
      add(name, "true");
      continue;
    }
    if (FLAGS_WITH_VALUES.has(name)) {
      if (inlineValue !== undefined) {
        add(name, inlineValue);
        continue;
      }
      const next = rest[index + 1];
      if (next === undefined || next.startsWith("--")) {
        return { ok: false, error: `--${name} requires a value` };
      }
      add(name, next);
      index += 1;
      continue;
    }
    return { ok: false, error: `unknown option --${name}` };
  }

  return { ok: true, value: { command, positionals, flags } };
}

export function flagValues(args: ParsedArgs, name: string): string[] {
  return args.flags.get(name) ?? [];
}

export function flagValue(args: ParsedArgs, name: string): string | undefined {
  return flagValues(args, name).at(-1);
}

export function hasFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.has(name);
}
