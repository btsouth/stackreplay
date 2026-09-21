import type { StackReplayErrorCode } from "@stackreplay/schema";

/**
 * Typed engine errors (spec point 91): a stable code, a safe user-facing
 * message, and internal diagnostic context that is never shown to users.
 * Stack traces are not part of the public surface.
 */
export class ReplayEngineError extends Error {
  readonly code: StackReplayErrorCode;
  readonly safeMessage: string;
  readonly diagnostics: readonly string[];

  constructor(
    code: StackReplayErrorCode,
    safeMessage: string,
    diagnostics: readonly string[] = [],
  ) {
    super(`${code}: ${safeMessage}`);
    this.name = "ReplayEngineError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.diagnostics = diagnostics;
  }
}
