import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { MAX_REPORTED_ISSUES, validateExportText, validateExportValue } from "./import-validation";

/**
 * Import validation is a trust boundary: it decides what the app will read, and
 * every failure must be explainable without echoing the file's content.
 */

const demo = buildDemoExport("moderate");

describe("import validation", () => {
  it("accepts a valid export", () => {
    const result = validateExportValue(demo);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.exported.events.length).toBe(demo.events.length);
  });

  it("rejects malformed JSON", () => {
    const result = validateExportText("{ not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_JSON");
  });

  it("rejects JSON that is not a StackReplay export", () => {
    const result = validateExportText(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_STACKREPLAY");
  });

  it("rejects a future export version with a clear message", () => {
    const result = validateExportValue({ ...demo, version: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_VERSION");
      expect(result.error.title).toContain("version 2");
    }
  });

  it("rejects a structurally broken export without quoting it", () => {
    const broken = { ...demo, events: [{ schemaVersion: 1, id: "x" }] };
    const result = validateExportValue(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SCHEMA_INVALID");
      expect(result.error.details?.length).toBeGreaterThan(0);
      expect(result.error.details?.length).toBeLessThanOrEqual(MAX_REPORTED_ISSUES);
    }
  });

  it("refuses an export that claims to include prompts or responses", () => {
    const leaky = {
      ...demo,
      redactionReport: { ...demo.redactionReport, promptsIncluded: true },
    };
    const result = validateExportValue(leaky);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("REDACTION_VIOLATION");
  });

  it("rejects an empty workload", () => {
    const result = validateExportValue({ ...demo, events: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("EMPTY_WORKLOAD");
  });

  it("never echoes file content in an error", () => {
    const secret = "PROJECT-CODENAME-ZEPHYR";
    const leaky = {
      format: "stackreplay",
      version: 1,
      generatedAt: "not-a-timestamp",
      collectorVersion: secret,
      range: { from: secret, to: secret },
      detectedSources: [{ adapterId: secret, name: secret, detected: "yes", supported: true }],
      events: [],
      redactionReport: demo.redactionReport,
    };
    const result = validateExportValue(leaky);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialized = JSON.stringify(result.error);
      expect(serialized).not.toContain(secret);
    }
  });

  it("treats the filename as a hint, not a boundary", () => {
    // The validator only sees content: a valid export is accepted regardless of
    // what the file was called, and a broken file named `.stackreplay.json`
    // still fails here.
    expect(validateExportText(JSON.stringify(demo)).ok).toBe(true);
    expect(validateExportText("nope").ok).toBe(false);
  });
});
