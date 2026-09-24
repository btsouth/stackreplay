import { BUNDLED_CATALOG_VERSION, bundledModelIdentity } from "@stackreplay/catalog/bundled";
import { buildDemoExport } from "@stackreplay/test-fixtures";
import { describe, expect, it } from "vitest";
import { validateStoredPair } from "./local-record-schema";
import { summarizeExport } from "./workload-summary";

const exported = buildDemoExport("moderate");
const record = {
  id: "0123456789abcdef0123456789abcdef",
  label: "demo.json",
  createdAt: "2026-09-22T12:00:00.000Z",
  eventCount: exported.events.length,
  summary: summarizeExport(exported, BUNDLED_CATALOG_VERSION, bundledModelIdentity()),
};
const payload = { id: record.id, exported };

describe("complete IndexedDB pair contract", () => {
  it("accepts the normalized valid pair", () => {
    expect(validateStoredPair(record, payload)?.id).toBe(record.id);
  });
  it("stores a Claude scan whose repeated response rows raised RECORD_DUPLICATE", () => {
    const scanned = {
      ...record,
      intake: {
        outcomes: [],
        exactDuplicates: 473,
        overlaps: 0,
        warnings: [
          {
            code: "RECORD_DUPLICATE",
            message: "Repeated assistant rows for one API response were counted once.",
          },
        ],
      },
    };
    expect(validateStoredPair(scanned, payload)?.id).toBe(record.id);
  });
  it.each([
    ["summary.tokens", { ...record, summary: { ...record.summary, tokens: null } }, payload],
    ["summary.models", { ...record, summary: { ...record.summary, models: "bad" } }, payload],
    [
      "event envelope",
      record,
      { ...payload, exported: { ...exported, events: [{ unknown: true }] } },
    ],
    ["version", record, { ...payload, exported: { ...exported, version: 2 } }],
    ["missing required field", { ...record, createdAt: undefined }, payload],
    [
      "archive path metadata",
      {
        ...record,
        intake: {
          outcomes: [
            {
              path: "Users/alice/private-repo/session.jsonl",
              status: "unsupported",
              reason: "unsupported",
              events: 0,
            },
          ],
          exactDuplicates: 0,
          overlaps: 0,
          warnings: [],
        },
      },
      payload,
    ],
    [
      "extra intake metadata",
      {
        ...record,
        intake: {
          outcomes: [],
          exactDuplicates: 0,
          overlaps: 0,
          warnings: [],
          rawPath: "/home/alice/private-repo",
        },
      },
      payload,
    ],
    [
      "warning path metadata",
      {
        ...record,
        intake: {
          outcomes: [],
          exactDuplicates: 0,
          overlaps: 0,
          warnings: [
            { code: "RECORD_MALFORMED", message: "Users/alice/private-repo/messages.jsonl" },
          ],
        },
      },
      payload,
    ],
  ])("rejects malformed %s", (_label, candidateRecord, candidatePayload) => {
    expect(validateStoredPair(candidateRecord, candidatePayload)).toBeUndefined();
  });
});
