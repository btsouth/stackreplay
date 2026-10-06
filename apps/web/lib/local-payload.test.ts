import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  decodeLocalPayload,
  encodeLocalPayload,
  isBlobPayload,
  LARGE_LOCAL_PAYLOAD_BYTES,
} from "./local-payload";
import { validateStoredPair } from "./local-record-schema";

describe("large browser-local payloads", () => {
  it("leaves the existing object representation readable", async () => {
    const exported = buildDemoExport("moderate");
    const payload = encodeLocalPayload("legacy", exported);
    expect(isBlobPayload(payload)).toBe(false);
    expect(await decodeLocalPayload(payload)).toEqual({ id: "legacy", exported });
  });

  it("round-trips large exports without a large structured-cloned value", async () => {
    const exported = buildDemoExport("moderate");
    const first = exported.events[0];
    if (!first) throw new Error("fixture");
    first.model.rawName = "a".repeat(LARGE_LOCAL_PAYLOAD_BYTES + 1);
    const payload = encodeLocalPayload("large", exported);
    expect(isBlobPayload(payload)).toBe(true);
    expect("exported" in payload).toBe(false);
    expect(await decodeLocalPayload(payload)).toEqual({ id: "large", exported });
  });

  it("fails closed on damaged JSON and unknown envelope versions", async () => {
    const payload = {
      id: "large",
      format: "json-blob-v1",
      revision: crypto.randomUUID(),
      json: new Blob(["broken"], { type: "application/json" }),
    };
    expect(await decodeLocalPayload(payload)).toBeUndefined();
    const unknown = { ...payload, format: "json-blob-v2" };
    expect(isBlobPayload(unknown)).toBe(false);
    expect(validateStoredPair({}, await decodeLocalPayload(unknown))).toBeUndefined();
  });
});
