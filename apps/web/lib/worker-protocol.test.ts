import { describe, expect, it } from "vitest";
import {
  isSafeError,
  isSafeErrorCode,
  isWorkerResponse,
  SAFE_ERROR_CODES,
  WORKER_PROTOCOL_VERSION,
} from "./worker-protocol";

/**
 * The protocol guard is what keeps an untyped message from a stale or broken
 * Worker from reaching UI state.
 */
describe("worker protocol", () => {
  it("accepts a well-formed response", () => {
    expect(isWorkerResponse({ type: "READY", protocol: WORKER_PROTOCOL_VERSION })).toBe(true);
    expect(isWorkerResponse({ type: "IMPORTS", requestId: 1, imports: [] })).toBe(true);
  });

  it("rejects anything that is not a typed response", () => {
    expect(isWorkerResponse(null)).toBe(false);
    expect(isWorkerResponse("READY")).toBe(false);
    expect(isWorkerResponse({})).toBe(false);
    expect(isWorkerResponse({ type: 42 })).toBe(false);
  });

  it("rejects a response from a different protocol version", () => {
    expect(isWorkerResponse({ type: "READY", protocol: WORKER_PROTOCOL_VERSION + 1 })).toBe(false);
  });
});

/**
 * Regression (benchmark F029): a display-safe error was trusted whenever it was
 * an object carrying a `code`, so any code — with any text — crossed the Worker
 * boundary as though the protocol had declared it.
 */
describe("worker protocol: display-safe errors", () => {
  it("accepts only the declared error codes", () => {
    for (const code of SAFE_ERROR_CODES) expect(isSafeErrorCode(code)).toBe(true);
    expect(isSafeErrorCode("SOMETHING_ELSE")).toBe(false);
    expect(isSafeErrorCode(undefined)).toBe(false);
    expect(isSafeErrorCode(42)).toBe(false);
  });

  it("rejects an error whose code the protocol does not declare", () => {
    expect(isSafeError({ code: "EACCES", title: "Denied", message: "permission denied" })).toBe(
      false,
    );
  });

  it("rejects an error whose fields are not text", () => {
    expect(isSafeError({ code: "INTERNAL", title: 1, message: "failed" })).toBe(false);
    expect(isSafeError({ code: "INTERNAL", title: "Failed" })).toBe(false);
    expect(
      isSafeError({ code: "INTERNAL", title: "Failed", message: "failed", details: [1, 2] }),
    ).toBe(false);
  });

  it("accepts a declared error with its bounded detail lines", () => {
    expect(
      isSafeError({
        code: "SCHEMA_INVALID",
        title: "Import refused",
        message: "The file is not a StackReplay export.",
        hint: "Export it again with the CLI.",
        details: ["event 14: invalid timestamp"],
      }),
    ).toBe(true);
    expect(isSafeError(null)).toBe(false);
    expect(isSafeError("INTERNAL")).toBe(false);
  });
});
