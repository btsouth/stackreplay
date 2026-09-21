import { describe, expect, it } from "vitest";
import { isWorkerResponse, WORKER_PROTOCOL_VERSION } from "./worker-protocol";

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
