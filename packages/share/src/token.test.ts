import { describe, expect, it } from "vitest";
import { sampleSnapshot } from "./schema.test.js";
import {
  base64UrlDecode,
  base64UrlEncode,
  decodeShareToken,
  decodeShareTokenOrThrow,
  encodeShareToken,
  encodeShareTokenFromCanonical,
  MAX_SHARE_DECOMPRESSED_BYTES,
  MAX_SHARE_TOKEN_LENGTH,
  ShareTokenError,
} from "./token.js";

describe("base64url", () => {
  it("round-trips every byte length", () => {
    for (let length = 0; length < 12; length += 1) {
      const bytes = new Uint8Array(length);
      for (let index = 0; index < length; index += 1) bytes[index] = (index * 37 + 11) % 256;
      expect([...base64UrlDecode(base64UrlEncode(bytes))]).toEqual([...bytes]);
    }
  });

  it("uses only URL-safe characters", () => {
    const bytes = new Uint8Array([251, 255, 190, 63, 0, 1]);
    expect(base64UrlEncode(bytes)).toMatch(/^[A-Za-z0-9_-]+$/u);
  });

  it("rejects a non-base64url character", () => {
    expect(() => base64UrlDecode("abc$def")).toThrow(ShareTokenError);
  });
});

describe("share tokens", () => {
  it("round-trips a snapshot", async () => {
    const snapshot = sampleSnapshot();
    const token = await encodeShareToken(snapshot);
    const result = await decodeShareToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot).toEqual(snapshot);
  });

  it("is deterministic for the same facts in a different key order", async () => {
    const snapshot = sampleSnapshot();
    const reordered = {
      versions: snapshot.versions,
      confidence: snapshot.confidence,
      economics: snapshot.economics,
      violations: snapshot.violations,
      constraints: snapshot.constraints,
      coverage: snapshot.coverage,
      feasibility: snapshot.feasibility,
      target: snapshot.target,
      workload: snapshot.workload,
      version: 1,
    } as typeof snapshot;
    expect(await encodeShareToken(reordered)).toBe(await encodeShareToken(snapshot));
  });

  it("stays a shareable length", async () => {
    const token = await encodeShareToken(sampleSnapshot());
    expect(token.length).toBeGreaterThan(100);
    expect(token.length).toBeLessThan(2_000);
  });

  it("refuses a snapshot carrying a forbidden field", async () => {
    const snapshot = sampleSnapshot() as unknown as Record<string, unknown>;
    snapshot.events = [{ id: "leak" }];
    await expect(encodeShareToken(snapshot as never)).rejects.toThrow(/forbidden/iu);
  });

  it("reports a corrupted payload as a checksum mismatch", async () => {
    const token = await encodeShareToken(sampleSnapshot());
    const [version, checksum, payload] = token.split(".") as [string, string, string];
    const swapped = payload.startsWith("A") ? `B${payload.slice(1)}` : `A${payload.slice(1)}`;
    const result = await decodeShareToken(`${version}.${checksum}.${swapped}`);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(["SHARE_TOKEN_CHECKSUM_MISMATCH", "SHARE_TOKEN_MALFORMED"]).toContain(result.code);
  });

  it("reports a tampered checksum", async () => {
    const token = await encodeShareToken(sampleSnapshot());
    const [version, checksum, payload] = token.split(".") as [string, string, string];
    const other = checksum.startsWith("A") ? `B${checksum.slice(1)}` : `A${checksum.slice(1)}`;
    const result = await decodeShareToken(`${version}.${other}.${payload}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_CHECKSUM_MISMATCH");
  });

  it("rejects a truncated token", async () => {
    const token = await encodeShareToken(sampleSnapshot());
    const result = await decodeShareToken(token.slice(0, token.length - 40));
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed token", async () => {
    for (const bad of ["", "not-a-token", "1.2", "1.a.b.c"]) {
      const result = await decodeShareToken(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_MALFORMED");
    }
  });

  it("rejects an unsupported version", async () => {
    const token = await encodeShareToken(sampleSnapshot());
    const result = await decodeShareToken(`9${token.slice(1)}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_UNSUPPORTED_VERSION");
  });

  it("rejects an over-long token before doing any work", async () => {
    const result = await decodeShareToken(`1.${"a".repeat(MAX_SHARE_TOKEN_LENGTH)}.b`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_TOO_LONG");
  });

  it("stops a decompression bomb", async () => {
    const bomb = JSON.stringify({ padding: "x".repeat(MAX_SHARE_DECOMPRESSED_BYTES * 4) });
    const token = await encodeShareTokenFromCanonical(bomb);
    const result = await decodeShareToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_TOO_LARGE");
  });

  /**
   * Regression (benchmark F003): a share token is decoded from a URL anyone can
   * hand a visitor, and its source links reach an `href`. The boundary accepts an
   * absolute http(s) URL and nothing else, so a hostile scheme never depends on
   * the renderer to neutralise it.
   */
  it("refuses a source link that is not an absolute http(s) URL", async () => {
    const snapshot = sampleSnapshot() as unknown as Record<string, unknown> & {
      target: { sources: { url: string; title: string }[] };
    };
    for (const url of ["javascript:alert(1)", "data:text/html,<script>", "blob:https://x/y"]) {
      const hostile = {
        ...snapshot,
        target: { ...snapshot.target, sources: [{ url, title: "Click" }] },
      };
      const token = await encodeShareTokenFromCanonical(JSON.stringify(hostile));
      const result = await decodeShareToken(token);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_INVALID_SNAPSHOT");
    }
    // Encoding a snapshot of the same shape is refused too, so the app cannot
    // mint a link it would then fail to read.
    const hostile = {
      ...snapshot,
      target: { ...snapshot.target, sources: [{ url: "javascript:alert(1)", title: "Click" }] },
    };
    await expect(encodeShareToken(hostile as never)).rejects.toThrow();
  });

  it("accepts an https source link", async () => {
    const snapshot = sampleSnapshot();
    const httpOk = {
      ...snapshot,
      target: {
        ...snapshot.target,
        sources: [
          { url: "https://www.anthropic.com/pricing", title: "Pricing" },
          { url: "http://legacy.example.com/docs", title: "Docs" },
        ],
      },
    };
    expect((await decodeShareToken(await encodeShareToken(httpOk))).ok).toBe(true);
  });

  it("refuses a token whose payload carries a forbidden field", async () => {
    const snapshot = sampleSnapshot() as unknown as Record<string, unknown>;
    const token = await encodeShareTokenFromCanonical(
      JSON.stringify({ ...snapshot, sessionHashes: ["abc"] }),
    );
    const result = await decodeShareToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_FORBIDDEN_FIELD");
  });

  it("refuses a token whose payload is not a share snapshot", async () => {
    const token = await encodeShareTokenFromCanonical(JSON.stringify({ hello: "world" }));
    const result = await decodeShareToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_INVALID_SNAPSHOT");
  });

  it("refuses a payload with an unknown key", async () => {
    const token = await encodeShareTokenFromCanonical(
      JSON.stringify({ ...sampleSnapshot(), surprise: 1 }),
    );
    const result = await decodeShareToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARE_TOKEN_INVALID_SNAPSHOT");
  });

  it("throws for callers that prefer exceptions", async () => {
    await expect(decodeShareTokenOrThrow("garbage")).rejects.toBeInstanceOf(ShareTokenError);
  });

  it("decodes in a plain Node process without a DOM", async () => {
    const token = await encodeShareToken(sampleSnapshot());
    expect(typeof globalThis.document).toBe("undefined");
    const result = await decodeShareToken(token);
    expect(result.ok).toBe(true);
  });
});
