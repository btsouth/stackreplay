import type { ParsedArgs } from "./options.js";
import type { Renderer } from "./output.js";
import type { CliRuntime } from "./runtime.js";

/** Shared shape every command receives. */
export interface CommandContext {
  args: ParsedArgs;
  runtime: CliRuntime;
  renderer: Renderer;
}

export const EXIT_OK = 0;
export const EXIT_USAGE = 1;
export const EXIT_FAILED = 2;

/** Prints a usage error and returns the usage exit code. */
export function usageError(context: CommandContext, message: string, hint?: string): number {
  context.renderer.error(`Error: ${message}`);
  if (hint !== undefined) context.renderer.error(hint);
  return EXIT_USAGE;
}

/** Prints a failure and returns the failure exit code. */
export function failure(context: CommandContext, message: string, hint?: string): number {
  context.renderer.error(`Error: ${message}`);
  if (hint !== undefined) context.renderer.error(hint);
  return EXIT_FAILED;
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
